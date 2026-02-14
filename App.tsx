
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Timer, BookOpen, CheckSquare, Menu, X, BrainCircuit, Moon, Sun, LogOut, Calendar as CalendarIcon, Key, AlertTriangle } from 'lucide-react';
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
  // Use the AIStudio type for the aistudio property on the Window interface
  // to avoid conflicts with existing declarations.
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  
  // Estado para monitorar se temos uma chave válida disponível
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // 1. Tenta process.env (Vercel/Build time)
      const envKey = process.env.API_KEY;
      if (envKey && envKey !== "undefined" && envKey !== "") {
        setHasApiKey(true);
        return;
      }

      // 2. Tenta AI Studio (Runtime)
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        if (selected) setHasApiKey(true);
      }
    };
    checkKey();
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

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    } else {
      alert("Configuração Necessária:\n1. Vá ao painel da Vercel\n2. Settings -> Environment Variables\n3. Adicione API_KEY com sua chave do Google AI Studio\n4. Faça um REDEPLOY na aba Deployments.");
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
          {!hasApiKey && (
            <button onClick={handleOpenKeyDialog} className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-600">
              <Key className="w-4 h-4" /> Ativar Inteligência IA
            </button>
          )}
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-100 dark:bg-sanfran-rubiDark text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
            {isDarkMode ? 'Escuro' : 'Claro'}
            {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-2 px-4 py-3 text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest"><LogOut className="w-4 h-4" /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        {!hasApiKey && (
          <div className="mb-8 p-5 bg-red-600 text-white rounded-2xl flex items-center justify-between gap-4 shadow-xl animate-pulse">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <p className="font-black uppercase text-sm">Erro de Protocolo IA</p>
                <p className="text-xs opacity-90">A chave de API não foi detectada. Flashcards automáticos não funcionarão.</p>
              </div>
            </div>
            <button onClick={handleOpenKeyDialog} className="px-6 py-2 bg-white text-red-600 rounded-xl font-black text-[10px] uppercase shadow-lg">Resolver</button>
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
