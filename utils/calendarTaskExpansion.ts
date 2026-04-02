import type { Task, TaskPriority } from '../types';

const YMD_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export interface CalendarTaskOccurrence {
  task: Task;
  /** String passed to week grid / sorting; date-only YYYY-MM-DD or full ISO with local time. */
  displayDue: string;
  occurrenceKey: string;
}

export interface BuildCalendarOccurrencesOptions {
  subjectId?: string;
  priority?: TaskPriority | '';
  pendingOnly?: boolean;
}

function normalizeLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Prefix YYYY-MM-DD from an ISO-ish string, if valid. */
function ymdPrefix(s: string | undefined): string | null {
  if (!s) return null;
  const p = s.trim().slice(0, 10);
  return YMD_ONLY.test(p) ? p : null;
}

/**
 * Calendar day for bucketing (local). Date-only strings use local midnight, not UTC.
 */
export function getLocalDayFromDueOrCompleted(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  if (YMD_ONLY.test(t)) {
    const [y, m, d] = t.split('-').map((x) => parseInt(x, 10));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return normalizeLocalDay(d);
}

/** YYYY-MM-DD for the civil day of `displayDue` (local). */
export function localDateKeyFromDisplayDue(displayDue: string): string {
  const day = getLocalDayFromDueOrCompleted(displayDue);
  return day ? toLocalDateKey(day) : displayDue.slice(0, 10);
}

export function occurrencesForDayKey(
  occs: CalendarTaskOccurrence[],
  dayKey: string
): CalendarTaskOccurrence[] {
  return occs.filter((o) => localDateKeyFromDisplayDue(o.displayDue) === dayKey);
}

function taskMatchesFilters(task: Task, opts: BuildCalendarOccurrencesOptions): boolean {
  if (opts.subjectId) {
    if (task.subjectId !== opts.subjectId) return false;
  }
  if (opts.priority) {
    const p = task.priority ?? 'normal';
    if (p !== opts.priority) return false;
  }
  if (opts.pendingOnly && task.completed) return false;
  return true;
}

/** Time-of-day from original due string, for recurring instances (local). */
function timePortionFromDue(dueDate: string): { h: number; min: number; s: number; ms: number } {
  if (YMD_ONLY.test(dueDate.trim())) {
    return { h: 0, min: 0, s: 0, ms: 0 };
  }
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) {
    return { h: 0, min: 0, s: 0, ms: 0 };
  }
  return {
    h: d.getHours(),
    min: d.getMinutes(),
    s: d.getSeconds(),
    ms: d.getMilliseconds(),
  };
}

function displayDueForDay(baseDue: string, day: Date): string {
  const { h, min, s, ms } = timePortionFromDue(baseDue);
  const x = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, min, s, ms);
  return x.toISOString();
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function addMonthsClamp(day: Date, months: number): Date {
  const y = day.getFullYear();
  const m = day.getMonth() + months;
  const target = new Date(y, m, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const dom = Math.min(day.getDate(), last);
  return new Date(target.getFullYear(), target.getMonth(), dom);
}

function daysBetweenLocal(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000);
}

function isBusinessDay(d: Date): boolean {
  const w = d.getDay();
  return w !== 0 && w !== 6;
}

function addBusinessDays(d: Date, n: number): Date {
  let x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let left = n;
  const step = left >= 0 ? 1 : -1;
  left = Math.abs(left);
  while (left > 0) {
    x = addDays(x, step);
    if (isBusinessDay(x)) left -= 1;
  }
  return x;
}

function expandRecurring(
  task: Task,
  timeMin: Date,
  timeMax: Date,
  baseDue: string
): CalendarTaskOccurrence[] {
  const rec = task.recurrence;
  if (!rec) return [];

  const anchor = getLocalDayFromDueOrCompleted(baseDue);
  if (!anchor) return [];

  const rangeStart = normalizeLocalDay(timeMin);
  const rangeEnd = normalizeLocalDay(timeMax);
  if (rangeEnd.getTime() < rangeStart.getTime()) return [];

  const interval = Math.max(1, rec.interval || 1);
  const out: CalendarTaskOccurrence[] = [];
  const seen = new Set<string>();

  const pushDay = (day: Date) => {
    const key = toLocalDateKey(day);
    if (day.getTime() < rangeStart.getTime() || day.getTime() > rangeEnd.getTime()) return;
    const ok = `${task.id}:${key}`;
    if (seen.has(ok)) return;
    seen.add(ok);
    out.push({
      task,
      displayDue: displayDueForDay(baseDue, day),
      occurrenceKey: `${task.id}:rec:${key}`,
    });
  };

  const freq = rec.frequency;

  if (freq === 'daily') {
    let d = new Date(anchor);
    if (rec.businessDaysOnly) {
      while (d.getTime() < rangeStart.getTime()) {
        d = addBusinessDays(d, interval);
      }
      while (d.getTime() <= rangeEnd.getTime()) {
        pushDay(d);
        d = addBusinessDays(d, interval);
      }
    } else {
      while (d.getTime() < rangeStart.getTime()) {
        d = addDays(d, interval);
      }
      while (d.getTime() <= rangeEnd.getTime()) {
        pushDay(d);
        d = addDays(d, interval);
      }
    }
    return out;
  }

  if (freq === 'weekly' || freq === 'custom') {
    const dows =
      rec.daysOfWeek && rec.daysOfWeek.length > 0
        ? rec.daysOfWeek
        : [anchor.getDay()];

    for (let d = new Date(rangeStart); d.getTime() <= rangeEnd.getTime(); d = addDays(d, 1)) {
      if (d.getTime() < anchor.getTime()) continue;
      if (!dows.includes(d.getDay())) continue;
      const wk = Math.floor(daysBetweenLocal(anchor, d) / 7);
      if (wk % interval !== 0) continue;
      pushDay(d);
    }
    return out;
  }

  if (freq === 'monthly') {
    let d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    while (d.getTime() < rangeStart.getTime()) {
      d = addMonthsClamp(d, interval);
    }
    while (d.getTime() <= rangeEnd.getTime()) {
      pushDay(d);
      d = addMonthsClamp(d, interval);
    }
    return out;
  }

  return out;
}

/**
 * Builds task “occurrences” visible between timeMin and timeMax (inclusive, by local calendar day).
 * Matches calendar rules: due date, completion date, and optional recurrence for incomplete tasks.
 */
export function buildCalendarOccurrences(
  tasks: Task[],
  timeMin: Date,
  timeMax: Date,
  opts: BuildCalendarOccurrencesOptions = {}
): CalendarTaskOccurrence[] {
  const rangeStart = normalizeLocalDay(timeMin);
  const rangeEnd = normalizeLocalDay(timeMax);
  const out: CalendarTaskOccurrence[] = [];

  for (const task of tasks) {
    if (!taskMatchesFilters(task, opts)) continue;

    if (task.recurrence && task.dueDate && !task.completed) {
      out.push(...expandRecurring(task, timeMin, timeMax, task.dueDate));
      continue;
    }

    const dueKey = ymdPrefix(task.dueDate);
    if (dueKey) {
      const dueDay = getLocalDayFromDueOrCompleted(task.dueDate!);
      if (
        dueDay &&
        dueDay.getTime() >= rangeStart.getTime() &&
        dueDay.getTime() <= rangeEnd.getTime()
      ) {
        if (!task.completed || !opts.pendingOnly) {
          out.push({
            task,
            displayDue: task.dueDate!,
            occurrenceKey: `${task.id}:due:${dueKey}`,
          });
        }
      }
    }

    if (task.completed && task.completedAt) {
      const caKey = ymdPrefix(task.completedAt);
      const compDay = getLocalDayFromDueOrCompleted(task.completedAt);
      if (
        caKey &&
        compDay &&
        compDay.getTime() >= rangeStart.getTime() &&
        compDay.getTime() <= rangeEnd.getTime()
      ) {
        out.push({
          task,
          displayDue: task.completedAt,
          occurrenceKey: `${task.id}:done:${caKey}`,
        });
      }
    }
  }

  out.sort(
    (a, b) =>
      new Date(a.displayDue).getTime() - new Date(b.displayDue).getTime() ||
      a.occurrenceKey.localeCompare(b.occurrenceKey)
  );
  return out;
}
