
import React, { useState, useEffect } from 'react';
import { Gavel, Scale, FileText, User, Scroll, Trophy, Coins, Clock, ChevronRight, PenTool, ThumbsUp, ThumbsDown, CheckCircle2, XCircle, Shield, Users } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { MockJurySession } from '../types';
import confetti from 'canvas-confetti';

interface MockJuryProps {
  userId: string;
  userName: string;
}

const MockJury: React.FC<MockJuryProps> = ({ userId, userName }) => {
  const [sessions, setSessions] = useState<MockJurySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'voting' | 'recruitment' | 'my_cases'>('voting');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userCoins, setUserCoins] = useState(0);

  // Form State for Creating Case
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Argument Drafting State
  const [draftArgument, setDraftArgument] = useState('');

  useEffect(() => {
    fetchSessions();
    fetchWallet();

    const channel = supabase
      .channel('mock_jury_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mock_jury_sessions' }, () => fetchSessions())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mock_jury_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    try {
        // Assuming wallet logic exists or creates if not (handled in other components usually)
        // For display only here
        const { data } = await supabase.from('user_wallet').select('spent_coins').eq('user_id', userId).single();
        // Just mocking balance calc for display if needed, but here we just award coins
    } catch (e) {}
  };

  // --- ACTIONS ---

  const createSession = async () => {
    if (!newTitle.trim() || !newDescription.trim()) return;
    try {
      await supabase.from('mock_jury_sessions').insert({
        title: newTitle,
        description: newDescription,
        creator_id: userId,
        creator_name: userName,
        status: 'open'
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setActiveTab('recruitment');
    } catch (e) {
      alert("Erro ao abrir sessão do júri.");
    }
  };

  const joinRole = async (sessionId: string, role: 'prosecutor' | 'defense') => {
    try {
      const updateData = role === 'prosecutor' 
        ? { prosecutor_id: userId, prosecutor_name: userName }
        : { defense_id: userId, defense_name: userName };
      
      // Check if session becomes drafting
      // We need to know current state to flip to drafting if both filled. 
      // Supabase realtime will handle UI update, but logic is better in backend trigger or simple client logic
      
      const { error } = await supabase
        .from('mock_jury_sessions')
        .update(updateData)
        .eq('id', sessionId);

      if (error) throw error;
      
      // Optimistic check to update status if both are now filled (requires fetch or logic)
      // For MVP, trigger another update if needed or rely on refresh
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
         const isFull = (role === 'prosecutor' && session.defense_id) || (role === 'defense' && session.prosecutor_id);
         if (isFull) {
            await supabase.from('mock_jury_sessions').update({ status: 'drafting' }).eq('id', sessionId);
         }
      }

      alert(`Você assumiu a ${role === 'prosecutor' ? 'Acusação' : 'Defesa'}!`);
      setActiveTab('my_cases');
    } catch (e) {
      alert("Erro ao assumir a causa.");
    }
  };

  const submitArgument = async (sessionId: string, role: 'prosecutor' | 'defense') => {
    if (!draftArgument.trim()) return;
    try {
      const updateData = role === 'prosecutor' 
        ? { prosecutor_argument: draftArgument }
        : { defense_argument: draftArgument };
      
      await supabase.from('mock_jury_sessions').update(updateData).eq('id', sessionId);
      
      setDraftArgument('');
      alert("Argumento protocolado nos autos.");
      
      // Check to flip to voting
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
         const otherArg = role === 'prosecutor' ? session.defense_argument : session.prosecutor_argument;
         if (otherArg) {
            // Both submitted -> move to voting
            const endsAt = new Date();
            endsAt.setHours(endsAt.getHours() + 48); // 48h voting
            await supabase.from('mock_jury_sessions').update({ 
                status: 'voting',
                voting_ends_at: endsAt.toISOString()
            }).eq('id', sessionId);
         }
      }

    } catch (e) {
      alert("Erro ao enviar.");
    }
  };

  const vote = async (sessionId: string, target: 'prosecutor' | 'defense') => {
    try {
      // 1. Insert Vote Record
      const { error } = await supabase.from('mock_jury_votes').insert({
        session_id: sessionId,
        user_id: userId,
        vote_target: target
      });

      if (error) {
         if (error.code === '23505') alert("Você já votou neste caso."); // Unique violation
         else throw error;
         return;
      }

      // 2. Increment Counter (Simple approach, ideal would be trigger)
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
         const updateData = target === 'prosecutor' 
            ? { votes_prosecutor: session.votes_prosecutor + 1 } 
            : { votes_defense: session.votes_defense + 1 };
         
         await supabase.from('mock_jury_sessions').update(updateData).eq('id', sessionId);
      }
      
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });

    } catch (e) {
      console.error(e);
    }
  };

  // --- RENDERING ---

  const renderVotingCard = (session: MockJurySession) => {
     const totalVotes = session.votes_prosecutor + session.votes_defense;
     const pPerc = totalVotes > 0 ? (session.votes_prosecutor / totalVotes) * 100 : 50;
     const dPerc = totalVotes > 0 ? (session.votes_defense / totalVotes) * 100 : 50;

     return (
        <div key={session.id} className="bg-[#1c1917] text-white rounded-[2.5rem] p-8 border border-red-900/30 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-6 opacity-10">
              <Scale size={80} />
           </div>
           
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                 <h3 className="text-2xl font-black uppercase tracking-tight">{session.title}</h3>
                 <span className="bg-red-900/50 text-red-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/30 flex items-center gap-2">
                    <Clock size={12} /> Em Votação
                 </span>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-8 italic text-slate-300 text-sm font-serif">
                 "{session.description}"
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* PROSECUTION */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center border-2 border-blue-500">
                          <User size={16} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Acusação / Autor</p>
                          <p className="font-bold text-sm">{session.prosecutor_name}</p>
                       </div>
                    </div>
                    <div className="bg-blue-950/30 p-4 rounded-2xl border border-blue-900/50 text-xs text-blue-100 leading-relaxed min-h-[120px]">
                       {session.prosecutor_argument}
                    </div>
                    <button 
                      onClick={() => vote(session.id, 'prosecutor')}
                      className="w-full py-3 bg-blue-700 hover:bg-blue-600 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2"
                    >
                       <ThumbsUp size={14} /> Votar na Tese
                    </button>
                 </div>

                 {/* DEFENSE */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 justify-end">
                       <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-red-400 tracking-widest">Defesa / Réu</p>
                          <p className="font-bold text-sm">{session.defense_name}</p>
                       </div>
                       <div className="w-10 h-10 rounded-full bg-red-900 flex items-center justify-center border-2 border-red-500">
                          <Shield size={16} />
                       </div>
                    </div>
                    <div className="bg-red-950/30 p-4 rounded-2xl border border-red-900/50 text-xs text-red-100 leading-relaxed min-h-[120px]">
                       {session.defense_argument}
                    </div>
                    <button 
                      onClick={() => vote(session.id, 'defense')}
                      className="w-full py-3 bg-red-700 hover:bg-red-600 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2"
                    >
                       <ThumbsUp size={14} /> Votar na Tese
                    </button>
                 </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-8">
                 <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                    <span className="text-blue-400">{session.votes_prosecutor} Votos</span>
                    <span className="text-red-400">{session.votes_defense} Votos</span>
                 </div>
                 <div className="h-4 bg-black rounded-full overflow-hidden flex border border-white/10">
                    <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${pPerc}%` }}></div>
                    <div className="bg-red-600 h-full transition-all duration-1000" style={{ width: `${dPerc}%` }}></div>
                 </div>
              </div>
           </div>
        </div>
     );
  };

  const renderDraftingCard = (session: MockJurySession) => {
     const myRole = session.prosecutor_id === userId ? 'prosecutor' : 'defense';
     const myArgument = myRole === 'prosecutor' ? session.prosecutor_argument : session.defense_argument;
     const opponentName = myRole === 'prosecutor' ? session.defense_name : session.prosecutor_name;

     return (
        <div key={session.id} className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
           <div className="flex justify-between items-start mb-6">
              <div>
                 <span className="text-[10px] font-black uppercase tracking-widest bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-800">
                    Fase de Instrução (Escrita)
                 </span>
                 <h3 className="text-xl font-black mt-3 text-slate-900 dark:text-white">{session.title}</h3>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Seu Papel</p>
                 <p className={`text-lg font-black uppercase ${myRole === 'prosecutor' ? 'text-blue-600' : 'text-red-600'}`}>
                    {myRole === 'prosecutor' ? 'Acusação' : 'Defesa'}
                 </p>
              </div>
           </div>

           <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl mb-6 text-sm italic text-slate-600 dark:text-slate-300 font-serif border border-slate-100 dark:border-white/5">
              "Resumo do Caso: {session.description}"
           </div>

           {myArgument ? (
              <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
                 <CheckCircle2 className="mx-auto text-emerald-500 mb-2" />
                 <p className="font-bold text-emerald-700 dark:text-emerald-400">Argumento Protocolado!</p>
                 <p className="text-xs text-emerald-600/70 mt-1">Aguardando o oponente ({opponentName || '...'}) para iniciar a votação.</p>
              </div>
           ) : (
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sua Tese (Máx 500 caracteres)</label>
                 <textarea 
                   value={draftArgument}
                   onChange={e => setDraftArgument(e.target.value)}
                   className="w-full h-40 p-4 bg-white dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-serif text-sm resize-none outline-none focus:border-sanfran-rubi"
                   placeholder="Excelentíssimos jurados..."
                   maxLength={500}
                 />
                 <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">{draftArgument.length}/500</span>
                    <button 
                      onClick={() => submitArgument(session.id, myRole)}
                      className="px-8 py-3 bg-sanfran-rubi text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:scale-105 transition-transform"
                    >
                       Protocolar Tese
                    </button>
                 </div>
              </div>
           )}
        </div>
     );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-5xl mx-auto h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-700 dark:border-white/20 mb-4">
              <Gavel className="w-4 h-4 text-white" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Tribunal do Júri</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Júri Simulado</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Acusação vs Defesa. A comunidade decide o veredito.</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
           <button 
             onClick={() => setShowCreateModal(true)}
             className="px-8 py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
           >
              <PenTool size={16} /> Abrir Novo Inquérito
           </button>
           <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              <button onClick={() => setActiveTab('voting')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'voting' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Plenário (Votação)</button>
              <button onClick={() => setActiveTab('recruitment')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'recruitment' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Recrutamento</button>
              <button onClick={() => setActiveTab('my_cases')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'my_cases' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Minhas Lides</button>
           </div>
        </div>
      </header>

      {/* CREATE MODAL */}
      {showCreateModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-lg rounded-[2.5rem] p-8 border-4 border-slate-900 dark:border-sanfran-rubi/30 relative">
               <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><XCircle size={24} /></button>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6">Instaurar Processo</h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Título do Caso</label>
                     <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: O Caso dos Exploradores de Caverna" className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-sanfran-rubi" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Fatos (Descrição)</label>
                     <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Descreva os fatos de forma neutra para que as partes possam argumentar..." className="w-full h-32 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-sanfran-rubi resize-none" />
                  </div>
                  <button onClick={createSession} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-xs shadow-lg mt-2">Publicar Edital</button>
               </div>
            </div>
         </div>
      )}

      {/* CONTENT TABS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[400px]">
         
         {/* TAB: VOTING */}
         {activeTab === 'voting' && (
            <div className="space-y-8">
               {sessions.filter(s => s.status === 'voting').length === 0 && (
                  <div className="text-center py-20 opacity-40">
                     <Gavel size={48} className="mx-auto mb-4 text-slate-400" />
                     <p className="text-xl font-black text-slate-500 uppercase">O Tribunal está em recesso</p>
                     <p className="text-xs font-bold text-slate-400 mt-2">Nenhum caso em votação no momento.</p>
                  </div>
               )}
               {sessions.filter(s => s.status === 'voting').map(s => renderVotingCard(s))}
            </div>
         )}

         {/* TAB: RECRUITMENT */}
         {activeTab === 'recruitment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {sessions.filter(s => s.status === 'open' || s.status === 'drafting').filter(s => !s.prosecutor_id || !s.defense_id).map(s => (
                  <div key={s.id} className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg flex flex-col justify-between">
                     <div>
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">Recrutando</span>
                           <span className="text-[9px] font-bold text-slate-400">{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2">{s.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-3 mb-6">{s.description}</p>
                     </div>
                     
                     <div className="space-y-2">
                        {!s.prosecutor_id && (
                           <button onClick={() => joinRole(s.id, 'prosecutor')} className="w-full py-3 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 hover:text-white transition-all">
                              Assumir Acusação
                           </button>
                        )}
                        {!s.defense_id && (
                           <button onClick={() => joinRole(s.id, 'defense')} className="w-full py-3 border-2 border-red-500 text-red-600 dark:text-red-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all">
                              Assumir Defesa
                           </button>
                        )}
                     </div>
                  </div>
               ))}
               {sessions.filter(s => (s.status === 'open' || s.status === 'drafting') && (!s.prosecutor_id || !s.defense_id)).length === 0 && (
                  <div className="col-span-full text-center py-20 opacity-40">
                     <Users size={48} className="mx-auto mb-4 text-slate-400" />
                     <p className="text-xl font-black text-slate-500 uppercase">Sem Vagas</p>
                     <p className="text-xs font-bold text-slate-400 mt-2">Todos os casos estão com as bancas completas.</p>
                  </div>
               )}
            </div>
         )}

         {/* TAB: MY CASES */}
         {activeTab === 'my_cases' && (
            <div className="space-y-8">
               {sessions.filter(s => (s.prosecutor_id === userId || s.defense_id === userId || s.creator_id === userId)).map(s => {
                  if (s.status === 'drafting') return renderDraftingCard(s);
                  if (s.status === 'voting') return renderVotingCard(s); // Show voting card if I'm involved
                  
                  // Pending / Open (Creator View)
                  return (
                     <div key={s.id} className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 opacity-70">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase">{s.title}</h4>
                           <span className="text-[10px] font-bold uppercase tracking-widest bg-black/10 px-2 py-1 rounded">{s.status}</span>
                        </div>
                        <p className="text-xs text-slate-500">Aguardando preenchimento das vagas ou votação...</p>
                     </div>
                  );
               })}
               {sessions.filter(s => (s.prosecutor_id === userId || s.defense_id === userId || s.creator_id === userId)).length === 0 && (
                  <div className="text-center py-20 opacity-40">
                     <FileText size={48} className="mx-auto mb-4 text-slate-400" />
                     <p className="text-xl font-black text-slate-500 uppercase">Nenhum Processo</p>
                     <p className="text-xs font-bold text-slate-400 mt-2">Você não está participando de nenhum júri ativo.</p>
                  </div>
               )}
            </div>
         )}

      </div>
    </div>
  );
};

export default MockJury;
