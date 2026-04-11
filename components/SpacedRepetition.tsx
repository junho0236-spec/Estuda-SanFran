import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { 
  Repeat, Calendar, CheckCircle2, Circle, Plus, Trash2, 
  BookOpen, AlertCircle, RefreshCw, Flame, Zap, Trophy, 
  Star, Ghost, Sword, X, TrendingUp, Award, Target,
  ChevronRight, ChevronLeft, Brain, Sparkles, ZapIcon, ShieldCheck, Clock,
  FileText, Save, RotateCcw, Search, ThumbsDown, Minus, ThumbsUp,
  Bell, BrainCircuit, Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { SPACED_TOPICS_LIST_COLUMNS, USER_PERSONA_FOR_APP_PROFILE } from '../utils/supabaseSelectColumns';
import { SpacedTopic, UserProfile, SrsAlgorithm, SpacedMaterialKind } from '../types';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { dataService } from '../services/dataService';
import {
  applyFsrsReview,
  createInitialFsrsCard,
  fsrsCardToSnapshot,
  getFsrsRepsFromSnapshot,
} from '../services/spacedFsrs';
import { applySpacedTopicPlanEdit } from '../services/spacedTopicRecalc';

interface SpacedRepetitionProps {
  userId: string;
  /** Mesmo sinal que o restante do app (`App.tsx` + eventos online/offline); afeta fila offline ao salvar perfil após revisão. */
  isOnline: boolean;
}

interface ReviewTask {
  topicId: string;
  subject: string;
  topic: string;
  interval: number; // degrau fixo em dias ou último intervalo SM-2 / FSRS
  dueDate: Date;
  status: 'pending' | 'done' | 'overdue';
  reviewKind: 'fixed' | 'sm2' | 'fsrs';
}

type ReviewQuality = 'again' | 'hard' | 'good' | 'easy';

function addCalendarDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return dt.toLocaleDateString('en-CA');
}

/** SM-2 clássico: q em escala 1–5 (Again≈1, Hard=3, Good=4, Easy=5). */
function sm2Step(
  easeFactor: number,
  repetitions: number,
  previousIntervalDays: number | null,
  quality: ReviewQuality
): { ease: number; repetitions: number; intervalDays: number } {
  const qMap: Record<ReviewQuality, number> = { again: 1, hard: 3, good: 4, easy: 5 };
  const q = qMap[quality];
  const efMin = 1.3;
  const deltaEF = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);

  if (q < 3) {
    return {
      ease: Math.max(efMin, easeFactor + deltaEF),
      repetitions: 0,
      intervalDays: 1,
    };
  }

  let newInterval: number;
  if (repetitions === 0) newInterval = 1;
  else if (repetitions === 1) newInterval = 6;
  else newInterval = Math.max(1, Math.round((previousIntervalDays || 1) * easeFactor));

  return {
    ease: Math.max(efMin, easeFactor + deltaEF),
    repetitions: repetitions + 1,
    intervalDays: newInterval,
  };
}

function isAdaptiveSrsAlgorithm(a: unknown): a is 'sm2' | 'fsrs' {
  return a === 'sm2' || a === 'fsrs';
}

function spacedTopicPersistPayload(t: SpacedTopic) {
  const algo = (t.srs_algorithm || 'fixed') as SrsAlgorithm;
  return {
    reviews_completed: t.reviews_completed,
    review_completion_dates: t.review_completion_dates || {},
    srs_algorithm: algo,
    srs_ease_factor: t.srs_ease_factor ?? 2.5,
    srs_repetitions: t.srs_repetitions ?? 0,
    srs_interval_days: t.srs_interval_days ?? null,
    srs_next_review_at: t.srs_next_review_at ?? null,
    review_snoozes: t.review_snoozes || {},
    srs_cumulative_offset_days: t.srs_cumulative_offset_days ?? 0,
    srs_fsrs_card: algo === 'fsrs' ? (t.srs_fsrs_card ?? null) : null,
  };
}

function spacedTopicDbUpdateFields(t: SpacedTopic) {
  return {
    ...spacedTopicPersistPayload(t),
    study_date: t.study_date,
    cycles: t.cycles,
  };
}

const getIntervalsForCycles = (num: number) => {
  const intervals = [1, 3, 7, 15];
  if (num <= 4) return intervals.slice(0, num);
  for (let i = 4; i < num; i++) {
    intervals.push(intervals[i - 1] * 2);
  }
  return intervals;
};

const normalizeSpacedTopic = (t: SpacedTopic): SpacedTopic => {
  const raw = t.review_completion_dates;
  const dates =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, string>)
      : {};
  const snRaw = t.review_snoozes;
  const snoozes =
    snRaw && typeof snRaw === 'object' && !Array.isArray(snRaw)
      ? (snRaw as Record<string, string>)
      : {};
  const rawAlgo = t.srs_algorithm;
  const algo: SrsAlgorithm = isAdaptiveSrsAlgorithm(rawAlgo) ? rawAlgo : 'fixed';
  let srs_next = t.srs_next_review_at ?? null;
  if (isAdaptiveSrsAlgorithm(algo) && !srs_next && t.study_date) {
    srs_next = addCalendarDays(t.study_date, 1);
  }
  return {
    ...t,
    reviews_completed: Array.isArray(t.reviews_completed) ? t.reviews_completed : [],
    review_completion_dates: dates,
    review_snoozes: snoozes,
    srs_algorithm: algo,
    srs_ease_factor: typeof t.srs_ease_factor === 'number' ? t.srs_ease_factor : 2.5,
    srs_repetitions: typeof t.srs_repetitions === 'number' ? t.srs_repetitions : 0,
    srs_interval_days: t.srs_interval_days ?? null,
    srs_next_review_at: srs_next,
    srs_cumulative_offset_days:
      typeof t.srs_cumulative_offset_days === 'number' ? t.srs_cumulative_offset_days : 0,
    linked_material_kind: normalizeMaterialKind(t.linked_material_kind),
    linked_material_query:
      typeof t.linked_material_query === 'string' ? t.linked_material_query : null,
    linked_question_bank_ai_count: normalizeQbAiCount(t.linked_question_bank_ai_count),
  };
};

function cloneTopicSnapshot(t: SpacedTopic): SpacedTopic {
  return normalizeSpacedTopic({
    ...t,
    reviews_completed: [...t.reviews_completed],
    review_completion_dates: { ...(t.review_completion_dates || {}) },
    review_snoozes: { ...(t.review_snoozes || {}) },
  });
}

function applyReviewQuality(topic: SpacedTopic, task: ReviewTask, quality: ReviewQuality): SpacedTopic {
  const completionDay = localCalendarDateString();
  const algo = topic.srs_algorithm || 'fixed';

  if (algo === 'fsrs') {
    const { snapshot, nextReviewLocalISO, intervalDays } = applyFsrsReview(
      topic.study_date,
      topic.srs_fsrs_card,
      quality,
      completionDay
    );
    const dates = { ...(topic.review_completion_dates || {}) };
    if (quality !== 'again') {
      dates[`fsrs-${snapshot.reps}`] = completionDay;
    }
    return normalizeSpacedTopic({
      ...topic,
      srs_fsrs_card: snapshot,
      srs_interval_days: intervalDays,
      srs_next_review_at: nextReviewLocalISO,
      review_completion_dates: dates,
    });
  }

  if (algo === 'sm2') {
    const ef = topic.srs_ease_factor ?? 2.5;
    const reps = topic.srs_repetitions ?? 0;
    const prevInt = topic.srs_interval_days;
    const next = sm2Step(ef, reps, prevInt, quality);
    const nextReview = addCalendarDays(completionDay, next.intervalDays);
    const dates = { ...(topic.review_completion_dates || {}) };
    if (quality !== 'again') {
      dates[`sm2-${next.repetitions}`] = completionDay;
    }
    return normalizeSpacedTopic({
      ...topic,
      srs_ease_factor: next.ease,
      srs_repetitions: next.repetitions,
      srs_interval_days: next.intervalDays,
      srs_next_review_at: nextReview,
      review_completion_dates: dates,
    });
  }

  const intKey = String(task.interval);
  const snoozes = { ...(topic.review_snoozes || {}) };

  if (quality === 'again') {
    snoozes[intKey] = addCalendarDays(completionDay, 1);
    return normalizeSpacedTopic({ ...topic, review_snoozes: snoozes });
  }

  delete snoozes[intKey];
  const newCompleted = [...topic.reviews_completed, task.interval];
  const newDates = { ...(topic.review_completion_dates || {}), [intKey]: completionDay };
  let offset = topic.srs_cumulative_offset_days ?? 0;
  if (quality === 'hard') offset += 2;
  if (quality === 'easy') offset = Math.max(-5, offset - 1);

  return normalizeSpacedTopic({
    ...topic,
    reviews_completed: newCompleted,
    review_completion_dates: newDates,
    review_snoozes: snoozes,
    srs_cumulative_offset_days: offset,
  });
}

/** Dia local YYYY-MM-DD (alinhado ao heatmap da semana no fuso do navegador). */
const localCalendarDateString = () => new Date().toLocaleDateString('en-CA');

/** Data (início do dia local) da próxima revisão pendente, na ordem dos intervalos do plano. */
const getNextReviewDueDate = (t: SpacedTopic): Date | null => {
  if (isAdaptiveSrsAlgorithm(t.srs_algorithm) && t.srs_next_review_at) {
    const d = new Date(t.srs_next_review_at + 'T00:00:00');
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const adjustedStart = new Date(t.study_date + 'T00:00:00');
  const topicIntervals = getIntervalsForCycles(t.cycles || 4);
  const off = t.srs_cumulative_offset_days ?? 0;
  for (const interval of topicIntervals) {
    if (t.reviews_completed.includes(interval)) continue;
    const targetDate = new Date(adjustedStart);
    targetDate.setDate(adjustedStart.getDate() + interval + off);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate;
  }
  return null;
};

function dateToLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekStartMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function topicIsMastered(t: SpacedTopic): boolean {
  const topicIntervals = getIntervalsForCycles(t.cycles || 4);
  const algo = t.srs_algorithm || 'fixed';
  if (algo === 'fsrs') {
    return getFsrsRepsFromSnapshot(t.srs_fsrs_card) >= (t.cycles || 4) * 3;
  }
  if (algo === 'sm2') return (t.srs_repetitions ?? 0) >= (t.cycles || 4) * 3;
  const progress = (t.reviews_completed.length / topicIntervals.length) * 100;
  return progress === 100;
}

/** Datas previstas de cada degrau ainda pendente (fixo: escada + offset + snooze; SM-2/FSRS: próxima única). */
function collectUpcomingDueDates(t: SpacedTopic): Date[] {
  if (topicIsMastered(t)) return [];
  const algo = t.srs_algorithm || 'fixed';
  if (algo === 'sm2' || algo === 'fsrs') {
    const next = t.srs_next_review_at || addCalendarDays(t.study_date, 1);
    const d = new Date(next + 'T00:00:00');
    d.setHours(0, 0, 0, 0);
    return [d];
  }
  const adjustedStart = new Date(t.study_date + 'T00:00:00');
  const intervals = getIntervalsForCycles(t.cycles || 4);
  const off = t.srs_cumulative_offset_days ?? 0;
  const out: Date[] = [];
  for (const interval of intervals) {
    if (t.reviews_completed.includes(interval)) continue;
    const ladder = new Date(adjustedStart);
    ladder.setDate(adjustedStart.getDate() + interval + off);
    ladder.setHours(0, 0, 0, 0);
    const sn = t.review_snoozes?.[String(interval)];
    let eff = ladder;
    if (sn && /^\d{4}-\d{2}-\d{2}$/.test(sn)) {
      const snD = new Date(sn + 'T00:00:00');
      snD.setHours(0, 0, 0, 0);
      eff = snD > ladder ? snD : ladder;
    }
    out.push(eff);
  }
  return out;
}

function normalizeMaterialKind(v: unknown): SpacedMaterialKind {
  if (v === 'flashcards' || v === 'summarizer' || v === 'both' || v === 'question_bank') return v;
  return 'none';
}

/** 1–20 para o Gerador com IA do banco; fora disso → null (não persiste preferência inválida). */
function normalizeQbAiCount(v: unknown): number | null {
  let n0: number;
  if (typeof v === 'number' && Number.isFinite(v)) n0 = v;
  else if (typeof v === 'string' && v.trim() !== '') {
    const p = parseInt(v, 10);
    if (!Number.isFinite(p)) return null;
    n0 = p;
  } else return null;
  const n = Math.round(n0);
  if (n < 1 || n > 20) return null;
  return n;
}

function clampQbAiCountInput(raw: number): number {
  if (!Number.isFinite(raw)) return 3;
  return Math.min(20, Math.max(1, Math.round(raw)));
}

function navigateToQuestionBankForTopic(navigate: NavigateFunction, t: SpacedTopic) {
  const p = new URLSearchParams();
  p.set('qbSubject', t.subject.trim());
  p.set('qbTopic', t.topic.trim());
  p.set('reviewToday', '1');
  const qtxt = t.linked_material_query?.trim();
  if (qtxt) p.set('qbSearch', qtxt);
  const qbN = normalizeQbAiCount(t.linked_question_bank_ai_count);
  if (qbN != null) p.set('qbAiCount', String(qbN));
  navigate(`/questoes?${p.toString()}`);
}

function getSpacedMaterialQuery(t: SpacedTopic): string {
  const q = t.linked_material_query?.trim();
  if (q) return q;
  return `${t.subject.trim()} — ${t.topic.trim()}`;
}

const SPACED_REMINDER_STORAGE = 'sanfran-spaced-reminders';
const SPACED_REMINDER_DAY_KEY = 'sanfran-spaced-remind-day';
/** Disparado a partir de Configurações para reabrir o painel na Revisão espaçada. */
const SPACED_REMINDER_OPEN_EVENT = 'sanfran-spaced-reminders-open';

type SpacedReminderStored = {
  enabled: boolean;
  time: string;
  panelDismissed: boolean;
};

function readSpacedReminderStored(): SpacedReminderStored {
  try {
    const raw = localStorage.getItem(SPACED_REMINDER_STORAGE);
    if (!raw) return { enabled: false, time: '09:00', panelDismissed: false };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      enabled: typeof p.enabled === 'boolean' ? p.enabled : false,
      time: typeof p.time === 'string' && /^\d{2}:\d{2}$/.test(p.time) ? p.time : '09:00',
      panelDismissed: p.panelDismissed === true,
    };
  } catch {
    return { enabled: false, time: '09:00', panelDismissed: false };
  }
}

const formatNextReviewHint = (due: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  const dateStr = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return {
      line: `Atrasada há ${n} ${n === 1 ? 'dia' : 'dias'}`,
      sub: dateStr,
      overdue: true,
    };
  }
  if (diffDays === 0) return { line: 'Hoje', sub: dateStr, overdue: false };
  if (diffDays === 1) return { line: 'Amanhã', sub: dateStr, overdue: false };
  return { line: `em ${diffDays} dias`, sub: dateStr, overdue: false };
};

type TopicsSortMode = 'overdueFirst' | 'subject' | 'studyDate';

interface LastReviewUndo {
  topicSnapshot: SpacedTopic;
  gamificationApplied: boolean;
  profileBeforeReward: UserProfile | null;
}

function describeSupabaseError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as { message?: string; code?: string };
    if (typeof e.message === 'string') {
      if (e.code === '42501' || /permission denied|rls/i.test(e.message)) {
        return 'Sem permissão ou sessão expirada. Verifique o login ou políticas (RLS).';
      }
      return e.message;
    }
  }
  if (error instanceof Error) return error.message;
  return 'Erro desconhecido';
}

/** Foco preso no diálogo, Tab circular e Escape para fechar. */
function useModalA11y(
  open: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  onRequestClose: () => void,
  options?: { initialFocusRef?: React.RefObject<HTMLElement | null> }
) {
  const onCloseRef = useRef(onRequestClose);
  onCloseRef.current = onRequestClose;
  const initialRef = options?.initialFocusRef;

  useEffect(() => {
    if (!open) return;
    let removeKey: (() => void) | undefined;
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      const el = containerRef.current;
      if (!el) return;
      const selector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(el.querySelectorAll<HTMLElement>(selector)).filter(node => {
        const st = window.getComputedStyle(node);
        return st.visibility !== 'hidden' && st.display !== 'none';
      });
      const initial = initialRef?.current;
      const pick =
        initial && focusables.includes(initial) ? initial : focusables[0];
      pick?.focus();

      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCloseRef.current();
          return;
        }
        if (e.key !== 'Tab' || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', onKey, true);
      removeKey = () => document.removeEventListener('keydown', onKey, true);
    };

    const id = requestAnimationFrame(() => requestAnimationFrame(setup));
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      removeKey?.();
    };
  }, [open, containerRef, initialRef]);
}

const SpacedRepetition: React.FC<SpacedRepetitionProps> = ({ userId, isOnline }) => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<SpacedTopic[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [topicsHydrated, setTopicsHydrated] = useState(false);
  const [profileSettled, setProfileSettled] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTopicForContent, setSelectedTopicForContent] = useState<SpacedTopic | null>(null);
  const [topicContent, setTopicContent] = useState('');
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [topicsLoadError, setTopicsLoadError] = useState<string | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const addTopicDialogRef = useRef<HTMLDivElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const contentDialogRef = useRef<HTMLDivElement>(null);
  const [lastReviewUndo, setLastReviewUndo] = useState<LastReviewUndo | null>(null);
  const [topicsSearch, setTopicsSearch] = useState('');
  const [topicsSort, setTopicsSort] = useState<TopicsSortMode>('overdueFirst');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [newTopicMaterialKind, setNewTopicMaterialKind] = useState<SpacedMaterialKind>('both');
  const [newTopicMaterialQuery, setNewTopicMaterialQuery] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(() => readSpacedReminderStored().enabled);
  const [reminderTime, setReminderTime] = useState(() => readSpacedReminderStored().time);
  const [reminderPanelDismissed, setReminderPanelDismissed] = useState(
    () => readSpacedReminderStored().panelDismissed
  );
  const [contentMaterialKind, setContentMaterialKind] = useState<SpacedMaterialKind>('both');
  const [contentMaterialQuery, setContentMaterialQuery] = useState('');
  const [contentQbAiCount, setContentQbAiCount] = useState(3);
  const [savingMaterialLink, setSavingMaterialLink] = useState(false);
  const [editPlanStudyDate, setEditPlanStudyDate] = useState('');
  const [editPlanCycles, setEditPlanCycles] = useState(4);
  const [editPlanAlgorithm, setEditPlanAlgorithm] = useState<SrsAlgorithm>('fixed');
  const [isSavingTopicPlan, setIsSavingTopicPlan] = useState(false);

  const reminderPrefsRef = useRef({ enabled: false, time: '09:00' });
  const todaysReviewsRef = useRef<ReviewTask[]>([]);

  // Form
  const [subject, setSubject] = useState('');
  const [topicName, setTopicName] = useState('');
  const [studyDate, setStudyDate] = useState(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD
  const [cycles, setCycles] = useState(4);
  const [newTopicAlgorithm, setNewTopicAlgorithm] = useState<SrsAlgorithm>('fixed');
  const [qualityPickTask, setQualityPickTask] = useState<ReviewTask | null>(null);
  const qualityDialogRef = useRef<HTMLDivElement>(null);

  // Derived state
  const [todaysReviews, setTodaysReviews] = useState<ReviewTask[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<boolean[]>(new Array(7).fill(false));

  const calculateWeeklyActivity = useCallback((data: SpacedTopic[]) => {
    const activity = new Array(7).fill(false);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    data.forEach(t => {
      const dates = t.review_completion_dates || {};
      Object.values(dates).forEach(dateStr => {
        if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
        const [y, m, d] = dateStr.split('-').map(Number);
        const completed = new Date(y, m - 1, d);
        completed.setHours(0, 0, 0, 0);
        const diff = Math.floor((completed.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff < 7) {
          activity[diff] = true;
        }
      });
    });
    setWeeklyActivity(activity);
  }, []);

  const calculateReviews = useCallback((data: SpacedTopic[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tasks: ReviewTask[] = [];

    data.forEach(t => {
      const algo = t.srs_algorithm || 'fixed';

      if (algo === 'sm2' || algo === 'fsrs') {
        let nextAt = t.srs_next_review_at;
        if (!nextAt) nextAt = addCalendarDays(t.study_date, 1);
        const due = new Date(nextAt + 'T00:00:00');
        due.setHours(0, 0, 0, 0);
        if (due <= today) {
          tasks.push({
            topicId: t.id,
            subject: t.subject,
            topic: t.topic,
            interval: t.srs_interval_days || 1,
            dueDate: due,
            status: due.getTime() === today.getTime() ? 'pending' : 'overdue',
            reviewKind: algo === 'fsrs' ? 'fsrs' : 'sm2',
          });
        }
        return;
      }

      const adjustedStart = new Date(t.study_date + 'T00:00:00');
      const topicIntervals = getIntervalsForCycles(t.cycles || 4);
      const off = t.srs_cumulative_offset_days ?? 0;

      topicIntervals.forEach(interval => {
        if (t.reviews_completed.includes(interval)) return;

        const snoozeUntil = t.review_snoozes?.[String(interval)];
        if (snoozeUntil) {
          const sn = new Date(snoozeUntil + 'T00:00:00');
          sn.setHours(0, 0, 0, 0);
          if (sn > today) return;
        }

        const targetDate = new Date(adjustedStart);
        targetDate.setDate(adjustedStart.getDate() + interval + off);
        targetDate.setHours(0, 0, 0, 0);

        if (targetDate <= today) {
          tasks.push({
            topicId: t.id,
            subject: t.subject,
            topic: t.topic,
            interval: interval,
            dueDate: targetDate,
            status: targetDate.getTime() === today.getTime() ? 'pending' : 'overdue',
            reviewKind: 'fixed',
          });
        }
      });
    });

    const adaptiveRank = (k: ReviewTask['reviewKind']) =>
      k === 'fsrs' ? 0 : k === 'sm2' ? 1 : 2;

    tasks.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      const ar = adaptiveRank(a.reviewKind);
      const br = adaptiveRank(b.reviewKind);
      if (ar !== br) return ar - br;
      if (a.interval !== b.interval) return a.interval - b.interval;
      return a.topic.localeCompare(b.topic);
    });

    setTodaysReviews(tasks);
  }, []);

  const fetchProfile = useCallback(async () => {
    setProfileLoadError(null);
    const { data, error } = await supabase
      .from('user_persona')
      .select(USER_PERSONA_FOR_APP_PROFILE)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        setProfile(null);
        setProfileLoadError(null);
        setProfileSettled(true);
        return;
      }
      const msg = describeSupabaseError(error);
      setProfileLoadError(msg);
      toast.error('Não foi possível carregar o perfil', { description: msg });
      setProfileSettled(true);
      return;
    }

    setProfile(data as unknown as UserProfile);
    setProfileLoadError(null);
    setProfileSettled(true);
  }, [userId]);

  const fetchTopics = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setTopicsLoadError(null);
      }
      const { data, error } = await supabase
        .from('spaced_topics')
        .select(SPACED_TOPICS_LIST_COLUMNS)
        .eq('user_id', userId)
        .order('study_date', { ascending: false });

      if (error) {
        const msg = describeSupabaseError(error);
        if (!opts?.silent) {
          setTopicsLoadError(msg);
          toast.error('Erro ao carregar revisões espaçadas', { description: msg });
        } else {
          toast.error('Não foi possível atualizar a lista', { description: msg });
        }
        if (!opts?.silent) setTopicsHydrated(true);
        return;
      }

      const normalized = (data || []).map(normalizeSpacedTopic);
      setTopics(normalized);
      calculateReviews(normalized);
      calculateWeeklyActivity(normalized);
      setTopicsLoadError(null);
      if (!opts?.silent) setTopicsHydrated(true);
    },
    [userId, calculateReviews, calculateWeeklyActivity]
  );

  const retryLoadData = useCallback(() => {
    setTopicsHydrated(false);
    setProfileSettled(false);
    void fetchTopics();
    void fetchProfile();
  }, [fetchTopics, fetchProfile]);

  useEffect(() => {
    void fetchTopics();
    void fetchProfile();
  }, [fetchTopics, fetchProfile]);

  useEffect(() => {
    reminderPrefsRef.current = { enabled: reminderEnabled, time: reminderTime };
    try {
      localStorage.setItem(
        SPACED_REMINDER_STORAGE,
        JSON.stringify({
          enabled: reminderEnabled,
          time: reminderTime,
          panelDismissed: reminderPanelDismissed,
        })
      );
    } catch {
      /* ignore */
    }
  }, [reminderEnabled, reminderTime, reminderPanelDismissed]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SPACED_REMINDER_STORAGE || !e.newValue) return;
      try {
        const p = JSON.parse(e.newValue) as Record<string, unknown>;
        if (typeof p.enabled === 'boolean') setReminderEnabled(p.enabled);
        if (typeof p.time === 'string' && /^\d{2}:\d{2}$/.test(p.time)) setReminderTime(p.time);
        if (typeof p.panelDismissed === 'boolean') setReminderPanelDismissed(p.panelDismissed);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const openPanel = () => setReminderPanelDismissed(false);
    window.addEventListener(SPACED_REMINDER_OPEN_EVENT, openPanel);
    return () => window.removeEventListener(SPACED_REMINDER_OPEN_EVENT, openPanel);
  }, []);

  useEffect(() => {
    todaysReviewsRef.current = todaysReviews;
  }, [todaysReviews]);

  useEffect(() => {
    const parseHm = (s: string) => {
      const [h, m] = s.split(':').map(Number);
      return { h: Number.isFinite(h) ? h : 9, m: Number.isFinite(m) ? m : 0 };
    };
    const tick = () => {
      const { enabled, time } = reminderPrefsRef.current;
      if (!enabled || typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      const { h, m } = parseHm(time);
      const now = new Date();
      if (now.getHours() !== h || now.getMinutes() !== m) return;
      const ymd = dateToLocalISO(now);
      if (localStorage.getItem(SPACED_REMINDER_DAY_KEY) === ymd) return;
      const n = todaysReviewsRef.current.length;
      if (n === 0) return;
      try {
        new Notification('Revisão espaçada — SanFran Academy', {
          body:
            n === 1
              ? 'Você tem 1 revisão na fila de hoje.'
              : `Você tem ${n} revisões na fila de hoje.`,
          tag: 'spaced-repetition-daily',
        });
      } catch {
        /* ignore */
      }
      try {
        localStorage.setItem(SPACED_REMINDER_DAY_KEY, ymd);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = window.setInterval(tick, 25000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedTopicForContent) return;
    setContentMaterialKind(normalizeMaterialKind(selectedTopicForContent.linked_material_kind));
    setContentMaterialQuery(selectedTopicForContent.linked_material_query || '');
    setContentQbAiCount(
      normalizeQbAiCount(selectedTopicForContent.linked_question_bank_ai_count) ?? 3
    );
    setEditPlanStudyDate(selectedTopicForContent.study_date);
    setEditPlanCycles(selectedTopicForContent.cycles || 4);
    const a = selectedTopicForContent.srs_algorithm;
    setEditPlanAlgorithm(a === 'sm2' || a === 'fsrs' ? a : 'fixed');
  }, [selectedTopicForContent]);

  const requestReminderPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Este navegador não suporta notificações na área de trabalho.');
      return;
    }
    const r = await Notification.requestPermission();
    if (r !== 'granted') {
      toast.warning('Permissão negada. Ative nas configurações do navegador para receber lembretes.');
    } else {
      if (reminderEnabled) {
        setReminderPanelDismissed(true);
        toast.success('Notificações permitidas.', {
          description: 'Painel oculto. Reabra pelo sino ao lado de “Registrar estudo” ou em Configurações → Notificações.',
        });
      } else {
        toast.success('Notificações permitidas. Marque “Ativar” e escolha o horário para receber lembretes.');
      }
    }
  };

  const sendTestSpacedNotification = () => {
    if (typeof Notification === 'undefined') {
      toast.error('Notificações não disponíveis neste ambiente.');
      return;
    }
    if (Notification.permission !== 'granted') {
      toast.info('Use “Permitir notificações” antes do teste.');
      return;
    }
    try {
      new Notification('Teste — Revisão espaçada', {
        body: 'Se apareceu fora do navegador, o canal está ok neste dispositivo.',
        tag: 'spaced-repetition-test',
      });
    } catch {
      toast.error('Não foi possível disparar a notificação de teste.');
    }
  };

  const saveMaterialLinkForTopic = async (topicId: string) => {
    setSavingMaterialLink(true);
    const q = contentMaterialQuery.trim() || null;
    const qbCount = clampQbAiCountInput(contentQbAiCount);
    try {
      const { error } = await supabase
        .from('spaced_topics')
        .update({
          linked_material_kind: contentMaterialKind,
          linked_material_query: q,
          linked_question_bank_ai_count: qbCount,
        })
        .eq('id', topicId);
      if (error) throw error;
      setTopics(prev =>
        prev.map(t =>
          t.id === topicId
            ? normalizeSpacedTopic({
                ...t,
                linked_material_kind: contentMaterialKind,
                linked_material_query: q,
                linked_question_bank_ai_count: qbCount,
              })
            : t
        )
      );
      setSelectedTopicForContent(cur =>
        cur && cur.id === topicId
          ? normalizeSpacedTopic({
              ...cur,
              linked_material_kind: contentMaterialKind,
              linked_material_query: q,
              linked_question_bank_ai_count: qbCount,
            })
          : cur
      );
      toast.success('Preferências de material e banco de questões salvas.');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível salvar o vínculo.', {
        description: describeSupabaseError(e),
      });
    } finally {
      setSavingMaterialLink(false);
    }
  };

  const handleAddTopic = async () => {
    if (!subject.trim() || !topicName.trim()) {
      toast.warning('Preencha a matéria e o tópico.');
      return;
    }

    try {
      const sm2 = newTopicAlgorithm === 'sm2';
      const useFsrs = newTopicAlgorithm === 'fsrs';
      const insertRow: Record<string, unknown> = {
        user_id: userId,
        subject: subject,
        topic: topicName,
        study_date: studyDate,
        cycles: cycles,
        reviews_completed: [],
        review_completion_dates: {},
        srs_algorithm: newTopicAlgorithm,
        srs_ease_factor: 2.5,
        srs_repetitions: 0,
        srs_interval_days: null,
        srs_next_review_at: sm2 || useFsrs ? addCalendarDays(studyDate, 1) : null,
        review_snoozes: {},
        srs_cumulative_offset_days: 0,
        linked_material_kind: newTopicMaterialKind,
        linked_material_query: newTopicMaterialQuery.trim() || null,
      };
      if (useFsrs) {
        insertRow.srs_fsrs_card = fsrsCardToSnapshot(createInitialFsrsCard(studyDate));
      }

      const { data, error } = await supabase.from('spaced_topics').insert(insertRow).select().single();

      if (error) throw error;
      if (data) {
        const row = normalizeSpacedTopic(data as SpacedTopic);
        const newTopics = [row, ...topics];
        setTopics(newTopics);
        calculateReviews(newTopics);
        calculateWeeklyActivity(newTopics);
      }
      
      setIsAdding(false);
      setTopicName('');
      setNewTopicMaterialKind('both');
      setNewTopicMaterialQuery('');
      toast.success('Tópico registrado. Revisões agendadas!');
      // Mantém a matéria para facilitar inserção em lote
    } catch (e) {
      console.error(e);
      toast.error('Erro ao registrar estudo', { description: describeSupabaseError(e) });
    }
  };

  const finalizeReview = async (task: ReviewTask, quality: ReviewQuality) => {
    setQualityPickTask(null);
    const topic = topics.find(t => t.id === task.topicId);
    if (!topic) return;

    const topicsSnapshot: SpacedTopic[] = topics.map(t => cloneTopicSnapshot(t));
    const topicSnapshot = cloneTopicSnapshot(topic);
    const nextTopic = applyReviewQuality(topic, task, quality);

    const updatedTopics = topics.map(t => (t.id === task.topicId ? nextTopic : t));
    setTopics(updatedTopics);
    calculateReviews(updatedTopics);
    calculateWeeklyActivity(updatedTopics);

    try {
      const { error: upErr } = await supabase
        .from('spaced_topics')
        .update(spacedTopicPersistPayload(nextTopic))
        .eq('id', task.topicId);
      if (upErr) throw upErr;
    } catch (e) {
      console.error(e);
      setTopics(topicsSnapshot);
      calculateReviews(topicsSnapshot);
      calculateWeeklyActivity(topicsSnapshot);
      toast.error('Erro ao sincronizar.', { description: 'A revisão não foi salva; voltamos ao estado anterior.' });
      void fetchTopics({ silent: true });
      return;
    }

    const eligibleXp =
      quality !== 'again' && (task.status === 'pending' || task.status === 'overdue');

    if (quality === 'again') {
      const alg = topic.srs_algorithm || 'fixed';
      const againDesc =
        alg === 'sm2'
          ? 'Intervalo SM-2 reiniciado; próxima revisão em 1 dia.'
          : alg === 'fsrs'
            ? 'FSRS ajustou estabilidade; a próxima data segue o scheduler (geralmente breve após Again).'
            : 'Este degrau volta à fila amanhã (modo fixo).';
      toast.info('Vamos repetir em breve.', {
        description: againDesc,
      });
      setLastReviewUndo({
        topicSnapshot,
        gamificationApplied: false,
        profileBeforeReward: null,
      });
      return;
    }

    if (!eligibleXp) {
      setLastReviewUndo({
        topicSnapshot,
        gamificationApplied: false,
        profileBeforeReward: null,
      });
      return;
    }

    let effectiveProfile: UserProfile | null = profile;
    if (!effectiveProfile) {
      const { data, error } = await supabase
        .from('user_persona')
        .select(USER_PERSONA_FOR_APP_PROFILE)
        .eq('id', userId)
        .single();
      if (!error && data) {
        effectiveProfile = data as unknown as UserProfile;
        setProfile(effectiveProfile);
        setProfileLoadError(null);
      }
    }

    const profileBeforeReward: UserProfile | null =
      eligibleXp && effectiveProfile
        ? (JSON.parse(JSON.stringify(effectiveProfile)) as UserProfile)
        : null;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0ea5e9', '#f59e0b', '#10b981'],
    });

    if (effectiveProfile) {
      toast.success('+50 XP: Revisão concluída!', {
        icon: <Zap className="text-amber-500" size={16} />,
        description: 'Você está derrotando a curva do esquecimento!',
      });

      const newXP = (effectiveProfile.arcadia_score || 0) + 50;
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const lastInteraction = effectiveProfile.lastInteractionDate || '';

      let newStreak = effectiveProfile.productivityStats?.streak || 0;
      if (lastInteraction !== today) {
        if (!lastInteraction) {
          newStreak = 1;
        } else {
          const lastDate = new Date(lastInteraction);
          const todayDate = new Date(today);
          const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
        }
      }

      const updatedProfile = {
        ...effectiveProfile,
        arcadia_score: newXP,
        lastInteractionDate: today,
        productivityStats: {
          ...(effectiveProfile.productivityStats || { completedToday: 0, completedYesterday: 0, streak: 0 }),
          streak: newStreak,
          completedToday: (effectiveProfile.productivityStats?.completedToday || 0) + 1,
        },
      };

      setProfile(updatedProfile);
      await dataService.saveUserProfile(updatedProfile, userId, isOnline);
    } else {
      toast.success('Revisão concluída!', {
        icon: <CheckCircle2 className="text-sky-500" size={16} />,
        description:
          'Revisão salva na nuvem. XP e ofensiva não foram atualizados porque o perfil não está disponível — use “Recarregar perfil” acima ou atualize a página.',
        duration: 6500,
      });
    }

    setLastReviewUndo({
      topicSnapshot,
      gamificationApplied: !!effectiveProfile,
      profileBeforeReward,
    });
  };

  const undoLastReview = async () => {
    const u = lastReviewUndo;
    if (!u) return;
    const id = u.topicSnapshot.id;
    setLastReviewUndo(null);
    try {
      const { error } = await supabase
        .from('spaced_topics')
        .update(spacedTopicPersistPayload(u.topicSnapshot))
        .eq('id', id);
      if (error) throw error;

      setTopics(prev => {
        const next = prev.map(t => (t.id === id ? normalizeSpacedTopic(u.topicSnapshot) : t));
        calculateReviews(next);
        calculateWeeklyActivity(next);
        return next;
      });

      if (u.gamificationApplied && u.profileBeforeReward) {
        setProfile(u.profileBeforeReward);
        await dataService.saveUserProfile(u.profileBeforeReward, userId, isOnline);
      }

      toast.success('Última revisão desfeita.', {
        description: u.gamificationApplied ? 'Tópico e XP/ofensiva restaurados.' : 'Estado do tópico restaurado.',
      });
    } catch (e) {
      console.error(e);
      setLastReviewUndo(u);
      toast.error('Não foi possível desfazer', { description: describeSupabaseError(e) });
    }
  };

  const confirmDeleteTopic = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    setLastReviewUndo(cur => (cur?.topicSnapshot.id === id ? null : cur));
    try {
      const { error } = await supabase.from('spaced_topics').delete().eq('id', id);
      if (error) throw error;
      const newTopics = topics.filter(t => t.id !== id);
      setTopics(newTopics);
      calculateReviews(newTopics);
      calculateWeeklyActivity(newTopics);
      toast.success('Tópico removido.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao remover tópico', { description: describeSupabaseError(e) });
    }
  };

  const handleSaveContent = async () => {
    if (!selectedTopicForContent) return;
    setIsSavingContent(true);
    try {
      const { error } = await supabase.from('spaced_topics').update({
        content: topicContent
      }).eq('id', selectedTopicForContent.id);

      if (error) throw error;

      setTopics(prev => prev.map(t => t.id === selectedTopicForContent.id ? { ...t, content: topicContent } : t));
      toast.success("Conteúdo salvo com sucesso!");
      setSelectedTopicForContent(null);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar conteúdo', { description: describeSupabaseError(e) });
    } finally {
      setIsSavingContent(false);
    }
  };

  const openTopicContent = (topic: SpacedTopic) => {
    setSelectedTopicForContent(topic);
    setTopicContent(topic.content || '');
  };

  const topicPlanDirty = useMemo(() => {
    const cur = selectedTopicForContent;
    if (!cur) return false;
    const curAlgo = cur.srs_algorithm === 'sm2' || cur.srs_algorithm === 'fsrs' ? cur.srs_algorithm : 'fixed';
    return (
      editPlanStudyDate !== cur.study_date ||
      editPlanCycles !== (cur.cycles || 4) ||
      editPlanAlgorithm !== curAlgo
    );
  }, [selectedTopicForContent, editPlanStudyDate, editPlanCycles, editPlanAlgorithm]);

  const handleSaveTopicPlan = async () => {
    const cur = selectedTopicForContent;
    if (!cur || !topicPlanDirty) return;
    if (!editPlanStudyDate.trim()) {
      toast.warning('Informe a data do estudo.');
      return;
    }
    setIsSavingTopicPlan(true);
    const merged = applySpacedTopicPlanEdit(cur, {
      study_date: editPlanStudyDate,
      cycles: editPlanCycles,
      srs_algorithm: editPlanAlgorithm,
    });
    const nextTopic = normalizeSpacedTopic(merged);
    const snapshot = topics.map(t => cloneTopicSnapshot(t));
    const newList = topics.map(t => (t.id === cur.id ? nextTopic : t));
    setTopics(newList);
    calculateReviews(newList);
    calculateWeeklyActivity(newList);
    try {
      const { error } = await supabase
        .from('spaced_topics')
        .update(spacedTopicDbUpdateFields(nextTopic))
        .eq('id', cur.id);
      if (error) throw error;
      setSelectedTopicForContent(nextTopic);
      setLastReviewUndo(u => (u?.topicSnapshot.id === cur.id ? null : u));
      toast.success('Plano de revisão atualizado.', {
        description: 'Regras de recálculo aplicadas; fila e calendário foram ajustados.',
      });
    } catch (e) {
      console.error(e);
      setTopics(snapshot);
      calculateReviews(snapshot);
      calculateWeeklyActivity(snapshot);
      toast.error('Não foi possível salvar o plano.', { description: describeSupabaseError(e) });
    } finally {
      setIsSavingTopicPlan(false);
    }
  };

  const getIntervalLabel = (days: number) => {
    switch (days) {
        case 1: return '24h';
        case 3: return '3 Dias';
        case 7: return '7 Dias';
        case 15: return '15 Dias';
        case 30: return '30 Dias';
        case 60: return '60 Dias';
        default: return `${days}d`;
    }
  };

  const getLevel = (xp: number) => Math.floor(xp / 500) + 1;
  const getProgressToNextLevel = (xp: number) => (xp % 500) / 500 * 100;

  const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const topicPendingDelete = deleteConfirmId
    ? topics.find(t => t.id === deleteConfirmId)
    : null;

  useModalA11y(isAdding, addTopicDialogRef, () => setIsAdding(false));
  useModalA11y(!!deleteConfirmId, deleteDialogRef, () => setDeleteConfirmId(null), {
    initialFocusRef: deleteCancelRef,
  });
  useModalA11y(!!selectedTopicForContent, contentDialogRef, () => setSelectedTopicForContent(null));
  useModalA11y(!!qualityPickTask, qualityDialogRef, () => setQualityPickTask(null));

  const filteredSortedTopics = useMemo(() => {
    const q = topicsSearch.trim().toLowerCase();
    const list = q
      ? topics.filter(
          t =>
            t.subject.toLowerCase().includes(q) ||
            t.topic.toLowerCase().includes(q)
        )
      : [...topics];

    const urgencyRank = (t: SpacedTopic): number => {
      const urgent = todaysReviews.some(r => r.topicId === t.id && r.status === 'overdue');
      if (urgent) return 0;
      const soon = todaysReviews.some(r => r.topicId === t.id && r.status === 'pending');
      if (soon) return 1;
      if (topicIsMastered(t)) return 3;
      return 2;
    };

    list.sort((a, b) => {
      if (topicsSort === 'subject') {
        const c = a.subject.localeCompare(b.subject, 'pt-BR', { sensitivity: 'base' });
        if (c !== 0) return c;
        return a.topic.localeCompare(b.topic, 'pt-BR', { sensitivity: 'base' });
      }
      if (topicsSort === 'studyDate') {
        const da = new Date(a.study_date + 'T00:00:00').getTime();
        const db = new Date(b.study_date + 'T00:00:00').getTime();
        if (db !== da) return db - da;
        return a.topic.localeCompare(b.topic, 'pt-BR', { sensitivity: 'base' });
      }
      const ra = urgencyRank(a);
      const rb = urgencyRank(b);
      if (ra !== rb) return ra - rb;
      const na = getNextReviewDueDate(a)?.getTime() ?? Infinity;
      const nb = getNextReviewDueDate(b)?.getTime() ?? Infinity;
      if (na !== nb) return na - nb;
      return a.topic.localeCompare(b.topic, 'pt-BR', { sensitivity: 'base' });
    });

    return list;
  }, [topics, topicsSearch, topicsSort, todaysReviews]);

  const spacedPlanningStats = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m0 = calendarMonth.getMonth();
    const upcomingByDay = new Map<string, number>();
    const doneByDay = new Map<string, number>();

    topics.forEach(t => {
      collectUpcomingDueDates(t).forEach(d => {
        if (d.getFullYear() === y && d.getMonth() === m0) {
          const k = dateToLocalISO(d);
          upcomingByDay.set(k, (upcomingByDay.get(k) || 0) + 1);
        }
      });
      const dc = t.review_completion_dates || {};
      Object.values(dc).forEach(v => {
        if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
        const [yy, mm] = v.split('-').map(Number);
        if (yy === y && mm - 1 === m0) {
          doneByDay.set(v, (doneByDay.get(v) || 0) + 1);
        }
      });
    });

    const monthStart = new Date(y, m0, 1);
    const daysInMonth = new Date(y, m0 + 1, 0).getDate();
    const firstDow = monthStart.getDay();
    const startPad = (firstDow + 6) % 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: {
      iso: string | null;
      dayNum: number | null;
      upcoming: number;
      done: number;
      isToday: boolean;
    }[] = [];

    const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startPad + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push({ iso: null, dayNum: null, upcoming: 0, done: 0, isToday: false });
        continue;
      }
      const cellDate = new Date(y, m0, dayNum);
      cellDate.setHours(0, 0, 0, 0);
      const iso = dateToLocalISO(cellDate);
      cells.push({
        iso,
        dayNum,
        upcoming: upcomingByDay.get(iso) || 0,
        done: doneByDay.get(iso) || 0,
        isToday: cellDate.getTime() === today.getTime(),
      });
    }

    let maxMix = 1;
    cells.forEach(c => {
      const t = c.upcoming + c.done;
      if (t > maxMix) maxMix = t;
    });

    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const anchorMonday = weekStartMonday(today0);
    const weekBuckets: { weekStartISO: string; label: string; count: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const ws = new Date(anchorMonday);
      ws.setDate(anchorMonday.getDate() - w * 7);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      we.setHours(23, 59, 59, 999);
      const weekStartISO = dateToLocalISO(ws);
      let count = 0;
      topics.forEach(topic => {
        const dates = topic.review_completion_dates || {};
        Object.values(dates).forEach(v => {
          if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
          const cd = new Date(v + 'T00:00:00');
          cd.setHours(0, 0, 0, 0);
          if (cd >= ws && cd <= we) count += 1;
        });
      });
      weekBuckets.push({
        weekStartISO,
        label: `${ws.getDate().toString().padStart(2, '0')}/${String(ws.getMonth() + 1).padStart(2, '0')}`,
        count,
      });
    }

    let late = 0;
    let onTime = 0;
    topics.forEach(topic => {
      if (isAdaptiveSrsAlgorithm(topic.srs_algorithm)) return;
      const planIntervals = getIntervalsForCycles(topic.cycles || 4);
      const dates = topic.review_completion_dates || {};
      for (const [k, completed] of Object.entries(dates)) {
        if (!/^\d+$/.test(k)) continue;
        const interval = Number(k);
        if (!planIntervals.includes(interval)) continue;
        if (typeof completed !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(completed)) continue;
        const planned = addCalendarDays(topic.study_date, interval);
        if (completed > planned) late += 1;
        else onTime += 1;
      }
    });
    const lateDen = late + onTime;
    const lateRatePct = lateDen > 0 ? Math.round((late / lateDen) * 100) : null;

    const masteredDurations: number[] = [];
    topics.forEach(topic => {
      if (!topicIsMastered(topic)) return;
      const study = new Date(topic.study_date + 'T00:00:00');
      study.setHours(0, 0, 0, 0);
      let maxD: Date | null = null;
      Object.values(topic.review_completion_dates || {}).forEach(v => {
        if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
        const cd = new Date(v + 'T00:00:00');
        cd.setHours(0, 0, 0, 0);
        if (!maxD || cd > maxD) maxD = cd;
      });
      if (!maxD) return;
      const days = Math.round((maxD.getTime() - study.getTime()) / 86400000);
      if (days >= 0) masteredDurations.push(days);
    });
    const avgDaysToMastered =
      masteredDurations.length > 0
        ? Math.round(masteredDurations.reduce((a, b) => a + b, 0) / masteredDurations.length)
        : null;

    return {
      cells,
      maxMix,
      monthTitle: calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      weekBuckets,
      late,
      onTime,
      lateRatePct,
      avgDaysToMastered,
      masteredCount: masteredDurations.length,
    };
  }, [topics, calendarMonth]);

  if (!topicsHydrated && !topicsLoadError) {
    return (
      <div
        className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-2 md:space-y-10 md:px-6 xl:px-0"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="sr-only">Carregando revisões espaçadas</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="h-24 animate-pulse rounded-3xl bg-slate-200/90 dark:bg-white/10" />
          <div className="h-24 animate-pulse rounded-3xl bg-slate-200/90 dark:bg-white/10 sm:col-span-1 md:col-span-2" />
        </div>
        <div className="space-y-3">
          <div className="h-8 w-56 max-w-full animate-pulse rounded-xl bg-slate-200/90 dark:bg-white/10" />
          <div className="h-6 w-72 max-w-full animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
        </div>
        <div className="grid min-h-0 grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
          <div className="flex min-h-[300px] flex-col xl:col-span-7">
            <div className="mb-4 h-7 w-48 animate-pulse rounded-lg bg-slate-200/80 dark:bg-white/10" />
            <div className="flex min-h-[300px] flex-1 flex-col space-y-3 rounded-3xl border border-slate-200 bg-white/50 p-4 dark:border-white/5 dark:bg-[#1a1a1a]/40">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5"
                />
              ))}
            </div>
          </div>
          <div className="flex min-h-[300px] flex-col xl:col-span-5">
            <div className="mb-4 h-7 w-40 animate-pulse rounded-lg bg-slate-200/80 dark:bg-white/10" />
            <div className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-100/80 dark:border-white/5 dark:bg-black/20">
              <div className="space-y-2 border-b border-slate-200/90 p-3 dark:border-white/10">
                <div className="h-10 animate-pulse rounded-xl bg-white dark:bg-white/10" />
                <div className="h-10 animate-pulse rounded-xl bg-white dark:bg-white/10" />
              </div>
              <div className="flex-1 space-y-3 p-4">
                <div className="h-36 animate-pulse rounded-3xl bg-white dark:bg-[#1a1a1a]" />
                <div className="h-36 animate-pulse rounded-3xl bg-white dark:bg-[#1a1a1a]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (topicsLoadError && topics.length === 0 && topicsHydrated) {
    return (
      <div className="mx-auto max-w-lg animate-in fade-in duration-500 px-4 py-12">
        <div
          className="rounded-3xl border-2 border-red-200 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20"
          role="alert"
        >
          <AlertCircle className="mx-auto mb-4 text-red-500" size={40} aria-hidden />
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Não foi possível carregar
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">{topicsLoadError}</p>
          <button
            type="button"
            onClick={retryLoadData}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-sky-700"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-6 xl:px-0 max-w-6xl mx-auto h-full flex flex-col font-sans">

      {profileLoadError && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20"
          role="status"
        >
          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
            Ofensiva e XP podem estar desatualizados: {profileLoadError}
          </p>
          <button
            type="button"
            onClick={() => void fetchProfile()}
            className="shrink-0 text-[10px] font-black uppercase tracking-widest text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
          >
            Recarregar perfil
          </button>
        </div>
      )}
      
      {/* GAMIFICATION HEADER */}
      <div className="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {profileSettled ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1a1a1a]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 sm:h-12 sm:w-12">
                <Flame size={20} className="sm:h-6 sm:w-6 animate-pulse" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 sm:text-[10px]">
                  Ofensiva
                </p>
                <p className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                  {profile?.productivityStats?.streak || 0} Dias
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col justify-center rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1a1a1a] sm:col-span-1 md:col-span-2"
            >
              <div className="mb-2 flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <Award className="text-amber-500" size={18} />
                  <span className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white sm:text-sm">
                    Nível {getLevel(profile?.arcadia_score || 0)}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 sm:text-[10px]">
                  {(profile?.arcadia_score || 0) % 500} / 500 XP
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5 sm:h-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${getProgressToNextLevel(profile?.arcadia_score || 0)}%` }}
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                />
              </div>
            </motion.div>
          </>
        ) : (
          <>
            <div className="h-24 animate-pulse rounded-3xl bg-slate-200/90 dark:bg-white/10" />
            <div className="h-24 animate-pulse rounded-3xl bg-slate-200/90 dark:bg-white/10 sm:col-span-1 md:col-span-2" />
          </>
        )}
      </div>

      {!reminderPanelDismissed && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <Bell size={18} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Lembretes (navegador)
                </p>
                <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                  Preferências ficam salvas neste aparelho (localStorage — não precisa de SQL). No horário escolhido,
                  se a página puder rodar o timer, avisamos quando há revisões na fila de hoje. O navegador pode
                  silenciar abas em segundo plano; e-mail fixo exige Edge Function + cron no Supabase.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex cursor-pointer items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={e => setReminderEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Ativar
              </label>
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span className="font-black uppercase tracking-widest text-slate-400">Horário</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={e => setReminderTime(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-black/40 dark:text-slate-100"
                />
              </label>
              <button
                type="button"
                onClick={() => void requestReminderPermission()}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 dark:border-white/10 dark:bg-black/30 dark:text-slate-300 dark:hover:border-sky-800 dark:hover:bg-sky-950/40"
              >
                Permitir notificações
              </button>
              <button
                type="button"
                onClick={sendTestSpacedNotification}
                className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
              >
                Testar agora
              </button>
              <button
                type="button"
                onClick={() => setReminderPanelDismissed(true)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-black/40 dark:text-slate-400"
              >
                Ocultar painel
              </button>
            </div>
          </div>
          {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
            <p className="mt-3 text-[9px] font-bold text-red-600 dark:text-red-400">
              Notificações bloqueadas para este site. Ajuste nas configurações do navegador para reativar.
            </p>
          )}
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-[#e0f2fe] dark:bg-sky-900/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-sky-200 dark:border-sky-800 mb-3 sm:mb-4 shadow-sm">
              <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">Método Ebbinghaus</span>
           </div>
           <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none flex flex-wrap items-center gap-2 sm:gap-4">
             Revisão Espaçada
           </h2>
           <div className="flex items-center gap-3 mt-2">
             <p className="text-base sm:text-lg font-medium text-slate-500 italic">Derrote o Monstro do Esquecimento!</p>
             <motion.div
               animate={{ y: [0, -5, 0] }}
               transition={{ repeat: Infinity, duration: 2 }}
             >
               <Ghost className="text-slate-300 dark:text-slate-700" size={24} />
             </motion.div>
           </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-2">
          {reminderPanelDismissed && (
            <button
              type="button"
              onClick={() => setReminderPanelDismissed(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-900 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
              title="Reabrir configuração de lembretes do navegador"
            >
              <Bell size={16} className="shrink-0" aria-hidden />
              <span className="hidden sm:inline">Lembretes</span>
              <span className="text-amber-700 dark:text-amber-300">{reminderTime}</span>
              {reminderEnabled && (
                <span className="rounded-md bg-amber-200/80 px-1.5 py-0.5 text-[8px] dark:bg-amber-900/50">on</span>
              )}
            </button>
          )}
          <motion.button 
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAdding(true)}
            className="group relative flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all overflow-hidden"
          >
             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
             <Plus size={16} className="relative z-10" /> 
             <span className="relative z-10">Registrar Estudo</span>
             <motion.div 
               animate={{ scale: [1, 1.2, 1] }}
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="absolute -right-1 -top-1"
             >
               <Sparkles size={12} className="text-white/50" />
             </motion.div>
          </motion.button>
        </div>
      </header>

      {/* CREATE MODAL — portal evita ficar atrás da sidebar (stacking context do layout) */}
      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {isAdding && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
             role="presentation"
             onClick={() => setIsAdding(false)}
           >
              <motion.div 
                ref={addTopicDialogRef}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border-4 border-sky-100 dark:border-sky-900 shadow-2xl relative overflow-y-auto max-h-[90vh]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="spaced-new-topic-title"
                onClick={e => e.stopPropagation()}
              >
                 <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Plus size={20} />
                      </div>
                      <h3 id="spaced-new-topic-title" className="text-xl font-black text-slate-900 dark:text-white uppercase">Novo Tópico</h3>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsAdding(false)} 
                      className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                      aria-label="Fechar"
                    >
                      <X className="text-slate-400" />
                    </button>
                 </div>

                 <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                         <label htmlFor="spaced-study-date" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Data do Estudo</label>
                         <div className="relative">
                           <Calendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
                           <input 
                              id="spaced-study-date"
                              type="date"
                              value={studyDate} 
                              onChange={e => setStudyDate(e.target.value)}
                              className="w-full pl-12 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-sky-500 transition-all"
                           />
                         </div>
                      </div>
                      <div>
                         <label htmlFor="spaced-subject" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Disciplina / Matéria</label>
                         <div className="relative">
                           <BookOpen className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
                           <input 
                              id="spaced-subject"
                              type="text"
                              value={subject} 
                              onChange={e => setSubject(e.target.value)}
                              placeholder="Ex: Direito Civil"
                              autoComplete="off"
                              className="w-full pl-12 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-sky-500 transition-all"
                           />
                         </div>
                      </div>
                      <div>
                         <label htmlFor="spaced-topic-name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Tópico Específico</label>
                         <div className="relative">
                           <Target className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
                           <input 
                              id="spaced-topic-name"
                              type="text"
                              value={topicName} 
                              onChange={e => setTopicName(e.target.value)}
                              placeholder="Ex: Teoria das Incapacidades"
                              autoComplete="off"
                              className="w-full pl-12 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-sky-500 transition-all"
                           />
                         </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-violet-100 bg-violet-50/80 p-4 dark:border-violet-900/30 dark:bg-violet-950/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-300">
                        Material no app (opcional)
                      </p>
                      <p className="mt-1 text-[9px] leading-snug text-slate-500 dark:text-slate-400">
                        Atalhos para Flashcards, Resumidor e Banco de questões usam o texto abaixo na busca ou
                        pré-preenchimento. Vazio = matéria + tópico. No banco, abre o filtro “revisar hoje” para
                        esta matéria/tópico.
                      </p>
                      <label htmlFor="spaced-new-material-kind" className="mt-3 block text-[9px] font-black uppercase text-slate-400">
                        Destaque nos cards
                      </label>
                      <select
                        id="spaced-new-material-kind"
                        value={newTopicMaterialKind}
                        onChange={e => setNewTopicMaterialKind(e.target.value as SpacedMaterialKind)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-black/40 dark:text-slate-200"
                      >
                        <option value="both">Flashcards e resumidor</option>
                        <option value="flashcards">Só flashcards</option>
                        <option value="summarizer">Só resumidor</option>
                        <option value="question_bank">Só banco de questões</option>
                        <option value="none">Sem preferência (ambos discretos)</option>
                      </select>
                      <label htmlFor="spaced-new-material-query" className="mt-3 block text-[9px] font-black uppercase text-slate-400">
                        Texto para busca / pré-preenchimento
                      </label>
                      <input
                        id="spaced-new-material-query"
                        type="text"
                        value={newTopicMaterialQuery}
                        onChange={e => setNewTopicMaterialQuery(e.target.value)}
                        placeholder="Ex.: prescrição civil — matéria X"
                        autoComplete="off"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-black/40 dark:text-slate-100"
                      />
                    </div>

                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 dark:border-sky-900/30 dark:bg-sky-900/10">
                       <div className="mb-3">
                          <label htmlFor="spaced-srs-algorithm" className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 flex items-center gap-2">
                            <Brain size={12} /> Algoritmo
                          </label>
                          <select
                            id="spaced-srs-algorithm"
                            value={newTopicAlgorithm}
                            onChange={e => setNewTopicAlgorithm(e.target.value as SrsAlgorithm)}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-black/40 dark:text-slate-200"
                          >
                            <option value="fixed">Intervalos fixos (Ebbinghaus + qualidade)</option>
                            <option value="sm2">Adaptativo SM-2 (Again / Hard / Good / Easy)</option>
                            <option value="fsrs">Adaptativo FSRS (Again / Hard / Good / Easy)</option>
                          </select>
                          <p className="mt-2 text-[9px] leading-snug text-slate-500 dark:text-slate-400">
                            {newTopicAlgorithm === 'fsrs'
                              ? 'FSRS (biblioteca ts-fsrs): scheduler moderno, melhor previsão de esquecimento que SM-2 clássico. Intervalos em dias (sem steps de minutos), alinhado ao calendário do app.'
                              : newTopicAlgorithm === 'sm2'
                                ? 'SuperMemo 2 simplificado: o próximo prazo depende da qualidade e do fator de facilidade. FSRS costuma ser mais preciso para retenção a longo prazo.'
                                : 'Escada clássica 1d → 3d → 7d… Hard/Easy deslocam levemente os prazos; Again repete o degrau no dia seguinte.'}
                          </p>
                       </div>
                       <div className="flex justify-between items-center mb-4">
                          <p className="text-[10px] font-black uppercase text-sky-600 dark:text-sky-400 tracking-widest">
                            {newTopicAlgorithm === 'sm2' || newTopicAlgorithm === 'fsrs'
                              ? 'Meta visual (ciclos)'
                              : 'Plano de Revisão'}
                          </p>
                          <div className="flex items-center gap-2">
                             <label htmlFor="spaced-cycles-select" className="text-[10px] font-bold text-slate-400">Ciclos:</label>
                             <select 
                               id="spaced-cycles-select"
                               value={cycles}
                               onChange={(e) => setCycles(parseInt(e.target.value))}
                               className="bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black p-1 outline-none"
                             >
                               {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                 <option key={n} value={n}>{n}</option>
                               ))}
                             </select>
                          </div>
                       </div>
                       {newTopicAlgorithm === 'fixed' ? (
                         <>
                           <div className="flex justify-between gap-1">
                             {getIntervalsForCycles(cycles).map(int => (
                               <div key={int} className="flex flex-col items-center gap-1 flex-1">
                                 <div className="w-full h-1 bg-sky-200 dark:bg-sky-800 rounded-full" />
                                 <span className="text-[8px] font-bold text-sky-600 dark:text-sky-400">{getIntervalLabel(int)}</span>
                               </div>
                             ))}
                           </div>
                           <p className="text-[9px] text-slate-400 mt-3 italic">
                             * Até completar {getIntervalLabel(getIntervalsForCycles(cycles).slice(-1)[0])} nesta escada.
                           </p>
                         </>
                       ) : (
                         <p className="text-[9px] text-slate-500 dark:text-slate-400">
                           {newTopicAlgorithm === 'fsrs'
                             ? 'Primeira revisão 1 dia após a data do estudo; depois o FSRS calcula estabilidade e dificuldade a cada resposta (Again / Hard / Good / Easy).'
                             : 'Primeira revisão 1 dia após a data do estudo; depois os intervalos crescem conforme Good/Easy ou reiniciam com Again.'}
                         </p>
                       )}
                    </div>

                    <button 
                       type="button"
                       onClick={handleAddTopic}
                       className="w-full py-5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-3 group"
                    >
                       <span>Agendar Revisões</span>
                       <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>
              </motion.div>
           </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}

      {/* Confirmação de exclusão (substitui window.confirm) */}
      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            role="presentation"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              ref={deleteDialogRef}
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="spaced-delete-title"
              aria-describedby="spaced-delete-desc"
              className="w-full max-w-md rounded-3xl border-2 border-red-100 bg-white p-6 shadow-2xl dark:border-red-900/30 dark:bg-[#1a1a1a]"
              onClick={e => e.stopPropagation()}
            >
              <h2 id="spaced-delete-title" className="text-lg font-black uppercase text-slate-900 dark:text-white">
                Remover tópico?
              </h2>
              <p id="spaced-delete-desc" className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                {topicPendingDelete
                  ? `“${topicPendingDelete.topic}” será excluído com todo o histórico de revisões. Esta ação não pode ser desfeita.`
                  : 'Este tópico será excluído com todo o histórico de revisões. Esta ação não pode ser desfeita.'}
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  ref={deleteCancelRef}
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDeleteTopic()}
                  className="rounded-xl bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-red-700"
                >
                  Remover
                </button>
              </div>
            </motion.div>
          </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}

      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {qualityPickTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            role="presentation"
            onClick={() => setQualityPickTask(null)}
          >
            <motion.div
              ref={qualityDialogRef}
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="spaced-quality-title"
              aria-describedby="spaced-quality-desc"
              className="w-full max-w-md rounded-3xl border-2 border-sky-100 bg-white p-6 shadow-2xl dark:border-sky-900/40 dark:bg-[#1a1a1a]"
              onClick={e => e.stopPropagation()}
            >
              <h2 id="spaced-quality-title" className="text-lg font-black uppercase text-slate-900 dark:text-white">
                Qualidade da revisão
              </h2>
              <p id="spaced-quality-desc" className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                “{qualityPickTask.topic}” — isso ajusta o próximo intervalo (FSRS / SM-2) ou a escada fixa (Hard/Easy/Again).
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => void finalizeReview(qualityPickTask, 'again')}
                  className="flex flex-col items-center gap-1 rounded-2xl border-2 border-red-100 bg-red-50 px-2 py-3 text-[10px] font-black uppercase tracking-tight text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                >
                  <ThumbsDown size={20} aria-hidden />
                  Again
                </button>
                <button
                  type="button"
                  onClick={() => void finalizeReview(qualityPickTask, 'hard')}
                  className="flex flex-col items-center gap-1 rounded-2xl border-2 border-amber-100 bg-amber-50 px-2 py-3 text-[10px] font-black uppercase tracking-tight text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  <Minus size={20} aria-hidden />
                  Hard
                </button>
                <button
                  type="button"
                  onClick={() => void finalizeReview(qualityPickTask, 'good')}
                  className="flex flex-col items-center gap-1 rounded-2xl border-2 border-sky-100 bg-sky-50 px-2 py-3 text-[10px] font-black uppercase tracking-tight text-sky-800 transition-colors hover:bg-sky-100 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200"
                >
                  <ThumbsUp size={20} aria-hidden />
                  Good
                </button>
                <button
                  type="button"
                  onClick={() => void finalizeReview(qualityPickTask, 'easy')}
                  className="flex flex-col items-center gap-1 rounded-2xl border-2 border-emerald-100 bg-emerald-50 px-2 py-3 text-[10px] font-black uppercase tracking-tight text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                >
                  <Zap size={20} aria-hidden />
                  Easy
                </button>
              </div>
              <button
                type="button"
                onClick={() => setQualityPickTask(null)}
                className="mt-4 w-full rounded-xl py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 xl:h-full min-h-0">
         
         {/* LEFT: REVIEWS FOR TODAY */}
         <div className="xl:col-span-7 flex flex-col xl:h-full min-h-[400px]">
            <div className="mb-4 flex flex-wrap items-center gap-3">
               <Calendar className="text-sky-500" size={20} aria-hidden />
               <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white sm:text-lg">Revisões de Hoje</h3>
               <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">{todaysReviews.length}</span>
               {lastReviewUndo && (
                 <button
                   type="button"
                   onClick={() => void undoLastReview()}
                   className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 dark:hover:border-sky-800 dark:hover:bg-sky-950/40"
                   aria-label="Desfazer última revisão concluída"
                 >
                   <RotateCcw size={12} className="shrink-0" aria-hidden />
                   Desfazer última
                 </button>
               )}
            </div>
            <p className="mb-2 text-[9px] font-medium text-slate-400 dark:text-slate-500">
              Ao concluir uma revisão, indique a qualidade (Again / Hard / Good / Easy) para ajustar o próximo intervalo — essencial nos modos adaptativos (FSRS e SM-2).
            </p>

            <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-3xl xl:rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden flex flex-col relative min-h-[300px]">
               {todaysReviews.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                     <motion.div 
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       className="relative"
                     >
                        <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full" />
                        <Trophy size={80} className="text-amber-500 relative z-10" />
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                          className="absolute -inset-4 border-2 border-dashed border-amber-200 dark:border-amber-900/30 rounded-full"
                        />
                     </motion.div>
                     
                     <div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Missão Cumprida!</p>
                        <p className="text-sm font-bold text-slate-400 mt-2">Você derrotou a curva do esquecimento hoje.</p>
                     </div>

                     <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-[2rem] w-full max-w-sm border border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atividade da Semana</p>
                        <p className="text-[9px] text-slate-400 mb-3 mt-1 leading-snug">
                          Dias em que você concluiu pelo menos uma revisão (domingo a sábado).
                        </p>
                        <div className="flex justify-between items-center">
                           {daysOfWeek.map((day, i) => (
                              <div key={i} className="flex flex-col items-center gap-2">
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${weeklyActivity[i] ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-200 dark:bg-white/5 text-slate-400'}`}>
                                    {weeklyActivity[i] ? <CheckCircle2 size={14} /> : day}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     <button 
                       type="button"
                       onClick={() => setIsAdding(true)}
                       className="text-sky-500 font-bold text-xs uppercase tracking-widest hover:underline"
                     >
                       + Registrar novo estudo
                     </button>
                  </div>
               ) : (
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
                     {todaysReviews.map(task => (
                         <div 
                            key={`${task.topicId}-${task.reviewKind}-${task.interval}`} 
                            role="button"
                            tabIndex={0}
                            aria-label={`Abrir notas: ${task.topic}, ${task.subject}`}
                            onClick={() => {
                              const topic = topics.find(t => t.id === task.topicId);
                              if (topic) openTopicContent(topic);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                const topic = topics.find(t => t.id === task.topicId);
                                if (topic) openTopicContent(topic);
                              }
                            }}
                            className={`group p-3 sm:p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer ${task.status === 'overdue' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-sky-200 dark:hover:border-sky-900'}`}
                         >
                           <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${task.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
                                 <span className="text-[8px] sm:text-[10px] font-black uppercase">Rev</span>
                                 <span className="text-xs sm:text-sm font-black leading-none">
                                   {task.reviewKind === 'fsrs'
                                     ? `FSRS${task.interval > 1 ? ` · ${task.interval}d` : ''}`
                                     : task.reviewKind === 'sm2'
                                       ? `SM-2${task.interval > 1 ? ` · ${task.interval}d` : ''}`
                                       : getIntervalLabel(task.interval)}
                                 </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                 <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white dark:bg-black/20 px-1.5 py-0.5 rounded border border-slate-100 dark:border-white/5 truncate max-w-[120px]">
                                       {task.subject}
                                    </span>
                                    {task.status === 'overdue' && <span className="text-[8px] sm:text-[9px] font-black uppercase text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Atrasado</span>}
                                 </div>
                                 <h4 className="font-bold text-slate-800 dark:text-slate-200 leading-tight text-sm sm:text-base truncate">{task.topic}</h4>
                                 {(() => {
                                   const full = topics.find(x => x.id === task.topicId);
                                   if (!full) return null;
                                   const mk = normalizeMaterialKind(full.linked_material_kind);
                                   const hiFlash = mk === 'flashcards' || mk === 'both';
                                   const hiSum = mk === 'summarizer' || mk === 'both';
                                   const hiQB = mk === 'question_bank';
                                   const q = encodeURIComponent(getSpacedMaterialQuery(full));
                                   return (
                                     <div
                                       className="mt-2 flex flex-wrap gap-1.5"
                                       onClick={e => e.stopPropagation()}
                                       role="group"
                                       aria-label="Material relacionado"
                                     >
                                       <button
                                         type="button"
                                         onClick={() => navigate(`/flashcards?q=${q}`)}
                                         className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-tight ${
                                           hiFlash
                                             ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-100'
                                             : 'border-slate-200 bg-white/80 text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400'
                                         }`}
                                       >
                                         Flashcards
                                       </button>
                                       <button
                                         type="button"
                                         onClick={() => navigate(`/intelligent_summarizer?prefill=${q}`)}
                                         className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-tight ${
                                           hiSum
                                             ? 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100'
                                             : 'border-slate-200 bg-white/80 text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400'
                                         }`}
                                       >
                                         Resumidor
                                       </button>
                                       <button
                                         type="button"
                                         onClick={() => navigateToQuestionBankForTopic(navigate, full)}
                                         className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-tight ${
                                           hiQB
                                             ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
                                             : 'border-slate-200 bg-white/80 text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400'
                                         }`}
                                       >
                                         Questões
                                       </button>
                                     </div>
                                   );
                                 })()}
                              </div>
                           </div>
                           <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQualityPickTask(task);
                              }}
                              aria-label={`Registrar qualidade da revisão para ${task.topic}`}
                              className={`p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center gap-2 sm:block ${task.status === 'overdue' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white dark:bg-black/20 text-slate-300 hover:text-sky-50 text-xs sm:text-base font-bold hover:bg-sky-50 dark:hover:bg-sky-900/20'}`}
                           >
                              <CheckCircle2 size={24} className="shrink-0" aria-hidden />
                              <span className="sm:hidden">Concluir Revisão</span>
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* RIGHT: ALL TOPICS */}
         <div className="xl:col-span-5 flex flex-col xl:h-full min-h-[400px]">
            <div className="flex items-center gap-3 mb-4">
               <BookOpen className="text-slate-400" size={20} />
               <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Tópicos Ativos</h3>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-black/20 rounded-3xl xl:rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col min-h-[300px]">
               <div className="shrink-0 space-y-2 border-b border-slate-200/90 bg-white/60 p-3 dark:border-white/10 dark:bg-black/25">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={topicsSearch}
                      onChange={e => setTopicsSearch(e.target.value)}
                      placeholder="Buscar por matéria ou tópico..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-100"
                      aria-label="Filtrar tópicos por matéria ou nome"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label htmlFor="spaced-topics-sort" className="sr-only">
                      Ordenar lista de tópicos
                    </label>
                    <select
                      id="spaced-topics-sort"
                      value={topicsSort}
                      onChange={e => setTopicsSort(e.target.value as TopicsSortMode)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300 sm:w-auto sm:min-w-[220px]"
                    >
                      <option value="overdueFirst">Atrasados primeiro</option>
                      <option value="subject">Matéria (A–Z)</option>
                      <option value="studyDate">Data do estudo (mais recente)</option>
                    </select>
                    {topics.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400 sm:text-right">
                        {filteredSortedTopics.length === topics.length
                          ? `${topics.length} tópico${topics.length === 1 ? '' : 's'}`
                          : `${filteredSortedTopics.length} de ${topics.length}`}
                      </span>
                    )}
                  </div>
               </div>
               <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 custom-scrollbar">
                  {topics.length === 0 ? (
                     <div className="text-center py-20 opacity-40">
                        <p className="text-xs font-black uppercase">Nenhum tópico registrado</p>
                     </div>
                  ) : filteredSortedTopics.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                        Nenhum tópico corresponde à busca
                      </p>
                      <button
                        type="button"
                        onClick={() => setTopicsSearch('')}
                        className="text-[10px] font-black uppercase tracking-widest text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
                      >
                        Limpar busca
                      </button>
                    </div>
                  ) : (
                    filteredSortedTopics.map(t => {
                     const topicIntervals = getIntervalsForCycles(t.cycles || 4);
                     const algo = t.srs_algorithm || 'fixed';
                     const isSm2 = algo === 'sm2';
                     const isFsrs = algo === 'fsrs';
                     const isAdaptive = isSm2 || isFsrs;
                     const adaptiveReps = isFsrs
                       ? getFsrsRepsFromSnapshot(t.srs_fsrs_card)
                       : (t.srs_repetitions ?? 0);
                     const isMastered = topicIsMastered(t);
                     const isUrgent = todaysReviews.some(r => r.topicId === t.id && r.status === 'overdue');
                     const isDueSoon = todaysReviews.some(r => r.topicId === t.id && r.status === 'pending');
                     const nextDueDate = getNextReviewDueDate(t);
                     const nextHint = nextDueDate ? formatNextReviewHint(nextDueDate) : null;

                     return (
                        <motion.div 
                          layout
                          key={t.id} 
                          role="button"
                          tabIndex={0}
                          aria-label={`Abrir notas do tópico ${t.topic}, matéria ${t.subject}`}
                          onClick={() => openTopicContent(t)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openTopicContent(t);
                            }
                          }}
                          className={`bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl shadow-sm border transition-all relative group cursor-pointer ${isUrgent ? 'border-red-200 dark:border-red-900/30 ring-1 ring-red-500/10' : 'border-slate-200 dark:border-white/5'}`}
                        >
                           <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(t.id); }} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 dark:bg-black/20 rounded-xl" aria-label={`Remover tópico ${t.topic}`}>
                              <Trash2 size={14} />
                           </button>
                           
                           <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 dark:bg-black/20 px-2 py-1 rounded-lg border border-slate-100 dark:border-white/5">{t.subject}</span>
                                  {isSm2 && (
                                    <span className="text-[8px] font-black uppercase text-violet-600 bg-violet-50 dark:bg-violet-900/25 dark:text-violet-300 px-2 py-0.5 rounded-lg border border-violet-100 dark:border-violet-800/40">
                                      SM-2
                                    </span>
                                  )}
                                  {isFsrs && (
                                    <span className="text-[8px] font-black uppercase text-teal-700 bg-teal-50 dark:bg-teal-900/25 dark:text-teal-200 px-2 py-0.5 rounded-lg border border-teal-100 dark:border-teal-800/40">
                                      FSRS
                                    </span>
                                  )}
                                </div>
                                {isMastered ? (
                                  <span className="text-[9px] font-black uppercase text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <ShieldCheck size={12} /> Consolidado
                                  </span>
                                ) : isUrgent ? (
                                  <motion.span 
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="text-[9px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg flex items-center gap-1"
                                  >
                                    <AlertCircle size={12} /> Crítico
                                  </motion.span>
                                ) : isDueSoon ? (
                                  <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <Clock size={12} /> Revisar Hoje
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black uppercase text-sky-500 bg-sky-50 dark:bg-sky-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <Brain size={12} /> Em Memória
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight pr-8">{t.topic}</h4>
                              {(() => {
                                const mk = normalizeMaterialKind(t.linked_material_kind);
                                const hiFlash = mk === 'flashcards' || mk === 'both';
                                const hiSum = mk === 'summarizer' || mk === 'both';
                                const hiQB = mk === 'question_bank';
                                const q = encodeURIComponent(getSpacedMaterialQuery(t));
                                return (
                                  <div
                                    className="mt-3 flex flex-wrap items-center gap-2"
                                    onClick={e => e.stopPropagation()}
                                    onKeyDown={e => e.stopPropagation()}
                                    role="group"
                                    aria-label="Abrir material relacionado"
                                  >
                                    <span className="w-full text-[8px] font-black uppercase tracking-widest text-slate-400">
                                      Material
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/flashcards?q=${q}`)}
                                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-tight transition-colors ${
                                        hiFlash
                                          ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-100'
                                          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-black/30 dark:text-slate-400'
                                      }`}
                                    >
                                      <BrainCircuit size={12} aria-hidden /> Abrir flashcards
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/intelligent_summarizer?prefill=${q}`)}
                                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-tight transition-colors ${
                                        hiSum
                                          ? 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100'
                                          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-black/30 dark:text-slate-400'
                                      }`}
                                    >
                                      <Sparkles size={12} aria-hidden /> Abrir resumidor
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => navigateToQuestionBankForTopic(navigate, t)}
                                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-tight transition-colors ${
                                        hiQB
                                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
                                          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-black/30 dark:text-slate-400'
                                      }`}
                                    >
                                      <BookOpen size={12} aria-hidden /> Banco de questões
                                    </button>
                                  </div>
                                );
                              })()}
                           </div>

                           <div className="flex items-center gap-1.5 mb-4">
                              {topicIntervals.map((int, idx) => {
                                const filled = isAdaptive
                                  ? idx < Math.min(topicIntervals.length, adaptiveReps)
                                  : t.reviews_completed.includes(int);
                                return (
                                 <div 
                                   key={int} 
                                   className={`h-2 flex-1 rounded-full transition-all duration-500 ${filled ? 'bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm' : 'bg-slate-100 dark:bg-white/5'}`}
                                   title={
                                     isFsrs
                                       ? `Revisões FSRS: ${adaptiveReps}`
                                       : isSm2
                                         ? `Revisões SM-2: ${t.srs_repetitions ?? 0}`
                                         : getIntervalLabel(int)
                                   }
                                 />
                                );
                              })}
                           </div>

                           {nextHint && nextDueDate && (
                             <div
                               className={`mb-3 flex items-start gap-2 rounded-2xl border px-3 py-2.5 ${
                                 nextHint.overdue
                                   ? 'border-red-100 bg-red-50/80 dark:border-red-900/30 dark:bg-red-950/20'
                                   : 'border-sky-100 bg-sky-50/60 dark:border-sky-900/25 dark:bg-sky-950/15'
                               }`}
                               title={`Previsão com base na data do estudo + intervalo (${nextDueDate.toLocaleDateString('pt-BR')})`}
                             >
                               <Calendar
                                 className={`mt-0.5 shrink-0 ${nextHint.overdue ? 'text-red-500' : 'text-sky-500'}`}
                                 size={15}
                                 aria-hidden
                               />
                               <div className="min-w-0">
                                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                   Próxima revisão
                                 </p>
                                 <p
                                   className={`text-xs font-black leading-tight ${
                                     nextHint.overdue
                                       ? 'text-red-700 dark:text-red-300'
                                       : 'text-slate-800 dark:text-slate-100'
                                   }`}
                                 >
                                   {nextHint.line}
                                   <span className="ml-1 font-bold normal-case text-slate-500 dark:text-slate-400">
                                     · {nextHint.sub}
                                   </span>
                                 </p>
                               </div>
                             </div>
                           )}
                           
                           <div className="flex justify-between items-center text-[10px] text-slate-500 font-black uppercase tracking-tight">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                  <TrendingUp size={12} className="text-sky-500" />
                                </div>
                                <span>
                                  Domínio:{' '}
                                  {isAdaptive
                                    ? Math.min(100, Math.round((adaptiveReps / Math.max(1, t.cycles || 4)) * 25))
                                    : Math.round((t.reviews_completed.length / (t.cycles || 4)) * 100)}
                                  %
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-slate-400" />
                                <span>{new Date(t.study_date + 'T00:00:00').toLocaleDateString()}</span>
                              </div>
                           </div>
                        </motion.div>
                     );
                    })
                  )}
               </div>
            </div>
         </div>

         <div className="xl:col-span-12 mt-2 flex min-h-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Target className="text-violet-500" size={20} aria-hidden />
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white sm:text-lg">
                Calendário e estatísticas
              </h3>
            </div>
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Próximas revisões (mês)
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Mês anterior"
                      className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                      onClick={() =>
                        setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                      }
                    >
                      <ChevronLeft size={18} aria-hidden />
                    </button>
                    <span className="min-w-[10rem] text-center text-xs font-black capitalize text-slate-800 dark:text-slate-100 sm:text-sm">
                      {spacedPlanningStats.monthTitle}
                    </span>
                    <button
                      type="button"
                      aria-label="Próximo mês"
                      className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                      onClick={() =>
                        setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                      }
                    >
                      <ChevronRight size={18} aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-tight text-slate-400">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {spacedPlanningStats.cells.map((c, idx) => {
                    if (c.dayNum == null) {
                      return <div key={`e-${idx}`} className="aspect-square rounded-lg bg-transparent" />;
                    }
                    const total = c.upcoming + c.done;
                    const intensity =
                      total === 0
                        ? 'bg-slate-50 dark:bg-white/5'
                        : total / spacedPlanningStats.maxMix >= 0.66
                          ? 'bg-amber-200/90 dark:bg-amber-900/40'
                          : total / spacedPlanningStats.maxMix >= 0.33
                            ? 'bg-amber-100/90 dark:bg-amber-900/25'
                            : 'bg-amber-50 dark:bg-amber-950/20';
                    const ring = c.isToday ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-[#1a1a1a]' : '';
                    return (
                      <div
                        key={c.iso}
                        title={
                          c.upcoming || c.done
                            ? `${c.upcoming} agendada(s), ${c.done} concluída(s)`
                            : 'Sem eventos'
                        }
                        className={`flex aspect-square flex-col items-center justify-center rounded-xl border border-slate-100 text-[10px] font-bold dark:border-white/5 ${intensity} ${ring}`}
                      >
                        <span className="text-slate-700 dark:text-slate-200">{c.dayNum}</span>
                        {total > 0 && (
                          <span className="mt-0.5 text-[8px] font-black uppercase text-slate-500 dark:text-slate-400">
                            {total}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-300 dark:bg-amber-700" aria-hidden />
                    Agendadas + concluídas no dia
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    Número no quadrado = total de eventos
                  </span>
                </div>
              </div>

              <div className="flex min-h-0 flex-col lg:h-full lg:min-h-0">
                <div className="flex w-full flex-col gap-4 lg:mt-auto">
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] sm:p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Revisões concluídas por semana
                    </p>
                    <p className="mt-1 text-[9px] leading-snug text-slate-400">
                      Contagem de registros de conclusão (últimas 8 semanas, semana começa na segunda).
                    </p>
                    <div className="mt-4 flex h-36 items-end justify-between gap-1 border-b border-slate-100 pb-1 dark:border-white/10">
                      {(() => {
                        const maxC = Math.max(1, ...spacedPlanningStats.weekBuckets.map(w => w.count));
                        const barMaxPx = 112;
                        return spacedPlanningStats.weekBuckets.map(w => (
                          <div
                            key={w.weekStartISO}
                            className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-end gap-1"
                            title={`Semana de ${w.label}: ${w.count} conclusão(ões)`}
                          >
                            <div
                              className="w-full max-w-[2rem] rounded-t-md bg-gradient-to-t from-sky-600 to-sky-400 transition-all"
                              style={{
                                height: `${Math.max(4, Math.round((w.count / maxC) * barMaxPx))}px`,
                              }}
                            />
                            <span className="truncate text-[8px] font-bold text-slate-400">{w.label}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] sm:p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Taxa de atraso
                      </p>
                      <p className="mt-1 text-[9px] leading-snug text-slate-400">
                        Modo escada fixa: conclusão depois de{' '}
                        <span className="font-bold text-slate-500">estudo + intervalo</span> (sem offset).
                        SM-2 e FSRS não entram (sem prazo fixo por degrau).
                      </p>
                      {spacedPlanningStats.lateRatePct == null ? (
                        <p className="mt-4 text-sm font-bold text-slate-400">Sem dados ainda</p>
                      ) : (
                        <>
                          <p className="mt-4 text-3xl font-black text-amber-600 dark:text-amber-400">
                            {spacedPlanningStats.lateRatePct}%
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-slate-500">
                            {spacedPlanningStats.late} atrasada(s) · {spacedPlanningStats.onTime} no prazo
                          </p>
                        </>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] sm:p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Tempo até consolidado
                      </p>
                      <p className="mt-1 text-[9px] leading-snug text-slate-400">
                        Média de dias da <span className="font-bold text-slate-500">data do estudo</span> até a{' '}
                        <span className="font-bold text-slate-500">última data registrada</span> de revisão, só em
                        tópicos já consolidados.
                      </p>
                      {spacedPlanningStats.avgDaysToMastered == null ? (
                        <p className="mt-4 text-sm font-bold text-slate-400">Nenhum consolidado ainda</p>
                      ) : (
                        <>
                          <p className="mt-4 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            {spacedPlanningStats.avgDaysToMastered}{' '}
                            <span className="text-lg font-black text-slate-400">dias</span>
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-slate-500">
                            Base: {spacedPlanningStats.masteredCount} tópico
                            {spacedPlanningStats.masteredCount === 1 ? '' : 's'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
         </div>

      </div>

      {/* CONTENT MODAL (DOCS) */}
      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {selectedTopicForContent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            role="presentation"
            onClick={() => setSelectedTopicForContent(null)}
          >
            <motion.div 
              ref={contentDialogRef}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative flex h-[min(85vh,880px)] max-h-[min(85vh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-sky-100 bg-white p-6 shadow-2xl dark:border-sky-900 dark:bg-[#1a1a1a] sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-labelledby="spaced-content-title"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-4 flex shrink-0 items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 id="spaced-content-title" className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight">{selectedTopicForContent.topic}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedTopicForContent.subject}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedTopicForContent(null)} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Fechar"
                >
                  <X className="text-slate-400" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                <div className="flex flex-col gap-5 pb-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="spaced-topic-content" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Conteúdo para revisão
                    </label>
                    <textarea
                      id="spaced-topic-content"
                      value={topicContent}
                      onChange={(e) => setTopicContent(e.target.value)}
                      placeholder="Adicione aqui o conteúdo deste assunto para revisão..."
                      className="min-h-[11rem] w-full max-h-[min(40vh,320px)] resize-y rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 font-medium text-slate-800 outline-none transition-all focus:border-sky-500 dark:border-slate-700 dark:bg-black/40 dark:text-slate-200 sm:min-h-[12rem] sm:p-6"
                    />
                  </div>

                  <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-200">
                        Plano de revisão (data, ciclos, algoritmo)
                      </p>
                    </div>
                    <ul className="list-inside list-disc space-y-1 text-[9px] font-medium leading-snug text-slate-600 dark:text-slate-400">
                      <li>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Trocar algoritmo:</span> reinicia o estado
                        do modo escolhido. Fixo mantém só degraus da escada que ainda existem no plano; SM-2/FSRS zeram a fila fixa e
                        voltam à primeira revisão (estudo + 1 dia).
                      </li>
                      <li>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Só mudar data do estudo:</span> no fixo,
                        mantemos degraus já concluídos e zeramos offset + snoozes. No SM-2/FSRS, o scheduler reinicia a partir da
                        nova data.
                      </li>
                      <li>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Só mudar ciclos:</span> no fixo, removemos
                        conclusões/snoozes de degraus que sumiram do plano. Nos adaptativos, só muda a meta visual de “ciclos”.
                      </li>
                    </ul>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label htmlFor="spaced-edit-study-date" className="text-[9px] font-black uppercase text-slate-500">
                          Data do estudo
                        </label>
                        <input
                          id="spaced-edit-study-date"
                          type="date"
                          value={editPlanStudyDate}
                          onChange={e => setEditPlanStudyDate(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-black/40 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="spaced-edit-cycles" className="text-[9px] font-black uppercase text-slate-500">
                          Ciclos
                        </label>
                        <select
                          id="spaced-edit-cycles"
                          value={editPlanCycles}
                          onChange={e => setEditPlanCycles(parseInt(e.target.value, 10))}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 outline-none dark:border-white/10 dark:bg-black/40 dark:text-slate-200"
                        >
                          {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="spaced-edit-algo" className="text-[9px] font-black uppercase text-slate-500">
                          Algoritmo
                        </label>
                        <select
                          id="spaced-edit-algo"
                          value={editPlanAlgorithm}
                          onChange={e => setEditPlanAlgorithm(e.target.value as SrsAlgorithm)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 outline-none dark:border-white/10 dark:bg-black/40 dark:text-slate-200"
                        >
                          <option value="fixed">Intervalos fixos</option>
                          <option value="sm2">SM-2</option>
                          <option value="fsrs">FSRS</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!topicPlanDirty || isSavingTopicPlan}
                      onClick={() => void handleSaveTopicPlan()}
                      className="w-full rounded-xl border border-amber-200 bg-white py-2.5 text-[9px] font-black uppercase tracking-widest text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-black/40 dark:text-amber-100 dark:hover:bg-amber-950/50"
                    >
                      {isSavingTopicPlan ? 'Aplicando…' : 'Aplicar alterações do plano'}
                    </button>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Integração com o restante do app
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const t = selectedTopicForContent;
                          if (!t) return;
                          const q = encodeURIComponent(getSpacedMaterialQuery(t));
                          navigate(`/flashcards?q=${q}`);
                          setSelectedTopicForContent(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-tight text-sky-800 transition-colors hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                      >
                        <BrainCircuit size={14} aria-hidden /> Abrir flashcards
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const t = selectedTopicForContent;
                          if (!t) return;
                          const q = encodeURIComponent(getSpacedMaterialQuery(t));
                          navigate(`/intelligent_summarizer?prefill=${q}`);
                          setSelectedTopicForContent(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-tight text-violet-900 transition-colors hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
                      >
                        <Sparkles size={14} aria-hidden /> Abrir resumidor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const t = selectedTopicForContent;
                          if (!t) return;
                          navigateToQuestionBankForTopic(navigate, {
                            ...t,
                            linked_question_bank_ai_count: clampQbAiCountInput(contentQbAiCount),
                          });
                          setSelectedTopicForContent(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-tight text-emerald-900 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                      >
                        <BookOpen size={14} aria-hidden /> Banco de questões (revisar hoje)
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label htmlFor="spaced-content-material-kind" className="text-[9px] font-black uppercase text-slate-400">
                          Destaque nos cards
                        </label>
                        <select
                          id="spaced-content-material-kind"
                          value={contentMaterialKind}
                          onChange={e => setContentMaterialKind(e.target.value as SpacedMaterialKind)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-bold text-slate-700 outline-none dark:border-white/10 dark:bg-black/40 dark:text-slate-200"
                        >
                          <option value="both">Flashcards e resumidor</option>
                          <option value="flashcards">Só flashcards</option>
                          <option value="summarizer">Só resumidor</option>
                          <option value="question_bank">Só banco de questões</option>
                          <option value="none">Sem preferência</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="spaced-content-material-query" className="text-[9px] font-black uppercase text-slate-400">
                          Texto (busca / pré-preenchimento)
                        </label>
                        <input
                          id="spaced-content-material-query"
                          type="text"
                          value={contentMaterialQuery}
                          onChange={e => setContentMaterialQuery(e.target.value)}
                          placeholder="Vazio = matéria — tópico"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-800 outline-none dark:border-white/10 dark:bg-black/40 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="spaced-content-qb-ai-count" className="text-[9px] font-black uppercase text-slate-400">
                        Quantidade no Gerador com IA (banco)
                      </label>
                      <input
                        id="spaced-content-qb-ai-count"
                        type="number"
                        min={1}
                        max={20}
                        inputMode="numeric"
                        value={contentQbAiCount}
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          setContentQbAiCount(Number.isFinite(v) ? clampQbAiCountInput(v) : 1);
                        }}
                        className="mt-1 w-full max-w-[8rem] rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-bold text-slate-800 outline-none dark:border-white/10 dark:bg-black/40 dark:text-slate-100"
                      />
                      <p className="mt-1 text-[9px] leading-snug text-slate-500 dark:text-slate-400">
                        Número de questões (1–20) que você costuma pedir na IA ao estudar este assunto. Ao abrir o banco por
                        este tópico, o Gerador com IA já vem com essa quantidade; use o botão abaixo para gravar no servidor.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={savingMaterialLink || !selectedTopicForContent}
                      onClick={() => selectedTopicForContent && void saveMaterialLinkForTopic(selectedTopicForContent.id)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-50 dark:border-white/10 dark:bg-black/40 dark:text-slate-300 dark:hover:border-sky-800"
                    >
                      {savingMaterialLink ? 'Salvando…' : 'Salvar preferências (material + IA do banco)'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex shrink-0 justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedTopicForContent(null)}
                  className="px-6 py-3 text-slate-500 font-bold uppercase text-xs tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveContent}
                  disabled={isSavingContent}
                  className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingContent ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{isSavingContent ? 'Salvando...' : 'Salvar Conteúdo'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
};

export default SpacedRepetition;
