import type { MdoPersisted } from './types';
import { MDO_DATA_VERSION } from './types';

export function storageKey(userId: string) {
  return `sanfran_mdo_${userId}`;
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
