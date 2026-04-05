import type { MdoPersisted } from './types';
import { MDO_DATA_VERSION } from './types';

export function storageKey(userId: string) {
  return `sanfran_mdo_${userId}`;
}

export function metaStorageKey(userId: string) {
  return `sanfran_mdo_meta_${userId}`;
}

/** Metadados locais para resolver conflitos com a nuvem (última edição neste browser). */
export interface MdoLocalMeta {
  lastLocalEditAt: string;
}

export function emptyMeta(): MdoLocalMeta {
  return { lastLocalEditAt: '1970-01-01T00:00:00.000Z' };
}

export function parseMdoMeta(json: string | null): MdoLocalMeta {
  if (!json) return emptyMeta();
  try {
    const o = JSON.parse(json) as unknown;
    if (
      o &&
      typeof o === 'object' &&
      'lastLocalEditAt' in o &&
      typeof (o as MdoLocalMeta).lastLocalEditAt === 'string'
    ) {
      return { lastLocalEditAt: (o as MdoLocalMeta).lastLocalEditAt };
    }
  } catch {
    /* ignore */
  }
  return emptyMeta();
}

export function isMdoPersistedEmpty(p: MdoPersisted): boolean {
  return (
    p.transactions.length === 0 &&
    p.bills.length === 0 &&
    Object.keys(p.monthlyBudgetCentsByMonth).length === 0 &&
    p.debts.length === 0 &&
    p.investments.length === 0 &&
    p.creditCards.length === 0 &&
    p.cardPurchases.length === 0 &&
    Object.keys(p.categoryBudgetCentsByMonth).length === 0
  );
}

export function emptyPersisted(): MdoPersisted {
  return {
    version: MDO_DATA_VERSION,
    transactions: [],
    bills: [],
    monthlyBudgetCentsByMonth: {},
    debts: [],
    investments: [],
    creditCards: [],
    cardPurchases: [],
    categoryBudgetCentsByMonth: {},
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/** Aceita JSON legado sem version nem novos arrays */
export function migrateMdoPersisted(raw: unknown): MdoPersisted {
  if (!isRecord(raw)) return emptyPersisted();

  const transactions = Array.isArray(raw.transactions) ? raw.transactions : [];
  const bills = Array.isArray(raw.bills) ? raw.bills : [];
  const monthlyBudgetCentsByMonth =
    isRecord(raw.monthlyBudgetCentsByMonth) && raw.monthlyBudgetCentsByMonth
      ? (raw.monthlyBudgetCentsByMonth as Record<string, number>)
      : {};

  return {
    version: MDO_DATA_VERSION,
    transactions,
    bills,
    monthlyBudgetCentsByMonth,
    debts: Array.isArray(raw.debts) ? raw.debts : [],
    investments: Array.isArray(raw.investments) ? raw.investments : [],
    creditCards: Array.isArray(raw.creditCards) ? raw.creditCards : [],
    cardPurchases: Array.isArray(raw.cardPurchases) ? raw.cardPurchases : [],
    categoryBudgetCentsByMonth:
      isRecord(raw.categoryBudgetCentsByMonth) && raw.categoryBudgetCentsByMonth
        ? (raw.categoryBudgetCentsByMonth as MdoPersisted['categoryBudgetCentsByMonth'])
        : {},
  };
}

export function parseMdoFromStorage(json: string | null): MdoPersisted {
  if (!json) return emptyPersisted();
  try {
    return migrateMdoPersisted(JSON.parse(json));
  } catch {
    return emptyPersisted();
  }
}
