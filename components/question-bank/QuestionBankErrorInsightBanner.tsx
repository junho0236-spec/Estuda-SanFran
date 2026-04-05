import React from 'react';
import { AlertTriangle, BrainCircuit, Sparkles, Sword } from 'lucide-react';

type Props = {
  wrongCount: number;
  selectedSubjects: string[];
  onStartErrorRetrain: () => void;
  onGenerateAiLesson: (subjectLabel: string) => void;
};

export function QuestionBankErrorInsightBanner({
  wrongCount,
  selectedSubjects,
  onStartErrorRetrain,
  onGenerateAiLesson,
}: Props) {
  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-[2rem] text-white shadow-xl shadow-red-900/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <BrainCircuit size={120} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight">Insight de Desempenho Inteligente</h3>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-bold leading-relaxed max-w-2xl">
            Você tem <span className="text-2xl px-2">{wrongCount}</span> erros recorrentes.
            {selectedSubjects.length === 1 ? (
              <>
                {' '}
                A disciplina de{' '}
                <span className="underline decoration-2 underline-offset-4">{selectedSubjects[0]}</span> é onde você
                mais precisa de reforço.
              </>
            ) : selectedSubjects.length > 1 ? (
              <>
                {' '}
                Foco nas disciplinas:{' '}
                <span className="underline decoration-2 underline-offset-4">
                  {selectedSubjects.slice(0, 3).join(', ')}
                  {selectedSubjects.length > 3 ? ` e mais ${selectedSubjects.length - 3}` : ''}
                </span>
                .
              </>
            ) : (
              <> Analisamos seu histórico e identificamos lacunas importantes em temas fundamentais.</>
            )}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onStartErrorRetrain}
              className="px-6 py-3 bg-white text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2 shadow-lg"
            >
              <Sword size={16} /> Vencer Meus Erros
            </button>
            {selectedSubjects.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onGenerateAiLesson(
                    selectedSubjects.length === 1
                      ? selectedSubjects[0]
                      : selectedSubjects.join('; ')
                  )
                }
                className="px-6 py-3 bg-red-900/20 hover:bg-red-900/30 text-white border border-white/30 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 backdrop-blur-sm"
              >
                <Sparkles size={16} /> Aula Resumida IA
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
