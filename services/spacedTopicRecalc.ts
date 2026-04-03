import type { SpacedTopic, SrsAlgorithm } from '../types';
import { createInitialFsrsCard, fsrsCardToSnapshot } from './spacedFsrs';

function getIntervalsForCycles(num: number) {
  const intervals = [1, 3, 7, 15];
  if (num <= 4) return intervals.slice(0, num);
  for (let i = 4; i < num; i++) {
    intervals.push(intervals[i - 1] * 2);
  }
  return intervals;
}

function addCalendarDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return dt.toLocaleDateString('en-CA');
}

function normalizeAlgoChoice(a: SrsAlgorithm | undefined | null): SrsAlgorithm {
  if (a === 'sm2' || a === 'fsrs') return a;
  return 'fixed';
}

function filterFixedPlanToIntervals(topic: SpacedTopic, intervals: number[]): SpacedTopic {
  const rc = topic.reviews_completed.filter(i => intervals.includes(i));
  const dates = { ...(topic.review_completion_dates || {}) };
  for (const k of Object.keys(dates)) {
    if (!/^\d+$/.test(k)) continue;
    const iv = Number(k);
    if (!intervals.includes(iv)) delete dates[k];
  }
  const sn = { ...(topic.review_snoozes || {}) };
  for (const k of Object.keys(sn)) {
    const iv = Number(k);
    if (!intervals.includes(iv)) delete sn[k];
  }
  return { ...topic, reviews_completed: rc, review_completion_dates: dates, review_snoozes: sn };
}

export type SpacedTopicPlanPatch = {
  study_date?: string;
  cycles?: number;
  srs_algorithm?: SrsAlgorithm;
};

/**
 * Regras (espelhadas no texto da UI):
 * - Trocar algoritmo: reinicia o estado do modo destino (fixo mantém degraus concluídos válidos; SM-2/FSRS zeram fila fixa e reiniciam scheduler).
 * - Só mudar data (fixo): mantém degraus concluídos; zera offset cumulativo e snoozes.
 * - Só mudar data (SM-2/FSRS): reinicia scheduler a partir da nova data (primeira revisão = data + 1 dia).
 * - Só mudar ciclos (fixo): remove conclusões/snoozes cujo degrau deixou de existir no plano.
 * - Só mudar ciclos (SM-2/FSRS): só altera meta de “ciclos”; estado do scheduler inalterado.
 */
export function applySpacedTopicPlanEdit(prev: SpacedTopic, patch: SpacedTopicPlanPatch): SpacedTopic {
  const nextStudy = patch.study_date ?? prev.study_date;
  const nextCycles = Math.min(12, Math.max(4, patch.cycles ?? prev.cycles ?? 4));
  const nextAlgo = normalizeAlgoChoice(patch.srs_algorithm ?? prev.srs_algorithm);

  const studyCh = patch.study_date !== undefined && patch.study_date !== prev.study_date;
  const cyclesCh = patch.cycles !== undefined && patch.cycles !== prev.cycles;
  const algoCh =
    patch.srs_algorithm !== undefined &&
    normalizeAlgoChoice(patch.srs_algorithm) !== normalizeAlgoChoice(prev.srs_algorithm);

  const intervals = getIntervalsForCycles(nextCycles);

  let t: SpacedTopic = {
    ...prev,
    study_date: nextStudy,
    cycles: nextCycles,
    srs_algorithm: nextAlgo,
  };

  if (algoCh) {
    if (nextAlgo === 'fixed') {
      t = {
        ...t,
        srs_ease_factor: 2.5,
        srs_repetitions: 0,
        srs_interval_days: null,
        srs_next_review_at: null,
        srs_fsrs_card: null,
        srs_cumulative_offset_days: 0,
        review_snoozes: {},
      };
      t = filterFixedPlanToIntervals(t, intervals);
      return t;
    }
    if (nextAlgo === 'sm2') {
      return {
        ...t,
        reviews_completed: [],
        review_snoozes: {},
        srs_cumulative_offset_days: 0,
        srs_ease_factor: 2.5,
        srs_repetitions: 0,
        srs_interval_days: null,
        srs_next_review_at: addCalendarDays(nextStudy, 1),
        srs_fsrs_card: null,
      };
    }
    return {
      ...t,
      reviews_completed: [],
      review_snoozes: {},
      srs_cumulative_offset_days: 0,
      srs_ease_factor: 2.5,
      srs_repetitions: 0,
      srs_interval_days: null,
      srs_next_review_at: addCalendarDays(nextStudy, 1),
      srs_fsrs_card: fsrsCardToSnapshot(createInitialFsrsCard(nextStudy)),
    };
  }

  if (studyCh) {
    if (nextAlgo === 'fixed') {
      t = {
        ...t,
        srs_cumulative_offset_days: 0,
        review_snoozes: {},
      };
    } else if (nextAlgo === 'sm2') {
      t = {
        ...t,
        srs_ease_factor: 2.5,
        srs_repetitions: 0,
        srs_interval_days: null,
        srs_next_review_at: addCalendarDays(nextStudy, 1),
      };
    } else {
      t = {
        ...t,
        srs_ease_factor: 2.5,
        srs_repetitions: 0,
        srs_interval_days: null,
        srs_next_review_at: addCalendarDays(nextStudy, 1),
        srs_fsrs_card: fsrsCardToSnapshot(createInitialFsrsCard(nextStudy)),
      };
    }
  }

  if (cyclesCh && nextAlgo === 'fixed') {
    t = filterFixedPlanToIntervals(t, intervals);
  }

  return t;
}
