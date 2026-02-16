
import React, { useState, useEffect, useMemo } from 'react';
import { Gamepad2, Trophy, Heart, Timer, RefreshCw, Scale, Gavel, CheckCircle2, XCircle, Play, Info, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabaseClient';

interface Sumula {
  id: string;
  court: 'STF' | 'STJ' | 'SV';
  number: string;
  text: string;
}

const SUMULAS_DATA: Sumula[] = [
  { id: '1', court: 'SV', number: '13', text: 'A nomeação de cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade, até o terceiro grau, inclusive, da autoridade nomeante ou de servidor da mesma pessoa jurídica investido em cargo de direção, chefia ou assessoramento, para o exercício de cargo em comissão ou de confiança ou, ainda, de função gratificada na administração pública direta e indireta em qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios, compreendida o ajuste mediante designações recíprocas, viola a Constituição Federal.' },
  { id: '2', court: 'SV', number: '11', text: 'Só é lícito o uso de algemas em casos de resistência e de fundado receio de fuga ou de perigo à integridade física própria ou alheia, por parte do preso ou de terceiros, justificada a excepcionalidade por escrito, sob pena de responsabilidade disciplinar, civil e penal do agente ou da autoridade e de nulidade da prisão ou do ato processual a que se refere, sem prejuízo da responsabilidade civil do Estado.' },
  { id: '3', court: 'STJ', number: '130', text: 'A empresa responde, perante o cliente, pela reparação de dano ou furto de veículo ocorridos em seu estacionamento.' },
  { id: '4', court: 'STF', number: '706', text: 'É relativa a nulidade decorrente da inobservância da competência penal por prevenção.' },
  { id: '5', court: 'STJ', number: '443', text: 'A estipulação de gratificação de desempenho em percentual fixo para servidores da ativa e em percentual inferior para aposentados e pensionistas viola o princípio da isonomia.' },
  { id: '6', court: 'SV', number: '37', text: 'Não cabe ao Poder Judiciário, que não tem função legislativa, aumentar vencimentos de servidores públicos sob o fundamento de isonomia.' },
  { id: '7', court: 'STJ', number: '387', text: 'É lícita a cumulação das indenizações de dano estético e dano moral.' },
  { id: '8', court: 'STF', number: '473', text: 'A administração pode anular seus próprios atos, quando eivados de vícios que os tornam ilegais, porque deles não se originam direitos; ou revogá-los, por motivo de conveniência ou oportunidade, respeitados os direitos adquiridos, e ressalvada, em todos os casos, a apreciação judicial.' },
  { id: '9', court: 'SV', number: '24', text: 'Não se tipifica crime material contra a ordem tributária antes do lançamento definitivo do tributo.' },
  { id: '10', court: 'STJ', number: '54', text: 'Os juros moratórios fluem a partir do evento danoso, em caso de responsabilidade extracontratual.' },
  { id: '11', court: 'STJ', number: '375', text: 'O reconhecimento da fraude à execução depende do registro da penhora do bem alienado ou da prova de má-fé do terceiro adquirente.' },
  { id: '12', court: 'SV', number: '14', text: 'É direito do defensor, no interesse do representado, ter acesso amplo aos elementos de prova que, já documentados em procedimento investigatório realizado por órgão com competência de polícia judiciária, digam respeito ao exercício do direito de defesa.' }
];

const SumulaChallenge: React.FC<{ userId: string; userName: string }> = ({ userId, userName }) => {
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'gameover'>('lobby');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<{
    correct: Sumula;
    options: string[];
    type: 'text_to_num' | 'num_to_text';
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [personalBest, setPersonalBest] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sanfran_sumula_pb');
    if (saved) setPersonalBest(parseInt(saved));
  }, []);

  const generateQuestion = () => {
    const isTextToNum = Math.random() > 0.5;
    const correct = SUMULAS_DATA[Math.floor(Math.random() * SUMULAS_DATA.length)];
    
    // Gerar opções erradas
    let pool = SUMULAS_DATA.filter(s => s.id !== correct.id);
    let wrongs = [];
    for(let i=0; i<3; i++) {
        const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        wrongs.push(isTextToNum ? `${pick.court} ${pick.number}` : pick.text);
    }
    
    const correctOption = isTextToNum ? `${correct.court} ${correct.number}` : correct.text;
    const options = [...wrongs, correctOption].sort(() => Math.random() - 0.5);

    setCurrentQuestion({
      correct,
      options,
      type: isTextToNum ? 'text_to_num' : 'num_to_text'
    });
    setTimeLeft(15);
    setFeedback(null);
  };

  const startGame = () => {
    setScore(0);
    setLives(3);
    setCombo(0);
    setGameState('playing');
    generateQuestion();
  };

  const handleAnswer = (option: string) => {
    if (feedback || gameState !== 'playing') return;

    const correctOption = currentQuestion?.type === 'text_to_num' 
      ? `${currentQuestion.correct.court} ${currentQuestion.correct.number}`
      : currentQuestion.correct.text;

    if (option === correctOption) {
      const bonus = combo * 50;
      setScore(prev => prev + 100 + bonus);
      setCombo(prev => prev + 1);
      setFeedback('correct');
      if (combo > 5) confetti({ particleCount: 50, spread: 30 });
      setTimeout(generateQuestion, 1000);
    } else {
      setLives(prev => prev - 1);
      setCombo(0);
      setFeedback('wrong');
      if (lives <= 1) {
        endGame();
      } else {
        setTimeout(generateQuestion, 1500);
      }
    }
  };

  const endGame = async () => {
    setGameState('gameover');
    if (score > personalBest) {
      setPersonalBest(score);
      localStorage.setItem('sanfran_sumula_pb', score.toString());
      confetti({ particleCount: 200, spread: 100 });
      
      // Tentar salvar no Supabase se as tabelas existirem
      try {
        await supabase.from('sumula_scores').insert({
          user_id: userId,
          user_name: userName || 'Doutor(a)',
          score: score
        });
      } catch (e) {
        console.warn("Leaderboard opcional não configurado.");
      }
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && !feedback) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing' && !feedback) {
      handleAnswer('TEMPO_ESGOTADO');
    }
  }, [gameState, timeLeft, feedback]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 max-w-4xl mx-auto h-full flex flex-col">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/20 px-4 py-2 rounded-full border border-orange-200 dark:border-orange-800 mb-4">
              <Gamepad2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Desafio Gamificado</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">O Jogo das Súmulas</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Memorize enunciados do STF e STJ jogando.</p>
        </div>
        <div className="bg-white dark:bg-white/5 px-6 py-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
           <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Recorde Pessoal</p>
           <p className="text-2xl font-black text-usp-gold tabular-nums">{personalBest}</p>
        </div>
      </header>

      {gameState === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12">
           <div className="w-32 h-32 bg-sanfran-rubi rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-3">
              <Gavel size={60} className="text-white" />
           </div>
           <div className="max-w-md space-y-4">
              <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white">Regras da Audiência</h3>
              <p className="text-slate-500 font-medium">Responda corretamente o número ou o texto da súmula antes que o prazo expire. Você tem 3 vidas.</p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                 <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <Timer size={20} className="mx-auto mb-2 text-sanfran-rubi" />
                    <p className="text-[10px] font-black uppercase">15 Segundos</p>
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <Heart size={20} className="mx-auto mb-2 text-red-500" />
                    <p className="text-[10px] font-black uppercase">3 Vidas</p>
                 </div>
              </div>
           </div>
           <button 
             onClick={startGame}
             className="px-12 py-5 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
           >
              <Play size={20} fill="currentColor" /> Iniciar Julgamento
           </button>
        </div>
      )}

      {gameState === 'playing' && currentQuestion && (
        <div className="flex-1 flex flex-col space-y-8 py-4 animate-in zoom-in-95 duration-500">
           {/* HUD */}
           <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                 <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl">
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Score</span>
                    <span className="text-2xl font-black tabular-nums">{score}</span>
                 </div>
                 {combo > 1 && (
                    <div className="bg-usp-blue text-white px-4 py-3 rounded-2xl animate-bounce">
                       <span className="text-[9px] font-black uppercase block">Combo</span>
                       <span className="text-xl font-black">x{combo}</span>
                    </div>
                 )}
              </div>
              
              <div className="flex items-center gap-6">
                 <div className="flex gap-2">
                    {[...Array(3)].map((_, i) => (
                       <Heart 
                         key={i} 
                         size={28} 
                         className={i < lives ? "text-red-500 fill-current" : "text-slate-200 dark:text-white/10"} 
                       />
                    ))}
                 </div>
                 <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                       <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-white/5" />
                       <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="176" strokeDashoffset={176 - (timeLeft / 15) * 176} className={`transition-all duration-1000 ${timeLeft < 5 ? 'text-red-500' : 'text-sanfran-rubi'}`} />
                    </svg>
                    <span className="text-xl font-black dark:text-white tabular-nums">{timeLeft}</span>
                 </div>
              </div>
           </div>

           {/* Pergunta */}
           <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 md:p-12 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="absolute top-0 left-0 w-full h-2 bg-slate-100 dark:bg-white/5">
                 <div className={`h-full bg-sanfran-rubi transition-all duration-1000`} style={{ width: `${(timeLeft/15)*100}%` }}></div>
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-6">
                 {currentQuestion.type === 'text_to_num' ? 'Identifique o Número do Enunciado' : 'Qual o conteúdo deste dispositivo?'}
              </span>
              <h4 className={`font-serif leading-relaxed ${currentQuestion.type === 'text_to_num' ? 'text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-200' : 'text-4xl md:text-6xl font-black text-sanfran-rubi'}`}>
                 {currentQuestion.type === 'text_to_num' ? `"${currentQuestion.correct.text}"` : `${currentQuestion.correct.court} ${currentQuestion.correct.number}`}
              </h4>
           </div>

           {/* Opções */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, idx) => {
                 const isCorrect = currentQuestion.type === 'text_to_num' 
                   ? option === `${currentQuestion.correct.court} ${currentQuestion.correct.number}`
                   : option === currentQuestion.correct.text;
                 
                 const btnFeedback = feedback && isCorrect ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-900/20' : 
                                   feedback && !isCorrect ? 'opacity-50 grayscale' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-sanfran-rubi dark:text-white';

                 return (
                    <button
                      key={idx}
                      disabled={!!feedback}
                      onClick={() => handleAnswer(option)}
                      className={`p-6 rounded-3xl border-b-4 font-black uppercase text-xs tracking-wider text-left transition-all hover:scale-[1.02] active:scale-95 shadow-lg flex items-center gap-4 ${btnFeedback}`}
                    >
                       <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                          {idx === 0 ? 'A' : idx === 1 ? 'B' : idx === 2 ? 'C' : 'D'}
                       </div>
                       <span className={`line-clamp-3 ${currentQuestion.type === 'num_to_text' ? 'normal-case font-serif text-sm' : ''}`}>{option}</span>
                    </button>
                 )
              })}
           </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
           <div className="relative">
              <Trophy size={100} className="text-usp-gold animate-bounce" />
              <div className="absolute -inset-4 bg-usp-gold blur-3xl opacity-20 -z-10"></div>
           </div>
           <div className="space-y-2">
              <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Fim de Sessão</h2>
              <p className="text-slate-400 font-black uppercase tracking-widest">Sentença Prolatada</p>
           </div>
           
           <div className="grid grid-cols-2 gap-8 w-full max-w-sm">
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/10">
                 <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Score Final</p>
                 <p className="text-4xl font-black text-sanfran-rubi">{score}</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/10">
                 <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Status</p>
                 <p className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">
                    {score >= personalBest ? 'Novo Recorde!' : 'Bom Trabalho'}
                 </p>
              </div>
           </div>

           <div className="flex flex-col md:flex-row gap-4 w-full max-w-sm pt-4">
              <button 
                onClick={startGame}
                className="flex-1 py-5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3"
              >
                <RefreshCw size={18} /> Apelar (Tentar Novamente)
              </button>
              <button 
                onClick={() => setGameState('lobby')}
                className="px-8 py-5 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                Sair
              </button>
           </div>
        </div>
      )}

      <footer className="text-center p-6 shrink-0 opacity-40">
         <div className="flex items-center justify-center gap-2 text-slate-400">
            <Info size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">OAB Challenge • Súmulas Essenciais</span>
         </div>
      </footer>
    </div>
  );
};

export default SumulaChallenge;
