-- Índice para listagem do banco de questões por utilizador (order by created_at desc).
-- Executar no SQL Editor do Supabase se ainda não existir índice equivalente.

CREATE INDEX IF NOT EXISTS idx_questions_user_id_created_at_desc
  ON public.questions (user_id, created_at DESC NULLS LAST);
