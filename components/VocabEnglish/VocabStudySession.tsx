import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Volume2, Eye, CheckCircle2, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import type { VocabSentence, VocabWord } from '../../services/vocabService';
import { speakEnglish } from '../../services/vocabService';
import { reviewVocabSentence } from '../../services/vocabFsrs';
import type { ReviewQuality } from '../../services/spacedFsrs';

interface VocabStudySessionProps {
  userId: string;
  isOnline: boolean;
  sentences: VocabSentence[];
  wordsById: Map<string, VocabWord>;
  onFinish: () => void;
}

const GRADE_BUTTONS: { quality: ReviewQuality; label: string; className: string }[] = [
  {
    quality: 'again',
    label: 'Errei',
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-500/30',
  },
  {
    quality: 'hard',
    label: 'Difícil',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30',
  },
  {
    quality: 'good',
    label: 'Bom',
    className:
      'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-500/30',
  },
  {
    quality: 'easy',
    label: 'Fácil',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30',
  },
];

/** Renderiza a frase destacando a palavra alvo (qualquer flexão simples). */
function SentenceWithHighlight({ text, lemma }: { text: string; lemma: string }) {
  const parts = useMemo(() => {
    if (!lemma) return [text];
    const escaped = lemma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(\\b${escaped}\\w*)`, 'gi');
    return text.split(re);
  }, [text, lemma]);
  return (
    <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed text-center">
      {parts.map((p, i) =>
        p.toLowerCase().startsWith(lemma) ? (
          <mark
            key={i}
            className="bg-sky-200/70 dark:bg-sky-500/40 text-sky-900 dark:text-sky-100 rounded px-1"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  );
}

const VocabStudySession: React.FC<VocabStudySessionProps> = ({
  userId,
  isOnline,
  sentences,
  wordsById,
  onFinish,
}) => {
  const [queue, setQueue] = useState<VocabSentence[]>(sentences);
  const [total] = useState(sentences.length);
  const [revealed, setRevealed] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(false);
  const [promotions, setPromotions] = useState<string[]>([]);

  const current = queue[0] ?? null;
  const currentWord = current ? wordsById.get(current.word_id) : undefined;
  const completed = total - queue.length;

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    if (done) {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
    }
  }, [done]);

  const grade = useCallback(
    async (quality: ReviewQuality) => {
      if (!current || reviewing) return;
      setReviewing(true);
      try {
        const result = await reviewVocabSentence(userId, isOnline, current, quality);
        if (result.promoted && result.word) {
          setPromotions((prev) => [...prev, result.word!.lemma]);
          toast.success(`"${result.word.lemma}" promovida para Conhecida!`);
        }
        if (result.demoted && result.word) {
          toast.info(`"${result.word.lemma}" voltou para Aprendendo.`);
        }
        setQueue((prev) => {
          const rest = prev.slice(1);
          // 'again' re-entra no fim da fila para reforço na mesma sessão
          if (quality === 'again') rest.push(result.sentence);
          return rest;
        });
        setRevealed(false);
      } catch (e) {
        console.error('[vocab] erro ao registrar revisão', e);
        toast.error('Não foi possível salvar a revisão.');
      } finally {
        setReviewing(false);
      }
    },
    [current, reviewing, userId, isOnline]
  );

  useEffect(() => {
    if (queue.length === 0 && !done) setDone(true);
  }, [queue, done]);

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Sessão concluída!
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
          {total} {total === 1 ? 'frase revisada' : 'frases revisadas'}
          {promotions.length > 0 &&
            ` · ${promotions.length} ${promotions.length === 1 ? 'palavra promovida' : 'palavras promovidas'}`}
        </p>
        {promotions.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[...new Set(promotions)].map((lemma) => (
              <span
                key={lemma}
                className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-widest"
              >
                {lemma}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={onFinish}
          className="mt-8 px-8 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-600/30 transition-all active:scale-95"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 mr-4">
          <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all duration-500"
              style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {completed}/{total} revisadas
          </p>
        </div>
        <button
          onClick={onFinish}
          className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
          aria-label="Sair da sessão"
        >
          <X size={18} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + String(queue.length)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-xl p-8 md:p-10"
        >
          <div className="flex justify-center mb-6">
            <button
              onClick={() => speakEnglish(current.text_en)}
              className="w-12 h-12 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-600/30 transition-all active:scale-95"
              aria-label="Ouvir frase"
              title="Ouvir frase"
            >
              <Volume2 size={22} />
            </button>
          </div>

          <SentenceWithHighlight text={current.text_en} lemma={currentWord?.lemma ?? ''} />

          {revealed ? (
            <div className="mt-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-center animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-sm md:text-base font-medium text-emerald-900 dark:text-emerald-100">
                {current.translation_pt || '—'}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="mt-6 mx-auto flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
            >
              <Eye size={15} /> Revelar tradução
            </button>
          )}

          {currentWord && (
            <p className="mt-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              palavra alvo: <span className="text-sky-600 dark:text-sky-400">{currentWord.lemma}</span>
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 grid grid-cols-4 gap-2 md:gap-3">
        {GRADE_BUTTONS.map((b) => (
          <button
            key={b.quality}
            onClick={() => void grade(b.quality)}
            disabled={reviewing}
            className={`py-3.5 md:py-4 rounded-2xl font-black text-[11px] md:text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${b.className}`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <RotateCcw size={11} /> "Errei" repete a frase no fim da sessão
      </p>
    </div>
  );
};

export default VocabStudySession;
