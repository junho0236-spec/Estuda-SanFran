
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
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
import { getViewLabel } from './utils';

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
const SanFranOAB = React.lazy(() => import('./components/SanFranOAB'));
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

export const getBrasiliaDate = () => {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
};

export const getBrasiliaISOString = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  return formatter.format(now).replace(' ', 'T');
};

const BrasiliaClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
  const [timerSelectedSubjectId, setTimerSelectedSubjectId] = useState<string | null>(null);
  const [timerSelectedReadingId, setTimerSelectedReadingId] = useState<string | null>(null);
  const [timerSelectedTaskId, setTimerSelectedTaskId] = useState<string | null>(null);
  const [timerTotalInitial, setTimerTotalInitial] = useState(25 * 60);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Study Room State ---
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomStartTime, setRoomStartTime] = useState<number | null>(null);

  const isExtremeFocus = timerIsActive && currentView === View.Timer && timerMode === 'work';

  // --- Realtime Presence & Duel Listening ---
  useEffect(() => {
    if (!isAuthenticated || !session?.user) return;

    const channel = supabase.channel('largo_presenca', {
      config: { presence: { key: session.user.id } },
    });

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

    // LISTEN FOR DUELS
    const duelsChannel = supabase.channel('global_duels')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'duels'
      }, (payload) => {
        const duel = payload.new as Duel;
        if (!duel) return;

        // SE EU SOU O OPONENTE E ESTÁ PENDENTE: Mostra notificação
        if (duel.opponent_id === session.user.id && duel.status === 'pending') {
          setIncomingDuel(duel);
        }

        // SE O DUELO FICOU ATIVO: Entra na arena
        if ((duel.challenger_id === session.user.id || duel.opponent_id === session.user.id) && duel.status === 'active') {
          setIncomingDuel(null);
          setActiveDuel(duel);
          setCurrentView(View.Duel);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(duelsChannel);
    };
  }, [isAuthenticated, session, currentView, timerIsActive, timerSelectedSubjectId, subjects, currentRoomId, roomStartTime, userProfile]);

  // --- Realtime Data Sync Listener ---
  useEffect(() => {
    if (!isAuthenticated || !session?.user) return;

    const userId = session.user.id;

    const dataChannel = supabase.channel('realtime_data_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'questions', 
        filter: `user_id=eq.${userId}` 
      }, () => {
        console.log("[Realtime] Questions changed, reloading...");
        loadUserData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'flashcards', 
        filter: `user_id=eq.${userId}` 
      }, () => {
        console.log("[Realtime] Flashcards changed, reloading...");
        loadUserData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks', 
        filter: `user_id=eq.${userId}` 
      }, () => {
        console.log("[Realtime] Tasks changed, reloading...");
        loadUserData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'folders', 
        filter: `user_id=eq.${userId}` 
      }, () => {
        console.log("[Realtime] Folders changed, reloading...");
        loadUserData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_progress', 
        filter: `user_id=eq.${userId}` 
      }, () => {
        console.log("[Realtime] User progress changed, reloading...");
        loadUserData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dataChannel);
    };
  }, [isAuthenticated, session]);

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
    const newSessionId = Math.random().toString(36).substr(2, 9);
    
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
      if (session?.user) {
        syncProfile(session.user);
        clearOldLocalStorage(session.user.id);
      }
    }).catch(err => {
      console.warn("Failed to get session:", err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      if (session?.user) {
        syncProfile(session.user);
        clearOldLocalStorage(session.user.id);
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
    console.log("[App] Local storage cleaned up for user:", userId);
  };

  const syncProfile = async (user: any) => {
    const name = user.user_metadata?.full_name;
    if (!name) return;
    
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: name,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
      if (error) throw error;
    } catch (e) {
      console.warn("Sincronização de perfil falhou.", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated && session?.user) {
      loadUserData();
    }
  }, [isAuthenticated, session]);

  // --- Offline & Sync Logic ---
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

  useEffect(() => {
    if (isOnline && isAuthenticated && session?.user) {
      handleSync();
    }
  }, [isOnline, isAuthenticated, session]);

  const handleSync = async () => {
    if (!session?.user) return;
    setIsSyncing(true);
    try {
      clearOldLocalStorage(session.user.id);
      await dataService.syncOfflineData(session.user.id);
      await loadUserData();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadUserData = async () => {
    if (!session?.user) return;
    const userId = session.user.id;
    
    try {
      if (isOnline) {
        // Fetch subjects first as they are often dependencies
        const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', userId);
        if (subs) setSubjects(subs);
        
        const profile = await dataService.getUserProfile(userId, isOnline);
        if (profile) setUserProfile(profile);

        // Fetch others in parallel but handle them individually to avoid one failure crashing everything
        const [resFlds, resCards, resTks, resBoards, resSessions, resReadings, resProgress] = await Promise.all([
          supabase.from('folders').select('*').eq('user_id', userId),
          supabase.from('flashcards').select('*').eq('user_id', userId).is('archived_at', null),
          supabase.from('tasks').select('*').eq('user_id', userId).is('archived_at', null).order('created_at', { ascending: false }),
          supabase.from('boards').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('study_sessions').select('*').eq('user_id', userId).order('start_time', { ascending: false }),
          supabase.from('readings').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('user_progress').select('*').eq('user_id', userId).maybeSingle()
        ]);

        if (resFlds.data) {
          const formattedFolders = resFlds.data.map(f => ({ 
            id: f.id, 
            name: f.name, 
            parentId: f.parent_id,
            color: f.color,
            icon: f.icon || undefined,
            targetDate: f.target_date || undefined
          }));

          const syncCount = await db.syncQueue.count();
          if (syncCount === 0) {
            const localFolders = await db.folders.toArray();
            const remoteIds = new Set(formattedFolders.map(f => f.id));
            const idsToDelete = localFolders.filter(f => !remoteIds.has(f.id)).map(f => f.id);
            if (idsToDelete.length > 0) await db.folders.bulkDelete(idsToDelete);
            await db.folders.bulkPut(formattedFolders);
          }
          setFolders(formattedFolders);
        }
        
        if (subs) {
          const syncCount = await db.syncQueue.count();
          if (syncCount === 0) {
            const localSubs = await db.subjects.toArray();
            const remoteIds = new Set(subs.map(s => s.id));
            const idsToDelete = localSubs.filter(s => !remoteIds.has(s.id)).map(s => s.id);
            if (idsToDelete.length > 0) await db.subjects.bulkDelete(idsToDelete);
            await db.subjects.bulkPut(subs);
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
          const localCards = await db.flashcards.toArray();
          const localCardsMap = new Map(localCards.map(c => [c.id, c]));

          const formattedCards = resCards.data.map(c => {
            const local = localCardsMap.get(c.id);
            return {
              id: c.id, 
              front: c.front, 
              back: c.back, 
              notes: c.notes || '',
              tags: c.tags || [],
              source: c.source || '',
              subjectId: c.subject_id || '', 
              folderId: c.folder_id || null, 
              nextReview: c.next_review != null ? Number(c.next_review) : (local?.nextReview || Date.now()), 
              interval: c.interval != null ? c.interval : (local?.interval || 0), 
              status: c.status || local?.status || 'new',
              learningStep: c.learning_step != null ? c.learning_step : (local?.learningStep || 0),
              easeFactor: c.ease_factor != null ? c.ease_factor : (local?.easeFactor || 2.5),
              total_errors: c.total_errors != null ? c.total_errors : (local?.total_errors || 0),
              archived_at: c.archived_at || null
            };
          });
          
          // Only update local DB if we are not in the middle of a sync
          const syncCount = await db.syncQueue.count();
          if (syncCount === 0) {
            console.log(`[App] Sincronizando ${formattedCards.length} flashcards do Supabase para o IndexedDB local.`);
            
            const remoteIds = new Set(formattedCards.map(c => c.id));
            const idsToDelete = localCards.filter(c => !remoteIds.has(c.id)).map(c => c.id);
            if (idsToDelete.length > 0) {
              console.log(`[App] Removendo ${idsToDelete.length} flashcards locais obsoletos.`);
              await db.flashcards.bulkDelete(idsToDelete);
            }

            setFlashcards(formattedCards);
            await db.flashcards.bulkPut(formattedCards);
          } else {
            console.log(`[App] Pulando bulkPut de flashcards pois existem ${syncCount} itens pendentes na fila de sincronização.`);
            // Still update state but maybe merge? For now, let's trust local more if sync is pending
            const localCards = await db.flashcards.toArray();
            setFlashcards(localCards);
          }
        }

        if (resTks.data) {
          const formattedTasks = resTks.data.map(t => {
            const desc = t.description ? JSON.parse(t.description) : {};
            return {
              id: t.id, 
              title: t.title, 
              completed: t.status === 'Concluido', 
              status: t.status,
              subjectId: desc.subjectId || t.subject_id, 
              dueDate: t.due_date, 
              completedAt: t.completed_at,
              priority: desc.originalPriority || (t.priority === 'Alta' ? 'alta' : 'normal'), 
              category: t.category || 'geral', 
              archived_at: t.archived_at,
              boardId: desc.boardId,
              columnId: desc.columnId,
              notes: t.notes,
              subtasks: t.subtasks || [],
              delegatedTo: t.delegated_to,
              delegatedBy: t.delegated_by,
              delegatedByName: desc.delegatedByName,
              delegatedToName: desc.delegatedToName,
              syllabusLink: desc.syllabusLink,
              importantCitations: desc.importantCitations,
              revisionStatus: desc.revisionStatus,
              created_at: t.created_at
            };
          });

          const syncCount = await db.syncQueue.count();
          if (syncCount === 0) {
            const localTasks = await db.tasks.toArray();
            const remoteIds = new Set(formattedTasks.map(t => t.id));
            const idsToDelete = localTasks.filter(t => !remoteIds.has(t.id)).map(t => t.id);
            if (idsToDelete.length > 0) await db.tasks.bulkDelete(idsToDelete);
            await db.tasks.bulkPut(formattedTasks as Task[]);
          }
          setTasks(formattedTasks as Task[]);
        }

        if (resBoards.data) {
          const formattedBoards = resBoards.data.map(b => ({
            id: b.id, name: b.name, columns: b.columns, userId: b.user_id, createdAt: b.created_at
          }));
          const syncCount = await db.syncQueue.count();
          if (syncCount === 0) {
            await db.boards.bulkPut(formattedBoards);
          }
          setBoards(formattedBoards);
        }
        
        if (resSessions.data) {
          const syncCount = await db.syncQueue.count();
          if (syncCount === 0) {
            const localSessions = await db.study_sessions.toArray();
            const remoteIds = new Set(resSessions.data.map(s => s.id));
            const idsToDelete = localSessions.filter(s => !remoteIds.has(s.id)).map(s => s.id);
            if (idsToDelete.length > 0) await db.study_sessions.bulkDelete(idsToDelete);
            await db.study_sessions.bulkPut(resSessions.data);
          }
          setStudySessions(resSessions.data);
        }

        if (resReadings.data) setReadings(resReadings.data);
      } else {
        const [localCards, localTasks, localBoards, localSessions, localFolders] = await Promise.all([
          db.flashcards.toArray(),
          db.tasks.toArray(),
          db.boards.toArray(),
          db.study_sessions.toArray(),
          db.folders.toArray()
        ]);
        setFlashcards(localCards);
        setTasks(localTasks);
        setBoards(localBoards);
        setStudySessions(localSessions);
        setFolders(localFolders);
      }
    } catch (err) {
      console.error("Erro no carregamento dos dados:", err);
      const [localCards, localTasks, localBoards, localSessions, localFolders] = await Promise.all([
        db.flashcards.toArray(),
        db.tasks.toArray(),
        db.boards.toArray(),
        db.study_sessions.toArray(),
        db.folders.toArray()
      ]);
      setFlashcards(localCards);
      setTasks(localTasks);
      setBoards(localBoards);
      setStudySessions(localSessions);
      setFolders(localFolders);
    }
  };

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
    { id: View.Anki, icon: BrainCircuit, label: 'Anki Flashcards', color: 'text-slate-900', bg: 'bg-slate-200' },
    { id: View.Statistics, icon: BarChart3, label: 'Estatísticas', color: 'text-usp-gold', bg: 'bg-usp-gold/10' },
    { id: View.Timer, icon: TimerIcon, label: 'Controle de Tempo', color: 'text-red-600', bg: 'bg-red-100' },

    // HUBS
    { id: View.SanFranCommunity, icon: Users, label: 'Comunidade', color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { id: View.SanFranImprovement, icon: GraduationCap, label: 'Improvement', color: 'text-purple-600', bg: 'bg-purple-100' },
    { id: View.SanFranEssential, icon: LayoutGrid, label: 'Mais Ferramentas', color: 'text-indigo-600', bg: 'bg-indigo-100' }, // Renomeado
    { id: View.SanFranLanguages, icon: Languages, label: 'Languages', color: 'text-sky-600', bg: 'bg-sky-100' },
    { id: View.SanFranLife, icon: Leaf, label: 'SanFran Life', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: View.SanFranGames, icon: Gamepad2, label: 'Games', color: 'text-orange-500', bg: 'bg-orange-100' },
    { id: View.SanFranHelp, icon: Wrench, label: 'Help Jurídico', color: 'text-slate-500', bg: 'bg-slate-100' },
    { id: View.SanFranOAB, icon: ShieldCheck, label: 'OAB Foco', color: 'text-red-600', bg: 'bg-red-100' },
  ];

  // Helper to check if current view is a child of SanFran Essential (Updated List)
  const isEssentialChild = [View.Calendar, View.Ranking, View.DeadArchive, View.Calculator, View.ErrorLog, View.CodeTracker, View.IracMethod, View.SpacedRepetition, View.AttendanceCalculator, View.SyllabusTracker, View.DeadlinePlanner, View.SpeedReader, View.Mnemonics, View.ReverseSchedule, View.Statistics].includes(currentView);
  
  // Helper to check if current view is a child of SanFran Community
  const isCommunityChild = [View.Debate, View.ClassificadosPatio, View.JurisprudenceMural, View.CaseAnalyzer, View.Societies, View.Largo, View.StudyRoom, View.Mural, View.Mentorship, View.MockJury, View.PetitionWiki, View.StudyPact, View.LargoAuction, View.SocialEvents, View.TheVault, View.CaronasRepublicas, View.BalcaoEstagios, View.TribunalOpiniao, View.BussolaOptativas, View.AchadosPerdidos, View.PerolasTribuna, View.GuiaSobrevivencia, View.ClubeLivro, View.GuerraTurmas].includes(currentView);

  // Helper to check if current view is a child of SanFran Improvement
  const isImprovementChild = [View.Specialization, View.TypingChallenge, View.DominioJuridico, View.Timeline, View.LeiSeca, View.Library, View.OralArgument, View.QuestionBank, View.IntelligentSummarizer, View.StudyBuddy, View.Certificates].includes(currentView);

  // Helper to check if current view is a child of SanFran Languages
  const isLanguagesChild = [View.SanFranIdiomas, View.LegalCinema, View.GeneralLanguages, View.PronunciationLab, View.LyricalVibes, View.TheExchangeStudent, View.VisualFlashcards, View.BilingualNews, View.SlangChallenge].includes(currentView);

  // Helper to check if current view is a child of SanFran Life
  const isLifeChild = [View.Office, View.Sebo].includes(currentView);

  // Helper to check if current view is a child of SanFran Games
  const isGamesChild = [View.InternRPG, View.JurisTinder, View.LatinGame, View.Trunfo, View.SumulaChallenge].includes(currentView);

  // Helper to check if current view is a child of SanFran Help
  const isHelpChild = [View.PrescriptionCalculator, View.SucessaoSimulator, View.InvestigationBoard, View.Checklist, View.Honorarios, View.Dosimetria, View.Petitum, View.CitationGenerator, View.DeadlineCalculator, View.LegalSimplifier].includes(currentView);

  // Helper to check if current view is a child of SanFran OAB
  const isOABChild = [View.OabCountdown, View.Specialization].includes(currentView);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);

  // Fetch notifications and friends
  useEffect(() => {
    const fetchColabData = async () => {
      if (session?.user?.id) {
        const [notifs, frnds] = await Promise.all([
          dataService.getNotifications(session.user.id),
          dataService.getFriends(session.user.id)
        ]);
        setNotifications(notifs);
        setFriends(frnds);
      }
    };
    fetchColabData();

    // Set up real-time subscription for notifications
    if (session?.user?.id) {
      const channel = supabase
        .channel('public:notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session?.user?.id]);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link_task) {
      // Navigate to tasks and select the task
      setCurrentView(View.Tasks);
      // We might need a way to tell TaskMasterDetail to select this task
      // For now, let's just navigate.
    }
  };

  const handleLogout = async () => {
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
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 ${isDarkMode ? 'dark bg-sanfran-rubiBlack' : 'bg-[#F8F9FA]'}`}>
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

      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isExtremeFocus ? '-translate-x-full lg:-translate-x-full lg:w-0' : `lg:relative lg:translate-x-0 ${isSidebarMinimized ? 'lg:w-20' : 'lg:w-72'}`} fixed inset-y-0 left-0 z-40 bg-white dark:bg-[#0d0303] border-r border-slate-200 dark:border-sanfran-rubi/30 transition-all duration-500 flex flex-col shadow-2xl lg:shadow-none overflow-hidden`}>
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
        
        <nav className={`p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar ${isSidebarMinimized ? 'px-2' : ''}`}>
          {navItems.map((item) => {
            const isActive = currentView === item.id || 
                             (item.id === View.SanFranEssential && isEssentialChild) ||
                             (item.id === View.SanFranCommunity && isCommunityChild) ||
                             (item.id === View.SanFranImprovement && isImprovementChild) ||
                             (item.id === View.SanFranLanguages && isLanguagesChild) ||
                             (item.id === View.SanFranLife && isLifeChild) ||
                             (item.id === View.SanFranGames && isGamesChild) ||
                             (item.id === View.SanFranHelp && isHelpChild) ||
                             (item.id === View.SanFranOAB && isOABChild);
            
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

        <div className={`p-4 space-y-3 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-sanfran-rubi/10 ${isSidebarMinimized ? 'px-2 items-center flex flex-col' : ''}`}>
          <button 
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)} 
            className={`hidden lg:flex items-center justify-center bg-white dark:bg-sanfran-rubiDark border border-slate-200 dark:border-sanfran-rubi/30 text-slate-900 dark:text-white shadow-sm hover:shadow-md transition-all rounded-xl ${isSidebarMinimized ? 'w-10 h-10' : 'w-full py-2 gap-2 text-[9px] font-black uppercase tracking-widest'}`}
            title={isSidebarMinimized ? "Expandir Barra Lateral" : "Minimizar Barra Lateral"}
          >
            {isSidebarMinimized ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> Minimizar</>}
          </button>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className={`flex items-center bg-white dark:bg-sanfran-rubiDark border border-slate-200 dark:border-sanfran-rubi/30 text-slate-900 dark:text-white shadow-sm hover:shadow-md transition-all rounded-2xl ${isSidebarMinimized ? 'w-10 h-10 justify-center' : 'w-full px-4 py-3 justify-between text-[9px] font-black uppercase tracking-widest'}`}
            title={isSidebarMinimized ? (isDarkMode ? 'Modo Claro' : 'Modo Escuro') : ""}
          >
            {!isSidebarMinimized && (isDarkMode ? 'Modo Escuro' : 'Modo Claro')}
            {isDarkMode ? <Moon className="w-4 h-4 text-usp-blue" /> : <Sun className="w-4 h-4 text-usp-gold" />}
          </button>
          
          <button 
            onClick={handleLogout} 
            className={`flex items-center justify-center text-slate-400 hover:text-red-500 font-black uppercase tracking-widest transition-colors hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl ${isSidebarMinimized ? 'w-10 h-10' : 'w-full gap-2 px-4 py-3 text-[10px]'}`}
            title={isSidebarMinimized ? "Encerrar Sessão" : ""}
          >
            <LogOut className="w-4 h-4" /> 
            {!isSidebarMinimized && "Encerrar Sessão"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className={`${isExtremeFocus ? 'hidden' : 'lg:hidden'} bg-white dark:bg-[#0d0303] border-b border-slate-200 dark:border-sanfran-rubi/30 p-4 flex items-center justify-between sticky top-0 z-20`}>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 dark:bg-sanfran-rubi/10 rounded-xl text-slate-600 dark:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-sanfran-rubi p-1.5 rounded-lg text-white"><BookOpen className="w-4 h-4" /></div>
            <span className="text-sm font-black dark:text-white uppercase tracking-tighter">SanFran Academy</span>
          </div>
          <div className="w-10"></div>
        </header>

        <main className={`flex-1 overflow-y-auto ${isExtremeFocus ? 'p-0' : 'p-4 md:p-10'} relative transition-all duration-700`}>
          {!isExtremeFocus && (
            <div className="flex justify-end mb-6">
              <HeaderActions 
                notifications={notifications} 
                userId={session?.user?.id || ''}
                onNotificationClick={handleNotificationClick}
                onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))}
              />
            </div>
          )}
          {/* Offline Indicator */}
          {!isOnline && (
            <div className="fixed top-4 right-4 z-50 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
              <Zap size={16} fill="currentColor" />
              <span className="text-[10px] font-black uppercase tracking-widest">Modo Offline Ativo</span>
            </div>
          )}
          {isSyncing && (
            <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
            </div>
          )}
          <div className={`${isExtremeFocus ? 'max-w-none h-full flex items-center justify-center' : 'max-w-6xl mx-auto h-full'}`}>
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
                <Route path={getPathFromView(View.SanFranOAB)} element={<SanFranOAB onNavigate={setCurrentView} />} />

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
                <Route path={getPathFromView(View.QuestionBank)} element={<QuestionBank userId={session.user.id} folders={folders} flashcards={flashcards} />} />
                <Route path={getPathFromView(View.IntelligentSummarizer)} element={<IntelligentSummarizer userId={session.user.id} />} />
                <Route path={getPathFromView(View.StudyBuddy)} element={<StudyBuddy userId={session.user.id} />} />
                <Route path={getPathFromView(View.Certificates)} element={<Certificates userId={session.user.id} userName={session.user.user_metadata?.full_name} />} />
                <Route path={getPathFromView(View.VisualFlashcards)} element={<VisualFlashcards userId={session.user.id} />} />
                <Route path={getPathFromView(View.BilingualNews)} element={<BilingualNews userId={session.user.id} />} />
                <Route path={getPathFromView(View.SlangChallenge)} element={<SlangChallenge userId={session.user.id} />} />
                <Route path={getPathFromView(View.ErrorLog)} element={<ErrorLog userId={session.user.id} />} />
                <Route path={getPathFromView(View.CodeTracker)} element={<CodeTracker userId={session.user.id} />} />
                <Route path={getPathFromView(View.IracMethod)} element={<IracMethod userId={session.user.id} />} />
                <Route path={getPathFromView(View.SpacedRepetition)} element={<SpacedRepetition userId={session.user.id} />} />
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
                    setTotalInitial={setTimerTotalInitial}
                    onManualFinalize={manualFinalize}
                    isExtremeFocus={isExtremeFocus}
                    studyMode={timerStudyMode}
                    setStudyMode={setTimerStudyMode}
                  />
                } />

                <Route path={getPathFromView(View.OralArgument)} element={<OralArgument />} />
                <Route path={getPathFromView(View.Calendar)} element={<CalendarView subjects={subjects} tasks={tasks} userId={session.user.id} studySessions={studySessions} />} />
                <Route path={getPathFromView(View.Ranking)} element={<Ranking userId={session.user.id} session={session} />} />
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
                  />
                } />

                <Route path="/simulados" element={<QuestionBank userId={session.user.id} folders={folders} flashcards={flashcards} />} />

              </Routes>
</ErrorBoundary>
             </Suspense>
          </div>
        </main>

        {timerIsActive && currentView !== View.Timer && (
          <div 
            onClick={() => setCurrentView(View.Timer)}
            className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 animate-in slide-in-from-bottom-10 duration-500 cursor-pointer group"
          >
            <div className={`flex items-center gap-3 p-3 md:p-4 rounded-[2rem] border-2 shadow-2xl backdrop-blur-xl transition-all hover:scale-105 active:scale-95 ${timerMode === 'work' ? 'bg-white/90 dark:bg-sanfran-rubi/20 border-sanfran-rubi shadow-red-900/20' : 'bg-white/90 dark:bg-usp-blue/20 border-usp-blue shadow-cyan-900/20'}`}>
              <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                 <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-white/5" />
                    <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="100" strokeDashoffset={100 - ( (timerSecondsLeft / timerTotalInitial) * 100 )} className={`transition-all duration-1000 ${timerMode === 'work' ? 'text-sanfran-rubi' : 'text-usp-blue'}`} pathLength="100" strokeLinecap="round" />
                 </svg>
                 {timerMode === 'work' ? <Gavel className="w-4 h-4 md:w-5 md:h-5 text-sanfran-rubi" /> : <Coffee className="w-4 h-4 md:w-5 md:h-5 text-usp-blue" />}
              </div>
              <div className="pr-2">
                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{timerMode === 'work' ? 'Em Pauta' : 'Recesso'}</p>
                <h4 className="text-sm md:text-lg font-black tabular-nums dark:text-white">{formatTime(timerSecondsLeft)}</h4>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
