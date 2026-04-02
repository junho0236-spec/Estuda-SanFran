import type { ChatMessage } from '../../types';

export type ChatSearchWordMatchMode = 'all' | 'any';

/** Busca na conversa (filtro local). */
export interface ChatConversationSearchCriteria {
  textQuery: string;
  /** null = qualquer remetente */
  senderId: string | null;
  /** yyyy-mm-dd (input date), início do dia local */
  dateFrom: string | null;
  /** yyyy-mm-dd, fim do dia local */
  dateTo: string | null;
  onlyWithAttachment: boolean;
  /** Palavras do texto: todas devem aparecer (all) ou pelo menos uma (any) */
  wordMatchMode: ChatSearchWordMatchMode;
}

export const emptyConversationSearchCriteria = (): ChatConversationSearchCriteria => ({
  textQuery: '',
  senderId: null,
  dateFrom: null,
  dateTo: null,
  onlyWithAttachment: false,
  wordMatchMode: 'all',
});

export function hasActiveConversationSearchCriteria(c: ChatConversationSearchCriteria): boolean {
  return Boolean(
    c.textQuery.trim() ||
      c.senderId ||
      c.dateFrom ||
      c.dateTo ||
      c.onlyWithAttachment
  );
}

/** Remove acentos e lowercases (busca “semântica leve” / tolerante). */
export function normalizeSearchText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

export function localDateYmdToUtcIsoStart(dateYmd: string): string | null {
  if (!dateYmd || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null;
  const [y, m, d] = dateYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString();
}

export function localDateYmdToUtcIsoEnd(dateYmd: string): string | null {
  if (!dateYmd || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null;
  const [y, m, d] = dateYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
  return dt.toISOString();
}

function hasAttachment(msg: ChatMessage): boolean {
  if (msg.attachment_url && String(msg.attachment_url).trim() !== '') return true;
  const t = msg.message_type;
  return t === 'gif' || t === 'sticker' || t === 'audio' || t === 'file';
}

function linkPreviewBlob(msg: ChatMessage): string {
  const lp = msg.link_preview;
  if (!lp) return '';
  return [lp.title, lp.description, lp.url].filter(Boolean).join(' ');
}

/** Texto agregado para busca por “conteúdo” amplo (texto + anexo + preview + autor). */
export function buildMessageSearchBlob(msg: ChatMessage): string {
  const parts = [
    msg.content,
    msg.sender_name,
    msg.attachment_name,
    msg.attachment_type,
    linkPreviewBlob(msg),
  ];
  return parts.filter(Boolean).join('\n');
}

function messageMatchesWords(normalizedBlob: string, words: string[], mode: ChatSearchWordMatchMode): boolean {
  if (words.length === 0) return true;
  if (mode === 'any') {
    return words.some((w) => normalizedBlob.includes(w));
  }
  return words.every((w) => normalizedBlob.includes(w));
}

/** Se a mensagem passa nos critérios (use quando já souber que há critérios ativos). */
export function messageMatchesConversationCriteria(
  msg: ChatMessage,
  c: ChatConversationSearchCriteria
): boolean {
  if (!hasActiveConversationSearchCriteria(c)) return true;

  if (c.senderId && msg.sender_id !== c.senderId) return false;

  if (c.onlyWithAttachment && !hasAttachment(msg)) return false;

  if (c.dateFrom) {
    const start = localDateYmdToUtcIsoStart(c.dateFrom);
    if (start && new Date(msg.created_at).getTime() < new Date(start).getTime()) return false;
  }
  if (c.dateTo) {
    const end = localDateYmdToUtcIsoEnd(c.dateTo);
    if (end && new Date(msg.created_at).getTime() > new Date(end).getTime()) return false;
  }

  const q = c.textQuery.trim();
  if (!q) return true;

  const blob = normalizeSearchText(buildMessageSearchBlob(msg));
  const words = q
    .split(/\s+/)
    .map((w) => normalizeSearchText(w.trim()))
    .filter(Boolean);

  return messageMatchesWords(blob, words, c.wordMatchMode);
}

export function filterMessagesByConversationCriteria(
  messages: ChatMessage[],
  c: ChatConversationSearchCriteria
): ChatMessage[] {
  if (!hasActiveConversationSearchCriteria(c)) return messages;
  return messages.filter((m) => messageMatchesConversationCriteria(m, c));
}

/** Escape para padrões ilike no PostgREST (uso em busca global). */
export function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
