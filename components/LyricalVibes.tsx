
import React, { useState, useEffect, useRef } from 'react';
import { Music2, Play, CheckCircle2, RotateCcw, Volume2, Trophy, AlertCircle, Search, Heart, Zap, Flame, Skull, Settings2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';
import { Song, LyricLine } from '../types';

interface LyricalVibesProps {
  userId: string;
}

// Banco de Músicas Expandido e Mais Desafiador
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
      { text: "Write my name in the", missingWord: "sand", hint: "areia" },
      { text: "Talk to myself for hours" },
      { text: "Say things you don't", missingWord: "understand", hint: "entender" },
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
      { text: "Ya, ya me está gustando más de lo normal" },
      { text: "Todos mis sentidos van pidiendo más" },
      { text: "Esto hay que tomarlo sin ningún", missingWord: "apuro", hint: "pressa" },
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
      { text: "Je remue le ciel, le jour, la", missingWord: "nuit", hint: "noite" },
    ]
  },
  {
    id: '4',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    youtube_id: 'fJ9rUzIMcZQ',
    lang: 'en',
    lyrics: [
      { text: "Is this the real life? Is this just fantasy?" },
      { text: "Caught in a landslide, no escape from", missingWord: "reality", hint: "realidade" },
      { text: "Open your eyes, look up to the skies and see" },
      { text: "I'm just a poor boy, I need no", missingWord: "sympathy", hint: "simpatia/pena" },
      { text: "Because I'm easy come, easy go, little high, little low" },
      { text: "Any way the wind blows doesn't really matter to", missingWord: "me", hint: "mim" },
      { text: "Mama, just killed a man" },
      { text: "Put a gun against his head, pulled my trigger, now he's", missingWord: "dead", hint: "morto" },
    ]
  },
  {
    id: '5',
    title: '99 Luftballons',
    artist: 'Nena',
    youtube_id: 'La4Dcd1aUcE',
    lang: 'de',
    lyrics: [
      { text: "Hast du etwas Zeit für mich?" },
      { text: "Dann singe ich ein Lied für", missingWord: "dich", hint: "você" },
      { text: "Von 99 Luftballons" },
      { text: "Auf ihrem Weg zum", missingWord: "Horizont", hint: "horizonte" },
      { text: "Denkst du vielleicht grad an mich?" },
      { text: "Dann singe ich ein Lied für dich" },
      { text: "Von 99 Luftballons" },
      { text: "Und dass sowas von sowas", missingWord: "kommt", hint: "vem" },
    ]
  }
];

const LyricalVibes: React.FC<LyricalVibesProps> = ({ userId }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, 'correct' | 'wrong' | null>>({});
  
  // Game State
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState<'playing' | 'gameover' | 'won'>('playing');
  const [showSearch, setShowSearch] = useState(true);

  const handleSelectSong = (song: Song) => {
    setCurrentSong(song);
    setInputs({});
    setFeedback({});
    setScore(0);
    setLives(3); // Reset lives
    setCombo(0);
    setStatus('playing');
    setShowSearch(false);
  };

  const handleInputChange = (index: number, value: string) => {
    if (status !== 'playing') return;
    setInputs(prev => ({ ...prev, [index]: value }));
  };

  const checkAnswers = async () => {
    if (!currentSong || status !== 'playing') return;
    
    let correctInThisCheck = 0;
    let wrongInThisCheck = 0;
    const newFeedback = { ...feedback };
    let totalBlanks = 0;
    let completedBlanks = 0;

    currentSong.lyrics.forEach((line, idx) => {
      if (line.missingWord) {
        totalBlanks++;
        const userInput = inputs[idx]?.trim().toLowerCase();
        const correctWord = line.missingWord.toLowerCase();
        
        // Se já estava correto, ignora
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

    // Game Logic
    if (wrongInThisCheck > 0) {
        setLives(prev => Math.max(0, prev - 1));
        setCombo(0);
        // Play error sound effect here if possible
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

    // Win Condition
    if (completedBlanks === totalBlanks) {
      setStatus('won');
      const finalScore = score + (lives * 500); // Bônus por vidas restantes
      setScore(finalScore);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      
      // Save Score
      try {
         await supabase.from('lyrical_progress').insert({
             user_id: userId,
             song_id: currentSong.id,
             score: finalScore
         });
      } catch (e) {
         console.warn("Could not save score.");
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

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8">
        <div>
           <div className="inline-flex items-center gap-2 bg-pink-100 dark:bg-pink-900/20 px-4 py-2 rounded-full border border-pink-200 dark:border-pink-800 mb-4">
              <Music2 className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400">Karaokê Educativo</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Lyrical Vibes</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Treine listening no nível Hardcore.</p>
        </div>
        {currentSong && !showSearch && (
           <div className="flex gap-2">
             <button 
                onClick={() => setDifficulty(d => d === 'easy' ? 'hard' : 'easy')}
                disabled={status !== 'playing' || Object.keys(feedback).length > 0}
                className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${difficulty === 'hard' ? 'bg-red-500 text-white border-red-600' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}
             >
                {difficulty === 'hard' ? <><Flame size={14} /> Modo Hard</> : <><CheckCircle2 size={14} /> Modo Easy</>}
             </button>
             <button onClick={() => setShowSearch(true)} className="px-6 py-3 bg-slate-100 dark:bg-white/10 rounded-2xl text-slate-500 font-bold text-xs uppercase hover:bg-slate-200 transition-colors">
                Trocar Música
             </button>
           </div>
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
                           {song.lang === 'en' ? 'Inglês' : song.lang === 'es' ? 'Espanhol' : song.lang === 'fr' ? 'Francês' : 'Alemão'}
                        </span>
                        <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/20 text-pink-600 rounded-full text-[9px] font-black uppercase">
                           {song.lyrics.filter(l => l.missingWord).length} Lacunas
                        </span>
                     </div>
                  </div>
               </button>
            ))}
         </div>
      )}

      {!showSearch && currentSong && (
         <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0 animate-in slide-in-from-bottom-8">
            
            {/* PLAYER & HUD */}
            <div className="lg:w-5/12 flex flex-col gap-6">
               {/* HUD */}
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900 dark:bg-white p-4 rounded-2xl text-white dark:text-slate-900 flex flex-col items-center justify-center shadow-lg">
                      <div className="flex gap-1 mb-1">
                          {[...Array(3)].map((_, i) => (
                             <Heart key={i} size={16} className={i < lives ? "fill-current text-red-500" : "text-slate-700 dark:text-slate-300"} />
                          ))}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-70">Vidas</span>
                  </div>
                  <div className="bg-white dark:bg-white/10 p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center shadow-lg">
                      <p className="text-2xl font-black text-sanfran-rubi tabular-nums">{score}</p>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Score</span>
                  </div>
                  <div className="bg-white dark:bg-white/10 p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center shadow-lg">
                      <div className="flex items-center gap-1">
                         <Zap size={18} className={combo > 1 ? "text-yellow-500 fill-current animate-bounce" : "text-slate-300"} />
                         <span className="text-xl font-black">{combo}x</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Combo</span>
                  </div>
               </div>

               <div className="w-full aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-900 dark:border-slate-800 relative group">
                  {status === 'gameover' ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm text-white z-20">
                        <Skull size={64} className="text-red-500 mb-4 animate-pulse" />
                        <h3 className="text-3xl font-black uppercase tracking-tighter">Game Over</h3>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-6">Suas vidas acabaram.</p>
                        <button onClick={resetGame} className="px-8 py-3 bg-red-600 rounded-xl font-black uppercase text-xs hover:scale-105 transition-transform">Tentar Novamente</button>
                     </div>
                  ) : (
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
                  )}
               </div>
               
               <div className={`p-6 rounded-[2rem] shadow-xl flex items-center justify-between border-2 transition-colors ${status === 'won' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white'}`}>
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-tight">{currentSong.title}</h3>
                     <p className={`text-xs font-bold uppercase tracking-widest ${status === 'won' ? 'text-emerald-100' : 'text-slate-400'}`}>{currentSong.artist}</p>
                  </div>
                  {status === 'won' && (
                     <div className="flex items-center gap-2 animate-bounce">
                        <Trophy size={24} />
                        <span className="font-black text-sm uppercase">Venceu!</span>
                     </div>
                  )}
               </div>
            </div>

            {/* LYRICS & INPUTS */}
            <div className="lg:w-7/12 flex flex-col h-[500px] lg:h-auto bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-xl overflow-hidden relative">
               <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white dark:from-[#1a1a1a] to-transparent z-10 pointer-events-none"></div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                  {currentSong.lyrics.map((line, idx) => (
                     <div key={idx} className="flex flex-wrap items-baseline gap-2 text-lg md:text-xl font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {line.missingWord ? (
                           <>
                              <span>{line.text.split(line.missingWord)[0]}</span>
                              <div className="relative inline-block">
                                 <input 
                                   type="text"
                                   value={inputs[idx] || ''}
                                   onChange={(e) => handleInputChange(idx, e.target.value)}
                                   disabled={status !== 'playing' || feedback[idx] === 'correct'}
                                   className={`min-w-[100px] bg-transparent border-b-2 text-center font-bold outline-none transition-colors ${
                                      feedback[idx] === 'correct' ? 'border-emerald-500 text-emerald-600' : 
                                      feedback[idx] === 'wrong' ? 'border-red-500 text-red-500 animate-shake' : 
                                      'border-slate-300 focus:border-pink-500 text-pink-600'
                                   }`}
                                   placeholder="?"
                                   autoComplete="off"
                                 />
                                 
                                 {/* Only show hint if NOT hard mode and NOT correct/wrong yet */}
                                 {!feedback[idx] && line.hint && difficulty === 'easy' && (
                                    <span className="absolute -bottom-4 left-0 text-[9px] text-slate-400 font-bold w-full text-center opacity-0 hover:opacity-100 transition-opacity cursor-help bg-white dark:bg-black px-1 rounded z-20">
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
                     title="Reiniciar"
                  >
                     <RotateCcw size={20} />
                  </button>
                  <button 
                     onClick={checkAnswers}
                     disabled={status !== 'playing'}
                     className={`flex-1 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${status === 'playing' ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
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
