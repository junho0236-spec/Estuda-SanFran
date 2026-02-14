
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Timer, BookOpen, CheckSquare, Menu, X, BrainCircuit, Moon, Sun, LogOut, Calendar as CalendarIcon } from 'lucide-react';
import { View, Subject, Flashcard, Task, Folder } from './types';
import Dashboard from './components/Dashboard';
import Anki from './components/Anki';
import Pomodoro from './components/Pomodoro';
import Subjects from './components/Subjects';
import Tasks from './components/Tasks';
import CalendarView from './components/CalendarView';
import Login from './components/Login';
import { supabase } from './services/supabaseClient';

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
    if (subs && subs.length > 0) setSubjects(subs);
    else setSubjects([
      { id: '1', name: 'Direito Civil', color: '#9B111E' },
      { id: '2', name: 'Direito Penal', color: '#1094ab' },
      { id: '3', name: 'Constitucional', color: '#fcb421' }
    ]);

    const { data: flds } = await supabase.from('folders').select('*').eq('user_id', userId);
    if (flds) setFolders(flds.map(f => ({ id: f.id, name: f.name, parentId: f.parent_id })));

    const { data: cards } = await supabase.from('flashcards').select('*').eq('user_id', userId);
    if (cards) setFlashcards(cards.map(c => ({
      id: c.id, front: c.front, back: c.back, subjectId: c.subject_id, folderId: c.folder_id, nextReview: c.next_review, interval: c.interval
    })));

    const { data: tks } = await supabase.from('tasks').select('*').eq('user_id', userId);
    if (tks) setTasks(tks.map(t => ({
      id: t.id, title: t.title, completed: t.completed, subjectId: t.subject_id, dueDate: t.due_date
    })));
  };

  useEffect(() => {
    localStorage.setItem('omnistudy_darkmode', JSON.stringify(isDarkMode));
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const navItems = [
    { id: View.Dashboard, icon: LayoutDashboard, label: 'Painel' },
    { id: View.Anki, icon: BrainCircuit, label: 'Flashcards (Anki)' },
    { id: View.Timer, icon: Timer, label: 'Pomodoro' },
    { id: View.Calendar, icon: CalendarIcon, label: 'Calendário' },
    { id: View.Subjects, icon: BookOpen, label: 'Disciplinas' },
    { id: View.Tasks, icon: CheckSquare, label: 'Tarefas' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderContent = () => {
    if (!session?.user) return null;
    const userId = session.user.id;

    switch (currentView) {
      case View.Dashboard: return <Dashboard subjects={subjects} flashcards={flashcards} tasks={tasks} />;
      case View.Anki: return <Anki subjects={subjects} flashcards={flashcards} setFlashcards={setFlashcards} folders={folders} setFolders={setFolders} userId={userId} />;
      case View.Timer: return <Pomodoro subjects={subjects} userId={userId} />;
      case View.Calendar: return <CalendarView subjects={subjects} userId={userId} />;
      case View.Subjects: return <Subjects subjects={subjects} setSubjects={setSubjects} userId={userId} />;
      case View.Tasks: return <Tasks subjects={subjects} tasks={tasks} setTasks={setTasks} userId={userId} />;
      default: return <Dashboard subjects={subjects} flashcards={flashcards} tasks={tasks} />;
    }
  };

  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'dark bg-sanfran-rubiBlack' : 'bg-[#fcfcfc]'}`}>
      {!isSidebarOpen && (
        <button onClick={() => setIsSidebarOpen(true)} className="fixed top-4 left-4 z-50 p-3 bg-white dark:bg-sanfran-rubiDark rounded-xl shadow-xl lg:hidden border border-slate-200 dark:border-sanfran-rubi/20"><Menu className="w-6 h-6 text-sanfran-rubi" /></button>
      )}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#0d0303] border-r border-slate-200 dark:border-sanfran-rubi/30 transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-sanfran-rubi/20">
          <div className="flex items-center gap-3">
            <div className="bg-sanfran-rubi p-2 rounded-xl text-white shadow-lg"><BookOpen className="w-6 h-6" /></div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white leading-none">Estuda SanFran</h1>
              <span className="text-[10px] font-black text-sanfran-rubi uppercase tracking-widest mt-1">Academia Jurídica</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 dark:text-sanfran-rubi"><X className="w-6 h-6" /></button>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${currentView === item.id ? 'bg-sanfran-rubi text-white font-black shadow-md' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-sanfran-rubi/10 hover:text-sanfran-rubi'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 space-y-3">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-100 dark:bg-sanfran-rubiDark border border-slate-200 dark:border-sanfran-rubi/30 text-slate-950 dark:text-white hover:scale-[1.02] transition-all">
            <span className="text-xs font-black uppercase tracking-widest">{isDarkMode ? 'Modo Escuro' : 'Modo Claro'}</span>
            {isDarkMode ? <Moon className="w-5 h-5 text-usp-blue" /> : <Sun className="w-5 h-5 text-usp-gold" />}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-all font-black uppercase text-[10px] tracking-widest"><LogOut className="w-4 h-4" /> Sair do Sistema</button>
          <div className="bg-sanfran-rubi dark:bg-sanfran-rubiDark rounded-2xl p-4 text-white shadow-xl border border-white/10">
            <p className="text-[9px] text-white/70 mb-1 font-black uppercase tracking-widest">Academia SanFran</p>
            <p className="text-sm font-black italic">"Scientia Vinces"</p>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
