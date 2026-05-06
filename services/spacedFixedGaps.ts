import type { SpacedTopic } from '../types';

/** IDs sintéticos em `reviews_completed`: passo 0 → 10000, passo 1 → 10001, … */
export const FIXED_GAP_RUNG_ID_BASE = 10_000;
export const FIXED_GAP_MAX_CYCLES = 12;

export function fixedGapRungId(stepIndex: number): number {
  return FIXED_GAP_RUNG_ID_BASE + stepIndex;
}

export function fixedGapStepFromRungId(id: number): number | null {
  if (!Number.isFinite(id)) return null;
  if (id < FIXED_GAP_RUNG_ID_BASE || id >= FIXED_GAP_RUNG_ID_BASE + FIXED_GAP_MAX_CYCLES) return null;
  return id - FIXED_GAP_RUNG_ID_BASE;
}

export function isFixedGapRungId(id: number): boolean {
  return fixedGapStepFromRungId(id) !== null;
}

/** Chaves em `review_completion_dates` / `review_snoozes` para o modo saltos fixos. */
export function fixedGapCompletionKey(stepIndex: number): string {
  return `fg${stepIndex}`;
}

/**
 * `delays[i]` = dias até o passo `i` ficar no prazo: após `study_date` se `i === 0`,
 * senão após a conclusão do passo `i - 1`. Sequência: 1, 3, 7, 14, depois dobra.
 */
export function getFixedGapStepDelays(numCycles: number): number[] {
  const n = Math.min(FIXED_GAP_MAX_CYCLES, Math.max(4, numCycles));
  const seed = [3, 7, 14];
  const out: number[] = [1];
  for (let i = 1; i < n; i++) {
    const j = i - 1;
    if (j < seed.length) out.push(seed[j]);
    else out.push(out[out.length - 1] * 2);
  }
  return out;
}

function getLastFixedGapCompletionDate(t: SpacedTopic): Date | null {
  const raw = t.review_completion_dates;
  if (!raw || typeof raw !== 'object') return null;
  let max: Date | null = null;
  for (const k of Object.keys(raw)) {
    if (!/^fg\d+$/.test(k)) continue;
    const v = (raw as Record<string, string>)[k];
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) continue;
    const d = new Date(v + 'T00:00:00');
    d.setHours(0, 0, 0, 0);
    if (!max || d.getTime() > max.getTime()) max = d;
  }
  return max;
}

function clampFixedGapDue(rawTarget: Date, t: SpacedTopic): Date {
  const last = getLastFixedGapCompletionDate(t);
  if (!last) return rawTarget;
  const minNext = new Date(last);
  minNext.setDate(minNext.getDate() + 1);
  minNext.setHours(0, 0, 0, 0);
  const raw = new Date(rawTarget);
  raw.setHours(0, 0, 0, 0);
  return raw.getTime() < minNext.getTime() ? minNext : raw;
}

function applyFixedGapSnoozeFloor(base: Date, t: SpacedTopic, step: number): Date {
  const sn = t.review_snoozes?.[fixedGapCompletionKey(step)];
  if (typeof sn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sn)) {
    const snD = new Date(sn + 'T00:00:00');
    snD.setHours(0, 0, 0, 0);
    return snD.getTime() > base.getTime() ? snD : base;
  }
  return base;
}

export function getFixedGapStepDueDate(t: SpacedTopic, step: number): Date {
  const cycles = Math.min(FIXED_GAP_MAX_CYCLES, Math.max(4, t.cycles || 4));
  if (step < 0 || step >= cycles) {
    const x = new Date();
    x.setHours(0, 0, 0, 0);
    return x;
  }
  const delays = getFixedGapStepDelays(cycles);
  const off = t.srs_cumulative_offset_days ?? 0;

  let base: Date;
  if (step === 0) {
    const adjustedStart = new Date(t.study_date + 'T00:00:00');
    adjustedStart.setHours(0, 0, 0, 0);
    base = new Date(adjustedStart);
    base.setDate(adjustedStart.getDate() + delays[0] + off);
  } else {
    const prevStr = t.review_completion_dates?.[fixedGapCompletionKey(step - 1)];
    if (typeof prevStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(prevStr)) {
      const anchor = new Date(prevStr + 'T00:00:00');
      anchor.setHours(0, 0, 0, 0);
      base = new Date(anchor);
      base.setDate(anchor.getDate() + delays[step]);
    } else {
      const adjustedStart = new Date(t.study_date + 'T00:00:00');
      adjustedStart.setHours(0, 0, 0, 0);
      base = new Date(adjustedStart);
      let cum = 0;
      for (let i = 0; i <= step; i++) cum += delays[i];
      base.setDate(adjustedStart.getDate() + cum + off);
    }
  }
  base.setHours(0, 0, 0, 0);
  const lifted = applyFixedGapSnoozeFloor(base, t, step);
  return clampFixedGapDue(lifted, t);
}

export function getFixedGapFirstPendingStep(t: SpacedTopic): number | null {
  const cycles = Math.min(FIXED_GAP_MAX_CYCLES, Math.max(4, t.cycles || 4));
  for (let s = 0; s < cycles; s++) {
    if (!t.reviews_completed.includes(fixedGapRungId(s))) return s;
  }
  return null;
}

export function topicWithoutFixedGapStepCompletion(t: SpacedTopic, step: number): SpacedTopic {
  const key = fixedGapCompletionKey(step);
  const dates = { ...(t.review_completion_dates || {}) };
  delete dates[key];
  const rid = fixedGapRungId(step);
  return {
    ...t,
    reviews_completed: t.reviews_completed.filter(i => i !== rid),
    review_completion_dates: dates,
  };
}

export function filterFixedGapPlanToCycles(topic: SpacedTopic, nextCycles: number): SpacedTopic {
  const c = Math.min(FIXED_GAP_MAX_CYCLES, Math.max(4, nextCycles));
  const dates = { ...(topic.review_completion_dates || {}) };
  for (const k of Object.keys(dates)) {
    if (!/^fg\d+$/.test(k)) continue;
    const step = Number(k.slice(2));
    if (!Number.isFinite(step) || step >= c) delete dates[k];
  }
  const sn = { ...(topic.review_snoozes || {}) };
  for (const k of Object.keys(sn)) {
    if (!/^fg\d+$/.test(k)) continue;
    const step = Number(k.slice(2));
    if (!Number.isFinite(step) || step >= c) delete sn[k];
  }
  const rc = topic.reviews_completed.filter(i => {
    const s = fixedGapStepFromRungId(i);
    return s === null || s < c;
  });
  return { ...topic, review_completion_dates: dates, review_snoozes: sn, reviews_completed: rc };
}

/** Remove chaves `fg*` e ids sintéticos (ao sair do modo ou antes da escada Ebbinghaus). */
export function stripFixedGapKeys(topic: SpacedTopic): SpacedTopic {
  const dates = { ...(topic.review_completion_dates || {}) };
  for (const k of Object.keys(dates)) {
    if (/^fg\d+$/.test(k)) delete dates[k];
  }
  const sn = { ...(topic.review_snoozes || {}) };
  for (const k of Object.keys(sn)) {
    if (/^fg\d+$/.test(k)) delete sn[k];
  }
  const rc = topic.reviews_completed.filter(i => !isFixedGapRungId(i));
  return { ...topic, review_completion_dates: dates, review_snoozes: sn, reviews_completed: rc };
}

export function fixedGapBadgeLabel(step: number, delays: number[]): string {
  if (step <= 0) return `${delays[0]}d`;
  return `+${delays[step]}d`;
}
