
import React, { useState, useEffect, useMemo } from 'react';
import { Sword, Trophy, Shield, Zap, Timer, CheckCircle2, XCircle, Gavel, User, Scale } from 'lucide-react';
import { Duel, DuelQuestion } from '../types';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface DuelArenaProps {
  duel: Duel;
  userId: string;
  onFinished: () => void;
}

const DuelArena: React.FC<DuelArenaProps> = ({ duel: initialDuel, userId, onFinished }) => {
  const [duel, setDuel] = useState<Duel>(initialDuel);
  const [timeLeft, setTimeLeft] = useState(15);
  const [answered, setAnswered] = useState(false);
  const [showFeedback, setShowFeedback] = useState<number | null>(null); // index da opção escolhida
  const [startTime, setStartTime] = useState<number>(Date.now());

  const isChallenger = userId === duel.challenger_id;
  const myProgress = isChallenger ? duel.challenger_progress : duel.opponent_progress;
  const opponentProgress = isChallenger ? duel.opponent_progress : duel.challenger_progress;
  
  const currentQuestion = duel.questions[myProgress];
  const isGameOver = duel.status === 'finished' || (duel.challenger_progress >= 5 && duel.opponent_progress >= 5);

  useEffect(() => {
    const channel = supabase.channel(`duel_session_${duel.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${duel.id}` }, (payload) => {
        setDuel(payload.new as Duel);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [duel.id]);

  useEffect(() => {
    if (!isGameOver && !answered && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !answered) {
      handleAnswer(-1); // Timeout
    }
  }, [timeLeft, answered, isGameOver]);

  const handleAnswer = async (optionIdx: number) => {
    if (answered || isGameOver) return;
    
    setAnswered(true);
    setShowFeedback(optionIdx);
    
    const isCorrect = optionIdx === currentQuestion.answer;
    const timeTaken = (Date.now() - startTime) / 1000;
    const speedBonus = isCorrect ? Math.max(0, Math.round((15 - timeTaken) * 3)) : 0;
    const points = isCorrect ? (100 + speedBonus) : 0;

    const newProgress = myProgress + 1;
    const newScore = (isChallenger ? duel.challenger_score : duel.opponent_score) + points;

    const updatePayload: any = isChallenger 
      ? { challenger_progress: newProgress, challenger_score: newScore }
      : { opponent_progress: newProgress, opponent_score: newScore };

    // Se ambos terminaram, finaliza
    if (newProgress >= 5 && opponentProgress >= 5) {
      updatePayload.status = 'finished';
      const finalOpponentScore = isChallenger ? duel.opponent_score : duel.challenger_score;
      if (newScore > finalOpponentScore) updatePayload.winner_id = userId;
      else if (newScore < finalOpponentScore) updatePayload.winner_id = isChallenger ? duel.opponent_id : duel.challenger_id;
    }

    try {
      await supabase.from('duels').update(updatePayload).eq('id', duel.id);
      
      // Delay suave para a próxima questão
      setTimeout(() => {
        setAnswered(false);
        setShowFeedback(null);
        setTimeLeft(15);
        setStartTime(Date.now());
      }, 2000);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (duel.status === 'finished' && duel.winner_id === userId) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [duel.status, duel.winner_id, userId]);

  if (isGameOver) {
    const winnerName = duel.winner_id === duel.challenger_id ? duel.challenger_name : 
                     duel.winner_id === duel.opponent_id ? duel.opponent_name : 'Empate';
    const amIWinner = duel.winner_id === userId;

    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
         <div className="relative">
            <Trophy size={100} className={amIWinner ? "text-usp-gold animate-bounce" : "text-slate-300"} />
            <div className={`absolute -inset-4 ${amIWinner ? 'bg-usp-gold' : 'bg-slate-400'} blur-3xl opacity-20 -z-10`}></div>
         </div>
         
         <div>
            <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Veredito Final</h2>
            <p className="text-slate-400 font-black uppercase tracking-widest mt-2">{amIWinner ? 'Vitória na Lide!' : duel.winner_id ? 'Derrota Processual' : 'Empate Técnico'}</p>
         </div>

         <div className="grid grid-cols-2 gap-8 w-full max-w-md">
            <div className={`p-6 rounded-[2.5rem] border-2 ${isChallenger ? 'border-sanfran-rubi bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5'}`}>
               <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{duel.challenger_name}</p>
               <p className="text-3xl font-black text-slate-900 dark:text-white">{duel.challenger_score}</p>
            </div>
            <div className={`p-6 rounded-[2.5rem] border-2 ${!isChallenger ? 'border-sanfran-rubi bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5'}`}>
               <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{duel.opponent_name}</p>
               <p className="text-3xl font-black text-slate-900 dark:text-white">{duel.opponent_score}</p>
            </div>
         </div>

         <button 
           onClick={onFinished}
           className="px-12 py-5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:scale-105 transition-all"
         >
            Retornar ao Largo
         </button>
      </div>
    );
  }

  // Se eu terminei mas o outro não: Tela de Espera
  if (myProgress >= 5) {
     return (
        <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
           <div className="w-20 h-20 border-4 border-sanfran-rubi border-t-transparent rounded-full animate-spin"></div>
           <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-white">Aguardando Conclusão do Adverso</h2>
           <p className="text-slate-500 font-bold max-w-xs">Você protocolou suas 5 respostas. Aguarde o oponente finalizar para o veredito.</p>
           <div className="bg-white dark:bg-white/5 px-8 py-4 rounded-2xl border border-slate-200 dark:border-white/10">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Sua Pontuação</span>
              <span className="text-3xl font-black text-sanfran-rubi">{isChallenger ? duel.challenger_score : duel.opponent_score}</span>
           </div>
        </div>
     );
  }

  return (
    <div className="h-full flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
       {/* HUD COMBATE */}
       <div className="flex items-center justify-between gap-4 shrink-0">
          {/* Lado A (Challenger) */}
          <div className={`flex-1 p-4 rounded-3xl border-2 transition-all ${isChallenger ? 'border-sanfran-rubi bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                   <User size={18} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                   <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest truncate">{duel.challenger_name}</p>
                   <div className="flex items-center gap-1">
                      <Zap size={10} className="text-usp-gold" />
                      <span className="text-lg font-black tabular-nums">{duel.challenger_score}</span>
                   </div>
                </div>
             </div>
             <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-sanfran-rubi transition-all duration-500" style={{ width: `${(duel.challenger_progress/5)*100}%` }} />
             </div>
          </div>

          <div className="flex flex-col items-center">
             <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center border-4 border-white dark:border-sanfran-rubiBlack shadow-lg z-10">
                <Scale size={20} />
             </div>
             <div className="h-4 w-px bg-slate-200 dark:bg-white/10"></div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VS</div>
          </div>

          {/* Lado B (Opponent) */}
          <div className={`flex-1 p-4 rounded-3xl border-2 transition-all ${!isChallenger ? 'border-sanfran-rubi bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
             <div className="flex items-center justify-end gap-3">
                <div className="text-right min-w-0">
                   <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest truncate">{duel.opponent_name}</p>
                   <div className="flex items-center justify-end gap-1">
                      <span className="text-lg font-black tabular-nums">{duel.opponent_score}</span>
                      <Zap size={10} className="text-usp-gold" />
                   </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                   <User size={18} className="text-slate-500" />
                </div>
             </div>
             <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-sanfran-rubi transition-all duration-500 ml-auto" style={{ width: `${(duel.opponent_progress/5)*100}%` }} />
             </div>
          </div>
       </div>

       {/* ARENA DE QUESTÃO */}
       <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full space-y-8">
          
          <div className="w-full flex items-center justify-between px-4">
             <div className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                Petição {myProgress + 1} de 5
             </div>
             <div className="flex items-center gap-2">
                <Timer size={16} className={timeLeft < 5 ? "text-red-500 animate-pulse" : "text-slate-400"} />
                <span className={`text-xl font-black tabular-nums ${timeLeft < 5 ? "text-red-600" : "text-slate-600 dark:text-slate-400"}`}>{timeLeft}s</span>
             </div>
          </div>

          <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 md:p-12 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl w-full text-center relative overflow-hidden min-h-[280px] flex flex-col justify-center">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-white/5">
                <div className="h-full bg-sanfran-rubi transition-all duration-1000" style={{ width: `${(timeLeft/15)*100}%` }} />
             </div>
             <span className="text-[10px] font-black uppercase text-sanfran-rubi tracking-[0.3em] mb-4 block">{currentQuestion.category}</span>
             <h3 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white leading-tight">
                "{currentQuestion.question}"
             </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
             {currentQuestion.options.map((opt, idx) => {
                const isCorrect = idx === currentQuestion.answer;
                const isSelected = showFeedback === idx;
                
                let btnStyle = 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-sanfran-rubi';
                if (showFeedback !== null) {
                   if (isCorrect) btnStyle = 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-900/20 scale-105 z-10';
                   else if (isSelected) btnStyle = 'bg-red-500 border-red-600 text-white opacity-100';
                   else btnStyle = 'opacity-40 grayscale pointer-events-none';
                }

                return (
                   <button
                     key={idx}
                     disabled={answered}
                     onClick={() => handleAnswer(idx)}
                     className={`p-6 rounded-3xl border-b-4 text-left font-bold text-sm transition-all flex items-center gap-4 ${btnStyle}`}
                   >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isSelected ? 'bg-white text-black' : 'bg-slate-100 dark:bg-white/10'}`}>
                         {idx === 0 ? 'A' : idx === 1 ? 'B' : idx === 2 ? 'C' : 'D'}
                      </div>
                      <span className="leading-tight">{opt}</span>
                      {showFeedback !== null && isCorrect && <CheckCircle2 className="ml-auto w-5 h-5 text-white" />}
                      {showFeedback !== null && isSelected && !isCorrect && <XCircle className="ml-auto w-5 h-5 text-white" />}
                   </button>
                )
             })}
          </div>
       </div>

       <footer className="text-center opacity-40">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
             <Gavel size={12} /> Juízo Singular Coletivo • SanFran
          </p>
       </footer>
    </div>
  );
};

export default DuelArena;
