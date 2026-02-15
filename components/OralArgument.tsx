
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Play, Pause, RotateCcw, Gavel, AlertCircle, Clock, FileText, CheckCircle2, Save } from 'lucide-react';

const REGIMENTAL_TIME = 15 * 60; // 15 minutos em segundos
const WARNING_THRESHOLD = 60; // Aviso quando faltar 1 minuto (60 segundos)

const OralArgument: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(REGIMENTAL_TIME);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'warning' | 'finished'>('idle');
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  
  // Ref para o elemento de áudio
  const bellRef = useRef<HTMLAudioElement | null>(null);
  
  // URL estável para som de campainha de serviço (Mixkit CDN)
  const BELL_SOUND_URL = "https://assets.mixkit.co/sfx/preview/mixkit-service-bell-ring-1461.mp3";

  // Carregar notas salvas localmente ao iniciar
  useEffect(() => {
    const savedNotes = localStorage.getItem('sanfran_oral_argument_notes');
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, []);

  // Salvar notas automaticamente quando alteradas
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('sanfran_oral_argument_notes', notes);
      setIsSaved(true);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setIsSaved(false);
  };

  // Lógica do Cronômetro
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // Tempo esgotou
      setIsActive(false);
      setStatus('finished');
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Lógica dos Efeitos Sonoros (Monitora o timeLeft)
  useEffect(() => {
    if (!isActive) return;

    // Aos 14:00 (Faltando 60 segundos)
    if (timeLeft === WARNING_THRESHOLD) {
      setStatus('warning');
      playBell();
    }

    // Aos 15:00 (Tempo Esgotado)
    if (timeLeft === 0) {
      playBell();
      // Toca novamente após 1 segundo para ênfase
      setTimeout(playBell, 1200);
    }
  }, [timeLeft, isActive]);

  const playBell = () => {
    if (bellRef.current) {
      bellRef.current.currentTime = 0;
      bellRef.current.volume = 1.0;
      bellRef.current.play().catch(e => console.log("Erro ao tocar áudio (Autoplay bloqueado?):", e));
    }
  };

  // Função para iniciar e "desbloquear" o áudio no navegador
  const toggleTimer = () => {
    if (!isActive) {
      // Warm-up: Toca o áudio mudo rapidamente para o navegador liberar o autoplay
      if (bellRef.current) {
        bellRef.current.volume = 0; // Mudo
        bellRef.current.play().then(() => {
          bellRef.current.pause();
          bellRef.current.currentTime = 0;
          bellRef.current.volume = 1; // Restaura volume
        }).catch(e => console.log("Warm-up de áudio falhou:", e));
      }
      setIsActive(true);
      setStatus('running');
    } else {
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(REGIMENTAL_TIME);
    setStatus('idle');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <audio ref={bellRef} src={BELL_SOUND_URL} preload="auto" />
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/20 mb-4">
              <Gavel className="w-4 h-4 text-sanfran-rubi" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Tribuna Virtual</span>
           </div>
           <h2 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Sustentação Oral</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Treino de retórica com tempo regimental (15 min).</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        {/* Lado Esquerdo: O Cronômetro (A Tribuna) */}
        <div className="flex flex-col items-center justify-center space-y-8 bg-white dark:bg-sanfran-rubiDark/30 p-8 md:p-12 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden">
          {/* Background Decorativo */}
          <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-usp-gold via-sanfran-rubi to-usp-gold opacity-50"></div>
          
          <div className="text-center space-y-2 relative z-10">
             <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-double border-slate-200 dark:border-white/10">
                <Mic className={`w-8 h-8 ${isActive ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
             </div>
             <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Tempo Restante</h3>
             
             <div className={`text-7xl md:text-9xl font-black tabular-nums tracking-tighter transition-colors duration-500 ${
               status === 'warning' ? 'text-orange-500 animate-pulse' : 
               status === 'finished' ? 'text-red-600' : 
               'text-slate-900 dark:text-white'
             }`}>
                {formatTime(timeLeft)}
             </div>

             {status === 'warning' && (
               <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 px-4 py-2 rounded-full animate-bounce">
                  <AlertCircle size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Atenção: 1 Minuto para Concluir</span>
               </div>
             )}
             
             {status === 'finished' && (
               <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-4 py-2 rounded-full">
                  <Gavel size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Tempo Esgotado</span>
               </div>
             )}
          </div>

          <div className="flex items-center gap-4 w-full max-w-xs relative z-10">
            <button 
              onClick={toggleTimer}
              className={`flex-1 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${
                isActive 
                  ? 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-200' 
                  : 'bg-sanfran-rubi text-white'
              }`}
            >
              {isActive ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Iniciar</>}
            </button>
            
            <button 
              onClick={resetTimer}
              className="p-5 rounded-2xl bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 text-slate-400 hover:text-sanfran-rubi hover:border-sanfran-rubi transition-all shadow-lg"
              title="Reiniciar Sessão"
            >
              <RotateCcw size={20} />
            </button>
          </div>
          
          <div className="pt-6 border-t border-slate-100 dark:border-white/5 w-full text-center">
             <p className="text-[9px] font-black uppercase text-slate-300 dark:text-slate-600 tracking-widest">
               Art. 15 minutos regimentais • Campainha aos 14 min
             </p>
          </div>
        </div>

        {/* Lado Direito: Roteiro (Bloco de Notas da Tribuna) */}
        <div className="flex flex-col h-full bg-slate-50 dark:bg-sanfran-rubiDark/20 p-8 rounded-[3rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-inner relative">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <FileText className="text-slate-400" size={20} />
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Roteiro de Fala</h4>
              </div>
              <div className="flex items-center gap-2">
                 {isSaved ? (
                   <span className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                     <CheckCircle2 size={10} /> Salvo Localmente
                   </span>
                 ) : (
                   <span className="text-[9px] font-bold text-slate-300 uppercase flex items-center gap-1">
                     <Save size={10} /> Digitando...
                   </span>
                 )}
              </div>
           </div>
           
           <textarea
             value={notes}
             onChange={handleNoteChange}
             className="flex-1 w-full bg-transparent border-none outline-none resize-none font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
             placeholder={`Excelentíssimos Senhores Ministros,\n\n1. Do Cabimento (Tempestividade e Preparo)\n2. Breve Síntese dos Fatos\n3. Do Mérito:\n   - Tese Principal\n   - Jurisprudência STJ/STF\n4. Dos Pedidos`}
           />
           
           <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center gap-2 opacity-50">
              <CheckCircle2 size={12} className="text-slate-400" />
              <p className="text-[8px] font-bold uppercase text-slate-400">
                Dica: Estruture sua fala em: Vocativo &gt; Resumo &gt; Tese &gt; Pedido.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OralArgument;
