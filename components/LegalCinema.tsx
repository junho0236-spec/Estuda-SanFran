
import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clapperboard, Film, ArrowLeft, Tv, HelpCircle, ImageIcon, Eye } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { CinemaClip } from '../types';
import confetti from 'canvas-confetti';

interface LegalCinemaProps {
  userId: string;
}

// MOCK DATA: Mantidos os IDs para gerar as thumbnails, mas o foco agora é a análise do caso.
const MOCK_CLIPS: CinemaClip[] = [
  {
    id: '1',
    title: 'The Fraud',
    source_name: 'Suits (S1)',
    youtube_id: '85z53bAebsI', 
    start_time: 0,
    end_time: 60,
    difficulty: 'easy',
    question: "Nesta cena icônica de Suits, qual o principal dilema legal de Mike Ross?",
    options: ["Mike não passou no exame da ordem", "Mike nunca frequentou a faculdade de direito", "Harvey está sendo processado"],
    correct_option: 1,
    explanation: "O segredo central é que Mike Ross pratica direito sem licença e sem diploma ('Harvard Law'), o que configura exercício ilegal da profissão."
  },
  {
    id: '2',
    title: 'Code Red',
    source_name: 'A Few Good Men',
    youtube_id: 'eWDmgV6f_T0', 
    start_time: 60,
    end_time: 140,
    difficulty: 'medium',
    question: "No julgamento militar, qual a tese de defesa sugerida pela expressão 'Code Red'?",
    options: ["Legítima Defesa", "Obediência Hierárquica (Orders)", "Insanidade Mental"],
    correct_option: 1,
    explanation: "A defesa argumenta que os soldados estavam apenas seguindo ordens superiores ('Following orders'), questionando a responsabilidade militar."
  },
  {
    id: '3',
    title: 'Environmental Law',
    source_name: 'Erin Brockovich',
    youtube_id: 'u_jE7-6U_QA', 
    start_time: 10,
    end_time: 100,
    difficulty: 'easy',
    question: "Erin Brockovich é famosa por qual tipo de ação judicial?",
    options: ["Class Action (Ação Coletiva)", "Divórcio Litigioso", "Falência Empresarial"],
    correct_option: 0,
    explanation: "O filme retrata uma 'Class Action' contra a PG&E por contaminação da água, buscando indenização para centenas de residentes."
  },
  {
    id: '4',
    title: 'Procedural Incompetence',
    source_name: 'My Cousin Vinny',
    youtube_id: 'SL4WrFn9824',
    start_time: 20,
    end_time: 100,
    difficulty: 'medium',
    question: "Qual o principal desafio de Vinny no tribunal nesta comédia jurídica?",
    options: ["Ele não conhece o procedimento penal", "O cliente é culpado", "O juiz é corrupto"],
    correct_option: 0,
    explanation: "O humor vem do fato de Vinny não conhecer as regras de etiqueta e procedimento do tribunal ('Procedure'), irritando o juiz."
  },
  {
    id: '5',
    title: 'Stereotypes',
    source_name: 'Legally Blonde',
    youtube_id: 'E8I-Qzmbqnc',
    start_time: 30,
    end_time: 90,
    difficulty: 'easy',
    question: "Qual o objetivo inicial de Elle Woods ao entrar em Harvard Law?",
    options: ["Tornar-se sócia de um escritório", "Reconquistar o namorado", "Processar um salão de beleza"],
    correct_option: 1,
    explanation: "Ela entra em 'Law School' inicialmente para provar que é séria o suficiente para seu ex-namorado ('Warner')."
  },
  {
    id: '6',
    title: 'IP Theft',
    source_name: 'The Social Network',
    youtube_id: 'lB95KLmpLR4',
    start_time: 40,
    end_time: 120,
    difficulty: 'hard',
    question: "Qual a base do processo contra Mark Zuckerberg no filme?",
    options: ["Roubo de Propriedade Intelectual", "Fraude Fiscal", "Difamação"],
    correct_option: 0,
    explanation: "Ele é acusado de roubar a ideia ('Intellectual Property') dos gêmeos Winklevoss para criar o Facebook."
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
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400">Estudo de Caso</span>
             </div>
             <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Cenas Jurídicas</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">Analise momentos icônicos do cinema e responda o quiz jurídico.</p>
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
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity grayscale group-hover:grayscale-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                         <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50 group-hover:scale-110 transition-transform">
                            <ImageIcon size={32} className="text-white ml-1" />
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
                         <span className="text-xs font-bold flex items-center gap-1"><Eye size={14} /> Análise do Caso</span>
                         <span className="text-[10px] font-black uppercase tracking-widest">Abrir</span>
                      </div>
                   </div>
                </button>
             ))}
          </div>
        )}
      </div>
    );
  }

  // View: Analysis (Static)
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
          
          {/* Image & Context Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
             {/* Container da Imagem Estática */}
             <div className="w-full max-w-3xl mx-auto aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-900 dark:border-white/10 relative z-10 group">
                <img 
                   src={`https://img.youtube.com/vi/${selectedClip.youtube_id}/maxresdefault.jpg`} 
                   alt="Cena" 
                   className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-8">
                   <span className="text-white/60 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2"><Film size={14}/> Cena em Análise</span>
                   <h3 className="text-white text-3xl font-black uppercase tracking-tight leading-none">{selectedClip.title}</h3>
                </div>
             </div>
             
             <div className="flex flex-col gap-3 max-w-3xl mx-auto w-full">
               <div className="bg-sky-50 dark:bg-sky-900/10 p-6 rounded-[2rem] border border-sky-100 dark:border-sky-800/30 flex items-start gap-4">
                  <div className="bg-sky-100 dark:bg-sky-900/30 p-3 rounded-2xl shrink-0">
                     <HelpCircle className="text-sky-600 dark:text-sky-400 w-6 h-6" />
                  </div>
                  <div>
                     <p className="text-sm font-black text-sky-900 dark:text-sky-200 uppercase tracking-wide mb-1">Contexto Jurídico</p>
                     <p className="text-sm text-sky-800 dark:text-sky-300 leading-relaxed">
                       Observe a cena acima retirada de <strong>{selectedClip.source_name}</strong>. Com base no seu conhecimento jurídico e no enredo conhecido desta obra, responda à questão ao lado para testar seu domínio sobre o tema.
                     </p>
                  </div>
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
