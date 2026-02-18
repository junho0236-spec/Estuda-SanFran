import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clapperboard, Film, ArrowLeft, Tv, HelpCircle, ExternalLink, BookOpen, Ear, FileText, Languages } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { CinemaClip } from '../types';
import confetti from 'canvas-confetti';

interface LegalCinemaProps {
  userId: string;
}

interface VocabularyTerm {
  term: string;
  definition: string;
  timestamp?: string;
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
  transcript: string;
  vocabulary: VocabularyTerm[];
  questions: ProgressiveQuestion[];
}

// MOCK DATA: Conteúdo rico e educativo em Inglês
const MOCK_CLIPS: EnhancedCinemaClip[] = [
  {
    id: '1',
    title: 'The Fraud',
    source_name: 'Suits (Season 1 Trailer)',
    youtube_id: '85z53bAebsI', 
    start_time: 0,
    end_time: 60,
    difficulty: 'easy',
    question: "", // Legacy field ignored
    options: [], // Legacy field ignored
    correct_option: 0, // Legacy field ignored
    explanation: "", // Legacy field ignored
    transcript: "Harvey: 'I'm not looking for another associate. I'm looking for another me.' \n\nMike: 'I can do this. I know the law better than anyone you've ever met.' \n\nHarvey: 'You didn't go to Harvard Law. You haven't even passed the Bar Exam.' \n\nMike: 'But I can win.'",
    vocabulary: [
      { term: "Associate", definition: "A junior lawyer in a law firm who is not a partner." },
      { term: "Bar Exam", definition: "The official exam a lawyer must pass to be licensed to practice law." },
      { term: "Harvard Law", definition: "One of the most prestigious Ivy League law schools in the US." }
    ],
    questions: [
      {
        id: 'q1',
        type: 'listening',
        text: "According to Harvey, what is he specifically looking for?",
        options: ["Another associate", "A partner", "Another version of himself"],
        correctAnswer: 2,
        feedback: "Correct! Harvey says: 'I'm looking for another me.'"
      },
      {
        id: 'q2',
        type: 'vocabulary',
        text: "What prevents Mike from legally practicing law?",
        options: ["He has a criminal record", "He didn't pass the Bar Exam", "He is too young"],
        correctAnswer: 1,
        feedback: "Exactly. To be an 'Attorney', one must pass the Bar Exam."
      },
      {
        id: 'q3',
        type: 'legal_context',
        text: "If Mike practices law without a license, what crime is he committing?",
        options: ["Unauthorized Practice of Law", "Perjury", "Contempt of Court"],
        correctAnswer: 0,
        feedback: "Practicing without a license is a crime known as Unauthorized Practice of Law (UPL)."
      }
    ]
  },
  {
    id: '2',
    title: 'Code Red',
    source_name: 'A Few Good Men',
    youtube_id: 'eWDmgV6f_T0', 
    start_time: 60,
    end_time: 140,
    difficulty: 'hard',
    question: "", // Legacy field ignored
    options: [], // Legacy field ignored
    correct_option: 0, // Legacy field ignored
    explanation: "", // Legacy field ignored
    transcript: "Kaffee: 'Did you order the Code Red?' \n\nJessup: 'You want answers?' \n\nKaffee: 'I want the truth!' \n\nJessup: 'You can't handle the truth! Son, we live in a world that has walls, and those walls have to be guarded by men with guns.'",
    vocabulary: [
      { term: "Court-Martial", definition: "A judicial court for trying members of the armed services." },
      { term: "Code Red", definition: "Slang for an extrajudicial punishment within the military unit." },
      { term: "Under Oath", definition: "Having sworn to tell the truth in court, subject to penalties for perjury." }
    ],
    questions: [
      {
        id: 'q1',
        type: 'listening',
        text: "What does Colonel Jessup say Kaffee 'can't handle'?",
        options: ["The pressure", "The truth", "The war"],
        correctAnswer: 1,
        feedback: "Iconic line: 'You can't handle the truth!'"
      },
      {
        id: 'q2',
        type: 'legal_context',
        text: "Kaffee is pressuring the witness. What is this questioning phase called?",
        options: ["Direct Examination", "Cross-Examination", "Closing Statement"],
        correctAnswer: 1,
        feedback: "Cross-examination is when a lawyer questions a witness called by the opposing side."
      },
      {
        id: 'q3',
        type: 'vocabulary',
        text: "What does 'extrajudicial' mean in the context of a Code Red?",
        options: ["Ordered by a judge", "Happening outside of legal authority", "Extremely judicial"],
        correctAnswer: 1,
        feedback: "It means punishment done without legal process or authority."
      }
    ]
  },
  {
    id: '3',
    title: 'Environmental Class Action',
    source_name: 'Erin Brockovich',
    youtube_id: 'u_jE7-6U_QA', 
    start_time: 10,
    end_time: 100,
    difficulty: 'medium',
    question: "", // Legacy field ignored
    options: [], // Legacy field ignored
    correct_option: 0, // Legacy field ignored
    explanation: "", // Legacy field ignored
    transcript: "Erin: 'These people don't dream of being rich. They dream of being able to watch their kids swim in a pool without worrying they'll have to have a hysterectomy at age 20.'",
    vocabulary: [
      { term: "Class Action", definition: "A lawsuit filed by a group of people with the same grievance." },
      { term: "Plaintiff", definition: "The person or group who brings a case against another in a court of law." },
      { term: "Settlement", definition: "An official agreement intended to resolve a dispute without a trial." }
    ],
    questions: [
      {
        id: 'q1',
        type: 'listening',
        text: "What medical condition does Erin mention to make her point?",
        options: ["Lung cancer", "Hysterectomy", "Kidney failure"],
        correctAnswer: 1,
        feedback: "She mentions hysterectomy to emphasize the severe health impact of the water contamination."
      },
      {
        id: 'q2',
        type: 'vocabulary',
        text: "In this movie, Erin represents the...",
        options: ["Plaintiffs", "Defendants", "Jury"],
        correctAnswer: 0,
        feedback: "She works for the side suing the company (PG&E), so she represents the Plaintiffs."
      },
      {
        id: 'q3',
        type: 'legal_context',
        text: "Why is this considered a 'Class Action'?",
        options: ["Because it happened in a classroom", "Because many victims joined together to sue", "Because it involves high-class citizens"],
        correctAnswer: 1,
        feedback: "A class action consolidates many individual claims into one single lawsuit."
      }
    ]
  },
  {
    id: '4',
    title: 'Expert Witness',
    source_name: 'My Cousin Vinny',
    youtube_id: 'SL4WrFn9824',
    start_time: 20,
    end_time: 100,
    difficulty: 'medium',
    question: "", // Legacy field ignored
    options: [], // Legacy field ignored
    correct_option: 0, // Legacy field ignored
    explanation: "", // Legacy field ignored
    transcript: "Judge: 'Counselor, are you mocking my courtroom?' \n\nVinny: 'No, your honor.' \n\nJudge: 'Then why are you wearing a leather jacket?'",
    vocabulary: [
      { term: "Expert Witness", definition: "A witness who has specialized knowledge in a particular field." },
      { term: "Overruled", definition: "The judge disagrees with an objection." },
      { term: "Contempt of Court", definition: "Disobedience or disrespect towards the court." }
    ],
    questions: [
      {
        id: 'q1',
        type: 'listening',
        text: "Why is the Judge angry at Vinny in the opening scenes?",
        options: ["He was late", "His inappropriate attire (leather jacket)", "He didn't stand up"],
        correctAnswer: 1,
        feedback: "The judge finds his leather jacket disrespectful to the court's decorum."
      },
      {
        id: 'q2',
        type: 'vocabulary',
        text: "What do we call a person called to testify because of their technical knowledge?",
        options: ["Expert Witness", "Eyewitness", "Character Witness"],
        correctAnswer: 0,
        feedback: "An Expert Witness (like Mona Lisa Vito in the movie regarding cars)."
      },
      {
        id: 'q3',
        type: 'legal_context',
        text: "Before an expert can testify, the judge must...",
        options: ["Arrest them", "Qualify them as an expert", "Pay them"],
        correctAnswer: 1,
        feedback: "The court must accept their credentials (qualify them) before they can give opinion evidence."
      }
    ]
  }
];

const LegalCinema: React.FC<LegalCinemaProps> = ({ userId }) => {
  const [clips, setClips] = useState<EnhancedCinemaClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<EnhancedCinemaClip | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Interaction State
  const [activeTab, setActiveTab] = useState<'transcript' | 'glossary'>('transcript');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // In a real scenario, fetch and merge. Here we use MOCK directly for the enhanced structure.
    setClips(MOCK_CLIPS);
    setLoading(false);
  }, []);

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

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // View: Gallery
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
             <p className="text-slate-500 font-bold italic text-lg mt-2">Imersão total: Listening, Vocabulary e Contexto Legal.</p>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {clips.map(clip => (
                <button 
                  key={clip.id}
                  onClick={() => handleSelectClip(clip)}
                  className="group relative bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl overflow-hidden text-left hover:scale-[1.02] transition-transform duration-300 flex flex-col"
                >
                   <div className="h-48 bg-slate-900 flex items-center justify-center relative overflow-hidden">
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
                      <div className="mt-auto flex gap-2">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1"><Ear size={10}/> Listening</span>
                          <span className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1"><BookOpen size={10}/> Vocab</span>
                      </div>
                   </div>
                </button>
             ))}
          </div>
        )}
      </div>
    );
  }

  // View: Active Lab
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
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedClip.source_name} • English Lab</p>
             </div>
          </div>
          <a 
             href={`https://www.youtube.com/watch?v=${selectedClip.youtube_id}`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors"
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

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                   {activeTab === 'transcript' && (
                      <div className="font-serif text-lg leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                         {selectedClip.transcript}
                      </div>
                   )}
                   {activeTab === 'glossary' && (
                      <div className="space-y-4">
                         {selectedClip.vocabulary.map((vocab, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                               <h4 className="font-black text-sm text-sky-600 dark:text-sky-400 mb-1">{vocab.term}</h4>
                               <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{vocab.definition}</p>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* RIGHT: Active Learning (Quiz) */}
          <div className="lg:col-span-5 flex flex-col h-full">
             <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-8 rounded-[2.5rem] shadow-2xl h-full flex flex-col justify-between relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                {!completed ? (
                  <>
                     <div>
                        <div className="flex justify-between items-center mb-6">
                           <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                 currentQuestion.type === 'listening' ? 'bg-blue-500 text-white' : 
                                 currentQuestion.type === 'vocabulary' ? 'bg-purple-500 text-white' : 
                                 'bg-orange-500 text-white'
                              }`}>
                                 {currentQuestion.type.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] font-bold opacity-60 uppercase">Question {currentQuestionIndex + 1}/{selectedClip.questions.length}</span>
                           </div>
                           <Languages size={20} className="opacity-50" />
                        </div>

                        <h3 className="text-xl md:text-2xl font-black leading-tight mb-8">
                           {currentQuestion.text}
                        </h3>

                        <div className="space-y-3">
                           {currentQuestion.options.map((opt, idx) => {
                              let btnClass = "bg-white/10 hover:bg-white/20 border-white/10 text-white";
                              if (showFeedback) {
                                 if (idx === currentQuestion.correctAnswer) btnClass = "bg-emerald-500 border-emerald-500 text-white";
                                 else if (idx === selectedOption) btnClass = "bg-red-500 border-red-500 text-white opacity-50";
                                 else btnClass = "opacity-30";
                              }

                              return (
                                 <button
                                   key={idx}
                                   onClick={() => handleAnswer(idx)}
                                   disabled={showFeedback}
                                   className={`w-full p-4 rounded-xl border-2 text-left font-bold text-sm transition-all duration-300 flex justify-between items-center ${btnClass}`}
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
                              <div className={`p-4 rounded-xl text-xs font-medium leading-relaxed ${isCorrect ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30' : 'bg-red-500/20 text-red-100 border border-red-500/30'}`}>
                                 <span className="block font-black uppercase mb-1">{isCorrect ? 'Well Done!' : 'Not Quite'}</span>
                                 {currentQuestion.feedback}
                              </div>
                              <button onClick={nextQuestion} className="w-full mt-4 py-3 bg-white text-slate-900 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform">
                                 Next Question
                              </button>
                           </div>
                        )}
                        
                        {/* Progress Bar */}
                        {!showFeedback && (
                           <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-auto">
                              <div className="h-full bg-sanfran-rubi transition-all duration-500" style={{ width: `${progress}%` }}></div>
                           </div>
                        )}
                     </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in">
                     <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl mb-6 animate-bounce">
                        <Tv size={40} />
                     </div>
                     <h3 className="text-3xl font-black uppercase mb-2">Session Complete!</h3>
                     <p className="text-sm font-medium opacity-80 mb-8 max-w-xs">You've mastered the vocabulary and context of this scene.</p>
                     
                     <div className="grid grid-cols-2 gap-4 w-full mb-8">
                        <div className="bg-white/10 p-4 rounded-2xl">
                           <p className="text-[10px] font-black uppercase opacity-60">Vocab Learned</p>
                           <p className="text-2xl font-black">{selectedClip.vocabulary.length}</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl">
                           <p className="text-[10px] font-black uppercase opacity-60">Legal Context</p>
                           <p className="text-2xl font-black">100%</p>
                        </div>
                     </div>

                     <button onClick={handleBack} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform">
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