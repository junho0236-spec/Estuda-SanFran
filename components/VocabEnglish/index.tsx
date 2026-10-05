import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenText,
  Plus,
  Search,
  Volume2,
  Trash2,
  GraduationCap,
  Loader2,
  Sparkles,
  CloudOff,
  CloudUpload,
  ChevronDown,
  ChevronUp,
  Filter,
  Play,
  RefreshCw,
  Download,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import type { VocabSentence, VocabWord, VocabWordStatus } from '../../services/vocabService';
import {
  addVocabWord,
  deleteVocabSentence,
  deleteVocabWord,
  flushVocabSyncQueue,
  getVocabPendingSyncCount,
  isVocabCloudUnavailable,
  listSentencesForWord,
  listVocabSentences,
  listVocabWords,
  playVocabAudio,
  saveVocabWord,
  suggestEnglishWords,
  localTodayISO,
} from '../../services/vocabService';
import { parseFsrsSnapshot } from '../../services/spacedFsrs';
import {
  generateSentencesForWord,
  getUseSeed,
  setUseSeed,
} from '../../services/vocabSentenceGenerator';
import VocabDictionaryModal from './VocabDictionaryModal';
import VocabStudySession from './VocabStudySession';

interface VocabEnglishProps {
  userId: string;
  isOnline: boolean;
}

const STATUS_LABEL: Record<VocabWordStatus, string> = {
  unknown: 'Desconhecida',
  learning: 'Aprendendo',
  known: 'Conhecida',
};

const STATUS_STYLE: Record<VocabWordStatus, string> = {
  unknown: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  learning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  known: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
};

const DAILY_LIMIT_STORAGE_KEY = 'sanfran_vocab_daily_limit';
const WEEK_DAYS = 7;

function parseDailyLimit(): 20 | 40 | 60 {
  try {
    const raw = Number(localStorage.getItem(DAILY_LIMIT_STORAGE_KEY) ?? '40');
    return raw === 20 || raw === 60 ? raw : 40;
  } catch {
    return 40;
  }
}

function classifyApiError(error: unknown): string {
  const msg = String((error as { message?: string } | null)?.message ?? '').toLowerCase();
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate')) {
    return 'Limite da API atingido. Tente novamente em alguns minutos.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline')) {
    return 'Sem conexão no momento. Verifique sua internet e tente novamente.';
  }
  return 'Serviço indisponível no momento. Tente novamente mais tarde.';
}

function dayDiff(todayISO: string, dateISO: string | null): number {
  if (!dateISO) return 0;
  const today = new Date(todayISO + 'T00:00:00').getTime();
  const due = new Date(dateISO + 'T00:00:00').getTime();
  return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}

function prioritizeDue(sentences: VocabSentence[], limit: number): VocabSentence[] {
  const today = localTodayISO();
  const scored = [...sentences].sort((a, b) => {
    const aSnap = parseFsrsSnapshot(a.fsrs_snapshot);
    const bSnap = parseFsrsSnapshot(b.fsrs_snapshot);
    const aScore =
      (aSnap?.lapses ?? 0) * 5 + (aSnap?.difficulty ?? 5) * 2 + Math.max(0, dayDiff(today, a.next_review));
    const bScore =
      (bSnap?.lapses ?? 0) * 5 + (bSnap?.difficulty ?? 5) * 2 + Math.max(0, dayDiff(today, b.next_review));
    return bScore - aScore;
  });
  return scored.slice(0, limit);
}

const VocabEnglish: React.FC<VocabEnglishProps> = ({ userId, isOnline }) => {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [sentences, setSentences] = useState<VocabSentence[]>([]);
  const [dueAll, setDueAll] = useState<VocabSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloudUnavailable, setCloudUnavailable] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const [filter, setFilter] = useState<'all' | VocabWordStatus | 'due'>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dictWord, setDictWord] = useState<VocabWord | null>(null);
  const [studying, setStudying] = useState(false);
  const [useSeed, setUseSeedState] = useState(getUseSeed());
  const [dailyLimit, setDailyLimit] = useState<20 | 40 | 60>(parseDailyLimit);

  const inputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordsById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  const getDueSentences = useCallback((rows: VocabSentence[]) => {
    const today = localTodayISO();
    return rows
      .filter((s) => s.next_review == null || s.next_review <= today)
      .sort((a, b) => String(a.next_review ?? '').localeCompare(String(b.next_review ?? '')));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [w, s] = await Promise.all([
        listVocabWords(userId, isOnline),
        listVocabSentences(userId, isOnline),
      ]);
      setWords(w);
      setSentences(s);
      setDueAll(getDueSentences(s));
      setCloudUnavailable(isVocabCloudUnavailable());
      setPendingSync(await getVocabPendingSyncCount());
    } catch (e) {
      console.error('[vocab] erro ao carregar dados', e);
      toast.error('Não foi possível carregar o Vocab English.');
    } finally {
      setLoading(false);
    }
  }, [userId, isOnline, getDueSentences]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Autocomplete (Datamuse) com debounce
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (input.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      setSuggestions(await suggestEnglishWords(input));
    }, 250);
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [input]);

  const handleAdd = useCallback(
    async (lemmaRaw?: string) => {
      const lemma = (lemmaRaw ?? input).trim().toLowerCase();
      if (!lemma || adding) return;
      setAdding(true);
      setSuggestions([]);
      try {
        const word = await addVocabWord(userId, lemma, isOnline);
        setInput('');
        await refresh();
        toast.success(`"${lemma}" adicionada${word.meanings.length ? ' com definições' : ''}.`);

        // gera frases i+1 automaticamente
        setGeneratingFor(word.id);
        try {
          const created = await generateSentencesForWord(userId, word, [word, ...words], isOnline);
          if (created.length > 0) {
            toast.success(`${created.length} frases i+1 geradas.`);
          } else {
            toast.info('Nenhuma frase validada — tente gerar de novo mais tarde.');
          }
        } catch (e) {
          console.warn('[vocab] geração de frases falhou', e);
          toast.error(classifyApiError(e));
        } finally {
          setGeneratingFor(null);
        }
        await refresh();
      } catch (e) {
        console.error('[vocab] erro ao adicionar palavra', e);
        toast.error(classifyApiError(e));
      } finally {
        setAdding(false);
      }
    },
    [input, adding, userId, isOnline, words, refresh]
  );

  const handleRegenerate = useCallback(
    async (word: VocabWord) => {
      if (generatingFor) return;
      setGeneratingFor(word.id);
      try {
        const created = await generateSentencesForWord(userId, word, words, isOnline);
        if (created.length > 0) {
          toast.success(`${created.length} novas frases i+1 geradas.`);
        } else {
          toast.info('Nenhuma frase nova passou na validação i+1.');
        }
        await refresh();
      } catch (e) {
        console.warn('[vocab] geração de frases falhou', e);
        toast.error(classifyApiError(e));
      } finally {
        setGeneratingFor(null);
      }
    },
    [generatingFor, userId, words, isOnline, refresh]
  );

  const handleDelete = useCallback(
    async (word: VocabWord) => {
      await deleteVocabWord(word.id, isOnline);
      await refresh();
      toast.success(`"${word.lemma}" removida.`);
    },
    [isOnline, refresh]
  );

  const handleSetStatus = useCallback(
    async (word: VocabWord, status: VocabWordStatus) => {
      const updated = { ...word, status, updated_at: new Date().toISOString() };
      await saveVocabWord(updated, isOnline);
      setDictWord(updated);
      await refresh();
    },
    [isOnline, refresh]
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const sentenceCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sentences) m.set(s.word_id, (m.get(s.word_id) ?? 0) + 1);
    return m;
  }, [sentences]);

  const dueWordIds = useMemo(() => new Set(dueAll.map((s) => s.word_id)), [dueAll]);
  const dueQueue = useMemo(() => prioritizeDue(dueAll, dailyLimit), [dueAll, dailyLimit]);

  const metrics = useMemo(() => {
    const today = localTodayISO();
    const reviewed = sentences.filter((s) => !!parseFsrsSnapshot(s.fsrs_snapshot));
    const retained = reviewed.filter((s) => !!s.next_review && s.next_review > today).length;
    const retention = reviewed.length ? Math.round((retained / reviewed.length) * 100) : 0;
    const riskWords = words.filter(
      (w) => w.status !== 'known' && ((w.correct_streak ?? 0) <= 1 || dueWordIds.has(w.id))
    ).length;
    const daily = Array.from({ length: WEEK_DAYS }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (WEEK_DAYS - 1 - i));
      const day = d.toLocaleDateString('en-CA');
      const count = sentences.filter((s) => {
        const snap = parseFsrsSnapshot(s.fsrs_snapshot);
        const when = snap?.last_review?.slice(0, 10);
        return when === day;
      }).length;
      return { day: day.slice(5), count };
    });
    return {
      reviewedCount: reviewed.length,
      retention,
      riskWords,
      daily,
      dueTotal: dueAll.length,
      duePlanned: dueQueue.length,
    };
  }, [sentences, words, dueWordIds, dueAll.length, dueQueue.length]);

  const filteredWords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return words.filter((w) => {
      if (q && !w.lemma.includes(q)) return false;
      if (filter === 'all') return true;
      if (filter === 'due') return dueWordIds.has(w.id);
      return w.status === filter;
    });
  }, [words, filter, search, dueWordIds]);

  const counts = useMemo(
    () => ({
      total: words.length,
      learning: words.filter((w) => w.status === 'learning').length,
      known: words.filter((w) => w.status === 'known').length,
    }),
    [words]
  );

  useEffect(() => {
    try {
      localStorage.setItem(DAILY_LIMIT_STORAGE_KEY, String(dailyLimit));
    } catch {
      /* storage indisponível */
    }
  }, [dailyLimit]);

  const handleManualSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await flushVocabSyncQueue(isOnline);
      const pending = await getVocabPendingSyncCount();
      setPendingSync(pending);
      if (!isOnline) {
        toast.info('Você está offline. A sincronização será retomada quando voltar a conectar.');
      } else if (result.synced > 0) {
        toast.success(`${result.synced} item(ns) sincronizado(s).`);
      } else if (pending > 0) {
        toast.info(`${pending} item(ns) ainda pendente(s).`);
      } else {
        toast.success('Tudo sincronizado.');
      }
      await refresh();
    } catch (e) {
      toast.error(classifyApiError(e));
    } finally {
      setSyncing(false);
    }
  }, [syncing, isOnline, refresh]);

  const handleReplaceSentence = useCallback(
    async (sentence: VocabSentence) => {
      const word = wordsById.get(sentence.word_id);
      if (!word || generatingFor) return;
      setGeneratingFor(word.id);
      try {
        await deleteVocabSentence(sentence.id, isOnline);
        const created = await generateSentencesForWord(userId, word, words, isOnline, 1, {
          blockedEnglish: [sentence.text_en],
        });
        if (created.length > 0) {
          toast.success('Frase substituída por uma alternativa nova.');
        } else {
          toast.info('Frase removida, mas a IA não retornou substituição válida agora.');
        }
        await refresh();
      } catch (e) {
        toast.error(classifyApiError(e));
      } finally {
        setGeneratingFor(null);
      }
    },
    [wordsById, generatingFor, isOnline, userId, words, refresh]
  );

  const handleExport = useCallback(() => {
    const payload = words.map((w) => ({
      lemma: w.lemma,
      translation_pt: w.translation_pt,
      status: w.status,
      correct_streak: w.correct_streak,
    }));
    const csv = [
      'lemma,translation_pt,status,correct_streak',
      ...payload.map((p) =>
        [p.lemma, p.translation_pt ?? '', p.status, String(p.correct_streak ?? 0)]
          .map((x) => `"${String(x).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-en-${new Date().toLocaleDateString('en-CA')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [words]);

  const handleImportFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (importing) return;
      setImporting(true);
      try {
        const text = await file.text();
        const lines = text
          .split(/\r?\n/)
          .flatMap((line) => line.split(','))
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean);
        const unique = [...new Set(lines)].filter((w) => /^[a-z][a-z'-]{1,40}$/i.test(w));
        if (unique.length === 0) {
          toast.info('Nenhuma palavra válida encontrada no arquivo.');
          return;
        }
        let ok = 0;
        for (const lemma of unique.slice(0, 200)) {
          try {
            // reutiliza enriquecimento atual
            await addVocabWord(userId, lemma, isOnline);
            ok += 1;
          } catch {
            // continua
          }
        }
        await refresh();
        toast.success(`${ok} palavra(s) importada(s).`);
      } catch (e) {
        toast.error(classifyApiError(e));
      } finally {
        setImporting(false);
      }
    },
    [importing, userId, isOnline, refresh]
  );

  if (studying) {
    return (
      <VocabStudySession
        userId={userId}
        isOnline={isOnline}
        sentences={dueQueue}
        wordsById={wordsById}
        storageKey={`sanfran_vocab_session_${userId}`}
        onReplaceSentence={handleReplaceSentence}
        onFinish={() => {
          setStudying(false);
          void refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-5xl mx-auto">
      {/* Header */}
      <header className="relative py-8 md:py-10">
        <div className="absolute top-0 left-0 w-20 h-1 bg-sky-600 rounded-full mb-6" />
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-3 leading-[0.95]">
          Vocab <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-blue-500">English.</span>
        </h1>
        <p className="text-base md:text-lg font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          Adicione uma palavra, receba frases i+1 com áudio e revise com repetição espaçada.
        </p>
      </header>

      <div className="space-y-2">
        {cloudUnavailable && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <CloudOff size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs md:text-sm text-amber-800 dark:text-amber-200 font-medium">
              Modo local: as tabelas <code>vocab_words</code>/<code>vocab_sentences</code> ainda não
              existem no Supabase. Seus dados ficam salvos neste dispositivo até que a migration
              <code> supabase/sql/vocab_english_complete_setup.sql</code> seja executada.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            sync pendente: {pendingSync}
          </span>
          <button
            onClick={() => void handleManualSync()}
            disabled={syncing}
            className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 flex items-center gap-1.5"
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <CloudUpload size={12} />} sincronizar
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1.5"
          >
            <Download size={12} /> exportar csv
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 flex items-center gap-1.5"
          >
            {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} importar txt/csv
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            className="hidden"
            onChange={(e) => {
              void handleImportFile(e.target.files?.[0] ?? null);
              e.currentTarget.value = '';
            }}
          />
        </div>
      </div>

      {/* Add word */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAdd();
              }}
              placeholder="Adicionar palavra em inglês… (ex.: resilient)"
              className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm"
            />
          </div>
          <button
            onClick={() => void handleAdd()}
            disabled={adding || input.trim().length === 0}
            className="px-5 md:px-7 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-600/30 transition-all active:scale-95 flex items-center gap-2"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => void handleAdd(s)}
                className="w-full text-left px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors flex items-center gap-2"
              >
                <Plus size={13} className="text-sky-500" /> {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats + study CTA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <p className="text-2xl font-black text-slate-800 dark:text-white">{counts.total}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Palavras</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{counts.learning}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aprendendo</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{counts.known}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conhecidas</p>
        </div>
        <button
          onClick={() => setStudying(true)}
          disabled={dueQueue.length === 0}
          className="p-4 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:bg-white dark:disabled:bg-slate-900 disabled:border disabled:border-slate-200 dark:disabled:border-white/10 text-white disabled:text-slate-800 dark:disabled:text-white text-left transition-all active:scale-95 group"
        >
          <p className="text-2xl font-black flex items-center gap-2">
            {dueQueue.length}
            <Play size={16} className="opacity-70 group-disabled:hidden" />
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
            Devidas hoje ({dueQueue.length}/{dueAll.length})
          </p>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <p className="text-2xl font-black text-slate-800 dark:text-white">{metrics.retention}%</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retenção</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <p className="text-2xl font-black text-slate-800 dark:text-white">{metrics.reviewedCount}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frases revisadas</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{metrics.riskWords}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Palavras em risco</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Histórico 7 dias</p>
          <div className="grid grid-cols-7 gap-1 items-end h-10">
            {metrics.daily.map((d) => (
              <div key={d.day} className="flex flex-col items-center gap-1">
                <div
                  className="w-full rounded bg-sky-500/70"
                  style={{ height: `${Math.max(4, d.count * 6)}px` }}
                  title={`${d.day}: ${d.count}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters + seed toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        {(['all', 'due', 'learning', 'known'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === f
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'due' ? `Devidas (${dueAll.length})` : STATUS_LABEL[f]}
          </button>
        ))}
        <label className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-50 dark:bg-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            meta diária
          </span>
          <select
            value={dailyLimit}
            onChange={(e) => setDailyLimit(Number(e.target.value) as 20 | 40 | 60)}
            className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={60}>60</option>
          </select>
        </label>
        <div className="flex-1" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar…"
          className="px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 w-32 md:w-44"
        />
        <label className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 dark:bg-white/5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useSeed}
            onChange={(e) => {
              setUseSeed(e.target.checked);
              setUseSeedState(e.target.checked);
            }}
            className="accent-sky-600"
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Seed ~500 palavras
          </span>
        </label>
      </div>

      {/* Word list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-sky-500" />
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <BookOpenText size={36} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">
            {words.length === 0
              ? 'Nenhuma palavra ainda — adicione a primeira acima.'
              : 'Nenhuma palavra neste filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWords.map((word) => {
            const isExpanded = expanded.has(word.id);
            const dueHere = dueWordIds.has(word.id);
            return (
              <div
                key={word.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4 md:p-5">
                  <button
                    onClick={() => setDictWord(word)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-black text-slate-800 dark:text-white">
                        {word.lemma}
                      </span>
                      {word.phonetic && (
                        <span className="text-xs text-slate-400 font-medium">{word.phonetic}</span>
                      )}
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_STYLE[word.status]}`}
                      >
                        {STATUS_LABEL[word.status]}
                      </span>
                      {dueHere && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                          Revisar
                        </span>
                      )}
                    </div>
                    {word.translation_pt && (
                      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {word.translation_pt}
                      </p>
                    )}
                  </button>

                  <button
                    onClick={() => void playVocabAudio(word.lemma, word.audio_url)}
                    className="p-2.5 rounded-xl text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 transition-colors"
                    aria-label="Ouvir"
                    title="Ouvir"
                  >
                    <Volume2 size={17} />
                  </button>
                  <button
                    onClick={() => void handleRegenerate(word)}
                    disabled={generatingFor === word.id}
                    className="p-2.5 rounded-xl text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10 transition-colors disabled:opacity-50"
                    aria-label="Gerar frases i+1"
                    title="Gerar frases i+1"
                  >
                    {generatingFor === word.id ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Sparkles size={17} />
                    )}
                  </button>
                  <button
                    onClick={() => toggleExpanded(word.id)}
                    className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
                    aria-label="Ver frases"
                    title={`${sentenceCounts.get(word.id) ?? 0} frases`}
                  >
                    <span className="text-[10px] font-black">{sentenceCounts.get(word.id) ?? 0}</span>
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button
                    onClick={() => void handleDelete(word)}
                    className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    aria-label="Remover"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {isExpanded && (
                  <WordSentences
                    wordId={word.id}
                    isReplacing={generatingFor === word.id}
                    onReplaceSentence={handleReplaceSentence}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {dictWord && (
        <VocabDictionaryModal
          word={dictWord}
          onClose={() => setDictWord(null)}
          onSetStatus={handleSetStatus}
        />
      )}

      {/* GraduationCap decorativo — rodapé da aba */}
      <div className="flex items-center justify-center gap-2 pt-6 opacity-40">
        <GraduationCap size={14} className="text-slate-400" />
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
          i+1 · dicionário · FSRS
        </span>
      </div>
    </div>
  );
};

/** Lista expansível de frases de uma palavra (local, via Dexie). */
const WordSentences: React.FC<{
  wordId: string;
  isReplacing: boolean;
  onReplaceSentence: (sentence: VocabSentence) => Promise<void>;
}> = ({ wordId, isReplacing, onReplaceSentence }) => {
  const [rows, setRows] = useState<VocabSentence[]>([]);

  useEffect(() => {
    void listSentencesForWord(wordId).then(setRows);
  }, [wordId]);

  if (rows.length === 0) {
    return (
      <div className="px-5 pb-4 text-xs text-slate-400 dark:text-slate-500">
        Nenhuma frase ainda — clique no ✨ para gerar frases i+1.
      </div>
    );
  }

  const today = localTodayISO();
  return (
    <div className="px-5 pb-4 space-y-2 border-t border-slate-100 dark:border-white/5 pt-3">
      {rows.map((s) => {
        const isDue = s.next_review == null || s.next_review <= today;
        return (
          <div
            key={s.id}
            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5"
          >
            <button
              onClick={() => void playVocabAudio(s.text_en, s.audio_url)}
              className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-500/10 transition-colors shrink-0 mt-0.5"
              aria-label="Ouvir frase"
            >
              <Volume2 size={14} />
            </button>
            <button
              onClick={() => void onReplaceSentence(s)}
              disabled={isReplacing}
              className="p-1.5 rounded-lg text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-500/10 transition-colors shrink-0 mt-0.5 disabled:opacity-50"
              aria-label="Frase ruim: substituir"
              title="Frase ruim: substituir"
            >
              {isReplacing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.text_en}</p>
              {s.translation_pt && (
                <p className="text-xs text-slate-400 mt-0.5">{s.translation_pt}</p>
              )}
            </div>
            <span
              className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                isDue
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
              }`}
            >
              {isDue ? 'Devida' : s.next_review}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default VocabEnglish;
