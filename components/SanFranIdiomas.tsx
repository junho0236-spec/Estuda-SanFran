import React, { useState, useEffect } from 'react';
import { Globe, BookOpen, CheckCircle2, Lock, ArrowRight, X, Heart, Star, Flame, Trophy, FileText, Scale, Quote } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { IdiomaLesson, IdiomaProgress } from '../types';
import confetti from 'canvas-confetti';

interface SanFranIdiomasProps {
  userId: string;
}

// MOCK DATA PARA AS LIÇÕES (Hardcoded para garantir constância e sem IA)
const LESSONS_DB: IdiomaLesson[] = [
  // --- MÓDULO 1: FOUNDATIONS ---
  {
    id: '1-1',
    module: 'Foundations',
    title: 'Lawyer vs. Attorney',
    description: 'A diferença básica entre os profissionais.',
    theory: "Em inglês, 'Lawyer' é o termo genérico para qualquer pessoa formada em Direito. 'Attorney' (ou Attorney-at-Law) é especificamente quem passou no exame da ordem (Bar Exam) e pode representar clientes em juízo nos EUA. No Reino Unido, a divisão é entre 'Solicitor' (escritório) e 'Barrister' (tribunal).",
    example_sentence: "He is a qualified lawyer, but he works in compliance, not as a practicing attorney.",
    quiz: {
      question: "Qual termo descreve melhor alguém que atua representando clientes na corte americana?",
      options: ["Lawyer", "Attorney", "Legal Advisor"],
      answer: 1,
      explanation: "Attorney-at-Law é o termo correto para quem tem licença para advogar nos EUA."
    },
    xp_reward: 100
  },
  {
    id: '1-2',
    module: 'Foundations',
    title: 'Court vs. Tribunal',
    description: 'Onde a justiça acontece.',
    theory: "'Court' é o termo padrão para o poder judiciário (ex: Supreme Court). 'Tribunal' geralmente se refere a órgãos especializados ou administrativos (ex: Employment Tribunal, Arbitration Tribunal), embora em português usemos 'Tribunal' para quase tudo.",
    example_sentence: "The case was heard in the High Court, but the dispute was settled by an arbitration tribunal.",
    quiz: {
      question: "Para se referir ao Supremo Tribunal dos EUA, você usaria:",
      options: ["Supreme Court", "Supreme Tribunal", "High Court"],
      answer: 0,
      explanation: "Nos EUA e UK, as instâncias judiciais máximas são chamadas de 'Courts'."
    },
    xp_reward: 100
  },
  {
    id: '1-3',
    module: 'Foundations',
    title: 'Plaintiff & Defendant',
    description: 'As partes do processo.',
    theory: "'Plaintiff' é o Autor da ação (quem processa) no cível. 'Defendant' é o Réu. No penal, o acusador é o 'Prosecutor'. No Reino Unido, o termo 'Plaintiff' foi modernizado para 'Claimant' em 1999, mas 'Plaintiff' ainda reina nos EUA.",
    example_sentence: "The plaintiff filed a lawsuit claiming damages against the defendant.",
    quiz: {
      question: "Quem é o 'Defendant'?",
      options: ["O Autor", "O Réu", "O Juiz"],
      answer: 1,
      explanation: "Defendant é aquele que se defende (Réu)."
    },
    xp_reward: 100
  },
  // --- MÓDULO 2: CONTRACT LAW ---
  {
    id: '2-1',
    module: 'Contract Law',
    title: 'Drafting vs. Writing',
    description: 'Escrever juridicamente.',
    theory: "Advogados não 'write' contratos, eles 'draft' (redigem/minutam). O substantivo é 'draft' (minuta). 'Drafting' envolve a técnica de escolher as palavras precisas para criar obrigações legais.",
    example_sentence: "I spent the whole afternoon drafting the merger agreement.",
    quiz: {
      question: "Qual o verbo correto para 'fazer uma minuta'?",
      options: ["Make", "Write", "Draft"],
      answer: 2,
      explanation: "Draft é o termo técnico para redação legal de instrumentos."
    },
    xp_reward: 150
  },
  {
    id: '2-2',
    module: 'Contract Law',
    title: 'Shall vs. May',
    description: 'Obrigação vs. Permissão.',
    theory: "'Shall' indica obrigação estrita (deve/fará). É o imperativo legal. 'May' indica permissão ou faculdade (pode). Errar isso muda completamente o sentido de uma cláusula.",
    example_sentence: "The Tenant shall pay the rent on the 5th. The Landlord may inspect the property with notice.",
    quiz: {
      question: "Se a cláusula diz 'The party may terminate', a parte é obrigada a terminar?",
      options: ["Sim", "Não"],
      answer: 1,
      explanation: "'May' indica uma faculdade/direito, não um dever."
    },
    xp_reward: 150
  },
  {
    id: '2-3',
    module: 'Contract Law',
    title: 'Breach of Contract',
    description: 'Inadimplemento.',
    theory: "'Breach' é a violação ou quebra do contrato. Pode ser 'Material Breach' (grave, permite rescisão) ou 'Minor Breach'. Quem comete a violação é a 'Breaching Party'.",
    example_sentence: "Failure to deliver the goods constitutes a material breach of this Agreement.",
    quiz: {
      question: "Como se diz 'Quebra de Contrato'?",
      options: ["Break of Contract", "Breach of Contract", "Smash of Contract"],
      answer: 1,
      explanation: "'Breach' é o termo técnico para violação contratual."
    },
    xp_reward: 150
  }
];

const SanFranIdiomas: React.FC<SanFranIdiomasProps> = ({ userId }) => {
  const [progress, setProgress] = useState<IdiomaProgress | null>(null);
  const [currentLesson, setCurrentLesson] = useState<IdiomaLesson | null>(null);
  const [showLesson, setShowLesson] = useState(false);
  const [quizStep, setQuizStep] = useState<'theory' | 'example' | 'quiz' | 'result'>('theory');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Inicialização
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
        // Criar progresso inicial
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

  const startLesson = (lessonId: string) => {
    const lesson = LESSONS_DB.find(l => l.id === lessonId);
    if (lesson) {
      setCurrentLesson(lesson);
      setQuizStep('theory');
      setSelectedOption(null);
      setShowLesson(true);
    }
  };

  const handleQuizAnswer = (idx: number) => {
    if (!currentLesson) return;
    setSelectedOption(idx);
    
    if (idx === currentLesson.quiz.answer) {
      setIsCorrect(true);
      setTimeout(() => setQuizStep('result'), 1500);
    } else {
      setIsCorrect(false);
      // Reduzir vida (visual por enquanto, ou implementar lógica de update no DB)
      if (progress && progress.lives > 0) {
         // Opcional: Atualizar vidas no DB
      }
    }
  };

  const finishLesson = async () => {
    if (!currentLesson || !progress) return;

    const newCompleted = [...(progress.completed_lessons || [])];
    if (!newCompleted.includes(currentLesson.id)) {
      newCompleted.push(currentLesson.id);
    }

    // Calcular próximo nível simples (próximo no array)
    const currentIndex = LESSONS_DB.findIndex(l => l.id === currentLesson.id);
    const nextLessonId = LESSONS_DB[currentIndex + 1]?.id || currentLesson.id;

    // Atualizar Streak (simples: se last_activity != hoje, +1)
    const today = new Date().toISOString().split('T')[0];
    let newStreak = progress.streak_count;
    if (progress.last_activity_date !== today) {
       newStreak += 1;
    }

    try {
      await supabase.from('idiomas_progress').update({
        completed_lessons: newCompleted,
        current_level_id: nextLessonId,
        total_xp: progress.total_xp + currentLesson.xp_reward,
        streak_count: newStreak,
        last_activity_date: today
      }).eq('user_id', userId);

      // Atualizar estado local
      setProgress(prev => prev ? ({
        ...prev,
        completed_lessons: newCompleted,
        current_level_id: nextLessonId,
        total_xp: prev.total_xp + currentLesson.xp_reward,
        streak_count: newStreak
      }) : null);

      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setShowLesson(false);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading || !progress) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sanfran-rubi"></div></div>;

  return (
    <div className="h-full flex flex-col relative pb-20 px-2 md:px-0 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <header className="flex items-center justify-between py-6 shrink-0 bg-white dark:bg-black/20 p-4 rounded-3xl border border-slate-100 dark:border-white/10 mb-8 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <Globe className="w-5 h-5 text-sky-500" />
               <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">Legal English</span>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-orange-500">
               <Flame className="w-5 h-5 fill-current" />
               <span className="font-black text-sm">{progress.streak_count}</span>
            </div>
            <div className="flex items-center gap-1 text-usp-gold">
               <Trophy className="w-5 h-5 fill-current" />
               <span className="font-black text-sm">{progress.total_xp}</span>
            </div>
            <div className="flex items-center gap-1 text-red-500">
               <Heart className="w-5 h-5 fill-current" />
               <span className="font-black text-sm">{progress.lives}</span>
            </div>
         </div>
      </header>

      {/* MAPA DE PROGRESSO */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center gap-8 py-8 relative">
         {/* Linha conectora de fundo */}
         <div className="absolute top-0 bottom-0 w-2 bg-slate-100 dark:bg-white/5 rounded-full left-1/2 -translate-x-1/2 -z-10"></div>

         {LESSONS_DB.map((lesson, index) => {
            const isCompleted = progress.completed_lessons?.includes(lesson.id);
            const isCurrent = lesson.id === progress.current_level_id;
            const isLocked = !isCompleted && !isCurrent;
            const offset = index % 2 === 0 ? '-translate-x-12' : 'translate-x-12';

            return (
               <div key={lesson.id} className={`relative flex flex-col items-center z-10 transition-transform ${isCurrent ? 'scale-110' : 'scale-100'}`}>
                  <button 
                    disabled={isLocked}
                    onClick={() => startLesson(lesson.id)}
                    className={`w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-xl transition-all relative group
                      ${isCompleted ? 'bg-sky-500 border-sky-600 text-white' : 
                        isCurrent ? 'bg-white dark:bg-sanfran-rubi border-sanfran-rubi animate-bounce-slow text-sanfran-rubi dark:text-white' : 
                        'bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/5 text-slate-400 cursor-not-allowed'}
                    `}
                  >
                     {isCompleted ? <CheckCircle2 size={32} /> : isLocked ? <Lock size={24} /> : <Star size={32} fill="currentColor" />}
                     
                     {/* Tooltip Mobile/Desktop */}
                     <div className={`absolute top-full mt-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-lg border border-slate-100 dark:border-white/10 w-40 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20`}>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{lesson.module}</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{lesson.title}</p>
                     </div>
                  </button>
               </div>
            );
         })}
         
         <div className="py-10 text-center opacity-50">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Fim do Módulo 1</p>
         </div>
      </div>

      {/* LIÇÃO MODAL */}
      {showLesson && currentLesson && (
         <div className="fixed inset-0 z-50 bg-[#f8f9fa] dark:bg-[#0d0303] flex flex-col animate-in slide-in-from-bottom-10 duration-300">
            {/* Header Lição */}
            <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
               <button onClick={() => setShowLesson(false)}><X size={24} className="text-slate-400" /></button>
               <div className="w-full max-w-xs h-2 bg-slate-200 dark:bg-white/10 rounded-full mx-4 overflow-hidden">
                  <div 
                    className="h-full bg-sky-500 transition-all duration-500" 
                    style={{ width: quizStep === 'theory' ? '33%' : quizStep === 'example' ? '66%' : '100%' }} 
                  />
               </div>
               <div className="w-6"></div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full text-center">
               
               {quizStep === 'theory' && (
                  <div className="space-y-8 animate-in fade-in zoom-in">
                     <h2 className="text-sm font-black uppercase tracking-[0.3em] text-sky-500">Briefing do Dia</h2>
                     <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">{currentLesson.title}</h1>
                     <div className="bg-white dark:bg-white/5 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-white/10 shadow-xl">
                        <p className="text-lg md:text-xl font-medium leading-relaxed text-slate-700 dark:text-slate-200">
                           {currentLesson.theory}
                        </p>
                     </div>
                     <button onClick={() => setQuizStep('example')} className="w-full py-4 bg-sky-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-sky-600 transition-all">
                        Continuar
                     </button>
                  </div>
               )}

               {quizStep === 'example' && (
                  <div className="space-y-8 animate-in slide-in-from-right-8">
                     <h2 className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500">Na Prática</h2>
                     <div className="relative">
                        <Quote size={48} className="absolute -top-6 -left-4 text-emerald-200 dark:text-emerald-900/40" />
                        <p className="text-2xl md:text-3xl font-serif italic text-slate-800 dark:text-slate-100 leading-relaxed">
                           "{currentLesson.example_sentence}"
                        </p>
                     </div>
                     <button onClick={() => setQuizStep('quiz')} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all">
                        Ir para o Teste
                     </button>
                  </div>
               )}

               {quizStep === 'quiz' && (
                  <div className="space-y-8 w-full animate-in slide-in-from-right-8">
                     <h2 className="text-sm font-black uppercase tracking-[0.3em] text-sanfran-rubi">Desafio Rápido</h2>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white">{currentLesson.quiz.question}</h3>
                     
                     <div className="grid gap-4">
                        {currentLesson.quiz.options.map((opt, idx) => {
                           const isSelected = selectedOption === idx;
                           let btnClass = "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-sky-500";
                           
                           if (isSelected) {
                              if (isCorrect) btnClass = "bg-emerald-500 border-emerald-600 text-white";
                              else btnClass = "bg-red-500 border-red-600 text-white";
                           }

                           return (
                              <button
                                 key={idx}
                                 onClick={() => handleQuizAnswer(idx)}
                                 className={`p-6 rounded-2xl border-2 font-bold text-left transition-all ${btnClass}`}
                              >
                                 {opt}
                              </button>
                           )
                        })}
                     </div>
                     {selectedOption !== null && !isCorrect && (
                        <p className="text-red-500 font-bold animate-shake">Tente novamente!</p>
                     )}
                  </div>
               )}

               {quizStep === 'result' && (
                  <div className="space-y-8 w-full animate-in zoom-in">
                     <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                        <CheckCircle2 size={64} className="text-white" />
                     </div>
                     <div>
                        <h2 className="text-3xl font-black text-emerald-500 uppercase tracking-tighter">Correto!</h2>
                        <p className="text-slate-500 font-medium mt-2">{currentLesson.quiz.explanation}</p>
                     </div>
                     <div className="bg-slate-100 dark:bg-white/10 p-4 rounded-xl inline-flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Recompensa</span>
                        <div className="flex items-center gap-1 text-usp-gold font-black">
                           <Trophy size={16} /> +{currentLesson.xp_reward} XP
                        </div>
                     </div>
                     <button onClick={finishLesson} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
                        Concluir Briefing
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