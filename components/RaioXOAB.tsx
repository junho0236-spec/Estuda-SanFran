
import React, { useState } from 'react';
import { PieChart, TrendingUp, AlertTriangle, BookOpen, ChevronDown, ChevronUp, Scale, Gavel, Landmark, Briefcase } from 'lucide-react';

interface SubjectInfo {
  name: string;
  questions: number;
  weight: string; // High, Medium, Low
  topics: string[];
  icon: React.ElementType;
  color: string;
}

const OAB_DATA: SubjectInfo[] = [
  { name: 'Ética Profissional', questions: 8, weight: 'Alta', topics: ['Direitos e Prerrogativas', 'Infrações e Sanções', 'Honorários Advocatícios'], icon: BookOpen, color: 'text-sanfran-rubi' },
  { name: 'Direito Civil', questions: 7, weight: 'Alta', topics: ['Das Obrigações', 'Contratos em Espécie', 'Direito das Famílias'], icon: Scale, color: 'text-indigo-500' },
  { name: 'Processo Civil', questions: 7, weight: 'Alta', topics: ['Recursos', 'Execução', 'Procedimento Comum'], icon: Scale, color: 'text-indigo-500' },
  { name: 'Direito Constitucional', questions: 7, weight: 'Alta', topics: ['Controle de Constitucionalidade', 'Organização do Estado', 'Direitos Fundamentais'], icon: Landmark, color: 'text-yellow-500' },
  { name: 'Direito Administrativo', questions: 6, weight: 'Média', topics: ['Agentes Públicos', 'Licitações e Contratos', 'Intervenção do Estado'], icon: Landmark, color: 'text-yellow-500' },
  { name: 'Direito Penal', questions: 6, weight: 'Média', topics: ['Teoria da Pena', 'Crimes em Espécie', 'Tipicidade'], icon: Gavel, color: 'text-red-500' },
  { name: 'Processo Penal', questions: 6, weight: 'Média', topics: ['Prisões e Liberdade', 'Recursos', 'Inquérito Policial'], icon: Gavel, color: 'text-red-500' },
  { name: 'Direito do Trabalho', questions: 6, weight: 'Média', topics: ['Contrato de Trabalho', 'Remuneração', 'Rescisão'], icon: Briefcase, color: 'text-emerald-500' },
  { name: 'Processo do Trabalho', questions: 5, weight: 'Média', topics: ['Recursos Trabalhistas', 'Execução', 'Rito Sumaríssimo'], icon: Briefcase, color: 'text-emerald-500' },
  { name: 'Direito Tributário', questions: 5, weight: 'Média', topics: ['Impostos em Espécie', 'Crédito Tributário', 'Princípios'], icon: TrendingUp, color: 'text-blue-500' },
  { name: 'Direito Empresarial', questions: 5, weight: 'Média', topics: ['Sociedades', 'Falência e Recuperação', 'Títulos de Crédito'], icon: Briefcase, color: 'text-blue-500' },
];

const RaioXOAB: React.FC = () => {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const toggleExpand = (name: string) => {
    setExpandedSubject(expandedSubject === name ? null : name);
  };

  const totalQuestions = 80;

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto pb-20 px-4 md:px-0">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8 py-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/20 mb-4">
              <PieChart className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Inteligência de Prova</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Raio-X FGV</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Mapeamento estratégico das 80 questões.</p>
        </div>
        
        <div className="bg-white dark:bg-sanfran-rubiDark/30 px-6 py-4 rounded-2xl border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg max-w-xs">
           <div className="flex items-start gap-3">
              <AlertTriangle className="text-orange-500 shrink-0" size={20} />
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                 O "Grupo A" (Ética + as 6 grandes) representa quase 60% da prova. Foque aqui para garantir os 40 pontos.
              </p>
           </div>
        </div>
      </header>

      {/* LISTA ESTRATÉGICA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
         {OAB_DATA.map((subject, idx) => {
            const isExpanded = expandedSubject === subject.name;
            const percentage = Math.round((subject.questions / totalQuestions) * 100);
            
            return (
               <div 
                 key={idx}
                 onClick={() => toggleExpand(subject.name)}
                 className={`bg-white dark:bg-sanfran-rubiDark/20 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${isExpanded ? 'border-sanfran-rubi shadow-xl ring-2 ring-sanfran-rubi/10' : 'border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'}`}
               >
                  <div className="p-5 flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isExpanded ? 'bg-sanfran-rubi text-white' : 'bg-slate-50 dark:bg-white/5 text-slate-400'}`}>
                        <subject.icon size={20} />
                     </div>
                     
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                           <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white truncate">{subject.name}</h3>
                           <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${subject.weight === 'Alta' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              Prioridade {subject.weight}
                           </span>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex-1 h-2 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden">
                              <div className={`h-full ${subject.color.replace('text', 'bg')}`} style={{ width: `${(subject.questions / 8) * 100}%` }}></div>
                           </div>
                           <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{subject.questions} Questões ({percentage}%)</span>
                        </div>
                     </div>

                     <div className="text-slate-300">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                     </div>
                  </div>

                  {isExpanded && (
                     <div className="bg-slate-50 dark:bg-black/20 p-5 border-t border-slate-100 dark:border-white/5 animate-in slide-in-from-top-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                           <TrendingUp size={12} /> Top 3 Temas Recorrentes
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                           {subject.topics.map((topic, tIdx) => (
                              <div key={tIdx} className="bg-white dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-center">
                                 <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{topic}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
            );
         })}
      </div>

    </div>
  );
};

export default RaioXOAB;
