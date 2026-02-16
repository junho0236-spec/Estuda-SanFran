
import React, { useState, useEffect } from 'react';
import { Globe, Book, Award, ArrowRight, CheckCircle2, X, Star, GraduationCap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { IdiomaLesson } from '../types';

interface SanFranIdiomasProps {
  userId: string;
}

const MOCK_LESSONS: IdiomaLesson[] = [
  {
    id: '1',
    module: 'Fundamentos',
    title: 'Sistemas Legais',
    description: 'Common Law vs Civil Law.',
    theory: 'Common Law baseia-se em precedentes (case law), enquanto Civil Law foca em códigos escritos. O Brasil segue a tradição da Civil Law.',
    example_sentence: 'Brazil follows the Civil Law system.',
    type: 'quiz',
    quiz: {
      question: 'Qual sistema depende fortemente de precedentes judiciais?',
      options: ['Civil Law', 'Common Law', 'Religious Law', 'Customary Law'],
      answer: 1,
      explanation: 'O sistema Common Law (EUA, UK) dá grande peso às decisões judiciais anteriores (precedentes) como fonte de lei.',
    },
    xp_reward: 50,
    words_unlocked: ['Common Law', 'Civil Law', 'Precedent', 'Statute'],
  },
  {
    id: '2',
    module: 'Fundamentos',
    title: 'Vocabulário Básico',
    description: 'Termos essenciais de justiça.',
    theory: '"Court" é o tribunal. "Judge" é o juiz. "Lawyer" ou "Attorney" é o advogado.',
    example_sentence: 'The judge entered the court.',
    type: 'matching', // Fallback to quiz logic for simplicity in this view or implement matching UI if needed
    quiz: {
        question: 'Como se diz "Tribunal" em inglês?',
        options: ['Office', 'Court', 'Station', 'Desk'],
        answer: 1,
        explanation: '"Court" ou "Courtroom" refere-se ao tribunal ou sala de audiência.'
    },
    xp_reward: 30,
    words_unlocked: ['Court', 'Judge', 'Lawyer'],
  },
  {
    id: '3',
    module: 'Contratos',
    title: 'Elementos do Contrato',
    description: 'Oferta, Aceite e Consideração.',
    theory: 'Um contrato exige "Offer" (Oferta), "Acceptance" (Aceite) e "Consideration" (Contraprestação) para ser "Binding" (Vinculante).',
    example_sentence: 'The contract is legally binding.',
    type: 'scramble',
    scramble: {
        sentence: 'The contract is binding',
        translation: 'O contrato é vinculante'
    },
    xp_reward: 50,
    words_unlocked: ['Binding', 'Offer', 'Acceptance'],
  },
  {
    id: '4',
    module: 'Processual',
    title: 'O Julgamento',
    description: 'Partes do processo.',
    theory: '"Plaintiff" é o Autor da ação. "Defendant" é o Réu. O ônus da prova ("Burden of Proof") geralmente é do Autor.',
    example_sentence: 'The plaintiff filed a lawsuit.',
    type: 'fill_blank',
    fill_blank: {
        sentence_start: "The ",
        sentence_end: " has the burden of proof.",
        correct_word: "plaintiff",
        options: ["defendant", "plaintiff", "judge", "jury"],
        translation: "O autor tem o ônus da prova."
    },
    xp_reward: 60,
    words_unlocked: ['Plaintiff', 'Defendant', 'Lawsuit'],
  }
];

const SanFranIdiomas: React.FC<SanFranIdiomasProps> = ({ userId }) => {
  const [currentLesson, setCurrentLesson] = useState<IdiomaLesson | null>(null);
  const [lessonStep, setLessonStep] = useState<'list' | 'theory' | 'exercise' | 'success'>('list');
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  // Exercise States
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean | null>(null);
  const [scrambleWords, setScrambleWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [fillSelected, setFillSelected] = useState<string | null>(null);
  const [isFillCorrect, setIsFillCorrect] = useState<boolean | null>(null);

  // Load progress mockup
  useEffect(() => {
     // Simulating load
  }, [userId]);

  const startLesson = (lesson: IdiomaLesson) => {
    setCurrentLesson(lesson);
    setLessonStep('theory');
    
    // Reset exercise states
    setQuizSelected(null);
    setIsQuizCorrect(null);
    setFillSelected(null);
    setIsFillCorrect(null);
    setScrambleWords([]);
    setSelectedWords([]);
    
    if (lesson.type === 'scramble' && lesson.scramble) {
       const words = lesson.scramble.sentence.split(' ').sort(() => Math.random() - 0.5);
       setScrambleWords(words);
    }
  };

  const checkQuizAnswer = (idx: number) => {
    if (!currentLesson?.quiz) return;
    setQuizSelected(idx);
    const correct = idx === currentLesson.quiz.answer;
    setIsQuizCorrect(correct);
    if (correct) confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  const checkFillAnswer = (word: string) => {
    if (!currentLesson?.fill_blank) return;
    setFillSelected(word);
    const correct = word === currentLesson.fill_blank.correct_word;
    setIsFillCorrect(correct);
    if (correct) confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  const handleWordClick = (word: string, index: number, fromPool: boolean) => {
     if (fromPool) {
        const newPool = [...scrambleWords];
        newPool.splice(index, 1);
        setScrambleWords(newPool);
        setSelectedWords([...selectedWords, word]);
     } else {
        const newSelected = [...selectedWords];
        newSelected.splice(index, 1);
        setSelectedWords(newSelected);
        setScrambleWords([...scrambleWords, word]);
     }
  };

  const checkScramble = () => {
     if (!currentLesson?.scramble) return;
     const sentence = selectedWords.join(' ');
     if (sentence === currentLesson.scramble.sentence) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        setLessonStep('success');
     } else {
        alert("Ordem incorreta. Tente novamente.");
        const allWords = currentLesson.scramble.sentence.split(' ').sort(() => Math.random() - 0.5);
        setScrambleWords(allWords);
        setSelectedWords([]);
     }
  };

  const finishLesson = () => {
     if (currentLesson) {
        setCompletedLessons(prev => new Set(prev).add(currentLesson.id));
        setLessonStep('list');
        setCurrentLesson(null);
     }
  };

  const uniqueModules = Array.from(new Set(MOCK_LESSONS.map(l => l.module)));

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 pb-20 px-4 md:px-0 max-w-4xl mx-auto">
       
       <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-10">
        <div>
           <div className="inline-flex items-center gap-2 bg-sky-100 dark:bg-sky-900/20 px-4 py-2 rounded-full border border-sky-200 dark:border-sky-800 mb-4">
              <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">Legal English</span>
           </div>
           <h2 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">SanFran Idiomas</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Domine o inglês jurídico global.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl">
           <Award className="text-usp-gold" size={20} />
           <span className="font-black text-slate-900 dark:text-white tabular-nums">{completedLessons.size * 50} XP</span>
        </div>
      </header>

      {lessonStep === 'list' && (
         <div className="space-y-12">
            {uniqueModules.map((moduleName, modIdx) => {
               const moduleLessons = MOCK_LESSONS.filter(l => l.module === moduleName);
               const completedCount = moduleLessons.filter(l => completedLessons.has(l.id)).length;
               const progressPercent = (completedCount / moduleLessons.length) * 100;

               return (
                  <div key={moduleName} className="space-y-6">
                     {/* Module Header with Progress Bar */}
                     <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-[9px] font-black uppercase text-slate-500">Módulo {modIdx + 1}</span>
                           </div>
                           <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{moduleName}</h3>
                        </div>
                        <div className="w-full md:w-1/3 flex flex-col gap-2">
                           <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <span>Progresso</span>
                              <span>{Math.round(progressPercent)}%</span>
                           </div>
                           <div className="h-3 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                style={{ width: `${progressPercent}%` }}
                              />
                           </div>
                           <span className="text-[9px] text-right font-bold text-slate-400">{completedCount}/{moduleLessons.length} Lições</span>
                        </div>
                     </div>

                     {/* Lessons Grid */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {moduleLessons.map((lesson) => {
                           const isCompleted = completedLessons.has(lesson.id);
                           return (
                              <button 
                                 key={lesson.id} 
                                 onClick={() => startLesson(lesson)}
                                 className={`text-left p-6 rounded-[2.5rem] border-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md relative overflow-hidden group ${
                                    isCompleted 
                                       ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' 
                                       : 'bg-white dark:bg-sanfran-rubiDark/30 border-slate-200 dark:border-white/10 hover:border-sky-400'
                                 }`}
                              >
                                 <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lição {lesson.id}</span>
                                    {isCompleted ? <CheckCircle2 className="text-emerald-500" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-white/10 group-hover:border-sky-400" />}
                                 </div>
                                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 leading-tight">{lesson.title}</h3>
                                 <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2">{lesson.description}</p>
                              </button>
                           )
                        })}
                     </div>
                  </div>
               )
            })}
         </div>
      )}

      {lessonStep === 'theory' && currentLesson && (
         <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
            <div className="bg-sky-100 dark:bg-sky-900/20 p-6 rounded-full border border-sky-200 dark:border-sky-800">
               <Book size={48} className="text-sky-600 dark:text-sky-400" />
            </div>
            <div>
               <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase mb-4">{currentLesson.title}</h3>
               <p className="text-lg text-slate-700 dark:text-slate-300 font-serif leading-relaxed mb-8">
                  {currentLesson.theory}
               </p>
               <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 inline-block shadow-lg transform -rotate-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Exemplo Prático</p>
                  <p className="text-xl font-medium italic text-slate-800 dark:text-slate-200 font-serif">"{currentLesson.example_sentence}"</p>
               </div>
            </div>
            <button 
               onClick={() => setLessonStep('exercise')}
               className="px-12 py-5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-transform hover:scale-105 flex items-center gap-3"
            >
               Iniciar Exercício <ArrowRight size={16} />
            </button>
         </div>
      )}

      {lessonStep === 'exercise' && currentLesson && (
         <div className="flex-1 flex flex-col items-center max-w-2xl mx-auto w-full animate-in slide-in-from-bottom-10 duration-500">
            <div className="w-full mb-8 flex justify-between items-center">
               <button onClick={() => setLessonStep('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"><X className="text-slate-400" /></button>
               <div className="h-2 w-32 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 w-1/2 rounded-full"></div>
               </div>
               <div className="w-6" />
            </div>

            <div className="w-full max-w-lg space-y-8">
               
               {/* QUIZ TYPE */}
               {(currentLesson.type === 'quiz' || currentLesson.type === 'matching') && currentLesson.quiz && (
                  <>
                     <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center leading-tight">{currentLesson.quiz.question}</h3>
                     <div className="grid gap-3">
                        {currentLesson.quiz.options.map((opt, idx) => {
                           const isSelected = quizSelected === idx;
                           const isWrong = isSelected && isQuizCorrect === false;
                           const isRight = isSelected && isQuizCorrect === true;
                           
                           // Mostra a correta se errou
                           const isActualCorrect = quizSelected !== null && idx === currentLesson.quiz!.answer;

                           let btnClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/10";
                           
                           if (isRight || isActualCorrect) btnClass = "bg-emerald-500 border-emerald-600 text-white ring-2 ring-emerald-300 dark:ring-emerald-900";
                           else if (isWrong) btnClass = "bg-red-500 border-red-600 text-white animate-shake";
                           else if (quizSelected !== null) btnClass = "opacity-40 grayscale pointer-events-none bg-slate-100 dark:bg-slate-800 border-slate-200";

                           return (
                              <button 
                                 key={idx} 
                                 onClick={() => checkQuizAnswer(idx)} 
                                 disabled={quizSelected !== null} 
                                 className={`p-5 rounded-2xl border-b-4 text-left font-bold transition-all text-sm md:text-base ${btnClass}`}
                              >
                                 {opt}
                              </button>
                           )
                        })}
                     </div>

                     {/* FEEDBACK DETALHADO */}
                     {quizSelected !== null && (
                        <div className={`mt-4 p-6 rounded-3xl border-2 animate-in zoom-in-95 duration-300 shadow-2xl ${isQuizCorrect ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                           <div className="flex items-center gap-3 mb-4">
                              <div className={`p-2 rounded-full ${isQuizCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                 {isQuizCorrect ? <CheckCircle2 size={24} /> : <X size={24} />}
                              </div>
                              <h4 className={`font-black uppercase text-lg ${isQuizCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                 {isQuizCorrect ? 'Correto!' : 'Incorreto'}
                              </h4>
                           </div>
                           
                           <div className="mb-6 bg-white dark:bg-black/20 p-4 rounded-2xl">
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Explicação Jurídica</p>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                 {currentLesson.quiz.explanation}
                              </p>
                           </div>

                           <button 
                              onClick={() => setLessonStep('success')}
                              className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-transform hover:scale-[1.02] active:scale-95 ${isQuizCorrect ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'}`}
                           >
                              Continuar
                           </button>
                        </div>
                     )}
                  </>
               )}

               {/* SCRAMBLE TYPE */}
               {currentLesson.type === 'scramble' && currentLesson.scramble && (
                  <>
                     <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">Traduza para Inglês Jurídico:</h3>
                     <p className="text-lg font-serif italic text-slate-500 dark:text-slate-400 text-center mb-8">"{currentLesson.scramble.translation}"</p>
                     
                     <div className="min-h-[100px] p-6 bg-slate-50 dark:bg-black/20 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-wrap gap-2 justify-center items-center mb-6">
                        {selectedWords.map((word, idx) => (
                           <button 
                              key={`${word}-${idx}`} 
                              onClick={() => handleWordClick(word, idx, false)}
                              className="px-4 py-2 bg-white dark:bg-slate-700 shadow-md rounded-xl font-bold text-sm border-b-4 border-slate-200 dark:border-slate-900 active:translate-y-1 active:border-b-0 transition-all animate-in zoom-in"
                           >
                              {word}
                           </button>
                        ))}
                     </div>

                     <div className="flex flex-wrap gap-2 justify-center">
                        {scrambleWords.map((word, idx) => (
                           <button 
                              key={`${word}-${idx}`} 
                              onClick={() => handleWordClick(word, idx, true)}
                              className="px-4 py-2 bg-white dark:bg-slate-800 shadow-sm rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                           >
                              {word}
                           </button>
                        ))}
                     </div>

                     <div className="mt-8">
                        <button 
                           onClick={checkScramble}
                           disabled={selectedWords.length === 0}
                           className="w-full py-4 bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-transform active:scale-95"
                        >
                           Verificar
                        </button>
                     </div>
                  </>
               )}

               {/* FILL BLANK TYPE */}
               {currentLesson.type === 'fill_blank' && currentLesson.fill_blank && (
                  <>
                     <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">Complete a Frase</h3>
                     <p className="text-sm font-serif italic text-slate-500 dark:text-slate-400 text-center mb-8">"{currentLesson.fill_blank.translation}"</p>
                     
                     <div className="p-8 bg-slate-50 dark:bg-black/20 rounded-[2.5rem] border border-slate-200 dark:border-white/10 text-center text-xl font-medium leading-relaxed mb-8 shadow-inner">
                        {currentLesson.fill_blank.sentence_start}
                        <span className={`inline-block min-w-[100px] px-2 font-black border-b-4 ${fillSelected ? (isFillCorrect ? 'text-emerald-500 border-emerald-500' : 'text-red-500 border-red-500') : 'text-sky-500 border-slate-300'}`}>
                           {fillSelected || '_______'}
                        </span>
                        {currentLesson.fill_blank.sentence_end}
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        {currentLesson.fill_blank.options.map((opt) => (
                           <button
                              key={opt}
                              onClick={() => checkFillAnswer(opt)}
                              disabled={fillSelected !== null}
                              className={`p-4 rounded-xl border-b-4 font-bold transition-all ${
                                 fillSelected === opt 
                                    ? isFillCorrect 
                                       ? 'bg-emerald-500 border-emerald-700 text-white' 
                                       : 'bg-red-500 border-red-700 text-white'
                                    : fillSelected !== null && opt === currentLesson.fill_blank!.correct_word
                                       ? 'bg-emerald-500 border-emerald-700 text-white opacity-50' 
                                       : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                              }`}
                           >
                              {opt}
                           </button>
                        ))}
                     </div>

                     {fillSelected !== null && (
                        <button 
                           onClick={() => setLessonStep('success')}
                           className="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-transform active:scale-95"
                        >
                           Continuar
                        </button>
                     )}
                  </>
               )}

            </div>
         </div>
      )}

      {lessonStep === 'success' && currentLesson && (
         <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
            <div className="relative mb-8">
               <GraduationCap size={120} className="text-usp-gold animate-bounce" />
               <div className="absolute -inset-4 bg-usp-gold blur-3xl opacity-20 -z-10"></div>
               <Star className="absolute top-0 right-0 text-yellow-300 w-12 h-12 animate-spin-slow" fill="currentColor" />
            </div>
            
            <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-2">
               Lesson Completed!
            </h2>
            <div className="inline-block px-6 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-10">
               <p className="text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-sm">+ {currentLesson.xp_reward} XP Earned</p>
            </div>

            <div className="bg-white dark:bg-white/5 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/10 w-full max-w-sm mb-10 shadow-xl">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Vocabulário Adquirido</p>
               <div className="flex flex-wrap gap-2 justify-center">
                  {currentLesson.words_unlocked.map(w => (
                     <span key={w} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm text-slate-700 dark:text-slate-200">
                        {w}
                     </span>
                  ))}
               </div>
            </div>

            <button 
               onClick={finishLesson}
               className="px-12 py-5 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-transform flex items-center gap-3"
            >
               Voltar ao Menu
            </button>
         </div>
      )}

    </div>
  );
};

export default SanFranIdiomas;
