
import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clapperboard, Film, ArrowLeft, Tv, HelpCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { CinemaClip } from '../types';
import confetti from 'canvas-confetti';

interface LegalCinemaProps {
  userId: string;
}

// Mock Data para Fallback com IDs funcionais e tempos ajustados
const MOCK_CLIPS: CinemaClip[] = [
  {
    id: '1',
    title: 'Objection! Hearsay',
    source_name: 'Suits S01E01',
    youtube_id: 'u0Qj8a8a_Yk', // Cena de treinamento
    start_time: 20,
    end_time: 60,
    difficulty: 'medium',
    question: "Qual foi o fundamento da objeção apresentada?",
    options: ["Hearsay (Testemunho indireto)", "Speculation (Especulação)", "Leading the witness (Induzir a testemunha)"],
    correct_option: 2,
    explanation: "No clipe, a objeção é 'Leading', pois o advogado está colocando a resposta na boca da testemunha, o que é proibido no exame direto."
  },
  {
    id: '2',
    title: 'The Burden of Proof',
    source_name: 'A Few Good Men',
    youtube_id: '9FnO3igOkOk', // You can't handle the truth
    start_time: 140,
    end_time: 180,
    difficulty: 'hard',
    question: "O que o advogado exige que a testemunha admita?",
    options: ["Que ele mentiu no relatório", "Que ele ordenou o 'Code Red'", "Que ele não estava na base"],
    correct_option: 1,
    explanation: "A estratégia foi forçar o Coronel a admitir que emitiu uma ordem ilegal ('Code Red'), transferindo a culpabilidade."
  },
  {
    id: '3',
    title: 'Settlement Negotiation',
    source_name: 'Erin Brockovich',
    youtube_id: 'lXg5u-4q7qA', // Cena da negociação da água
    start_time: 30,
    end_time: 90,
    difficulty: 'easy',
    question: "Qual o argumento de Erin para recusar a oferta?",
    options: ["O valor era muito baixo", "A água estava contaminada", "Não havia contrato escrito"],
    correct_option: 0,
    explanation: "Erin rejeita a oferta de 'Settlement' (acordo) por considerá-la insultuosa dado o dano à saúde dos clientes."
  },
  {
    id: '4',
    title: 'Expert Witness Qualification',
    source_name: 'My Cousin Vinny',
    youtube_id: '6qg66Q2dJsg', // Mona Lisa Vito Testimony
    start_time: 60,
    end_time: 120,
    difficulty: 'medium',
    question: "O que permitiu que a testemunha fosse qualificada como 'Expert'?",
    options: ["Diploma universitário", "Conhecimento técnico específico", "Ser mecânica certificada"],
    correct_option: 1,
    explanation: "Ela demonstrou conhecimento técnico profundo sobre carros ('Positraction'), qualificando-a como perita (Expert Witness)."
  },
  {
    id: '5',
    title: 'Impeaching the Witness',
    source_name: 'Legally Blonde',
    youtube_id: 'Kq-rD8P-a_o', // Cena do permanente
    start_time: 120,
    end_time: 180,
    difficulty: 'easy',
    question: "Qual técnica Elle Woods usou para derrubar o álibi?",
    options: ["Hearsay", "Leading Questions", "Impeachment by Contradiction"],
    correct_option: 2,
    explanation: "Ela demonstrou uma contradição fática (o cuidado com o permanente) que provou que a testemunha estava mentindo (Impeachment)."
  },
  {
    id: '6',
    title: 'Intellectual Property',
    source_name: 'The Social Network',
    youtube_id: 'I2zW84s0sPI', // Deposition scene
    start_time: 0,
    end_time: 50,
    difficulty: 'hard',
    question: "Qual a postura do advogado durante o depoimento?",
    options: ["Colaborativa", "Hostil e desinteressada", "Confusa"],
    correct_option: 1,
    explanation: "Mark demonstra desdém pelo processo legal, argumentando que sua atenção vale mais que o depoimento ('Deposition')."
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
                      {/* Using high quality thumbnail if available or fallback icon */}
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
             {/* Container do vídeo com largura máxima restrita para não ficar gigante */}
             <div className="w-full max-w-3xl mx-auto aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-900 dark:border-white/10 relative">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${selectedClip.youtube_id}?start=${selectedClip.start_time}&end=${selectedClip.end_time}&autoplay=1&rel=0&modestbranding=1&controls=1`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  className="absolute inset-0"
                ></iframe>
             </div>
             
             <div className="bg-sky-50 dark:bg-sky-900/10 p-4 rounded-2xl border border-sky-100 dark:border-sky-800/30 flex items-start gap-3 max-w-3xl mx-auto w-full">
                <HelpCircle className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                   <p className="text-sm font-bold text-sky-800 dark:text-sky-200">Instrução:</p>
                   <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">Assista ao clipe acima e preste atenção aos diálogos. O vídeo começará e terminará automaticamente no trecho relevante.</p>
                </div>
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
