
import { Brain, CheckCircle2, Clock, Zap, TrendingUp, Medal, Gavel, Award, Scale, Briefcase, GraduationCap, Quote, Sun, Book, Shield, Zap as ZapIcon, Trophy, BookOpen, Layout, MousePointerClick, Calculator } from 'lucide-react';
import React, { useMemo } from 'react';
import { View, Subject, Flashcard, Task, StudySession, Reading } from '../types';
import { getBrasiliaDate } from '../App';
import BadgeGallery, { BadgeData } from './BadgeGallery';

interface DashboardProps {
  subjects: Subject[];
  flashcards: Flashcard[];
  tasks: Task[];
  studySessions: StudySession[];
  readings: Reading[];
  onNavigate: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ subjects, flashcards, tasks, studySessions, readings, onNavigate }) => {
  const legalQuotes = [
    "A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano",
    "A lei é a razão livre da paixão. - Aristóteles",
    "Não basta que a justiça seja feita, é preciso que se veja que a justiça está sendo feita. - Lord Hewart",
    "Direito é a técnica da coexistência humana. - Norberto Bobbio",
    "Onde está a sociedade, aí está o Direito. - Adágio Latino",
    "A essência do Direito é a liberdade. - Hegel",
    "Scientia Vinces. - Lema USP"
  ];

  const motivation = useMemo(() => {
    return legalQuotes[Math.floor(Math.random() * legalQuotes.length)];
  }, []);

  const cardsToReview = flashcards.filter(f => f.nextReview <= Date.now()).length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const totalSeconds = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const totalHours = totalSeconds / 3600;
  
  const displayTime = useMemo(() => {
    if (totalSeconds < 3600) {
      const mins = Math.floor(totalSeconds / 60);
      return { value: mins, unit: 'min', sub: 'Tempo de estudo' };
    }
    const hours = (totalSeconds / 3600).toFixed(1);
    return { value: hours, unit: 'h', sub: 'Horas acumuladas' };
  }, [totalSeconds]);

  // --- Sistema de Patentes ---
  const ranks = [
    { name: 'Bacharel', hours: 0, icon: GraduationCap, color: 'text-slate-400', bg: 'bg-slate-100', border: 'border-slate-200' },
    { name: 'Advogado Júnior', hours: 20, icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { name: 'Advogado Pleno', hours: 100, icon: Scale, color: 'text-usp-blue', bg: 'bg-cyan-50', border: 'border-cyan-200' },
    { name: 'Advogado Sênior', hours: 300, icon: Award, color: 'text-usp-gold', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { name: 'Sócio-Diretor', hours: 700, icon: Medal, color: 'text-sanfran-rubi', bg: 'bg-red-50', border: 'border-red-200' },
    { name: 'Magistrado', hours: 1500, icon: Gavel, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  ];

  const currentRankIndex = [...ranks].reverse().findIndex(r => totalHours >= r.hours);
  const currentRank = ranks[ranks.length - 1 - currentRankIndex];
  const nextRank = ranks[ranks.length - currentRankIndex];

  const progressToNext = nextRank 
    ? ((totalHours - currentRank.hours) / (nextRank.hours - currentRank.hours)) * 100 
    : 100;

  const todayStr = getBrasiliaDate();
  const sessionsToday = studySessions.filter(s => s.start_time.startsWith(todayStr)).length;

  const streak = useMemo(() => {
    const activityDates = new Set<string>();
    studySessions.forEach(s => { if (s.start_time) activityDates.add(s.start_time.split('T')[0]); });
    tasks.forEach(t => { if (t.completed && t.completedAt) activityDates.add(t.completedAt.split('T')[0]); });

    if (activityDates.size === 0) return 0;

    const today = getBrasiliaDate();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(yesterdayDate);

    let currentStreak = 0;
    let checkDateStr = activityDates.has(today) ? today : (activityDates.has(yesterday) ? yesterday : null);

    if (!checkDateStr) return 0;

    const subtractOneDay = (dateStr: string) => {
      const d = new Date(dateStr + 'T12:00:00'); 
      d.setDate(d.getDate() - 1);
      return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(d);
    };

    let tempDate = checkDateStr;
    while (activityDates.has(tempDate)) {
      currentStreak++;
      tempDate = subtractOneDay(tempDate);
    }
    return currentStreak;
  }, [studySessions, tasks]);

  // --- Lógica de Badges ---
  const badges: BadgeData[] = useMemo(() => {
    return [
      {
        id: 'early_bird',
        name: 'Madrugador XI de Agosto',
        description: 'Sessão iniciada antes das 7h',
        icon: Sun,
        isUnlocked: studySessions.some(s => {
          const time = new Date(s.start_time).getHours();
          return time < 7;
        }),
        color: 'text-amber-500'
      },
      {
        id: 'iron_bacharel',
        name: 'Bacharel de Ferro',
        description: 'Estudar 4h+ em um único dia',
        icon: ZapIcon,
        isUnlocked: (() => {
          const days: Record<string, number> = {};
          studySessions.forEach(s => {
            const day = s.start_time.split('T')[0];
            days[day] = (days[day] || 0) + s.duration;
          });
          return Object.values(days).some(d => d >= 4 * 3600);
        })(),
        color: 'text-sanfran-rubi'
      },
      {
        id: 'constitutionalist',
        name: 'Constitucionalista',
        description: 'Revisar 100+ cards de Const.',
        icon: Shield,
        isUnlocked: (() => {
          const constSubject = subjects.find(s => s.name.toLowerCase().includes('const'));
          if (!constSubject) return false;
          // Contamos flashcards desta disciplina. Num sistema ideal, contaríamos revisões históricas.
          return flashcards.filter(f => f.subjectId === constSubject.id).length >= 50; 
        })(),
        color: 'text-usp-blue'
      },
      {
        id: 'doctrinator',
        name: 'Doutrinador',
        description: 'Possuir 5+ obras na Biblioteca',
        icon: Book,
        isUnlocked: readings.length >= 5,
        color: 'text-emerald-500'
      },
      {
        id: 'impartial',
        name: 'Imparcial',
        description: 'Concluir 50 tarefas da Pauta',
        icon: Gavel,
        isUnlocked: tasks.filter(t => t.completed).length >= 50,
        color: 'text-purple-500'
      },
      {
        id: 'partner',
        name: 'Sócio do XI',
        description: 'Alcançar patente Sócio-Diretor',
        icon: Trophy,
        isUnlocked: totalHours >= 700,
        color: 'text-usp-gold'
      }
    ];
  }, [studySessions, flashcards, tasks, readings, subjects, totalHours]);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight">Salve, Doutor(a)! 🏛️</h2>
          <p className="text-slate-700 dark:text-slate-300 mt-2 font-bold text-base md:text-lg">Pronto para dominar as leis hoje?</p>
        </div>
      </header>

      {/* --- Seção de Carreira (Patentes) --- */}
      <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-6 md:p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
           <currentRank.icon size={200} />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center gap-8 relative z-10">
          <div className={`w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] ${currentRank.bg} dark:bg-white/5 border-4 ${currentRank.border} dark:border-white/10 flex items-center justify-center shadow-xl`}>
             <currentRank.icon className={`w-12 h-12 md:w-16 md:h-16 ${currentRank.color}`} />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Status na Ordem</p>
              <h3 className={`text-3xl md:text-4xl font-black uppercase tracking-tighter ${currentRank.color} dark:text-white`}>
                {currentRank.name}
              </h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-400">Progresso de Carreira</span>
                <span className="text-slate-900 dark:text-white">{nextRank ? `Próximo: ${nextRank.name}` : 'Nível Máximo'}</span>
              </div>
              <div className="h-4 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden p-1 shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${currentRank.color.replace('text', 'bg')}`}
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              {nextRank && (
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Faltam {(nextRank.hours - totalHours).toFixed(1)} horas para a próxima promoção.
                </p>
              )}
            </div>
          </div>
          
          <div className="hidden lg:block border-l border-slate-100 dark:border-white/10 pl-8 space-y-2">
             <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                <Medal className="w-5 h-5 text-usp-gold" />
                <span className="text-sm font-black uppercase">Honrarias USP</span>
             </div>
             <p className="text-[10px] text-slate-400 font-bold max-w-[150px] leading-relaxed">
               Sua dedicação acadêmica reflete o espírito do XI de Agosto. Continue a labuta.
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          icon={<Brain className="text-sanfran-rubi dark:text-white" />} 
          label="Para Revisar" 
          value={cardsToReview} 
          subtext="Flashcards pendentes"
          bgColor="bg-red-50 dark:bg-sanfran-rubi"
        />
        <StatCard 
          icon={<CheckCircle2 className="text-usp-blue dark:text-white" />} 
          label="Tarefas" 
          value={pendingTasks} 
          subtext="Processos em pauta"
          bgColor="bg-cyan-50 dark:bg-usp-blue"
        />
        <StatCard 
          icon={<Clock className="text-usp-gold dark:text-white" />} 
          label="Tempo Total" 
          value={displayTime.value} 
          unit={displayTime.unit}
          subtext={`${sessionsToday} sessões hoje`}
          bgColor="bg-yellow-50 dark:bg-usp-gold"
        />
        <StatCard 
          icon={<Zap className={streak > 0 ? "text-orange-500 dark:text-white" : "text-slate-400"} />} 
          label="Ofensiva" 
          value={streak} 
          subtext={streak === 1 ? "Dia de labuta" : "Dias seguidos"}
          bgColor={streak > 0 ? "bg-orange-50 dark:bg-orange-600" : "bg-slate-100 dark:bg-slate-600"}
          highlight={streak > 0}
        />
      </div>

      {/* --- Galeria de Conquistas (Badges) --- */}
      <BadgeGallery badges={badges} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2 bg-white dark:bg-sanfran-rubiDark/30 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl border-t-[10px] md:border-t-[12px] border-t-sanfran-rubi">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h3 className="text-xl md:text-3xl font-black flex items-center gap-4 text-slate-950 dark:text-white uppercase tracking-tight">
              <Quote className="w-6 h-6 md:w-8 md:h-8 text-sanfran-rubi dark:text-white" />
              Doutrina Acadêmica
            </h3>
          </div>
          <div className="bg-slate-50 dark:bg-black/40 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 border border-slate-200 dark:border-sanfran-rubi/20 italic text-slate-900 dark:text-slate-100 text-lg md:text-xl leading-relaxed relative overflow-hidden shadow-inner flex items-center">
            <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-sanfran-rubi opacity-[0.05] -mr-16 md:-mr-24 -mt-16 md:-mt-24 rounded-full" />
            <span className="relative z-10 font-bold leading-relaxed text-center md:text-left w-full">"{motivation}"</span>
          </div>
        </div>

        <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl border-t-[10px] md:border-t-[12px] border-t-usp-blue">
          <h3 className="text-xl md:text-3xl font-black mb-6 md:mb-10 text-slate-950 dark:text-white uppercase tracking-tight">Cadeiras</h3>
          <div className="space-y-4 md:space-y-6">
            {subjects.length === 0 ? (
              <p className="text-center text-xs text-slate-400 font-bold uppercase italic py-8 md:py-10">Nenhuma cadeira matriculada.</p>
            ) : (
              subjects.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-4 h-4 md:w-5 md:h-5 rounded-full shadow-lg" style={{ backgroundColor: s.color }} />
                    <span className="font-black text-slate-900 dark:text-white uppercase text-xs md:text-sm tracking-wide truncate max-w-[120px] md:max-w-none">{s.name}</span>
                  </div>
                  <span className="text-[10px] md:text-[11px] font-black text-white bg-slate-950 dark:bg-sanfran-rubi px-3 py-1.5 rounded-full shadow-md">
                    {flashcards.filter(f => f.subjectId === s.id).length}
                  </span>
                </div>
              ))
            )}
            {subjects.length > 5 && (
              <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">+ {subjects.length - 5} outras cadeiras</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, unit?: string, subtext: string, bgColor: string, highlight?: boolean }> = ({ icon, label, value, unit, subtext, bgColor, highlight }) => (
  <div className={`bg-white dark:bg-sanfran-rubiDark/40 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 shadow-xl hover:shadow-2xl md:hover:-translate-y-2 transition-all group overflow-hidden relative ${highlight ? 'border-orange-200 dark:border-orange-500/30 shadow-orange-900/10' : 'border-slate-200 dark:border-sanfran-rubi/30'}`}>
    {highlight && <div className="absolute top-0 right-0 w-20 md:w-24 h-20 md:h-24 bg-orange-500/5 rounded-full -mr-10 md:-mr-12 -mt-10 md:-mt-12 animate-pulse" />}
    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl ${bgColor} flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
    </div>
    <div className="space-y-0 md:space-y-1">
      <p className="text-[10px] md:text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-1">
        <h4 className="text-3xl md:text-4xl font-black text-slate-950 dark:text-white tabular-nums">{value}</h4>
        {unit && <span className="text-xs font-black text-slate-400 uppercase">{unit}</span>}
      </div>
      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-black uppercase tracking-wide opacity-80 truncate">{subtext}</p>
    </div>
  </div>
);

export default Dashboard;
