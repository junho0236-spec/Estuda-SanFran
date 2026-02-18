
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings2, 
  Zap, 
  ChevronRight, 
  BookOpen, 
  Eye, 
  Type,
  FastForward
} from 'lucide-react';

const DEFAULT_TEXT = "A Constituição da República Federativa do Brasil de 1988 é a lei fundamental e suprema do Brasil, servindo de parâmetro de validade a todas as demais espécies normativas, situando-se no topo do ordenamento jurídico.";

const SpeedReader: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wpm, setWpm] = useState(300);
  const [mode, setMode] = useState<'input' | 'reading'>('input');
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Split text into words
  const prepareText = () => {
    const textToProcess = inputText.trim() || DEFAULT_TEXT;
    // Split by whitespace but keep punctuation attached to word
    const wordArray = textToProcess.split(/\s+/);
    setWords(wordArray);
    setCurrentIndex(0);
    setMode('reading');
  };

  useEffect(() => {
    if (isPlaying && mode === 'reading') {
      const intervalMs = 60000 / wpm;
      
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= words.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, wpm, words, mode]);

  // Helper to render word with ORP (Optimal Recognition Point) highlighted
  const renderWord = (word: string) => {
    if (!word) return null;
    const mid = Math.floor(word.length / 2);
    // Adjust ORP slightly left for longer words
    const orpIndex = word.length > 3 ? Math.floor(word.length / 2) - 1 : mid;
    
    return (
      <div className="flex items-center justify-center font-mono text-5xl md:text-7xl font-bold tracking-wide h-32">
        <span className="text-slate-800 dark:text-slate-300 text-right w-1/2 pr-1">{word.slice(0, orpIndex)}</span>
        <span className="text-sanfran-rubi w-auto text-center">{word[orpIndex]}</span>
        <span className="text-slate-800 dark:text-slate-300 text-left w-1/2 pl-1">{word.slice(orpIndex + 1)}</span>
      </div>
    );
  };

  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8">
        <div>
           <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/20 px-4 py-2 rounded-full border border-orange-200 dark:border-orange-800 mb-4">
              <Eye className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">RSVP Reader</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Leitura Dinâmica</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Treine seu cérebro para ler jurisprudência em velocidade recorde.</p>
        </div>
      </header>

      {mode === 'input' ? (
        <div className="flex-1 flex flex-col gap-6 animate-in zoom-in-95">
           <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                 <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <BookOpen size={16} /> Texto para Leitura
                 </label>
                 <button 
                   onClick={() => setInputText('')} 
                   className="text-[10px] font-bold text-slate-400 hover:text-sanfran-rubi uppercase tracking-widest"
                 >
                    Limpar
                 </button>
              </div>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Cole aqui o acórdão, artigo ou doutrina..."
                className="flex-1 w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl p-6 font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 outline-none focus:border-orange-500 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
              />
           </div>

           <div className="bg-slate-100 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <Settings2 className="text-slate-400" />
                 <div className="flex-1">
                    <div className="flex justify-between mb-2">
                       <span className="text-[10px] font-black uppercase text-slate-500">Velocidade Alvo</span>
                       <span className="text-xl font-black text-sanfran-rubi">{wpm} <span className="text-xs text-slate-400">WPM</span></span>
                    </div>
                    <input 
                      type="range" 
                      min="200" 
                      max="1000" 
                      step="50" 
                      value={wpm} 
                      onChange={(e) => setWpm(Number(e.target.value))}
                      className="w-full h-2 bg-slate-300 dark:bg-black/40 rounded-lg appearance-none cursor-pointer accent-sanfran-rubi"
                    />
                 </div>
              </div>
              
              <button 
                onClick={prepareText}
                className="w-full md:w-auto px-10 py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-3"
              >
                 <Zap size={18} fill="currentColor" /> Iniciar Leitura
              </button>
           </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in relative">
           
           {/* Focus Box */}
           <div className="w-full max-w-2xl aspect-[16/9] bg-[#fdfbf7] dark:bg-[#1c1917] rounded-[3rem] border-[12px] border-slate-200 dark:border-sanfran-rubi/20 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group">
              
              {/* ORP Guides */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-200 dark:bg-white/5 -translate-x-1/2"></div>
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 dark:bg-white/5 -translate-y-1/2"></div>

              {/* The Word */}
              <div className="relative z-10">
                 {renderWord(words[currentIndex])}
              </div>

              {/* Minimal Progress Bar inside box */}
              <div className="absolute bottom-0 left-0 h-2 bg-sanfran-rubi transition-all duration-200" style={{ width: `${progress}%` }}></div>
           </div>

           {/* Controls */}
           <div className="mt-10 flex flex-col items-center gap-6 w-full max-w-xl">
              
              {/* Speed Slider On The Fly */}
              <div className="w-full px-8 opacity-50 hover:opacity-100 transition-opacity">
                 <input 
                   type="range" min="200" max="1000" step="10" 
                   value={wpm} 
                   onChange={(e) => setWpm(Number(e.target.value))}
                   className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
                 />
                 <p className="text-center text-[10px] font-black text-slate-400 mt-2">{wpm} WPM</p>
              </div>

              <div className="flex items-center gap-6">
                 <button 
                   onClick={() => setMode('input')}
                   className="p-4 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                 >
                    <Type size={20} />
                 </button>
                 
                 <button 
                   onClick={() => setCurrentIndex(Math.max(0, currentIndex - 10))}
                   className="p-4 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                 >
                    <RotateCcw size={20} />
                 </button>

                 <button 
                   onClick={() => setIsPlaying(!isPlaying)}
                   className="p-6 bg-sanfran-rubi text-white rounded-full shadow-2xl hover:scale-110 transition-transform"
                 >
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                 </button>

                 <button 
                   onClick={() => setCurrentIndex(Math.min(words.length - 1, currentIndex + 10))}
                   className="p-4 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                 >
                    <FastForward size={20} />
                 </button>
              </div>
              
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                 {currentIndex + 1} / {words.length} Palavras
              </p>
           </div>
        </div>
      )}

    </div>
  );
};

export default SpeedReader;