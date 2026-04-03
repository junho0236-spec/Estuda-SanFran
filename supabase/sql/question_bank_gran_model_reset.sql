-- =============================================================================
-- Question bank (modelo Gran) — colunas novas + reset opcional de dados
-- =============================================================================
-- Antes de correr: faça backup do projeto Supabase.
-- Revise FKs no teu painel: outras tabelas que referenciem public.questions
-- devem ser limpas ou atualizadas antes de DELETE/TRUNCATE em questions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Colunas novas em public.questions (idempotente)
-- -----------------------------------------------------------------------------
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS career text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS formation_area text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS education_level text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS job_position text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_annulled boolean NOT NULL DEFAULT false;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_outdated boolean NOT NULL DEFAULT false;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS video_url text;

COMMENT ON COLUMN public.questions.career IS 'Carreira / trilho de concurso (filtro Gran)';
COMMENT ON COLUMN public.questions.formation_area IS 'Área de formação académica';
COMMENT ON COLUMN public.questions.education_level IS 'Escolaridade exigida ou alvo';
COMMENT ON COLUMN public.questions.job_position IS 'Cargo / função do edital';
COMMENT ON COLUMN public.questions.is_annulled IS 'Questão anulada pela banca';
COMMENT ON COLUMN public.questions.is_outdated IS 'Questão marcada como desatualizada';
COMMENT ON COLUMN public.questions.video_url IS 'URL de vídeo associado (YouTube, etc.)';

-- -----------------------------------------------------------------------------
-- 2) Comentários: tipo de autor (professor / aluno / equipa)
-- -----------------------------------------------------------------------------
ALTER TABLE public.question_comments
  ADD COLUMN IF NOT EXISTS author_kind text NOT NULL DEFAULT 'student';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'question_comments_author_kind_check'
  ) THEN
    ALTER TABLE public.question_comments
      ADD CONSTRAINT question_comments_author_kind_check
      CHECK (author_kind IN ('professor', 'student', 'staff'));
  END IF;
END $$;

COMMENT ON COLUMN public.question_comments.author_kind IS
  'professor = equipa/docente; student = aluno; staff = moderador';

UPDATE public.question_comments SET author_kind = 'student' WHERE author_kind IS NULL;

-- -----------------------------------------------------------------------------
-- 3) RESET DESTRUTIVO (descomenta só quando quiseres apagar todo o acervo)
-- -----------------------------------------------------------------------------
/*
BEGIN;

-- Ordem segura típica: filhos primeiro.
DELETE FROM public.question_comments;

-- Estatísticas por questão (ajusta o nome do schema se for diferente)
DELETE FROM public.user_question_stats;

-- Cadernos: remove referências a questões (ajusta o tipo da coluna se for jsonb)
UPDATE public.notebooks SET question_ids = '{}';

DELETE FROM public.questions;

COMMIT;
*/

-- -----------------------------------------------------------------------------
-- 4) Índices úteis para filtros
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_questions_subject_topic ON public.questions (subject, topic);
CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions (year);
CREATE INDEX IF NOT EXISTS idx_questions_annulled_outdated ON public.questions (is_annulled, is_outdated);
CREATE INDEX IF NOT EXISTS idx_question_comments_question_kind ON public.question_comments (question_id, author_kind);

-- -----------------------------------------------------------------------------
-- 5) RLS — ajusta às tuas policies existentes (exemplo mínimo)
-- Se já tens RLS em questions/question_comments, NÃO dupliques policies;
-- integra estes requisitos no teu ficheiro de policies principal.
-- -----------------------------------------------------------------------------
-- Exemplo (comentado): leitura autenticada + insert do próprio utilizador
/*
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_comments ENABLE ROW LEVEL SECURITY;

-- Substitui nomes se já existirem políticas equivalentes.
DROP POLICY IF EXISTS "questions_select_authenticated" ON public.questions;
CREATE POLICY "questions_select_authenticated" ON public.questions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "questions_insert_own" ON public.questions;
CREATE POLICY "questions_insert_own" ON public.questions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "qcomments_select_authenticated" ON public.question_comments;
CREATE POLICY "qcomments_select_authenticated" ON public.question_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "qcomments_insert_own" ON public.question_comments;
CREATE POLICY "qcomments_insert_own" ON public.question_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
*/
