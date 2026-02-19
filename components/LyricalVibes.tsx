
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Music2, Play, CheckCircle2, RotateCcw, Trophy, AlertCircle, 
  Search, Heart, Zap, Flame, Skull, Disc, Mic2, 
  Filter, Sparkles, Coins, Unlock, BookOpen, ArrowRight
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';
import { Song } from '../types';

interface LyricalVibesProps {
  userId: string;
}

// Extensão da interface Song para incluir Gênero e Dificuldade Visual
interface EnhancedSong extends Song {
  genre: 'Pop' | 'Rock' | 'Indie' | 'Reggaeton' | 'Ballad' | 'Rap';
  difficultyLevel: 1 | 2 | 3; // 1 = Easy, 2 = Medium, 3 = Hard
  color: string; // Cor temática da música
}

// BANCO DE DADOS APRIMORADO: DICAS MONOLÍNGUES E LETRAS COMPLETAS
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
      { text: "We were good, we were gold" },
      { text: "Kinda dream that can't be sold" },
      { text: "We were right 'til we weren't" },
      { text: "Built a home and watched it", missingWord: "burn", hint: "To undergo combustion; to be on fire." },
      { text: "Mm, I didn't wanna leave you" },
      { text: "I didn't wanna lie" },
      { text: "Started to cry but then remembered I" },
      { text: "I can buy myself", missingWord: "flowers", hint: "The reproductive structure of a plant, often colorful and fragrant." },
      { text: "Write my name in the", missingWord: "sand", hint: "Small grains of rock found on beaches and deserts." },
      { text: "Talk to myself for hours" },
      { text: "Say things you don't", missingWord: "understand", hint: "To perceive the meaning of something; to comprehend." },
      { text: "I can take myself dancing" },
      { text: "And I can hold my own", missingWord: "hand", hint: "The end part of the arm beyond the wrist." },
      { text: "Yeah, I can love me better than you can" }
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
  
  // Game State
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState<'playing' | 'gameover' | 'won'>('playing');
  const [showSearch, setShowSearch] = useState(true);
  
  // Filters
  const [filterLang, setFilterLang] = useState<string>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');

  // Input Refs for Navigation
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Calculations
  const totalBlanks = useMemo(() => {
    return currentSong ? currentSong.lyrics.filter(l => l.missingWord).length : 0;
  }, [currentSong]);

  const filledCorrectly = useMemo(() => {
    return Object.values(feedback).filter(f => f === 'correct').length;
  }, [feedback]);

  const progressPercent = totalBlanks > 0 ? (filledCorrectly / totalBlanks) * 100 : 0;

  const handleSelectSong = (song: EnhancedSong) => {
    setCurrentSong(song);
    setInputs({});
    setFeedback({});
    setScore(0);
    setLives(3);
    setCombo(0);
    setStatus('playing');
    setShowSearch(false);
    inputRefs.current = {};
  };

  const handleInputChange = (index: number, value: string) => {
    if (status !== 'playing') return;
    setInputs(prev => ({ ...prev, [index]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
       // Find next missing word index
       if (!currentSong) return;
       let nextIndex = -1;
       
       for (let i = index + 1; i < currentSong.lyrics.length; i++) {
           if (currentSong.lyrics[i].missingWord) {
               nextIndex = i;
               break;
           }
       }
       
       // If valid next index, focus it
       if (nextIndex !== -1 && inputRefs.current[nextIndex]) {
           inputRefs.current[nextIndex]?.focus();
       } else {
           // If no next, maybe submit? Or cycle to start? Let's just blur to indicate end.
           (e.target as HTMLInputElement).blur();
       }
    }
  };

  const checkAnswers = async () => {
    if (!currentSong || status !== 'playing') return;
    
    let correctInThisCheck = 0;
    let wrongInThisCheck = 0;
    const newFeedback = { ...feedback };
    let completedBlanks = 0;

    currentSong.lyrics.forEach((line, idx) => {
      if (line.missingWord) {
        const userInput = inputs[idx]?.trim().toLowerCase();
        const correctWord = line.missingWord.toLowerCase();
        
        if (feedback[idx] === 'correct') {
            completedBlanks++;
            return;
        }

        if (userInput && userInput === correctWord) {
          newFeedback[idx] = 'correct';
          correctInThisCheck++;
          completedBlanks++;
        } else if (userInput && userInput !== correctWord) {
          newFeedback[idx] = 'wrong';
          wrongInThisCheck++;
        }
      }
    });

    setFeedback(newFeedback);

    if (wrongInThisCheck > 0) {
        setLives(prev => Math.max(0, prev - 1));
        setCombo(0);
        if (lives - 1 <= 0) {
            setStatus('gameover');
            return;
        }
    } else if (correctInThisCheck > 0) {
        const difficultyMultiplier = difficulty === 'hard' ? 2 : 1;
        const comboBonus = combo * 10;
        const points = (correctInThisCheck * 100 * difficultyMultiplier) + comboBonus;
        
        setScore(prev => prev + points);
        setCombo(prev => prev + 1);
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    }

    if (completedBlanks === totalBlanks) {
      setStatus('won');
      const finalScore = score + (lives * 500); 
      setScore(finalScore);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      
      try {
         await supabase.from('lyrical_progress').insert({
             user_id: userId,
             song_id: currentSong.id,
             score: finalScore
         });
      } catch (e) {}
    }
  };

  // POWER UPS
  const buyLife = () => {
    if (score >= 200 && lives < 5) {
      setScore(s => s - 200);
      setLives(l => l + 1);
    }
  };

  const buyHint = (index: number) => {
    if (score >= 50 && currentSong && !inputs[index]) {
       const word = currentSong.lyrics[index].missingWord;
       if (word) {
          setScore(s => s - 50);
          setInputs(prev => ({...prev, [index]: word.charAt(0)}));
       }
    }
  };

  const resetGame = () => {
    setInputs({});
    setFeedback({});
    setStatus('playing');
    setLives(3);
    setScore(0);
    setCombo(0);
  };

  const filteredSongs = SONGS_DB.filter(s => {
    const matchLang = filterLang === 'all' || s.lang === filterLang;
    const matchGenre = filterGenre === 'all' || s.genre === filterGenre;
    return matchLang && matchGenre;
  });

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8">
        <div>
           <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 rounded-full mb-4 shadow-lg shadow-pink-500/20">
              <Music2 className="w-4 h-4 text-white animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Music Academy</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Lyrical Vibes</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Imersão musical total.</p>
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

      {showSearch && (
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
                     {/* Dynamic Gradient Background on Hover */}
                     <div className={`absolute inset-0 bg-gradient-to-br ${song.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                     
                     <div className="relative z-10 flex flex-col h-full">
                        {/* Cover Art Sim */}
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
                           
                           {/* Genre Badge */}
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
      )}

      {!showSearch && currentSong && (
         <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0 animate-in slide-in-from-bottom-8">
            
            {/* PLAYER & HUD */}
            <div className="lg:w-5/12 flex flex-col gap-6">
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

               {/* VIDEO PLAYER (VINYL STYLE) */}
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

                  {/* VINYL ANIMATION (Decorativo em baixo) */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-black border-4 border-slate-800 shadow-2xl animate-[spin_5s_linear_infinite] flex items-center justify-center z-20 pointer-events-none hidden md:flex">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-tr ${currentSong.color}`}></div>
                      <div className="absolute w-2 h-2 bg-white rounded-full"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                  </div>
               </div>
               
               {/* STORE / POWER UPS */}
               <div className="grid grid-cols-2 gap-4">
                  <button 
                     onClick={() => buyHint(Object.keys(currentSong.lyrics).find(i => currentSong.lyrics[Number(i)].missingWord && !inputs[Number(i)]) as any)}
                     disabled={score < 50}
                     className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-between hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <div className="flex items-center gap-2">
                        <Unlock size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-[10px] font-black uppercase text-indigo-800 dark:text-indigo-300">Revelar Letra</span>
                     </div>
                     <span className="text-xs font-bold text-indigo-600">-50</span>
                  </button>
                  <button 
                     onClick={buyLife}
                     disabled={score < 200 || lives >= 5}
                     className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border-2 border-red-200 dark:border-red-800 flex items-center justify-between hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <div className="flex items-center gap-2">
                        <Heart size={16} className="text-red-600 dark:text-red-400" />
                        <span className="text-[10px] font-black uppercase text-red-800 dark:text-red-300">Vida Extra</span>
                     </div>
                     <span className="text-xs font-bold text-red-600">-200</span>
                  </button>
               </div>
            </div>

            {/* LYRICS & INPUTS */}
            <div className="lg:w-7/12 flex flex-col h-[500px] lg:h-auto bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-xl overflow-hidden relative">
               <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${currentSong.color} z-20`}></div>
               
               {/* Progress Bar */}
               <div className="w-full h-1 bg-slate-100 dark:bg-white/5 relative">
                  <div 
                     className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                     style={{ width: `${progressPercent}%` }}
                  />
               </div>

               <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  {currentSong.lyrics.map((line, idx) => (
                     <div key={idx} className="flex flex-wrap items-baseline gap-2 text-lg md:text-2xl font-medium text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
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
                                   }`}
                                   placeholder="?"
                                   autoComplete="off"
                                 />
                                 
                                 {/* DICTIONARY HINT (Only shows if easy mode or bought) */}
                                 {(!feedback[idx] && line.hint && difficulty === 'easy') && (
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 pointer-events-none w-64">
                                       <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-2xl border border-white/10 backdrop-blur-md">
                                          <div className="flex items-center gap-2 mb-1 border-b border-white/20 pb-1">
                                             <BookOpen size={12} className="text-purple-400" />
                                             <span className="font-black uppercase tracking-widest text-[9px] text-purple-400">Definition</span>
                                          </div>
                                          <p className="font-serif italic leading-snug">"{line.hint}"</p>
                                       </div>
                                       {/* Arrow */}
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
            </div>

         </div>
      )}

    </div>
  );
};

export default LyricalVibes;
