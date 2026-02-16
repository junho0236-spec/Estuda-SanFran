
import React, { useState, useEffect, useMemo } from 'react';
import { Target, Calendar, Clock, BookOpen, ShieldCheck, Zap, AlertTriangle, Scale, Gavel, CheckCircle2, Save, Info, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface OabCountdownProps {
  userId: string;
}

interface Suggestion {
  category: string;
  topic: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
}

const OabCountdown: React.FC<OabCountdownProps> = ({ userId }) => {
  const [examDate, setExamDate] = useState<string>('2024-12-01');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_configs')
          .select('oab_exam_date')
          .eq('user_id', userId)
          .single();

        if (data) {
          setExamDate(data.oab_exam_date);
        } else if (error && error.code === 'PGRST116') {
          // No config found, create initial
          await supabase.from('user_configs').insert({ user_id: userId, oab_exam_date: examDate });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [userId]);

  const saveDate = async (newDate: string) => {
    setExamDate(newDate);
    setIsSaving(true);
    try {
      await supabase.from('user_configs').upsert({
        user_id: userId,
        oab_exam_date: newDate,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      alert("Erro ao salvar data no servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const daysRemaining = useMemo(() => {
    const target = new Date(examDate + 'T00:00:00');
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [examDate]);

  const { status, recommendations, colorClass } = useMemo(() => {
    const days = daysRemaining;
    if (days > 90) {
      return {
        status: 'Fase de Base',
        colorClass: 'bg-emerald-500',
        recommendations: [
          { category: 'Doutrina de Peso', topic: 'Direito Civil (Parte Geral e Obrigações)', priority: 'alta' },
          { category: 'Base Constitucional', topic: 'Direitos e Garantias Fundamentais', priority: 'alta' },
          { category: 'Teoria Penal', topic: 'Teoria do Crime e Penas', priority: 'media' },
        ]
      };
    } else if (days > 45) {
      return {
        status: 'Consolidação',
        colorClass: 'bg-usp-blue',
        recommendations: [
          { category: 'Matérias Estratégicas', topic: 'Direito Administrativo (Atos e Poderes)', priority: 'alta' },
          { category: 'Laboral', topic: 'Direito do Trabalho (Contrato e Verbas)', priority: 'media' },
          { category: 'Tributário', topic: 'Competência e Impostos em Espécie', priority: 'alta' },
        ]
      };
    } else if (days > 15) {
      return {
        status: 'Sprint de Processos',
        colorClass: 'bg-orange-500',
        recommendations: [
          { category: 'Ritos Forenses', topic: 'Processo Civil (Recursos e Execução)', priority: 'urgente' },
          { category: 'Criminalista', topic: 'Processo Penal (Inquérito e Prisões)', priority: 'urgente' },
          { category: 'Ética Profissional', topic: 'Prerrogativas e Deveres do Advogado', priority: 'urgente' },
        ]
      };
    } else {
      return {
        status: 'Alerta Vermelho',
        colorClass: 'bg-sanfran-rubi',
        recommendations: [
          { category: 'Pura Ética', topic: 'Estatuto da OAB e Código de Ética', priority: 'urgente' },
          { category: 'Revisão Expressa', topic: 'Súmulas Vinculantes e Enunciados STF/STJ', priority: 'urgente' },
          { category: 'Prática de Simulados', topic: 'Resolução de Provas Anteriores (FGV)', priority: 'urgente' },
        ]
      };
    }
  }, [daysRemaining]);

  if (isLoading) return <div className="h-full flex items-center justify-center"><Zap className="animate-spin text-sanfran-rubi" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 max-w-5xl mx-auto h-full flex flex-col">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/20 px-4 py-2 rounded-full border border-red-200 dark:border-red-800 mb-4">
              <Target className="w-4 h-4 text-sanfran-rubi" />
              <span className="text-[10px] font-black uppercase tracking-widest text-sanfran-rubi">Missão OAB-FGV</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Plano de Ataque</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Sua jornada para a carteira vermelha começa no Largo.</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Data do Exame</label>
           <div className="relative">
              <input 
                type="date" 
                value={examDate}
                onChange={(e) => saveDate(e.target.value)}
                className="p-4 pr-12 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-sanfran-rubi/30 rounded-2xl font-black text-sm outline-none focus:border-sanfran-rubi transition-all shadow-lg"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                 {isSaving ? <Zap className="w-5 h-5 animate-spin text-sanfran-rubi" /> : <Calendar size={20} />}
              </div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         {/* LADO ESQUERDO: CONTAGEM E STATUS */}
         <div className="lg:col-span-5 space-y-6">
            <div className={`p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-center relative overflow-hidden text-white transition-colors duration-1000 ${colorClass}`}>
               <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
               <p className="text-xs font-black uppercase tracking-[0.4em] opacity-80 mb-6">Contagem de Urgência</p>
               <div className="text-[8rem] md:text-[10rem] font-black leading-none tabular-nums tracking-tighter drop-shadow-2xl">
                  {daysRemaining > 0 ? daysRemaining : '0'}
               </div>
               <span className="text-2xl font-black uppercase tracking-widest -mt-4 mb-10">Dias Restantes</span>
               
               <div className="bg-white/20 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/30 flex items-center gap-3">
                  <ShieldCheck size={20} />
                  <span className="text-sm font-black uppercase tracking-widest">{status}</span>
               </div>
            </div>

            <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
               <h4 className="text-sm font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
                  <Info size={16} /> Fatos do Exame
               </h4>
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <span className="text-xs font-bold text-slate-500 uppercase">Média para Aprovação</span>
                     <span className="font-black text-sanfran-rubi">40/80 (1ª Fase)</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-xs font-bold text-slate-500 uppercase">Matéria Crucial</span>
                     <span className="font-black text-usp-blue">Ética Profissional (8 pts)</span>
                  </div>
                  <div className="h-px bg-slate-100 dark:bg-white/5 my-2" />
                  <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">
                     "A 1ª Fase é um teste de resistência e estratégia. Domine Ética, Constitucional e Administrativo para garantir 50% da prova."
                  </p>
               </div>
            </div>
         </div>

         {/* LADO DIREITO: RECOMENDAÇÕES */}
         <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-[#0d0303] rounded-[3rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl overflow-hidden flex flex-col h-full">
               <div className="p-8 md:p-10 border-b border-slate-100 dark:border-white/5">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-4">
                     <Scale className="text-sanfran-rubi" /> Foco Sugerido pela Academia
                  </h3>
                  <p className="text-slate-400 font-bold italic text-sm mt-1">Algoritmo baseado no tempo regimental restante.</p>
               </div>

               <div className="flex-1 p-8 md:p-10 space-y-6">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="group p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:border-sanfran-rubi transition-all">
                       <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{rec.category}</span>
                          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${
                            rec.priority === 'urgente' ? 'bg-red-100 text-red-700' : 
                            rec.priority === 'alta' ? 'bg-orange-100 text-orange-700' : 
                            'bg-blue-100 text-blue-700'
                          }`}>
                             {rec.priority === 'urgente' && <AlertTriangle size={10} />}
                             Prioridade {rec.priority}
                          </div>
                       </div>
                       <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">{rec.topic}</h4>
                       <button className="flex items-center gap-2 text-[10px] font-black uppercase text-sanfran-rubi hover:underline transition-all">
                          Ver Flashcards Relacionados <ArrowRight size={12} />
                       </button>
                    </div>
                  ))}
               </div>

               <div className="p-8 bg-slate-50 dark:bg-black/20 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                     <div className="p-3 bg-usp-gold/10 rounded-2xl">
                        <Gavel className="text-usp-gold" size={24} />
                     </div>
                     <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase">Simulados Semanais</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Indispensável em todas as fases</p>
                     </div>
                  </div>
                  <button className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                     Acessar Simulados
                  </button>
               </div>
            </div>
         </div>

      </div>

      <footer className="text-center p-6 shrink-0 opacity-40">
         <div className="flex items-center justify-center gap-2 text-slate-400">
            <CheckCircle2 size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">OAB Challenge • Foco Total na Aprovação</span>
         </div>
      </footer>
    </div>
  );
};

export default OabCountdown;
