-- =============================================================================
-- Alinha a coluna public.questions.difficulty com a app (5 níveis em snake_case).
-- Erro típico sem isto: "violates check constraint questions_difficulty_check"
-- ao gerar questões com "Muito fácil" ou "Muito difícil".
-- Rode no Supabase: Database → SQL Editor (projeto em produção).
-- =============================================================================

-- Valores legados comuns → canónico antes de recriar o CHECK (ajuste se precisar)
UPDATE public.questions
SET difficulty = 'media'
WHERE difficulty IS NOT NULL
  AND lower(trim(difficulty)) IN ('medio', 'média', 'médio');

UPDATE public.questions
SET difficulty = 'facil'
WHERE difficulty IS NOT NULL
  AND lower(trim(difficulty)) IN ('fácil', 'facil');

UPDATE public.questions
SET difficulty = 'dificil'
WHERE difficulty IS NOT NULL
  AND lower(trim(difficulty)) IN ('difícil', 'dificil');

-- Remover a regra antiga (nome pode variar; este é o do erro reportado)
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_difficulty_check;

-- Nova regra: os cinco códigos usados em QuestionBank / validateAiGeneratedQuestions
ALTER TABLE public.questions
  ADD CONSTRAINT questions_difficulty_check
  CHECK (
    difficulty IN (
      'muito_facil',
      'facil',
      'media',
      'dificil',
      'muito_dificil'
    )
  );
