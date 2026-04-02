
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, History, Trophy, Gavel, Scale, CheckCircle2, Calendar as CalendarIcon, List, LayoutGrid, Plus, ExternalLink, RefreshCw, MoreHorizontal, Info, X, Filter } from 'lucide-react';
import { Subject, StudySession, Task, TaskPriority } from '../types';
import {
  buildCalendarOccurrences,
  getLocalDayFromDueOrCompleted,
  localDateKeyFromDisplayDue,
  occurrencesForDayKey,
  type CalendarTaskOccurrence,
} from '../utils/calendarTaskExpansion';
import { googleCalendarService, type GoogleExternalEvent } from '../services/googleCalendarService';
import { dataService } from '../services/dataService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarViewProps {
  subjects: Subject[];
  tasks: Task[];
  userId: string;
  studySessions: StudySession[];
  isOnline: boolean;
  /** Após criar/editar tarefa ou sync Google — recarrega lista no App. */
  onTasksChanged?: () => void | Promise<void>;
  /** Após sincronizar tarefas com o Google (pop-up ou retorno de redirect). */
  onAfterGoogleCalendarSync?: () => void | Promise<void>;
}

type CalendarMode = 'month' | 'week' | 'agenda';

/** Data civil atual em America/Sao_Paulo (meia-noite local do browser para esse Y-M-D). */
function getBrasiliaCalendarDate(): Date {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.format(new Date()).split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return new Date(y, m, d);
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** YYYY-MM-DD do dia civil local — alinha com o número do cabeçalho da coluna (evita UTC de toISOString). */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DUE_DATE_STRING_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Posição vertical na grade semanal. `YYYY-MM-DD` sozinho é tratado como dia inteiro em horário local
 * (00:00 local), pois `new Date('YYYY-MM-DD')` em JS é meia-noite UTC e desloca o slot em SP/outros fusos.
 */
function getLocalHoursMinutesForWeekGrid(dueDate: string): { hour: number; minute: number } {
  const s = dueDate.trim();
  if (DUE_DATE_STRING_ONLY.test(s)) {
    return { hour: 0, minute: 0 };
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return { hour: 0, minute: 0 };
  }
  return { hour: d.getHours(), minute: d.getMinutes() };
}

const WEEK_ROW_PX = 64;
const WEEK_TASK_MARGIN_X = 4;
const WEEK_TASK_GAP_X = 2;

/** Mesmo slot (hora:min) → colunas lado a lado para não sobrepor. */
function layoutWeekColumnOccurrences(
  occs: CalendarTaskOccurrence[]
): { occ: CalendarTaskOccurrence; topPx: number; col: number; colCount: number }[] {
  const items = occs.map((occ) => {
    const { hour, minute } = getLocalHoursMinutesForWeekGrid(occ.displayDue);
    const topPx = hour * WEEK_ROW_PX + (minute / 60) * WEEK_ROW_PX;
    const slotKey = hour * 60 + minute;
    return { occ, topPx, slotKey };
  });
  const bySlot = new Map<number, typeof items>();
  for (const it of items) {
    const list = bySlot.get(it.slotKey) ?? [];
    list.push(it);
    bySlot.set(it.slotKey, list);
  }
  const out: { occ: CalendarTaskOccurrence; topPx: number; col: number; colCount: number }[] = [];
  for (const group of bySlot.values()) {
    const colCount = group.length;
    group.forEach((it, col) => {
      out.push({ occ: it.occ, topPx: it.topPx, col, colCount });
    });
  }
  out.sort((a, b) => a.topPx - b.topPx || a.occ.occurrenceKey.localeCompare(b.occ.occurrenceKey));
  return out;
}

/** Prefixo YYYY-MM-DD de `start_time` — alinhado ao painel Detalhes (`startsWith` na data). */
function dayKeyFromSessionStart(startTime: string): string | null {
  const prefix = startTime.trim().slice(0, 10);
  return DUE_DATE_STRING_ONLY.test(prefix) ? prefix : null;
}

/** Rótulo curto para a célula do mês (ex.: 45m, 1.5h). */
function formatDayStudyDurationShort(totalSeconds: number): string {
  const s = Number(totalSeconds) || 0;
  if (s <= 0) return '0m';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  const h = s / 3600;
  if (h >= 10) return `${Math.round(h)}h`;
  const t = h.toFixed(1);
  return t.endsWith('.0') ? `${Math.floor(h)}h` : `${t}h`;
}

function brDateLabelFromYmd(dateStr: string): string {
  if (!DUE_DATE_STRING_ONLY.test(dateStr)) return dateStr;
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

function formatStudySessionsTooltip(totalSeconds: number, sessionCount: number): string {
  const s = Number(totalSeconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.max(0, Math.round((s % 3600) / 60));
  const timePart = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
  const sess = sessionCount === 1 ? '1 sessão' : `${sessionCount} sessões`;
  return `${sess} · ${timePart} estudados`;
}

function eventTouchesLocalDay(ev: GoogleExternalEvent, dayStart: Date): boolean {
  const ds = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate());
  const de = new Date(ds);
  de.setHours(23, 59, 59, 999);
  return ev.start.getTime() <= de.getTime() && ev.end.getTime() >= ds.getTime();
}

/** Trecho do evento num dia da grade semanal (só eventos com horário; dia inteiro só no mês/agenda). */
function segmentTimedGoogleEventForWeekDay(
  ev: GoogleExternalEvent,
  day: Date
): { topPx: number; heightPx: number } | null {
  if (ev.allDay) return null;
  const ds = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const de = new Date(ds);
  de.setHours(23, 59, 59, 999);
  if (ev.end.getTime() < ds.getTime() || ev.start.getTime() > de.getTime()) return null;
  const segStart = ev.start.getTime() > ds.getTime() ? ev.start : ds;
  const segEnd = ev.end.getTime() < de.getTime() ? ev.end : de;
  const startMin = segStart.getHours() * 60 + segStart.getMinutes() + segStart.getSeconds() / 60;
  const endMin = segEnd.getHours() * 60 + segEnd.getMinutes() + segEnd.getSeconds() / 60;
  const topPx = (startMin / 60) * WEEK_ROW_PX;
  let heightPx = ((endMin - startMin) / 60) * WEEK_ROW_PX;
  if (heightPx < 18) heightPx = 18;
  return { topPx, heightPx };
}

const CalendarView: React.FC<CalendarViewProps> = ({
  subjects,
  tasks,
  userId,
  studySessions,
  isOnline,
  onTasksChanged,
  onAfterGoogleCalendarSync,
}) => {
  const navigate = useNavigate();
  const [taskModal, setTaskModal] = useState<{ dateStr: string } | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubjectId, setModalSubjectId] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  const openTasksNewWithDue = useCallback(
    (dateStr: string) => navigate(`/tasks?due=${encodeURIComponent(dateStr)}`),
    [navigate]
  );

  const openTaskInTasksModule = useCallback(
    (taskId: string) => navigate(`/tasks?task=${encodeURIComponent(taskId)}`),
    [navigate]
  );

  const openQuickTaskModal = useCallback(
    (dateStr: string) => {
      setTaskModal({ dateStr });
      setModalTitle('');
      setModalSubjectId(subjects[0]?.id ?? '');
    },
    [subjects]
  );

  const saveQuickTask = async () => {
    if (!taskModal || !modalTitle.trim()) {
      toast.error('Informe o título da tarefa.');
      return;
    }
    setModalSaving(true);
    try {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: modalTitle.trim(),
        category: 'geral',
        priority: 'normal',
        completed: false,
        subtasks: [],
        notes: '',
        links: [],
        dueDate: taskModal.dateStr,
        subjectId: modalSubjectId || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await dataService.saveTask(newTask, userId, isOnline);
      toast.success('Tarefa criada.');
      setTaskModal(null);
      await onTasksChanged?.();
    } catch {
      toast.error('Não foi possível salvar a tarefa.');
    } finally {
      setModalSaving(false);
    }
  };
  const [mode, setMode] = useState<CalendarMode>('month');
  const [brNow, setBrNow] = useState(() => getBrasiliaCalendarDate());
  const [currentDate, setCurrentDate] = useState(() => getBrasiliaCalendarDate());
  /** Dia exibido no painel Detalhes (e seleção no mês); independente do mês visível em `currentDate`. */
  const [detailDate, setDetailDate] = useState(() => getBrasiliaCalendarDate());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showGoogleExternalEvents, setShowGoogleExternalEvents] = useState(false);
  const [googleExternalEvents, setGoogleExternalEvents] = useState<GoogleExternalEvent[]>([]);
  const [googleEventsLoading, setGoogleEventsLoading] = useState(false);
  /** Última tentativa de carregar eventos Google sem token (evita toast a cada troca de mês). */
  const [googleEventsNeedsAuth, setGoogleEventsNeedsAuth] = useState(false);

  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('');
  const [pendingOnly, setPendingOnly] = useState(false);

  const normalizeLocalDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const openWeekAroundDetail = () => {
    setCurrentDate(normalizeLocalDate(detailDate));
    setMode('week');
  };

  const openMonthForDetail = () => {
    setCurrentDate(new Date(detailDate.getFullYear(), detailDate.getMonth(), 1));
    setMode('month');
  };

  const goToday = () => {
    const t = normalizeLocalDate(brNow);
    setCurrentDate(t);
    setDetailDate(t);
  };

  useEffect(() => {
    const syncBrNow = () => {
      setBrNow((prev) => {
        const next = getBrasiliaCalendarDate();
        return sameCalendarDay(prev, next) ? prev : next;
      });
    };

    const intervalId = window.setInterval(syncBrNow, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncBrNow();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const totalDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const totalSeconds = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  
  const displayTotal = useMemo(() => {
    if (totalSeconds < 3600) {
      return { value: Math.floor(totalSeconds / 60), unit: 'Minutos' };
    }
    return { value: (totalSeconds / 3600).toFixed(1), unit: 'Horas' };
  }, [totalSeconds]);

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => {
    if (mode === 'month') {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setCurrentDate(newDate);
      setDetailDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    } else if (mode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
      setDetailDate((prev) => {
        const n = new Date(prev);
        n.setDate(prev.getDate() - 7);
        return n;
      });
    }
  };

  const nextMonth = () => {
    if (mode === 'month') {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(newDate);
      setDetailDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    } else if (mode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
      setDetailDate((prev) => {
        const n = new Date(prev);
        n.setDate(prev.getDate() + 7);
        return n;
      });
    }
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const skipGoogleEventIds = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) {
      if (t.google_event_id) s.add(t.google_event_id);
    }
    return s;
  }, [tasks]);

  const googleQueryRange = useMemo(() => {
    if (mode === 'month') {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      const timeMin = new Date(y, m, 1, 0, 0, 0, 0);
      const timeMax = new Date(y, m + 1, 0, 23, 59, 59, 999);
      return { timeMin, timeMax };
    }
    if (mode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const timeMin = normalizeLocalDate(startOfWeek);
      const timeMax = new Date(timeMin);
      timeMax.setDate(timeMax.getDate() + 6);
      timeMax.setHours(23, 59, 59, 999);
      return { timeMin, timeMax };
    }
    const timeMin = normalizeLocalDate(brNow);
    const timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + 60);
    timeMax.setHours(23, 59, 59, 999);
    return { timeMin, timeMax };
  }, [mode, currentDate, brNow]);

  const calendarOccurrences = useMemo(
    () =>
      buildCalendarOccurrences(tasks, googleQueryRange.timeMin, googleQueryRange.timeMax, {
        subjectId: filterSubjectId,
        priority: filterPriority,
        pendingOnly,
      }),
    [tasks, googleQueryRange.timeMin, googleQueryRange.timeMax, filterSubjectId, filterPriority, pendingOnly]
  );

  const loadGoogleExternalEvents = useCallback(async () => {
    setGoogleEventsLoading(true);
    try {
      const list = await googleCalendarService.fetchExternalEventsInRange(
        googleQueryRange.timeMin,
        googleQueryRange.timeMax,
        skipGoogleEventIds
      );
      if (list === null) {
        setGoogleExternalEvents([]);
        setGoogleEventsNeedsAuth(true);
      } else {
        setGoogleEventsNeedsAuth(false);
        setGoogleExternalEvents(list);
      }
    } finally {
      setGoogleEventsLoading(false);
    }
  }, [googleQueryRange.timeMin, googleQueryRange.timeMax, skipGoogleEventIds]);

  useEffect(() => {
    if (!showGoogleExternalEvents) {
      setGoogleExternalEvents([]);
      setGoogleEventsNeedsAuth(false);
      return;
    }
    void loadGoogleExternalEvents();
  }, [showGoogleExternalEvents, loadGoogleExternalEvents]);

  const selectedFullDate = toLocalDateKey(detailDate);
  const dailySessions = studySessions.filter(s => s.start_time.startsWith(selectedFullDate));
  const dailyTaskOccurrences = useMemo(
    () => occurrencesForDayKey(calendarOccurrences, selectedFullDate),
    [calendarOccurrences, selectedFullDate]
  );

  const upcomingAgendaOccurrences = useMemo(() => {
    const startCut = normalizeLocalDate(brNow);
    return calendarOccurrences
      .filter((o) => {
        if (o.task.completed) return false;
        const d = getLocalDayFromDueOrCompleted(o.displayDue);
        return d !== null && d >= startCut;
      })
      .sort((a, b) => new Date(a.displayDue).getTime() - new Date(b.displayDue).getTime());
  }, [calendarOccurrences, brNow]);

  const agendaGoogleEvents = useMemo(() => {
    if (!showGoogleExternalEvents) return [];
    const startCut = normalizeLocalDate(brNow);
    return googleExternalEvents
      .filter((ev) => ev.end.getTime() >= startCut.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [showGoogleExternalEvents, googleExternalEvents, brNow]);

  const studySessionsByDayKey = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    for (const sess of studySessions) {
      const key = dayKeyFromSessionStart(sess.start_time);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(sess);
      map.set(key, list);
    }
    return map;
  }, [studySessions]);

  const handleGoogleSync = async () => {
    setIsSyncing(true);
    try {
      const { auth, googleProvider, signInWithPopup, signInWithRedirect } = await import('../firebase');
      const { GoogleAuthProvider } = await import('firebase/auth');

      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        if (popupErr?.code === 'auth/popup-closed-by-user') {
          toast.info('Conexão cancelada: o pop-up foi fechado.');
          return;
        }
        if (popupErr?.code === 'auth/cancelled-popup-request') {
          toast.info('Uma solicitação de pop-up já está em andamento.');
          return;
        }

        const msg = String(popupErr?.message || '');
        const useSameTabRedirect =
          popupErr?.code === 'auth/popup-blocked' ||
          popupErr?.code === 'auth/operation-not-supported-in-this-environment' ||
          /requested action is invalid|the requested action is invalid|invalid.*action/i.test(msg);

        if (useSameTabRedirect) {
          toast.info('Abrindo login do Google nesta mesma aba (evita bloqueio de pop-up)…');
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) {
        toast.error(
          'Login ok, mas o token do Google Calendar não foi devolvido. No Google Cloud Console, ative a API Calendar e verifique os escopos OAuth; no Firebase, confira o provedor Google.'
        );
        return;
      }

      googleCalendarService.setFirebaseToken(token);
      toast.success('Conectado ao Google Agenda com sucesso!');

      const { syncDueTasksToGoogleAndSupabase } = await import('../services/googleCalendarTaskSync');
      const tasksWithDue = tasks.filter((t) => t.dueDate);
      if (tasksWithDue.length > 0) {
        toast.info(`Sincronizando ${tasksWithDue.length} tarefa(s) com prazo...`);
      }
      const { successCount, withDueCount } = await syncDueTasksToGoogleAndSupabase(tasks, subjects);

      if (withDueCount === 0) {
        toast.info('Nenhuma tarefa com prazo para sincronizar.');
      } else if (successCount > 0) {
        toast.success(`${successCount} tarefa(s) enviadas ao Google Agenda (novas ou atualizadas).`);
      } else {
        toast.error('Não foi possível sincronizar as tarefas com o Google Agenda.');
      }

      await onAfterGoogleCalendarSync?.();

      if (showGoogleExternalEvents) {
        setGoogleEventsNeedsAuth(false);
        void loadGoogleExternalEvents();
      }
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado no Firebase (Authentication → Settings → Authorized domains).');
        console.error('Domínio atual:', window.location.hostname);
      } else if (err.code === 'auth/operation-not-allowed') {
        toast.error('Login com Google desativado no Firebase. Ative em Authentication → Sign-in method → Google.');
      } else if (err.code === 'auth/internal-error') {
        toast.error(
          'Erro interno do Firebase ao abrir o Google. Tente de novo, permita pop-ups ou use outro navegador.'
        );
      } else {
        console.error('Error syncing with Google:', err);
        toast.error(`Erro ao conectar com o Google Agenda: ${err.message || 'Erro desconhecido'}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const renderMonthView = () => (
    <div className="bg-white dark:bg-[#191919] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <div className="flex bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg">
            <button type="button" onClick={openMonthForDetail} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${mode === 'month' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Mês</button>
            <button type="button" onClick={openWeekAroundDetail} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${mode === 'week' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Semana</button>
            <button type="button" onClick={() => setMode('agenda')} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${mode === 'agenda' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Agenda</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={goToday} className="px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all border border-[#e9e9e7] dark:border-[#2f2f2f]">Hoje</button>
          <div className="flex gap-1">
            <button type="button" onClick={prevMonth} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all"><ChevronLeft size={16} /></button>
            <button type="button" onClick={nextMonth} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-medium text-slate-500 uppercase tracking-tight border-b border-[#e9e9e7] dark:border-[#2f2f2f]">{d}</div>
        ))}
        {blanks.map(b => (
          <div key={`b-${b}`} className="min-h-[120px] border-r border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-slate-50/30 dark:bg-white/[0.02]" />
        ))}
        {days.map(day => {
          const y = currentDate.getFullYear();
          const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
          const d = day.toString().padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          const dayOccurrences = occurrencesForDayKey(calendarOccurrences, dateStr);
          const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const isSelected = sameCalendarDay(detailDate, cellDate);
          const isToday = day === brNow.getDate() && currentDate.getMonth() === brNow.getMonth() && currentDate.getFullYear() === brNow.getFullYear();
          const daySessions = studySessionsByDayKey.get(dateStr) ?? [];
          const totalStudySecs = daySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
          const studySubjectIds: string[] = [];
          const seenSubj = new Set<string>();
          for (const s of daySessions) {
            if (seenSubj.has(s.subject_id)) continue;
            seenSubj.add(s.subject_id);
            studySubjectIds.push(s.subject_id);
          }

          return (
            <div 
              key={day} 
              onClick={() => setDetailDate(cellDate)}
              className={`min-h-[120px] p-1 border-r border-b border-[#e9e9e7] dark:border-[#2f2f2f] relative transition-all cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-white/[0.03] ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
            >
              <div className="flex justify-between items-start gap-1 mb-0.5 px-0.5">
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className={`text-[11px] font-medium w-6 h-6 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-sanfran-rubi text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                    {day}
                  </span>
                  <button
                    type="button"
                    title="Nova tarefa neste dia"
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickTaskModal(dateStr);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-500 opacity-80 transition-all hover:border-sanfran-rubi/50 hover:text-sanfran-rubi group-hover:opacity-100 dark:border-[#3f3f3f] dark:bg-[#2a2a2a] dark:text-slate-400"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
                {daySessions.length > 0 && (
                  <div
                    className="flex min-w-0 flex-1 flex-col items-end gap-0.5"
                    title={formatStudySessionsTooltip(totalStudySecs, daySessions.length)}
                  >
                    <div className="flex items-center gap-0.5 rounded-md bg-emerald-50/95 px-1 py-0.5 dark:bg-emerald-950/45">
                      <Clock className="h-2.5 w-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      <span className="text-[8px] font-black tabular-nums text-emerald-800 dark:text-emerald-200">
                        {formatDayStudyDurationShort(totalStudySecs)}
                      </span>
                    </div>
                    <div className="flex max-w-full flex-wrap justify-end gap-0.5">
                      {studySubjectIds.slice(0, 6).map((sid) => {
                        const sub = subjects.find((x) => x.id === sid);
                        return (
                          <span
                            key={`${dateStr}-st-${sid}`}
                            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/60 dark:ring-black/20"
                            style={{ backgroundColor: sub?.color || '#059669' }}
                            title={sub?.name || 'Estudo'}
                          />
                        );
                      })}
                      {studySubjectIds.length > 6 && (
                        <span className="text-[7px] font-bold text-emerald-700/80 dark:text-emerald-400/90">+{studySubjectIds.length - 6}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-0.5 overflow-hidden">
                {dayOccurrences.slice(0, 4).map((occ) => {
                  const subject = subjects.find(s => s.id === occ.task.subjectId);
                  return (
                    <button
                      key={occ.occurrenceKey}
                      type="button"
                      title={occ.task.recurrence ? 'Abrir em Tarefas (série recorrente)' : 'Abrir em Tarefas'}
                      onClick={(e) => {
                        e.stopPropagation();
                        openTaskInTasksModule(occ.task.id);
                      }}
                      className="flex w-full items-center gap-1.5 rounded border border-[#e9e9e7] bg-white px-1.5 py-0.5 text-left text-[9px] font-medium text-slate-700 shadow-sm transition-colors hover:border-sanfran-rubi/40 dark:border-[#3f3f3f] dark:bg-[#2f2f2f] dark:text-slate-200"
                    >
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: subject?.color || '#9B111E' }} />
                      <span className="truncate">{occ.task.recurrence ? '↻ ' : ''}{occ.task.title}</span>
                    </button>
                  );
                })}
                {dayOccurrences.length > 4 && (
                  <div className="text-[8px] font-medium text-slate-500 pl-2">
                    + {dayOccurrences.length - 4} mais
                  </div>
                )}
                {showGoogleExternalEvents && (() => {
                  const ge = googleExternalEvents.filter((ev) => eventTouchesLocalDay(ev, cellDate));
                  return (
                    <>
                      {ge.slice(0, 3).map((ev) => (
                        <div
                          key={`g-${dateStr}-${ev.id}`}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium truncate border border-blue-200/90 bg-blue-50/95 text-blue-900 dark:border-blue-500/35 dark:bg-blue-950/45 dark:text-blue-100 pointer-events-none"
                          title={`Google Agenda (somente leitura) · ${ev.summary}`}
                        >
                          <span className="shrink-0 text-[7px] font-black uppercase text-blue-600 dark:text-blue-300">G</span>
                          <span className="truncate">{ev.summary}</span>
                        </div>
                      ))}
                      {ge.length > 3 && (
                        <div className="text-[8px] font-medium text-blue-600/90 dark:text-blue-400/90 pl-2">
                          + {ge.length - 3} no Google
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    const endOfWeek = new Date(weekDays[6]);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white dark:bg-[#191919] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden flex flex-col h-[700px] animate-in fade-in duration-500">
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#e9e9e7] dark:border-[#2f2f2f] shrink-0 bg-[#fbfbfa] dark:bg-[#1f1f1f]">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-serif">
              {weekDays[0].getDate()} {monthNames[weekDays[0].getMonth()].substring(0, 3)} - {endOfWeek.getDate()} {monthNames[endOfWeek.getMonth()].substring(0, 3)}
            </h3>
            <div className="flex bg-slate-200/50 dark:bg-white/5 p-0.5 rounded-md">
              <button type="button" onClick={openMonthForDetail} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${mode === 'month' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Mês</button>
              <button type="button" onClick={openWeekAroundDetail} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${mode === 'week' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Semana</button>
              <button type="button" onClick={() => setMode('agenda')} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${mode === 'agenda' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Agenda</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={goToday} className="px-3 py-1 text-[10px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all border border-[#e9e9e7] dark:border-[#2f2f2f]">Hoje</button>
            <div className="flex gap-1">
              <button type="button" onClick={prevMonth} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all"><ChevronLeft size={14} /></button>
              <button type="button" onClick={nextMonth} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="flex min-w-[800px]">
            {/* Time Column */}
            <div className="w-16 border-r border-[#e9e9e7] dark:border-[#2f2f2f] shrink-0 bg-[#fbfbfa] dark:bg-[#1f1f1f]">
              <div className="h-12 border-b border-[#e9e9e7] dark:border-[#2f2f2f]" /> {/* Header spacer */}
              {hours.map(hour => (
                <div key={hour} className="h-16 border-b border-[#e9e9e7] dark:border-[#2f2f2f] relative">
                  <span className="absolute -top-2 left-2 text-[9px] font-medium text-slate-400">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            <div className="flex-1 grid grid-cols-7 relative">
              {weekDays.map((date) => {
                const dateStr = toLocalDateKey(date);
                const dayOccurrences = occurrencesForDayKey(calendarOccurrences, dateStr);
                const isToday = sameCalendarDay(date, brNow);

                return (
                  <div key={dateStr} className="flex flex-col border-r border-[#e9e9e7] dark:border-[#2f2f2f] last:border-r-0 relative group">
                    {/* Day Header */}
                    <div className="sticky top-0 z-10 flex h-12 border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#fbfbfa] dark:bg-[#1f1f1f]">
                      <button
                        type="button"
                        onClick={() => {
                          const pick = normalizeLocalDate(date);
                          setCurrentDate(pick);
                          setDetailDate(pick);
                        }}
                        className={`flex min-w-0 flex-1 flex-col items-center justify-center cursor-pointer transition-colors hover:bg-slate-100/80 dark:hover:bg-white/[0.06] ${sameCalendarDay(detailDate, date) ? 'ring-1 ring-inset ring-sanfran-rubi/40' : ''}`}
                      >
                        <p className={`text-[9px] font-bold uppercase tracking-tight mb-0.5 ${isToday ? 'text-sanfran-rubi' : 'text-slate-500'}`}>
                          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][date.getDay()]}
                        </p>
                        <div className={`text-xs font-bold ${isToday ? 'text-sanfran-rubi' : 'text-slate-900 dark:text-white'}`}>
                          {date.getDate()}
                        </div>
                      </button>
                      <button
                        type="button"
                        title="Nova tarefa neste dia"
                        onClick={(e) => {
                          e.stopPropagation();
                          openQuickTaskModal(dateStr);
                        }}
                        className="w-7 shrink-0 border-l border-[#e9e9e7] text-slate-400 transition-colors hover:bg-slate-100 hover:text-sanfran-rubi dark:border-[#2f2f2f] dark:hover:bg-white/[0.06]"
                      >
                        <Plus className="mx-auto h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Hour Slots */}
                    <div className="relative">
                      {hours.map(hour => (
                        <div key={hour} className="h-16 border-b border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors" />
                      ))}

                      {/* Tasks in Grid — mesmo horário: colunas com largura compartilhada */}
                      {showGoogleExternalEvents &&
                        googleExternalEvents.map((ev) => {
                          const seg = segmentTimedGoogleEventForWeekDay(ev, date);
                          if (!seg) return null;
                          return (
                            <div
                              key={`g-${dateStr}-${ev.id}`}
                              style={{
                                top: seg.topPx,
                                height: seg.heightPx,
                                left: WEEK_TASK_MARGIN_X,
                                width: `calc(100% - ${2 * WEEK_TASK_MARGIN_X}px)`,
                              }}
                              className="absolute z-[15] box-border overflow-hidden rounded-md border border-blue-300/55 bg-blue-50/95 p-1 shadow-sm dark:border-blue-500/40 dark:bg-blue-950/55 pointer-events-none"
                              title={`Google Agenda (somente leitura) · ${ev.summary}`}
                            >
                              <p className="line-clamp-2 text-[8px] font-bold leading-tight text-blue-900 dark:text-blue-100">
                                {ev.summary}
                              </p>
                            </div>
                          );
                        })}

                      {layoutWeekColumnOccurrences(dayOccurrences).map(({ occ, topPx, col, colCount }) => {
                        const task = occ.task;
                        const subject = subjects.find(s => s.id === task.subjectId);
                        const shrink = 2 * WEEK_TASK_MARGIN_X + (colCount - 1) * WEEK_TASK_GAP_X;
                        const style: React.CSSProperties =
                          colCount <= 1
                            ? {
                                top: topPx,
                                left: WEEK_TASK_MARGIN_X,
                                width: `calc(100% - ${2 * WEEK_TASK_MARGIN_X}px)`,
                              }
                            : {
                                top: topPx,
                                left: `calc(${WEEK_TASK_MARGIN_X}px + ${col} * ((100% - ${shrink}px) / ${colCount} + ${WEEK_TASK_GAP_X}px))`,
                                width: `calc((100% - ${shrink}px) / ${colCount})`,
                              };

                        return (
                          <button
                            key={occ.occurrenceKey}
                            type="button"
                            title="Abrir na Pauta de Tarefas"
                            style={style}
                            onClick={() => openTaskInTasksModule(task.id)}
                            className="absolute z-20 box-border min-h-[32px] overflow-hidden rounded-md border border-[#e9e9e7] bg-white p-1.5 text-left shadow-sm transition-all hover:border-sanfran-rubi/50 group/task dark:border-[#3f3f3f] dark:bg-[#2f2f2f]"
                          >
                            <div className="flex min-w-0 items-center gap-1.5 mb-0.5">
                              <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: subject?.color || '#9B111E' }} />
                              <span className="truncate text-[7px] font-bold uppercase text-slate-500">{subject?.name || 'Geral'}</span>
                            </div>
                            <p className="line-clamp-2 text-[9px] font-bold leading-tight text-slate-800 dark:text-slate-200">
                              {task.recurrence ? '↻ ' : ''}
                              {task.title}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    return (
      <div className="bg-white dark:bg-[#0d0303] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-sanfran-rubi/20 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Agenda de Prazos</h3>
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            <button type="button" onClick={openMonthForDetail} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'month' ? 'bg-white dark:bg-sanfran-rubi text-sanfran-rubi dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Mês</button>
            <button type="button" onClick={openWeekAroundDetail} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'week' ? 'bg-white dark:bg-sanfran-rubi text-sanfran-rubi dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Semana</button>
            <button type="button" onClick={() => setMode('agenda')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'agenda' ? 'bg-white dark:bg-sanfran-rubi text-sanfran-rubi dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Agenda</button>
          </div>
        </div>
        <div className="space-y-3">
          {upcomingAgendaOccurrences.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <CalendarIcon className="w-12 h-12 text-slate-100 dark:text-white/5 mx-auto" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum prazo futuro protocolado.</p>
              <button
                type="button"
                onClick={() => openQuickTaskModal(toLocalDateKey(brNow))}
                className="inline-flex items-center gap-2 rounded-xl border border-sanfran-rubi/30 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-sanfran-rubi shadow-sm transition-colors hover:bg-sanfran-rubi/5 dark:bg-white/5"
              >
                <Plus className="h-4 w-4" />
                Nova tarefa (hoje)
              </button>
            </div>
          ) : (
            upcomingAgendaOccurrences.map((occ) => {
              const task = occ.task;
              const date = getLocalDayFromDueOrCompleted(occ.displayDue) ?? new Date(occ.displayDue);
              const subject = subjects.find(s => s.id === task.subjectId);
              const dueKey = localDateKeyFromDisplayDue(occ.displayDue);
              return (
                <div
                  key={occ.occurrenceKey}
                  className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2 pl-3 dark:border-white/10 dark:bg-white/5"
                >
                  <button
                    type="button"
                    title="Abrir na Pauta de Tarefas"
                    onClick={() => openTaskInTasksModule(task.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-xl py-2 pr-1 text-left transition-colors hover:bg-white/80 dark:hover:bg-white/[0.07]"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-black/20">
                        <span className="text-[8px] font-black uppercase text-slate-400">{monthNames[date.getMonth()].substring(0, 3)}</span>
                        <span className="text-lg font-black leading-none text-slate-900 dark:text-white">{date.getDate()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">
                          {task.recurrence ? '↻ ' : ''}
                          {task.title}
                        </p>
                        <p className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: subject?.color || '#9B111E' }} />
                          {subject?.name || 'Geral'}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${task.priority === 'urgente' ? 'bg-red-100 text-red-600' : task.priority === 'alta' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                      {task.priority || 'normal'}
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      title="Nova tarefa neste dia"
                      onClick={() => DUE_DATE_STRING_ONLY.test(dueKey) && openQuickTaskModal(dueKey)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-sanfran-rubi/40 hover:text-sanfran-rubi dark:border-white/10"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {showGoogleExternalEvents && (
          <div className="mt-10 space-y-4 border-t border-slate-200 pt-8 dark:border-white/10">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-200">
                Google Agenda (somente leitura)
              </h4>
              {googleEventsLoading && (
                <span className="text-[9px] font-bold uppercase text-slate-400">Carregando…</span>
              )}
            </div>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Eventos de dia inteiro aparecem aqui e no mês. Na semana, só entram compromissos com horário.
            </p>
            {agendaGoogleEvents.length === 0 && !googleEventsLoading ? (
              <p className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                Nenhum evento externo neste período.
              </p>
            ) : (
              <div className="space-y-2">
                {agendaGoogleEvents.map((ev) => {
                  const dayKey = toLocalDateKey(ev.start);
                  const timeLabel = ev.allDay
                    ? 'Dia inteiro'
                    : ev.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={`ag-g-${ev.id}`}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 dark:border-blue-500/30 dark:bg-blue-950/35"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-blue-200/80 bg-white dark:border-blue-500/25 dark:bg-black/20">
                          <span className="text-[8px] font-black uppercase text-blue-500">
                            {monthNames[ev.start.getMonth()].substring(0, 3)}
                          </span>
                          <span className="text-lg font-black leading-none text-blue-900 dark:text-blue-100">
                            {ev.start.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {ev.summary}
                          </p>
                          <p className="text-[9px] font-bold uppercase text-blue-700/80 dark:text-blue-300/90">
                            {timeLabel}
                            {!ev.allDay && ` · ${dayKey}`}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
                        Google
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight leading-none">Agenda</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1 uppercase tracking-widest">Cronograma de pautas e prazos</p>
          {showGoogleExternalEvents && googleEventsNeedsAuth && (
            <p className="mt-2 text-[11px] font-bold text-blue-700 dark:text-blue-300">
              Use Google Sync para autorizar e carregar eventos do Google Agenda nesta tela.
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            type="button"
            onClick={handleGoogleSync}
            disabled={isSyncing}
            className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-white/5 text-slate-700 dark:text-white rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="p-1.5 bg-usp-blue text-white rounded-lg shadow-sm group-hover:rotate-12 transition-transform">
              {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CalendarIcon className="w-3.5 h-3.5" />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Google Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGoogleExternalEvents((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${
              showGoogleExternalEvents
                ? 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/55 dark:text-blue-100'
                : 'bg-white text-slate-700 border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-white'
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
            {showGoogleExternalEvents ? 'Ocultar Google' : 'Eventos Google'}
          </button>

          {showGoogleExternalEvents && (
            <button
              type="button"
              onClick={() => void loadGoogleExternalEvents()}
              disabled={googleEventsLoading}
              className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              title="Atualizar eventos do Google"
            >
              <RefreshCw className={`h-4 w-4 ${googleEventsLoading ? 'animate-spin' : ''}`} />
            </button>
          )}

          <div className="bg-white dark:bg-white/5 px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-usp-gold text-white rounded-lg shadow-sm"><Trophy className="w-3.5 h-3.5" /></div>
            <div>
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total</p>
              <p className="text-xs font-black text-slate-950 dark:text-white leading-none">{displayTotal.value} {displayTotal.unit}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#141414]">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Filtros da agenda
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-[160px] flex-1 flex-col gap-1">
                <span className="text-[8px] font-black uppercase text-slate-400">Disciplina</span>
                <select
                  value={filterSubjectId}
                  onChange={(e) => setFilterSubjectId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sanfran-rubi/20 dark:border-white/10 dark:bg-black/30 dark:text-slate-200"
                >
                  <option value="">Todas</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[130px] flex-1 flex-col gap-1">
                <span className="text-[8px] font-black uppercase text-slate-400">Prioridade</span>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority((e.target.value || '') as TaskPriority | '')}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sanfran-rubi/20 dark:border-white/10 dark:bg-black/30 dark:text-slate-200"
                >
                  <option value="">Todas</option>
                  <option value="urgente">Urgente</option>
                  <option value="alta">Alta</option>
                  <option value="normal">Normal</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-black/30">
                <input
                  type="checkbox"
                  checked={pendingOnly}
                  onChange={(e) => setPendingOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-sanfran-rubi focus:ring-sanfran-rubi/30"
                />
                <span className="text-[10px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300">Só pendentes</span>
              </label>
            </div>
          </div>
          {mode === 'month' ? renderMonthView() : mode === 'week' ? renderWeekView() : renderAgendaView()}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#0d0303] rounded-3xl p-6 border border-slate-200 dark:border-sanfran-rubi/20 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <History size={14} className="text-sanfran-rubi" /> Detalhes
              </h3>
              <span className="text-[9px] font-black text-slate-400 uppercase">
                {detailDate.getDate()} {monthNames[detailDate.getMonth()].substring(0, 3)}
                {detailDate.getFullYear() !== brNow.getFullYear() ? ` ${detailDate.getFullYear()}` : ''}
              </span>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">Sessões</h4>
                <div className="space-y-2">
                  {dailySessions.map(s => {
                    const subject = subjects.find(sub => sub.id === s.subject_id);
                    const durationMins = Math.max(1, Math.round(Number(s.duration) / 60));
                    return (
                      <div key={s.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject?.color || '#9B111E' }}></div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px] truncate">{subject?.name || 'Geral'}</span>
                        </div>
                        <span className="text-[9px] font-black text-sanfran-rubi">{durationMins}m</span>
                      </div>
                    );
                  })}
                  {dailySessions.length === 0 && <p className="text-[9px] italic text-slate-300 font-bold uppercase text-center py-4">Nenhuma sessão</p>}
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">Prazos</h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => openQuickTaskModal(selectedFullDate)}
                      className="rounded-lg border border-sanfran-rubi/25 bg-sanfran-rubi/10 px-2 py-1 text-[8px] font-black uppercase tracking-tight text-sanfran-rubi transition-colors hover:bg-sanfran-rubi/15"
                    >
                      + Nova
                    </button>
                    <button
                      type="button"
                      onClick={() => openTasksNewWithDue(selectedFullDate)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[8px] font-black uppercase tracking-tight text-slate-500 transition-colors hover:border-slate-300 dark:border-white/10 dark:text-slate-400"
                    >
                      Na pauta
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {dailyTaskOccurrences.map((occ) => {
                    const t = occ.task;
                    return (
                      <button
                        key={occ.occurrenceKey}
                        type="button"
                        onClick={() => openTaskInTasksModule(t.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition-colors hover:border-sanfran-rubi/25 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Gavel className={`h-3 w-3 shrink-0 ${t.completed ? 'text-emerald-500' : 'text-usp-blue'}`} />
                          <span className={`truncate text-[10px] font-bold ${t.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                            {t.recurrence ? '↻ ' : ''}
                            {t.title}
                          </span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>
                    );
                  })}
                  {dailyTaskOccurrences.length === 0 && <p className="text-[9px] italic text-slate-300 font-bold uppercase text-center py-4">Nenhum prazo</p>}
                </div>
              </div>

              {showGoogleExternalEvents && (
                <div>
                  <h4 className="text-[9px] font-black uppercase text-blue-700 dark:text-blue-300 tracking-widest mb-3 flex items-center gap-2">
                    Google (leitura)
                  </h4>
                  <div className="space-y-2">
                    {googleEventsNeedsAuth ? (
                      <p className="text-[9px] font-bold text-blue-700/90 dark:text-blue-300/90 text-center py-2 leading-relaxed">
                        Conecte com Google Sync para ver eventos deste dia.
                      </p>
                    ) : (
                      <>
                        {googleExternalEvents
                          .filter((ev) => eventTouchesLocalDay(ev, detailDate))
                          .map((ev) => (
                            <div
                              key={`dg-${ev.id}`}
                              className="p-3 rounded-xl border border-blue-200/70 bg-blue-50/50 dark:border-blue-500/25 dark:bg-blue-950/30"
                            >
                              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">{ev.summary}</p>
                              <p className="text-[8px] font-black uppercase text-blue-600/90 dark:text-blue-400 mt-1">
                                {ev.allDay
                                  ? 'Dia inteiro'
                                  : `${ev.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} – ${ev.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                              </p>
                            </div>
                          ))}
                        {googleExternalEvents.filter((ev) => eventTouchesLocalDay(ev, detailDate)).length === 0 && (
                          <p className="text-[9px] italic text-slate-300 font-bold uppercase text-center py-2">Nada no Google neste dia</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-sanfran-rubi rounded-3xl p-6 text-white shadow-lg shadow-red-900/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl"><Info size={16} /></div>
              <p className="text-[10px] font-black uppercase tracking-widest">Dica de Gestão</p>
            </div>
            <p className="text-xs font-medium leading-relaxed opacity-90">
              Sincronize seu Google Agenda para receber notificações de prazos diretamente no seu celular.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {taskModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
            onClick={() => !modalSaving && setTaskModal(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#141414]"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Nova tarefa</h3>
                  <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Prazo {brDateLabelFromYmd(taskModal.dateStr)} ({taskModal.dateStr})
                  </p>
                </div>
                <button
                  type="button"
                  disabled={modalSaving}
                  onClick={() => setTaskModal(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <label className="block">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">Título</span>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="Ex.: Entregar trabalho de Civil"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sanfran-rubi/25 dark:border-white/10 dark:bg-black/30 dark:text-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void saveQuickTask();
                    }
                  }}
                />
              </label>
              <label className="mt-4 block">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">Disciplina</span>
                <select
                  value={modalSubjectId}
                  onChange={(e) => setModalSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sanfran-rubi/25 dark:border-white/10 dark:bg-black/30 dark:text-white"
                >
                  <option value="">Geral</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={modalSaving}
                  onClick={() => void saveQuickTask()}
                  className="flex-1 rounded-xl bg-sanfran-rubi px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-opacity disabled:opacity-50"
                >
                  {modalSaving ? 'Salvando…' : 'Salvar'}
                </button>
                <button
                  type="button"
                  disabled={modalSaving}
                  onClick={() => {
                    const d = taskModal.dateStr;
                    setTaskModal(null);
                    openTasksNewWithDue(d);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  Abrir em Tarefas
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarView;
