-- =============================================================================
-- Se és leigo: abre antes  INSTRUCOES_VISTAS_SEGURANCA.txt  na mesma pasta.
-- Para copiar só o SQL do passo 1: usa  PASSO1_gerar_codigos_das_vistas.sql
--
-- Os comandos longos CREATE OR REPLACE não estão aqui — são gerados no
-- Supabase depois de correres o SELECT abaixo (cada base de dados é diferente).
--
-- Advisor: SECURITY DEFINER → SECURITY INVOKER em:
--   public.user_weak_topics, public.class_war_leaderboard
-- Requisito: Postgres 15+. No SQL Editor usa Run (▶), não Explain.
-- =============================================================================

-- BLOCO A (igual ao ficheiro PASSO1_gerar_codigos_das_vistas.sql)

SELECT
  'user_weak_topics' AS view_name,
  format(
    E'CREATE OR REPLACE VIEW public.user_weak_topics WITH (security_invoker = true) AS\n%s;',
    pg_get_viewdef('public.user_weak_topics'::regclass, true)
  ) AS run_this_sql
UNION ALL
SELECT
  'class_war_leaderboard',
  format(
    E'CREATE OR REPLACE VIEW public.class_war_leaderboard WITH (security_invoker = true) AS\n%s;',
    pg_get_viewdef('public.class_war_leaderboard'::regclass, true)
  );
