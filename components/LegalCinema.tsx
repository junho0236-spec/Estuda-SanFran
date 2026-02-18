
import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clapperboard, ArrowLeft, Tv, Ear, RefreshCw, ChevronRight, MousePointer2, Clock, Trophy, X, Info, Globe } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface LegalCinemaProps {
  userId: string;
}

type LangCode = 'en' | 'es' | 'fr' | 'de' | 'it';

interface InteractiveWord {
  word: string;
  translation: string;
  definition: string;
  example: string;
}

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  transcript: string;
  interactiveWords: InteractiveWord[]; 
  question: string;
  options: string[];
  correctAnswer: number;
  feedback: string;
}

interface DeepDiveClip {
  id: string;
  title: string;
  source_name: string;
  youtube_id: string;
  description: string;
  lang: LangCode;
  segments: VideoSegment[];
}

const LANGUAGES_CONFIG: Record<LangCode, { label: string, flag: string, color: string }> = {
  en: { label: 'English', flag: '🇺🇸', color: 'bg-blue-600' },
  es: { label: 'Español', flag: '🇪🇸', color: 'bg-red-500' },
  fr: { label: 'Français', flag: '🇫🇷', color: 'bg-indigo-600' },
  de: { label: 'Deutsch', flag: '🇩🇪', color: 'bg-yellow-600' },
  it: { label: 'Italiano', flag: '🇮🇹', color: 'bg-emerald-600' }
};

// --- DATABASE: CLIPS POR IDIOMA ---
const CLIPS_DATABASE: Record<LangCode, DeepDiveClip[]> = {
  en: [
    {
      id: 'suits_interview',
      title: 'The Interview (Full Deep Dive)',
      source_name: 'Suits',
      youtube_id: '85z53bAebsI', 
      description: "Análise fonética e técnica da contratação de Mike Ross.",
      lang: 'en',
      segments: [
        {
          id: 'en_1',
          startTime: 10,
          endTime: 23,
          transcript: "They're all gonna be walking in here in their fancy suits. I'm not looking for another associate. I'm looking for another me.",
          interactiveWords: [
            { word: "associate", translation: "Associado", definition: "A junior member of a law firm.", example: "She was hired as a junior associate." }
          ],
          question: "O que Harvey quer dizer com 'associate'?",
          options: ["Um sócio majoritário", "Um advogado júnior/membro da firma", "Um assistente administrativo"],
          correctAnswer: 1,
          feedback: "Correto! Associate é o termo padrão para advogados contratados que ainda não são sócios (partners)."
        }
      ]
    }
  ],
  es: [
    {
      id: 'contratiempo_prep',
      title: 'La Preparación del Testigo',
      source_name: 'Contratiempo (The Invisible Guest)',
      youtube_id: 'epCg2RbyF80',
      description: "Aprenda espanhol jurídico com a preparação de defesa em um caso de assassinato.",
      lang: 'es',
      segments: [
        {
          id: 'es_1',
          startTime: 5,
          endTime: 18,
          transcript: "Necesito que me cuente la verdad. Solo así podré articular una defensa creíble ante el tribunal.",
          interactiveWords: [
            { word: "defensa", translation: "Defesa", definition: "Argumentos para proteger al acusado.", example: "La defensa presentó nuevas pruebas." },
            { word: "tribunal", translation: "Tribunal", definition: "Lugar donde se administra justicia.", example: "El tribunal dictará sentencia mañana." }
          ],
          question: "Qual a condição imposta pela advogada no trecho?",
          options: ["Pagamento antecipado", "Que o cliente conte a verdade", "Que o cliente fuja do país"],
          correctAnswer: 1,
          feedback: "Exacto! Ela enfatiza que só com a verdade ('la verdad') pode articular uma defesa ('defensa')."
        }
      ]
    }
  ],
  fr: [
    {
      id: 'engrenages_proc',
      title: 'L\'Interrogatoire',
      source_name: 'Engrenages (Spiral)',
      youtube_id: 'Y3v7Xm-9yv4',
      description: "O sistema inquisitorial francês em ação. Foco em processo penal.",
      lang: 'fr',
      segments: [
        {
          id: 'fr_1',
          startTime: 40,
          endTime: 55,
          transcript: "Le procureur a décidé de vous placer en garde à vue. Vous avez le droit à um avocat.",
          interactiveWords: [
            { word: "procureur", translation: "Promotor", definition: "Magistrat qui représente le ministère public.", example: "Le procureur a requis une peine sévère." },
            { word: "avocat", translation: "Advogado", definition: "Professionnel du droit qui conseille et défend.", example: "L'avocat de la défense a plaidé non coupable." }
          ],
          question: "Qual direito é mencionado pelo policial no trecho?",
          options: ["Direito a um telefonema", "Direito a um advogado (avocat)", "Direito a fiança imediata"],
          correctAnswer: 1,
          feedback: "Très bien! 'L'avocat' é o termo francês para advogado."
        }
      ]
    }
  ],
  de: [
    {
      id: 'criminal_ger',
      title: 'Die Vernehmung',
      source_name: 'Criminal: Germany',
      youtube_id: 'v8-2K12fXpU',
      description: "Interrogatório policial sob as leis alemãs.",
      lang: 'de',
      segments: [
        {
          id: 'de_1',
          startTime: 15,
          endTime: 30,
          transcript: "Sie haben das Recht zu schweigen. Alles, was Sie sagen, kann vor Gericht gegen Sie verwendet werden.",
          interactiveWords: [
            { word: "Recht", translation: "Direito", definition: "Gesamtheit der Regeln.", example: "Das ist mein Recht." },
            { word: "Gericht", translation: "Tribunal", definition: "Ort der Rechtsprechung.", example: "Vor Gericht sind alle gleich." }
          ],
          question: "O que significa 'das Recht zu schweigen'?",
          options: ["Direito de falar", "Direito de mentir", "Direito de permanecer em silêncio"],
          correctAnswer: 2,
          feedback: "Richtig! 'Schweigen' significa silenciar/ficar calado."
        }
      ]
    }
  ],
  it: [
    {
      id: 'il_processo_pm',
      title: 'L\'Arringa del PM',
      source_name: 'Il Processo (The Trial)',
      youtube_id: 'XWn6yYyQ94I',
      description: "Argumentação da Promotoria (Pubblico Ministero) em um caso criminal.",
      lang: 'it',
      segments: [
        {
          id: 'it_1',
          startTime: 20,
          endTime: 35,
          transcript: "Le prove raccolte non lasciano spazio a dubbi. Chiediamo la condanna dell'imputato.",
          interactiveWords: [
            { word: "prove", translation: "Provas", definition: "Elementi per dimostrare un fatto.", example: "Le prove sono schiaccianti." },
            { word: "imputato", translation: "Réu / Acusado", definition: "Persona sottoposta a processo penale.", example: "L'imputato si dichiara innocente." }
          ],
          question: "O que a promotoria está pedindo ao tribunal?",
          options: ["A absolvição", "A condenação (condanna) do réu", "O adiamento da audiência"],
          correctAnswer: 1,
          feedback: "Corretto! 'Condanna' é condenação e 'imputato' é o réu."
        }
      ]
    }
  ]
};

const LegalCinema: React.FC<LegalCinemaProps> = ({ userId }) => {
  const [currentLang, setCurrentLang] = useState<LangCode>('en');
  const [activeClip, setActiveClip] = useState<DeepDiveClip | null>(null);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  
  // Quiz State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Interaction State
  const [selectedWordInfo, setSelectedWordInfo] = useState<InteractiveWord | null>(null);
  const [playerKey, setPlayerKey] = useState(0);

  const handleSelectClip = (clip: DeepDiveClip) => {
    setActiveClip(clip);
    setCurrentSegmentIdx(0);
    resetSegmentState();
    setCompleted(false);
  };

  const resetSegmentState = () => {
    setSelectedOption(null);
    setIsCorrect(null);
    setShowFeedback(false);
    setSelectedWordInfo(null);
    setPlayerKey(prev => prev + 1); 
  };

  const handleBack = () => {
    setActiveClip(null);
  };

  const handleAnswer = (idx: number) => {
    if (showFeedback || !activeClip) return;
    const segment = activeClip.segments[currentSegmentIdx];
    const correct = idx === segment.correctAnswer;
    setSelectedOption(idx);
    setIsCorrect(correct);
    setShowFeedback(true);
    if (correct) confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    else setTimeout(() => setPlayerKey(prev => prev + 1), 1000);
  };

  const nextSegment = () => {
    if (!activeClip) return;
    if (currentSegmentIdx < activeClip.segments.length - 1) {
      setCurrentSegmentIdx(prev => prev + 1);
      resetSegmentState();
    } else {
      setCompleted(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  };

  const renderTranscript = (segment: VideoSegment) => {
    const words = segment.transcript.split(' ');
    return (
      <div className="flex flex-wrap gap-2 justify-start items-baseline">
        {words.map((rawWord, i) => {
          const cleanWord = rawWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()""'']/g,"").toLowerCase();
          const interactive = segment.interactiveWords.find(w => w.word.toLowerCase() === cleanWord);
          if (interactive) {
            return (
              <button
                key={i}
                onClick={() => setSelectedWordInfo(interactive)}
                className={`text-sanfran-rubi font-black border-b-2 border-dotted border-sanfran-rubi/40 hover:bg-sanfran-rubi/10 px-0.5 rounded transition-all outline-none focus:ring-2 focus:ring-sanfran-rubi/20 ${selectedWordInfo?.word === interactive.word ? 'bg-sanfran-rubi/10 border-sanfran-rubi' : ''}`}
              >
                {rawWord}
              </button>
            );
          }
          return <span key={i} className="text-slate-700 dark:text-slate-200 font-serif">{rawWord}</span>;
        })}
      </div>
    );
  };

  if (!activeClip) {
    return (
      <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-6xl mx-auto font-sans">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
          <div>
             <div className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-700 dark:border-white/20 mb-4">
                <Clapperboard className="w-4 h-4 text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Cinema Jurídico Lab</span>
             </div>
             <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Multilingual Cinema</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">Escolha seu idioma e aprenda com o áudio original.</p>
          </div>
        </header>

        {/* LANGUAGE TABS */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {CLIPS_DATABASE[currentLang].map(clip => (
              <button 
                key={clip.id}
                onClick={() => handleSelectClip(clip)}
                className="group relative w-full aspect-video bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-slate-800 hover:border-sanfran-rubi transition-all duration-500"
              >
                 <img 
                   src={`https://img.youtube.com/vi/${clip.youtube_id}/maxresdefault.jpg`} 
                   alt="Thumbnail" 
                   className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                 <div className="absolute bottom-0 left-0 p-8 text-left w-full">
                    <span className="bg-sanfran-rubi text-white px-3 py-1 rounded-full text-[9px] font-black uppercase mb-3 inline-block">
                       {clip.source_name}
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2">{clip.title}</h3>
                    <p className="text-white/70 font-medium text-xs md:text-sm line-clamp-2">{clip.description}</p>
                 </div>
              </button>
           ))}
        </div>
      </div>
    );
  }

  const segment = activeClip.segments[currentSegmentIdx];
  const progressPercent = ((currentSegmentIdx + 1) / activeClip.segments.length) * 100;

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto pb-10 px-4 md:px-0 animate-in zoom-in-95 duration-300">
       <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-5">
             <button onClick={handleBack} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 transition-colors shadow-sm">
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-200" />
             </button>
             <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{activeClip.title}</h2>
                <div className="flex items-center gap-3 mt-1">
                   <span className="text-[10px] font-black text-sanfran-rubi uppercase tracking-[0.2em]">Cena {currentSegmentIdx + 1} de {activeClip.segments.length}</span>
                   <div className="w-32 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-sanfran-rubi transition-all duration-700" style={{ width: `${progressPercent}%` }}></div>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
          <div className="lg:col-span-7 flex flex-col gap-6 h-full">
             <div className="relative w-full aspect-video bg-black rounded-[3rem] overflow-hidden shadow-2xl border-[6px] border-slate-900 dark:border-white/5 group">
                {!completed ? (
                   <iframe 
                     key={playerKey}
                     width="100%" height="100%" 
                     src={`https://www.youtube.com/embed/${activeClip.youtube_id}?start=${segment.startTime}&end=${segment.endTime}&autoplay=1&rel=0&modestbranding=1&controls=0&origin=${window.location.origin}`} 
                     frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                     className="absolute inset-0 pointer-events-none"
                   ></iframe>
                ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0303]">
                      <CheckCircle2 size={80} className="text-emerald-500 mb-4 animate-bounce" />
                      <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Sessão Finalizada</h3>
                   </div>
                )}
                {!completed && (
                   <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 z-20">
                      <Clock size={12} className="text-white" />
                      <span className="text-[10px] font-black text-white tabular-nums">{segment.startTime}s - {segment.endTime}s</span>
                   </div>
                )}
                {!completed && (
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                      <button onClick={() => setPlayerKey(prev => prev + 1)} className="pointer-events-auto bg-white/20 hover:bg-white/40 backdrop-blur-xl text-white p-5 rounded-full border-2 border-white/30 shadow-2xl transition-all active:scale-90">
                         <RefreshCw size={32} />
                      </button>
                   </div>
                )}
             </div>

             {!completed && (
               <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 md:p-10 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl relative overflow-hidden flex-1">
                  <div className="absolute top-0 left-0 w-2 h-full bg-sanfran-rubi"></div>
                  <div className="flex items-center gap-3 mb-6">
                     <div className="bg-sanfran-rubi/10 p-2 rounded-xl text-sanfran-rubi"><Ear size={20} /></div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Transcript Sincronizado</p>
                        <p className="text-xs font-bold text-slate-500 italic">Clique nos termos destacados para detalhes.</p>
                     </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-serif font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                     “{renderTranscript(segment)}”
                  </div>

                  {selectedWordInfo && (
                    <div className="mt-8 p-6 bg-slate-900 text-white rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-4 duration-300 relative border border-white/10">
                      <button onClick={() => setSelectedWordInfo(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl text-sanfran-rubi"><Info size={24} /></div>
                        <div>
                          <div className="flex items-baseline gap-3 mb-1">
                            <h4 className="text-2xl font-black uppercase tracking-tight">{selectedWordInfo.word}</h4>
                            <span className="text-sky-400 font-black uppercase text-[10px] tracking-widest">{selectedWordInfo.translation}</span>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed mb-4">{selectedWordInfo.definition}</p>
                          <div className="pt-3 border-t border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Example</p>
                            <p className="text-xs italic text-slate-400">"{selectedWordInfo.example}"</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
               </div>
             )}
          </div>

          <div className="lg:col-span-5 flex flex-col h-full">
             {!completed ? (
                <div className="bg-slate-50 dark:bg-black/30 p-8 md:p-10 rounded-[3rem] border-2 border-slate-200 dark:border-white/5 shadow-inner h-full flex flex-col justify-between">
                   <div>
                      <div className="mb-10">
                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-white dark:bg-white/5 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/10 shadow-sm inline-block mb-6">Verificação de Contexto</span>
                         <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">{segment.question}</h3>
                      </div>
                      <div className="space-y-4">
                         {segment.options.map((opt, idx) => {
                            let btnClass = "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-sanfran-rubi hover:shadow-lg hover:scale-[1.01]";
                            if (showFeedback) {
                               if (idx === segment.correctAnswer) btnClass = "bg-emerald-500 border-emerald-600 text-white ring-8 ring-emerald-500/10 shadow-2xl";
                               else if (idx === selectedOption) btnClass = "bg-red-600 border-red-700 text-white opacity-100 ring-8 ring-red-500/10";
                               else btnClass = "opacity-30 grayscale pointer-events-none";
                            }
                            return (
                               <button key={idx} onClick={() => handleAnswer(idx)} disabled={showFeedback} className={`w-full p-6 rounded-[2rem] border-2 text-left font-bold text-sm md:text-base transition-all duration-300 flex justify-between items-center group ${btnClass}`}>
                                  <span className="flex-1 pr-4">{opt}</span>
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${showFeedback ? 'bg-white/20 border-white' : 'border-slate-100 group-hover:border-sanfran-rubi'}`}>
                                     {showFeedback && idx === segment.correctAnswer ? <CheckCircle2 size={20} /> : showFeedback && idx === selectedOption ? <XCircle size={20} /> : <ChevronRight size={16} />}
                                  </div>
                               </button>
                            )
                         })}
                      </div>
                   </div>
                   <div className={`mt-8 overflow-hidden transition-all duration-500 ${showFeedback ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className={`p-6 rounded-[2rem] text-sm md:text-base font-medium leading-relaxed border-2 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-200' : 'bg-red-50 dark:bg-red-900/20 border-red-500/30 text-red-800 dark:text-red-200'}`}>
                         {segment.feedback}
                      </div>
                      {isCorrect ? (
                         <button onClick={nextSegment} className="w-full mt-6 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-105 transition-transform flex items-center justify-center gap-3">
                            Seguir para Próxima Cena <ChevronRight size={18} />
                         </button>
                      ) : (
                         <button onClick={resetSegmentState} className="w-full mt-6 py-5 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-300 flex items-center justify-center gap-2">
                            <RefreshCw size={14} /> Ouvir Novamente e Tentar
                         </button>
                      )}
                   </div>
                </div>
             ) : (
                <div className="text-center space-y-10 animate-in zoom-in bg-white dark:bg-sanfran-rubiDark/20 p-10 rounded-[4rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl h-full flex flex-col justify-center items-center">
                   <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-30 animate-pulse"></div>
                      <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center text-white relative z-10 border-4 border-emerald-400"><Trophy size={64} /></div>
                   </div>
                   <h3 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Mestria Jurídica</h3>
                   <div className="grid grid-cols-2 gap-4 w-full">
                      <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-3xl border border-slate-100 dark:border-white/5">
                         <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Cenas</p>
                         <p className="text-3xl font-black text-sanfran-rubi">{activeClip.segments.length}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-3xl border border-slate-100 dark:border-white/5">
                         <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Listening</p>
                         <p className="text-3xl font-black text-sky-500">100%</p>
                      </div>
                   </div>
                   <button onClick={handleBack} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] hover:scale-105 transition-all shadow-xl">
                      Voltar ao Lobby
                   </button>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default LegalCinema;
