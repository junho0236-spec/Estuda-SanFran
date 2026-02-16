
import React, { useState, useEffect } from 'react';
import { Gavel, Languages, Play, RotateCcw, AlertTriangle, ShieldAlert, Siren, Trophy, ArrowRight, HeartCrack } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabaseClient';
import { LatinTerm } from '../types';

interface LatinGameProps {
  userId: string;
}

// Fallback terms caso o DB falhe ou esteja vazio
const FALLBACK_TERMS: LatinTerm[] = [
  { id: '1', term: 'Habeas Corpus', meaning: 'Que tenhas o corpo. Remédio constitucional para liberdade de locomoção.' },
  { id: '2', term: 'Fumus Boni Iuris', meaning: 'Fumaça do bom direito. Indício de veracidade do direito alegado.' },
  { id: '3', term: 'Periculum In Mora', meaning: 'Perigo na demora. Risco de dano pela demora processual.' },
  { id: '4', term: 'Pacta Sunt Servanda', meaning: 'Os pactos devem ser cumpridos. Força obrigatória dos contratos.' },
  { id: '5', term: 'In Dubio Pro Reo', meaning: 'Na dúvida, a favor do réu.' },
  { id: '6', term: 'Erga Omnes', meaning: 'Para todos. Efeito de lei ou decisão que atinge a todos.' },
  { id: '7', term: 'Ex Tunc', meaning: 'Desde então. Efeito retroativo.' },
  { id: '8', term: 'Ex Nunc', meaning: 'A partir de agora. Sem efeito retroativo.' },
];

const INSTANCES = [
  { id: 0, label: '1ª Instância', color: 'text-emerald-500', icon: Gavel },
  { id: 1, label: 'Recurso ao Tribunal', color: 'text-yellow-500', icon: AlertTriangle },
  { id: 2, label: 'Recurso Especial (STJ)', color: 'text-orange-500', icon: ShieldAlert },
  { id: 3, label: 'Recurso Extraordinário (STF)', color: 'text-red-500', icon: Siren },
  { id: 4, label: 'Trânsito em Julgado', color: 'text-slate-900 dark:text-slate-200', icon: HeartCrack },
];

const LatinGame: React.FC<LatinGameProps> = ({ userId }) => {
  const [terms, setTerms] = useState<LatinTerm[]>([]);
  const [currentTerm, setCurrentTerm] = useState<LatinTerm | null>(null);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won' | 'lost'>('start');
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('latin_terms').select('*');
      if (data && data.length > 0) {
        setTerms(data);
      } else {
        setTerms(FALLBACK_TERMS);
      }
    } catch (e) {
      setTerms(FALLBACK_TERMS);
    } finally {
      setLoading(false);
    }
  };

  const startGame = () => {
    const randomTerm = terms[Math.floor(Math.random() * terms.length)];
    setCurrentTerm(randomTerm);
    setGuessedLetters(new Set());
    setWrongGuesses(0);
    setGameState('playing');
  };

  const handleGuess = (letter: string) => {
    if (gameState !== 'playing' || !currentTerm) return;
    
    // Normaliza para ignorar acentos na comparação, mas mantém a letra original
    const termUpper = currentTerm.term.toUpperCase();
    const letterUpper = letter.toUpperCase();

    if (guessedLetters.has(letterUpper)) return;

    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letterUpper);
    setGuessedLetters(newGuessed);

    // Verifica se a letra existe (ignorando acentos e espaços)
    // Simples check: Se a letra está inclusa
    // Melhor: normalizar o termo e a letra
    const normalizedTerm = termUpper.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (!normalizedTerm.includes(letterUpper)) {
      const newWrong = wrongGuesses + 1;
      setWrongGuesses(newWrong);
      if (newWrong >= 4) {
        setGameState('lost');
      }
    } else {
      // Check Win Condition
      const isWin = termUpper.split('').every(char => {
        if (char === ' ') return true;
        const normChar = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return newGuessed.has(normChar);
      });

      if (isWin) {
        setGameState('won');
        setScore(prev => prev + 1);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        saveScore();
      }
    }
  };

  const saveScore = async () => {
    // Implementar lógica de salvar score no supabase se desejar
    try {
       await supabase.rpc('increment_score', { user_id: userId });
    } catch(e) {
       // Silent fail ou log
    }
  };

  // Teclado Virtual
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Renderizador da Palavra Oculta
  const renderWord = () => {
    if (!currentTerm) return null;
    return (
      <div className="flex flex-wrap justify-center gap-2 md:gap-4 my-8">
        {currentTerm.term.toUpperCase().split('').map((char, index) => {
          if (char === ' ') return <div key={index} className="w-4 md:w-8"></div>;
          
          const normChar = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const isRevealed = gameState === 'lost' || guessedLetters.has(normChar);
          
          return (
            <div key={index} className={`w-8 h-10 md:w-12 md:h-14 border-b-4 flex items-center justify-center text-xl md:text-3xl font-black transition-all ${isRevealed ? 'border-sanfran-rubi text-slate-900 dark:text-white' : 'border-slate-300 dark:border-white/20 text-transparent'}`}>
              {isRevealed ? char : '_'}
            </div>
          );
        })}
      </div>
    );
  };

  const CurrentInstance = INSTANCES[Math.min(wrongGuesses, 4)];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col max-w-4xl mx-auto">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-rose-100 dark:bg-rose-900/20 px-4 py-2 rounded-full border border-rose-200 dark:border-rose-800 mb-4">
              <Languages className="w-4 h-4 text-rose-700 dark:text-rose-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">Vocabulário Jurídico</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Latim Forense</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Descubra o termo antes do Trânsito em Julgado.</p>
        </div>
        
        <div className="bg-white dark:bg-white/5 px-6 py-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
           <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Processos Vencidos</p>
           <p className="text-2xl font-black text-usp-gold tabular-nums">{score}</p>
        </div>
      </header>

      {gameState === 'start' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
           <div className="w-32 h-32 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center shadow-2xl mb-8 border-4 border-sanfran-rubi animate-bounce-slow">
              <Gavel size={60} className="text-white dark:text-sanfran-rubiBlack" />
           </div>
           <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-4">Tribunal do Conhecimento</h3>
           <p className="text-slate-500 font-medium max-w-md mb-8">
             Você tem 4 instâncias para acertar o termo latino. Cada erro sobe o recurso. No 4º erro, ocorre o Trânsito em Julgado e o jogo acaba.
           </p>
           <button 
             onClick={startGame}
             className="px-12 py-5 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
           >
              <Play size={20} fill="currentColor" /> Iniciar Sessão
           </button>
        </div>
      )}

      {gameState !== 'start' && currentTerm && (
        <div className="flex-1 flex flex-col items-center w-full max-w-3xl mx-auto">
           
           {/* Instance Indicator (Lives) */}
           <div className="w-full mb-8">
              <div className="flex justify-between items-end mb-2 px-2">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status Processual</span>
                 <div className={`flex items-center gap-2 font-black uppercase text-xs ${CurrentInstance.color} animate-pulse`}>
                    <CurrentInstance.icon size={16} />
                    {CurrentInstance.label}
                 </div>
              </div>
              <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                 {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`flex-1 border-r border-white/20 transition-colors duration-500 ${wrongGuesses > i ? 'bg-red-500' : 'bg-transparent'}`}></div>
                 ))}
              </div>
           </div>

           {/* The Word */}
           <div className="w-full bg-white dark:bg-sanfran-rubiDark/20 rounded-[3rem] p-8 shadow-xl border border-slate-200 dark:border-sanfran-rubi/30 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] pointer-events-none"></div>
              {renderWord()}
              
              {(gameState === 'won' || gameState === 'lost') && (
                 <div className="mt-6 animate-in slide-in-from-bottom-4">
                    <p className="text-lg font-serif italic text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto">
                       "{currentTerm.meaning}"
                    </p>
                 </div>
              )}
           </div>

           {/* Keyboard */}
           {gameState === 'playing' && (
             <div className="mt-8 grid grid-cols-7 sm:grid-cols-9 gap-2 w-full">
                {alphabet.map(letter => {
                   const isGuessed = guessedLetters.has(letter);
                   return (
                      <button
                        key={letter}
                        disabled={isGuessed}
                        onClick={() => handleGuess(letter)}
                        className={`aspect-square rounded-xl font-black text-lg transition-all ${isGuessed ? 'bg-slate-100 dark:bg-white/5 text-slate-300 opacity-50 cursor-not-allowed' : 'bg-white dark:bg-sanfran-rubiDark/40 text-slate-800 dark:text-white shadow-md hover:bg-slate-50 hover:-translate-y-1 border border-slate-200 dark:border-white/10'}`}
                      >
                         {letter}
                      </button>
                   )
                })}
             </div>
           )}

           {/* Game Over Actions */}
           {(gameState === 'won' || gameState === 'lost') && (
              <div className="mt-10 flex gap-4 animate-in zoom-in-95">
                 {gameState === 'won' ? (
                    <div className="flex flex-col items-center gap-4">
                       <h3 className="text-3xl font-black text-emerald-500 uppercase tracking-tighter">Deferido!</h3>
                       <button onClick={startGame} className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                          <ArrowRight size={18} /> Próximo Termo
                       </button>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center gap-4">
                       <h3 className="text-3xl font-black text-red-500 uppercase tracking-tighter">Indeferido</h3>
                       <button onClick={startGame} className="px-10 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                          <RotateCcw size={18} /> Recorrer (Novo Jogo)
                       </button>
                    </div>
                 )}
              </div>
           )}

        </div>
      )}
    </div>
  );
};

export default LatinGame;
