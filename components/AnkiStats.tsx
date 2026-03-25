import React from 'react';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';

export const MascotEvolution = ({ level, xp }: { level: number, xp: number }) => {
  const mascotStates = [
    { title: 'Estagiário', icon: '👶', description: 'Começando a jornada jurídica.', range: '0-100 XP' },
    { title: 'Advogado', icon: '⚖️', description: 'Já domina os prazos e petições.', range: '100-500 XP' },
    { title: 'Procurador', icon: '🏛️', description: 'Defendendo o interesse público.', range: '500-1500 XP' },
    { title: 'Juiz', icon: '👨‍⚖️', description: 'Decidindo o destino das lides.', range: '1500-4000 XP' },
    { title: 'Ministro', icon: '👑', description: 'O ápice da carreira jurídica.', range: '4000+ XP' }
  ];

  const currentMascot = mascotStates[level - 1] || mascotStates[0];
  const nextXp = level === 1 ? 100 : (level === 2 ? 500 : (level === 3 ? 1500 : 4000));
  const progress = Math.min(100, (xp / nextXp) * 100);

  return (
    <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
      <div className="w-16 h-16 bg-sanfran-rubi/10 rounded-full flex items-center justify-center text-3xl animate-bounce">
        {currentMascot.icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest">{currentMascot.title}</h4>
          <span className="text-[10px] font-bold text-sanfran-rubi">{xp} XP</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-sanfran-rubi"
          />
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">{currentMascot.description}</p>
      </div>
    </div>
  );
};

export const LeagueProgress = ({ division, weeklyCards }: { division: string, weeklyCards: number }) => {
  const divisions = [
    { name: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-100', min: 0 },
    { name: 'Prata', color: 'text-slate-400', bg: 'bg-slate-100', min: 100 },
    { name: 'Ouro', color: 'text-usp-gold', bg: 'bg-yellow-100', min: 300 },
    { name: 'Diamante', color: 'text-blue-500', bg: 'bg-blue-100', min: 700 }
  ];

  const currentDiv = divisions.find(d => d.name === division) || divisions[0];
  const nextDiv = divisions[divisions.indexOf(currentDiv) + 1];
  const progress = nextDiv ? Math.min(100, (weeklyCards / nextDiv.min) * 100) : 100;

  return (
    <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 ${currentDiv.bg} rounded-lg ${currentDiv.color}`}>
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-slate-800 dark:text-white uppercase text-[10px] tracking-widest">Liga Semanal</h4>
            <span className={`text-xs font-bold ${currentDiv.color}`}>{currentDiv.name}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-slate-800 dark:text-white">{weeklyCards}</span>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Cards Revisados</p>
        </div>
      </div>
      {nextDiv && (
        <div className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
            <span>Progresso para {nextDiv.name}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full ${currentDiv.color.replace('text', 'bg')}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
