import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, ChevronRight, X } from 'lucide-react';

export type ConfidenceLevel = 'certeza' | 'duvida' | 'chute';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (level: ConfidenceLevel) => void;
};

export function QuestionBankConfidenceModal({ open, onClose, onSelect }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          role="presentation"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qb-confidence-title"
            className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full text-center relative"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Fechar diálogo de nível de confiança"
            >
              <X size={24} aria-hidden />
            </button>
            <div
              className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
              aria-hidden
            >
              <BrainCircuit className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <h3
              id="qb-confidence-title"
              className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2"
            >
              Nível de Confiança
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Como você avalia sua resposta para esta questão?
            </p>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => onSelect('certeza')}
                className="flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                  <div className="text-left">
                    <span className="block font-black text-emerald-900 dark:text-emerald-400 text-sm uppercase tracking-widest">
                      Certeza
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-500 font-bold">
                      Tenho o fundamento jurídico
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onSelect('duvida')}
                className="flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
                  <div className="text-left">
                    <span className="block font-black text-amber-900 dark:text-amber-400 text-sm uppercase tracking-widest">
                      Dúvida
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-500 font-bold">
                      Fiquei entre duas alternativas
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onSelect('chute')}
                className="flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-2xl transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                  <div className="text-left">
                    <span className="block font-black text-red-900 dark:text-red-400 text-sm uppercase tracking-widest">
                      Chute
                    </span>
                    <span className="text-[10px] text-red-700 dark:text-red-500 font-bold">
                      Não conheço o tema
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-red-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
