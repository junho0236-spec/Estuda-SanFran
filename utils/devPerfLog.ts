type CounterMap = Record<string, number>;

declare global {
  interface Window {
    __sanfranPerfCounters?: CounterMap;
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
