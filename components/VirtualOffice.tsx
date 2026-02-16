
import React from 'react';
import { StudySession } from '../types';
import { 
  Laptop, 
  Leaf, 
  Award, 
  Library as LibraryIcon, 
  Armchair, 
  Gavel, 
  Scale, 
  LampFloor, 
  Sun, 
  Moon, 
  Frame,
  Lock
} from 'lucide-react';

interface VirtualOfficeProps {
  studySessions: StudySession[];
  userName: string;
}

// Configuração dos Níveis e Itens
const OFFICE_LEVELS = [
  { id: 'bacharel', hours: 0, label: 'Bacharel', items: ['Mesa Simples', 'Cadeira Básica', 'Janela'] },
  { id: 'junior', hours: 20, label: 'Advogado Júnior', items: ['Notebook', 'Planta'] },
  { id: 'pleno', hours: 100, label: 'Advogado Pleno', items: ['Diploma', 'Tapete Persa'] },
  { id: 'senior', hours: 300, label: 'Advogado Sênior', items: ['Biblioteca Completa'] },
  { id: 'socio', hours: 700, label: 'Sócio-Diretor', items: ['Poltrona de Couro', 'Quadro a Óleo', 'Abajur Art Déco'] },
  { id: 'magistrado', hours: 1500, label: 'Magistrado', items: ['Martelo de Juiz', 'Estátua da Justiça'] },
];

const VirtualOffice: React.FC<VirtualOfficeProps> = ({ studySessions, userName }) => {
  // Cálculo de horas totais
  const totalSeconds = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const totalHours = totalSeconds / 3600;

  // Determinar nível atual e próximo
  const currentLevelIndex = [...OFFICE_LEVELS].reverse().findIndex(l => totalHours >= l.hours);
  const currentLevel = OFFICE_LEVELS[OFFICE_LEVELS.length - 1 - currentLevelIndex];
  const nextLevel = OFFICE_LEVELS[OFFICE_LEVELS.length - currentLevelIndex];
  
  // Helpers para verificar desbloqueio
  const hasUnlocked = (hoursNeeded: number) => totalHours >= hoursNeeded;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 px-4 py-2 rounded-full border border-amber-200 dark:border-amber-800/30 mb-4">
              <Armchair className="w-4 h-4 text-amber-700 dark:text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">Espaço Pessoal</span>
           </div>
           <h2 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Escritório Virtual</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Construa seu império jurídico hora após hora.</p>
        </div>
      </header>

      {/* --- CENA DO ESCRITÓRIO --- */}
      <div className="relative w-full aspect-[16/10] md:aspect-[21/9] bg-slate-200 dark:bg-slate-800 rounded-[2rem] border-8 border-slate-800 dark:border-slate-950 shadow-2xl overflow-hidden transition-colors duration-1000 group">
        
        {/* 1. PAREDE (Fundo) */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 transition-colors duration-1000"></div>

        {/* 2. JANELA (Muda com Dark Mode) */}
        <div className="absolute top-[10%] left-[10%] w-[20%] h-[35%] bg-sky-300 dark:bg-indigo-950 border-8 border-white dark:border-slate-700 rounded-lg overflow-hidden shadow-inner transition-colors duration-1000">
           <div className="absolute w-full h-[2px] bg-white dark:bg-slate-700 top-1/2 left-0"></div>
           <div className="absolute h-full w-[2px] bg-white dark:bg-slate-700 top-0 left-1/2"></div>
           <div className="absolute top-2 right-2">
              <Sun className="text-yellow-400 dark:hidden animate-pulse" />
              <Moon className="text-slate-100 hidden dark:block" />
           </div>
           {/* Nuvens / Estrelas CSS */}
           <div className="absolute bottom-2 left-2 w-8 h-8 bg-white/40 rounded-full blur-md dark:hidden"></div>
           <div className="absolute top-4 left-4 w-1 h-1 bg-white rounded-full hidden dark:block animate-ping"></div>
        </div>

        {/* 3. QUADRO / DIPLOMA (Nível Pleno - 100h) */}
        {hasUnlocked(100) && (
           <div className="absolute top-[15%] right-[35%] w-[12%] h-[15%] bg-white dark:bg-slate-200 border-4 border-amber-700 shadow-md flex flex-col items-center justify-center p-1 animate-in zoom-in duration-700">
              <div className="w-full h-1 bg-slate-200 mb-1"></div>
              <div className="w-2/3 h-1 bg-slate-200 mb-1"></div>
              <div className="w-1/2 h-1 bg-red-800 rounded-full mt-1"></div>
           </div>
        )}

        {/* 4. QUADRO A OLEO (Nível Sócio - 700h) */}
        {hasUnlocked(700) && (
           <div className="absolute top-[15%] left-[35%] w-[10%] h-[18%] bg-slate-700 border-4 border-yellow-600 shadow-xl overflow-hidden animate-in fade-in duration-700">
              <div className="w-full h-full bg-gradient-to-tr from-slate-800 to-slate-600 opacity-80 flex items-center justify-center">
                 <Frame className="text-yellow-600/50 w-8 h-8" />
              </div>
           </div>
        )}

        {/* 5. CHÃO */}
        <div className="absolute bottom-0 w-full h-[35%] bg-[#D4B483] dark:bg-[#4E342E] border-t-4 border-[#C19A6B] dark:border-[#3E2723] transition-colors duration-1000"></div>

        {/* 6. TAPETE (Nível Pleno - 100h) */}
        {hasUnlocked(100) && (
           <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[40%] h-[20%] bg-red-900/80 rounded-full blur-[1px] transform scale-x-150 shadow-sm animate-in fade-in duration-700">
              <div className="w-full h-full border-2 border-dashed border-yellow-500/30 rounded-full"></div>
           </div>
        )}

        {/* 7. ESTANTE (Nível Senior - 300h) */}
        {hasUnlocked(300) && (
           <div className="absolute bottom-[25%] right-[5%] w-[18%] h-[55%] bg-amber-900 border-l-4 border-amber-950 shadow-2xl flex flex-col justify-around p-1 animate-in slide-in-from-right duration-700">
              {/* Prateleiras com Livros */}
              {[1, 2, 3, 4].map(i => (
                 <div key={i} className="w-full h-[2px] bg-amber-950 relative">
                    <div className="absolute bottom-0 left-1 flex gap-[2px]">
                       <div className="w-2 h-6 bg-red-700"></div>
                       <div className="w-2 h-7 bg-blue-800"></div>
                       <div className="w-2 h-5 bg-green-800"></div>
                       <div className="w-2 h-6 bg-yellow-900"></div>
                    </div>
                 </div>
              ))}
           </div>
        )}

        {/* 8. PLANTA (Nível Junior - 20h) */}
        {hasUnlocked(20) && (
           <div className="absolute bottom-[25%] left-[5%] w-[8%] h-[20%] flex flex-col items-center animate-in slide-in-from-left duration-700">
              <Leaf className="text-emerald-600 w-12 h-12 -mb-2" fill="currentColor" />
              <div className="w-8 h-8 bg-orange-700 rounded-b-lg shadow-lg"></div>
           </div>
        )}

        {/* 9. ABAJUR (Nível Sócio - 700h) */}
        {hasUnlocked(700) && (
           <div className="absolute bottom-[35%] left-[15%] animate-in fade-in duration-700">
              <LampFloor className="w-24 h-24 text-slate-800 dark:text-slate-400" />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-16 bg-yellow-200/20 blur-xl rounded-full"></div>
           </div>
        )}

        {/* 10. CADEIRA */}
        <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
           {hasUnlocked(700) ? (
              // Poltrona de Couro (Sócio)
              <div className="relative animate-in zoom-in duration-500">
                 <div className="w-24 h-32 bg-slate-800 dark:bg-black rounded-t-[2rem] shadow-xl border-4 border-slate-700"></div>
                 <div className="w-32 h-4 bg-slate-900 absolute bottom-0 -left-4 rounded-full"></div>
              </div>
           ) : (
              // Cadeira Simples (Bacharel)
              <div className="relative">
                 <div className="w-16 h-20 bg-slate-700 rounded-t-lg border-2 border-slate-600"></div>
                 <div className="w-20 h-2 bg-slate-800 absolute bottom-0 -left-2"></div>
              </div>
           )}
        </div>

        {/* 11. MESA (Sempre presente, melhora visualmente) */}
        <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[50%] h-[25%] z-20">
           {/* Tampo */}
           <div className={`w-full h-8 ${hasUnlocked(700) ? 'bg-[#3E2723]' : 'bg-amber-800'} rounded-lg shadow-lg relative flex items-end justify-center px-4`}>
              
              {/* NOTEBOOK (Junior - 20h) */}
              {hasUnlocked(20) && (
                 <div className="absolute bottom-8 left-10">
                    <Laptop className="w-12 h-12 text-slate-800 dark:text-slate-400" fill="currentColor" />
                    {/* Tela brilhando */}
                    <div className="absolute top-2 left-[5px] w-8 h-5 bg-sky-200/80 animate-pulse blur-[1px]"></div>
                 </div>
              )}

              {/* MARTELO (Magistrado - 1500h) */}
              {hasUnlocked(1500) && (
                 <div className="absolute bottom-8 right-20">
                    <Gavel className="w-12 h-12 text-amber-900 rotate-12" fill="currentColor" />
                 </div>
              )}

              {/* ESTÁTUA (Magistrado - 1500h) */}
              {hasUnlocked(1500) && (
                 <div className="absolute bottom-8 right-4">
                    <Scale className="w-16 h-16 text-yellow-600" fill="currentColor" />
                 </div>
              )}

           </div>
           {/* Pernas / Corpo da Mesa */}
           <div className="flex justify-between w-[90%] mx-auto">
              <div className={`w-4 h-24 ${hasUnlocked(700) ? 'bg-[#281815]' : 'bg-amber-900'}`}></div>
              <div className={`w-4 h-24 ${hasUnlocked(700) ? 'bg-[#281815]' : 'bg-amber-900'}`}></div>
           </div>
        </div>

      </div>

      {/* --- BARRA DE PROGRESSO & STATUS --- */}
      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
         <div className="flex items-center justify-between mb-4">
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nível Atual</p>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">{currentLevel.label}</h3>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Horas Acumuladas</p>
               <p className="text-2xl font-black text-sanfran-rubi tabular-nums">{totalHours.toFixed(1)}h</p>
            </div>
         </div>

         <div className="relative w-full h-4 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden mb-6">
            {nextLevel ? (
               <div 
                  className="h-full bg-sanfran-rubi transition-all duration-1000"
                  style={{ width: `${Math.min(100, (totalHours / nextLevel.hours) * 100)}%` }}
               />
            ) : (
               <div className="h-full bg-gradient-to-r from-usp-gold to-sanfran-rubi w-full animate-pulse" />
            )}
         </div>

         {nextLevel ? (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
               <div className="flex items-center gap-3">
                  <div className="bg-slate-200 dark:bg-white/10 p-2 rounded-lg">
                     <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Próximo Desbloqueio</p>
                     <p className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase">{nextLevel.label} ({nextLevel.hours}h)</p>
                  </div>
               </div>
               <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Itens:</p>
                  <p className="text-xs font-bold text-sanfran-rubi">{nextLevel.items.join(', ')}</p>
               </div>
            </div>
         ) : (
            <div className="text-center p-4 bg-usp-gold/10 rounded-2xl border border-usp-gold/20">
               <Award className="w-6 h-6 text-usp-gold mx-auto mb-2" />
               <p className="text-sm font-black text-usp-gold uppercase">Escritório Completo - Nível Máximo</p>
            </div>
         )}
      </div>

      {/* --- LEGENDA DE ITENS --- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
         {OFFICE_LEVELS.map((level) => {
            const unlocked = totalHours >= level.hours;
            return (
               <div key={level.id} className={`p-4 rounded-2xl border text-center transition-all ${unlocked ? 'bg-white dark:bg-white/5 border-emerald-500/30 shadow-md' : 'bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 opacity-60 grayscale'}`}>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{level.hours}h</p>
                  <p className={`text-[10px] font-bold uppercase mb-2 ${unlocked ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{level.label}</p>
                  <div className="flex flex-wrap justify-center gap-1">
                     {unlocked && <CheckCircleIcon className="w-4 h-4 text-emerald-500" />}
                  </div>
               </div>
            );
         })}
      </div>
    </div>
  );
};

// Ícone auxiliar
const CheckCircleIcon = (props: any) => (
   <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

export default VirtualOffice;
