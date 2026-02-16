
import React, { useMemo } from 'react';
import { Landmark, Scale, Gavel, Briefcase, Star, CheckCircle2, BookOpen, AlertCircle } from 'lucide-react';
import { Subject, StudySession } from '../types';

interface DominioJuridicoProps {
  subjects: Subject[];
  studySessions: StudySession[];
}

const GRANDES_AREAS = [
  { id: 'civil', name: 'Direito Civil & Processual', icon: Scale, keywords: ['civil', 'cpc', 'processo civil', 'família', 'sucessões', 'consumidor', 'contratos'], color: 'text-usp-blue', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800' },
  { id: 'penal', name: 'Ciências Penais', icon: Gavel, keywords: ['penal', 'cpp', 'processo penal', 'criminal', 'inquérito'], color: 'text-sanfran-rubi', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  { id: 'publico', name: 'Direito Público', icon: Landmark, keywords: ['const', 'adm', 'tribut', 'public', 'estado', 'eleitoral'], color: 'text-usp-gold', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
  { id: 'corporativo', name: 'Direito Corporativo', icon: Briefcase, keywords: ['emp', 'trab', 'econ', 'comercial', 'societário', 'clt'], color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
];

const TIERS = {
  dominated: { label: 'Dominado', hours: 25, icon: Star, color: 'text-yellow-500' },
  settled: { label: 'Colonizado', hours: 10, icon: CheckCircle2, color: 'text-emerald-500' },
  explored: { label: 'Explorado', hours: 1, icon: BookOpen, color: 'text-blue-500' },
  locked: { label: 'Não Iniciado', hours: 0, icon: null, color: '' },
};

const DominioJuridico: React.FC<DominioJuridicoProps> = ({ subjects, studySessions }) => {

  const processedData = useMemo(() => {
    // 1. Calcular horas totais por matéria
    const hoursBySubject: Record<string, number> = {};
    subjects.forEach(s => hoursBySubject[s.id] = 0);
    studySessions.forEach(session => {
      if (session.subject_id && hoursBySubject[session.subject_id] !== undefined) {
        hoursBySubject[session.subject_id] += (Number(session.duration) || 0) / 3600;
      }
    });

    const getStatus = (hours: number): keyof typeof TIERS => {
      if (hours >= TIERS.dominated.hours) return 'dominated';
      if (hours >= TIERS.settled.hours) return 'settled';
      if (hours > 0) return 'explored';
      return 'locked';
    };

    // 2. Agrupar matérias nas grandes áreas
    let totalTerritories = 0;
    let conqueredTerritories = 0;

    const groupedData = GRANDES_AREAS.map(area => {
      const areaSubjects = subjects
        .filter(sub => area.keywords.some(k => sub.name.toLowerCase().includes(k)))
        .map(sub => {
          const hours = hoursBySubject[sub.id] || 0;
          const status = getStatus(hours);
          totalTerritories++;
          if (status !== 'locked') conqueredTerritories++;
          return {
            ...sub,
            hours: hours.toFixed(1),
            status,
          };
        })
        .sort((a, b) => b.hours - a.hours);

      return {
        ...area,
        subjects: areaSubjects,
      };
    });
    
    const overallProgress = totalTerritories > 0 ? (conqueredTerritories / totalTerritories) * 100 : 0;

    return { groupedData, overallProgress };
  }, [subjects, studySessions]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 px-4 py-2 rounded-full border border-amber-200 dark:border-amber-800 mb-4">
              <Landmark className="w-4 h-4 text-amber-700 dark:text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">Mapa de Conhecimento</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Domínio Jurídico</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Visualize sua expansão pelas terras do Direito.</p>
        </div>
      </header>
      
      {/* Overall Progress */}
      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
         <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Domínio Global</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{Math.round(processedData.overallProgress)}%</span>
         </div>
         <div className="h-4 bg-slate-100 dark:bg-black/20 rounded-full overflow-hidden p-1 shadow-inner">
            <div className="h-full bg-gradient-to-r from-usp-gold to-amber-400 rounded-full transition-all duration-1000" style={{ width: `${processedData.overallProgress}%` }} />
         </div>
      </div>

      {subjects.length === 0 && (
          <div className="py-20 text-center border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem] flex flex-col items-center gap-6">
             <AlertCircle className="w-16 h-16 text-slate-200 dark:text-white/5" />
             <div className="space-y-1">
               <p className="text-xl font-black text-slate-300 dark:text-slate-700 uppercase">Mapa em Branco</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cadastre suas 'Cadeiras' para começar a mapear seu conhecimento.</p>
             </div>
          </div>
      )}

      {/* Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {processedData.groupedData.map(area => (
           <div key={area.id} className={`p-8 rounded-[2.5rem] border-2 shadow-2xl ${area.bg} ${area.border}`}>
              <div className="flex items-center gap-4 mb-8">
                 <div className={`p-4 rounded-2xl bg-white/50 dark:bg-black/20 shadow-lg ${area.color}`}>
                    <area.icon size={24} />
                 </div>
                 <div>
                    <h3 className={`text-2xl font-black uppercase tracking-tight ${area.color}`}>{area.name}</h3>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 {area.subjects.length === 0 && (
                    <p className="col-span-full text-center text-xs font-bold uppercase text-slate-400 py-8">Nenhuma matéria desta área cadastrada.</p>
                 )}
                 {area.subjects.map(sub => {
                    const statusInfo = TIERS[sub.status];
                    const opacity = sub.status === 'locked' ? 'opacity-40 grayscale' : 'opacity-100';
                    const borderColor = sub.status === 'dominated' ? 'border-yellow-400' : 'border-slate-200 dark:border-white/10';

                    return (
                       <div 
                         key={sub.id} 
                         className={`group relative bg-white dark:bg-sanfran-rubiDark/40 p-4 rounded-2xl border-2 ${borderColor} shadow-lg transition-all hover:scale-105 ${opacity}`}
                         title={`${sub.hours} horas estudadas`}
                       >
                          <div className="flex justify-between items-start mb-2">
                             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                             {statusInfo.icon && <statusInfo.icon size={14} className={statusInfo.color} />}
                          </div>
                          <p className="text-xs font-black uppercase text-slate-900 dark:text-white leading-tight mb-2 truncate">{sub.name}</p>
                          <div className="text-[9px] font-bold uppercase" style={{ color: statusInfo.color || '#9ca3af' }}>
                             {statusInfo.label}
                          </div>
                       </div>
                    );
                 })}
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default DominioJuridico;
