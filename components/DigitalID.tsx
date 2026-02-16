
import React, { useRef, useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { Download, Share2, Crown, Award, BookOpen, Shield, Gavel, Scale, QrCode } from 'lucide-react';
import { StudySession, Task } from '../types';
import { getBrasiliaDate } from '../App';

interface DigitalIDProps {
  userId: string;
  userName: string;
  studySessions: StudySession[];
  tasks: Task[];
}

const DigitalID: React.FC<DigitalIDProps> = ({ userId, userName, studySessions, tasks }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Lógica de Níveis (Mesma do Dashboard) ---
  const totalSeconds = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const totalHours = totalSeconds / 3600;

  const ranks = [
    { name: 'Bacharel', hours: 0, style: 'plastic' },
    { name: 'Advogado Júnior', hours: 20, style: 'bronze' },
    { name: 'Advogado Pleno', hours: 100, style: 'silver' },
    { name: 'Advogado Sênior', hours: 300, style: 'gold' },
    { name: 'Sócio-Diretor', hours: 700, style: 'black' },
    { name: 'Magistrado', hours: 1500, style: 'diamond' },
  ];

  const currentRankIndex = [...ranks].reverse().findIndex(r => totalHours >= r.hours);
  const currentRank = ranks[ranks.length - 1 - currentRankIndex];

  // --- Lógica de Streak (Mesma do Dashboard) ---
  const streak = useMemo(() => {
    const activityDates = new Set<string>();
    studySessions.forEach(s => { if (s.start_time) activityDates.add(s.start_time.split('T')[0]); });
    tasks.forEach(t => { if (t.completed && t.completedAt) activityDates.add(t.completedAt.split('T')[0]); });

    if (activityDates.size === 0) return 0;

    const today = getBrasiliaDate();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(yesterdayDate);

    let currentStreak = 0;
    let checkDateStr = activityDates.has(today) ? today : (activityDates.has(yesterday) ? yesterday : null);

    if (!checkDateStr) return 0;

    const subtractOneDay = (dateStr: string) => {
      const d = new Date(dateStr + 'T12:00:00'); 
      d.setDate(d.getDate() - 1);
      return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(d);
    };

    let tempDate = checkDateStr;
    while (activityDates.has(tempDate)) {
      currentStreak++;
      tempDate = subtractOneDay(tempDate);
    }
    return currentStreak;
  }, [studySessions, tasks]);

  // --- Gerador de OAB Fictícia ---
  const fakeOAB = useMemo(() => {
    const hash = userId.split('-').join('').substring(0, 6).toUpperCase();
    const num = hash.replace(/[^0-9]/g, '').padEnd(6, '0').substring(0, 6);
    return `OAB/SF ${num}`;
  }, [userId]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    
    try {
      // Pequeno delay para garantir que fonts/styles carregaram
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // Alta resolução
        useCORS: true,
        backgroundColor: null,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Carteira_SanFran_${currentRank.style}.png`;
      link.click();
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      alert("Erro ao gerar a imagem. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Estilos Dinâmicos ---
  const getCardStyle = (style: string) => {
    switch (style) {
      case 'plastic':
        return {
          bg: 'bg-slate-50 border-2 border-slate-200',
          text: 'text-slate-800',
          accent: 'text-usp-blue',
          subtext: 'text-slate-500',
          border: 'border-slate-300',
          logoColor: 'text-slate-300'
        };
      case 'bronze':
        return {
          bg: 'bg-gradient-to-br from-[#E6BE8A] to-[#8B5A2B] border-2 border-[#5D3A1A]',
          text: 'text-[#3E2723]',
          accent: 'text-[#3E2723]',
          subtext: 'text-[#3E2723]/80',
          border: 'border-[#5D3A1A]/30',
          logoColor: 'text-[#3E2723]/20'
        };
      case 'silver':
        return {
          bg: 'bg-gradient-to-br from-[#E0E0E0] via-[#F5F5F5] to-[#BDBDBD] border-2 border-slate-400',
          text: 'text-slate-800',
          accent: 'text-slate-900',
          subtext: 'text-slate-600',
          border: 'border-slate-400/50',
          logoColor: 'text-slate-400/30'
        };
      case 'gold':
        return {
          bg: 'bg-gradient-to-br from-[#FFECB3] via-[#FFD54F] to-[#FFB300] border-2 border-yellow-600',
          text: 'text-yellow-900',
          accent: 'text-yellow-900',
          subtext: 'text-yellow-900/80',
          border: 'border-yellow-700/30',
          logoColor: 'text-yellow-800/20'
        };
      case 'black':
        return {
          bg: 'bg-[#1a1a1a] border-2 border-slate-800',
          text: 'text-white',
          accent: 'text-sanfran-rubi',
          subtext: 'text-gray-400',
          border: 'border-white/10',
          logoColor: 'text-white/5'
        };
      case 'diamond':
        return {
          bg: 'bg-gradient-to-br from-slate-900 via-black to-slate-800 border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)]',
          text: 'text-white',
          accent: 'text-cyan-400',
          subtext: 'text-cyan-100/70',
          border: 'border-cyan-500/30',
          logoColor: 'text-cyan-500/10'
        };
      default:
        return { bg: 'bg-white', text: 'text-black', accent: 'text-black', subtext: 'text-gray-500', border: 'border-gray-200', logoColor: 'text-gray-100' };
    }
  };

  const style = getCardStyle(currentRank.style);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in duration-700">
      
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Identidade Acadêmica</h2>
        <p className="text-slate-500 font-bold">Sua credencial oficial no Largo de São Francisco.</p>
      </div>

      {/* CARD CONTAINER (Para referência do download) */}
      <div className="relative group perspective-1000 mb-10">
        <div 
          ref={cardRef}
          className={`relative w-[340px] h-[215px] md:w-[428px] md:h-[270px] rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col justify-between transition-transform duration-500 transform hover:rotate-y-6 hover:rotate-x-6 ${style.bg}`}
        >
          {/* Background Textures */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none"></div>
          {currentRank.style === 'diamond' && <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent pointer-events-none"></div>}
          
          {/* Background Logo */}
          <div className={`absolute -right-10 -bottom-10 opacity-10 pointer-events-none transform -rotate-12`}>
             <Scale size={200} className={style.logoColor} />
          </div>

          {/* Header */}
          <div className="flex justify-between items-start z-10 relative">
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 ${style.border} ${currentRank.style === 'black' || currentRank.style === 'diamond' ? 'bg-white/10' : 'bg-white/50'}`}>
                   <Scale className={`w-6 h-6 md:w-7 md:h-7 ${style.accent}`} />
                </div>
                <div>
                   <h3 className={`text-xs md:text-sm font-black uppercase tracking-[0.2em] leading-none ${style.text}`}>SanFran</h3>
                   <p className={`text-[8px] md:text-[10px] font-bold uppercase tracking-wide ${style.subtext}`}>Academia de Direito</p>
                </div>
             </div>
             <div className={`text-[10px] md:text-xs font-black uppercase tracking-widest px-2 py-1 rounded border ${style.border} ${style.text}`}>
               {fakeOAB}
             </div>
          </div>

          {/* Main Info */}
          <div className="z-10 relative mt-4">
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${style.subtext}`}>Nome do Acadêmico</p>
             <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight leading-none ${style.text} truncate`}>{userName || 'Doutor(a)'}</h2>
             
             <div className="flex items-center gap-2 mt-2">
                {currentRank.hours >= 1500 ? <Crown size={16} className={style.accent} /> : currentRank.hours >= 700 ? <Award size={16} className={style.accent} /> : <BookOpen size={16} className={style.accent} />}
                <p className={`text-sm md:text-base font-black uppercase tracking-widest ${style.accent}`}>{currentRank.name}</p>
             </div>
          </div>

          {/* Footer Stats */}
          <div className={`flex justify-between items-end border-t pt-3 z-10 relative ${style.border}`}>
             <div className="flex gap-6">
                <div>
                   <p className={`text-[8px] font-black uppercase tracking-widest ${style.subtext}`}>Carga Horária</p>
                   <p className={`text-sm md:text-lg font-black ${style.text}`}>{totalHours.toFixed(1)}h</p>
                </div>
                <div>
                   <p className={`text-[8px] font-black uppercase tracking-widest ${style.subtext}`}>Ofensiva</p>
                   <p className={`text-sm md:text-lg font-black ${style.text}`}>{streak} Dias</p>
                </div>
             </div>
             <div className={`opacity-80`}>
                <QrCode size={32} className={style.text} />
             </div>
          </div>

          {/* Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ transform: 'skewX(-20deg) translateX(-150%)', animation: 'shine 3s infinite' }}></div>
        </div>
      </div>

      <div className="flex gap-4">
         <button 
           onClick={handleDownload}
           disabled={isGenerating}
           className="flex items-center gap-3 px-8 py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-sanfran-rubiDark hover:scale-105 transition-all disabled:opacity-50"
         >
            {isGenerating ? 'Imprimindo...' : <><Download size={18} /> Baixar Credencial</>}
         </button>
      </div>
      
      <p className="mt-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest max-w-sm text-center">
         Use esta carteirinha para acesso simbólico aos corredores da excelência jurídica. Compartilhe sua patente.
      </p>

    </div>
  );
};

export default DigitalID;
