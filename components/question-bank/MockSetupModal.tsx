import React from 'react';
import { Timer, X, AlertTriangle } from 'lucide-react';

export interface MockSetupModalProps {
  open: boolean;
  onClose: () => void;
  filteredQuestionCount: number;
  mockDurationMinutes: number;
  setMockDurationMinutes: (n: number) => void;
  onStart: () => void;
}

export const MockSetupModal: React.FC<MockSetupModalProps> = ({
  open,
  onClose,
  filteredQuestionCount,
  mockDurationMinutes,
  setMockDurationMinutes,
  onStart,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qb-mock-setup-title"
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg animate-in zoom-in-95 duration-300"
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl" aria-hidden>
              <Timer className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
            <h2 id="qb-mock-setup-title" className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configurar Simulado</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
            aria-label="Fechar configuração do simulado"
          >
            <X size={24} aria-hidden />
          </button>
        </div>

        <div className="space-y-8">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Questões Disponíveis</span>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black">
                {filteredQuestionCount}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              O simulado usará as questões baseadas nos seus filtros atuais. Aplique filtros de matéria ou banca antes de começar se desejar um tema
              específico.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Duração do Simulado (Minutos)</label>
            <div className="grid grid-cols-4 gap-3">
              {[30, 60, 120, 240].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setMockDurationMinutes(mins)}
                  className={`py-3 rounded-2xl font-black text-sm transition-all border-2 ${
                    mockDurationMinutes === mins
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-500'
                  }`}
                >
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={mockDurationMinutes}
                onChange={e => setMockDurationMinutes(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <span className="text-lg font-black text-slate-900 dark:text-white w-16 text-right">{mockDurationMinutes}m</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <AlertTriangle className="text-amber-500 shrink-0" size={20} />
            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 leading-relaxed uppercase tracking-wider">
              No modo simulado, o gabarito e as explicações só serão revelados após a finalização. O cronômetro não pode ser pausado.
            </p>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black text-sm uppercase tracking-[0.3em] transition-all shadow-xl shadow-emerald-900/30 active:scale-[0.98]"
          >
            Começar Prova Real
          </button>
        </div>
      </div>
    </div>
  );
};
