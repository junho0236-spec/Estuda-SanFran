import React from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';

type Props = {
  totalQuestionsInDb: number;
  onOpenAiGenerator: () => void;
};

export function QuestionBankEmptyQuestions({ totalQuestionsInDb, onOpenAiGenerator }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
      <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Nenhuma questão encontrada</h3>
      <p className="text-slate-500">
        {totalQuestionsInDb === 0
          ? 'O banco de questões está vazio. Use o Gerador de IA para criar questões!'
          : 'Nenhuma questão corresponde aos filtros selecionados.'}
      </p>
      {totalQuestionsInDb === 0 && (
        <button
          type="button"
          onClick={onOpenAiGenerator}
          className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 mx-auto"
        >
          <Sparkles size={18} />
          Gerar Questões com IA
        </button>
      )}
    </div>
  );
}
