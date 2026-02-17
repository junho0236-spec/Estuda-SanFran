
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
  Dice5
} from 'lucide-react';
import { View } from '../types';

interface SanFranGamesProps {
  onNavigate: (view: View) => void;
}

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

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
        
        {/* CARD 1: VIDA DE ESTAGIÁRIO (Hero - Wide & Tall) */}
        <button
          onClick={() => onNavigate(View.InternRPG)}
          className="group relative col-span-1 md:col-span-2 row-span-2 bg-[#2e1065] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.01] transition-all duration-500"
        >
          {/* Abstract Background Decoration (Pixel Art vibe) */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-pink-500/20 to-transparent rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-700"></div>

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

          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
             <div className="bg-pink-500 text-white p-3 rounded-full shadow-lg">
                <ArrowUpRight size={24} />
             </div>
          </div>
        </button>

        {/* CARD 2: SUPER TRUNFO (Tall) */}
        <button
          onClick={() => onNavigate(View.Trunfo)}
          className="group relative col-span-1 md:col-span-1 row-span-2 bg-purple-50 dark:bg-purple-900/10 rounded-[2.5rem] p-8 border border-purple-100 dark:border-purple-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-100/50 dark:to-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           
           <div className="w-full flex justify-between items-start relative z-10">
              <Sword size={20} className="text-purple-400" />
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
           </div>

           <div className="relative z-10 my-4">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                 <Dna size={32} className="text-purple-600 dark:text-purple-300" />
              </div>
           </div>
           
           <div className="relative z-10 space-y-1">
              <h3 className="text-xl font-black text-purple-900 dark:text-white uppercase tracking-tight">Super Trunfo</h3>
              <p className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-widest">Batalha de Doutrinadores</p>
           </div>
           
           <div className="w-full pt-4 border-t border-purple-200 dark:border-purple-800/50 mt-4 relative z-10">
              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-purple-500 transition-colors">Jogar Cartas</span>
           </div>
        </button>

        {/* CARD 3: GAME SÚMULAS (Tall) */}
        <button
          onClick={() => onNavigate(View.SumulaChallenge)}
          className="group relative col-span-1 md:col-span-1 row-span-2 bg-orange-50 dark:bg-orange-900/10 rounded-[2.5rem] p-8 border border-orange-100 dark:border-orange-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-100/50 dark:to-orange-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           
           <div className="w-full flex justify-between items-start relative z-10">
              <Zap size={20} className="text-orange-400" />
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
           </div>

           <div className="relative z-10 my-4">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                 <Gamepad2 size={32} className="text-orange-600 dark:text-orange-300" />
              </div>
           </div>
           
           <div className="relative z-10 space-y-1">
              <h3 className="text-xl font-black text-orange-900 dark:text-white uppercase tracking-tight">Súmula Challenge</h3>
              <p className="text-[10px] font-bold text-orange-600 dark:text-orange-300 uppercase tracking-widest">Memorização Rápida</p>
           </div>
           
           <div className="w-full pt-4 border-t border-orange-200 dark:border-orange-800/50 mt-4 relative z-10">
              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-orange-500 transition-colors">Desafiar o Relógio</span>
           </div>
        </button>

        {/* CARD 4: O VEREDITO (Standard) */}
        <button
          onClick={() => onNavigate(View.JurisTinder)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-emerald-400 transition-all flex flex-col justify-between h-full hover:shadow-emerald-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl">
                 <ThumbsUp size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">O Veredito</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tinder de Jurisprudência</p>
           </div>
        </button>

        {/* CARD 5: LATIM FORENSE (Standard) */}
        <button
          onClick={() => onNavigate(View.LatinGame)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-rose-400 transition-all flex flex-col justify-between h-full hover:shadow-rose-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/20 text-rose-600 rounded-2xl">
                 <Languages size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Latim Forense</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Adivinhe o Termo</p>
           </div>
        </button>

        {/* CARD 6: PLACEHOLDER (Standard) */}
        <div className="col-span-1 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-4 opacity-60">
           <div className="p-3 bg-slate-200 dark:bg-slate-800 rounded-full">
              <Dice5 className="text-slate-400 w-6 h-6" />
           </div>
           <div>
              <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight text-center">Em Breve</h4>
              <p className="text-[10px] font-bold text-slate-400 text-center">Novos Jogos</p>
           </div>
        </div>

      </div>

    </div>
  );
};

export default SanFranGames;
