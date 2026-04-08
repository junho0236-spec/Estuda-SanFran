-- =============================================================================
-- Corrigir "Database error creating new user" (sign-up Supabase)
-- =============================================================================
-- Depois disto, rode user_persona_complete_setup.sql para todas as colunas que a
-- app usa (integralizacao_curriculo, bio, turma, etc.) — evita PGRST204 no cliente.
-- =============================================================================
-- Causa habitual: trigger AFTER INSERT em auth.users que insere em public.user_persona
-- falha (RLS, colunas NOT NULL sem default, ou função sem SECURITY DEFINER).
--
-- Corre no SQL Editor (Dashboard Supabase) com utilizador com permissões de admin.
-- Se o erro persistir: Authentication → Logs / Database → Postgres logs para a mensagem exacta.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tabela mínima (só cria se não existir; não apaga dados existentes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_persona (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  persona_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile_completion integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_persona_full_name ON public.user_persona (full_name);

-- -----------------------------------------------------------------------------
-- 2) Função do trigger: SECURITY DEFINER + search_path (obrigatório para não falhar por RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.user_persona (id, full_name, avatar_url, persona_data, profile_completion)
  VALUES (
    NEW.id,
    v_name,
    NULLIF(trim(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
    jsonb_build_object(
      'nome', v_name,
      'email', NEW.email,
      'avatar_url', NEW.raw_user_meta_data ->> 'avatar_url'
    ),
    10
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.user_persona.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_persona.avatar_url),
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- -----------------------------------------------------------------------------
-- 3) Trigger em auth.users (remove nomes comuns antes de recriar)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_handle_user ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4) RLS na user_persona (o trigger ignora RLS; isto é para o cliente anon/auth)
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_persona ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_persona_select_authenticated ON public.user_persona;
DROP POLICY IF EXISTS user_persona_insert_own ON public.user_persona;
DROP POLICY IF EXISTS user_persona_update_own ON public.user_persona;
DROP POLICY IF EXISTS user_persona_delete_own ON public.user_persona;

-- Comunidade / rankings leem várias linhas (ex.: Friends, Ranking)
CREATE POLICY user_persona_select_authenticated
  ON public.user_persona
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY user_persona_insert_own
  ON public.user_persona
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY user_persona_update_own
  ON public.user_persona
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY user_persona_delete_own
  ON public.user_persona
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 5) Se AINDA falhar: a tua user_persona pode ter colunas NOT NULL sem DEFAULT.
--     Lista com: SELECT column_name, is_nullable, column_default
--     FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_persona';
--     Depois, por exemplo:
--     ALTER TABLE public.user_persona ALTER COLUMN alguma_coluna DROP NOT NULL;
--     -- ou: ALTER TABLE public.user_persona ALTER COLUMN alguma_coluna SET DEFAULT ...;
-- =============================================================================
