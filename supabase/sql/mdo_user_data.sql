-- MDO (Meu dinheiro organizado): uma linha por utilizador, payload JSONB para sync entre dispositivos.
-- Executar no Supabase SQL Editor (projeto SanFran).

CREATE TABLE IF NOT EXISTS public.mdo_user_data (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_mdo_user_data_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mdo_user_data_set_updated_at ON public.mdo_user_data;
CREATE TRIGGER mdo_user_data_set_updated_at
  BEFORE INSERT OR UPDATE ON public.mdo_user_data
  FOR EACH ROW
  EXECUTE FUNCTION public.set_mdo_user_data_updated_at();

ALTER TABLE public.mdo_user_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mdo_user_data_select_own" ON public.mdo_user_data;
CREATE POLICY "mdo_user_data_select_own"
  ON public.mdo_user_data FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mdo_user_data_insert_own" ON public.mdo_user_data;
CREATE POLICY "mdo_user_data_insert_own"
  ON public.mdo_user_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mdo_user_data_update_own" ON public.mdo_user_data;
CREATE POLICY "mdo_user_data_update_own"
  ON public.mdo_user_data FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mdo_user_data_delete_own" ON public.mdo_user_data;
CREATE POLICY "mdo_user_data_delete_own"
  ON public.mdo_user_data FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.mdo_user_data IS 'MDO finanças pessoais: snapshot JSON por utilizador (sync multi-dispositivo).';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mdo_user_data TO authenticated;
