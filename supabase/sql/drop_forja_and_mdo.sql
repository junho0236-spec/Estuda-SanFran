-- =============================================================================
-- Teardown: remover Forja + MDO criados pelos scripts do repositório
-- Correr no Supabase SQL Editor (projeto certo). IRREVERSÍVEL — apaga dados.
-- =============================================================================
-- Origem:
--   Forja: supabase/forja_schema_01_tables.sql (+ RLS em forja_schema_02_rls.sql)
--   MDO:   supabase/sql/mdo_user_data.sql
-- =============================================================================
-- Idempotente: podes voltar a correr; só remove o que existir.
-- CASCADE em tabelas remove RLS, triggers e índices dessas tabelas.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- MDO — tabela (remove policies, trigger) + função do trigger
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.mdo_user_data CASCADE;

DROP FUNCTION IF EXISTS public.set_mdo_user_data_updated_at() CASCADE;

-- ---------------------------------------------------------------------------
-- Forja — ordem respeitando FKs internas (hábitos / foco)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.forja_habit_completions CASCADE;
DROP TABLE IF EXISTS public.forja_habits CASCADE;

DROP TABLE IF EXISTS public.forja_focus_sessions CASCADE;
DROP TABLE IF EXISTS public.forja_focus_projects CASCADE;

DROP TABLE IF EXISTS public.forja_user_profiles CASCADE;
DROP TABLE IF EXISTS public.forja_tasks CASCADE;
DROP TABLE IF EXISTS public.forja_goals CASCADE;
DROP TABLE IF EXISTS public.forja_transactions CASCADE;
DROP TABLE IF EXISTS public.forja_financial_cards CASCADE;
DROP TABLE IF EXISTS public.forja_bank_accounts CASCADE;
DROP TABLE IF EXISTS public.forja_shopping_items CASCADE;
DROP TABLE IF EXISTS public.forja_budget_rules CASCADE;
DROP TABLE IF EXISTS public.forja_finance_notes CASCADE;
DROP TABLE IF EXISTS public.forja_water_logs CASCADE;
DROP TABLE IF EXISTS public.forja_app_notifications CASCADE;
DROP TABLE IF EXISTS public.forja_push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.forja_user_achievements CASCADE;
DROP TABLE IF EXISTS public.forja_featured_achievements CASCADE;

COMMIT;

-- Nota: o GRANT em mdo_user_data para authenticated deixa de ter efeito com a
-- tabela removida. Não altera auth.users nem outras tabelas do hub.
