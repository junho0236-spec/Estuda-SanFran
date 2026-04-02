-- Metas diárias/semanais do Banco de Questões (alvos + contadores).
-- O cliente incrementa os contadores no mesmo fluxo que grava em user_question_stats.
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS question_answer_goals jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_progress.question_answer_goals IS
  'JSON: daily_target, weekly_target, day_key, day_count, week_key, week_count (metas de respostas no simulado/banco).';
