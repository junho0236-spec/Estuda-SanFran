import React from 'react';
import { BrainCircuit, Folder as FolderIcon, Loader2, X } from 'lucide-react';
import type { Folder } from '../../types';

type Props = {
  open: boolean;
  onClose: () => void;
  folders: Folder[];
  isSubmitting: boolean;
  onPickFolder: (folderId: string) => void;
};

export function QuestionBankDeckPickerModal({
  open,
  onClose,
  folders,
  isSubmitting,
  onPickFolder,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qb-deck-title"
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md animate-in zoom-in-95 duration-300"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="qb-deck-title" className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BrainCircuit className="text-indigo-500" aria-hidden />
            Escolher Baralho
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Fechar seleção de baralho"
          >
            <X size={24} aria-hidden />
          </button>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {folders.length === 0 ? (
            <p className="text-slate-500 text-center py-4">Nenhum baralho encontrado. Crie um primeiro no Anki.</p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => onPickFolder(folder.id)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderIcon size={20} />}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{folder.name}</p>
                  <p className="text-xs text-slate-500">{isSubmitting ? 'Criando...' : 'Adicionar a este baralho'}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
