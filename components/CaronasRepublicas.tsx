
import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Home, 
  MapPin, 
  Clock, 
  DollarSign, 
  Phone, 
  Plus, 
  Users, 
  Search, 
  Filter, 
  X,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { MobilityPost } from '../types';

interface CaronasRepublicasProps {
  userId: string;
  userName: string;
}

const CaronasRepublicas: React.FC<CaronasRepublicasProps> = ({ userId, userName }) => {
  const [activeTab, setActiveTab] = useState<'carona' | 'republica'>('carona');
  const [posts, setPosts] = useState<MobilityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newSpots, setNewSpots] = useState(3);

  useEffect(() => {
    fetchPosts();
    
    const channel = supabase
      .channel('mobility_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_mobility_posts' }, () => fetchPosts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]); // Refetch when tab changes to keep focus

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sf_mobility_posts')
      .select('*')
      .eq('type', activeTab)
      .order('created_at', { ascending: false });
    
    if (data) setPosts(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContact.trim() || !newLocation.trim()) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    try {
      const { error } = await supabase.from('sf_mobility_posts').insert({
        type: activeTab,
        title: newTitle,
        description: newDesc,
        location: newLocation,
        time: activeTab === 'carona' ? newTime : null,
        price: newPrice,
        contact_info: newContact,
        available_spots: activeTab === 'carona' ? newSpots : 0,
        user_id: userId,
        user_name: userName || 'Estudante'
      });

      if (error) throw error;
      
      setShowCreateModal(false);
      setNewTitle(''); setNewDesc(''); setNewLocation(''); setNewTime(''); setNewPrice(''); setNewContact('');
      alert("Anúncio publicado com sucesso!");
    } catch (e) {
      alert("Erro ao publicar anúncio.");
    }
  };

  const handleReserve = async (post: MobilityPost) => {
    if (post.type !== 'carona' || post.available_spots <= 0) return;
    
    if (!confirm("Reservar um lugar nesta carona? Combine os detalhes pelo WhatsApp após reservar.")) return;

    try {
      // Simple decrement logic. In a full app, we'd have a 'reservations' table.
      const { error } = await supabase.from('sf_mobility_posts').update({
        available_spots: post.available_spots - 1
      }).eq('id', post.id);

      if (error) throw error;
      
      // Open WhatsApp
      const phone = post.contact_info.replace(/\D/g, '');
      if (phone) {
         window.open(`https://wa.me/${phone}?text=Olá! Reservei um lugar na sua carona pelo SanFran App.`, '_blank');
      }

    } catch (e) {
      alert("Erro ao reservar.");
    }
  };

  const openWhatsApp = (contact: string) => {
    const phone = contact.replace(/\D/g, '');
    if (phone) {
       window.open(`https://wa.me/${phone}?text=Olá! Vi seu anúncio no SanFran App.`, '_blank');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/20 px-4 py-2 rounded-full border border-teal-200 dark:border-teal-800 mb-4">
              {activeTab === 'carona' ? <Car className="w-4 h-4 text-teal-600 dark:text-teal-400" /> : <Home className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
              <span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === 'carona' ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {activeTab === 'carona' ? 'Logística Solidária' : 'Moradia Universitária'}
              </span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">SanFran Move</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">
             {activeTab === 'carona' ? 'Encontre sua rota para as Arcadas.' : 'Repúblicas, Vagas e Roommates.'}
           </p>
        </div>
        
        <div className="flex gap-3">
           <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex">
              <button 
                onClick={() => setActiveTab('carona')}
                className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'carona' ? 'bg-white dark:bg-teal-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                 <Car size={14} /> Caronas
              </button>
              <button 
                onClick={() => setActiveTab('republica')}
                className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'republica' ? 'bg-white dark:bg-orange-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                 <Home size={14} /> Moradia
              </button>
           </div>
           <button 
             onClick={() => setShowCreateModal(true)}
             className={`h-full px-6 py-3 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2 ${activeTab === 'carona' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-orange-600 hover:bg-orange-700'}`}
           >
              <Plus size={18} /> Anunciar
           </button>
        </div>
      </header>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Buscando oportunidades...</div>
         ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
               {activeTab === 'carona' ? <Car size={48} className="mb-4 text-slate-400" /> : <Home size={48} className="mb-4 text-slate-400" />}
               <p className="text-xl font-black text-slate-500 uppercase">Nenhum anúncio</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Seja o primeiro a oferecer ajuda.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {posts.map(post => (
                  <div key={post.id} className={`bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2.5rem] border-2 shadow-lg hover:shadow-xl transition-all relative overflow-hidden group ${activeTab === 'carona' ? 'border-teal-200 dark:border-teal-900/30' : 'border-orange-200 dark:border-orange-900/30'}`}>
                     
                     {/* Header */}
                     <div className="flex justify-between items-start mb-4">
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${activeTab === 'carona' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                           {activeTab === 'carona' ? <Users size={10} /> : <MapPin size={10} />}
                           {activeTab === 'carona' ? `${post.available_spots} Vagas` : post.location}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">{new Date(post.created_at).toLocaleDateString()}</span>
                     </div>

                     <div className="mb-6">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">
                           {post.title}
                        </h3>
                        {activeTab === 'carona' && (
                           <div className="flex items-center gap-2 text-slate-500 mb-2">
                              <Clock size={14} className="text-teal-500" />
                              <span className="text-xs font-bold uppercase">Saída: {post.time || 'A combinar'}</span>
                           </div>
                        )}
                        <p className="text-xs font-medium text-slate-500 line-clamp-3 mb-3">{post.description}</p>
                        
                        {post.price && (
                           <p className={`text-sm font-black ${activeTab === 'carona' ? 'text-teal-600' : 'text-orange-600'}`}>
                              {post.price === 'Gratuito' ? 'Gratuito' : post.price}
                           </p>
                        )}
                     </div>

                     <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2">
                        {activeTab === 'carona' && post.user_id !== userId && post.available_spots > 0 && (
                           <button 
                             onClick={() => handleReserve(post)}
                             className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform"
                           >
                              Reservar
                           </button>
                        )}
                        <button 
                           onClick={() => openWhatsApp(post.contact_info)}
                           className={`flex-1 py-3 border-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'carona' ? 'border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20' : 'border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}
                        >
                           WhatsApp
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-lg rounded-[2.5rem] p-8 border-4 shadow-2xl relative border-slate-200 dark:border-slate-800">
               <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                  <Plus size={24} className={activeTab === 'carona' ? 'text-teal-500' : 'text-orange-500'} />
                  Novo Anúncio: {activeTab === 'carona' ? 'Carona' : 'Moradia'}
               </h3>

               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Título / Rota</label>
                     <input 
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)} 
                        placeholder={activeTab === 'carona' ? "Ex: Zona Sul -> SanFran (Noite)" : "Ex: Vaga em Quarto Individual"} 
                        className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-slate-400" 
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Local / Bairro</label>
                        <input 
                           value={newLocation} 
                           onChange={e => setNewLocation(e.target.value)} 
                           placeholder="Ex: Vila Mariana" 
                           className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-slate-400" 
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{activeTab === 'carona' ? 'Horário' : 'Valor'}</label>
                        {activeTab === 'carona' ? (
                           <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-slate-400" />
                        ) : (
                           <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="R$ 1500" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-slate-400" />
                        )}
                     </div>
                  </div>

                  {activeTab === 'carona' && (
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vagas</label>
                           <input type="number" min="1" max="6" value={newSpots} onChange={e => setNewSpots(Number(e.target.value))} className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-slate-400" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor (Ajuda Custo)</label>
                           <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Ex: R$ 10,00" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-slate-400" />
                        </div>
                     </div>
                  )}

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contato (WhatsApp)</label>
                     <input value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="11999999999" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-slate-400" />
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição</label>
                     <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Detalhes adicionais..." className="w-full h-24 p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-medium text-sm outline-none focus:border-slate-400 resize-none" />
                  </div>

                  <button 
                     onClick={handleCreate}
                     className={`w-full py-4 text-white rounded-xl font-black uppercase text-sm shadow-xl hover:scale-[1.02] transition-transform ${activeTab === 'carona' ? 'bg-teal-600' : 'bg-orange-600'}`}
                  >
                     Publicar Anúncio
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default CaronasRepublicas;
