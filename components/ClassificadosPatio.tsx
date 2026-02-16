
import React, { useState, useEffect } from 'react';
import { Megaphone, Search, Plus, TrendingUp, Users, Book, Clock, Phone, Mail, Pin, Star, Coins, Trash2, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ClassifiedAd, StudySession } from '../types';
import confetti from 'canvas-confetti';

interface ClassificadosPatioProps {
  userId: string;
  userName: string;
  studySessions: StudySession[];
}

const CATEGORIES = [
  { id: 'resumos', label: 'Ofereço Resumos', icon: Book, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'grupo_estudo', label: 'Busco Grupo', icon: Users, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { id: 'material', label: 'Vendo/Troco Material', icon: TrendingUp, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { id: 'plantao', label: 'Troco Plantão', icon: Clock, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { id: 'outros', label: 'Diversos', icon: Megaphone, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
];

const BOOST_COST = 50;

const ClassificadosPatio: React.FC<ClassificadosPatioProps> = ({ userId, userName, studySessions }) => {
  const [ads, setAds] = useState<ClassifiedAd[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Balance
  const [spentCoins, setSpentCoins] = useState(0);
  
  // Form
  const [newAd, setNewAd] = useState({
    title: '',
    description: '',
    category: 'resumos',
    contact_info: '',
    is_boosted: false
  });

  // Calculate Balance
  // 1 hora de estudo = 10 SF$
  const totalSeconds = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const earnedCoins = Math.floor((totalSeconds / 3600) * 10);
  const currentBalance = Math.max(0, earnedCoins - spentCoins);

  useEffect(() => {
    fetchAds();
    fetchSpentCoins();

    const channel = supabase
      .channel('patio_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patio_classifieds' }, () => fetchAds())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchAds = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('patio_classifieds')
        .select('*')
        .order('is_boosted', { ascending: false }) // Boosted first
        .order('created_at', { ascending: false }); // Then newest
      
      if (data) setAds(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSpentCoins = async () => {
    try {
      const { data } = await supabase.from('user_wallet').select('spent_coins').eq('user_id', userId).single();
      if (data) setSpentCoins(data.spent_coins);
    } catch (e) {
      // Tabela pode não existir ainda
    }
  };

  const handleCreateAd = async () => {
    if (!newAd.title || !newAd.description || !newAd.contact_info) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (newAd.is_boosted && currentBalance < BOOST_COST) {
      alert(`Saldo insuficiente para destaque. Você precisa de ${BOOST_COST} SF$. Estude mais para ganhar moedas!`);
      return;
    }

    try {
      // 1. Inserir Anúncio
      const { error } = await supabase.from('patio_classifieds').insert({
        user_id: userId,
        user_name: userName || 'Estudante Anônimo',
        title: newAd.title,
        description: newAd.description,
        category: newAd.category,
        contact_info: newAd.contact_info,
        is_boosted: newAd.is_boosted
      });

      if (error) throw error;

      // 2. Descontar Moedas (se boosted)
      if (newAd.is_boosted) {
        const newSpent = spentCoins + BOOST_COST;
        await supabase.from('user_wallet').upsert({
          user_id: userId,
          spent_coins: newSpent,
          updated_at: new Date().toISOString()
        });
        setSpentCoins(newSpent);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }

      setIsModalOpen(false);
      setNewAd({ title: '', description: '', category: 'resumos', contact_info: '', is_boosted: false });
      alert("Anúncio fixado no mural!");

    } catch (e) {
      console.error(e);
      alert("Erro ao publicar anúncio.");
    }
  };

  const deleteAd = async (id: string) => {
    if(!confirm("Remover anúncio do mural?")) return;
    try {
      await supabase.from('patio_classifieds').delete().eq('id', id).eq('user_id', userId);
      setAds(prev => prev.filter(a => a.id !== id));
    } catch(e) {
      console.error(e);
    }
  };

  const filteredAds = filterCategory === 'todos' ? ads : ads.filter(a => a.category === filterCategory);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/20 px-4 py-2 rounded-full border border-yellow-200 dark:border-yellow-800 mb-4">
              <Megaphone className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">O Classificados do Pátio</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Mural de Oportunidades</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Troque conhecimentos, materiais e plantões.</p>
        </div>
        
        <div className="flex gap-4 items-center">
           <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
              <Coins className="w-5 h-5 text-yellow-400" fill="currentColor" />
              <div>
                 <p className="text-[8px] font-black uppercase tracking-widest opacity-80">Saldo SF$</p>
                 <p className="text-xl font-black tabular-nums leading-none">{currentBalance}</p>
              </div>
           </div>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="h-full px-6 py-3 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
           >
              <Plus size={18} /> Anunciar
           </button>
        </div>
      </header>

      {/* FILTROS */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
         <button 
           onClick={() => setFilterCategory('todos')}
           className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterCategory === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}
         >
            Todos
         </button>
         {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${filterCategory === cat.id ? 'bg-white border-2 border-slate-200 shadow-md text-slate-900' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}
            >
               <cat.icon size={12} /> {cat.label}
            </button>
         ))}
      </div>

      {/* GRID DE ANÚNCIOS */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {isLoading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-sanfran-rubi"></div></div>
         ) : filteredAds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
               <Pin size={48} className="mb-4 text-slate-400" />
               <p className="font-bold text-slate-500">Mural Vazio.</p>
               <p className="text-xs text-slate-400 mt-1">Seja o primeiro a pendurar um aviso.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
               {filteredAds.map(ad => {
                  const categoryStyle = CATEGORIES.find(c => c.id === ad.category) || CATEGORIES[4];
                  const isMine = ad.user_id === userId;

                  return (
                     <div 
                        key={ad.id} 
                        className={`relative p-6 rounded-[2rem] border-2 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl min-h-[220px] ${ad.is_boosted ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-400 shadow-yellow-500/10 order-first' : 'bg-white dark:bg-sanfran-rubiDark/20 border-slate-200 dark:border-sanfran-rubi/30 shadow-md'}`}
                     >
                        {ad.is_boosted && (
                           <div className="absolute -top-3 right-6 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm z-10">
                              <Star size={10} fill="currentColor" /> Destaque
                           </div>
                        )}
                        
                        {/* Pin Visual */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 shadow-sm border border-slate-400 dark:border-slate-500 z-10"></div>

                        <div>
                           <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest mb-3 ${categoryStyle.color}`}>
                              <categoryStyle.icon size={10} /> {categoryStyle.label}
                           </div>
                           
                           <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">
                              {ad.title}
                           </h3>
                           
                           <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-4 whitespace-pre-wrap">
                              {ad.description}
                           </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 mt-auto">
                           <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Contato: {ad.user_name}</p>
                           <div className="flex items-center justify-between">
                              <div className="flex gap-2">
                                 {ad.contact_info.includes('@') ? (
                                    <a href={`mailto:${ad.contact_info}`} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 transition-colors text-slate-600"><Mail size={14} /></a>
                                 ) : (
                                    <a href={`https://wa.me/${ad.contact_info.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors"><Phone size={14} /></a>
                                 )}
                              </div>
                              <span className="text-[8px] font-bold text-slate-300">{new Date(ad.created_at).toLocaleDateString()}</span>
                           </div>
                           {isMine && (
                              <button onClick={() => deleteAd(ad.id)} className="absolute bottom-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Trash2 size={14} />
                              </button>
                           )}
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>

      {/* MODAL DE CRIAÇÃO */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border-4 border-slate-900 dark:border-sanfran-rubi/30 relative">
               <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-6">Novo Classificado</h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                     <select 
                        value={newAd.category}
                        onChange={(e) => setNewAd({...newAd, category: e.target.value})}
                        className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-sanfran-rubi"
                     >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                     </select>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Título</label>
                     <input 
                        value={newAd.title}
                        onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                        placeholder="Ex: Grupo de Estudo Civil II - Noite"
                        className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-sanfran-rubi"
                        maxLength={50}
                     />
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição</label>
                     <textarea 
                        value={newAd.description}
                        onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                        placeholder="Detalhes da oferta..."
                        className="w-full h-24 p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-medium text-sm outline-none focus:border-sanfran-rubi resize-none"
                        maxLength={200}
                     />
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contato (WhatsApp ou Email)</label>
                     <input 
                        value={newAd.contact_info}
                        onChange={(e) => setNewAd({...newAd, contact_info: e.target.value})}
                        placeholder="11999999999 ou email@usp.br"
                        className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-sanfran-rubi"
                     />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800/30 cursor-pointer" onClick={() => setNewAd({...newAd, is_boosted: !newAd.is_boosted})}>
                     <div className={`w-5 h-5 rounded border flex items-center justify-center ${newAd.is_boosted ? 'bg-yellow-500 border-yellow-600' : 'bg-white border-slate-300'}`}>
                        {newAd.is_boosted && <Star size={12} className="text-white" fill="currentColor" />}
                     </div>
                     <div className="flex-1">
                        <p className="text-xs font-black uppercase text-yellow-700 dark:text-yellow-500">Destacar Anúncio</p>
                        <p className="text-[10px] font-bold text-yellow-600/70">Custo: {BOOST_COST} SF$</p>
                     </div>
                  </div>

                  <button 
                     onClick={handleCreateAd}
                     disabled={isLoading}
                     className="w-full py-4 bg-sanfran-rubi text-white rounded-xl font-black uppercase text-sm shadow-xl hover:bg-sanfran-rubiDark transition-all"
                  >
                     {isLoading ? 'Publicando...' : 'Fixar no Mural'}
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default ClassificadosPatio;
