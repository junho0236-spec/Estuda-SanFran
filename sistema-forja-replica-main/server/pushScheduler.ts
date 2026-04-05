import { getDb } from "./db";
import { habits, habitCompletions, tasks, waterLogs, pushSubscriptions, userProfiles } from "../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { sendPushToUser } from "./pushNotifications";

/**
 * Check and send push notifications for various reminders.
 * This runs periodically (every 30 minutes) to check for:
 * - Incomplete habits for today
 * - Upcoming tasks
 * - Water intake reminders
 * - Focus session reminders
 */

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getCurrentHour(): number {
  return new Date().getHours();
}

export async function checkAndSendReminders() {
  const db = await getDb();
  if (!db) return;

  const today = getTodayDate();
  const hour = getCurrentHour();

  // Only send reminders during waking hours (7am - 10pm)
  if (hour < 7 || hour > 22) return;

  try {
    // Get all users with push subscriptions
    const subs = await db.select().from(pushSubscriptions);
    const userIds = Array.from(new Set(subs.map(s => s.userId)));

    for (const userId of userIds) {
      // Morning reminder (7-9am): Daily habits and tasks overview
      if (hour >= 7 && hour <= 9) {
        await sendMorningReminder(db, userId, today);
      }

      // Midday water reminder (12-13pm)
      if (hour >= 12 && hour <= 13) {
        await sendWaterReminder(db, userId, today);
      }

      // Afternoon reminder (15-16pm): Incomplete tasks
      if (hour >= 15 && hour <= 16) {
        await sendTaskReminder(db, userId, today);
      }

      // Evening reminder (19-20pm): Habit completion check
      if (hour >= 19 && hour <= 20) {
        await sendHabitReminder(db, userId, today);
      }
    }
  } catch (error) {
    console.error("[PushScheduler] Error checking reminders:", error);
  }
}

async function sendMorningReminder(db: any, userId: number, today: string) {
  // Check if already sent today
  const key = `morning-${today}`;
  if (wasSentToday(userId, key)) return;

  const userHabits = await db.select().from(habits).where(
    and(eq(habits.userId, userId), eq(habits.isActive, true))
  );

  const userTasks = await db.select().from(tasks).where(
    and(eq(tasks.userId, userId), eq(tasks.date, today), eq(tasks.isCompleted, false))
  );

  if (userHabits.length > 0 || userTasks.length > 0) {
    await sendPushToUser(userId, {
      title: "Bom dia! ☀️",
      body: `Você tem ${userHabits.length} hábitos e ${userTasks.length} tarefas para hoje. Vamos lá!`,
      icon: "/icons/icon-192x192.png",
      tag: "morning-reminder",
      data: { url: "/" },
    });
    markAsSent(userId, key);
  }
}

async function sendWaterReminder(db: any, userId: number, today: string) {
  const key = `water-${today}`;
  if (wasSentToday(userId, key)) return;

  const waterLog = await db.select().from(waterLogs).where(
    and(eq(waterLogs.userId, userId), eq(waterLogs.date, today))
  ).limit(1);

  const profile = await db.select().from(userProfiles).where(
    eq(userProfiles.userId, userId)
  ).limit(1);

  const currentMl = waterLog[0]?.amountMl || 0;
  const goalMl = profile[0]?.waterGoalMl || 2000;

  if (currentMl < goalMl * 0.5) {
    await sendPushToUser(userId, {
      title: "Hora de beber água! 💧",
      body: `Você bebeu ${currentMl}ml de ${goalMl}ml hoje. Mantenha-se hidratado!`,
      icon: "/icons/icon-192x192.png",
      tag: "water-reminder",
      data: { url: "/" },
    });
    markAsSent(userId, key);
  }
}

async function sendTaskReminder(db: any, userId: number, today: string) {
  const key = `tasks-${today}`;
  if (wasSentToday(userId, key)) return;

  const pendingTasks = await db.select().from(tasks).where(
    and(eq(tasks.userId, userId), eq(tasks.date, today), eq(tasks.isCompleted, false))
  );

  if (pendingTasks.length > 0) {
    await sendPushToUser(userId, {
      title: "Tarefas pendentes! 📋",
      body: `Você ainda tem ${pendingTasks.length} tarefa(s) para concluir hoje.`,
      icon: "/icons/icon-192x192.png",
      tag: "task-reminder",
      data: { url: "/tasks" },
    });
    markAsSent(userId, key);
  }
}

async function sendHabitReminder(db: any, userId: number, today: string) {
  const key = `habits-${today}`;
  if (wasSentToday(userId, key)) return;

  const userHabits = await db.select().from(habits).where(
    and(eq(habits.userId, userId), eq(habits.isActive, true))
  );

  const completions = await db.select().from(habitCompletions).where(
    and(eq(habitCompletions.userId, userId), eq(habitCompletions.date, today))
  );

  const completedHabitIds = new Set(completions.map((c: any) => c.habitId));
  const incompleteCount = userHabits.filter((h: any) => !completedHabitIds.has(h.id)).length;

  if (incompleteCount > 0) {
    await sendPushToUser(userId, {
      title: "Hábitos do dia! 🔥",
      body: `Ainda faltam ${incompleteCount} hábito(s) para completar hoje. Não quebre a sequência!`,
      icon: "/icons/icon-192x192.png",
      tag: "habit-reminder",
      data: { url: "/habits" },
    });
    markAsSent(userId, key);
  }
}

// Simple in-memory tracking to avoid duplicate sends per day
const sentNotifications = new Map<string, number>();

function wasSentToday(userId: number, key: string): boolean {
  const fullKey = `${userId}-${key}`;
  const lastSent = sentNotifications.get(fullKey);
  if (!lastSent) return false;
  const now = Date.now();
  // Consider "today" as within the last 12 hours
  return now - lastSent < 12 * 60 * 60 * 1000;
}

function markAsSent(userId: number, key: string) {
  sentNotifications.set(`${userId}-${key}`, Date.now());
}

// Clean up old entries every 24 hours
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(sentNotifications.entries());
  for (const [key, time] of entries) {
    if (now - time > 24 * 60 * 60 * 1000) {
      sentNotifications.delete(key);
    }
  }
}, 24 * 60 * 60 * 1000);
