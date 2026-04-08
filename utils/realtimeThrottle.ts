/**
 * Supabase Realtime can emit many events in quick succession (sync, retries, multiple columns).
 * Debouncing refetches avoids hammering the free-tier database with identical full loads.
 */

export type RealtimeUserDataScope = 'flashcards' | 'tasks' | 'folders' | 'user_progress';

/** Escopos de carga parcial (Realtime usa só os quatro primeiros via debounce). */
export type UserDataSyncScope =
  | 'full'
  | 'bootstrap'
  | RealtimeUserDataScope
  | 'subjects'
  | 'boards'
  | 'readings'
  | 'study_sessions';

/**
 * After `delayMs` of silence, invokes `run` with every scope that fired during the window.
 * If multiple tables changed, callers should run a full sync.
 */
export function createScopedRealtimeDebounce(
  delayMs: number,
  run: (scopes: Set<RealtimeUserDataScope>) => void | Promise<void>
) {
  let t: ReturnType<typeof setTimeout> | null = null;
  const pending = new Set<RealtimeUserDataScope>();

  return {
    schedule(scope: RealtimeUserDataScope) {
      pending.add(scope);
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        const snapshot = new Set(pending);
        pending.clear();
        void run(snapshot);
      }, delayMs);
    },
    cancel() {
      if (t) clearTimeout(t);
      t = null;
      pending.clear();
    },
  };
}

/** Single-purpose trailing debounce (one fetch fn, no scope merge). */
export function createTrailingDebounce(
  fn: () => void | Promise<void>,
  delayMs: number
) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule: () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        void fn();
      }, delayMs);
    },
    cancel: () => {
      if (t) clearTimeout(t);
      t = null;
    },
  };
}
