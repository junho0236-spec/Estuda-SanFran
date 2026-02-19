
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Music2, Play, CheckCircle2, RotateCcw, Trophy, AlertCircle, 
  Search, Heart, Zap, Flame, Skull, Disc, Mic2, 
  Filter, Sparkles, Coins, Unlock, BookOpen, ArrowRight, Eye, Volume2, X, Star
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';
import { Song } from '../types';

interface LyricalVibesProps {
  userId: string;
}

// Extensão da interface Song
interface EnhancedSong extends Song {
  genre: 'Pop' | 'Rock' | 'Indie' | 'Reggaeton' | 'Ballad' | 'Rap';
  difficultyLevel: 1 | 2 | 3;
  color: string;
}

// SONS (SFX)
const SFX = {
  correct: "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3",
  wrong: "https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3",
  win: "https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3",
  reveal: "https://assets.mixkit.co/sfx/preview/mixkit-quick-jump-arcade-game-239.mp3"
};

const SONGS_DB: EnhancedSong[] = [
  {
    id: '1',
    title: 'Flowers',
    artist: 'Miley Cyrus',
    youtube_id: 'G7KNmW9a75Y',
    lang: 'en',
    genre: 'Pop',
    difficultyLevel: 1,
    color: 'from-rose-400 to-red-500',
    lyrics: [
      // Verse 1
      { text: "We were good, we were gold" },
      { text: "Kinda dream that can't be sold" },
      { text: "We were right 'til we weren't" },
      { text: "Built a home and watched it", missingWord: "burn", hint: "To be on fire; undergo combustion." },
      
      // Pre-Chorus
      { text: "Mm, I didn't wanna leave you" },
      { text: "I didn't wanna lie" },
      { text: "Started to cry but then remembered I" },
      
      // Chorus 1
      { text: "I can buy myself", missingWord: "flowers", hint: "The reproductive structure of a plant, often colorful." },
      { text: "Write my name in the", missingWord: "sand", hint: "Small grains of rock found on beaches." },
      { text: "Talk to myself for", missingWord: "hours", hint: "Periods of time equal to sixty minutes." },
      { text: "Say things you don't", missingWord: "understand", hint: "To perceive the meaning of; comprehend." },
      { text: "I can take myself", missingWord: "dancing", hint: "To move the body rhythmically to music." },
      { text: "And I can hold my own", missingWord: "hand", hint: "The end part of the human arm." },
      { text: "Yeah, I can love me better than you can" },
      
      // Verse 2
      { text: "Paint my nails, cherry", missingWord: "red", hint: "The color of blood or fire." },
      { text: "Match the roses that you left" },
      { text: "No remorse, no", missingWord: "regret", hint: "A feeling of sadness about something you did or didn't do." },
      { text: "I forgive every word you said" },

      // Pre-Chorus 2
      { text: "Ooh, I didn't wanna leave you, baby" },
      { text: "I didn't wanna fight" },
      { text: "Started to", missingWord: "cry", hint: "To shed tears due to emotion." },
      { text: "But then remembered I" },

      // Chorus 2
      { text: "I can buy myself flowers" },
      { text: "Write my name in the sand" },
      { text: "Talk to myself for", missingWord: "hours", hint: "A long period of time." },
      { text: "Say things you don't understand" },
      { text: "I can take myself", missingWord: "dancing", hint: "Rhythmic movement to music." },
      { text: "And I can hold my own hand" },
      { text: "Yeah, I can love me better than you can" },

      // Bridge / Chorus Reprise
      { text: "Can love me better" },
      { text: "I can love me better, baby" },
      { text: "Can love me", missingWord: "better", hint: "Of a higher standard; more excellent." },
      { text: "I can love me better, baby" },

      // Final Chorus
      { text: "I can buy myself", missingWord: "flowers", hint: "Blossoms on a plant." },
      { text: "Write my name in the sand" },
      { text: "Talk to myself for hours" },
      { text: "Say things you don't", missingWord: "understand", hint: "Grasp the meaning of." },
      { text: "I can take myself dancing" },
      { text: "And I can hold my own", missingWord: "hand", hint: "Body part used for holding." },
      { text: "Yeah, I can love me better than", missingWord: "you", hint: "Pronoun referring to the person being addressed." },
      { text: "Can" },
      
      // Outro
      { text: "Can love me better" },
      { text: "I can love me better, baby" },
      { text: "Can love me better" },
      { text: "I can love me better, baby" }
    ]
  },
  {
    id: '2',
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    youtube_id: 'kJQP7kiw5Fk',
    lang: 'es',
    genre: 'Reggaeton',
    difficultyLevel: 1,
    color: 'from-orange-400 to-amber-500',
    lyrics: [
      { text: "Sí, sabes que ya llevo un rato mirándote" },
      { text: "Tengo que bailar contigo hoy (DY)" },
      { text: "Vi que tu mirada ya estaba llamándome" },
      { text: "Muéstrame el camino que yo", missingWord: "voy", hint: "Primera persona del verbo ir. Moverse de un lugar hacia otro." },
      { text: "Tú, tú eres el imán y yo soy el metal" },
      { text: "Me voy acercando y voy armando el plan" },
      { text: "Solo con pensarlo se acelera el", missingWord: "pulso", hint: "Latido intermitente de las arterias, que se percibe en varias partes del cuerpo." },
      { text: "Ya, ya me está gustando más de lo normal" },
      { text: "Todos mis sentidos van pidiendo más" },
      { text: "Esto hay que tomarlo sin ningún", missingWord: "apuro", hint: "Prisa, urgencia o precipitación." },
      { text: "Despacito" },
      { text: "Quiero respirar tu cuello", missingWord: "despacito", hint: "Lentamente, con poca velocidad." },
      { text: "Deja que te diga cosas al oído" },
      { text: "Para que te acuerdes si no estás", missingWord: "conmigo", hint: "En mi compañía; juntamente con mi persona." }
    ]
  },
  {
    id: '3',
    title: 'Dernière Danse',
    artist: 'Indila',
    youtube_id: 'K5KAc5CoCuk',
    lang: 'fr',
    genre: 'Pop',
    difficultyLevel: 2,
    color: 'from-slate-400 to-slate-600',
    lyrics: [
      { text: "Oh ma douce souffrance" },
      { text: "Pourquoi s'acharner? Tu recommences" },
      { text: "Je ne suis qu'un être sans importance" },
      { text: "Sans lui je suis un peu", missingWord: "parano", hint: "Abréviation de paranoïaque. Qui souffre de délire de persécution." },
      { text: "Je déambule seule dans le métro" },
      { text: "Une dernière danse" },
      { text: "Pour oublier ma peine immense" },
      { text: "Je veux m'enfuir que tout", missingWord: "recommence", hint: "Commencer une nouvelle fois." },
      { text: "Je remue le ciel, le jour, la", missingWord: "nuit", hint: "La période de temps comprise entre le coucher et le lever du soleil." },
      { text: "Je danse avec le vent, la pluie" },
      { text: "Un peu d'amour, un brin de", missingWord: "miel", hint: "Substance sucrée produite par les abeilles." },
      { text: "Et je danse, danse, danse, danse, danse, danse" }
    ]
  },
  {
    id: '4',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    youtube_id: 'fJ9rUzIMcZQ',
    lang: 'en',
    genre: 'Rock',
    difficultyLevel: 3,
    color: 'from-purple-500 to-indigo-600',
    lyrics: [
      { text: "Is this the real life? Is this just fantasy?" },
      { text: "Caught in a landslide, no escape from", missingWord: "reality", hint: "The world or the state of things as they actually exist." },
      { text: "Open your eyes, look up to the skies and see" },
      { text: "I'm just a poor boy, I need no", missingWord: "sympathy", hint: "Feelings of pity and sorrow for someone else's misfortune." },
      { text: "Because I'm easy come, easy go, little high, little low" },
      { text: "Any way the wind blows doesn't really matter to", missingWord: "me", hint: "Used by a speaker to refer to himself or herself." },
      { text: "Mama, just killed a man" },
      { text: "Put a gun against his head, pulled my trigger, now he's", missingWord: "dead", hint: "No longer alive." },
      { text: "Mama, life had just begun" },
      { text: "But now I've gone and thrown it all", missingWord: "away", hint: "To or at a distance from a particular place." }
    ]
  }
];

const LyricalVibes: React.FC<LyricalVibesProps> = ({ userId }) => {
  const [currentSong, setCurrentSong] = useState<EnhancedSong | null>(null);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, 'correct' | 'wrong' | null>>({});
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());
  
  // Game State
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState<'playing' | 'gameover' | 'won'>('playing');
  const [showSearch, setShowSearch] = useState(true);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  
  // Stats for Report
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  
  // Filters
  const [filterLang, setFilterLang] = useState<string>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');

  // Input Refs for Navigation
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Calculations
  const totalBlanks = useMemo(() => {
    return currentSong ? currentSong.lyrics.filter(l => l.missingWord).length : 0;
  }, [currentSong]);

  const progressPercent = totalBlanks > 0 ? (correctCount / totalBlanks) * 100 : 0;

  // Sound Helper
  const playSound = (type: 'correct' | 'wrong' | 'win' | 'reveal') => {
      const audio = new Audio(SFX[type]);
      audio.volume = 0.4;
      audio.play().catch(() => {});
  };

  const handleSelectSong = (song: EnhancedSong) => {
    setCurrentSong(song);
    setInputs({});
    setFeedback({});
    setRevealedHints(new Set());
    setScore(0);
    setLives(3);
    setCombo(0);
    setAttempts(0);
    setCorrectCount(0);
    setStatus('playing');
    setShowSearch(false);
    setShowResultsModal(false);
    inputRefs.current = {};
  };

  const handleInputChange = (index: number, value: string) => {
    if (status !== 'playing') return;
    setInputs(prev => ({ ...prev, [index]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
       if (!currentSong) return;
       // Check current input first? Or just move?
       // Let's move focus to next blank
       let nextIndex = -1;
       
       for (let i = index + 1; i < currentSong.lyrics.length; i++) {
           if (currentSong.lyrics[i].missingWord) {
               nextIndex = i;
               break;
           }
       }
       if (nextIndex !== -1 && inputRefs.current[nextIndex]) {
           inputRefs.current[nextIndex]?.focus();
       } else {
           (e.target as HTMLInputElement).blur();
       }
    }
  };

  const revealHint = (idx: number) => {
     if (revealedHints.has(idx)) return;
     setRevealedHints(prev => new Set(prev).add(idx));
     setScore(prev => Math.max(0, prev - 20)); // Penalty for using hint
     playSound('reveal');
  };

  const buyHint = (idxStr: string | undefined) => {
    if (idxStr === undefined || !currentSong) return;
    const idx = Number(idxStr);
    const line = currentSong.lyrics[idx];
    if (line && line.missingWord) {
       setInputs(prev => ({ ...prev, [idx]: line.missingWord! }));
       setScore(prev => Math.max(0, prev - 50));
       playSound('reveal');
    }
  };

  const checkAnswers = async () => {
    if (!currentSong || status !== 'playing') return;
    
    let correctInThisCheck = 0;
    let wrongInThisCheck = 0;
    const newFeedback = { ...feedback };
    let totalCompleted = correctCount; // Use state tracking

    currentSong.lyrics.forEach((line, idx) => {
      if (line.missingWord) {
        const userInput = inputs[idx]?.trim().toLowerCase();
        const correctWord = line.missingWord.toLowerCase();
        
        // Skip already correct
        if (feedback[idx] === 'correct') return;

        if (userInput) {
            setAttempts(prev => prev + 1);
            if (userInput === correctWord) {
              newFeedback[idx] = 'correct';
              correctInThisCheck++;
              totalCompleted++;
            } else {
              newFeedback[idx] = 'wrong';
              wrongInThisCheck++;
            }
        }
      }
    });

    setFeedback(newFeedback);
    setCorrectCount(totalCompleted);

    if (wrongInThisCheck > 0) {
        setLives(prev => Math.max(0, prev - 1));
        setCombo(0);
        playSound('wrong');
        if (lives - 1 <= 0) {
            setStatus('gameover');
            return;
        }
    } 
    
    if (correctInThisCheck > 0) {
        const difficultyMultiplier = difficulty === 'hard' ? 2 : 1;
        const comboBonus = combo * 10;
        const points = (correctInThisCheck * 100 * difficultyMultiplier) + comboBonus;
        
        setScore(prev => prev + points);
        setCombo(prev => prev + 1);
        playSound('correct');
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    }

    if (totalCompleted === totalBlanks) {
      setStatus('won');
      const finalScore = score + (lives * 500); 
      setScore(finalScore);
      playSound('win');
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      setTimeout(() => setShowResultsModal(true), 1500); // Show report after delay
      
      try {
         await supabase.from('lyrical_progress').insert({
             user_id: userId,
             song_id: currentSong.id,
             score: finalScore
         });
      } catch (e) {}
    }
  };

  const getRank = () => {
     if (score > 2000) return 'S';
     if (score > 1500) return 'A';
     if (score > 1000) return 'B';
     return 'C';
  };

  const resetGame = () => {
    setInputs({});
    setFeedback({});
    setStatus('playing');
    setLives(3);
    setScore(0);
    setCombo(0);
    setAttempts(0);
    setCorrectCount(0);
    setRevealedHints(new Set());
    setShowResultsModal(false);
  };

  const filteredSongs = SONGS_DB.filter(s => {
    const matchLang = filterLang === 'all' || s.lang === filterLang;
    const matchGenre = filterGenre === 'all' || s.genre === filterGenre;
    return matchLang && matchGenre;
  });

  return (
    <div className={`h-full flex flex-col max-w-7xl mx-auto transition-all duration-500 ${isZenMode ? 'p-0 fixed inset-0 z-50 bg-black' : 'pb-20 px-4 md:px-0 font-sans'}`}>
      
      {/* HEADER (Hidden in Zen Mode) */}
      {!isZenMode && (
         <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8 pt-6">
            <div>
               <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 rounded-full mb-4 shadow-lg shadow-pink-500/20">
                  <Music2 className="w-4 h-4 text-white animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Music Academy</span>
               </div>
               <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Lyrical Vibes</h2>
               <p className="text-slate-500 font-bold italic text-lg mt-2">Imersão musical e vocabulário contextual.</p>
            </div>
            
            {currentSong && !showSearch && (
               <div className="flex gap-2">
                 <button 
                    onClick={() => setDifficulty(d => d === 'easy' ? 'hard' : 'easy')}
                    disabled={status !== 'playing' || Object.keys(feedback).length > 0}
                    className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${difficulty === 'hard' ? 'bg-red-500 text-white border-red-600 shadow-red-500/20 shadow-lg' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}
                 >
                    {difficulty === 'hard' ? <><Flame size={14} /> Hardcore</> : <><CheckCircle2 size={14} /> Normal</>}
                 </button>
                 <button onClick={() => setShowSearch(true)} className="px-6 py-3 bg-slate-100 dark:bg-white/10 rounded-2xl text-slate-500 font-bold text-xs uppercase hover:bg-slate-200 transition-colors">
                    Trocar
                 </button>
               </div>
            )}
         </header>
      )}

      {showSearch ? (
         <div className="flex-1 flex flex-col min-h-0">
            {/* FILTERS */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                   <Filter size={16} className="text-slate-400 ml-2" />
                   {['all', 'en', 'es', 'fr', 'de', 'it'].map(lang => (
                      <button 
                        key={lang}
                        onClick={() => setFilterLang(lang)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterLang === lang ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                         {lang === 'all' ? 'Todos' : lang.toUpperCase()}
                      </button>
                   ))}
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                   {['all', 'Pop', 'Rock', 'Reggaeton'].map(genre => (
                      <button 
                        key={genre}
                        onClick={() => setFilterGenre(genre)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterGenre === genre ? 'bg-white dark:bg-purple-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                         {genre === 'all' ? 'Gêneros' : genre}
                      </button>
                   ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar pb-20">
               {filteredSongs.map(song => (
                  <button 
                    key={song.id} 
                    onClick={() => handleSelectSong(song)}
                    className="group relative bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-6 border-2 border-slate-200 dark:border-white/5 hover:border-transparent transition-all text-left overflow-hidden hover:scale-[1.02] shadow-sm hover:shadow-2xl"
                  >
                     <div className={`absolute inset-0 bg-gradient-to-br ${song.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                     <div className="relative z-10 flex flex-col h-full">
                        <div className="w-full aspect-square rounded-2xl mb-4 overflow-hidden shadow-lg relative group-hover:shadow-black/20">
                           <img 
                             src={`https://img.youtube.com/vi/${song.youtube_id}/mqdefault.jpg`} 
                             alt={song.title} 
                             className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-2"
                           />
                           <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40">
                                 <Play size={20} className="text-white ml-1" fill="currentColor" />
                              </div>
                           </div>
                           <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-black uppercase text-white border border-white/10">
                              {song.genre}
                           </div>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover:text-white transition-colors">{song.title}</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-white/80 transition-colors mb-4">{song.artist}</p>
                        <div className="mt-auto flex items-center gap-2">
                           <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full bg-slate-300 dark:bg-white/30 group-hover:bg-white/50 w-${song.difficultyLevel}/3`}></div>
                           </div>
                           <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-white/70">
                              Lvl {song.difficultyLevel}
                           </span>
                        </div>
                     </div>
                  </button>
               ))}
            </div>
         </div>
      ) : currentSong && (
         <div className={`flex-1 flex flex-col ${isZenMode ? 'lg:flex-row-reverse h-screen' : 'lg:flex-row gap-8 min-h-0 animate-in slide-in-from-bottom-8'}`}>
            
            {/* PLAYER & HUD */}
            <div className={`flex flex-col gap-6 ${isZenMode ? 'hidden' : 'lg:w-5/12'}`}>
               {/* SCOREBOARD */}
               <div className="bg-slate-900 dark:bg-white p-6 rounded-[2.5rem] shadow-xl text-white dark:text-slate-900 flex justify-between items-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                  
                  <div className="text-center z-10">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Pontuação</p>
                      <p className="text-4xl font-black tabular-nums tracking-tighter">{score}</p>
                  </div>
                  
                  <div className="flex gap-1 z-10">
                     {[...Array(5)].map((_, i) => (
                        <Heart 
                           key={i} 
                           size={24} 
                           className={`transition-all ${i < lives ? "text-red-500 fill-current drop-shadow-lg" : "text-slate-700 dark:text-slate-200 opacity-20"}`} 
                        />
                     ))}
                  </div>

                  <div className="text-center z-10">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Combo</p>
                      <div className="flex items-center gap-1 justify-center">
                         <Zap size={16} className={combo > 1 ? "text-yellow-400 fill-current animate-bounce" : "text-slate-600"} />
                         <span className="text-2xl font-black tabular-nums">x{combo}</span>
                      </div>
                  </div>
               </div>

               {/* VIDEO PLAYER */}
               <div className="bg-white dark:bg-[#1a1a1a] p-1 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-white/5 relative group">
                  {status === 'gameover' ? (
                     <div className="aspect-square flex flex-col items-center justify-center bg-slate-900/90 rounded-[2.8rem] text-white z-20">
                        <Skull size={64} className="text-red-500 mb-4 animate-pulse" />
                        <h3 className="text-3xl font-black uppercase tracking-tighter">Sem Vidas</h3>
                        <button onClick={resetGame} className="mt-6 px-8 py-3 bg-white text-slate-900 rounded-xl font-black uppercase text-xs hover:scale-105 transition-transform">Tentar Novamente</button>
                     </div>
                  ) : (
                    <div className="relative w-full aspect-video rounded-[2.8rem] overflow-hidden bg-black">
                        <iframe 
                          width="100%" 
                          height="100%" 
                          src={`https://www.youtube.com/embed/${currentSong.youtube_id}?autoplay=1&mute=0&controls=0&origin=${window.location.origin}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`} 
                          title="YouTube video player" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                          className="absolute inset-0"
                        ></iframe>
                    </div>
                  )}

                  {/* VISUALIZER SIMULATION */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-black border-4 border-slate-800 shadow-2xl animate-[spin_5s_linear_infinite] flex items-center justify-center z-20 pointer-events-none hidden md:flex">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-tr ${currentSong.color}`}></div>
                      <div className="absolute w-2 h-2 bg-white rounded-full"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                  </div>
               </div>
               
               {/* POWER UPS */}
               <div className="grid grid-cols-2 gap-4">
                  <button 
                     onClick={() => buyHint(Object.keys(currentSong.lyrics).find(i => currentSong.lyrics[Number(i)].missingWord && !inputs[Number(i)]) as any)}
                     disabled={score < 50}
                     className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-between hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <div className="flex items-center gap-2">
                        <Unlock size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-[10px] font-black uppercase text-indigo-800 dark:text-indigo-300">Revelar (-50)</span>
                     </div>
                  </button>
                  <button 
                     onClick={() => setIsZenMode(prev => !prev)}
                     className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                     <Eye size={16} className="mr-2" /> <span className="text-[10px] font-black uppercase">Modo Zen</span>
                  </button>
               </div>
            </div>

            {/* LYRICS & INPUTS */}
            <div className={`${isZenMode ? 'w-full h-full p-20 bg-black/90 text-white z-50' : 'lg:w-7/12'} flex flex-col h-[500px] lg:h-auto bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-xl overflow-hidden relative`}>
               {!isZenMode && <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${currentSong.color} z-20`}></div>}
               
               {/* Progress Bar */}
               <div className="w-full h-1 bg-slate-100 dark:bg-white/5 relative">
                  <div 
                     className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                     style={{ width: `${progressPercent}%` }}
                  />
               </div>

               <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative">
                  
                  {isZenMode && (
                     <button onClick={() => setIsZenMode(false)} className="absolute top-4 right-4 text-white/50 hover:text-white p-2 border border-white/20 rounded-full">
                        <X size={24} />
                     </button>
                  )}

                  {currentSong.lyrics.map((line, idx) => (
                     <div key={idx} className={`flex flex-wrap items-baseline gap-2 text-lg md:text-2xl font-medium leading-relaxed font-serif ${isZenMode ? 'text-white/80' : 'text-slate-700 dark:text-slate-300'}`}>
                        {line.missingWord ? (
                           <>
                              <span>{line.text.split(line.missingWord)[0]}</span>
                              <div className="relative inline-block group">
                                 <input 
                                   type="text"
                                   ref={(el) => inputRefs.current[idx] = el}
                                   value={inputs[idx] || ''}
                                   onChange={(e) => handleInputChange(idx, e.target.value)}
                                   onKeyDown={(e) => handleKeyDown(e, idx)}
                                   disabled={status !== 'playing' || feedback[idx] === 'correct'}
                                   className={`min-w-[120px] bg-transparent border-b-4 text-center font-bold outline-none transition-all ${
                                      feedback[idx] === 'correct' ? 'border-emerald-500 text-emerald-600' : 
                                      feedback[idx] === 'wrong' ? 'border-red-500 text-red-500 animate-shake' : 
                                      'border-slate-300 focus:border-purple-500 text-purple-600 focus:w-[150px]'
                                   } ${isZenMode ? 'text-white border-white/30 focus:border-white' : ''}`}
                                   placeholder="?"
                                   autoComplete="off"
                                 />
                                 
                                 {/* DICTIONARY HINT (Hidden/Blurred logic) */}
                                 {(!feedback[idx] && line.hint && difficulty === 'easy') && (
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 pointer-events-none w-64 group-focus-within:opacity-100">
                                       <div 
                                          className={`bg-slate-900 text-white text-xs p-3 rounded-xl shadow-2xl border border-white/10 backdrop-blur-md cursor-pointer pointer-events-auto transition-all ${!revealedHints.has(idx) ? 'blur-sm hover:blur-none' : ''}`}
                                          onClick={() => revealHint(idx)}
                                       >
                                          <div className="flex items-center gap-2 mb-1 border-b border-white/20 pb-1">
                                             <BookOpen size={12} className="text-purple-400" />
                                             <span className="font-black uppercase tracking-widest text-[9px] text-purple-400">Definition</span>
                                             {!revealedHints.has(idx) && <span className="text-[8px] text-red-400 ml-auto">-20 pts</span>}
                                          </div>
                                          <p className="font-serif italic leading-snug">"{line.hint}"</p>
                                       </div>
                                       <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-slate-900"></div>
                                    </div>
                                 )}
                              </div>
                              <span>{line.text.split(line.missingWord)[1]}</span>
                           </>
                        ) : (
                           <span className="opacity-80 hover:opacity-100 transition-opacity">{line.text}</span>
                        )}
                     </div>
                  ))}
               </div>
               
               {!isZenMode && (
                  <div className="p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex gap-4 shrink-0 relative z-20">
                     <button 
                        onClick={resetGame}
                        className="p-4 bg-slate-200 dark:bg-white/10 rounded-2xl text-slate-500 hover:text-slate-800 transition-colors"
                        title="Reiniciar"
                     >
                        <RotateCcw size={20} />
                     </button>
                     <button 
                        onClick={checkAnswers}
                        disabled={status !== 'playing'}
                        className={`flex-1 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg transition-all flex items-center justify-center gap-3 ${status === 'playing' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                     >
                        {status === 'won' ? 'Sucesso!' : 'Verificar Respostas'} <CheckCircle2 size={18} />
                     </button>
                  </div>
               )}
            </div>

         </div>
      )}

      {/* RESULTS MODAL (After Action Report) */}
      {showResultsModal && currentSong && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative border-4 border-sanfran-rubi animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
               <div className="absolute top-0 right-0 w-64 h-64 bg-sanfran-rubi/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
               
               <div className="text-center mb-8 relative z-10">
                  <div className="inline-block p-4 rounded-full bg-yellow-400 text-white shadow-lg mb-4 animate-bounce">
                     <Trophy size={40} fill="currentColor" />
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sessão Concluída</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Relatório de Performance</p>
               </div>

               <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl text-center border border-slate-200 dark:border-white/10">
                     <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Rank</p>
                     <p className="text-4xl font-black text-sanfran-rubi">{getRank()}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl text-center border border-slate-200 dark:border-white/10">
                     <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Score</p>
                     <p className="text-2xl font-black text-slate-800 dark:text-white">{score}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl text-center border border-slate-200 dark:border-white/10">
                     <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Precisão</p>
                     <p className="text-2xl font-black text-emerald-500">{Math.round((totalBlanks / Math.max(1, attempts)) * 100)}%</p>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar mb-8">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 border-b border-slate-200 dark:border-white/10 pb-2">Vocabulário Aprendido</h4>
                  <div className="space-y-3">
                     {currentSong.lyrics.filter(l => l.missingWord).map((line, i) => (
                        <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                           <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {i + 1}
                           </div>
                           <div>
                              <p className="font-black text-slate-800 dark:text-white uppercase text-sm">{line.missingWord}</p>
                              <p className="text-xs text-slate-500 italic font-serif">"{line.hint}"</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="flex gap-4 shrink-0">
                  <button onClick={resetGame} className="flex-1 py-4 rounded-2xl bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white font-black uppercase text-xs hover:bg-slate-300">Jogar Novamente</button>
                  <button onClick={() => { setShowResultsModal(false); handleSelectSong(null as any); }} className="flex-1 py-4 rounded-2xl bg-sanfran-rubi text-white font-black uppercase text-xs hover:bg-sanfran-rubiDark shadow-xl">Voltar ao Menu</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default LyricalVibes;
