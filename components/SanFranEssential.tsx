
import React from 'react';
import { 
  BrainCircuit, 
  Timer, 
  Calendar, 
  Trophy, 
  BookOpen, 
  CheckSquare, 
  Archive, 
  ArrowUpRight,
  Zap,
  BookX,
  ScrollText,
  FileText,
  Repeat,
  UserX,
  ListTodo,
  Hourglass,
  Eye,
  Key,
  CalendarCheck,
  Calculator as CalculatorIcon,
  BarChart3
} from 'lucide-react';
import { View } from '../types';

interface SanFranEssentialProps {
  onNavigate: (view: View) => void;
}

const SanFranEssential: React.FC<SanFranEssentialProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header com Design Editorial */}
      <header className="relative py-8 md:py-12">
        <div className="absolute top-0 left-0 w-20 h-1 bg-sanfran-rubi rounded-full mb-6"></div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-[0.9]">
          SanFran <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sanfran-rubi to-orange-600">Essential.</span>
        </h1>
        <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          O centro de comando da sua excelência acadêmica. Todas as ferramentas vitais em um único painel de controle.
        </p>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-usp-gold/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-sanfran-rubi/5 rounded-full blur-3xl -z-10"></div>
      </header>

      {/* SEÇÃO 1: ALTA PERFORMANCE */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Alta Performance</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
          {/* CARD 1: FLASHCARDS (Hero - Large) */}
          <button
            onClick={() => onNavigate(View.Anki)}
            className="group relative col-span-1 md:col-span-2 row-span-2 bg-indigo-950 text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-indigo-500/20 hover:scale-[1.01] transition-all duration-500"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent"></div>

            <div className="relative z-10 flex justify-between items-start">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                 <BrainCircuit className="w-8 h-8 md:w-10 md:h-10 text-indigo-300" />
              </div>
              <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                 Memória Ativa
              </div>
            </div>

            <div className="relative z-10 space-y-2 text-left mt-12">
               <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-none">Flashcards</h3>
               <p className="text-sm md:text-base font-medium opacity-80 max-w-sm leading-relaxed">
                 Domine a doutrina e a lei seca com repetição espaçada. O método mais eficaz para a OAB.
               </p>
            </div>

            <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
               <div className="bg-white text-indigo-900 p-3 rounded-full shadow-lg">
                  <ArrowUpRight size={24} />
               </div>
            </div>
          </button>

          {/* CARD 2: TIMER (Hero - Tall) */}
          <button
            onClick={() => onNavigate(View.Timer)}
            className="group relative col-span-1 md:col-span-1 row-span-2 bg-rose-600 text-white rounded-[2.5rem] p-8 border border-rose-500 shadow-xl hover:shadow-rose-500/30 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden"
          >
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
             
             <div className="relative z-10 mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                   <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-rose-600 shadow-lg">
                      <Timer size={40} className="animate-pulse" />
                   </div>
                </div>
             </div>
             
             <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Foco Total</h3>
             <p className="text-[10px] font-bold text-rose-100 uppercase tracking-widest">Pomodoro Technique</p>
             
             <div className="mt-8 flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                <Zap size={14} fill="currentColor" /> Iniciar Sessão
             </div>
          </button>

          {/* CARD: SPEED READER */}
          <button
            onClick={() => onNavigate(View.SpeedReader)}
            className="group col-span-1 bg-[#f59e0b] text-white rounded-[2.5rem] p-6 border border-amber-600 shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <Eye size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-amber-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Leitura</h4>
                <p className="text-[10px] font-bold text-amber-100 uppercase">Speed Reader</p>
             </div>
          </button>

          {/* CARD: REVISÃO ESPAÇADA */}
          <button
            onClick={() => onNavigate(View.SpacedRepetition)}
            className="group col-span-1 bg-[#0284c7] text-white rounded-[2.5rem] p-6 border border-sky-600 shadow-lg hover:shadow-sky-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <Repeat size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-sky-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Revisão</h4>
                <p className="text-[10px] font-bold text-sky-100 uppercase">Ebbinghaus</p>
             </div>
          </button>
        </div>
      </div>

      {/* SEÇÃO 2: PLANEJAMENTO & PRAZOS */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Planejamento & Prazos</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD: CRONOGRAMA DINÂMICO */}
          <button
            onClick={() => onNavigate(View.ReverseSchedule)}
            className="group col-span-1 bg-emerald-600 text-white rounded-[2.5rem] p-6 border border-emerald-700 shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <CalendarCheck size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-emerald-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Cronograma</h4>
                <p className="text-[10px] font-bold text-emerald-100 uppercase">Planejamento IA</p>
             </div>
          </button>

          {/* CARD: CALCULADORA DE PRAZOS */}
          <button
            onClick={() => onNavigate(View.DeadlinePlanner)}
            className="group col-span-1 bg-[#ea580c] text-white rounded-[2.5rem] p-6 border border-orange-700 shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <Hourglass size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-orange-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Prazos</h4>
                <p className="text-[10px] font-bold text-orange-100 uppercase">Matriz Urgência</p>
             </div>
          </button>

          {/* CARD 9: AGENDA */}
          <button
            onClick={() => onNavigate(View.Calendar)}
            className="group col-span-1 bg-violet-600 text-white rounded-[2.5rem] p-6 border border-violet-700 shadow-lg hover:shadow-violet-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <Calendar size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-violet-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Agenda</h4>
                <p className="text-[10px] font-bold text-violet-100 uppercase">Prazos & Provas</p>
             </div>
          </button>

          {/* CARD: RASTREADOR DE EDITAL */}
          <button
            onClick={() => onNavigate(View.SyllabusTracker)}
            className="group col-span-1 bg-[#4f46e5] text-white rounded-[2.5rem] p-6 border border-indigo-700 shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <ListTodo size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-indigo-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Editais</h4>
                <p className="text-[10px] font-bold text-indigo-100 uppercase">Checklist Progresso</p>
             </div>
          </button>

          {/* CARD: MINHAS LISTAS */}
          <button
            onClick={() => onNavigate(View.MinhasListas)}
            className="group col-span-1 bg-[#7c3aed] text-white rounded-[2.5rem] p-6 border border-violet-700 shadow-lg hover:shadow-violet-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <ListTodo size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-violet-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Minhas Listas</h4>
                <p className="text-[10px] font-bold text-violet-100 uppercase">Rotina de Estudos</p>
             </div>
          </button>
        </div>
      </div>

      {/* SEÇÃO 3: MÉTODOS DE ESTUDO */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Métodos de Estudo</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD: MNEMONICA VAULT */}
          <button
            onClick={() => onNavigate(View.Mnemonics)}
            className="group col-span-1 bg-[#1e293b] text-white rounded-[2.5rem] p-6 border border-slate-600 shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <Key size={20} className="text-amber-500" />
                </div>
                <ArrowUpRight size={16} className="text-amber-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Mnemônicas</h4>
                <p className="text-[10px] font-bold text-amber-200 uppercase">Banco de Macetes</p>
             </div>
          </button>

          {/* CARD 3: CADERNO DE ERROS */}
          <button
            onClick={() => onNavigate(View.ErrorLog)}
            className="group col-span-1 bg-[#1a1a1a] text-white rounded-[2.5rem] p-6 border border-slate-800 shadow-lg hover:shadow-red-900/20 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-red-600 rounded-2xl shadow-lg">
                   <BookX size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-slate-500 group-hover:text-red-500 transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Erros</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Black Book</p>
             </div>
          </button>

          {/* CARD 5: FICHAMENTO IRAC */}
          <button
            onClick={() => onNavigate(View.IracMethod)}
            className="group col-span-1 bg-orange-500 text-white rounded-[2.5rem] p-6 border border-orange-600 shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-20"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <FileText size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-orange-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">IRAC</h4>
                <p className="text-[10px] font-bold text-orange-100 uppercase">Fichamento</p>
             </div>
          </button>

          {/* CARD 4: CODE TRACKER */}
          <button
            onClick={() => onNavigate(View.CodeTracker)}
            className="group col-span-1 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-[2.5rem] p-6 border border-teal-600 shadow-lg hover:shadow-teal-900/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/lined-paper.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <ScrollText size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-teal-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Código</h4>
                <p className="text-[10px] font-bold text-teal-100 uppercase">Lei Seca</p>
             </div>
          </button>
        </div>
      </div>

      {/* SEÇÃO 4: GESTÃO ACADÊMICA */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Gestão Acadêmica</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[180px]">
          {/* CARD 7: CADEIRAS (Medium) */}
          <button
            onClick={() => onNavigate(View.Subjects)}
            className="group col-span-1 md:col-span-2 bg-pink-600 text-white rounded-[2.5rem] p-6 border border-pink-700 shadow-lg hover:shadow-pink-500/30 hover:scale-[1.01] transition-all flex items-center gap-6 relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/polka-dots.png')] opacity-10"></div>
             <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white shrink-0 group-hover:rotate-12 transition-transform relative z-10">
                <BookOpen size={28} />
             </div>
             <div className="text-left relative z-10">
                <h4 className="text-xl font-black uppercase tracking-tight">Cadeiras</h4>
                <p className="text-xs font-medium text-pink-100 leading-snug max-w-xs">
                   Gerencie suas disciplinas, cores e progresso individual.
                </p>
             </div>
             <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                <ArrowUpRight className="text-white" />
             </div>
          </button>

          {/* CARD: CALCULADORA DE FALTAS */}
          <button
            onClick={() => onNavigate(View.AttendanceCalculator)}
            className="group col-span-1 bg-[#dc2626] text-white rounded-[2.5rem] p-6 border border-red-700 shadow-lg hover:shadow-red-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <UserX size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-red-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Faltas</h4>
                <p className="text-[10px] font-bold text-red-100 uppercase">Limite 75%</p>
             </div>
          </button>

          {/* CARD 8: PAUTA */}
          <button
            onClick={() => onNavigate(View.Tasks)}
            className="group col-span-1 bg-teal-600 text-white rounded-[2.5rem] p-6 border border-teal-700 shadow-lg hover:shadow-teal-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkered-pattern.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <CheckSquare size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-teal-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Pauta</h4>
                <p className="text-[10px] font-bold text-teal-100 uppercase">Lista de Tarefas</p>
             </div>
          </button>

          {/* CARD 11: CALCULADORA DE NOTAS */}
          <button
            onClick={() => onNavigate(View.Calculator)}
            className="group col-span-1 bg-amber-500 text-white rounded-[2.5rem] p-6 border border-amber-600 shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brick-wall.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <CalculatorIcon size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-amber-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Calculadora</h4>
                <p className="text-[10px] font-bold text-amber-100 uppercase">Média & Notas</p>
             </div>
          </button>

          {/* CARD 12: ESTATÍSTICAS */}
          <button
            onClick={() => onNavigate(View.Statistics)}
            className="group col-span-1 bg-blue-600 text-white rounded-[2.5rem] p-6 border border-blue-700 shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <BarChart3 size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-blue-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Estatísticas</h4>
                <p className="text-[10px] font-bold text-blue-100 uppercase">Seu Progresso</p>
             </div>
          </button>

          {/* CARD 6: RANKING */}
          <button
            onClick={() => onNavigate(View.Ranking)}
            className="group col-span-1 bg-yellow-500 text-white rounded-[2.5rem] p-6 border border-yellow-600 shadow-lg hover:shadow-yellow-500/30 hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
             <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                   <Trophy size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-yellow-200 group-hover:text-white transition-colors" />
             </div>
             <div className="text-left mt-4 relative z-10">
                <h4 className="text-lg font-black uppercase tracking-tight text-white">Ranking</h4>
                <p className="text-[10px] font-bold text-yellow-100 uppercase">Hall da Fama</p>
             </div>
          </button>

          {/* CARD 10: ARQUIVO MORTO (Wide Footer) */}
          <button
            onClick={() => onNavigate(View.DeadArchive)}
            className="group col-span-1 md:col-span-2 lg:col-span-4 bg-slate-100 dark:bg-[#0d0303] rounded-[2rem] p-4 flex items-center justify-center gap-3 border border-transparent hover:border-slate-300 dark:hover:border-white/10 transition-all opacity-60 hover:opacity-100"
          >
             <Archive size={16} className="text-slate-500" />
             <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Acessar Arquivo Morto (Histórico)</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export default SanFranEssential;
