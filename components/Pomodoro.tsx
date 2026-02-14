
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Settings2, ShieldCheck, Coffee } from 'lucide-react';
import { Subject } from '../types';
import { supabase } from '../services/supabaseClient';

interface PomodoroProps {
  subjects: Subject[];
  userId: string;
}

const Pomodoro: React.FC<PomodoroProps> = ({ subjects, userId }) => {
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || '');
  const [showSettings, setShowSettings] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveSession = async (duration: number) => {
    try {
      await supabase.from('study_sessions').insert({
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        duration: duration,
        subject_id: selectedSubject,
        start_time: new Date().toISOString()
      });
    } catch (e) {
      console.error("Erro ao protocolar tempo:", e);
    }
  };

  useEffect(() => {
    if (!isActive) {
      setSecondsLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60);
    }
  }, [workMinutes, breakMinutes, mode, isActive]);

  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false);
      if (mode === 'work') {
        saveSession(workMinutes * 60);
        setMode('break');
        setSecondsLeft(breakMinutes * 60);
        alert("Labuta concluída! Hora do recreio.");
      } else {
        setMode('work');
        setSecondsLeft(workMinutes * 60);
        alert("Recreio encerrado. De volta aos autos.");
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, secondsLeft, mode, workMinutes, breakMinutes]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { 
    setIsActive(false); 
    setSecondsLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60); 
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalTime = mode === 'work' ? workMinutes * 60 : breakMinutes * 60;
  const progress = ((totalTime - secondsLeft) / totalTime) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in zoom-in duration-300 pb-20">
      <header className="flex items-center justify-between">
        <div className="text-left">
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Cronômetro</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic mt-1">"Pacta Sunt Servanda"</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-4 rounded-2xl border-2 transition-all ${showSettings ? 'bg-sanfran-rubi text-white border-sanfran-rubi shadow-xl' : 'bg-white dark:bg-sanfran-rubiDark/20 text-slate-500 border-slate-200 dark:border-sanfran-rubi/30'}`}
        >
          <Settings2 className="w-6 h-6" />
        </button>
      </header>

      {showSettings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white dark:bg-sanfran-rubiDark/40 p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
              <Clock className="w-4 h-4 text-sanfran-rubi" /> Tempo de Labuta (Min)
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="1" max="120" step="5"
                value={workMinutes}
                onChange={(e) => setWorkMinutes(parseInt(e.target.value))}
                className="flex-1 accent-sanfran-rubi h-2 bg-slate-100 dark:bg-black/40 rounded-full appearance-none cursor-pointer"
              />
              <span className="text-xl font-black text-sanfran-rubi w-10 text-right">{workMinutes}</span>
            </div>
          </div>
          <div className="bg-white dark:bg-sanfran-rubiDark/40 p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
              <Coffee className="w-4 h-4 text-usp-blue" /> Tempo de Recreio (Min)
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="1" max="30" step="1"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(parseInt(e.target.value))}
                className="flex-1 accent-usp-blue h-2 bg-slate-100 dark:bg-black/40 rounded-full appearance-none cursor-pointer"
              />
              <span className="text-xl font-black text-usp-blue w-10 text-right">{breakMinutes}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#0d0303] rounded-[4rem] p-12 md:p-16 border-b-[16px] border-b-sanfran-rubi border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sanfran-rubi/5 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-usp-gold/5 rounded-full -ml-12 -mb-12" />

        <div className="relative w-72 h-72 md:w-80 md:h-80 mb-12">
          <svg className="w-full h-full transform -rotate-90 filter drop-shadow-xl">
            <circle cx="50%" cy="50%" r="48%" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeWidth="8" fill="transparent" />
            <circle cx="50%" cy="50%" r="48%" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="100" strokeDashoffset={100 - progress} className={`transition-all duration-1000 ${mode === 'work' ? 'text-sanfran-rubi' : 'text-usp-blue'}`} pathLength="100" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-7xl md:text-8xl font-black tabular-nums text-slate-950 dark:text-white tracking-tighter drop-shadow-sm">{formatTime(secondsLeft)}</span>
            <div className={`mt-4 px-5 py-2 rounded-full font-black uppercase text-[10px] tracking-[0.2em] shadow-lg flex items-center gap-2 ${mode === 'work' ? 'bg-sanfran-rubi text-white' : 'bg-usp-blue text-white'}`}>
              {mode === 'work' ? <ShieldCheck className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
              {mode === 'work' ? 'Em Labuta' : 'Em Recreio'}
            </div>
          </div>
        </div>

        <div className="flex gap-6 mb-12 w-full max-w-sm">
          <button 
            onClick={toggleTimer} 
            className={`flex-1 py-6 rounded-[2rem] flex items-center justify-center transition-all shadow-2xl hover:scale-[1.03] active:scale-95 border-b-4 ${isActive ? 'bg-slate-100 dark:bg-white/10 text-slate-500 border-slate-300 dark:border-white/10' : 'bg-sanfran-rubi text-white border-sanfran-rubiDark'}`}
          >
            {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-current" />}
          </button>
          <button 
            onClick={resetTimer} 
            className="w-24 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-sanfran-rubi/30 text-slate-400 hover:text-sanfran-rubi hover:border-sanfran-rubi rounded-[2rem] flex items-center justify-center transition-all shadow-xl active:scale-90"
          >
            <RotateCcw className="w-7 h-7" />
          </button>
        </div>

        <div className="w-full space-y-3 max-w-sm">
          <label className="text-[10px] text-center block font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Matéria da Diligência</label>
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)} 
            className="w-full p-5 bg-slate-50 dark:bg-black/60 border-2 border-slate-200 dark:border-sanfran-rubi/30 rounded-3xl font-black text-center outline-none focus:border-sanfran-rubi text-slate-900 dark:text-white transition-all shadow-inner"
          >
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default Pomodoro;
