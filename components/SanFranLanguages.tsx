
import React from 'react';
import { 
  Globe, 
  Languages, 
  BookA, 
  ArrowUpRight, 
  Mic2,
  FileText,
  Construction,
  Film,
  GraduationCap,
  Music2,
  Plane,
  Image as ImageIcon,
  Newspaper,
  MessageCircle
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
          Quebre fronteiras. Domine idiomas para uma carreira global ou simplesmente para expandir horizontes.
        </p>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>
      </header>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
        
        {/* CARD 1: LEGAL LANGUAGES (Main Focus) */}
        <button
          onClick={() => onNavigate(View.SanFranIdiomas)}
          className="group relative col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-[#0c4a6e] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-sky-500/20 hover:scale-[1.01] transition-all duration-500"
        >
          {/* Abstract Background Decoration */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/shattered-island.png')] opacity-10"></div>
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-gradient-to-bl from-sky-400/30 to-transparent rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
               <BookA className="w-8 h-8 text-sky-300" />
            </div>
            <div className="bg-sky-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-sky-100 border border-sky-500/30 flex items-center gap-2">
               Terminologia Jurídica
            </div>
          </div>

          <div className="relative z-10 space-y-4 text-left mt-8">
             <div>
                <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-white mb-2">Legal Languages</h3>
                <p className="text-sm md:text-base font-medium text-sky-100 opacity-90">
                  Focado em jurisdição, contratos e tribunais.
                </p>
             </div>
          </div>

          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
             <div className="bg-sky-500 text-white p-3 rounded-full shadow-lg">
                <ArrowUpRight size={24} />
             </div>
          </div>
        </button>

        {/* CARD 2: O INTERCAMBISTA (New Hero) */}
        <button
          onClick={() => onNavigate(View.TheExchangeStudent)}
          className="group relative col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-[#4c1d95] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-violet-500/20 hover:scale-[1.01] transition-all duration-500"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/p5.png')] opacity-10"></div>
          <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-gradient-to-tr from-violet-400/30 to-transparent rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
               <Plane className="w-8 h-8 text-violet-200" />
            </div>
            <div className="bg-violet-400/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-violet-100 border border-violet-500/30 flex items-center gap-2">
               <Globe size={12} /> RPG Textual
            </div>
          </div>

          <div className="relative z-10 space-y-4 text-left mt-8">
             <div>
                <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-white mb-2">O Intercambista</h3>
                <p className="text-sm md:text-base font-medium text-violet-100 opacity-90">
                  Sobreviva em Londres, Paris, Berlim ou Roma. Aprenda vivendo.
                </p>
             </div>
             <div className="flex gap-2">
                <span className="px-2 py-1 bg-white/10 rounded-lg text-[9px] font-bold uppercase">UK</span>
                <span className="px-2 py-1 bg-white/10 rounded-lg text-[9px] font-bold uppercase">FR</span>
                <span className="px-2 py-1 bg-white/10 rounded-lg text-[9px] font-bold uppercase">DE</span>
                <span className="px-2 py-1 bg-white/10 rounded-lg text-[9px] font-bold uppercase">IT</span>
             </div>
          </div>

          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
             <div className="bg-white text-violet-600 p-3 rounded-full shadow-lg">
                <ArrowUpRight size={24} />
             </div>
          </div>
        </button>

        {/* CARD 3: PRONÚNCIA LAB */}
        <button
          onClick={() => onNavigate(View.PronunciationLab)}
          className="group relative col-span-1 md:col-span-1 lg:col-span-1 row-span-2 bg-[#0d9488] text-white rounded-[2.5rem] p-8 border border-teal-500/50 shadow-xl hover:shadow-2xl hover:shadow-teal-500/20 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/sound-wave.png')] opacity-20"></div>
           <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
           
           <div className="flex justify-between items-start relative z-10">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                 <Mic2 size={24} className="text-white" />
              </div>
           </div>
           
           <div className="relative z-10 space-y-2 mt-8">
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">Pronúncia Lab</h3>
              <p className="text-xs font-medium text-teal-100/90 leading-snug">
                 Feedback de voz instantâneo com IA.
              </p>
           </div>
           
           <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
              <ArrowUpRight size={24} />
           </div>
        </button>

        {/* CARD 4: VISUAL FLASHCARDS */}
        <button
          onClick={() => onNavigate(View.VisualFlashcards)}
          className="group relative col-span-1 md:col-span-1 lg:col-span-1 row-span-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-[2.5rem] p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:shadow-orange-500/20 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
           
           <div className="flex justify-between items-start relative z-10">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                 <ImageIcon size={24} className="text-white" />
              </div>
           </div>
           
           <div className="relative z-10 mt-8">
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">Flashcards Visuais</h3>
              <p className="text-xs font-medium text-orange-100/90 leading-snug mt-2">
                 Vocabulário A1 com imagens. Rápido e intuitivo.
              </p>
           </div>
           
           <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
              <ArrowUpRight size={24} />
           </div>
        </button>

        {/* CARD 5: BILINGUAL NEWS */}
        <button
          onClick={() => onNavigate(View.BilingualNews)}
          className="group relative col-span-1 md:col-span-1 lg:col-span-2 row-span-2 bg-[#1e293b] text-white rounded-[2.5rem] p-8 border border-slate-600 shadow-xl hover:shadow-2xl hover:shadow-slate-500/20 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/newspaper.png')] opacity-10"></div>
           
           <div className="flex justify-between items-start relative z-10">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                 <Newspaper size={24} className="text-white" />
              </div>
              <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                 Notícias & Atualidades
              </div>
           </div>
           
           <div className="relative z-10 mt-8">
              <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">News Reader</h3>
              <p className="text-sm font-medium text-slate-300 leading-snug max-w-sm mt-2">
                 Leia sobre Tech, Cultura e Esportes. Clique em qualquer palavra para tradução imediata.
              </p>
           </div>
           
           <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
              <ArrowUpRight size={24} />
           </div>
        </button>

        {/* CARD 6: SLANG CHALLENGE (NEW!) */}
        <button
          onClick={() => onNavigate(View.SlangChallenge)}
          className="group relative col-span-1 md:col-span-1 lg:col-span-1 row-span-2 bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-[2.5rem] p-8 border border-white/20 shadow-xl hover:shadow-2xl hover:shadow-pink-500/20 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wall-4-light.png')] opacity-20"></div>
           
           <div className="flex justify-between items-start relative z-10">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                 <MessageCircle size={24} className="text-white" />
              </div>
           </div>
           
           <div className="relative z-10 mt-8">
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">Desafio da Gíria</h3>
              <p className="text-xs font-medium text-pink-100/90 leading-snug mt-2">
                 Aprenda o idioma das ruas. Gírias e expressões nativas.
              </p>
           </div>
           
           <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
              <ArrowUpRight size={24} />
           </div>
        </button>

        {/* CARD 7: LYRICAL VIBES */}
        <button
          onClick={() => onNavigate(View.LyricalVibes)}
          className="group relative col-span-1 md:col-span-1 lg:col-span-1 row-span-2 bg-[#4338ca] text-white rounded-[2.5rem] p-8 border border-indigo-500 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
           
           <div className="flex justify-between items-start relative z-10">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                 <Music2 size={24} className="text-white" />
              </div>
           </div>
           
           <div className="relative z-10 mt-8">
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">Lyrical Vibes</h3>
              <p className="text-xs font-medium text-indigo-100/90 leading-snug mt-2">
                 Aprenda com Música. Preencha as lacunas.
              </p>
           </div>
        </button>

        {/* CARD 8: GENERAL LANGUAGES (Standard) */}
        <button
          onClick={() => onNavigate(View.GeneralLanguages)}
          className="group relative col-span-1 md:col-span-1 lg:col-span-1 row-span-2 bg-indigo-600 text-white rounded-[2.5rem] p-8 border border-indigo-500 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
           
           <div className="flex items-start justify-between relative z-10">
              <div className="bg-white/20 p-3 rounded-2xl shadow-lg">
                 <Languages size={24} className="text-white" />
              </div>
           </div>
           
           <div className="relative z-10 mt-6">
              <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">General App</h3>
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">
                 Gramática & Vocabulário Geral.
              </p>
           </div>
        </button>

      </div>

    </div>
  );
};

export default SanFranLanguages;
