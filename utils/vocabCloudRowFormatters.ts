/**
 * Formatadores/colunas das tabelas do módulo Vocab English.
 * Espelha o padrão de `supabaseCloudRowFormatters.ts` (colunas mínimas +
 * normalização de linhas vindas do PostgREST), mas em arquivo separado
 * para manter o módulo isolado.
 */

export const VOCAB_WORD_CLOUD_COLUMNS =
  'id, user_id, lemma, pos, definition_en, meanings, translation_pt, phonetic, audio_url, status, fsrs_snapshot, correct_streak, created_at, updated_at';

export const VOCAB_SENTENCE_CLOUD_COLUMNS =
  'id, user_id, word_id, text_en, translation_pt, audio_url, fsrs_snapshot, next_review, created_at, updated_at';

export function toCloudVocabWord(w: Record<string, unknown>): Record<string, unknown> {
  return {
    id: w.id,
    user_id: w.user_id,
    lemma: w.lemma,
    pos: w.pos ?? null,
    definition_en: w.definition_en ?? null,
    meanings: Array.isArray(w.meanings) ? w.meanings : [],
    translation_pt: w.translation_pt ?? null,
    phonetic: w.phonetic ?? null,
    audio_url: w.audio_url ?? null,
    status: w.status ?? 'learning',
    fsrs_snapshot: w.fsrs_snapshot ?? null,
    correct_streak: w.correct_streak != null ? Number(w.correct_streak) : 0,
    created_at: w.created_at,
    updated_at: w.updated_at,
  };
}

export function toCloudVocabSentence(s: Record<string, unknown>): Record<string, unknown> {
  return {
    id: s.id,
    user_id: s.user_id,
    word_id: s.word_id,
    text_en: s.text_en,
    translation_pt: s.translation_pt ?? null,
    audio_url: s.audio_url ?? null,
    fsrs_snapshot: s.fsrs_snapshot ?? null,
    next_review: s.next_review ?? null,
    created_at: s.created_at,
    updated_at: s.updated_at,
  };
}
