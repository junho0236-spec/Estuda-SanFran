
import React from 'react';
import { 
  Monitor, 
  Lamp, 
  Award, 
  Library, 
  Armchair, 
  Flower2, 
  Coffee, 
  Gavel, 
  Landmark, 
  BookOpen, 
  Briefcase, 
  Scale, 
  Sun, 
  Moon,
  Frame
} from 'lucide-react';

interface VirtualOfficeProps {
  totalHours: number;
}

const VirtualOffice: React.FC<VirtualOfficeProps> = ({ totalHours }) => {
  // Configuração dos Níveis de Desbloqueio
  const unlocks = {
    junior: totalHours >= 20,    // Adiciona Notebook e Planta
    pleno: totalHours >= 100,    // Diploma na parede e Tapete
    senior: totalHours >= 300,   // Estante de Livros
    socio: totalHours >= 700,    // Poltrona de Chefe, Quadro, Abajur
    magistrado: totalHours >= 1500 // Martelo, Balança/Estátua
  };

  const getRankName = () => {
    if (unlocks.magistrado) return "Gabinete do Magistrado";
    if (unlocks.socio) return "Sala do Sócio-Diretor";
    if (unlocks.senior) return "Escritório Sênior";
    if (unlocks.pleno) return "Escritório Pleno";
    if (unlocks.junior) return "Mesa do Associado";
    return "Canto de Estudos do Bacharel";
  };

  return (
    <div className="w-full relative overflow-hidden rounded-[2.5rem] shadow-2xl transition-all duration-500 border border-slate-200 dark:border-sanfran-rubi/30 group bg-white dark:bg-[#1a1010]">
      
      {/* --- CENÁRIO (FUNDO) --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Parede */}
        <div className="h-[65%] w-full bg-[#f0f4f8] dark:bg-[#2a1d1d] border-b-[16px] border-[#e2e8f0] dark:border-[#3d2b2b] relative transition-colors duration-500">
           {/* Janela (Muda dia/noite via CSS parent dark mode) */}
           <div className="absolute top-10 right-8 md:right-20 w-24 h-32 md:w-40 md:h-48 bg-sky-200 dark:bg-slate-900 border-8 border-white dark:border-[#4d3b3b] rounded-t-full overflow-hidden shadow-inner">
              <div className="absolute top-4 right-4 text-yellow-400 dark:text-slate-200 animate-pulse">
                 <div className="dark:hidden"><Sun size={24} /></div>
                 <div className="hidden dark:block"><Moon size={24} /></div>
              </div>
              <div className="absolute bottom-0 w-full h-1/3 bg-sky-300 dark:bg-slate-800"></div> {/* Paisagem */}
              <div className="absolute bottom-0 w-full h-full border-r-4 border-white/50 left-1/2 -translate-x-1/2"></div>
              <div className="absolute top-1/2 w-full h-full border-t-4 border-white/50"></div>
           </div>

           {/* Itens de Parede */}
           {unlocks.pleno && (
             <div className="absolute top-16 left-1/4 transform -translate-x-1/2 animate-in fade-in zoom-in duration-700">
               <div className="bg-white p-2 shadow-lg border-4 border-amber-900 rounded-lg" title="Diploma de Ordem">
                  <Award size={32} className="text-sanfran-rubi" />
                  <div className="h-1 w-full bg-slate-200 mt-1"></div>
                  <div className="h-1 w-2/3 bg-slate-200 mt-0.5"></div>
               </div>
             </div>
           )}

           {unlocks.socio && (
             <div className="absolute top-20 left-10 md:left-24 animate-in fade-in slide-in-from-top-4 duration-700 delay-200">
                <div className="bg-[#2a2a2a] p-1 shadow-xl border-4 border-amber-500/50 rounded-sm w-16 h-20 md:w-20 md:h-24 flex items-center justify-center overflow-hidden">
                   <div className="w-full h-full bg-gradient-to-br from-sanfran-rubi to-black opacity-80 flex items-center justify-center">
                      <Frame size={20} className="text-white/20" />
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* Chão */}
        <div className="h-[35%] w-full bg-[#e2e8f0] dark:bg-[#120808] relative transition-colors duration-500 flex justify-center perspective-1000">
           {/* Tapete */}
           {unlocks.pleno && (
             <div className="absolute bottom-0 md:bottom-4 w-full md:w-2/3 h-[90%] bg-sanfran-rubi/10 dark:bg-sanfran-rubi/20 rounded-[1rem] md:rounded-[3rem] transform skew-x-12 border-4 border-sanfran-rubi/20"></div>
           )}
        </div>
      </div>

      {/* --- MOBÍLIA E ITENS (CAMADA FRONTAL) --- */}
      <div className="relative z-10 h-[320px] md:h-[400px] w-full flex items-end justify-center pb-4 md:pb-12 px-4 pointer-events-none">
        
        {/* Estante de Livros (Esquerda) */}
        {unlocks.senior && (
          <div className="absolute bottom-12 md:bottom-24 left-2 md:left-16 animate-in slide-in-from-left-8 duration-700 z-0">
             <div className="w-20 md:w-32 h-40 md:h-64 bg-amber-900 border-r-8 border-amber-950 shadow-2xl flex flex-col justify-end p-1 md:p-2 gap-2 md:gap-4 rounded-t-lg">
                <Library size={32} className="text-amber-100/20 absolute top-4 left-1/2 -translate-x-1/2" />
                {/* Prateleiras */}
                <div className="h-1.5 md:h-2 w-full bg-amber-950 relative">
                   <BookOpen size={12} className="absolute bottom-2 left-1 text-red-400" />
                   <BookOpen size={12} className="absolute bottom-2 left-4 text-blue-400" />
                   <BookOpen size={12} className="absolute bottom-2 left-7 text-green-400" />
                </div>
                <div className="h-1.5 md:h-2 w-full bg-amber-950 relative">
                   <div className="absolute bottom-2 right-1 w-3 h-6 bg-slate-300 rounded-sm"></div>
                   <div className="absolute bottom-2 right-5 w-3 h-6 bg-slate-400 rounded-sm"></div>
                </div>
                <div className="h-1.5 md:h-2 w-full bg-amber-950"></div>
                <div className="h-1.5 md:h-2 w-full bg-amber-950"></div>
             </div>
          </div>
        )}

        {/* Planta (Esquerda Fundo) */}
        {unlocks.junior && (
           <div className="absolute bottom-16 md:bottom-24 left-20 md:left-48 z-0 animate-in fade-in zoom-in duration-500">
              <Flower2 size={40} className="text-emerald-600 drop-shadow-lg" />
              <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-800 rounded-b-xl mx-auto -mt-2 shadow-lg"></div>
           </div>
        )}

        {/* Mesa Principal */}
        <div className="relative flex flex-col items-center">
           
           {/* Itens SOBRE a Mesa */}
           <div className="flex items-end gap-2 md:gap-6 mb-[-8px] md:mb-[-10px] z-20 relative px-4">
              {/* Abajur */}
              {unlocks.socio && (
                <div className="mb-2 animate-in slide-in-from-top-4 duration-500">
                  <Lamp size={32} className="text-amber-500 fill-amber-200 dark:text-amber-200" />
                  <div className="w-8 h-2 bg-black/20 blur-md absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"></div>
                </div>
              )}

              {/* Notebook / Computador */}
              {unlocks.junior ? (
                 <div className="relative group/laptop mb-1">
                    <Monitor size={48} className="text-slate-800 dark:text-slate-300 fill-slate-200 dark:fill-slate-600 drop-shadow-xl" />
                    {/* Tela brilhando */}
                    <div className="absolute top-1 left-[50%] -translate-x-[50%] w-8 h-5 bg-sky-200/50 animate-pulse rounded-sm"></div>
                 </div>
              ) : (
                 <div className="flex flex-col items-center mb-1">
                    <BookOpen size={24} className="text-slate-600 mb-0.5" />
                    <div className="w-12 h-1 bg-white/20 rounded-full"></div>
                 </div>
              )}

              {/* Café */}
              {unlocks.socio && <Coffee size={20} className="text-slate-600 dark:text-slate-400 mb-1" />}

              {/* Itens de Magistrado */}
              {unlocks.magistrado && (
                 <div className="flex items-end gap-2 animate-in slide-in-from-right-8 duration-700">
                    <div className="relative group/gavel cursor-help mb-1">
                       <Gavel size={40} className="text-amber-800 fill-amber-900 rotate-[-15deg] drop-shadow-2xl" />
                       <div className="w-10 h-1 bg-amber-950 absolute bottom-0 left-0 rounded-full blur-[1px]"></div>
                    </div>
                    <Scale size={28} className="text-usp-gold mb-2" />
                 </div>
              )}
           </div>

           {/* A MESA */}
           <div className={`
             w-[260px] md:w-[450px] h-4 md:h-6 rounded-lg shadow-2xl z-10 relative
             ${unlocks.senior ? 'bg-[#3f2e18] dark:bg-[#2a1d12]' : 'bg-[#d4a373] dark:bg-[#5c4033]'}
             border-b-8 ${unlocks.senior ? 'border-[#291d0f]' : 'border-[#bc8a5f]'}
             transition-colors duration-500
           `}>
             {/* Pés da mesa */}
             <div className={`absolute top-4 left-4 w-3 md:w-4 h-20 md:h-32 ${unlocks.senior ? 'bg-[#291d0f]' : 'bg-[#bc8a5f]'}`}></div>
             <div className={`absolute top-4 right-4 w-3 md:w-4 h-20 md:h-32 ${unlocks.senior ? 'bg-[#291d0f]' : 'bg-[#bc8a5f]'}`}></div>
             
             {/* Gaveteiro (Pleno+) */}
             {unlocks.pleno && (
               <div className={`absolute top-4 right-4 w-16 md:w-28 h-16 md:h-28 ${unlocks.senior ? 'bg-[#332413]' : 'bg-[#c5966c]'} border-l border-black/10 flex flex-col justify-evenly items-center shadow-lg`}>
                  <div className="w-8 md:w-12 h-1 bg-black/20 rounded-full"></div>
                  <div className="w-8 md:w-12 h-1 bg-black/20 rounded-full"></div>
                  <div className="w-8 md:w-12 h-1 bg-black/20 rounded-full"></div>
               </div>
             )}
           </div>

           {/* CADEIRA */}
           <div className="absolute -bottom-6 md:-bottom-12 z-20 pointer-events-none">
              <div className={`
                w-20 md:w-32 h-28 md:h-40 rounded-t-3xl border-4 
                ${unlocks.socio ? 'bg-slate-800 border-slate-900' : 'bg-slate-600 border-slate-700'}
                flex items-center justify-center shadow-2xl relative
              `}>
                 {/* Encosto */}
                 <div className="w-[80%] h-[70%] border-2 border-dashed border-white/10 rounded-t-xl mt-2"></div>
                 {/* Braços */}
                 <div className={`absolute bottom-8 md:bottom-10 -left-3 md:-left-4 w-3 md:w-4 h-12 md:h-16 ${unlocks.socio ? 'bg-slate-900' : 'bg-slate-700'} rounded-l-lg`}></div>
                 <div className={`absolute bottom-8 md:bottom-10 -right-3 md:-right-4 w-3 md:w-4 h-12 md:h-16 ${unlocks.socio ? 'bg-slate-900' : 'bg-slate-700'} rounded-r-lg`}></div>
                 {/* Assento visual */}
                 <Armchair size={32} className="text-white/20 absolute bottom-10 md:bottom-12" />
              </div>
           </div>
        </div>

        {/* Itens Direita */}
        {unlocks.magistrado && (
           <div className="absolute bottom-12 md:bottom-24 right-4 md:right-24 animate-in slide-in-from-right-8 duration-700 z-0">
              <div className="flex flex-col items-center">
                 <Landmark size={64} className="text-slate-300 dark:text-slate-600 drop-shadow-2xl" />
                 <div className="w-20 h-3 bg-black/20 blur-md rounded-full mt-[-8px]"></div>
              </div>
           </div>
        )}
      </div>

      {/* --- HUD DE NÍVEL --- */}
      <div className="absolute top-4 md:top-6 left-4 md:left-6 z-30 bg-white/90 dark:bg-black/60 backdrop-blur-md p-3 md:p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
         <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Ambiente</p>
         <h3 className="text-sm md:text-xl font-black text-sanfran-rubi dark:text-white uppercase leading-none">{getRankName()}</h3>
         <div className="flex items-center gap-2 mt-2">
            <Briefcase size={12} className="text-slate-400" />
            <div className="h-1.5 w-20 md:w-24 bg-slate-200 dark:bg-white/20 rounded-full overflow-hidden">
               <div className="h-full bg-sanfran-rubi animate-pulse" style={{ width: '100%' }}></div>
            </div>
         </div>
      </div>

    </div>
  );
};

export default VirtualOffice;
