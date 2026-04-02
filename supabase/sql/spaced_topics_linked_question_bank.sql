-- Inclui 'question_bank' no vínculo de material da revisão espaçada (atalho para /questoes).
ALTER TABLE public.spaced_topics DROP CONSTRAINT IF EXISTS spaced_topics_linked_material_kind_check;

ALTER TABLE public.spaced_topics
  ADD CONSTRAINT spaced_topics_linked_material_kind_check
  CHECK (
    linked_material_kind IS NULL
    OR linked_material_kind IN (
      'none',
      'flashcards',
      'summarizer',
      'both',
      'question_bank'
    )
  );

COMMENT ON COLUMN public.spaced_topics.linked_material_kind IS
  'none | flashcards | summarizer | both | question_bank';
