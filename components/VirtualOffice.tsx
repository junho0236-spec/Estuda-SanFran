
import React, { useState, useEffect, useRef } from 'react';
import { StudySession } from '../types';
import { 
  Layout, Palette, Armchair, Monitor, Trophy, Lock, CheckCircle2, 
  Save, Moon, Sun, MousePointer2, Maximize2, Scale, Gavel, 
  Coffee, Book, Flower2, Lamp, Frame, Gift, Package, Sparkles, X, Star
} from 'lucide-react';
import confetti from 'canvas-confetti'; // Vamos simular confetti com CSS se não tiver a lib, mas farei visual puro CSS.

interface VirtualOfficeProps {
  studySessions: StudySession[];
  userName: string;
}

// --- TIPOS ---
type ItemCategory = 'wall' | 'floor' | 'window' | 'desk' | 'chair' | 'rug' | 'decor_left' | 'decor_right' | 'desktop';
type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

interface OfficeItem {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  isDefault?: boolean; // Se o item já vem liberado no início
}

// --- CATÁLOGO DE ITENS ---
const CATALOG: Record<ItemCategory, OfficeItem[]> = {
  wall: [
    { id: 'wall_white', name: 'Alvenaria Branca', description: 'Simples e limpo.', rarity: 'common', isDefault: true },
    { id: 'wall_concrete', name: 'Concreto Aparente', description: 'Estilo industrial moderno.', rarity: 'common' },
    { id: 'wall_navy', name: 'Azul Petróleo', description: 'Foco e serenidade.', rarity: 'rare' },
    { id: 'wall_classic', name: 'Boiserie Creme', description: 'Clássico advocatício.', rarity: 'rare' },
    { id: 'wall_wood', name: 'Painel de Nogueira', description: 'Revestimento de alto padrão.', rarity: 'epic' },
    { id: 'wall_marble', name: 'Mármore Carrara', description: 'O ápice do luxo.', rarity: 'legendary' },
  ],
  floor: [
    { id: 'floor_concrete', name: 'Cimento Queimado', description: 'Frio e funcional.', rarity: 'common', isDefault: true },
    { id: 'floor_laminate', name: 'Laminado Carvalho', description: 'Aconchego básico.', rarity: 'common' },
    { id: 'floor_herringbone', name: 'Taco Espinha de Peixe', description: 'Tradicional de SP.', rarity: 'rare' },
    { id: 'floor_darkwood', name: 'Ébano Envelhecido', description: 'Madeira nobre.', rarity: 'epic' },
    { id: 'floor_marble', name: 'Mármore Negro', description: 'Reflete seu sucesso.', rarity: 'legendary' },
  ],
  window: [
    { id: 'win_basement', name: 'Janela Alta', description: 'Entra pouca luz.', rarity: 'common', isDefault: true },
    { id: 'win_standard', name: 'Janela Padrão', description: 'Vista para o prédio vizinho.', rarity: 'common' },
    { id: 'win_large', name: 'Janela Panorâmica', description: 'Muita luz natural.', rarity: 'rare' },
    { id: 'win_arch', name: 'Arco das Arcadas', description: 'Estilo colonial.', rarity: 'epic' },
    { id: 'win_glass', name: 'Parede de Vidro', description: 'Vista da Faria Lima.', rarity: 'legendary' },
  ],
  desk: [
    { id: 'desk_door', name: 'Porta e Cavaletes', description: 'O começo de tudo.', rarity: 'common', isDefault: true },
    { id: 'desk_white', name: 'Mesa MDF Branca', description: 'Funcional e barata.', rarity: 'common' },
    { id: 'desk_wood', name: 'Escrivaninha Mogno', description: 'Sólida e respeitável.', rarity: 'rare' },
    { id: 'desk_l', name: 'Estação em L', description: 'Muito espaço para processos.', rarity: 'epic' },
    { id: 'desk_president', name: 'Mesa Presidencial', description: 'Madeira maciça esculpida.', rarity: 'legendary' },
  ],
  chair: [
    { id: 'chair_plastic', name: 'Cadeira de Plástico', description: 'Temporária (esperamos).', rarity: 'common', isDefault: true },
    { id: 'chair_office', name: 'Cadeira Secretária', description: 'Rodinhas que travam.', rarity: 'common' },
    { id: 'chair_gamer', name: 'Ergonômica Mesh', description: 'Cuide da sua lombar.', rarity: 'rare' },
    { id: 'chair_leather', name: 'Poltrona Executiva', description: 'Couro sintético premium.', rarity: 'epic' },
    { id: 'chair_magistrate', name: 'Trono do Juiz', description: 'Veludo vermelho e ouro.', rarity: 'legendary' },
  ],
  rug: [
    { id: 'rug_none', name: 'Sem Tapete', description: 'Fácil de limpar.', rarity: 'common', isDefault: true },
    { id: 'rug_grey', name: 'Tapete Cinza', description: 'Discreto.', rarity: 'common' },
    { id: 'rug_persian', name: 'Tapete Persa', description: 'Herança de família.', rarity: 'epic' },
    { id: 'rug_sanfran', name: 'Brasão XI de Agosto', description: 'Orgulho acadêmico.', rarity: 'legendary' },
  ],
  decor_left: [
    { id: 'none', name: 'Vazio', description: '', rarity: 'common', isDefault: true },
    { id: 'plant_pothos', name: 'Jiboia no Vaso', description: 'Purifica o ar.', rarity: 'common' },
    { id: 'lamp_floor', name: 'Luminária de Piso', description: 'Luz indireta.', rarity: 'common' },
    { id: 'bookshelf_small', name: 'Estante Baixa', description: 'Vade Mecum e Doutrinas.', rarity: 'rare' },
    { id: 'statue_themis', name: 'Estátua da Justiça', description: 'Cega e imparcial.', rarity: 'epic' },
  ],
  decor_right: [
    { id: 'none', name: 'Vazio', description: '', rarity: 'common', isDefault: true },
    { id: 'diploma', name: 'Diploma Moldurado', description: 'Sua credencial.', rarity: 'common' },
    { id: 'painting_abstract', name: 'Arte Abstrata', description: 'Toque de cor.', rarity: 'rare' },
    { id: 'clock_wall', name: 'Relógio Antigo', description: 'O tempo ruge.', rarity: 'rare' },
    { id: 'bookshelf_tall', name: 'Biblioteca Parede', description: 'Conhecimento infinito.', rarity: 'legendary' },
  ],
  desktop: [
    { id: 'none', name: 'Mesa Limpa', description: 'Foco total.', rarity: 'common', isDefault: true },
    { id: 'messy_papers', name: 'Pilhas de Processos', description: 'Vida de estagiário.', rarity: 'common' },
    { id: 'laptop_coffee', name: 'Notebook e Café', description: 'Setup padrão.', rarity: 'common' },
    { id: 'dual_monitor', name: 'Monitores Duplos', description: 'Multitarefa suprema.', rarity: 'epic' },
    { id: 'gavel_set', name: 'Martelo e Livros', description: 'Autoridade.', rarity: 'legendary' },
  ]
};

const DEFAULT_CONFIG = {
  wall: 'wall_white',
  floor: 'floor_concrete',
  window: 'win_basement',
  desk: 'desk_door',
  chair: 'chair_plastic',
  rug: 'rug_none',
  decor_left: 'none',
  decor_right: 'none',
  desktop: 'none'
};

const VirtualOffice: React.FC<VirtualOfficeProps> = ({ studySessions, userName }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<ItemCategory>('desk');
  const [isNight, setIsNight] = useState(false);
  
  // --- STATE DO GACHA ---
  const [inventory, setInventory] = useState<string[]>([]);
  const [availableBoxes, setAvailableBoxes] = useState(0);
  const [totalBoxesEarned, setTotalBoxesEarned] = useState(0); // Histórico para não dar caixas repetidas
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [wonItem, setWonItem] = useState<{item: OfficeItem, category: ItemCategory} | null>(null);

  const totalSeconds = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const totalHours = totalSeconds / 3600;

  // Inicialização e Carregamento
  useEffect(() => {
    // 1. Carregar Configuração da Sala
    const savedConfig = localStorage.getItem(`sanfran_office_v2_${userName}`);
    if (savedConfig) {
      try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) }); } catch (e) {}
    }

    // 2. Carregar Inventário e Caixas
    const savedInventory = localStorage.getItem(`sanfran_inventory_${userName}`);
    const savedBoxes = localStorage.getItem(`sanfran_boxes_${userName}`);
    const savedTotalEarned = localStorage.getItem(`sanfran_boxes_earned_${userName}`);

    if (savedInventory) {
      setInventory(JSON.parse(savedInventory));
    } else {
      // Inventário inicial (apenas itens default)
      const initialItems: string[] = [];
      Object.values(CATALOG).forEach(categoryItems => {
        categoryItems.forEach(item => {
          if (item.isDefault) initialItems.push(item.id);
        });
      });
      setInventory(initialItems);
    }

    if (savedBoxes) setAvailableBoxes(parseInt(savedBoxes));
    if (savedTotalEarned) setTotalBoxesEarned(parseInt(savedTotalEarned));

    // Auto day/night
    const hour = new Date().getHours();
    setIsNight(hour < 6 || hour > 18);
  }, [userName]);

  // Lógica de Ganhar Caixas (A cada 20h)
  useEffect(() => {
    const boxesShouldHave = Math.floor(totalHours / 20);
    
    if (boxesShouldHave > totalBoxesEarned) {
      const newBoxes = boxesShouldHave - totalBoxesEarned;
      
      const updatedTotal = totalBoxesEarned + newBoxes;
      const updatedAvailable = availableBoxes + newBoxes;

      setTotalBoxesEarned(updatedTotal);
      setAvailableBoxes(updatedAvailable);

      localStorage.setItem(`sanfran_boxes_earned_${userName}`, updatedTotal.toString());
      localStorage.setItem(`sanfran_boxes_${userName}`, updatedAvailable.toString());
      
      // Notificação simples (poderia ser um toast)
      // alert(`Você ganhou ${newBoxes} nova(s) caixa(s) por seus estudos!`);
    }
  }, [totalHours, totalBoxesEarned, availableBoxes, userName]);

  // Salvar Inventário ao mudar
  useEffect(() => {
    if (inventory.length > 0) {
      localStorage.setItem(`sanfran_inventory_${userName}`, JSON.stringify(inventory));
    }
  }, [inventory, userName]);

  // Salvar Caixas Disponíveis ao mudar
  useEffect(() => {
    localStorage.setItem(`sanfran_boxes_${userName}`, availableBoxes.toString());
  }, [availableBoxes, userName]);


  const handleSelect = (category: ItemCategory, id: string) => {
    const newConfig = { ...config, [category]: id };
    setConfig(newConfig);
    localStorage.setItem(`sanfran_office_v2_${userName}`, JSON.stringify(newConfig));
  };

  // --- LÓGICA DO GACHA (ABRIR CAIXA) ---
  const openBox = () => {
    if (availableBoxes <= 0) return;

    setIsOpeningBox(true);
    setAvailableBoxes(prev => prev - 1);

    // Tempo da animação "shaking"
    setTimeout(() => {
      // 1. Definir Raridade
      const roll = Math.random() * 100;
      let rarity: Rarity = 'common';
      if (roll > 99) rarity = 'legendary';      // 1%
      else if (roll > 90) rarity = 'epic';      // 9%
      else if (roll > 60) rarity = 'rare';      // 30%
      else rarity = 'common';                   // 60%

      // 2. Filtrar Itens Possíveis dessa Raridade que o usuário NÃO tem (prioridade)
      let pool: {item: OfficeItem, category: ItemCategory}[] = [];
      
      Object.entries(CATALOG).forEach(([cat, items]) => {
        items.forEach(item => {
          if (item.rarity === rarity) {
            pool.push({ item, category: cat as ItemCategory });
          }
        });
      });

      // Filtrar não possuídos
      const unowned = pool.filter(p => !inventory.includes(p.item.id));
      
      let finalPick;
      if (unowned.length > 0) {
        finalPick = unowned[Math.floor(Math.random() * unowned.length)];
      } else {
        // Se já tem todos daquela raridade, pega um repetido (ou poderia dar um upgrade, mas vamos simplificar)
        // Vamos dar um fallback para uma raridade diferente se possível, ou apenas dar repetido.
        finalPick = pool[Math.floor(Math.random() * pool.length)];
      }

      // Se por azar o pool estiver vazio (ex: sem lendários no catálogo), fallback para comum
      if (!finalPick) {
         // Fallback seguro
         const fallbackItem = CATALOG.desk[0];
         finalPick = { item: fallbackItem, category: 'desk' as ItemCategory};
      }

      // 3. Adicionar ao Inventário (Set para evitar duplicatas técnicas, embora a lógica acima priorize novos)
      if (!inventory.includes(finalPick.item.id)) {
        setInventory(prev => [...prev, finalPick.item.id]);
      }

      setWonItem(finalPick);
      
    }, 2000); // 2 segundos de suspense
  };

  const closeBoxModal = () => {
    setIsOpeningBox(false);
    setWonItem(null);
  };

  const equipItem = () => {
    if (wonItem) {
      handleSelect(wonItem.category, wonItem.item.id);
      closeBoxModal();
    }
  };

  // --- RENDERERS DE CSS ART (O "Motor Gráfico") ---

  const renderWall = () => {
    const style = config.wall;
    let bgClass = "bg-slate-200";
    if (style === 'wall_concrete') bgClass = "bg-[#a3a3a3]";
    if (style === 'wall_navy') bgClass = "bg-[#1e293b]";
    if (style === 'wall_classic') bgClass = "bg-[#fdfbf7]";
    if (style === 'wall_wood') bgClass = "bg-[#4a3b32]";
    if (style === 'wall_marble') bgClass = "bg-slate-100"; 

    return (
      <div className={`absolute inset-0 ${bgClass} transition-colors duration-1000`}>
        {style === 'wall_concrete' && <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')]"></div>}
        {style === 'wall_classic' && (
          <div className="w-full h-full flex justify-around px-10 items-center">
             <div className="w-32 h-[70%] border-4 border-[#e2e8f0] shadow-sm rounded-sm"></div>
             <div className="w-32 h-[70%] border-4 border-[#e2e8f0] shadow-sm rounded-sm"></div>
             <div className="w-32 h-[70%] border-4 border-[#e2e8f0] shadow-sm rounded-sm"></div>
          </div>
        )}
        {style === 'wall_wood' && (
           <div className="w-full h-full flex">
              {[...Array(10)].map((_, i) => <div key={i} className="flex-1 border-r border-black/20 bg-gradient-to-r from-transparent to-black/10"></div>)}
           </div>
        )}
        {/* Sombra do teto */}
        <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-black/30 to-transparent pointer-events-none"></div>
      </div>
    );
  };

  const renderFloor = () => {
    const style = config.floor;
    let bgClass = "bg-stone-300";
    if (style === 'floor_laminate') bgClass = "bg-[#d4b483]";
    if (style === 'floor_herringbone') bgClass = "bg-[#a67c52]";
    if (style === 'floor_darkwood') bgClass = "bg-[#271c19]";
    if (style === 'floor_marble') bgClass = "bg-[#1a1a1a]";

    return (
      <div className={`absolute bottom-0 w-full h-[35%] ${bgClass} transition-colors duration-1000 perspective-origin-center transform-style-3d`}>
         {/* Textura de Piso */}
         {style === 'floor_herringbone' && <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_11px)]"></div>}
         {style === 'floor_laminate' && <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,transparent_90%,#000_100%)] bg-[length:100px_100%]"></div>}
         {/* Reflexo do chão */}
         <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
      </div>
    );
  };

  const renderWindow = () => {
    const style = config.window;
    // Posição e tamanho
    let dims = "w-[20%] h-[30%] top-[10%] left-[10%]"; // Basement
    if (style === 'win_standard') dims = "w-[25%] h-[40%] top-[15%] left-[10%]";
    if (style === 'win_large') dims = "w-[40%] h-[50%] top-[10%] left-[5%]";
    if (style === 'win_arch') dims = "w-[25%] h-[60%] top-[10%] left-[10%] rounded-t-full";
    if (style === 'win_glass') dims = "w-full h-[65%] top-0 left-0 border-none";

    // View content
    const skyColor = isNight ? "bg-[#0f172a]" : "bg-sky-300";
    const celestial = isNight ? "bg-slate-100 shadow-[0_0_20px_white]" : "bg-yellow-300 shadow-[0_0_40px_yellow]";

    return (
      <div className={`absolute ${dims} bg-slate-800 border-[8px] border-white dark:border-slate-800 overflow-hidden shadow-inner transition-all duration-700 z-0`}>
         <div className={`absolute inset-0 ${skyColor} transition-colors duration-2000`}>
            {/* Celestial Body */}
            <div className={`absolute top-4 right-4 w-8 h-8 rounded-full ${celestial} transition-all duration-2000`}></div>
            {/* Cityscape Silhouette (CSS Only) */}
            <div className={`absolute bottom-0 w-full h-1/3 flex items-end ${isNight ? 'opacity-80' : 'opacity-30'}`}>
               <div className="w-4 h-12 bg-black mx-1"></div>
               <div className="w-6 h-20 bg-black mx-1"></div>
               <div className="w-8 h-10 bg-black mx-1"></div>
               <div className="w-5 h-24 bg-black mx-1"></div>
               <div className="w-10 h-14 bg-black mx-1"></div>
               <div className="w-6 h-16 bg-black mx-1"></div>
               <div className="w-12 h-8 bg-black mx-1"></div>
            </div>
            {/* Stars if night */}
            {isNight && (
               <>
                 <div className="absolute top-10 left-10 w-0.5 h-0.5 bg-white animate-pulse"></div>
                 <div className="absolute top-20 left-1/2 w-0.5 h-0.5 bg-white animate-pulse delay-75"></div>
               </>
            )}
         </div>
         {/* Glass Reflection */}
         <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
         {/* Frame Crossbars */}
         {style !== 'win_glass' && (
            <>
              <div className="absolute top-1/2 w-full h-2 bg-white dark:bg-slate-800"></div>
              {style !== 'win_arch' && <div className="absolute left-1/2 h-full w-2 bg-white dark:bg-slate-800"></div>}
            </>
         )}
      </div>
    );
  };

  const renderRug = () => {
    const style = config.rug;
    if (style === 'rug_none') return null;

    let css = "";
    if (style === 'rug_grey') css = "bg-slate-400 rounded-lg";
    if (style === 'rug_persian') css = "bg-[#7f1d1d] border-4 border-[#450a0a] rounded-sm shadow-sm"; // Red
    if (style === 'rug_sanfran') css = "bg-[#f59e0b] border-4 border-[#78350f] rounded-full"; // Gold

    return (
      <div className={`absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[50%] h-[20%] ${css} transform scale-y-50 opacity-90 transition-all duration-500`}>
         {style === 'rug_persian' && <div className="absolute inset-2 border-2 border-dashed border-[#fbbf24]/30"></div>}
         {style === 'rug_sanfran' && <div className="w-full h-full flex items-center justify-center text-[#78350f]/20 font-black text-4xl">XI</div>}
      </div>
    );
  };

  const renderDesk = () => {
    const style = config.desk;
    
    // Base geometry
    let width = "w-[50%]";
    let height = "h-[30%]"; // Perspective height
    let color = "bg-slate-300";
    let legs = true;
    let legsColor = "bg-slate-400";

    if (style === 'desk_white') { color = "bg-white border-b-4 border-slate-200"; width="w-[55%]"; }
    if (style === 'desk_wood') { color = "bg-[#5D4037] border-b-4 border-[#3E2723]"; width="w-[60%]"; legsColor="bg-[#3E2723]"; }
    if (style === 'desk_l') { color = "bg-[#2d3748] border-b-4 border-black"; width="w-[65%]"; legsColor="bg-black"; }
    if (style === 'desk_president') { color = "bg-[linear-gradient(90deg,#3E2723,#5D4037,#3E2723)] border-b-8 border-[#271c19]"; width="w-[70%]"; legs=false; } // Solid base

    return (
      <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full pointer-events-none">
         {/* Desktop Surface */}
         <div className={`${width} h-8 ${color} rounded-sm relative shadow-2xl flex items-end justify-center perspective-500`}>
            {/* Drawers if solid */}
            {!legs && (
               <div className="absolute top-8 w-[95%] h-32 bg-[#3E2723] flex justify-between px-4 py-2 shadow-2xl">
                  <div className="w-1/4 h-full border border-white/10 flex flex-col gap-1 p-1">
                     <div className="w-full h-1/3 bg-[#271c19] shadow-inner mb-1"></div>
                     <div className="w-full h-1/3 bg-[#271c19] shadow-inner"></div>
                  </div>
                  <div className="w-1/4 h-full border border-white/10 flex flex-col gap-1 p-1">
                     <div className="w-full h-1/3 bg-[#271c19] shadow-inner mb-1"></div>
                     <div className="w-full h-1/3 bg-[#271c19] shadow-inner"></div>
                  </div>
               </div>
            )}
            
            {/* Desktop Items */}
            {renderDesktopItems()}
         </div>

         {/* Legs */}
         {legs && (
            <div className={`${width} flex justify-between px-4 -mt-1`}>
               {style === 'desk_door' ? (
                  // Cavaletes
                  <>
                    <div className="w-16 h-24 border-l-4 border-r-4 border-t-4 border-slate-400 skew-x-6"></div>
                    <div className="w-16 h-24 border-l-4 border-r-4 border-t-4 border-slate-400 -skew-x-6"></div>
                  </>
               ) : (
                  <>
                    <div className={`w-3 h-24 ${legsColor}`}></div>
                    <div className={`w-3 h-24 ${legsColor}`}></div>
                  </>
               )}
            </div>
         )}
      </div>
    );
  };

  const renderChair = () => {
    const style = config.chair;
    // Rendered BEHIND the desk
    let css = "w-16 h-20 bg-slate-600 rounded-t-lg"; // Default
    let legCss = "bg-slate-700";

    if (style === 'chair_office') { css = "w-16 h-20 bg-blue-900 rounded-t-xl border-2 border-slate-800"; }
    if (style === 'chair_gamer') { css = "w-20 h-28 bg-black border-x-4 border-red-600 rounded-t-2xl"; }
    if (style === 'chair_leather') { css = "w-24 h-32 bg-[#3E2723] rounded-t-[2rem] shadow-xl border-4 border-[#281815]"; }
    if (style === 'chair_magistrate') { css = "w-28 h-40 bg-[#7f1d1d] rounded-t-[3rem] shadow-2xl border-4 border-[#fbbf24]"; } // Red & Gold

    return (
      <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
         <div className={`${css} relative shadow-lg`}>
            {/* Headrest detail for fancy chairs */}
            {(style === 'chair_leather' || style === 'chair_magistrate') && (
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-6 bg-inherit rounded-full shadow-md"></div>
            )}
         </div>
         {/* Stem */}
         <div className="w-3 h-12 bg-slate-800"></div>
         {/* Base */}
         <div className="w-16 h-4 bg-slate-800 rounded-full -mt-2"></div>
      </div>
    );
  };

  const renderDesktopItems = () => {
    const style = config.desktop;
    if (style === 'none') return null;

    return (
      <div className="absolute -top-10 w-full flex justify-center items-end gap-4 pointer-events-none">
         {style === 'messy_papers' && (
            <>
               <div className="w-8 h-1 bg-white shadow-sm rotate-12"></div>
               <div className="w-10 h-1 bg-white shadow-sm -rotate-6"></div>
               <div className="w-12 h-16 bg-white border border-slate-200 shadow-sm flex items-center justify-center"><Book size={10} className="text-slate-400"/></div>
            </>
         )}
         {style === 'laptop_coffee' && (
            <>
               <div className="w-20 h-14 bg-slate-800 rounded-t-lg border-b-4 border-slate-600 flex items-center justify-center relative">
                  <div className="w-16 h-10 bg-black rounded-sm flex items-center justify-center overflow-hidden">
                     <div className="w-full h-full bg-blue-500/20 animate-pulse"></div>
                  </div>
                  <div className="absolute -right-8 bottom-0"><Coffee className="text-slate-700 w-6 h-6" /></div>
               </div>
            </>
         )}
         {style === 'dual_monitor' && (
            <div className="flex gap-1 items-end">
               <div className="w-20 h-14 bg-black border-4 border-slate-800 rounded-md -rotate-6 shadow-xl"></div>
               <div className="w-24 h-16 bg-black border-4 border-slate-800 rounded-md shadow-xl flex items-center justify-center">
                  <div className="text-[6px] text-green-500 font-mono">console.log('Law')</div>
               </div>
            </div>
         )}
         {style === 'gavel_set' && (
            <div className="flex items-end gap-4">
               <div className="flex flex-col">
                  <div className="w-20 h-4 bg-red-900 border border-black mb-px"></div>
                  <div className="w-22 h-4 bg-blue-900 border border-black"></div>
               </div>
               <Gavel className="w-12 h-12 text-[#3E2723] -rotate-12 drop-shadow-xl" fill="currentColor" />
            </div>
         )}
      </div>
    );
  };

  const renderDecor = (pos: 'left' | 'right') => {
    const style = pos === 'left' ? config.decor_left : config.decor_right;
    const cssPos = pos === 'left' ? "left-[5%]" : "right-[5%]";
    
    if (style === 'none') return null;

    return (
      <div className={`absolute bottom-[25%] ${cssPos} z-10 transition-all duration-500`}>
         {style === 'plant_pothos' && (
            <div className="flex flex-col items-center">
               <Flower2 className="text-green-600 w-12 h-12 animate-bounce-slow" />
               <div className="w-8 h-8 bg-orange-700 rounded-b-xl shadow-lg"></div>
            </div>
         )}
         {style === 'lamp_floor' && (
            <div className="flex flex-col items-center">
               <div className={`w-12 h-8 bg-yellow-100/80 blur-md rounded-full ${isNight ? 'opacity-100' : 'opacity-0'}`}></div>
               <Lamp className="w-16 h-48 text-slate-800" />
            </div>
         )}
         {(style === 'bookshelf_small' || style === 'bookshelf_tall') && (
            <div className={`${style === 'bookshelf_tall' ? 'w-24 h-64' : 'w-20 h-32'} bg-[#3E2723] border-4 border-[#271c19] shadow-2xl flex flex-col justify-around px-1`}>
               {[...Array(style === 'bookshelf_tall' ? 5 : 2)].map((_,i) => (
                  <div key={i} className="w-full h-1 bg-[#271c19] relative">
                     <div className="absolute bottom-1 left-0 flex gap-0.5">
                        <div className="w-2 h-6 bg-red-700"></div>
                        <div className="w-2 h-5 bg-blue-700"></div>
                        <div className="w-2 h-7 bg-green-700"></div>
                     </div>
                  </div>
               ))}
            </div>
         )}
         {style === 'statue_themis' && (
            <div className="w-16 h-40 flex items-center justify-center relative">
               <Scale className="w-16 h-16 text-yellow-600 absolute top-0 animate-pulse" />
               <div className="w-10 h-32 bg-gradient-to-b from-yellow-100 to-yellow-600 rounded-full opacity-80 mt-8"></div>
            </div>
         )}
         {style === 'painting_abstract' && (
            <div className="absolute bottom-32 -left-4 w-20 h-28 bg-white border-4 border-black shadow-xl flex items-center justify-center overflow-hidden">
               <div className="w-full h-full bg-gradient-to-tr from-blue-500 via-red-500 to-yellow-500 transform rotate-45"></div>
            </div>
         )}
         {style === 'diploma' && (
            <div className="absolute bottom-40 -right-4 w-16 h-12 bg-white border-4 border-yellow-600 shadow-md flex items-center justify-center p-1">
               <div className="w-full h-full border border-slate-200 flex flex-col gap-0.5 justify-center items-center">
                  <div className="w-8 h-0.5 bg-black"></div>
                  <div className="w-6 h-0.5 bg-black"></div>
                  <div className="w-2 h-2 rounded-full bg-red-600 mt-1"></div>
               </div>
            </div>
         )}
         {style === 'clock_wall' && (
            <div className="absolute bottom-60 -right-4 w-12 h-12 bg-white rounded-full border-4 border-black shadow-lg flex items-center justify-center">
               <div className="w-0.5 h-4 bg-black absolute top-2 origin-bottom rotate-45"></div>
               <div className="w-0.5 h-3 bg-black absolute top-3 origin-bottom -rotate-12"></div>
            </div>
         )}
      </div>
    );
  };

  // --- UI RENDER ---

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-slate-500 bg-slate-100 border-slate-200';
      case 'rare': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'epic': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'legendary': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-1000 relative pb-20 px-2 md:px-0">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Gabinete Virtual</h2>
          <p className="text-slate-500 font-bold italic text-sm md:text-lg">Construa seu império jurídico, caixa por caixa.</p>
        </div>
        
        <div className="flex gap-2">
           {/* BOTÃO DA CAIXA DE RECOMPENSAS */}
           <button 
             onClick={openBox}
             disabled={availableBoxes <= 0}
             className={`group relative px-6 py-2 rounded-xl flex items-center gap-3 border-2 transition-all shadow-lg ${availableBoxes > 0 ? 'bg-sanfran-rubi border-sanfran-rubi text-white hover:scale-105 hover:bg-sanfran-rubiDark' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 cursor-not-allowed'}`}
           >
              <div className="relative">
                 <Gift className={`w-5 h-5 ${availableBoxes > 0 ? 'animate-bounce' : ''}`} />
                 {availableBoxes > 0 && (
                   <span className="absolute -top-2 -right-2 w-4 h-4 bg-usp-gold text-slate-900 rounded-full text-[9px] font-black flex items-center justify-center shadow-sm">
                     {availableBoxes}
                   </span>
                 )}
              </div>
              <div className="text-left">
                 <p className="text-[8px] font-black uppercase tracking-widest opacity-80">SanFran Box</p>
                 <p className="text-xs font-black uppercase tracking-tight leading-none">{availableBoxes > 0 ? 'Abrir Agora' : `${(20 - (totalHours % 20)).toFixed(1)}h p/ próxima`}</p>
              </div>
           </button>

           <div className="bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-white/10">
              <Trophy className="w-4 h-4 text-usp-gold" />
              <span className="font-black text-slate-900 dark:text-white tabular-nums">{totalHours.toFixed(1)}h</span>
           </div>
           
           <button 
             onClick={() => setIsNight(!isNight)} 
             className="p-3 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-sanfran-rubi transition-colors"
           >
             {isNight ? <Moon size={20} /> : <Sun size={20} />}
           </button>
           <button 
             onClick={() => setIsEditing(!isEditing)} 
             className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg ${isEditing ? 'bg-white text-sanfran-rubi border-2 border-sanfran-rubi' : 'bg-white dark:bg-sanfran-rubiDark/40 text-slate-900 dark:text-white border border-slate-200 dark:border-sanfran-rubi/30'}`}
           >
             {isEditing ? <CheckCircle2 size={16} /> : <Palette size={16} />}
             {isEditing ? 'Concluir' : 'Decorar'}
           </button>
        </div>
      </div>

      {/* --- CENA 2.5D --- */}
      <div className={`relative w-full aspect-[16/9] md:aspect-[21/9] rounded-[2rem] border-[8px] border-slate-900 dark:border-black shadow-2xl overflow-hidden transition-all duration-700 bg-black group ${isEditing ? 'scale-[0.98] ring-4 ring-sanfran-rubi/50' : ''}`}>
         
         {/* LAYERS (Ordem Importa para o Z-Index "Natural") */}
         
         {/* 1. Parede (Fundo) */}
         {renderWall()}

         {/* 2. Janela (Corta a parede) */}
         {renderWindow()}

         {/* 3. Chão (Base) */}
         {renderFloor()}

         {/* 4. Tapete (Sobre o chão) */}
         {renderRug()}

         {/* 5. Decoração Fundo (Esquerda/Direita) */}
         {renderDecor('left')}
         {renderDecor('right')}

         {/* 6. Cadeira (Atrás da mesa) */}
         {renderChair()}

         {/* 7. Mesa (Principal) */}
         {renderDesk()}

         {/* 8. Overlay de Atmosfera (Iluminação Global) */}
         <div className={`absolute inset-0 pointer-events-none mix-blend-overlay transition-colors duration-2000 ${isNight ? 'bg-indigo-900/60' : 'bg-orange-100/10'}`}></div>
         
         {/* 9. Partículas de Poeira (Vida) */}
         <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>

      </div>

      {/* --- MODAL DE GACHA OPENING --- */}
      {isOpeningBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           {!wonItem ? (
             <div className="flex flex-col items-center animate-bounce-slow">
                <div className="relative">
                   <div className="absolute inset-0 bg-sanfran-rubi blur-3xl opacity-50 animate-pulse"></div>
                   <Package size={150} className="text-white relative z-10 animate-shake" />
                </div>
                <p className="text-white font-black uppercase tracking-[0.5em] mt-8 animate-pulse">Abrindo Caixa...</p>
             </div>
           ) : (
             <div className="bg-white dark:bg-[#1a0505] p-10 rounded-[3rem] shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 border-4 border-sanfran-rubi animate-in zoom-in duration-500 relative overflow-hidden">
                {/* Raios de luz de fundo */}
                <div className="absolute inset-0 bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-white via-sanfran-rubi/20 to-white opacity-50 animate-spin-slow pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                   <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-xl ${getRarityColor(wonItem.item.rarity)}`}>
                      {/* Ícone Genérico baseado na categoria, poderia ser específico */}
                      <Gift size={64} /> 
                   </div>
                   
                   <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full mb-4 border ${getRarityColor(wonItem.item.rarity)}`}>
                      {wonItem.item.rarity === 'legendary' ? 'Item Lendário' : wonItem.item.rarity === 'epic' ? 'Item Épico' : wonItem.item.rarity === 'rare' ? 'Item Raro' : 'Item Comum'}
                   </span>

                   <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-2">{wonItem.item.name}</h3>
                   <p className="text-xs text-slate-500 font-bold mb-8">{wonItem.item.description}</p>

                   <div className="flex gap-3 w-full">
                      <button onClick={closeBoxModal} className="flex-1 py-4 bg-slate-100 dark:bg-white/10 text-slate-500 rounded-2xl font-black uppercase text-xs">Guardar</button>
                      <button onClick={equipItem} className="flex-1 py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs shadow-lg">Equipar</button>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

      {/* --- UI DE CUSTOMIZAÇÃO (LOJA / INVENTÁRIO) --- */}
      {isEditing && (
        <div className="mt-6 bg-white dark:bg-[#0d0303] rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 flex flex-col md:flex-row h-[400px]">
           
           {/* Sidebar Categorias */}
           <div className="w-full md:w-48 bg-slate-50 dark:bg-white/5 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 p-2 overflow-x-auto md:overflow-y-auto custom-scrollbar flex md:flex-col gap-2">
              {[
                { id: 'wall', label: 'Paredes', icon: Frame },
                { id: 'floor', label: 'Pisos', icon: Maximize2 },
                { id: 'window', label: 'Janelas', icon: Layout },
                { id: 'rug', label: 'Tapetes', icon: MousePointer2 },
                { id: 'desk', label: 'Mesas', icon:  Layout},
                { id: 'chair', label: 'Cadeiras', icon: Armchair },
                { id: 'desktop', label: 'Mesa', icon: Monitor },
                { id: 'decor_left', label: 'Decor Esq.', icon: Lamp },
                { id: 'decor_right', label: 'Decor Dir.', icon: Trophy },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id as ItemCategory)}
                  className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wide transition-all ${activeTab === cat.id ? 'bg-sanfran-rubi text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                >
                   <cat.icon size={16} /> {cat.label}
                </button>
              ))}
           </div>

           {/* Grid de Itens */}
           <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-100/50 dark:bg-black/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                 {CATALOG[activeTab].map(item => {
                    const isUnlocked = inventory.includes(item.id);
                    const isSelected = config[activeTab] === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        disabled={!isUnlocked}
                        onClick={() => handleSelect(activeTab, item.id)}
                        className={`group relative p-4 rounded-2xl border-2 transition-all text-left flex flex-col justify-between h-36 ${
                           isSelected 
                             ? 'border-sanfran-rubi bg-white dark:bg-white/10 ring-2 ring-sanfran-rubi/20 shadow-xl' 
                             : isUnlocked 
                                ? 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-slate-300 hover:-translate-y-1 hover:shadow-md' 
                                : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/40 opacity-60 cursor-not-allowed grayscale'
                        }`}
                      >
                         <div className="flex justify-between items-start mb-2">
                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${
                               item.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                               item.rarity === 'epic' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                               item.rarity === 'rare' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                               'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                               {item.rarity.charAt(0).toUpperCase()}
                            </span>
                            {isSelected && <CheckCircle2 size={16} className="text-sanfran-rubi" />}
                            {!isUnlocked && <Lock size={14} className="text-slate-400" />}
                         </div>

                         <div>
                            <p className="font-black text-xs text-slate-900 dark:text-white uppercase leading-tight mb-1">{item.name}</p>
                            <p className="text-[9px] text-slate-500 font-medium leading-tight">{item.description}</p>
                         </div>

                         {!isUnlocked && (
                           <div className="mt-auto pt-2 border-t border-dashed border-slate-200 dark:border-white/10">
                              <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                                <Package size={10} /> Em Caixas
                              </p>
                           </div>
                         )}
                      </button>
                    );
                 })}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default VirtualOffice;
