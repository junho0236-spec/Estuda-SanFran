import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BrainCircuit, Sparkles, X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  content: string | null;
  subjectLine: string;
};

export function QuestionBankAiLessonModal({ open, onClose, loading, content, subjectLine }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[130] flex items-center justify-center p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qb-ai-lesson-title"
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl" aria-hidden>
              <Sparkles className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <h2
                id="qb-ai-lesson-title"
                className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter"
              >
                Aula Resumida IA
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{subjectLine}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
            aria-label="Fechar aula resumida"
          >
            <X size={24} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-8">
                <div className="w-20 h-20 border-4 border-purple-100 dark:border-purple-900/30 rounded-full animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BrainCircuit className="text-purple-500 animate-bounce" size={32} />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
                Preparando sua Aula...
              </h3>
              <p className="text-slate-500 text-center max-w-xs font-medium">
                Nossa IA está analisando seus erros e preparando um resumo focado para você vencer esse tema.
              </p>
            </div>
          ) : (
            <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-p:font-medium prose-p:leading-relaxed prose-strong:text-purple-600 dark:prose-strong:text-purple-400">
              <Markdown remarkPlugins={[remarkGfm]}>{content || ''}</Markdown>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
          >
            Entendido, Vamos Praticar!
          </button>
        </div>
      </div>
    </div>
  );
}
