
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Timer, BookOpen, CheckSquare, BrainCircuit, Moon, Sun, LogOut, Calendar as CalendarIcon, Clock as ClockIcon } from 'lucide-react';
import { View, Subject, Flashcard, Task, Folder, StudySession } from './types';
import Dashboard from './components/Dashboard';
import Anki from './components/Anki';
import Pomodoro from './components/Pomodoro';
import Subjects from './components/Subjects';
import Tasks from './components/Tasks';
import CalendarView from './components/CalendarView';
import Login from './components/Login';
import { supabase } from './services/supabaseClient';

// Helper para obter a data atual no formato YYYY-MM-DD (Brasília)
export const getBrasiliaDate = () => {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated && session?.user) {
      loadUserData();
    }
  }, [isAuthenticated, session]);

  const loadUserData = async () => {
    const userId = session.user.id;
    
    try {
      const [
        resSubs,
        resFlds,
        resCards,
        resTks,
        resSessions
      ] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', userId),
        supabase.from('folders').select('*').eq('user_id', userId),
        supabase.from('flashcards').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('study_sessions').select('*').eq('user_id', userId).order('start_time', { ascending: false })
      ]);

      if (resSubs.data) setSubjects(resSubs.data);
      if (resFlds.data) setFolders(resFlds.data.map(f => ({ id: f.id, name: f.name, parentId: f.parent_id })));
      if (resCards.data) setFlashcards(resCards.data.map(c => ({
        id: c.id, front: c.front, back: c.back, subjectId: c.subject_id, folderId: c.folder_id, nextReview: c.next_review, interval: c.interval
      })));
      if (resTks.data) setTasks(resTks.data.map(t => ({
        id: t.id, title: t.title, completed: t.completed, subjectId: t.subject_id, dueDate: t.due_date, completedAt: t.completed_at
      })));
      if (resSessions.data) setStudySessions(resSessions.data);

    } catch (err) {
      console.error("Erro crítico no carregamento do protocolo acadêmico:", err);
    }
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('omnistudy_darkmode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} />;

  const navItems = [
    { id: View.Dashboard, icon: LayoutDashboard, label: 'Painel' },
    { id: View.Anki, icon: BrainCircuit, label: 'Flashcards (Anki)' },
    { id: View.Timer, icon: Timer, label: 'Cronômetro' },
    { id: View.Calendar, icon: CalendarIcon, label: 'Calendário' },
    { id: View.Subjects, icon: BookOpen, label: 'Disciplinas' },
    { id: View.Tasks, icon: CheckSquare, label: 'Tarefas' },
  ];

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'dark bg-sanfran-rubiBlack' : 'bg-[#fcfcfc]'}`}>
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#0d0303] border-r border-slate-200 dark:border-sanfran-rubi/30 transition-all lg:relative lg:translate-x-0 flex flex-col`}>
        <div className="p-6 border-b border-slate-100 dark:border-sanfran-rubi/20 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-sanfran-rubi p-2 rounded-xl text-white shadow-lg"><BookOpen className="w-6 h-6" /></div>
              <div>
                <h1 className="text-lg font-black dark:text-white leading-none">SanFran</h1>
                <span className="text-[9px] font-black text-sanfran-rubi uppercase">Academia Jurídica</span>
              </div>
            </div>
          </div>
          <BrasiliaClock />
        </div>
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? 'bg-sanfran-rubi text-white font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-sanfran-rubi/10'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-xs uppercase font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 space-y-3">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-100 dark:bg-sanfran-rubiDark text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
            {isDarkMode ? 'Escuro' : 'Claro'}
            {isDarkMode ? <Moon className="w-4 h-4 text-usp-blue" /> : <Sun className="w-4 h-4 text-usp-gold" />}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-2 px-4 py-3 text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest"><LogOut className="w-4 h-4" /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          {currentView === View.Dashboard && <Dashboard subjects={subjects} flashcards={flashcards} tasks={tasks} studySessions={studySessions} />}
          {currentView === View.Anki && <Anki subjects={subjects} flashcards={flashcards} setFlashcards={setFlashcards} folders={folders} setFolders={setFolders} userId={session.user.id} />}
          {currentView === View.Timer && <Pomodoro subjects={subjects} userId={session.user.id} setStudySessions={setStudySessions} />}
          {currentView === View.Calendar && <CalendarView subjects={subjects} tasks={tasks} userId={session.user.id} studySessions={studySessions} />}
          {currentView === View.Subjects && <Subjects subjects={subjects} setSubjects={setSubjects} userId={session.user.id} />}
          {currentView === View.Tasks && <Tasks subjects={subjects} tasks={tasks} setTasks={setTasks} userId={session.user.id} />}
        </div>
      </main>
    </div>
  );
};

export default App;
