
import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Circle, Gift, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchDailyQuests, claimRewards, getTodayDateStr } from '../services/questService';
import { DailyQuestData } from '../types';
import confetti from 'canvas-confetti';

interface EditaisProps {
  userId: string;
}

const Editais: React.FC<EditaisProps> = ({ userId }) => {
  const [questData, setQuestData] = useState<DailyQuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    loadQuests();
    
    // Inscrever-se para atualizações em tempo real nas quests
    const channel = supabase
      .channel('quests_realtime')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'daily_quests',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (payload.new && payload.new.date === getTodayDateStr()) {
           setQuestData(payload.new as DailyQuestData);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadQuests = async () => {
    setLoading(true);
    const data = await fetchDailyQuests(userId);
    setQuestData(data);
    setLoading(false);
  };

  const handleClaim = async () => {
    if (!questData) return;
    setClaiming(true);
    
    const success = await claimRewards(userId, questData);
    
    if (success) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      // Atualiza localmente para refletir o claim
      setQuestData(prev => prev ? { ...prev, claimed: true } : null);
    } else {
      alert("Erro ao resgatar recompensa.");
    }
    
    setClaiming(false);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sanfran-rubi"></div>
      </div>
    );
  }

  if (!questData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-black text-slate-500 uppercase">Sem Editais Disponíveis</h3>
        <p className="text-xs font-bold text-slate-400 mt-2">O oficial de justiça não encontrou mandados para hoje.</p>
        <button onClick={loadQuests} className="mt-4 text-sanfran-rubi underline text-xs font-black uppercase">Tentar Novamente</button>
      </div>
    );
  }

  const allCompleted = questData.quests.every(q => q.completed);
  const todayDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/20 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
              <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Mandados do Dia</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Quadro de Editais</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Cumpra as missões diárias para ganhar honorários extras.</p>
        </div>
        
        <div className="flex items-center gap-2 text-slate-400 font-black uppercase text-[10px] tracking-widest bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl">
           <Calendar className="w-4 h-4" /> {todayDate}
        </div>
      </header>

      {/* QUADRO DE CORTIÇA (ESTILO) */}
      <div className="relative bg-[#e8dcc5] dark:bg-[#2c241b] p-8 md:p-12 rounded-[2rem] shadow-2xl border-[12px] border-[#8b5a2b] dark:border-[#3e2723] overflow-hidden">
         {/* Textura de cortiça (simulada com CSS noise/dots seria ideal, mas usaremos cor sólida com overlay) */}
         <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')]"></div>
         
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* CARD 1 */}
            {questData.quests.map((quest, index) => {
               const progress = Math.min(100, Math.round((quest.current / quest.target) * 100));
               const rotation = index === 0 ? '-rotate-2' : index === 1 ? 'rotate-1' : '-rotate-1';
               
               return (
                 <div key={quest.id} className={`bg-white dark:bg-[#1a1a1a] p-6 shadow-lg transform ${rotation} hover:scale-105 transition-all duration-300 relative group min-h-[220px] flex flex-col justify-between`}>
                    {/* PIN */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 shadow-md border border-red-800 z-20"></div>
                    
                    <div>
                       <h4 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-200 border-b-2 border-slate-100 dark:border-white/10 pb-2 mb-3">
                          Mandado nº 00{index+1}/24
                       </h4>
                       <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">
                          {quest.description}
                       </p>
                    </div>

                    <div>
                       <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">
                          <span>Progresso</span>
                          <span>{quest.current}/{quest.target}</span>
                       </div>
                       <div className="h-3 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                          <div className={`h-full transition-all duration-1000 ${quest.completed ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                       </div>
                    </div>

                    {quest.completed && (
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="border-4 border-emerald-600 text-emerald-600 font-black text-2xl uppercase tracking-widest p-2 -rotate-12 opacity-80 mix-blend-multiply dark:mix-blend-normal bg-emerald-100/50 dark:bg-emerald-900/50 rounded-lg">
                             CUMPRIDO
                          </div>
                       </div>
                    )}
                 </div>
               );
            })}
         </div>
      </div>

      {/* ÁREA DE RECOMPENSA */}
      <div className="flex flex-col items-center justify-center py-10 animate-in slide-in-from-bottom-8">
         {allCompleted ? (
            questData.claimed ? (
               <div className="bg-emerald-50 dark:bg-emerald-900/20 px-8 py-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-black uppercase text-emerald-700 dark:text-emerald-300 tracking-widest text-xs">Honorários do dia recebidos</span>
               </div>
            ) : (
               <button 
                  onClick={handleClaim}
                  disabled={claiming}
                  className="group relative bg-sanfran-rubi hover:bg-sanfran-rubiDark text-white px-10 py-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0"
               >
                  <div className="flex items-center gap-3">
                     <Gift className="w-6 h-6 animate-bounce" />
                     <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Missão Cumprida</p>
                        <p className="text-sm font-black uppercase tracking-tight">Resgatar 1 Caixa Bônus</p>
                     </div>
                  </div>
                  <div className="absolute -inset-1 rounded-2xl blur-md bg-sanfran-rubi opacity-40 group-hover:opacity-60 transition-opacity -z-10"></div>
               </button>
            )
         ) : (
            <div className="flex items-center gap-3 opacity-50 grayscale">
               <Gift className="w-6 h-6" />
               <span className="font-black uppercase text-slate-400 tracking-widest text-xs">Complete todos os mandados para receber honorários</span>
            </div>
         )}
      </div>
    </div>
  );
};

export default Editais;
