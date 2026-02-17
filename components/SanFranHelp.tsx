
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
  AlertCircle
} from 'lucide-react';
import { View } from '../types';

interface SanFranHelpProps {
  onNavigate: (view: View) => void;
}

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

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
        
        {/* CARD 1: DOSIMETRIA PENAL (Hero - Wide & Tall) */}
        <button
          onClick={() => onNavigate(View.Dosimetria)}
          className="group relative col-span-1 md:col-span-2 row-span-2 bg-[#7f1d1d] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-red-500/20 hover:scale-[1.01] transition-all duration-500"
        >
          {/* Abstract Background Decoration */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-red-500/30 to-transparent rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-700"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
               <Calculator className="w-8 h-8 md:w-10 md:h-10 text-red-200" />
            </div>
            <div className="bg-red-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-red-100 border border-red-500/30 flex items-center gap-2">
               <AlertCircle size={12} /> Cálculo Trifásico
            </div>
          </div>

          <div className="relative z-10 space-y-2 text-left mt-12">
             <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">Dosimetria Penal</h3>
             <p className="text-sm md:text-base font-medium text-red-100 max-w-sm leading-relaxed">
               Calcule a pena base, agravantes, atenuantes e causas de aumento/diminuição conforme o Código Penal.
             </p>
          </div>

          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
             <div className="bg-red-500 text-white p-3 rounded-full shadow-lg">
                <ArrowUpRight size={24} />
             </div>
          </div>
        </button>

        {/* CARD 2: SIMULADOR DE HONORÁRIOS (Tall) */}
        <button
          onClick={() => onNavigate(View.Honorarios)}
          className="group relative col-span-1 md:col-span-1 row-span-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2.5rem] p-8 border border-emerald-100 dark:border-emerald-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-100/50 dark:to-emerald-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           
           <div className="w-full flex justify-between items-start relative z-10">
              <Banknote size={20} className="text-emerald-500" />
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
           </div>

           <div className="relative z-10 my-4">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                 <Banknote size={32} className="text-emerald-600 dark:text-emerald-300" />
              </div>
           </div>
           
           <div className="relative z-10 space-y-1">
              <h3 className="text-xl font-black text-emerald-900 dark:text-white uppercase tracking-tight">Honorários</h3>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-widest">Tabela OAB/SP</p>
           </div>
           
           <div className="w-full pt-4 border-t border-emerald-200 dark:border-emerald-800/50 mt-4 relative z-10">
              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-emerald-500 transition-colors">Calcular Proposta</span>
           </div>
        </button>

        {/* CARD 3: CALC. PRAZOS (Tall) */}
        <button
          onClick={() => onNavigate(View.DeadlineCalculator)}
          className="group relative col-span-1 md:col-span-1 row-span-2 bg-orange-50 dark:bg-orange-900/10 rounded-[2.5rem] p-8 border border-orange-100 dark:border-orange-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-100/50 dark:to-orange-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           
           <div className="w-full flex justify-between items-start relative z-10">
              <CalendarClock size={20} className="text-orange-500" />
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
           </div>

           <div className="relative z-10 my-4">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                 <CalendarClock size={32} className="text-orange-600 dark:text-orange-300" />
              </div>
           </div>
           
           <div className="relative z-10 space-y-1">
              <h3 className="text-xl font-black text-orange-900 dark:text-white uppercase tracking-tight">Prazos</h3>
              <p className="text-[10px] font-bold text-orange-600 dark:text-orange-300 uppercase tracking-widest">CPC & CPP</p>
           </div>
           
           <div className="w-full pt-4 border-t border-orange-200 dark:border-orange-800/50 mt-4 relative z-10">
              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-orange-500 transition-colors">Contar Dias Úteis</span>
           </div>
        </button>

        {/* CARD 4: PRESCRIÇÃO (Standard) */}
        <button
          onClick={() => onNavigate(View.PrescriptionCalculator)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-red-400 transition-all flex flex-col justify-between h-full hover:shadow-red-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-2xl">
                 <Hourglass size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-red-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Prescrição</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Extinção da Punibilidade</p>
           </div>
        </button>

        {/* CARD 5: PARTILHA DE BENS (Standard) */}
        <button
          onClick={() => onNavigate(View.SucessaoSimulator)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-pink-400 transition-all flex flex-col justify-between h-full hover:shadow-pink-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-pink-100 dark:bg-pink-900/20 text-pink-600 rounded-2xl">
                 <Split size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-pink-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Partilha de Bens</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sucessão & Meação</p>
           </div>
        </button>

        {/* CARD 6: CHECKLIST DE PEÇAS (Standard) */}
        <button
          onClick={() => onNavigate(View.Checklist)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-blue-400 transition-all flex flex-col justify-between h-full hover:shadow-blue-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                 <ClipboardCheck size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Checklist</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Validador de Peças</p>
           </div>
        </button>

        {/* CARD 7: LOUSA DE INVESTIGAÇÃO (Standard) */}
        <button
          onClick={() => onNavigate(View.InvestigationBoard)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-amber-400 transition-all flex flex-col justify-between h-full hover:shadow-amber-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-2xl">
                 <ScanSearch size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Lousa</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Mapa Mental de Caso</p>
           </div>
        </button>

        {/* CARD 8: PETITUM (Standard) */}
        <button
          onClick={() => onNavigate(View.Petitum)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-teal-400 transition-all flex flex-col justify-between h-full hover:shadow-teal-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-teal-100 dark:bg-teal-900/20 text-teal-600 rounded-2xl">
                 <FileSignature size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Petitum</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Modelos de Peças</p>
           </div>
        </button>

        {/* CARD 9: CITAÇÕES ABNT (Standard) */}
        <button
          onClick={() => onNavigate(View.CitationGenerator)}
          className="group col-span-1 bg-white dark:bg-white/5 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:border-slate-400 transition-all flex flex-col justify-between h-full hover:shadow-slate-500/10"
        >
           <div className="flex justify-between items-start">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl">
                 <Quote size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
           </div>
           <div className="text-left mt-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">ABNT</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Gerador de Citações</p>
           </div>
        </button>

      </div>

    </div>
  );
};

export default SanFranHelp;
