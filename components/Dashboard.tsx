
import React, { useState, useEffect, useMemo } from 'react';
import { Brain, CheckCircle2, Clock, Zap, TrendingUp, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { Subject, Flashcard, Task, StudySession } from '../types';
import { getStudyMotivation, getSafeApiKey } from '../services/geminiService';
import { getBrasiliaDate } from '../App';

interface DashboardProps {
  subjects: Subject[];
  flashcards: Flashcard[];
  tasks: Task[];
  studySessions: StudySession[];
}

const Dashboard: React.FC<DashboardProps> = ({ subjects, flashcards, tasks, studySessions }) => {
  const [motivation, setMotivation] = useState("Carregando inspiração jurídica...");
  const [hasAiKey, setHasAiKey] = useState(false);

  useEffect(() => {
    const apiKey = getSafeApiKey();
    setHasAiKey(!!apiKey);

    const fetchMotivation = async () => {
      if (!apiKey) {
        setMotivation("A justiça é a constante e perpétua vontade de dar a cada um o seu. - Ulpiano");
        return;
      }
      
      try {
        const text = await getStudyMotivation(subjects.map(s => s.name));
        setMotivation(text || "A justiça é a constante e perpétua vontade de dar a cada um o seu.");
      } catch (e) {
        setMotivation("A justiça é a constante e perpétua vontade de dar a cada um o seu.");
      }
    };
    fetchMotivation();
  }, [subjects]);

  // Cálculos de Status
  const cardsToReview = flashcards.filter(f => f.nextReview <= Date.now()).length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const totalSeconds = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const todayStr = getBrasiliaDate();
  const sessionsToday = studySessions.filter(s => s.start_time.startsWith(todayStr)).length;

  // Lógica de Cálculo da Ofensiva (Streak)
  const streak = useMemo(() => {
    const activityDates = new Set<string>();
    
    // Adiciona datas de sessões de estudo
    studySessions.forEach(s => {
      if (s.start_time) activityDates.add(s.start_time.split('T')[0]);
    });
    
    // Adiciona datas de tarefas concluídas
    tasks.forEach(t => {
      if (t.completed && t.completedAt) activityDates.add(t.completedAt.split('T')[0]);
    });

    if (activityDates.size === 0) return 0;

    const sortedDates = Array.from(activityDates).sort((a, b) => b.localeCompare(a));
    const today = getBrasiliaDate();
    
    // Calcula ontem
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(yesterdayDate);

    let currentStreak = 0;
    let checkDateStr = activityDates.has(today) ? today : (activityDates.has(yesterday) ? yesterday : null);

    if (!checkDateStr) return 0;

    // Função para subtrair 1 dia de uma string YYYY-MM-DD
    const subtractOneDay = (dateStr: string) => {
      const d = new Date(dateStr + 'T12:00:00'); // T12:00:00 evita bugs de fuso ao subtrair
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    };

    let tempDate = checkDateStr;
    while (activityDates.has(tempDate)) {
      currentStreak++;
      tempDate = subtractOneDay(tempDate);
    }

    return currentStreak;
  }, [studySessions, tasks]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight">Salve, Doutor(a)! 🏛️</h2>
          <p className="text-slate-700 dark:text-slate-300 mt-2 font-bold text-lg">Pronto para dominar as leis hoje?</p>
        </div>
        
        <div className={`px-4 py-2 rounded-xl flex items-center gap-3 border text-[10px] font-black uppercase tracking-widest transition-all ${hasAiKey ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400' : 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/20 dark:border-amber-500/30 dark:text-amber-400'}`}>
          {hasAiKey ? <Sparkles className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {hasAiKey ? "IA: Conectada" : "IA: Configuração Pendente"}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          subtext="Processos pendentes"
          bgColor="bg-cyan-50 dark:bg-usp-blue"
        />
        <StatCard 
          icon={<Clock className="text-usp-gold dark:text-white" />} 
          label="Horas Totais" 
          value={`${totalHours}h`} 
          subtext={`${sessionsToday} sessões hoje`}
          bgColor="bg-yellow-50 dark:bg-usp-gold"
        />
        <StatCard 
          icon={<ShieldCheck className="text-slate-700 dark:text-white" />} 
          label="Ofensiva" 
          value={streak} 
          subtext={streak === 1 ? "Dia de labuta" : "Dias de labuta"}
          bgColor="bg-slate-100 dark:bg-slate-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-8 md:p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl border-t-[12px] border-t-sanfran-rubi">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl md:text-3xl font-black flex items-center gap-4 text-slate-950 dark:text-white uppercase tracking-tight">
              <TrendingUp className="w-8 h-8 text-sanfran-rubi dark:text-white" />
              Doutrina AI
            </h3>
          </div>
          <div className="bg-slate-50 dark:bg-black/40 rounded-[2rem] p-8 border border-slate-200 dark:border-sanfran-rubi/20 italic text-slate-900 dark:text-slate-100 text-xl leading-relaxed relative overflow-hidden shadow-inner min-h-[140px] flex items-center">
            <div className="absolute top-0 right-0 w-48 h-48 bg-sanfran-rubi opacity-[0.05] -mr-24 -mt-24 rounded-full" />
            <span className="relative z-10 font-bold leading-relaxed">"{motivation}"</span>
          </div>
        </div>

        <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-8 md:p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl border-t-[12px] border-t-usp-blue">
          <h3 className="text-2xl md:text-3xl font-black mb-10 text-slate-950 dark:text-white uppercase tracking-tight">Cadeiras</h3>
          <div className="space-y-6">
            {subjects.length === 0 ? (
              <p className="text-center text-xs text-slate-400 font-bold uppercase italic py-10">Nenhuma cadeira matriculada.</p>
            ) : (
              subjects.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full shadow-lg" style={{ backgroundColor: s.color }} />
                    <span className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-wide">{s.name}</span>
                  </div>
                  <span className="text-[11px] font-black text-white bg-slate-950 dark:bg-sanfran-rubi px-4 py-1.5 rounded-full shadow-md">
                    {flashcards.filter(f => f.subjectId === s.id).length}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, subtext: string, bgColor: string }> = ({ icon, label, value, subtext, bgColor }) => (
  <div className="bg-white dark:bg-sanfran-rubiDark/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all group overflow-hidden relative">
    <div className={`w-16 h-16 rounded-2xl ${bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 32 })}
    </div>
    <div className="space-y-1">
      <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{label}</p>
      <h4 className="text-4xl font-black text-slate-950 dark:text-white tabular-nums">{value}</h4>
      <p className="text-[11px] text-slate-700 dark:text-slate-300 font-black uppercase tracking-wide opacity-80">{subtext}</p>
    </div>
  </div>
);

export default Dashboard;
