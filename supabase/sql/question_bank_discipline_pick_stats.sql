-- =============================================================================
-- Estatísticas globais: disciplinas mais escolhidas no filtro do banco de questões
-- =============================================================================
-- Objetivo: alimentar a secção "Mais buscadas" com contagens agregadas entre
-- utilizadores (em alternativa ou complemento ao localStorage no browser).
--
-- discipline_key = texto exacto da disciplina no catálogo da app (rótulo completo),
-- tal como gravado em recordDisciplineCatalogPick / filtros.
--
-- Depois de aplicar no SQL Editor do Supabase, chame na app:
--   supabase.rpc('increment_question_bank_discipline_pick', { p_key: '<rótulo>' })
--   supabase.from('question_bank_discipline_pick_stats').select('*').order('pick_count', { ascending: false }).limit(20)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.question_bank_discipline_pick_stats (
  discipline_key text PRIMARY KEY,
  pick_count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_bank_discipline_pick_stats_key_len CHECK (char_length(discipline_key) BETWEEN 1 AND 500)
);

CREATE INDEX IF NOT EXISTS idx_qb_discipline_pick_stats_pick_count_desc
  ON public.question_bank_discipline_pick_stats (pick_count DESC);

COMMENT ON TABLE public.question_bank_discipline_pick_stats IS 'Contagens agregadas de escolhas de disciplina no filtro do banco de questões';
COMMENT ON COLUMN public.question_bank_discipline_pick_stats.discipline_key IS 'Rótulo exacto da disciplina (catálogo SanFran / Outras)';
COMMENT ON COLUMN public.question_bank_discipline_pick_stats.pick_count IS 'Número total de vezes que foi escolhida';

ALTER TABLE public.question_bank_discipline_pick_stats ENABLE ROW LEVEL SECURITY;

-- Leitura: utilizadores autenticados (o banco de questões já exige login)
DROP POLICY IF EXISTS qb_discipline_pick_stats_select_authenticated
  ON public.question_bank_discipline_pick_stats;
CREATE POLICY qb_discipline_pick_stats_select_authenticated
  ON public.question_bank_discipline_pick_stats
  FOR SELECT
  TO authenticated
  USING (true);

-- Escritas directas na tabela: não há políticas INSERT/UPDATE para authenticated,
-- logo só a função SECURITY DEFINER (executável por authenticated) altera contagens.

CREATE OR REPLACE FUNCTION public.increment_question_bank_discipline_pick(p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text := left(trim(coalesce(p_key, '')), 500);
BEGIN
  IF length(k) < 1 THEN
    RETURN;
  END IF;
  INSERT INTO public.question_bank_discipline_pick_stats (discipline_key, pick_count)
  VALUES (k, 1)
  ON CONFLICT (discipline_key)
  DO UPDATE SET
    pick_count = public.question_bank_discipline_pick_stats.pick_count + 1,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.increment_question_bank_discipline_pick(text) IS 'Incrementa contagem de escolha de disciplina (chamar com RPC a partir da app)';

REVOKE ALL ON FUNCTION public.increment_question_bank_discipline_pick(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_question_bank_discipline_pick(text) TO authenticated;

-- Opcional: permitir ao service_role gerir dados (migrações / limpeza)
GRANT ALL ON TABLE public.question_bank_discipline_pick_stats TO service_role;
