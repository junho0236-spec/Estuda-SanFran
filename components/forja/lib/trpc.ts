import { useForjaSession } from "@forja/ForjaSessionContext";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import * as api from "@/services/forjaSupabase";

type AnyOpts = Record<string, unknown>;

type ForjaProfile = Awaited<ReturnType<typeof api.forjaGetOrCreateProfile>>;
type ForjaAddXpResult = Awaited<ReturnType<typeof api.forjaProfileAddXp>> | null;
type ForjaAddCoinsResult = Awaited<ReturnType<typeof api.forjaProfileAddCoins>> | null;
type HabitCreateInput = Parameters<typeof api.forjaCreateHabit>[1];
type TaskCreateInput = Parameters<typeof api.forjaCreateTask>[1];
type GoalCreateInput = Parameters<typeof api.forjaCreateGoal>[1];
type TxCreateInput = Parameters<typeof api.forjaCreateTransaction>[1];
type FocusSessionCreateInput = Parameters<typeof api.forjaCreateFocusSession>[1];
type ProfilePatch = Parameters<typeof api.forjaUpdateProfile>[1];

function useUserId() {
  return useForjaSession().userId;
}

function forjaInvalidate(qc: ReturnType<typeof useQueryClient>, prefix: unknown[]) {
  return qc.invalidateQueries({ queryKey: ["forja", ...prefix] });
}

export function useUtils() {
  const qc = useQueryClient();
  const userId = useUserId();
  const u = userId;
  return {
    profile: {
      get: {
        invalidate: () => forjaInvalidate(qc, ["profile", "get", u]),
      },
    },
    habits: {
      list: { invalidate: () => forjaInvalidate(qc, ["habits", "list", u]) },
      completions: {
        invalidate: () => forjaInvalidate(qc, ["habits", "completions", u]),
      },
    },
    tasks: {
      list: { invalidate: () => forjaInvalidate(qc, ["tasks", "list", u]) },
    },
    goals: {
      list: { invalidate: () => forjaInvalidate(qc, ["goals", "list", u]) },
    },
    finance: {
      list: { invalidate: () => forjaInvalidate(qc, ["finance", "list", u]) },
      cards: { list: { invalidate: () => forjaInvalidate(qc, ["finance", "cards", u]) } },
      accounts: { list: { invalidate: () => forjaInvalidate(qc, ["finance", "accounts", u]) } },
      shopping: { list: { invalidate: () => forjaInvalidate(qc, ["finance", "shopping", u]) } },
      rules: { list: { invalidate: () => forjaInvalidate(qc, ["finance", "rules", u]) } },
      notes: { list: { invalidate: () => forjaInvalidate(qc, ["finance", "notes", u]) } },
    },
    focus: {
      projects: { list: { invalidate: () => forjaInvalidate(qc, ["focus", "projects", u]) } },
      sessions: { list: { invalidate: () => forjaInvalidate(qc, ["focus", "sessions", u]) } },
    },
    water: {
      get: { invalidate: () => forjaInvalidate(qc, ["water", u]) },
      getRange: { invalidate: () => forjaInvalidate(qc, ["water", "range", u]) },
    },
    achievements: {
      list: { invalidate: () => forjaInvalidate(qc, ["achievements", "list", u]) },
      featured: {
        list: { invalidate: () => forjaInvalidate(qc, ["achievements", "featured", u]) },
      },
    },
    notifications: {
      list: { invalidate: () => forjaInvalidate(qc, ["notifications", "list", u]) },
    },
  };
}

function qOpts<TData, TError = Error>(
  extra?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">
) {
  return extra ?? {};
}

function mOpts<TData, TError, TVariables>(
  extra?: Omit<UseMutationOptions<TData, TError, TVariables>, "mutationFn">
) {
  return extra ?? {};
}

export const trpc = {
  useUtils,

  profile: {
    get: {
      useQuery: (_input?: void, opts?: Omit<UseQueryOptions<ForjaProfile, Error>, "queryKey" | "queryFn">) => {
        const userId = useUserId();
        return useQuery({
          queryKey: ["forja", "profile", "get", userId],
          queryFn: () => api.forjaGetOrCreateProfile(userId),
          enabled: !!userId,
          ...qOpts(opts),
        });
      },
    },
    update: {
      useMutation: (opts?: Omit<UseMutationOptions<ForjaProfile, Error, AnyOpts>, "mutationFn">) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...mOpts(opts),
          mutationFn: async (input: AnyOpts) => {
            await api.forjaUpdateProfile(userId, input as ProfilePatch);
            return api.forjaGetOrCreateProfile(userId);
          },
          onSuccess: (data, variables, onMutateResult, context) => {
            qc.invalidateQueries({ queryKey: ["forja", "profile", userId] });
            opts?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    addXp: {
      useMutation: (opts?: Omit<UseMutationOptions<ForjaAddXpResult, Error, { amount: number }>, "mutationFn">) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...mOpts(opts),
          mutationFn: (input: { amount: number }) => api.forjaProfileAddXp(userId, input.amount),
          onSuccess: (data, variables, onMutateResult, context) => {
            qc.invalidateQueries({ queryKey: ["forja", "profile", userId] });
            opts?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    addCoins: {
      useMutation: (opts?: Omit<UseMutationOptions<ForjaAddCoinsResult, Error, { amount: number }>, "mutationFn">) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...mOpts(opts),
          mutationFn: (input: { amount: number }) => api.forjaProfileAddCoins(userId, input.amount),
          onSuccess: (data, variables, onMutateResult, context) => {
            qc.invalidateQueries({ queryKey: ["forja", "profile", userId] });
            opts?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
  },

  habits: {
    list: {
      useQuery: (_input?: void, opts?: AnyOpts) => {
        const userId = useUserId();
        return useQuery({
          queryKey: ["forja", "habits", "list", userId],
          queryFn: () => api.forjaListHabits(userId),
          enabled: !!userId,
          ...(opts as object),
        });
      },
    },
    completions: {
      useQuery: (input: { startDate: string; endDate: string }, opts?: AnyOpts) => {
        const userId = useUserId();
        return useQuery({
          queryKey: ["forja", "habits", "completions", userId, input.startDate, input.endDate],
          queryFn: () => api.forjaHabitCompletions(userId, input.startDate, input.endDate),
          enabled: !!userId && !!input.startDate && !!input.endDate,
          ...(opts as object),
        });
      },
    },
    create: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: HabitCreateInput) => api.forjaCreateHabit(userId, input),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["habits", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    toggle: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: { habitId: number; date: string }) => api.forjaToggleHabit(userId, input.habitId, input.date),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["habits", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    delete: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: { id: number }) => api.forjaDeleteHabit(userId, input.id).then(() => ({ success: true as const })),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["habits", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
  },

  tasks: {
    list: {
      useQuery: (input?: { startDate?: string; endDate?: string }, opts?: AnyOpts) => {
        const userId = useUserId();
        const k = input ?? {};
        return useQuery({
          queryKey: ["forja", "tasks", "list", userId, k.startDate ?? "", k.endDate ?? ""],
          queryFn: () => api.forjaListTasks(userId, k.startDate, k.endDate),
          enabled: !!userId,
          ...(opts as object),
        });
      },
    },
    create: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: TaskCreateInput) => api.forjaCreateTask(userId, input),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["tasks", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    update: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: async (input: { id: number } & Record<string, unknown>) => {
            const { id, ...rest } = input;
            await api.forjaUpdateTask(userId, id, rest);
            return { success: true as const };
          },
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["tasks", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    delete: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: { id: number }) => api.forjaDeleteTask(userId, input.id).then(() => ({ success: true as const })),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["tasks", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
  },

  goals: {
    list: {
      useQuery: (input?: { status?: string }, opts?: AnyOpts) => {
        const userId = useUserId();
        const status = input?.status ?? "";
        return useQuery({
          queryKey: ["forja", "goals", "list", userId, status],
          queryFn: () => api.forjaListGoals(userId, input?.status),
          enabled: !!userId,
          ...(opts as object),
        });
      },
    },
    create: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: GoalCreateInput) => api.forjaCreateGoal(userId, input),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["goals", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    update: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: async (input: { id: number } & Record<string, unknown>) => {
            const { id, ...rest } = input;
            await api.forjaUpdateGoal(userId, id, rest);
            return { success: true as const };
          },
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["goals", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    delete: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: { id: number }) => api.forjaDeleteGoal(userId, input.id).then(() => ({ success: true as const })),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["goals", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
  },

  finance: {
    list: {
      useQuery: (input?: { year?: number; month?: number }, opts?: AnyOpts) => {
        const userId = useUserId();
        const y = input?.year;
        const m = input?.month;
        const keyTag = y === undefined && m === undefined ? "all" : `${y ?? "x"}-${m ?? "x"}`;
        return useQuery({
          queryKey: ["forja", "finance", "list", userId, keyTag],
          queryFn: () => api.forjaListTransactions(userId, y, m),
          enabled: !!userId,
          ...(opts as object),
        });
      },
    },
    create: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: TxCreateInput) => api.forjaCreateTransaction(userId, input),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["finance", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    update: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: async (input: { id: number } & Record<string, unknown>) => {
            const { id, ...rest } = input;
            await api.forjaUpdateTransaction(userId, id, rest);
            return { success: true as const };
          },
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["finance", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    delete: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: { id: number }) => api.forjaDeleteTransaction(userId, input.id).then(() => ({ success: true as const })),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["finance", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    cards: {
      list: {
        useQuery: (_input?: void, opts?: AnyOpts) => {
          const userId = useUserId();
          return useQuery({
            queryKey: ["forja", "finance", "cards", userId],
            queryFn: () => api.forjaListCards(userId),
            enabled: !!userId,
            ...(opts as object),
          });
        },
      },
      create: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: Record<string, unknown>) => api.forjaCreateCard(userId, input),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "cards", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      update: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: async (input: { id: number } & Record<string, unknown>) => {
              const { id, ...rest } = input;
              await api.forjaUpdateCard(userId, id, rest);
              return { success: true as const };
            },
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "cards", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      delete: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: { id: number }) => api.forjaDeleteCard(userId, input.id).then(() => ({ success: true as const })),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "cards", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
    },
    accounts: {
      list: {
        useQuery: (_input?: void, opts?: AnyOpts) => {
          const userId = useUserId();
          return useQuery({
            queryKey: ["forja", "finance", "accounts", userId],
            queryFn: () => api.forjaListAccounts(userId),
            enabled: !!userId,
            ...(opts as object),
          });
        },
      },
      create: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: Record<string, unknown>) => api.forjaCreateAccount(userId, input),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "accounts", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      update: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: async (input: { id: number } & Record<string, unknown>) => {
              const { id, ...rest } = input;
              await api.forjaUpdateAccount(userId, id, rest);
              return { success: true as const };
            },
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "accounts", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      delete: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: { id: number }) => api.forjaDeleteAccount(userId, input.id).then(() => ({ success: true as const })),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "accounts", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
    },
    shopping: {
      list: {
        useQuery: (_input?: void, opts?: AnyOpts) => {
          const userId = useUserId();
          return useQuery({
            queryKey: ["forja", "finance", "shopping", userId],
            queryFn: () => api.forjaListShopping(userId),
            enabled: !!userId,
            ...(opts as object),
          });
        },
      },
      create: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: Record<string, unknown>) => api.forjaCreateShopping(userId, input),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "shopping", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      update: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: async (input: { id: number } & Record<string, unknown>) => {
              const { id, ...rest } = input;
              await api.forjaUpdateShopping(userId, id, rest);
              return { success: true as const };
            },
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "shopping", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      delete: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: { id: number }) => api.forjaDeleteShopping(userId, input.id).then(() => ({ success: true as const })),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "shopping", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
    },
    rules: {
      list: {
        useQuery: (_input?: void, opts?: AnyOpts) => {
          const userId = useUserId();
          return useQuery({
            queryKey: ["forja", "finance", "rules", userId],
            queryFn: () => api.forjaListRules(userId),
            enabled: !!userId,
            ...(opts as object),
          });
        },
      },
      create: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: { category: string; monthlyLimit: number; alertAt?: number }) =>
              api.forjaCreateRule(userId, input),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "rules", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      update: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: async (input: { id: number } & Record<string, unknown>) => {
              const { id, ...rest } = input;
              await api.forjaUpdateRule(userId, id, rest);
              return { success: true as const };
            },
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "rules", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      delete: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: { id: number }) => api.forjaDeleteRule(userId, input.id).then(() => ({ success: true as const })),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "rules", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
    },
    notes: {
      list: {
        useQuery: (_input?: void, opts?: AnyOpts) => {
          const userId = useUserId();
          return useQuery({
            queryKey: ["forja", "finance", "notes", userId],
            queryFn: () => api.forjaListNotes(userId),
            enabled: !!userId,
            ...(opts as object),
          });
        },
      },
      create: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: { title: string; content?: string; color?: string }) => api.forjaCreateNote(userId, input),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "notes", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      update: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: async (input: { id: number } & Record<string, unknown>) => {
              const { id, ...rest } = input;
              await api.forjaUpdateNote(userId, id, rest);
              return { success: true as const };
            },
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "notes", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      delete: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: { id: number }) => api.forjaDeleteNote(userId, input.id).then(() => ({ success: true as const })),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["finance", "notes", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
    },
  },

  focus: {
    projects: {
      list: {
        useQuery: (_input?: void, opts?: AnyOpts) => {
          const userId = useUserId();
          return useQuery({
            queryKey: ["forja", "focus", "projects", userId],
            queryFn: () => api.forjaListFocusProjects(userId),
            enabled: !!userId,
            ...(opts as object),
          });
        },
      },
      create: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: { name: string; color?: string }) => api.forjaCreateFocusProject(userId, input),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["focus", "projects", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      update: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: async (input: { id: number; totalMinutes?: number }) => {
              const { id, ...rest } = input;
              await api.forjaUpdateFocusProject(userId, id, rest);
              return { success: true as const };
            },
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["focus", "projects", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
      delete: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: { id: number }) => api.forjaDeleteFocusProject(userId, input.id).then(() => ({ success: true as const })),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["focus", "projects", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
    },
    sessions: {
      list: {
        useQuery: (input?: { startDate?: string; endDate?: string }, opts?: AnyOpts) => {
          const userId = useUserId();
          const k = input ?? {};
          return useQuery({
            queryKey: ["forja", "focus", "sessions", userId, k.startDate ?? "", k.endDate ?? ""],
            queryFn: () => api.forjaListFocusSessions(userId, k.startDate, k.endDate),
            enabled: !!userId,
            ...(opts as object),
          });
        },
      },
      create: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: FocusSessionCreateInput) => api.forjaCreateFocusSession(userId, input),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["focus", "sessions", userId]);
              forjaInvalidate(qc, ["focus", "projects", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
    },
  },

  water: {
    get: {
      useQuery: (input: { date: string }, opts?: AnyOpts) => {
        const userId = useUserId();
        return useQuery({
          queryKey: ["forja", "water", userId, input.date],
          queryFn: () => api.forjaGetWaterLog(userId, input.date),
          enabled: !!userId && !!input.date,
          ...(opts as object),
        });
      },
    },
    getRange: {
      useQuery: (input: { startDate: string; endDate: string }, opts?: AnyOpts) => {
        const userId = useUserId();
        return useQuery({
          queryKey: ["forja", "water", "range", userId, input.startDate, input.endDate],
          queryFn: () => api.forjaWaterRange(userId, input.startDate, input.endDate),
          enabled: !!userId && !!input.startDate && !!input.endDate,
          ...(opts as object),
        });
      },
    },
    update: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: { date: string; amountMl: number }) => api.forjaUpsertWater(userId, input.date, input.amountMl),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["water", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
  },

  notifications: {
    list: {
      useQuery: (_input?: void, opts?: AnyOpts) => {
        const userId = useUserId();
        return useQuery({
          queryKey: ["forja", "notifications", "list", userId],
          queryFn: () => api.forjaListAppNotifications(userId),
          enabled: !!userId,
          ...(opts as object),
        });
      },
    },
    create: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: { type: string; title: string; message: string; icon?: string; color?: string }) =>
            api.forjaCreateAppNotification(userId, input),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["notifications", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    markAllRead: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: () => api.forjaMarkNotificationsRead(userId).then(() => ({ success: true as const })),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["notifications", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    clearAll: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: () => api.forjaClearNotifications(userId).then(() => ({ success: true as const })),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["notifications", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
  },

  achievements: {
    list: {
      useQuery: (_input?: void, opts?: AnyOpts) => {
        const userId = useUserId();
        return useQuery({
          queryKey: ["forja", "achievements", "list", userId],
          queryFn: () => api.forjaListAchievements(userId),
          enabled: !!userId,
          ...(opts as object),
        });
      },
    },
    unlock: {
      useMutation: (opts?: AnyOpts) => {
        const userId = useUserId();
        const qc = useQueryClient();
        return useMutation({
          ...(opts as object),
          mutationFn: (input: { achievementKey: string }) => api.forjaUnlockAchievement(userId, input.achievementKey),
          onSuccess: (data, variables, onMutateResult, context) => {
            forjaInvalidate(qc, ["achievements", "list", userId]);
            (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
          },
        });
      },
    },
    featured: {
      list: {
        useQuery: (_input?: void, opts?: AnyOpts) => {
          const userId = useUserId();
          return useQuery({
            queryKey: ["forja", "achievements", "featured", userId],
            queryFn: () => api.forjaListFeatured(userId),
            enabled: !!userId,
            ...(opts as object),
          });
        },
      },
      set: {
        useMutation: (opts?: AnyOpts) => {
          const userId = useUserId();
          const qc = useQueryClient();
          return useMutation({
            ...(opts as object),
            mutationFn: (input: { slot: number; achievementKey: string | null }) =>
              api.forjaSetFeatured(userId, input.slot, input.achievementKey),
            onSuccess: (data, variables, onMutateResult, context) => {
              forjaInvalidate(qc, ["achievements", "featured", userId]);
              (opts as UseMutationOptions<unknown, Error, unknown>)?.onSuccess?.(data, variables, onMutateResult, context);
            },
          });
        },
      },
    },
  },

  push: {
    subscribe: {
      useMutation: (opts?: AnyOpts) =>
        useMutation({
          ...(opts as object),
          mutationFn: async (_input: {
            endpoint: string;
            keys: { p256dh: string; auth: string };
          }) => ({ success: true as const }),
        }),
    },
    unsubscribe: {
      useMutation: (opts?: AnyOpts) =>
        useMutation({
          ...(opts as object),
          mutationFn: async (_input: { endpoint: string }) => ({ success: true as const }),
        }),
    },
    send: {
      useMutation: (opts?: AnyOpts) =>
        useMutation({
          ...(opts as object),
          mutationFn: async () => ({ success: false as const }),
        }),
    },
    test: {
      useMutation: (opts?: AnyOpts) =>
        useMutation({
          ...(opts as object),
          mutationFn: async () => ({ success: true as const }),
        }),
    },
  },
};
