import React from 'react';
import { Clock } from 'lucide-react';
import { formatMockCountdown } from './formatMockCountdown';

type Props = {
  mockTimeRemaining: number;
  answeredCount: number;
  totalQuestions: number;
  onFinishClick: () => void;
};

export function QuestionBankMockHud({
  mockTimeRemaining,
  answeredCount,
  totalQuestions,
  onFinishClick,
}: Props) {
  return (
    <>
      <div
        className={`fixed top-6 right-6 z-[110] flex items-center gap-4 p-4 rounded-3xl border-2 shadow-2xl backdrop-blur-md transition-all duration-500 ${
          mockTimeRemaining < 600
            ? 'bg-red-50/90 border-red-500 animate-pulse'
            : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Restante</span>
          <span
            className={`text-2xl font-black tabular-nums ${
              mockTimeRemaining < 600 ? 'text-red-600' : 'text-slate-900 dark:text-white'
            }`}
          >
            {formatMockCountdown(mockTimeRemaining)}
          </span>
        </div>
        <div
          className={`p-3 rounded-2xl ${
            mockTimeRemaining < 600
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <Clock size={24} />
        </div>
        <button
          type="button"
          onClick={onFinishClick}
          className="ml-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
        >
          Finalizar
        </button>
      </div>

      <div className="fixed top-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-800 z-[110]">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{
            width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
          }}
        />
      </div>
    </>
  );
}
