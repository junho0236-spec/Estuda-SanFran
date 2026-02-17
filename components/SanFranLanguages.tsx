
import React from 'react';
import { 
  Globe, 
  Languages, 
  BookA, 
  ArrowUpRight, 
  Mic2,
  FileText,
  Construction
} from 'lucide-react';
import { View } from '../types';

interface SanFranLanguagesProps {
  onNavigate: (view: View) => void;
}

const SanFranLanguages: React.FC<SanFranLanguagesProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header com Design Editorial - Estilo Languages */}
      <header className="relative py-8 md:py-12">
        <div className="absolute top-0 left-0 w-20 h-1 bg-sky-600 rounded-full mb-6"></div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-[0.9]">
          SanFran <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-blue-500">Languages.</span>
        </h1>
        <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          Quebre fronteiras. Domine a terminologia jurídica internacional e prepare-se para uma carreira global.
        </p>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>
      </header>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
        
        {/* CARD 1: LEGAL ENGLISH (Hero - Main Focus) */}
        <button
          onClick={() => onNavigate(View.SanFranIdiomas)}
          className="group relative col-span-1 md:col-span-2 lg:col-span-3 row-span-2 bg-[#0c4a6e] text-white rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-sky-500/20 hover:scale-[1.01] transition-all duration-500"
        >
          {/* Abstract Background Decoration */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/shattered-island.png')] opacity-10"></div>
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-gradient-to-bl from-sky-400/30 to-transparent rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                   <Globe className="w-8 h-8 md:w-10 md:h-10 text-sky-300" />
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 hidden md:block">
                   <BookA className="w-8 h-8 md:w-10 md:h-10 text-sky-200" />
                </div>
            </div>
            <div className="bg-sky-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-sky-100 border border-sky-500/30 flex items-center gap-2">
               <Mic2 size={12} /> Curso Completo
            </div>
          </div>

          <div className="relative z-10 space-y-4 text-left mt-16 md:mt-24">
             <div>
                <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-white mb-2">Legal English</h3>
                <p className="text-base md:text-xl font-medium text-sky-100 max-w-lg leading-relaxed opacity-90">
                  Contratos Internacionais, Vocabulário de Corte e Business Law.
                </p>
             </div>
             
             <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-sky-200 border border-white/5">Glossário</span>
                <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-sky-200 border border-white/5">Listening</span>
                <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-sky-200 border border-white/5">Briefings Diários</span>
             </div>
          </div>

          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
             <div className="bg-sky-500 text-white p-4 rounded-full shadow-lg shadow-sky-900/50">
                <ArrowUpRight size={28} />
             </div>
          </div>
        </button>

        {/* CARD 2: COMING SOON (Placeholder Vertical) */}
        <div className="col-span-1 row-span-2 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] p-8 border-2 border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-center opacity-70">
           <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <Construction className="text-slate-400 w-10 h-10" />
           </div>
           <h4 className="text-lg font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Em Breve</h4>
           <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 max-w-[150px]">
              Novos idiomas como Espanhol Jurídico e Francês em desenvolvimento.
           </p>
        </div>

      </div>

    </div>
  );
};

export default SanFranLanguages;
