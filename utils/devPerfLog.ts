type CounterMap = Record<string, number>;

declare global {
  interface Window {
    __sanfranPerfCounters?: CounterMap;
    __sanfranPerfTop?: (limit?: number) => Array<{ key: string; count: number }>;
    __sanfranPerfReset?: () => void;
  }
}

function isDev(): boolean {
  return typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
}

function getCounters(): CounterMap {
  if (typeof window === 'undefined') return {};
  if (!window.__sanfranPerfCounters) window.__sanfranPerfCounters = {};
  return window.__sanfranPerfCounters;
}

export function devPerfCount(key: string, meta?: Record<string, unknown>): void {
  if (!isDev()) return;
  const counters = getCounters();
  counters[key] = (counters[key] || 0) + 1;
  if (typeof window !== 'undefined') {
    window.__sanfranPerfTop = devPerfTop;
    window.__sanfranPerfReset = devPerfReset;
  }
  // Keep logs compact while still visible in devtools.
  console.debug(`[perf] ${key} #${counters[key]}`, meta || '');
}

export function devPerfStart(label: string): number {
  if (!isDev()) return 0;
  return performance.now();
}

export function devPerfEnd(label: string, start: number, meta?: Record<string, unknown>): void {
  if (!isDev() || !start) return;
  const elapsedMs = Math.round(performance.now() - start);
  console.debug(`[perf] ${label} ${elapsedMs}ms`, meta || '');
}

export function devPerfTop(limit = 20): Array<{ key: string; count: number }> {
  if (!isDev()) return [];
  const counters = getCounters();
  const rows = Object.entries(counters)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(1, limit));
  console.table(rows);
  return rows;
}

export function devPerfReset(): void {
  if (!isDev()) return;
  if (typeof window !== 'undefined') {
    window.__sanfranPerfCounters = {};
  }
  console.debug('[perf] counters reset');
}
