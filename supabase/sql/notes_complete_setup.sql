-- =============================================================================
-- Notas (NoteView) — Supabase: SQL Editor → colar → Run
-- Garante tabela, colunas, índices e RLS para a app (Vite + supabase-js).
-- =============================================================================

-- 1) Tabela base (só cria se ainda não existir)
create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null,
  subject_id uuid not null,
  title text,
  content text not null default '',
  updated_at timestamptz not null default now(),
  tags jsonb not null default '[]'::jsonb,
  is_starred boolean not null default false,
  handwriting_data text
);

-- 2) Colunas em projetos antigos onde a tabela já existia sem alguns campos
alter table public.notes add column if not exists title text;
alter table public.notes add column if not exists content text;
alter table public.notes add column if not exists updated_at timestamptz;
alter table public.notes add column if not exists tags jsonb;
alter table public.notes add column if not exists is_starred boolean;
alter table public.notes add column if not exists handwriting_data text;

-- Garantir defaults / not-null seguros
alter table public.notes alter column content set default '';
update public.notes set content = '' where content is null;
alter table public.notes alter column content set not null;

alter table public.notes alter column updated_at set default now();
update public.notes set updated_at = now() where updated_at is null;
alter table public.notes alter column updated_at set not null;

update public.notes set tags = '[]'::jsonb where tags is null;
alter table public.notes alter column tags set default '[]'::jsonb;
alter table public.notes alter column tags set not null;

update public.notes set is_starred = false where is_starred is null;
alter table public.notes alter column is_starred set default false;
alter table public.notes alter column is_starred set not null;

-- 3) Índices (mesmas chaves que a app usa no select)
create index if not exists notes_user_subject_idx
  on public.notes (user_id, subject_id);

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

-- 4) RLS
alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_select_own"
  on public.notes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notes_insert_own"
  on public.notes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "notes_update_own"
  on public.notes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own"
  on public.notes for delete
  to authenticated
  using (auth.uid() = user_id);

-- 5) Permissões explícitas para o role da app (sessão com JWT)
grant select, insert, update, delete on public.notes to authenticated;
