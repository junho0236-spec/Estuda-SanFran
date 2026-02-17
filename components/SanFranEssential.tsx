
import React from 'react';
import { 
  BrainCircuit, 
  Timer, 
  Calendar, 
  Trophy, 
  BookOpen, 
  CheckSquare, 
  Archive, 
  Calculator, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { View } from '../types';

interface SanFranEssentialProps {
  onNavigate: (view: View) => void;
}

interface EssentialTool {
  id: View;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}

const TOOLS: EssentialTool[] = [
  {
    id: View.Anki,
    title: 'Flashcards',
    description: 'Sistema de repetição espaçada para memorização da doutrina e lei seca.',
    icon: BrainCircuit,
    color: 'text-usp-blue',
    bg: 'bg-cyan-50 dark:bg-cyan-900/10',
    border: 'border-cyan-100 dark:border-cyan-800'
  },
  {
    id: View.Timer,
    title: 'Timer Pomodoro',
    description: 'Cronômetro de foco para sessões de estudo intenso e intervalos.',
    icon: Timer,
    color: 'text-sanfran-rubi',
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-100 dark:border-red-800'
  },
  {
    id: View.Calendar,
    title: 'Agenda Acadêmica',
    description: 'Calendário de aulas, provas e prazos processuais simulados.',
    icon: Calendar,
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-900/10',
    border: 'border-violet-100 dark:border-violet-800'
  },
  {
    id: View.Ranking,
    title: 'Ranking Geral',
    description: 'Hall da fama dos acadêmicos mais dedicados do Largo.',
    icon: Trophy,
    color: 'text-usp-gold',
    bg: 'bg-yellow-50 dark:bg-yellow-900/10',
    border: 'border-yellow-100 dark:border-yellow-800'
  },
  {
    id: View.Subjects,
    title: 'Cadeiras',
    description: 'Gestão das disciplinas matriculadas e suas cores.',
    icon: BookOpen,
    color: 'text-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-900/10',
    border: 'border-pink-100 dark:border-pink-800'
  },
  {
    id: View.Tasks,
    title: 'Pauta de Tarefas',
    description: 'Lista de pendências, petições e leituras obrigatórias.',
    icon: CheckSquare,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    border: 'border-emerald-100 dark:border-emerald-800'
  },
  {
    id: View.DeadArchive,
    title: 'Arquivo Morto',
    description: 'Histórico de itens concluídos ou descartados.',
    icon: Archive,
    color: 'text-slate-600',
    bg: 'bg-slate-100 dark:bg-slate-800/30',
    border: 'border-slate-200 dark:border-slate-700'
  },
  {
    id: View.Calculator,
    title: 'Médias USP',
    description: 'Simulador de notas para aprovação (Média 5.0).',
    icon: Calculator,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-900/10',
    border: 'border-indigo-100 dark:border-indigo-800'
  }
];

const SanFranEssential: React.FC<SanFranEssentialProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-700 dark:border-white/20 mb-4 shadow-lg">
              <Sparkles className="w-4 h-4 text-usp-gold" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Ferramentas Fundamentais</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">SanFran Essential</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">O kit de sobrevivência do acadêmico de Direito.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onNavigate(tool.id)}
            className={`group relative p-8 rounded-[2.5rem] border-2 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between h-[280px] bg-white dark:bg-sanfran-rubiDark/20 ${tool.border}`}
          >
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner mb-6 ${tool.bg}`}>
               <tool.icon className={`w-8 h-8 ${tool.color}`} />
            </div>
            
            <div className="space-y-2">
               <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{tool.title}</h3>
               <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {tool.description}
               </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0" style={{ color: tool.color.replace('text-', '') }}>
               Acessar <ArrowRight size={12} />
            </div>
          </button>
        ))}
      </div>

    </div>
  );
};

export default SanFranEssential;
