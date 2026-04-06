-- =============================================================================
-- Banco de Questões — tabelas + RLS para dados persistirem após F5
-- =============================================================================
-- Sintoma típico: geração IA parece OK, mas após recarregar a página a lista
-- fica vazia. Causas frequentes:
--   1) RLS sem política de SELECT para as linhas inseridas (PostgREST devolve 0).
--   2) Colunas em falta no INSERT/SELECT (PGRST204 / erro em cadeia).
--
-- Rode no SQL Editor do Supabase (Database → SQL). Idempotente: pode repetir.
-- Não executa DELETE/TRUNCATE em dados existentes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) public.questions — colunas alinhadas a components/question-bank/questionBankHelpers.ts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  subject text NOT NULL,
  topic text NOT NULL,
  statement text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer integer NOT NULL,
  explanation text,
  difficulty text NOT NULL DEFAULT 'media',
  exam_board text,
  institution text,
  exam_name text,
  modality text,
  legal_diploma text,
  year text,
  created_at timestamptz NOT NULL DEFAULT now(),
  audio_hint text,
  listen_count integer DEFAULT 0,
  status text,
  is_reinforcement boolean DEFAULT false,
  legislation_tags jsonb DEFAULT '[]'::jsonb,
  jurisprudence_tags jsonb DEFAULT '[]'::jsonb,
  ai_summary jsonb,
  career text,
  formation_area text,
  education_level text,
  job_position text,
  is_annulled boolean NOT NULL DEFAULT false,
  is_outdated boolean NOT NULL DEFAULT false,
  video_url text,
  ai_correction jsonb,
  texto_gabarito_ia text,
  explicacao_doutrinaria text
);

-- Projetos antigos: acrescentar colunas novas sem quebrar
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS statement text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS options jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_answer integer;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'media';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS exam_board text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS institution text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS exam_name text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS modality text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS legal_diploma text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS year text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS audio_hint text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS listen_count integer DEFAULT 0;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_reinforcement boolean DEFAULT false;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS legislation_tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS jurisprudence_tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS ai_summary jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS career text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS formation_area text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS education_level text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS job_position text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_annulled boolean DEFAULT false;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_outdated boolean DEFAULT false;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS ai_correction jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS texto_gabarito_ia text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explicacao_doutrinaria text;

CREATE INDEX IF NOT EXISTS idx_questions_user_id_created_at_desc
  ON public.questions (user_id, created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_questions_subject_topic ON public.questions (subject, topic);
CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions (year);

-- -----------------------------------------------------------------------------
-- 2) public.user_question_stats — estatísticas por questão (upsert no QuestionBank)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_question_stats (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  total_attempts integer NOT NULL DEFAULT 0,
  correct_attempts integer NOT NULL DEFAULT 0,
  last_attempt_correct boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

ALTER TABLE public.user_question_stats ADD COLUMN IF NOT EXISTS total_attempts integer DEFAULT 0;
ALTER TABLE public.user_question_stats ADD COLUMN IF NOT EXISTS correct_attempts integer DEFAULT 0;
ALTER TABLE public.user_question_stats ADD COLUMN IF NOT EXISTS last_attempt_correct boolean DEFAULT false;
ALTER TABLE public.user_question_stats ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_user_question_stats_user ON public.user_question_stats (user_id);

-- -----------------------------------------------------------------------------
-- 3) public.notebooks — cadernos (QuestionBank usa o nome "notebooks")
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notebooks ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.notebooks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.notebooks ADD COLUMN IF NOT EXISTS question_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.notebooks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_notebooks_user_created ON public.notebooks (user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4) RLS — cada utilizador só vê e gere as próprias linhas
--    Importante: sem política de SELECT, o .select() após insert pode vir vazio e
--    após F5 a lista fica sempre vazia mesmo com INSERT a funcionar.
-- -----------------------------------------------------------------------------
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

-- questions
DROP POLICY IF EXISTS "questions_select_authenticated" ON public.questions;
DROP POLICY IF EXISTS "questions_insert_own" ON public.questions;
DROP POLICY IF EXISTS qb_questions_select_own ON public.questions;
DROP POLICY IF EXISTS qb_questions_insert_own ON public.questions;
DROP POLICY IF EXISTS qb_questions_update_own ON public.questions;
DROP POLICY IF EXISTS qb_questions_delete_own ON public.questions;

CREATE POLICY qb_questions_select_own
  ON public.questions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY qb_questions_insert_own
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY qb_questions_update_own
  ON public.questions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY qb_questions_delete_own
  ON public.questions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- user_question_stats
DROP POLICY IF EXISTS qb_uqs_select_own ON public.user_question_stats;
DROP POLICY IF EXISTS qb_uqs_insert_own ON public.user_question_stats;
DROP POLICY IF EXISTS qb_uqs_update_own ON public.user_question_stats;
DROP POLICY IF EXISTS qb_uqs_delete_own ON public.user_question_stats;

CREATE POLICY qb_uqs_select_own
  ON public.user_question_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY qb_uqs_insert_own
  ON public.user_question_stats FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY qb_uqs_update_own
  ON public.user_question_stats FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY qb_uqs_delete_own
  ON public.user_question_stats FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- notebooks
DROP POLICY IF EXISTS qb_notebooks_select_own ON public.notebooks;
DROP POLICY IF EXISTS qb_notebooks_insert_own ON public.notebooks;
DROP POLICY IF EXISTS qb_notebooks_update_own ON public.notebooks;
DROP POLICY IF EXISTS qb_notebooks_delete_own ON public.notebooks;

CREATE POLICY qb_notebooks_select_own
  ON public.notebooks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY qb_notebooks_insert_own
  ON public.notebooks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY qb_notebooks_update_own
  ON public.notebooks FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY qb_notebooks_delete_own
  ON public.notebooks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5) Realtime (opcional, no Dashboard Supabase)
--    Database → Replication → supabase_realtime → incluir public.questions e
--    public.notebooks se quiseres postgres_changes em tempo real no QuestionBank.
-- =============================================================================
