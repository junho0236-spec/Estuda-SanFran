import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import type { MdoCardPurchase, MdoCreditCard, MdoPersisted } from './types';
import { formatBRL, parseMoneyToCents, ymLabel } from './mdoFormat';

export interface MdoCreditCardsTabProps {
  data: MdoPersisted;
  ym: string;
  onPersist: (next: MdoPersisted) => void;
}

export const MdoCreditCardsTab: React.FC<MdoCreditCardsTabProps> = ({ data, ym, onPersist }) => {
  const [cName, setCName] = useState('');
  const [closing, setClosing] = useState('5');
  const [due, setDue] = useState('10');
  const [limit, setLimit] = useState('');

  const [cardId, setCardId] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pAmount, setPAmount] = useState('');
  const [pDate, setPDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pTotalInst, setPTotalInst] = useState('1');
  const [pIndex, setPIndex] = useState('1');

  const addCard = () => {
    const n = cName.trim();
    if (!n) {
      toast.error('Nome do cartão.');
      return;
    }
    const cl = Math.min(28, Math.max(1, parseInt(closing, 10) || 0));
    const du = Math.min(31, Math.max(1, parseInt(due, 10) || 0));
    if (cl < 1 || du < 1) {
      toast.error('Dias inválidos.');
      return;
    }
    const row: MdoCreditCard = {
      id: crypto.randomUUID?.() ?? `card-${Date.now()}`,
      name: n,
      closingDay: cl,
      dueDay: du,
      limitCents: limit.trim() ? parseMoneyToCents(limit) ?? undefined : undefined,
    };
    onPersist({ ...data, creditCards: [...data.creditCards, row] });
    setCName('');
    setLimit('');
    if (!cardId) setCardId(row.id);
    toast.success('Cartão adicionado.');
  };

  const removeCard = (id: string) => {
    onPersist({
      ...data,
      creditCards: data.creditCards.filter((c) => c.id !== id),
      cardPurchases: data.cardPurchases.filter((p) => p.cardId !== id),
    });
    if (cardId === id) setCardId('');
    toast.message('Cartão removido.');
  };

  const addPurchase = () => {
    const cid = cardId || data.creditCards[0]?.id;
    if (!cid) {
      toast.error('Adiciona um cartão primeiro.');
      return;
    }
    const cents = parseMoneyToCents(pAmount);
    if (cents == null || cents <= 0) {
      toast.error('Valor inválido.');
      return;
    }
    const d = pDesc.trim();
    if (!d) {
      toast.error('Descrição.');
      return;
    }
    const total = Math.min(120, Math.max(1, parseInt(pTotalInst, 10) || 1));
    const idx = Math.min(total, Math.max(1, parseInt(pIndex, 10) || 1));
    const row: MdoCardPurchase = {
      id: crypto.randomUUID?.() ?? `pur-${Date.now()}`,
      cardId: cid,
      description: d,
      amountCents: cents,
      date: pDate,
      installmentTotal: total,
      installmentIndex: idx,
    };
    onPersist({ ...data, cardPurchases: [row, ...data.cardPurchases] });
    setPDesc('');
    setPAmount('');
    toast.success('Compra registada.');
  };

  const removePurchase = (id: string) => {
    onPersist({ ...data, cardPurchases: data.cardPurchases.filter((p) => p.id !== id) });
    toast.message('Removida.');
  };

  const purchasesThisMonth = useMemo(
    () => data.cardPurchases.filter((p) => p.date.startsWith(ym)),
    [data.cardPurchases, ym]
  );

  const summaryByCard = useMemo(() => {
    return data.creditCards.map((c) => {
      const monthPurchases = data.cardPurchases.filter(
        (p) => p.cardId === c.id && p.date.startsWith(ym)
      );
      const sum = monthPurchases.reduce((s, p) => s + p.amountCents, 0);
      return { card: c, sum, count: monthPurchases.length };
    });
  }, [data.creditCards, data.cardPurchases, ym]);

  useEffect(() => {
    if (!cardId && data.creditCards.length > 0) setCardId(data.creditCards[0].id);
  }, [cardId, data.creditCards]);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40 px-4 py-3 text-xs text-amber-950 dark:text-amber-100/90">
        <strong className="font-black uppercase">Fatura estimada (mês civil):</strong> soma das compras com data
        em {ymLabel(ym)}. Não calcula ciclo de fechamento automaticamente; usa os dias de fechamento/vencimento como
        referência pessoal.
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-sanfran-rubi" />
          Novo cartão
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            placeholder="Nome"
            value={cName}
            onChange={(e) => setCName(e.target.value)}
            className="col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min={1}
            max={28}
            placeholder="Fechamento (dia)"
            value={closing}
            onChange={(e) => setClosing(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min={1}
            max={31}
            placeholder="Vencimento (dia)"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Limite R$ (opcional)"
            inputMode="decimal"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={addCard}
          className="w-full py-3 rounded-xl bg-sanfran-rubi text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar cartão
        </button>

        <ul className="space-y-2">
          {data.creditCards.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2"
            >
              <div>
                <p className="font-bold">{c.name}</p>
                <p className="text-[10px] text-slate-500">
                  Fecha dia {c.closingDay} · Vence dia {c.dueDay}
                  {c.limitCents != null ? ` · Limite ${formatBRL(c.limitCents)}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => removeCard(c.id)} className="p-2 text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Resumo no mês {ymLabel(ym)}</h3>
        <div className="grid gap-2">
          {summaryByCard.length === 0 ? (
            <p className="text-sm text-slate-400">Sem cartões.</p>
          ) : (
            summaryByCard.map(({ card, sum, count }) => (
              <div
                key={card.id}
                className="flex justify-between items-center rounded-xl bg-slate-50 dark:bg-slate-950/50 px-3 py-2"
              >
                <span className="font-bold text-sm">{card.name}</span>
                <span className="text-sm font-black tabular-nums">
                  {formatBRL(sum)}
                  <span className="text-[10px] font-normal text-slate-400 ml-2">({count} lanç.)</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 md:p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Nova compra</h3>
        <select
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
        >
          {data.creditCards.length === 0 ? (
            <option value="">—</option>
          ) : (
            data.creditCards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          )}
        </select>
        <input
          placeholder="Descrição"
          value={pDesc}
          onChange={(e) => setPDesc(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Valor (R$) desta parcela / compra"
            inputMode="decimal"
            value={pAmount}
            onChange={(e) => setPAmount(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            type="date"
            value={pDate}
            onChange={(e) => setPDate(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min={1}
            placeholder="Parcela atual (ex: 1)"
            value={pIndex}
            onChange={(e) => setPIndex(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min={1}
            placeholder="Total de parcelas"
            value={pTotalInst}
            onChange={(e) => setPTotalInst(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={addPurchase}
          className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest"
        >
          Registar compra
        </button>

        <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar border-t border-slate-100 dark:border-slate-800 pt-4">
          {purchasesThisMonth.length === 0 ? (
            <li className="text-sm text-slate-400 text-center py-4">Nenhuma compra neste mês.</li>
          ) : (
            purchasesThisMonth.map((p) => {
                const c = data.creditCards.find((x) => x.id === p.cardId);
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-sm rounded-lg border border-slate-100 dark:border-slate-800 px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="font-bold truncate">{p.description}</p>
                      <p className="text-[10px] text-slate-500">
                        {c?.name} · {p.date}
                        {p.installmentTotal > 1 ? ` · ${p.installmentIndex}/${p.installmentTotal}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-black tabular-nums">{formatBRL(p.amountCents)}</span>
                      <button
                        type="button"
                        onClick={() => removePurchase(p.id)}
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })
          )}
        </ul>
      </div>
    </div>
  );
};
