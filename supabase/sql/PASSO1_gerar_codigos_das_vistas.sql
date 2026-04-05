-- ============================================================================
-- PASSO 1 (só isto): seleciona TUDO neste ficheiro (Ctrl+A), copia, cola no
-- Supabase → SQL Editor, clica RUN (▶). NÃO uses Explain.
--
-- Vão aparecer 2 linhas. Cada linha tem na coluna "run_this_sql" um texto
-- GRANDE — esse texto É o código que vais colar no Passo 2 e 3.
--
-- Os códigos grandes NÃO estão neste ficheiro porque são gerados a partir
-- da TUA base de dados (cada projeto é diferente).
-- ============================================================================

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
