-- Revisão espaçada: quantidade preferida (1–20) para o Gerador com IA ao abrir pelo atalho /questoes.
-- Execute no Supabase: SQL Editor → Run.

alter table public.spaced_topics
  add column if not exists linked_question_bank_ai_count integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'spaced_topics_linked_question_bank_ai_count_check'
  ) then
    alter table public.spaced_topics
      add constraint spaced_topics_linked_question_bank_ai_count_check
      check (
        linked_question_bank_ai_count is null
        or (linked_question_bank_ai_count >= 1 and linked_question_bank_ai_count <= 20)
      );
  end if;
end $$;

comment on column public.spaced_topics.linked_question_bank_ai_count is
  'Opcional: quantidade de questões (1–20) sugerida no modal Gerador com IA quando o aluno abre o banco pelo tópico.';
