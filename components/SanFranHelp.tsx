
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

      {/* SEÇÃO: INTELIGÊNCIA ARTIFICIAL */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Inteligência Artificial</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {/* CARD 0: SIMPLIFICADOR JURÍDICO (Hero - AI) */}
          <button
            onClick={() => onNavigate(View.LegalSimplifier)}
            className="group relative col-span-1 md:col-span-4 lg:col-span-2 h-[380px] bg-[#4c1d95] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.005] transition-all duration-500"
          >
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

          {/* CARD 1: RESUMIDOR INTELIGENTE */}
          <button
            onClick={() => onNavigate(View.IntelligentSummarizer)}
            className="group relative col-span-1 md:col-span-2 lg:col-span-2 h-[380px] bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.005] transition-all duration-500"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                 <ScanSearch className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
              </div>
              <div className="bg-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-emerald-100 border border-emerald-500/30">
                 IA Analysis
              </div>
            </div>

            <div className="relative z-10 space-y-2 text-left">
               <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">Resumidor Inteligente</h3>
               <p className="text-sm md:text-base font-medium text-slate-400 max-w-sm leading-relaxed">
                 Extraia os pontos principais de petições e acórdãos em segundos.
               </p>
            </div>

            <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
               <div className="bg-emerald-500 text-white p-3 rounded-full shadow-lg">
                  <ArrowUpRight size={24} />
               </div>
            </div>
          </button>
        </div>
      </div>

      {/* SEÇÃO: CÁLCULOS E PRAZOS */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Cálculos e Prazos</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 2: CALCULADORA DE PRAZOS (LOCKED) */}
          <div className="relative col-span-1 md:col-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 flex items-center gap-6 shadow-lg cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl shrink-0">
                <Hourglass size={32} />
             </div>
             <div className="text-left">
                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Prazos Processuais</h4>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">CPC, CPP e CLT</p>
             </div>
          </div>

          {/* CARD 3: CALCULADORA DE PRESCRIÇÃO (LOCKED) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col justify-between cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="flex justify-between items-start">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl">
                   <AlertCircle size={20} />
                </div>
             </div>
             <div className="text-left mt-4">
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Prescrição</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Penal e Cível</p>
             </div>
          </div>

          {/* CARD 4: SIMULADOR DE SUCESSÃO (LOCKED) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col justify-between cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="flex justify-between items-start">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl">
                   <Split size={20} />
                </div>
             </div>
             <div className="text-left mt-4">
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Sucessão</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Simulador de Herança</p>
             </div>
          </div>

          {/* CARD 5: CALCULADORA DE PENAS (LOCKED) */}
          <div className="relative col-span-1 md:col-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex items-center justify-center gap-4 cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="p-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full">
                <Calculator className="w-6 h-6" />
             </div>
             <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Calculadora de Penas</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Dosimetria Automatizada</p>
             </div>
          </div>

          {/* CARD 6: DIVISOR DE CUSTAS (LOCKED) */}
          <div className="relative col-span-1 md:col-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex items-center justify-center gap-4 cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-full">
                <Split className="w-6 h-6" />
             </div>
             <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Divisor de Custas</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Rateio Proporcional</p>
             </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: MODELOS E DOCUMENTOS */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Modelos e Documentos</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 8: GERADOR DE PEDIDOS (LOCKED) */}
          <div className="relative col-span-1 md:col-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex items-center gap-6 cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl shrink-0">
                <FileSignature size={32} />
             </div>
             <div className="text-left">
                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gerador de Pedidos</h4>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Cláusulas e Requerimentos</p>
             </div>
          </div>

          {/* CARD 9: GERADOR DE MINUTAS (LOCKED) */}
          <div className="relative col-span-1 md:col-span-2 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex items-center justify-center gap-4 cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full">
                <FileSignature className="w-6 h-6" />
             </div>
             <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Gerador de Minutas</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Esboços Estruturados</p>
             </div>
          </div>

          {/* CARD 10: CITADOR ABNT (LOCKED) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col justify-center items-center gap-2 cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="p-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full">
                <Quote className="w-5 h-5" />
             </div>
             <div className="text-center">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Citador ABNT</h4>
                <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400">Referências Rápidas</p>
             </div>
          </div>

          {/* CARD 11: REPOSITÓRIO DE MODELOS (LOCKED) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col justify-between cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="flex justify-between items-start">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                   <ClipboardCheck size={20} />
                </div>
             </div>
             <div className="text-left mt-4">
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Repositório</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Modelos de Sucesso</p>
             </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: UTILITÁRIOS */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Utilitários</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 12: CHECKLIST DE PEÇAS (LOCKED) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col justify-between cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="flex justify-between items-start">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl">
                   <ClipboardCheck size={20} />
                </div>
             </div>
             <div className="text-left mt-4">
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Checklist</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                   Requisitos Essenciais
                </p>
             </div>
          </div>

          {/* CARD 13: QUADRO DE INVESTIGAÇÃO (LOCKED) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col justify-between cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="flex justify-between items-start">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl">
                   <ScanSearch size={20} />
                </div>
             </div>
             <div className="text-left mt-4">
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Investigação</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                   Quadro de Provas
                </p>
             </div>
          </div>

          {/* CARD 14: SIMULADOR DE HONORÁRIOS (LOCKED) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col justify-between cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="flex justify-between items-start">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-2xl">
                   <Banknote size={20} />
                </div>
             </div>
             <div className="text-left mt-4">
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Honorários</h4>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                   Simulador OAB
                </p>
             </div>
          </div>

          {/* CARD 15: AGENDA FORENSE (LOCKED) */}
          <div className="relative col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col justify-center items-center gap-2 cursor-default overflow-hidden">
             <LockedOverlay />
             <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full">
                <CalendarClock className="w-5 h-5" />
             </div>
             <div className="text-center">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Agenda Forense</h4>
                <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400">Audiências e Prazos</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SanFranHelp;
