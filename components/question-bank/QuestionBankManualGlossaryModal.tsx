import React from 'react';
import { Book, Loader2, Search, X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  term: string;
  onTermChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
};

export function QuestionBankManualGlossaryModal({
  open,
  onClose,
  term,
  onTermChange,
  onSubmit,
  isLoading,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qb-glossary-title"
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md animate-in zoom-in-95 duration-300"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="qb-glossary-title" className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Book className="text-indigo-500" aria-hidden />
            Dicionário Jurídico
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Fechar dicionário"
          >
            <X size={24} aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Termo ou Expressão</label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                value={term}
                onChange={(e) => onTermChange(e.target.value)}
                className="w-full p-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                placeholder="Ex: Habeas Corpus, Lide, Prescrição..."
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search size={20} />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic">A IA da SanFran definirá o termo juridicamente para você.</p>
        </form>
      </div>
    </div>
  );
}
