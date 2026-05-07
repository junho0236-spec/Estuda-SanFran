-- Permitir o algoritmo `fixed_gaps` na tabela spaced_topics.
-- Execute no Supabase: SQL Editor → New query → colar e Run.
-- Erro sem isso: violates check constraint "spaced_topics_srs_algorithm_check"

alter table public.spaced_topics
  drop constraint if exists spaced_topics_srs_algorithm_check;

alter table public.spaced_topics
  add constraint spaced_topics_srs_algorithm_check
  check (srs_algorithm is null or srs_algorithm in ('fixed', 'fixed_gaps', 'sm2', 'fsrs'));
