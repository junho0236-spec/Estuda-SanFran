-- =============================================================================
-- Vocab English (vocab_words + vocab_sentences) — setup completo
-- =============================================================================
-- Tabelas do módulo de vocabulário em inglês estilo Migaku (dicionário +
-- frases i+1 + repetição espaçada FSRS própria).
-- Script idempotente: pode ser executado múltiplas vezes com segurança.
-- =============================================================================

create table if not exists public.vocab_words (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  lemma text not null,
  pos text,
  definition_en text,
  meanings jsonb not null default '[]'::jsonb,
  translation_pt text,
  phonetic text,
  audio_url text,
  status text not null default 'learning' check (status in ('unknown', 'learning', 'known')),
  fsrs_snapshot jsonb,
  correct_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vocab_words add column if not exists pos text;
alter table public.vocab_words add column if not exists definition_en text;
alter table public.vocab_words add column if not exists meanings jsonb;
alter table public.vocab_words add column if not exists translation_pt text;
alter table public.vocab_words add column if not exists phonetic text;
alter table public.vocab_words add column if not exists audio_url text;
alter table public.vocab_words add column if not exists status text;
alter table public.vocab_words add column if not exists fsrs_snapshot jsonb;
alter table public.vocab_words add column if not exists correct_streak integer;
alter table public.vocab_words add column if not exists created_at timestamptz;
alter table public.vocab_words add column if not exists updated_at timestamptz;

update public.vocab_words set meanings = '[]'::jsonb where meanings is null;
alter table public.vocab_words alter column meanings set default '[]'::jsonb;
alter table public.vocab_words alter column meanings set not null;

update public.vocab_words set status = 'learning' where status is null;
alter table public.vocab_words alter column status set default 'learning';
alter table public.vocab_words alter column status set not null;

update public.vocab_words set correct_streak = 0 where correct_streak is null;
alter table public.vocab_words alter column correct_streak set default 0;
alter table public.vocab_words alter column correct_streak set not null;

update public.vocab_words set created_at = now() where created_at is null;
alter table public.vocab_words alter column created_at set default now();
alter table public.vocab_words alter column created_at set not null;

update public.vocab_words set updated_at = now() where updated_at is null;
alter table public.vocab_words alter column updated_at set default now();
alter table public.vocab_words alter column updated_at set not null;

create unique index if not exists vocab_words_user_lemma_idx
  on public.vocab_words (user_id, lemma);

create index if not exists vocab_words_user_status_idx
  on public.vocab_words (user_id, status);

comment on column public.vocab_words.fsrs_snapshot is
  'Snapshot JSON do Card FSRS (ts-fsrs) da palavra: due, stability, difficulty, state, reps, lapses, etc.';
comment on column public.vocab_words.status is
  'unknown | learning | known. Promovida a known quando stability > 21d ou 8 acertos consecutivos.';

create table if not exists public.vocab_sentences (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  word_id uuid not null references public.vocab_words (id) on delete cascade,
  text_en text not null,
  translation_pt text,
  audio_url text,
  fsrs_snapshot jsonb,
  next_review date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vocab_sentences add column if not exists translation_pt text;
alter table public.vocab_sentences add column if not exists audio_url text;
alter table public.vocab_sentences add column if not exists fsrs_snapshot jsonb;
alter table public.vocab_sentences add column if not exists next_review date;
alter table public.vocab_sentences add column if not exists created_at timestamptz;
alter table public.vocab_sentences add column if not exists updated_at timestamptz;

update public.vocab_sentences set created_at = now() where created_at is null;
alter table public.vocab_sentences alter column created_at set default now();
alter table public.vocab_sentences alter column created_at set not null;

update public.vocab_sentences set updated_at = now() where updated_at is null;
alter table public.vocab_sentences alter column updated_at set default now();
alter table public.vocab_sentences alter column updated_at set not null;

create index if not exists vocab_sentences_word_idx
  on public.vocab_sentences (word_id);

create index if not exists vocab_sentences_user_due_idx
  on public.vocab_sentences (user_id, next_review);

comment on column public.vocab_sentences.fsrs_snapshot is
  'Snapshot JSON do Card FSRS (ts-fsrs) da frase — agendamento independente por frase.';
comment on column public.vocab_sentences.next_review is
  'Data local (YYYY-MM-DD) da próxima revisão; null = frase nova, vencida agora.';

-- RLS ----------------------------------------------------------------------
alter table public.vocab_words enable row level security;
alter table public.vocab_sentences enable row level security;

drop policy if exists vocab_words_select_own on public.vocab_words;
drop policy if exists vocab_words_insert_own on public.vocab_words;
drop policy if exists vocab_words_update_own on public.vocab_words;
drop policy if exists vocab_words_delete_own on public.vocab_words;

create policy vocab_words_select_own
  on public.vocab_words for select
  to authenticated
  using (auth.uid() = user_id);

create policy vocab_words_insert_own
  on public.vocab_words for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy vocab_words_update_own
  on public.vocab_words for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy vocab_words_delete_own
  on public.vocab_words for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists vocab_sentences_select_own on public.vocab_sentences;
drop policy if exists vocab_sentences_insert_own on public.vocab_sentences;
drop policy if exists vocab_sentences_update_own on public.vocab_sentences;
drop policy if exists vocab_sentences_delete_own on public.vocab_sentences;

create policy vocab_sentences_select_own
  on public.vocab_sentences for select
  to authenticated
  using (auth.uid() = user_id);

create policy vocab_sentences_insert_own
  on public.vocab_sentences for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy vocab_sentences_update_own
  on public.vocab_sentences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy vocab_sentences_delete_own
  on public.vocab_sentences for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.vocab_words to authenticated;
grant select, insert, update, delete on public.vocab_sentences to authenticated;
