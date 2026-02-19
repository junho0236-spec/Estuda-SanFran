
import React, { useState, useEffect } from 'react';
import { Music2, Play, CheckCircle2, RotateCcw, Volume2, Trophy, AlertCircle, Search } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';
import { Song, LyricLine } from '../types';

interface LyricalVibesProps {
  userId: string;
}

const SONGS_DB: Song[] = [
  {
    id: '1',
    title: 'Flowers',
    artist: 'Miley Cyrus',
    youtube_id: 'G7KNmW9a75Y',
    lang: 'en',
    lyrics: [
      { text: "We were good, we were gold" },
      { text: "Kinda dream that can't be sold" },
      { text: "We were right 'til we weren't" },
      { text: "Built a home and watched it", missingWord: "burn", hint: "queimar" },
      { text: "Mm, I didn't wanna leave you" },
      { text: "I didn't wanna lie" },
      { text: "Started to cry but then remembered I" },
      { text: "I can buy myself", missingWord: "flowers", hint: "flores" },
    ]
  },
  {
    id: '2',
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    youtube_id: 'kJQP7kiw5Fk',
    lang: 'es',
    lyrics: [
      { text: "Sí, sabes que ya llevo un rato mirándote" },
      { text: "Tengo que bailar contigo hoy" },
      { text: "Vi que tu mirada ya estaba llamándome" },
      { text: "Muéstrame el camino que yo", missingWord: "voy", hint: "vou" },
      { text: "Tú, tú eres el imán y yo soy el metal" },
      { text: "Me voy acercando y voy armando el plan" },
      { text: "Solo con pensarlo se acelera el", missingWord: "pulso", hint: "pulso" },
    ]
  },
  {
    id: '3',
    title: 'Dernière Danse',
    artist: 'Indila',
    youtube_id: 'K5KAc5CoCuk',
    lang: 'fr',
    lyrics: [
      { text: "Oh ma douce souffrance" },
      { text: "Pourquoi s'acharner? Tu recommences" },
      { text: "Je ne suis qu'un être sans importance" },
      { text: "Sans lui je suis un peu", missingWord: "parano", hint: "paranoico" },
      { text: "Je déambule seule dans le métro" },
      { text: "Une dernière danse" },
      { text: "Pour oublier ma peine immense" },
      { text: "Je veux m'enfuir que tout", missingWord: "recommence", hint: "recomece" },
    ]
  },
  {
    id: '4',
    title: 'Beggin\'',
    artist: 'Måneskin',
    youtube_id: 'id6l5a2J7ig',
    lang: 'en',
    lyrics: [
      { text: "I'm beggin', beggin' you" },
      { text: "So put your loving hand out baby" },
      { text: "I'm beggin', beggin' you" },
      { text: "So put your loving hand out darlin'" },
      { text: "Ridin' high, when I was king" },
      { text: "I played it hard and fast, cause I had", missingWord: "everything", hint: "tudo" },
      { text: "I walked away, you won me then" },
      { text: "But easy come and easy", missingWord: "go", hint: "vai" },
    ]
  }
];

const LyricalVibes: React.FC<LyricalVibesProps> = ({ userId }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, 'correct' | 'wrong' | null>>({});
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showSearch, setShowSearch] = useState(true);

  // Play Video State
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSelectSong = (song: Song) => {
    setCurrentSong(song);
    setInputs({});
    setFeedback({});
    setScore(0);
    setIsCompleted(false);
    setShowSearch(false);
    setIsPlaying(false);
  };

  const handleInputChange = (index: number, value: string) => {
    setInputs(prev => ({ ...prev, [index]: value }));
  };

  const checkAnswers = async () => {
    if (!currentSong) return;
    
    let correctCount = 0;
    const newFeedback: Record<number, 'correct' | 'wrong' | null> = {};
    let allCorrect = true;
    let totalBlanks = 0;

    currentSong.lyrics.forEach((line, idx) => {
      if (line.missingWord) {
        totalBlanks++;
        const userInput = inputs[idx]?.trim().toLowerCase();
        const correctWord = line.missingWord.toLowerCase();
        
        if (userInput === correctWord) {
          newFeedback[idx] = 'correct';
          correctCount++;
        } else {
          newFeedback[idx] = 'wrong';
          allCorrect = false;
        }
      }
    });

    setFeedback(newFeedback);
    
    if (allCorrect && totalBlanks > 0) {
      setIsCompleted(true);
      const finalScore = 100;
      setScore(finalScore);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      
      // Save Score
      try {
         await supabase.from('lyrical_progress').insert({
             user_id: userId,
             song_id: currentSong.id,
             score: finalScore
         });
      } catch (e) {
         console.warn("Could not save score (table might not exist).");
      }
    }
  };

  const resetGame = () => {
    setInputs({});
    setFeedback({});
    setIsCompleted(false);
    setIsPlaying(false);
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8">
        <div>
           <div className="inline-flex items-center gap-2 bg-pink-100 dark:bg-pink-900/20 px-4 py-2 rounded-full border border-pink-200 dark:border-pink-800 mb-4">
              <Music2 className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400">Karaokê Educativo</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Lyrical Vibes</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Aprenda idiomas cantando os hits do momento.</p>
        </div>
        {currentSong && (
           <button onClick={() => setShowSearch(true)} className="px-6 py-3 bg-slate-100 dark:bg-white/10 rounded-2xl text-slate-500 font-bold text-xs uppercase hover:bg-slate-200 transition-colors">
              Trocar Música
           </button>
        )}
      </header>

      {showSearch && (
         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-20">
            {SONGS_DB.map(song => (
               <button 
                 key={song.id} 
                 onClick={() => handleSelectSong(song)}
                 className="group relative bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] p-6 border-2 border-slate-200 dark:border-white/10 hover:border-pink-500 hover:shadow-xl transition-all text-left overflow-hidden"
               >
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                     <div className="w-full aspect-video bg-black rounded-2xl mb-4 overflow-hidden shadow-lg relative group-hover:scale-[1.02] transition-transform">
                        <img 
                          src={`https://img.youtube.com/vi/${song.youtube_id}/mqdefault.jpg`} 
                          alt={song.title} 
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40">
                              <Play size={20} className="text-white ml-1" fill="currentColor" />
                           </div>
                        </div>
                     </div>
                     <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{song.title}</h3>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{song.artist}</p>
                     <div className="mt-4 flex gap-2">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-[9px] font-black uppercase text-slate-500">
                           {song.lang === 'en' ? 'Inglês' : song.lang === 'es' ? 'Espanhol' : 'Francês'}
                        </span>
                     </div>
                  </div>
               </button>
            ))}
         </div>
      )}

      {!showSearch && currentSong && (
         <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0 animate-in slide-in-from-bottom-8">
            
            {/* PLAYER */}
            <div className="lg:w-1/2 flex flex-col gap-6">
               <div className="w-full aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-900 dark:border-slate-800 relative group">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${currentSong.youtube_id}?autoplay=0&rel=0&modestbranding=1`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="absolute inset-0"
                  ></iframe>
               </div>
               
               <div className="bg-slate-900 dark:bg-white p-6 rounded-[2rem] text-white dark:text-slate-900 shadow-xl flex items-center justify-between">
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-tight">{currentSong.title}</h3>
                     <p className="text-xs font-bold opacity-70 uppercase tracking-widest">{currentSong.artist}</p>
                  </div>
                  {isCompleted && (
                     <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl animate-bounce">
                        <Trophy size={16} />
                        <span className="font-black text-xs uppercase">Completado!</span>
                     </div>
                  )}
               </div>
            </div>

            {/* LYRICS & INPUTS */}
            <div className="lg:w-1/2 flex flex-col h-[500px] lg:h-auto bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-xl overflow-hidden relative">
               <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white dark:from-[#1a1a1a] to-transparent z-10 pointer-events-none"></div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  {currentSong.lyrics.map((line, idx) => (
                     <div key={idx} className="flex flex-wrap items-baseline gap-2 text-lg font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {line.missingWord ? (
                           <>
                              <span>{line.text.split(line.missingWord)[0]}</span>
                              <div className="relative inline-block">
                                 <input 
                                   type="text"
                                   value={inputs[idx] || ''}
                                   onChange={(e) => handleInputChange(idx, e.target.value)}
                                   disabled={isCompleted || feedback[idx] === 'correct'}
                                   className={`w-32 bg-transparent border-b-2 text-center font-bold outline-none transition-colors ${
                                      feedback[idx] === 'correct' ? 'border-emerald-500 text-emerald-600' : 
                                      feedback[idx] === 'wrong' ? 'border-red-500 text-red-500 animate-shake' : 
                                      'border-slate-300 focus:border-pink-500 text-pink-600'
                                   }`}
                                   placeholder="?"
                                 />
                                 {feedback[idx] === 'wrong' && (
                                    <span className="absolute -top-4 left-0 text-[9px] text-red-500 font-bold w-full text-center">Tente de novo</span>
                                 )}
                                 {!feedback[idx] && line.hint && (
                                    <span className="absolute -bottom-4 left-0 text-[9px] text-slate-400 font-bold w-full text-center opacity-0 hover:opacity-100 transition-opacity cursor-help">
                                       Dica: {line.hint}
                                    </span>
                                 )}
                              </div>
                              <span>{line.text.split(line.missingWord)[1]}</span>
                           </>
                        ) : (
                           <span>{line.text}</span>
                        )}
                     </div>
                  ))}
               </div>
               
               <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-[#1a1a1a] to-transparent z-10 pointer-events-none"></div>

               <div className="p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex gap-4 shrink-0 relative z-20">
                  <button 
                     onClick={resetGame}
                     className="p-4 bg-slate-200 dark:bg-white/10 rounded-2xl text-slate-500 hover:text-slate-800 transition-colors"
                  >
                     <RotateCcw size={20} />
                  </button>
                  <button 
                     onClick={checkAnswers}
                     disabled={isCompleted}
                     className="flex-1 py-4 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                     {isCompleted ? 'Sucesso!' : 'Verificar Respostas'} <CheckCircle2 size={18} />
                  </button>
               </div>
            </div>

         </div>
      )}

    </div>
  );
};

export default LyricalVibes;
