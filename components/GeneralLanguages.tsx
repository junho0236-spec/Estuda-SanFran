
import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  BookOpen, 
  CheckCircle2, 
  Lock, 
  Star, 
  Trophy, 
  Volume2, 
  ArrowRight, 
  Languages, 
  Zap, 
  GraduationCap,
  MessageSquare,
  Sparkles,
  Search,
  X
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface GeneralLanguagesProps {
  userId: string;
}

type LangCode = 'en' | 'es' | 'fr' | 'de' | 'it';

const LANGUAGES_CONFIG: Record<LangCode, { label: string, flag: string, color: string, accent: string }> = {
  en: { label: 'English', flag: '🇺🇸', color: 'bg-indigo-600', accent: 'text-indigo-400' },
  es: { label: 'Español', flag: '🇪🇸', color: 'bg-red-500', accent: 'text-red-400' },
  fr: { label: 'Français', flag: '🇫🇷', color: 'bg-blue-600', accent: 'text-blue-400' },
  de: { label: 'Deutsch', flag: '🇩🇪', color: 'bg-yellow-500', accent: 'text-yellow-600' },
  it: { label: 'Italiano', flag: '🇮🇹', color: 'bg-emerald-600', accent: 'text-emerald-400' }
};

interface Lesson {
  id: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  title: string;
  description: string;
  theory: string;
  example: string;
  question: string;
  options: string[];
  answer: number;
}

const LESSONS_DATABASE: Record<LangCode, Lesson[]> = {
  en: [
    { id: 'en_a1_1', level: 'A1', title: 'Greetings', description: 'Formal and informal greetings.', theory: 'In English, we use "Hello" or "Hi" for simple greetings. In the morning, we say "Good morning".', example: "Hello, my name is Alex. Nice to meet you!", question: "How do you greet someone in the morning?", options: ["Good afternoon", "Good night", "Good morning"], answer: 2 },
    { id: 'en_a1_2', level: 'A1', title: 'The Verb To Be', description: 'Am, Is, Are basics.', theory: 'I am, You are, He/She/It is. This verb is used for state or identity.', example: "She is a student at USP.", question: "Complete: 'They ___ happy.'", options: ["is", "am", "are"], answer: 2 }
  ],
  es: [
    { id: 'es_a1_1', level: 'A1', title: 'Presentaciones', description: 'Presentarse a otros.', theory: 'Usamos "Hola" para saludar. Para decir el nombre decimos "Me llamo" o "Mi nombre es".', example: "Hola, me llamo Carmen. Soy de Madrid.", question: "¿Cómo dices tu nombre?", options: ["Me llamo...", "Hola soy...", "Todas son correctas"], answer: 2 }
  ],
  fr: [
    { id: 'fr_a1_1', level: 'A1', title: 'Salutations', description: 'Bonjour et au revoir.', theory: 'En français, on dit "Bonjour" pendant la journée et "Bonsoir" le soir.', example: "Bonjour, monsieur! Comment allez-vous?", question: "Comment salue-t-100p on le soir?", options: ["Bonjour", "Bonsoir", "Salut"], answer: 1 }
  ],
  de: [
    { id: 'de_a1_1', level: 'A1', title: 'Begrüßung', description: 'Grüße e Kennenlernen.', theory: 'Auf Deutsch sagt man "Guten Tag" für den Tag und "Guten Morgen" für den Morgen.', example: "Hallo! Ich bin Lucas. Wie geht es dir?", question: "Was sagt man am Morgen?", options: ["Guten Abend", "Guten Morgen", "Gute Nacht"], answer: 1 }
  ],
  it: [
    { id: 'it_a1_1', level: 'A1', title: 'Saluti', description: 'Ciao e Buongiorno.', theory: 'In italiano "Ciao" si usa sia per arrivare che per andare via in contesti informali.', example: "Buongiorno! Mi chiamo Giulia.", question: "Quale saluto è formale?", options: ["Ciao", "Buongiorno", "Ehi"], answer: 1 }
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

const GeneralLanguages: React.FC<GeneralLanguagesProps> = ({ userId }) => {
  const [currentLang, setCurrentLang] = useState<LangCode>('en');
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [lessonStep, setLessonStep] = useState<'theory' | 'quiz' | 'result'>('theory');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [userId]);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('general_lang_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        setCompletedLessons(data.completed_lessons || []);
        setTotalXP(data.total_xp || 0);
      } else if (error && error.code === 'PGRST116') {
        // Init progress
        await supabase.from('general_lang_progress').insert({
          user_id: userId,
          completed_lessons: [],
          total_xp: 0
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const startLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setLessonStep('theory');
    setSelectedOption(null);
  };

  const handleAnswer = (idx: number) => {
    if (lessonStep !== 'quiz') return;
    setSelectedOption(idx);
    const correct = idx === activeLesson?.answer;
    
    if (correct) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
    setLessonStep('result');
  };

  const completeLesson = async () => {
    if (!activeLesson) return;

    const isFirstTime = !completedLessons.includes(activeLesson.id);
    const newCompleted = isFirstTime ? [...completedLessons, activeLesson.id] : completedLessons;
    const addedXP = isFirstTime ? 50 : 0;
    const newXP = totalXP + addedXP;

    try {
      await supabase.from('general_lang_progress').update({
        completed_lessons: newCompleted,
        total_xp: newXP
      }).eq('user_id', userId);
      
      setCompletedLessons(newCompleted);
      setTotalXP(newXP);
    } catch (e) { console.error(e); }

    setActiveLesson(null);
  };

  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<LangCode, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' };
      utterance.lang = langMap[currentLang];
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>;

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-700 pb-20 px-2 md:px-0">
      
      {/* LANGUAGE SELECTOR */}
      <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar shrink-0">
         {(Object.keys(LANGUAGES_CONFIG) as LangCode[]).map(lc => (
            <button
               key={lc}
               onClick={() => { setCurrentLang(lc); setActiveLesson(null); }}
               className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all border-2 ${currentLang === lc ? `${LANGUAGES_CONFIG[lc].color} text-white border-transparent shadow-xl scale-105` : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300'}`}
            >
               <span className="text-xl">{LANGUAGES_CONFIG[lc].flag}</span>
               {LANGUAGES_CONFIG[lc].label}
            </button>
         ))}
      </div>

      {/* DASHBOARD INFO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 shrink-0">
         <div className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2.5rem] border border-slate-200 dark:border-indigo-500/20 shadow-xl flex items-center gap-6">
            <div className={`p-4 rounded-2xl ${LANGUAGES_CONFIG[currentLang].color} text-white shadow-lg`}>
               <Globe size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Idioma Ativo</p>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{LANGUAGES_CONFIG[currentLang].label}</h3>
            </div>
         </div>
         <div className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2.5rem] border border-slate-200 dark:border-indigo-500/20 shadow-xl flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-yellow-500 text-white shadow-lg">
               <Trophy size={24} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Acumulado</p>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{totalXP} XP</h3>
            </div>
         </div>
      </div>

      {/* LEARNING PATH */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-12">
         {['A1', 'A2', 'B1', 'B2', 'C1'].map(level => {
            const levelLessons = (LESSONS_DATABASE[currentLang] || []).filter(l => l.level === level);
            if (levelLessons.length === 0) return null;

            return (
               <div key={level} className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg border-4 border-white dark:border-slate-800 shadow-lg">{level}</div>
                     <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">
                        {level === 'A1' ? 'Iniciante' : level === 'A2' ? 'Elementar' : level === 'B1' ? 'Intermediário' : 'Avançado'}
                     </h4>
                     <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {levelLessons.map((lesson) => {
                        const isDone = completedLessons.includes(lesson.id);
                        return (
                           <button 
                             key={lesson.id}
                             onClick={() => startLesson(lesson)}
                             className={`group relative p-6 rounded-[2.5rem] border-2 transition-all text-left flex flex-col justify-between h-48 overflow-hidden shadow-lg hover:shadow-xl ${isDone ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500/30' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-indigo-400'}`}
                           >
                              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                 <GraduationCap size={100} />
                              </div>

                              <div className="relative z-10">
                                 <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-xl ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                                       {isDone ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}
                                    </div>
                                    {isDone && <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">+50 XP</span>}
                                 </div>
                                 <h5 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">{lesson.title}</h5>
                                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{lesson.description}</p>
                              </div>

                              <div className="relative z-10 flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                                 Iniciar Lição <ArrowRight size={14} />
                              </div>
                           </button>
                        )
                     })}
                  </div>
               </div>
            );
         })}

         {/* EMPTY STATE FOR LANGS WITHOUT LESSONS */}
         {(!LESSONS_DATABASE[currentLang] || LESSONS_DATABASE[currentLang].length === 0) && (
            <div className="py-20 text-center flex flex-col items-center opacity-40">
               <Search size={64} className="mb-4 text-slate-300" />
               <p className="text-xl font-black uppercase text-slate-400">Currículo em Construção</p>
               <p className="text-sm font-bold text-slate-400 mt-1">Estamos redigindo as lições para este idioma.</p>
            </div>
         )}
      </div>

      {/* LESSON MODAL */}
      {activeLesson && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0d0303] w-full max-w-2xl h-[90vh] rounded-[3rem] shadow-2xl border-4 border-white/5 relative flex flex-col overflow-hidden animate-in zoom-in-95">
               
               <header className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                     <div className={`p-3 rounded-2xl ${LANGUAGES_CONFIG[currentLang].color} text-white`}>
                        <GraduationCap size={24} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{activeLesson.title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lição {activeLesson.level}</p>
                     </div>
                  </div>
                  <button onClick={() => setActiveLesson(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
               </header>

               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                  {lessonStep === 'theory' ? (
                     <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                        <div className="space-y-4">
                           <h4 className="text-sm font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-2">
                              <Sparkles size={16} /> Teoria Fundamental
                           </h4>
                           <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 shadow-inner">
                              <p className="text-xl font-serif leading-relaxed text-slate-800 dark:text-slate-200">
                                 {activeLesson.theory}
                              </p>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <h4 className="text-sm font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-2">
                              <Volume2 size={16} /> Exemplo Prático
                           </h4>
                           <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between group">
                              <p className="text-lg font-bold text-indigo-900 dark:text-indigo-200 italic">"{activeLesson.example}"</p>
                              <button onClick={() => playAudio(activeLesson.example)} className="p-4 bg-indigo-600 text-white rounded-full shadow-lg group-hover:scale-110 transition-transform">
                                 <Volume2 size={24} />
                              </button>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-10 animate-in fade-in zoom-in-95">
                        <div className="text-center">
                           <h4 className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] mb-4">Verificação de Conhecimento</h4>
                           <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                              {activeLesson.question}
                           </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                           {activeLesson.options.map((opt, idx) => {
                              const isSelected = selectedOption === idx;
                              const isCorrect = idx === activeLesson.answer;
                              let style = "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400";
                              
                              if (lessonStep === 'result') {
                                 if (isCorrect) style = "bg-emerald-500 border-emerald-600 text-white shadow-lg scale-105";
                                 else if (isSelected) style = "bg-red-500 border-red-600 text-white opacity-100";
                                 else style = "opacity-40 grayscale pointer-events-none";
                              }

                              return (
                                 <button
                                   key={idx}
                                   disabled={lessonStep === 'result'}
                                   onClick={() => handleAnswer(idx)}
                                   className={`p-6 rounded-[2rem] border-2 text-center font-black uppercase text-sm tracking-widest transition-all ${style}`}
                                 >
                                    {opt}
                                 </button>
                              )
                           })}
                        </div>
                     </div>
                  )}
               </div>

               <footer className="p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 shrink-0 flex justify-between items-center">
                  {lessonStep === 'theory' ? (
                     <button 
                       onClick={() => setLessonStep('quiz')}
                       className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                     >
                        Testar Conhecimento <ArrowRight size={18} />
                     </button>
                  ) : lessonStep === 'result' ? (
                     <button 
                       onClick={completeLesson}
                       className={`w-full py-4 rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform ${selectedOption === activeLesson.answer ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'}`}
                     >
                        {selectedOption === activeLesson.answer ? 'Concluir Lição' : 'Tentar Novamente (Sair)'}
                     </button>
                  ) : (
                     <div className="w-full flex justify-between text-slate-400 font-black text-[10px] uppercase tracking-widest">
                        <span>XP: +50</span>
                        <span>Dificuldade: Média</span>
                     </div>
                  )}
               </footer>

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

export default GeneralLanguages;
