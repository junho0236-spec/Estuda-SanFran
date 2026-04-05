import React, { useMemo } from 'react';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MdoPersisted, MdoTransaction } from './types';
import { formatBRL, lastNMonthsFrom, ymLabel } from './mdoFormat';

const PIE_COLORS = ['#e11d48', '#f59e0b', '#64748b'];

export interface MdoDashboardTabProps {
  data: MdoPersisted;
  ym: string;
}

function monthTotals(transactions: MdoTransaction[], ymKey: string) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (!t.date.startsWith(ymKey)) continue;
    if (t.kind === 'income') income += t.amountCents;
    else expense += t.amountCents;
  }
  return { income, expense, balance: income - expense };
}

function expenseByCategory(transactions: MdoTransaction[], ymKey: string) {
  const map: Record<string, number> = { fixa: 0, variavel: 0, outro: 0 };
  for (const t of transactions) {
    if (t.kind !== 'expense' || !t.date.startsWith(ymKey)) continue;
    map[t.category] = (map[t.category] ?? 0) + t.amountCents;
  }
  return [
    { name: 'Fixa', value: map.fixa / 100, cents: map.fixa },
    { name: 'Variável', value: map.variavel / 100, cents: map.variavel },
    { name: 'Outro', value: map.outro / 100, cents: map.outro },
  ].filter((x) => x.cents > 0);
}

export const MdoDashboardTab: React.FC<MdoDashboardTabProps> = ({ data, ym }) => {
  const totals = useMemo(() => monthTotals(data.transactions, ym), [data.transactions, ym]);

  const barData = useMemo(() => {
    const keys = lastNMonthsFrom(ym, 6);
    return keys.map((k) => {
      const m = monthTotals(data.transactions, k);
      return {
        mes: `${k.slice(5)}/${k.slice(2, 4)}`,
        Receitas: m.income / 100,
        Despesas: m.expense / 100,
      };
    });
  }, [data.transactions, ym]);

  const pieData = useMemo(() => expenseByCategory(data.transactions, ym), [data.transactions, ym]);

  const budgetCents = data.monthlyBudgetCentsByMonth[ym] ?? null;
  const budgetUsedRatio =
    budgetCents != null && budgetCents > 0 ? Math.min(1, totals.expense / budgetCents) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Receitas
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatBRL(totals.income)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
              Despesas
            </span>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatBRL(totals.expense)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Saldo</span>
            <Wallet className="w-5 h-5 text-sanfran-rubi" />
          </div>
          <p
            className={`text-2xl font-black tabular-nums ${
              totals.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatBRL(totals.balance)}
          </p>
        </div>
      </div>

      {budgetCents != null && budgetCents > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
            <span>Limite global do mês</span>
            <span className="tabular-nums">
              {formatBRL(totals.expense)} / {formatBRL(budgetCents)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetUsedRatio != null && budgetUsedRatio > 1
                  ? 'bg-red-500'
                  : budgetUsedRatio != null && budgetUsedRatio > 0.85
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${budgetUsedRatio != null ? Math.min(100, budgetUsedRatio * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 md:p-5 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-4">
            Últimos 6 meses (R$)
          </h3>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={36} />
                <Tooltip
                  formatter={(v: number) => formatBRL(Math.round(v * 100))}
                  contentStyle={{ borderRadius: 12 }}
                />
                <Legend />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 md:p-5 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-4">
            Despesas por tipo — {ymLabel(ym)}
          </h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Sem despesas neste mês.</p>
          ) : (
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(Math.round(v * 100))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/30 p-4 text-xs text-slate-600 dark:text-slate-400">
        <strong className="text-slate-800 dark:text-slate-200">Resumo patrimonial (manual):</strong> investimentos
        registados:{' '}
        <span className="font-bold tabular-nums text-sanfran-rubi">
          {formatBRL(data.investments.reduce((s, i) => s + i.valueCents, 0))}
        </span>
        {' · '}
        dívidas em aberto (aprox.):{' '}
        <span className="font-bold tabular-nums text-red-600">
          {formatBRL(
            data.debts.reduce((s, d) => s + Math.max(0, d.totalCents - d.paidCents), 0)
          )}
        </span>
      </div>
    </div>
  );
};
