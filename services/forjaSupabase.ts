import { supabase } from './supabaseClient';

/** Limites de listagens para reduzir carga no Postgres (ajustar se necessário). */
const FORJA_TASKS_MAX = 800;
const FORJA_TRANSACTIONS_MAX = 3000;
const FORJA_GOALS_MAX = 500;
const FORJA_FOCUS_SESSIONS_MAX = 1500;

/** Mapeia linha forja_user_profiles para o formato esperado pelo UI (camelCase, tipos MySQL-like). */
export function mapProfileRow(r: Record<string, unknown>) {
  return {
    id: Number((r as { id?: number }).id ?? 0),
    userId: 0,
    displayName: (r.display_name as string) ?? null,
    avatarUrl: (r.avatar_url as string) ?? null,
    xp: Number(r.xp ?? 0),
    coins: Number(r.coins ?? 0),
    level: Number(r.level ?? 1),
    streak: Number(r.streak ?? 0),
    waterMl: Number(r.water_ml ?? 0),
    waterGoalMl: Number(r.water_goal_ml ?? 2000),
    sleepRating: (r.sleep_rating as string) ?? null,
    energyRating: (r.energy_rating as string) ?? null,
    humorRating: (r.humor_rating as string) ?? null,
    focusHoursGoal: Number(r.focus_hours_goal ?? 40),
    notifyHabits: Boolean(r.notify_habits ?? true),
    notifyMetas: Boolean(r.notify_metas ?? true),
    notifyCommunity: Boolean(r.notify_community ?? true),
    updatedAt: r.updated_at as string,
  };
}

export async function forjaGetOrCreateProfile(userId: string) {
  const { data: row, error } = await supabase.from('forja_user_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (row) return mapProfileRow(row);
  const { error: insErr } = await supabase.from('forja_user_profiles').insert({ user_id: userId });
  if (insErr) throw insErr;
  const { data: created, error: e2 } = await supabase.from('forja_user_profiles').select('*').eq('user_id', userId).single();
  if (e2) throw e2;
  return mapProfileRow(created);
}

export async function forjaUpdateProfile(userId: string, patch: Partial<{
  displayName: string; avatarUrl: string; xp: number; coins: number; level: number; streak: number;
  waterMl: number; waterGoalMl: number; sleepRating: string; energyRating: string; humorRating: string;
  focusHoursGoal: number; notifyHabits: boolean; notifyMetas: boolean; notifyCommunity: boolean;
}>) {
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.displayName !== undefined) db.display_name = patch.displayName;
  if (patch.avatarUrl !== undefined) db.avatar_url = patch.avatarUrl;
  if (patch.xp !== undefined) db.xp = patch.xp;
  if (patch.coins !== undefined) db.coins = patch.coins;
  if (patch.level !== undefined) db.level = patch.level;
  if (patch.streak !== undefined) db.streak = patch.streak;
  if (patch.waterMl !== undefined) db.water_ml = patch.waterMl;
  if (patch.waterGoalMl !== undefined) db.water_goal_ml = patch.waterGoalMl;
  if (patch.sleepRating !== undefined) db.sleep_rating = patch.sleepRating;
  if (patch.energyRating !== undefined) db.energy_rating = patch.energyRating;
  if (patch.humorRating !== undefined) db.humor_rating = patch.humorRating;
  if (patch.focusHoursGoal !== undefined) db.focus_hours_goal = patch.focusHoursGoal;
  if (patch.notifyHabits !== undefined) db.notify_habits = patch.notifyHabits;
  if (patch.notifyMetas !== undefined) db.notify_metas = patch.notifyMetas;
  if (patch.notifyCommunity !== undefined) db.notify_community = patch.notifyCommunity;
  const { error } = await supabase.from('forja_user_profiles').update(db).eq('user_id', userId);
  if (error) throw error;
}

function mapHabit(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    name: r.name as string,
    icon: r.icon as string,
    frequency: r.frequency as string,
    dailyGoal: Number(r.daily_goal),
    customDays: (r.custom_days as number[]) ?? null,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function forjaListHabits(userId: string) {
  const { data, error } = await supabase.from('forja_habits').select('*').eq('user_id', userId).eq('is_active', true);
  if (error) throw error;
  return (data ?? []).map((r) => mapHabit(r));
}

export async function forjaCreateHabit(userId: string, input: {
  name: string; icon?: string; frequency?: string; dailyGoal?: number; customDays?: number[];
}) {
  const { data, error } = await supabase.from('forja_habits').insert({
    user_id: userId,
    name: input.name,
    icon: input.icon ?? '💪',
    frequency: input.frequency ?? 'daily',
    daily_goal: input.dailyGoal ?? 1,
    custom_days: input.customDays ?? null,
  }).select('*').single();
  if (error) throw error;
  return mapHabit(data);
}

export async function forjaDeleteHabit(userId: string, id: number) {
  const { error } = await supabase.from('forja_habits').update({ is_active: false }).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

function mapCompletion(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    habitId: Number(r.habit_id),
    userId: 0,
    date: r.date as string,
    count: Number(r.count),
    createdAt: r.created_at as string,
  };
}

export async function forjaHabitCompletions(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase.from('forja_habit_completions').select('*').eq('user_id', userId)
    .gte('date', startDate).lte('date', endDate);
  if (error) throw error;
  return (data ?? []).map((r) => mapCompletion(r));
}

export async function forjaToggleHabit(userId: string, habitId: number, date: string) {
  const { data: existing } = await supabase.from('forja_habit_completions').select('id').eq('user_id', userId)
    .eq('habit_id', habitId).eq('date', date).maybeSingle();
  if (existing?.id) {
    await supabase.from('forja_habit_completions').delete().eq('id', existing.id);
    return { action: 'removed' as const };
  }
  await supabase.from('forja_habit_completions').insert({ user_id: userId, habit_id: habitId, date, count: 1 });
  return { action: 'added' as const };
}

function mapTask(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    title: r.title as string,
    description: r.description as string | null,
    date: r.date as string,
    time: r.time as string | null,
    priority: r.priority as string,
    isCompleted: Boolean(r.is_completed),
    isRecurring: Boolean(r.is_recurring),
    recurringDays: (r.recurring_days as number[]) ?? null,
    xpReward: Number(r.xp_reward),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function forjaListTasks(userId: string, startDate?: string, endDate?: string) {
  let q = supabase.from('forja_tasks').select('*').eq('user_id', userId).order('date', { ascending: true });
  if (startDate) q = q.gte('date', startDate);
  if (endDate) q = q.lte('date', endDate);
  if (!startDate && !endDate) q = q.limit(FORJA_TASKS_MAX);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => mapTask(r));
}

export async function forjaCreateTask(userId: string, input: {
  title: string; description?: string; date: string; time?: string; priority?: string;
  isRecurring?: boolean; recurringDays?: number[]; xpReward?: number;
}) {
  const { data, error } = await supabase.from('forja_tasks').insert({
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    date: input.date,
    time: input.time ?? null,
    priority: input.priority ?? 'medium',
    is_recurring: input.isRecurring ?? false,
    recurring_days: input.recurringDays ?? null,
    xp_reward: input.xpReward ?? 10,
  }).select('*').single();
  if (error) throw error;
  return mapTask(data);
}

export async function forjaUpdateTask(userId: string, id: number, patch: Partial<{
  title: string; description: string; date: string; time: string; priority: string;
  isCompleted: boolean; isRecurring: boolean; recurringDays: number[];
}>) {
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) db.title = patch.title;
  if (patch.description !== undefined) db.description = patch.description;
  if (patch.date !== undefined) db.date = patch.date;
  if (patch.time !== undefined) db.time = patch.time;
  if (patch.priority !== undefined) db.priority = patch.priority;
  if (patch.isCompleted !== undefined) db.is_completed = patch.isCompleted;
  if (patch.isRecurring !== undefined) db.is_recurring = patch.isRecurring;
  if (patch.recurringDays !== undefined) db.recurring_days = patch.recurringDays;
  const { error } = await supabase.from('forja_tasks').update(db).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function forjaDeleteTask(userId: string, id: number) {
  const { error } = await supabase.from('forja_tasks').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

function mapGoal(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    title: r.title as string,
    description: r.description as string | null,
    category: r.category as string | null,
    icon: r.icon as string,
    deadline: r.deadline as string | null,
    status: r.status as string,
    progress: Number(r.progress),
    milestones: (r.milestones as { text: string; done: boolean }[]) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function forjaListGoals(userId: string, status?: string) {
  let q = supabase
    .from('forja_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(FORJA_GOALS_MAX);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => mapGoal(r));
}

export async function forjaCreateGoal(userId: string, input: {
  title: string; description?: string; category?: string; icon?: string; deadline?: string;
  milestones?: { text: string; done: boolean }[];
}) {
  const { data, error } = await supabase.from('forja_goals').insert({
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    category: input.category ?? null,
    icon: input.icon ?? '🎯',
    deadline: input.deadline ?? null,
    milestones: input.milestones ?? null,
  }).select('*').single();
  if (error) throw error;
  return mapGoal(data);
}

export async function forjaUpdateGoal(userId: string, id: number, patch: Record<string, unknown>) {
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) db.title = patch.title;
  if (patch.description !== undefined) db.description = patch.description;
  if (patch.category !== undefined) db.category = patch.category;
  if (patch.icon !== undefined) db.icon = patch.icon;
  if (patch.deadline !== undefined) db.deadline = patch.deadline;
  if (patch.status !== undefined) db.status = patch.status;
  if (patch.progress !== undefined) db.progress = patch.progress;
  if (patch.milestones !== undefined) db.milestones = patch.milestones;
  const { error } = await supabase.from('forja_goals').update(db).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function forjaDeleteGoal(userId: string, id: number) {
  const { error } = await supabase.from('forja_goals').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

function mapTx(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    title: r.title as string,
    amount: Number(r.amount),
    type: r.type as string,
    category: r.category as string,
    date: r.date as string,
    month: Number(r.month),
    year: Number(r.year),
    notes: r.notes as string | null,
    createdAt: r.created_at as string,
  };
}

export async function forjaListTransactions(userId: string, year?: number, month?: number) {
  let q = supabase
    .from('forja_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(FORJA_TRANSACTIONS_MAX);
  if (year !== undefined) q = q.eq('year', year);
  if (month !== undefined) q = q.eq('month', month);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => mapTx(r));
}

export async function forjaCreateTransaction(userId: string, input: {
  title: string; amount: number; type: string; category: string; date: string; month: number; year: number; notes?: string;
}) {
  const { data, error } = await supabase.from('forja_transactions').insert({
    user_id: userId,
    title: input.title,
    amount: input.amount,
    type: input.type,
    category: input.category,
    date: input.date,
    month: input.month,
    year: input.year,
    notes: input.notes ?? null,
  }).select('*').single();
  if (error) throw error;
  return mapTx(data);
}

export async function forjaUpdateTransaction(userId: string, id: number, patch: Record<string, unknown>) {
  const db: Record<string, unknown> = {};
  if (patch.title !== undefined) db.title = patch.title;
  if (patch.amount !== undefined) db.amount = patch.amount;
  if (patch.type !== undefined) db.type = patch.type;
  if (patch.category !== undefined) db.category = patch.category;
  if (patch.date !== undefined) db.date = patch.date;
  if (patch.notes !== undefined) db.notes = patch.notes;
  const { error } = await supabase.from('forja_transactions').update(db).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function forjaDeleteTransaction(userId: string, id: number) {
  const { error } = await supabase.from('forja_transactions').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

function mapCard(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    name: r.name as string,
    brand: r.brand as string,
    type: r.type as string,
    lastDigits: r.last_digits as string | null,
    cardLimit: Number(r.card_limit ?? 0),
    closingDay: Number(r.closing_day),
    dueDay: Number(r.due_day),
    color: r.color as string,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at as string,
  };
}

export async function forjaListCards(userId: string) {
  const { data, error } = await supabase.from('forja_financial_cards').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapCard(r));
}

export async function forjaCreateCard(userId: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from('forja_financial_cards').insert({
    user_id: userId,
    name: row.name,
    brand: row.brand ?? 'Visa',
    type: row.type ?? 'credit',
    last_digits: row.lastDigits ?? null,
    card_limit: row.cardLimit ?? 0,
    closing_day: row.closingDay ?? 1,
    due_day: row.dueDay ?? 10,
    color: row.color ?? '#EF4444',
  }).select('*').single();
  if (error) throw error;
  return mapCard(data);
}

export async function forjaUpdateCard(userId: string, id: number, patch: Record<string, unknown>) {
  const db: Record<string, unknown> = {};
  if (patch.name !== undefined) db.name = patch.name;
  if (patch.brand !== undefined) db.brand = patch.brand;
  if (patch.type !== undefined) db.type = patch.type;
  if (patch.lastDigits !== undefined) db.last_digits = patch.lastDigits;
  if (patch.cardLimit !== undefined) db.card_limit = patch.cardLimit;
  if (patch.closingDay !== undefined) db.closing_day = patch.closingDay;
  if (patch.dueDay !== undefined) db.due_day = patch.dueDay;
  if (patch.color !== undefined) db.color = patch.color;
  const { error } = await supabase.from('forja_financial_cards').update(db).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function forjaDeleteCard(userId: string, id: number) {
  const { error } = await supabase.from('forja_financial_cards').update({ is_active: false }).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

function mapAccount(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    name: r.name as string,
    type: r.type as string,
    balance: Number(r.balance),
    icon: r.icon as string,
    color: r.color as string,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function forjaListAccounts(userId: string) {
  const { data, error } = await supabase.from('forja_bank_accounts').select('*').eq('user_id', userId).eq('is_active', true);
  if (error) throw error;
  return (data ?? []).map((r) => mapAccount(r));
}

export async function forjaCreateAccount(userId: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from('forja_bank_accounts').insert({
    user_id: userId,
    name: row.name,
    type: row.type ?? 'checking',
    balance: row.balance ?? 0,
    icon: row.icon ?? '🏦',
    color: row.color ?? '#3B82F6',
  }).select('*').single();
  if (error) throw error;
  return mapAccount(data);
}

export async function forjaUpdateAccount(userId: string, id: number, patch: Record<string, unknown>) {
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) db.name = patch.name;
  if (patch.type !== undefined) db.type = patch.type;
  if (patch.balance !== undefined) db.balance = patch.balance;
  if (patch.icon !== undefined) db.icon = patch.icon;
  if (patch.color !== undefined) db.color = patch.color;
  const { error } = await supabase.from('forja_bank_accounts').update(db).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function forjaDeleteAccount(userId: string, id: number) {
  const { error } = await supabase.from('forja_bank_accounts').update({ is_active: false }).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

function mapShop(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    name: r.name as string,
    estimatedPrice: r.estimated_price != null ? Number(r.estimated_price) : null,
    category: r.category as string | null,
    priority: r.priority as string,
    status: r.status as string,
    link: r.link as string | null,
    notes: r.notes as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function forjaListShopping(userId: string) {
  const { data, error } = await supabase.from('forja_shopping_items').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => mapShop(r));
}

export async function forjaCreateShopping(userId: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from('forja_shopping_items').insert({
    user_id: userId,
    name: row.name,
    estimated_price: row.estimatedPrice ?? null,
    category: row.category ?? null,
    priority: row.priority ?? 'medium',
    link: row.link ?? null,
    notes: row.notes ?? null,
  }).select('*').single();
  if (error) throw error;
  return mapShop(data);
}

export async function forjaUpdateShopping(userId: string, id: number, patch: Record<string, unknown>) {
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) db.name = patch.name;
  if (patch.estimatedPrice !== undefined) db.estimated_price = patch.estimatedPrice;
  if (patch.category !== undefined) db.category = patch.category;
  if (patch.priority !== undefined) db.priority = patch.priority;
  if (patch.status !== undefined) db.status = patch.status;
  if (patch.link !== undefined) db.link = patch.link;
  if (patch.notes !== undefined) db.notes = patch.notes;
  const { error } = await supabase.from('forja_shopping_items').update(db).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function forjaDeleteShopping(userId: string, id: number) {
  const { error } = await supabase.from('forja_shopping_items').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

function mapRule(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    category: r.category as string,
    monthlyLimit: Number(r.monthly_limit),
    alertAt: Number(r.alert_at),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at as string,
  };
}

export async function forjaListRules(userId: string) {
  const { data, error } = await supabase.from('forja_budget_rules').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => mapRule(r));
}

export async function forjaCreateRule(userId: string, row: { category: string; monthlyLimit: number; alertAt?: number }) {
  const { data, error } = await supabase.from('forja_budget_rules').insert({
    user_id: userId,
    category: row.category,
    monthly_limit: row.monthlyLimit,
    alert_at: row.alertAt ?? 80,
  }).select('*').single();
  if (error) throw error;
  return mapRule(data);
}

export async function forjaUpdateRule(userId: string, id: number, patch: Record<string, unknown>) {
  const db: Record<string, unknown> = {};
  if (patch.category !== undefined) db.category = patch.category;
  if (patch.monthlyLimit !== undefined) db.monthly_limit = patch.monthlyLimit;
  if (patch.alertAt !== undefined) db.alert_at = patch.alertAt;
  const { error } = await supabase.from('forja_budget_rules').update(db).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function forjaDeleteRule(userId: string, id: number) {
  const { error } = await supabase.from('forja_budget_rules').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

function mapNote(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    title: r.title as string,
    content: r.content as string | null,
    color: r.color as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function forjaListNotes(userId: string) {
  const { data, error } = await supabase.from('forja_finance_notes').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => mapNote(r));
}

export async function forjaCreateNote(userId: string, row: { title: string; content?: string; color?: string }) {
  const { data, error } = await supabase.from('forja_finance_notes').insert({
    user_id: userId,
    title: row.title,
    content: row.content ?? null,
    color: row.color ?? '#FBBF24',
  }).select('*').single();
  if (error) throw error;
  return mapNote(data);
}

export async function forjaUpdateNote(userId: string, id: number, patch: Record<string, unknown>) {
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) db.title = patch.title;
  if (patch.content !== undefined) db.content = patch.content;
  if (patch.color !== undefined) db.color = patch.color;
  const { error } = await supabase.from('forja_finance_notes').update(db).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function forjaDeleteNote(userId: string, id: number) {
  const { error } = await supabase.from('forja_finance_notes').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

function mapFocusProject(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    name: r.name as string,
    color: r.color as string,
    totalMinutes: Number(r.total_minutes),
    createdAt: r.created_at as string,
  };
}

export async function forjaListFocusProjects(userId: string) {
  const { data, error } = await supabase.from('forja_focus_projects').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => mapFocusProject(r));
}

export async function forjaCreateFocusProject(userId: string, row: { name: string; color?: string }) {
  const { data, error } = await supabase.from('forja_focus_projects').insert({
    user_id: userId,
    name: row.name,
    color: row.color ?? '#EF4444',
  }).select('*').single();
  if (error) throw error;
  return mapFocusProject(data);
}

export async function forjaUpdateFocusProject(userId: string, id: number, patch: { totalMinutes?: number }) {
  const db: Record<string, unknown> = {};
  if (patch.totalMinutes !== undefined) db.total_minutes = patch.totalMinutes;
  const { error } = await supabase.from('forja_focus_projects').update(db).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function forjaDeleteFocusProject(userId: string, id: number) {
  const { error } = await supabase.from('forja_focus_projects').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

function mapFocusSession(r: Record<string, unknown>) {
  return {
    id: Number(r.id),
    userId: 0,
    projectId: r.project_id != null ? Number(r.project_id) : null,
    projectName: r.project_name as string,
    duration: Number(r.duration),
    type: r.type as string,
    date: r.date as string,
    time: r.time as string,
    createdAt: r.created_at as string,
  };
}

export async function forjaListFocusSessions(userId: string, startDate?: string, endDate?: string) {
  let q = supabase
    .from('forja_focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (startDate) q = q.gte('date', startDate);
  if (endDate) q = q.lte('date', endDate);
  if (!startDate && !endDate) q = q.limit(FORJA_FOCUS_SESSIONS_MAX);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => mapFocusSession(r));
}

export async function forjaCreateFocusSession(userId: string, row: {
  projectId?: number; projectName?: string; duration: number; type?: string; date: string; time: string;
}) {
  const { data, error } = await supabase.from('forja_focus_sessions').insert({
    user_id: userId,
    project_id: row.projectId ?? null,
    project_name: row.projectName ?? 'Sem projeto',
    duration: row.duration,
    type: row.type ?? 'focus',
    date: row.date,
    time: row.time,
  }).select('*').single();
  if (error) throw error;
  return mapFocusSession(data);
}

export async function forjaGetWaterLog(userId: string, date: string) {
  const { data, error } = await supabase.from('forja_water_logs').select('*').eq('user_id', userId).eq('date', date).maybeSingle();
  if (error) throw error;
  if (!data) return { date, amountMl: 0 };
  return { date: data.date as string, amountMl: Number(data.amount_ml) };
}

export async function forjaWaterRange(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase.from('forja_water_logs').select('*').eq('user_id', userId)
    .gte('date', startDate).lte('date', endDate);
  if (error) throw error;
  return (data ?? []).map((r) => ({ date: r.date as string, amountMl: Number(r.amount_ml) }));
}

export async function forjaUpsertWater(userId: string, date: string, amountMl: number) {
  const { error } = await supabase.from('forja_water_logs').upsert(
    { user_id: userId, date, amount_ml: amountMl, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,date' }
  );
  if (error) throw error;
}

export async function forjaListAppNotifications(userId: string) {
  const { data, error } = await supabase.from('forja_app_notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function forjaCreateAppNotification(userId: string, row: { type: string; title: string; message: string; icon?: string; color?: string }) {
  await supabase.from('forja_app_notifications').insert({
    user_id: userId,
    type: row.type,
    title: row.title,
    message: row.message,
    icon: row.icon ?? '🔔',
    color: row.color ?? 'text-yellow-400',
  });
}

export async function forjaMarkNotificationsRead(userId: string) {
  await supabase.from('forja_app_notifications').update({ is_read: true }).eq('user_id', userId);
}

export async function forjaClearNotifications(userId: string) {
  await supabase.from('forja_app_notifications').delete().eq('user_id', userId);
}

export async function forjaListAchievements(userId: string) {
  const { data, error } = await supabase.from('forja_user_achievements').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    userId: 0,
    achievementKey: r.achievement_key as string,
    unlockedAt: r.unlocked_at as string,
  }));
}

export async function forjaUnlockAchievement(userId: string, achievementKey: string) {
  const { data, error } = await supabase.from('forja_user_achievements').insert({
    user_id: userId,
    achievement_key: achievementKey,
  }).select('*').single();
  if (error && !String(error.message).includes('duplicate')) throw error;
  return data;
}

export async function forjaListFeatured(userId: string) {
  const { data, error } = await supabase.from('forja_featured_achievements').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    userId: 0,
    slot: Number(r.slot),
    achievementKey: (r.achievement_key as string) ?? null,
    updatedAt: r.updated_at as string,
  }));
}

export async function forjaSetFeatured(userId: string, slot: number, achievementKey: string | null) {
  await supabase.from('forja_featured_achievements').upsert(
    { user_id: userId, slot, achievement_key: achievementKey, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,slot' }
  );
}

export async function forjaProfileAddXp(userId: string, amount: number) {
  const p = await forjaGetOrCreateProfile(userId);
  const newXp = p.xp + amount;
  const newLevel = Math.floor(newXp / 100) + 1;
  await forjaUpdateProfile(userId, { xp: newXp, level: newLevel });
  return { xp: newXp, level: newLevel };
}

export async function forjaProfileAddCoins(userId: string, amount: number) {
  const p = await forjaGetOrCreateProfile(userId);
  const newCoins = p.coins + amount;
  await forjaUpdateProfile(userId, { coins: newCoins });
  return { coins: newCoins };
}
