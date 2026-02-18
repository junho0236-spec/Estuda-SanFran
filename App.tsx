
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { View, Subject, Flashcard, Task, StudySession, Reading, Folder } from './types';

// Import all components
import Login from './components/Login';
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
import ClassificadosPatio from './components/ClassificadosPatio';
import DominioJuridico from './components/DominioJuridico';
import Profile from './components/Profile';
import SanFranEssential from './components/SanFranEssential';
import SanFranCommunity from './components/SanFranCommunity';
import SanFranImprovement from './components/SanFranImprovement';
import SanFranLanguages from './components/SanFranLanguages';
import SanFranLife from './components/SanFranLife';
import SanFranGames from './components/SanFranGames';
import SanFranHelp from './components/SanFranHelp';
import SanFranOAB from './components/SanFranOAB';
import ErrorLog from './components/ErrorLog';
import GeneralLanguages from './components/GeneralLanguages';
import Atmosphere from './components/Atmosphere';
import Scratchpad from './components/Scratchpad';
import ReverseStudyPlanner from './components/ReverseStudyPlanner';
import Mnemonics from './components/Mnemonics';
import SpeedReader from './components/SpeedReader';
import GuerraTurmas from './components/GuerraTurmas';
import ClubeLivro from './components/ClubeLivro';
import GuiaSobrevivencia from './components/GuiaSobrevivencia';
import PerolasTribuna from './components/PerolasTribuna';
import AchadosPerdidos from './components/AchadosPerdidos';
import BussolaOptativas from './components/BussolaOptativas';
import TribunalOpiniao from './components/TribunalOpiniao';
import BalcaoEstagios from './components/BalcaoEstagios';
import CaronasRepublicas from './components/CaronasRepublicas';
import TheVault from './components/TheVault';
import SocialEvents from './components/SocialEvents';
import LargoAuction from './components/LargoAuction';
import StudyPact from './components/StudyPact';
import PetitionWiki from './components/PetitionWiki';
import MockJury from './components/MockJury';
import Mentorship from './components/Mentorship';
import DeadlinePlanner from './components/DeadlinePlanner';
import SyllabusTracker from './components/SyllabusTracker';
import AttendanceCalculator from './components/AttendanceCalculator';
import SpacedRepetition from './components/SpacedRepetition';
import IracMethod from './components/IracMethod';
import CodeTracker from './components/CodeTracker';

// Fix for exported member errors in child components
/**
 * Retorna a data atual no fuso de Brasília no formato YYYY-MM-DD
 */
export const getBrasiliaDate = () => {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
};

/**
 * Retorna o ISO String atual
 */
export const getBrasiliaISOString = () => {
  return new Date().toISOString();
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  
  // Data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  // Timer states (shared across some components)
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedReadingId, setSelectedReadingId] = useState<string | null>(null);
  const [totalInitial, setTotalInitial] = useState(25 * 60);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchInitialData();
    }
  }, [session]);

  const fetchInitialData = async () => {
    if (!session?.user?.id) return;
    
    try {
      const [
        { data: subs },
        { data: cards },
        { data: tks },
        { data: sessions },
        { data: rds },
        { data: flds }
      ] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', session.user.id),
        supabase.from('flashcards').select('*').eq('user_id', session.user.id),
        supabase.from('tasks').select('*').eq('user_id', session.user.id),
        supabase.from('study_sessions').select('*').eq('user_id', session.user.id),
        supabase.from('readings').select('*').eq('user_id', session.user.id),
        supabase.from('folders').select('*').eq('user_id', session.user.id)
      ]);

      if (subs) setSubjects(subs);
      if (cards) setFlashcards(cards.map((c: any) => ({
        id: c.id, front: c.front, back: c.back, subjectId: c.subject_id, folderId: c.folder_id, nextReview: c.next_review, interval: c.interval, archived_at: c.archived_at
      })));
      if (tks) setTasks(tks.map((t: any) => ({
        id: t.id, title: t.title, completed: t.completed, subjectId: t.subject_id, dueDate: t.due_date, completedAt: t.completed_at, priority: t.priority, category: t.category, archived_at: t.archived_at
      })));
      if (sessions) setStudySessions(sessions);
      if (rds) setReadings(rds);
      if (flds) setFolders(flds);
    } catch (e) {
      console.error("Erro ao buscar dados iniciais:", e);
    }
  };

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  const userName = session.user.user_metadata?.full_name || 'Doutor(a)';

  return (
    <div className="flex min-h-screen bg-[#fcfcfc] dark:bg-[#0d0303]">
      {/* Quick Navigation Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 hidden lg:flex flex-col fixed h-full z-40">
        <h1 className="text-2xl font-black text-sanfran-rubi uppercase tracking-tighter mb-10">SanFran Academy</h1>
        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          <button onClick={() => setCurrentView(View.Dashboard)} className={`w-full text-left p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${currentView === View.Dashboard ? 'bg-sanfran-rubi text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>Dashboard</button>
          
          <div className="pt-4 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3">Modúlos</div>
          <button onClick={() => setCurrentView(View.SanFranEssential)} className={`w-full text-left p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${currentView === View.SanFranEssential ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>Essential</button>
          <button onClick={() => setCurrentView(View.SanFranCommunity)} className={`w-full text-left p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${currentView === View.SanFranCommunity ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>Community</button>
          <button onClick={() => setCurrentView(View.SanFranImprovement)} className={`w-full text-left p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${currentView === View.SanFranImprovement ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>Improvement</button>
          <button onClick={() => setCurrentView(View.SanFranLanguages)} className={`w-full text-left p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${currentView === View.SanFranLanguages ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>Languages</button>
          <button onClick={() => setCurrentView(View.SanFranLife)} className={`w-full text-left p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${currentView === View.SanFranLife ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>Life</button>
          <button onClick={() => setCurrentView(View.SanFranGames)} className={`w-full text-left p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${currentView === View.SanFranGames ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>Games</button>
          <button onClick={() => setCurrentView(View.SanFranHelp)} className={`w-full text-left p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${currentView === View.SanFranHelp ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>Help</button>
          <button onClick={() => setCurrentView(View.SanFranOAB)} className={`w-full text-left p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${currentView === View.SanFranOAB ? 'bg-sanfran-rubi text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>OAB</button>
        </nav>
        <div className="pt-6 border-t border-slate-100 dark:border-white/5 mt-6">
           <button onClick={() => supabase.auth.signOut()} className="w-full text-left p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">Sair do Sistema</button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          {/* Main View Router */}
          {currentView === View.Dashboard && <Dashboard subjects={subjects} flashcards={flashcards} tasks={tasks} studySessions={studySessions} readings={readings} onNavigate={setCurrentView} />}
          {currentView === View.SanFranEssential && <SanFranEssential onNavigate={setCurrentView} />}
          {currentView === View.SanFranCommunity && <SanFranCommunity onNavigate={setCurrentView} />}
          {currentView === View.SanFranImprovement && <SanFranImprovement onNavigate={setCurrentView} />}
          {currentView === View.SanFranLanguages && <SanFranLanguages onNavigate={setCurrentView} />}
          {currentView === View.SanFranLife && <SanFranLife onNavigate={setCurrentView} />}
          {currentView === View.SanFranGames && <SanFranGames onNavigate={setCurrentView} />}
          {currentView === View.SanFranHelp && <SanFranHelp onNavigate={setCurrentView} />}
          {currentView === View.SanFranOAB && <SanFranOAB onNavigate={setCurrentView} />}
          
          {/* Navigation Views */}
          {currentView === View.Anki && <Anki subjects={subjects} flashcards={flashcards} setFlashcards={setFlashcards} folders={folders} setFolders={setFolders} userId={session.user.id} />}
          {currentView === View.Timer && (
            <Pomodoro 
              subjects={subjects} readings={readings} userId={session.user.id} 
              studySessions={studySessions} setStudySessions={setStudySessions} 
              isActive={isTimerActive} setIsActive={setIsTimerActive} 
              secondsLeft={secondsLeft} setSecondsLeft={setSecondsLeft} 
              mode={timerMode} setMode={setTimerMode} 
              selectedSubjectId={selectedSubjectId} setSelectedSubjectId={setSelectedSubjectId} 
              selectedReadingId={selectedReadingId} setSelectedReadingId={setSelectedReadingId} 
              setTotalInitial={setTotalInitial} 
            />
          )}
          {currentView === View.Subjects && <Subjects subjects={subjects} setSubjects={setSubjects} userId={session.user.id} />}
          {currentView === View.Tasks && <Tasks subjects={subjects} tasks={tasks} setTasks={setTasks} userId={session.user.id} />}
          {currentView === View.Calendar && <CalendarView subjects={subjects} tasks={tasks} userId={session.user.id} studySessions={studySessions} />}
          {currentView === View.Ranking && <Ranking userId={session.user.id} session={session} />}
          {currentView === View.Library && <Library readings={readings} setReadings={setReadings} subjects={subjects} userId={session.user.id} />}
          {currentView === View.Largo && <Largo presenceUsers={[]} currentUserId={session.user.id} />}
          {currentView === View.Mural && <Mural userId={session.user.id} userName={userName} />}
          {currentView === View.Calculator && <GradeCalculator subjects={subjects} />}
          {currentView === View.DeadlineCalculator && <DeadlineCalculator />}
          {currentView === View.OralArgument && <OralArgument />}
          {currentView === View.StudyRoom && <StudyRooms presenceUsers={[]} currentUserId={session.user.id} currentRoomId={null} setCurrentRoomId={() => {}} setRoomStartTime={() => {}} />}
          {currentView === View.Office && <VirtualOffice studySessions={studySessions} userName={userName} />}
          {currentView === View.Societies && <Societies userId={session.user.id} userName={userName} />}
          {currentView === View.LeiSeca && <LeiSeca userId={session.user.id} />}
          {currentView === View.Editais && <Editais userId={session.user.id} />}
          {currentView === View.Timeline && <TimelineBuilder />}
          {currentView === View.DeadArchive && <DeadArchive userId={session.user.id} />}
          {currentView === View.CitationGenerator && <CitationGenerator />}
          {currentView === View.JurisprudenceMural && <JurisprudenceMural userId={session.user.id} userName={userName} />}
          {currentView === View.SumulaChallenge && <SumulaChallenge userId={session.user.id} userName={userName} />}
          {currentView === View.Sebo && <Sebo userId={session.user.id} userName={userName} />}
          {currentView === View.OabCountdown && <OabCountdown userId={session.user.id} />}
          {currentView === View.Specialization && <SpecializationTree subjects={subjects} studySessions={studySessions} />}
          {currentView === View.TypingChallenge && <TypingChallenge userId={session.user.id} userName={userName} />}
          {currentView === View.Petitum && <Petitum userId={session.user.id} />}
          {currentView === View.Dosimetria && <Dosimetria userId={session.user.id} />}
          {currentView === View.Debate && <Debate userId={session.user.id} />}
          {currentView === View.Trunfo && <Trunfo userId={session.user.id} userName={userName} />}
          {currentView === View.Honorarios && <Honorarios userId={session.user.id} />}
          {currentView === View.Checklist && <Checklist userId={session.user.id} />}
          {currentView === View.InvestigationBoard && <InvestigationBoard userId={session.user.id} />}
          {currentView === View.LatinGame && <LatinGame userId={session.user.id} />}
          {currentView === View.SucessaoSimulator && <SucessaoSimulator />}
          {currentView === View.JurisTinder && <JurisTinder />}
          {currentView === View.InternRPG && <InternRPG />}
          {currentView === View.PrescriptionCalculator && <PrescriptionCalculator userId={session.user.id} />}
          {currentView === View.SanFranIdiomas && <SanFranIdiomas userId={session.user.id} />}
          {currentView === View.LegalCinema && <LegalCinema userId={session.user.id} />}
          {currentView === View.GeneralLanguages && <GeneralLanguages userId={session.user.id} onNavigate={setCurrentView} />}
          {currentView === View.ErrorLog && <ErrorLog userId={session.user.id} />}
          {currentView === View.CodeTracker && <CodeTracker userId={session.user.id} />}
          {currentView === View.IracMethod && <IracMethod userId={session.user.id} />}
          {currentView === View.SpacedRepetition && <SpacedRepetition userId={session.user.id} />}
          {currentView === View.AttendanceCalculator && <AttendanceCalculator userId={session.user.id} />}
          {currentView === View.SyllabusTracker && <SyllabusTracker userId={session.user.id} />}
          {currentView === View.DeadlinePlanner && <DeadlinePlanner userId={session.user.id} />}
          {currentView === View.Mentorship && <Mentorship userId={session.user.id} userName={userName} />}
          {currentView === View.MockJury && <MockJury userId={session.user.id} userName={userName} />}
          {currentView === View.PetitionWiki && <PetitionWiki userId={session.user.id} userName={userName} />}
          {currentView === View.StudyPact && <StudyPact userId={session.user.id} userName={userName} />}
          {currentView === View.LargoAuction && <LargoAuction userId={session.user.id} userName={userName} />}
          {currentView === View.SocialEvents && <SocialEvents userId={session.user.id} userName={userName} />}
          {currentView === View.TheVault && <TheVault userId={session.user.id} userName={userName} />}
          {currentView === View.CaronasRepublicas && <CaronasRepublicas userId={session.user.id} userName={userName} />}
          {currentView === View.BalcaoEstagios && <BalcaoEstagios userId={session.user.id} userName={userName} />}
          {currentView === View.TribunalOpiniao && <TribunalOpiniao userId={session.user.id} userName={userName} />}
          {currentView === View.BussolaOptativas && <BussolaOptativas userId={session.user.id} userName={userName} />}
          {currentView === View.AchadosPerdidos && <AchadosPerdidos userId={session.user.id} userName={userName} />}
          {currentView === View.PerolasTribuna && <PerolasTribuna userId={session.user.id} userName={userName} />}
          {currentView === View.GuiaSobrevivencia && <GuiaSobrevivencia userId={session.user.id} userName={userName} />}
          {currentView === View.ClubeLivro && <ClubeLivro userId={session.user.id} userName={userName} />}
          {currentView === View.GuerraTurmas && <GuerraTurmas userId={session.user.id} />}
          {currentView === View.SpeedReader && <SpeedReader />}
          {currentView === View.Mnemonics && <Mnemonics userId={session.user.id} />}
          {currentView === View.ReverseSchedule && <ReverseStudyPlanner userId={session.user.id} />}
          {currentView === View.DominioJuridico && <DominioJuridico subjects={subjects} studySessions={studySessions} />}
          {currentView === View.ClassificadosPatio && <ClassificadosPatio userId={session.user.id} userName={userName} studySessions={studySessions} />}
          {currentView === View.DigitalID && <DigitalID userId={session.user.id} userName={userName} studySessions={studySessions} tasks={tasks} />}
          {currentView === View.Profile && <Profile />}
        </div>
      </main>
      
      {/* Background Ambience and Tools */}
      <Atmosphere isExtremeFocus={isTimerActive && timerMode === 'work'} />
      <Scratchpad userId={session.user.id} isExtremeFocus={isTimerActive && timerMode === 'work'} />
    </div>
  );
};

export default App;
