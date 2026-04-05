export type MdoTransactionKind = 'income' | 'expense';
export type MdoExpenseCategory = 'fixa' | 'variavel' | 'outro';

export interface MdoTransaction {
  id: string;
  kind: MdoTransactionKind;
  category: MdoExpenseCategory;
  description: string;
  amountCents: number;
  date: string;
}

export interface MdoBill {
  id: string;
  name: string;
  dueDay: number;
  amountCents: number;
}

export interface MdoDebt {
  id: string;
  name: string;
  totalCents: number;
  paidCents: number;
  monthlyPaymentCents?: number;
  dueDay?: number;
  notes?: string;
}

export type MdoInvestmentKind = 'rf' | 'rv' | 'outro';

export interface MdoInvestment {
  id: string;
  name: string;
  valueCents: number;
  kind: MdoInvestmentKind;
  asOfDate: string;
}

export interface MdoCreditCard {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  limitCents?: number;
}

export interface MdoCardPurchase {
  id: string;
  cardId: string;
  description: string;
  amountCents: number;
  date: string;
  installmentTotal: number;
  installmentIndex: number;
}

/** Orçamento opcional por categoria de despesa, por mês YYYY-MM */
export type MdoCategoryBudgetMap = Record<string, Partial<Record<MdoExpenseCategory, number>>>;

export const MDO_DATA_VERSION = 2;

export interface MdoPersisted {
  version: number;
  transactions: MdoTransaction[];
  bills: MdoBill[];
  monthlyBudgetCentsByMonth: Record<string, number>;
  debts: MdoDebt[];
  investments: MdoInvestment[];
  creditCards: MdoCreditCard[];
  cardPurchases: MdoCardPurchase[];
  categoryBudgetCentsByMonth: MdoCategoryBudgetMap;
}

export type MdoTabId =
  | 'panorama'
  | 'movimentos'
  | 'dividas'
  | 'investimentos'
  | 'limites'
  | 'calendario'
  | 'cartoes';
