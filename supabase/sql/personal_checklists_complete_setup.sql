-- =============================================================================
-- Minhas Listas (personal_checklists) — setup completo
-- =============================================================================
-- Tabela para listas pessoais checkáveis (separadas de tarefas e docs).
-- Script idempotente: pode ser executado múltiplas vezes com segurança.
-- =============================================================================

create table if not exists public.personal_checklists (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  items jsonb not null default '[]'::jsonb,
  is_pinned boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personal_checklists add column if not exists description text;
alter table public.personal_checklists add column if not exists items jsonb;
alter table public.personal_checklists add column if not exists is_pinned boolean;
alter table public.personal_checklists add column if not exists archived_at timestamptz;
alter table public.personal_checklists add column if not exists created_at timestamptz;
alter table public.personal_checklists add column if not exists updated_at timestamptz;

update public.personal_checklists set items = '[]'::jsonb where items is null;
alter table public.personal_checklists alter column items set default '[]'::jsonb;
alter table public.personal_checklists alter column items set not null;

update public.personal_checklists set is_pinned = false where is_pinned is null;
alter table public.personal_checklists alter column is_pinned set default false;
alter table public.personal_checklists alter column is_pinned set not null;

update public.personal_checklists set created_at = now() where created_at is null;
alter table public.personal_checklists alter column created_at set default now();
alter table public.personal_checklists alter column created_at set not null;

update public.personal_checklists set updated_at = now() where updated_at is null;
alter table public.personal_checklists alter column updated_at set default now();
alter table public.personal_checklists alter column updated_at set not null;

create index if not exists personal_checklists_user_updated_idx
  on public.personal_checklists (user_id, updated_at desc);

create index if not exists personal_checklists_user_archived_idx
  on public.personal_checklists (user_id, archived_at);

alter table public.personal_checklists enable row level security;

drop policy if exists personal_checklists_select_own on public.personal_checklists;
drop policy if exists personal_checklists_insert_own on public.personal_checklists;
drop policy if exists personal_checklists_update_own on public.personal_checklists;
drop policy if exists personal_checklists_delete_own on public.personal_checklists;

create policy personal_checklists_select_own
  on public.personal_checklists for select
  to authenticated
  using (auth.uid() = user_id);

create policy personal_checklists_insert_own
  on public.personal_checklists for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy personal_checklists_update_own
  on public.personal_checklists for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy personal_checklists_delete_own
  on public.personal_checklists for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.personal_checklists to authenticated;
