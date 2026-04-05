import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import type { MdoDebt, MdoPersisted } from './types';
import { formatBRL, parseMoneyToCents } from './mdoFormat';

export interface MdoDebtsTabProps {
  data: MdoPersisted;
  onPersist: (next: MdoPersisted) => void;
}

export const MdoDebtsTab: React.FC<MdoDebtsTabProps> = ({ data, onPersist }) => {
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [paid, setPaid] = useState('');
  const [monthly, setMonthly] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [notes, setNotes] = useState('');

  const addDebt = () => {
    const n = name.trim();
    if (!n) {
      toast.error('Indica o nome da dívida.');
      return;
    }
    const totalCents = parseMoneyToCents(total);
    const paidCents = parseMoneyToCents(paid) ?? 0;
    if (totalCents == null || totalCents <= 0) {
      toast.error('Valor total inválido.');
      return;
    }
    if (paidCents > totalCents) {
      toast.error('Valor pago não pode exceder o total.');
      return;
    }
    const row: MdoDebt = {
      id: crypto.randomUUID?.() ?? `debt-${Date.now()}`,
      name: n,
      totalCents,
      paidCents,
      monthlyPaymentCents: monthly.trim() ? parseMoneyToCents(monthly) ?? undefined : undefined,
      dueDay: dueDay.trim() ? Math.min(31, Math.max(1, parseInt(dueDay, 10) || 0)) : undefined,
      notes: notes.trim() || undefined,
    };
    if (row.dueDay != null && row.dueDay < 1) delete row.dueDay;
    onPersist({ ...data, debts: [...data.debts, row] });
    setName('');
    setTotal('');
    setPaid('');
    setMonthly('');
    setDueDay('');
    setNotes('');
    toast.success('Dívida registada.');
  };

  const remove = (id: string) => {
    onPersist({ ...data, debts: data.debts.filter((d) => d.id !== id) });
    toast.message('Removido.');
  };

  const updatePaid = (id: string, raw: string) => {
    const cents = parseMoneyToCents(raw);
    if (cents == null) return;
    onPersist({
      ...data,
      debts: data.debts.map((d) =>
        d.id === id ? { ...d, paidCents: Math.min(cents, d.totalCents) } : d
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-sanfran-rubi" />
          Nova dívida
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Nome (ex: cartão Nubank)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm sm:col-span-2"
          />
          <input
            placeholder="Total (R$)"
            inputMode="decimal"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Já pago (R$)"
            inputMode="decimal"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Parcela mensal (opcional)"
            inputMode="decimal"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min={1}
            max={31}
            placeholder="Dia vencimento (opcional)"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm sm:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={addDebt}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sanfran-rubi text-white text-xs font-black uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <ul className="space-y-3">
        {data.debts.length === 0 ? (
          <li className="text-center text-slate-400 py-8 text-sm">Nenhuma dívida registada.</li>
        ) : (
          data.debts.map((d) => {
            const left = Math.max(0, d.totalCents - d.paidCents);
            const pct = d.totalCents > 0 ? Math.round((d.paidCents / d.totalCents) * 100) : 0;
            return (
              <li
                key={d.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Restam {formatBRL(left)} · Pago {pct}%
                    {d.dueDay ? ` · Vence dia ${d.dueDay}` : ''}
                    {d.monthlyPaymentCents ? ` · ~${formatBRL(d.monthlyPaymentCents)}/mês` : ''}
                  </p>
                  {d.notes && <p className="text-xs text-slate-400 mt-1">{d.notes}</p>}
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">
                    Pago
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={(d.paidCents / 100).toFixed(2).replace('.', ',')}
                    key={d.paidCents}
                    onBlur={(e) => updatePaid(d.id, e.target.value)}
                    className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-sm tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    className="p-2 text-slate-400 hover:text-red-500"
                    aria-label="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};
