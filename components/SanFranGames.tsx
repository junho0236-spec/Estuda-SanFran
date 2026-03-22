
import React from 'react';
import { 
  Gamepad2, 
  Map, 
  Sword, 
  Languages, 
  ThumbsUp, 
  Zap, 
  ArrowUpRight,
  Ghost,
  Dna,
  Dice5,
  Lock
} from 'lucide-react';
import { View } from '../types';

interface SanFranGamesProps {
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

const SanFranGames: React.FC<SanFranGamesProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header com Design Editorial - Estilo Games */}
      <header className="relative py-8 md:py-12">
        <div className="absolute top-0 left-0 w-20 h-1 bg-orange-500 rounded-full mb-6"></div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-[0.9]">
          SanFran <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-purple-600">Games.</span>
        </h1>
        <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          O Arcade Acadêmico. Aprenda jogando, desafie a lógica jurídica e relaxe entre os estudos.
        </p>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl -z-10"></div>
      </header>

      {/* SEÇÃO: RPG E SIMULAÇÃO */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">RPG e Simulação</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
          {/* CARD 1: VIDA DE ESTAGIÁRIO (Hero - Wide & Tall) */}
          <div className="group relative col-span-1 md:col-span-2 row-span-2 bg-[#2e1065] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl cursor-default">
            <LockedOverlay />
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-pink-500/20 to-transparent rounded-full blur-3xl -mr-20 -mt-20"></div>

            <div className="relative z-10 flex justify-between items-start">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                 <Map className="w-8 h-8 md:w-10 md:h-10 text-pink-300" />
              </div>
              <div className="bg-pink-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-pink-200 border border-pink-500/30 flex items-center gap-2">
                 <Ghost size={12} /> RPG Textual
              </div>
            </div>

            <div className="relative z-10 space-y-2 text-left mt-12">
               <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">Vida de Estagiário</h3>
               <p className="text-sm md:text-base font-medium text-purple-200 max-w-sm leading-relaxed">
                 Sobreviva aos prazos fatais, chefes exigentes e sistemas fora do ar. Tome decisões e construa sua reputação.
               </p>
            </div>

            <div className="absolute bottom-8 right-8 opacity-0 transition-all duration-300 translate-x-4">
               <div className="bg-pink-500 text-white p-3 rounded-full shadow-lg">
                  <ArrowUpRight size={24} />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: DESAFIOS DE CONHECIMENTO */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Desafios de Conhecimento</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 2: SUPER TRUNFO (Tall) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col items-center justify-between text-center overflow-hidden cursor-default">
             <LockedOverlay />
             <div className="w-full flex justify-between items-start relative z-10">
                <Sword size={20} className="text-purple-400" />
                <ArrowUpRight size={16} className="text-purple-300" />
             </div>
             <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center shadow-lg transform rotate-3 transition-transform duration-500">
                   <Dna size={28} className="text-purple-600 dark:text-purple-300" />
                </div>
             </div>
             <div className="relative z-10">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Super Trunfo</h3>
                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Doutrinadores</p>
             </div>
          </div>

          {/* CARD 3: GAME SÚMULAS (Tall) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col items-center justify-between text-center overflow-hidden cursor-default">
             <LockedOverlay />
             <div className="w-full flex justify-between items-start relative z-10">
                <Zap size={20} className="text-orange-400" />
                <ArrowUpRight size={16} className="text-orange-300" />
             </div>
             <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center shadow-lg transform -rotate-3 transition-transform duration-500">
                   <Gamepad2 size={28} className="text-orange-600 dark:text-orange-300" />
                </div>
             </div>
             <div className="relative z-10">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Súmulas</h3>
                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Memorização</p>
             </div>
          </div>

          {/* CARD 7: LATIN GAME */}
          <div className="relative col-span-1 md:col-span-2 bg-slate-800 text-white rounded-[2.5rem] p-6 border border-slate-700 shadow-xl flex flex-col justify-between overflow-hidden cursor-default">
             <LockedOverlay />
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                   <Languages size={24} className="text-amber-400" />
                </div>
                <ArrowUpRight size={20} className="text-slate-400" />
             </div>
             <div className="relative z-10 text-left">
                <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Latim Forense</h3>
                <p className="text-sm font-medium text-slate-400 mt-1">Adivinhe o Brocardo Jurídico</p>
             </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: MINI-GAMES */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Mini-Games</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 4: O VEREDITO (Standard) */}
          <div className="group relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg transition-all flex flex-col justify-between h-full cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="flex justify-between items-start">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl">
                   <ThumbsUp size={20} />
                </div>
                <ArrowUpRight size={16} className="text-slate-300" />
             </div>
             <div className="text-left mt-4">
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">O Veredito</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Tinder de Jurisprudência</p>
             </div>
          </div>

          {/* CARD 6: PLACEHOLDER (Standard) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col items-center justify-center gap-4 cursor-default overflow-hidden">
             <div className="p-3 bg-slate-100 dark:bg-white/10 text-slate-400 rounded-full">
                <Dice5 className="w-6 h-6" />
             </div>
             <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight text-center">Em Breve</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">Novos Jogos</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SanFranGames;
