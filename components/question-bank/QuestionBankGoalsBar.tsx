import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import type { QuestionAnswerGoalsPersisted } from './answerGoals';
import { progressRatio } from './answerGoals';

type Props = {
  goals: QuestionAnswerGoalsPersisted;
  onSaveTargets: (daily: number, weekly: number) => void;
  disabled?: boolean;
};

export const QuestionBankGoalsBar: React.FC<Props> = ({ goals, onSaveTargets, disabled }) => {
  const [dailyInput, setDailyInput] = useState(String(goals.daily_target || ''));
  const [weeklyInput, setWeeklyInput] = useState(String(goals.weekly_target || ''));

  useEffect(() => {
    setDailyInput(goals.daily_target > 0 ? String(goals.daily_target) : '');
    setWeeklyInput(goals.weekly_target > 0 ? String(goals.weekly_target) : '');
  }, [goals.daily_target, goals.weekly_target]);

  const parseTarget = (s: string): number => {
    const n = Number.parseInt(s.replace(/\D/g, ''), 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(5000, n);
  };

  const handleSaveTargets = () => {
    onSaveTargets(parseTarget(dailyInput), parseTarget(weeklyInput));
  };

  const dailyPct = progressRatio(goals.day_count, goals.daily_target);
  const weeklyPct = progressRatio(goals.week_count, goals.weekly_target);

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 rounded-lg bg-blue-600 p-1.5 text-white shadow-sm">
            <Target size={16} aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
              Metas de respostas
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 max-w-xl">
              Cada resposta enviada grava estatísticas por questão (tabela{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">user_question_stats</span>
              ) e incrementa estes contadores: modo estudo ao confirmar a resposta, simulado ao finalizar.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Meta / dia</span>
            <input
              type="number"
              min={0}
              max={500}
              inputMode="numeric"
              placeholder="ex. 20"
              value={dailyInput}
              onChange={(e) => setDailyInput(e.target.value)}
              disabled={disabled}
              className="w-20 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm font-bold text-slate-900 dark:text-white disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Meta / semana</span>
            <input
              type="number"
              min={0}
              max={5000}
              inputMode="numeric"
              placeholder="ex. 100"
              value={weeklyInput}
              onChange={(e) => setWeeklyInput(e.target.value)}
              disabled={disabled}
              className="w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm font-bold text-slate-900 dark:text-white disabled:opacity-50"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveTargets}
            disabled={disabled}
            className="rounded-lg bg-slate-900 dark:bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40"
          >
            Guardar metas
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
            <span>Hoje</span>
            <span>
              {goals.day_count}
              {goals.daily_target > 0 ? ` / ${goals.daily_target}` : ''}
              {goals.daily_target <= 0 && <span className="ml-1 font-normal text-slate-400">(defina a meta)</span>}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            role="progressbar"
            aria-valuenow={goals.daily_target > 0 ? Math.round(dailyPct) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso da meta diária"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                goals.daily_target > 0 && dailyPct >= 100
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: goals.daily_target > 0 ? `${dailyPct}%` : '0%' }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
            <span>Semana (seg–dom)</span>
            <span>
              {goals.week_count}
              {goals.weekly_target > 0 ? ` / ${goals.weekly_target}` : ''}
              {goals.weekly_target <= 0 && <span className="ml-1 font-normal text-slate-400">(defina a meta)</span>}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            role="progressbar"
            aria-valuenow={goals.weekly_target > 0 ? Math.round(weeklyPct) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso da meta semanal"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                goals.weekly_target > 0 && weeklyPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: goals.weekly_target > 0 ? `${weeklyPct}%` : '0%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
