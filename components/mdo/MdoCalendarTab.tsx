import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import type { MdoBill, MdoPersisted } from './types';
import { formatBRL, parseMoneyToCents, ymLabel } from './mdoFormat';

export interface MdoCalendarTabProps {
  data: MdoPersisted;
  ym: string;
  onPersist: (next: MdoPersisted) => void;
}

type DayEvent = { kind: string; label: string; detail?: string };

function daysInMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function startWeekday(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).getDay();
}

export const MdoCalendarTab: React.FC<MdoCalendarTabProps> = ({ data, ym, onPersist }) => {
  const [billName, setBillName] = useState('');
  const [billDay, setBillDay] = useState('10');
  const [billAmount, setBillAmount] = useState('');

  const grid = useMemo(() => {
    const dim = daysInMonth(ym);
    const pad = startWeekday(ym);
    const cells: (number | null)[] = [...Array(pad).fill(null)];
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [ym]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, DayEvent[]>();
    const add = (day: number, e: DayEvent) => {
      if (day < 1 || day > 31) return;
      const arr = map.get(day) ?? [];
      arr.push(e);
      map.set(day, arr);
    };

    for (const b of data.bills) {
      add(b.dueDay, { kind: 'bill', label: b.name, detail: formatBRL(b.amountCents) });
    }
    for (const c of data.creditCards) {
      add(c.dueDay, { kind: 'card', label: `Fatura ${c.name}`, detail: `Vence dia ${c.dueDay}` });
    }
    for (const d of data.debts) {
      if (d.dueDay != null) add(d.dueDay, { kind: 'debt', label: d.name, detail: 'Dívida' });
    }
    const [y, m] = ym.split('-').map(Number);
    for (const p of data.cardPurchases) {
      const dt = new Date(p.date + 'T12:00:00');
      if (dt.getFullYear() === y && dt.getMonth() + 1 === m) {
        const day = dt.getDate();
        const card = data.creditCards.find((c) => c.id === p.cardId);
        add(day, {
          kind: 'purchase',
          label: p.description,
          detail: card ? card.name : 'Cartão',
        });
      }
    }
    return map;
  }, [data.bills, data.creditCards, data.debts, data.cardPurchases, ym]);

  const addBill = () => {
    const day = Math.min(31, Math.max(1, parseInt(billDay, 10) || 0));
    const cents = parseMoneyToCents(billAmount);
    if (cents == null) {
      toast.error('Indica o valor da conta.');
      return;
    }
    const n = billName.trim();
    if (!n) {
      toast.error('Indica o nome da conta.');
      return;
    }
    const row: MdoBill = {
      id: crypto.randomUUID?.() ?? `bill-${Date.now()}`,
      name: n,
      dueDay: day,
      amountCents: cents,
    };
    onPersist({ ...data, bills: [...data.bills, row].sort((a, b) => a.dueDay - b.dueDay) });
    setBillName('');
    setBillAmount('');
    toast.success('Conta recorrente adicionada.');
  };

  const removeBill = (id: string) => {
    onPersist({ ...data, bills: data.bills.filter((b) => b.id !== id) });
    toast.message('Removido.');
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 md:p-6 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-sanfran-rubi" />
          {ymLabel(ym)}
        </h2>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400 mb-2">
          {weekDays.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => (
            <div
              key={i}
              className={`min-h-[4.5rem] rounded-lg border p-1 text-left ${
                d == null
                  ? 'border-transparent bg-transparent'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40'
              }`}
            >
              {d != null && (
                <>
                  <span className="text-[10px] font-black text-slate-500">{d}</span>
                  <ul className="mt-0.5 space-y-0.5">
                    {(eventsByDay.get(d) ?? []).slice(0, 3).map((ev, j) => (
                      <li
                        key={j}
                        className={`text-[9px] leading-tight rounded px-0.5 truncate ${
                          ev.kind === 'bill'
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100'
                            : ev.kind === 'card'
                              ? 'bg-sanfran-rubi/15 text-sanfran-rubi'
                              : ev.kind === 'debt'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                        title={`${ev.label} — ${ev.detail ?? ''}`}
                      >
                        {ev.label}
                      </li>
                    ))}
                    {(eventsByDay.get(d)?.length ?? 0) > 3 && (
                      <li className="text-[8px] text-slate-400">+{(eventsByDay.get(d)!.length - 3)}</li>
                    )}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
          Legenda: contas recorrentes, vencimento de fatura (cartão), dívidas com dia definido, compras no cartão
          com data neste mês.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Contas recorrentes</h3>
        <p className="text-xs text-slate-500">Repetem todo o mês (água, luz, mensalidade…).</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            placeholder="Nome"
            value={billName}
            onChange={(e) => setBillName(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min={1}
            max={31}
            placeholder="Dia"
            value={billDay}
            onChange={(e) => setBillDay(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Valor R$"
            inputMode="decimal"
            value={billAmount}
            onChange={(e) => setBillAmount(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={addBill}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-xs font-black uppercase tracking-widest text-slate-600"
        >
          <Plus className="w-4 h-4" />
          Adicionar conta recorrente
        </button>
        <ul className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          {data.bills.length === 0 ? (
            <li className="text-sm text-slate-400 text-center py-4">Nenhuma conta.</li>
          ) : (
            data.bills.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2"
              >
                <div>
                  <p className="font-bold text-sm">{b.name}</p>
                  <p className="text-[10px] text-sanfran-rubi font-black uppercase">Dia {b.dueDay}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tabular-nums">{formatBRL(b.amountCents)}</span>
                  <button type="button" onClick={() => removeBill(b.id)} className="p-2 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
