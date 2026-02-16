
import React, { useState, useEffect, useRef } from 'react';
import { Globe, BookOpen, CheckCircle2, Lock, X, Flame, Trophy, Volume2, Star, Quote, Heart, ArrowRight, Flag } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { IdiomaLesson, IdiomaProgress } from '../types';
import confetti from 'canvas-confetti';

interface SanFranIdiomasProps {
  userId: string;
}

// --- BANCO DE DADOS DE LIÇÕES (EXPANDIDO) ---
const LESSONS_DB: IdiomaLesson[] = [
  // --- MÓDULO 1: FOUNDATIONS (Fundamentos) ---
  {
    id: '1-1',
    module: 'Fundations',
    title: 'The Legal Profession',
    description: 'Lawyer, Attorney & Barrister',
    type: 'quiz',
    theory: "Em inglês, 'Lawyer' é o gênero (qualquer jurista). 'Attorney' (EUA) é quem tem a carteira da ordem (Bar). No Reino Unido, divide-se em 'Solicitor' (escritório/contratos) e 'Barrister' (tribunal/beca).",
    example_sentence: "Although she is a qualified lawyer, she is not practicing as an attorney currently.",
    quiz: {
      question: "Qual termo descreve o advogado que atua no tribunal (UK)?",
      options: ["Solicitor", "Barrister", "Paralegal"],
      answer: 1,
      explanation: "Barristers são os advogados especializados em sustentação oral e litígio nas cortes superiores do Reino Unido."
    },
    xp_reward: 100,
    words_unlocked: ['Lawyer', 'Attorney-at-Law', 'Barrister', 'Solicitor']
  },
  {
    id: '1-2',
    module: 'Fundations',
    title: 'Court Structure',
    description: 'Court vs. Tribunal',
    type: 'matching',
    theory: "'Court' é o Judiciário. 'Tribunal' são cortes administrativas ou de arbitragem. O 'Judge' preside, o 'Jury' decide os fatos.",
    example_sentence: "The case was heard in the High Court.",
    matching: {
      pairs: [
        { term: "Judge", translation: "Juiz" },
        { term: "Court", translation: "Tribunal (Judiciário)" },
        { term: "Jury", translation: "Júri" },
        { term: "Verdict", translation: "Veredito" }
      ]
    },
    xp_reward: 100,
    words_unlocked: ['Court', 'Tribunal', 'Judge', 'Jury']
  },
  {
    id: '1-3',
    module: 'Fundations',
    title: 'Building Sentences',
    description: 'Structure of Legal English',
    type: 'scramble',
    theory: "No inglês jurídico, a ordem das palavras é crucial. Sujeito + Verbo + Objeto Direto. Ex: 'The Plaintiff filed a lawsuit'.",
    example_sentence: "The defendant shall pay the damages immediately.",
    scramble: {
      sentence: "The plaintiff filed a motion to dismiss",
      translation: "O autor protocolou um pedido de extinção/arquivamento."
    },
    xp_reward: 120,
    words_unlocked: ['Motion', 'Dismiss', 'File', 'Plaintiff']
  },
  
  // --- MÓDULO 2: CONTRACT LAW (Contratos) ---
  {
    id: '2-1',
    module: 'Contract Law',
    title: 'The Art of Drafting',
    description: 'Drafting vs. Writing',
    type: 'quiz',
    theory: "Juristas não 'write' contratos, eles 'draft' (redigem/minutam). O substantivo é 'draft' (minuta). 'To execute a contract' significa assiná-lo/formalizá-lo, não matá-lo.",
    example_sentence: "I spent the whole afternoon drafting the merger agreement to be executed tomorrow.",
    quiz: {
      question: "Qual o verbo técnico para 'redigir' um contrato?",
      options: ["Make", "Write", "Draft"],
      answer: 2,
      explanation: "To Draft é o verbo técnico para a elaboração de documentos legais."
    },
    xp_reward: 150,
    words_unlocked: ['Draft', 'Execute', 'Agreement']
  },
  {
    id: '2-2',
    module: 'Contract Law',
    title: 'Binding Agreement',
    description: 'Elementos do Contrato',
    type: 'fill_blank',
    theory: "Para um contrato ser válido ('binding'), deve haver Oferta, Aceitação e 'Consideration' (contraprestação/valor).",
    example_sentence: "This contract is legally binding between the parties.",
    fill_blank: {
      sentence_start: "Without valid consideration, the contract is not",
      sentence_end: ".",
      correct_word: "binding",
      options: ["binding", "writing", "drafting", "holding"],
      translation: "Sem contraprestação válida, o contrato não é vinculante."
    },
    xp_reward: 150,
    words_unlocked: ['Consideration', 'Binding', 'Offer']
  },
  {
    id: '2-3',
    module: 'Contract Law',
    title: 'Breach & Remedies',
    description: 'Violação Contratual',
    type: 'matching',
    theory: "Violação contratual é 'Breach'. A solução/reparação é 'Remedy'. Cláusula penal é 'Liquidated Damages'.",
    example_sentence: "A material breach gives rise to the right to terminate.",
    matching: {
      pairs: [
        { term: "Breach", translation: "Violação/Inadimplemento" },
        { term: "Remedy", translation: "Solução/Remédio" },
        { term: "Party", translation: "Parte" },
        { term: "Damages", translation: "Perdas e Danos" }
      ]
    },
    xp_reward: 150,
    words_unlocked: ['Breach', 'Remedy', 'Damages']
  },

  // --- MÓDULO 3: CRIMINAL LAW (Penal) ---
  {
    id: '3-1',
    module: 'Criminal Law',
    title: 'Crime Elements',
    description: 'Mens Rea & Actus Reus',
    type: 'quiz',
    theory: "O crime exige o ato ('Actus Reus') e a intenção ('Mens Rea'). Sem intenção, pode ser 'Manslaughter' (homicídio culposo) e não 'Murder' (doloso).",
    example_sentence: "The prosecution failed to prove mens rea beyond reasonable doubt.",
    quiz: {
      question: "O que significa 'Mens Rea'?",
      options: ["Ato Culpável", "Mente Culpável (Intenção)", "Homem Real"],
      answer: 1,
      explanation: "Mens Rea refere-se ao estado mental ou intenção criminosa do agente."
    },
    xp_reward: 200,
    words_unlocked: ['Mens Rea', 'Actus Reus', 'Felony']
  },
  {
    id: '3-2',
    module: 'Criminal Law',
    title: 'The Verdict',
    description: 'Guilty or Not Guilty',
    type: 'fill_blank',
    theory: "O júri entrega um 'Verdict'. O réu pode ser considerado 'Guilty' (Culpado) ou 'Not Guilty' (Inocente/Absolvido). Em inglês, 'Innocent' é um estado de fato, 'Not Guilty' é o resultado legal.",
    example_sentence: "The jury found the defendant not guilty.",
    fill_blank: {
      sentence_start: "The jury reached a",
      sentence_end: "of guilty.",
      correct_word: "verdict",
      options: ["sentence", "verdict", "decree", "order"],
      translation: "O júri chegou a um veredito de culpado."
    },
    xp_reward: 200,
    words_unlocked: ['Verdict', 'Guilty', 'Acquittal']
  },
  {
    id: '3-3',
    module: 'Criminal Law',
    title: 'Trial Vocabulary',
    description: 'Key Criminal Terms',
    type: 'matching',
    theory: "'Bail' é fiança. 'Prosecutor' é o Promotor. 'Defendant' é o Réu. 'Warrant' é o Mandado.",
    example_sentence: "The defendant was released on bail pending trial.",
    matching: {
      pairs: [
        { term: "Bail", translation: "Fiança" },
        { term: "Guilty", translation: "Culpado" },
        { term: "Prosecutor", translation: "Promotor" },
        { term: "Warrant", translation: "Mandado" }
      ]
    },
    xp_reward: 200,
    words_unlocked: ['Bail', 'Warrant', 'Defendant', 'Prosecution']
  }
];

// Helper para agrupar lições por módulo
const MODULES = Array.from(new Set(LESSONS_DB.map(l => l.module)));

const SanFranIdiomas: React.FC<SanFranIdiomasProps> = ({ userId }) => {
  const [progress, setProgress] = useState<IdiomaProgress | null>(null);
  const [currentLesson, setCurrentLesson] = useState<IdiomaLesson | null>(null);
  const [activeTab, setActiveTab] = useState<'path' | 'glossary'>('path');
  
  // Estado da Lição
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonStep, setLessonStep] = useState<'theory' | 'listen' | 'exercise' | 'success'>('theory');
  const [sessionLives, setSessionLives] = useState(3);
  
  // Exercise States
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean | null>(null);

  const [scrambleWords, setScrambleWords] = useState<string[]>([]);
  const [scrambleSolution, setScrambleSolution] = useState<string[]>([]);
  const [isScrambleCorrect, setIsScrambleCorrect] = useState<boolean | null>(null);

  const [matchingItems, setMatchingItems] = useState<{id: string, text: string, type: 'term' | 'def', state: 'default' | 'selected' | 'matched' | 'wrong'}[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const [fillSelected, setFillSelected] = useState<string | null>(null);
  const [isFillCorrect, setIsFillCorrect] = useState<boolean | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  // SVG Refs para o Mapa
  const containerRef = useRef<HTMLDivElement>(null);

  // Carregar dados
  useEffect(() => {
    fetchProgress();
  }, [userId]);

  const fetchProgress = async () => {
    setIsLoading(true);
    try {
      let { data, error } = await supabase
        .from('idiomas_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        const initialProgress = {
          user_id: userId,
          current_level_id: '1-1',
          streak_count: 0,
          total_xp: 0,
          lives: 5,
          completed_lessons: [],
          last_activity_date: null
        };
        const { data: newData } = await supabase
          .from('idiomas_progress')
          .insert(initialProgress)
          .select()
          .single();
        data = newData;
      }
      if (data) setProgress(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- AÇÕES DE AULA ---

  const startLesson = (lessonId: string) => {
    const lesson = LESSONS_DB.find(l => l.id === lessonId);
    if (lesson) {
      setCurrentLesson(lesson);
      setLessonStep('theory');
      setSessionLives(3);
      
      // Reset Quiz
      setQuizSelected(null);
      setIsQuizCorrect(null);

      // Reset Fill
      setFillSelected(null);
      setIsFillCorrect(null);

      // Reset Scramble
      if (lesson.type === 'scramble' && lesson.scramble) {
         const words = lesson.scramble.sentence.split(' ').sort(() => Math.random() - 0.5);
         setScrambleWords(words);
         setScrambleSolution([]);
         setIsScrambleCorrect(null);
      }

      // Reset Matching
      if (lesson.type === 'matching' && lesson.matching) {
         const items = lesson.matching.pairs.flatMap((p, i) => [
            { id: `t-${i}`, text: p.term, type: 'term', state: 'default' },
            { id: `d-${i}`, text: p.translation, type: 'def', state: 'default' }
         ]);
         // Shuffle
         setMatchingItems(items.sort(() => Math.random() - 0.5) as any);
         setSelectedMatchId(null);
      }

      setShowLessonModal(true);
    }
  };

  const handleWrongAnswer = () => {
     setSessionLives(prev => prev - 1);
     const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3');
     audio.volume = 0.3;
     audio.play().catch(() => {});
     
     if (sessionLives <= 1) {
        // Game Over logic inside lesson could be added here
     }
  };

  const playSuccessSound = () => {
     const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
     audio.volume = 0.3;
     audio.play().catch(() => {});
  }

  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; 
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- EXERCISE LOGIC ---
  const checkAnswer = (idx: number) => {
    if (isQuizCorrect !== null || !currentLesson?.quiz) return;
    
    const correct = idx === currentLesson.quiz.answer;
    setQuizSelected(idx);
    setIsQuizCorrect(correct);

    if (correct) {
      playSuccessSound();
      setTimeout(() => setLessonStep('success'), 1500);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
      handleWrongAnswer();
    }
  };

  const checkFillBlank = (word: string) => {
    if (isFillCorrect !== null || !currentLesson?.fill_blank) return;

    setFillSelected(word);
    const correct = word === currentLesson.fill_blank.correct_word;
    setIsFillCorrect(correct);

    if (correct) {
        playSuccessSound();
        setTimeout(() => setLessonStep('success'), 1500);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
        handleWrongAnswer();
    }
  };

  const handleScrambleClick = (word: string, index: number, source: 'pool' | 'solution') => {
     if (isScrambleCorrect === true) return;

     if (source === 'pool') {
        const newPool = [...scrambleWords];
        newPool.splice(index, 1);
        setScrambleWords(newPool);
        setScrambleSolution([...scrambleSolution, word]);
     } else {
        const newSolution = [...scrambleSolution];
        newSolution.splice(index, 1);
        setScrambleSolution(newSolution);
        setScrambleWords([...scrambleWords, word]);
     }
  };

  const checkScramble = () => {
     if (!currentLesson?.scramble) return;
     const attempt = scrambleSolution.join(' ');
     const correct = attempt === currentLesson.scramble.sentence;
     setIsScrambleCorrect(correct);

     if (correct) {
        playSuccessSound();
        setTimeout(() => setLessonStep('success'), 1500);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
     } else {
        handleWrongAnswer();
        setTimeout(() => setIsScrambleCorrect(null), 1000); 
     }
  };

  const handleMatchClick = (id: string) => {
     const clickedItem = matchingItems.find(i => i.id === id);
     if (!clickedItem || clickedItem.state === 'matched') return;

     // Se já tem um selecionado
     if (selectedMatchId) {
        const firstItem = matchingItems.find(i => i.id === selectedMatchId);
        if (!firstItem) return;

        // Se clicou no mesmo
        if (selectedMatchId === id) {
           setSelectedMatchId(null);
           setMatchingItems(prev => prev.map(i => i.id === id ? { ...i, state: 'default' } : i));
           return;
        }

        // Verifica match (index deve ser igual ex: t-0 e d-0)
        const firstIndex = firstItem.id.split('-')[1];
        const secondIndex = clickedItem.id.split('-')[1];
        const isMatch = firstIndex === secondIndex && firstItem.type !== clickedItem.type;

        if (isMatch) {
           playSuccessSound();
           setMatchingItems(prev => prev.map(i => (i.id === id || i.id === selectedMatchId) ? { ...i, state: 'matched' } : i));
           setSelectedMatchId(null);
           
           // Check if all matched
           const allMatched = matchingItems.filter(i => i.state !== 'matched').length <= 2; // <=2 pq estamos atualizando state agora
           if (allMatched) {
              setTimeout(() => setLessonStep('success'), 1000);
              confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
           }
        } else {
           handleWrongAnswer();
           // Show Error
           setMatchingItems(prev => prev.map(i => (i.id === id || i.id === selectedMatchId) ? { ...i, state: 'wrong' } : i));
           setTimeout(() => {
              setMatchingItems(prev => prev.map(i => (i.id === id || i.id === selectedMatchId) ? { ...i, state: 'default' } : i));
              setSelectedMatchId(null);
           }, 800);
        }

     } else {
        // Primeiro clique
        setSelectedMatchId(id);
        setMatchingItems(prev => prev.map(i => i.id === id ? { ...i, state: 'selected' } : i));
     }
  };

  const completeLesson = async () => {
    if (!currentLesson || !progress) return;

    // Lógica de atualização
    const newCompleted = [...(progress.completed_lessons || [])];
    if (!newCompleted.includes(currentLesson.id)) {
      newCompleted.push(currentLesson.id);
    }

    const currentIndex = LESSONS_DB.findIndex(l => l.id === currentLesson.id);
    const nextLessonId = LESSONS_DB[currentIndex + 1]?.id || currentLesson.id;

    // Atualizar Streak
    const today = new Date().toISOString().split('T')[0];
    let newStreak = progress.streak_count;
    if (progress.last_activity_date !== today) {
       newStreak += 1;
    }

    const newXP = progress.total_xp + currentLesson.xp_reward;

    try {
      await supabase.from('idiomas_progress').update({
        completed_lessons: newCompleted,
        current_level_id: nextLessonId,
        total_xp: newXP,
        streak_count: newStreak,
        last_activity_date: today
      }).eq('user_id', userId);

      setProgress(prev => prev ? ({
        ...prev,
        completed_lessons: newCompleted,
        current_level_id: nextLessonId,
        total_xp: newXP,
        streak_count: newStreak,
        last_activity_date: today
      }) : null);

      setShowLessonModal(false);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (e) {
      console.error(e);
    }
  };

  const getUnlockedWords = () => {
    if (!progress) return [];
    const words: string[] = [];
    LESSONS_DB.forEach(lesson => {
      if (progress.completed_lessons.includes(lesson.id)) {
        words.push(...lesson.words_unlocked);
      }
    });
    return Array.from(new Set(words)).sort();
  };

  // --- RENDER MAP HELPER ---
  // Função para desenhar a linha curva entre os botões
  const renderMapPaths = () => {
     // A lógica aqui é visual apenas, criando SVGs absolutos baseados no layout conhecido
     // Simplificação: Desenhar curvas fixas assumindo a grid
     // Em uma app real complexa, calcularíamos as posições dos refs.
     return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ minHeight: '1000px' }}>
           <path 
             d="M 50% 100 Q 50% 200, 30% 300 T 50% 500 T 70% 700 T 50% 900" 
             fill="none" 
             stroke="#e2e8f0" 
             strokeWidth="8" 
             strokeDasharray="12 12"
             className="dark:stroke-white/10"
           />
        </svg>
     );
  };

  if (isLoading || !progress) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sanfran-rubi"></div></div>;

  return (
    <div className="h-full flex flex-col relative pb-20 px-2 md:px-0 max-w-4xl mx-auto font-sans">
      
      {/* HEADER PREMIUM */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8">
         <div className="flex items-center gap-4">
            <div className="bg-sky-100 dark:bg-sky-900/20 p-3 rounded-2xl border border-sky-200 dark:border-sky-800">
               <Globe className="w-8 h-8 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
               <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Legal English</h2>
               <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-orange-500 font-black text-xs uppercase tracking-widest bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
                     <Flame size={12} fill="currentColor" /> {progress.streak_count} Dias
                  </div>
                  <div className="flex items-center gap-1.5 text-usp-gold font-black text-xs uppercase tracking-widest bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                     <Trophy size={12} fill="currentColor" /> {progress.total_xp} XP
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex gap-1">
            <button 
               onClick={() => setActiveTab('path')}
               className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'path' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
               Trilha
            </button>
            <button 
               onClick={() => setActiveTab('glossary')}
               className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'glossary' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
               Vault
            </button>
         </div>
      </header>

      {/* --- ABA TRILHA (PATH) --- */}
      {activeTab === 'path' && (
         <div className="flex-1 overflow-y-auto custom-scrollbar relative px-4" ref={containerRef}>
            {/* Linha Decorativa SVG */}
            {/* Como o layout é flex column com offsets, vamos usar uma linha central simples com CSS dash por enquanto para garantir responsividade sem cálculos complexos de SVG */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-200 dark:bg-white/5 -translate-x-1/2 rounded-full -z-10 border-l-2 border-dashed border-slate-300 dark:border-white/10" />

            <div className="space-y-24 pb-20 pt-8">
               {MODULES.map((module, modIdx) => (
                  <div key={module} className="relative">
                     <div className="flex justify-center mb-16 sticky top-0 z-20">
                        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 px-6 py-2 rounded-full shadow-lg text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                           <Flag size={12} className="text-usp-gold" fill="currentColor" /> Módulo {modIdx + 1}: {module}
                        </div>
                     </div>

                     <div className="flex flex-col gap-20 relative">
                        {LESSONS_DB.filter(l => l.module === module).map((lesson, idx) => {
                           const isCompleted = progress.completed_lessons.includes(lesson.id);
                           const isCurrent = lesson.id === progress.current_level_id;
                           const isLocked = !isCompleted && !isCurrent;
                           
                           // ZigZag Logic (Alternando Esquerda/Direita)
                           const offsetClass = idx % 2 === 0 ? 'md:-translate-x-20' : 'md:translate-x-20';
                           
                           return (
                              <div key={lesson.id} className={`flex flex-col items-center relative group transition-transform duration-500 ${offsetClass}`}>
                                 <button 
                                    onClick={() => !isLocked && startLesson(lesson.id)}
                                    disabled={isLocked}
                                    className={`
                                       relative w-28 h-28 rounded-[2.5rem] border-[6px] transition-all duration-300 flex items-center justify-center shadow-2xl z-10
                                       ${isCompleted ? 'bg-sky-500 border-sky-600 text-white' : 
                                         isCurrent ? 'bg-sanfran-rubi border-[#7a0d18] text-white ring-8 ring-sanfran-rubi/20 scale-110' : 
                                         'bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/5 text-slate-400 grayscale cursor-not-allowed'}
                                       active:scale-95 hover:scale-105
                                    `}
                                 >
                                    {isCompleted ? <CheckCircle2 size={40} /> : isLocked ? <Lock size={32} /> : <Star size={40} fill="currentColor" />}
                                    
                                    {/* Stars Reward Indicator */}
                                    {isCompleted && (
                                       <div className="absolute -bottom-3 bg-white dark:bg-slate-900 px-2 py-1 rounded-full border border-slate-100 dark:border-white/10 flex gap-0.5">
                                          <Star size={10} className="text-usp-gold fill-current" />
                                          <Star size={10} className="text-usp-gold fill-current" />
                                          <Star size={10} className="text-usp-gold fill-current" />
                                       </div>
                                    )}
                                 </button>

                                 <div className={`
                                    mt-5 bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-100 dark:border-white/5 shadow-xl text-center w-56 z-10 transition-all
                                    ${isLocked ? 'opacity-50 grayscale blur-[1px]' : 'opacity-100'}
                                 `}>
                                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Lição {idx + 1}</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{lesson.title}</p>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* --- ABA VADE MECUM (GLOSSÁRIO) --- */}
      {activeTab === 'glossary' && (
         <div className="flex-1 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8">
            <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl min-h-[400px]">
               <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                  <BookOpen className="text-sanfran-rubi" /> The Vault
               </h3>
               <p className="text-sm text-slate-500 font-bold mb-8">Seu arsenal lexical desbloqueado.</p>

               {getUnlockedWords().length === 0 ? (
                  <div className="text-center py-20 opacity-50">
                     <Lock size={64} className="mx-auto mb-4 text-slate-300" />
                     <p className="font-black uppercase text-slate-400">Nenhum termo desbloqueado ainda.</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                     {getUnlockedWords().map((word, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-2xl flex flex-col justify-between hover:border-sky-500 transition-colors group cursor-default">
                           <span className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2">Termo {idx + 1}</span>
                           <div className="flex items-center justify-between">
                              <p className="font-bold text-slate-800 dark:text-white">{word}</p>
                              <button onClick={() => playAudio(word)} className="text-slate-400 hover:text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Volume2 size={16} />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      )}

      {/* --- MODAL DA LIÇÃO --- */}
      {showLessonModal && currentLesson && (
         <div className="fixed inset-0 z-50 bg-[#f8f9fa] dark:bg-[#0d0303] flex flex-col animate-in slide-in-from-bottom-20 duration-300">
            {/* Header Modal */}
            <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
               <button onClick={() => setShowLessonModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X size={28} />
               </button>
               
               <div className="flex-1 mx-6 flex flex-col gap-2">
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-sky-500 transition-all duration-500 ease-out" 
                        style={{ 
                           width: lessonStep === 'theory' ? '25%' : lessonStep === 'listen' ? '50%' : lessonStep === 'exercise' ? '75%' : '100%' 
                        }} 
                     />
                  </div>
               </div>
               
               <div className="flex gap-1 text-red-500">
                  {[...Array(3)].map((_, i) => (
                     <Heart key={i} size={20} className={i < sessionLives ? "fill-current" : "text-slate-300 dark:text-slate-700"} />
                  ))}
               </div>
            </div>

            {/* Conteúdo Dinâmico */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 max-w-3xl mx-auto w-full text-center">
               
               {/* STEP 1: THEORY */}
               {lessonStep === 'theory' && (
                  <div className="space-y-8 w-full animate-in fade-in zoom-in duration-300">
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-500 bg-sky-100 dark:bg-sky-900/20 px-3 py-1 rounded-full">Briefing Teórico</span>
                     
                     <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">{currentLesson.title}</h1>
                     
                     <div className="bg-white dark:bg-white/5 p-8 md:p-10 rounded-[3rem] border-2 border-slate-100 dark:border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-400 to-blue-600"></div>
                        <p className="text-lg md:text-2xl font-medium leading-relaxed text-slate-700 dark:text-slate-200 font-serif">
                           {currentLesson.theory}
                        </p>
                     </div>

                     <button 
                        onClick={() => setLessonStep('listen')} 
                        className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                     >
                        Entendi, Próximo <ArrowRight size={16} />
                     </button>
                  </div>
               )}

               {/* STEP 2: LISTENING */}
               {lessonStep === 'listen' && (
                  <div className="space-y-10 w-full animate-in slide-in-from-right-10 duration-300">
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500 bg-purple-100 dark:bg-purple-900/20 px-3 py-1 rounded-full">Pronúncia & Contexto</span>
                     
                     <div className="relative py-10">
                        <Quote size={60} className="absolute top-0 left-0 text-purple-200 dark:text-purple-900/30 -translate-x-4 -translate-y-4" />
                        <p className="text-2xl md:text-4xl font-serif italic text-slate-800 dark:text-slate-100 leading-snug">
                           "{currentLesson.example_sentence}"
                        </p>
                        <Quote size={60} className="absolute bottom-0 right-0 text-purple-200 dark:text-purple-900/30 translate-x-4 translate-y-4 rotate-180" />
                     </div>

                     <div className="flex justify-center">
                        <button 
                           onClick={() => playAudio(currentLesson.example_sentence)}
                           className="w-24 h-24 bg-purple-500 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/40 hover:scale-110 active:scale-90 transition-all group"
                        >
                           <Volume2 size={40} className="text-white group-hover:animate-pulse" />
                        </button>
                     </div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Toque para Ouvir</p>

                     <button 
                        onClick={() => setLessonStep('exercise')} 
                        className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm mt-8"
                     >
                        Ir para o Desafio
                     </button>
                  </div>
               )}

               {/* STEP 3: EXERCISE (QUIZ, SCRAMBLE, OR MATCHING) */}
               {lessonStep === 'exercise' && (
                  <div className="space-y-8 w-full max-w-lg animate-in slide-in-from-right-10 duration-300">
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sanfran-rubi bg-red-100 dark:bg-red-900/20 px-3 py-1 rounded-full">Prática Jurídica</span>
                     
                     {/* TIPO 1: QUIZ CLÁSSICO */}
                     {(!currentLesson.type || currentLesson.type === 'quiz') && currentLesson.quiz && (
                        <>
                           <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
                              {currentLesson.quiz.question}
                           </h3>
                           <div className="grid gap-4">
                              {currentLesson.quiz.options.map((opt, idx) => {
                                 const isSelected = quizSelected === idx;
                                 const isWrong = isSelected && isQuizCorrect === false;
                                 const isRight = isSelected && isQuizCorrect === true;
                                 let btnClass = "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20";
                                 if (isRight) btnClass = "bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/30";
                                 else if (isWrong) btnClass = "bg-red-500 border-red-600 text-white shadow-red-500/30 animate-shake";

                                 return (
                                    <button
                                       key={idx}
                                       onClick={() => checkAnswer(idx)}
                                       disabled={quizSelected !== null}
                                       className={`p-6 rounded-2xl border-b-4 font-bold text-left transition-all text-lg flex items-center justify-between shadow-sm ${btnClass}`}
                                    >
                                       {opt}
                                       {isRight && <CheckCircle2 size={24} />}
                                       {isWrong && <X size={24} />}
                                    </button>
                                 )
                              })}
                           </div>
                        </>
                     )}

                     {/* TIPO 2: SCRAMBLE (ORDENAR FRASE) */}
                     {currentLesson.type === 'scramble' && currentLesson.scramble && (
                        <>
                           <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-2">Traduza para o Inglês Jurídico:</h3>
                           <p className="text-lg font-serif italic text-slate-600 dark:text-slate-400 mb-6">"{currentLesson.scramble.translation}"</p>
                           
                           {/* Solution Area */}
                           <div className="min-h-[80px] p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 flex flex-wrap gap-2 justify-center items-center mb-6">
                              {scrambleSolution.length === 0 && <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Toque nas palavras abaixo</span>}
                              {scrambleSolution.map((word, idx) => (
                                 <button key={`${word}-${idx}`} onClick={() => handleScrambleClick(word, idx, 'solution')} className="bg-white dark:bg-slate-700 shadow-md px-3 py-2 rounded-xl font-bold text-sm animate-in zoom-in">{word}</button>
                              ))}
                           </div>

                           {/* Word Pool */}
                           <div className="flex flex-wrap gap-2 justify-center mb-8">
                              {scrambleWords.map((word, idx) => (
                                 <button key={`${word}-${idx}`} onClick={() => handleScrambleClick(word, idx, 'pool')} className="bg-white dark:bg-slate-800 border-b-4 border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl font-bold text-sm hover:-translate-y-1 transition-transform">{word}</button>
                              ))}
                           </div>

                           <button 
                              onClick={checkScramble} 
                              disabled={scrambleWords.length > 0}
                              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${scrambleWords.length === 0 ? 'bg-sanfran-rubi text-white hover:scale-105' : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'} ${isScrambleCorrect === false ? 'animate-shake bg-red-500 text-white' : ''}`}
                           >
                              {isScrambleCorrect === false ? 'Tentar Novamente' : 'Verificar'}
                           </button>
                        </>
                     )}

                     {/* TIPO 3: MATCHING (ASSOCIAÇÃO) */}
                     {currentLesson.type === 'matching' && (
                        <>
                           <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-6">Associe os Termos Corretos</h3>
                           <div className="grid grid-cols-2 gap-4">
                              {matchingItems.map((item) => (
                                 <button
                                    key={item.id}
                                    disabled={item.state === 'matched'}
                                    onClick={() => handleMatchClick(item.id)}
                                    className={`
                                       p-4 rounded-2xl border-b-4 font-bold text-sm transition-all shadow-sm
                                       ${item.state === 'matched' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 opacity-50 scale-95' : 
                                         item.state === 'selected' ? 'bg-sky-100 border-sky-300 text-sky-700 scale-105 ring-2 ring-sky-200' :
                                         item.state === 'wrong' ? 'bg-red-100 border-red-300 text-red-700 animate-shake' :
                                         'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                       }
                                    `}
                                 >
                                    {item.text}
                                 </button>
                              ))}
                           </div>
                        </>
                     )}

                     {/* TIPO 4: FILL IN THE BLANK (NOVO) */}
                     {currentLesson.type === 'fill_blank' && currentLesson.fill_blank && (
                        <>
                           <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-2">Complete a Lacuna</h3>
                           <p className="text-sm font-serif italic text-slate-600 dark:text-slate-400 mb-8">"{currentLesson.fill_blank.translation}"</p>
                           
                           <div className="text-2xl font-bold text-slate-900 dark:text-white mb-10 leading-relaxed text-center">
                              {currentLesson.fill_blank.sentence_start} 
                              <span className={`mx-2 inline-block min-w-[100px] border-b-4 text-center ${isFillCorrect === true ? 'border-emerald-500 text-emerald-600' : isFillCorrect === false ? 'border-red-500 text-red-600' : 'border-slate-300 text-slate-400'}`}>
                                 {fillSelected || "____"}
                              </span>
                              {currentLesson.fill_blank.sentence_end}
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              {currentLesson.fill_blank.options.map((opt, idx) => {
                                 const isCorrect = opt === currentLesson.fill_blank?.correct_word;
                                 let btnClass = "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20";
                                 
                                 // Feedback visual após seleção
                                 if (fillSelected) {
                                    if (fillSelected === opt) {
                                       if (isFillCorrect) btnClass = "bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/30";
                                       else btnClass = "bg-red-500 border-red-600 text-white shadow-red-500/30 animate-shake";
                                    }
                                 }

                                 return (
                                    <button
                                       key={idx}
                                       onClick={() => checkFillBlank(opt)}
                                       disabled={fillSelected !== null}
                                       className={`p-6 rounded-2xl border-b-4 font-bold text-center transition-all text-lg shadow-sm ${btnClass}`}
                                    >
                                       {opt}
                                    </button>
                                 );
                              })}
                           </div>
                        </>
                     )}

                     {/* Feedback Panel (Generico para Erros) */}
                     {(isQuizCorrect === false || isScrambleCorrect === false || isFillCorrect === false) && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-800 text-left animate-in slide-in-from-bottom-2">
                           <p className="text-red-600 dark:text-red-400 font-bold text-sm mb-1">Incorreto</p>
                           <p className="text-red-800 dark:text-red-200 text-xs">Você perdeu uma vida.</p>
                        </div>
                     )}
                  </div>
               )}

               {/* STEP 4: SUCCESS */}
               {lessonStep === 'success' && (
                  <div className="space-y-8 w-full animate-in zoom-in duration-500 flex flex-col items-center">
                     <div className="w-40 h-40 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-4 animate-bounce">
                        <Trophy size={80} className="text-white" />
                     </div>
                     
                     <div>
                        <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Excelente!</h2>
                        <p className="text-slate-500 font-medium text-lg">Lição concluída com sucesso.</p>
                     </div>

                     <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8">
                        <div className="bg-slate-100 dark:bg-white/10 p-6 rounded-[2rem] flex flex-col items-center">
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Recompensa</p>
                           <p className="text-2xl font-black text-usp-gold">+{currentLesson.xp_reward} XP</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-white/10 p-6 rounded-[2rem] flex flex-col items-center">
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Desbloqueado</p>
                           <p className="text-2xl font-black text-sky-500">{currentLesson.words_unlocked.length} Words</p>
                        </div>
                     </div>

                     {currentLesson.words_unlocked.length > 0 && (
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-2xl w-full max-w-sm">
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Novos Termos no Vade Mecum</p>
                           <div className="flex flex-wrap gap-2 justify-center">
                              {currentLesson.words_unlocked.map(w => (
                                 <span key={w} className="bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-lg text-xs font-bold">{w}</span>
                              ))}
                           </div>
                        </div>
                     )}

                     <button 
                        onClick={completeLesson} 
                        className="w-full max-w-md py-5 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all mt-8"
                     >
                        Resgatar & Continuar
                     </button>
                  </div>
               )}

            </div>
         </div>
      )}

    </div>
  );
};

export default SanFranIdiomas;
