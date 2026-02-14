
import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle2, Clock, Zap, TrendingUp, ShieldCheck } from 'lucide-react';
import { Subject, Flashcard, Task } from '../types';
import { getStudyMotivation } from '../services/geminiService';

interface DashboardProps {
  subjects: Subject[];
  flashcards: Flashcard[];
  tasks: Task[];
}

const Dashboard: React.FC<DashboardProps> = ({ subjects, flashcards, tasks }) => {
  const [motivation, setMotivation] = useState("Carregando inspiração jurídica...");

  useEffect(() => {
    const fetchMotivation = async () => {
      try {
        const text = await getStudyMotivation(subjects.map(s => s.name));
        setMotivation(text || "A justiça é a constante e perpétua vontade de dar a cada um o seu.");
      } catch (e) {
        setMotivation("A justiça é a constante e perpétua vontade de dar a cada um o seu.");
      }
    };
    fetchMotivation();
  }, [subjects]);

  const cardsToReview = flashcards.filter(f => f.nextReview <= Date.now()).length;
  const pendingTasks = tasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight">Salve, Doutor(a)! 🏛️</h2>
        <p className="text-slate-700 dark:text-slate-300 mt-2 font-bold text-lg">Pronto para dominar as leis hoje?</p>
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
          label="Foco" 
          value={4} 
          subtext="Pomodoros hoje"
          bgColor="bg-yellow-50 dark:bg-usp-gold"
        />
        <StatCard 
          icon={<ShieldCheck className="text-slate-700 dark:text-white" />} 
          label="Ofensiva" 
          value="7" 
          subtext="Dias de labuta"
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
          <div className="bg-slate-50 dark:bg-black/40 rounded-[2rem] p-8 border border-slate-200 dark:border-sanfran-rubi/20 italic text-slate-900 dark:text-slate-100 text-xl leading-relaxed relative overflow-hidden shadow-inner">
            <div className="absolute top-0 right-0 w-48 h-48 bg-sanfran-rubi opacity-[0.05] -mr-24 -mt-24 rounded-full" />
            <span className="relative z-10 font-bold leading-relaxed">"{motivation}"</span>
          </div>
        </div>

        <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-8 md:p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl border-t-[12px] border-t-usp-blue">
          <h3 className="text-2xl md:text-3xl font-black mb-10 text-slate-950 dark:text-white uppercase tracking-tight">Cadeiras</h3>
          <div className="space-y-6">
            {subjects.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded-full shadow-lg" style={{ backgroundColor: s.color }} />
                  <span className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-wide">{s.name}</span>
                </div>
                <span className="text-[11px] font-black text-white bg-slate-950 dark:bg-sanfran-rubi px-4 py-1.5 rounded-full shadow-md">
                  {flashcards.filter(f => f.subjectId === s.id).length}
                </span>
              </div>
            ))}
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
