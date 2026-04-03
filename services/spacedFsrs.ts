import {
  createEmptyCard,
  fsrs,
  Rating,
  type Card,
  type Grade,
} from 'ts-fsrs';

/** FSRS em granularidade de dias (sem steps de minutos), alinhado ao calendário do app. */
export const spacedFsrsScheduler = fsrs({
  enable_short_term: false,
  request_retention: 0.9,
});

export type SpacedFsrsCardSnapshot = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

function addCalendarDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return dt.toLocaleDateString('en-CA');
}

function dateToLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Primeira revisão 1 dia após a data do estudo (igual ao fluxo SM-2 do app). */
export function createInitialFsrsCard(studyDate: string): Card {
  const studyMid = new Date(studyDate + 'T00:00:00');
  const card = createEmptyCard(studyMid);
  const firstDue = addCalendarDays(studyDate, 1);
  card.due = new Date(firstDue + 'T12:00:00');
  return card;
}

export function fsrsCardToSnapshot(card: Card): SpacedFsrsCardSnapshot {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review != null ? card.last_review.toISOString() : null,
  };
}

export function snapshotToFsrsCard(s: SpacedFsrsCardSnapshot): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  };
}

export function parseFsrsSnapshot(raw: unknown): SpacedFsrsCardSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.due !== 'string') return null;
  if (typeof o.stability !== 'number' || !Number.isFinite(o.stability)) return null;
  if (typeof o.difficulty !== 'number' || !Number.isFinite(o.difficulty)) return null;
  if (typeof o.elapsed_days !== 'number' || !Number.isFinite(o.elapsed_days)) return null;
  if (typeof o.scheduled_days !== 'number' || !Number.isFinite(o.scheduled_days)) return null;
  if (typeof o.learning_steps !== 'number' || !Number.isFinite(o.learning_steps)) return null;
  if (typeof o.reps !== 'number' || !Number.isFinite(o.reps)) return null;
  if (typeof o.lapses !== 'number' || !Number.isFinite(o.lapses)) return null;
  if (typeof o.state !== 'number' || !Number.isFinite(o.state)) return null;
  const last = o.last_review;
  if (last != null && typeof last !== 'string') return null;
  const lastReviewStr: string | null = typeof last === 'string' ? last : null;
  return {
    due: o.due,
    stability: o.stability,
    difficulty: o.difficulty,
    elapsed_days: o.elapsed_days,
    scheduled_days: o.scheduled_days,
    learning_steps: o.learning_steps,
    reps: o.reps,
    lapses: o.lapses,
    state: o.state,
    last_review: lastReviewStr,
  };
}

export function getFsrsRepsFromSnapshot(raw: unknown): number {
  const s = parseFsrsSnapshot(raw);
  return s?.reps ?? 0;
}

export type ReviewQuality = 'again' | 'hard' | 'good' | 'easy';

function qualityToGrade(q: ReviewQuality): Grade {
  switch (q) {
    case 'again':
      return Rating.Again as Grade;
    case 'hard':
      return Rating.Hard as Grade;
    case 'good':
      return Rating.Good as Grade;
    case 'easy':
      return Rating.Easy as Grade;
    default:
      return Rating.Good as Grade;
  }
}

export function applyFsrsReview(
  studyDate: string,
  snapshot: unknown,
  quality: ReviewQuality,
  completionDay: string
): {
  snapshot: SpacedFsrsCardSnapshot;
  nextReviewLocalISO: string;
  intervalDays: number;
} {
  const now = new Date(completionDay + 'T12:00:00');
  const prev = parseFsrsSnapshot(snapshot);
  const card = prev ? snapshotToFsrsCard(prev) : createInitialFsrsCard(studyDate);
  const grade = qualityToGrade(quality);
  const { card: nextCard } = spacedFsrsScheduler.next(card, now, grade);
  const nextReviewLocalISO = dateToLocalISO(nextCard.due);
  const intervalDays = Math.max(
    1,
    Math.round(Number.isFinite(nextCard.scheduled_days) ? nextCard.scheduled_days : 1)
  );
  return {
    snapshot: fsrsCardToSnapshot(nextCard),
    nextReviewLocalISO,
    intervalDays,
  };
}
