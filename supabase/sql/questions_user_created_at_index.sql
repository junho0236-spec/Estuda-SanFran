-- Índice para listagem do banco de questões por utilizador (order by created_at desc).
-- Executar no SQL Editor do Supabase (ou migração) se ainda não existir índice equivalente;
-- sem este índice, `where user_id = … order by created_at desc` degrada com muitas linhas.

CREATE INDEX IF NOT EXISTS idx_questions_user_id_created_at_desc
  ON public.questions (user_id, created_at DESC NULLS LAST);
