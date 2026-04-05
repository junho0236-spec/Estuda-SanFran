import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import type { MdoExpenseCategory, MdoPersisted, MdoTransaction, MdoTransactionKind } from './types';
import { formatBRL, parseMoneyToCents, ymLabel } from './mdoFormat';

export interface MdoCashflowTabProps {
  data: MdoPersisted;
  ym: string;
  onPersist: (next: MdoPersisted) => void;
}

export const MdoCashflowTab: React.FC<MdoCashflowTabProps> = ({ data, ym, onPersist }) => {
  const [txKind, setTxKind] = useState<MdoTransactionKind>('expense');
  const [txCategory, setTxCategory] = useState<MdoExpenseCategory>('variavel');
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));

  const monthTransactions = useMemo(
    () => data.transactions.filter((t) => t.date.startsWith(ym)),
    [data.transactions, ym]
  );

  const addTransaction = () => {
    const cents = parseMoneyToCents(txAmount);
    if (cents == null || cents === 0) {
      toast.error('Indica um valor válido.');
      return;
    }
    const d = txDesc.trim();
    if (!d) {
      toast.error('Indica uma descrição.');
      return;
    }
    const row: MdoTransaction = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`,
      kind: txKind,
      category: txKind === 'expense' ? txCategory : 'outro',
      description: d,
      amountCents: cents,
      date: txDate,
    };
    onPersist({ ...data, transactions: [row, ...data.transactions] });
    setTxDesc('');
    setTxAmount('');
    toast.success(txKind === 'income' ? 'Receita registada.' : 'Despesa registada.');
  };

  const removeTransaction = (id: string) => {
    onPersist({ ...data, transactions: data.transactions.filter((t) => t.id !== id) });
    toast.message('Movimento removido.');
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
      <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4 text-sanfran-rubi" />
        Movimentos — {ymLabel(ym)}
      </h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTxKind('expense')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
            txKind === 'expense'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              : 'border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          Despesa
        </button>
        <button
          type="button"
          onClick={() => setTxKind('income')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
            txKind === 'income'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
              : 'border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          Receita
        </button>
      </div>
      {txKind === 'expense' && (
        <div className="flex flex-wrap gap-2">
          {(['fixa', 'variavel', 'outro'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setTxCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${
                txCategory === c
                  ? 'border-sanfran-rubi bg-sanfran-rubi/10 text-sanfran-rubi'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              {c === 'fixa' ? 'Fixa' : c === 'variavel' ? 'Variável' : 'Outro'}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        placeholder="Descrição"
        value={txDesc}
        onChange={(e) => setTxDesc(e.target.value)}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-medium"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          inputMode="decimal"
          placeholder="Valor (R$)"
          value={txAmount}
          onChange={(e) => setTxAmount(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-medium"
        />
        <input
          type="date"
          value={txDate}
          onChange={(e) => setTxDate(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-medium"
        />
      </div>
      <button
        type="button"
        onClick={addTransaction}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest hover:opacity-95"
      >
        <Plus className="w-4 h-4" />
        Adicionar
      </button>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
          Lista do mês
        </h3>
        <ul className="space-y-2 max-h-[28rem] overflow-y-auto custom-scrollbar">
          {monthTransactions.length === 0 ? (
            <li className="text-sm text-slate-400 italic py-4 text-center">Nenhum movimento neste mês.</li>
          ) : (
            monthTransactions.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 px-3 py-2.5"
              >
                <div
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    t.kind === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'
                  }`}
                >
                  {t.kind === 'income' ? (
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{t.description}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    {t.date}{' '}
                    {t.kind === 'expense'
                      ? `· ${t.category === 'fixa' ? 'Fixa' : t.category === 'variavel' ? 'Variável' : 'Outro'}`
                      : ''}
                  </p>
                </div>
                <span
                  className={`text-sm font-black tabular-nums shrink-0 ${
                    t.kind === 'income' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {t.kind === 'income' ? '+' : '−'}
                  {formatBRL(t.amountCents)}
                </span>
                <button
                  type="button"
                  onClick={() => removeTransaction(t.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  aria-label="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
