
import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Building, Users, Gavel, Scale, Send, LogOut, Plus, Trophy, Crown, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Society, SocietyMember, SocietyMessage } from '../types';

interface SocietiesProps {
  userId: string;
  userName: string;
}

const Societies: React.FC<SocietiesProps> = ({ userId, userName }) => {
  const [mySociety, setMySociety] = useState<Society | null>(null);
  const [allSocieties, setAllSocieties] = useState<Society[]>([]);
  const [members, setMembers] = useState<SocietyMember[]>([]);
  const [messages, setMessages] = useState<SocietyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form States
  const [newName, setNewName] = useState('');
  const [newMotto, setNewMotto] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
  }, [userId]);

  useEffect(() => {
    if (mySociety) {
      const channel = supabase
        .channel(`society_chat:${mySociety.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'society_messages',
          filter: `society_id=eq.${mySociety.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as SocietyMessage]);
          scrollToBottom();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [mySociety]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Check if user is in a society
      const { data: profile } = await supabase
        .from('profiles')
        .select('society_id')
        .eq('id', userId)
        .single();

      if (profile?.society_id) {
        // User is in a society, load details
        await loadMySociety(profile.society_id);
      } else {
        // User is not in a society, load list
        await loadAllSocieties();
      }
    } catch (e) {
      console.error("Erro ao carregar dados da sociedade:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMySociety = async (societyId: string) => {
    try {
      // Load Society Info
      const { data: society } = await supabase.from('societies').select('*').eq('id', societyId).single();
      if (!society) return;

      // Load Members
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').eq('society_id', societyId);
      
      if (profiles) {
        // Calculate scores for each member
        const memberIds = profiles.map(p => p.id);
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('user_id, duration')
          .in('user_id', memberIds);

        const memberStats: SocietyMember[] = profiles.map(p => {
          const totalSeconds = sessions
            ?.filter(s => s.user_id === p.id)
            .reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0) || 0;
          
          return {
            user_id: p.id,
            name: p.full_name,
            total_seconds: totalSeconds,
            role: society.created_by === p.id ? 'founder' : 'associate'
          };
        }).sort((a, b) => b.total_seconds - a.total_seconds);

        setMembers(memberStats);
        setMySociety({
            ...society,
            total_hours: memberStats.reduce((acc, m) => acc + m.total_seconds, 0) / 3600,
            member_count: memberStats.length
        });
      }

      // Load Chat History
      const { data: msgs } = await supabase
        .from('society_messages')
        .select('*')
        .eq('society_id', societyId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      setMessages(msgs || []);
      scrollToBottom();

    } catch (e) {
      console.error("Erro ao carregar sociedade:", e);
    }
  };

  const loadAllSocieties = async () => {
    try {
      // Fetch all societies
      const { data: societies } = await supabase.from('societies').select('*');
      if (!societies) return;

      // Fetch all profiles to count members and map users
      const { data: profiles } = await supabase.from('profiles').select('id, society_id');
      
      // Fetch all sessions to sum hours (Aggregate strategy)
      const { data: sessions } = await supabase.from('study_sessions').select('user_id, duration');
      
      const sessionMap: Record<string, number> = {};
      sessions?.forEach(s => {
          sessionMap[s.user_id] = (sessionMap[s.user_id] || 0) + (Number(s.duration) || 0);
      });

      const societyStats = societies.map(s => {
        const societyMembers = profiles?.filter(p => p.society_id === s.id) || [];
        const totalSeconds = societyMembers.reduce((acc, m) => acc + (sessionMap[m.id] || 0), 0);
        
        return {
          ...s,
          member_count: societyMembers.length,
          total_hours: totalSeconds / 3600
        };
      }).sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));

      setAllSocieties(societyStats);
    } catch (e) {
      console.error("Erro ao listar sociedades:", e);
    }
  };

  const createSociety = async () => {
    if (!newName.trim()) return;
    
    try {
      const { data, error } = await supabase.from('societies').insert({
        name: newName,
        motto: newMotto,
        created_by: userId
      }).select().single();

      if (error) throw error;
      if (data) {
        // Update user profile
        await supabase.from('profiles').update({ society_id: data.id }).eq('id', userId);
        setMySociety(data);
        loadMySociety(data.id);
      }
    } catch (e: any) {
        alert("Erro ao criar sociedade. Verifique se as tabelas 'societies' e 'profiles' estão configuradas corretamente no Supabase.");
    }
  };

  const joinSociety = async (societyId: string) => {
    try {
        const { error } = await supabase.from('profiles').update({ society_id: societyId }).eq('id', userId);
        if (error) throw error;
        loadMySociety(societyId);
    } catch (e) {
        alert("Erro ao entrar na sociedade.");
    }
  };

  const leaveSociety = async () => {
    if (!confirm("Deseja realmente abandonar sua Sociedade? Seu patrimônio intelectual deixará de somar para o grupo.")) return;
    try {
        await supabase.from('profiles').update({ society_id: null }).eq('id', userId);
        setMySociety(null);
        loadAllSocieties();
    } catch (e) {
        alert("Erro ao sair.");
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !mySociety) return;

    try {
        await supabase.from('society_messages').insert({
            society_id: mySociety.id,
            user_id: userId,
            user_name: userName || 'Doutor(a)',
            content: newMessage
        });
        setNewMessage('');
    } catch (e) {
        console.error("Erro ao enviar mensagem", e);
    }
  };

  const formatHours = (seconds: number) => (seconds / 3600).toFixed(1);

  if (isLoading) {
    return (
        <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sanfran-rubi"></div>
        </div>
    );
  }

  // --- VIEW 1: LOBBY (NO SOCIETY) ---
  if (!mySociety) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="text-center md:text-left">
             <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-200 dark:border-emerald-800 mb-4">
                <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Direito Societário</span>
             </div>
             <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Sociedades de Advogados</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">Junte-se a uma banca renomada ou funde seu próprio escritório.</p>
          </div>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 px-8 py-3.5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-sanfran-rubiDark transition-all"
          >
             <Plus size={16} /> Fundar Banca
          </button>
        </header>

        {isCreating && (
           <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border-2 border-sanfran-rubi shadow-2xl animate-in slide-in-from-top-4 max-w-2xl mx-auto">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                 <Scale className="text-sanfran-rubi" /> Contrato Social
              </h3>
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Razão Social (Nome)</label>
                    <input 
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Ex: Silva & Souza Advogados Associados"
                      className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold outline-none focus:border-sanfran-rubi"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Lema / Valores</label>
                    <input 
                      value={newMotto}
                      onChange={e => setNewMotto(e.target.value)}
                      placeholder="Ex: Fiat Justitia Ruat Caelum"
                      className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold outline-none focus:border-sanfran-rubi"
                    />
                 </div>
                 <button 
                    onClick={createSociety}
                    className="w-full py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm shadow-xl mt-2"
                 >
                    Assinar e Fundar
                 </button>
              </div>
           </div>
        )}

        <div className="grid grid-cols-1 gap-6">
           {allSocieties.length === 0 ? (
              <div className="py-20 text-center border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem] text-slate-400">
                 <Building size={64} className="mx-auto mb-4 opacity-20" />
                 <p className="text-xl font-black uppercase">Nenhuma Sociedade Registrada</p>
                 <p className="text-xs font-bold uppercase tracking-widest mt-2">Seja o pioneiro e funde a primeira banca.</p>
              </div>
           ) : (
              allSocieties.map((soc, idx) => (
                 <div key={soc.id} className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-2xl transition-all group">
                    <div className="flex items-center gap-6 w-full md:w-auto">
                       <div className="relative">
                          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-lg ${idx === 0 ? 'bg-usp-gold' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-400' : 'bg-slate-800'}`}>
                             <Building size={32} />
                          </div>
                          {idx < 3 && (
                             <div className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-black rounded-full border-2 border-slate-100 dark:border-white/10 flex items-center justify-center font-black text-xs shadow-md">
                                #{idx + 1}
                             </div>
                          )}
                       </div>
                       <div>
                          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase leading-none">{soc.name}</h3>
                          <p className="text-xs font-bold text-slate-400 italic mt-1">"{soc.motto}"</p>
                          <div className="flex items-center gap-4 mt-3">
                             <div className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded">
                                <Users size={12} /> {soc.member_count} Sócios
                             </div>
                             <div className="flex items-center gap-1 text-[10px] font-black uppercase text-sanfran-rubi bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                <Clock size={12} /> {soc.total_hours?.toFixed(1)}h Totais
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    <button 
                       onClick={() => joinSociety(soc.id)}
                       className="w-full md:w-auto px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg group-hover:scale-105 transition-transform"
                    >
                       Pedir Admissão
                    </button>
                 </div>
              ))
           )}
        </div>
      </div>
    );
  }

  // --- VIEW 2: SOCIETY DASHBOARD ---
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-6 animate-in zoom-in-95 duration-500 pb-20 md:pb-0">
       {/* HEADER DA SOCIEDADE */}
       <div className="bg-slate-900 dark:bg-black/40 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shrink-0">
          <div className="flex items-center gap-6">
             <div className="w-20 h-20 bg-gradient-to-br from-sanfran-rubi to-red-900 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white/10">
                <Scale size={40} className="text-white" />
             </div>
             <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{mySociety.name}</h2>
                <p className="text-sm font-serif italic text-slate-400 mt-1">"{mySociety.motto}"</p>
                <div className="flex items-center gap-4 mt-4">
                   <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
                      <Trophy size={14} className="text-usp-gold" />
                      <span className="text-xs font-black uppercase tracking-wide">Patrimônio Intelectual: {mySociety.total_hours?.toFixed(1)}h</span>
                   </div>
                </div>
             </div>
          </div>
          <button 
             onClick={leaveSociety}
             className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2"
          >
             <LogOut size={14} /> Dissolver Vínculo
          </button>
       </div>

       <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUNA 1: CHAT */}
          <div className="lg:col-span-2 bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex flex-col overflow-hidden">
             <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                <h3 className="font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                   <Gavel className="text-slate-400" size={18} /> Sala de Reunião
                </h3>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                      <Send size={48} className="mb-4" />
                      <p className="text-xs font-black uppercase">Nenhuma mensagem na ata.</p>
                   </div>
                )}
                {messages.map((msg) => {
                   const isMe = msg.user_id === userId;
                   return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                         <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${isMe ? 'bg-sanfran-rubi text-white rounded-tr-none' : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                            {!isMe && <p className="text-[10px] font-black uppercase opacity-50 mb-1">{msg.user_name}</p>}
                            {msg.content}
                         </div>
                         <p className="text-[9px] font-bold text-slate-400 mt-1 px-1">
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </p>
                      </div>
                   )
                })}
                <div ref={messagesEndRef} />
             </div>

             <form onSubmit={sendMessage} className="p-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex gap-3">
                <input 
                   value={newMessage}
                   onChange={e => setNewMessage(e.target.value)}
                   placeholder="Enviar mensagem aos sócios..."
                   className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-sanfran-rubi font-medium text-sm"
                />
                <button type="submit" className="p-3 bg-sanfran-rubi text-white rounded-xl hover:scale-105 transition-transform shadow-lg">
                   <Send size={20} />
                </button>
             </form>
          </div>

          {/* COLUNA 2: MEMBROS */}
          <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex flex-col overflow-hidden">
             <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                <h3 className="font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                   <Users className="text-slate-400" size={18} /> Quadro Societário
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {members.map((member, idx) => (
                   <div key={member.user_id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white ${idx === 0 ? 'bg-usp-gold' : 'bg-slate-400'}`}>
                            {idx + 1}
                         </div>
                         <div className="min-w-0">
                            <p className="font-black text-xs uppercase text-slate-900 dark:text-white truncate max-w-[100px]">{member.name}</p>
                            {member.role === 'founder' && (
                               <span className="text-[8px] font-black uppercase text-usp-gold bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                                  <Crown size={8} /> Fundador
                               </span>
                            )}
                         </div>
                      </div>
                      <div className="text-right">
                         <span className="block font-black text-sanfran-rubi tabular-nums text-sm">{formatHours(member.total_seconds)}h</span>
                         <span className="text-[8px] font-bold text-slate-400 uppercase">Contribuição</span>
                      </div>
                   </div>
                ))}
             </div>
          </div>

       </div>
    </div>
  );
};

export default Societies;
