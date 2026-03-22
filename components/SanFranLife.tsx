
import React from 'react';
import { 
  Armchair, 
  ShoppingBag, 
  ArrowUpRight, 
  Construction, 
  Layout,
  Gem,
  Coffee,
  Palette,
  Lock
} from 'lucide-react';
import { View } from '../types';

interface SanFranLifeProps {
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

const SanFranLife: React.FC<SanFranLifeProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header com Design Editorial - Estilo Life */}
      <header className="relative py-8 md:py-12">
        <div className="absolute top-0 left-0 w-20 h-1 bg-emerald-600 rounded-full mb-6"></div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-[0.9]">
          SanFran <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500">Life.</span>
        </h1>
        <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          Construa seu patrimônio acadêmico. Personalize seu gabinete e negocie itens raros no Sebo.
        </p>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10"></div>
      </header>      {/* SEÇÃO: PATRIMÔNIO E ESTILO */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Patrimônio e Estilo</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
          {/* CARD 1: ESCRITÓRIO (Hero - Wide & Tall) */}
          <div className="group relative col-span-1 md:col-span-2 lg:col-span-3 row-span-2 bg-[#1c1917] text-white rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-between overflow-hidden shadow-2xl cursor-default">
            <LockedOverlay />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20"></div>
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full blur-3xl"></div>

            <div className="relative z-10 flex justify-between items-start">
              <div className="flex gap-4">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                     <Armchair className="w-8 h-8 md:w-10 md:h-10 text-amber-200" />
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 hidden md:block">
                     <Layout className="w-8 h-8 md:w-10 md:h-10 text-amber-100/70" />
                  </div>
              </div>
              <div className="bg-amber-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-amber-100 border border-amber-500/30 flex items-center gap-2">
                 <Gem size={12} /> Colecionáveis
              </div>
            </div>

            <div className="relative z-10 space-y-4 text-left mt-16 md:mt-24">
               <div>
                  <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-white mb-2">Seu Gabinete</h3>
                  <p className="text-base md:text-xl font-medium text-amber-100/90 max-w-lg leading-relaxed">
                    Personalize seu ambiente de estudos com itens conquistados. Do piso de mármore à poltrona de juiz.
                  </p>
               </div>
               
               <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-amber-200 border border-white/5">Mobília</span>
                  <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-amber-200 border border-white/5">Decoração</span>
                  <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-amber-200 border border-white/5">SanFran Box</span>
               </div>
            </div>

            <div className="absolute bottom-8 right-8 opacity-0 transition-all duration-300 translate-x-4">
               <div className="bg-amber-600 text-white p-4 rounded-full shadow-lg shadow-amber-900/50">
                  <ArrowUpRight size={28} />
               </div>
            </div>
          </div>

          {/* CARD 3: COMING SOON (Placeholder) */}
          <div className="relative col-span-1 row-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col items-center justify-center gap-4 cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="p-3 bg-slate-100 dark:bg-white/10 text-slate-400 rounded-full">
                <Coffee className="w-6 h-6" />
             </div>
             <div className="text-center">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Café do Centro</h4>
                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Socialize e gaste moedas.</p>
             </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: MERCADO E TROCAS */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Mercado e Trocas</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 2: O SEBO (Standard - Tall) */}
          <div className="relative col-span-1 md:col-span-2 bg-[#fdfbf7] dark:bg-[#292524] rounded-[2.5rem] p-8 border border-[#e7e5e4] dark:border-[#44403c] shadow-xl flex flex-col items-center justify-between text-center overflow-hidden cursor-default">
             <LockedOverlay />
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-50 dark:opacity-10"></div>
             
             <div className="w-full flex justify-between items-start relative z-10">
                <ShoppingBag size={20} className="text-stone-500 dark:text-stone-400" />
                <ArrowUpRight size={20} className="text-stone-400" />
             </div>

             <div className="relative z-10 flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center shadow-inner transition-transform duration-500">
                   <Palette size={32} className="text-stone-600 dark:text-stone-300" />
                </div>
                <div className="text-left">
                   <h3 className="text-2xl font-black text-stone-800 dark:text-stone-200 uppercase tracking-tight">O Sebo</h3>
                   <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Trocas & Negócios</p>
                </div>
             </div>
             
             <div className="w-full pt-4 border-t border-stone-200 dark:border-stone-700 mt-4 relative z-10">
                <span className="text-[9px] font-black uppercase text-stone-400 transition-colors">Ver Ofertas Disponíveis</span>
             </div>
          </div>

          {/* CARD 4: PLACEHOLDER */}
          <div className="relative col-span-1 md:col-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex items-center justify-center gap-4 cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="p-3 bg-slate-100 dark:bg-white/10 text-slate-400 rounded-full shrink-0">
                <Construction className="w-6 h-6" />
             </div>
             <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Leilão de Itens Raros</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Em breve no Largo.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SanFranLife;
