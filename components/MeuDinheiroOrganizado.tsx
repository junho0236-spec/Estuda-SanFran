/**
 * MDO — reexporta tipos e o shell modular em components/mdo/
 */
export type {
  MdoTransactionKind,
  MdoExpenseCategory,
  MdoTransaction,
  MdoBill,
  MdoDebt,
  MdoInvestmentKind,
  MdoInvestment,
  MdoCreditCard,
  MdoCardPurchase,
  MdoPersisted,
  MdoTabId,
} from './mdo/types';

export { MDO_DATA_VERSION } from './mdo/types';

export { default } from './mdo/MeuDinheiroOrganizadoShell';
