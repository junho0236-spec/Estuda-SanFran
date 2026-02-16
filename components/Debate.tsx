
import React, { useState, useEffect } from 'react';
import { Megaphone, Timer, Shuffle, ThumbsUp, ThumbsDown, Play, Pause, RotateCcw, Check, History, Clock, FileText } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface DebateProps {
  userId: string;
}

const TOPICS = [
  "Legalização do Aborto",
  "Porte de Armas para Civis",
  "Tributação de Grandes Fortunas",
  "Privatização do SUS",
  "Ensino Domiciliar (Homeschooling)",
  "Maioridade Penal aos 16 Anos",
  "Legalização da Maconha",
  "Cotas Raciais em Universidades",
  "Pena de Morte para Crimes Hediondos",
  "Voto Facultativo no Brasil",
  "Fim da Estabilidade do Servidor Público",
  "Imunidade Parlamentar",
  "Juiz de Garantias",
  "Prisão em Segunda Instância"
];

const Debate: React.FC<DebateProps> = ({ userId }) => {
  const [status, setStatus] = useState<'idle' | 'prep' | 'active' | 'finished'>('idle');
  const [topic, setTopic] = useState('');
  const [side, setSide] = useState<'favor' | 'contra' | null>(null);
  const [timeLimit, setTimeLimit] = useState(180); // 3 minutos default
  const [timeLeft, setTimeLeft] = useState(0);
  const [prepTimeLeft, setPrepTimeLeft] = useState(15);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    try {
      const { data } = await supabase
        .from('debate_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) setHistory(data);
    } catch (e) {
      console.warn("Tabela de histórico de debates ainda não criada.");
    }
  };

  const generateDebate = () => {
    const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const randomSide = Math.random() > 0.5 ? 'favor' : 'contra';
    
    setTopic(randomTopic);
    setSide(randomSide);
    setTimeLeft(timeLimit);
    setPrepTimeLeft(15);
    setStatus('prep');
  };

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (status === 'prep' && prepTimeLeft > 0) {
      interval = setInterval(() => setPrepTimeLeft(t => t - 1), 1000);
    } else if (status === 'prep' && prepTimeLeft === 0) {
      // Auto start debate or wait? Let's wait for user to click "Start Speaking" or auto-start for pressure.
      // Let's make it auto-transition to active for pressure.
      setStatus('active');
    }

    if (status === 'active' && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (status === 'active' && timeLeft === 0) {
      finishDebate();
    }

    return () => clearInterval(interval);
  }, [status, timeLeft, prepTimeLeft]);

  const finishDebate = async () => {
    setStatus('finished');
    try {
      await supabase.from('debate_history').insert({
        user_id: userId,
        topic: topic,
        stance: side,
        duration_seconds: timeLimit - timeLeft,
        notes: 'Debate realizado.'
      });
      fetchHistory();
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const cancelDebate = () => {
    setStatus('idle');
    setTopic('');
    setSide(null);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/20 px-4 py-2 rounded-full border border-yellow-200 dark:border-yellow-800 mb-4">
              <Megaphone className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">Clube de Debates</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Gerador de Polêmica</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Treine a defesa do indefensável. Argumentação pura.</p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
        >
          <History className="w-4 h-4" /> Histórico
        </button>
      </header>

      {showHistory ? (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-sanfran-rubiDark/20 rounded-[2rem] p-6 border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl custom-scrollbar">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase">Registros de Oratória</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-sanfran-rubi"><Check size={24} /></button>
           </div>
           <div className="space-y-4">
              {history.map((item) => (
                 <div key={item.id} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <div>
                       <p className="font-bold text-sm text-slate-900 dark:text-white">{item.topic}</p>
                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded mr-2 ${item.stance === 'favor' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {item.stance === 'favor' ? 'A Favor' : 'Contra'}
                       </span>
                       <span className="text-[9px] text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                       <Clock size={14} className="inline mr-1 text-slate-400" />
                       <span className="text-xs font-black">{Math.floor(item.duration_seconds / 60)}m</span>
                    </div>
                 </div>
              ))}
              {history.length === 0 && <p className="text-center text-slate-400 py-10">Nenhum debate registrado.</p>}
           </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
           
           {status === 'idle' && (
             <div className="w-full max-w-md space-y-8 text-center animate-in zoom-in-95 duration-300">
                <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Megaphone size={120} />
                   </div>
                   <div className="relative z-10 space-y-6">
                      <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white">Configurar Sessão</h3>
                      
                      <div className="space-y-2 text-left">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tempo de Fala</label>
                         <div className="grid grid-cols-3 gap-2">
                            {[60, 180, 300].map(t => (
                               <button 
                                 key={t}
                                 onClick={() => setTimeLimit(t)}
                                 className={`py-3 rounded-xl font-black text-xs border-2 transition-all ${timeLimit === t ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' : 'border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                               >
                                  {t / 60} Min
                               </button>
                            ))}
                         </div>
                      </div>

                      <button 
                        onClick={generateDebate}
                        className="w-full py-5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
                      >
                         <Shuffle size={18} /> Sortear Tema
                      </button>
                   </div>
                </div>
                <p className="text-slate-400 text-xs font-bold max-w-xs mx-auto">
                   O sistema escolherá aleatoriamente um tema polêmico e sua posição (Favor ou Contra).
                </p>
             </div>
           )}

           {(status === 'prep' || status === 'active') && (
             <div className="w-full max-w-3xl space-y-8 text-center animate-in slide-in-from-bottom-10 duration-500">
                
                {/* CARD DO TEMA */}
                <div className={`p-10 rounded-[3rem] shadow-2xl border-4 relative overflow-hidden transition-all duration-500 ${side === 'favor' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
                   <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-black/40 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                      {status === 'prep' ? 'Fase de Preparação' : 'Em Discurso'}
                   </div>

                   <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight mt-6 mb-4">
                      {topic}
                   </h2>

                   <div className="flex justify-center items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sua Posição:</span>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-black uppercase text-sm tracking-widest shadow-lg ${side === 'favor' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                         {side === 'favor' ? <ThumbsUp size={18} /> : <ThumbsDown size={18} />}
                         {side === 'favor' ? 'A Favor' : 'Contra'}
                      </div>
                   </div>
                </div>

                {/* TIMER */}
                <div className="flex flex-col items-center">
                   {status === 'prep' ? (
                      <div className="text-center space-y-2 animate-pulse">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Início em</p>
                         <p className="text-6xl font-black text-slate-300 dark:text-slate-600 tabular-nums">{prepTimeLeft}</p>
                         <button onClick={() => setStatus('active')} className="text-xs font-bold text-sanfran-rubi underline">Pular Preparação</button>
                      </div>
                   ) : (
                      <div className="relative w-64 h-64 flex items-center justify-center">
                         <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200 dark:text-white/10" />
                            <circle 
                              cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="283" strokeDashoffset={283 - (timeLeft / timeLimit) * 283} 
                              className={`transition-all duration-1000 ${timeLeft < 30 ? 'text-red-500' : side === 'favor' ? 'text-emerald-500' : 'text-red-500'}`} 
                              strokeLinecap="round"
                            />
                         </svg>
                         <div className="text-center">
                            <p className="text-5xl font-black tabular-nums tracking-tighter">{formatTime(timeLeft)}</p>
                            <div className="mt-2 animate-pulse">
                               <div className="w-2 h-2 bg-red-500 rounded-full mx-auto"></div>
                               <span className="text-[8px] font-black uppercase text-red-500 tracking-widest">Gravando (Simulado)</span>
                            </div>
                         </div>
                      </div>
                   )}
                </div>

                <div className="flex gap-4 justify-center">
                   <button onClick={cancelDebate} className="px-8 py-3 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-300">
                      Cancelar
                   </button>
                   {status === 'active' && (
                      <button onClick={finishDebate} className="px-8 py-3 rounded-xl bg-sanfran-rubi text-white font-bold text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-transform">
                         Concluir Fala
                      </button>
                   )}
                </div>
             </div>
           )}

           {status === 'finished' && (
             <div className="w-full max-w-md text-center animate-in zoom-in-95 duration-500">
                <div className="bg-white dark:bg-sanfran-rubiDark/30 p-10 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl mb-8">
                   <Check size={64} className="mx-auto text-emerald-500 mb-6 bg-emerald-100 dark:bg-emerald-900/20 p-4 rounded-full" />
                   <h2 className="text-3xl font-black uppercase text-slate-900 dark:text-white mb-2">Sessão Encerrada</h2>
                   <p className="text-slate-500 font-bold mb-6">Argumentação registrada no histórico.</p>
                   
                   <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10 text-left mb-6">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Feedback Automático</p>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic">
                         "A prática constante da dialética aprimora o raciocínio jurídico. Continue defendendo posições diversas para expandir sua flexibilidade cognitiva."
                      </p>
                   </div>

                   <button 
                     onClick={() => setStatus('idle')}
                     className="w-full py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-105 transition-all"
                   >
                      <RotateCcw size={16} /> Novo Debate
                   </button>
                </div>
             </div>
           )}

        </div>
      )}
    </div>
  );
};

export default Debate;
