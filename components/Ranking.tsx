
import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Gavel, Award, Scale, Briefcase, GraduationCap, Crown, User, TrendingUp, Clock, Info } from 'lucide-react';
import { RankingEntry } from '../types';
import { supabase } from '../services/supabaseClient';

interface RankingProps {
  userId: string;
  session: any;
}

const Ranking: React.FC<RankingProps> = ({ userId, session }) => {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ranksInfo = [
    { name: 'Bacharel', hours: 0, icon: GraduationCap, color: 'text-slate-400', bg: 'bg-slate-100' },
    { name: 'Advogado Júnior', hours: 20, icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { name: 'Advogado Pleno', hours: 100, icon: Scale, color: 'text-usp-blue', bg: 'bg-cyan-50' },
    { name: 'Advogado Sênior', hours: 300, icon: Award, color: 'text-usp-gold', bg: 'bg-yellow-50' },
    { name: 'Sócio-Diretor', hours: 700, icon: Medal, color: 'text-sanfran-rubi', bg: 'bg-red-50' },
    { name: 'Magistrado', hours: 1500, icon: Gavel, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const getRankName = (hours: number) => {
    return [...ranksInfo].reverse().find(r => hours >= r.hours)?.name || 'Bacharel';
  };

  useEffect(() => {
    const fetchRankingData = async () => {
      setIsLoading(true);
      try {
        // 1. Busca todas as sessões para calcular o tempo total
        const { data: sessions, error: sessionErr } = await supabase
          .from('study_sessions')
          .select('user_id, duration');

        if (sessionErr) throw sessionErr;

        // 2. Busca nomes da tabela pública 'profiles'
        let profileMap: Record<string, string> = {};
        try {
          const { data: profileData } = await supabase.from('profiles').select('id, full_name');
          profileData?.forEach(p => { profileMap[p.id] = p.full_name; });
        } catch (e) {
          console.warn("Tabela 'profiles' inacessível ou vazia.");
        }

        // 3. Agrupamento por usuário
        const userTotals: Record<string, number> = {};
        sessions.forEach(s => {
          userTotals[s.user_id] = (userTotals[s.user_id] || 0) + (Number(s.duration) || 0);
        });

        // 4. Montagem do array de ranking
        const myNameFromSession = session?.user?.user_metadata?.full_name || 'Doutor(a)';
        
        const sorted = Object.entries(userTotals)
          .map(([id, total]) => {
            const hours = total / 3600;
            // Prioridade de nome: 1. Tabela profiles, 2. Metadados se for EU, 3. Nome genérico
            let displayName = profileMap[id] || (id === userId ? myNameFromSession : null) || `Acadêmico ${id.slice(0, 4)}`;
            
            return {
              user_id: id,
              name: displayName,
              total_seconds: total,
              rank_name: getRankName(hours)
            };
          })
          .sort((a, b) => b.total_seconds - a.total_seconds);

        setRanking(sorted);
      } catch (e) {
        console.error("Erro no ranking:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankingData();
  }, [userId, session]);

  const topThree = ranking.slice(0, 3);

  const formatHours = (seconds: number) => {
    return (seconds / 3600).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="w-12 h-12 border-4 border-sanfran-rubi/20 border-t-sanfran-rubi rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Consultando o Dossiê Geral...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 md:space-y-16 animate-in fade-in duration-700 pb-20">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-3 bg-usp-gold/10 px-6 py-2 rounded-full border border-usp-gold/20 mb-4">
           <Trophy className="w-5 h-5 text-usp-gold" />
           <span className="text-[10px] font-black uppercase tracking-widest text-usp-gold">Hall da Excelência Acadêmica</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Ranking SanFran</h2>
        <p className="text-slate-500 font-bold italic">"Scientia Vinces" - Pela ciência, vencerás.</p>
      </header>

      {/* Alerta de Pioneirismo */}
      {ranking.length === 1 && (
        <div className="max-w-xl mx-auto bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-3xl flex items-center gap-4 animate-pulse">
           <Info className="text-usp-blue w-6 h-6 flex-shrink-0" />
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-relaxed">
             Você é o pioneiro acadêmico nesta instância. Convide outros doutores para disputar a pauta do ranking!
           </p>
        </div>
      )}

      {/* Pódio visual */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-10 pt-10">
        {topThree[1] && (
          <div className="order-2 md:order-1 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-10">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-200 border-4 border-white shadow-xl flex items-center justify-center">
                <User className="w-10 h-10 text-slate-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg">2º</div>
            </div>
            <div className="text-center">
              <p className="font-black text-slate-900 dark:text-white uppercase text-xs truncate max-w-[120px]">{topThree[1].name}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{topThree[1].rank_name}</p>
            </div>
            <div className="w-24 md:w-32 h-24 md:h-32 bg-slate-100 dark:bg-white/5 rounded-t-3xl border-x-2 border-t-2 border-slate-200 dark:border-white/10 flex flex-col items-center justify-center">
               <span className="text-lg md:text-2xl font-black text-slate-500">{formatHours(topThree[1].total_seconds)}h</span>
            </div>
          </div>
        )}

        {topThree[0] && (
          <div className="order-1 md:order-2 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-20">
            <div className="relative">
              <Crown className="w-10 h-10 text-usp-gold absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" />
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-usp-gold/20 border-8 border-usp-gold shadow-2xl flex items-center justify-center overflow-hidden">
                 <User className="w-16 h-16 text-usp-gold" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-usp-gold rounded-full flex items-center justify-center text-white font-black text-lg shadow-xl">1º</div>
            </div>
            <div className="text-center">
              <p className="font-black text-slate-950 dark:text-white uppercase text-sm md:text-base truncate max-w-[150px]">{topThree[0].name}</p>
              <p className="text-[10px] font-bold text-usp-gold uppercase tracking-widest">{topThree[0].rank_name}</p>
            </div>
            <div className="w-32 md:w-40 h-32 md:h-48 bg-white dark:bg-sanfran-rubi/10 rounded-t-[2.5rem] border-x-4 border-t-4 border-usp-gold flex flex-col items-center justify-center shadow-2xl">
               <span className="text-2xl md:text-4xl font-black text-usp-gold">{formatHours(topThree[0].total_seconds)}h</span>
            </div>
          </div>
        )}

        {topThree[2] && (
          <div className="order-3 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-10">
            <div className="relative">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-orange-100 border-4 border-white shadow-xl flex items-center justify-center">
                <User className="w-8 h-8 text-orange-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-orange-300 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg">3º</div>
            </div>
            <div className="text-center">
              <p className="font-black text-slate-900 dark:text-white uppercase text-[10px] truncate max-w-[120px]">{topThree[2].name}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{topThree[2].rank_name}</p>
            </div>
            <div className="w-20 md:w-28 h-16 md:h-24 bg-orange-50 dark:bg-white/5 rounded-t-2xl border-x-2 border-t-2 border-orange-200 dark:border-white/10 flex flex-col items-center justify-center">
               <span className="text-base md:text-xl font-black text-orange-500">{formatHours(topThree[2].total_seconds)}h</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabela completa */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] p-4 md:p-8 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl overflow-hidden">
        <div className="space-y-3">
          {ranking.length === 0 && <div className="py-20 text-center opacity-30 italic font-black uppercase text-xs">Nenhum dado protocolado.</div>}
          {ranking.map((entry, idx) => (
            <div 
              key={entry.user_id} 
              className={`flex items-center justify-between p-5 rounded-3xl transition-all ${entry.user_id === userId ? 'bg-sanfran-rubi text-white shadow-xl scale-[1.02] z-10' : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}
            >
              <div className="flex items-center gap-6 min-w-0">
                <span className={`w-8 font-black text-lg ${entry.user_id === userId ? 'text-white' : 'text-slate-300'}`}>#{idx + 1}</span>
                <div className="flex items-center gap-3 min-w-0">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.user_id === userId ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/10'}`}>
                      <User size={20} className={entry.user_id === userId ? 'text-white' : 'text-slate-400'} />
                   </div>
                   <div className="truncate">
                      <p className="font-black uppercase text-xs md:text-sm tracking-tight truncate">{entry.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                         <TrendingUp size={10} className={entry.user_id === userId ? 'text-white' : 'text-sanfran-rubi'} />
                         <span className={`text-[9px] font-bold uppercase tracking-widest ${entry.user_id === userId ? 'text-white/80' : 'text-slate-400'}`}>Em Ascensão</span>
                      </div>
                   </div>
                </div>
              </div>
              <div className={`w-20 text-right font-black tabular-nums text-sm md:text-lg ${entry.user_id === userId ? 'text-white' : 'text-sanfran-rubi'}`}>
                {formatHours(entry.total_seconds)}<span className="text-[10px] font-bold ml-1">h</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center justify-center gap-2">
          <Clock size={12} /> Atualizado em tempo real • Pauta Aberta
        </p>
      </div>
    </div>
  );
};

export default Ranking;
