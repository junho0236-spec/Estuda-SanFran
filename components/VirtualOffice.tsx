
import React, { useState, useEffect, useRef } from 'react';
import { StudySession } from '../types';
import { 
  Layout, Palette, Armchair, Monitor, Trophy, Lock, CheckCircle2, 
  Save, Moon, Sun, MousePointer2, Maximize2, Scale, Gavel, 
  Coffee, Book, Flower2, Lamp, Frame, Gift, Package, Sparkles, X, Star,
  BrickWall, Grid3x3, Box, Sword, Globe, Music, Landmark, Leaf, Lightbulb, 
  Fan, Tv, Scroll, Crown, Gem, Ghost, Briefcase, Clock, Keyboard, AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabaseClient';

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
  icon: React.ElementType; // Ícone para o preview
  color: string; // Cor base para o preview
  isDefault?: boolean;
}

// --- CATÁLOGO EXPANDIDO ---
const CATALOG: Record<ItemCategory, OfficeItem[]> = {
  wall: [
    { id: 'wall_white', name: 'Alvenaria Branca', description: 'O clássico básico.', rarity: 'common', icon: Box, color: 'bg-slate-100', isDefault: true },
    { id: 'wall_concrete', name: 'Concreto Aparente', description: 'Estilo industrial moderno.', rarity: 'common', icon: Box, color: 'bg-zinc-400' },
    { id: 'wall_brick', name: 'Tijolinho Paulista', description: 'Rústico e acolhedor.', rarity: 'rare', icon: BrickWall, color: 'bg-orange-700' },
    { id: 'wall_navy', name: 'Azul Petróleo', description: 'Foco e serenidade profunda.', rarity: 'rare', icon: Palette, color: 'bg-slate-800' },
    { id: 'wall_classic', name: 'Boiserie Creme', description: 'Clássico advocatício.', rarity: 'epic', icon: Frame, color: 'bg-amber-50' },
    { id: 'wall_green', name: 'Verde Biblioteca', description: 'Estilo inglês vitoriano.', rarity: 'epic', icon: Palette, color: 'bg-emerald-900' },
    { id: 'wall_wood', name: 'Painel de Nogueira', description: 'Revestimento de alto padrão.', rarity: 'legendary', icon: Layout, color: 'bg-amber-900' },
    { id: 'wall_marble', name: 'Mármore Carrara', description: 'O ápice do luxo.', rarity: 'legendary', icon: Gem, color: 'bg-slate-50' },
  ],
  floor: [
    { id: 'floor_concrete', name: 'Cimento Queimado', description: 'Frio e funcional.', rarity: 'common', icon: Box, color: 'bg-zinc-300', isDefault: true },
    { id: 'floor_laminate', name: 'Laminado Carvalho', description: 'Aconchego básico.', rarity: 'common', icon: Layout, color: 'bg-orange-200' },
    { id: 'floor_checker', name: 'Xadrez Clássico', description: 'Preto e branco atemporal.', rarity: 'rare', icon: Grid3x3, color: 'bg-slate-900' },
    { id: 'floor_herringbone', name: 'Taco Espinha', description: 'Tradicional de SP.', rarity: 'rare', icon: Layout, color: 'bg-amber-700' },
    { id: 'floor_darkwood', name: 'Ébano Envelhecido', description: 'Madeira nobre escura.', rarity: 'epic', icon: Layout, color: 'bg-stone-900' },
    { id: 'floor_marble', name: 'Mármore Negro', description: 'Reflete seu sucesso.', rarity: 'legendary', icon: Gem, color: 'bg-black' },
  ],
  window: [
    { id: 'win_basement', name: 'Janela Alta', description: 'Entra pouca luz.', rarity: 'common', icon: Box, color: 'bg-slate-200', isDefault: true },
    { id: 'win_standard', name: 'Janela Padrão', description: 'Vista para o prédio vizinho.', rarity: 'common', icon: Layout, color: 'bg-sky-100' },
    { id: 'win_blinds', name: 'Persiana Horizontal', description: 'Privacidade total.', rarity: 'rare', icon: Layout, color: 'bg-slate-300' },
    { id: 'win_large', name: 'Janela Panorâmica', description: 'Muita luz natural.', rarity: 'epic', icon: Maximize2, color: 'bg-sky-200' },
    { id: 'win_arch', name: 'Arco das Arcadas', description: 'Estilo colonial histórico.', rarity: 'epic', icon: Landmark, color: 'bg-amber-100' },
    { id: 'win_glass', name: 'Parede de Vidro', description: 'Vista da Faria Lima.', rarity: 'legendary', icon: Maximize2, color: 'bg-cyan-100' },
  ],
  desk: [
    { id: 'desk_door', name: 'Porta e Cavaletes', description: 'O começo de tudo.', rarity: 'common', icon: Layout, color: 'bg-amber-200', isDefault: true },
    { id: 'desk_white', name: 'Mesa MDF Branca', description: 'Funcional e barata.', rarity: 'common', icon: Layout, color: 'bg-white' },
    { id: 'desk_glass', name: 'Vidro Moderno', description: 'Design minimalista.', rarity: 'rare', icon: Monitor, color: 'bg-cyan-200' },
    { id: 'desk_wood', name: 'Escrivaninha Mogno', description: 'Sólida e respeitável.', rarity: 'rare', icon: Briefcase, color: 'bg-amber-900' },
    { id: 'desk_l', name: 'Estação em L', description: 'Muito espaço para processos.', rarity: 'epic', icon: Layout, color: 'bg-slate-800' },
    { id: 'desk_antique', name: 'Mesa do Século XIX', description: 'Uma antiguidade valiosa.', rarity: 'epic', icon: Scroll, color: 'bg-amber-950' },
    { id: 'desk_president', name: 'Mesa Presidencial', description: 'Madeira maciça esculpida.', rarity: 'legendary', icon: Crown, color: 'bg-yellow-900' },
  ],
  chair: [
    { id: 'chair_plastic', name: 'Cadeira de Plástico', description: 'Temporária (esperamos).', rarity: 'common', icon: Armchair, color: 'bg-slate-200', isDefault: true },
    { id: 'chair_wood', name: 'Banco de Madeira', description: 'Duro, mas honesto.', rarity: 'common', icon: Armchair, color: 'bg-amber-700' },
    { id: 'chair_office', name: 'Cadeira Secretária', description: 'Rodinhas que travam.', rarity: 'common', icon: Armchair, color: 'bg-blue-900' },
    { id: 'chair_gamer', name: 'Ergonômica Mesh', description: 'Cuide da sua lombar.', rarity: 'rare', icon: Armchair, color: 'bg-black' },
    { id: 'chair_velvet', name: 'Poltrona Veludo', description: 'Conforto vintage.', rarity: 'epic', icon: Armchair, color: 'bg-emerald-800' },
    { id: 'chair_leather', name: 'Executiva Couro', description: 'Couro legítimo.', rarity: 'epic', icon: Armchair, color: 'bg-amber-950' },
    { id: 'chair_magistrate', name: 'Trono do Juiz', description: 'Espaldar alto e ouro.', rarity: 'legendary', icon: Gavel, color: 'bg-red-900' },
  ],
  rug: [
    { id: 'rug_none', name: 'Sem Tapete', description: 'Fácil de limpar.', rarity: 'common', icon: X, color: 'bg-transparent', isDefault: true },
    { id: 'rug_grey', name: 'Tapete Cinza', description: 'Discreto.', rarity: 'common', icon: MousePointer2, color: 'bg-slate-400' },
    { id: 'rug_stripes', name: 'Listrado P&B', description: 'Moderno.', rarity: 'rare', icon: MousePointer2, color: 'bg-slate-800' },
    { id: 'rug_red', name: 'Tapete Vermelho', description: 'Recepção de gala.', rarity: 'rare', icon: MousePointer2, color: 'bg-red-700' },
    { id: 'rug_persian', name: 'Tapete Persa', description: 'Herança de família.', rarity: 'epic', icon: Sparkles, color: 'bg-red-900' },
    { id: 'rug_sanfran', name: 'Brasão XI de Agosto', description: 'Orgulho acadêmico.', rarity: 'legendary', icon: Trophy, color: 'bg-yellow-500' },
  ],
  decor_left: [
    { id: 'none', name: 'Vazio', description: '', rarity: 'common', icon: X, color: 'bg-transparent', isDefault: true },
    { id: 'plant_pothos', name: 'Jiboia no Vaso', description: 'Purifica o ar.', rarity: 'common', icon: Leaf, color: 'bg-green-500' },
    { id: 'lamp_floor', name: 'Luminária de Piso', description: 'Luz indireta.', rarity: 'common', icon: Lightbulb, color: 'bg-yellow-200' },
    { id: 'fan', name: 'Ventilador Antigo', description: 'Para dias quentes.', rarity: 'rare', icon: Fan, color: 'bg-slate-400' },
    { id: 'bookshelf_small', name: 'Estante Baixa', description: 'Vade Mecum e Doutrinas.', rarity: 'rare', icon: Book, color: 'bg-amber-800' },
    { id: 'globe', name: 'Globo Terrestre', description: 'Direito Internacional.', rarity: 'epic', icon: Globe, color: 'bg-blue-600' },
    { id: 'statue_themis', name: 'Estátua da Justiça', description: 'Cega e imparcial.', rarity: 'epic', icon: Scale, color: 'bg-yellow-600' },
    { id: 'armor', name: 'Armadura Medieval', description: 'Direito Romano puro.', rarity: 'legendary', icon: Ghost, color: 'bg-slate-300' },
  ],
  decor_right: [
    { id: 'none', name: 'Vazio', description: '', rarity: 'common', icon: X, color: 'bg-transparent', isDefault: true },
    { id: 'diploma', name: 'Diploma Moldurado', description: 'Sua credencial.', rarity: 'common', icon: Scroll, color: 'bg-white' },
    { id: 'painting_abstract', name: 'Arte Abstrata', description: 'Toque de cor.', rarity: 'rare', icon: Palette, color: 'bg-purple-500' },
    { id: 'clock_wall', name: 'Relógio Antigo', description: 'O tempo ruge.', rarity: 'rare', icon: Clock, color: 'bg-amber-900' },
    { id: 'sword', name: 'Espada Cerimonial', description: 'A força do Direito.', rarity: 'epic', icon: Sword, color: 'bg-slate-400' },
    { id: 'gramophone', name: 'Gramofone', description: 'Música clássica.', rarity: 'epic', icon: Music, color: 'bg-amber-700' },
    { id: 'bookshelf_tall', name: 'Biblioteca Parede', description: 'Conhecimento infinito.', rarity: 'legendary', icon: Book, color: 'bg-amber-950' },
  ],
  desktop: [
    { id: 'none', name: 'Mesa Limpa', description: 'Foco total.', rarity: 'common', icon: X, color: 'bg-transparent', isDefault: true },
    { id: 'messy_papers', name: 'Pilhas de Processos', description: 'Vida de estagiário.', rarity: 'common', icon: Scroll, color: 'bg-white' },
    { id: 'laptop_coffee', name: 'Notebook e Café', description: 'Setup padrão.', rarity: 'common', icon: Monitor, color: 'bg-slate-800' },
    { id: 'typewriter', name: 'Máquina de Escrever', description: 'Old school.', rarity: 'rare', icon: Keyboard, color: 'bg-slate-600' },
    { id: 'dual_monitor', name: 'Monitores Duplos', description: 'Multitarefa suprema.', rarity: 'epic', icon: Tv, color: 'bg-black' },
    { id: 'gavel_set', name: 'Martelo e Livros', description: 'Autoridade.', rarity: 'legendary', icon: Gavel, color: 'bg-amber-800' },
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
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  
  // --- STATE DO GACHA (AGORA VIA SUPABASE) ---
  const [inventory, setInventory] = useState<string[]>([]);
  const [availableBoxes, setAvailableBoxes] = useState(0);
  const [boxesOpened, setBoxesOpened] = useState(0);
  const [bonusBoxes, setBonusBoxes] = useState(0);
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [wonItem, setWonItem] = useState<{item: OfficeItem, category: ItemCategory} | null>(null);

  const totalSeconds = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const totalHours = totalSeconds / 3600;

  // Carregar dados do Supabase
  useEffect(() => {
    const loadOfficeData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let { data, error } = await supabase
          .from('office_state')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // Usuário não tem estado, criar inicial
          const initialItems: string[] = [];
          Object.values(CATALOG).forEach(categoryItems => {
            categoryItems.forEach(item => {
              if (item.isDefault) initialItems.push(item.id);
            });
          });

          const { data: newData, error: insertError } = await supabase
            .from('office_state')
            .insert({
              user_id: user.id,
              inventory: initialItems,
              config: DEFAULT_CONFIG,
              boxes_opened: 0,
              bonus_boxes: 0
            })
            .select()
            .single();
          
          if (insertError) throw insertError;
          data = newData;
        } else if (error) {
          throw error;
        }

        if (data) {
          setInventory(data.inventory || []);
          setConfig(data.config || DEFAULT_CONFIG);
          setBoxesOpened(data.boxes_opened || 0);
          setBonusBoxes(data.bonus_boxes || 0);
        }
      } catch (err) {
        console.error("Erro ao carregar escritório:", err);
        setDbError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadOfficeData();

    const hour = new Date().getHours();
    setIsNight(hour < 6 || hour > 18);
  }, [userName]);

  // Lógica de Ganhar Caixas (Cálculo Persistente)
  // Total Ganhas = (Horas Totais / 20) + BonusBoxes - BoxesOpened
  useEffect(() => {
    if (!isLoading) {
        const boxesEarnedFromHours = Math.floor(totalHours / 20);
        const totalAvailable = (boxesEarnedFromHours + bonusBoxes) - boxesOpened;
        setAvailableBoxes(Math.max(0, totalAvailable));
    }
  }, [totalHours, boxesOpened, bonusBoxes, isLoading]);


  const handleSelect = async (category: ItemCategory, id: string) => {
    const newConfig = { ...config, [category]: id };
    setConfig(newConfig); // Atualiza UI instantaneamente
    
    // Salva no banco
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('office_state').update({ config: newConfig }).eq('user_id', user.id);
        }
    } catch (e) {
        console.error("Falha ao salvar configuração", e);
    }
  };

  // --- LÓGICA DO GACHA (ABRIR CAIXA) ---
  const openBox = async () => {
    if (availableBoxes <= 0) return;

    setIsOpeningBox(true);
    // Optimistic update
    setAvailableBoxes(prev => prev - 1);
    const newBoxesOpenedCount = boxesOpened + 1;
    setBoxesOpened(newBoxesOpenedCount);

    setTimeout(async () => {
      // 1. Sorteio
      const roll = Math.random() * 100;
      let rarity: Rarity = 'common';
      if (roll > 98) rarity = 'legendary';      // 2%
      else if (roll > 90) rarity = 'epic';      // 8%
      else if (roll > 60) rarity = 'rare';      // 30%
      else rarity = 'common';                   // 60%

      let pool: {item: OfficeItem, category: ItemCategory}[] = [];
      Object.entries(CATALOG).forEach(([cat, items]) => {
        items.forEach(item => {
          if (item.rarity === rarity) {
            pool.push({ item, category: cat as ItemCategory });
          }
        });
      });

      const unowned = pool.filter(p => !inventory.includes(p.item.id));
      let finalPick;
      
      if (unowned.length > 0) {
        finalPick = unowned[Math.floor(Math.random() * unowned.length)];
      } else {
        finalPick = pool[Math.floor(Math.random() * pool.length)];
      }

      if (!finalPick) {
         const fallbackItem = CATALOG.desk[0];
         finalPick = { item: fallbackItem, category: 'desk' as ItemCategory};
      }

      // 2. Persistência no Supabase
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              const newInventory = inventory.includes(finalPick.item.id) 
                  ? inventory 
                  : [...inventory, finalPick.item.id];
              
              if (!inventory.includes(finalPick.item.id)) {
                  setInventory(newInventory);
              }

              await supabase.from('office_state').update({ 
                  inventory: newInventory,
                  boxes_opened: newBoxesOpenedCount
              }).eq('user_id', user.id);
          }
      } catch (e) {
          console.error("Erro ao salvar recompensa", e);
          alert("Erro de conexão ao salvar item. A caixa será restaurada.");
          setAvailableBoxes(prev => prev + 1);
          setBoxesOpened(prev => prev - 1);
          setIsOpeningBox(false);
          return;
      }

      setWonItem(finalPick);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      
    }, 2000);
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

  // ... (RENDERERS MANTIDOS)
  const renderWall = () => {
    const style = config.wall;
    let bgClass = "bg-slate-200";
    if (style === 'wall_concrete') bgClass = "bg-[#a3a3a3]";
    if (style === 'wall_brick') bgClass = "bg-[#7c2d12]";
    if (style === 'wall_navy') bgClass = "bg-[#1e293b]";
    if (style === 'wall_classic') bgClass = "bg-[#fdfbf7]";
    if (style === 'wall_green') bgClass = "bg-[#064e3b]";
    if (style === 'wall_wood') bgClass = "bg-[#4a3b32]";
    if (style === 'wall_marble') bgClass = "bg-slate-100"; 

    return (
      <div className={`absolute inset-0 ${bgClass} transition-colors duration-1000`}>
        {style === 'wall_concrete' && <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')]"></div>}
        {style === 'wall_brick' && (
           <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,#000_20px),repeating-linear-gradient(90deg,transparent,transparent_39px,#000_40px)]"></div>
        )}
        {style === 'wall_classic' && (
          <div className="w-full h-full flex justify-around px-10 items-center">
             <div className="w-32 h-[70%] border-4 border-[#e2e8f0] shadow-sm rounded-sm"></div>
             <div className="w-32 h-[70%] border-4 border-[#e2e8f0] shadow-sm rounded-sm"></div>
             <div className="w-32 h-[70%] border-4 border-[#e2e8f0] shadow-sm rounded-sm"></div>
          </div>
        )}
        {(style === 'wall_wood' || style === 'wall_green') && (
           <div className="w-full h-full flex">
              {[...Array(10)].map((_, i) => <div key={i} className="flex-1 border-r border-black/20 bg-gradient-to-r from-transparent to-black/10"></div>)}
           </div>
        )}
        <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-black/30 to-transparent pointer-events-none"></div>
      </div>
    );
  };

  const renderFloor = () => {
    const style = config.floor;
    let bgClass = "bg-stone-300";
    if (style === 'floor_laminate') bgClass = "bg-[#d4b483]";
    if (style === 'floor_checker') bgClass = "bg-[#1a1a1a]";
    if (style === 'floor_herringbone') bgClass = "bg-[#a67c52]";
    if (style === 'floor_darkwood') bgClass = "bg-[#271c19]";
    if (style === 'floor_marble') bgClass = "bg-[#1a1a1a]";

    return (
      <div className={`absolute bottom-0 w-full h-[35%] ${bgClass} transition-colors duration-1000 perspective-origin-center transform-style-3d`}>
         {style === 'floor_checker' && (
            <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc),repeating-linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc)] bg-[length:40px_40px]"></div>
         )}
         {style === 'floor_herringbone' && <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_11px)]"></div>}
         {style === 'floor_laminate' && <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,transparent_90%,#000_100%)] bg-[length:100px_100%]"></div>}
         <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
      </div>
    );
  };

  const renderWindow = () => {
    const style = config.window;
    let bg = "bg-sky-200";
    let frameColor = "border-slate-100";
    let width = "w-1/3";
    let height = "h-1/3";
    let top = "top-[20%]";
    let left = "left-1/2 -translate-x-1/2";
    let blinds = false;
    let grid = false;
    let arch = false;

    if (style === 'win_basement') { width = "w-1/2"; height = "h-16"; top = "top-[10%]"; }
    if (style === 'win_standard') { grid = true; }
    if (style === 'win_blinds') { blinds = true; }
    if (style === 'win_large') { width = "w-2/3"; height = "h-1/2"; top = "top-[15%]"; }
    if (style === 'win_arch') { arch = true; width = "w-1/3"; height = "h-1/2"; }
    if (style === 'win_glass') { width = "w-full"; height = "h-2/3"; top = "top-[10%]"; left="left-0"; frameColor="border-none"; }

    return (
      <div className={`absolute ${top} ${left} ${width} ${height} ${arch ? 'rounded-t-full' : ''} bg-sky-300 border-4 ${frameColor} shadow-inner overflow-hidden z-0`}>
        <div className={`absolute inset-0 ${isNight ? 'bg-slate-900' : 'bg-sky-300'}`}>
           {isNight && <div className="absolute top-4 right-4 w-8 h-8 bg-slate-200 rounded-full shadow-[0_0_20px_white]"></div>}
           {!isNight && <div className="absolute top-2 right-10 w-12 h-12 bg-yellow-300 rounded-full blur-xl opacity-80"></div>}
           <div className="absolute bottom-0 w-full h-1/3 bg-slate-700/20 backdrop-blur-[1px]"></div>
        </div>
        {grid && (
           <div className="absolute inset-0 border-4 border-slate-100 grid grid-cols-2 grid-rows-2 gap-1 bg-slate-100">
              <div className="bg-transparent opacity-0"></div>
           </div>
        )}
        {blinds && (
           <div className="absolute inset-0 flex flex-col justify-between py-1">
              {[...Array(10)].map((_, i) => <div key={i} className="w-full h-2 bg-slate-100 shadow-sm"></div>)}
           </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
      </div>
    );
  };

  const renderRug = () => {
    const style = config.rug;
    if (style === 'rug_none') return null;
    let bgClass = "bg-slate-400";
    let shape = "rounded-sm";
    let width = "w-1/2";
    if (style === 'rug_grey') bgClass = "bg-slate-400";
    if (style === 'rug_stripes') bgClass = "bg-[repeating-linear-gradient(90deg,#1e293b,#1e293b_20px,#f8fafc_20px,#f8fafc_40px)]";
    if (style === 'rug_red') { bgClass = "bg-red-800 border-4 border-yellow-600"; width="w-[40%]"; }
    if (style === 'rug_persian') { bgClass = "bg-[radial-gradient(circle,rgba(127,29,29,1)_0%,rgba(69,10,10,1)_100%)] border-8 border-double border-yellow-900"; width="w-[45%]"; }
    if (style === 'rug_sanfran') { bgClass = "bg-yellow-500 border-4 border-black"; width="w-[30%] rounded-full"; }
    return (
       <div className={`absolute bottom-[10%] left-1/2 -translate-x-1/2 h-[20%] ${width} ${bgClass} ${shape} shadow-sm transform perspective-500 rotate-x-60 opacity-90 pointer-events-none z-10`}>
          {style === 'rug_sanfran' && <div className="absolute inset-0 flex items-center justify-center text-black font-black text-xs opacity-50">XI DE AGOSTO</div>}
       </div>
    );
  };

  const renderChair = () => {
    const style = config.chair;
    let color = "bg-slate-700";
    let type = "standard";
    if (style === 'chair_plastic') { color = "bg-white"; }
    if (style === 'chair_wood') { color = "bg-[#5D4037]"; }
    if (style === 'chair_office') { color = "bg-blue-900"; }
    if (style === 'chair_gamer') { color = "bg-black border-2 border-red-500"; type="fancy"; }
    if (style === 'chair_velvet') { color = "bg-emerald-800"; type="fancy"; }
    if (style === 'chair_leather') { color = "bg-[#3E2723]"; type="fancy"; }
    if (style === 'chair_magistrate') { color = "bg-red-900 border-4 border-yellow-500"; type="throne"; }
    return (
      <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none">
         <div className={`w-16 ${type === 'throne' ? 'h-32 rounded-t-full' : type === 'fancy' ? 'h-24 rounded-t-xl' : 'h-20 rounded-t-md'} ${color} shadow-xl relative`}>
            {type === 'throne' && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-500 rounded-full shadow-md"></div>}
         </div>
         <div className={`w-16 h-2 ${color} brightness-75`}></div>
         <div className="w-12 h-12 border-l-4 border-r-4 border-slate-800"></div>
      </div>
    );
  };

  const renderDesk = () => {
    const style = config.desk;
    let width = "w-[50%]";
    let color = "bg-slate-300";
    let legs = true;
    let legsColor = "bg-slate-400";
    let glass = false;
    if (style === 'desk_white') { color = "bg-white border-b-4 border-slate-200"; width="w-[55%]"; }
    if (style === 'desk_wood') { color = "bg-[#5D4037] border-b-4 border-[#3E2723]"; width="w-[60%]"; legsColor="bg-[#3E2723]"; }
    if (style === 'desk_glass') { color = "bg-cyan-100/30 backdrop-blur-sm border border-white/50"; width="w-[55%]"; glass=true; legsColor="bg-slate-300"; }
    if (style === 'desk_l') { color = "bg-[#2d3748] border-b-4 border-black"; width="w-[65%]"; legsColor="bg-black"; }
    if (style === 'desk_antique') { color = "bg-[#4a3b32] border-b-8 border-[#271c19]"; width="w-[65%]"; legs=false; }
    if (style === 'desk_president') { color = "bg-[linear-gradient(90deg,#3E2723,#5D4037,#3E2723)] border-b-8 border-[#271c19]"; width="w-[70%]"; legs=false; }
    return (
      <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full pointer-events-none">
         <div className={`${width} h-8 ${color} rounded-sm relative shadow-2xl flex items-end justify-center perspective-500`}>
            {!legs && (
               <div className={`absolute top-8 w-[95%] h-32 ${style === 'desk_antique' ? 'bg-[#4a3b32]' : 'bg-[#3E2723]'} flex justify-between px-4 py-2 shadow-2xl`}>
                  <div className="w-1/4 h-full border border-white/10 flex flex-col gap-1 p-1">
                     <div className="w-full h-1/3 bg-black/20 shadow-inner mb-1"></div>
                     <div className="w-full h-1/3 bg-black/20 shadow-inner"></div>
                  </div>
                  <div className="w-1/4 h-full border border-white/10 flex flex-col gap-1 p-1">
                     <div className="w-full h-1/3 bg-black/20 shadow-inner mb-1"></div>
                     <div className="w-full h-1/3 bg-black/20 shadow-inner"></div>
                  </div>
               </div>
            )}
            {renderDesktopItems()}
         </div>
         {legs && (
            <div className={`${width} flex justify-between px-4 -mt-1`}>
               {style === 'desk_door' ? (
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
         {style === 'typewriter' && (
            <div className="w-16 h-10 bg-black rounded-md flex items-center justify-center relative">
               <div className="w-10 h-4 bg-white absolute -top-2"></div>
            </div>
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
         {style === 'fan' && (
            <div className="flex flex-col items-center">
               <Fan className="w-16 h-16 text-slate-400 animate-spin-slow" />
               <div className="w-2 h-20 bg-slate-500"></div>
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
         {style === 'globe' && (
            <div className="flex flex-col items-center">
               <Globe className="w-16 h-16 text-blue-600" />
               <div className="w-12 h-16 bg-amber-800 -mt-2 clip-path-polygon"></div>
            </div>
         )}
         {style === 'sword' && (
            <div className="w-8 h-40 bg-slate-800/10 flex items-center justify-center">
               <Sword className="w-12 h-32 text-slate-400 rotate-180 drop-shadow-xl" />
            </div>
         )}
         {style === 'gramophone' && (
            <div className="relative">
               <Music className="absolute -top-10 left-0 animate-bounce text-slate-400" size={16} />
               <div className="w-16 h-16 bg-amber-900 rounded-lg"></div>
               <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-600 rounded-full border-4 border-yellow-800 transform scale-x-50 rotate-45 origin-bottom-left opacity-80"></div>
            </div>
         )}
      </div>
    );
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-slate-500 bg-slate-100 border-slate-200';
      case 'rare': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'epic': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'legendary': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-slate-500';
    }
  };

  if (isLoading) {
    return (
        <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sanfran-rubi"></div>
        </div>
    );
  }

  if (dbError) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
         <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
         <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-white">Erro de Conexão</h2>
         <p className="text-slate-500 font-bold max-w-md mt-2">Não foi possível carregar seu escritório. Verifique se a tabela 'office_state' foi criada no Supabase.</p>
      </div>
    );
  }

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
         {renderWall()}
         {renderWindow()}
         {renderFloor()}
         {renderRug()}
         {renderDecor('left')}
         {renderDecor('right')}
         {renderChair()}
         {renderDesk()}
         <div className={`absolute inset-0 pointer-events-none mix-blend-overlay transition-colors duration-2000 ${isNight ? 'bg-indigo-900/60' : 'bg-orange-100/10'}`}></div>
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
                <div className="relative z-10 flex flex-col items-center text-center w-full">
                   {/* CARD DO ITEM GANHO */}
                   <div className={`w-full aspect-square rounded-[2rem] mb-6 shadow-xl flex items-center justify-center relative overflow-hidden ${wonItem.item.color}`}>
                      <div className="absolute inset-0 bg-white/20"></div>
                      <wonItem.item.icon size={80} className="text-black/50 drop-shadow-lg" />
                      <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm">
                         {wonItem.item.rarity === 'legendary' ? <Star className="text-yellow-400 fill-current" /> : <Sparkles />}
                      </div>
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
        <div className="mt-6 bg-white dark:bg-[#0d0303] rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 flex flex-col md:flex-row h-[500px]">
           
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

           {/* Grid de Itens COM PREVIEW VISUAL */}
           <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-100/50 dark:bg-black/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                 {CATALOG[activeTab].map(item => {
                    const isUnlocked = inventory.includes(item.id);
                    const isSelected = config[activeTab] === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        disabled={!isUnlocked}
                        onClick={() => handleSelect(activeTab, item.id)}
                        className={`group relative rounded-2xl border-2 transition-all text-left flex flex-col justify-between overflow-hidden ${
                           isSelected 
                             ? 'border-sanfran-rubi ring-2 ring-sanfran-rubi/20 shadow-xl scale-[1.02]' 
                             : isUnlocked 
                                ? 'border-slate-200 dark:border-white/5 hover:border-slate-300 hover:-translate-y-1 hover:shadow-md' 
                                : 'border-slate-100 dark:border-white/5 opacity-60 cursor-not-allowed grayscale'
                        } bg-white dark:bg-[#1a1a1a]`}
                      >
                         {/* PREVIEW VISUAL BOX */}
                         <div className={`h-24 w-full ${item.color} flex items-center justify-center relative overflow-hidden`}>
                            {/* Texture overlay hint */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
                            
                            {/* Icon Center */}
                            <item.icon className="text-white/80 w-10 h-10 drop-shadow-md transform group-hover:scale-110 transition-transform" />
                            
                            {isSelected && (
                               <div className="absolute top-2 right-2 bg-sanfran-rubi text-white p-1 rounded-full shadow-lg">
                                  <CheckCircle2 size={12} />
                               </div>
                            )}
                            {!isUnlocked && (
                               <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                                  <Lock size={20} className="text-white/50" />
                               </div>
                            )}
                         </div>

                         <div className="p-3">
                            <div className="flex justify-between items-center mb-1">
                               <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  item.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                  item.rarity === 'epic' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                  item.rarity === 'rare' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                  'bg-slate-100 text-slate-500 border-slate-200'
                               }`}>
                                  {item.rarity.charAt(0).toUpperCase()}
                               </span>
                            </div>

                            <p className="font-black text-[10px] text-slate-900 dark:text-white uppercase leading-tight mb-1 truncate">{item.name}</p>
                            
                            {!isUnlocked ? (
                               <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1 mt-2">
                                 <Package size={8} /> Em Caixas
                               </p>
                            ) : (
                               <p className="text-[8px] text-slate-500 font-medium leading-tight line-clamp-2">{item.description}</p>
                            )}
                         </div>
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
