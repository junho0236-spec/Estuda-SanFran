import type { ChatMessage } from '../../types';

export const MESSAGES_PER_PAGE = 30;

export type RoomMessageCacheMeta = {
  /** Próximo índice de página para `range` (após carregar a primeira página fica 1). */
  nextPageIndex: number;
  hasMore: boolean;
};

/** Último `created_at` entre mensagens persistidas (ignora `temp-*`). */
export function latestRealMessageIso(messages: ChatMessage[] | undefined): string | null {
  if (!messages?.length) return null;
  let max = 0;
  for (const m of messages) {
    if (String(m.id).startsWith('temp-')) continue;
    const t = new Date(m.created_at).getTime();
    if (Number.isFinite(t) && t > max) max = t;
  }
  return max > 0 ? new Date(max).toISOString() : null;
}
