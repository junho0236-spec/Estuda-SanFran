
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Timer as TimerIcon, BookOpen, CheckSquare, BrainCircuit, Moon, Sun, LogOut, Calendar as CalendarIcon, Clock as ClockIcon, Menu, X, Coffee, Gavel, Play, Pause, Trophy, Library as LibraryIcon, Mic, Newspaper } from 'lucide-react';
import { View, Subject, Flashcard, Task, Folder, StudySession, Reading } from './types';
import Dashboard from './components/Dashboard';
import Anki from './components/Anki';
import Pomodoro from './components/Pomodoro';
import Subjects from './components/Subjects';
import Tasks from './components/Tasks';
import CalendarView from './components/CalendarView';
import Ranking from './components/Ranking';
import Library from './components/Library';
import Login from './components/Login';
import Atmosphere from './components/Atmosphere';
import Scratchpad from './components/Scratchpad';
import OralExam from './components/OralExam';
import LegalNews from './components/LegalNews';
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

  // --- Timer Global State ---
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [timerSelectedSubjectId, setTimerSelectedSubjectId] = useState<string | null>(null);
  const [timerSelectedReadingId, setTimerSelectedReadingId] = useState<string | null>(null);
  const [timerTotalInitial, setTimerTotalInitial] = useState(25 * 60);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isExtremeFocus = timerIsActive && currentView === View.Timer && timerMode === 'work';

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
      if (resSessions.data) setStudySessions(resSessions.data);
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
    { id: View.Dashboard, icon: LayoutDashboard, label: 'Painel' },
    { id: View.OralExam, icon: Mic, label: 'Exame Oral' },
    { id: View.LegalNews, icon: Newspaper, label: 'Jurisprudência' },
    { id: View.Anki, icon: BrainCircuit, label: 'Flashcards' },
    { id: View.Library, icon: LibraryIcon, label: 'Biblioteca' },
    { id: View.Timer, icon: TimerIcon, label: 'Timer' },
    { id: View.Calendar, icon: CalendarIcon, label: 'Agenda' },
    { id: View.Ranking, icon: Trophy, label: 'Ranking' },
    { id: View.Subjects, icon: BookOpen, label: 'Cadeiras' },
    { id: View.Tasks, icon: CheckSquare, label: 'Pauta' },
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

      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isExtremeFocus ? '-translate-x-full lg:-translate-x-full lg:w-0' : 'lg:relative lg:translate-x-0 lg:w-64'} fixed inset-y-0 left-0 z-40 bg-white dark:bg-[#0d0303] border-r border-slate-200 dark:border-sanfran-rubi/30 transition-all duration-700 flex flex-col`}>
        <div className="p-6 border-b border-slate-100 dark:border-sanfran-rubi/20 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-sanfran-rubi p-2 rounded-xl text-white shadow-lg"><BookOpen className="w-6 h-6" /></div>
              <div>
                <h1 className="text-lg font-black dark:text-white leading-none">SanFran</h1>
                <span className="text-[9px] font-black text-sanfran-rubi uppercase">Academia Jurídica</span>
              </div>
            </div>
            <button onClick={closeSidebar} className="lg:hidden p-2 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <BrasiliaClock />
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setCurrentView(item.id); closeSidebar(); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? 'bg-sanfran-rubi text-white font-black shadow-lg shadow-red-900/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-sanfran-rubi/10'}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 space-y-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-100 dark:bg-sanfran-rubiDark text-[9px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
            {isDarkMode ? 'Modo Escuro' : 'Modo Claro'}
            {isDarkMode ? <Moon className="w-4 h-4 text-usp-blue" /> : <Sun className="w-4 h-4 text-usp-gold" />}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-2 px-4 py-3 text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-colors"><LogOut className="w-4 h-4" /> Sair</button>
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
          <div className={`${isExtremeFocus ? 'max-w-none h-full flex items-center justify-center' : 'max-w-6xl mx-auto'}`}>
            {currentView === View.Dashboard && <Dashboard subjects={subjects} flashcards={flashcards} tasks={tasks} studySessions={studySessions} readings={readings} />}
            {currentView === View.OralExam && <OralExam subjects={subjects} />}
            {currentView === View.LegalNews && <LegalNews />}
            {currentView === View.Anki && <Anki subjects={subjects} flashcards={flashcards} setFlashcards={setFlashcards} folders={folders} setFolders={setFolders} userId={session.user.id} />}
            {currentView === View.Library && <Library readings={readings} setReadings={setReadings} subjects={subjects} userId={session.user.id} />}
            
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
              <div className="pl-2 border-l border-slate-200 dark:border-white/10">
                 <div className="bg-slate-100 dark:bg-white/10 p-2 rounded-full group-hover:bg-sanfran-rubi group-hover:text-white transition-colors">
                    <Play className="w-3 h-3 fill-current" />
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
