
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Zap, Scale } from 'lucide-react';
import { Subject } from '../types';

interface PomodoroProps {
  subjects: Subject[];
}

const Pomodoro: React.FC<PomodoroProps> = ({ subjects }) => {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || '');
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false);
      if (mode === 'work') {
        setMode('break');
        setSecondsLeft(5 * 60);
      } else {
        setMode('work');
        setSecondsLeft(25 * 60);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, secondsLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setSecondsLeft(mode === 'work' ? 25 * 60 : 5 * 60); };
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((mode === 'work' ? 25 * 60 : 5 * 60) - secondsLeft) / (mode === 'work' ? 25 * 60 : 5 * 60) * 100;

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in zoom-in duration-300">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 italic">"Pacta Sunt Servanda"</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-[10px] mt-2">Cumpra seus prazos de estudo</p>
      </div>

      <div className="bg-white dark:bg-[#181818] rounded-[3rem] p-12 border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col items-center border-t-8 border-t-[#9B111E]">
        <div className="relative w-64 h-64 mb-8">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="128" cy="128" r="120" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeWidth="8" fill="transparent" />
            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={754} strokeDashoffset={754 - (754 * progress) / 100} strokeLinecap="round" className={`transition-all duration-1000 ${mode === 'work' ? 'text-[#9B111E]' : 'text-[#1094ab]'}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black tabular-nums text-slate-900 dark:text-slate-100 tracking-tighter">{formatTime(secondsLeft)}</span>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] mt-3 px-3 py-1 rounded-full ${mode === 'work' ? 'bg-red-100 dark:bg-[#9B111E]/20 text-[#9B111E]' : 'bg-cyan-100 dark:bg-[#1094ab]/20 text-[#1094ab]'}`}>{mode === 'work' ? 'LABUTA' : 'RECREIO'}</span>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <button onClick={toggleTimer} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${isActive ? 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300' : 'bg-[#9B111E] text-white'}`}>{isActive ? <Pause /> : <Play fill="currentColor" />}</button>
          <button onClick={resetTimer} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-white/5 text-slate-300 dark:text-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-slate-100 dark:border-slate-800"><RotateCcw /></button>
        </div>

        <div className="w-full space-y-2">
          <p className="text-[10px] text-center font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pauta do Dia</p>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-center outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100 transition-all">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#181818] p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 dark:bg-[#9B111E]/10 rounded-2xl text-[#9B111E]"><Scale className="w-6 h-6" /></div>
          <div><p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Duração Labuta</p><p className="text-slate-900 dark:text-slate-100 font-black text-lg">25:00</p></div>
        </div>
        <div className="bg-white dark:bg-[#181818] p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-cyan-50 dark:bg-[#1094ab]/10 rounded-2xl text-[#1094ab]"><Coffee className="w-6 h-6" /></div>
          <div><p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Pausa para Café</p><p className="text-slate-900 dark:text-slate-100 font-black text-lg">05:00</p></div>
        </div>
      </div>
    </div>
  );
};

export default Pomodoro;
