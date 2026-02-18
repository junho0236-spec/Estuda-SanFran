
import React, { useState, useEffect } from 'react';
import { 
  Handshake, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Coins, 
  Plus, 
  Search,
  PenTool,
  X
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { StudyPact as StudyPactType } from '../types';
import confetti from 'canvas-confetti';

interface StudyPactProps {
  userId: string;
  userName: string;
}

const StudyPact: React.FC<StudyPactProps> = ({ userId, userName }) => {
  const [activeTab, setActiveTab] = useState<'lobby' | 'active' | 'create'>('lobby');
  const [pacts, setPacts] = useState<StudyPactType[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(0);

  // Create Form
  const [newTitle, setNewTitle] = useState('');
  const [targetHours, setTargetHours] = useState(2);
  const [durationDays, setDurationDays] = useState(5);
  const [stakeAmount, setStakeAmount] = useState(50);

  useEffect(() => {
    fetchPacts();
    fetchWallet();

    const channel = supabase
      .channel('pact_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_pacts' }, () => fetchPacts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchPacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_pacts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPacts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    try {
      // Simulate fetching balance or integrate with real table if exists
      // For now just assume a mock balance or fetch if available
      const { data } = await supabase.from('user_wallet').select('spent_coins').eq('user_id', userId).single();
      // Mock logic: 1000 - spent
      setUserCoins(1000 - (data?.spent_coins || 0));
    } catch (e) {
      setUserCoins(1000);
    }
  };

  const createPact = async () => {
    if (!newTitle.trim()) return;
    if (userCoins < stakeAmount) {
      alert("Saldo insuficiente para cobrir a aposta (caução).");
      return;
    }

    try {
      const { error } = await supabase.from('study_pacts').insert({
        title: newTitle,
        creator_id: userId,
        creator_name: userName,
        target_hours_per_day: targetHours,
        duration_days: durationDays,
        stake_amount: stakeAmount,
        status: 'open'
      });

      if (error) throw error;
      setActiveTab('lobby');
      alert("Minuta de contrato publicada no mural!");
    } catch (e) {
      alert("Erro ao criar pacto.");
    }
  };

  const joinPact = async (pact: StudyPactType) => {
    if (userCoins < pact.stake_amount) {
      alert("Saldo insuficiente para cobrir a aposta.");
      return;
    }
    if (!confirm(`Aceitar o pacto "${pact.title}"? O valor de ${pact.stake_amount} SF$ será bloqueado como garantia.`)) return;

    try {
      const { error } = await supabase.from('study_pacts').update({
        partner_id: userId,
        partner_name: userName,
        status: 'active',
        start_date: new Date().toISOString()
      }).eq('id', pact.id);

      if (error) throw error;
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setActiveTab('active');
    } catch (e) {
      alert("Erro ao assinar contrato.");
    }
  };

  // Mock progress calculation (In real app, query study_sessions)
  const getTodayProgress = (pact: StudyPactType, isCreator: boolean) => {
    // Mock: Random progress for demo purposes or check if active
    if (pact.status !== 'active') return 0;
    // Here you would query study_sessions for today
    return isCreator ? 1.5 : 0.8; // Example: Creator 1.5h, Partner 0.8h
  };

  const myActivePacts = pacts.filter(p => (p.creator_id === userId || p.partner_id === userId) && p.status === 'active');
  const openPacts = pacts.filter(p => p.status === 'open' && p.creator_id !== userId);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/20 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
              <Handshake className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Accountability</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Pacto de Estudo</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Firmem um contrato. Cumpram a meta. Ganhem juntos (ou percam tudo).</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
           <button onClick={() => setActiveTab('lobby')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'lobby' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Mural de Ofertas</button>
           <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Meus Contratos</button>
           <button onClick={() => setActiveTab('create')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Redigir Minuta</button>
        </div>
      </header>

      {/* VIEW: LOBBY */}
      {activeTab === 'lobby' && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openPacts.length === 0 && (
               <div className="col-span-full py-20 text-center opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
                  <Search size={48} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-xl font-black uppercase text-slate-500">Nenhuma oferta pública</p>
                  <p className="text-xs font-bold text-slate-400 mt-2">Seja o primeiro a propor um pacto.</p>
               </div>
            )}
            {openPacts.map(pact => (
               <div key={pact.id} className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Handshake size={60} />
                  </div>
                  
                  <div>
                     <div className="flex justify-between items-start mb-4">
                        <span className="bg-slate-100 dark:bg-white/10 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                           Proposta de: {pact.creator_name.split(' ')[0]}
                        </span>
                        <div className="flex items-center gap-1 text-yellow-500 font-black text-xs">
                           <Coins size={12} /> {pact.stake_amount}
                        </div>
                     </div>
                     <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight mb-2">{pact.title}</h3>
                     <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-slate-50 dark:bg-black/20 p-2 rounded-xl text-center">
                           <p className="text-[8px] font-black uppercase text-slate-400">Meta Diária</p>
                           <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{pact.target_hours_per_day}h</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-black/20 p-2 rounded-xl text-center">
                           <p className="text-[8px] font-black uppercase text-slate-400">Duração</p>
                           <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{pact.duration_days} dias</p>
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={() => joinPact(pact)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                     <PenTool size={12} /> Assinar Contrato
                  </button>
               </div>
            ))}
         </div>
      )}

      {/* VIEW: ACTIVE */}
      {activeTab === 'active' && (
         <div className="space-y-6">
            {myActivePacts.length === 0 && (
               <div className="text-center py-20 opacity-50">
                  <AlertCircle size={48} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-xl font-black uppercase text-slate-500">Sem contratos vigentes</p>
               </div>
            )}
            {myActivePacts.map(pact => {
               const isCreator = pact.creator_id === userId;
               const myProgress = getTodayProgress(pact, isCreator);
               const partnerProgress = getTodayProgress(pact, !isCreator);
               const myPerc = Math.min(100, (myProgress / pact.target_hours_per_day) * 100);
               const partnerPerc = Math.min(100, (partnerProgress / pact.target_hours_per_day) * 100);

               return (
                  <div key={pact.id} className="bg-[#1e1b4b] text-white p-8 rounded-[3rem] border border-blue-900 shadow-2xl relative overflow-hidden">
                     {/* Background Texture */}
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                     
                     <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                        {/* Left: Me */}
                        <div className="flex-1 w-full text-center">
                           <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2">Você</p>
                           <div className="text-3xl font-black mb-1">{myProgress.toFixed(1)}h</div>
                           <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10">
                              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${myPerc}%` }}></div>
                           </div>
                        </div>

                        {/* Center: Info */}
                        <div className="text-center shrink-0">
                           <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-white/20">
                              <Handshake size={24} className="text-blue-300" />
                           </div>
                           <h3 className="font-black uppercase text-lg">{pact.title}</h3>
                           <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Meta: {pact.target_hours_per_day}h/dia • Aposta: {pact.stake_amount} SF$</p>
                        </div>

                        {/* Right: Partner */}
                        <div className="flex-1 w-full text-center">
                           <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2">{isCreator ? pact.partner_name : pact.creator_name}</p>
                           <div className="text-3xl font-black mb-1">{partnerProgress.toFixed(1)}h</div>
                           <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10">
                              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${partnerPerc}%` }}></div>
                           </div>
                        </div>
                     </div>

                     <div className="mt-8 text-center relative z-10">
                        <button className="px-6 py-2 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border border-red-500/30">
                           Cobrar Parceiro (Enviar Notificação)
                        </button>
                     </div>
                  </div>
               )
            })}
         </div>
      )}

      {/* VIEW: CREATE */}
      {activeTab === 'create' && (
         <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-xl max-w-xl mx-auto w-full">
            <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-6">Redigir Cláusulas</h3>
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Objeto do Contrato (Título)</label>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Intensivão de Fim de Semana" className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-blue-500" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Meta Diária (Horas)</label>
                     <input type="number" min="1" max="12" value={targetHours} onChange={e => setTargetHours(Number(e.target.value))} className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Duração (Dias)</label>
                     <input type="number" min="1" max="30" value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-blue-500" />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Caução (Aposta em SanCoins)</label>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-black/40 p-4 rounded-xl border-2 border-slate-200 dark:border-white/10">
                     <input type="range" min="10" max="500" step="10" value={stakeAmount} onChange={e => setStakeAmount(Number(e.target.value))} className="flex-1 accent-blue-500" />
                     <span className="font-black text-lg w-16 text-right text-blue-600 dark:text-blue-400">{stakeAmount}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 ml-1">*Valor será descontado do seu saldo e devolvido com bônus se ambos cumprirem.</p>
               </div>
               <button onClick={createPact} className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-black uppercase text-sm shadow-lg hover:scale-[1.02] transition-transform mt-4">
                  Publicar Minuta
               </button>
            </div>
         </div>
      )}

    </div>
  );
};

export default StudyPact;
