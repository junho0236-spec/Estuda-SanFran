
import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Building, Users, Gavel, Scale, Send, LogOut, Plus, Trophy, Crown, Clock, Calendar, AlertTriangle, FileText, Bookmark, Trash2, Home, Search } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Society, SocietyMember, SocietyMessage, SocietyDeadline } from '../types';

interface SocietiesProps {
  userId: string;
  userName: string;
}

const Societies: React.FC<SocietiesProps> = ({ userId, userName }) => {
  // Lista de sociedades que o usuário participa
  const [mySocieties, setMySocieties] = useState<Society[]>([]);
  // Sociedade atualmente selecionada para ver o painel (null = vendo o Lobby)
  const [activeSociety, setActiveSociety] = useState<Society | null>(null);
  
  // Dados do Lobby
  const [allSocieties, setAllSocieties] = useState<Society[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMotto, setNewMotto] = useState('');

  // Dados da Sociedade Ativa
  const [members, setMembers] = useState<SocietyMember[]>([]);
  const [messages, setMessages] = useState<SocietyMessage[]>([]);
  const [deadlines, setDeadlines] = useState<SocietyDeadline[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [rightPanelTab, setRightPanelTab] = useState<'members' | 'deadlines'>('deadlines');
  
  // Deadline Form
  const [deadlineTitle, setDeadlineTitle] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineCategory, setDeadlineCategory] = useState<'prova' | 'trabalho' | 'seminario' | 'outros'>('prova');

  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMySocieties();
  }, [userId]);

  // Carrega dados da sociedade ativa quando ela muda
  useEffect(() => {
    if (activeSociety) {
      loadActiveSocietyData(activeSociety.id);
      
      // Realtime Subscriptions
      const chatChannel = supabase.channel(`chat:${activeSociety.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'society_messages', filter: `society_id=eq.${activeSociety.id}` }, 
        (payload) => { setMessages(prev => [...prev, payload.new as SocietyMessage]); scrollToBottom(); })
        .subscribe();

      const dlChannel = supabase.channel(`dl:${activeSociety.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'society_deadlines', filter: `society_id=eq.${activeSociety.id}` }, 
        () => fetchDeadlines(activeSociety.id))
        .subscribe();

      return () => { supabase.removeChannel(chatChannel); supabase.removeChannel(dlChannel); };
    }
  }, [activeSociety]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // --- CARREGAMENTO DE DADOS ---

  const loadMySocieties = async () => {
    setIsLoading(true);
    try {
      // Busca na tabela de junção
      const { data: memberships } = await supabase
        .from('society_members')
        .select('society_id, societies(*)')
        .eq('user_id', userId);

      if (memberships) {
        // Extrai o objeto society de dentro do join
        const societiesList = memberships.map((m: any) => m.societies).filter(Boolean);
        setMySocieties(societiesList);
        
        // Se não tem sociedade ativa e o usuário tem sociedades, seleciona a primeira
        if (!activeSociety && societiesList.length > 0) {
          setActiveSociety(societiesList[0]);
        } else if (societiesList.length === 0) {
          setActiveSociety(null); // Vai pro lobby
          loadLobby();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLobby = async () => {
    try {
      const { data: societies } = await supabase.from('societies').select('*');
      if (!societies) return;

      // Calcular stats básicos para o lobby (membros e horas)
      const { data: members } = await supabase.from('society_members').select('society_id');
      
      const stats = societies.map(s => ({
        ...s,
        member_count: members?.filter((m: any) => m.society_id === s.id).length || 0,
        total_hours: 0 // Simplificação para o lobby carregar rápido
      }));

      setAllSocieties(stats);
    } catch (e) {
      console.error(e);
    }
  };

  const loadActiveSocietyData = async (societyId: string) => {
    // 1. Membros
    const { data: memberData } = await supabase
      .from('society_members')
      .select('user_id, role, profiles(full_name)')
      .eq('society_id', societyId);

    if (memberData) {
      const memberIds = memberData.map((m: any) => m.user_id);
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('user_id, duration')
        .in('user_id', memberIds);

      const stats: SocietyMember[] = memberData.map((m: any) => {
        const totalSeconds = sessions
          ?.filter(s => s.user_id === m.user_id)
          .reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0) || 0;
        
        return {
          user_id: m.user_id,
          name: m.profiles?.full_name || 'Membro',
          total_seconds: totalSeconds,
          role: m.role as 'founder' | 'associate'
        };
      }).sort((a, b) => b.total_seconds - a.total_seconds);
      
      setMembers(stats);
    }

    // 2. Chat
    const { data: msgs } = await supabase
      .from('society_messages')
      .select('*')
      .eq('society_id', societyId)
      .order('created_at', { ascending: true })
      .limit(50);
    setMessages(msgs || []);
    scrollToBottom();

    // 3. Deadlines
    fetchDeadlines(societyId);
  };

  const fetchDeadlines = async (societyId: string) => {
    const { data } = await supabase
      .from('society_deadlines')
      .select('*')
      .eq('society_id', societyId)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });
    if (data) setDeadlines(data);
  };

  // --- AÇÕES ---

  const createSociety = async () => {
    if (!newName.trim()) return;
    try {
      // 1. Cria a sociedade
      const { data: soc, error } = await supabase.from('societies').insert({
        name: newName,
        motto: newMotto,
        created_by: userId
      }).select().single();

      if (error) throw error;

      // 2. Adiciona o criador como membro (founder)
      await supabase.from('society_members').insert({
        society_id: soc.id,
        user_id: userId,
        role: 'founder'
      });

      setMySocieties(prev => [...prev, soc]);
      setActiveSociety(soc);
      setIsCreating(false);
      setNewName('');
    } catch (e) {
      alert("Erro ao fundar sociedade.");
    }
  };

  const joinSociety = async (societyId: string) => {
    try {
      // Verifica se já não é membro (o banco tem unique constraint, mas evitamos o erro visual)
      if (mySocieties.find(s => s.id === societyId)) {
        alert("Você já é membro desta sociedade.");
        return;
      }

      const { error } = await supabase.from('society_members').insert({
        society_id: societyId,
        user_id: userId,
        role: 'associate'
      });

      if (error) throw error;

      // Recarrega lista
      await loadMySocieties();
      // Encontra a sociedade para ativar
      const target = allSocieties.find(s => s.id === societyId);
      if (target) setActiveSociety(target);

    } catch (e) {
      alert("Erro ao entrar na sociedade.");
    }
  };

  const leaveSociety = async () => {
    if (!activeSociety || !confirm(`Sair de ${activeSociety.name}?`)) return;
    try {
      await supabase.from('society_members').delete()
        .eq('society_id', activeSociety.id)
        .eq('user_id', userId);
      
      const remaining = mySocieties.filter(s => s.id !== activeSociety.id);
      setMySocieties(remaining);
      setActiveSociety(remaining.length > 0 ? remaining[0] : null);
      if (remaining.length === 0) loadLobby();
    } catch (e) {
      alert("Erro ao sair.");
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeSociety) return;
    try {
      await supabase.from('society_messages').insert({
        society_id: activeSociety.id,
        user_id: userId,
        user_name: userName || 'Doutor(a)',
        content: newMessage
      });
      setNewMessage('');
    } catch (e) { console.error(e); }
  };

  const handleCreateDeadline = async () => {
    if (!activeSociety || !deadlineTitle || !deadlineDate) return;
    try {
      await supabase.from('society_deadlines').insert({
        society_id: activeSociety.id,
        title: deadlineTitle,
        date: deadlineDate,
        category: deadlineCategory,
        created_by: userId
      });
      setDeadlineTitle('');
      setDeadlineDate('');
    } catch (e) { alert("Erro ao criar prazo."); }
  };

  const deleteDeadline = async (id: string) => {
    if(!confirm("Remover?")) return;
    try { await supabase.from('society_deadlines').delete().eq('id', id); } catch(e) {}
  };

  const calculateDaysLeft = (dateStr: string) => {
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0,0,0,0); 
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatHours = (seconds: number) => (seconds / 3600).toFixed(1);

  if (isLoading) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sanfran-rubi"></div></div>;

  // LAYOUT PRINCIPAL: SIDEBAR + CONTEÚDO
  return (
    <div className="flex h-full gap-4">
      
      {/* 1. SIDEBAR DE SOCIEDADES (Estilo Discord) */}
      <div className="w-20 flex-shrink-0 flex flex-col items-center gap-4 py-6 bg-white dark:bg-sanfran-rubiDark/30 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl overflow-y-auto no-scrollbar">
         
         {/* Botão do Lobby */}
         <button 
           onClick={() => { setActiveSociety(null); loadLobby(); }}
           className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md group relative ${!activeSociety ? 'bg-sanfran-rubi text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400 hover:bg-sanfran-rubi hover:text-white'}`}
           title="Encontrar Sociedades"
         >
            <Search size={20} />
            {!activeSociety && <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full -ml-4" />}
         </button>

         <div className="w-8 h-0.5 bg-slate-200 dark:bg-white/10 rounded-full" />

         {/* Lista das Minhas Sociedades */}
         {mySocieties.map(soc => (
           <button
             key={soc.id}
             onClick={() => setActiveSociety(soc)}
             className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md group relative ${activeSociety?.id === soc.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-indigo-500 hover:text-white'}`}
             title={soc.name}
           >
              <span className="font-black text-xs uppercase">{soc.name.substring(0, 2)}</span>
              {activeSociety?.id === soc.id && <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full -ml-4" />}
           </button>
         ))}

         {/* Botão Criar Nova (Atalho) */}
         <button 
           onClick={() => { setActiveSociety(null); setIsCreating(true); loadLobby(); }}
           className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-white/5 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm mt-auto"
           title="Criar Nova Sociedade"
         >
            <Plus size={20} />
         </button>
      </div>

      {/* 2. CONTEÚDO PRINCIPAL (Lobby ou Dashboard) */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        
        {/* VIEW: LOBBY (Procurar/Criar) */}
        {!activeSociety ? (
          <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-10 animate-in fade-in duration-500 pb-20">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                   <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Lobby das Sociedades</h2>
                   <p className="text-slate-500 font-bold italic text-lg mt-2">Encontre grupos de estudo ou crie sua própria banca.</p>
                </div>
                <button onClick={() => setIsCreating(!isCreating)} className="px-8 py-3 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all">
                   {isCreating ? 'Cancelar Criação' : 'Fundar Nova Banca'}
                </button>
             </header>

             {isCreating && (
                <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border-2 border-sanfran-rubi shadow-2xl animate-in slide-in-from-top-4 max-w-2xl mx-auto">
                   <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2"><Scale className="text-sanfran-rubi" /> Contrato Social</h3>
                   <div className="space-y-4">
                      <div>
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Razão Social</label>
                         <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Grupo de Estudos Penal" className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold outline-none focus:border-sanfran-rubi" />
                      </div>
                      <div>
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Propósito</label>
                         <input value={newMotto} onChange={e => setNewMotto(e.target.value)} placeholder="Ex: Foco no Concurso de Delegado" className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold outline-none focus:border-sanfran-rubi" />
                      </div>
                      <button onClick={createSociety} className="w-full py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm shadow-xl mt-2">Assinar e Fundar</button>
                   </div>
                </div>
             )}

             <div className="grid grid-cols-1 gap-4">
                {allSocieties.map((soc) => {
                   const isMember = mySocieties.some(m => m.id === soc.id);
                   return (
                     <div key={soc.id} className="bg-white dark:bg-sanfran-rubiDark/30 p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-md flex items-center justify-between hover:shadow-xl transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl">
                              {soc.name.substring(0, 1)}
                           </div>
                           <div>
                              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">{soc.name}</h3>
                              <p className="text-xs font-bold text-slate-400 italic mt-1">{soc.motto}</p>
                              <div className="flex items-center gap-2 mt-2">
                                 <span className="bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-[9px] font-black uppercase text-slate-500">{soc.member_count} Membros</span>
                              </div>
                           </div>
                        </div>
                        {isMember ? (
                           <button onClick={() => setActiveSociety(soc)} className="px-6 py-3 bg-slate-100 dark:bg-white/10 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest">Acessar</button>
                        ) : (
                           <button onClick={() => joinSociety(soc.id)} className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-transform">Entrar</button>
                        )}
                     </div>
                   );
                })}
             </div>
          </div>
        ) : (
          
          /* VIEW: DASHBOARD DA SOCIEDADE ATIVA */
          <div className="h-full flex flex-col gap-6 animate-in zoom-in-95 duration-300 pb-20 md:pb-0 overflow-y-auto custom-scrollbar">
             
             {/* Header Sociedade */}
             <div className="bg-slate-900 dark:bg-black/40 rounded-[2.5rem] p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shrink-0">
                <div className="flex items-center gap-4">
                   <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/20">
                      <Briefcase size={32} className="text-white" />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{activeSociety.name}</h2>
                      <p className="text-xs font-serif italic text-slate-400 mt-1">"{activeSociety.motto}"</p>
                   </div>
                </div>
                <button onClick={leaveSociety} className="px-4 py-2 bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center gap-2 border border-red-500/20">
                   <LogOut size={12} /> Sair
                </button>
             </div>

             {/* Faixa de Prazos Urgentes */}
             {deadlines.length > 0 && (
               <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar shrink-0">
                  {deadlines.slice(0, 4).map(dl => {
                     const days = calculateDaysLeft(dl.date);
                     let color = days <= 3 ? 'bg-red-500 animate-pulse' : days <= 7 ? 'bg-yellow-500' : 'bg-blue-500';
                     return (
                        <div key={dl.id} className="flex-shrink-0 bg-white dark:bg-sanfran-rubiDark/30 rounded-2xl p-4 border border-slate-200 dark:border-sanfran-rubi/30 shadow-md min-w-[180px]">
                           <div className="flex justify-between items-start mb-2">
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded text-white ${color}`}>{dl.category}</span>
                              <span className="text-[9px] font-bold text-slate-400">{new Date(dl.date).toLocaleDateString()}</span>
                           </div>
                           <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight truncate">{dl.title}</h4>
                           <p className="text-[9px] font-black text-slate-500 uppercase mt-1">{days <= 0 ? 'Hoje!' : `${days} dias`}</p>
                        </div>
                     );
                  })}
               </div>
             )}

             <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                
                {/* Chat */}
                <div className="lg:col-span-2 bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex flex-col overflow-hidden h-[500px] lg:h-auto">
                   <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center gap-2">
                      <Gavel size={16} className="text-slate-400" /> 
                      <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Sala de Reunião</span>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {messages.length === 0 && <div className="text-center py-10 opacity-50 text-xs font-black uppercase">Sem mensagens.</div>}
                      {messages.map((msg) => {
                         const isMe = msg.user_id === userId;
                         return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                               <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                                  {!isMe && <p className="text-[9px] font-black uppercase opacity-60 mb-1">{msg.user_name}</p>}
                                  {msg.content}
                               </div>
                            </div>
                         )
                      })}
                      <div ref={messagesEndRef} />
                   </div>
                   <form onSubmit={sendMessage} className="p-3 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex gap-2">
                      <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Mensagem..." className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500" />
                      <button type="submit" className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg"><Send size={16} /></button>
                   </form>
                </div>

                {/* Painel Direito (Membros / Prazos) */}
                <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex flex-col overflow-hidden h-[500px] lg:h-auto">
                   <div className="flex p-2 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                      <button onClick={() => setRightPanelTab('deadlines')} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${rightPanelTab === 'deadlines' ? 'bg-white dark:bg-indigo-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}>Prazos</button>
                      <button onClick={() => setRightPanelTab('members')} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${rightPanelTab === 'members' ? 'bg-white dark:bg-indigo-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}>Membros</button>
                   </div>

                   {rightPanelTab === 'deadlines' ? (
                      <div className="flex-1 flex flex-col min-h-0">
                         <div className="p-4 border-b border-slate-100 dark:border-white/5 space-y-2 bg-slate-50/50 dark:bg-white/5">
                            <input value={deadlineTitle} onChange={e => setDeadlineTitle(e.target.value)} placeholder="Novo Prazo..." className="w-full p-2 rounded-lg text-xs border border-slate-200 dark:border-white/10 outline-none bg-white dark:bg-black/20" />
                            <div className="flex gap-2">
                               <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} className="flex-1 p-2 rounded-lg text-xs border border-slate-200 dark:border-white/10 outline-none bg-white dark:bg-black/20" />
                               <button onClick={handleCreateDeadline} className="bg-indigo-600 text-white px-3 rounded-lg"><Plus size={14} /></button>
                            </div>
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {deadlines.map(dl => (
                               <div key={dl.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 group">
                                  <div>
                                     <p className="text-xs font-bold text-slate-900 dark:text-white">{dl.title}</p>
                                     <span className="text-[9px] text-slate-500">{new Date(dl.date).toLocaleDateString()}</span>
                                  </div>
                                  <button onClick={() => deleteDeadline(dl.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                               </div>
                            ))}
                         </div>
                      </div>
                   ) : (
                      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                         {members.map((m, idx) => (
                            <div key={m.user_id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                               <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white ${idx === 0 ? 'bg-usp-gold' : 'bg-slate-400'}`}>{idx+1}</div>
                                  <div>
                                     <p className="text-[10px] font-black uppercase truncate max-w-[80px]">{m.name}</p>
                                     {m.role === 'founder' && <span className="text-[8px] text-usp-gold flex items-center gap-1"><Crown size={8} /> Fundador</span>}
                                  </div>
                               </div>
                               <span className="text-[10px] font-black text-indigo-500">{formatHours(m.total_seconds)}h</span>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Societies;
