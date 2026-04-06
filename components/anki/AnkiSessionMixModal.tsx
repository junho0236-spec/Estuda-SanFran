import React from 'react';
import { Activity, X, CheckCircle2, Circle, Folder as FolderIcon } from 'lucide-react';
import type { Folder } from '../../types';
import { FOLDER_ICONS } from './constants';

export interface FolderStudyStats {
  totalCount: number;
  reviewCount: number;
}

export interface AnkiSessionMixModalProps {
  open: boolean;
  onClose: () => void;
  folders: Folder[];
  selectedFolderIdsForSession: Set<string>;
  onToggleFolder: (folderId: string, selected: boolean) => void;
  onToggleSelectAllRootFolders: () => void;
  getFolderStats: (folderId: string) => FolderStudyStats;
  onStartMix: () => void;
  onClearSelection: () => void;
}

export const AnkiSessionMixModal: React.FC<AnkiSessionMixModalProps> = ({
  open,
  onClose,
  folders,
  selectedFolderIdsForSession,
  onToggleFolder,
  onToggleSelectAllRootFolders,
  getFolderStats,
  onStartMix,
  onClearSelection,
}) => {
  if (!open) return null;

  const rootFolders = (folders || []).filter((f) => !f.parentId);
  const allSelected = selectedFolderIdsForSession.size === rootFolders.length && rootFolders.length > 0;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3.5rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-12 border-b border-slate-100 dark:border-white/5 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl -ml-24 -mb-24" />

          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-3 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <h3 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">
              Sessão de Revisão Mix
            </h3>
            <p className="text-indigo-100 font-bold text-lg">Selecione os baralhos para o seu treino diário.</p>
          </div>
        </div>

        <div className="p-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Seus Baralhos</span>
              <div className="h-px w-12 bg-slate-100 dark:bg-white/5" />
            </div>
            <button
              type="button"
              onClick={onToggleSelectAllRootFolders}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {rootFolders.map((folder) => {
              const isSelected = selectedFolderIdsForSession.has(folder.id);
              const stats = getFolderStats(folder.id);
              return (
                <div
                  key={folder.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleFolder(folder.id, isSelected)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleFolder(folder.id, isSelected);
                    }
                  }}
                  className={`group p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all relative overflow-hidden ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-4 ring-indigo-500/10'
                      : 'border-slate-100 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-800 bg-slate-50/50 dark:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div
                      className={`p-3 rounded-2xl transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 group-hover:text-indigo-500'}`}
                    >
                      {(() => {
                        const IconComp = FOLDER_ICONS.find((i) => i.value === folder.icon)?.icon || FolderIcon;
                        return <IconComp size={20} />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-black uppercase text-[11px] tracking-tight truncate ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        {folder.name}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span
                          className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-200/50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}
                        >
                          {stats.totalCount} CARDS
                        </span>
                        {stats.reviewCount > 0 && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 rounded animate-pulse">
                            {stats.reviewCount} PENDENTES
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`transition-all ${isSelected ? 'scale-110' : 'scale-100 opacity-20'}`}>
                      {isSelected ? (
                        <CheckCircle2 className="text-indigo-600 w-6 h-6" />
                      ) : (
                        <Circle className="text-slate-400 w-6 h-6" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-10 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex items-center gap-6">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Total Selecionado
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {Array.from(selectedFolderIdsForSession).reduce(
                (acc, id) => acc + getFolderStats(id).reviewCount,
                0
              )}{' '}
              <span className="text-xs text-slate-400 uppercase">Cards Pendentes</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                onClearSelection();
                onClose();
              }}
              className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest border-2 border-slate-200 dark:border-white/10 hover:bg-slate-50 transition-all"
            >
              Sair
            </button>
            <button
              type="button"
              disabled={selectedFolderIdsForSession.size === 0}
              onClick={() => {
                onStartMix();
                onClose();
              }}
              className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              Iniciar Mix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
