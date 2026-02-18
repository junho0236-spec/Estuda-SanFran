
import React, { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Phone, Clock, AlertCircle, CheckCircle, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AchadosPerdidosProps {
  userId: string;
  userName: string;
}

interface LostFoundItem {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  description: string;
  location: string;
  image_url?: string;
  status: 'lost' | 'found';
  contact_info: string;
  created_at: string;
}

const AchadosPerdidos: React.FC<AchadosPerdidosProps> = ({ userId, userName }) => {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStatus, setNewStatus] = useState<'lost' | 'found'>('lost');
  const [newContact, setNewContact] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    fetchItems();
    
    const channel = supabase
      .channel('lost_found_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_lost_found' }, () => fetchItems())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    // Filtrar itens dos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data } = await supabase
      .from('sf_lost_found')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    
    if (data) setItems(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContact.trim()) {
      alert("Título e contato são obrigatórios.");
      return;
    }

    try {
      const { error } = await supabase.from('sf_lost_found').insert({
        title: newTitle,
        description: newDesc,
        location: newLocation,
        status: newStatus,
        contact_info: newContact,
        image_url: newImageUrl,
        user_id: userId,
        user_name: userName || 'Anônimo'
      });

      if (error) throw error;
      
      setShowModal(false);
      setNewTitle(''); setNewDesc(''); setNewLocation(''); setNewContact(''); setNewImageUrl('');
      alert("Item publicado no mural!");
    } catch (e) {
      alert("Erro ao publicar.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este item do mural?")) return;
    try {
      await supabase.from('sf_lost_found').delete().eq('id', id).eq('user_id', userId);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const openWhatsApp = (contact: string, title: string) => {
    const phone = contact.replace(/\D/g, '');
    if (phone) {
       window.open(`https://wa.me/${phone}?text=Olá! Vi seu post sobre "${title}" no Achados e Perdidos SanFran.`, '_blank');
    }
  };

  const filteredItems = filter === 'all' ? items : items.filter(i => i.status === filter);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/20 px-4 py-2 rounded-full border border-orange-200 dark:border-orange-800 mb-4">
              <Search className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Utilidade Pública</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Achados e Perdidos</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Mural comunitário do Largo. Itens expiram em 7 dias.</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all hover:bg-orange-700"
        >
           <Plus size={16} /> Publicar Item
        </button>
      </header>

      {/* FILTROS */}
      <div className="flex gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
         <button onClick={() => setFilter('all')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Todos</button>
         <button onClick={() => setFilter('lost')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'lost' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400'}`}>Perdidos</button>
         <button onClick={() => setFilter('found')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'found' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}>Achados</button>
      </div>

      {/* GRID */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Vasculhando o Pátio...</div>
         ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
               <Search size={48} className="mb-4 text-slate-400" />
               <p className="text-xl font-black text-slate-500 uppercase">Nada por aqui</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Nenhum objeto reportado recentemente.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {filteredItems.map(item => (
                  <div key={item.id} className={`bg-white dark:bg-sanfran-rubiDark/20 rounded-[2rem] overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all flex flex-col group ${item.status === 'lost' ? 'border-red-200 dark:border-red-900/30' : 'border-emerald-200 dark:border-emerald-900/30'}`}>
                     
                     {/* Image Area */}
                     <div className="h-48 bg-slate-100 dark:bg-black/20 relative overflow-hidden flex items-center justify-center">
                        {item.image_url ? (
                           <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                           <div className="text-slate-300 flex flex-col items-center">
                              <ImageIcon size={32} />
                              <span className="text-[8px] font-bold uppercase mt-2">Sem Foto</span>
                           </div>
                        )}
                        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1 ${item.status === 'lost' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                           {item.status === 'lost' ? <AlertCircle size={10} /> : <CheckCircle size={10} />}
                           {item.status === 'lost' ? 'Procura-se' : 'Encontrado'}
                        </div>
                     </div>

                     <div className="p-6 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight line-clamp-2">{item.title}</h3>
                           {item.user_id === userId && (
                              <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                           )}
                        </div>
                        
                        <div className="space-y-2 mb-4 flex-1">
                           {item.location && (
                              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                 <MapPin size={12} /> {item.location}
                              </p>
                           )}
                           <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">{item.description || 'Sem descrição.'}</p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 mt-auto">
                           <div className="flex justify-between items-center mb-3">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                 <Clock size={10} /> {new Date(item.created_at).toLocaleDateString()}
                              </span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">{item.user_name.split(' ')[0]}</span>
                           </div>
                           <button 
                             onClick={() => openWhatsApp(item.contact_info, item.title)}
                             className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 ${item.status === 'lost' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                           >
                              <Phone size={12} /> {item.status === 'lost' ? 'Eu Tenho!' : 'É Meu!'}
                           </button>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* MODAL */}
      {showModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-lg rounded-[2.5rem] p-8 border-4 border-orange-500 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
               <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                  <Search size={24} className="text-orange-500" /> Reportar Item
               </h3>

               <div className="space-y-4">
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                     <button onClick={() => setNewStatus('lost')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${newStatus === 'lost' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500'}`}>Perdi</button>
                     <button onClick={() => setNewStatus('found')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${newStatus === 'found' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500'}`}>Achei</button>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">O que é?</label>
                     <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Caderno Vermelho" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-orange-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Local</label>
                        <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Ex: Biblio" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-orange-500" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">WhatsApp</label>
                        <input value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="1199..." className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-orange-500" />
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição</label>
                     <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Detalhes, marca, cor..." className="w-full h-20 p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-medium text-sm outline-none focus:border-orange-500 resize-none" />
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Foto (URL da Imagem)</label>
                     <input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://..." className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-orange-500 text-blue-500" />
                     <p className="text-[8px] text-slate-400 mt-1 ml-1">*Cole o link direto da imagem (Imgur, Drive público, etc).</p>
                  </div>

                  <button 
                     onClick={handleCreate}
                     className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-sm shadow-xl hover:scale-[1.02] transition-transform mt-2"
                  >
                     Publicar Aviso
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default AchadosPerdidos;
