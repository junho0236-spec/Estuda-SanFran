import {
  applyFsrsReview,
  parseFsrsSnapshot,
  type ReviewQuality,
  type SpacedFsrsCardSnapshot,
} from './spacedFsrs';
import {
  VocabWord,
  VocabSentence,
  localTodayISO,
  saveVocabSentences,
  saveVocabWord,
  vocabDb,
} from './vocabService';

/**
 * Wrapper de revisão FSRS do módulo Vocab English.
 * Reutiliza `services/spacedFsrs.ts` (somente leitura) com estado próprio
 * por frase e por palavra. Promove a palavra 'learning' → 'known' quando:
 *   - stability do card da palavra > VOCAB_KNOWN_STABILITY_DAYS, ou
 *   - VOCAB_KNOWN_STREAK acertos consecutivos (hard/good/easy).
 * Um 'again' zera o streak e rebaixa 'known' → 'learning'.
 */

export const VOCAB_KNOWN_STABILITY_DAYS = 21;
export const VOCAB_KNOWN_STREAK = 8;

export interface VocabReviewResult {
  sentence: VocabSentence;
  word: VocabWord | null;
  nextReviewISO: string;
  promoted: boolean;
  demoted: boolean;
}

const isCorrect = (q: ReviewQuality) => q !== 'again';

export async function reviewVocabSentence(
  userId: string,
  isOnline: boolean,
  sentence: VocabSentence,
  quality: ReviewQuality
): Promise<VocabReviewResult> {
  const today = localTodayISO();

  // 1) FSRS da frase
  const sentenceResult = applyFsrsReview(today, sentence.fsrs_snapshot, quality, today);
  const updatedSentence: VocabSentence = {
    ...sentence,
    fsrs_snapshot: sentenceResult.snapshot,
    next_review: sentenceResult.nextReviewLocalISO,
    updated_at: new Date().toISOString(),
  };
  await saveVocabSentences([updatedSentence], isOnline);

  // 2) FSRS da palavra + streak + promoção
  let updatedWord: VocabWord | null = null;
  let promoted = false;
  let demoted = false;

  const word = await vocabDb.vocab_words.get(sentence.word_id);
  if (word && word.user_id === userId) {
    const wordResult = applyFsrsReview(today, word.fsrs_snapshot, quality, today);
    const streak = isCorrect(quality) ? (word.correct_streak ?? 0) + 1 : 0;

    let status = word.status;
    if (status === 'unknown') status = 'learning';

    const snap = wordResult.snapshot as SpacedFsrsCardSnapshot;
    if (
      status === 'learning' &&
      (snap.stability > VOCAB_KNOWN_STABILITY_DAYS || streak >= VOCAB_KNOWN_STREAK)
    ) {
      status = 'known';
      promoted = true;
    } else if (status === 'known' && !isCorrect(quality)) {
      status = 'learning';
      demoted = true;
    }

    updatedWord = {
      ...word,
      fsrs_snapshot: wordResult.snapshot,
      correct_streak: streak,
      status,
      updated_at: new Date().toISOString(),
    };
    await saveVocabWord(updatedWord, isOnline);
  }

  return {
    sentence: updatedSentence,
    word: updatedWord,
    nextReviewISO: sentenceResult.nextReviewLocalISO,
    promoted,
    demoted,
  };
}

/** Estabilidade FSRS atual da palavra (0 se nunca revisada). */
export function wordStabilityDays(word: VocabWord): number {
  const s = parseFsrsSnapshot(word.fsrs_snapshot);
  return s?.stability ?? 0;
}
