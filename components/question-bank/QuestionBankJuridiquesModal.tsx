import React from 'react';
import { Loader2, MessageSquareText, X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  selectedText: string;
  loading: boolean;
  explanation: string;
};

export function QuestionBankJuridiquesModal({
  open,
  onClose,
  selectedText,
  loading,
  explanation,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qb-juridiques-title"
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2
            id="qb-juridiques-title"
            className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"
          >
            <MessageSquareText className="text-blue-500" aria-hidden />
            Tradutor de Juridiquês
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Fechar tradutor"
          >
            <X size={24} aria-hidden />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Trecho Selecionado</h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 italic">
              {'"'}{selectedText}{'"'}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-2">Explicação Simples</h3>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-sm text-slate-500">A IA está simplificando o texto para você...</p>
              </div>
            ) : (
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {explanation}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
