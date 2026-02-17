
import React, { useState, useEffect } from 'react';
import { ScrollText, Calendar, Plus, Trash2, CheckCircle2, Circle, AlertCircle, BookOpen } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { CodeReadingPlan } from '../types';

interface CodeTrackerProps {
  userId: string;
}

const SUPPORTED_CODES = [
  { id: 'cf', name: 'Constituição Federal (CF/88)', articles: 250 },
  { id: 'cc', name: 'Código Civil (CC/02)', articles: 2046 },
  { id: 'cpc', name: 'Código de Processo Civil (CPC/15)', articles: 1072 },
  { id: 'cpp', name: 'Código de Processo Penal (CPP)', articles: 811 },
  { id: 'cp', name: 'Código Penal (CP)', articles: 361 },
  { id: 'clt', name: 'CLT', articles: 922 },
  { id: 'ctn', name: 'Código Tributário Nacional', articles: 218 },
  { id: 'cdc', name: 'Código de Defesa do Consumidor', articles: 119 },
];

const CodeTracker: React.FC<CodeTrackerProps> = ({ userId }) => {
  const [plans, setPlans] = useState<CodeReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [selectedCodeId, setSelectedCodeId] = useState('cc');
  const [targetDays, setTargetDays] = useState(30);

  useEffect(() => {
    fetchPlans();
  }, [userId]);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('code_reading_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setPlans(data);
    setLoading(false);
  };

  const createPlan = async () => {
    const code = SUPPORTED_CODES.find(c => c.id === selectedCodeId);
    if (!code) return;

    const articlesPerDay = Math.ceil(code.articles / targetDays);

    try {
      const { data, error } = await supabase.from('code_reading_plans').insert({
        user_id: userId,
        code_id: code.id,
        code_name: code.name,
        total_articles: code.articles,
        target_days: targetDays,
        articles_per_day: articlesPerDay,
        completed_days: []
      }).select().single();

      if (error) throw error;
      if (data) setPlans([data, ...plans]);
      setIsCreating(false);
    } catch (e) {
      alert("Erro ao criar plano de leitura.");
    }
  };

  const toggleDay = async (plan: CodeReadingPlan, dayIndex: number) => {
    const isCompleted = plan.completed_days.includes(dayIndex);
    let newCompletedDays;

    if (isCompleted) {
      newCompletedDays = plan.completed_days.filter(d => d !== dayIndex);
    } else {
      newCompletedDays = [...plan.completed_days, dayIndex].sort((a, b) => a - b);
    }

    // Optimistic Update
    setPlans(plans.map(p => p.id === plan.id ? { ...p, completed_days: newCompletedDays } : p));

    try {
      await supabase.from('code_reading_plans').update({ completed_days: newCompletedDays }).eq('id', plan.id);
    } catch (e) {
      console.error(e);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Excluir este plano de leitura?")) return;
    try {
      await supabase.from('code_reading_plans').delete().eq('id', id);
      setPlans(plans.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-5xl mx-auto h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-200 dark:border-emerald-800 mb-4">
              <ScrollText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Code Tracker</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Rastreador de Lei Seca</h2>
           <p className="text-lg font-medium text-slate-500 mt-2 italic">Organize a leitura obrigatória dos códigos em metas diárias.</p>
        </div>
        
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
        >
           <Plus size={16} /> Novo Plano
        </button>
      </header>

      {/* CREATE MODAL */}
      {isCreating && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
               <button onClick={() => setIsCreating(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><Trash2 size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-3">
                  <BookOpen className="text-emerald-500" /> Configurar Leitura
               </h3>

               <div className="space-y-6">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Escolha o Código</label>
                     <select 
                        value={selectedCodeId} 
                        onChange={e => setSelectedCodeId(e.target.value)}
                        className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                     >
                        {SUPPORTED_CODES.map(c => <option key={c.id} value={c.id}>{c.name} ({c.articles} arts.)</option>)}
                     </select>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Meta de Tempo (Dias)</label>
                     <div className="flex gap-4 items-center">
                        <input 
                           type="range" min="7" max="180" step="1"
                           value={targetDays} 
                           onChange={e => setTargetDays(Number(e.target.value))}
                           className="flex-1 accent-emerald-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xl font-black tabular-nums w-16 text-right">{targetDays}</span>
                     </div>
                     <p className="text-[10px] text-slate-400 font-bold mt-2 text-right">
                        ~ {Math.ceil((SUPPORTED_CODES.find(c => c.id === selectedCodeId)?.articles || 0) / targetDays)} artigos/dia
                     </p>
                  </div>

                  <button 
                     onClick={createPlan}
                     className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-lg transition-all"
                  >
                     Gerar Cronograma
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* PLANS LIST */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[400px]">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Carregando Planos...</div>
         ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
               <ScrollText size={48} className="text-slate-400 mb-4" />
               <p className="text-xl font-black text-slate-500 uppercase">Nenhum Plano Ativo</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Inicie um cronograma para vencer a lei seca.</p>
            </div>
         ) : (
            <div className="space-y-8">
               {plans.map(plan => {
                  const progress = Math.round((plan.completed_days.length / plan.target_days) * 100);
                  
                  return (
                     <div key={plan.id} className="bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl relative overflow-hidden">
                        {/* Header do Plano */}
                        <div className="flex justify-between items-start mb-6 relative z-10">
                           <div>
                              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{plan.code_name}</h3>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                 Meta: {plan.target_days} Dias • {plan.articles_per_day} Artigos/Dia
                              </p>
                           </div>
                           <button onClick={() => deletePlan(plan.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={20} />
                           </button>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="mb-8 relative z-10">
                           <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">
                              <span>Progresso</span>
                              <span>{progress}% Concluído</span>
                           </div>
                           <div className="h-4 bg-slate-100 dark:bg-black/20 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                           </div>
                        </div>

                        {/* Grid de Dias */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-60 overflow-y-auto custom-scrollbar relative z-10 p-1">
                           {Array.from({ length: plan.target_days }).map((_, idx) => {
                              const dayNum = idx + 1;
                              const startArt = (idx * plan.articles_per_day) + 1;
                              const endArt = Math.min((idx + 1) * plan.articles_per_day, plan.total_articles);
                              const isDone = plan.completed_days.includes(dayNum);

                              return (
                                 <button
                                    key={dayNum}
                                    onClick={() => toggleDay(plan, dayNum)}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${isDone ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-emerald-400'}`}
                                 >
                                    <span className="text-[10px] font-black uppercase mb-1">Dia {dayNum}</span>
                                    <span className="text-[9px] font-bold opacity-80">Arts. {startArt}-{endArt}</span>
                                    <div className="mt-2">
                                       {isDone ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                    </div>
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>
    </div>
  );
};

export default CodeTracker;
