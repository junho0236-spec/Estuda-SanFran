const storageKey = (userId: string) => `connect_composer_drafts:${userId}`;

export function loadComposerDrafts(userId: string): Record<string, string> {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.length > 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function persistComposerDrafts(userId: string, drafts: Record<string, string>): void {
  if (!userId) return;
  try {
    const cleaned = Object.fromEntries(
      Object.entries(drafts).filter(([, v]) => typeof v === 'string' && v.length > 0)
    );
    const key = storageKey(userId);
    if (Object.keys(cleaned).length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(cleaned));
  } catch {
    /* ignore quota / private mode */
  }
}
