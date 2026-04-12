import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutDashboard, Timer as TimerIcon, BookOpen, CheckSquare, BrainCircuit, Moon, Sun, LogOut, Calendar as CalendarIcon, Clock as ClockIcon, Menu, X, Coffee, Gavel, Play, Pause, Trophy, Library as LibraryIcon, Users, MessageSquare, Calculator as CalculatorIcon, Mic, Building2, CalendarClock, Armchair, Briefcase, Scroll, ClipboardList, GitCommit, Archive, Quote, Scale, Gamepad2, Zap, ShoppingBag, Sword, Bell, Target, Network, Keyboard, FileSignature, Calculator, Megaphone, Dna, Banknote, ClipboardCheck, ScanSearch, Languages, Split, ThumbsUp, Map as MapIcon, Hourglass, Globe, IdCard, Pin, Landmark, LayoutGrid, Radio, GraduationCap, Leaf, Wrench, ShieldCheck, BookX, ScrollText, FileText, Repeat, UserX, ListTodo, Handshake, Eye, Key, CalendarCheck, Loader2, BarChart3, Search, Command, ChevronLeft, ChevronRight } from 'lucide-react';
import { View, Subject, Flashcard, Task, Folder, StudySession, Reading, PresenceUser, Duel, StudyMode, Board, Notification, Friendship, UserProfile } from './types';
import Login from './components/Login';
import Atmosphere from './components/Atmosphere';
import Scratchpad from './components/Scratchpad';
import { supabase } from './services/supabaseClient';
import { db } from './services/offlineService';
import { dataService } from './services/dataService';
import { Toaster, toast } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { getViewLabel, getBrasiliaDate, getBrasiliaISOString } from './utils';
import {
  createScopedRealtimeDebounce,
  type UserDataSyncScope,
} from './utils/realtimeThrottle';
import { getDataScopesForView } from './utils/routeDataScopes';
import {
  FLASHCARD_CLOUD_COLUMNS,
  TASK_CLOUD_COLUMNS,
  SUBJECT_CLOUD_COLUMNS,
  formatCloudFlashcardRow,
  formatCloudTaskRow,
  formatCloudFolderRow,
} from './utils/supabaseCloudRowFormatters';
import { bulkPutInChunks, bulkDeleteIdsInChunks } from './utils/dexieBulkYield';
import {
  normalizeBoardColumnIds,
  persistBoardColumnNormalization,
} from './utils/normalizeBoardColumnIds';
import {
  STUDY_SESSIONS_LIST_COLUMNS as STUDY_SESSION_CLOUD_COLUMNS,
  USER_PROGRESS_CLOUD_COLUMNS,
} from './utils/supabaseSelectColumns';

/** Tabelas na fila offline sem scope dedicado em `loadUserData` — usar `scope: full`. */
const SYNC_TABLES_REQUIRING_FULL_LOAD = new Set(['notes', 'subject_files', 'legal_frontiers']);
const SYNC_OFFLINE_TIMEOUT_MS = 12000;

/** Limite para `scope: study_sessions` (rotas). `full` mantém histórico completo. */
const STUDY_SESSIONS_ROUTE_LIMIT = 300;
const ROUTE_SCOPE_TIMEOUT_MS = 8000;
const SUBJECT_CLOUD_COLUMNS_FALLBACK =
  'id, user_id, name, color, semester_start_date, semester_end_date, absences, max_absences, semester_year, workload, p1_date, p2_date, content';

async function fetchSubjectsCloudRows(userId: string) {
  const primary = await supabase
    .from('subjects')
    .select(SUBJECT_CLOUD_COLUMNS)
    .eq('user_id', userId);
  if (!primary.error) return primary;

  const fallback = await supabase
    .from('subjects')
    .select(SUBJECT_CLOUD_COLUMNS_FALLBACK)
    .eq('user_id', userId);
  if (!fallback.error) return fallback;

  console.warn('[subjects] Failed to fetch with primary and fallback columns', {
    primaryError: primary.error,
    fallbackError: fallback.error,
  });
  return fallback;
}

async function loadScopeWithTimeout(
  loader: (scope: UserDataSyncScope) => Promise<void>,
  scope: UserDataSyncScope,
  timeoutMs: number
): Promise<boolean> {
  const timeout = new Promise<'timeout'>((resolve) =>
    setTimeout(() => resolve('timeout'), timeoutMs)
  );
  const result = await Promise.race([
    loader(scope).then(() => 'ok' as const),
    timeout,
  ]);
  if (result === 'timeout') {
    console.warn(`[route-data] scope "${scope}" timed out after ${timeoutMs}ms`);
    return false;
  }
  return true;
}

function mapCloudSubjectRows(subsRows: Record<string, unknown>[] | null | undefined): Subject[] {
  return (subsRows ?? []).map((row) => {
    const colorRaw = row.color;
    const color =
      typeof colorRaw === 'string' && colorRaw.trim() !== ''
        ? colorRaw.trim()
        : '#94a3b8';
    return {
      id: String(row.id),
      name: String(row.name ?? ''),
      color,
      semester_start_date: (row.semester_start_date as string) ?? undefined,
      semester_end_date: (row.semester_end_date as string) ?? undefined,
      absences: typeof row.absences === 'number' ? row.absences : undefined,
      max_absences: typeof row.max_absences === 'number' ? row.max_absences : undefined,
      semester_year: (row.semester_year as string) ?? undefined,
      workload: typeof row.workload === 'number' ? row.workload : undefined,
      p1_date: (row.p1_date as string) ?? undefined,
      p2_date: (row.p2_date as string) ?? undefined,
      content: (row.content as string) ?? undefined,
      topics: Array.isArray(row.topics) ? (row.topics as Subject['topics']) : undefined,
    };
  });
}

function sortStudySessionsNewestFirst<T extends { id: string; start_time?: string; created_at?: string }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const ka = String(a.start_time ?? a.created_at ?? a.id);
    const kb = String(b.start_time ?? b.created_at ?? b.id);
    return kb.localeCompare(ka);
  });
}

// Lazy Load dos Componentes para Performance (Code Splitting)
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Profile = React.lazy(() => import('./components/Profile'));
const Anki = React.lazy(() => import('./components/Anki'));
const Pomodoro = React.lazy(() => import('./components/Pomodoro'));
const Subjects = React.lazy(() => import('./components/Subjects'));
const TaskMasterDetail = React.lazy(() => import('./components/TaskMasterDetail'));
const CalendarView = React.lazy(() => import('./components/CalendarView'));
const Ranking = React.lazy(() => import('./components/Ranking'));
const Library = React.lazy(() => import('./components/Library'));
const Largo = React.lazy(() => import('./components/Largo'));
const Mural = React.lazy(() => import('./components/Mural'));
const GradeCalculator = React.lazy(() => import('./components/GradeCalculator'));
const DeadlineCalculator = React.lazy(() => import('./components/DeadlineCalculator'));
const OralArgument = React.lazy(() => import('./components/OralArgument'));
const StudyRooms = React.lazy(() => import('./components/StudyRooms'));
const VirtualOffice = React.lazy(() => import('./components/VirtualOffice'));
const Societies = React.lazy(() => import('./components/Societies'));
const LeiSeca = React.lazy(() => import('./components/LeiSeca'));
const Editais = React.lazy(() => import('./components/Editais'));
const TimelineBuilder = React.lazy(() => import('./components/TimelineBuilder'));
const DeadArchive = React.lazy(() => import('./components/DeadArchive'));
const CitationGenerator = React.lazy(() => import('./components/CitationGenerator'));
const JurisprudenceMural = React.lazy(() => import('./components/JurisprudenceMural'));
const SumulaChallenge = React.lazy(() => import('./components/SumulaChallenge'));
const Sebo = React.lazy(() => import('./components/Sebo'));
const ClassificadosPatio = React.lazy(() => import('./components/ClassificadosPatio'));
const DuelArena = React.lazy(() => import('./components/DuelArena'));
const OabCountdown = React.lazy(() => import('./components/OabCountdown'));
const SpecializationTree = React.lazy(() => import('./components/SpecializationTree'));
const TypingChallenge = React.lazy(() => import('./components/TypingChallenge'));
const Petitum = React.lazy(() => import('./components/Petitum'));
const Dosimetria = React.lazy(() => import('./components/Dosimetria'));
const Debate = React.lazy(() => import('./components/Debate'));
const Trunfo = React.lazy(() => import('./components/Trunfo'));
const Honorarios = React.lazy(() => import('./components/Honorarios'));
const Checklist = React.lazy(() => import('./components/Checklist'));
const InvestigationBoard = React.lazy(() => import('./components/InvestigationBoard'));
const HeaderActions = React.lazy(() => import('./components/HeaderActions'));
const LatinGame = React.lazy(() => import('./components/LatinGame'));
const SucessaoSimulator = React.lazy(() => import('./components/SucessaoSimulator'));
const JurisTinder = React.lazy(() => import('./components/JurisTinder'));
const InternRPG = React.lazy(() => import('./components/InternRPG'));
const PrescriptionCalculator = React.lazy(() => import('./components/PrescriptionCalculator'));
const SanFranIdiomas = React.lazy(() => import('./components/SanFranIdiomas'));
const DigitalID = React.lazy(() => import('./components/DigitalID'));
const DominioJuridico = React.lazy(() => import('./components/DominioJuridico'));
const ErrorLog = React.lazy(() => import('./components/ErrorLog'));
const CodeTracker = React.lazy(() => import('./components/CodeTracker'));
const IracMethod = React.lazy(() => import('./components/IracMethod')); 
const SpacedRepetition = React.lazy(() => import('./components/SpacedRepetition'));
const Connect = React.lazy(() => import('./components/Connect'));
const Friends = React.lazy(() => import('./components/Friends'));
const AttendanceCalculator = React.lazy(() => import('./components/AttendanceCalculator'));
const SyllabusTracker = React.lazy(() => import('./components/SyllabusTracker')); 
const DeadlinePlanner = React.lazy(() => import('./components/DeadlinePlanner'));
const Mentorship = React.lazy(() => import('./components/Mentorship'));
const MockJury = React.lazy(() => import('./components/MockJury'));
const PetitionWiki = React.lazy(() => import('./components/PetitionWiki')); 
const StudyPact = React.lazy(() => import('./components/StudyPact'));
const LargoAuction = React.lazy(() => import('./components/LargoAuction'));
const SocialEvents = React.lazy(() => import('./components/SocialEvents'));
const TheVault = React.lazy(() => import('./components/TheVault')); 
const CaronasRepublicas = React.lazy(() => import('./components/CaronasRepublicas'));
const BalcaoEstagios = React.lazy(() => import('./components/BalcaoEstagios')); 
const TribunalOpiniao = React.lazy(() => import('./components/TribunalOpiniao')); 
const BussolaOptativas = React.lazy(() => import('./components/BussolaOptativas'));
const AchadosPerdidos = React.lazy(() => import('./components/AchadosPerdidos'));
const PerolasTribuna = React.lazy(() => import('./components/PerolasTribuna'));
const GuiaSobrevivencia = React.lazy(() => import('./components/GuiaSobrevivencia'));
const ClubeLivro = React.lazy(() => import('./components/ClubeLivro')); 
const GuerraTurmas = React.lazy(() => import('./components/GuerraTurmas'));
const SpeedReader = React.lazy(() => import('./components/SpeedReader'));
const Mnemonics = React.lazy(() => import('./components/Mnemonics'));
const ReverseStudyPlanner = React.lazy(() => import('./components/ReverseStudyPlanner')); 
const Statistics = React.lazy(() => import('./components/Statistics'));
const GlobalSearch = React.lazy(() => import('./components/GlobalSearch'));
const SanFranEssential = React.lazy(() => import('./components/SanFranEssential'));
const SanFranCommunity = React.lazy(() => import('./components/SanFranCommunity'));
const SanFranImprovement = React.lazy(() => import('./components/SanFranImprovement'));
const SanFranLanguages = React.lazy(() => import('./components/SanFranLanguages'));
const SanFranLife = React.lazy(() => import('./components/SanFranLife'));
const SanFranGames = React.lazy(() => import('./components/SanFranGames'));
const SanFranHelp = React.lazy(() => import('./components/SanFranHelp'));
const FAQ = React.lazy(() => import('./components/FAQ'));
const Settings = React.lazy(() => import('./components/Settings'));
const SanFranOAB = React.lazy(() => import('./components/SanFranOAB'));
const SanFranConcursos = React.lazy(() => import('./components/SanFranConcursos'));
const ApprovalTrail = React.lazy(() => import('./components/ApprovalTrail'));
const LegalCinema = React.lazy(() => import('./components/LegalCinema'));
const GeneralLanguages = React.lazy(() => import('./components/GeneralLanguages')); 
const LegalSimplifier = React.lazy(() => import('./components/LegalSimplifier'));
const PronunciationLab = React.lazy(() => import('./components/PronunciationLab'));
const LyricalVibes = React.lazy(() => import('./components/LyricalVibes'));
const TheExchangeStudent = React.lazy(() => import('./components/TheExchangeStudent'));
const VisualFlashcards = React.lazy(() => import('./components/VisualFlashcards'));
const BilingualNews = React.lazy(() => import('./components/BilingualNews'));
const SlangChallenge = React.lazy(() => import('./components/SlangChallenge'));
const QuestionBank = React.lazy(() => import('./components/QuestionBank'));
const IntelligentSummarizer = React.lazy(() => import('./components/IntelligentSummarizer'));
const StudyBuddy = React.lazy(() => import('./components/StudyBuddy'));
const CaseAnalyzer = React.lazy(() => import('./components/CaseAnalyzer'));
const Certificates = React.lazy(() => import('./components/Certificates'));
const NoteView = React.lazy(() => import('./components/NoteView'));

// Loading Fallback Component com Estilo
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-full w-full animate-in fade-in duration-300 min-h-[400px]">
    <div className="relative">
       <div className="absolute inset-0 bg-sanfran-rubi blur-2xl opacity-20 rounded-full animate-pulse"></div>
       <Loader2 className="w-12 h-12 text-sanfran-rubi animate-spin relative z-10" />
    </div>
    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Carregando Módulo...</p>
  </div>
);


const BrasiliaClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []); // Ensure this runs only once on mount

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = formatter.formatToParts(time);
  const dateStr = `${parts.find(p => p.type === 'day')?.value}/${parts.find(p => p.type === 'month')?.value}/${parts.find(p => p.type === 'year')?.value}`;
  const timeStr = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;

  return (
    <div className="mt-4 px-4 py-3 bg-slate-50 dark:bg-sanfran-rubi/10 rounded-2xl border border-slate-100 dark:border-sanfran-rubi/20">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-sanfran-rubi tracking-widest mb-1">
        <ClockIcon className="w-3 h-3" /> Brasília
      </div>
      <div className="text-sm font-black text-slate-950 dark:text-white leading-none">{timeStr}</div>
      <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{dateStr}</div>
    </div>
  );
};

const getPathFromView = (view: View): string => {
  if (view === View.Dashboard) return '/';
  if (view === View.QuestionBank) return '/questoes';
  if (view === View.Anki) return '/flashcards';
  if (view === View.ErrorLog) return '/caderno-erros';
  return `/${view}`;
};

const getViewFromPath = (pathname: string): View => {
  if (pathname === '/' || pathname === '') return View.Dashboard;
  if (pathname === '/questoes') return View.QuestionBank;
  if (pathname === '/flashcards') return View.Anki;
  if (pathname === '/simulados') return View.QuestionBank;
  if (pathname === '/caderno-erros') return View.ErrorLog;
  
  const pathWithoutSlash = pathname.substring(1);
  if (Object.values(View).includes(pathWithoutSlash as View)) {
    return pathWithoutSlash as View;
  }
  return View.Dashboard;
};

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentView = getViewFromPath(location.pathname);
  
  const setCurrentView = (view: View) => {
    navigate(getPathFromView(view));
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(() => {
    const saved = localStorage.getItem('sanfran_sidebar_minimized');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sanfran_sidebar_minimized', JSON.stringify(isSidebarMinimized));
  }, [isSidebarMinimized]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  /** Ignora refetch Realtime logo após sync em lote (rajada de postgres_changes). */
  const realtimeMutedUntilRef = useRef(0);
  const loadedDataScopesRef = useRef(new Set<UserDataSyncScope>());
  const [isRouteDataLoading, setIsRouteDataLoading] = useState(false);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>({
    id: '',
    archetype: 'Carregando...',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    answers: {},
    answeredQuestionIds: [],
    scores: { social: 0, corporativo: 0, academico: 0, politico: 0, resiliencia: 0, tecnologico: 0 },
    matrix: { academicoVsPratico: 0, extensaoVsCarreira: 0, socialVsReservado: 0, urgenciaVsPlanejamento: 0 },
    tags: [],
    arcadia_score: 0,
    productivityStats: { completedToday: 0, completedYesterday: 0, streak: 0 }
  });

  // DUEL STATES
  const [activeDuel, setActiveDuel] = useState<Duel | null>(null);
  const [incomingDuel, setIncomingDuel] = useState<Duel | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('omnistudy_darkmode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [correctQuestionsCount, setCorrectQuestionsCount] = useState(0);
  const [wrongQuestionsCount, setWrongQuestionsCount] = useState(0);
  const [wrongQuestionIds, setWrongQuestionIds] = useState<string[]>([]);
  const [confidenceLevels, setConfidenceLevels] = useState<Record<string, 'certeza' | 'duvida' | 'chute'>>({});
  const [selectedSubjectIdForNotes, setSelectedSubjectIdForNotes] = useState<string | null>(null);
  const [selectedSubjectIdForRepository, setSelectedSubjectIdForRepository] = useState<string | null>(null);
  const [selectedSubjectIdForAssignments, setSelectedSubjectIdForAssignments] = useState<string | null>(null);
  const [ankiTextToGenerate, setAnkiTextToGenerate] = useState<string | null>(null);

  // --- Timer Global State (Pomodoro) ---
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [timerStudyMode, setTimerStudyMode] = useState<StudyMode>(StudyMode.CLASSIC);
  const [timerCustomWorkMinutes, setTimerCustomWorkMinutes] = useState(25);
  const [timerCustomBreakMinutes, setTimerCustomBreakMinutes] = useState(5);
  const [timerSelectedSubjectId, setTimerSelectedSubjectId] = useState<string | null>(null);
  const [timerSelectedReadingId, setTimerSelectedReadingId] = useState<string | null>(null);
  const [timerSelectedTaskId, setTimerSelectedTaskId] = useState<string | null>(null);
  const [timerTotalInitial, setTimerTotalInitial] = useState(25 * 60);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Study Room State ---
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomStartTime, setRoomStartTime] = useState<number | null>(null);
  const [isPomodoroMinimized, setIsPomodoroMinimized] = useState(false);
  const [isExtremeFocusActive, setIsExtremeFocusActive] = useState(false);

  const isExtremeFocus = isExtremeFocusActive && currentView === View.Timer && timerMode === 'work' && !isPomodoroMinimized;

  const toggleMinimizePomodoro = () => {
    setIsPomodoroMinimized(!isPomodoroMinimized);
  };

  // Presence: subscribe once per login — do not tear down on every route/timer change (was hammering Realtime).
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceSubscribedRef = useRef(false);

  useEffect(() => {
    presenceSubscribedRef.current = false;
    if (!isAuthenticated || !session?.user) {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel('largo_presenca', {
      config: { presence: { key: session.user.id } },
    });
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        Object.keys(state).forEach((key) => {
          const userState = state[key] && state[key].length > 0 ? (state[key][0] as any) : null;
          if (userState) {
            users.push({
              user_id: userState.user_id,
              name: userState.name,
              view: userState.view,
              subject_name: userState.subject_name,
              is_timer_active: userState.is_timer_active,
              last_seen: userState.last_seen,
              study_room_id: userState.study_room_id,
              study_start_time: userState.study_start_time,
              localizacao_atual: userState.localizacao_atual,
              turma: userState.turma,
              cargo: userState.cargo
            });
          }
        });
        setPresenceUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          presenceSubscribedRef.current = true;
          const selectedSubject = subjects.find(s => s.id === timerSelectedSubjectId);
          await channel.track({
            user_id: session.user.id,
            name: session.user.user_metadata?.full_name || 'Doutor(a)',
            view: currentView,
            subject_name: timerIsActive ? (selectedSubject?.name || 'Geral') : undefined,
            is_timer_active: timerIsActive,
            last_seen: new Date().toISOString(),
            study_room_id: currentView === View.StudyRoom ? currentRoomId : null,
            study_start_time: currentView === View.StudyRoom ? roomStartTime : null,
            localizacao_atual: getViewLabel(currentView),
            turma: userProfile?.turma,
            cargo: userProfile?.experiencias_lideranca?.[0]?.cargo
          });
        }
      });

    return () => {
      presenceSubscribedRef.current = false;
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [isAuthenticated, session?.user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !session?.user) return;
    const channel = presenceChannelRef.current;
    if (!channel || !presenceSubscribedRef.current) return;

    const selectedSubject = subjects.find(s => s.id === timerSelectedSubjectId);
    void channel.track({
      user_id: session.user.id,
      name: session.user.user_metadata?.full_name || 'Doutor(a)',
      view: currentView,
      subject_name: timerIsActive ? (selectedSubject?.name || 'Geral') : undefined,
      is_timer_active: timerIsActive,
      last_seen: new Date().toISOString(),
      study_room_id: currentView === View.StudyRoom ? currentRoomId : null,
      study_start_time: currentView === View.StudyRoom ? roomStartTime : null,
      localizacao_atual: getViewLabel(currentView),
      turma: userProfile?.turma,
      cargo: userProfile?.experiencias_lideranca?.[0]?.cargo
    });
  }, [
    isAuthenticated,
    session?.user?.id,
    session?.user?.user_metadata?.full_name,
    currentView,
    timerIsActive,
    timerSelectedSubjectId,
    subjects,
    currentRoomId,
    roomStartTime,
    userProfile?.turma,
    userProfile?.experiencias_lideranca,
  ]);

  // Duels: only rows where the user participates (avoids processing every duel row on the project).
  useEffect(() => {
    if (!isAuthenticated || !session?.user) return;
    const uid = session.user.id;

    const handleDuelPayload = (payload: { new: Record<string, unknown> }) => {
      const duel = payload.new as unknown as Duel;
      if (!duel) return;

      if (duel.opponent_id === uid && duel.status === 'pending') {
        setIncomingDuel(duel);
      }

      if ((duel.challenger_id === uid || duel.opponent_id === uid) && duel.status === 'active') {
        setIncomingDuel(null);
        setActiveDuel(duel);
        setCurrentView(View.Duel);
      }
    };

    const duelsChannel = supabase
      .channel('global_duels_filtered')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duels', filter: `challenger_id=eq.${uid}` },
        handleDuelPayload
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duels', filter: `opponent_id=eq.${uid}` },
        handleDuelPayload
      )
      .subscribe();

    return () => {
      supabase.removeChannel(duelsChannel);
    };
  }, [isAuthenticated, session?.user?.id]);

  // Pomodoro Logic
  useEffect(() => {
    if (timerIsActive && timerSecondsLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (timerSecondsLeft === 0 && timerIsActive) {
      handleTimerComplete();
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerIsActive, timerSecondsLeft]);

  const handleTimerComplete = async () => {
    setTimerIsActive(false);
    if (timerMode === 'work') {
      await saveStudySession(timerTotalInitial);
      setTimerMode('break');
      toast.success("Ciclo concluído! Hora do descanso.");
    } else {
      setTimerMode('work');
      toast.info("Descanso encerrado. De volta aos estudos.");
    }
  };

  const manualFinalize = async () => {
    const elapsed = timerTotalInitial - timerSecondsLeft;
    if (elapsed < 10) {
      if (!confirm("O tempo decorrido é muito curto. Deseja realmente protocolar apenas alguns segundos?")) return;
    }
    
    if (timerMode === 'work' && elapsed > 0) {
      await saveStudySession(elapsed);
    }
    
    setTimerIsActive(false);
  };

  const saveStudySession = async (duration: number) => {
    if (!session?.user) return;
    const brDate = getBrasiliaISOString();
    const newSessionId = crypto.randomUUID();

    const newSession: StudySession = {
      id: newSessionId,
      user_id: session.user.id,
      duration: duration,
      subject_id: timerSelectedSubjectId || '',
      reading_id: timerSelectedReadingId || undefined,
      task_id: timerSelectedTaskId || undefined,
      start_time: brDate
    };

    await dataService.saveStudySession(newSession, session.user.id, isOnline);
    setStudySessions(prev => [newSession, ...prev]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Auth & Data Loading ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("[Auth] Failed to get initial session:", error.message);
        // If refresh token is invalid or not found, force a logout to clear the stale state
        if (error.message.includes("Refresh Token Not Found") || error.message.includes("Invalid Refresh Token")) {
          supabase.auth.signOut();
          setSession(null);
          setIsAuthenticated(false);
        }
        return;
      }
      
      setSession(session);
      setIsAuthenticated(!!session);
      if (session?.user) {
        syncProfile(session.user);
        clearOldLocalStorage(session.user.id);
      }
    }).catch(err => {
      console.warn("[Auth] Unexpected error getting session:", err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        syncProfile(session.user);
        clearOldLocalStorage(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        // Clear any local state if needed
        setSession(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearOldLocalStorage = (userId: string) => {
    const keysToRemove = [
      `sanfran_favorites_${userId}`,
      `sanfran_wrong_${userId}`,
      `sanfran_correct_${userId}`,
      `sanfran_notes_${userId}`,
      `sanfran_correct_count_${userId}`,
      `sanfran_wrong_count_${userId}`,
      `sanfran_error_mastery_${userId}`,
      'sanfran_citation_history',
      'sanfran_sumula_pb',
      'sanfran_oral_argument_notes',
      'sanfran_grades_sim'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
  };

  const syncProfile = async (user: any) => {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
    const avatar = user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
    
    try {
      // Sync to profiles table
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: name,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
      if (profileError) console.warn("Sincronização de 'profiles' falhou.", profileError);

      // Also ensure user_persona exists so they appear in community
      const { data: existingPersona, error: checkError } = await supabase
        .from('user_persona')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError || !existingPersona) {
        const { error: personaError } = await supabase.from('user_persona').upsert({
          id: user.id,
          full_name: name,
          avatar_url: avatar,
          persona_data: {
            nome: name,
            email: user.email,
            avatar_url: avatar
          },
          profile_completion: 10
        }, { onConflict: 'id' });
        
        if (personaError) console.warn("Sincronização de 'user_persona' falhou.", personaError);
      } else {
        // Only update if missing critical fields
        const updates: any = {};
        if (!existingPersona.full_name) updates.full_name = name;
        if (!existingPersona.avatar_url) updates.avatar_url = avatar;
        
        if (Object.keys(updates).length > 0) {
          await supabase.from('user_persona').update(updates).eq('id', user.id);
        }
      }
    } catch (e) {
      console.warn("Sincronização de perfil falhou.", e);
    }
  };

  // --- Offline listeners ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Arranque: `bootstrap` (perfil + leve); sync da fila Dexie só se houver itens.
   * Após sync em lote, silencia Realtime brevemente para não disparar rajada de refetch.
   */
  useEffect(() => {
    if (!isAuthenticated || !session?.user) return;
    let cancelled = false;

    void (async () => {
      await loadUserData({ scope: 'bootstrap' });
      if (cancelled) return;

      if (isOnline) {
        const n = await db.syncQueue.count();
        if (n > 0) {
          try {
            setIsSyncing(true);
            realtimeMutedUntilRef.current = Date.now() + 2000;
            clearOldLocalStorage(session.user.id);
            const pendingTables = [
              ...new Set((await db.syncQueue.orderBy('id').toArray()).map((q) => q.table)),
            ];
            const syncResult = await Promise.race([
              dataService.syncOfflineData(session.user.id).then(() => 'ok' as const),
              new Promise<'timeout'>((resolve) =>
                setTimeout(() => resolve('timeout'), SYNC_OFFLINE_TIMEOUT_MS)
              ),
            ]);
            if (syncResult === 'timeout') {
              console.warn('[sync] timeout; continuing with partial refresh to avoid blocking UI');
            }
            if (!cancelled) {
              const needsFull = pendingTables.some((t) =>
                SYNC_TABLES_REQUIRING_FULL_LOAD.has(t)
              );
              if (needsFull) {
                const routeScopes = getDataScopesForView(currentView);
                const fallbackScopes: UserDataSyncScope[] = ['subjects', 'tasks', 'flashcards'];
                const scopesToLoad = [...new Set((routeScopes.length > 0 ? routeScopes : fallbackScopes))];
                await Promise.all(scopesToLoad.map((s) => loadUserData({ scope: s })));
              } else {
                const scopesSet = new Set<UserDataSyncScope>();
                if (pendingTables.includes('user_profile')) scopesSet.add('bootstrap');
                if (pendingTables.includes('flashcards')) scopesSet.add('flashcards');
                if (pendingTables.includes('tasks')) scopesSet.add('tasks');
                if (pendingTables.includes('folders')) scopesSet.add('folders');
                if (pendingTables.includes('study_sessions')) scopesSet.add('study_sessions');
                if (pendingTables.includes('subjects')) scopesSet.add('subjects');
                if (pendingTables.includes('boards')) scopesSet.add('boards');
                const scopes = [...scopesSet];
                if (scopes.length > 0) {
                  await Promise.all(scopes.map((s) => loadUserData({ scope: s })));
                }
              }
            }
          } catch (err) {
            console.error('Sync failed:', err);
          } finally {
            if (!cancelled) setIsSyncing(false);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, session?.user?.id, isOnline, currentView]);

  const loadUserData = async (opts?: { scope?: UserDataSyncScope }) => {
    const scope: UserDataSyncScope = opts?.scope ?? 'bootstrap';
    const showFlashLoading = scope === 'full' || scope === 'flashcards';
    const userId = session?.user?.id;

    const hydrateOfflineBootstrapOrFull = async () => {
      if (!userId) return;
      const [localTasks, localBoards, localSessions, localFolders, localSubs, localCards, profileRow] =
        await Promise.all([
          db.tasks.toArray(),
          db.boards.toArray(),
          db.study_sessions.toArray(),
          db.folders.toArray(),
          db.subjects.toArray(),
          db.flashcards.toArray(),
          db.user_profile.get(userId),
        ]);
      let nextBoards = localBoards as Board[];
      let nextTasks = localTasks as Task[];
      const columnNorm = normalizeBoardColumnIds(nextBoards, nextTasks);
      if (columnNorm.changed) {
        await persistBoardColumnNormalization(
          nextBoards,
          columnNorm.boards,
          nextTasks,
          columnNorm.tasks,
          userId,
          isOnline
        );
        nextBoards = columnNorm.boards;
        nextTasks = columnNorm.tasks;
      }
      setTasks(nextTasks);
      setBoards(nextBoards);
      setStudySessions(localSessions);
      setFolders(localFolders);
      setSubjects(localSubs);
      setFlashcards(localCards);
      setReadings([]);
      if (profileRow) setUserProfile(profileRow as UserProfile);
    };

    try {
      if (!userId) {
        return;
      }

      if (showFlashLoading) {
        setIsLoadingFlashcards(true);
      }

      if (!isOnline) {
        if (scope === 'bootstrap' || scope === 'full') {
          await hydrateOfflineBootstrapOrFull();
          return;
        }
        if (scope === 'tasks') {
          setTasks(await db.tasks.toArray());
          return;
        }
        if (scope === 'boards') {
          setBoards(await db.boards.toArray());
          return;
        }
        if (scope === 'study_sessions') {
          setStudySessions(await db.study_sessions.toArray());
          return;
        }
        if (scope === 'folders') {
          setFolders(await db.folders.toArray());
          return;
        }
        if (scope === 'flashcards') {
          setFlashcards(await db.flashcards.toArray());
          return;
        }
        if (scope === 'subjects') {
          setSubjects(await db.subjects.toArray());
          return;
        }
        if (scope === 'readings') {
          setReadings([]);
          return;
        }
        if (scope === 'user_progress') {
          return;
        }
        return;
      }

      if (scope === 'bootstrap') {
        const profile = await dataService.getUserProfile(userId, isOnline);
        if (profile) {
          const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
          if (profile.lastInteractionDate && profile.lastInteractionDate !== today) {
            const updatedProfile = {
              ...profile,
              productivityStats: {
                ...profile.productivityStats,
                completedYesterday: profile.productivityStats?.completedToday || 0,
                completedToday: 0,
              },
            };
            setUserProfile(updatedProfile);
            await dataService.saveUserProfile(updatedProfile, userId, isOnline);
          } else {
            setUserProfile(profile);
          }
        }
        return;
      }

      // Realtime: one table changed — avoid reloading the entire user dataset
      if (scope === 'user_progress') {
        const { data } = await supabase
          .from('user_progress')
          .select(USER_PROGRESS_CLOUD_COLUMNS)
          .eq('user_id', userId)
          .maybeSingle();
        if (data) {
          setCorrectQuestionsCount(data.correct_count || 0);
          setWrongQuestionsCount(data.wrong_count || 0);
          setWrongQuestionIds(data.wrong_questions || data.wrong_question_ids || []);
          setConfidenceLevels(data.confidence_levels || {});
        }
        return;
      }

      if (scope === 'folders') {
        const { data } = await supabase
          .from('folders')
          .select('id, name, parent_id, color, icon, target_date, shared, original_deck_id, version')
          .eq('user_id', userId);
        if (data) {
          const formattedFolders = data.map((f) =>
            formatCloudFolderRow(f as unknown as Record<string, unknown>)
          );
          const syncCount = await db.syncQueue.count();
          if (syncCount === 0) {
            const localFolders = await db.folders.toArray();
            const remoteIds = new Set(formattedFolders.map((f) => f.id));
            const idsToDelete = localFolders.filter((f) => !remoteIds.has(f.id)).map((f) => f.id);
            if (idsToDelete.length > 0) await bulkDeleteIdsInChunks(db.folders, idsToDelete);
            await bulkPutInChunks(db.folders, formattedFolders);
          }
          setFolders(formattedFolders);
        }
        return;
      }

      if (scope === 'tasks') {
        const { data } = await supabase
          .from('tasks')
          .select(TASK_CLOUD_COLUMNS)
          .or(`user_id.eq.${userId},delegated_to.eq.${userId}`)
          .is('archived_at', null)
          .order('created_at', { ascending: false });
        if (data) {
          const formattedTasks = data.map((t) =>
            formatCloudTaskRow(t as unknown as Record<string, unknown>)
          );
          const syncCount = await db.syncQueue.count();
          if (syncCount === 0) {
            const localTasks = await db.tasks.toArray();
            const remoteIds = new Set(formattedTasks.map((t) => t.id));
            const idsToDelete = localTasks.filter((t) => !remoteIds.has(t.id)).map((t) => t.id);
            if (idsToDelete.length > 0) await bulkDeleteIdsInChunks(db.tasks, idsToDelete);
            await bulkPutInChunks(db.tasks, formattedTasks as Task[]);
          }
          setTasks(formattedTasks as Task[]);
        }
        return;
      }

      if (scope === 'flashcards') {
        const { data } = await supabase
          .from('flashcards')
          .select(FLASHCARD_CLOUD_COLUMNS)
          .eq('user_id', userId)
          .is('archived_at', null);
        if (data) {
          setFlashcards(
            data.map((row) => formatCloudFlashcardRow(row as unknown as Record<string, unknown>))
          );
        }
        return;
      }

      if (scope === 'subjects') {
        const { data: subsRows, error: subjectsFetchError } = await fetchSubjectsCloudRows(userId);
        if (!subjectsFetchError && subsRows) {
          const subs = mapCloudSubjectRows(subsRows as unknown as Record<string, unknown>[]);
          const syncQueueCount = await db.syncQueue.count();
          if (syncQueueCount === 0) {
            const localSubs = await db.subjects.toArray();
            const remoteIds = new Set(subs.map((s) => s.id));
            const idsToDelete = localSubs.filter((s) => !remoteIds.has(s.id)).map((s) => s.id);
            if (idsToDelete.length > 0) await bulkDeleteIdsInChunks(db.subjects, idsToDelete);
            await bulkPutInChunks(db.subjects, subs);
          }
          setSubjects(subs);
        }
        return;
      }

      if (scope === 'boards') {
        const { data } = await supabase
          .from('boards')
          .select('id, name, columns, user_id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (data) {
          const formattedBoards = data.map((b) => ({
            id: b.id,
            name: b.name,
            columns: b.columns,
            userId: b.user_id,
            createdAt: b.created_at,
          }));
          const syncQueueCount = await db.syncQueue.count();
          if (syncQueueCount === 0) {
            await bulkPutInChunks(db.boards, formattedBoards);
          }
          setBoards(formattedBoards);
        }
        return;
      }

      if (scope === 'readings') {
        const { data } = await supabase
          .from('readings')
          .select('id, title, author')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (data) {
          setReadings(
            data.map((r) => ({
              id: r.id,
              user_id: userId,
              title: r.title ?? '',
              author: r.author ?? '',
              total_pages: 0,
              current_page: 0,
              status: 'lendo' as Reading['status'],
            }))
          );
        }
        return;
      }

      if (scope === 'study_sessions') {
        const { data } = await supabase
          .from('study_sessions')
          .select(STUDY_SESSION_CLOUD_COLUMNS)
          .eq('user_id', userId)
          .order('start_time', { ascending: false })
          .limit(STUDY_SESSIONS_ROUTE_LIMIT);
        if (data) {
          const sessionsSorted = sortStudySessionsNewestFirst(
            data as { id: string; start_time?: string; created_at?: string }[]
          ) as StudySession[];
          const syncQueueCount = await db.syncQueue.count();
          if (syncQueueCount === 0) {
            await bulkPutInChunks(db.study_sessions, sessionsSorted);
          }
          setStudySessions(sessionsSorted);
        }
        return;
      }

      if (scope === 'full' && isOnline) {
        const syncQueueCount = await db.syncQueue.count();

        const [
          subsRes,
          profile,
          [resFlds, resCards, resTks, resBoards, resSessions, resReadings, resProgress],
        ] = await Promise.all([
          fetchSubjectsCloudRows(userId),
          dataService.getUserProfile(userId, isOnline),
          Promise.all([
            supabase
              .from('folders')
              .select('id, name, parent_id, color, icon, target_date, shared, original_deck_id, version')
              .eq('user_id', userId),
            supabase
              .from('flashcards')
              .select(FLASHCARD_CLOUD_COLUMNS)
              .eq('user_id', userId)
              .is('archived_at', null),
            supabase
              .from('tasks')
              .select(TASK_CLOUD_COLUMNS)
              .or(`user_id.eq.${userId},delegated_to.eq.${userId}`)
              .is('archived_at', null)
              .order('created_at', { ascending: false }),
            supabase
              .from('boards')
              .select('id, name, columns, user_id, created_at')
              .eq('user_id', userId)
              .order('created_at', { ascending: false }),
            supabase.from('study_sessions').select(STUDY_SESSION_CLOUD_COLUMNS).eq('user_id', userId),
            supabase
              .from('readings')
              .select('id, title, author')
              .eq('user_id', userId)
              .order('created_at', { ascending: false }),
            supabase.from('user_progress').select(USER_PROGRESS_CLOUD_COLUMNS).eq('user_id', userId).maybeSingle(),
          ]),
        ]);

        const { data: subsRows, error: subjectsFetchError } = subsRes;

        const subs = mapCloudSubjectRows((subsRows ?? []) as Record<string, unknown>[]);

        if (profile) {
          const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
          if (profile.lastInteractionDate && profile.lastInteractionDate !== today) {
            const updatedProfile = {
              ...profile,
              productivityStats: {
                ...profile.productivityStats,
                completedYesterday: profile.productivityStats?.completedToday || 0,
                completedToday: 0
              }
            };
            setUserProfile(updatedProfile);
            await dataService.saveUserProfile(updatedProfile, userId, isOnline);
          } else {
            setUserProfile(profile);
          }
        }

        if (resFlds.data) {
          const formattedFolders = resFlds.data.map((f) =>
            formatCloudFolderRow(f as unknown as Record<string, unknown>)
          );

          if (syncQueueCount === 0) {
            const localFolders = await db.folders.toArray();
            const remoteIds = new Set(formattedFolders.map((f) => f.id));
            const idsToDelete = localFolders.filter((f) => !remoteIds.has(f.id)).map((f) => f.id);
            if (idsToDelete.length > 0) await bulkDeleteIdsInChunks(db.folders, idsToDelete);
            await bulkPutInChunks(db.folders, formattedFolders);
          }
          setFolders(formattedFolders);
        }
        
        if (!subjectsFetchError) {
          if (syncQueueCount === 0) {
            const localSubs = await db.subjects.toArray();
            const remoteIds = new Set(subs.map((s) => s.id));
            const idsToDelete = localSubs.filter((s) => !remoteIds.has(s.id)).map((s) => s.id);
            if (idsToDelete.length > 0) await bulkDeleteIdsInChunks(db.subjects, idsToDelete);
            await bulkPutInChunks(db.subjects, subs);
          }
          setSubjects(subs);
        }

        if (resProgress.data) {
          setCorrectQuestionsCount(resProgress.data.correct_count || 0);
          setWrongQuestionsCount(resProgress.data.wrong_count || 0);
          setWrongQuestionIds(resProgress.data.wrong_questions || resProgress.data.wrong_question_ids || []);
          setConfidenceLevels(resProgress.data.confidence_levels || {});
        }
        
        if (resCards.data) {
          setFlashcards(
            resCards.data.map((row) => formatCloudFlashcardRow(row as unknown as Record<string, unknown>))
          );
        }

        let mergedTasksFull: Task[] | undefined;
        if (resTks.data) {
          const formattedTasks = resTks.data.map((t) =>
            formatCloudTaskRow(t as unknown as Record<string, unknown>)
          ) as Task[];

          if (syncQueueCount === 0) {
            const localTasks = await db.tasks.toArray();
            const remoteIds = new Set(formattedTasks.map((t) => t.id));
            const idsToDelete = localTasks.filter((t) => !remoteIds.has(t.id)).map((t) => t.id);
            if (idsToDelete.length > 0) await bulkDeleteIdsInChunks(db.tasks, idsToDelete);
          }
          mergedTasksFull = formattedTasks as Task[];
        }

        let mergedBoardsFull: Board[] | undefined;
        if (resBoards.data) {
          mergedBoardsFull = resBoards.data.map((b) => ({
            id: b.id,
            name: b.name,
            columns: b.columns,
            userId: b.user_id,
            createdAt: b.created_at,
          })) as Board[];
        }

        if (mergedTasksFull && mergedBoardsFull) {
          const norm = normalizeBoardColumnIds(mergedBoardsFull, mergedTasksFull);
          const outBoards = norm.boards;
          const outTasks = norm.tasks;
          if (norm.changed) {
            await persistBoardColumnNormalization(
              mergedBoardsFull,
              outBoards,
              mergedTasksFull,
              outTasks,
              userId,
              isOnline
            );
          } else if (syncQueueCount === 0) {
            await bulkPutInChunks(db.tasks, outTasks);
            await bulkPutInChunks(db.boards, outBoards);
          }
          setTasks(outTasks);
          setBoards(outBoards);
        } else {
          if (mergedTasksFull) {
            if (syncQueueCount === 0) {
              await bulkPutInChunks(db.tasks, mergedTasksFull);
            }
            setTasks(mergedTasksFull);
          }
          if (mergedBoardsFull) {
            if (syncQueueCount === 0) {
              await bulkPutInChunks(db.boards, mergedBoardsFull);
            }
            setBoards(mergedBoardsFull);
          }
        }
        
        if (resSessions.data) {
          const sessionsSorted = sortStudySessionsNewestFirst(
            resSessions.data as { id: string; start_time?: string; created_at?: string }[]
          ) as StudySession[];
          if (syncQueueCount === 0) {
            const localSessions = await db.study_sessions.toArray();
            const remoteIds = new Set(sessionsSorted.map(s => s.id));
            const idsToDelete = localSessions.filter(s => !remoteIds.has(s.id)).map(s => s.id);
            if (idsToDelete.length > 0) await bulkDeleteIdsInChunks(db.study_sessions, idsToDelete);
            await bulkPutInChunks(db.study_sessions, sessionsSorted);
          }
          setStudySessions(sessionsSorted);
        }

        if (resReadings.data) {
          setReadings(
            resReadings.data.map((r) => ({
              id: r.id,
              user_id: userId,
              title: r.title ?? '',
              author: r.author ?? '',
              total_pages: 0,
              current_page: 0,
              status: 'lendo' as Reading['status'],
            }))
          );
        }
      }
    } catch (err) {
      console.error("Erro no carregamento dos dados:", err);
      if (scope === 'full' || scope === 'bootstrap') {
        try {
          await hydrateOfflineBootstrapOrFull();
        } catch (fallbackErr) {
          console.error("Erro ao hidratar dados locais após falha na nuvem:", fallbackErr);
        }
      }
    } finally {
      if (showFlashLoading) {
        setIsLoadingFlashcards(false);
      }
    }
  };

  const loadUserDataRef = useRef(loadUserData);
  loadUserDataRef.current = loadUserData;

  useEffect(() => {
    if (!isAuthenticated || !session?.user?.id) return;
    const scopes = [...new Set(getDataScopesForView(currentView))];
    const pending = scopes.filter((s) => !loadedDataScopesRef.current.has(s));
    if (pending.length === 0) return;
    setIsRouteDataLoading(true);
    void (async () => {
      try {
        const results = await Promise.all(
          pending.map((s) =>
            loadScopeWithTimeout(
              async (scope) => loadUserDataRef.current({ scope }),
              s,
              ROUTE_SCOPE_TIMEOUT_MS
            )
          )
        );
        pending.forEach((s, idx) => {
          if (results[idx]) loadedDataScopesRef.current.add(s);
        });
      } finally {
        setIsRouteDataLoading(false);
      }
    })();
  }, [currentView, isAuthenticated, session?.user?.id]);

  const refreshCalendarTasks = useCallback(() => {
    void loadUserDataRef.current({ scope: 'tasks' });
  }, []);

  // --- Realtime Data Sync Listener (debounced + scoped refetch; after loadUserDataRef) ---
  useEffect(() => {
    if (!isAuthenticated || !session?.user) return;

    const userId = session.user.id;

    const debounced = createScopedRealtimeDebounce(1000, async (scopes) => {
      if (Date.now() < realtimeMutedUntilRef.current) return;
      if (scopes.has('user_progress')) {
        await loadUserDataRef.current({ scope: 'user_progress' });
      }
    });

    const dataChannel = supabase.channel('realtime_data_sync')
      // questions: não escutar aqui — loadUserData não lê essa tabela; QuestionBank já inscreve em `question_bank_changes`.
      // Flashcards: merge incremental (evita refetch de todo o deck a cada cartão estudado).
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'flashcards',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (Date.now() < realtimeMutedUntilRef.current) return;
        const p = payload as {
          eventType: string;
          new: Record<string, unknown> | null;
          old: Partial<{ id: string }> | null;
        };
        if (p.eventType === 'DELETE') {
          const id = p.old?.id;
          if (id) setFlashcards((prev) => prev.filter((c) => c.id !== id));
          return;
        }
        if (p.eventType === 'INSERT' || p.eventType === 'UPDATE') {
          const row = p.new;
          if (!row || typeof row !== 'object') return;
          const archived = row.archived_at;
          if (archived != null && archived !== '') {
            const rid = String(row.id ?? '');
            if (rid) setFlashcards((prev) => prev.filter((c) => c.id !== rid));
            return;
          }
          const card = formatCloudFlashcardRow(row);
          if (!card.id) return;
          setFlashcards((prev) => {
            const i = prev.findIndex((c) => c.id === card.id);
            if (i === -1) return [...prev, card];
            const next = [...prev];
            next[i] = card;
            return next;
          });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (Date.now() < realtimeMutedUntilRef.current) return;
        const p = payload as {
          eventType: string;
          new: Record<string, unknown> | null;
          old: Partial<{ id: string }> | null;
        };
        if (p.eventType === 'DELETE') {
          const id = p.old?.id;
          if (id) setTasks((prev) => prev.filter((t) => t.id !== id));
          return;
        }
        if (p.eventType === 'INSERT' || p.eventType === 'UPDATE') {
          const row = p.new;
          if (!row || typeof row !== 'object') return;
          const archived = row.archived_at;
          if (archived != null && archived !== '') {
            const rid = String(row.id ?? '');
            if (rid) setTasks((prev) => prev.filter((t) => t.id !== rid));
            return;
          }
          const task = formatCloudTaskRow(row);
          if (!task.id) return;
          setTasks((prev) => {
            const i = prev.findIndex((t) => t.id === task.id);
            if (i === -1) return [...prev, task];
            const next = [...prev];
            next[i] = task;
            return next;
          });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folders',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (Date.now() < realtimeMutedUntilRef.current) return;
        const p = payload as {
          eventType: string;
          new: Record<string, unknown> | null;
          old: Partial<{ id: string }> | null;
        };
        if (p.eventType === 'DELETE') {
          const id = p.old?.id;
          if (id) setFolders((prev) => prev.filter((f) => f.id !== id));
          return;
        }
        if (p.eventType === 'INSERT' || p.eventType === 'UPDATE') {
          const row = p.new;
          if (!row || typeof row !== 'object') return;
          const folder = formatCloudFolderRow(row);
          if (!folder.id) return;
          setFolders((prev) => {
            const i = prev.findIndex((f) => f.id === folder.id);
            if (i === -1) return [...prev, folder];
            const next = [...prev];
            next[i] = folder;
            return next;
          });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_progress',
        filter: `user_id=eq.${userId}`
      }, () => debounced.schedule('user_progress'))
      .subscribe();

    return () => {
      debounced.cancel();
      supabase.removeChannel(dataChannel);
    };
  }, [isAuthenticated, session?.user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !session?.user) return;
    void (async () => {
      try {
        const { auth, getRedirectResult } = await import('./firebase');
        const { GoogleAuthProvider } = await import('firebase/auth');
        const { googleCalendarService } = await import('./services/googleCalendarService');
        const result = await getRedirectResult(auth);
        if (!result) return;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        if (!token) {
          toast.error(
            'Login Google concluído, mas o token do Calendar não veio. Ative a Google Calendar API no projeto Google Cloud ligado ao Firebase e confira o ecrã de consentimento OAuth.'
          );
          return;
        }
        googleCalendarService.setFirebaseToken(token);
        toast.success('Conectado ao Google Agenda.');
        sessionStorage.setItem('sanfran_gcal_post_redirect_sync', '1');
      } catch (err: unknown) {
        console.error('getRedirectResult:', err);
        const e = err as { code?: string; message?: string };
        if (e?.code && e.code !== 'auth/popup-closed-by-user') {
          toast.error(e.message || 'Não foi possível concluir o login do Google.');
        }
      }
    })();
  }, [isAuthenticated, session?.user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !session?.user) return;
    if (isLoadingFlashcards) return;
    if (sessionStorage.getItem('sanfran_gcal_post_redirect_sync') !== '1') return;
    sessionStorage.removeItem('sanfran_gcal_post_redirect_sync');
    const userId = session.user.id;

    void (async () => {
      try {
        const { syncDueTasksToGoogleAndSupabaseFromCloud } = await import(
          './services/googleCalendarTaskSync'
        );
        const { successCount, withDueCount } = await syncDueTasksToGoogleAndSupabaseFromCloud(userId);
        if (withDueCount === 0) {
          toast.info('Nenhuma tarefa com prazo para sincronizar.');
        } else if (successCount > 0) {
          toast.success(`${successCount} tarefa(s) enviadas ao Google Agenda (novas ou atualizadas).`);
        } else {
          toast.error('Não foi possível sincronizar as tarefas com o Google Agenda.');
        }
      } finally {
        await loadUserDataRef.current({ scope: 'tasks' });
      }
    })();
  }, [isAuthenticated, session?.user?.id, isLoadingFlashcards]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('omnistudy_darkmode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const acceptDuel = async (duel: Duel) => {
    try {
      await supabase.from('duels').update({ status: 'active' }).eq('id', duel.id);
      setIncomingDuel(null);
    } catch (e) {
      alert("Erro ao aceitar desafio.");
    }
  };

  const declineDuel = async (duel: Duel) => {
    try {
      await supabase.from('duels').update({ status: 'declined' }).eq('id', duel.id);
      setIncomingDuel(null);
    } catch (e) {
      console.error(e);
    }
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  const incrementCorrectQuestions = async () => {
    if (!session?.user) return;
    
    try {
      // Use RPC or a simple update to increment the count safely
      const { data: current } = await supabase
        .from('user_progress')
        .select('correct_count')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const newCount = (current?.correct_count || 0) + 1;
      
      await supabase
        .from('user_progress')
        .update({ 
          correct_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id);
        
      setCorrectQuestionsCount(newCount);
    } catch (e) {
      console.error("Erro ao sincronizar acertos:", e);
    }
  };

  // ATUALIZAÇÃO DA NAV BAR - PROMOVENDO OS RAMOS ESSENCIAIS
  const navItems = [
    { id: View.Dashboard, icon: LayoutDashboard, label: 'Painel', color: 'text-slate-600', bg: 'bg-slate-100' },
    
    // RAMOS PRINCIPAIS AGORA NO NÍVEL SUPERIOR
    { id: View.Subjects, icon: BookOpen, label: 'Disciplinas', color: 'text-pink-600', bg: 'bg-pink-100' },
    { id: View.Tasks, icon: CheckSquare, label: 'Tarefas', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: View.Anki, icon: BrainCircuit, label: 'FLASHCARDS', color: 'text-slate-900', bg: 'bg-slate-200' },
    { id: View.Connect, icon: MessageSquare, label: 'CONNECT', color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: View.Friends, icon: Users, label: 'FRIENDS', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: View.Statistics, icon: BarChart3, label: 'Estatísticas', color: 'text-usp-gold', bg: 'bg-usp-gold/10' },
    { id: View.Timer, icon: TimerIcon, label: 'Controle de Tempo', color: 'text-red-600', bg: 'bg-red-100' },

    // HUBS
    { id: View.SanFranCommunity, icon: Users, label: 'COMMUNITY', color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { id: View.SanFranImprovement, icon: GraduationCap, label: 'Improvement', color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: View.SanFranEssential, icon: LayoutGrid, label: 'ESSENTIAL', color: 'text-indigo-600', bg: 'bg-indigo-100' }, // Renomeado
    { id: View.SanFranLanguages, icon: Languages, label: 'Languages', color: 'text-sky-600', bg: 'bg-sky-100' },
    { id: View.SanFranLife, icon: Leaf, label: 'LIFE', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: View.SanFranGames, icon: Gamepad2, label: 'Games', color: 'text-orange-500', bg: 'bg-orange-100' },
    { id: View.SanFranHelp, icon: Wrench, label: 'HELP', color: 'text-slate-500', bg: 'bg-slate-100' },
    { id: View.SanFranOAB, icon: ShieldCheck, label: 'OAB', color: 'text-red-600', bg: 'bg-red-100' },
    { id: View.SanFranConcursos, icon: ClipboardList, label: 'CONCURSOS', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ];

  // Helper to check if current view is a child of SanFran Essential (Updated List)
  const isEssentialChild = [View.Calendar, View.Ranking, View.DeadArchive, View.Calculator, View.ErrorLog, View.CodeTracker, View.IracMethod, View.SpacedRepetition, View.AttendanceCalculator, View.SyllabusTracker, View.DeadlinePlanner, View.SpeedReader, View.Mnemonics, View.ReverseSchedule, View.Statistics].includes(currentView);
  
  // Helper to check if current view is a child of SanFran Community
  const isCommunityChild = [View.Debate, View.ClassificadosPatio, View.JurisprudenceMural, View.Societies, View.Largo, View.StudyRoom, View.Mural, View.Mentorship, View.MockJury, View.PetitionWiki, View.StudyPact, View.LargoAuction, View.SocialEvents, View.TheVault, View.CaronasRepublicas, View.BalcaoEstagios, View.TribunalOpiniao, View.BussolaOptativas, View.AchadosPerdidos, View.PerolasTribuna, View.GuiaSobrevivencia, View.ClubeLivro, View.GuerraTurmas].includes(currentView);

  // Helper to check if current view is a child of SanFran Improvement
  const isImprovementChild = [View.Specialization, View.TypingChallenge, View.TypingLab, View.DominioJuridico, View.Timeline, View.LeiSeca, View.Library, View.Sumulas, View.OralArgument, View.QuestionBank, View.IntelligentSummarizer, View.StudyBuddy, View.Certificates, View.CaseAnalyzer].includes(currentView);

  // Helper to check if current view is a child of SanFran Languages
  const isLanguagesChild = [View.SanFranIdiomas, View.LegalCinema, View.GeneralLanguages, View.PronunciationLab, View.LyricalVibes, View.TheExchangeStudent, View.VisualFlashcards, View.BilingualNews, View.SlangChallenge, View.LatinGame].includes(currentView);

  // Helper to check if current view is a child of SanFran Life
  const isLifeChild = [View.Office, View.Sebo].includes(currentView);

  // Helper to check if current view is a child of SanFran Games
  const isGamesChild = [View.InternRPG, View.JurisTinder, View.LatinGame, View.Trunfo, View.SumulaChallenge].includes(currentView);

  // Helper to check if current view is a child of SanFran Help
  const isHelpChild = [View.PrescriptionCalculator, View.SucessaoSimulator, View.InvestigationBoard, View.Checklist, View.Honorarios, View.FeeCalculator, View.Dosimetria, View.Petitum, View.DraftGenerator, View.CitationGenerator, View.DeadlineCalculator, View.CostSplitter, View.ForensicCalendar, View.LegalSimplifier].includes(currentView);

  // Helper to check if current view is a child of SanFran OAB
  const isOABChild = [View.OabCountdown, View.Specialization].includes(currentView);

  // Helper to check if current view is a child of SanFran Concursos
  const isConcursosChild = [View.Editais, View.Timeline, View.QuestionBank].includes(currentView);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);

  // Fetch notifications and friends
  useEffect(() => {
    const fetchColabData = async () => {
      if (session?.user?.id) {
        const [notifs, frnds] = await Promise.all([
          dataService.getNotifications(session.user.id),
          dataService.getFriendships(session.user.id)
        ]);
        setNotifications(notifs);
        setFriends(frnds);
      }
    };
    fetchColabData();

    // Set up real-time subscription for notifications
    if (session?.user?.id) {
      const channel = supabase
        .channel('notifications_realtime')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        }, (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => {
            // Avoid duplicates
            if (prev.some(n => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          
          // Show a toast for new notifications if they are not read
          if (!newNotif.is_read) {
            toast(newNotif.message, {
              icon: <Bell className="text-sanfran-rubi" size={16} />,
              action: newNotif.type === 'friend_request' ? {
                label: 'Ver',
                onClick: () => setCurrentView(View.Friends)
              } : undefined
            });
          }
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session?.user?.id]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.type === 'friend_request') {
      setCurrentView(View.Friends);
    } else if (notification.link_task) {
      setCurrentView(View.Tasks);
    }
    
    // Mark as read
    await dataService.markNotificationAsRead(notification.id);
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
  };

  const handleAcceptFriendRequest = async (notification: Notification) => {
    if (!session?.user?.id) {
      toast.error("Você precisa estar logado.");
      return;
    }

    try {
      // Find the friendship record
      let friendshipId = notification.link_task;
      let requesterId = '';

      if (!friendshipId) {
        const { data: friendship, error: fError } = await supabase
          .from('friendships')
          .select('id, user_id')
          .eq('friend_id', session.user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fError) {
          console.error("[App] Error finding friendship:", fError);
          throw fError;
        }
        
        if (friendship) {
          friendshipId = friendship.id;
          requesterId = friendship.user_id;
        }
      } else {
        // If we have the ID, just get the requester ID for the notification
        const { data: friendship } = await supabase
          .from('friendships')
          .select('user_id')
          .eq('id', friendshipId)
          .maybeSingle();
        if (friendship) requesterId = friendship.user_id;
      }

      if (!friendshipId) {
        toast.error("Solicitação não encontrada ou já processada.");
        // Mark notification as read anyway since it's stale
        await dataService.markNotificationAsRead(notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        return;
      }

      await dataService.handleFriendRequest(friendshipId, 'accepted');
      
      // Update local friends state
      setFriends(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'accepted' } : f));
      
      // Notify the requester
      if (requesterId) {
        try {
          await dataService.createNotification(
            requesterId,
            `${userProfile?.full_name || 'Alguém'} aceitou sua solicitação de amizade!`,
            undefined,
            'friend_accepted'
          );
        } catch (notifErr) {
          console.warn("[App] Could not send notification, but friendship was accepted:", notifErr);
        }
      }

      toast.success("Amizade aceita!");
      
      // Mark notification as read
      await dataService.markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
    } catch (error: any) {
      console.error("[App] Error accepting friend request:", error);
      const message = error.message || "Erro ao aceitar solicitação.";
      toast.error(`Erro: ${message}`);
    }
  };

  const handleDeclineFriendRequest = async (notification: Notification) => {
    if (!session?.user?.id) {
      toast.error("Você precisa estar logado.");
      return;
    }

    try {
      // Find the friendship record
      let friendshipId = notification.link_task;

      if (!friendshipId) {
        const { data: friendship, error: fError } = await supabase
          .from('friendships')
          .select('id')
          .eq('friend_id', session.user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fError) {
          console.error("[App] Error finding friendship:", fError);
          throw fError;
        }
        if (friendship) friendshipId = friendship.id;
      }

      if (friendshipId) {
        await dataService.handleFriendRequest(friendshipId, 'declined');
        // Update local friends state
        setFriends(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'declined' } : f));
        toast.info("Solicitação recusada.");
      } else {
        toast.info("Solicitação já processada.");
      }
      
      // Mark notification as read
      await dataService.markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
    } catch (error: any) {
      console.error("[App] Error declining friend request:", error);
      const message = error.message || "Erro ao recusar solicitação.";
      toast.error(`Erro: ${message}`);
    }
  };

  const handleLogout = async () => {
    loadedDataScopesRef.current.clear();
    try {
      await supabase.auth.signOut();
      // Limpa dados locais para evitar vazamento entre usuários e garantir sincronização limpa no próximo login
      await Promise.all([
        db.flashcards.clear(),
        db.tasks.clear(),
        db.study_sessions.clear(),
        db.notes.clear(),
        db.subject_files.clear(),
        db.folders.clear(),
        db.subjects.clear(),
        db.boards.clear(),
        db.user_profile.clear(),
        db.syncQueue.clear()
      ]);
      window.location.reload();
    } catch (err) {
      console.error("Erro ao encerrar sessão:", err);
    }
  };

  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div
      className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden transition-colors duration-500 ${isDarkMode ? 'dark bg-sanfran-rubiBlack' : 'bg-[#F8F9FA]'}`}
    >
      <Toaster position="top-right" richColors />
      
      <Atmosphere isExtremeFocus={isExtremeFocus} isSidebarOpen={isSidebarOpen} isSidebarMinimized={isSidebarMinimized} />
      
      <Suspense fallback={null}>
        <GlobalSearch 
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          flashcards={flashcards}
          tasks={tasks}
          readings={readings}
          subjects={subjects}
          onNavigate={setCurrentView}
        />
      </Suspense>

      {session?.user && <Scratchpad userId={session.user.id} isExtremeFocus={isExtremeFocus} />}

      {/* NOTIFICAÇÃO DE DUELO */}
      <div id="duel-notification-portal">
        {incomingDuel && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 animate-in slide-in-from-top-10">
             <div className="bg-white dark:bg-slate-900 rounded-[2rem] border-4 border-sanfran-rubi shadow-2xl p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 border-2 border-sanfran-rubi animate-pulse">
                   <Sword className="text-sanfran-rubi w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Desafio Recebido!</h4>
                <p className="text-xs text-slate-500 font-bold mb-6"><b>{incomingDuel.challenger_name}</b> convocou você para um Duelo de Jurisconsultos.</p>
                <div className="grid grid-cols-2 gap-3 w-full">
                   <button onClick={() => declineDuel(incomingDuel)} className="py-3 bg-slate-100 dark:bg-white/10 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest">Declinar</button>
                   <button onClick={() => acceptDuel(incomingDuel)} className="py-3 bg-sanfran-rubi text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-900/20">Aceitar Lide</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {isSidebarOpen && !isExtremeFocus && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${
          isExtremeFocus
            ? '-translate-x-full lg:-translate-x-full lg:w-0 lg:pointer-events-none'
            : `lg:translate-x-0 ${isSidebarMinimized ? 'lg:w-20' : 'lg:w-72'}`
        } fixed inset-y-0 left-0 z-40 h-[100dvh] max-h-[100dvh] max-lg:w-[min(20rem,calc(100vw-1.25rem))] max-lg:max-w-[90vw] shrink-0 bg-white dark:bg-[#0d0303] border-r border-slate-200 dark:border-sanfran-rubi/30 transition-all duration-500 flex flex-col shadow-2xl lg:shadow-none overflow-hidden`}
      >
        <div className={`p-6 border-b border-slate-100 dark:border-sanfran-rubi/20 flex flex-col ${isSidebarMinimized ? 'items-center px-2' : ''}`}>
          <div className="flex items-center justify-between mb-4 w-full">
            <Link
              to={getPathFromView(View.Profile)}
              onClick={() => closeSidebar()}
              className={`group text-left p-2 -m-2 rounded-xl transition-all duration-200 hover:bg-slate-50 dark:hover:bg-white/5 block ${isSidebarMinimized ? 'mx-auto' : 'w-full'}`}
            >
              <div className="flex items-center gap-4">
                {/* Ícone do Livro (Mantido e Restaurado) */}
                <div className="w-14 h-14 bg-sanfran-rubi text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
                   <BookOpen size={28} />
                </div>

                {/* Tipografia Corrigida */}
                {!isSidebarMinimized && (
                  <div className="flex flex-col">
                     <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9]">
                       SanFran
                       <br />
                       Academy
                     </h1>
                     <div className="h-0.5 w-full bg-sanfran-rubi/20 my-1 rounded-full group-hover:bg-sanfran-rubi transition-colors"></div>
                     <span className="text-[9px] font-black text-sanfran-rubi uppercase tracking-[0.2em]">
                       XI de Agosto
                     </span>
                  </div>
                )}
              </div>
            </Link>
            {!isSidebarMinimized && (
              <button onClick={closeSidebar} className="lg:hidden p-2 text-slate-400 hover:text-sanfran-rubi transition-colors self-start">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          
          {!isSidebarMinimized && <BrasiliaClock />}
          
          <button 
            onClick={() => setIsSearchOpen(true)}
            className={`mt-4 flex items-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sanfran-rubi hover:border-sanfran-rubi/50 transition-all group ${isSidebarMinimized ? 'w-12 h-12 justify-center p-0' : 'w-full px-4 py-3 gap-3'}`}
            title={isSidebarMinimized ? "Pesquisar (Cmd+K)" : ""}
          >
            <Search className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0" />
            {!isSidebarMinimized && (
              <>
                <span>Pesquisar...</span>
                <div className="ml-auto flex items-center gap-1 opacity-50">
                  <Command size={10} /> K
                </div>
              </>
            )}
          </button>
        </div>
        
        <nav className={`p-4 space-y-1 flex-1 min-h-0 overflow-y-auto custom-scrollbar ${isSidebarMinimized ? 'px-2' : ''}`}>
          {navItems.map((item) => {
            const isActive = currentView === item.id || 
                             (item.id === View.SanFranEssential && isEssentialChild) ||
                             (item.id === View.SanFranCommunity && isCommunityChild) ||
                             (item.id === View.SanFranImprovement && isImprovementChild) ||
                             (item.id === View.SanFranLanguages && isLanguagesChild) ||
                             (item.id === View.SanFranLife && isLifeChild) ||
                             (item.id === View.SanFranGames && isGamesChild) ||
                             (item.id === View.SanFranHelp && isHelpChild) ||
                             (item.id === View.SanFranOAB && isOABChild) ||
                             (item.id === View.SanFranConcursos && isConcursosChild);
            
            return (
              <Link 
                key={item.id} 
                to={getPathFromView(item.id)}
                onClick={() => closeSidebar()} 
                className={`group w-full flex items-center rounded-2xl transition-all duration-300 border relative ${isSidebarMinimized ? 'justify-center p-2' : 'gap-4 p-3'} ${
                  isActive
                    ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-xl scale-[1.02] z-10' 
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
                }`}
                title={isSidebarMinimized ? item.label : ""}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 shrink-0 ${
                  isActive
                    ? `${item.bg} dark:bg-white/10` 
                    : 'bg-slate-100 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10'
                }`}>
                  <item.icon className={`w-5 h-5 transition-colors ${
                    isActive
                      ? item.color + ' dark:text-white'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-sanfran-rubi dark:group-hover:text-white'
                  }`} />
                </div>
                
                {!isSidebarMinimized && (
                  <div className="flex-1 text-left">
                     <span className={`block text-[10px] font-black uppercase tracking-widest transition-colors ${
                       isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                     }`}>
                       {item.label}
                     </span>
                  </div>
                )}

                {item.id === View.SanFranCommunity && presenceUsers.length > 0 && (
                  <span className={`${isSidebarMinimized ? 'absolute top-1 right-1' : 'w-5 h-5 ml-auto'} bg-cyan-500 text-[9px] font-black rounded-full flex items-center justify-center text-white shadow-md animate-pulse`}>
                    {presenceUsers.length}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className={`p-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-sanfran-rubi/10 ${isSidebarMinimized ? 'px-2 items-center flex flex-col' : ''}`}>
          <button 
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)} 
            className={`hidden lg:flex items-center justify-center bg-white dark:bg-sanfran-rubiDark border border-slate-200 dark:border-sanfran-rubi/30 text-slate-900 dark:text-white shadow-sm hover:shadow-md transition-all rounded-xl ${isSidebarMinimized ? 'w-10 h-10' : 'w-full py-2 gap-2 text-[9px] font-black uppercase tracking-widest'}`}
            title={isSidebarMinimized ? "Expandir Barra Lateral" : "Minimizar Barra Lateral"}
          >
            {isSidebarMinimized ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> Minimizar</>}
          </button>
        </div>
      </aside>

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col relative transition-[padding] duration-500 ease-out ${
          isExtremeFocus ? '' : isSidebarMinimized ? 'lg:pl-20' : 'lg:pl-72'
        } ${!isExtremeFocus && currentView === View.Tasks ? 'max-h-[100dvh] overflow-hidden' : ''}`}
      >
        <header className={`${isExtremeFocus ? 'hidden' : 'lg:hidden'} bg-white dark:bg-[#0d0303] border-b border-slate-200 dark:border-sanfran-rubi/30 px-3 py-3 sm:p-4 flex items-center justify-between gap-2 sticky top-0 z-20 min-w-0`}>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center bg-slate-100 dark:bg-sanfran-rubi/10 rounded-xl text-slate-600 dark:text-white shrink-0 touch-manipulation"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <div className="bg-sanfran-rubi p-1.5 rounded-lg text-white shrink-0"><BookOpen className="w-4 h-4" /></div>
            <span className="text-xs sm:text-sm font-black dark:text-white uppercase tracking-tighter truncate text-center">SanFran Academy</span>
          </div>
          <div className="w-10 shrink-0" aria-hidden />
        </header>

        <main
          className={`flex-1 min-h-0 overflow-x-hidden ${isExtremeFocus ? 'p-0' : currentView === View.Tasks ? 'grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-2 sm:p-3 md:p-5' : 'overflow-y-auto p-3 sm:p-5 md:p-8 lg:p-10'} relative transition-all duration-700`}
        >
          {!isExtremeFocus && (
            <div className={`flex justify-end mb-4 md:mb-6 w-full min-w-0 overflow-x-auto ${currentView === View.Tasks ? 'shrink-0' : ''}`}>
              <HeaderActions 
                notifications={notifications} 
                userId={session?.user?.id || ''}
                userProfile={userProfile}
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                onNotificationClick={handleNotificationClick}
                onAcceptFriendRequest={handleAcceptFriendRequest}
                onDeclineFriendRequest={handleDeclineFriendRequest}
                onMarkAllRead={() => setNotifications(prev => prev.map(n => n.type === 'friend_request' ? n : { ...n, is_read: true }))}
                onViewChange={setCurrentView}
                onLogout={handleLogout}
                timerIsActive={(timerIsActive || timerSecondsLeft < timerTotalInitial) && currentView !== View.Timer}
                timerSecondsLeft={timerSecondsLeft}
                timerTotalInitial={timerTotalInitial}
                timerMode={timerMode}
              />
            </div>
          )}
          {/* Offline Indicator */}
          {!isOnline && (
            <div className="fixed z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full bg-amber-500 px-3 py-2 text-white shadow-lg animate-bounce sm:px-4 top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))]">
              <Zap size={16} fill="currentColor" />
              <span className="text-[10px] font-black uppercase tracking-widest">Modo Offline Ativo</span>
            </div>
          )}
          {isSyncing && (
            <div className="fixed z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full bg-blue-500 px-3 py-2 text-white shadow-lg sm:px-4 top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))]">
              <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
            </div>
          )}
          <div
            className={`${
              isExtremeFocus
                ? 'max-w-none h-full min-h-0 flex items-center justify-center'
                : currentView === View.Tasks
                  ? 'max-w-none flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden'
                  : 'max-w-6xl xl:max-w-7xl 2xl:max-w-[min(96rem,calc(100vw-2rem))] mx-auto w-full min-w-0 max-w-[100%] h-full min-h-0 flex flex-col'
            }`}
          >
             <Suspense fallback={<PageLoader />}>
<ErrorBoundary>
<Routes>
                <Route path={getPathFromView(View.Dashboard)} element={
                  <Dashboard 
                    subjects={subjects} 
                    flashcards={flashcards} 
                    tasks={tasks} 
                    studySessions={studySessions} 
                    readings={readings} 
                    onNavigate={setCurrentView}
                    isRouteDataLoading={isRouteDataLoading}
                  />
                } />
                
                {/* HUBS */}
                <Route path={getPathFromView(View.SanFranEssential)} element={<SanFranEssential onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.SanFranCommunity)} element={<SanFranCommunity onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.SanFranImprovement)} element={<SanFranImprovement onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.SanFranLanguages)} element={<SanFranLanguages onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.SanFranLife)} element={<SanFranLife onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.SanFranGames)} element={<SanFranGames onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.SanFranHelp)} element={<SanFranHelp onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.FAQ)} element={<FAQ onNavigate={setCurrentView} />} />
                <Route
                  path={getPathFromView(View.Settings)}
                  element={
                    <Settings
                      userId={session?.user?.id}
                      userProfile={userProfile}
                      setUserProfile={setUserProfile}
                      isOnline={isOnline}
                    />
                  }
                />
                <Route path={getPathFromView(View.SanFranOAB)} element={<SanFranOAB onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.SanFranConcursos)} element={<SanFranConcursos onNavigate={setCurrentView} />} />

                <Route path={getPathFromView(View.Profile)} element={<Profile />} />
                <Route path={getPathFromView(View.DominioJuridico)} element={<DominioJuridico subjects={subjects} studySessions={studySessions} userId={session.user.id} />} />
                <Route path={getPathFromView(View.DigitalID)} element={<DigitalID userId={session.user.id} userName={session.user.user_metadata?.full_name} studySessions={studySessions} tasks={tasks} />} />
                <Route path={getPathFromView(View.Office)} element={<VirtualOffice studySessions={studySessions} userName={session.user.user_metadata?.full_name} />} />
                <Route path={getPathFromView(View.Sebo)} element={<Sebo userId={session.user.id} userName={session.user.user_metadata?.full_name} />} />
                <Route path={getPathFromView(View.ClassificadosPatio)} element={<ClassificadosPatio userId={session.user.id} userName={session.user.user_metadata?.full_name} studySessions={studySessions} />} />
                <Route path={getPathFromView(View.Specialization)} element={<SpecializationTree subjects={subjects} studySessions={studySessions} />} />
                <Route path={getPathFromView(View.SumulaChallenge)} element={<SumulaChallenge userId={session.user.id} userName={session.user.user_metadata?.full_name} />} />
                <Route path={getPathFromView(View.JurisprudenceMural)} element={<JurisprudenceMural userId={session.user.id} userName={session.user.user_metadata?.full_name} onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.CaseAnalyzer)} element={<CaseAnalyzer onBack={() => setCurrentView(View.JurisprudenceMural)} />} />
                <Route path={getPathFromView(View.NoteView)} element={selectedSubjectIdForNotes ? (
                  <NoteView 
                    subjectId={selectedSubjectIdForNotes} 
                    userId={session.user.id} 
                    isOnline={isOnline} 
                    onBack={() => setCurrentView(View.Subjects)} 
                    onNavigateToAnki={(text) => {
                      setAnkiTextToGenerate(text);
                      setCurrentView(View.Anki);
                    }}
                    subjects={subjects}
                    onToggleSidebar={setIsSidebarOpen}
                  />
                ) : null} />
                <Route path={getPathFromView(View.Societies)} element={<Societies userId={session.user.id} userName={session.user.user_metadata?.full_name} />} />
                <Route path={getPathFromView(View.LeiSeca)} element={<LeiSeca userId={session.user.id} />} />
                <Route path={getPathFromView(View.CitationGenerator)} element={<CitationGenerator />} />
                <Route path={getPathFromView(View.Editais)} element={<Editais userId={session.user.id} />} />
                <Route path={getPathFromView(View.ApprovalTrail)} element={<ApprovalTrail userId={session.user.id} onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.Timeline)} element={<TimelineBuilder />} />
                <Route path={getPathFromView(View.DeadArchive)} element={<DeadArchive userId={session.user.id} />} />
                <Route path={getPathFromView(View.Anki)} element={
                  <Anki 
                    subjects={subjects} 
                    flashcards={flashcards} 
                    setFlashcards={setFlashcards} 
                    initialText={ankiTextToGenerate} 
                    setInitialText={setAnkiTextToGenerate} 
                    folders={folders} 
                    setFolders={setFolders} 
                    userId={session.user.id} 
                    isOnline={isOnline}
                    setStudySessions={setStudySessions}
                    isLoadingFlashcards={isLoadingFlashcards}
                  />
                } />
                <Route path={getPathFromView(View.Library)} element={<Library readings={readings} setReadings={setReadings} subjects={subjects} userId={session.user.id} />} />
                <Route path={getPathFromView(View.Largo)} element={<Largo presenceUsers={presenceUsers} currentUserId={session.user.id} />} />
                <Route path={getPathFromView(View.Mural)} element={<Mural userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.Calculator)} element={<GradeCalculator subjects={subjects} />} />
                <Route path={getPathFromView(View.DeadlineCalculator)} element={<DeadlineCalculator />} />
                <Route path={getPathFromView(View.Dosimetria)} element={<Dosimetria userId={session.user.id} />} />
                <Route path={getPathFromView(View.Honorarios)} element={<Honorarios userId={session.user.id} />} />
                <Route path={getPathFromView(View.Checklist)} element={<Checklist userId={session.user.id} />} />
                <Route path={getPathFromView(View.InvestigationBoard)} element={<InvestigationBoard userId={session.user.id} />} />
                <Route path={getPathFromView(View.LatinGame)} element={<LatinGame userId={session.user.id} />} />
                <Route path={getPathFromView(View.Debate)} element={<Debate userId={session.user.id} />} />
                <Route path={getPathFromView(View.Trunfo)} element={<Trunfo userId={session.user.id} userName={session.user.user_metadata?.full_name} />} />
                <Route path={getPathFromView(View.OabCountdown)} element={<OabCountdown userId={session.user.id} />} />
                <Route path={getPathFromView(View.TypingChallenge)} element={<TypingChallenge userId={session.user.id} userName={session.user.user_metadata?.full_name} />} />
                <Route path={getPathFromView(View.Petitum)} element={<Petitum userId={session.user.id} />} />
                <Route path={getPathFromView(View.SucessaoSimulator)} element={<SucessaoSimulator />} />
                <Route path={getPathFromView(View.JurisTinder)} element={<JurisTinder />} />
                <Route path={getPathFromView(View.InternRPG)} element={<InternRPG />} />
                <Route path={getPathFromView(View.PrescriptionCalculator)} element={<PrescriptionCalculator userId={session.user.id} />} />
                <Route path={getPathFromView(View.SanFranIdiomas)} element={<SanFranIdiomas userId={session.user.id} />} />
                <Route path={getPathFromView(View.LegalCinema)} element={<LegalCinema userId={session.user.id} />} />
                <Route path={getPathFromView(View.GeneralLanguages)} element={<GeneralLanguages userId={session.user.id} />} />
                <Route path={getPathFromView(View.LegalSimplifier)} element={<LegalSimplifier userId={session.user.id} />} />
                <Route path={getPathFromView(View.PronunciationLab)} element={<PronunciationLab userId={session.user.id} />} />
                <Route path={getPathFromView(View.LyricalVibes)} element={<LyricalVibes userId={session.user.id} />} />
                <Route path={getPathFromView(View.TheExchangeStudent)} element={<TheExchangeStudent userId={session.user.id} />} />
                <Route path={getPathFromView(View.QuestionBank)} element={<QuestionBank userId={session.user.id} folders={folders} flashcards={flashcards} isOnline={isOnline} />} />
                <Route path={getPathFromView(View.IntelligentSummarizer)} element={<IntelligentSummarizer userId={session.user.id} />} />
                <Route path={getPathFromView(View.StudyBuddy)} element={<StudyBuddy userId={session.user.id} />} />
                <Route path={getPathFromView(View.Certificates)} element={<Certificates userId={session.user.id} userName={session.user.user_metadata?.full_name} />} />
                <Route path={getPathFromView(View.VisualFlashcards)} element={<VisualFlashcards userId={session.user.id} />} />
                <Route path={getPathFromView(View.BilingualNews)} element={<BilingualNews userId={session.user.id} />} />
                <Route path={getPathFromView(View.SlangChallenge)} element={<SlangChallenge userId={session.user.id} />} />
                <Route path={getPathFromView(View.ErrorLog)} element={<ErrorLog userId={session.user.id} />} />
                <Route path={getPathFromView(View.CodeTracker)} element={<CodeTracker userId={session.user.id} />} />
                <Route path={getPathFromView(View.IracMethod)} element={<IracMethod userId={session.user.id} />} />
                <Route path={getPathFromView(View.SpacedRepetition)} element={<SpacedRepetition userId={session.user.id} isOnline={isOnline} />} />
                <Route path={getPathFromView(View.Connect)} element={<Connect userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.Friends)} element={<Friends userId={session.user.id} userName={userProfile?.full_name || session.user.email || 'Usuário'} onNavigate={setCurrentView} />} />
                <Route path={getPathFromView(View.AttendanceCalculator)} element={<AttendanceCalculator userId={session.user.id} />} />
                <Route path={getPathFromView(View.SyllabusTracker)} element={<SyllabusTracker userId={session.user.id} />} />
                <Route path={getPathFromView(View.DeadlinePlanner)} element={<DeadlinePlanner userId={session.user.id} />} />
                <Route path={getPathFromView(View.Mentorship)} element={<Mentorship userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.MockJury)} element={<MockJury userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.PetitionWiki)} element={<PetitionWiki userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.StudyPact)} element={<StudyPact userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.LargoAuction)} element={<LargoAuction userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.SocialEvents)} element={<SocialEvents userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.TheVault)} element={<TheVault userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.CaronasRepublicas)} element={<CaronasRepublicas userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.BalcaoEstagios)} element={<BalcaoEstagios userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.TribunalOpiniao)} element={<TribunalOpiniao userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.BussolaOptativas)} element={<BussolaOptativas userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.AchadosPerdidos)} element={<AchadosPerdidos userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.PerolasTribuna)} element={<PerolasTribuna userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.GuiaSobrevivencia)} element={<GuiaSobrevivencia userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.ClubeLivro)} element={<ClubeLivro userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />} />
                <Route path={getPathFromView(View.GuerraTurmas)} element={<GuerraTurmas userId={session.user.id} />} />
                <Route path={getPathFromView(View.SpeedReader)} element={<SpeedReader />} />
                <Route path={getPathFromView(View.Mnemonics)} element={<Mnemonics userId={session.user.id} />} />
                <Route path={getPathFromView(View.ReverseSchedule)} element={<ReverseStudyPlanner userId={session.user.id} />} />
                <Route path={getPathFromView(View.Statistics)} element={<Statistics studySessions={studySessions} flashcards={flashcards} tasks={tasks} subjects={subjects} correctQuestionsCount={correctQuestionsCount} wrongQuestionsCount={wrongQuestionsCount} confidenceLevels={confidenceLevels} />} />
                
                <Route path={getPathFromView(View.Duel)} element={activeDuel ? 
                  <DuelArena 
                    duel={activeDuel} 
                    userId={session.user.id} 
                    onFinished={() => { setActiveDuel(null); setCurrentView(View.Largo); }} 
                    onCorrectAnswer={incrementCorrectQuestions}
                  />
                 : null} />
                
                <Route path={getPathFromView(View.StudyRoom)} element={
                  <StudyRooms 
                    presenceUsers={presenceUsers} 
                    currentUserId={session.user.id}
                    currentRoomId={currentRoomId}
                    setCurrentRoomId={setCurrentRoomId}
                    setRoomStartTime={setRoomStartTime}
                  />
                } />

                <Route path={getPathFromView(View.Timer)} element={
                  <Pomodoro 
                    subjects={subjects} 
                    readings={readings}
                    tasks={tasks}
                    userId={session.user.id} 
                    studySessions={studySessions} 
                    setStudySessions={setStudySessions}
                    isActive={timerIsActive}
                    setIsActive={setTimerIsActive}
                    secondsLeft={timerSecondsLeft}
                    setSecondsLeft={setTimerSecondsLeft}
                    mode={timerMode}
                    setMode={setTimerMode}
                    selectedSubjectId={timerSelectedSubjectId}
                    setSelectedSubjectId={setTimerSelectedSubjectId}
                    selectedReadingId={timerSelectedReadingId}
                    setSelectedReadingId={setTimerSelectedReadingId}
                    selectedTaskId={timerSelectedTaskId}
                    setSelectedTaskId={setTimerSelectedTaskId}
                    totalTime={timerTotalInitial}
                    setTotalInitial={setTimerTotalInitial}
                    onManualFinalize={manualFinalize}
                    isExtremeFocus={isExtremeFocus}
                    studyMode={timerStudyMode}
                    setStudyMode={setTimerStudyMode}
                    customWorkMinutes={timerCustomWorkMinutes}
                    setCustomWorkMinutes={setTimerCustomWorkMinutes}
                    customBreakMinutes={timerCustomBreakMinutes}
                    setCustomBreakMinutes={setTimerCustomBreakMinutes}
                    onMinimize={toggleMinimizePomodoro}
                    isExtremeFocusRequested={isExtremeFocusActive}
                    setIsExtremeFocusRequested={setIsExtremeFocusActive}
                  />
                } />

                <Route path={getPathFromView(View.OralArgument)} element={<OralArgument />} />
                <Route path={getPathFromView(View.Calendar)} element={<CalendarView subjects={subjects} tasks={tasks} userId={session.user.id} studySessions={studySessions} isOnline={isOnline} onTasksChanged={refreshCalendarTasks} onAfterGoogleCalendarSync={refreshCalendarTasks} />} />
                <Route path={getPathFromView(View.Ranking)} element={<Ranking userId={session.user.id} session={session} flashcards={flashcards} />} />
                <Route path={getPathFromView(View.Subjects)} element={
                  <Subjects 
                    subjects={subjects} 
                    setSubjects={setSubjects} 
                    userId={session.user.id} 
                    onViewNotes={(subjectId) => {
                      setSelectedSubjectIdForNotes(subjectId);
                      setCurrentView(View.NoteView);
                    }}
                    onViewRepository={(subjectId) => {
                      setSelectedSubjectIdForRepository(subjectId);
                      setCurrentView(View.Repository);
                    }}
                    onViewAssignments={(subjectId) => {
                      setSelectedSubjectIdForAssignments(subjectId);
                      setCurrentView(View.Assignments);
                    }}
                    tasks={tasks}
                  />
                } />
                <Route path={getPathFromView(View.Tasks)} element={
                  <TaskMasterDetail 
                    tasks={tasks} 
                    subjects={subjects} 
                    setTasks={setTasks} 
                    boards={boards}
                    setBoards={setBoards}
                    studySessions={studySessions}
                    setStudySessions={setStudySessions}
                    userId={session.user.id} 
                    isOnline={isOnline} 
                    userProfile={userProfile}
                    setUserProfile={setUserProfile}
                    onNavigateToCalendar={() => setCurrentView(View.Calendar)}
                  />
                } />

                <Route path="/simulados" element={<QuestionBank userId={session.user.id} folders={folders} flashcards={flashcards} isOnline={isOnline} />} />

              </Routes>
</ErrorBoundary>
             </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
