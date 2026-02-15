
import React from 'react';
import { Award, Sun, Moon, Gavel, Book, Zap, Shield, Star, Trophy, GraduationCap, Scale } from 'lucide-react';

export interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  isUnlocked: boolean;
  color: string;
}

interface BadgeGalleryProps {
  badges: BadgeData[];
}

const BadgeGallery: React.FC<BadgeGalleryProps> = ({ badges }) => {
  const unlockedCount = badges.filter(b => b.isUnlocked).length;

  return (
    <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-6 md:p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Trophy size={120} className="text-usp-gold" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-3">
            <Award className="text-usp-gold" /> Galeria de Honra
          </h3>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Medalhas de Excelência Acadêmica</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 px-6 py-3 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center gap-4">
           <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mérito Acumulado</span>
           <span className="text-2xl font-black text-sanfran-rubi">{unlockedCount} / {badges.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 relative z-10">
        {badges.map((badge) => (
          <div 
            key={badge.id} 
            className={`group relative flex flex-col items-center text-center transition-all duration-500 ${badge.isUnlocked ? 'scale-100 opacity-100' : 'scale-95 opacity-40 grayscale hover:grayscale-0'}`}
          >
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center relative mb-3 transition-transform group-hover:rotate-12 ${badge.isUnlocked ? 'bg-white dark:bg-white/5 shadow-2xl border-4 border-slate-50 dark:border-sanfran-rubi/30' : 'bg-slate-100 dark:bg-black/20 border-2 border-dashed border-slate-200 dark:border-white/5'}`}>
               <badge.icon className={`w-10 h-10 md:w-12 md:h-12 ${badge.isUnlocked ? badge.color : 'text-slate-300'}`} />
               {badge.isUnlocked && (
                 <div className="absolute -top-1 -right-1 bg-usp-gold text-white p-1 rounded-full border-2 border-white dark:border-sanfran-rubiBlack shadow-lg">
                    <Star size={10} fill="currentColor" />
                 </div>
               )}
            </div>
            <h4 className="text-[10px] md:text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-tight leading-none mb-1">{badge.name}</h4>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight px-2">{badge.description}</p>
            
            {!badge.isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="bg-slate-900/80 text-white text-[8px] font-black uppercase tracking-widest py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity translate-y-10 group-hover:translate-y-0">Bloqueado</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgeGallery;
