import React from 'react';
import { Target, ListFilter, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Question } from '../../types';

export type QuestionBankMockSessionPanelProps = {
  mockQuestions: Question[];
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  currentQuestion: Question | null;
  mockAnswers: Record<string, number>;
  mockNavUnansweredOnly: boolean;
  setMockNavUnansweredOnly: React.Dispatch<React.SetStateAction<boolean>>;
  mockMarkReviewLater: Record<string, boolean>;
  getNextUnansweredMockIndex: (idx: number) => number;
  getPrevUnansweredMockIndex: (idx: number) => number;
  onPrev: () => void;
  onNext: () => void;
};

export function QuestionBankMockSessionPanel({
  mockQuestions,
  currentIndex,
  setCurrentIndex,
  currentQuestion,
  mockAnswers,
  mockNavUnansweredOnly,
  setMockNavUnansweredOnly,
  mockMarkReviewLater,
  getNextUnansweredMockIndex,
  getPrevUnansweredMockIndex,
  onPrev,
  onNext,
}: QuestionBankMockSessionPanelProps) {
  return (
    <div className="max-w-4xl mx-auto pt-24 pb-32 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl shrink-0">
            <Target className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              Simulado em Curso
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Questão {currentIndex + 1} de {mockQuestions.length}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={mockNavUnansweredOnly}
              onChange={(e) => {
                const v = e.target.checked;
                setMockNavUnansweredOnly(v);
                if (v && currentQuestion && mockAnswers[currentQuestion.id] !== undefined) {
                  const next = getNextUnansweredMockIndex(currentIndex);
                  if (next >= 0) setCurrentIndex(next);
                  else {
                    const first = mockQuestions.findIndex((q) => mockAnswers[q.id] === undefined);
                    if (first >= 0) setCurrentIndex(first);
                  }
                }
              }}
            />
            <ListFilter size={16} className="shrink-0 text-slate-400" aria-hidden />
            Só não respondidas
          </label>
          <button
            type="button"
            onClick={onPrev}
            disabled={
              mockNavUnansweredOnly ? getPrevUnansweredMockIndex(currentIndex) < 0 : currentIndex === 0
            }
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
            aria-label="Questão anterior"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={
              mockNavUnansweredOnly
                ? getNextUnansweredMockIndex(currentIndex) < 0
                : currentIndex === mockQuestions.length - 1
            }
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
            aria-label="Próxima questão"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg">
        {mockQuestions.map((q, idx) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            title={mockMarkReviewLater[q.id] ? 'Marcada para revisar depois' : undefined}
            className={`w-10 h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${
              currentIndex === idx
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 ring-blue-400/50'
                : mockMarkReviewLater[q.id]
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 ring-amber-400/60'
                  : mockAnswers[q.id] !== undefined
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-transparent'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 ring-transparent'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
