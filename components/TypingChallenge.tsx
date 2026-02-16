
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Keyboard, Play, RotateCcw, Trophy, Timer, Target } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface TypingChallengeProps {
  userId: string;
  userName: string;
}

const TEXTS = [
  {
    id: 'cf88_preambulo',
    title: 'Preâmbulo da Constituição Federal de 1988',
    content: "Nós, representantes do povo brasileiro, reunidos em Assembléia Nacional Constituinte para instituir um Estado Democrático, destinado a assegurar o exercício dos direitos sociais e individuais, a liberdade, a segurança, o bem-estar, o desenvolvimento, a igualdade e a justiça como valores supremos de uma sociedade fraterna, pluralista e sem preconceitos, fundada na harmonia social e comprometida, na ordem interna e internacional, com a solução pacífica das controvérsias, promulgamos, sob a proteção de Deus, a seguinte CONSTITUIÇÃO DA REPÚBLICA FEDERATIVA DO BRASIL."
  },
  {
    id: 'kelsen_pura',
    title: 'Hans Kelsen - Teoria Pura do Direito',
    content: "A Teoria Pura do Direito é uma teoria do Direito positivo. Do Direito positivo em geral, não de uma ordem jurídica especial. É teoria geral do Direito, não interpretação de normas jurídicas particulares, nacionais ou internacionais. Como teoria, quer única e exclusivamente conhecer o seu próprio objeto. Procura responder a esta questão: o que é e como é o Direito? Não lhe importa a questão de saber como deve ser o Direito, ou como deve ele ser feito. É ciência jurídica e não política do Direito."
  },
  {
    id: 'reale_tridimensional',
    title: 'Miguel Reale - Teoria Tridimensional',
    content: "O Direito não é nem pura norma, nem puro fato, nem puro valor, mas sim a integração normativa de fatos segundo valores. Onde quer que haja um fenômeno jurídico, há, sempre e necessariamente, um fato subjacente (fato econômico, geográfico, demográfico, de ordem técnica, etc.); um valor, que confere determinada significação a esse fato, inclinando ou determinando a ação dos homens no sentido de atingir ou preservar certa finalidade ou objetivo; e, finalmente, uma regra ou norma, que representa a relação ou medida que integra um daqueles elementos ao outro: o fato ao valor."
  }
];

const TypingChallenge: React.FC<TypingChallengeProps> = ({ userId, userName }) => {
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'finished'>('lobby');
  const [selectedTextIndex, setSelectedTextIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [topScores, setTopScores] = useState<any[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input automatically when playing
  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState]);

  // Load Leaderboard
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data } = await supabase
        .from('typing_scores')
        .select('*')
        .order('wpm', { ascending: false })
        .limit(5);
      
      if (data) setTopScores(data);
    } catch (e) {
      console.warn("Tabela typing_scores ainda não criada.");
    }
  };

  const handleStart = () => {
    setInputValue('');
    setStartTime(Date.now());
    setGameState('playing');
    setWpm(0);
    setAccuracy(100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const targetText = TEXTS[selectedTextIndex].content;
    
    setInputValue(value);

    // Calculate Stats Realtime
    if (startTime) {
      const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
      const wordsTyped = value.length / 5;
      const currentWpm = Math.round(wordsTyped / timeElapsed) || 0;
      setWpm(currentWpm);

      // Accuracy
      let correctChars = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] === targetText[i]) correctChars++;
      }
      const acc = Math.round((correctChars / value.length) * 100) || 100;
      setAccuracy(acc);
    }

    // Check Finish
    if (value === targetText) {
      finishGame();
    }
  };

  const finishGame = async () => {
    setGameState('finished');
    const finalTime = (Date.now() - (startTime || 0)) / 1000 / 60;
    const finalWpm = Math.round((TEXTS[selectedTextIndex].content.length / 5) / finalTime);
    
    // Save Score
    try {
      await supabase.from('typing_scores').insert({
        user_id: userId,
        user_name: userName || 'Jurista Anônimo',
        wpm: finalWpm,
        accuracy: accuracy,
        text_source: TEXTS[selectedTextIndex].title
      });
      fetchLeaderboard();
    } catch (e) {
      console.error("Erro ao salvar score", e);
    }
  };

  // Render Text with highlighting
  const renderText = () => {
    const targetText = TEXTS[selectedTextIndex].content;
    const chars = targetText.split('');
    
    return chars.map((char, index) => {
      let className = "text-slate-300 transition-colors duration-200";
      if (index < inputValue.length) {
        if (inputValue[index] === char) {
          className = "text-slate-900 dark:text-white font-bold";
        } else {
          className = "text-red-500 bg-red-100 dark:bg-red-900/30";
        }
      }
      // Cursor effect
      const isCursor = index === inputValue.length;
      
      return (
        <span key={index} className={`${className} ${isCursor ? 'border-l-2 border-sanfran-rubi animate-pulse' : ''}`}>
          {char}
        </span>
      );
    });
  };

  // Auto-scroll logic (Printer effect)
  const scrollStyle = useMemo(() => {
    if (gameState !== 'playing') return {};
    const targetText = TEXTS[selectedTextIndex].content;
    const progress = inputValue.length / targetText.length;
    const translateY = Math.max(0, (progress * 100) - 10); 
    return { transform: `translateY(-${translateY}%)` };
  }, [inputValue, gameState, selectedTextIndex]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 max-w-5xl mx-auto h-full flex flex-col font-serif">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 font-sans">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/20 mb-4">
              <Keyboard className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Datilografia Forense</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Desafio de Redação</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Agilidade na produção de peças jurídicas.</p>
        </div>
        
        {gameState === 'playing' && (
           <div className="flex gap-4">
              <div className="bg-white dark:bg-white/5 px-6 py-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg text-center min-w-[100px]">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">WPM</p>
                 <p className="text-3xl font-black text-sanfran-rubi tabular-nums">{wpm}</p>
              </div>
              <div className="bg-white dark:bg-white/5 px-6 py-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg text-center min-w-[100px]">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Precisão</p>
                 <p className="text-3xl font-black text-emerald-500 tabular-nums">{accuracy}%</p>
              </div>
           </div>
        )}
      </header>

      {gameState === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 font-sans">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
                 <h3 className="text-lg font-black uppercase flex items-center gap-2 mb-6">
                    <Trophy className="text-usp-gold" /> Ranking de Velocidade
                 </h3>
                 <div className="space-y-3">
                    {topScores.map((score, idx) => (
                       <div key={score.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-3">
                             <span className="font-black text-slate-300 w-4">#{idx+1}</span>
                             <span className="font-bold text-sm truncate max-w-[150px]">{score.user_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-black text-emerald-500">{score.accuracy}%</span>
                             <span className="text-sm font-black text-sanfran-rubi">{score.wpm} WPM</span>
                          </div>
                       </div>
                    ))}
                    {topScores.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Seja o primeiro a bater o recorde.</p>}
                 </div>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-center">
                 <h3 className="text-lg font-black uppercase mb-6">Selecionar Texto</h3>
                 <div className="space-y-2 mb-8">
                    {TEXTS.map((t, idx) => (
                       <button 
                         key={t.id}
                         onClick={() => setSelectedTextIndex(idx)}
                         className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedTextIndex === idx ? 'border-sanfran-rubi bg-white/10' : 'border-white/10 hover:bg-white/5'}`}
                       >
                          <p className="font-bold text-sm">{t.title}</p>
                       </button>
                    ))}
                 </div>
                 <button 
                   onClick={handleStart}
                   className="w-full py-4 bg-sanfran-rubi hover:bg-sanfran-rubiDark text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                 >
                    <Play size={16} fill="currentColor" /> Iniciar Teste
                 </button>
              </div>
           </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
           <div className="w-full max-w-3xl h-[60vh] bg-[#fdfbf7] dark:bg-[#1a1a1a] shadow-2xl rounded-sm border-x-8 border-slate-200 dark:border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')] z-10"></div>
              
              <div 
                ref={containerRef}
                className="p-12 transition-transform duration-500 ease-out"
                style={scrollStyle}
              >
                 <p className="font-mono text-2xl md:text-3xl leading-relaxed whitespace-pre-wrap break-words">
                    {renderText()}
                 </p>
              </div>

              <textarea 
                 ref={inputRef}
                 value={inputValue}
                 onChange={handleInputChange}
                 className="absolute inset-0 opacity-0 cursor-default z-20 resize-none"
                 autoFocus
                 spellCheck={false}
              />

              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fdfbf7] dark:from-[#1a1a1a] to-transparent z-10 pointer-events-none"></div>
           </div>
           
           <p className="mt-6 text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
              Continue digitando...
           </p>
        </div>
      )}

      {gameState === 'finished' && (
         <div className="flex-1 flex flex-col items-center justify-center text-center font-sans animate-in zoom-in-95">
            <div className="mb-8 relative">
               <div className="absolute -inset-4 bg-emerald-500 blur-3xl opacity-20"></div>
               <Target size={80} className="text-emerald-500 relative z-10" />
            </div>
            <h2 className="text-5xl font-black uppercase text-slate-900 dark:text-white leading-none mb-2">Desafio Concluído</h2>
            <p className="text-slate-500 font-bold mb-10">Texto integralmente transcrito.</p>

            <div className="grid grid-cols-2 gap-6 w-full max-w-md mb-10">
               <div className="p-6 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-xl">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Velocidade Final</p>
                  <p className="text-4xl font-black text-sanfran-rubi">{wpm} <span className="text-sm text-slate-400">WPM</span></p>
               </div>
               <div className="p-6 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-xl">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Precisão</p>
                  <p className="text-4xl font-black text-emerald-500">{accuracy}<span className="text-sm">%</span></p>
               </div>
            </div>

            <div className="flex gap-4">
               <button 
                 onClick={() => setGameState('lobby')}
                 className="px-8 py-4 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-300 transition-colors"
               >
                  Menu Principal
               </button>
               <button 
                 onClick={handleStart}
                 className="px-8 py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
               >
                  <RotateCcw size={16} /> Tentar Novamente
               </button>
            </div>
         </div>
      )}

    </div>
  );
};

export default TypingChallenge;
    