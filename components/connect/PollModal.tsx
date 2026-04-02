import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, X } from 'lucide-react';

interface PollModalProps {
  show: boolean;
  pollQuestion: string;
  setPollQuestion: (value: string) => void;
  pollOptions: string[];
  setPollOptions: (options: string[]) => void;
  createPoll: () => void;
  onClose: () => void;
}

const PollModal: React.FC<PollModalProps> = ({
  show,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  createPoll,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="poll-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/5"
          >
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Criar Enquete</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Votacao em grupo</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pergunta</label>
                <input
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ex: Qual horario para reuniao?"
                  className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-bold"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Opcoes</label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 text-[10px] font-black flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                      {idx + 1}
                    </div>
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[idx] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Opcao ${idx + 1}`}
                      className="flex-1 p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl outline-none focus:border-blue-500 transition-all text-sm"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 5 && (
                  <button
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all text-xs font-bold uppercase tracking-widest"
                  >
                    + Adicionar Opcao
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={createPoll}
                disabled={!pollQuestion || pollOptions.some((o) => !o)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transition-all active:scale-95"
              >
                Criar Enquete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PollModal;
