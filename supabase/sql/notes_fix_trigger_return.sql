-- =============================================================================
-- Correção de Gatilho / Trigger em public.notes (Erro PostgreSQL 2F005)
-- "control reached end of trigger procedure without RETURN"
-- =============================================================================
-- Este erro ocorre quando uma função de gatilho PL/pgSQL na tabela public.notes
-- chega ao fim (END;) sem executar um "RETURN NEW;" (ou "RETURN OLD;").
-- 
-- Se você possui um gatilho de updated_at ou auditoria na tabela notes,
-- garanta que a função sempre retorna NEW conforme o exemplo abaixo:

CREATE OR REPLACE FUNCTION public.set_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Opcional: Se desejar associar este gatilho à tabela public.notes:
-- DROP TRIGGER IF EXISTS trg_set_notes_updated_at ON public.notes;
-- CREATE TRIGGER trg_set_notes_updated_at
--   BEFORE INSERT OR UPDATE ON public.notes
--   FOR EACH ROW
--   EXECUTE FUNCTION public.set_notes_updated_at();
