
import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Target, Zap, Clock, Calendar, Users, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ClassWarStats } from '../types';

interface GuerraTurmasProps {
  userId: string;
}

const GuerraTurmas: React.FC<GuerraTurmasProps> = ({ userId }) => {
  const [stats, setStats] = useState<ClassWarStats[]>([]);
  const [myClassYear, setMyClassYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingYear, setSelectingYear] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    // 1. Get user's class year
    const { data: profile } = await supabase.from('profiles').select('class_year').eq('id', userId).single();
    if (profile?.class_year) {
      setMyClassYear(profile.class_year);
    } else {
      setSelectingYear(true);
    }

    // 2. Fetch Leaderboard View
    const { data: leaderboard, error } = await supabase.from('class_war_leaderboard').select('*');
    if (error) {
      console.error("Erro ao buscar leaderboard:", error);
    } else if (leaderboard) {
      setStats(leaderboard);
    }
    setLoading(false);
  };

  const handleSelectYear = async (year: number) => {
    try {
      await supabase.from('profiles').update({ class_year: year }).eq('id', userId);
      setMyClassYear(year);
      setSelectingYear(false);
      fetchData(); // Refresh to include user in new stats
    } catch (e) {
      alert("Erro ao salvar turma.");
    }
  };

  const calculateScore = (s: ClassWarStats) => {
    // Score Formula: (Hours * 100) + (Tasks * 50)
    const hours = s.total_seconds / 3600;
    return Math.round((hours * 100) + (s.total_tasks * 50));
  };

  const sortedStats = [...stats].sort((a, b) => calculateScore(b) - calculateScore(a));
  const topThree = sortedStats.slice(0, 3);
  const rest = sortedStats.slice(3);

  const myClassStats = sortedStats.find(s => s.class_year === myClassYear);
  const myRank = sortedStats.findIndex(s => s.class_year === myClassYear) + 1;

  if (selectingYear) {
    return (
      <div className="fixed inset-0 z-50 bg-[#9B111E] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 text-white">
        <div className="max-w-2xl w-full text-center space-y-8">
           <Trophy size={80} className="mx-auto text-yellow-400 animate-bounce" />
           <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">Escolha sua Lealdade</h1>
           <p className="text-xl font-bold opacity-90">Para participar da Guerra das Turmas, você precisa declarar seu ano de ingresso na SanFran.</p>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map(year => (
                 <button 
                   key={year}
                   onClick={() => handleSelectYear(year)}
                   className="py-6 bg-white/10 hover:bg-white text-white hover:text-[#9B111E] border-2 border-white/20 rounded-2xl font-black text-xl transition-all hover:scale-105"
                 >
                    {year}
                 </button>
              ))}
           </div>
           <p className="text-xs font-bold opacity-60 mt-8">Essa escolha é permanente para este ano letivo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/20 px-4 py-2 rounded-full border border-red-200 dark:border-red-800 mb-4">
              <Trophy className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Competição Perpétua</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Guerra das Turmas</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Qual ano domina as Arcadas? Estude para pontuar.</p>
        </div>
        
        {myClassYear && (
           <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4">
              <div className="text-right">
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Sua Bandeira</p>
                 <p className="text-2xl font-black leading-none">Turma {myClassYear}</p>
              </div>
              <div className="h-8 w-px bg-white/20 dark:bg-black/10"></div>
              <div className="text-right">
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Posição</p>
                 <p className="text-2xl font-black leading-none">#{myRank > 0 ? myRank : '-'}</p>
              </div>
           </div>
        )}
      </header>

      {/* PODIUM */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 min-h-[300px] py-10">
         {/* 2nd Place */}
         {topThree[1] && (
            <div className="flex flex-col items-center w-full md:w-1/3 order-2 md:order-1 animate-in slide-in-from-bottom-8 duration-700 delay-100">
               <div className="text-center mb-4">
                  <p className="text-xl font-black text-slate-400 uppercase tracking-tighter">Turma {topThree[1].class_year}</p>
                  <p className="text-sm font-bold text-slate-500">{calculateScore(topThree[1]).toLocaleString()} pts</p>
               </div>
               <div className="w-full h-40 bg-slate-200 dark:bg-white/10 rounded-t-[2.5rem] border-x-4 border-t-4 border-slate-300 dark:border-white/5 flex items-center justify-center relative">
                  <span className="text-6xl font-black text-slate-400 opacity-50">2</span>
               </div>
            </div>
         )}

         {/* 1st Place */}
         {topThree[0] && (
            <div className="flex flex-col items-center w-full md:w-1/3 order-1 md:order-2 z-10 animate-in slide-in-from-bottom-12 duration-700">
               <Crown size={48} className="text-yellow-400 mb-2 animate-bounce" fill="currentColor" />
               <div className="text-center mb-4">
                  <p className="text-3xl font-black text-yellow-500 uppercase tracking-tighter drop-shadow-sm">Turma {topThree[0].class_year}</p>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{calculateScore(topThree[0]).toLocaleString()} pts</p>
               </div>
               <div className="w-full h-56 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-[2.5rem] shadow-2xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                  <span className="text-8xl font-black text-white relative z-10">1</span>
               </div>
            </div>
         )}

         {/* 3rd Place */}
         {topThree[2] && (
            <div className="flex flex-col items-center w-full md:w-1/3 order-3 animate-in slide-in-from-bottom-8 duration-700 delay-200">
               <div className="text-center mb-4">
                  <p className="text-xl font-black text-orange-400 uppercase tracking-tighter">Turma {topThree[2].class_year}</p>
                  <p className="text-sm font-bold text-slate-500">{calculateScore(topThree[2]).toLocaleString()} pts</p>
               </div>
               <div className="w-full h-28 bg-orange-100 dark:bg-orange-900/20 rounded-t-[2.5rem] border-x-4 border-t-4 border-orange-200 dark:border-orange-800 flex items-center justify-center relative">
                  <span className="text-5xl font-black text-orange-300 opacity-50">3</span>
               </div>
            </div>
         )}
      </div>

      {/* DETAILED STATS & LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* List */}
         <div className="lg:col-span-2 bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] p-8 border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
            <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-6">Classificação Geral</h3>
            <div className="space-y-3">
               {sortedStats.map((stat, idx) => (
                  <div key={stat.class_year} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${stat.class_year === myClassYear ? 'bg-[#9B111E]/10 border-[#9B111E] scale-[1.02]' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5'}`}>
                     <div className="flex items-center gap-4">
                        <span className={`text-lg font-black w-8 text-center ${idx < 3 ? 'text-yellow-500' : 'text-slate-400'}`}>#{idx + 1}</span>
                        <div>
                           <p className="font-black text-slate-900 dark:text-white uppercase">Turma {stat.class_year}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.student_count} Combatentes</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="font-black text-lg text-slate-900 dark:text-white tabular-nums">{calculateScore(stat).toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pontos</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Rules & Info */}
         <div className="space-y-6">
            <div className="bg-slate-900 dark:bg-white p-8 rounded-[2.5rem] shadow-xl text-white dark:text-slate-900">
               <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                  <Target /> Como Pontuar
               </h3>
               <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/20 dark:border-black/10 pb-2">
                     <span className="font-bold text-sm">1 Hora de Estudo</span>
                     <span className="font-black text-yellow-400 dark:text-yellow-600">+100 pts</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/20 dark:border-black/10 pb-2">
                     <span className="font-bold text-sm">1 Tarefa Concluída</span>
                     <span className="font-black text-yellow-400 dark:text-yellow-600">+50 pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="font-bold text-sm">Recruta (Novo Aluno)</span>
                     <span className="font-black text-yellow-400 dark:text-yellow-600">+10 pts</span>
                  </div>
               </div>
            </div>

            <div className="bg-[#9B111E] text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
               <div className="absolute -right-6 -bottom-6 opacity-20 rotate-12">
                  <Zap size={120} />
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Sua Contribuição</p>
               <h3 className="text-4xl font-black uppercase leading-none">Lute pela Glória</h3>
               <p className="text-sm font-medium mt-4 leading-relaxed opacity-90 max-w-[200px]">
                  Cada minuto focado no cronômetro ajuda sua turma a subir no ranking. Não deixe os veteranos vencerem.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default GuerraTurmas;
