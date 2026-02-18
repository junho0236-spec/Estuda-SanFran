
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
  transcript: string; // O texto falado neste trecho
  interactiveWords: InteractiveWord[]; // Palavras que terão tooltip
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

// DADOS: SUITS DEEP DIVE (Focado e Segmentado)
const SUITS_DEEP_DIVE: DeepDiveClip = {
  id: 'suits_s1_interview',
  title: 'The Interview',
  source_name: 'Suits (S01E01)',
  youtube_id: '85z53bAebsI', 
  description: "Analise a negociação entre Harvey Specter e Mike Ross frase por frase.",
  segments: [
    {
      id: 'seg_1',
      startTime: 12,
      endTime: 18,
      transcript: "I'm not looking for another associate. I'm looking for another me.",
      interactiveWords: [
        { word: "associate", translation: "Associado", definition: "Advogado júnior contratado por um escritório, sem ser sócio." },
        { word: "looking", translation: "Procurando", definition: "To search for something." }
      ],
      question: "O que Harvey quer dizer com 'looking for another me'?",
      options: ["Ele quer um clone físico.", "Ele quer alguém que pense e aja como ele.", "Ele quer alguém com o mesmo nome."],
      correctAnswer: 1,
      feedback: "Exato. Harvey busca alguém com sua audácia e habilidade, não apenas mais um funcionário padrão."
    },
    {
      id: 'seg_2',
      startTime: 18,
      endTime: 24,
      transcript: "I can do this. I know the law better than anyone you've ever met.",
      interactiveWords: [
        { word: "law", translation: "A Lei / O Direito", definition: "O sistema de regras ou a profissão jurídica." },
        { word: "met", translation: "Conheceu", definition: "Passado de 'Meet' (encontrar/conhecer)." }
      ],
      question: "Qual é a principal 'Soft Skill' (habilidade comportamental) que Mike demonstra aqui?",
      options: ["Humildade", "Confiança / Arrogância", "Medo"],
      correctAnswer: 1,
      feedback: "Mike vende sua competência com extrema confiança ('better than anyone'), algo que Harvey valoriza."
    },
    {
      id: 'seg_3',
      startTime: 24,
      endTime: 30,
      transcript: "You didn't go to Harvard Law. You haven't even passed the Bar Exam.",
      interactiveWords: [
        { word: "Harvard", translation: "Harvard", definition: "Faculdade de elite. Na série, a firma só contrata de lá." },
        { word: "Bar", translation: "Ordem (OAB)", definition: "Bar Exam é a prova necessária para obter a licença de advogado." }
      ],
      question: "Quais são os dois pré-requisitos técnicos que Mike não possui?",
      options: ["Idade e Experiência", "Dinheiro e Contatos", "Diploma de Harvard e Carteira da Ordem"],
      correctAnswer: 2,
      feedback: "Correto. Ele não tem o pedigree (Harvard) nem a licença legal (Bar Exam) para advogar."
    },
    {
      id: 'seg_4',
      startTime: 34,
      endTime: 42,
      transcript: "I learned it. I know what I'm doing. Or I wouldn't be in here.",
      interactiveWords: [
        { word: "learned", translation: "Aprendi", definition: "Adquirir conhecimento." },
        { word: "doing", translation: "Fazendo", definition: "Executando uma ação." }
      ],
      question: "Mike admite que não tem o diploma. Qual é o argumento dele?",
      options: ["Ele vai estudar depois.", "Ele aprendeu o conteúdo por conta própria (autodidata).", "Ele comprou um diploma falso."],
      correctAnswer: 1,
      feedback: "Mike argumenta que possui o *conhecimento* ('I learned it'), mesmo sem a formalidade do diploma."
    }
  ]
};

const LegalCinema: React.FC<LegalCinemaProps> = ({ userId }) => {
  const [activeClip, setActiveClip] = useState<DeepDiveClip | null>(null);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  
  // Estado do Quiz
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Controle do Player
  // Usamos um estado 'key' para forçar o iframe a recarregar quando mudamos os tempos de start/end
  const [playerKey, setPlayerKey] = useState(0);

  const handleSelectClip = (clip: DeepDiveClip) => {
    setActiveClip(clip);
    setCurrentSegmentIdx(0);
    resetSegmentState();
  };

  const resetSegmentState = () => {
    setSelectedOption(null);
    setIsCorrect(null);
    setShowFeedback(false);
    setPlayerKey(prev => prev + 1); // Força reload do vídeo no novo tempo
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
    // Separa as palavras mantendo pontuação básica para reconstrução
    // Abordagem simplificada: dividir por espaço e verificar se a palavra "limpa" está na lista interativa
    const words = segment.transcript.split(' ');

    return (
      <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
        {words.map((rawWord, i) => {
          // Remove pontuação para comparar
          const cleanWord = rawWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()""'']/g,"").toLowerCase();
          const interactive = segment.interactiveWords.find(w => w.word.toLowerCase() === cleanWord);

          if (interactive) {
            return (
              <div key={i} className="group relative inline-block cursor-help">
                <span className="text-sanfran-rubi font-bold border-b-2 border-dashed border-sanfran-rubi/50 group-hover:border-sanfran-rubi group-hover:bg-sanfran-rubi/10 rounded px-0.5 transition-all">
                  {rawWord}
                </span>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex flex-col gap-1 text-center">
                  <span className="font-black text-emerald-400 uppercase tracking-widest">{interactive.translation}</span>
                  <span className="leading-snug">{interactive.definition}</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                </div>
              </div>
            );
          }
          
          return <span key={i} className="text-slate-700 dark:text-slate-300">{rawWord}</span>;
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
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Deep Dive Mode</span>
             </div>
             <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Cinema Jurídico</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">Imersão total. Aprenda frase por frase, cena por cena.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6">
           <button 
             onClick={() => handleSelectClip(SUITS_DEEP_DIVE)}
             className="group relative w-full aspect-video md:aspect-[21/9] bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-800 hover:border-sanfran-rubi transition-all duration-500"
           >
              <img 
                src={`https://img.youtube.com/vi/${SUITS_DEEP_DIVE.youtube_id}/maxresdefault.jpg`} 
                alt="Thumbnail" 
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-8 md:p-12 text-left w-full">
                 <div className="flex items-center gap-3 mb-3">
                    <span className="bg-sanfran-rubi text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                       Deep Dive
                    </span>
                    <span className="text-white/80 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                       <Tv size={12} /> {SUITS_DEEP_DIVE.source_name}
                    </span>
                 </div>
                 <h3 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter mb-2 leading-none">{SUITS_DEEP_DIVE.title}</h3>
                 <p className="text-white/70 font-medium max-w-xl text-sm md:text-base leading-relaxed">
                    {SUITS_DEEP_DIVE.description}
                 </p>
                 
                 <div className="mt-6 flex items-center gap-2 text-white/50 text-[10px] font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                    <Play size={14} fill="currentColor" /> Clique para Iniciar Sessão
                 </div>
              </div>
           </button>
        </div>
      </div>
    );
  }

  const segment = activeClip.segments[currentSegmentIdx];
  const progressPercent = ((currentSegmentIdx + 1) / activeClip.segments.length) * 100;

  // View: Deep Dive Player
  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto pb-10 px-4 md:px-0 animate-in zoom-in-95 duration-300 font-sans">
       
       {/* Top Bar */}
       <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
             <button onClick={handleBack} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 transition-colors">
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-200" />
             </button>
             <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{activeClip.title}</h2>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-sanfran-rubi uppercase tracking-widest">Segmento {currentSegmentIdx + 1}/{activeClip.segments.length}</span>
                   <div className="w-24 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-sanfran-rubi transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                   </div>
                </div>
             </div>
          </div>
          {completed && (
             <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest animate-pulse">
                Sessão Concluída
             </div>
          )}
       </div>

       <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
          
          {/* LADO ESQUERDO: VÍDEO & TRANSCRIÇÃO */}
          <div className="flex flex-col gap-6">
             
             {/* Player Focado */}
             <div className="relative w-full aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-900 dark:border-white/10 z-10 group">
                {!completed ? (
                   <iframe 
                     key={playerKey} // Força reload
                     width="100%" 
                     height="100%" 
                     src={`https://www.youtube.com/embed/${activeClip.youtube_id}?start=${segment.startTime}&end=${segment.endTime}&autoplay=1&rel=0&modestbranding=1&controls=0&origin=${window.location.origin}`} 
                     title="YouTube video player" 
                     frameBorder="0" 
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                     allowFullScreen
                     className="absolute inset-0 pointer-events-none" // Bloqueia clique no player para focar na UI
                   ></iframe>
                ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                      <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
                      <h3 className="text-2xl font-black text-white uppercase">Sessão Finalizada</h3>
                   </div>
                )}
                
                {/* Replay Overlay */}
                {!completed && (
                   <div className="absolute bottom-6 right-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={replaySegment} className="bg-white/20 backdrop-blur-md hover:bg-white/40 text-white p-3 rounded-full shadow-lg border border-white/30">
                         <RefreshCw size={20} />
                      </button>
                   </div>
                )}
             </div>

             {/* Smart Transcript Card */}
             {!completed && (
               <div className="bg-white dark:bg-sanfran-rubiDark/20 p-6 md:p-8 rounded-[2rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-sanfran-rubi"></div>
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                     <MousePointer2 size={14} />
                     <span className="text-[9px] font-black uppercase tracking-widest">Passe o mouse nas palavras sublinhadas</span>
                  </div>
                  
                  <div className="text-xl md:text-2xl font-serif font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                     "{renderTranscript(segment)}"
                  </div>
               </div>
             )}
          </div>

          {/* LADO DIREITO: INTERAÇÃO (QUIZ) */}
          <div className="flex flex-col h-full justify-center">
             {!completed ? (
                <div className="bg-slate-50 dark:bg-[#1a0505] p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-inner">
                   
                   <div className="mb-8">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-white dark:bg-white/5 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10">
                         Análise do Trecho
                      </span>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-4 leading-tight">
                         {segment.question}
                      </h3>
                   </div>

                   <div className="space-y-3">
                      {segment.options.map((opt, idx) => {
                         let btnClass = "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-sanfran-rubi hover:shadow-md";
                         
                         if (showFeedback) {
                            if (idx === segment.correctAnswer) btnClass = "bg-emerald-500 border-emerald-600 text-white ring-4 ring-emerald-500/20";
                            else if (idx === selectedOption) btnClass = "bg-red-500 border-red-600 text-white opacity-50";
                            else btnClass = "opacity-40 grayscale";
                         }

                         return (
                            <button
                              key={idx}
                              onClick={() => handleAnswer(idx)}
                              disabled={showFeedback}
                              className={`w-full p-5 rounded-2xl border-2 text-left font-bold text-sm transition-all duration-300 flex justify-between items-center ${btnClass}`}
                            >
                               {opt}
                               {showFeedback && idx === segment.correctAnswer && <CheckCircle2 size={18} />}
                               {showFeedback && idx === selectedOption && idx !== segment.correctAnswer && <XCircle size={18} />}
                            </button>
                         )
                      })}
                   </div>

                   {/* Feedback Area */}
                   <div className={`mt-6 overflow-hidden transition-all duration-500 ${showFeedback ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className={`p-5 rounded-2xl text-sm font-medium leading-relaxed border ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`}>
                         <p className="font-black uppercase text-xs mb-1">{isCorrect ? 'Correto!' : 'Incorreto'}</p>
                         {segment.feedback}
                      </div>

                      {isCorrect && (
                         <button 
                           onClick={nextSegment}
                           className="w-full mt-4 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                         >
                            Próximo Trecho <ChevronRight size={14} />
                         </button>
                      )}
                      {!isCorrect && (
                         <button 
                           onClick={resetSegmentState}
                           className="w-full mt-4 py-4 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-300 transition-colors"
                         >
                            Tentar Novamente
                         </button>
                      )}
                   </div>

                </div>
             ) : (
                <div className="text-center space-y-6">
                   <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl animate-bounce">
                      <BrainCircuit size={48} />
                   </div>
                   <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase">Análise Concluída</h3>
                   <p className="text-slate-500 font-bold max-w-sm mx-auto">Você completou o estudo desta cena. Seu vocabulário jurídico e listening foram aprimorados.</p>
                   <button onClick={handleBack} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                      Voltar ao Menu
                   </button>
                </div>
             )}
          </div>

       </div>
    </div>
  );
};

export default LegalCinema;
