
import React, { useState, useEffect } from 'react';
import { Users, MapPin, Coffee, Zap, MessageSquare, Shield, GraduationCap, Gavel } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface LoungeProps {
  userId: string;
  isTimerActive: boolean;
}

const Lounge: React.FC<LoungeProps> = ({ userId, isTimerActive }) => {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [presenceCount, setPresenceCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel('lounge-arcadas', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setOnlineUsers(users);
        setPresenceCount(users.length);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Notificação opcional de "fulano entrou no Largo"
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
          await channel.track({
            id: userId,
            name: profile?.full_name || 'Acadêmico Anonimo',
            studying: isTimerActive,
            joined_at: new Date().toISOString()
          });
        }
      });

    return () => { channel.unsubscribe(); };
  }, [userId, isTimerActive]);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 bg-sanfran-rubi/5 px-6 py-2 rounded-full border border-sanfran-rubi/10">
           <MapPin className="w-4 h-4 text-sanfran-rubi" />
           <span className="text-[10px] font-black uppercase tracking-widest text-sanfran-rubi">Largo São Francisco, SP</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">O Largo</h2>
        <p className="text-slate-500 font-bold italic">Sinta o pulso das Arcadas. Você não está sozinho na labuta.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-5"><Users size={200} /></div>
           
           <div className="flex items-center justify-between mb-10 relative z-10">
              <div>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Nas Arcadas Agora</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estudantes conectados em tempo real</p>
              </div>
              <div className="flex items-center gap-4 bg-emerald-500/10 px-6 py-3 rounded-2xl border border-emerald-500/20">
                 <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                 <span className="text-xl font-black text-emerald-600">{presenceCount} Ativos</span>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
              {onlineUsers.map((user, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 hover:border-sanfran-rubi transition-all group">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${user.studying ? 'bg-sanfran-rubi text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
                      {user.studying ? <Zap size={20} className="animate-pulse" /> : <Coffee size={20} />}
                   </div>
                   <div className="min-w-0">
                      <p className="font-black text-xs text-slate-900 dark:text-white uppercase truncate">{user.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{user.studying ? 'Protocolando Horas' : 'Pausa para Café'}</p>
                   </div>
                </div>
              ))}
              {onlineUsers.length === 0 && <p className="col-span-2 text-center py-10 text-slate-300 font-black uppercase text-xs">Aguardando outros doutores...</p>}
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-usp-gold/5 p-8 rounded-[2.5rem] border border-usp-gold/20 shadow-xl">
              <h4 className="text-[10px] font-black uppercase text-usp-gold tracking-widest mb-4 flex items-center gap-2">
                <Shield size={14} /> Tradição Acadêmica
              </h4>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                "Nas Arcadas, a amizade é o primeiro fundamento da justiça." 
              </p>
           </div>

           <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-2">
                <GraduationCap size={14} /> Espaços Virtuais
              </h4>
              <div className="space-y-3">
                 <button className="w-full p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 text-left hover:border-sanfran-rubi transition-all flex items-center justify-between group">
                    <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Sala de Estudos XI</span>
                    <MessageSquare size={14} className="text-slate-300 group-hover:text-sanfran-rubi" />
                 </button>
                 <button className="w-full p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 text-left hover:border-sanfran-rubi transition-all flex items-center justify-between group">
                    <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Foyer do Salão Nobre</span>
                    <MessageSquare size={14} className="text-slate-300 group-hover:text-sanfran-rubi" />
                 </button>
                 <button className="w-full p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 text-left hover:border-sanfran-rubi transition-all flex items-center justify-between group opacity-40 cursor-not-allowed">
                    <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Território Livre (Em breve)</span>
                    <Gavel size={14} className="text-slate-300" />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Lounge;
