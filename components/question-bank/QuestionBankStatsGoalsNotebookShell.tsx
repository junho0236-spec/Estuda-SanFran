import React from 'react';
import { Loader2, Plus, X, NotebookText } from 'lucide-react';
import { QuestionBankGoalsBar } from './QuestionBankGoalsBar';
import type { QuestionAnswerGoalsPersisted } from './answerGoals';

export type QuestionBankStatsGoalsNotebookShellProps = {
  isMockMode: boolean;
  correctCount: number;
  wrongCount: number;
  answerGoals: QuestionAnswerGoalsPersisted;
  onSaveAnswerGoals: (daily: number, weekly: number) => void;
  goalsBarDisabled: boolean;
  showNotebookCreationMode: boolean;
  newNotebookName: string;
  setNewNotebookName: React.Dispatch<React.SetStateAction<string>>;
  newNotebookDescription: string;
  setNewNotebookDescription: React.Dispatch<React.SetStateAction<string>>;
  onCreateNotebook: () => void;
  onCancelNotebookCreation: () => void;
  isSubmitting: boolean;
  selectedForNotebookCount: number;
  onOpenNotebookCreation: () => void;
  children: React.ReactNode;
};

export function QuestionBankStatsGoalsNotebookShell({
  isMockMode,
  correctCount,
  wrongCount,
  answerGoals,
  onSaveAnswerGoals,
  goalsBarDisabled,
  showNotebookCreationMode,
  newNotebookName,
  setNewNotebookName,
  newNotebookDescription,
  setNewNotebookDescription,
  onCreateNotebook,
  onCancelNotebookCreation,
  isSubmitting,
  selectedForNotebookCount,
  onOpenNotebookCreation,
  children,
}: QuestionBankStatsGoalsNotebookShellProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 overflow-hidden">
      <div className="p-4 grid grid-cols-3 gap-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-[5px_5px_10px_#d1d9e6,-5px_-5px_10px_#ffffff] dark:shadow-[5px_5px_10px_#000000,-5px_-5px_10px_#2a2a2a]">
          <span className="text-3xl font-black text-slate-900 dark:text-white">{correctCount + wrongCount}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Questões</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-[5px_5px_10px_#d1d9e6,-5px_-5px_10px_#ffffff] dark:shadow-[5px_5px_10px_#000000,-5px_-5px_10px_#2a2a2a]">
          <span className="text-3xl font-black text-green-600 dark:text-green-400">{correctCount}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Acertos</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-[5px_5px_10px_#d1d9e6,-5px_-5px_10px_#ffffff] dark:shadow-[5px_5px_10px_#000000,-5px_-5px_10px_#2a2a2a]">
          <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
            {correctCount + wrongCount > 0 ? ((correctCount / (correctCount + wrongCount)) * 100).toFixed(0) : 0}%
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Aproveit.</span>
        </div>
      </div>
      {!isMockMode && (
        <QuestionBankGoalsBar
          goals={answerGoals}
          onSaveTargets={onSaveAnswerGoals}
          disabled={goalsBarDisabled}
        />
      )}
      {showNotebookCreationMode && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4 bg-orange-50 dark:bg-orange-900/20 animate-in fade-in duration-300">
          <h3 className="text-lg font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2">
            <NotebookText size={20} /> Criar Novo Caderno
          </h3>
          <input
            type="text"
            placeholder="Nome do Caderno (Ex: Reta Final OAB - Ética)"
            value={newNotebookName}
            onChange={(e) => setNewNotebookName(e.target.value)}
            className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="Descrição (Opcional)"
            value={newNotebookDescription}
            onChange={(e) => setNewNotebookDescription(e.target.value)}
            className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCreateNotebook}
              disabled={selectedForNotebookCount === 0 || newNotebookName.trim() === '' || isSubmitting}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />} Criar
            </button>
            <button
              type="button"
              onClick={onCancelNotebookCreation}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors"
            >
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-end bg-white dark:bg-slate-900">
        {selectedForNotebookCount > 0 && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <button
              type="button"
              onClick={onOpenNotebookCreation}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-orange-900/20"
            >
              <NotebookText size={14} /> Adicionar ao Caderno ({selectedForNotebookCount})
            </button>
          </div>
        )}
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}
