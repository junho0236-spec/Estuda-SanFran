import React from 'react';
import { Activity, Folder as FolderIcon, X } from 'lucide-react';
import type { Folder, Subject } from '../../types';

export type AnkiDailySummaryModalVariant = 'purple' | 'emerald';

export interface AnkiDailySummaryModalProps {
  open: boolean;
  onClose: () => void;
  dateStr: string | null;
  isLoading: boolean;
  dailySummaryData: any[];
  folders: Folder[];
  subjects: Subject[];
  variant: AnkiDailySummaryModalVariant;
}

export const AnkiDailySummaryModal: React.FC<AnkiDailySummaryModalProps> = ({
  open,
  onClose,
  dateStr,
  isLoading,
  dailySummaryData,
  folders,
  subjects,
  variant,
}) => {
  if (!open) return null;

  const headerClass =
    variant === 'purple'
      ? 'bg-gradient-to-br from-purple-600 to-indigo-700'
      : 'bg-gradient-to-br from-emerald-600 to-teal-700';

  const shellClass =
    variant === 'purple'
      ? 'border-4 border-purple-500/30 rounded-[3.5rem]'
      : 'rounded-[3rem] border-2 border-slate-200 dark:border-white/10';

  const titleDate =
    dateStr != null && dateStr !== ''
      ? new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '—';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div
        className={`bg-white dark:bg-sanfran-rubiDark w-full max-w-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] ${shellClass}`}
      >
        <div className={`p-10 border-b border-slate-100 dark:border-white/5 text-white ${headerClass}`}>
          <div className="flex justify-between items-center mb-4">
            <Activity className="w-10 h-10 text-white/20" />
            <button
              type="button"
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <h3 className="text-3xl font-black tracking-tighter capitalize">{titleDate}</h3>
          <p className="text-emerald-100 font-bold text-sm mt-2 uppercase tracking-widest">
            Resumo Diário de Estudo
          </p>
        </div>

        <div className="p-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                Carregando resumo...
              </p>
            </div>
          ) : dailySummaryData.length === 0 ? (
            <div className="text-center py-12 border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem]">
              <Activity className="w-16 h-16 text-slate-200 dark:text-white/10 mx-auto mb-4" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                Nenhuma atividade registrada para este dia.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 text-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white block mb-1">
                    {dailySummaryData.length}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Cards Revisados
                  </span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 block mb-1">
                    {Math.round(
                      (dailySummaryData.filter((s) => s.rating && s.rating >= 3).length /
                        dailySummaryData.length) *
                        100
                    ) || 0}
                    %
                  </span>
                  <span className="text-[9px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">
                    Acerto (Bom/Fácil)
                  </span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-500/20 text-center">
                  <span className="text-3xl font-black text-blue-600 dark:text-blue-400 block mb-1">
                    {Math.round(
                      dailySummaryData.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 60
                    )}
                    m
                  </span>
                  <span className="text-[9px] font-black text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">
                    Tempo Total
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FolderIcon size={14} /> Atividade por Disciplina
                </h4>
                <div className="space-y-3">
                  {Object.entries(
                    dailySummaryData.reduce<Record<string, number>>((acc, curr) => {
                      const folderId = String(curr.folder_id || curr.subject_id);
                      acc[folderId] = (acc[folderId] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([folderId, count]) => {
                    const folder = folders?.find((f) => f.id === folderId);
                    const subject = subjects?.find((s) => s.id === folderId);
                    const name = folder?.name || subject?.name || 'Geral';
                    const color = folder?.color || 'border-l-slate-500';

                    return (
                      <div
                        key={folderId}
                        className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-l-4 ${color}`}
                      >
                        <span className="font-bold text-slate-700 dark:text-slate-200">{name}</span>
                        <span className="text-xs font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500">
                          {count} cards
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
