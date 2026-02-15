
import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, Clock, Settings2, ShieldCheck, Coffee, History, Trash2, ArrowLeft, Calendar, Gavel, Trash, Check, Book, Quote, Zap } from 'lucide-react';
import { Subject, StudySession, Reading } from '../types';
import { supabase } from '../services/supabaseClient';

interface PomodoroProps {
  subjects: Subject[];
  readings: Reading[];
  userId: string;
  studySessions: StudySession[];
  setStudySessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  secondsLeft: number;
  setSecondsLeft: (seconds: number) => void;
  mode: 'work' | 'break';
  setMode: (mode: 'work' | 'break') => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  selectedReadingId: string | null;
  setSelectedReadingId: (id: string | null) => void;
  setTotalInitial: (seconds: number) => void;
  onManualFinalize?: () => void;
  isExtremeFocus?: boolean;
}

const Pomodoro: React.FC<PomodoroProps> = ({ 
  subjects, 
  readings,
  userId, 
  studySessions, 
  setStudySessions,
  isActive,
  setIsActive,
  secondsLeft,
  setSecondsLeft,
  mode,
  setMode,
  selectedSubjectId,
  setSelectedSubjectId,
  selectedReadingId,
  setSelectedReadingId,
  setTotalInitial,
  onManualFinalize,
  isExtremeFocus = false
}) => {
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const focusQuotes = [
    "A jurisprudência é o conhecimento das coisas divinas e humanas. - Justiniano",
    "Quem se descuida da pauta, descuida do Direito. - Adágio Forense",
    "O silêncio é o solo onde germina a justiça. - Sêneca",
    "Pacta Sunt Servanda: Os acordos devem ser cumpridos. - Princípio de Direito",
    "A leitura faz o homem completo; a conversa, o homem ágil; e o escrever, o homem preciso. - Francis Bacon",
    "Non scholae, sed vitae discimus. - Aprendemos para a vida, não para a escola.",
    "A perseverança é a alma do acadêmico. - XI de Agosto"
  ];

  const activeQuote = useMemo(() => {
    return focusQuotes[Math.floor(Math.random() * focusQuotes.length)];
  }, [isActive, mode]);

  useEffect(() => {
    if (!isActive) {
      const initial = mode === 'work' ? workMinutes * 60 : breakMinutes * 60;
      setSecondsLeft(initial);
      setTotalInitial(initial);
    }
  }, [workMinutes, breakMinutes, mode, isActive, setSecondsLeft, setTotalInitial]);

  useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId, setSelectedSubjectId]);

  const deleteSession = async (id: string) => {
    if (!confirm("Deseja expurgar este registro do seu histórico acadêmico?")) return;
    try {
      const { error } = await supabase.from('study_sessions').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      setStudySessions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error("Erro ao deletar sessão:", e);
    }
  };

  const clearHistory = async () => {
    if (!confirm("ALERTA: Deseja limpar TODO o seu dossiê de sessões? Esta ação é irreversível.")) return;
    try {
      const { error } = await supabase.from('study_sessions').delete().eq('user_id', userId);
      if (error) throw error;
      setStudySessions([]);
    } catch (e) {
      console.error("Erro ao limpar histórico:", e);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => { 
    setIsActive(false); 
    const initial = mode === 'work' ? workMinutes * 60 : breakMinutes * 60;
    setSecondsLeft(initial); 
    setTotalInitial(initial);
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalTime = mode === 'work' ? workMinutes * 60 : breakMinutes * 60;
  const progress = ((totalTime - secondsLeft) / totalTime) * 100;

  if (showHistory && !isExtremeFocus) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 md:space-y-10 animate-in slide-in-from-right-8 duration-500 pb-20 px-2">
        <header className="flex items-center justify-between">
          <button 
            onClick={() => setShowHistory(false)}
            className="flex items-center gap-2 p-3 text-slate-500 hover:text-sanfran-rubi font-black uppercase text-[10px] tracking-widest transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Relógio
          </button>
          <button 
            onClick={clearHistory}
            disabled={studySessions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-black uppercase text-[9px] tracking-widest disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpar Dossiê
          </button>
        </header>

        <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-6 md:p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
             <div className="bg-usp-blue p-3 rounded-2xl text-white shadow-lg"><History className="w-6 h-6" /></div>
             <div>
                <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Dossiê Temporal</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico de sessões protocoladas</p>
             </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {studySessions.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <Clock className="w-12 h-12 text-slate-100 dark:text-white/5 mx-auto" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma sessão registrada nesta instância.</p>
              </div>
            ) : (
              studySessions.map((session) => {
                const subject = subjects.find(sub => sub.id === session.subject_id);
                const reading = readings.find(r => r.id === session.reading_id);
                const date = new Date(session.start_time);
                const durationMins = Math.floor(session.duration / 60);
                const durationSecs = session.duration % 60;
                
                return (
                  <div key={session.id} className="group p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center justify-between hover:bg-white dark:hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-10 rounded-full" style={{ backgroundColor: subject?.color || '#9B111E' }} />
                      <div>
                        <p className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight truncate max-w-[150px]">{subject?.name || 'Geral'}</p>
                        {reading && (
                          <p className="text-[9px] font-bold text-sanfran-rubi uppercase flex items-center gap-1">
                            <Book size={8} /> {reading.title}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-0.5">
                           <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                              <Calendar className="w-3 h-3" /> {date.toLocaleDateString()}
                           </span>
                           <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                              <Clock className="w-3 h-3" /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-sanfran-rubi">{durationMins > 0 ? `${durationMins}m` : ''} {durationSecs}s</span>
                      <button 
                        onClick={() => deleteSession(session.id)}
                        className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-4xl mx-auto transition-all duration-1000 ${isExtremeFocus ? 'flex flex-col items-center justify-center min-h-[80vh]' : 'space-y-6 md:space-y-10 pb-20 px-2'}`}>
      
      {!isExtremeFocus && (
        <header className="flex items-center justify-between">
          <div className="text-left">
            <h2 className="text-3xl md:text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Timer</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold italic text-sm md:text-base">Produtividade em foco.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowHistory(true)}
              className="p-3 md:p-4 rounded-2xl bg-white dark:bg-sanfran-rubiDark/20 text-slate-500 border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl"
            >
              <History className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 md:p-4 rounded-2xl border-2 transition-all ${showSettings ? 'bg-sanfran-rubi text-white border-sanfran-rubi shadow-xl' : 'bg-white dark:bg-sanfran-rubiDark/20 text-slate-500 border-2 border-slate-200 dark:border-sanfran-rubi/30'}`}
            >
              <Settings2 className="w-6 h-6" />
            </button>
          </div>
        </header>
      )}

      {!isExtremeFocus && showSettings && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white dark:bg-sanfran-rubiDark/40 p-5 md:p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
            <label className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">
              <Clock className="w-4 h-4 text-sanfran-rubi" /> Foco (Min)
            </label>
            <div className="flex items-center gap-3">
              <input type="range" min="1" max="120" step="5" value={workMinutes} onChange={(e) => setWorkMinutes(parseInt(e.target.value))} className="flex-1 accent-sanfran-rubi h-2 bg-slate-100 dark:bg-black/40 rounded-full appearance-none cursor-pointer" />
              <span className="text-lg font-black text-sanfran-rubi w-8 text-right">{workMinutes}</span>
            </div>
          </div>
          <div className="bg-white dark:bg-sanfran-rubiDark/40 p-5 md:p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
            <label className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">
              <Coffee className="w-4 h-4 text-usp-blue" /> Pausa (Min)
            </label>
            <div className="flex items-center gap-3">
              <input type="range" min="1" max="30" step="1" value={breakMinutes} onChange={(e) => setBreakMinutes(parseInt(e.target.value))} className="flex-1 accent-usp-blue h-2 bg-slate-100 dark:bg-black/40 rounded-full appearance-none cursor-pointer" />
              <span className="text-lg font-black text-usp-blue w-8 text-right">{breakMinutes}</span>
            </div>
          </div>
        </div>
      )}

      {/* Timer Container */}
      <div className={`${isExtremeFocus ? 'bg-transparent border-none shadow-none' : 'bg-white dark:bg-[#0d0303] rounded-[3rem] md:rounded-[4rem] border-b-[12px] md:border-b-[16px] border-b-sanfran-rubi border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl p-8 md:p-12'} flex flex-col items-center relative overflow-hidden transition-all duration-1000`}>
        
        {isExtremeFocus && (
          <div className="mb-12 text-center animate-in fade-in duration-1000">
             <div className="flex items-center justify-center gap-3 text-sanfran-rubi mb-2">
                <Zap size={16} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Foco Extremo em Pauta</span>
             </div>
             <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">A academia aguarda seus resultados.</p>
          </div>
        )}

        <div className={`relative ${isExtremeFocus ? 'w-80 h-80 md:w-[28rem] md:h-[28rem]' : 'w-60 h-60 sm:w-72 sm:h-72 md:w-80 md:h-80'} mb-8 transition-all duration-700`}>
          <svg className="w-full h-full transform -rotate-90 filter drop-shadow-xl">
            <circle cx="50%" cy="50%" r="48%" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeWidth={isExtremeFocus ? "4" : "8"} fill="transparent" />
            <circle cx="50%" cy="50%" r="48%" stroke="currentColor" strokeWidth={isExtremeFocus ? "6" : "10"} fill="transparent" strokeDasharray="100" strokeDashoffset={100 - progress} className={`transition-all duration-1000 ${mode === 'work' ? 'text-sanfran-rubi' : 'text-usp-blue'}`} pathLength="100" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`${isExtremeFocus ? 'text-8xl md:text-[10rem]' : 'text-5xl sm:text-7xl md:text-8xl'} font-black tabular-nums text-slate-950 dark:text-white tracking-tighter drop-shadow-sm transition-all duration-700`}>{formatTime(secondsLeft)}</span>
            <div className={`mt-3 md:mt-4 px-4 py-1.5 rounded-full font-black uppercase text-[8px] md:text-[10px] tracking-widest shadow-lg flex items-center gap-2 ${mode === 'work' ? 'bg-sanfran-rubi text-white' : 'bg-usp-blue text-white'}`}>
              {mode === 'work' ? <Gavel className="w-3.5 h-3.5" /> : <Coffee className="w-3.5 h-3.5" />}
              {mode === 'work' ? 'Estudo' : 'Descanso'}
            </div>
          </div>
        </div>

        {isExtremeFocus && (
          <div className="max-w-xl text-center mt-12 mb-16 px-6 animate-in slide-in-from-bottom-8 duration-1000 delay-500">
             <Quote className="w-8 h-8 text-sanfran-rubi/20 mx-auto mb-6" />
             <p className="text-xl md:text-3xl font-serif italic text-slate-800 dark:text-slate-200 leading-snug tracking-tight">
               "{activeQuote}"
             </p>
          </div>
        )}

        <div className={`flex flex-col md:flex-row gap-4 md:gap-6 w-full ${isExtremeFocus ? 'max-w-xs' : 'max-w-sm'} transition-all`}>
          <div className="flex gap-4 flex-1">
            <button 
              onClick={toggleTimer} 
              className={`flex-1 ${isExtremeFocus ? 'py-4 rounded-2xl bg-white/5 text-slate-400 border border-white/10 hover:bg-sanfran-rubi hover:text-white' : 'py-5 md:py-6 rounded-3xl md:rounded-[2rem] shadow-xl hover:scale-[1.03] active:scale-95 border-b-4'} flex items-center justify-center transition-all ${!isExtremeFocus && (isActive ? 'bg-slate-100 dark:bg-white/10 text-slate-500 border-slate-300 dark:border-white/10' : 'bg-sanfran-rubi text-white border-sanfran-rubiDark')}`}
            >
              {isActive ? <Pause className={isExtremeFocus ? "w-5 h-5" : "w-6 h-6 md:w-8 md:h-8"} /> : <Play className={`${isExtremeFocus ? "w-5 h-5" : "w-6 h-6 md:w-8 md:h-8"} fill-current`} />}
              {isExtremeFocus && <span className="ml-2 text-[10px] font-black uppercase tracking-widest">{isActive ? 'Interromper' : 'Prosseguir'}</span>}
            </button>
            {!isExtremeFocus && (
              <button 
                onClick={resetTimer} 
                className="w-16 md:w-24 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-sanfran-rubi/30 text-slate-400 hover:text-sanfran-rubi hover:border-sanfran-rubi rounded-3xl md:rounded-[2rem] flex items-center justify-center transition-all shadow-lg active:scale-90"
              >
                <RotateCcw className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            )}
          </div>
          
          {(isActive || secondsLeft < totalTime) && mode === 'work' && !isExtremeFocus && (
            <button 
              onClick={onManualFinalize}
              className="w-full md:w-auto px-8 py-5 md:py-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-3xl md:rounded-[2rem] flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-900/20 transition-all hover:scale-[1.03] active:scale-95 border-b-4 border-emerald-700 animate-in fade-in zoom-in duration-300"
            >
              <Check className="w-5 h-5" /> Protocolar
            </button>
          )}
        </div>

        {!isExtremeFocus && (
          <div className="w-full mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-2">
              <label className="text-[9px] md:text-[10px] text-center block font-black text-slate-400 uppercase tracking-widest">Cadeira</label>
              <select 
                value={selectedSubjectId || ''} 
                onChange={(e) => setSelectedSubjectId(e.target.value || null)} 
                className="w-full p-4 bg-slate-50 dark:bg-black/60 border-2 border-slate-200 dark:border-sanfran-rubi/30 rounded-2xl font-black outline-none focus:border-sanfran-rubi text-xs text-slate-900 dark:text-white transition-all shadow-inner"
              >
                <option value="">Geral</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] md:text-[10px] text-center block font-black text-slate-400 uppercase tracking-widest">Doutrina / Obra</label>
              <select 
                value={selectedReadingId || ''} 
                onChange={(e) => setSelectedReadingId(e.target.value || null)} 
                className="w-full p-4 bg-slate-50 dark:bg-black/60 border-2 border-slate-200 dark:border-sanfran-rubi/30 rounded-2xl font-black outline-none focus:border-sanfran-rubi text-xs text-slate-900 dark:text-white transition-all shadow-inner"
              >
                <option value="">Nenhuma Obra</option>
                {readings.filter(r => r.status !== 'concluido').map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pomodoro;
