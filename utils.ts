import { View } from './types';

/** Parte AAAA-MM-DD de um prazo armazenado (sem interpretar como UTC meia-noite). */
export function dueDateToYmd(due: string): string {
  return due.trim().split('T')[0];
}

/** Exibe prazo só-data como DD/MM/AAAA. */
export function formatDueDateBr(due: string | undefined | null): string {
  if (!due) return '';
  const ymd = dueDateToYmd(due);
  const p = ymd.split('-');
  if (p.length !== 3 || p[0].length !== 4) return ymd;
  const [y, m, d] = p;
  if (m.length !== 2 || d.length !== 2) return ymd;
  return `${d}/${m}/${y}`;
}

/** `true` se o prazo inclui horário (não é só AAAA-MM-DD). */
export function dueDateHasTime(due: string | undefined | null): boolean {
  if (!due?.trim()) return false;
  const t = due.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  return t.includes('T');
}

/** Data + hora em Brasília (ex.: 08/04/2026 14:30). Sem hora, equivale a `formatDueDateBr`. */
export function formatDueDateTimeBr(due: string | undefined | null): string {
  if (!due) return '';
  const datePart = formatDueDateBr(due);
  if (!dueDateHasTime(due)) return datePart;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return datePart;
  const timePart = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${datePart} ${timePart}`;
}

/** Valor para `<input type="time" />` (HH:mm) a partir do ISO, fuso Brasília. */
export function formatDueTimeHmForInput(due: string | undefined | null): string {
  if (!due || !dueDateHasTime(due)) return '';
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === 'hour')?.value;
  const m = parts.find((p) => p.type === 'minute')?.value;
  if (h == null || m == null) return '';
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

/**
 * Combina data civil AAAA-MM-DD com HH:mm no horário oficial de Brasília (UTC−3, sem DST).
 * Retorna ISO com offset -03:00.
 */
export function combineYmdAndTimeBrToIso(ymd: string, hhmm: string): string | null {
  const y = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${y}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00-03:00`;
}

/** Instantâneo em ms para ordenar prazos: só-data usa meio-dia local na data civil; ISO com hora usa o instante. */
export function dueDateToSortInstantMs(due: string | undefined | null): number {
  const d = due?.trim();
  if (!d) return Number.POSITIVE_INFINITY;
  if (!d.includes('T')) {
    return dateAtNoonForYmd(dueDateToYmd(d)).getTime();
  }
  const ms = new Date(d).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

/** Converte dd/mm/aaaa (ou d/m/aaaa) para AAAA-MM-DD, ou null se inválido. */
export function parseDueDateBrToIso(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || dd < 1 || dd > 31) return null;
  const dt = new Date(yy, mo - 1, dd);
  if (dt.getFullYear() !== yy || dt.getMonth() !== mo - 1 || dt.getDate() !== dd) return null;
  return `${yy}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** Meio-dia no calendário local para AAAA-MM-DD (evita deslocar o dia por UTC em iCal). */
export function dateAtNoonForYmd(ymd: string): Date {
  const parts = dueDateToYmd(ymd).split('-');
  if (parts.length !== 3) return new Date(NaN);
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return new Date(NaN);
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

export const getBrasiliaDate = () => {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
};

/** Soma dias a uma data civil AAAA-MM-DD (aritmética de calendário, sem fuso). */
export function addDaysYmd(ymd: string, deltaDays: number): string {
  const parts = ymd.split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return ymd;
  const [y, mo, day] = parts;
  const u = new Date(Date.UTC(y, mo - 1, day + deltaDays));
  return `${u.getUTCFullYear()}-${String(u.getUTCMonth() + 1).padStart(2, '0')}-${String(u.getUTCDate()).padStart(2, '0')}`;
}

/** Dia da semana (0=dom … 6=sáb) para uma data civil AAAA-MM-DD. */
export function ymdWeekdayUtc(ymd: string): number {
  const parts = ymd.split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return 0;
  const [y, mo, day] = parts;
  return new Date(Date.UTC(y, mo - 1, day)).getUTCDay();
}

/** Parte AAAA-MM-DD de um instante ISO no fuso de Brasília (para heatmaps / contagens por dia). */
export function isoTimestampToYmdBr(iso: string): string {
  const t = String(iso ?? '').trim();
  if (!t) return '';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(d);
}

export const getBrasiliaISOString = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  return formatter.format(now).replace(' ', 'T');
};

export const getViewLabel = (view: string) => {
  switch (view) {
    case View.Dashboard: return 'Analisando o Painel';
    case View.Anki: return 'Revisando Flashcards';
    case View.Timer: return 'Em Sessão de Foco';
    case View.Subjects: return 'Organizando Cadeiras';
    case View.Tasks: return 'Consultando a Pauta';
    case View.Calendar: return 'Revisando a Agenda';
    case View.Ranking: return 'No Hall da Fama';
    case View.Library: return 'Consultando a Doutrina';
    case View.Largo: return 'No Largo São Francisco';
    case View.Duel: return 'Em Combate Intelectual';
    default: return 'Caminhando pelas Arcadas';
  }
};
