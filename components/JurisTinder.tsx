
import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Info, RotateCcw, Check, X, Gavel, Scale } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { JurisTinderCard } from '../types';

// Mock data para fallback
const MOCK_CARDS: JurisTinderCard[] = [
  {
    id: '1',
    theme: 'Direito Constitucional',
    case_scenario: 'Município edita lei proibindo transporte privado individual de passageiros por aplicativos (ex: Uber).',
    is_procedent: false,
    ruling_summary: 'Inconstitucional. Viola a livre iniciativa e concorrência. Cabe à União legislar sobre trânsito e transporte.',
    source: 'STF ADPF 449'
  },
  {
    id: '2',
    theme: 'Direito Penal',
    case_scenario: 'Réu primário furtou 2 frascos de xampu (R$ 20). Juiz absolveu pelo princípio da insignificância.',
    is_procedent: true,
    ruling_summary: 'Correto. Presentes os requisitos: mínima ofensividade, nenhuma periculosidade social, reduzidíssimo grau de reprovabilidade.',
    source: 'STF HC 123.456'
  },
  {
    id: '3',
    theme: 'Direito do Consumidor',
    case_scenario: 'Plano de saúde nega cobertura de tratamento sob alegação de não constar no rol da ANS.',
    is_procedent: false,
    ruling_summary: 'Rol da ANS é exemplificativo em regra, mas recente decisão do STJ (EREsp 1886929) entendeu taxativo com exceções. Porém, lei 14.454/22 superou o entendimento: Rol Exemplificativo.',
    source: 'Lei 14.454/2022'
  },
  {
    id: '4',
    theme: 'Direito Tributário',
    case_scenario: 'Livros digitais (e-books) e suportes de leitura (Kindle) possuem imunidade tributária.',
    is_procedent: true,
    ruling_summary: 'Súmula Vinculante 57. A imunidade tributária estende-se aos livros eletrônicos e suportes exclusivos.',
    source: 'Súmula Vinculante 57'
  }
];

const JurisTinder: React.FC = () => {
  const [cards, setCards] = useState<JurisTinderCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // Stats
  const [streak, setStreak] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const { data } = await supabase.from('juris_tinder_cards').select('*');
      if (data && data.length > 0) {
        setCards(data.sort(() => Math.random() - 0.5));
      } else {
        setCards(MOCK_CARDS.sort(() => Math.random() - 0.5));
      }
    } catch (e) {
      setCards(MOCK_CARDS);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (showResult) return;

    setSwipeDirection(direction);
    const card = cards[currentIndex];
    
    // Left = Indeferido (false), Right = Deferido (true)
    const userGuess = direction === 'right';
    const correct = userGuess === card.is_procedent;

    setIsCorrect(correct);
    setTimeout(() => setShowResult(true), 300); // Delay para animação
    
    if (correct) setStreak(prev => prev + 1);
    else setStreak(0);
    
    setTotalAnswered(prev => prev + 1);
  };

  const nextCard = () => {
    setShowResult(false);
    setSwipeDirection(null);
    setCurrentIndex(prev => prev + 1);
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setStreak(0);
    setTotalAnswered(0);
    setCards(prev => [...prev].sort(() => Math.random() - 0.5));
    setShowResult(false);
    setSwipeDirection(null);
  };

  // Game Over / End of Deck
  if (currentIndex >= cards.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in zoom-in duration-500">
         <div className="w-24 h-24 bg-sanfran-rubi rounded-full flex items-center justify-center shadow-2xl">
            <Gavel size={48} className="text-white" />
         </div>
         <div className="text-center">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sessão Encerrada</h2>
            <p className="text-slate-500 font-bold mt-2">Pauta do dia concluída.</p>
         </div>
         <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 text-center min-w-[200px]">
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Streak Final</p>
            <p className="text-4xl font-black text-emerald-500">{streak}</p>
         </div>
         <button 
           onClick={resetGame}
           className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform"
         >
            <RotateCcw size={16} /> Reiniciar Pauta
         </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="h-full flex flex-col max-w-xl mx-auto pb-20 px-4 md:px-0">
      
      {/* HEADER */}
      <header className="flex items-center justify-between py-6 shrink-0">
         <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/20 p-2 rounded-xl">
               <ThumbsUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
               <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">O Veredito</h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tinder de Jurisprudência</p>
            </div>
         </div>
         <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-xs font-black text-slate-600 dark:text-slate-300">Streak: {streak}</span>
         </div>
      </header>

      {/* CARD AREA */}
      <div className="flex-1 relative flex flex-col justify-center items-center">
         
         {/* THE CARD */}
         <div className={`relative w-full aspect-[3/4] max-h-[500px] bg-white dark:bg-slate-900 rounded-[2.5rem] border-4 border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-500 ${
            swipeDirection === 'left' ? '-translate-x-[150%] -rotate-12 opacity-0' : 
            swipeDirection === 'right' ? 'translate-x-[150%] rotate-12 opacity-0' : ''
         }`}>
            
            {/* Card Header (Theme) */}
            <div className="bg-slate-50 dark:bg-white/5 p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-200 dark:bg-white/10 px-2 py-1 rounded">
                  {currentCard.theme}
               </span>
               <Scale size={16} className="text-slate-300" />
            </div>

            {/* Card Content */}
            <div className="flex-1 p-8 flex flex-col justify-center items-center text-center">
               <Gavel size={48} className="text-sanfran-rubi mb-6 opacity-20" />
               <p className="text-lg md:text-xl font-serif font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  "{currentCard.case_scenario}"
               </p>
            </div>

            {/* Instructions */}
            <div className="p-4 text-center opacity-40">
               <p className="text-[9px] font-black uppercase text-slate-400">Esquerda: Indeferido | Direita: Deferido</p>
            </div>
         </div>

         {/* RESULT OVERLAY (Feedback) */}
         {showResult && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
               <div className={`w-full h-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border-4 flex flex-col p-8 text-center ${isCorrect ? 'border-emerald-500' : 'border-red-500'}`}>
                  
                  <div className="flex-1 flex flex-col items-center justify-center">
                     <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {isCorrect ? <Check size={40} /> : <X size={40} />}
                     </div>
                     
                     <h3 className={`text-3xl font-black uppercase tracking-tighter mb-2 ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isCorrect ? 'Acertou!' : 'Errou!'}
                     </h3>
                     
                     <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/10 mt-4 w-full">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Decisão Real ({currentCard.is_procedent ? 'Procedente' : 'Improcedente'})</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">
                           {currentCard.ruling_summary}
                        </p>
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-2 text-slate-500">
                           <Info size={12} />
                           <span className="text-[9px] font-black uppercase">{currentCard.source}</span>
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={nextCard}
                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform"
                  >
                     Próximo Caso
                  </button>
               </div>
            </div>
         )}

      </div>

      {/* CONTROLS */}
      {!showResult && (
         <div className="flex justify-between items-center gap-6 mt-8 shrink-0">
            <button 
               onClick={() => handleSwipe('left')}
               className="flex-1 py-5 rounded-[2rem] border-4 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 font-black uppercase text-sm tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95 flex flex-col items-center gap-1"
            >
               <X size={24} />
               Indeferir
            </button>
            
            <button 
               onClick={() => handleSwipe('right')}
               className="flex-1 py-5 rounded-[2rem] border-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-black uppercase text-sm tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-95 flex flex-col items-center gap-1"
            >
               <Check size={24} />
               Deferir
            </button>
         </div>
      )}

    </div>
  );
};

export default JurisTinder;