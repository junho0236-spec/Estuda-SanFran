-- =============================================================================
-- user_persona — colunas usadas pela app (perfil, Connect, Spaced, dataService)
-- =============================================================================
-- Rode no SQL Editor do Supabase (projeto com permissões de admin).
-- Pré-requisito recomendado: auth_user_persona_signup_fix.sql (tabela base + trigger).
--
-- Idempotente: só faz ADD COLUMN IF NOT EXISTS — não apaga dados.
-- Corrige erros PostgREST do tipo: column user_persona.X does not exist (PGRST204).
-- =============================================================================

-- Garantir que a tabela existe (mínimo compatível com o trigger de signup)
CREATE TABLE IF NOT EXISTS public.user_persona (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  persona_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile_completion integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Colunas alinhadas a utils/supabaseSelectColumns.ts (USER_PERSONA_FOR_APP_PROFILE) e dataService cloudPayload
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS turma_ano integer;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS turma integer;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS sala text;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS aniversario text;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS idiomas jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS intercambio text;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS progresso_total integer DEFAULT 0;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS progresso_obrigatorias integer DEFAULT 0;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS progresso_optativas integer DEFAULT 0;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS status_geral_integralizacao integer DEFAULT 0;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS mural_fotos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS experiencias_lideranca jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS integralizacao_curriculo jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS curriculo_url text;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS badges jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS creditos_aula numeric;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS creditos_trabalho numeric;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS media numeric;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS horas_extensao numeric;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS entidades jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS cargos_academicos jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.user_persona ADD COLUMN IF NOT EXISTS last_seen timestamptz;

-- Índice útil para listagens por nome (já pode existir pelo script de signup)
CREATE INDEX IF NOT EXISTS idx_user_persona_full_name ON public.user_persona (full_name);

-- =============================================================================
