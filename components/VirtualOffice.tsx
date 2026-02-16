import React, { useState, useEffect, useMemo } from 'react';
import { StudySession } from '../types';
import { 
  Layout, 
  Palette, 
  Armchair, 
  Monitor, 
  Library, 
  Trophy, 
  Lock, 
  CheckCircle2, 
  Save, 
  Moon, 
  Sun,
  MousePointer2,
  Maximize2,
  Scale,
  Gavel
} from 'lucide-react';

interface VirtualOfficeProps {
  studySessions: StudySession[];
  userName: string;
}

// --- TIPOS E CATÁLOGO ---

type ItemCategory = 'wall' | 'floor' | 'desk' | 'chair' | 'decor' | 'window';

interface OfficeItem {
  id: string;
  name: string;
  hoursRequired: number;
  category: ItemCategory;
  // Propriedades visuais para renderização
  cssClass?: string;
  color?: string;
  gradient?: string;
  icon?: React.ElementType;
}

const CATALOG: Record<ItemCategory, OfficeItem[]> = {
  wall: [
    { id: 'paint_white', name: 'Pintura Básica', hoursRequired: 0, category: 'wall', cssClass: 'bg-slate-200 dark:bg-slate-800' },
    { id: 'paint_blue', name: 'Azul Sereno', hoursRequired: 20, category: 'wall', cssClass: 'bg-[#e0f2fe] dark:bg-[#0f172a]' },
    { id: 'wood_panel', name: 'Boiserie Clássica', hoursRequired: 300, category: 'wall', cssClass: 'bg-[#e2e8f0] dark:bg-[#1e293b] border-t-8 border-b-8 border-slate-300 dark:border-slate-700' },
    { id: 'marble', name: 'Mármore Travertino', hoursRequired: 1500, category: 'wall', cssClass: 'bg-[url("https://www.transparenttextures.com/patterns/white-wall-3-2.png")] bg-stone-100 dark:bg-stone-900' },
  ],
  floor: [
    { id: 'concrete', name: 'Concreto Queimado', hoursRequired: 0, category: 'floor', cssClass: 'bg-zinc-300 dark:bg-zinc-800' },
    { id: 'wood_light', name: 'Parquet Carvalho', hoursRequired: 50, category: 'floor', cssClass: 'bg-[#d4b483] dark:bg-[#5d4037]' },
    { id: 'carpet_red', name: 'Carpete SanFran', hoursRequired: 300, category: 'floor', cssClass: 'bg-[#9B111E] dark:bg-[#4a080f] opacity-90' },
    { id: 'marble_floor', name: 'Piso de Mármore', hoursRequired: 1500, category: 'floor', cssClass: 'bg-slate-100 dark:bg-slate-900' },
  ],
  desk: [
    { id: 'desk_basic', name: 'Mesa Cavalete', hoursRequired: 0, category: 'desk', cssClass: 'w-[50%] h-6 bg-slate-300 rounded top-0 shadow-lg' },
    { id: 'desk_wood', name: 'Mesa Executiva', hoursRequired: 100, category: 'desk', cssClass: 'w-[60%] h-12 bg-[#5D4037] rounded-lg top-0 shadow-2xl border-t border-[#8D6E63]' },
    { id: 'desk_glass', name: 'Vidro Moderno', hoursRequired: 500, category: 'desk', cssClass: 'w-[55%] h-4 bg-cyan-100/50 backdrop-blur-md rounded border border-white/50 top-0 shadow-xl' },
    { id: 'desk_magistrate', name: 'Mesa da Corte', hoursRequired: 1500, category: 'desk', cssClass: 'w-[70%] h-16 bg-gradient-to-r from-[#3E2723] via-[#5D4037] to-[#3E2723] rounded-lg top-0 shadow-2xl border-2 border-[#FFD700]' },
  ],
  chair: [
    { id: 'chair_basic', name: 'Cadeira Fixa', hoursRequired: 0, category: 'chair', cssClass: 'w-16 h-20 bg-slate-600 rounded-t-lg' },
    { id: 'chair_mesh', name: 'Ergonômica Mesh', hoursRequired: 50, category: 'chair', cssClass: 'w-20 h-28 bg-slate-800 rounded-t-xl border-2 border-slate-600' },
    { id: 'chair_leather', name: 'Poltrona Couro', hoursRequired: 700, category: 'chair', cssClass: 'w-24 h-32 bg-[#3E2723] rounded-t-[2rem] shadow-xl border-4 border-[#281815]' },
    { id: 'chair_magistrate', name: 'Trono Jurídico', hoursRequired: 1500, category: 'chair', cssClass: 'w-28 h-40 bg-[#9B111E] rounded-t-[2.5rem] shadow-2xl border-4 border-[#FFD700]' },
  ],
  decor: [
    { id: 'none', name: 'Vazio', hoursRequired: 0, category: 'decor', cssClass: 'hidden' },
    { id: 'plant', name: 'Costela de Adão', hoursRequired: 20, category: 'decor', cssClass: 'w-16 h-32 bg-green-600 rounded-t-full' },
    { id: 'bookshelf', name: 'Estante Doutrina', hoursRequired: 300, category: 'decor', cssClass: 'w-32 h-64 bg-[#4E342E] border-4 border-[#3E2723]' },
    { id: 'painting', name: 'Quadro a Óleo', hoursRequired: 500, category: 'decor', cssClass: 'w-24 h-32 bg-slate-700 border-4 border-[#FFD700]' },
    { id: 'statue', name: 'Themis (Justiça)', hoursRequired: 1500, category: 'decor', cssClass: 'w-20 h-48 bg-gradient-to-b from-yellow-200 to-yellow-600' },
  ],
  window: [
    { id: 'win_small', name: 'Janela Basculante', hoursRequired: 0, category: 'window', cssClass: 'w-[20%] h-[30%] bg-sky-200 dark:bg-indigo-950 border-8 border-white' },
    { id: 'win_large', name: 'Janela Panorâmica', hoursRequired: 200, category: 'window', cssClass: 'w-[40%] h-[50%] bg-sky-300 dark:bg-indigo-900 border-4 border-slate-800' },
    { id: 'win_classic', name: 'Janela Vitoriana', hoursRequired: 1000, category: 'window', cssClass: 'w-[25%] h-[60%] bg-sky-200 dark:bg-indigo-950 border-8 border-[#5D4037] rounded-t-full' },
  ]
};

// Configuração padrão
const DEFAULT_CONFIG = {
  wall: 'paint_white',
  floor: 'concrete',
  desk: 'desk_basic',
  chair: 'chair_basic',
  decor: 'none',
  window: 'win_small'
};

const VirtualOffice: React.FC<VirtualOfficeProps> = ({ studySessions, userName }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<ItemCategory>('desk');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isNight, setIsNight] = useState(false);

  // Carregar config salva
  useEffect(() => {
    const saved = localStorage.getItem(`sanfran_office_config_${userName}`);
    if (saved) {
      try {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Erro ao carregar escritório salvo");
      }
    }
  }, [userName]);

  // Salvar config
  const handleSelect = (category: ItemCategory, itemId: string) => {
    const newConfig = { ...config, [category]: itemId };
    setConfig(newConfig);
    localStorage.setItem(`sanfran_office_config_${userName}`, JSON.stringify(newConfig));
  };

  const totalSeconds = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const totalHours = totalSeconds / 3600;

  // Renderizadores de Itens
  const getStyle = (category: ItemCategory) => {
    const id = config[category];
    return CATALOG[category].find(i => i.id === id) || CATALOG[category][0];
  };

  const WallItem = getStyle('wall');
  const FloorItem = getStyle('floor');
  const DeskItem = getStyle('desk');
  const ChairItem = getStyle('chair');
  const DecorItem = getStyle('decor');
  const WindowItem = getStyle('window');

  // --- COMPONENTES VISUAIS DA SALA ---

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-700 relative pb-20 px-2 md:px-0">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Meu Gabinete</h2>
          <p className="text-slate-500 font-bold italic text-sm md:text-lg">Personalize seu ambiente de alta performance.</p>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={() => setIsNight(!isNight)} 
             className="p-3 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-sanfran-rubi transition-colors"
           >
             {isNight ? <Sun size={20} /> : <Moon size={20} />}
           </button>
           <button 
             onClick={() => setIsEditing(!isEditing)} 
             className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg ${isEditing ? 'bg-sanfran-rubi text-white' : 'bg-white dark:bg-sanfran-rubiDark/40 text-slate-900 dark:text-white border border-slate-200 dark:border-sanfran-rubi/30'}`}
           >
             {isEditing ? <CheckCircle2 size={16} /> : <Palette size={16} />}
             {isEditing ? 'Concluir' : 'Decorar'}
           </button>
        </div>
      </div>

      {/* --- PALCO DO ESCRITÓRIO --- */}
      <div className={`relative w-full aspect-[16/10] md:aspect-[21/9] rounded-[2rem] border-[12px] border-slate-900 dark:border-black shadow-2xl overflow-hidden transition-all duration-700 group ${isEditing ? 'scale-[0.98] ring-4 ring-sanfran-rubi/50' : ''}`}>
         
         {/* 1. PAREDE */}
         <div className={`absolute inset-0 ${WallItem.cssClass} transition-colors duration-500`}>
            {/* Sombra interna para profundidade */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
         </div>

         {/* 2. JANELA */}
         <div className={`absolute top-[10%] left-[10%] ${WindowItem.cssClass} shadow-inner transition-all duration-500 overflow-hidden`}>
             {/* Cenário fora da janela */}
             <div className={`w-full h-full transition-colors duration-1000 ${isNight ? 'bg-[#0f172a]' : 'bg-sky-300'}`}>
                {isNight ? (
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 shadow-[0_0_20px_rgba(255,255,255,0.5)]"></div>
                ) : (
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-yellow-300 blur-xl opacity-80"></div>
                )}
                {/* Nuvens simples */}
                {!isNight && <div className="absolute top-10 left-10 w-12 h-4 bg-white/40 rounded-full blur-sm"></div>}
             </div>
             {/* Reflexo no vidro */}
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none"></div>
         </div>

         {/* 3. QUADRO / DIPLOMA (Fixo se tiver horas) */}
         {totalHours >= 100 && (
            <div className="absolute top-[15%] right-[20%] w-[10%] h-[15%] bg-white dark:bg-slate-200 border-4 border-amber-700 shadow-md flex flex-col items-center justify-center p-1">
               <div className="w-full h-1 bg-slate-200 mb-0.5"></div>
               <div className="w-2/3 h-1 bg-slate-200 mb-0.5"></div>
               <div className="w-1/2 h-1 bg-red-800 rounded-full mt-1"></div>
            </div>
         )}

         {/* 4. CHÃO */}
         <div className={`absolute bottom-0 w-full h-[35%] ${FloorItem.cssClass} border-t border-black/10 transition-colors duration-500`}>
             {/* Sombra da parede no chão */}
             <div className="absolute top-0 w-full h-4 bg-gradient-to-b from-black/20 to-transparent"></div>
         </div>

         {/* 5. TAPETE (Visual Only - Se o piso for madeira ou concreto) */}
         {['wood_light', 'concrete'].includes(config.floor) && totalHours >= 100 && (
           <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[40%] h-[20%] bg-red-900/80 rounded-[50%] blur-[1px] transform scale-x-150 shadow-sm opacity-80 pointer-events-none"></div>
         )}

         {/* 6. DECORAÇÃO (Item Extra) */}
         <div className={`absolute bottom-[25%] left-[5%] transition-all duration-500 z-10 ${DecorItem.cssClass} shadow-2xl`}>
            {/* Detalhes específicos por tipo de decor */}
            {DecorItem.id === 'bookshelf' && (
               <div className="w-full h-full flex flex-col justify-around p-1">
                  {[1,2,3,4].map(i => <div key={i} className="w-full h-1 bg-[#3E2723] shadow-sm"></div>)}
               </div>
            )}
            {DecorItem.id === 'plant' && (
               <div className="absolute -top-4 -left-4 w-24 h-24 bg-green-500 rounded-full opacity-50 blur-xl"></div>
            )}
            {DecorItem.id === 'statue' && (
               <div className="w-full h-full flex items-center justify-center text-yellow-900/50">
                  <Scale size={32} />
               </div>
            )}
         </div>

         {/* 7. CADEIRA (Atrás da mesa) */}
         <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
            <div className={`${ChairItem.cssClass} transition-all duration-500 relative`}>
               {/* Detalhe do estofado */}
               <div className="absolute inset-x-2 top-2 bottom-0 bg-black/10 rounded-t-md"></div>
            </div>
            {/* Pé da cadeira */}
            <div className="w-4 h-16 bg-slate-800"></div>
            <div className="w-20 h-4 bg-slate-800 rounded-full -mt-2"></div>
         </div>

         {/* 8. MESA (Frente) */}
         <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-end w-full h-[30%] pointer-events-none">
             {/* Tampo */}
             <div className={`${DeskItem.cssClass} relative flex items-center justify-center transition-all duration-500`}>
                 
                 {/* ITENS EM CIMA DA MESA */}
                 {totalHours >= 20 && (
                   <div className="absolute -top-12 left-10 w-16 h-10 bg-slate-800 rounded-t-lg border-b-4 border-slate-700 flex items-center justify-center">
                      <Monitor size={20} className="text-slate-400" />
                      {/* Tela Ligada */}
                      <div className="absolute inset-x-1 top-1 bottom-1 bg-sky-200/80 animate-pulse rounded-sm"></div>
                   </div>
                 )}
                 
                 {totalHours >= 1500 && (
                    <div className="absolute -top-6 right-10">
                       <Gavel className="text-amber-900 w-10 h-10 -rotate-12 drop-shadow-lg" fill="currentColor" />
                    </div>
                 )}

                 {/* Reflexo Mesa de Vidro */}
                 {DeskItem.id === 'desk_glass' && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                 )}
             </div>
             
             {/* Pernas da Mesa (Genérico, adaptável) */}
             <div className="flex justify-between w-[50%] h-full -mt-1">
                 {DeskItem.id === 'desk_glass' ? (
                    <>
                       <div className="w-2 h-full bg-slate-400/50"></div>
                       <div className="w-2 h-full bg-slate-400/50"></div>
                    </>
                 ) : (
                    <>
                       <div className="w-4 h-full bg-black/20"></div>
                       <div className="w-4 h-full bg-black/20"></div>
                    </>
                 )}
             </div>
         </div>

         {/* Luz Ambiente (Overlay) */}
         <div className={`absolute inset-0 pointer-events-none mix-blend-overlay transition-colors duration-1000 ${isNight ? 'bg-indigo-900/60' : 'bg-orange-100/10'}`}></div>

         {/* Botão de Edição Rápida no Centro (Só aparece no hover se não estiver editando) */}
         {!isEditing && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px] cursor-pointer" onClick={() => setIsEditing(true)}>
               <div className="bg-white text-slate-900 px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                  Clique para Decorar
               </div>
            </div>
         )}
      </div>

      {/* --- MENU DE PERSONALIZAÇÃO (DRAWER) --- */}
      {isEditing && (
        <div className="mt-6 bg-white dark:bg-sanfran-rubiDark/30 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
           
           {/* Categorias */}
           <div className="flex overflow-x-auto p-2 border-b border-slate-100 dark:border-white/10 no-scrollbar gap-2">
              {[
                { id: 'desk', label: 'Mesas', icon: Layout },
                { id: 'chair', label: 'Cadeiras', icon: Armchair },
                { id: 'floor', label: 'Pisos', icon: Maximize2 },
                { id: 'wall', label: 'Paredes', icon: Palette },
                { id: 'window', label: 'Janelas', icon: Sun },
                { id: 'decor', label: 'Decoração', icon: Trophy },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id as ItemCategory)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide whitespace-nowrap transition-all ${activeTab === cat.id ? 'bg-sanfran-rubi text-white shadow-lg' : 'bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-slate-100'}`}
                >
                   <cat.icon size={14} /> {cat.label}
                </button>
              ))}
           </div>

           {/* Grid de Itens */}
           <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {CATALOG[activeTab].map(item => {
                 const isUnlocked = totalHours >= item.hoursRequired;
                 const isSelected = config[activeTab] === item.id;

                 return (
                   <button
                     key={item.id}
                     disabled={!isUnlocked}
                     onClick={() => handleSelect(activeTab, item.id)}
                     className={`group relative p-4 rounded-2xl border-2 transition-all text-left flex flex-col justify-between h-32 ${
                        isSelected 
                          ? 'border-sanfran-rubi bg-sanfran-rubi/5 ring-2 ring-sanfran-rubi/20' 
                          : isUnlocked 
                             ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 hover:border-slate-300' 
                             : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 opacity-60 cursor-not-allowed'
                     }`}
                   >
                      <div className="flex justify-between items-start">
                         {/* Miniatura Visual Simplificada */}
                         <div className={`w-8 h-8 rounded-lg shadow-sm ${item.cssClass && item.cssClass.includes('bg-') ? item.cssClass.split(' ').find(c => c.startsWith('bg-')) : 'bg-slate-300'}`}></div>
                         
                         {isSelected && <div className="bg-sanfran-rubi text-white p-1 rounded-full"><CheckCircle2 size={12} /></div>}
                         {!isUnlocked && <Lock size={14} className="text-slate-400" />}
                      </div>

                      <div>
                         <p className={`font-black text-[10px] uppercase tracking-wide leading-tight ${isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                           {item.name}
                         </p>
                         {!isUnlocked && (
                           <p className="text-[8px] font-bold text-sanfran-rubi mt-1">
                             Requer {item.hoursRequired}h
                           </p>
                         )}
                      </div>
                   </button>
                 );
              })}
           </div>

           <div className="bg-slate-50 dark:bg-black/20 p-3 text-center border-t border-slate-100 dark:border-white/10">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                 <Save size={12} /> As alterações são salvas automaticamente
              </p>
           </div>
        </div>
      )}

      {/* Stats Footer */}
      {!isEditing && (
         <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-sanfran-rubiDark/30 p-4 rounded-2xl border border-slate-200 dark:border-sanfran-rubi/30 flex items-center gap-3">
               <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg"><Trophy className="w-5 h-5 text-usp-gold" /></div>
               <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Total Acumulado</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{totalHours.toFixed(1)}h</p>
               </div>
            </div>
            {/* Mais stats podem vir aqui */}
         </div>
      )}

    </div>
  );
};

export default VirtualOffice;