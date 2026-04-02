/** Fila “revisar hoje”: caderno de erros + última tentativa incorreta em dia anterior (ritmo espaçado simples). */

export type QuestionStatForReview = {
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptCorrect: boolean;
  updatedAt?: string;
};

export function isQuestionDueForReviewToday(
  questionId: string,
  wrongQuestionIds: string[],
  stats: Record<string, QuestionStatForReview>
): boolean {
  if (wrongQuestionIds.includes(questionId)) return true;
  const s = stats[questionId];
  if (!s || s.totalAttempts < 1) return false;
  if (s.lastAttemptCorrect) return false;
  if (!s.updatedAt) return true;
  const last = new Date(s.updatedAt);
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  return last.getTime() < startToday.getTime();
}
