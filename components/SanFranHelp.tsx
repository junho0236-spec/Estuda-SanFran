
import React from 'react';
import { 
  Calculator, 
  Hourglass, 
  Split, 
  ScanSearch, 
  ClipboardCheck, 
  Banknote, 
  FileSignature, 
  Quote, 
  CalendarClock, 
  ArrowUpRight,
  Wrench,
  AlertCircle,
  Sparkles,
  Lock
} from 'lucide-react';
import { View } from '../types';

interface SanFranHelpProps {
  onNavigate: (view: View) => void;
}

const LockedOverlay: React.FC = () => (
  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-[2.5rem]">
    {/* Efeito de Vidro Jateado / Grayscale Suave */}
    <div className="absolute inset-0 bg-white/5 dark:bg-black/10 backdrop-blur-[1px] pointer-events-none"></div>
    
    {/* Correntes Finas e Delicadas (Formato X) */}
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[0.5px] bg-slate-400/20 rotate-[35deg]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[0.5px] bg-slate-400/20 -rotate-[35deg]"></div>
    </div>

    {/* Cadeado Centralizado e Discreto */}
    <div className="relative z-30 bg-white/60 dark:bg-slate-800/60 p-1.5 rounded-full shadow-sm border border-white/40 dark:border-slate-700/40 backdrop-blur-md">
      <Lock size={12} className="text-slate-500/70" />
    </div>

    {/* Texto de Status Ajustado */}
    <div className="absolute bottom-6 left-0 right-0 text-center z-30">
      <span className="text-[7px] font-black uppercase tracking-[0.3em] text-slate-500/60 bg-white/30 dark:bg-black/20 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
        Desenvolvendo
      </span>
    </div>
  </div>
);

const SanFranHelp: React.FC<SanFranHelpProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header com Design Editorial - Estilo Help */}
      <header className="relative py-8 md:py-12">
        <div className="absolute top-0 left-0 w-20 h-1 bg-slate-500 rounded-full mb-6"></div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-[0.9]">
          SanFran <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-500 to-red-600">Help.</span>
        </h1>
        <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          Sua caixa de ferramentas jurídicas. Cálculos, modelos e utilitários para o dia a dia forense.
        </p>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-slate-500/5 rounded-full blur-3xl -z-10"></div>
      </header>

      {/* BENTO GRID LAYOUT - HERO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        {/* CARD 0: SIMPLIFICADOR JURÍDICO (Hero - AI) */}
        <button
          onClick={() => onNavigate(View.LegalSimplifier)}
          className="group relative col-span-1 md:col-span-4 lg:col-span-2 h-[380px] bg-[#4c1d95] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.005] transition-all duration-500"
        >
          {/* Abstract Background Decoration */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-500/30 to-transparent rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-700"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
               <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-purple-200" />
            </div>
            <div className="bg-purple-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-purple-100 border border-purple-500/30 flex items-center gap-2">
               <Wrench size={12} /> IA Assistant
            </div>
          </div>

          <div className="relative z-10 space-y-2 text-left">
             <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">Tradutor de Juridiquês</h3>
             <p className="text-sm md:text-base font-medium text-purple-100 max-w-sm leading-relaxed">
               Simplifique textos complexos instantaneamente usando Inteligência Artificial.
             </p>
          </div>

          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
             <div className="bg-purple-500 text-white p-3 rounded-full shadow-lg">
                <ArrowUpRight size={24} />
             </div>
          </div>
        </button>

        {/* Decorative Placeholder or Future Feature for Hero Row */}
        <div className="hidden lg:flex col-span-2 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10 items-center justify-center p-10 text-center">
          <div className="space-y-4 max-w-xs">
            <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-full mx-auto flex items-center justify-center">
              <Sparkles className="text-slate-400" size={20} />
            </div>
            <p className="text-sm font-medium text-slate-400">Novas ferramentas de IA estão sendo preparadas para você.</p>
          </div>
        </div>
      </div>

      {/* SEÇÃO: CÁLCULOS JURÍDICOS */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Cálculos Jurídicos</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 1: DOSIMETRIA PENAL (Tall) */}
          <div className="relative col-span-1 row-span-2">
            <button
              disabled
              className="w-full h-full group relative bg-white dark:bg-white/5 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center justify-between text-center overflow-hidden"
            >
               <div className="w-full flex justify-between items-start relative z-10">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <Calculator size={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div className="w-2 h-2 rounded-full bg-red-500/30"></div>
               </div>

               <div className="relative z-10 my-4">
                  <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center shadow-inner transform -rotate-3">
                     <AlertCircle size={32} className="text-red-600/40 dark:text-red-400/40" />
                  </div>
               </div>
               
               <div className="relative z-10 space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Dosimetria</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cálculo Trifásico</p>
               </div>
               
               <div className="w-full pt-4 border-t border-slate-100 dark:border-white/5 mt-4 relative z-10">
                  <span className="text-[9px] font-black uppercase text-slate-300">Calcular Pena</span>
               </div>
            </button>
            <LockedOverlay />
          </div>

          {/* CARD 2: SIMULADOR DE HONORÁRIOS (Tall) */}
          <div className="relative col-span-1 row-span-2">
            <button
              disabled
              className="w-full h-full group relative bg-white dark:bg-white/5 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center justify-between text-center overflow-hidden"
            >
               <div className="w-full flex justify-between items-start relative z-10">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <Banknote size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500/30"></div>
               </div>

               <div className="relative z-10 my-4">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center shadow-inner transform rotate-3">
                     <Banknote size={32} className="text-emerald-600/40 dark:text-emerald-400/40" />
                  </div>
               </div>
               
               <div className="relative z-10 space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Honorários</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tabela OAB/SP</p>
               </div>
               
               <div className="w-full pt-4 border-t border-slate-100 dark:border-white/5 mt-4 relative z-10">
                  <span className="text-[9px] font-black uppercase text-slate-300">Calcular Proposta</span>
               </div>
            </button>
            <LockedOverlay />
          </div>

          {/* CARD 3: CALC. PRAZOS (Tall) */}
          <div className="relative col-span-1 row-span-2">
            <button
              disabled
              className="w-full h-full group relative bg-white dark:bg-white/5 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center justify-between text-center overflow-hidden"
            >
               <div className="w-full flex justify-between items-start relative z-10">
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <CalendarClock size={20} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="w-2 h-2 rounded-full bg-orange-500/30"></div>
               </div>

               <div className="relative z-10 my-4">
                  <div className="w-20 h-20 rounded-3xl bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center shadow-inner transform rotate-6">
                     <CalendarClock size={32} className="text-orange-600/40 dark:text-orange-400/40" />
                  </div>
               </div>
               
               <div className="relative z-10 space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Prazos</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contagem Processual</p>
               </div>
               
               <div className="w-full pt-4 border-t border-slate-100 dark:border-white/5 mt-4 relative z-10">
                  <span className="text-[9px] font-black uppercase text-slate-300">Calcular Prazo</span>
               </div>
            </button>
            <LockedOverlay />
          </div>

          {/* CARD 4: PRESCRIÇÃO (Tall) */}
          <div className="relative col-span-1 row-span-2">
            <button
              disabled
              className="w-full h-full group relative bg-white dark:bg-white/5 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center justify-between text-center overflow-hidden"
            >
               <div className="w-full flex justify-between items-start relative z-10">
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                    <Hourglass size={20} className="text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="w-2 h-2 rounded-full bg-rose-500/30"></div>
               </div>

               <div className="relative z-10 my-4">
                  <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-900/10 flex items-center justify-center shadow-inner transform -rotate-6">
                     <Hourglass size={32} className="text-rose-600/40 dark:text-rose-400/40" />
                  </div>
               </div>
               
               <div className="relative z-10 space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Prescrição</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extinção da Punibilidade</p>
               </div>
               
               <div className="w-full pt-4 border-t border-slate-100 dark:border-white/5 mt-4 relative z-10">
                  <span className="text-[9px] font-black uppercase text-slate-300">Verificar Prazo</span>
               </div>
            </button>
            <LockedOverlay />
          </div>
        </div>
      </div>

      {/* SEÇÃO: GESTÃO E APOIO */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Gestão e Apoio</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 5: PARTILHA DE BENS (Standard) */}
          <div className="relative col-span-1">
            <button
              disabled
              className="w-full h-full group bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between"
            >
               <div className="flex justify-between items-start">
                  <div className="p-3 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-2xl">
                     <Split size={20} />
                  </div>
                  <ArrowUpRight size={16} className="text-slate-200" />
               </div>
               <div className="text-left mt-4">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Partilha de Bens</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Sucessão & Meação</p>
               </div>
            </button>
            <LockedOverlay />
          </div>

          {/* CARD 6: CHECKLIST DE PEÇAS (Standard) */}
          <div className="relative col-span-1">
            <button
              disabled
              className="w-full h-full group bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between"
            >
               <div className="flex justify-between items-start">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                     <ClipboardCheck size={20} />
                  </div>
                  <ArrowUpRight size={16} className="text-slate-200" />
               </div>
               <div className="text-left mt-4">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Checklist</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Validador de Peças</p>
               </div>
            </button>
            <LockedOverlay />
          </div>

          {/* CARD 7: LOUSA DE INVESTIGAÇÃO (Standard) */}
          <div className="relative col-span-1">
            <button
              disabled
              className="w-full h-full group bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between"
            >
               <div className="flex justify-between items-start">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                     <ScanSearch size={20} />
                  </div>
                  <ArrowUpRight size={16} className="text-slate-200" />
               </div>
               <div className="text-left mt-4">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Lousa</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Mapa Mental de Caso</p>
               </div>
            </button>
            <LockedOverlay />
          </div>

          {/* CARD 8: PETITUM (Standard) */}
          <div className="relative col-span-1">
            <button
              disabled
              className="w-full h-full group bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between"
            >
               <div className="flex justify-between items-start">
                  <div className="p-3 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-2xl">
                     <FileSignature size={20} />
                  </div>
                  <ArrowUpRight size={16} className="text-slate-200" />
               </div>
               <div className="text-left mt-4">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Petitum</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Modelos de Peças</p>
               </div>
            </button>
            <LockedOverlay />
          </div>

          {/* CARD 9: CITAÇÕES ABNT (Standard) */}
          <div className="relative col-span-1">
            <button
              disabled
              className="w-full h-full group bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between"
            >
               <div className="flex justify-between items-start">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl">
                     <Quote size={20} />
                  </div>
                  <ArrowUpRight size={16} className="text-slate-200" />
               </div>
               <div className="text-left mt-4">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">ABNT</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Gerador de Citações</p>
               </div>
            </button>
            <LockedOverlay />
          </div>
        </div>
      </div>

    </div>
  );
};

export default SanFranHelp;
