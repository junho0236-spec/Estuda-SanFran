import React, { useState } from 'react';
import { toast } from 'sonner';
import { LineChart, Plus, Trash2 } from 'lucide-react';
import type { MdoInvestment, MdoInvestmentKind, MdoPersisted } from './types';
import { formatBRL, parseMoneyToCents } from './mdoFormat';

export interface MdoInvestmentsTabProps {
  data: MdoPersisted;
  onPersist: (next: MdoPersisted) => void;
}

const KIND_LABEL: Record<MdoInvestmentKind, string> = {
  rf: 'Renda fixa',
  rv: 'Renda variável',
  outro: 'Outro',
};

export const MdoInvestmentsTab: React.FC<MdoInvestmentsTabProps> = ({ data, onPersist }) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [kind, setKind] = useState<MdoInvestmentKind>('rf');
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));

  const add = () => {
    const n = name.trim();
    if (!n) {
      toast.error('Indica o nome.');
      return;
    }
    const cents = parseMoneyToCents(value);
    if (cents == null || cents < 0) {
      toast.error('Valor inválido.');
      return;
    }
    const row: MdoInvestment = {
      id: crypto.randomUUID?.() ?? `inv-${Date.now()}`,
      name: n,
      valueCents: cents,
      kind,
      asOfDate: asOf,
    };
    onPersist({ ...data, investments: [...data.investments, row] });
    setName('');
    setValue('');
    toast.success('Investimento adicionado.');
  };

  const remove = (id: string) => {
    onPersist({ ...data, investments: data.investments.filter((i) => i.id !== id) });
    toast.message('Removido.');
  };

  const total = data.investments.reduce((s, i) => s + i.valueCents, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LineChart className="w-8 h-8 text-emerald-600" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Total manual
            </p>
            <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
              {formatBRL(total)}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs text-right">
          Valores inseridos por ti; não há ligação a corretoras.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Novo registo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Nome (ex: Tesouro IPCA+)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm sm:col-span-2"
          />
          <input
            placeholder="Valor atual (R$)"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MdoInvestmentKind)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          >
            {(Object.keys(KIND_LABEL) as MdoInvestmentKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase text-slate-500 sm:col-span-2">
            Data de referência
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm font-medium normal-case"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={add}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <ul className="space-y-2">
        {data.investments.length === 0 ? (
          <li className="text-center text-slate-400 py-8 text-sm">Sem investimentos registados.</li>
        ) : (
          data.investments.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900/30"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{i.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                  {KIND_LABEL[i.kind]} · {i.asOfDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tabular-nums">{formatBRL(i.valueCents)}</span>
                <button
                  type="button"
                  onClick={() => remove(i.id)}
                  className="p-2 text-slate-400 hover:text-red-500"
                  aria-label="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};
