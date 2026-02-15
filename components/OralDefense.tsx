
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Gavel, Scale, Play, Pause, RotateCcw, Bell, AlertTriangle } from 'lucide-react';

const OralDefense: React.FC = () => {
  const [seconds, setSeconds] = useState(15 * 60);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s === 61) playBell(); // Aviso de 1 minuto restante
          if (s === 1) playBell();  // Aviso de término
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, seconds]);

  const playBell = () => {
    const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
    audio.volume = 0.5;
    audio.play();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="text-center space-y-4">
        <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Sustentação Oral</h2>
        <p className="text-slate-500 font-bold italic">Treine seu tempo regimental de tribuna.</p>
      </header>

      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-12 md:p-20 rounded-[4rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-4 bg-usp-gold opacity-30" />
        
        <div className="mb-10 flex items-center justify-center gap-6">
           <Scale className="text-slate-200 dark:text-white/5 w-20 h-20" />
           <div className="text-8xl md:text-[12rem] font-black text-slate-950 dark:text-white tracking-tighter tabular-nums">
             {formatTime(seconds)}
           </div>
           <Gavel className="text-slate-200 dark:text-white/5 w-20 h-20" />
        </div>

        <div className="flex justify-center gap-6 mb-12">
           <button onClick={() => setIsActive(!isActive)} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl ${isActive ? 'bg-slate-100 text-slate-500' : 'bg-sanfran-rubi text-white'}`}>
              {isActive ? <Pause size={40} /> : <Play size={40} fill="currentColor" />}
           </button>
           <button onClick={() => { setIsActive(false); setSeconds(15 * 60); }} className="w-24 h-24 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-sanfran-rubi transition-all">
              <RotateCcw size={32} />
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
           <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/10 flex items-center gap-4">
              <Bell className="text-usp-gold" />
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tempo Regimental</p>
                 <p className="font-bold text-slate-900 dark:text-white">15 Minutos</p>
              </div>
           </div>
           <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/10 flex items-center gap-4">
              <AlertTriangle className="text-sanfran-rubi" />
              <div className="text-left">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aviso Sonoro</p>
                 <p className="font-bold text-slate-900 dark:text-white">Faltando 1 Min</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OralDefense;
