import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Timer, BookOpen, CheckSquare, BrainCircuit, 
  Moon, Sun, LogOut, Calendar as CalendarIcon, Trophy, 
  Menu, X, Globe, User, Settings, Bell
} from 'lucide-react';
import { View, Subject, Flashcard, Task, StudySession, Reading, PresenceUser, Duel } from './types';
import Dashboard from './components/Dashboard';
import SanFranIdiomas from './components/SanFranIdiomas';
import Login from './components/Login';
import { supabase } from './services/supabaseClient';

// --- UTILS ---
export const getBrasiliaDate = () => {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
};

export const getBrasiliaISOString = () => {
  return new Date().toISOString();
};

// --- MOCK COMPONENTS PARA AS VIEWS NÃO FORNECIDAS ---
// Em um projeto real, estes seriam imports reais.
const PlaceholderView = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10 animate-in fade-in zoom-in-95">
    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
      <Settings size={40} className="animate-spin-slow" />
    </div>
    <h2 className="text-2xl font-black uppercase tracking-tight mb-2">{title}</h2>
    <p className="text-sm font-medium opacity-70">Módulo em desenvolvimento ou refatoração.</p>
  </div>
);

// --- COMPONENT: SIDEBAR ITEM ---
const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  collapsed 
}: { 
  icon: React.ElementType, 
  label: string, 
  active: boolean, 
  onClick: () => void,
  collapsed: boolean 
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        group flex items-center w-full p-3 rounded-xl transition-all duration-200
        ${active 
          ? 'bg-sanfran-rubi text-white shadow-lg shadow-sanfran-rubi/30' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sanfran-rubi dark:hover:text-white'
        }
        ${collapsed ? 'justify-center' : 'gap-3'}
      `}
      title={label}
    >
      <Icon size={20} className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
      {!collapsed && (
        <span className="text-xs font-bold uppercase tracking-wide truncate">{label}</span>
      )}
      {active && !collapsed && (
        <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
      )}
    </button>
  );
};

// --- COMPONENT: APP ---
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.SanFranIdiomas); // Default to Idiomas for demo
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('omnistudy_darkmode');
    return saved ? JSON.parse(saved) : true; // Default Dark for modern feel
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- AUTH & DATA ---
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

  // --- THEME ---
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('omnistudy_darkmode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} />;

  // --- NAVIGATION CONFIG ---
  const mainNav = [
    { id: View.Dashboard, icon: LayoutDashboard, label: 'Painel Geral' },
    { id: View.SanFranIdiomas, icon: Globe, label: 'Legal English' },
    { id: View.Tasks, icon: CheckSquare, label: 'Pauta de Tarefas' },
    { id: View.Subjects, icon: BookOpen, label: 'Disciplinas' },
    { id: View.Anki, icon: BrainCircuit, label: 'Flashcards' },
    { id: View.Timer, icon: Timer, label: 'Foco (Timer)' },
    { id: View.Ranking, icon: Trophy, label: 'Ranking' },
    { id: View.Calendar, icon: CalendarIcon, label: 'Agenda' },
  ];

  const handleNav = (view: View) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        flex flex-col transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${sidebarCollapsed ? 'w-20' : 'w-72'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* SIDEBAR HEADER */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
              <div className="w-8 h-8 bg-sanfran-rubi rounded-lg flex items-center justify-center text-white shadow-lg shadow-sanfran-rubi/20">
                <BookOpen size={18} fill="currentColor" />
              </div>
              <div>
                <h1 className="text-lg font-black uppercase tracking-tighter leading-none">SanFran</h1>
                <p className="text-[10px] font-bold text-sanfran-rubi uppercase tracking-widest">Academia</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
             <div className="mx-auto w-8 h-8 bg-sanfran-rubi rounded-lg flex items-center justify-center text-white">
                <BookOpen size={18} fill="currentColor" />
             </div>
          )}
          
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {sidebarCollapsed ? <Menu size={18} /> : <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded"><Menu size={14}/></div>}
          </button>
        </div>

        {/* NAVIGATION */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          {mainNav.map(item => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={currentView === item.id}
              onClick={() => handleNav(item.id)}
              collapsed={sidebarCollapsed}
            />
          ))}
        </div>

        {/* USER PROFILE & FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sanfran-rubi to-orange-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                <User size={18} className="text-slate-500" />
              </div>
            </div>
            
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{session.user.user_metadata?.full_name || 'Doutor(a)'}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Online</p>
              </div>
            )}
          </div>

          <div className={`flex gap-2 mt-4 ${sidebarCollapsed ? 'flex-col items-center' : ''}`}>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex-1 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-sanfran-rubi transition-colors flex items-center justify-center"
              title="Alternar Tema"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="flex-1 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500 transition-colors flex items-center justify-center"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* MOBILE HEADER */}
        <div className="lg:hidden h-16 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-30">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-500">
            <Menu size={24} />
          </button>
          <span className="font-black uppercase tracking-tight text-sanfran-rubi">SanFran</span>
          <div className="w-8" /> {/* Spacer */}
        </div>

        {/* CONTENT SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {/* VIEW RENDERER */}
            {currentView === View.SanFranIdiomas ? (
              <SanFranIdiomas userId={session.user.id} />
            ) : currentView === View.Dashboard ? (
              // Passing empty props just for shell structure demonstration
              <Dashboard 
                subjects={[]} flashcards={[]} tasks={[]} studySessions={[]} readings={[]} 
                onNavigate={handleNav} 
              />
            ) : (
              <PlaceholderView title={currentView} />
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;