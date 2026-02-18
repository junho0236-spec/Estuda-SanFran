
import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Coffee, Utensils, Beer, Printer, BookOpen, Star, Plus, Map, Filter, X, MessageSquare, Info } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Place, PlaceReview } from '../types';

interface GuiaSobrevivenciaProps {
  userId: string;
  userName: string;
}

interface PlaceWithStats extends Place {
  avg_price: number;
  avg_distance: number;
  avg_wifi: number;
  review_count: number;
  latest_tip?: string;
}

const CATEGORIES = [
  { id: 'cafe', label: 'Café p/ Estudar', icon: Coffee, color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400' },
  { id: 'almoco', label: 'Almoço Barato', icon: Utensils, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400' },
  { id: 'happy_hour', label: 'Happy Hour', icon: Beer, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400' },
  { id: 'xerox', label: 'Xerox Rápida', icon: Printer, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400' },
  { id: 'livraria', label: 'Livraria / Sebo', icon: BookOpen, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' },
];

const GuiaSobrevivencia: React.FC<GuiaSobrevivenciaProps> = ({ userId, userName }) => {
  const [places, setPlaces] = useState<PlaceWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('todos');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Forms
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceCat, setNewPlaceCat] = useState('cafe');
  const [newPlaceAddress, setNewPlaceAddress] = useState('');

  const [ratingPrice, setRatingPrice] = useState(3);
  const [ratingDistance, setRatingDistance] = useState(3); // 1 = Longe, 5 = Perto
  const [ratingWifi, setRatingWifi] = useState(3);
  const [veteranTip, setVeteranTip] = useState('');

  useEffect(() => {
    fetchData();

    const subPlaces = supabase.channel('places_sub')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_places' }, () => fetchData())
        .subscribe();

    const subReviews = supabase.channel('reviews_sub')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_place_reviews' }, () => fetchData())
        .subscribe();

    return () => {
        supabase.removeChannel(subPlaces);
        supabase.removeChannel(subReviews);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: placesData, error: placesError } = await supabase.from('sf_places').select('*');
        if (placesError) throw placesError;

        const { data: reviewsData, error: reviewsError } = await supabase.from('sf_place_reviews').select('*');
        if (reviewsError) throw reviewsError;

        const enriched: PlaceWithStats[] = placesData.map(p => {
            const pReviews = reviewsData.filter((r: PlaceReview) => r.place_id === p.id);
            const count = pReviews.length;
            
            const avgPrice = count > 0 ? pReviews.reduce((a, b) => a + b.rating_price, 0) / count : 0;
            const avgDist = count > 0 ? pReviews.reduce((a, b) => a + b.rating_distance, 0) / count : 0;
            const avgWifi = count > 0 ? pReviews.reduce((a, b) => a + b.rating_wifi, 0) / count : 0;
            
            // Get latest non-empty tip
            const tips = pReviews.filter(r => r.veteran_tip).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const latestTip = tips.length > 0 ? tips[0].veteran_tip : undefined;

            return {
                ...p,
                avg_price: avgPrice,
                avg_distance: avgDist,
                avg_wifi: avgWifi,
                review_count: count,
                latest_tip: latestTip
            };
        });

        setPlaces(enriched);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleAddPlace = async () => {
      if (!newPlaceName.trim()) { alert("Nome é obrigatório"); return; }
      try {
          const { error } = await supabase.from('sf_places').insert({
              name: newPlaceName,
              category: newPlaceCat,
              address: newPlaceAddress,
              created_by: userId
          });
          if (error) throw error;
          setShowAddModal(false);
          setNewPlaceName(''); setNewPlaceAddress('');
          alert("Local adicionado ao mapa!");
      } catch (e) {
          alert("Erro ao adicionar local.");
      }
  };

  const handleAddReview = async () => {
      if (!selectedPlaceId) return;
      try {
          const { error } = await supabase.from('sf_place_reviews').insert({
              place_id: selectedPlaceId,
              user_id: userId,
              user_name: userName || 'Anônimo',
              rating_price: ratingPrice,
              rating_distance: ratingDistance,
              rating_wifi: ratingWifi,
              veteran_tip: veteranTip
          });
          if (error) throw error;
          setShowReviewModal(false);
          setVeteranTip('');
          setRatingPrice(3); setRatingDistance(3); setRatingWifi(3);
          alert("Avaliação registrada!");
      } catch (e) {
          alert("Erro ao avaliar.");
      }
  };

  const filteredPlaces = filter === 'todos' ? places : places.filter(p => p.category === filter);

  const StarBar = ({ value, label }: { value: number, label: string }) => (
      <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-slate-500 w-full">
          <span className="w-12 text-right">{label}</span>
          <div className="flex-1 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${(value / 5) * 100}%` }}></div>
          </div>
          <span className="w-6 text-slate-700 dark:text-slate-300">{value.toFixed(1)}</span>
      </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-200 dark:border-emerald-800 mb-4">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Mapa Colaborativo</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Guia de Sobrevivência</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Os melhores points ao redor das Arcadas, avaliados por quem frequenta.</p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all hover:bg-emerald-700"
        >
           <Plus size={16} /> Novo Point
        </button>
      </header>

      {/* FILTROS */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
         <button onClick={() => setFilter('todos')} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}>Todos</button>
         {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${filter === cat.id ? 'bg-white border-2 border-slate-200 shadow-md text-slate-900' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}
            >
               <cat.icon size={12} /> {cat.label}
            </button>
         ))}
      </div>

      {/* GRID */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Carregando Mapa...</div>
         ) : filteredPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
               <Map size={48} className="mb-4 text-slate-400" />
               <p className="text-xl font-black text-slate-500 uppercase">Mapa em Branco</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Nenhum local cadastrado nesta categoria.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredPlaces.map(place => {
                  const catStyle = CATEGORIES.find(c => c.id === place.category) || CATEGORIES[0];

                  return (
                     <div key={place.id} className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group">
                        
                        <div className="flex justify-between items-start mb-4">
                           <div className={`p-3 rounded-2xl ${catStyle.color}`}>
                              <catStyle.icon size={24} />
                           </div>
                           <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/20 px-2 py-1 rounded-lg">
                              <Star size={12} className="text-yellow-500 fill-current" />
                              <span className="text-[10px] font-black text-slate-500">{place.review_count > 0 ? (place.avg_price + place.avg_distance + place.avg_wifi)/3 : '-'}</span>
                           </div>
                        </div>

                        <div className="mb-4">
                           <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-1">{place.name}</h3>
                           <p className="text-xs text-slate-400 truncate">{place.address || 'Endereço não informado'}</p>
                        </div>

                        <div className="space-y-2 mb-6 bg-slate-50 dark:bg-black/10 p-3 rounded-xl">
                           <StarBar value={place.avg_price} label="Custo-Ben." />
                           <StarBar value={place.avg_distance} label="Perto" />
                           <StarBar value={place.avg_wifi} label="Wi-Fi" />
                        </div>

                        {place.latest_tip && (
                           <div className="relative bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/30 mb-4">
                              <div className="absolute -top-2 -right-1">
                                 <MessageSquare size={16} className="text-emerald-500 fill-current" />
                              </div>
                              <p className="text-[8px] font-black uppercase text-emerald-600 mb-1">Dica do Veterano</p>
                              <p className="text-xs font-medium text-slate-700 dark:text-emerald-100 italic line-clamp-2">"{place.latest_tip}"</p>
                           </div>
                        )}

                        <button 
                          onClick={() => { setSelectedPlaceId(place.id); setShowReviewModal(true); }}
                          className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                           Avaliar & Dar Dica
                        </button>
                     </div>
                  );
               })}
            </div>
         )}
      </div>

      {/* ADD PLACE MODAL */}
      {showAddModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-md rounded-[2.5rem] p-8 border-4 border-emerald-500 shadow-2xl relative">
               <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                  <MapPin size={24} className="text-emerald-500" /> Novo Local
               </h3>

               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome do Estabelecimento</label>
                     <input value={newPlaceName} onChange={e => setNewPlaceName(e.target.value)} placeholder="Ex: Café do Largo" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                     <select value={newPlaceCat} onChange={e => setNewPlaceCat(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-emerald-500">
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Endereço / Referência</label>
                     <input value={newPlaceAddress} onChange={e => setNewPlaceAddress(e.target.value)} placeholder="Ex: Rua Riachuelo, ao lado da facul" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" />
                  </div>
                  <button onClick={handleAddPlace} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-sm shadow-xl mt-2 hover:bg-emerald-700 transition-colors">
                     Adicionar ao Mapa
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* REVIEW MODAL */}
      {showReviewModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-md rounded-[2.5rem] p-8 border-4 border-amber-500 shadow-2xl relative">
               <button onClick={() => setShowReviewModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                  <Star size={24} className="text-amber-500" /> Avaliar Local
               </h3>

               <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                     <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-2">Custo-Benefício</label>
                        <select value={ratingPrice} onChange={e => setRatingPrice(Number(e.target.value))} className="w-full p-2 bg-slate-100 rounded-lg font-bold text-center border-2 border-transparent focus:border-amber-500 outline-none">
                           {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-2">Proximidade</label>
                        <select value={ratingDistance} onChange={e => setRatingDistance(Number(e.target.value))} className="w-full p-2 bg-slate-100 rounded-lg font-bold text-center border-2 border-transparent focus:border-amber-500 outline-none">
                           {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-2">Wi-Fi/Estudo</label>
                        <select value={ratingWifi} onChange={e => setRatingWifi(Number(e.target.value))} className="w-full p-2 bg-slate-100 rounded-lg font-bold text-center border-2 border-transparent focus:border-amber-500 outline-none">
                           {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 tracking-widest ml-1 flex items-center gap-1"><Info size={12} /> Dica do Veterano</label>
                     <textarea 
                        value={veteranTip} 
                        onChange={e => setVeteranTip(e.target.value)} 
                        placeholder="Ex: Peça o prato feito na terça, é melhor. O wi-fi do fundo é mais rápido." 
                        className="w-full h-24 p-3 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-800/30 rounded-xl font-medium text-sm outline-none focus:border-amber-500 resize-none mt-2" 
                        maxLength={140}
                     />
                  </div>

                  <button onClick={handleAddReview} className="w-full py-4 bg-amber-600 text-white rounded-xl font-black uppercase text-sm shadow-xl hover:bg-amber-700 transition-colors">
                     Publicar Review
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default GuiaSobrevivencia;
