
import React from 'react';
import { 
  Globe, 
  Languages, 
  BookA, 
  ArrowUpRight, 
  Mic2,
  FileText,
  Construction,
  Film
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
        
        {/* CARD 1: LEGAL LANGUAGES (Hero - Main Focus) */}
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
                   <Languages className="w-8 h-8 md:w-10 md:h-10 text-sky-300" />
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 hidden md:block">
                   <Globe className="w-8 h-8 md:w-10 md:h-10 text-sky-200" />
                </div>
            </div>
            <div className="bg-sky-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-sky-100 border border-sky-500/30 flex items-center gap-2">
               <Mic2 size={12} /> Laboratório Multilíngue
            </div>
          </div>

          <div className="relative z-10 space-y-4 text-left mt-16 md:mt-24">
             <div>
                <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-white mb-2">Legal Languages</h3>
                <p className="text-base md:text-xl font-medium text-sky-100 max-w-lg leading-relaxed opacity-90">
                  Inglês, Espanhol, Francês, Alemão e Italiano Jurídico. Domine os termos de cada jurisdição.
                </p>
             </div>
             
             <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-sky-200 border border-white/5">5 Idiomas</span>
                <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-sky-200 border border-white/5">Terminologia</span>
                <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-sky-200 border border-white/5">Cortes Internacionais</span>
             </div>
          </div>

          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
             <div className="bg-sky-500 text-white p-4 rounded-full shadow-lg shadow-sky-900/50">
                <ArrowUpRight size={28} />
             </div>
          </div>
        </button>

        {/* CARD 2: CINEMA JURÍDICO */}
        <button
          onClick={() => onNavigate(View.LegalCinema)}
          className="group relative col-span-1 row-span-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2.5rem] p-8 border border-slate-700 dark:border-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20"></div>
           <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>

           <div className="w-full flex justify-between items-start relative z-10">
              <Film size={24} className="text-slate-300 dark:text-slate-600" />
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
           </div>

           <div className="relative z-10 mt-auto">
              <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">Cinema Jurídico</h3>
              <p className="text-xs font-bold opacity-70 uppercase tracking-widest line-clamp-3">
                Aprenda com Suits & HTGAWM. Clips reais, contexto e quizzes.
              </p>
           </div>
           
           <div className="w-full pt-4 border-t border-white/10 dark:border-black/10 mt-4 relative z-10 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Pop Culture Law</span>
              <ArrowUpRight size={16} />
           </div>
        </button>

      </div>

    </div>
  );
};

export default SanFranLanguages;
