import React from 'react';
import type { MdoTabId } from './types';

const TABS: { id: MdoTabId; label: string }[] = [
  { id: 'panorama', label: 'Panorama' },
  { id: 'movimentos', label: 'Movimentos' },
  { id: 'dividas', label: 'Dívidas' },
  { id: 'investimentos', label: 'Investimentos' },
  { id: 'limites', label: 'Limites' },
  { id: 'calendario', label: 'Calendário' },
  { id: 'cartoes', label: 'Cartões' },
];

export interface MdoTabBarProps {
  active: MdoTabId;
  onChange: (id: MdoTabId) => void;
}

export const MdoTabBar: React.FC<MdoTabBarProps> = ({ active, onChange }) => (
  <div
    className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin"
    role="tablist"
    aria-label="Secções MDO"
  >
    {TABS.map((t) => (
      <button
        key={t.id}
        type="button"
        role="tab"
        aria-selected={active === t.id}
        onClick={() => onChange(t.id)}
        className={`shrink-0 px-3 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors border ${
          active === t.id
            ? 'bg-sanfran-rubi text-white border-sanfran-rubi shadow-md shadow-sanfran-rubi/20'
            : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-sanfran-rubi/50'
        }`}
      >
        {t.label}
      </button>
    ))}
  </div>
);
