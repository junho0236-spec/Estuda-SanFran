-- Mensagens agendadas + lembretes no chat (processados no servidor).
-- Cole no SQL Editor do Supabase (Database → SQL).
--
-- Depois: habilite Realtime em public.chat_scheduled_items se quiser lista ao vivo (opcional).
--
-- IMPORTANTE: agendamentos só viram mensagem se algo chamar process_due_chat_scheduled_items()
-- periodicamente. No Supabase, use a extensão pg_cron (Database → Extensions) e rode UMA vez:
--
--   select cron.schedule(
--     'chat-scheduled-dispatcher',
--     '* * * * *',
--     $$select public.process_due_chat_scheduled_items()$$
--   );
--
-- Se pg_cron não estiver disponível no plano, use um Edge Function + Scheduled trigger
-- que execute o mesmo SELECT, ou um job externo.

create table if not exists public.chat_scheduled_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null,
  user_name text,
  kind text not null check (kind in ('scheduled_message', 'reminder')),
  content text not null default '',
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled', 'failed')),
  reply_to_id uuid,
  reply_to_content text,
  reply_to_sender_name text,
  context_text text,
  created_at timestamptz not null default now(),
  error_text text
);

create index if not exists chat_scheduled_items_due_idx
  on public.chat_scheduled_items (scheduled_at)
  where status = 'pending';

alter table public.chat_scheduled_items enable row level security;

drop policy if exists "chat_scheduled_select_own" on public.chat_scheduled_items;
drop policy if exists "chat_scheduled_insert_participant" on public.chat_scheduled_items;
drop policy if exists "chat_scheduled_update_own_pending" on public.chat_scheduled_items;

create policy "chat_scheduled_select_own"
  on public.chat_scheduled_items for select
  using (auth.uid() = user_id);

create policy "chat_scheduled_insert_participant"
  on public.chat_scheduled_items for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_participants cp
      where cp.room_id = chat_scheduled_items.room_id
        and cp.user_id = auth.uid()
    )
  );

create policy "chat_scheduled_update_own_pending"
  on public.chat_scheduled_items for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id);

-- Processa fila (roda como superuser / cron; não exponha a clientes autenticados).
create or replace function public.process_due_chat_scheduled_items()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
  v_content text;
begin
  for r in
    select *
    from public.chat_scheduled_items
    where status = 'pending'
      and scheduled_at <= now()
    order by scheduled_at
    for update skip locked
  loop
    begin
      if r.kind = 'reminder' then
        v_content := '🔔 Lembrete: ' || trim(coalesce(r.content, ''));
        if r.context_text is not null and length(trim(r.context_text)) > 0 then
          v_content := v_content || e'\n\n📎 Contexto: ' || left(trim(r.context_text), 500);
        end if;
      else
        v_content := coalesce(r.content, '');
      end if;

      insert into public.chat_messages (
        room_id,
        sender_id,
        sender_name,
        content,
        message_type,
        status,
        reply_to_id,
        reply_to_content,
        reply_to_sender_name
      ) values (
        r.room_id,
        r.user_id,
        coalesce(nullif(trim(r.user_name), ''), 'Usuário'),
        v_content,
        'text',
        'sent',
        r.reply_to_id,
        r.reply_to_content,
        r.reply_to_sender_name
      );

      update public.chat_rooms
      set
        last_message = left(v_content, 500),
        updated_at = now()
      where id = r.room_id;

      update public.chat_participants
      set unread_count = coalesce(unread_count, 0) + 1
      where room_id = r.room_id
        and user_id <> r.user_id;

      update public.chat_scheduled_items
      set status = 'sent'
      where id = r.id;

      v_count := v_count + 1;
    exception
      when others then
        update public.chat_scheduled_items
        set status = 'failed', error_text = left(sqlerrm, 500)
        where id = r.id;
    end;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.process_due_chat_scheduled_items() from public;
grant execute on function public.process_due_chat_scheduled_items() to postgres;
