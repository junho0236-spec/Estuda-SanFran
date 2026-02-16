
import React, { useState, useEffect } from 'react';
import { ShoppingBag, RefreshCw, Plus, Trash2, ArrowRight, User, Package, Scale, Star, Info, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { OfficeTrade } from '../types';
import { CATALOG, OfficeItem, ItemCategory } from './VirtualOffice';
import confetti from 'canvas-confetti';

interface SeboProps {
  userId: string;
  userName: string;
}

const Sebo: React.FC<SeboProps> = ({ userId, userName }) => {
  const [trades, setTrades] = useState<OfficeTrade[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [selectedToOffer, setSelectedToOffer] = useState<string>('');
  const [selectedToRequest, setSelectedToRequest] = useState<string>('');

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('sebo_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'office_trades' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch trades
      const { data: tradesData } = await supabase
        .from('office_trades')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      setTrades(tradesData || []);

      // 2. Fetch my inventory
      const { data: officeData } = await supabase
        .from('office_state')
        .select('inventory')
        .eq('user_id', userId)
        .single();

      setInventory(officeData?.inventory || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getItemById = (id: string): OfficeItem | null => {
    for (const category in CATALOG) {
      const found = CATALOG[category as ItemCategory].find(i => i.id === id);
      if (found) return found;
    }
    return null;
  };

  // Agrupa inventário para mostrar repetidos
  const inventoryCounts = inventory.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleCreateTrade = async () => {
    if (!selectedToOffer || !selectedToRequest) return;

    try {
      const { error } = await supabase.from('office_trades').insert({
        user_id: userId,
        user_name: userName || 'Doutor(a)',
        offered_item_id: selectedToOffer,
        requested_item_id: selectedToRequest,
        status: 'open'
      });

      if (error) throw error;
      setShowAddModal(false);
      setSelectedToOffer('');
      setSelectedToRequest('');
      fetchData();
    } catch (e) {
      alert("Erro ao publicar anúncio no Sebo.");
    }
  };

  const handleAcceptTrade = async (trade: OfficeTrade) => {
    // 1. Verificar se eu tenho o item solicitado
    if (!inventory.includes(trade.requested_item_id)) {
      alert("Você não possui o item solicitado para esta troca.");
      return;
    }

    if (!confirm(`Deseja trocar seu '${getItemById(trade.requested_item_id)?.name}' pelo '${getItemById(trade.offered_item_id)?.name}' de ${trade.user_name}?`)) return;

    try {
      // PROCESSO DE TROCA (Lógica de Frontend Simulado - Idealmente seria um RPC atômico)
      
      // 1. Atualizar meu inventário (Remover o que dei, adicionar o que recebi)
      const myNewInventory = [...inventory];
      const removeIndex = myNewInventory.indexOf(trade.requested_item_id);
      myNewInventory.splice(removeIndex, 1);
      myNewInventory.push(trade.offered_item_id);

      // 2. Buscar e atualizar inventário do autor da oferta
      const { data: authorData } = await supabase.from('office_state').select('inventory').eq('user_id', trade.user_id).single();
      if (!authorData) throw new Error("Autor não encontrado");

      const authorNewInventory = [...authorData.inventory];
      const authorRemoveIndex = authorNewInventory.indexOf(trade.offered_item_id);
      authorNewInventory.splice(authorRemoveIndex, 1);
      authorNewInventory.push(trade.requested_item_id);

      // 3. Persistir mudanças
      const { error: err1 } = await supabase.from('office_state').update({ inventory: myNewInventory }).eq('user_id', userId);
      const { error: err2 } = await supabase.from('office_state').update({ inventory: authorNewInventory }).eq('user_id', trade.user_id);
      const { error: err3 } = await supabase.from('office_trades').update({ status: 'completed' }).eq('id', trade.id);

      if (err1 || err2 || err3) throw new Error("Falha na transação");

      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      alert("Troca realizada com sucesso! Os novos itens já estão em seus gabinetes.");
      fetchData();
    } catch (e) {
      alert("Erro crítico na transação de troca.");
    }
  };

  const cancelTrade = async (id: string) => {
    if (!confirm("Retirar anúncio do Sebo?")) return;
    try {
      await supabase.from('office_trades').delete().eq('id', id).eq('user_id', userId);
      fetchData();
    } catch (e) {
      alert("Erro ao cancelar.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-serif">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 font-sans">
        <div>
           <div className="inline-flex items-center gap-2 bg-stone-100 dark:bg-stone-900/40 px-4 py-2 rounded-full border border-stone-200 dark:border-stone-800 mb-4">
              <ShoppingBag className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-400">Antiquário Acadêmico</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">O Sebo</h2>
           <p className="text-stone-500 font-bold italic text-lg mt-2">Negocie itens repetidos e complete seu patrimônio decorativo.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={fetchData}
            className="p-4 bg-white dark:bg-white/5 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-400 hover:text-stone-600 transition-colors"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl hover:scale-105"
          >
             <Plus size={16} /> Anunciar Troca
          </button>
        </div>
      </header>

      {/* VITRINE DE TROCAS */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        {isLoading ? (
           <div className="flex flex-col items-center justify-center h-64 opacity-50 font-sans">
              <div className="w-12 h-12 border-4 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest">Avaliando raridades...</p>
           </div>
        ) : trades.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 border-4 border-dashed border-stone-200 dark:border-stone-800/40 rounded-[3rem] text-stone-400 text-center p-8">
              <Package size={64} className="mb-4 opacity-20" />
              <p className="text-xl font-black uppercase font-sans">Estantes Vazias</p>
              <p className="text-xs font-bold uppercase tracking-widest mt-2 font-sans">Nenhuma oferta de troca pública no momento.</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trades.map((trade) => {
                 const offered = getItemById(trade.offered_item_id);
                 const requested = getItemById(trade.requested_item_id);
                 const isMine = trade.user_id === userId;
                 
                 if (!offered || !requested) return null;

                 return (
                   <div key={trade.id} className="bg-[#fdfbf7] dark:bg-stone-900/30 p-6 rounded-[2.5rem] border-2 border-stone-200 dark:border-stone-800 shadow-lg group hover:border-stone-400 transition-all flex flex-col justify-between">
                      <div>
                         <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-stone-400 font-sans tracking-widest">
                               <User size={10} /> {trade.user_name} {isMine && '(Você)'}
                            </div>
                            {isMine && <button onClick={() => cancelTrade(trade.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>}
                         </div>

                         <div className="grid grid-cols-11 gap-2 items-center">
                            {/* Oferece */}
                            <div className="col-span-5 text-center">
                               <div className={`w-full aspect-square rounded-2xl ${offered.color} flex items-center justify-center mb-2 shadow-inner border border-black/5`}>
                                  <offered.icon size={30} className="text-black/40" />
                               </div>
                               <p className="text-[10px] font-black uppercase tracking-tight truncate">{offered.name}</p>
                               <span className="text-[8px] font-bold text-stone-400 uppercase">Oferece</span>
                            </div>

                            <div className="col-span-1 flex justify-center text-stone-300">
                               <ArrowRight size={20} />
                            </div>

                            {/* Pede */}
                            <div className="col-span-5 text-center">
                               <div className={`w-full aspect-square rounded-2xl ${requested.color} flex items-center justify-center mb-2 shadow-inner border border-black/5`}>
                                  <requested.icon size={30} className="text-black/40" />
                               </div>
                               <p className="text-[10px] font-black uppercase tracking-tight truncate">{requested.name}</p>
                               <span className="text-[8px] font-bold text-stone-400 uppercase">Pede</span>
                            </div>
                         </div>
                      </div>

                      <button 
                        onClick={() => handleAcceptTrade(trade)}
                        disabled={isMine}
                        className={`w-full mt-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest font-sans shadow-lg transition-all ${isMine ? 'bg-stone-100 text-stone-300 cursor-not-allowed' : 'bg-stone-800 text-white hover:bg-black active:scale-95'}`}
                      >
                         {isMine ? 'Seu Anúncio' : 'Aceitar Troca'}
                      </button>
                   </div>
                 );
              })}
           </div>
        )}
      </div>

      {/* MODAL PARA CRIAR ANÚNCIO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-[#fdfbf7] dark:bg-stone-950 rounded-[3rem] p-8 w-full max-w-2xl shadow-2xl border-4 border-stone-800 relative animate-in zoom-in-95 duration-300">
              
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-stone-400 hover:text-red-500"><X size={24} /></button>

              <h3 className="text-3xl font-black text-stone-900 dark:text-white uppercase tracking-tighter mb-2 font-sans">Novo Anúncio</h3>
              <p className="text-stone-500 font-bold italic mb-8">Escambo técnico: desapegue do que sobra, conquiste o que falta.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                 {/* Selecionar Oferta (Itens que eu tenho) */}
                 <div>
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest block mb-4 font-sans">1. O que você oferece?</label>
                    <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 custom-scrollbar bg-black/5 rounded-2xl border border-stone-200 dark:border-stone-800">
                       {Object.keys(inventoryCounts).map(id => {
                          const item = getItemById(id);
                          if (!item) return null;
                          const isSelected = selectedToOffer === id;
                          return (
                            <button 
                              key={id}
                              onClick={() => setSelectedToOffer(id)}
                              className={`aspect-square rounded-xl ${item.color} flex items-center justify-center relative transition-all border-2 ${isSelected ? 'border-stone-800 ring-2 ring-stone-800/20 scale-105 z-10' : 'border-transparent opacity-60 hover:opacity-100'}`}
                              title={`${item.name} (x${inventoryCounts[id]})`}
                            >
                               <item.icon size={20} className="text-black/40" />
                               <span className="absolute -top-1 -right-1 bg-stone-800 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{inventoryCounts[id]}</span>
                            </button>
                          )
                       })}
                    </div>
                 </div>

                 {/* Selecionar Desejo (Qualquer item do catálogo) */}
                 <div>
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest block mb-4 font-sans">2. O que você busca?</label>
                    <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 custom-scrollbar bg-black/5 rounded-2xl border border-stone-200 dark:border-stone-800">
                       {Object.values(CATALOG).flat().map(item => {
                          if (item.isDefault) return null; // Não troca básicos
                          const isSelected = selectedToRequest === item.id;
                          return (
                            <button 
                              key={item.id}
                              onClick={() => setSelectedToRequest(item.id)}
                              className={`aspect-square rounded-xl ${item.color} flex items-center justify-center transition-all border-2 ${isSelected ? 'border-stone-800 ring-2 ring-stone-800/20 scale-105 z-10' : 'border-transparent opacity-60 hover:opacity-100'}`}
                              title={item.name}
                            >
                               <item.icon size={20} className="text-black/40" />
                            </button>
                          )
                       })}
                    </div>
                 </div>
              </div>

              <div className="bg-stone-100 dark:bg-stone-900 p-6 rounded-[2rem] border border-stone-200 dark:border-stone-800 flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${selectedToOffer ? getItemById(selectedToOffer)?.color : 'bg-stone-200'}`}>
                       {selectedToOffer ? React.createElement(getItemById(selectedToOffer)!.icon, {size: 20}) : <Package className="text-stone-300" />}
                    </div>
                    <ArrowRight className="text-stone-300" />
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${selectedToRequest ? getItemById(selectedToRequest)?.color : 'bg-stone-200'}`}>
                       {selectedToRequest ? React.createElement(getItemById(selectedToRequest)!.icon, {size: 20}) : <Package className="text-stone-300" />}
                    </div>
                 </div>
                 <button 
                    onClick={handleCreateTrade}
                    disabled={!selectedToOffer || !selectedToRequest}
                    className="px-8 py-4 bg-stone-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest font-sans disabled:opacity-30 transition-all hover:bg-black shadow-lg"
                 >
                    Publicar Oferta
                 </button>
              </div>
           </div>
        </div>
      )}

      <footer className="text-center p-6 shrink-0 opacity-40 font-sans">
         <div className="flex items-center justify-center gap-2 text-stone-400">
            <Scale size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mercado Livre de Trocas • Regido pela Boa-Fé</span>
         </div>
      </footer>
    </div>
  );
};

export default Sebo;
