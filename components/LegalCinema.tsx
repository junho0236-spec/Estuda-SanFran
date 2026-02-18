
import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clapperboard, ArrowLeft, Tv, ExternalLink, BookOpen, Ear, FileText, Languages, BrainCircuit } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { CinemaClip } from '../types';
import confetti from 'canvas-confetti';

interface LegalCinemaProps {
  userId: string;
}

interface VocabularyTerm {
  term: string;
  definition: string;
  context_pt: string; // Tradução contextual rápida
}

interface ProgressiveQuestion {
  id: string;
  type: 'listening' | 'vocabulary' | 'legal_context';
  text: string;
  options: string[];
  correctAnswer: number;
  feedback: string;
}

interface EnhancedCinemaClip extends CinemaClip {
  transcript: string; // Texto completo do diálogo
  vocabulary: VocabularyTerm[]; // Termos chave
  questions: ProgressiveQuestion[]; // Sequência de perguntas
}

// MOCK DATA: Focado exclusivamente na experiência SUITS (Season 1 Trailer)
const SUITS_CLIP: EnhancedCinemaClip = {
  id: 'suits_s1_trailer',
  title: 'The Interview',
  source_name: 'Suits (Season 1 Trailer)',
  youtube_id: '85z53bAebsI', 
  start_time: 0,
  end_time: 60,
  difficulty: 'medium',
  question: "", // Legacy ignorado
  options: [], // Legacy ignorado
  correct_option: 0, // Legacy ignorado
  explanation: "", // Legacy ignorado
  transcript: `HARVEY: "I'm not looking for another associate. I'm looking for another me."

MIKE: "I can do this. I know the law better than anyone you've ever met."

HARVEY: "You didn't go to Harvard Law. You haven't even passed the Bar Exam."

MIKE: "I passed the Bar."

HARVEY: "How?"

MIKE: "I learned it. I know what I'm doing."`,
  vocabulary: [
    { 
      term: "Associate", 
      definition: "A junior lawyer in a law firm who is not a partner. They are employees of the firm.", 
      context_pt: "Advogado Associado (Júnior)" 
    },
    { 
      term: "Bar Exam", 
      definition: "The official examination administered by the bar association that a lawyer must pass to be licensed to practice law.", 
      context_pt: "Exame da Ordem (OAB)" 
    },
    { 
      term: "Harvard Law", 
      definition: "One of the most prestigious law schools in the US. In the series, Pearson Hardman only hires from Harvard.", 
      context_pt: "Faculdade de Direito de Harvard" 
    },
    {
      term: "Liability",
      definition: "The state of being responsible for something, especially by law.",
      context_pt: "Responsabilidade Jurídica"
    }
  ],
  questions: [
    {
      id: 'q1',
      type: 'listening',
      text: "Listen carefully to Harvey's opening line. What specific type of person is he looking for?",
      options: ["A hard-working associate", "A partner for the firm", "Another version of himself"],
      correctAnswer: 2,
      feedback: "Correct! Harvey explicitly says: 'I'm not looking for another associate. I'm looking for another me.'"
    },
    {
      id: 'q2',
      type: 'vocabulary',
      text: "Harvey mentions Mike didn't pass the 'Bar Exam'. What does this exam authorize a person to do?",
      options: ["Teach law at a university", "Practice law legally as an attorney", "Manage a law firm"],
      correctAnswer: 1,
      feedback: "Exactly. The Bar Exam is the licensing test required to practice law (similar to the OAB exam in Brazil)."
    },
    {
      id: 'q3',
      type: 'legal_context',
      text: "If Mike practices law without passing the Bar or having a degree, what kind of violation is this?",
      options: ["Unauthorized Practice of Law (UPL)", "Contempt of Court", "Breach of Contract"],
      correctAnswer: 0,
      feedback: "That's the core conflict of the show. Doing so constitutes the Unauthorized Practice of Law, which is a crime."
    }
  ]
};

const LegalCinema: React.FC<LegalCinemaProps> = ({ userId }) => {
  const [selectedClip, setSelectedClip] = useState<EnhancedCinemaClip | null>(null);
  
  // Interaction State
  const [activeTab, setActiveTab] = useState<'transcript' | 'glossary'>('transcript');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Seleciona o Suits automaticamente ou via menu (aqui deixo preparado para menu mas inicio focado)
  const handleSelectClip = (clip: EnhancedCinemaClip) => {
    setSelectedClip(clip);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setShowFeedback(false);
    setCompleted(false);
    setActiveTab('transcript');
  };

  const handleBack = () => {
    setSelectedClip(null);
  };

  const handleAnswer = (idx: number) => {
    if (showFeedback || !selectedClip) return;
    
    const question = selectedClip.questions[currentQuestionIndex];
    const correct = idx === question.correctAnswer;
    
    setSelectedOption(idx);
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  const nextQuestion = () => {
    if (!selectedClip) return;
    
    if (currentQuestionIndex < selectedClip.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
      setShowFeedback(false);
    } else {
      setCompleted(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  };

  // View: List (Lobby)
  if (!selectedClip) {
    return (
      <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-6xl mx-auto font-sans">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
          <div>
             <div className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-700 dark:border-white/20 mb-4">
                <Clapperboard className="w-4 h-4 text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Legal English Lab</span>
             </div>
             <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Cinema Jurídico</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">Aprenda inglês jurídico com cenas icônicas.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {/* Card Principal - SUITS */}
           <button 
             onClick={() => handleSelectClip(SUITS_CLIP)}
             className="group relative bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl overflow-hidden text-left hover:scale-[1.02] transition-transform duration-300 flex flex-col md:col-span-2 lg:col-span-2"
           >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800/80 z-0"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row h-full">
                 {/* Thumbnail Grande */}
                 <div className="md:w-1/2 h-64 md:h-auto relative overflow-hidden">
                    <img 
                      src={`https://img.youtube.com/vi/${SUITS_CLIP.youtube_id}/maxresdefault.jpg`} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/50 group-hover:scale-110 transition-transform">
                          <Play size={32} className="text-white fill-current ml-1" />
                       </div>
                    </div>
                 </div>

                 {/* Info */}
                 <div className="p-8 md:w-1/2 flex flex-col justify-center">
                    <div className="mb-4">
                       <span className="bg-sky-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block shadow-lg shadow-sky-500/30">
                          Destaque
                       </span>
                       <h3 className="text-3xl font-black text-white leading-none mb-2">{SUITS_CLIP.title}</h3>
                       <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">{SUITS_CLIP.source_name}</p>
                    </div>
                    
                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6 line-clamp-3">
                       Analise a entrevista de emprego mais famosa da TV. Aprenda vocabulário sobre advocacia corporativa, licenciamento e hierarquia de escritório.
                    </p>

                    <div className="flex gap-3">
                        <span className="px-3 py-1.5 bg-white/10 rounded-lg text-[10px] font-bold text-white uppercase flex items-center gap-1 border border-white/10">
                           <Ear size={12}/> Listening
                        </span>
                        <span className="px-3 py-1.5 bg-white/10 rounded-lg text-[10px] font-bold text-white uppercase flex items-center gap-1 border border-white/10">
                           <BookOpen size={12}/> Vocab
                        </span>
                        <span className="px-3 py-1.5 bg-white/10 rounded-lg text-[10px] font-bold text-white uppercase flex items-center gap-1 border border-white/10">
                           <BrainCircuit size={12}/> Context
                        </span>
                    </div>
                 </div>
              </div>
           </button>

           {/* Placeholder para futuras lições */}
           <div className="bg-slate-100 dark:bg-white/5 rounded-[2.5rem] p-8 border-2 border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center text-center opacity-60">
              <Clapperboard size={48} className="text-slate-400 mb-4" />
              <h3 className="text-lg font-black text-slate-500 uppercase">Em Breve</h3>
              <p className="text-xs font-bold text-slate-400 mt-2">Novas cenas de How to Get Away with Murder.</p>
           </div>
        </div>
      </div>
    );
  }

  // View: Active Lab (SUITS FOCUS)
  const currentQuestion = selectedClip.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / selectedClip.questions.length) * 100;

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto pb-10 px-4 md:px-0 animate-in zoom-in-95 duration-300">
       
       {/* Header */}
       <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
             <button onClick={handleBack} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 transition-colors">
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-200" />
             </button>
             <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedClip.title}</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedClip.source_name} • Lab</p>
             </div>
          </div>
          <a 
             href={`https://www.youtube.com/watch?v=${selectedClip.youtube_id}`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10"
          >
             <ExternalLink size={12} /> Watch on YouTube
          </a>
       </div>

       <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
          
          {/* LEFT: Video & Study Materials */}
          <div className="lg:col-span-7 flex flex-col gap-6 h-full overflow-hidden">
             
             {/* Video Player */}
             <div className="w-full aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-900 dark:border-white/10 shrink-0 relative z-10">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${selectedClip.youtube_id}?rel=0&modestbranding=1&controls=1&origin=${window.location.origin}`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  className="absolute inset-0"
                ></iframe>
             </div>

             {/* Study Tabs */}
             <div className="flex-1 bg-white dark:bg-sanfran-rubiDark/20 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg flex flex-col overflow-hidden min-h-[300px]">
                <div className="flex border-b border-slate-100 dark:border-white/5">
                   <button 
                     onClick={() => setActiveTab('transcript')}
                     className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'transcript' ? 'bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white border-b-2 border-sanfran-rubi' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                      <FileText size={14} /> Transcript
                   </button>
                   <button 
                     onClick={() => setActiveTab('glossary')}
                     className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'glossary' ? 'bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white border-b-2 border-sanfran-rubi' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                      <BookOpen size={14} /> Glossary
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                   {activeTab === 'transcript' && (
                      <div className="space-y-4">
                         {selectedClip.transcript.split('\n\n').map((line, i) => {
                            const [speaker, text] = line.split(':');
                            return (
                               <div key={i} className="flex gap-4">
                                  <div className="w-16 shrink-0 text-[10px] font-black uppercase text-slate-400 text-right pt-1">{speaker}</div>
                                  <div className="flex-1 font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200">
                                     "{text?.replace(/"/g, '').trim()}"
                                  </div>
                               </div>
                            )
                         })}
                      </div>
                   )}
                   {activeTab === 'glossary' && (
                      <div className="grid gap-4">
                         {selectedClip.vocabulary.map((vocab, idx) => (
                            <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 flex flex-col gap-2">
                               <div className="flex justify-between items-start">
                                  <h4 className="font-black text-lg text-sky-600 dark:text-sky-400">{vocab.term}</h4>
                                  <span className="text-[9px] font-bold bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2 py-1 rounded uppercase tracking-wider">{vocab.context_pt}</span>
                               </div>
                               <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">{vocab.definition}</p>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* RIGHT: Active Learning (Quiz) */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-[500px]">
             <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-8 rounded-[2.5rem] shadow-2xl h-full flex flex-col justify-between relative overflow-hidden border-4 border-slate-800 dark:border-slate-100">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                {!completed ? (
                  <>
                     <div>
                        <div className="flex justify-between items-center mb-8">
                           <div className="flex items-center gap-2">
                              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 dark:border-black/10 ${
                                 currentQuestion.type === 'listening' ? 'bg-blue-500 text-white' : 
                                 currentQuestion.type === 'vocabulary' ? 'bg-purple-500 text-white' : 
                                 'bg-orange-500 text-white'
                              }`}>
                                 {currentQuestion.type === 'legal_context' ? 'Legal Context' : currentQuestion.type}
                              </span>
                              <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Question {currentQuestionIndex + 1} of {selectedClip.questions.length}</span>
                           </div>
                           <Languages size={20} className="opacity-30" />
                        </div>

                        <h3 className="text-xl md:text-2xl font-black leading-tight mb-8">
                           {currentQuestion.text}
                        </h3>

                        <div className="space-y-3">
                           {currentQuestion.options.map((opt, idx) => {
                              let btnClass = "bg-white/10 dark:bg-slate-100 hover:bg-white/20 dark:hover:bg-slate-200 border-transparent text-white dark:text-slate-900";
                              
                              if (showFeedback) {
                                 if (idx === currentQuestion.correctAnswer) btnClass = "bg-emerald-500 border-emerald-500 text-white";
                                 else if (idx === selectedOption) btnClass = "bg-red-500 border-red-500 text-white opacity-50";
                                 else btnClass = "opacity-30 pointer-events-none";
                              }

                              return (
                                 <button
                                   key={idx}
                                   onClick={() => handleAnswer(idx)}
                                   disabled={showFeedback}
                                   className={`w-full p-5 rounded-2xl border-2 text-left font-bold text-sm transition-all duration-300 flex justify-between items-center ${btnClass}`}
                                 >
                                    {opt}
                                    {showFeedback && idx === currentQuestion.correctAnswer && <CheckCircle2 size={18} />}
                                    {showFeedback && idx === selectedOption && idx !== currentQuestion.correctAnswer && <XCircle size={18} />}
                                 </button>
                              )
                           })}
                        </div>
                     </div>

                     <div className="mt-8">
                        {showFeedback && (
                           <div className="animate-in slide-in-from-bottom-4 mb-4">
                              <div className={`p-5 rounded-2xl text-xs font-medium leading-relaxed ${isCorrect ? 'bg-emerald-500/20 text-emerald-100 dark:text-emerald-800 border border-emerald-500/30' : 'bg-red-500/20 text-red-100 dark:text-red-800 border border-red-500/30'}`}>
                                 <span className="block font-black uppercase mb-1 tracking-widest">{isCorrect ? 'Excellent!' : 'Not quite'}</span>
                                 {currentQuestion.feedback}
                              </div>
                              <button onClick={nextQuestion} className="w-full mt-4 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform shadow-lg">
                                 Next Question
                              </button>
                           </div>
                        )}
                        
                        {/* Progress Bar */}
                        {!showFeedback && (
                           <div className="h-1.5 w-full bg-white/10 dark:bg-black/10 rounded-full overflow-hidden mt-auto">
                              <div className="h-full bg-sanfran-rubi transition-all duration-500" style={{ width: `${progress}%` }}></div>
                           </div>
                        )}
                     </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in">
                     <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-2xl mb-8 animate-bounce border-4 border-emerald-400">
                        <Tv size={48} />
                     </div>
                     <h3 className="text-4xl font-black uppercase mb-2">Lab Complete!</h3>
                     <p className="text-sm font-medium opacity-70 mb-10 max-w-xs leading-relaxed">
                        You've mastered the vocabulary and legal context of this scene. Great job, counselor.
                     </p>
                     
                     <div className="grid grid-cols-2 gap-4 w-full mb-10">
                        <div className="bg-white/10 dark:bg-black/5 p-4 rounded-2xl border border-white/10 dark:border-black/10">
                           <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">New Terms</p>
                           <p className="text-3xl font-black">{selectedClip.vocabulary.length}</p>
                        </div>
                        <div className="bg-white/10 dark:bg-black/5 p-4 rounded-2xl border border-white/10 dark:border-black/10">
                           <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Legal Context</p>
                           <p className="text-3xl font-black">100%</p>
                        </div>
                     </div>

                     <button onClick={handleBack} className="w-full py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform shadow-xl">
                        Back to Library
                     </button>
                  </div>
                )}

             </div>
          </div>

       </div>

    </div>
  );
};

export default LegalCinema;
