/** Duração até expiração das mensagens em modo vanish (apenas cliente + campo expires_at na BD). */
export const VANISH_DURATIONS_MS = {
  s30: 30_000,
  m1: 60_000,
  m5: 300_000,
} as const;

export type VanishDurationId = keyof typeof VANISH_DURATIONS_MS;

export const VANISH_DURATION_ORDER: VanishDurationId[] = ['s30', 'm1', 'm5'];

export const VANISH_DURATION_LABEL: Record<VanishDurationId, string> = {
  s30: '30s',
  m1: '1m',
  m5: '5m',
};

export function vanishExpiresAtIso(durationId: VanishDurationId): string {
  return new Date(Date.now() + VANISH_DURATIONS_MS[durationId]).toISOString();
}
