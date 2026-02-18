import React, { useState, useEffect } from 'react';
import { 
  CalendarHeart, 
  MapPin, 
  Users, 
  Beer, 
  GraduationCap, 
  Trophy, 
  Plus, 
  CheckCircle2, 
  Search,
  Filter,
  X,
  Megaphone,
  Clock
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { SanFranEvent, EventRSVP } from '../types';
import confetti from 'canvas-confetti';

interface SocialEventsProps {
  userId: string;
  userName: string;
}

const CATEGORIES = [
  { id: 'festas', label: 'Festas & Integração', icon: Beer, color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
  { id: 'academico', label: 'Palestras & Julgamentos', icon: GraduationCap, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'esportes', label: 'Jogos & Atlética', icon: Trophy, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  { id: 'outros', label: 'Geral', icon: Megaphone, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }
];

const ORGANIZERS = [
  'C.A. XI de Agosto', 
  'A.A.A. XI de Agosto', 
  'Departamento Jurídico', 
  'Bateria de Samba',
  'Comissão de Formatura',
  'Grupo de Estudos',
  'Outro'
];

const SocialEvents: React.FC<SocialEventsProps> = ({ userId, userName }) => {
  const [events, setEvents] = useState<SanFranEvent[]>([]);
  const [rsvps, setRsvps] = useState<EventRSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('todos');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Form
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('festas');
  const [newOrganizer, setNewOrganizer] = useState(ORGANIZERS[0]);

  useEffect(() => {
    fetchData();

    // Realtime subscriptions
    const eventsChannel = supabase
      .channel('events_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_events' }, () => fetchData())
      .subscribe();

    const rsvpsChannel = supabase
      .channel('rsvps_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_event_rsvps' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(rsvpsChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [eventsRes, rsvpsRes] = await Promise.all([
      supabase.from('sf_events').select('*').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }),
      supabase.from('sf_event_rsvps').select('*')
    ]);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (rsvpsRes.data) setRsvps(rsvpsRes.data);
    setLoading(false);
  };

  const toggleRSVP = async (event: SanFranEvent) => {
    const existingRSVP = rsvps.find(r => r.event_id === event.id && r.user_id === userId);

    if (existingRSVP) {
      // Remove RSVP
      // Optimistic update
      setRsvps(prev => prev.filter(r => r.id !== existingRSVP.id));
      await supabase.from('sf_event_rsvps').delete().eq('id', existingRSVP.id);
    } else {
      // Add RSVP
      // Optimistic update logic is tricky without ID, so we wait for fetch or just insert
      try {
         const { error } = await supabase.from('sf_event_rsvps').insert({
            event_id: event.id,
            user_id: userId,
            user_name: userName || 'Anônimo'
         });
         
         if (!error) {
            confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
         }
      } catch (e) {
         console.error(e);
      }
    }
  };

  const createEvent = async () => {
    if (!newTitle.trim() || !newDate || !newTime || !newLocation) {
        alert("Preencha os campos obrigatórios.");
        return;
    }

    const fullDate = new Date(`${newDate}T${newTime}`);

    try {
        const { error } = await supabase.from('sf_events').insert({
            title: newTitle,
            description: newDescription,
            event_date: fullDate.toISOString(),
            location: newLocation,
            category: newCategory,
            organizer: newOrganizer,
            created_by: userId
        });

        if (error) throw error;
        setShowCreateModal(false);
        // Reset form
        setNewTitle(''); setNewDescription(''); setNewDate(''); setNewTime(''); setNewLocation('');
        alert("Evento publicado no calendário social!");
    } catch (e) {
        alert("Erro ao criar evento.");
    }
  };

  const filteredEvents = filter === 'todos' ? events : events.filter(e => e.category === filter);

  // Helper date format
  const formatDate = (dateStr: string) => {
     const d = new Date(dateStr);
     return {
        day: d.getDate(),
        month: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
     };
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/20 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-800 mb-4">
              <CalendarHeart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Vida Social</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Rolezinhos SanFran</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Onde a comunidade se encontra fora das salas de aula.</p>
        </div>
        
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
        >
           <Plus size={16} /> Novo Evento
        </button>
      </header>

      {/* FILTROS */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
         <button 
           onClick={() => setFilter('todos')}
           className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}
         >
            Todos
         </button>
         {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${filter === cat.id ? 'bg-white border-2 border-slate-200 shadow-md text-slate-900' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}
            >
               <cat.icon size={12} /> {cat.label}
            </button>
         ))}
      </div>

      {/* LISTA DE EVENTOS */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Carregando Agenda...</div>
         ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
               <CalendarHeart size={48} className="mb-4 text-slate-400" />
               <p className="text-xl font-black text-slate-500 uppercase">Agenda Vazia</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Nenhum evento programado. Crie o primeiro!</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {filteredEvents.map(event => {
                  const dateInfo = formatDate(event.event_date);
                  const categoryStyle = CATEGORIES.find(c => c.id === event.category) || CATEGORIES[3];
                  const eventRsvps = rsvps.filter(r => r.event_id === event.id);
                  const amIGoing = eventRsvps.some(r => r.user_id === userId);

                  return (
                     <div key={event.id} className="bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] p-6 border-2 border-slate-200 dark:border-white/5 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden">
                        
                        {/* Background Decoration */}
                        <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-10 blur-2xl ${event.category === 'festas' ? 'bg-pink-500' : event.category === 'esportes' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>

                        <div className="flex justify-between items-start mb-4 relative z-10">
                           <div className="bg-slate-100 dark:bg-black/40 rounded-2xl p-3 text-center border border-slate-200 dark:border-white/10 min-w-[70px]">
                              <span className="block text-2xl font-black text-slate-900 dark:text-white leading-none">{dateInfo.day}</span>
                              <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">{dateInfo.month}</span>
                           </div>
                           <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${categoryStyle.color}`}>
                              <categoryStyle.icon size={10} /> {categoryStyle.label}
                           </div>
                        </div>

                        <div className="mb-6 relative z-10">
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{event.organizer}</p>
                           <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">{event.title}</h3>
                           <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                              <span className="flex items-center gap-1"><Clock size={12} /> {dateInfo.time}</span>
                              <span className="flex items-center gap-1"><MapPin size={12} /> {event.location}</span>
                           </div>
                           {event.description && <p className="text-xs text-slate-400 mt-3 line-clamp-2">{event.description}</p>}
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between relative z-10">
                           
                           {/* Social Proof */}
                           <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                 {eventRsvps.slice(0, 3).map((rsvp, idx) => (
                                    <div key={idx} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 border-2 border-white dark:border-sanfran-rubiBlack flex items-center justify-center text-[8px] font-black text-slate-500">
                                       {rsvp.user_name.charAt(0)}
                                    </div>
                                 ))}
                              </div>
                              {eventRsvps.length > 0 && <span className="text-[9px] font-bold text-slate-400">{eventRsvps.length} confirmados</span>}
                           </div>

                           <button 
                             onClick={() => toggleRSVP(event)}
                             className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm ${amIGoing ? 'bg-emerald-500 text-white hover:bg-red-500' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105'}`}
                           >
                              {amIGoing ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                              {amIGoing ? 'Confirmado' : 'Eu Vou'}
                           </button>
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-lg rounded-[2.5rem] p-8 border-4 border-slate-900 dark:border-sanfran-rubi/30 relative">
               <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6">Agendar Evento</h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome do Evento</label>
                     <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Cervejada de Abertura" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-purple-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data</label>
                        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-purple-500" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Horário</label>
                        <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-purple-500" />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                        <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-purple-500">
                           {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Organizador</label>
                        <select value={newOrganizer} onChange={e => setNewOrganizer(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-purple-500">
                           {ORGANIZERS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Local</label>
                     <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Ex: Pátio das Arcadas" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-purple-500" />
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição</label>
                     <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Detalhes do evento..." className="w-full h-24 p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-medium text-sm outline-none focus:border-purple-500 resize-none" />
                  </div>

                  <button 
                     onClick={createEvent}
                     className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-sm shadow-xl hover:scale-[1.02] transition-transform"
                  >
                     Confirmar Evento
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default SocialEvents;