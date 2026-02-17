
import { Brain, CheckCircle2, Clock, Zap, TrendingUp, Medal, Gavel, Award, Scale, Briefcase, GraduationCap, Quote, Sun, Book, Shield, Zap as ZapIcon, Trophy, BookOpen, Layout, MousePointerClick, Calculator, Target, Calendar } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { View, Subject, Flashcard, Task, StudySession, Reading } from '../types';
import { getBrasiliaDate } from '../App';
import BadgeGallery, { BadgeData } from './BadgeGallery';
import CompetenceRadar from './CompetenceRadar';
import { supabase } from '../services/supabaseClient';

interface DashboardProps {
  subjects: Subject[];
  flashcards: Flashcard[];
  tasks: Task[];
  studySessions: StudySession[];
  readings: Reading[];
  onNavigate: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ subjects, flashcards, tasks, studySessions, readings, onNavigate }) => {
  const [oabDate, setOabDate] = useState<string>('2024-12-01');

  useEffect(() => {
    const fetchConfig = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('user_configs').select('oab_exam_date').eq('user_id', user.id).single();
        if (data) setOabDate(data.oab_exam_date);
      }
    };
    fetchConfig();
  }, []);

  const daysToOab = useMemo(() => {
    const target = new Date(oabDate + 'T00:00:00');
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [oabDate]);

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
      
      {/* Widget OAB Countdown no Topo - High Tech Style */}
      <div 
        onClick={() => onNavigate(View.OabCountdown)}
        className={`group cursor-pointer rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 border transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xl relative overflow-hidden bg-gradient-to-br ${
          daysToOab < 15 ? 'from-sanfran-rubi to-red-900 border-red-500/30' : 
          daysToOab < 45 ? 'from-orange-500 to-orange-700 border-orange-500/30' : 
          'from-usp-blue to-cyan-900 border-cyan-500/30'
        }`}
      >
        <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay"></div>
        <div className="absolute -left-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-colors"></div>
        
        <div className="flex items-center gap-6 relative z-10 text-center md:text-left text-white">
           <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
              <Target size={32} className="text-white drop-shadow-md" />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2">Objetivo Primário</p>
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight font-serif leading-none">Aprovação OAB</h3>
              <p className="text-xs font-bold opacity-80 flex items-center gap-2 justify-center md:justify-start mt-2">
                 <Calendar size={12} /> Exame em {new Date(oabDate).toLocaleDateString('pt-BR')}
              </p>
           </div>
        </div>

        <div className="flex flex-col items-center md:items-end relative z-10 text-white">
           <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Countdown</span>
           <div className="flex items-baseline gap-2">
              <span className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tighter drop-shadow-xl">{daysToOab > 0 ? daysToOab : '0'}</span>
              <span className="text-xl font-bold uppercase tracking-widest opacity-80">Dias</span>
           </div>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-black font-serif text-slate-950 dark:text-white tracking-tight">Salve, Doutor(a).</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium text-lg">As Arcadas aguardam sua excelência hoje.</p>
        </div>
      </header>

      {/* --- Seção de Carreira (Patentes) --- */}
      <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-slate-200/60 dark:border-white/10 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
           <currentRank.icon size={250} />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center gap-8 relative z-10">
          <div className={`w-28 h-28 md:w-36 md:h-36 rounded-[2rem] ${currentRank.bg} dark:bg-white/5 border-4 ${currentRank.border} dark:border-white/10 flex items-center justify-center shadow-2xl relative`}>
             <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-[1.8rem]"></div>
             <currentRank.icon className={`w-14 h-14 md:w-16 md:h-16 ${currentRank.color} drop-shadow-sm`} />
          </div>
          
          <div className="flex-1 space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Status na Ordem</p>
              <h3 className={`text-3xl md:text-5xl font-black uppercase tracking-tighter ${currentRank.color} dark:text-white font-serif`}>
                {currentRank.name}
              </h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-400">Progresso de Carreira</span>
                <span className="text-slate-900 dark:text-white">{nextRank ? `Próximo: ${nextRank.name}` : 'Nível Máximo'}</span>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out relative ${currentRank.color.replace('text', 'bg')}`}
                  style={{ width: `${progressToNext}%` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                </div>
              </div>
              {nextRank && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                  { (nextRank.hours - totalHours).toFixed(1) }h restantes
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          icon={<Brain className="text-sanfran-rubi dark:text-red-400" />} 
          label="Para Revisar" 
          value={cardsToReview} 
          subtext="Flashcards"
          color="border-red-200 dark:border-red-900/30"
        />
        <StatCard 
          icon={<CheckCircle2 className="text-usp-blue dark:text-cyan-400" />} 
          label="Processos" 
          value={pendingTasks} 
          subtext="Pendentes na Pauta"
          color="border-cyan-200 dark:border-cyan-900/30"
        />
        <StatCard 
          icon={<Clock className="text-usp-gold dark:text-yellow-400" />} 
          label="Tempo Total" 
          value={displayTime.value} 
          unit={displayTime.unit}
          subtext={`${sessionsToday} sessões hoje`}
          color="border-yellow-200 dark:border-yellow-900/30"
        />
        <StatCard 
          icon={<Zap className={streak > 0 ? "text-orange-500 dark:text-orange-400" : "text-slate-400"} />} 
          label="Ofensiva" 
          value={streak} 
          subtext="Dias Consecutivos"
          color="border-orange-200 dark:border-orange-900/30"
          highlight={streak > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-1">
           <CompetenceRadar subjects={subjects} studySessions={studySessions} />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
          <BadgeGallery badges={badges} />

          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border border-slate-200 dark:border-white/10 shadow-lg relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-5">
               <Quote size={150} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-sanfran-rubi mb-6 flex items-center gap-2">
               Doutrina Diária
            </h3>
            <div className="relative z-10">
              <p className="font-serif text-2xl md:text-3xl text-slate-800 dark:text-slate-200 leading-snug tracking-tight italic">
                "{motivation}"
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border border-slate-200 dark:border-white/10 shadow-lg">
        <h3 className="text-xl md:text-2xl font-black mb-8 text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
           <BookOpen className="text-slate-400" /> Cadeiras Matriculadas
        </h3>
        <div className="space-y-4 md:space-y-6">
          {subjects.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhuma cadeira matriculada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.slice(0, 6).map(s => (
                <div key={s.id} className="group relative flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-black/20 border border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm hover:shadow-md cursor-default overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-2" style={{ backgroundColor: s.color }} />
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-xs md:text-sm uppercase tracking-wide truncate pl-2">{s.name}</span>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg">
                    {flashcards.filter(f => f.subjectId === s.id).length} Cards
                  </span>
                </div>
              ))}
            </div>
          )}
          {subjects.length > 6 && (
            <div className="flex justify-center">
               <span className="px-4 py-2 bg-slate-100 dark:bg-white/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  + {subjects.length - 6} outras cadeiras
               </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, unit?: string, subtext: string, color: string, highlight?: boolean }> = ({ icon, label, value, unit, subtext, color, highlight }) => (
  <div className={`bg-white/60 dark:bg-white/5 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border ${color} shadow-lg hover:shadow-xl transition-all group relative overflow-hidden`}>
    <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
    </div>
    <div className="space-y-1 relative z-10">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-1">
        <h4 className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{value}</h4>
        {unit && <span className="text-xs font-bold text-slate-400 uppercase">{unit}</span>}
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide opacity-80">{subtext}</p>
    </div>
    {highlight && <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-orange-400/20 to-transparent rounded-full blur-xl animate-pulse"></div>}
  </div>
);

export default Dashboard;
