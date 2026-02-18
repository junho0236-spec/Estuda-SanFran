
import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clapperboard, ArrowLeft, Tv, ExternalLink, BookOpen, Ear, FileText, Languages, BrainCircuit, RefreshCw, ChevronRight, MousePointer2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface LegalCinemaProps {
  userId: string;
}

interface InteractiveWord {
  word: string;
  translation: string;
  definition: string;
}

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  transcript: string; // Exatamente o que é dito no trecho
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
  segments: VideoSegment[];
}

// DADOS: SUITS DEEP DIVE (Sincronização Refinada)
const SUITS_DEEP_DIVE: DeepDiveClip = {
  id: 'suits_s1_interview',
  title: 'The Interview (Full Deep Dive)',
  source_name: 'Suits (Season 1 Trailer)',
  youtube_id: '85z53bAebsI', 
  description: "Treine seu inglês jurídico analisando a icônica contratação de Mike Ross por Harvey Specter.",
  segments: [
    {
      id: 'seg_1',
      startTime: 10,
      endTime: 23,
      transcript: "They're all gonna be walking in here in their fancy suits. I'm not looking for another associate. I'm looking for another me.",
      interactiveWords: [
        { word: "associate", translation: "Associado", definition: "A junior member of a law firm who is not yet a partner." },
        { word: "fancy", translation: "Chique / Elegante", definition: "Expensive and high-quality." },
        { word: "looking", translation: "Procurando", definition: "To search for something or someone." }
      ],
      question: "No trecho [10s-23s], qual é o critério de Harvey para o novo cargo?",
      options: ["Ele quer alguém que use ternos caros.", "Ele não busca um subordinado comum, mas alguém com seu próprio perfil.", "Ele quer contratar um sócio sênior."],
      correctAnswer: 1,
      feedback: "Correto. Ele diz 'I'm looking for another me', indicando que busca alguém com sua audácia e gênio, não apenas mais um 'associate' padrão."
    },
    {
      id: 'seg_2',
      startTime: 24,
      endTime: 38,
      transcript: "I can do this. I know the law better than anyone you've ever met. You didn't go to Harvard Law. You haven't even passed the Bar exam. I passed the bar.",
      interactiveWords: [
        { word: "Harvard", translation: "Harvard", definition: "A prestigious Ivy League university. In Suits, the firm only hires from its law school." },
        { word: "Bar", translation: "Ordem (OAB)", definition: "The 'Bar Exam' is the test lawyers must pass to be licensed." },
        { word: "met", translation: "Conheceu", definition: "Past tense of 'meet' (to come into the presence of)." }
      ],
      question: "De acordo com o diálogo [24s-38s], qual a principal barreira formal para Mike?",
      options: ["Ele não tem experiência em tribunais.", "Ele não frequentou Harvard e supostamente não passou no exame da Ordem.", "Ele não sabe nada sobre as leis de Nova York."],
      correctAnswer: 1,
      feedback: "Exato. Harvey aponta: 'You didn't go to Harvard Law' e 'You haven't even passed the Bar Exam', as duas exigências da firma."
    },
    {
      id: 'seg_3',
      startTime: 40,
      endTime: 53,
      transcript: "I have a photographic memory... Okay, now tell me what it says... 'The legislative history of the Civil Rights Act of 1964 shows that...'",
      interactiveWords: [
        { word: "photographic", translation: "Fotográfica", definition: "Relating to the ability to remember things with extreme detail, like a photo." },
        { word: "legislative", translation: "Legislativo", definition: "Relating to the process of making laws." },
        { word: "Act", translation: "Lei / Decreto", definition: "A law passed by a legislative body." }
      ],
      question: "No trecho [40s-53s], Mike prova seu conhecimento recitando o quê?",
      options: ["Uma súmula vinculante do STF americano.", "A história legislativa do Civil Rights Act de 1964.", "A Constituição dos Estados Unidos."],
      correctAnswer: 1,
      feedback: "Mike recita exatamente a história legislativa do 'Civil Rights Act of 1964' para provar sua memória fotográfica."
    },
    {
      id: 'seg_4',
      startTime: 65,
      endTime: 78,
      transcript: "JESSICA: He's a fraud. HARVEY: He's a genius. JESSICA: You hired a fraud. I'm not going to let you put the firm at risk.",
      interactiveWords: [
        { word: "fraud", translation: "Fraude / Impostor", definition: "A person who intends to deceive others by claiming to be someone they are not." },
        { word: "firm", translation: "Firma / Escritório", definition: "A law office or legal partnership." },
        { word: "risk", translation: "Risco", definition: "The possibility of something bad happening." }
      ],
      question: "Qual é o veredito final de Jessica sobre Mike neste trecho [65s-78s]?",
      options: ["Ela concorda com Harvey que ele é um gênio.", "Ela o vê como uma fraude que coloca o escritório em perigo.", "Ela quer promovê-lo a associado sênior."],
      correctAnswer: 1,
      feedback: "Jessica é enfática: 'He's a fraud' e afirma que não deixará Harvey colocar a 'firm at risk'."
    }
  ]
};

const LegalCinema: React.FC<LegalCinemaProps> = ({ userId }) => {
  const [activeClip, setActiveClip] = useState<DeepDiveClip | null>(null);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  
  // Quiz State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Player Control
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

    if (correct) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    }
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

  const replaySegment = () => {
    setPlayerKey(prev => prev + 1);
  };

  // --- RENDERIZADOR DE TRANSCRIÇÃO INTERATIVA ---
  const renderTranscript = (segment: VideoSegment) => {
    // Dividir mantendo a pontuação básica
    const words = segment.transcript.split(' ');

    return (
      <div className="flex flex-wrap gap-2 justify-start items-baseline">
        {words.map((rawWord, i) => {
          const cleanWord = rawWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()""'']/g,"").toLowerCase();
          const interactive = segment.interactiveWords.find(w => w.word.toLowerCase() === cleanWord);

          if (interactive) {
            return (
              <div key={i} className="group relative inline-block">
                <span className="text-sanfran-rubi font-black border-b-2 border-dotted border-sanfran-rubi/40 group-hover:bg-sanfran-rubi/10 px-0.5 rounded cursor-help transition-all">
                  {rawWord}
                </span>
                {/* Tooltip Popup */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 bg-slate-900 text-white p-4 rounded-2xl text-xs shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <p className="font-black text-sky-400 uppercase tracking-widest mb-1">{interactive.translation}</p>
                  <p className="text-slate-300 leading-relaxed">{interactive.definition}</p>
                  <div className="mt-2 pt-2 border-t border-white/10 italic text-[10px] text-slate-400">
                    "{interactive.example}"
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                </div>
              </div>
            );
          }
          
          return <span key={i} className="text-slate-700 dark:text-slate-200 font-serif">{rawWord}</span>;
        })}
      </div>
    );
  };

  // View: Lobby
  if (!activeClip) {
    return (
      <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-6xl mx-auto font-sans">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
          <div>
             <div className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-700 dark:border-white/20 mb-4">
                <Clapperboard className="w-4 h-4 text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Advanced Laboratory</span>
             </div>
             <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Cinema Jurídico</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">Sincronização total. Aprenda com o áudio original das Arcadas de Nova York.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6">
           <button 
             onClick={() => handleSelectClip(SUITS_DEEP_DIVE)}
             className="group relative w-full aspect-video md:aspect-[21/9] bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-slate-800 hover:border-sanfran-rubi transition-all duration-500"
           >
              <img 
                src={`https://img.youtube.com/vi/${SUITS_DEEP_DIVE.youtube_id}/maxresdefault.jpg`} 
                alt="Thumbnail" 
                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-12 text-left w-full">
                 <div className="flex items-center gap-3 mb-3">
                    <span className="bg-sanfran-rubi text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                       Suits S01E01
                    </span>
                    <span className="text-white/80 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                       <Tv size={12} /> Deep Dive Mode
                    </span>
                 </div>
                 <h3 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter mb-2 leading-none">{SUITS_DEEP_DIVE.title}</h3>
                 <p className="text-white/70 font-medium max-w-xl text-sm md:text-base leading-relaxed">
                    Chunking Method: O trailer foi fatiado em blocos sincronizados para máximo aproveitamento fonético e gramatical.
                 </p>
                 
                 <div className="mt-8 flex items-center gap-2 text-white/50 text-xs font-black uppercase tracking-widest group-hover:text-white transition-colors">
                    <Play size={16} fill="currentColor" /> Iniciar Experiência Sincronizada
                 </div>
              </div>
           </button>
        </div>
      </div>
    );
  }

  const segment = activeClip.segments[currentSegmentIdx];
  const progressPercent = ((currentSegmentIdx + 1) / activeClip.segments.length) * 100;

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto pb-10 px-4 md:px-0 animate-in zoom-in-95 duration-300">
       
       {/* Top Status Bar */}
       <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-5">
             <button onClick={handleBack} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 transition-colors shadow-sm">
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-200" />
             </button>
             <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{activeClip.title}</h2>
                <div className="flex items-center gap-3 mt-1">
                   <span className="text-[10px] font-black text-sanfran-rubi uppercase tracking-[0.2em]">Cena {currentSegmentIdx + 1} de {activeClip.segments.length}</span>
                   <div className="w-32 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden border border-slate-100 dark:border-white/5">
                      <div className="h-full bg-sanfran-rubi transition-all duration-700" style={{ width: `${progressPercent}%` }}></div>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
          
          {/* LEFT: MEDIA & TEXT (The Laboratory) */}
          <div className="lg:col-span-7 flex flex-col gap-6 h-full">
             
             {/* Player Focado com Start/End preciso */}
             <div className="relative w-full aspect-video bg-black rounded-[3rem] overflow-hidden shadow-2xl border-[6px] border-slate-900 dark:border-white/5 group">
                {!completed ? (
                   <iframe 
                     key={playerKey}
                     width="100%" 
                     height="100%" 
                     src={`https://www.youtube.com/embed/${activeClip.youtube_id}?start=${segment.startTime}&end=${segment.endTime}&autoplay=1&rel=0&modestbranding=1&controls=0&origin=${window.location.origin}`} 
                     title="Deep Dive Player" 
                     frameBorder="0" 
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                     allowFullScreen
                     className="absolute inset-0 pointer-events-none"
                   ></iframe>
                ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0303]">
                      <CheckCircle2 size={80} className="text-emerald-500 mb-4 animate-bounce" />
                      <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Sessão Finalizada</h3>
                   </div>
                )}
                
                {/* Replay / Overlay de Tempo */}
                {!completed && (
                   <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 z-20">
                      <Clock size={12} className="text-white" />
                      <span className="text-[10px] font-black text-white tabular-nums">{segment.startTime}s - {segment.endTime}s</span>
                   </div>
                )}

                {!completed && (
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                      <button onClick={replaySegment} className="pointer-events-auto bg-white/20 hover:bg-white/40 backdrop-blur-xl text-white p-5 rounded-full border-2 border-white/30 shadow-2xl transition-all active:scale-90">
                         <RefreshCw size={32} />
                      </button>
                   </div>
                )}
             </div>

             {/* Smart Transcript - Fiel ao Segmento */}
             {!completed && (
               <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 md:p-10 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl relative overflow-hidden flex-1">
                  <div className="absolute top-0 left-0 w-2 h-full bg-sanfran-rubi"></div>
                  
                  <div className="flex items-center gap-3 mb-6">
                     <div className="bg-sanfran-rubi/10 p-2 rounded-xl text-sanfran-rubi">
                        <Ear size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Transcript Sincronizado</p>
                        <p className="text-xs font-bold text-slate-500 italic">Passe o mouse nos termos destacados.</p>
                     </div>
                  </div>
                  
                  <div className="text-2xl md:text-3xl font-serif font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                     “{renderTranscript(segment)}”
                  </div>
               </div>
             )}
          </div>

          {/* RIGHT: INTERACTION & QUIZ */}
          <div className="lg:col-span-5 flex flex-col h-full">
             {!completed ? (
                <div className="bg-slate-50 dark:bg-black/30 p-8 md:p-10 rounded-[3rem] border-2 border-slate-200 dark:border-white/5 shadow-inner h-full flex flex-col justify-between">
                   
                   <div>
                      <div className="mb-10">
                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-white dark:bg-white/5 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/10 shadow-sm inline-block mb-6">
                            Verificação de Contexto
                         </span>
                         <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                            {segment.question}
                         </h3>
                      </div>

                      <div className="space-y-4">
                         {segment.options.map((opt, idx) => {
                            let btnClass = "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-sanfran-rubi hover:shadow-lg hover:scale-[1.01]";
                            
                            if (showFeedback) {
                               if (idx === segment.correctAnswer) btnClass = "bg-emerald-500 border-emerald-600 text-white ring-8 ring-emerald-500/10 shadow-2xl";
                               else if (idx === selectedOption) btnClass = "bg-red-500 border-red-600 text-white opacity-50";
                               else btnClass = "opacity-30 grayscale pointer-events-none";
                            }

                            return (
                               <button
                                 key={idx}
                                 onClick={() => handleAnswer(idx)}
                                 disabled={showFeedback}
                                 className={`w-full p-6 rounded-[2rem] border-2 text-left font-bold text-sm md:text-base transition-all duration-300 flex justify-between items-center group ${btnClass}`}
                               >
                                  <span className="flex-1 pr-4">{opt}</span>
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${showFeedback ? 'bg-white/20 border-white' : 'border-slate-100 group-hover:border-sanfran-rubi'}`}>
                                     {showFeedback && idx === segment.correctAnswer ? <CheckCircle2 size={20} /> : showFeedback && idx === selectedOption ? <XCircle size={20} /> : <ChevronRight size={16} />}
                                  </div>
                               </button>
                            )
                         })}
                      </div>
                   </div>

                   {/* Feedback Area */}
                   <div className={`mt-8 overflow-hidden transition-all duration-500 ${showFeedback ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className={`p-6 rounded-[2rem] text-sm md:text-base font-medium leading-relaxed border-2 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-200' : 'bg-red-50 dark:bg-red-900/20 border-red-500/30 text-red-800 dark:text-red-200'}`}>
                         <div className="flex items-center gap-2 mb-2">
                            <span className="font-black uppercase text-xs tracking-widest">{isCorrect ? 'Veredito Correto' : 'Apelação Negada'}</span>
                         </div>
                         {segment.feedback}
                      </div>

                      {isCorrect && (
                         <button 
                           onClick={nextSegment}
                           className="w-full mt-6 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-105 transition-transform flex items-center justify-center gap-3"
                         >
                            Seguir para Próxima Cena <ChevronRight size={18} />
                         </button>
                      )}
                      {!isCorrect && (
                         <button 
                           onClick={resetSegmentState}
                           className="w-full mt-6 py-5 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-300 transition-colors"
                         >
                            Tentar Novamente
                         </button>
                      )}
                   </div>

                </div>
             ) : (
                <div className="text-center space-y-10 animate-in zoom-in bg-white dark:bg-sanfran-rubiDark/20 p-10 rounded-[4rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl h-full flex flex-col justify-center items-center">
                   <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-30 animate-pulse"></div>
                      <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center text-white relative z-10 border-4 border-emerald-400">
                         <Trophy size={64} />
                      </div>
                   </div>
                   
                   <div>
                      <h3 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-4">Mestria Jurídica</h3>
                      <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                         Você analisou cada frase, entendeu cada termo e dominou o contexto legal desta lição.
                      </p>
                   </div>
                   
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
                      Voltar ao Grimório
                   </button>
                </div>
             )}
          </div>

       </div>
    </div>
  );
};

export default LegalCinema;
