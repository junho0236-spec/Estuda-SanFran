
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, RotateCcw, Zap, Book, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Question {
  id: string;
  text: string;
  isTrue: boolean;
  explanation: string;
}

const QUESTIONS: Question[] = [
  { id: '1', text: 'O advogado pode anunciar seus serviços em rádio e televisão.', isTrue: false, explanation: 'Vedado pelo Código de Ética (Art. 40, III). Publicidade deve ser discreta e informativa.' },
  { id: '2', text: 'É permitida a cobrança de honorários advocatícios através de cartão de crédito.', isTrue: true, explanation: 'Permitido pelo Art. 53 do Código de Ética e Disciplina.' },
  { id: '3', text: 'O estagiário inscrito na OAB pode assinar petições de juntada isoladamente.', isTrue: true, explanation: 'Sim, atos extrajudiciais e de mero expediente (como juntada) podem ser assinados isoladamente pelo estagiário (Art. 29, §1º Regulamento Geral).' },
  { id: '4', text: 'O advogado substabelecido com reserva de poderes pode cobrar honorários sem intervenção do substabelecente.', isTrue: false, explanation: 'O substabelecido com reserva não pode cobrar honorários sem a intervenção daquele que lhe conferiu o substabelecimento (Art. 26 CED).' },
  { id: '5', text: 'É infração disciplinar reter autos abusivamente.', isTrue: true, explanation: 'Sim, constitui infração disciplinar nos termos do Art. 34, XXII do Estatuto da OAB.' },
  { id: '6', text: 'O sigilo profissional cede em face de defesa própria do advogado.', isTrue: true, explanation: 'O advogado pode quebrar o sigilo para sua própria defesa em processo disciplinar ou judicial (Art. 37 CED).' },
  { id: '7', text: 'Advogado pode atuar como preposto do cliente na mesma causa.', isTrue: false, explanation: 'É vedado ao advogado funcionar no mesmo processo, simultaneamente, como patrono e preposto (Art. 25 CED).' },
  { id: '8', text: 'A incompatibilidade permanece mesmo após o licenciamento do cargo impeditivo.', isTrue: false, explanation: 'A incompatibilidade cessa com o afastamento definitivo ou licenciamento (salvo casos específicos de magistrados/MP).' },
  { id: '9', text: 'O advogado pode se recusar a depor como testemunha sobre fato relacionado a cliente.', isTrue: true, explanation: 'É direito do advogado recusar-se a depor (Art. 7º, XIX do Estatuto).' },
  { id: '10', text: 'A advocacia pro bono pode ser utilizada para fins político-partidários.', isTrue: false, explanation: 'A advocacia pro bono não pode ser utilizada para fins político-partidários ou eleitorais (Art. 30, § 2º CED).' }
];

const EticaBlitz: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'feedback' | 'finished'>('playing');
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    setShuffledQuestions([...QUESTIONS].sort(() => Math.random() - 0.5));
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setGameState('playing');
  };

  const handleAnswer = (userSaysTrue: boolean) => {
    const question = shuffledQuestions[currentIdx];
    const isCorrect = userSaysTrue === question.isTrue;

    setLastAnswerCorrect(isCorrect);
    if (isCorrect) {
      setScore(s => s + 1);
      setStreak(s => s + 1);
      if (streak > 2) confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    } else {
      setStreak(0);
    }
    setGameState('feedback');
  };

  const nextQuestion = () => {
    if (currentIdx + 1 >= shuffledQuestions.length) {
      setGameState('finished');
      if (score === shuffledQuestions.length) confetti({ particleCount: 200, spread: 100 });
    } else {
      setCurrentIdx(p => p + 1);
      setGameState('playing');
    }
  };

  const currentQuestion = shuffledQuestions[currentIdx];

  if (gameState === 'finished') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95">
        <div className="w-24 h-24 bg-sanfran-rubi rounded-full flex items-center justify-center shadow-2xl">
           <Award size={48} className="text-white" />
        </div>
        <div>
           <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sessão Finalizada</h2>
           <p className="text-slate-500 font-bold mt-2">Você acertou {score} de {shuffledQuestions.length} questões.</p>
        </div>
        <button 
          onClick={startNewGame}
          className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
        >
           <RotateCcw size={16} /> Nova Blitz
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-xl mx-auto pb-20 px-4 md:px-0">
      
      {/* HEADER */}
      <div className="flex items-center justify-between py-6 shrink-0">
         <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-xl">
               <ShieldCheck className="w-6 h-6 text-sanfran-rubi" />
            </div>
            <div>
               <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Ética Blitz</h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OAB • Estatuto & Código</p>
            </div>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Streak</p>
            <div className="flex items-center justify-end gap-1 text-orange-500">
               <Zap size={14} fill="currentColor" />
               <span className="text-xl font-black tabular-nums">{streak}</span>
            </div>
         </div>
      </div>

      {/* CARD PRINCIPAL */}
      <div className="flex-1 flex flex-col justify-center">
         <div className="relative w-full aspect-[4/3] bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] border-4 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl flex flex-col p-8 text-center justify-center overflow-hidden">
            
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-100 dark:bg-white/5">
               <div className="h-full bg-sanfran-rubi transition-all duration-300" style={{ width: `${((currentIdx + 1) / shuffledQuestions.length) * 100}%` }}></div>
            </div>

            {gameState === 'feedback' ? (
               <div className="animate-in zoom-in duration-300 flex flex-col items-center h-full justify-between">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${lastAnswerCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                     {lastAnswerCorrect ? <Check size={32} /> : <X size={32} />}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center">
                     <h3 className={`text-2xl font-black uppercase tracking-tight mb-2 ${lastAnswerCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                        {lastAnswerCorrect ? 'Correto!' : 'Incorreto!'}
                     </h3>
                     <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5 text-left">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1"><Book size={10} /> Fundamentação</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">
                           {currentQuestion.explanation}
                        </p>
                     </div>
                  </div>

                  <button onClick={nextQuestion} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest mt-6">
                     Próxima Questão
                  </button>
               </div>
            ) : (
               <div className="h-full flex flex-col justify-center items-center animate-in fade-in">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Afirmação</span>
                  <h3 className="text-xl md:text-2xl font-serif font-bold text-slate-900 dark:text-white leading-relaxed">
                     "{currentQuestion.text}"
                  </h3>
               </div>
            )}
         </div>
      </div>

      {/* CONTROLS */}
      {gameState === 'playing' && (
         <div className="grid grid-cols-2 gap-4 mt-8 shrink-0">
            <button 
               onClick={() => handleAnswer(false)}
               className="py-6 rounded-[2rem] bg-red-100 dark:bg-red-900/20 text-red-600 border-2 border-red-200 dark:border-red-800 font-black uppercase text-sm tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex flex-col items-center gap-2"
            >
               <X size={24} /> Errado
            </button>
            <button 
               onClick={() => handleAnswer(true)}
               className="py-6 rounded-[2rem] bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 border-2 border-emerald-200 dark:border-emerald-800 font-black uppercase text-sm tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex flex-col items-center gap-2"
            >
               <Check size={24} /> Certo
            </button>
         </div>
      )}

    </div>
  );
};

export default EticaBlitz;
