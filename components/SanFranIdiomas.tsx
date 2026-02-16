import React, { useState, useEffect } from 'react';
import { Globe, Book, Award, ArrowRight, RotateCcw, CheckCircle2, X, Mic, Volume2, Lock, Star, GraduationCap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabaseClient';
import { IdiomaLesson } from '../types';

interface SanFranIdiomasProps {
  userId: string;
}

const MOCK_LESSONS: IdiomaLesson[] = [
  {
    id: '1',
    module: 'Foundations',
    title: 'Legal Systems',
    description: 'Common Law vs Civil Law basics.',
    theory: 'Common Law is based on case law and precedent, while Civil Law is based on codified statutes. In Brazil, we follow the Civil Law tradition, emphasizing codes and legislation over judicial decisions, although precedents are gaining importance.',
    example_sentence: 'Brazil follows the Civil Law system.',
    type: 'quiz',
    quiz: {
      question: 'Which legal system relies heavily on judicial precedent?',
      options: ['Civil Law', 'Common Law', 'Religious Law', 'Customary Law'],
      answer: 1,
      explanation: 'Common Law systems (like in the US and UK) place great weight on court decisions (precedents) as a source of law, whereas Civil Law focuses on codified statutes.',
    },
    xp_reward: 50,
    words_unlocked: ['Common Law', 'Civil Law', 'Precedent', 'Statute'],
  },
  {
    id: '2',
    module: 'Contracts',
    title: 'Binding Agreements',
    description: 'Essential elements of a contract.',
    theory: 'A contract requires offer, acceptance, and consideration to be legally binding. "Binding" means that the agreement is enforceable by law. "Void" means it has no legal effect.',
    example_sentence: 'The contract is null and void.',
    type: 'scramble',
    scramble: {
        sentence: 'The contract is binding',
        translation: 'O contrato é vinculante'
    },
    xp_reward: 50,
    words_unlocked: ['Binding', 'Offer', 'Acceptance', 'Consideration'],
  },
  {
    id: '3',
    module: 'Courtroom',
    title: 'The Trial',
    description: 'Roles in a courtroom.',
    theory: 'The "Plaintiff" (Autor) brings the case against the "Defendant" (Réu). The "Burden of Proof" (Ônus da Prova) usually lies with the plaintiff.',
    example_sentence: 'The defendant pleaded not guilty.',
    type: 'fill_blank',
    fill_blank: {
        sentence_start: "The ",
        sentence_end: " has the burden of proof.",
        correct_word: "plaintiff",
        options: ["defendant", "plaintiff", "judge", "jury"],
        translation: "O autor tem o ônus da prova."
    },
    xp_reward: 50,
    words_unlocked: ['Plaintiff', 'Defendant', 'Burden of Proof', 'Trial'],
  },
  {
    id: '4',
    module: 'Torts',
    title: 'Civil Liability',
    description: 'Understanding Torts and Damages.',
    theory: 'A "Tort" is a civil wrong that causes a claimant to suffer loss or harm. It is different from a crime. "Damages" refers to the monetary compensation awarded.',
    example_sentence: 'He sued for damages due to negligence.',
    type: 'quiz',
    quiz: {
      question: 'What does "Tort" mean in legal English?',
      options: ['A type of cake', 'A criminal offense', 'A civil wrong', 'A contract breach'],
      answer: 2,
      explanation: 'Tort (Ilícito Civil/Extracontratual) refers to a civil wrong that causes harm or loss, resulting in legal liability.',
    },
    xp_reward: 60,
    words_unlocked: ['Tort', 'Damages', 'Negligence', 'Liability'],
  }
];

const SanFranIdiomas: React.FC<SanFranIdiomasProps> = ({ userId }) => {
  const [currentLesson, setCurrentLesson] = useState<IdiomaLesson | null>(null);
  const [lessonStep, setLessonStep] = useState<'list' | 'theory' | 'exercise' | 'success'>('list');
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  // Quiz State
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean | null>(null);

  // Scramble State
  const [scrambleWords, setScrambleWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  
  // Fill Blank State
  const [fillSelected, setFillSelected] = useState<string | null>(null);
  const [isFillCorrect, setIsFillCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    // Load progress from supabase if implemented, for now local/mock
    // Here we can fetch user progress
  }, [userId]);

  const startLesson = (lesson: IdiomaLesson) => {
    setCurrentLesson(lesson);
    setLessonStep('theory');
    
    // Reset exercise states
    setQuizSelected(null);
    setIsQuizCorrect(null);
    setFillSelected(null);
    setIsFillCorrect(null);
    
    if (lesson.type === 'scramble' && lesson.scramble) {
       const words = lesson.scramble.sentence.split(' ').sort(() => Math.random() - 0.5);
       setScrambleWords(words);
       setSelectedWords([]);
    }
  };

  const checkAnswer = (idx: number) => {
    if (!currentLesson || !currentLesson.quiz) return;
    setQuizSelected(idx);
    const correct = idx === currentLesson.quiz.answer;
    setIsQuizCorrect(correct);
    if (correct) {
       confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  const checkFillAnswer = (word: string) => {
    if (!currentLesson || !currentLesson.fill_blank) return;
    setFillSelected(word);
    const correct = word === currentLesson.fill_blank.correct_word;
    setIsFillCorrect(correct);
    if (correct) {
       confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  const handleWordClick = (word: string, index: number) => {
     // Move from pool to selected
     const newScramble = [...scrambleWords];
     newScramble.splice(index, 1);
     setScrambleWords(newScramble);
     setSelectedWords([...selectedWords, word]);
  };

  const handleSelectedWordClick = (word: string, index: number) => {
     // Move back to pool
     const newSelected = [...selectedWords];
     newSelected.splice(index, 1);
     setSelectedWords(newSelected);
     setScrambleWords([...scrambleWords, word]);
  };

  const checkScramble = () => {
     if (!currentLesson || !currentLesson.scramble) return;
     const sentence = selectedWords.join(' ');
     if (sentence === currentLesson.scramble.sentence) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        setLessonStep('success');
     } else {
        alert("Incorrect order. Try again.");
        // Reset
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

  // Extract unique modules
  const uniqueModules = Array.from(new Set(MOCK_LESSONS.map(l => l.module)));

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 pb-20 px-2 md:px-0 max-w-4xl mx-auto">
       <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8">
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
         <div className="space-y-10">
            {uniqueModules.map((moduleName, modIdx) => {
               const moduleLessons = MOCK_LESSONS.filter(l => l.module === moduleName);
               const completedCount = moduleLessons.filter(l => completedLessons.has(l.id)).length;
               const progressPercent = (completedCount / moduleLessons.length) * 100;

               return (
                  <div key={moduleName} className="space-y-6">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-[9px] font-black uppercase text-slate-500">Módulo {modIdx + 1}</span>
                           </div>
                           <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{moduleName}</h3>
                        </div>
                        <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
                           <div className="flex justify-between md:justify-end w-full gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <span>Progresso</span>
                              <span>{Math.round(progressPercent)}%</span>
                           </div>
                           <div className="w-full md:w-48 h-2.5 bg-slate-100 dark:bg-black/30 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                           </div>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{completedCount}/{moduleLessons.length} Lições</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {moduleLessons.map((lesson) => {
                           const isCompleted = completedLessons.has(lesson.id);
                           return (
                              <button 
                                 key={lesson.id} 
                                 onClick={() => startLesson(lesson)}
                                 className={`text-left p-6 rounded-[2.5rem] border-2 transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden group ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-sanfran-rubiDark/30 border-slate-200 dark:border-sanfran-rubi/30 hover:border-sky-400'}`}
                              >
                                 <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lição {lesson.id}</span>
                                    {isCompleted ? <CheckCircle2 className="text-emerald-500" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-white/10 group-hover:border-sky-400" />}
                                 </div>
                                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 leading-tight">{lesson.title}</h3>
                                 <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">{lesson.description}</p>
                                 
                                 <div className="flex gap-2">
                                    {lesson.words_unlocked.slice(0, 2).map(w => (
                                       <span key={w} className="text-[9px] font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">{w}</span>
                                    ))}
                                    {lesson.words_unlocked.length > 2 && <span className="text-[9px] font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">+{lesson.words_unlocked.length - 2}</span>}
                                 </div>
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
         <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-in zoom-in-95">
            <div className="bg-sky-100 dark:bg-sky-900/20 p-6 rounded-full">
               <Book size={48} className="text-sky-600 dark:text-sky-400" />
            </div>
            <div>
               <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase mb-4">{currentLesson.title}</h3>
               <p className="text-lg text-slate-700 dark:text-slate-300 font-serif leading-relaxed mb-6">
                  {currentLesson.theory}
               </p>
               <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl inline-block border border-slate-200 dark:border-white/10">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Example</p>
                  <p className="text-base font-medium italic text-slate-800 dark:text-slate-200">"{currentLesson.example_sentence}"</p>
               </div>
            </div>
            <button 
               onClick={() => setLessonStep('exercise')}
               className="px-10 py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-transform hover:scale-105 flex items-center gap-2"
            >
               Start Exercise <ArrowRight size={16} />
            </button>
         </div>
      )}

      {lessonStep === 'exercise' && currentLesson && (
         <div className="flex-1 flex flex-col items-center max-w-2xl mx-auto w-full">
            <div className="w-full mb-8 flex justify-between items-center">
               <button onClick={() => setLessonStep('list')}><X className="text-slate-400 hover:text-red-500" /></button>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exercise</span>
               <div className="w-6" />
            </div>

            <div className="w-full max-w-lg space-y-6 animate-in slide-in-from-right-8">
               
               {/* QUIZ TYPE */}
               {currentLesson.type === 'quiz' && currentLesson.quiz && (
                  <>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white">{currentLesson.quiz.question}</h3>
                     <div className="grid gap-3">
                        {currentLesson.quiz.options.map((opt, idx) => {
                           const isSelected = quizSelected === idx;
                           const isWrong = isSelected && isQuizCorrect === false;
                           const isRight = isSelected && isQuizCorrect === true;
                           
                           // Se já respondeu, destaca a correta também se errou? Não, estilo duolingo, mostra erro e correcao.
                           const isActualCorrect = quizSelected !== null && idx === currentLesson.quiz!.answer;

                           let btnClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-400";
                           
                           if (isRight || isActualCorrect) btnClass = "bg-emerald-500 border-emerald-600 text-white";
                           else if (isWrong) btnClass = "bg-red-500 border-red-600 text-white animate-shake";
                           else if (quizSelected !== null) btnClass += " opacity-50";

                           return (
                              <button key={idx} onClick={() => checkAnswer(idx)} disabled={quizSelected !== null} className={`p-4 rounded-xl border-2 text-left font-bold transition-all ${btnClass}`}>
                                 {opt}
                              </button>
                           )
                        })}
                     </div>

                     {quizSelected !== null && (
                        <div className={`mt-6 p-6 rounded-2xl border-2 animate-in slide-in-from-bottom-4 shadow-xl text-left ${isQuizCorrect ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                           <div className="flex items-center gap-2 mb-3">
                              {isQuizCorrect ? <CheckCircle2 className="text-emerald-500" /> : <X className="text-red-500" />}
                              <h4 className={`font-black uppercase text-sm ${isQuizCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                 {isQuizCorrect ? 'Correct!' : 'Incorrect'}
                              </h4>
                           </div>
                           
                           <div className="mb-6">
                              <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Explanation</p>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                 {currentLesson.quiz.explanation}
                              </p>
                           </div>

                           <button 
                              onClick={() => setLessonStep('success')}
                              className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-transform active:scale-95 ${isQuizCorrect ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'}`}
                           >
                              Continue
                           </button>
                        </div>
                     )}
                  </>
               )}

               {/* SCRAMBLE TYPE */}
               {currentLesson.type === 'scramble' && currentLesson.scramble && (
                  <>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-2">Translate to Legal English:</h3>
                     <p className="text-lg font-serif italic text-slate-600 dark:text-slate-400 mb-6">"{currentLesson.scramble.translation}"</p>
                     
                     {/* Selected Words Area */}
                     <div className="min-h-[80px] p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 flex flex-wrap gap-2 justify-center items-center mb-6">
                        {selectedWords.map((word, idx) => (
                           <button 
                              key={`${word}-${idx}`} 
                              onClick={() => handleSelectedWordClick(word, idx)}
                              className="px-4 py-2 bg-white dark:bg-slate-700 shadow-md rounded-xl font-bold text-sm border-b-4 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-1 transition-all"
                           >
                              {word}
                           </button>
                        ))}
                     </div>

                     {/* Word Pool */}
                     <div className="flex flex-wrap gap-2 justify-center">
                        {scrambleWords.map((word, idx) => (
                           <button 
                              key={`${word}-${idx}`} 
                              onClick={() => handleWordClick(word, idx)}
                              className="px-4 py-2 bg-white dark:bg-slate-700 shadow-sm rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                           >
                              {word}
                           </button>
                        ))}
                     </div>

                     <div className="mt-8">
                        <button 
                           onClick={checkScramble}
                           disabled={scrambleWords.length > 0}
                           className="w-full py-4 bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-transform active:scale-95"
                        >
                           Check
                        </button>
                     </div>
                  </>
               )}

               {/* FILL BLANK TYPE */}
               {currentLesson.type === 'fill_blank' && currentLesson.fill_blank && (
                  <>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Complete the sentence:</h3>
                     <p className="text-sm font-serif italic text-slate-500 dark:text-slate-400 mb-8">"{currentLesson.fill_blank.translation}"</p>
                     
                     <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 text-center text-lg md:text-xl font-medium leading-relaxed mb-8">
                        {currentLesson.fill_blank.sentence_start}
                        <span className="inline-block min-w-[100px] border-b-2 border-slate-400 px-2 text-sky-600 font-bold">{fillSelected || '_______'}</span>
                        {currentLesson.fill_blank.sentence_end}
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        {currentLesson.fill_blank.options.map((opt) => (
                           <button
                              key={opt}
                              onClick={() => checkFillAnswer(opt)}
                              disabled={fillSelected !== null}
                              className={`p-4 rounded-xl border-2 font-bold transition-all ${
                                 fillSelected === opt 
                                    ? isFillCorrect 
                                       ? 'bg-emerald-500 border-emerald-600 text-white' 
                                       : 'bg-red-500 border-red-600 text-white'
                                    : fillSelected !== null && opt === currentLesson.fill_blank!.correct_word
                                       ? 'bg-emerald-500 border-emerald-600 text-white' // Show correct
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
                           className="w-full mt-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-transform active:scale-95"
                        >
                           Continue
                        </button>
                     )}
                  </>
               )}

            </div>
         </div>
      )}

      {lessonStep === 'success' && currentLesson && (
         <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
            <div className="relative">
               <GraduationCap size={100} className="text-usp-gold animate-bounce" />
               <div className="absolute -inset-4 bg-usp-gold blur-3xl opacity-20 -z-10"></div>
            </div>
            
            <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mt-8 mb-2">
               Lesson Completed!
            </h2>
            <p className="text-slate-500 font-bold mb-8">+ {currentLesson.xp_reward} XP Earned</p>

            <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 w-full max-w-sm mb-8">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">New Vocabulary</p>
               <div className="flex flex-wrap gap-2 justify-center">
                  {currentLesson.words_unlocked.map(w => (
                     <span key={w} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                        {w}
                     </span>
                  ))}
               </div>
            </div>

            <button 
               onClick={finishLesson}
               className="px-12 py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
            >
               Back to Menu
            </button>
         </div>
      )}

    </div>
  );
};

export default SanFranIdiomas;