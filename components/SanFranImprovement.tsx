
import React from 'react';
import { 
  Network, 
  Keyboard, 
  Landmark, 
  GitCommit, 
  Scroll, 
  Library, 
  Mic, 
  ArrowUpRight,
  TrendingUp,
  Brain,
  GraduationCap,
  Scale
} from 'lucide-react';
import { View } from '../types';

interface SanFranImprovementProps {
  onNavigate: (view: View) => void;
}

const SanFranImprovement: React.FC<SanFranImprovementProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header com Design Editorial - Estilo Improvement */}
      <header className="relative py-8 md:py-12">
        <div className="absolute top-0 left-0 w-20 h-1 bg-purple-600 rounded-full mb-6"></div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-[0.9]">
          SanFran <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-teal-500">Improvement.</span>
        </h1>
        <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          Aprimore suas habilidades técnicas e especialize seu conhecimento. Do básico à maestria jurídica.
        </p>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10"></div>
      </header>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
        
        {/* CARD 1: DOMÍNIO JURÍDICO (Hero - Wide) */}
        <button
          onClick={() => onNavigate(View.DominioJuridico)}
          className="group relative col-span-1 md:col-span-2 row-span-2 bg-[#1e1b4b] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.01] transition-all duration-500"
        >
          {/* Abstract Background Decoration */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-700"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
               <Landmark className="w-8 h-8 md:w-10 md:h-10 text-amber-400" />
            </div>
            <div className="bg-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-amber-200 border border-amber-500/30 flex items-center gap-2">
               <TrendingUp size={12} /> Mapa de Competências
            </div>
          </div>

          <div className="relative z-10 space-y-2 text-left mt-12">
             <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">Domínio Jurídico</h3>
             <p className="text-sm md:text-base font-medium text-slate-300 max-w-sm leading-relaxed">
               Visualize seu progresso nas grandes áreas do Direito: Civil, Penal, Público e Corporativo.
             </p>
          </div>

          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
             <div className="bg-amber-500 text-white p-3 rounded-full shadow-lg">
                <ArrowUpRight size={24} />
             </div>
          </div>
        </button>

        {/* CARD 2: ÁRVORE DE ESPECIALIZAÇÃO (Tall) */}
        <button
          onClick={() => onNavigate(View.Specialization)}
          className="group relative col-span-1 md:col-span-1 row-span-2 bg-purple-50 dark:bg-purple-900/10 rounded-[2.5rem] p-8 border border-purple-100 dark:border-purple-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-100/50 dark:to-purple-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           
           <div className="w-full flex justify-between items-start relative z-10">
              <Network size={20} className="text-purple-400" />
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
           </div>

           <div className="relative z-10 my-4">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                 <Brain size={32} className="text-purple-600 dark:text-purple-300" />
              </div>
           </div>
           
           <div className="relative z-10 space-y-1">
              <h3 className="text-xl font-black text-purple-900 dark:text-white uppercase tracking-tight">Especialização</h3>
              <p className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-widest">Skill Tree & Carreira</p>
           </div>
           
           <div className="w-full pt-4 border-t border-purple-200 dark:border-purple-800/50 mt-4 relative z-10">
              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-purple-500 transition-colors">Ver Evolução</span>
           </div>
        </button>

        {/* CARD 3: LEI SECA (Tall) */}
        <button
          onClick={() => onNavigate(View.LeiSeca)}
          className="group relative col-span-1 md:col-span-1 row-span-2 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-200/50 dark:to-slate-800/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           
           <div className="w-full flex justify-between items-start relative z-10">
              <Scroll size={20} className="text-slate-400" />
              <div className="w-2 h-2 rounded-full bg-slate-500"></div>
           </div>

           <div className="relative z-10 my-4">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                 <Scale size={32} className="text-slate-600 dark:text-slate-300" />
              </div>
           </div>
           
           <div className="relative z-10 space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Lei Seca</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Vade Mecum Digital</p>
           </div>
           
           <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-800/50 mt-4 relative z-10">
              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">Acessar Códigos</span>
           </div>
        </button>

        {/* CARD 4: DATILOGRAFIA (Standard) */}
        <button
          onClick={() => onNavigate(View.TypingChallenge)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-teal-400 transition-all flex flex-col justify-between h-full hover:shadow-teal-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-teal-100 dark:bg-teal-900/20 text-teal-600 rounded-2xl">
                 <Keyboard size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Datilografia</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Velocidade & Precisão</p>
           </div>
        </button>

        {/* CARD 5: TIMELINE (Standard) */}
        <button
          onClick={() => onNavigate(View.Timeline)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-pink-400 transition-all flex flex-col justify-between h-full hover:shadow-pink-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-pink-100 dark:bg-pink-900/20 text-pink-600 rounded-2xl">
                 <GitCommit size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-pink-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Timeline</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Linha do Tempo Processual</p>
           </div>
        </button>

        {/* CARD 6: SUSTENTAÇÃO ORAL (Standard) */}
        <button
          onClick={() => onNavigate(View.OralArgument)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-rose-400 transition-all flex flex-col justify-between h-full hover:shadow-rose-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/20 text-rose-600 rounded-2xl">
                 <Mic size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Sustentação</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Treino de Oratória</p>
           </div>
        </button>

        {/* CARD 7: BIBLIOTECA (Standard) */}
        <button
          onClick={() => onNavigate(View.Library)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-indigo-400 transition-all flex flex-col justify-between h-full hover:shadow-indigo-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl">
                 <Library size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Biblioteca</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Acervo de Doutrinas</p>
           </div>
        </button>

      </div>

    </div>
  );
};

export default SanFranImprovement;
