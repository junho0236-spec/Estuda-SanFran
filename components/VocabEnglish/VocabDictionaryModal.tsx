import React from 'react';
import { X, Volume2, BookMarked, CheckCircle2, CircleDashed, Circle } from 'lucide-react';
import type { VocabWord } from '../../services/vocabService';
import { playVocabAudio, speakEnglish } from '../../services/vocabService';
import { wordStabilityDays } from '../../services/vocabFsrs';

interface VocabDictionaryModalProps {
  word: VocabWord;
  onClose: () => void;
  onSetStatus: (word: VocabWord, status: VocabWord['status']) => void;
}

const STATUS_LABEL: Record<VocabWord['status'], string> = {
  unknown: 'Desconhecida',
  learning: 'Aprendendo',
  known: 'Conhecida',
};

const STATUS_STYLE: Record<VocabWord['status'], string> = {
  unknown: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  learning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  known: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
};

const VocabDictionaryModal: React.FC<VocabDictionaryModalProps> = ({
  word,
  onClose,
  onSetStatus,
}) => {
  const stability = wordStabilityDays(word);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/10 p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="min-w-0">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight break-words">
              {word.lemma}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {word.phonetic && (
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {word.phonetic}
                </span>
              )}
              {word.pos && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                  {word.pos}
                </span>
              )}
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_STYLE[word.status]}`}
              >
                {STATUS_LABEL[word.status]}
              </span>
            </div>
          </div>
          <button
            onClick={() => void playVocabAudio(word.lemma, word.audio_url)}
            className="shrink-0 w-11 h-11 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-600/30 transition-all active:scale-95"
            aria-label="Ouvir pronúncia"
            title="Ouvir pronúncia"
          >
            <Volume2 size={20} />
          </button>
        </div>

        {word.translation_pt && (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
              Tradução
            </p>
            <p className="text-sm md:text-base font-medium text-emerald-900 dark:text-emerald-100">
              {word.translation_pt}
            </p>
          </div>
        )}

        {word.meanings.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <BookMarked size={12} /> Definições
            </p>
            {word.meanings.map((m, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
              >
                {m.pos && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">
                    {m.pos}
                  </span>
                )}
                <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">{m.definition}</p>
                {m.example && (
                  <button
                    onClick={() => speakEnglish(m.example!)}
                    className="mt-1.5 text-xs italic text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors text-left"
                    title="Ouvir exemplo"
                  >
                    “{m.example}”
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
            Progresso FSRS
          </p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
              <p className="text-xl font-black text-slate-800 dark:text-white">
                {stability.toFixed(1)}d
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Estabilidade
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
              <p className="text-xl font-black text-slate-800 dark:text-white">
                {word.correct_streak}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Acertos seguidos
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onSetStatus(word, 'unknown')}
            disabled={word.status === 'unknown'}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 disabled:opacity-40 hover:brightness-105 transition-all active:scale-95"
          >
            <Circle size={14} /> Desconhecida
          </button>
          <button
            onClick={() => onSetStatus(word, 'learning')}
            disabled={word.status === 'learning'}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 disabled:opacity-40 hover:brightness-105 transition-all active:scale-95"
          >
            <CircleDashed size={14} /> Aprendendo
          </button>
          <button
            onClick={() => onSetStatus(word, 'known')}
            disabled={word.status === 'known'}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 disabled:opacity-40 hover:brightness-105 transition-all active:scale-95"
          >
            <CheckCircle2 size={14} /> Conhecida
          </button>
        </div>
      </div>
    </div>
  );
};

export default VocabDictionaryModal;
