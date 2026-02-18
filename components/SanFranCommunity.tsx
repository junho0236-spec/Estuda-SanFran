
import React from 'react';
import { 
  Users, 
  MessageSquare, 
  Briefcase, 
  Building2, 
  Megaphone, 
  ShoppingBag, 
  Scale, 
  ArrowUpRight,
  Globe,
  Radio,
  UserPlus,
  Gavel,
  ScrollText // Added for Wiki
} from 'lucide-react';
import { View } from '../types';

interface SanFranCommunityProps {
  onNavigate: (view: View) => void;
}

const SanFranCommunity: React.FC<SanFranCommunityProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header com Design Editorial - Estilo Community */}
      <header className="relative py-8 md:py-12">
        <div className="absolute top-0 left-0 w-20 h-1 bg-indigo-600 rounded-full mb-6"></div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-[0.9]">
          SanFran <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Community.</span>
        </h1>
        <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          O coração pulsante das Arcadas. Conecte-se, debata e construa sua rede de contatos no Largo.
        </p>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10"></div>
      </header>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
        
        {/* CARD 1: O LARGO (Hero - Wide & Tall) */}
        <button
          onClick={() => onNavigate(View.Largo)}
          className="group relative col-span-1 md:col-span-2 row-span-2 bg-[#0f172a] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-cyan-500/20 hover:scale-[1.01] transition-all duration-500"
        >
          {/* Abstract Background Decoration */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-700"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-indigo-900/50 to-transparent"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
               <Users className="w-8 h-8 md:w-10 md:h-10 text-cyan-300" />
            </div>
            <div className="bg-cyan-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-cyan-200 border border-cyan-500/30 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> Online Agora
            </div>
          </div>

          <div className="relative z-10 space-y-2 text-left mt-12">
             <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">O Largo</h3>
             <p className="text-sm md:text-base font-medium text-slate-300 max-w-sm leading-relaxed">
               O pátio virtual. Veja quem está online, desafie colegas para duelos e sinta a presença da comunidade.
             </p>
          </div>

          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
             <div className="bg-cyan-500 text-white p-3 rounded-full shadow-lg">
                <ArrowUpRight size={24} />
             </div>
          </div>
        </button>

        {/* CARD 2: SALAS DE ESTUDO (Tall) */}
        <button
          onClick={() => onNavigate(View.StudyRoom)}
          className="group relative col-span-1 md:col-span-1 row-span-2 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2.5rem] p-8 border border-indigo-100 dark:border-indigo-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-100/50 dark:to-indigo-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           
           <div className="w-full flex justify-between items-start relative z-10">
              <Radio size={20} className="text-indigo-400" />
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
           </div>

           <div className="relative z-10 my-4">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                 <Building2 size={32} className="text-indigo-600 dark:text-indigo-300" />
              </div>
           </div>
           
           <div className="relative z-10 space-y-1">
              <h3 className="text-xl font-black text-indigo-900 dark:text-white uppercase tracking-tight">Salas de Estudo</h3>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-widest">Departamentos & Voz</p>
           </div>
           
           <div className="w-full pt-4 border-t border-indigo-200 dark:border-indigo-800/50 mt-4 relative z-10">
              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-indigo-500 transition-colors">Entrar em Sessão</span>
           </div>
        </button>

        {/* CARD 3: SOCIEDADES (Tall) */}
        <button
          onClick={() => onNavigate(View.Societies)}
          className="group relative col-span-1 md:col-span-1 row-span-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2.5rem] p-8 border border-emerald-100 dark:border-emerald-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-100/50 dark:to-emerald-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           
           <div className="w-full flex justify-between items-start relative z-10">
              <Globe size={20} className="text-emerald-400" />
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
           </div>

           <div className="relative z-10 my-4">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                 <Briefcase size={32} className="text-emerald-600 dark:text-emerald-300" />
              </div>
           </div>
           
           <div className="relative z-10 space-y-1">
              <h3 className="text-xl font-black text-emerald-900 dark:text-white uppercase tracking-tight">Sociedades</h3>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-widest">Grupos & Bancas</p>
           </div>
           
           <div className="w-full pt-4 border-t border-emerald-200 dark:border-emerald-800/50 mt-4 relative z-10">
              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-emerald-500 transition-colors">Ver Organizações</span>
           </div>
        </button>

        {/* CARD 4: MENTORSHIP (Wide) */}
        <button
          onClick={() => onNavigate(View.Mentorship)}
          className="group relative col-span-1 md:col-span-2 bg-[#1c1917] dark:bg-amber-950/30 rounded-[2.5rem] p-8 border border-amber-500/30 shadow-xl hover:shadow-amber-500/20 transition-all flex flex-col justify-between overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
           <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform"></div>

           <div className="flex justify-between items-start relative z-10">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 backdrop-blur-sm">
                 <UserPlus size={24} />
              </div>
              <ArrowUpRight size={20} className="text-amber-200 group-hover:text-white transition-colors" />
           </div>
           <div className="text-left mt-8 relative z-10">
              <h4 className="text-2xl font-black text-white uppercase tracking-tight">O Padrinho</h4>
              <p className="text-xs font-bold text-amber-200 uppercase tracking-widest mt-1">Networking Vertical • Calouros & Veteranos</p>
           </div>
        </button>

        {/* CARD 5: JÚRI SIMULADO (Wide) */}
        <button
          onClick={() => onNavigate(View.MockJury)}
          className="group relative col-span-1 md:col-span-2 bg-[#270d0d] dark:bg-red-950/40 rounded-[2.5rem] p-8 border border-red-500/30 shadow-xl hover:shadow-red-500/20 transition-all flex flex-col justify-between overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20"></div>
           <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-red-600/20 rounded-full blur-2xl"></div>

           <div className="flex justify-between items-start relative z-10">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30 backdrop-blur-sm">
                 <Gavel size={24} />
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[9px] font-black uppercase bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30">Valendo SanCoins</span>
                 <ArrowUpRight size={20} className="text-red-200 group-hover:text-white transition-colors" />
              </div>
           </div>
           <div className="text-left mt-8 relative z-10">
              <h4 className="text-2xl font-black text-white uppercase tracking-tight">O Júri Simulado</h4>
              <p className="text-xs font-bold text-red-200 uppercase tracking-widest mt-1">Acusação vs Defesa • Voto Popular</p>
           </div>
        </button>

        {/* CARD 6: WIKI DE PEÇAS (Novo - Wide) */}
        <button
          onClick={() => onNavigate(View.PetitionWiki)}
          className="group relative col-span-1 md:col-span-2 bg-[#0e7490] dark:bg-cyan-950/40 rounded-[2.5rem] p-8 border border-cyan-500/30 shadow-xl hover:shadow-cyan-500/20 transition-all flex flex-col justify-between overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/lined-paper.png')] opacity-10"></div>
           <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-400/20 rounded-full blur-2xl"></div>

           <div className="flex justify-between items-start relative z-10">
              <div className="p-3 bg-cyan-500/20 text-cyan-300 rounded-2xl border border-cyan-500/30 backdrop-blur-sm">
                 <ScrollText size={24} />
              </div>
              <ArrowUpRight size={20} className="text-cyan-200 group-hover:text-white transition-colors" />
           </div>
           <div className="text-left mt-8 relative z-10">
              <h4 className="text-2xl font-black text-white uppercase tracking-tight">Wiki de Peças</h4>
              <p className="text-xs font-bold text-cyan-200 uppercase tracking-widest mt-1">Banco Colaborativo • Validação por Pares</p>
           </div>
        </button>

        {/* CARD 7: JURISPRUDÊNCIA (Standard) */}
        <button
          onClick={() => onNavigate(View.JurisprudenceMural)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-violet-400 transition-all flex flex-col justify-between h-full hover:shadow-violet-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-violet-100 dark:bg-violet-900/20 text-violet-600 rounded-2xl">
                 <Scale size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-violet-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Jurisprudência</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Acervo Coletivo</p>
           </div>
        </button>

        {/* CARD 8: CLASSIFICADOS (Standard) */}
        <button
          onClick={() => onNavigate(View.ClassificadosPatio)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-rose-400 transition-all flex flex-col justify-between h-full hover:shadow-rose-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/20 text-rose-600 rounded-2xl">
                 <ShoppingBag size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Classificados</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Mercado do Pátio</p>
           </div>
        </button>

      </div>

    </div>
  );
};

export default SanFranCommunity;
