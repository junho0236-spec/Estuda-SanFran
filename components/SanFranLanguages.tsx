
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
  MessageCircle,
  Lock
} from 'lucide-react';
import { View } from '../types';

interface SanFranLanguagesProps {
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

      {/* SEÇÃO: IMERSÃO E PRÁTICA */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Imersão e Prática</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
          {/* CARD 1: GENERAL LANGUAGES */}
          <div className="group relative col-span-1 md:col-span-2 row-span-2 bg-indigo-600 text-white rounded-[2.5rem] p-8 md:p-10 border border-indigo-500 shadow-2xl flex flex-col justify-between overflow-hidden cursor-default">
             <LockedOverlay />
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
             <div className="relative z-10 flex justify-between items-start">
                <div className="p-3 bg-white/20 rounded-2xl shadow-lg">
                   <Languages size={32} className="text-white" />
                </div>
                <div className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                   Gramática Geral
                </div>
             </div>
             <div className="relative z-10 text-left mt-8">
                <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-white mb-2">General Languages</h3>
                <p className="text-sm md:text-base font-medium text-indigo-100 opacity-90">
                   Domine a base do idioma com foco em gramática e conversação cotidiana.
                </p>
             </div>
             <div className="absolute bottom-8 right-8 opacity-0 transition-all duration-300 translate-x-4">
                <div className="bg-white text-indigo-600 p-3 rounded-full shadow-lg">
                   <ArrowUpRight size={24} />
                </div>
             </div>
          </div>

          {/* CARD 2: LEGAL LANGUAGES (Main Focus) */}
          <div className="group relative col-span-1 md:col-span-2 row-span-2 bg-[#0c4a6e] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl cursor-default">
            <LockedOverlay />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/shattered-island.png')] opacity-10"></div>
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-gradient-to-bl from-sky-400/30 to-transparent rounded-full blur-3xl"></div>

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

            <div className="absolute bottom-8 right-8 opacity-0 transition-all duration-300 translate-x-4">
               <div className="bg-sky-500 text-white p-3 rounded-full shadow-lg">
                  <ArrowUpRight size={24} />
               </div>
            </div>
          </div>

          {/* CARD 3: BILINGUAL NEWS (Wide) */}
          <div className="group relative col-span-1 md:col-span-2 bg-[#1e293b] text-white rounded-[2.5rem] p-8 border border-slate-600 shadow-xl flex flex-col justify-between overflow-hidden cursor-default">
             <LockedOverlay />
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
             
             <div className="absolute bottom-8 right-8 opacity-0 transition-all duration-300 translate-x-4">
                <ArrowUpRight size={24} />
             </div>
          </div>

          {/* CARD 4: O INTERCAMBISTA */}
          <div className="group relative col-span-1 md:col-span-2 bg-[#4c1d95] text-white rounded-[2.5rem] p-8 border border-violet-500 shadow-xl flex flex-col justify-between overflow-hidden cursor-default">
            <LockedOverlay />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/p5.png')] opacity-10"></div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                 <Plane className="w-6 h-6 text-violet-200" />
              </div>
              <div className="bg-violet-400/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-violet-100 border border-violet-500/30 flex items-center gap-2">
                 <Globe size={12} /> RPG Textual
              </div>
            </div>

            <div className="relative z-10 mt-4">
               <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">O Intercambista</h3>
               <p className="text-sm font-medium text-violet-100 opacity-90 mt-2">
                 Sobreviva em Londres, Paris, Berlim ou Roma. Aprenda vivendo.
               </p>
            </div>

            <div className="absolute bottom-8 right-8 opacity-0 transition-all duration-300 translate-x-4">
               <ArrowUpRight size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: LABORATÓRIO DE HABILIDADES */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Laboratório de Habilidades</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 5: PRONÚNCIA LAB */}
          <div className="group relative col-span-1 bg-[#0d9488] text-white rounded-[2.5rem] p-6 border border-teal-500/50 shadow-xl flex flex-col justify-between overflow-hidden cursor-default">
             <LockedOverlay />
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/sound-wave.png')] opacity-20"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                   <Mic2 size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-teal-200" />
             </div>
             <div className="relative z-10 text-left">
                <h3 className="text-lg font-black uppercase tracking-tight leading-none">Pronúncia Lab</h3>
                <p className="text-[10px] font-bold text-teal-100/90 uppercase mt-1">Feedback com IA</p>
             </div>
          </div>

          {/* CARD 6: VISUAL FLASHCARDS */}
          <div className="group relative col-span-1 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-[2.5rem] p-6 border border-white/20 shadow-xl flex flex-col justify-between overflow-hidden cursor-default">
             <LockedOverlay />
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                   <ImageIcon size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-orange-200" />
             </div>
             <div className="relative z-10 text-left">
                <h3 className="text-lg font-black uppercase tracking-tight leading-none">Flashcards</h3>
                <p className="text-[10px] font-bold text-orange-100/90 uppercase mt-1">Vocabulário Visual</p>
             </div>
          </div>

          {/* CARD 7: SLANG CHALLENGE */}
          <div className="group relative col-span-1 bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-[2.5rem] p-6 border border-white/20 shadow-xl flex flex-col justify-between overflow-hidden cursor-default">
             <LockedOverlay />
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wall-4-light.png')] opacity-20"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                   <MessageCircle size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-pink-200" />
             </div>
             <div className="relative z-10 text-left">
                <h3 className="text-lg font-black uppercase tracking-tight leading-none">Gírias</h3>
                <p className="text-[10px] font-bold text-pink-100/90 uppercase mt-1">Idioma das Ruas</p>
             </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: ENTRETENIMENTO E CULTURA */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Entretenimento e Cultura</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 8: LYRICAL VIBES */}
          <div className="group relative col-span-1 md:col-span-2 bg-[#4338ca] text-white rounded-[2.5rem] p-6 border border-indigo-500 shadow-xl flex flex-col justify-between overflow-hidden cursor-default">
             <LockedOverlay />
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                   <Music2 size={24} className="text-white" />
                </div>
                <ArrowUpRight size={20} className="text-indigo-200" />
             </div>
             <div className="relative z-10 text-left">
                <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Lyrical Vibes</h3>
                <p className="text-sm font-medium text-indigo-100/90 mt-1">Aprenda com Música e Letras</p>
             </div>
          </div>

          {/* CARD 9: LEGAL CINEMA */}
          <div className="group relative col-span-1 bg-slate-900 text-white rounded-[2.5rem] p-6 border border-slate-700 shadow-xl flex flex-col justify-between overflow-hidden cursor-default">
             <LockedOverlay />
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/film.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                   <Film size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-slate-400" />
             </div>
             <div className="relative z-10 text-left">
                <h3 className="text-lg font-black uppercase tracking-tight leading-none">Legal Cinema</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Filmes Jurídicos</p>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SanFranLanguages;
