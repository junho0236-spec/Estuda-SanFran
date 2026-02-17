
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

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
        
        {/* CARD 1: FOCO OAB (Hero - Wide & Tall) */}
        <button
          onClick={() => onNavigate(View.OabCountdown)}
          className="group relative col-span-1 md:col-span-2 lg:col-span-3 row-span-2 bg-[#7f1d1d] text-white rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-red-500/30 hover:scale-[1.01] transition-all duration-500"
        >
          {/* Abstract Background Decoration */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-gradient-to-bl from-red-500/30 to-transparent rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                   <Target className="w-8 h-8 md:w-10 md:h-10 text-red-200" />
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

        {/* CARD 2: SIMULADOS (Placeholder Vertical) */}
        <div className="col-span-1 row-span-2 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] p-8 border-2 border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-center opacity-60">
           <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <PenTool className="text-slate-400 w-10 h-10" />
           </div>
           <h4 className="text-lg font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Em Breve: Simulados</h4>
           <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 max-w-[150px]">
              Banco de questões da FGV com correção comentada.
           </p>
           <Lock size={16} className="text-slate-300 mt-4" />
        </div>

        {/* CARD 3: ÉTICA PROFISSIONAL (Placeholder Horizontal) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] p-6 border-2 border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center gap-4 opacity-60">
           <div className="p-3 bg-slate-200 dark:bg-slate-800 rounded-full">
              <BookOpen className="text-slate-400 w-6 h-6" />
           </div>
           <div>
              <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Em Breve: Ética Profissional</h4>
              <p className="text-[10px] font-bold text-slate-400">O módulo essencial para garantir 8 pontos na prova.</p>
           </div>
        </div>

      </div>

    </div>
  );
};

export default SanFranOAB;
