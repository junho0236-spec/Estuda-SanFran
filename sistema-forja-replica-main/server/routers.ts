import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { saveSubscription, removeSubscription, sendPushToUser } from "./pushNotifications";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ USER PROFILE ============
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getOrCreateProfile(ctx.user.id);
    }),
    getUser: protectedProcedure.query(async ({ ctx }) => {
      return ctx.user;
    }),
    update: protectedProcedure.input(z.object({
      xp: z.number().optional(),
      coins: z.number().optional(),
      level: z.number().optional(),
      streak: z.number().optional(),
      waterMl: z.number().optional(),
      waterGoalMl: z.number().optional(),
      sleepRating: z.string().optional(),
      energyRating: z.string().optional(),
      humorRating: z.string().optional(),
      focusHoursGoal: z.number().optional(),
      displayName: z.string().optional(),
      avatarUrl: z.string().optional(),
      notifyHabits: z.boolean().optional(),
      notifyMetas: z.boolean().optional(),
      notifyCommunity: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.updateProfile(ctx.user.id, input);
      return db.getOrCreateProfile(ctx.user.id);
    }),
    addXp: protectedProcedure.input(z.object({
      amount: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const profile = await db.getOrCreateProfile(ctx.user.id);
      if (!profile) return null;
      const newXp = profile.xp + input.amount;
      const newLevel = Math.floor(newXp / 100) + 1;
      await db.updateProfile(ctx.user.id, { xp: newXp, level: newLevel });
      return { xp: newXp, level: newLevel };
    }),
    addCoins: protectedProcedure.input(z.object({
      amount: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const profile = await db.getOrCreateProfile(ctx.user.id);
      if (!profile) return null;
      const newCoins = profile.coins + input.amount;
      await db.updateProfile(ctx.user.id, { coins: newCoins });
      return { coins: newCoins };
    }),
  }),

  // ============ HABITS ============
  habits: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getHabits(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      icon: z.string().default("💪"),
      frequency: z.enum(["daily", "weekly", "custom"]).default("daily"),
      dailyGoal: z.number().default(1),
      customDays: z.array(z.number()).optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createHabit({ ...input, userId: ctx.user.id });
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.deleteHabit(input.id, ctx.user.id);
      return { success: true };
    }),
    completions: protectedProcedure.input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    })).query(async ({ ctx, input }) => {
      return db.getHabitCompletions(ctx.user.id, input.startDate, input.endDate);
    }),
    toggle: protectedProcedure.input(z.object({
      habitId: z.number(),
      date: z.string(),
    })).mutation(async ({ ctx, input }) => {
      return db.toggleHabitCompletion({
        habitId: input.habitId,
        userId: ctx.user.id,
        date: input.date,
      });
    }),
  }),

  // ============ TASKS ============
  tasks: router({
    list: protectedProcedure.input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.getTasks(ctx.user.id, input?.startDate, input?.endDate);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      date: z.string(),
      time: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      isRecurring: z.boolean().default(false),
      recurringDays: z.array(z.number()).optional(),
      xpReward: z.number().default(10),
    })).mutation(async ({ ctx, input }) => {
      return db.createTask({ ...input, userId: ctx.user.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      isCompleted: z.boolean().optional(),
      isRecurring: z.boolean().optional(),
      recurringDays: z.array(z.number()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateTask(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.deleteTask(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ============ GOALS ============
  goals: router({
    list: protectedProcedure.input(z.object({
      status: z.string().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.getGoals(ctx.user.id, input?.status);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      icon: z.string().default("🎯"),
      deadline: z.string().optional(),
      milestones: z.array(z.object({ text: z.string(), done: z.boolean() })).optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createGoal({ ...input, userId: ctx.user.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      icon: z.string().optional(),
      deadline: z.string().optional(),
      status: z.enum(["active", "completed", "paused"]).optional(),
      progress: z.number().optional(),
      milestones: z.array(z.object({ text: z.string(), done: z.boolean() })).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateGoal(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.deleteGoal(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ============ FINANCE ============
  finance: router({
    list: protectedProcedure.input(z.object({
      year: z.number().optional(),
      month: z.number().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.getTransactions(ctx.user.id, input?.year, input?.month);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      amount: z.number().positive(),
      type: z.enum(["income", "expense"]),
      category: z.string().default("Outros"),
      date: z.string(),
      month: z.number(),
      year: z.number(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createTransaction({ ...input, userId: ctx.user.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      amount: z.number().optional(),
      type: z.enum(["income", "expense"]).optional(),
      category: z.string().optional(),
      date: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateTransaction(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.deleteTransaction(input.id, ctx.user.id);
      return { success: true };
    }),
    // ---- Financial Cards ----
    cards: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.getFinancialCards(ctx.user.id);
      }),
      create: protectedProcedure.input(z.object({
        name: z.string().min(1),
        brand: z.string().default("Visa"),
        type: z.enum(["credit", "debit"]).default("credit"),
        lastDigits: z.string().max(4).optional(),
        cardLimit: z.number().optional(),
        closingDay: z.number().min(1).max(31).optional(),
        dueDay: z.number().min(1).max(31).optional(),
        color: z.string().default("#EF4444"),
      })).mutation(async ({ ctx, input }) => {
        return db.createFinancialCard({ ...input, userId: ctx.user.id });
      }),
      update: protectedProcedure.input(z.object({
        id: z.number(),
        name: z.string().optional(),
        brand: z.string().optional(),
        type: z.enum(["credit", "debit"]).optional(),
        lastDigits: z.string().max(4).optional(),
        cardLimit: z.number().optional(),
        closingDay: z.number().optional(),
        dueDay: z.number().optional(),
        color: z.string().optional(),
      })).mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateFinancialCard(id, ctx.user.id, data);
        return { success: true };
      }),
      delete: protectedProcedure.input(z.object({
        id: z.number(),
      })).mutation(async ({ ctx, input }) => {
        await db.deleteFinancialCard(input.id, ctx.user.id);
        return { success: true };
      }),
    }),
    // ---- Bank Accounts ----
    accounts: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.getBankAccounts(ctx.user.id);
      }),
      create: protectedProcedure.input(z.object({
        name: z.string().min(1),
        type: z.enum(["checking", "savings", "investment", "wallet"]).default("checking"),
        balance: z.number().default(0),
        icon: z.string().default("\uD83C\uDFE6"),
        color: z.string().default("#3B82F6"),
      })).mutation(async ({ ctx, input }) => {
        return db.createBankAccount({ ...input, userId: ctx.user.id });
      }),
      update: protectedProcedure.input(z.object({
        id: z.number(),
        name: z.string().optional(),
        type: z.enum(["checking", "savings", "investment", "wallet"]).optional(),
        balance: z.number().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      })).mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateBankAccount(id, ctx.user.id, data);
        return { success: true };
      }),
      delete: protectedProcedure.input(z.object({
        id: z.number(),
      })).mutation(async ({ ctx, input }) => {
        await db.deleteBankAccount(input.id, ctx.user.id);
        return { success: true };
      }),
    }),
    // ---- Shopping Items ----
    shopping: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.getShoppingItems(ctx.user.id);
      }),
      create: protectedProcedure.input(z.object({
        name: z.string().min(1),
        estimatedPrice: z.number().optional(),
        category: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        link: z.string().optional(),
        notes: z.string().optional(),
      })).mutation(async ({ ctx, input }) => {
        return db.createShoppingItem({ ...input, userId: ctx.user.id });
      }),
      update: protectedProcedure.input(z.object({
        id: z.number(),
        name: z.string().optional(),
        estimatedPrice: z.number().optional(),
        category: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z.enum(["pending", "bought", "cancelled"]).optional(),
        link: z.string().optional(),
        notes: z.string().optional(),
      })).mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateShoppingItem(id, ctx.user.id, data);
        return { success: true };
      }),
      delete: protectedProcedure.input(z.object({
        id: z.number(),
      })).mutation(async ({ ctx, input }) => {
        await db.deleteShoppingItem(input.id, ctx.user.id);
        return { success: true };
      }),
    }),
    // ---- Budget Rules ----
    rules: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.getBudgetRules(ctx.user.id);
      }),
      create: protectedProcedure.input(z.object({
        category: z.string().min(1),
        monthlyLimit: z.number().positive(),
        alertAt: z.number().min(1).max(100).default(80),
      })).mutation(async ({ ctx, input }) => {
        return db.createBudgetRule({ ...input, userId: ctx.user.id });
      }),
      update: protectedProcedure.input(z.object({
        id: z.number(),
        category: z.string().optional(),
        monthlyLimit: z.number().optional(),
        alertAt: z.number().optional(),
      })).mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateBudgetRule(id, ctx.user.id, data);
        return { success: true };
      }),
      delete: protectedProcedure.input(z.object({
        id: z.number(),
      })).mutation(async ({ ctx, input }) => {
        await db.deleteBudgetRule(input.id, ctx.user.id);
        return { success: true };
      }),
    }),
    // ---- Finance Notes ----
    notes: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.getFinanceNotes(ctx.user.id);
      }),
      create: protectedProcedure.input(z.object({
        title: z.string().min(1),
        content: z.string().optional(),
        color: z.string().default("#FBBF24"),
      })).mutation(async ({ ctx, input }) => {
        return db.createFinanceNote({ ...input, userId: ctx.user.id });
      }),
      update: protectedProcedure.input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        color: z.string().optional(),
      })).mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateFinanceNote(id, ctx.user.id, data);
        return { success: true };
      }),
      delete: protectedProcedure.input(z.object({
        id: z.number(),
      })).mutation(async ({ ctx, input }) => {
        await db.deleteFinanceNote(input.id, ctx.user.id);
        return { success: true };
      }),
    }),
  }),

  // ============ FOCUS ============
  focus: router({
    projects: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.getFocusProjects(ctx.user.id);
      }),
      create: protectedProcedure.input(z.object({
        name: z.string().min(1),
        color: z.string().default("#EF4444"),
      })).mutation(async ({ ctx, input }) => {
        return db.createFocusProject({ ...input, userId: ctx.user.id });
      }),
      update: protectedProcedure.input(z.object({
        id: z.number(),
        totalMinutes: z.number().optional(),
      })).mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateFocusProject(id, ctx.user.id, data);
        return { success: true };
      }),
      delete: protectedProcedure.input(z.object({
        id: z.number(),
      })).mutation(async ({ ctx, input }) => {
        await db.deleteFocusProject(input.id, ctx.user.id);
        return { success: true };
      }),
    }),
    sessions: router({
      list: protectedProcedure.input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()).query(async ({ ctx, input }) => {
        return db.getFocusSessions(ctx.user.id, input?.startDate, input?.endDate);
      }),
      create: protectedProcedure.input(z.object({
        projectId: z.number().optional(),
        projectName: z.string().default("Sem projeto"),
        duration: z.number(),
        type: z.enum(["focus", "break"]).default("focus"),
        date: z.string(),
        time: z.string(),
      })).mutation(async ({ ctx, input }) => {
        return db.createFocusSession({ ...input, userId: ctx.user.id });
      }),
    }),
  }),

  // ============ WATER ============
  water: router({
    get: protectedProcedure.input(z.object({
      date: z.string(),
    })).query(async ({ ctx, input }) => {
      return db.getWaterLog(ctx.user.id, input.date);
    }),
    getRange: protectedProcedure.input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    })).query(async ({ ctx, input }) => {
      return db.getWaterLogs(ctx.user.id, input.startDate, input.endDate);
    }),
    update: protectedProcedure.input(z.object({
      date: z.string(),
      amountMl: z.number().min(0),
    })).mutation(async ({ ctx, input }) => {
      return db.upsertWaterLog(ctx.user.id, input.date, input.amountMl);
    }),
  }),

  // ============ NOTIFICATIONS ============
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getNotifications(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      type: z.string(),
      title: z.string(),
      message: z.string(),
      icon: z.string().default("🔔"),
      color: z.string().default("text-yellow-400"),
    })).mutation(async ({ ctx, input }) => {
      return db.createNotification({ ...input, userId: ctx.user.id });
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markNotificationsRead(ctx.user.id);
      return { success: true };
    }),
    clearAll: protectedProcedure.mutation(async ({ ctx }) => {
      await db.clearNotifications(ctx.user.id);
      return { success: true };
    }),
  }),

  // ============ ACHIEVEMENTS ============
  achievements: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserAchievements(ctx.user.id);
    }),
    unlock: protectedProcedure.input(z.object({
      achievementKey: z.string(),
    })).mutation(async ({ ctx, input }) => {
      return db.unlockAchievement(ctx.user.id, input.achievementKey);
    }),
    featured: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.getFeaturedAchievements(ctx.user.id);
      }),
      set: protectedProcedure.input(z.object({
        slot: z.number().min(1).max(3),
        achievementKey: z.string().nullable(),
      })).mutation(async ({ ctx, input }) => {
        return db.setFeaturedAchievement(ctx.user.id, input.slot, input.achievementKey);
      }),
    }),
  }),

  // ============ PUSH NOTIFICATIONS ============
  push: router({
    subscribe: protectedProcedure.input(z.object({
      endpoint: z.string(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
    })).mutation(async ({ ctx, input }) => {
      await saveSubscription(ctx.user.id, input);
      return { success: true };
    }),
    unsubscribe: protectedProcedure.input(z.object({
      endpoint: z.string(),
    })).mutation(async ({ ctx, input }) => {
      await removeSubscription(ctx.user.id, input.endpoint);
      return { success: true };
    }),
    send: protectedProcedure.input(z.object({
      title: z.string(),
      body: z.string(),
      icon: z.string().optional(),
      tag: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return sendPushToUser(ctx.user.id, input);
    }),
    test: protectedProcedure.mutation(async ({ ctx }) => {
      return sendPushToUser(ctx.user.id, {
        title: "Sistema Life",
        body: "Notificações push ativadas com sucesso! 🎉",
        icon: "/icons/icon-192x192.png",
        tag: "test",
      });
    }),
  }),
});

export type AppRouter = typeof appRouter;
