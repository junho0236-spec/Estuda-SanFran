
import React from 'react';
import { 
  Target, 
  ShieldCheck, 
  ArrowUpRight, 
  BookOpen, 
  Gavel, 
  PenTool, 
  Lock 
} from 'lucide-react';
import { View } from '../types';

interface SanFranOABProps {
  onNavigate: (view: View) => void;
}

const LockedOverlay: React.FC = () => (
  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-[2.5rem]">
    <div className="absolute inset-0 bg-white/5 dark:bg-black/10 backdrop-blur-[1px] pointer-events-none"></div>
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[0.5px] bg-slate-400/20 rotate-[35deg]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[0.5px] bg-slate-400/20 -rotate-[35deg]"></div>
    </div>
    <div className="relative z-30 bg-white/60 dark:bg-slate-800/60 p-1.5 rounded-full shadow-sm border border-white/40 dark:border-slate-700/40 backdrop-blur-md">
      <Lock size={12} className="text-slate-500/70" />
    </div>
    <div className="absolute bottom-6 left-0 right-0 text-center z-30">
      <span className="text-[7px] font-black uppercase tracking-[0.3em] text-slate-500/60 bg-white/30 dark:bg-black/20 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
        Desenvolvendo
      </span>
    </div>
  </div>
);

const SanFranOAB: React.FC<SanFranOABProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header com Design Editorial - Estilo OAB */}
      <header className="relative py-8 md:py-12">
        <div className="absolute top-0 left-0 w-20 h-1 bg-sanfran-rubi rounded-full mb-6"></div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-[0.9]">
          SanFran <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sanfran-rubi to-red-600">OAB.</span>
        </h1>
        <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          Seu passaporte para a advocacia. Planejamento estratégico e simulados para conquistar a Carteira Vermelha.
        </p>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-sanfran-rubi/5 rounded-full blur-3xl -z-10"></div>
      </header>
      {/* SEÇÃO: ESTRATÉGIA E FOCO */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Estratégia e Foco</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
          {/* CARD 1: FOCO OAB (Hero - Wide & Tall) */}
          <button
            onClick={() => onNavigate(View.OabCountdown)}
            className="group relative col-span-1 md:col-span-2 lg:col-span-3 row-span-2 bg-[#7f1d1d] text-white rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-red-500/30 hover:scale-[1.01] transition-all duration-500"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-gradient-to-bl from-red-500/30 to-transparent rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>

            <div className="relative z-10 flex justify-between items-start">
              <div className="flex gap-4">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                     <Target className="w-12 h-12 md:w-16 md:h-16 text-red-200" />
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 hidden md:block">
                     <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 text-red-100/70" />
                  </div>
              </div>
              <div className="bg-red-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-red-100 border border-red-500/30 flex items-center gap-2">
                 <Gavel size={12} /> Missão Aprovação
              </div>
            </div>

            <div className="relative z-10 space-y-4 text-left mt-16 md:mt-24">
               <div>
                  <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-white mb-2">Foco OAB</h3>
                  <p className="text-base md:text-xl font-medium text-red-100/90 max-w-lg leading-relaxed">
                     Contagem regressiva, estratégia de estudo por fase e análise de prioridades baseada no edital.
                  </p>
               </div>
               
               <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-200 border border-white/5">Cronograma</span>
                  <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-200 border border-white/5">Estratégia</span>
                  <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-200 border border-white/5">1ª e 2ª Fase</span>
               </div>
            </div>

            <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
               <div className="bg-red-600 text-white p-4 rounded-full shadow-lg shadow-red-900/50">
                  <ArrowUpRight size={28} />
               </div>
            </div>
          </button>

          {/* CARD: ANKI OAB - NOVO */}
          <div className="group relative col-span-1 row-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg transition-all flex flex-col justify-between h-full cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="flex justify-between items-start">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-sanfran-rubi rounded-2xl">
                   <BookOpen size={20} />
                </div>
                <ArrowUpRight size={16} className="text-slate-300" />
             </div>
             <div className="text-left mt-4">
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Flashcards</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Memorização OAB</p>
             </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: PRÁTICA E MEMORIZAÇÃO */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Prática e Memorização</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 2: SIMULADOS (Placeholder Vertical) */}
          <div className="relative col-span-1 md:col-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex items-center gap-6 cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center shrink-0">
                <PenTool className="text-slate-400 w-8 h-8" />
             </div>
             <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Simulados FGV</h4>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                   Banco de questões com correção comentada.
                </p>
             </div>
          </div>

          {/* CARD 3: ÉTICA PROFISSIONAL (Placeholder Horizontal) */}
          <div className="relative col-span-1 md:col-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex items-center gap-6 cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-full shrink-0">
                <BookOpen className="w-8 h-8" />
             </div>
             <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Ética Profissional</h4>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">O módulo essencial de 8 pontos.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SanFranOAB;
