import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Gauge } from 'lucide-react';
import type { MdoExpenseCategory, MdoPersisted } from './types';
import { formatBRL, parseMoneyToCents, ymLabel } from './mdoFormat';

export interface MdoLimitsTabProps {
  data: MdoPersisted;
  ym: string;
  onPersist: (next: MdoPersisted) => void;
}

const CAT: { key: MdoExpenseCategory; label: string }[] = [
  { key: 'fixa', label: 'Despesas fixas' },
  { key: 'variavel', label: 'Despesas variáveis' },
  { key: 'outro', label: 'Outras despesas' },
];

export const MdoLimitsTab: React.FC<MdoLimitsTabProps> = ({ data, ym, onPersist }) => {
  const [budgetInput, setBudgetInput] = useState('');
  const [catInputs, setCatInputs] = useState<Record<MdoExpenseCategory, string>>({
    fixa: '',
    variavel: '',
    outro: '',
  });

  const budgetCents = data.monthlyBudgetCentsByMonth[ym] ?? null;
  const catBudget = data.categoryBudgetCentsByMonth[ym] ?? {};

  const spentByCat = useMemo(() => {
    const m: Record<MdoExpenseCategory, number> = { fixa: 0, variavel: 0, outro: 0 };
    for (const t of data.transactions) {
      if (t.kind !== 'expense' || !t.date.startsWith(ym)) continue;
      m[t.category] += t.amountCents;
    }
    return m;
  }, [data.transactions, ym]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of data.transactions) {
      if (!t.date.startsWith(ym)) continue;
      if (t.kind === 'income') income += t.amountCents;
      else expense += t.amountCents;
    }
    return { expense };
  }, [data.transactions, ym]);

  useEffect(() => {
    if (budgetCents != null) {
      setBudgetInput(String((budgetCents / 100).toFixed(2)).replace('.', ','));
    } else {
      setBudgetInput('');
    }
  }, [ym, budgetCents]);

  useEffect(() => {
    setCatInputs({
      fixa: catBudget.fixa != null ? String((catBudget.fixa / 100).toFixed(2)).replace('.', ',') : '',
      variavel:
        catBudget.variavel != null ? String((catBudget.variavel / 100).toFixed(2)).replace('.', ',') : '',
      outro: catBudget.outro != null ? String((catBudget.outro / 100).toFixed(2)).replace('.', ',') : '',
    });
  }, [ym, catBudget.fixa, catBudget.variavel, catBudget.outro]);

  const applyBudget = () => {
    const t = budgetInput.trim();
    if (t === '') {
      const next = { ...data.monthlyBudgetCentsByMonth };
      delete next[ym];
      onPersist({ ...data, monthlyBudgetCentsByMonth: next });
      toast.message('Limite global removido para este mês.');
      return;
    }
    const cents = parseMoneyToCents(t);
    if (cents == null || cents === 0) {
      toast.error('Valor de limite inválido.');
      return;
    }
    onPersist({
      ...data,
      monthlyBudgetCentsByMonth: { ...data.monthlyBudgetCentsByMonth, [ym]: cents },
    });
    toast.success('Limite global atualizado.');
  };

  const applyCategoryBudgets = () => {
    const nextMap = { ...data.categoryBudgetCentsByMonth };
    const sub: Partial<Record<MdoExpenseCategory, number>> = {};
    for (const { key } of CAT) {
      const raw = catInputs[key].trim();
      if (raw === '') continue;
      const c = parseMoneyToCents(raw);
      if (c == null || c === 0) {
        toast.error(`Limite inválido: ${key}`);
        return;
      }
      sub[key] = c;
    }
    if (Object.keys(sub).length === 0) {
      const inner = { ...nextMap };
      delete inner[ym];
      onPersist({ ...data, categoryBudgetCentsByMonth: inner });
      toast.message('Limites por categoria removidos para este mês.');
      return;
    }
    nextMap[ym] = sub;
    onPersist({ ...data, categoryBudgetCentsByMonth: nextMap });
    toast.success('Limites por categoria guardados.');
  };

  const globalRatio =
    budgetCents != null && budgetCents > 0 ? Math.min(1, totals.expense / budgetCents) : null;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-sanfran-rubi" />
          Limite global de gastos — {ymLabel(ym)}
        </h2>
        <p className="text-xs text-slate-500 mb-4">Teto para todas as despesas do mês (opcional).</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Ex: 2500,00 (vazio = sem limite)"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold"
          />
          <button
            type="button"
            onClick={applyBudget}
            className="px-6 py-3 rounded-xl bg-sanfran-rubi text-white text-xs font-black uppercase tracking-widest"
          >
            Guardar
          </button>
        </div>
        {budgetCents != null && budgetCents > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-1">
              <span>Utilizado</span>
              <span className="tabular-nums">
                {formatBRL(totals.expense)} / {formatBRL(budgetCents)}
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  globalRatio != null && globalRatio > 1
                    ? 'bg-red-500'
                    : globalRatio != null && globalRatio > 0.85
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${globalRatio != null ? Math.min(100, globalRatio * 100) : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
          Limites por tipo de despesa
        </h2>
        <p className="text-xs text-slate-500">
          Opcional. Acompanha só despesas classificadas como fixa, variável ou outro no separador Movimentos.
        </p>
        {CAT.map(({ key, label }) => {
          const cap = catBudget[key];
          const spent = spentByCat[key];
          const ratio = cap != null && cap > 0 ? Math.min(1, spent / cap) : null;
          return (
            <div key={key} className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 w-40 shrink-0">
                  {label}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Limite R$ (vazio = off)"
                  value={catInputs[key]}
                  onChange={(e) => setCatInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              {cap != null && cap > 0 && (
                <div className="ml-0 sm:ml-40">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                    <span>Gasto</span>
                    <span className="tabular-nums">
                      {formatBRL(spent)} / {formatBRL(cap)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        ratio != null && ratio > 1 ? 'bg-red-500' : ratio != null && ratio > 0.85 ? 'bg-amber-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${ratio != null ? Math.min(100, ratio * 100) : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={applyCategoryBudgets}
          className="w-full py-3 rounded-xl border-2 border-slate-900 dark:border-white text-xs font-black uppercase tracking-widest"
        >
          Guardar limites por categoria
        </button>
      </div>
    </div>
  );
};
