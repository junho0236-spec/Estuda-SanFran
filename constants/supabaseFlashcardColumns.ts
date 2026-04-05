/**
 * Colunas carregadas em massa para flashcards (evita SELECT * e reduz I/O no Postgres).
 * Manter alinhado com o mapeamento em App.tsx runLoadUserDataOnce.
 */
export const SUPABASE_FLASHCARD_LOAD_COLUMNS =
  'id, front, back, notes, tags, source, subject_id, folder_id, next_review, interval, status, learning_step, ease_factor, total_errors, archived_at, created_at';
