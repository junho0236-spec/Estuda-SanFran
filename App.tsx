import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Timer as TimerIcon, BookOpen, CheckSquare, BrainCircuit, Moon, Sun, LogOut, Calendar as CalendarIcon, Clock as ClockIcon, Menu, X, Coffee, Gavel, Play, Pause, Trophy, Library as LibraryIcon, Users, MessageSquare, Calculator as CalculatorIcon, Mic, Building2, CalendarClock, Armchair, Briefcase, Scroll, ClipboardList, GitCommit, Archive, Quote, Scale, Gamepad2, Zap, ShoppingBag, Sword, Bell, Target, Network, Keyboard, FileSignature, Calculator, Megaphone, Dna, Banknote, ClipboardCheck, ScanSearch, Languages, Split, ThumbsUp, Map, Hourglass, Globe, IdCard, Pin, Landmark, LayoutGrid, Radio, GraduationCap, Leaf, Wrench, ShieldCheck, TrendingUp } from 'lucide-react';
import { View, Subject, Flashcard, Task, Folder, StudySession, Reading, PresenceUser, Duel } from './types';
import { supabase } from './services/supabaseClient';

// Components
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
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
import DeadArchive from './components/DeadArchive';
import CitationGenerator from './components/CitationGenerator';
import JurisprudenceMural from './components/JurisprudenceMural';
import SumulaChallenge from './components/SumulaChallenge';
import Sebo from './components/Sebo';
import ClassificadosPatio from './components/ClassificadosPatio';
import DuelArena from './components/DuelArena';
import OabCountdown from './components/OabCountdown';
import SpecializationTree from './components/SpecializationTree';
import TypingChallenge from './components/TypingChallenge';
import Petitum from './components/Petitum';
import Dosimetria from './components/Dosimetria';
import Debate from './components/Debate';
import Trunfo from './components/Trunfo';
import Honorarios from './components/Honorarios';
import Checklist from './components/Checklist';
import InvestigationBoard from './components/InvestigationBoard';
import LatinGame from './components/LatinGame';
import SucessaoSimulator from './components/SucessaoSimulator';
import JurisTinder from './components/JurisTinder';
import InternRPG from './components/InternRPG';
import PrescriptionCalculator from './components/PrescriptionCalculator';
import SanFranIdiomas from './components/SanFranIdiomas';
import DigitalID from './components/DigitalID';
import DominioJuridico from './components/DominioJuridico';

// Hubs
import SanFranEssential from './components/SanFranEssential';
import SanFranCommunity from './components/SanFranCommunity';
import SanFranImprovement from './components/SanFranImprovement';
import SanFranLanguages from './components/SanFranLanguages';
import SanFranLife from './components/SanFranLife';
import SanFranGames from './components/SanFranGames';
import SanFranHelp from './components/SanFranHelp';
import SanFranOAB from './components/SanFranOAB';

// OAB Tools
import EticaBlitz from './components/EticaBlitz';
import RaioXOAB from './components/RaioXOAB';

export const getBrasiliaDate = () => {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
};

export const getBrasiliaISOString = () => {
  const date = new Date();
  const brasiliaOffset = -3 * 60; 
  const localOffset = date.getTimezoneOffset();
  const offsetDiff = brasiliaOffset - localOffset;
  const brasiliaDate = new Date(date.getTime() + offsetDiff * 60 * 1000);
  return brasiliaDate.toISOString();
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  
  // Timer State (Lifted)
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [timerTotalInitial, setTimerTotalInitial] = useState(25 * 60);
  const [timerSubjectId, setTimerSubjectId] = useState<string | null>(null);
  const [timerReadingId, setTimerReadingId] = useState<string | null>(null);

  // Presence
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [activeDuel, setActiveDuel] = useState<Duel | null>(null);

  // Study Rooms State
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomStartTime, setRoomStartTime] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadUserData();
      
      // Presence System
      const channel = supabase.channel('online_users', {
        config: {
          presence: {
            key: session.user.id,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          const users = Object.values(newState).flat() as PresenceUser[];
          setPresenceUsers(users);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: session.user.id,
              name: session.user.user_metadata.full_name || 'Estudante',
              view: currentView,
              subject_name: subjects.find(s => s.id === timerSubjectId)?.name,
              is_timer_active: isTimerActive,
              last_seen: new Date().toISOString(),
              study_room_id: currentRoomId,
              study_start_time: roomStartTime
            });
          }
        });

      // Listen for Duels
      const duelChannel = supabase.channel(`duels:${session.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duels', filter: `opponent_id=eq.${session.user.id}` }, (payload) => {
           if(payload.new.status === 'pending') {
             if(confirm(`Desafio de Doutrina recebido de ${payload.new.challenger_name}! Aceitar?`)) {
                acceptDuel(payload.new.id);
             }
           }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${activeDuel?.id}` }, (payload) => {
           setActiveDuel(payload.new as Duel);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(duelChannel);
      };
    }
  }, [session]);

  // Update presence when state changes
  useEffect(() => {
    if (session) {
       const updatePresence = async () => {
          const channels = supabase.getChannels();
          const presenceChannel = channels.find(c => c.topic === 'online_users');
          if (presenceChannel) {
             await presenceChannel.track({
              user_id: session.user.id,
              name: session.user.user_metadata.full_name || 'Estudante',
              view: currentView,
              subject_name: subjects.find(s => s.id === timerSubjectId)?.name,
              is_timer_active: isTimerActive,
              last_seen: new Date().toISOString(),
              study_room_id: currentRoomId,
              study_start_time: roomStartTime
            });
          }
       };
       updatePresence();
    }
  }, [currentView, isTimerActive, timerSubjectId, subjects, currentRoomId, roomStartTime]);

  const acceptDuel = async (duelId: string) => {
     try {
       const { data, error } = await supabase.from('duels').update({ status: 'active' }).eq('id', duelId).select().single();
       if(data) {
         setActiveDuel(data);
         setCurrentView(View.Duel);
       }
     } catch(e) { console.error(e); }
  };

  const loadUserData = async () => {
    if (!session) return;
    const userId = session.user.id;

    const [subjRes, flashRes, taskRes, sessRes, readRes, foldRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', userId),
      supabase.from('flashcards').select('*').eq('user_id', userId).is('archived_at', null),
      supabase.from('tasks').select('*').eq('user_id', userId).is('archived_at', null),
      supabase.from('study_sessions').select('*').eq('user_id', userId),
      supabase.from('readings').select('*').eq('user_id', userId),
      supabase.from('folders').select('*').eq('user_id', userId)
    ]);

    if (subjRes.data) setSubjects(subjRes.data);
    if (flashRes.data) setFlashcards(flashRes.data.map(f => ({...f, subjectId: f.subject_id, folderId: f.folder_id, nextReview: f.next_review})));
    if (taskRes.data) setTasks(taskRes.data.map(t => ({...t, subjectId: t.subject_id, dueDate: t.due_date, completedAt: t.completed_at})));
    if (sessRes.data) setStudySessions(sessRes.data);
    if (readRes.data) setReadings(readRes.data.map(r => ({...r, subject_id: r.subject_id})));
    if (foldRes.data) setFolders(foldRes.data.map(f => ({...f, parentId: f.parent_id})));
  };

  const toggleTimer = () => setIsTimerActive(!isTimerActive);

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerActive && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (timerSecondsLeft === 0 && isTimerActive) {
      handleTimerFinish();
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerSecondsLeft]);

  const handleTimerFinish = async () => {
    setIsTimerActive(false);
    if (timerMode === 'work') {
      const duration = timerTotalInitial;
      const today = getBrasiliaISOString();
      
      const newSession: StudySession = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: session.user.id,
        start_time: today,
        duration: duration,
        subject_id: timerSubjectId || '',
        reading_id: timerReadingId || undefined
      };

      try {
        const { error } = await supabase.from('study_sessions').insert(newSession);
        if (!error) {
          setStudySessions(prev => [...prev, newSession]);
          new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3').play().catch(() => {});
          
          if (Notification.permission === 'granted') {
            new Notification("Sessão Concluída!", { body: "Bom trabalho, Doutor(a). Hora da pausa." });
          }
        }
      } catch(e) { console.error(e); }
    }
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  const renderView = () => {
    const props = { userId: session.user.id, userName: session.user.user_metadata.full_name };

    switch (currentView) {
      // HUBS
      case View.SanFranEssential: return <SanFranEssential onNavigate={setCurrentView} />;
      case View.SanFranCommunity: return <SanFranCommunity onNavigate={setCurrentView} />;
      case View.SanFranImprovement: return <SanFranImprovement onNavigate={setCurrentView} />;
      case View.SanFranLanguages: return <SanFranLanguages onNavigate={setCurrentView} />;
      case View.SanFranLife: return <SanFranLife onNavigate={setCurrentView} />;
      case View.SanFranGames: return <SanFranGames onNavigate={setCurrentView} />;
      case View.SanFranHelp: return <SanFranHelp onNavigate={setCurrentView} />;
      case View.SanFranOAB: return <SanFranOAB onNavigate={setCurrentView} />; // OAB Hub

      // ESSENTIAL
      case View.Dashboard: return <Dashboard subjects={subjects} flashcards={flashcards} tasks={tasks} studySessions={studySessions} readings={readings} onNavigate={setCurrentView} />;
      case View.Anki: return <Anki subjects={subjects} flashcards={flashcards} setFlashcards={setFlashcards} folders={folders} setFolders={setFolders} userId={session.user.id} />;
      case View.Timer: return <Pomodoro subjects={subjects} readings={readings} userId={session.user.id} studySessions={studySessions} setStudySessions={setStudySessions} isActive={isTimerActive} setIsActive={setIsTimerActive} secondsLeft={timerSecondsLeft} setSecondsLeft={setTimerSecondsLeft} mode={timerMode} setMode={setTimerMode} selectedSubjectId={timerSubjectId} setSelectedSubjectId={setTimerSubjectId} selectedReadingId={timerReadingId} setSelectedReadingId={setTimerReadingId} setTotalInitial={setTimerTotalInitial} onManualFinalize={handleTimerFinish} />;
      case View.Subjects: return <Subjects subjects={subjects} setSubjects={setSubjects} userId={session.user.id} />;
      case View.Tasks: return <Tasks subjects={subjects} tasks={tasks} setTasks={setTasks} userId={session.user.id} />;
      case View.Calendar: return <CalendarView subjects={subjects} tasks={tasks} userId={session.user.id} studySessions={studySessions} />;
      case View.Ranking: return <Ranking userId={session.user.id} session={session} />;
      case View.Library: return <Library readings={readings} setReadings={setReadings} subjects={subjects} userId={session.user.id} />;
      case View.Calculator: return <GradeCalculator subjects={subjects} />;
      case View.DeadArchive: return <DeadArchive userId={session.user.id} />;

      // COMMUNITY
      case View.Largo: return <Largo presenceUsers={presenceUsers} currentUserId={session.user.id} />;
      case View.StudyRoom: return <StudyRooms presenceUsers={presenceUsers} currentUserId={session.user.id} currentRoomId={currentRoomId} setCurrentRoomId={setCurrentRoomId} setRoomStartTime={setRoomStartTime} />;
      case View.Mural: return <Mural userId={session.user.id} userName={session.user.user_metadata.full_name} />;
      case View.Societies: return <Societies userId={session.user.id} userName={session.user.user_metadata.full_name} />;
      case View.Debate: return <Debate userId={session.user.id} />;
      case View.JurisprudenceMural: return <JurisprudenceMural userId={session.user.id} userName={session.user.user_metadata.full_name} />;
      case View.ClassificadosPatio: return <ClassificadosPatio userId={session.user.id} userName={session.user.user_metadata.full_name} studySessions={studySessions} />;
      
      // IMPROVEMENT
      case View.DominioJuridico: return <DominioJuridico subjects={subjects} studySessions={studySessions} />;
      case View.Specialization: return <SpecializationTree subjects={subjects} studySessions={studySessions} />;
      case View.LeiSeca: return <LeiSeca userId={session.user.id} />;
      case View.TypingChallenge: return <TypingChallenge userId={session.user.id} userName={session.user.user_metadata.full_name} />;
      case View.Timeline: return <TimelineBuilder />;
      case View.OralArgument: return <OralArgument />;

      // OAB
      case View.OabCountdown: return <OabCountdown userId={session.user.id} />;
      case View.EticaBlitz: return <EticaBlitz />;
      case View.RaioXOAB: return <RaioXOAB />;

      // LIFE
      case View.Office: return <VirtualOffice studySessions={studySessions} userName={session.user.user_metadata.full_name} />;
      case View.Sebo: return <Sebo userId={session.user.id} userName={session.user.user_metadata.full_name} />;
      case View.DigitalID: return <DigitalID userId={session.user.id} userName={session.user.user_metadata.full_name} studySessions={studySessions} tasks={tasks} />;

      // GAMES
      case View.InternRPG: return <InternRPG />;
      case View.Trunfo: return <Trunfo userId={session.user.id} userName={session.user.user_metadata.full_name} />;
      case View.SumulaChallenge: return <SumulaChallenge userId={session.user.id} userName={session.user.user_metadata.full_name} />;
      case View.JurisTinder: return <JurisTinder />;
      case View.LatinGame: return <LatinGame userId={session.user.id} />;

      // HELP
      case View.Dosimetria: return <Dosimetria userId={session.user.id} />;
      case View.Honorarios: return <Honorarios userId={session.user.id} />;
      case View.DeadlineCalculator: return <DeadlineCalculator />;
      case View.PrescriptionCalculator: return <PrescriptionCalculator userId={session.user.id} />;
      case View.SucessaoSimulator: return <SucessaoSimulator />;
      case View.Checklist: return <Checklist userId={session.user.id} />;
      case View.InvestigationBoard: return <InvestigationBoard userId={session.user.id} />;
      case View.Petitum: return <Petitum userId={session.user.id} />;
      case View.CitationGenerator: return <CitationGenerator />;

      // LANGUAGES
      case View.SanFranIdiomas: return <SanFranIdiomas userId={session.user.id} />;

      // SPECIFIC
      case View.Editais: return <Editais userId={session.user.id} />;
      case View.Duel: return activeDuel ? <DuelArena duel={activeDuel} userId={session.user.id} onFinished={() => setCurrentView(View.Largo)} /> : <Largo presenceUsers={presenceUsers} currentUserId={session.user.id} />;
      
      default: return <Dashboard subjects={subjects} flashcards={flashcards} tasks={tasks} studySessions={studySessions} readings={readings} onNavigate={setCurrentView} />;
    }
  };

  const navItems = [
    { view: View.Dashboard, label: 'Dashboard', icon: LayoutDashboard },
    { view: View.SanFranEssential, label: 'Essential', icon: Zap },
    { view: View.SanFranCommunity, label: 'Community', icon: Users },
    { view: View.SanFranImprovement, label: 'Improvement', icon: TrendingUp },
    { view: View.SanFranOAB, label: 'SanFran OAB', icon: Target },
    { view: View.SanFranLanguages, label: 'Languages', icon: Languages },
    { view: View.SanFranLife, label: 'Life', icon: Armchair },
    { view: View.SanFranGames, label: 'Games', icon: Gamepad2 },
    { view: View.SanFranHelp, label: 'Help', icon: Wrench },
  ];

  return (
    <div className={`flex min-h-screen bg-[#fcfcfc] dark:bg-sanfran-rubiBlack text-slate-900 dark:text-white font-sans transition-colors duration-500 overflow-x-hidden ${isTimerActive ? 'timer-active-mode' : ''}`}>
      
      {/* ATMOSPHERE AUDIO PLAYER */}
      <Atmosphere isExtremeFocus={isTimerActive} />
      
      {/* SCRATCHPAD (Bloco de Notas Rápido) */}
      <Scratchpad userId={session.user.id} isExtremeFocus={isTimerActive} />

      {/* MOBILE HEADER */}
      <div className="lg:hidden fixed top-0 w-full z-50 bg-white/80 dark:bg-sanfran-rubiBlack/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 py-3 flex items-center justify-between">
         <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 dark:text-white">
            {isSidebarOpen ? <X /> : <Menu />}
         </button>
         <span className="font-black text-lg uppercase tracking-tight text-sanfran-rubi">SanFran</span>
         <div className="w-10"></div>
      </div>

      {/* SIDEBAR NAVIGATION */}
      <nav className={`fixed lg:sticky top-0 left-0 h-screen w-20 lg:w-72 bg-white dark:bg-sanfran-rubiDark/20 border-r border-slate-200 dark:border-sanfran-rubi/20 flex flex-col justify-between py-6 z-40 transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-10 pl-2 mt-12 lg:mt-0">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-sanfran-rubi rounded-xl flex items-center justify-center shadow-lg shadow-sanfran-rubi/30">
               <Scale className="text-white w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <span className="hidden lg:block font-black text-xl tracking-tighter">SanFran</span>
          </div>
          
          <div className="space-y-2">
            {navItems.map(item => (
              <button
                key={item.view}
                onClick={() => { setCurrentView(item.view); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${currentView === item.view ? 'bg-sanfran-rubi text-white shadow-xl shadow-sanfran-rubi/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-sanfran-rubi'}`}
              >
                <item.icon className={`w-5 h-5 lg:w-5 lg:h-5 transition-transform group-hover:scale-110 ${currentView === item.view ? 'animate-pulse' : ''}`} />
                <span className="hidden lg:block font-bold text-xs uppercase tracking-widest">{item.label}</span>
                {currentView === item.view && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full lg:block hidden"></div>}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 lg:px-8 space-y-4">
           {/* Editais do Dia (Mini Widget) */}
           <div 
             onClick={() => setCurrentView(View.Editais)}
             className="cursor-pointer bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-sanfran-rubi transition-all group"
           >
              <div className="flex items-center gap-3 mb-1">
                 <ClipboardList size={16} className="text-sanfran-rubi group-hover:animate-bounce" />
                 <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Editais do Dia</span>
              </div>
              <div className="h-1 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-sanfran-rubi w-1/3"></div>
              </div>
           </div>

           {/* User Profile Button */}
           <button 
             onClick={() => setCurrentView(View.DigitalID)}
             className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
           >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sanfran-rubi to-orange-500 flex items-center justify-center text-white font-black text-xs shadow-lg">
                 {session.user.user_metadata.full_name?.substring(0,2).toUpperCase() || 'SF'}
              </div>
              <div className="hidden lg:block text-left">
                 <p className="text-xs font-black uppercase text-slate-900 dark:text-white truncate max-w-[120px]">
                    {session.user.user_metadata.full_name?.split(' ')[0]}
                 </p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ver Carteirinha</p>
              </div>
           </button>

           <div className="flex justify-between items-center px-2">
              <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 transition-colors">
                 <LogOut size={18} />
              </button>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-slate-400 hover:text-yellow-500 transition-colors">
                 {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
           </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 p-4 lg:p-10 transition-all duration-500 mt-16 lg:mt-0 ${isTimerActive ? 'flex items-center justify-center bg-[#0d0303] text-white fixed inset-0 z-50' : ''}`}>
        {renderView()}
      </main>

    </div>
  );
};

export default App;