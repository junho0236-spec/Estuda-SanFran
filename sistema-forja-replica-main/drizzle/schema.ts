import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, float } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User profile / gamification data (XP, coins, level, water, sleep, energy, humor)
 */
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 255 }),
  avatarUrl: text("avatarUrl"),
  xp: int("xp").default(0).notNull(),
  coins: int("coins").default(0).notNull(),
  level: int("level").default(1).notNull(),
  streak: int("streak").default(0).notNull(),
  waterMl: int("waterMl").default(0).notNull(),
  waterGoalMl: int("waterGoalMl").default(2000).notNull(),
  sleepRating: varchar("sleepRating", { length: 20 }),
  energyRating: varchar("energyRating", { length: 20 }),
  humorRating: varchar("humorRating", { length: 20 }),
  focusHoursGoal: int("focusHoursGoal").default(40).notNull(),
  notifyHabits: boolean("notifyHabits").default(true).notNull(),
  notifyMetas: boolean("notifyMetas").default(true).notNull(),
  notifyCommunity: boolean("notifyCommunity").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Habits
 */
export const habits = mysqlTable("habits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 10 }).default("💪").notNull(),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "custom"]).default("daily").notNull(),
  dailyGoal: int("dailyGoal").default(1).notNull(),
  customDays: json("customDays").$type<number[]>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = typeof habits.$inferInsert;

/**
 * Habit completions (tracking daily habit check-ins)
 */
export const habitCompletions = mysqlTable("habit_completions", {
  id: int("id").autoincrement().primaryKey(),
  habitId: int("habitId").notNull(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  count: int("count").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type InsertHabitCompletion = typeof habitCompletions.$inferInsert;

/**
 * Tasks
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  time: varchar("time", { length: 5 }), // HH:MM
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  recurringDays: json("recurringDays").$type<number[]>(),
  xpReward: int("xpReward").default(10).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Goals
 */
export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  icon: varchar("icon", { length: 10 }).default("🎯").notNull(),
  deadline: varchar("deadline", { length: 10 }), // YYYY-MM-DD
  status: mysqlEnum("status", ["active", "completed", "paused"]).default("active").notNull(),
  progress: int("progress").default(0).notNull(),
  milestones: json("milestones").$type<{ text: string; done: boolean }[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

/**
 * Financial Transactions
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  amount: float("amount").notNull(),
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  category: varchar("category", { length: 100 }).default("Outros").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  month: int("month").notNull(), // 0-11
  year: int("year").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Financial Cards (credit/debit)
 */
export const financialCards = mysqlTable("financial_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 50 }).default("Visa").notNull(),
  type: mysqlEnum("type", ["credit", "debit"]).default("credit").notNull(),
  lastDigits: varchar("lastDigits", { length: 4 }),
  cardLimit: float("cardLimit").default(0),
  closingDay: int("closingDay").default(1),
  dueDay: int("dueDay").default(10),
  color: varchar("color", { length: 20 }).default("#EF4444").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FinancialCard = typeof financialCards.$inferSelect;
export type InsertFinancialCard = typeof financialCards.$inferInsert;

/**
 * Bank Accounts
 */
export const bankAccounts = mysqlTable("bank_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["checking", "savings", "investment", "wallet"]).default("checking").notNull(),
  balance: float("balance").default(0).notNull(),
  icon: varchar("icon", { length: 10 }).default("🏦").notNull(),
  color: varchar("color", { length: 20 }).default("#3B82F6").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

/**
 * Shopping List / Wishlist
 */
export const shoppingItems = mysqlTable("shopping_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  estimatedPrice: float("estimatedPrice"),
  category: varchar("category", { length: 100 }),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "bought", "cancelled"]).default("pending").notNull(),
  link: text("link"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type InsertShoppingItem = typeof shoppingItems.$inferInsert;

/**
 * Budget Rules (spending limits per category)
 */
export const budgetRules = mysqlTable("budget_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  monthlyLimit: float("monthlyLimit").notNull(),
  alertAt: int("alertAt").default(80).notNull(), // percentage to alert
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BudgetRule = typeof budgetRules.$inferSelect;
export type InsertBudgetRule = typeof budgetRules.$inferInsert;

/**
 * Finance Notes
 */
export const financeNotes = mysqlTable("finance_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  color: varchar("color", { length: 20 }).default("#FBBF24").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinanceNote = typeof financeNotes.$inferSelect;
export type InsertFinanceNote = typeof financeNotes.$inferInsert;

/**
 * Focus Projects
 */
export const focusProjects = mysqlTable("focus_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 20 }).default("#EF4444").notNull(),
  totalMinutes: int("totalMinutes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FocusProject = typeof focusProjects.$inferSelect;
export type InsertFocusProject = typeof focusProjects.$inferInsert;

/**
 * Focus Sessions
 */
export const focusSessions = mysqlTable("focus_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  projectName: varchar("projectName", { length: 255 }).default("Sem projeto").notNull(),
  duration: int("duration").notNull(), // minutes
  type: mysqlEnum("type", ["focus", "break"]).default("focus").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  time: varchar("time", { length: 5 }).notNull(), // HH:MM
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FocusSession = typeof focusSessions.$inferSelect;
export type InsertFocusSession = typeof focusSessions.$inferInsert;

/**
 * Water log (daily water intake tracking)
 */
export const waterLogs = mysqlTable("water_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  amountMl: int("amountMl").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WaterLog = typeof waterLogs.$inferSelect;
export type InsertWaterLog = typeof waterLogs.$inferInsert;

/**
 * Notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  icon: varchar("icon", { length: 10 }).default("🔔").notNull(),
  color: varchar("color", { length: 50 }).default("text-yellow-400").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Push Subscriptions (for Web Push notifications on PWA/iOS)
 */
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * User Achievements
 */
export const userAchievements = mysqlTable("user_achievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  achievementKey: varchar("achievementKey", { length: 100 }).notNull(),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
});

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;

/**
 * Featured Achievements (3 slots for ranking display)
 */
export const featuredAchievements = mysqlTable("featured_achievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  slot: int("slot").notNull(), // 1, 2, or 3
  achievementKey: varchar("achievementKey", { length: 100 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeaturedAchievement = typeof featuredAchievements.$inferSelect;
export type InsertFeaturedAchievement = typeof featuredAchievements.$inferInsert;
