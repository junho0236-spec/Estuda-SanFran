
import React, { useState, useEffect, useRef } from 'react';
import { Globe, BookOpen, CheckCircle2, Lock, X, Flame, Trophy, Volume2, Star, Quote, Heart, ArrowRight, Flag, BrainCircuit, Ear, Search, GraduationCap, Zap, Calendar, Shuffle, FileText, Coffee, Languages } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { IdiomaLesson, IdiomaProgress } from '../types';
import confetti from 'canvas-confetti';

interface SanFranIdiomasProps {
  userId: string;
}

type LangCode = 'en' | 'es' | 'fr' | 'de' | 'it';

const LANGUAGES_CONFIG: Record<LangCode, { label: string, flag: string, color: string }> = {
  en: { label: 'English', flag: '🇺🇸', color: 'bg-blue-600' },
  es: { label: 'Español', flag: '🇪🇸', color: 'bg-red-500' },
  fr: { label: 'Français', flag: '🇫🇷', color: 'bg-indigo-600' },
  de: { label: 'Deutsch', flag: '🇩🇪', color: 'bg-yellow-600' },
  it: { label: 'Italiano', flag: '🇮🇹', color: 'bg-emerald-600' }
};

// --- DATA: MULTILINGUAL CONTENT ---
const DAILY_BRIEFINGS: Record<LangCode, any[]> = {
  en: [
    {
      id: 'brief_en_1',
      title: 'Contract Clause Review',
      context: 'Você recebeu este e-mail de um associado sênior.',
      text: "Please review the indemnity clause in the Alpha Agreement. Ensure that the liability cap does not exceed 100% of the fees paid in the preceding 12 months, except in cases of gross negligence or willful misconduct.",
      question: "Qual é a exceção para o limite de responsabilidade (cap)?",
      options: ["Atraso no pagamento", "Negligência grave ou dolo", "Quebra de confidencialidade"],
      answer: 1,
      translation: "Grave negligência ou má conduta intencional (dolo)."
    }
  ],
  es: [
    {
      id: 'brief_es_1',
      title: 'Notificación de Demanda',
      context: 'Documento recebido na recepção do escritório.',
      text: "Se le notifica que se ha interpuesto una demanda de juicio ordinario civil en su contra. Usted dispone de un plazo de veinte días hábiles para contestar a la demanda o presentar las excepciones que estime oportunas.",
      question: "Qual o prazo para contestar a demanda mencionada?",
      options: ["10 dias úteis", "15 dias corridos", "20 dias úteis"],
      answer: 2,
      translation: "20 dias úteis (días hábiles)."
    }
  ],
  fr: [
    {
      id: 'brief_fr_1',
      title: 'Assignation en Justice',
      context: 'Extrait d\'un document d\'huissier.',
      text: "Le demandeur sollicite la résolution du contrat aux torts exclusifs du défendeur, ainsi que l'allocation de dommages-intérêts en réparation du préjudice subi du fait de l'inexécution contractuelle.",
      question: "O que o 'demandeur' está solicitando?",
      options: ["A renovação do contrato", "A resolução do contrato e perdas e danos", "O perdão da dívida"],
      answer: 1,
      translation: "Resolução do contrato e perdas e danos (dommages-intérêts)."
    }
  ],
  de: [
    {
      id: 'brief_de_1',
      title: 'Klagebegründung',
      context: 'Auszug aus einem juristischen Schriftsatz.',
      text: "Die Klage ist zulässig und begründet. Der Kläger hat gegen den Beklagten einen Anspruch auf Schadensersatz aus § 823 BGB wegen schuldhafter Eigentumsverletzung.",
      question: "Com base em qual parágrafo do BGB o autor fundamenta o pedido?",
      options: ["§ 433", "§ 823", "§ 242"],
      answer: 1,
      translation: "Parágrafo 823 do Código Civil Alemão (BGB)."
    }
  ],
  it: [
    {
      id: 'brief_it_1',
      title: 'Atto di Citazione',
      context: 'Notifica di avvio procedimento.',
      text: "L'attore conviene in giudizio il convenuto per sentire dichiarare l'inadempimento dell'obbligazione contrattuale e per ottenere il risarcimento del danno emergente e del lucro cessante.",
      question: "Quais danos o autor pretende ver ressarcidos?",
      options: ["Apenas dano moral", "Dano emergente e lucro cessante", "Danos estéticos apenas"],
      answer: 1,
      translation: "Dano emergente e lucro cessante (risarcimento del danno)."
    }
  ]
};

const WORD_DATABASE: Record<LangCode, Record<string, { translation: string; definition: string; example: string }>> = {
  en: {
    "Lawyer": { translation: "Advogado / Jurista", definition: "Termo genérico para qualquer profissional qualificado em Direito.", example: "She is a lawyer, but she works in academia." },
    "Court": { translation: "Tribunal / Corte", definition: "O órgão ou local onde a justiça é administrada.", example: "The court will recess for lunch." },
    "Judge": { translation: "Juiz", definition: "O oficial público que decide casos em uma corte de lei.", example: "The judge overruled the objection." },
    "Plaintiff": { translation: "Autor / Requerente", definition: "A parte que inicia uma ação civil.", example: "The plaintiff is seeking damages." }
  },
  es: {
    "Abogado": { translation: "Advogado", definition: "Persona legalmente autorizada para defender en juicio los derechos de los litigantes.", example: "El abogado presentó la apelación a tiempo." },
    "Juez": { translation: "Juiz", definition: "Miembro de un jurado o tribunal que tiene autoridad para juzgar y sentenciar.", example: "El juez dictó sentencia definitiva." },
    "Tribunal": { translation: "Tribunal", definition: "Lugar donde jueces o magistrados administran justicia.", example: "El caso será resuelto en el tribunal civil." },
    "Sentencia": { translation: "Sentença", definition: "Resolución de un juez o un tribunal con la que se concluye un juicio.", example: "La sentencia fue favorable para el demandante." }
  },
  fr: {
    "Avocat": { translation: "Advogado", definition: "Personne dont la profession est de conseiller en matière juridique ou de défendre ses clients devant la justice.", example: "L'avocat de la défense a pris la parole." },
    "Juge": { translation: "Juiz", definition: "Magistrat chargé de rendre la justice en appliquant les lois.", example: "Le juge a ordonné une enquête complémentaire." },
    "Cour": { translation: "Corte / Tribunal", definition: "Organe chargé de rendre la justice, souvent de degré supérieur.", example: "L'affaire a été portée devant la Cour de cassation." },
    "Procès": { translation: "Processo / Julgamento", definition: "Litige porté devant un tribunal.", example: "Le procès a duré trois semaines." }
  },
  de: {
    "Anwalt": { translation: "Advogado", definition: "Person, die beruflich andere Personen in Rechtsangelegenheiten berät.", example: "Der Anwalt prüft den Vertrag." },
    "Richter": { translation: "Juiz", definition: "Person, die beruflich an einem Gericht Urteile fällt.", example: "Der Richter verkündete das Urteil." },
    "Gericht": { translation: "Tribunal", definition: "Staatliches Organ der Rechtsprechung.", example: "Das Gericht hat die Klage abgewiesen." },
    "Urteil": { translation: "Sentença / Veredito", definition: "Die am Ende eines Prozesses stehende Entscheidung des Gerichts.", example: "Das Urteil ist rechtskräftig." }
  },
  it: {
    "Avvocato": { translation: "Advogado", definition: "Professionista che assiste e rappresenta le parti in un processo.", example: "L'avvocato ha preparato la memoria difensiva." },
    "Giudice": { translation: "Juiz", definition: "Persona investita della funzione di giudicare in un processo.", example: "Il giudice ha accolto il ricorso." },
    "Tribunale": { translation: "Tribunal", definition: "Organo che esercita la funzione giurisdizionale.", example: "L'udienza si terrà in tribunale domani." },
    "Sentenza": { translation: "Sentença", definition: "Provvedimento del giudice che definisce la causa.", example: "La sentenza di primo grado è stata appellata." }
  }
};

const LESSONS_DB: IdiomaLesson[] = [
  // --- INGLÊS ---
  { id: 'en-1-1', module: 'Foundations', title: 'The Legal Profession', description: 'Lawyer, Attorney & Barrister', type: 'quiz', theory: "Em inglês, 'Lawyer' é o gênero (qualquer jurista). 'Attorney' (EUA) é quem tem a carteira da ordem (Bar). No Reino Unido, divide-se em 'Solicitor' (escritório/contratos) e 'Barrister' (tribunal/beca).", example_sentence: "Although she is a qualified lawyer, she is not practicing as an attorney currently.", quiz: { question: "Qual termo descreve o advogado que atua no tribunal (UK)?", options: ["Solicitor", "Barrister", "Paralegal"], answer: 1, explanation: "Barristers são os advogados especializados em sustentação oral e litígio nas cortes superiores do Reino Unido." }, xp_reward: 100, words_unlocked: ['Lawyer', 'Attorney-at-Law', 'Barrister', 'Solicitor'] },
  
  // --- ESPANHOL ---
  { id: 'es-1-1', module: 'Fundamentos', title: 'La Profesión Legal', description: 'Abogado & Procurador', type: 'quiz', theory: "Em espanhol, 'Abogado' é o profissional que defende a parte. O 'Procurador' tem funções de representação processual técnica, similar ao sistema brasileiro, mas com distinções específicas de atuação em juízo na Espanha.", example_sentence: "El abogado de la defensa presentó sus conclusiones finales ante el tribunal.", quiz: { question: "Como se chama a pessoa que julga os casos?", options: ["Abogado", "Juez", "Fiscal"], answer: 1, explanation: "El Juez es la autoridad encargada de juzgar y dictar sentencia." }, xp_reward: 100, words_unlocked: ['Abogado', 'Juez', 'Tribunal', 'Sentencia'] },

  // --- FRANCÊS ---
  { id: 'fr-1-1', module: 'Les Bases', title: 'Le Système Juridique', description: 'Avocat & Magistrat', type: 'quiz', theory: "A França é o berço do 'Droit Civil' (Sistema Romano-Germânico). 'Avocat' é o termo para advogado. 'Magistrat' engloba tanto juízes (siège) quanto promotores (parquet).", example_sentence: "Le Code Civil est le socle du droit privé français.", quiz: { question: "Qual termo refere-se à decisão final de um tribunal?", options: ["Avocat", "Arrêt", "Dossier"], answer: 1, explanation: "Un 'Arrêt' est une décision rendue par une cour supérieure." }, xp_reward: 100, words_unlocked: ['Avocat', 'Juge', 'Cour', 'Procès'] },

  // --- ALEMÃO ---
  { id: 'de-1-1', module: 'Grundlagen', title: 'Rechtssystem', description: 'Recht & Gesetz', type: 'quiz', theory: "O Direito Alemão é conhecido pela sua precisão terminológica. 'Recht' é o Direito como sistema, enquanto 'Gesetz' é a lei escrita específica.", example_sentence: "Der Richter wendet das Gesetz auf den vorliegenden Fall an.", quiz: { question: "O que significa 'Rechtsanwalt'?", options: ["Juiz", "Advogado", "Testemunha"], answer: 1, explanation: "Rechtsanwalt é o termo formal para advogado na Alemanha." }, xp_reward: 100, words_unlocked: ['Anwalt', 'Richter', 'Gericht', 'Urteil'] },

  // --- ITALIANO ---
  { id: 'it-1-1', module: 'Fondamenti', title: 'L\'Avvocatura', description: 'Avvocato & Diritto', type: 'quiz', theory: "A tradição jurídica italiana é riquíssima. 'Diritto' é o Direito. 'Avvocato' é o profissional da lei. O sistema processual tem semelhanças estruturais com o português.", example_sentence: "L'avvocato ha il dovere di agire con lealtà e correttezza.", quiz: { question: "Como se diz 'Justiça' em italiano?", options: ["Legge", "Giustizia", "Corte"], answer: 1, explanation: "La Giustizia è il fine ultimo dell'ordinamento giuridico." }, xp_reward: 100, words_unlocked: ['Avvocato', 'Giudice', 'Tribunale', 'Sentenza'] }
];

const SanFranIdiomas: React.FC<SanFranIdiomasProps> = ({ userId }) => {
  const [currentLang, setCurrentLang] = useState<LangCode>('en');
  const [progress, setProgress] = useState<IdiomaProgress | null>(null);
  const [currentLesson, setCurrentLesson] = useState<IdiomaLesson | null>(null);
  const [activeTab, setActiveTab] = useState<'path' | 'glossary'>('path');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [todayXP, setTodayXP] = useState(0); 
  
  // Briefing State
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [briefingStep, setBriefingStep] = useState<'read' | 'quiz' | 'success'>('read');
  const [briefingCompletedToday, setBriefingCompletedToday] = useState(false);
  
  // Lesson State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonStep, setLessonStep] = useState<'theory' | 'listen' | 'exercise' | 'success'>('theory');
  const [sessionLives, setSessionLives] = useState(3);
  
  // Exercise States
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [isQuizCorrect, setIsQuizCorrect] = useState<boolean | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- INIT ---
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
          current_level_id: 'en-1-1',
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
      if (data) {
        setProgress(data);
        const today = new Date().toISOString().split('T')[0];
        setBriefingCompletedToday(data.last_activity_date === today);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getUnlockedWords = () => {
    if (!progress) return [];
    const words: string[] = [];
    LESSONS_DB.forEach(lesson => {
      if (progress.completed_lessons.includes(lesson.id) && lesson.id.startsWith(currentLang)) {
        words.push(...lesson.words_unlocked);
      }
    });
    return Array.from(new Set(words)).sort();
  };

  const getDailyBriefing = () => {
    const list = DAILY_BRIEFINGS[currentLang] || DAILY_BRIEFINGS.en;
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const index = dayOfYear % list.length;
    return list[index];
  };

  const startDailyBriefing = () => {
    if (briefingCompletedToday) return;
    setBriefingStep('read');
    setQuizSelected(null);
    setIsQuizCorrect(null);
    setShowBriefingModal(true);
  };

  const handleBriefingAnswer = (idx: number) => {
    const brief = getDailyBriefing();
    const correct = idx === brief.answer;
    setQuizSelected(idx);
    setIsQuizCorrect(correct);

    if (correct) {
      playSuccessSound();
      setTimeout(() => setBriefingStep('success'), 1500);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
      handleWrongAnswer();
    }
  };

  const completeBriefing = async () => {
    if (!progress) return;
    const today = new Date().toISOString().split('T')[0];
    let newStreak = progress.streak_count;
    if (progress.last_activity_date !== today) newStreak += 1;

    const bonusXP = 50; 
    const newXP = progress.total_xp + bonusXP;

    try {
      await supabase.from('idiomas_progress').update({
        total_xp: newXP,
        streak_count: newStreak,
        last_activity_date: today
      }).eq('user_id', userId);

      setProgress(prev => prev ? ({ ...prev, total_xp: newXP, streak_count: newStreak, last_activity_date: today }) : null);
      setBriefingCompletedToday(true);
      setShowBriefingModal(false);
      setTodayXP(prev => prev + bonusXP);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (e) {
      console.error(e);
    }
  };

  const startLesson = (lessonId: string) => {
    const lesson = LESSONS_DB.find(l => l.id === lessonId);
    if (!lesson) return;

    setCurrentLesson(lesson);
    setLessonStep('theory');
    setSessionLives(3);
    setQuizSelected(null);
    setIsQuizCorrect(null);
    setShowLessonModal(true);
  };

  const handleWrongAnswer = () => {
     setSessionLives(prev => prev - 1);
     const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3');
     audio.volume = 0.3;
     audio.play().catch(() => {});
  };

  const playSuccessSound = () => {
     const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
     audio.volume = 0.3;
     audio.play().catch(() => {});
  }

  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<LangCode, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' };
      utterance.lang = langMap[currentLang];
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const completeLesson = async () => {
    if (!currentLesson || !progress) return;

    const newCompleted = [...(progress.completed_lessons || [])];
    if (!newCompleted.includes(currentLesson.id)) {
      newCompleted.push(currentLesson.id);
    }

    const currentLangLessons = LESSONS_DB.filter(l => l.id.startsWith(currentLang));
    const currentIndex = currentLangLessons.findIndex(l => l.id === currentLesson.id);
    const nextLessonId = currentLangLessons[currentIndex + 1]?.id || currentLesson.id;

    const today = new Date().toISOString().split('T')[0];
    let newStreak = progress.streak_count;
    if (progress.last_activity_date !== today) newStreak += 1;

    const earnedXP = currentLesson.xp_reward;
    setTodayXP(prev => prev + earnedXP);
    const newTotalXP = progress.total_xp + earnedXP;

    try {
      await supabase.from('idiomas_progress').update({
        completed_lessons: newCompleted,
        current_level_id: nextLessonId,
        total_xp: newTotalXP,
        streak_count: newStreak,
        last_activity_date: today
      }).eq('user_id', userId);

      setProgress(prev => prev ? ({
        ...prev,
        completed_lessons: newCompleted,
        current_level_id: nextLessonId,
        total_xp: newTotalXP,
        streak_count: newStreak,
        last_activity_date: today
      }) : null);

      setShowLessonModal(false);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (e) {
      console.error(e);
    }
  };

  const checkAnswer = (idx: number) => {
    if (isQuizCorrect !== null || !currentLesson?.quiz) return;
    const correct = idx === currentLesson.quiz.answer;
    setQuizSelected(idx);
    setIsQuizCorrect(correct);
    if (correct) { playSuccessSound(); setTimeout(() => setLessonStep('success'), 1500); confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } }); } else handleWrongAnswer();
  };

  if (isLoading || !progress) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sanfran-rubi"></div></div>;

  return (
    <div className="flex flex-col h-full relative" ref={containerRef}>
      
      {/* LANGUAGE TABS */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
         {(Object.keys(LANGUAGES_CONFIG) as LangCode[]).map(lc => (
            <button
               key={lc}
               onClick={() => setCurrentLang(lc)}
               className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border-2 ${currentLang === lc ? `${LANGUAGES_CONFIG[lc].color} text-white border-transparent shadow-xl scale-105` : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300'}`}
            >
               <span className="text-xl">{LANGUAGES_CONFIG[lc].flag}</span>
               {LANGUAGES_CONFIG[lc].label}
            </button>
         ))}
      </div>

      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
         <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl text-white shadow-lg ${LANGUAGES_CONFIG[currentLang].color}`}>
               <Globe size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Legal {LANGUAGES_CONFIG[currentLang].label}</h2>
               <div className="flex gap-3 mt-1">
                  <span className="text-[10px] font-bold text-orange-500 bg-orange-100 dark:bg-orange-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                     <Flame size={10} fill="currentColor" /> {progress.streak_count} Dias
                  </span>
                  <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                     <Trophy size={10} fill="currentColor" /> {progress.total_xp} XP
                  </span>
               </div>
            </div>
         </div>

         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setActiveTab('path')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'path' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Trilha</button>
            <button onClick={() => setActiveTab('glossary')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'glossary' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}> Vault</button>
         </div>
      </div>

      {activeTab === 'path' && (
         <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
            
            <div 
               onClick={startDailyBriefing}
               className={`mb-12 rounded-3xl border relative overflow-hidden transition-all duration-300 group cursor-pointer shadow-lg hover:shadow-xl ${briefingCompletedToday ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sanfran-rubi'}`}
            >
               <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 relative z-10">
                  <div className="flex-shrink-0 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-black/20 rounded-2xl min-w-[100px]">
                     {briefingCompletedToday ? (
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                           <CheckCircle2 size={24} />
                        </div>
                     ) : (
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-sanfran-rubi mb-2 group-hover:scale-110 transition-transform">
                           <Coffee size={24} />
                        </div>
                     )}
                     <span className={`text-[10px] font-black uppercase tracking-widest ${briefingCompletedToday ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {briefingCompletedToday ? 'Lido' : 'Pendente'}
                     </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                     <div className="flex items-center gap-2 mb-2">
                        <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                           O Briefing de {LANGUAGES_CONFIG[currentLang].label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                           <Calendar size={12} /> {new Date().toLocaleDateString('pt-BR')}
                        </span>
                     </div>
                     <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                        {getDailyBriefing().title}
                     </h3>
                     <p className="text-sm text-slate-500 font-medium line-clamp-2">
                        {briefingCompletedToday 
                           ? "Você já completou a leitura diária deste idioma. Volte amanhã para mais." 
                           : "Analise o caso prático e responda à questão jurídica do dia."}
                     </p>
                  </div>
               </div>
               <FileText className="absolute -right-6 -bottom-6 w-40 h-40 text-slate-100 dark:text-slate-800 rotate-12 pointer-events-none" />
            </div>

            <div className="space-y-16">
               <div className="flex flex-col gap-12 relative items-center">
                  <div className="absolute top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-800 left-1/2 -translate-x-1/2 -z-10 rounded-full"></div>
                  {LESSONS_DB.filter(l => l.id.startsWith(currentLang)).map((lesson, idx) => {
                     const isCompleted = progress.completed_lessons.includes(lesson.id);
                     const isCurrent = lesson.id === progress.current_level_id;
                     const isLocked = !isCompleted && !isCurrent;
                     
                     return (
                        <button 
                           key={lesson.id}
                           onClick={() => !isLocked && startLesson(lesson.id)}
                           disabled={isLocked}
                           className={`group relative w-full max-w-md bg-white dark:bg-slate-900 border-2 rounded-3xl p-4 flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95 ${isCompleted ? 'border-sky-500 shadow-sky-500/10' : isCurrent ? 'border-sanfran-rubi shadow-xl ring-4 ring-sanfran-rubi/10 scale-105' : 'border-slate-200 dark:border-slate-800 opacity-60 grayscale'}`}
                        >
                           <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${isCompleted ? 'bg-sky-500 text-white' : isCurrent ? 'bg-sanfran-rubi text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                              {isCompleted ? <CheckCircle2 size={24} /> : isLocked ? <Lock size={24} /> : <Star size={24} fill="currentColor" />}
                           </div>
                           <div className="text-left">
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Aula {idx + 1}</p>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{lesson.title}</h4>
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">{lesson.description}</p>
                           </div>
                        </button>
                     );
                  })}
               </div>
            </div>
         </div>
      )}

      {activeTab === 'glossary' && (
         <div className="flex-1 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20">
               {getUnlockedWords().length === 0 ? (
                  <div className="col-span-full py-20 text-center flex flex-col items-center opacity-50">
                     <Lock size={48} className="mb-4 text-slate-300" />
                     <p className="font-bold text-slate-400 uppercase">Termos de {LANGUAGES_CONFIG[currentLang].label} bloqueados.</p>
                  </div>
               ) : (
                  getUnlockedWords().map((word, idx) => (
                     <button 
                        key={idx} 
                        onClick={() => setSelectedWord(word)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl hover:border-sky-500 transition-all text-left group"
                     >
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">#{idx + 1}</span>
                           <Search size={14} className="text-slate-300 group-hover:text-sky-500" />
                        </div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{word}</p>
                     </button>
                  ))
               )}
            </div>
         </div>
      )}

      {/* MODALS (Simplified styling) */}
      {showBriefingModal && (
         <div className="fixed inset-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm flex flex-col animate-in slide-in-from-bottom-10 p-6">
            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full text-center">
               {briefingStep === 'read' && (
                  <div className="space-y-8 animate-in zoom-in-95">
                     <h2 className="font-serif text-3xl font-bold text-slate-900 dark:text-white mb-4">{getDailyBriefing().title}</h2>
                     <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl text-left relative overflow-hidden">
                        <p className="font-serif text-lg leading-relaxed text-slate-700 dark:text-slate-300">"{getDailyBriefing().text}"</p>
                     </div>
                     <button onClick={() => setBriefingStep('quiz')} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold uppercase">Responder Questão</button>
                  </div>
               )}
               {briefingStep === 'quiz' && (
                  <div className="space-y-6 w-full max-w-lg">
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white">{getDailyBriefing().question}</h3>
                     <div className="grid gap-3">
                        {getDailyBriefing().options.map((opt, idx) => (
                           <button key={idx} onClick={() => handleBriefingAnswer(idx)} className={`p-4 rounded-xl border-2 font-bold text-left transition-all ${quizSelected === idx ? (isQuizCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white animate-shake') : 'bg-white dark:bg-slate-800 border-slate-200'}`}>
                              {opt}
                           </button>
                        ))}
                     </div>
                  </div>
               )}
               {briefingStep === 'success' && (
                  <div className="space-y-6 flex flex-col items-center">
                     <Trophy size={80} className="text-yellow-500" />
                     <h2 className="text-3xl font-black text-slate-900 dark:text-white">Sucesso!</h2>
                     <button onClick={completeBriefing} className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold uppercase">Resgatar Recompensa</button>
                  </div>
               )}
            </div>
         </div>
      )}

      {showLessonModal && currentLesson && (
         <div className="fixed inset-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm flex flex-col animate-in slide-in-from-bottom-10 p-6">
            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full text-center">
               {lessonStep === 'theory' && (
                  <div className="space-y-8">
                     <h1 className="text-3xl font-black text-slate-900 dark:text-white">{currentLesson.title}</h1>
                     <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 shadow-lg text-left">
                        <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-serif">{currentLesson.theory}</p>
                     </div>
                     <button onClick={() => setLessonStep('listen')} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold uppercase">Avançar</button>
                  </div>
               )}
               {lessonStep === 'listen' && (
                  <div className="space-y-8">
                     <p className="text-2xl font-serif italic text-slate-800 dark:text-slate-200">"{currentLesson.example_sentence}"</p>
                     <button onClick={() => playAudio(currentLesson.example_sentence)} className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center shadow-lg mx-auto">
                        <Volume2 size={32} className="text-white" />
                     </button>
                     <button onClick={() => setLessonStep('exercise')} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold uppercase">Exercício</button>
                  </div>
               )}
               {lessonStep === 'exercise' && currentLesson.quiz && (
                  <div className="w-full max-w-lg space-y-6">
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white">{currentLesson.quiz.question}</h3>
                     <div className="grid gap-3">
                        {currentLesson.quiz.options.map((opt, idx) => (
                           <button key={idx} onClick={() => checkAnswer(idx)} className={`p-4 rounded-xl border-2 font-bold text-left transition-all ${quizSelected === idx ? (isQuizCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-white dark:bg-slate-800 border-slate-200'}`}>
                              {opt}
                           </button>
                        ))}
                     </div>
                  </div>
               )}
               {lessonStep === 'success' && (
                  <div className="space-y-6 flex flex-col items-center">
                     <Trophy size={80} className="text-yellow-500" />
                     <h2 className="text-4xl font-black text-slate-900 dark:text-white">Excelente!</h2>
                     <button onClick={completeLesson} className="w-full py-4 bg-sanfran-rubi text-white rounded-xl font-bold uppercase shadow-lg">Continuar</button>
                  </div>
               )}
            </div>
         </div>
      )}

      {selectedWord && (
         <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedWord(null)}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
               <div className={`h-32 relative p-6 ${LANGUAGES_CONFIG[currentLang].color}`}>
                  <button onClick={() => setSelectedWord(null)} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/40"><X size={16} /></button>
                  <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Termo {LANGUAGES_CONFIG[currentLang].label}</p>
                  <h2 className="text-3xl font-black text-white tracking-tight">{selectedWord}</h2>
               </div>
               <div className="p-6 space-y-4">
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{WORD_DATABASE[currentLang][selectedWord]?.translation}</p>
                  <p className="text-sm font-serif italic text-slate-600 dark:text-slate-400">"{WORD_DATABASE[currentLang][selectedWord]?.example}"</p>
                  <button onClick={() => playAudio(selectedWord)} className="w-full py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold uppercase text-xs">Ouvir Pronúncia</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default SanFranIdiomas;
