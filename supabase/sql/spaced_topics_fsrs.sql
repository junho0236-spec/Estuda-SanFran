-- FSRS: estado do cartão serializado (ts-fsrs). Execute no SQL Editor do Supabase.
-- Não exige mudança em RLS se spaced_topics já for atualizável pelos usuários.

alter table public.spaced_topics
  add column if not exists srs_fsrs_card jsonb;

comment on column public.spaced_topics.srs_fsrs_card is
  'Snapshot JSON do Card FSRS: due, stability, difficulty, state, reps, lapses, scheduled_days, etc. (algoritmo srs_algorithm = fsrs).';

-- Opcional: permitir o valor ''fsrs'' se existir CHECK em srs_algorithm (ajuste o nome da constraint se o seu for outro).
-- Descomente e adapte após inspecionar: select conname from pg_constraint where conrelid = 'public.spaced_topics'::regclass;

-- alter table public.spaced_topics drop constraint if exists spaced_topics_srs_algorithm_check;
-- alter table public.spaced_topics
--   add constraint spaced_topics_srs_algorithm_check
--   check (srs_algorithm is null or srs_algorithm in ('fixed', 'sm2', 'fsrs'));
