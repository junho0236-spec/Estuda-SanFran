import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, Cloud, CloudOff, Loader2 } from 'lucide-react';
import type { MdoPersisted, MdoTabId } from './types';
import { currentYm, shiftYm, ymLabel } from './mdoFormat';
import {
  emptyPersisted,
  emptyMeta,
  metaStorageKey,
  migrateMdoPersisted,
  parseMdoFromStorage,
  parseMdoMeta,
  storageKey,
} from './persist';
import { fetchMdoCloudRow, resolveMdoMerge, upsertMdoCloud } from './mdoCloudSync';
import { MdoTabBar } from './MdoTabBar';
import { MdoDashboardTab } from './MdoDashboardTab';
import { MdoCashflowTab } from './MdoCashflowTab';
import { MdoDebtsTab } from './MdoDebtsTab';
import { MdoInvestmentsTab } from './MdoInvestmentsTab';
import { MdoLimitsTab } from './MdoLimitsTab';
import { MdoCalendarTab } from './MdoCalendarTab';
import { MdoCreditCardsTab } from './MdoCreditCardsTab';

const CLOUD_SAVE_DEBOUNCE_MS = 1200;

export interface MeuDinheiroOrganizadoShellProps {
  userId: string;
}

type SyncStatus = 'loading' | 'syncing' | 'synced' | 'error';

const MeuDinheiroOrganizadoShell: React.FC<MeuDinheiroOrganizadoShellProps> = ({ userId }) => {
  const [ym, setYm] = useState(currentYm);
  const [activeTab, setActiveTab] = useState<MdoTabId>('panorama');
  const [data, setData] = useState<MdoPersisted>(() => emptyPersisted());
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');

  const dataRef = useRef<MdoPersisted>(emptyPersisted());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const applyChosenToStorage = useCallback(
    (chosen: MdoPersisted, nextMeta: { lastLocalEditAt: string }) => {
      const sk = storageKey(userId);
      const mk = metaStorageKey(userId);
      try {
        localStorage.setItem(sk, JSON.stringify(chosen));
        localStorage.setItem(mk, JSON.stringify(nextMeta));
      } catch {
        toast.error('Não foi possível guardar os dados neste dispositivo.');
      }
    },
    [userId]
  );

  const flushCloudUpsert = useCallback(
    async (payload: MdoPersisted) => {
      const serverTs = await upsertMdoCloud(userId, payload);
      if (serverTs) {
        try {
          localStorage.setItem(metaStorageKey(userId), JSON.stringify({ lastLocalEditAt: serverTs }));
        } catch {
          /* ignore */
        }
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    },
    [userId]
  );

  const scheduleCloudUpsert = useCallback(
    (payload: MdoPersisted) => {
      setSyncStatus('syncing');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void flushCloudUpsert(payload);
      }, CLOUD_SAVE_DEBOUNCE_MS);
    },
    [flushCloudUpsert]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const refetchAndMerge = useCallback(async () => {
    const sk = storageKey(userId);
    const mk = metaStorageKey(userId);
    let local: MdoPersisted;
    let meta = emptyMeta();
    try {
      local = parseMdoFromStorage(localStorage.getItem(sk));
      meta = parseMdoMeta(localStorage.getItem(mk));
    } catch {
      local = emptyPersisted();
    }

    const remote = await fetchMdoCloudRow(userId);
    const { chosen, nextMeta, pushLocalToCloud } = resolveMdoMerge(local, meta, remote);
    const prev = dataRef.current;
    const changed = JSON.stringify(chosen) !== JSON.stringify(prev);

    if (changed) {
      setData(chosen);
      dataRef.current = chosen;
      applyChosenToStorage(chosen, nextMeta);
      toast.info('Dados do MDO atualizados (outro dispositivo).');
    }

    if (pushLocalToCloud) {
      const remotePayload = remote ? migrateMdoPersisted(remote.payload) : null;
      const sameAsRemote =
        remotePayload != null && JSON.stringify(chosen) === JSON.stringify(remotePayload);
      if (!sameAsRemote) {
        scheduleCloudUpsert(changed ? chosen : dataRef.current);
      }
    }
  }, [userId, applyChosenToStorage, scheduleCloudUpsert]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setSyncStatus('loading');
      const sk = storageKey(userId);
      const mk = metaStorageKey(userId);
      let local: MdoPersisted;
      let meta = emptyMeta();
      try {
        local = parseMdoFromStorage(localStorage.getItem(sk));
        meta = parseMdoMeta(localStorage.getItem(mk));
      } catch {
        local = emptyPersisted();
      }

      const remote = await fetchMdoCloudRow(userId);
      if (cancelled) return;

      const { chosen, nextMeta, pushLocalToCloud } = resolveMdoMerge(local, meta, remote);
      setData(chosen);
      dataRef.current = chosen;
      applyChosenToStorage(chosen, nextMeta);

      if (pushLocalToCloud) {
        setSyncStatus('syncing');
        const serverTs = await upsertMdoCloud(userId, chosen);
        if (cancelled) return;
        if (serverTs) {
          try {
            localStorage.setItem(mk, JSON.stringify({ lastLocalEditAt: serverTs }));
          } catch {
            /* ignore */
          }
          setSyncStatus('synced');
        } else {
          setSyncStatus('error');
        }
      } else {
        setSyncStatus('synced');
      }

      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, applyChosenToStorage]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refetchAndMerge();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refetchAndMerge]);

  const persist = useCallback(
    (next: MdoPersisted) => {
      setData(next);
      dataRef.current = next;
      const meta = { lastLocalEditAt: new Date().toISOString() };
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
        localStorage.setItem(metaStorageKey(userId), JSON.stringify(meta));
      } catch {
        toast.error('Não foi possível guardar os dados neste dispositivo.');
      }
      scheduleCloudUpsert(next);
    },
    [userId, scheduleCloudUpsert]
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
        <Loader2 className="h-8 w-8 animate-spin text-sanfran-rubi opacity-80" aria-hidden />
        <span>A sincronizar com a conta…</span>
      </div>
    );
  }

  const syncLabel =
    syncStatus === 'error'
      ? 'Erro ao sincronizar'
      : syncStatus === 'syncing'
        ? 'A guardar na nuvem…'
        : 'Sincronizado com a conta';

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
              <span className="font-semibold text-slate-800 dark:text-slate-200">MDO</span>. Os dados sincronizam com a
              tua conta (Supabase) e ficam em cópia local neste browser.
            </p>
            <div
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
              role="status"
              aria-live="polite"
            >
              {syncStatus === 'error' ? (
                <CloudOff className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden />
              ) : syncStatus === 'syncing' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sanfran-rubi shrink-0" aria-hidden />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden />
              )}
              {syncLabel}
            </div>
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
        <strong className="font-black uppercase tracking-wide">Aviso:</strong> ferramenta de organização; não substitui
        aconselhamento financeiro profissional.
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
