import type { Task, TaskPriority } from '../types';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export interface CalendarTaskOccurrence {
  task: Task;
  /** Data/hora usada na grade (prefixo YYYY-MM-DD alinha com células). */
  displayDue: string;
  occurrenceKey: string;
}

function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Primeiro instante do dia local a partir de `due` ou `completedAt`. */
export function getLocalDayFromDueOrCompleted(isoOrYmd: string): Date | null {
  const s = isoOrYmd.trim();
  if (YMD.test(s)) {
    const [y, mo, d] = s.split('-').map((x) => parseInt(x, 10));
    return new Date(y, mo - 1, d);
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return localMidnight(dt);
}

function composeDisplayDue(day: Date, originalDue: string): string {
  const s = originalDue.trim();
  if (YMD.test(s)) {
    return toLocalDateKey(day);
  }
  const orig = new Date(s);
  if (Number.isNaN(orig.getTime())) {
    return toLocalDateKey(day);
  }
  const composed = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    orig.getHours(),
    orig.getMinutes(),
    orig.getSeconds(),
    orig.getMilliseconds()
  );
  return composed.toISOString();
}

/** Espelha o avanço usado em TaskMasterDetail ao concluir tarefa recorrente. */
export function advanceRecurrenceDate(cursor: Date, recurrence: NonNullable<Task['recurrence']>): Date {
  const { frequency, interval = 1, businessDaysOnly } = recurrence;
  const next = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());

  if (frequency === 'daily') {
    next.setDate(next.getDate() + interval);
  } else if (frequency === 'weekly' || frequency === 'custom') {
    next.setDate(next.getDate() + 7 * interval);
  } else if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + interval);
  } else {
    next.setDate(next.getDate() + interval);
  }

  if (businessDaysOnly) {
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

export interface CalendarOccurrenceFilters {
  subjectId: string;
  priority: TaskPriority | '';
  pendingOnly: boolean;
}

const MAX_FAST_FORWARD = 500;
const MAX_OCCURRENCES_PER_TASK = 400;

/**
 * Monta ocorrências para o calendário: tarefas únicas + expansão de `recurrence` no intervalo.
 * Tarefas concluídas com recorrência não expandem (evita duplicar série antiga); aparecem uma vez no dia do `completedAt` se não for "só pendentes".
 */
export function buildCalendarOccurrences(
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date,
  filters: CalendarOccurrenceFilters
): CalendarTaskOccurrence[] {
  const rs = localMidnight(rangeStart);
  const re = localMidnight(rangeEnd);
  const out: CalendarTaskOccurrence[] = [];

  for (const task of tasks) {
    if (filters.subjectId && task.subjectId !== filters.subjectId) continue;

    if (filters.priority) {
      const p = task.priority ?? 'normal';
      if (p !== filters.priority) continue;
    }

    if (filters.pendingOnly && task.completed) continue;

    if (task.recurrence) {
      if (!task.dueDate) continue;

      if (task.completed) {
        if (filters.pendingOnly) continue;
        const anchor = task.completedAt || task.dueDate;
        const day = getLocalDayFromDueOrCompleted(anchor);
        if (!day || day < rs || day > re) continue;
        const displayDue = task.completedAt && !YMD.test(task.completedAt.trim())
          ? task.completedAt
          : composeDisplayDue(day, task.dueDate);
        out.push({ task, displayDue, occurrenceKey: `${task.id}:done:${toLocalDateKey(day)}` });
        continue;
      }

      const anchorDay = getLocalDayFromDueOrCompleted(task.dueDate);
      if (!anchorDay) continue;

      let cursor = new Date(anchorDay);
      let guard = 0;
      while (cursor < rs && guard++ < MAX_FAST_FORWARD) {
        cursor = localMidnight(advanceRecurrenceDate(cursor, task.recurrence));
      }

      guard = 0;
      while (cursor <= re && guard++ < MAX_OCCURRENCES_PER_TASK) {
        const displayDue = composeDisplayDue(cursor, task.dueDate);
        out.push({
          task,
          displayDue,
          occurrenceKey: `${task.id}:${toLocalDateKey(cursor)}`,
        });
        cursor = localMidnight(advanceRecurrenceDate(cursor, task.recurrence));
      }
      continue;
    }

    if (task.completed) {
      if (filters.pendingOnly) continue;
      const anchor = task.completedAt || task.dueDate;
      if (!anchor) continue;
      const day = getLocalDayFromDueOrCompleted(anchor);
      if (!day || day < rs || day > re) continue;
      const displayDue =
        task.completedAt && !YMD.test(task.completedAt.trim()) ? task.completedAt : task.dueDate || anchor;
      out.push({ task, displayDue, occurrenceKey: `${task.id}:completed:${toLocalDateKey(day)}` });
      continue;
    }

    if (!task.dueDate) continue;
    const dueDay = getLocalDayFromDueOrCompleted(task.dueDate);
    if (!dueDay || dueDay < rs || dueDay > re) continue;
    out.push({
      task,
      displayDue: task.dueDate,
      occurrenceKey: task.id,
    });
  }

  return out;
}

/** Chave YYYY-MM-DD do dia civil local (evita erro de `slice` em ISO UTC). */
export function localDateKeyFromDisplayDue(displayDue: string): string {
  const d = getLocalDayFromDueOrCompleted(displayDue);
  if (d) return toLocalDateKey(d);
  const s = displayDue.trim();
  return YMD.test(s) ? s : s.slice(0, 10);
}

/** Ocorrências cujo dia civil local coincide com `dateStr` (YYYY-MM-DD). */
export function occurrencesForDayKey(
  rows: CalendarTaskOccurrence[],
  dateStr: string
): CalendarTaskOccurrence[] {
  return rows.filter((r) => localDateKeyFromDisplayDue(r.displayDue) === dateStr);
}
