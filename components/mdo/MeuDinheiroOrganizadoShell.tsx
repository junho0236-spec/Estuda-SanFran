import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays } from 'lucide-react';
import type { MdoPersisted, MdoTabId } from './types';
import { currentYm, shiftYm, ymLabel } from './mdoFormat';
import { emptyPersisted, parseMdoFromStorage, storageKey } from './persist';
import { MdoTabBar } from './MdoTabBar';
import { MdoDashboardTab } from './MdoDashboardTab';
import { MdoCashflowTab } from './MdoCashflowTab';
import { MdoDebtsTab } from './MdoDebtsTab';
import { MdoInvestmentsTab } from './MdoInvestmentsTab';
import { MdoLimitsTab } from './MdoLimitsTab';
import { MdoCalendarTab } from './MdoCalendarTab';
import { MdoCreditCardsTab } from './MdoCreditCardsTab';

export interface MeuDinheiroOrganizadoShellProps {
  userId: string;
}

const MeuDinheiroOrganizadoShell: React.FC<MeuDinheiroOrganizadoShellProps> = ({ userId }) => {
  const [ym, setYm] = useState(currentYm);
  const [activeTab, setActiveTab] = useState<MdoTabId>('panorama');
  const [data, setData] = useState<MdoPersisted>(() => emptyPersisted());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      setData(parseMdoFromStorage(raw));
    } catch {
      setData(emptyPersisted());
    }
    setHydrated(true);
  }, [userId]);

  const persist = useCallback(
    (next: MdoPersisted) => {
      setData(next);
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
      } catch {
        toast.error('Não foi possível guardar os dados neste dispositivo.');
      }
    },
    [userId]
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-medium">
        A carregar…
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-24 px-4 md:px-6 max-w-6xl mx-auto space-y-6">
      <header className="relative pt-4 md:pt-8">
        <div className="absolute top-0 left-0 w-16 h-1 bg-sanfran-rubi rounded-full" />
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-sanfran-rubi mb-2">
              Finanças pessoais
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
              Meu dinheiro{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sanfran-rubi to-amber-600">
                organizado
              </span>
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl text-sm md:text-base leading-relaxed">
              Panorama, movimentos, dívidas, investimentos, limites, calendário e cartões — inspirado no{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">MDO</span>. Dados apenas neste
              browser (localStorage).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setYm((y) => shiftYm(y, -1))}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              ←
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <CalendarDays className="w-4 h-4 text-sanfran-rubi" />
              <span className="text-sm font-black text-slate-900 dark:text-white capitalize min-w-[10rem] text-center">
                {ymLabel(ym)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setYm((y) => shiftYm(y, 1))}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              →
            </button>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900/40 px-4 py-3 text-xs text-amber-900 dark:text-amber-100/90 leading-relaxed">
        <strong className="font-black uppercase tracking-wide">Aviso:</strong> ferramenta local de organização; não
        substitui aconselhamento financeiro profissional.
      </div>

      <MdoTabBar active={activeTab} onChange={setActiveTab} />

      <div className="min-h-[320px]">
        {activeTab === 'panorama' && <MdoDashboardTab data={data} ym={ym} />}
        {activeTab === 'movimentos' && <MdoCashflowTab data={data} ym={ym} onPersist={persist} />}
        {activeTab === 'dividas' && <MdoDebtsTab data={data} onPersist={persist} />}
        {activeTab === 'investimentos' && <MdoInvestmentsTab data={data} onPersist={persist} />}
        {activeTab === 'limites' && <MdoLimitsTab data={data} ym={ym} onPersist={persist} />}
        {activeTab === 'calendario' && <MdoCalendarTab data={data} ym={ym} onPersist={persist} />}
        {activeTab === 'cartoes' && <MdoCreditCardsTab data={data} ym={ym} onPersist={persist} />}
      </div>
    </div>
  );
};

export default MeuDinheiroOrganizadoShell;
