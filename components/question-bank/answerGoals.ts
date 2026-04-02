/** Metas diárias/semanais de respostas no Banco de Questões (persistido em user_progress.question_answer_goals). */

export type QuestionAnswerGoalsPersisted = {
  daily_target: number;
  weekly_target: number;
  day_key: string;
  day_count: number;
  week_key: string;
  week_count: number;
};

function clampInt(n: unknown, min: number, max: number): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : Number.parseInt(String(n), 10);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

/** Segunda-feira da semana local (YYYY-MM-DD). */
export function getLocalWeekStartKey(d = new Date()): string {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  const y = c.getFullYear();
  const m = String(c.getMonth() + 1).padStart(2, '0');
  const dayNum = String(c.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

export function getLocalDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function createDefaultAnswerGoals(): QuestionAnswerGoalsPersisted {
  const today = getLocalDayKey();
  const week = getLocalWeekStartKey();
  return {
    daily_target: 0,
    weekly_target: 0,
    day_key: today,
    day_count: 0,
    week_key: week,
    week_count: 0,
  };
}

/** Ajusta contadores se mudou o dia ou a semana (fuso local). */
export function reconcileAnswerGoals(
  g: QuestionAnswerGoalsPersisted,
  now = new Date()
): QuestionAnswerGoalsPersisted {
  const today = getLocalDayKey(now);
  const week = getLocalWeekStartKey(now);
  let { day_key, day_count, week_key, week_count } = g;
  if (day_key !== today) {
    day_key = today;
    day_count = 0;
  }
  if (week_key !== week) {
    week_key = week;
    week_count = 0;
  }
  return {
    ...g,
    day_key,
    day_count,
    week_key,
    week_count,
  };
}

export function parseAnswerGoalsFromDb(raw: unknown): QuestionAnswerGoalsPersisted {
  const base = createDefaultAnswerGoals();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return reconcileAnswerGoals(base);
  }
  const o = raw as Record<string, unknown>;
  const merged: QuestionAnswerGoalsPersisted = {
    daily_target: clampInt(o.daily_target, 0, 500),
    weekly_target: clampInt(o.weekly_target, 0, 5000),
    day_key: typeof o.day_key === 'string' ? o.day_key : base.day_key,
    day_count: clampInt(o.day_count, 0, 1_000_000),
    week_key: typeof o.week_key === 'string' ? o.week_key : base.week_key,
    week_count: clampInt(o.week_count, 0, 1_000_000),
  };
  return reconcileAnswerGoals(merged);
}

/** Uma resposta registada (alinha ao upsert de user_question_stats). */
export function bumpAnswerGoals(g: QuestionAnswerGoalsPersisted): QuestionAnswerGoalsPersisted {
  const r = reconcileAnswerGoals(g);
  return {
    ...r,
    day_count: r.day_count + 1,
    week_count: r.week_count + 1,
  };
}

export function progressRatio(done: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.min(100, (done / target) * 100);
}
