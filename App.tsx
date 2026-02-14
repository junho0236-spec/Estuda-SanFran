
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Timer, BookOpen, CheckSquare, Menu, X, BrainCircuit, Moon, Sun, LogOut, Calendar as CalendarIcon, Key, AlertTriangle, Sparkles } from 'lucide-react';
import { View, Subject, Flashcard, Task, Folder, StudySession } from './types';
import Dashboard from './components/Dashboard';
import Anki from './components/Anki';
import Pomodoro from './components/Pomodoro';
import Subjects from './components/Subjects';
import Tasks from './components/Tasks';
import CalendarView from './components/CalendarView';
import Login from './components/Login';
import { supabase } from './services/supabaseClient';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isAiActive, setIsAiActive] = useState(false);

  // Verifica se a IA já está ativa no carregamento
  useEffect(() => {
    const checkAiStatus = async () => {
      if (window.aistudio) {
        const active = await window.aistudio.hasSelectedApiKey();
        setIsAiActive(active);
      } else if (process.env.API_KEY && process.env.API_KEY !== "undefined") {
        setIsAiActive(true);
      }
    };
    checkAiStatus();
  }, []);

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
    const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', userId);
    setSubjects(subs || []);

    const { data: flds } = await supabase.from('folders').select('*').eq('user_id', userId);
    setFolders(flds?.map(f => ({ id: f.id, name: f.name, parentId: f.parent_id })) || []);

    const { data: cards = [] } = await supabase.from('flashcards').select('*').eq('user_id', userId);
    setFlashcards(cards?.map(c => ({
      id: c.id, front: c.front, back: c.back, subjectId: c.subject_id, folderId: c.folder_id, nextReview: c.next_review, interval: c.interval
    })) || []);

    const { data: tks = [] } = await supabase.from('tasks').select('*').eq('user_id', userId);
    setTasks(tks?.map(t => ({
      id: t.id, title: t.title, completed: t.completed, subjectId: t.subject_id, dueDate: t.due_date, completedAt: t.completed_at
    })) || []);

    const { data: sessions = [] } = await supabase.from('study_sessions').select('*').eq('user_id', userId);
    setStudySessions(sessions || []);
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleActivateAi = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsAiActive(true);
    } else {
      alert("Seletor de IA não disponível neste navegador.");
    }
  };

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
        <div className="p-6 border-b border-slate-100 dark:border-sanfran-rubi/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-sanfran-rubi p-2 rounded-xl text-white shadow-lg"><BookOpen className="w-6 h-6" /></div>
            <div>
              <h1 className="text-lg font-black dark:text-white leading-none">SanFran</h1>
              <span className="text-[9px] font-black text-sanfran-rubi uppercase">Academia Jurídica</span>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? 'bg-sanfran-rubi text-white font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-sanfran-rubi/10'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-xs uppercase font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 space-y-3">
          {!isAiActive ? (
            <button onClick={handleActivateAi} className="w-full flex flex-col items-center gap-1 px-4 py-3 rounded-2xl bg-usp-gold text-slate-900 font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg animate-bounce">
              <div className="flex items-center gap-2"><Key className="w-4 h-4" /> Ativar Inteligência IA</div>
              <span className="text-[8px] opacity-70">Para gerar flashcards</span>
            </button>
          ) : (
            <div className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-black text-[10px] uppercase tracking-widest justify-center">
              <Sparkles className="w-4 h-4" /> IA Conectada
            </div>
          )}
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-100 dark:bg-sanfran-rubiDark text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
            {isDarkMode ? 'Escuro' : 'Claro'}
            {isDarkMode ? <Moon className="w-4 h-4 text-usp-blue" /> : <Sun className="w-4 h-4 text-usp-gold" />}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-2 px-4 py-3 text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest"><LogOut className="w-4 h-4" /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        {!isAiActive && currentView === View.Anki && (
          <div className="mb-8 p-6 bg-usp-gold/10 border-l-8 border-usp-gold rounded-2xl flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <Sparkles className="w-8 h-8 text-usp-gold shrink-0" />
              <div>
                <p className="font-black uppercase text-sm text-slate-900 dark:text-white">Potencialize seus estudos com IA</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Ative sua chave para converter doutrinas em flashcards automaticamente.</p>
              </div>
            </div>
            <button onClick={handleActivateAi} className="px-6 py-2 bg-usp-gold text-slate-900 rounded-xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-transform">Conectar Agora</button>
          </div>
        )}
        <div className="max-w-6xl mx-auto">
          {currentView === View.Dashboard && <Dashboard subjects={subjects} flashcards={flashcards} tasks={tasks} studySessions={studySessions} />}
          {currentView === View.Anki && <Anki subjects={subjects} flashcards={flashcards} setFlashcards={setFlashcards} folders={folders} setFolders={setFolders} userId={session.user.id} />}
          {currentView === View.Timer && <Pomodoro subjects={subjects} userId={session.user.id} />}
          {currentView === View.Calendar && <CalendarView subjects={subjects} tasks={tasks} userId={session.user.id} />}
          {currentView === View.Subjects && <Subjects subjects={subjects} setSubjects={setSubjects} userId={session.user.id} />}
          {currentView === View.Tasks && <Tasks subjects={subjects} tasks={tasks} setTasks={setTasks} userId={session.user.id} />}
        </div>
      </main>
    </div>
  );
};

export default App;
