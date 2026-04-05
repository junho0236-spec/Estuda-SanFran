import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  userProfiles, InsertUserProfile,
  habits, InsertHabit,
  habitCompletions, InsertHabitCompletion,
  tasks, InsertTask,
  goals, InsertGoal,
  transactions, InsertTransaction,
  financialCards, InsertFinancialCard,
  bankAccounts, InsertBankAccount,
  shoppingItems, InsertShoppingItem,
  budgetRules, InsertBudgetRule,
  financeNotes, InsertFinanceNote,
  focusProjects, InsertFocusProject,
  focusSessions, InsertFocusSession,
  waterLogs, InsertWaterLog,
  notifications, InsertNotification,
  userAchievements, InsertUserAchievement,
  featuredAchievements, InsertFeaturedAchievement,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USERS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ USER PROFILES ============

export async function getOrCreateProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(userProfiles).values({ userId });
  const created = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return created[0] ?? null;
}

export async function updateProfile(userId: number, data: Partial<InsertUserProfile>) {
  const db = await getDb();
  if (!db) return;
  await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
}

// ============ HABITS ============

export async function getHabits(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true)));
}

export async function createHabit(data: InsertHabit) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(habits).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(habits).where(eq(habits.id, id)).limit(1);
  return created[0] ?? null;
}

export async function deleteHabit(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(habits).set({ isActive: false }).where(and(eq(habits.id, id), eq(habits.userId, userId)));
}

export async function getHabitCompletions(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(habitCompletions).where(
    and(eq(habitCompletions.userId, userId), gte(habitCompletions.date, startDate), lte(habitCompletions.date, endDate))
  );
}

export async function toggleHabitCompletion(data: InsertHabitCompletion) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(habitCompletions).where(
    and(eq(habitCompletions.habitId, data.habitId), eq(habitCompletions.userId, data.userId), eq(habitCompletions.date, data.date))
  ).limit(1);
  if (existing.length > 0) {
    await db.delete(habitCompletions).where(eq(habitCompletions.id, existing[0].id));
    return { action: "removed" as const };
  }
  await db.insert(habitCompletions).values(data);
  return { action: "added" as const };
}

// ============ TASKS ============

export async function getTasks(userId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(tasks.userId, userId)];
  if (startDate) conditions.push(gte(tasks.date, startDate));
  if (endDate) conditions.push(lte(tasks.date, endDate));
  return db.select().from(tasks).where(and(...conditions)).orderBy(tasks.date);
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(tasks).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return created[0] ?? null;
}

export async function updateTask(id: number, userId: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set(data).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function deleteTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

// ============ GOALS ============

export async function getGoals(userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(goals.userId, userId)];
  if (status) conditions.push(eq(goals.status, status as "active" | "completed" | "paused"));
  return db.select().from(goals).where(and(...conditions)).orderBy(desc(goals.createdAt));
}

export async function createGoal(data: InsertGoal) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(goals).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  return created[0] ?? null;
}

export async function updateGoal(id: number, userId: number, data: Partial<InsertGoal>) {
  const db = await getDb();
  if (!db) return;
  await db.update(goals).set(data).where(and(eq(goals.id, id), eq(goals.userId, userId)));
}

export async function deleteGoal(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
}

// ============ TRANSACTIONS ============

export async function getTransactions(userId: number, year?: number, month?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(transactions.userId, userId)];
  if (year !== undefined) conditions.push(eq(transactions.year, year));
  if (month !== undefined) conditions.push(eq(transactions.month, month));
  return db.select().from(transactions).where(and(...conditions)).orderBy(desc(transactions.createdAt));
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(transactions).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return created[0] ?? null;
}

export async function updateTransaction(id: number, userId: number, data: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) return;
  await db.update(transactions).set(data).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

export async function deleteTransaction(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

// ============ FINANCIAL CARDS ============

export async function getFinancialCards(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialCards).where(and(eq(financialCards.userId, userId), eq(financialCards.isActive, true))).orderBy(desc(financialCards.createdAt));
}

export async function createFinancialCard(data: InsertFinancialCard) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(financialCards).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(financialCards).where(eq(financialCards.id, id)).limit(1);
  return created[0] ?? null;
}

export async function updateFinancialCard(id: number, userId: number, data: Partial<InsertFinancialCard>) {
  const db = await getDb();
  if (!db) return;
  await db.update(financialCards).set(data).where(and(eq(financialCards.id, id), eq(financialCards.userId, userId)));
}

export async function deleteFinancialCard(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(financialCards).set({ isActive: false }).where(and(eq(financialCards.id, id), eq(financialCards.userId, userId)));
}

// ============ BANK ACCOUNTS ============

export async function getBankAccounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bankAccounts).where(and(eq(bankAccounts.userId, userId), eq(bankAccounts.isActive, true))).orderBy(desc(bankAccounts.createdAt));
}

export async function createBankAccount(data: InsertBankAccount) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(bankAccounts).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
  return created[0] ?? null;
}

export async function updateBankAccount(id: number, userId: number, data: Partial<InsertBankAccount>) {
  const db = await getDb();
  if (!db) return;
  await db.update(bankAccounts).set(data).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
}

export async function deleteBankAccount(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(bankAccounts).set({ isActive: false }).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
}

// ============ SHOPPING ITEMS ============

export async function getShoppingItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shoppingItems).where(eq(shoppingItems.userId, userId)).orderBy(desc(shoppingItems.createdAt));
}

export async function createShoppingItem(data: InsertShoppingItem) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(shoppingItems).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(shoppingItems).where(eq(shoppingItems.id, id)).limit(1);
  return created[0] ?? null;
}

export async function updateShoppingItem(id: number, userId: number, data: Partial<InsertShoppingItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(shoppingItems).set(data).where(and(eq(shoppingItems.id, id), eq(shoppingItems.userId, userId)));
}

export async function deleteShoppingItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(shoppingItems).where(and(eq(shoppingItems.id, id), eq(shoppingItems.userId, userId)));
}

// ============ BUDGET RULES ============

export async function getBudgetRules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgetRules).where(and(eq(budgetRules.userId, userId), eq(budgetRules.isActive, true))).orderBy(desc(budgetRules.createdAt));
}

export async function createBudgetRule(data: InsertBudgetRule) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(budgetRules).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(budgetRules).where(eq(budgetRules.id, id)).limit(1);
  return created[0] ?? null;
}

export async function updateBudgetRule(id: number, userId: number, data: Partial<InsertBudgetRule>) {
  const db = await getDb();
  if (!db) return;
  await db.update(budgetRules).set(data).where(and(eq(budgetRules.id, id), eq(budgetRules.userId, userId)));
}

export async function deleteBudgetRule(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(budgetRules).set({ isActive: false }).where(and(eq(budgetRules.id, id), eq(budgetRules.userId, userId)));
}

// ============ FINANCE NOTES ============

export async function getFinanceNotes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financeNotes).where(eq(financeNotes.userId, userId)).orderBy(desc(financeNotes.updatedAt));
}

export async function createFinanceNote(data: InsertFinanceNote) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(financeNotes).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(financeNotes).where(eq(financeNotes.id, id)).limit(1);
  return created[0] ?? null;
}

export async function updateFinanceNote(id: number, userId: number, data: Partial<InsertFinanceNote>) {
  const db = await getDb();
  if (!db) return;
  await db.update(financeNotes).set(data).where(and(eq(financeNotes.id, id), eq(financeNotes.userId, userId)));
}

export async function deleteFinanceNote(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(financeNotes).where(and(eq(financeNotes.id, id), eq(financeNotes.userId, userId)));
}

// ============ FOCUS PROJECTS ============

export async function getFocusProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(focusProjects).where(eq(focusProjects.userId, userId));
}

export async function createFocusProject(data: InsertFocusProject) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(focusProjects).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(focusProjects).where(eq(focusProjects.id, id)).limit(1);
  return created[0] ?? null;
}

export async function updateFocusProject(id: number, userId: number, data: Partial<InsertFocusProject>) {
  const db = await getDb();
  if (!db) return;
  await db.update(focusProjects).set(data).where(and(eq(focusProjects.id, id), eq(focusProjects.userId, userId)));
}

export async function deleteFocusProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(focusProjects).where(and(eq(focusProjects.id, id), eq(focusProjects.userId, userId)));
}

// ============ FOCUS SESSIONS ============

export async function getFocusSessions(userId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(focusSessions.userId, userId)];
  if (startDate) conditions.push(gte(focusSessions.date, startDate));
  if (endDate) conditions.push(lte(focusSessions.date, endDate));
  return db.select().from(focusSessions).where(and(...conditions)).orderBy(desc(focusSessions.createdAt));
}

export async function createFocusSession(data: InsertFocusSession) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(focusSessions).values(data);
  const id = result[0].insertId;
  const created = await db.select().from(focusSessions).where(eq(focusSessions.id, id)).limit(1);
  return created[0] ?? null;
}

// ============ WATER LOGS ============

export async function getWaterLog(userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(waterLogs).where(
    and(eq(waterLogs.userId, userId), eq(waterLogs.date, date))
  ).limit(1);
  return result[0] ?? null;
}

export async function getWaterLogs(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(waterLogs).where(
    and(eq(waterLogs.userId, userId), gte(waterLogs.date, startDate), lte(waterLogs.date, endDate))
  );
}

export async function upsertWaterLog(userId: number, date: string, amountMl: number) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(waterLogs).where(
    and(eq(waterLogs.userId, userId), eq(waterLogs.date, date))
  ).limit(1);
  if (existing.length > 0) {
    await db.update(waterLogs).set({ amountMl }).where(eq(waterLogs.id, existing[0].id));
    return { ...existing[0], amountMl };
  }
  await db.insert(waterLogs).values({ userId, date, amountMl });
  const created = await db.select().from(waterLogs).where(
    and(eq(waterLogs.userId, userId), eq(waterLogs.date, date))
  ).limit(1);
  return created[0] ?? null;
}

// ============ NOTIFICATIONS ============

export async function getNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(notifications).values(data);
  return true;
}

export async function markNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function clearNotifications(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(eq(notifications.userId, userId));
}

// ============ USER ACHIEVEMENTS ============

export async function getUserAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userAchievements).where(eq(userAchievements.userId, userId)).orderBy(desc(userAchievements.unlockedAt));
}

export async function unlockAchievement(userId: number, achievementKey: string) {
  const db = await getDb();
  if (!db) return null;
  // Check if already unlocked
  const existing = await db.select().from(userAchievements).where(
    and(eq(userAchievements.userId, userId), eq(userAchievements.achievementKey, achievementKey))
  ).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(userAchievements).values({ userId, achievementKey });
  const created = await db.select().from(userAchievements).where(
    and(eq(userAchievements.userId, userId), eq(userAchievements.achievementKey, achievementKey))
  ).limit(1);
  return created[0] ?? null;
}

// ============ FEATURED ACHIEVEMENTS ============

export async function getFeaturedAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(featuredAchievements).where(eq(featuredAchievements.userId, userId)).orderBy(featuredAchievements.slot);
}

export async function setFeaturedAchievement(userId: number, slot: number, achievementKey: string | null) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(featuredAchievements).where(
    and(eq(featuredAchievements.userId, userId), eq(featuredAchievements.slot, slot))
  ).limit(1);
  if (existing.length > 0) {
    await db.update(featuredAchievements).set({ achievementKey }).where(eq(featuredAchievements.id, existing[0].id));
    return { ...existing[0], achievementKey };
  }
  await db.insert(featuredAchievements).values({ userId, slot, achievementKey });
  const created = await db.select().from(featuredAchievements).where(
    and(eq(featuredAchievements.userId, userId), eq(featuredAchievements.slot, slot))
  ).limit(1);
  return created[0] ?? null;
}
