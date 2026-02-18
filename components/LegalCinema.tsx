
import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clapperboard, Film, ArrowLeft, Tv, HelpCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { CinemaClip } from '../types';
import confetti from 'canvas-confetti';

interface LegalCinemaProps {
  userId: string;
}

// Mock Data com IDs alternativos e mais estáveis
const MOCK_CLIPS: CinemaClip[] = [
  {
    id: '1',
    title: 'Interrogatório Agressivo',
    source_name: 'Suits (Mike Ross)',
    youtube_id: 'cL3d-lD9-38', // Mock Trial Scene
    start_time: 40,
    end_time: 100,
    difficulty: 'medium',
    question: "Qual a estratégia usada por Harvey nesta cena?",
    options: ["Intimidação direta", "Apelo emocional", "Acordo judicial"],
    correct_option: 0,
    explanation: "Harvey usa a intimidação e o blefe para desestabilizar a testemunha/oponente."
  },
  {
    id: '2',
    title: 'You Cant Handle the Truth',
    source_name: 'A Few Good Men',
    youtube_id: 'hopNAI8Pefg', // Clip Clássico
    start_time: 140,
    end_time: 200,
    difficulty: 'hard',
    question: "O que o Coronel Jessup admite sob pressão?",
    options: ["Que mentiu no relatório", "Que ordenou o 'Code Red'", "Que não estava na base"],
    correct_option: 1,
    explanation: "A estratégia de Kaffee foi irritar Jessup até que seu orgulho o fizesse admitir que ordenou a punição extrajudicial ('Code Red')."
  },
  {
    id: '3',
    title: 'Oferta de Acordo',
    source_name: 'Erin Brockovich',
    youtube_id: 'lXg5u-4q7qA', // Water Scene
    start_time: 30,
    end_time: 90,
    difficulty: 'easy',
    question: "Por que Erin recusa a oferta da empresa?",
    options: ["O valor era insultuoso", "Não havia garantia escrita", "A empresa não assumiu a culpa"],
    correct_option: 0,
    explanation: "Erin usa o copo de água (supostamente contaminada) para demonstrar que a oferta financeira não cobria o dano real à saúde das vítimas."
  },
  {
    id: '4',
    title: 'Testemunha Perita',
    source_name: 'My Cousin Vinny',
    youtube_id: '6qg66Q2dJsg', // Expert Witness Scene
    start_time: 60,
    end_time: 120,
    difficulty: 'medium',
    question: "Como Vinny qualifica a testemunha como 'Expert'?",
    options: ["Mostrando seu diploma", "Testando seu conhecimento técnico", "Citando sua experiência"],
    correct_option: 1,
    explanation: "Ele faz perguntas técnicas extremamente específicas sobre mecânica automotiva para provar à corte que ela possui conhecimento notório."
  },
  {
    id: '5',
    title: 'Quebra de Álibi',
    source_name: 'Legally Blonde',
    youtube_id: 'y1o_iY99eeA', // Perm Scene
    start_time: 155,
    end_time: 215,
    difficulty: 'easy',
    question: "Qual o erro lógico apontado por Elle Woods?",
    options: ["O tempo de viagem", "A regra de manutenção do permanente", "A cor do sapato"],
    correct_option: 1,
    explanation: "Ela usa um conhecimento específico (não lavar o cabelo 24h após permanente) para provar que a testemunha estava mentindo sobre estar no chuveiro."
  },
  {
    id: '6',
    title: 'Depoimento Hostil',
    source_name: 'The Social Network',
    youtube_id: 'lB95KLmpLR4', // Deposition
    start_time: 10,
    end_time: 60,
    difficulty: 'hard',
    question: "Qual o argumento de Mark sobre a propriedade intelectual?",
    options: ["Ele assinou um contrato", "Ter uma ideia não é ter o produto", "O código foi roubado"],
    correct_option: 1,
    explanation: "Mark argumenta que se os autores tivessem inventado o Facebook, eles teriam inventado o Facebook. A ideia vaga não confere propriedade sobre a execução."
  }
];

const LegalCinema: React.FC<LegalCinemaProps> = ({ userId }) => {
  const [clips, setClips] = useState<CinemaClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<CinemaClip | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Game State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    fetchClips();
  }, []);

  const fetchClips = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('cinema_clips').select('*');
      if (data && data.length > 0) {
        setClips(data);
      } else {
        setClips(MOCK_CLIPS);
      }
    } catch (e) {
      setClips(MOCK_CLIPS);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClip = (clip: CinemaClip) => {
    setSelectedClip(clip);
    setSelectedOption(null);
    setIsCorrect(null);
    setShowFeedback(false);
  };

  const handleBack = () => {
    setSelectedClip(null);
  };

  const handleAnswer = (index: number) => {
    if (showFeedback) return;
    
    setSelectedOption(index);
    const correct = index === selectedClip?.correct_option;
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // View: List
  if (!selectedClip) {
    return (
      <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 h-full flex flex-col max-w-6xl mx-auto font-sans">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
          <div>
             <div className="inline-flex items-center gap-2 bg-sky-900/10 px-4 py-2 rounded-full border border-sky-900/20 mb-4 dark:bg-sky-500/10 dark:border-sky-500/20">
                <Clapperboard className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400">Listening Lab</span>
             </div>
             <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Cinema Jurídico</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">Aprenda Legal English com cenas de filmes e séries.</p>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-600 border-t-transparent"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {clips.map(clip => (
                <button 
                  key={clip.id}
                  onClick={() => handleSelectClip(clip)}
                  className="group relative bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl overflow-hidden text-left hover:scale-[1.02] transition-transform duration-300 flex flex-col"
                >
                   {/* Thumbnail Placeholder with Icon */}
                   <div className="h-48 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                      <img 
                        src={`https://img.youtube.com/vi/${clip.youtube_id}/hqdefault.jpg`} 
                        alt="Thumbnail" 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                         <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50 group-hover:scale-110 transition-transform">
                            <Play size={32} className="text-white fill-current ml-1" />
                         </div>
                      </div>
                      
                      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest z-20 border ${getDifficultyColor(clip.difficulty)}`}>
                         {clip.difficulty}
                      </div>
                   </div>

                   <div className="p-6 flex-1 flex flex-col">
                      <div className="mb-4">
                         <p className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-1">{clip.source_name}</p>
                         <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{clip.title}</h3>
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-slate-400">
                         <span className="text-xs font-bold flex items-center gap-1"><Tv size={14} /> Video Quiz</span>
                         <span className="text-[10px] font-black uppercase tracking-widest">Iniciar</span>
                      </div>
                   </div>
                </button>
             ))}
          </div>
        )}
      </div>
    );
  }

  // View: Player
  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto pb-20 px-4 md:px-0 animate-in zoom-in-95 duration-300">
       
       {/* Header */}
       <div className="flex items-center gap-4 mb-6 shrink-0">
          <button onClick={handleBack} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 transition-colors">
             <ArrowLeft size={20} className="text-slate-600 dark:text-slate-200" />
          </button>
          <div>
             <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedClip.title}</h2>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedClip.source_name}</p>
          </div>
       </div>

       <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
          
          {/* Video Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
             {/* Container do vídeo */}
             <div className="w-full max-w-3xl mx-auto aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-900 dark:border-white/10 relative z-10">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${selectedClip.youtube_id}?start=${selectedClip.start_time}&end=${selectedClip.end_time}&rel=0&modestbranding=1&controls=1&origin=${window.location.origin}`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  className="absolute inset-0"
                ></iframe>
             </div>
             
             <div className="flex flex-col gap-3 max-w-3xl mx-auto w-full">
               <div className="bg-sky-50 dark:bg-sky-900/10 p-4 rounded-2xl border border-sky-100 dark:border-sky-800/30 flex items-start gap-3">
                  <HelpCircle className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div>
                     <p className="text-sm font-bold text-sky-800 dark:text-sky-200">Instrução:</p>
                     <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">
                       Clique no play. Se o vídeo não carregar devido a restrições do YouTube, use o link abaixo.
                     </p>
                  </div>
               </div>
               
               <a 
                 href={`https://www.youtube.com/watch?v=${selectedClip.youtube_id}&t=${selectedClip.start_time}s`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 p-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg"
               >
                 <ExternalLink size={14} /> Vídeo indisponível? Assistir no YouTube
               </a>
             </div>
          </div>

          {/* Quiz Column */}
          <div className="flex flex-col h-full">
             <div className="bg-white dark:bg-sanfran-rubiDark/20 p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex-1 flex flex-col justify-center">
                
                <div className="mb-6">
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Desafio</span>
                   <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-2 leading-tight">
                      {selectedClip.question}
                   </h3>
                </div>

                <div className="space-y-3">
                   {selectedClip.options.map((opt, idx) => {
                      let btnClass = "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-sky-400";
                      
                      if (showFeedback) {
                         if (idx === selectedClip.correct_option) {
                            btnClass = "bg-emerald-500 border-emerald-600 text-white";
                         } else if (idx === selectedOption) {
                            btnClass = "bg-red-500 border-red-600 text-white opacity-50";
                         } else {
                            btnClass = "opacity-50 grayscale";
                         }
                      }

                      return (
                         <button
                           key={idx}
                           onClick={() => handleAnswer(idx)}
                           disabled={showFeedback}
                           className={`w-full p-4 rounded-xl border-2 text-left font-bold text-sm transition-all duration-300 flex justify-between items-center ${btnClass}`}
                        >
                           {opt}
                           {showFeedback && idx === selectedClip.correct_option && <CheckCircle2 size={18} />}
                           {showFeedback && idx === selectedOption && idx !== selectedClip.correct_option && <XCircle size={18} />}
                        </button>
                      )
                   })}
                </div>

                {showFeedback && (
                   <div className={`mt-6 p-4 rounded-xl border animate-in slide-in-from-bottom-4 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                         {isCorrect ? 'Correto!' : 'Incorreto'}
                      </p>
                      <p className={`text-xs font-medium ${isCorrect ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'}`}>
                         {selectedClip.explanation}
                      </p>
                   </div>
                )}

             </div>
          </div>

       </div>

    </div>
  );
};

export default LegalCinema;
