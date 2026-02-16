
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Timer as TimerIcon, BookOpen, CheckSquare, BrainCircuit, Moon, Sun, LogOut, Calendar as CalendarIcon, Clock as ClockIcon, Menu, X, Coffee, Gavel, Play, Pause, Trophy, Library as LibraryIcon, Users, MessageSquare, Calculator as CalculatorIcon, Mic, Building2, CalendarClock, Armchair, Briefcase, Scroll, ClipboardList, GitCommit } from 'lucide-react';
import { View, Subject, Flashcard, Task, Folder, StudySession, Reading, PresenceUser } from './types';
import Dashboard from './components/Dashboard';
import Anki from './components/Anki';
import Pomodoro from './components/Pomodoro';
import Subjects from './components/Subjects';
import Tasks from './components/Tasks';
import CalendarView from './components/CalendarView';
import Ranking from './components/Ranking';
import Library from './components/Library';
import Largo from './components/Largo';
import Mural from './components/Mural';
import GradeCalculator from './components/GradeCalculator';
import DeadlineCalculator from './components/DeadlineCalculator';
import OralArgument from './components/OralArgument';
import StudyRooms from './components/StudyRooms';
import Login from './components/Login';
import Atmosphere from './components/Atmosphere';
import Scratchpad from './components/Scratchpad';
import VirtualOffice from './components/VirtualOffice';
import Societies from './components/Societies';
import LeiSeca from './components/LeiSeca';
import Editais from './components/Editais';
import TimelineBuilder from './components/TimelineBuilder';
import { supabase } from './services/supabaseClient';

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
      <div className="text-sm font-black text-slate-900 dark:text-white leading-none">{timeStr}</div>
      <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{dateStr}</div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('omnistudy_darkmode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);

  // --- Timer Global State (Pomodoro) ---
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [timerSelectedSubjectId, setTimerSelectedSubjectId] = useState<string | null>(null);
  const [timerSelectedReadingId, setTimerSelectedReadingId] = useState<string | null>(null);
  const [timerTotalInitial, setTimerTotalInitial] = useState(25 * 60);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Study Room State ---
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomStartTime, setRoomStartTime] = useState<number | null>(null);

  const isExtremeFocus = timerIsActive && currentView === View.Timer && timerMode === 'work';

  // --- Realtime Presence Logic ---
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
          const userState = state[key][0] as any;
          users.push({
            user_id: userState.user_id,
            name: userState.name,
            view: userState.view,
            subject_name: userState.subject_name,
            is_timer_active: userState.is_timer_active,
            last_seen: userState.last_seen,
            study_room_id: userState.study_room_id,
            study_start_time: userState.study_start_time
          });
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
            study_start_time: currentView === View.StudyRoom ? roomStartTime : null
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [isAuthenticated, session, currentView, timerIsActive, timerSelectedSubjectId, subjects, currentRoomId, roomStartTime]);

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
      alert("Ciclo concluído! Hora do descanso.");
    } else {
      setTimerMode('work');
      alert("Descanso encerrado. De volta aos estudos.");
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
      start_time: brDate
    };

    try {
      const { error } = await supabase.from('study_sessions').insert({
        id: newSession.id,
        user_id: session.user.id,
        duration: Number(duration),
        subject_id: timerSelectedSubjectId || null,
        reading_id: timerSelectedReadingId || null,
        start_time: brDate
      });
      if (error) throw error;
      setStudySessions(prev => [newSession, ...prev]);
    } catch (e) {
      console.error("Erro ao salvar sessão:", e);
      setStudySessions(prev => [newSession, ...prev]);
    }
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
      if (session?.user) syncProfile(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      if (session?.user) syncProfile(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const loadUserData = async () => {
    const userId = session.user.id;
    try {
      const [resSubs, resFlds, resCards, resTks, resSessions, resReadings] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', userId),
        supabase.from('folders').select('*').eq('user_id', userId),
        supabase.from('flashcards').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('study_sessions').select('*').eq('user_id', userId).order('start_time', { ascending: false }),
        supabase.from('readings').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);
      if (resSubs.data) setSubjects(resSubs.data);
      if (resFlds.data) setFolders(resFlds.data.map(f => ({ id: f.id, name: f.name, parentId: f.parent_id })));
      if (resCards.data) setFlashcards(resCards.data.map(c => ({
        id: c.id, front: c.front, back: c.back, subjectId: c.subject_id, folderId: c.folder_id, nextReview: c.next_review, interval: c.interval
      })));
      if (resTks.data) setTasks(resTks.data.map(t => ({
        id: t.id, title: t.title, completed: t.completed, subjectId: t.subject_id, dueDate: t.due_date, completedAt: t.completed_at,
        priority: t.priority || 'normal', category: t.category || 'geral'
      })));
      
      if (resSessions.data) {
        let sessions = resSessions.data;
        // Mock de 1500h para o usuário TESTE ACADÊMICO
        if (session.user?.user_metadata?.full_name === 'TESTE ACADÊMICO') {
          sessions = [
            ...sessions, 
            {
              id: 'mock-1500-hours',
              user_id: userId,
              duration: 1500 * 3600, // 1500 horas convertidas para segundos
              subject_id: 'mock-subject',
              start_time: new Date().toISOString()
            }
          ];
        }
        setStudySessions(sessions);
      }

      if (resReadings.data) setReadings(resReadings.data);
    } catch (err) {
      console.error("Erro crítico no carregamento do protocolo acadêmico:", err);
    }
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('omnistudy_darkmode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const closeSidebar = () => setIsSidebarOpen(false);

  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} />;

  const navItems = [
    { id: View.Dashboard, icon: LayoutDashboard, label: 'Painel', color: 'text-slate-600', bg: 'bg-slate-100' },
    { id: View.Office, icon: Armchair, label: 'Escritório', color: 'text-amber-600', bg: 'bg-amber-100' },
    { id: View.Timeline, icon: GitCommit, label: 'Timeline', color: 'text-pink-600', bg: 'bg-pink-100' },
    { id: View.Editais, icon: ClipboardList, label: 'Editais', color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: View.Societies, icon: Briefcase, label: 'Sociedades', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: View.LeiSeca, icon: Scroll, label: 'Lei Seca', color: 'text-rose-700', bg: 'bg-rose-100' },
    { id: View.StudyRoom, icon: Building2, label: 'Salas de Estudos', color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: View.DeadlineCalculator, icon: CalendarClock, label: 'Calc. Prazos', color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: View.Calculator, icon: CalculatorIcon, label: 'Médias USP', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: View.Anki, icon: BrainCircuit, label: 'Flashcards', color: 'text-usp-blue', bg: 'bg-cyan-100' },
    { id: View.Library, icon: LibraryIcon, label: 'Biblioteca', color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: View.Timer, icon: TimerIcon, label: 'Timer', color: 'text-sanfran-rubi', bg: 'bg-red-100' },
    { id: View.OralArgument, icon: Mic, label: 'Sustentação', color: 'text-rose-600', bg: 'bg-rose-100' },
    { id: View.Largo, icon: Users, label: 'O Largo', color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { id: View.Mural, icon: MessageSquare, label: 'Mural', color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: View.Calendar, icon: CalendarIcon, label: 'Agenda', color: 'text-violet-600', bg: 'bg-violet-100' },
    { id: View.Ranking, icon: Trophy, label: 'Ranking', color: 'text-usp-gold', bg: 'bg-yellow-100' },
    { id: View.Subjects, icon: BookOpen, label: 'Cadeiras', color: 'text-pink-600', bg: 'bg-pink-100' },
    { id: View.Tasks, icon: CheckSquare, label: 'Pauta', color: 'text-slate-800', bg: 'bg-slate-200' },
  ];

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 ${isDarkMode ? 'dark bg-sanfran-rubiBlack' : 'bg-[#fcfcfc]'}`}>
      <Atmosphere isExtremeFocus={isExtremeFocus} />
      {session?.user && <Scratchpad userId={session.user.id} isExtremeFocus={isExtremeFocus} />}

      {isSidebarOpen && !isExtremeFocus && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isExtremeFocus ? '-translate-x-full lg:-translate-x-full lg:w-0' : 'lg:relative lg:translate-x-0 lg:w-72'} fixed inset-y-0 left-0 z-40 bg-white dark:bg-[#0d0303] border-r border-slate-200 dark:border-sanfran-rubi/30 transition-all duration-700 flex flex-col shadow-2xl lg:shadow-none`}>
        <div className="p-6 border-b border-slate-100 dark:border-sanfran-rubi/20 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-sanfran-rubi p-2.5 rounded-2xl text-white shadow-lg shadow-red-900/20"><BookOpen className="w-6 h-6" /></div>
              <div>
                <h1 className="text-xl font-black dark:text-white leading-none tracking-tight">SanFran</h1>
                <span className="text-[9px] font-black text-sanfran-rubi uppercase tracking-[0.2em]">Academia</span>
              </div>
            </div>
            <button onClick={closeSidebar} className="lg:hidden p-2 text-slate-400 hover:text-sanfran-rubi transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <BrasiliaClock />
        </div>
        
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setCurrentView(item.id); closeSidebar(); }} 
              className={`group w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 border ${
                currentView === item.id 
                  ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-xl scale-[1.02] z-10' 
                  : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 ${
                currentView === item.id 
                  ? `${item.bg} dark:bg-white/10` 
                  : 'bg-slate-100 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10'
              }`}>
                <item.icon className={`w-5 h-5 transition-colors ${
                  currentView === item.id 
                    ? item.color + ' dark:text-white'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-sanfran-rubi dark:group-hover:text-white'
                }`} />
              </div>
              
              <div className="flex-1 text-left">
                 <span className={`block text-[10px] font-black uppercase tracking-widest transition-colors ${
                   currentView === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                 }`}>
                   {item.label}
                 </span>
              </div>

              {item.id === View.Largo && presenceUsers.length > 0 && (
                <span className="w-5 h-5 bg-usp-blue text-[9px] font-black rounded-full flex items-center justify-center text-white shadow-md animate-pulse">
                  {presenceUsers.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-3 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-sanfran-rubi/10">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-sanfran-rubiDark border border-slate-200 dark:border-sanfran-rubi/30 text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-white shadow-sm hover:shadow-md transition-all">
            {isDarkMode ? 'Modo Escuro' : 'Modo Claro'}
            {isDarkMode ? <Moon className="w-4 h-4 text-usp-blue" /> : <Sun className="w-4 h-4 text-usp-gold" />}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-colors hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl"><LogOut className="w-4 h-4" /> Encerrar Sessão</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className={`${isExtremeFocus ? 'hidden' : 'lg:hidden'} bg-white dark:bg-[#0d0303] border-b border-slate-200 dark:border-sanfran-rubi/30 p-4 flex items-center justify-between sticky top-0 z-20`}>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 dark:bg-sanfran-rubi/10 rounded-xl text-slate-600 dark:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-sanfran-rubi p-1.5 rounded-lg text-white"><BookOpen className="w-4 h-4" /></div>
            <span className="text-sm font-black dark:text-white uppercase tracking-tighter">SanFran</span>
          </div>
          <div className="w-10"></div>
        </header>

        <main className={`flex-1 overflow-y-auto ${isExtremeFocus ? 'p-0' : 'p-4 md:p-10'} relative transition-all duration-700`}>
          <div className={`${isExtremeFocus ? 'max-w-none h-full flex items-center justify-center' : 'max-w-6xl mx-auto h-full'}`}>
            {currentView === View.Dashboard && (
              <Dashboard 
                subjects={subjects} 
                flashcards={flashcards} 
                tasks={tasks} 
                studySessions={studySessions} 
                readings={readings} 
                onNavigate={setCurrentView}
              />
            )}
            {currentView === View.Office && <VirtualOffice studySessions={studySessions} userName={session.user.user_metadata?.full_name} />}
            {currentView === View.Societies && <Societies userId={session.user.id} userName={session.user.user_metadata?.full_name} />}
            {currentView === View.LeiSeca && <LeiSeca userId={session.user.id} />}
            {currentView === View.Editais && <Editais userId={session.user.id} />}
            {currentView === View.Timeline && <TimelineBuilder />}
            {currentView === View.Anki && <Anki subjects={subjects} flashcards={flashcards} setFlashcards={setFlashcards} folders={folders} setFolders={setFolders} userId={session.user.id} />}
            {currentView === View.Library && <Library readings={readings} setReadings={setReadings} subjects={subjects} userId={session.user.id} />}
            {currentView === View.Largo && <Largo presenceUsers={presenceUsers} currentUserId={session.user.id} />}
            {currentView === View.Mural && <Mural userId={session.user.id} userName={session.user.user_metadata?.full_name || 'Doutor(a)'} />}
            {currentView === View.Calculator && <GradeCalculator subjects={subjects} />}
            {currentView === View.DeadlineCalculator && <DeadlineCalculator />}
            
            {currentView === View.StudyRoom && (
              <StudyRooms 
                presenceUsers={presenceUsers} 
                currentUserId={session.user.id}
                currentRoomId={currentRoomId}
                setCurrentRoomId={setCurrentRoomId}
                setRoomStartTime={setRoomStartTime}
              />
            )}

            {currentView === View.Timer && (
              <Pomodoro 
                subjects={subjects} 
                readings={readings}
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
                setTotalInitial={setTimerTotalInitial}
                onManualFinalize={manualFinalize}
                isExtremeFocus={isExtremeFocus}
              />
            )}

            {currentView === View.OralArgument && <OralArgument />}
            {currentView === View.Calendar && <CalendarView subjects={subjects} tasks={tasks} userId={session.user.id} studySessions={studySessions} />}
            {currentView === View.Ranking && <Ranking userId={session.user.id} session={session} />}
            {currentView === View.Subjects && <Subjects subjects={subjects} setSubjects={setSubjects} userId={session.user.id} />}
            {currentView === View.Tasks && <Tasks subjects={subjects} tasks={tasks} setTasks={setTasks} userId={session.user.id} />}
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
