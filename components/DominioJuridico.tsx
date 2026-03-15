import React, { useMemo } from 'react';
import { Landmark, Scale, Gavel, Briefcase, Star, CheckCircle2, BookOpen, AlertCircle, Trophy, Target, Zap, Shield, Award, Map as MapIcon, Compass, Loader2 } from 'lucide-react';
import { Subject, StudySession } from '../types';
import { 
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip
} from 'recharts';
import { motion } from 'motion/react';

interface DominioJuridicoProps {
  subjects: Subject[];
  studySessions: StudySession[];
}

const GRANDES_AREAS = [
  { id: 'civil', name: 'Direito Civil & Processual', icon: Scale, keywords: ['civil', 'cpc', 'processo civil', 'família', 'sucessões', 'consumidor', 'contratos'], color: '#005594', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800', accent: 'text-cyan-600' },
  { id: 'penal', name: 'Ciências Penais', icon: Gavel, keywords: ['penal', 'cpp', 'processo penal', 'criminal', 'inquérito'], color: '#8B0000', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', accent: 'text-red-600' },
  { id: 'publico', name: 'Direito Público', icon: Landmark, keywords: ['const', 'adm', 'tribut', 'public', 'estado', 'eleitoral'], color: '#D4AF37', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', accent: 'text-yellow-600' },
  { id: 'corporativo', name: 'Direito Corporativo', icon: Briefcase, keywords: ['emp', 'trab', 'econ', 'comercial', 'societário', 'clt'], color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', accent: 'text-emerald-600' },
];

const TIERS = {
  dominated: { label: 'Dominado', hours: 25, icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  settled: { label: 'Colonizado', hours: 10, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  explored: { label: 'Explorado', hours: 1, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  locked: { label: 'Não Iniciado', hours: 0, icon: null, color: 'text-slate-400', bg: 'bg-slate-100' },
};

const ARCHETYPES = [
  { name: 'O Civilista', description: 'Mestre das relações privadas e do patrimônio.', condition: (stats: any) => stats.civil > 50, icon: Shield, color: 'from-blue-600 to-cyan-500' },
  { name: 'O Criminalista', description: 'Defensor ferrenho das garantias fundamentais.', condition: (stats: any) => stats.penal > 50, icon: Gavel, color: 'from-red-700 to-orange-600' },
  { name: 'O Publicista', description: 'Guardião da Constituição e do interesse público.', condition: (stats: any) => stats.publico > 50, icon: Landmark, color: 'from-yellow-600 to-amber-500' },
  { name: 'O Corporativista', description: 'Estrategista do mercado e das relações de trabalho.', condition: (stats: any) => stats.corporativo > 50, icon: Briefcase, color: 'from-emerald-600 to-teal-500' },
  { name: 'O Jurista Polímata', description: 'Equilíbrio perfeito entre todas as artes jurídicas.', condition: (stats: any) => true, icon: Scale, color: 'from-slate-800 to-slate-600' },
];

const DominioJuridico: React.FC<DominioJuridicoProps> = ({ subjects, studySessions }) => {

  const processedData = useMemo(() => {
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

    let totalTerritories = 0;
    let conqueredTerritories = 0;
    const areaHours: Record<string, number> = { civil: 0, penal: 0, publico: 0, corporativo: 0 };

    const groupedData = GRANDES_AREAS.map(area => {
      const areaSubjects = subjects
        .filter(sub => area.keywords.some(k => sub.name.toLowerCase().includes(k)))
        .map(sub => {
          const hours = hoursBySubject[sub.id] || 0;
          const status = getStatus(hours);
          totalTerritories++;
          if (status !== 'locked') conqueredTerritories++;
          areaHours[area.id] += hours;
          return {
            ...sub,
            hours: hours,
            status,
          };
        })
        .sort((a, b) => b.hours - a.hours);

      return {
        ...area,
        subjects: areaSubjects,
        totalHours: areaHours[area.id],
      };
    });
    
    const overallProgress = totalTerritories > 0 ? (conqueredTerritories / totalTerritories) * 100 : 0;
    const totalHoursAll = Object.values(areaHours).reduce((a, b) => a + b, 0);
    
    const areaPercentages = totalHoursAll > 0 
      ? Object.fromEntries(Object.entries(areaHours).map(([k, v]) => [k, (v / totalHoursAll) * 100]))
      : { civil: 0, penal: 0, publico: 0, corporativo: 0 };

    const archetype = ARCHETYPES.find(a => a.condition(areaPercentages)) || ARCHETYPES[ARCHETYPES.length - 1];

    const radarData = GRANDES_AREAS.map(area => ({
      subject: area.name.split(' ')[1] || area.name,
      fullMark: 100,
      A: Math.min(100, (areaHours[area.id] / 20) * 100), // Normalizado para 20h como "full"
    }));

    return { groupedData, overallProgress, archetype, radarData, totalHoursAll, conqueredTerritories, totalTerritories };
  }, [subjects, studySessions]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 px-4 py-2 rounded-full border border-amber-200 dark:border-amber-800"
           >
              <Compass className="w-4 h-4 text-amber-700 dark:text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">Cartografia Jurídica Avançada</span>
           </motion.div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Domínio Jurídico</h2>
           <p className="text-slate-500 font-bold italic text-xl max-w-2xl">Sua jornada intelectual mapeada em tempo real. Cada hora de estudo expande suas fronteiras.</p>
        </div>

        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={`p-6 rounded-[2.5rem] bg-gradient-to-br ${processedData.archetype.color} text-white shadow-2xl shadow-slate-500/20 flex items-center gap-4 border border-white/20`}
          >
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <processedData.archetype.icon size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Arquétipo Atual</p>
              <h3 className="text-xl font-black tracking-tight">{processedData.archetype.name}</h3>
            </div>
          </motion.div>
        </div>
      </header>
      
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Radar Chart Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-8">
          <div className="w-full h-[300px] md:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={processedData.radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                <Radar
                  name="Domínio"
                  dataKey="A"
                  stroke="#8B0000"
                  fill="#8B0000"
                  fillOpacity={0.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Equilíbrio de Poder</h3>
              <p className="text-sm text-slate-500 font-medium">O gráfico de radar mostra sua versatilidade. Um jurista completo busca preencher todos os quadrantes.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Total de Horas</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{Math.round(processedData.totalHoursAll)}h</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Territórios</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{processedData.conqueredTerritories}/{processedData.totalTerritories}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Card */}
        <div className="bg-slate-900 text-white p-8 rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-sanfran-rubi/20 rounded-full blur-3xl group-hover:bg-sanfran-rubi/40 transition-all duration-700" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div className="p-4 bg-white/10 rounded-2xl">
                <Target size={32} className="text-sanfran-rubi" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progresso Geral</p>
                <p className="text-5xl font-black text-white tracking-tighter">{Math.round(processedData.overallProgress)}%</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${processedData.overallProgress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-sanfran-rubi to-red-400 rounded-full" 
                />
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Você já explorou {processedData.conqueredTerritories} das {processedData.totalTerritories} áreas fundamentais do seu currículo acadêmico.</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center">
                  <Award size={14} className="text-usp-gold" />
                </div>
              ))}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-500">3 Conquistas Pendentes</p>
          </div>
        </div>
      </div>

      {subjects.length === 0 && (
          <div className="py-24 text-center border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[4rem] flex flex-col items-center gap-8 bg-slate-50/50 dark:bg-white/2">
             <div className="p-8 bg-white dark:bg-white/5 rounded-[2.5rem] shadow-xl">
                <MapIcon className="w-20 h-20 text-slate-200 dark:text-white/10" />
             </div>
             <div className="space-y-3">
               <h3 className="text-3xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter">Terra Incognita</h3>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest max-w-md mx-auto">Seu mapa está em branco. Adicione disciplinas para começar a colonizar o conhecimento jurídico.</p>
             </div>
          </div>
      )}

      {/* Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {processedData.groupedData.map(area => (
           <motion.div 
             key={area.id} 
             whileHover={{ y: -5 }}
             className={`p-10 rounded-[3.5rem] border-2 shadow-2xl transition-all duration-500 ${area.bg} ${area.border} relative overflow-hidden group`}
           >
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 dark:bg-black/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              
              <div className="flex items-center justify-between mb-10 relative z-10">
                <div className="flex items-center gap-6">
                   <div className={`p-5 rounded-3xl bg-white dark:bg-black/20 shadow-xl ${area.accent}`}>
                      <area.icon size={32} />
                   </div>
                   <div>
                      <h3 className={`text-3xl font-black uppercase tracking-tighter ${area.accent}`}>{area.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{Math.round(area.totalHours)} horas totais</p>
                   </div>
                </div>
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl border border-white/50 dark:border-white/5">
                  <Zap size={20} className={area.accent} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                 {area.subjects.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400/50 gap-4">
                      <div className="w-12 h-12 border-2 border-dashed border-current rounded-full" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Fronteira não explorada</p>
                    </div>
                 )}
                 {area.subjects.map(sub => {
                    const statusInfo = TIERS[sub.status];
                    const isLocked = sub.status === 'locked';
                    const opacity = isLocked ? 'opacity-40 grayscale' : 'opacity-100';
                    const borderColor = sub.status === 'dominated' ? 'border-yellow-400 shadow-yellow-500/10' : 'border-slate-200/50 dark:border-white/5';
                    const bgClass = isLocked ? 'bg-slate-50/50 dark:bg-black/10' : 'bg-white dark:bg-white/5';

                    return (
                       <motion.div 
                         key={sub.id} 
                         whileHover={{ scale: 1.02 }}
                         className={`group relative ${bgClass} p-5 rounded-3xl border-2 ${borderColor} shadow-lg transition-all ${opacity} cursor-default`}
                       >
                          <div className="flex justify-between items-start mb-4">
                             <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: sub.color }} />
                             {statusInfo.icon && (
                               <div className={`p-1.5 rounded-lg ${statusInfo.bg}`}>
                                 <statusInfo.icon size={14} className={statusInfo.color} />
                               </div>
                             )}
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-sm font-black uppercase text-slate-900 dark:text-white leading-tight truncate">{sub.name}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: statusInfo.color }}>
                                {statusInfo.label}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                {Number(sub.hours).toFixed(1)}h
                              </span>
                            </div>
                          </div>

                          {/* Mini Progress Bar for each subject */}
                          {!isLocked && (
                            <div className="mt-3 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-slate-400/30 rounded-full" 
                                style={{ width: `${Math.min(100, (sub.hours / TIERS.dominated.hours) * 100)}%`, backgroundColor: sub.color }} 
                              />
                            </div>
                          )}
                       </motion.div>
                    );
                 })}
              </div>
           </motion.div>
         ))}
      </div>
    </div>
  );
};

export default DominioJuridico;
