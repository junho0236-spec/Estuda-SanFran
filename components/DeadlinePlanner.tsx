
import React, { useState, useEffect } from 'react';
import { Hourglass, Plus, Trash2, CheckCircle2, AlertTriangle, Calendar, Circle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { DeadlineItem } from '../types';

interface DeadlinePlannerProps {
  userId: string;
}

const DeadlinePlanner: React.FC<DeadlinePlannerProps> = ({ userId }) => {
  const [items, setItems] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDifficulty, setNewDifficulty] = useState(1);

  useEffect(() => {
    fetchItems();
  }, [userId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('deadline_planner_items')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('due_date', { ascending: true }); // Initial sort by date, refined locally
      
      if (data) setItems(sortItemsByUrgency(data));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (dateStr: string) => {
    const target = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateUrgencyScore = (days: number, difficulty: number) => {
    // Days can be negative (overdue) or 0 (today)
    // Avoid division by zero or negative logic issues
    
    // Logic: 
    // Urgency = Days / Difficulty
    // Lower is more urgent.
    
    // If overdue (days < 0), score should be minimal (e.g. -100)
    if (days < 0) return -100 + days; // Very urgent
    if (days === 0) return 0.1 / difficulty; // Almost zero
    
    return days / difficulty;
  };

  const sortItemsByUrgency = (data: DeadlineItem[]) => {
    return [...data].sort((a, b) => {
      const scoreA = calculateUrgencyScore(getDaysRemaining(a.due_date), a.difficulty);
      const scoreB = calculateUrgencyScore(getDaysRemaining(b.due_date), b.difficulty);
      return scoreA - scoreB;
    });
  };

  const addItem = async () => {
    if (!newTitle.trim() || !newDate) return;

    try {
      const { data, error } = await supabase.from('deadline_planner_items').insert({
        user_id: userId,
        title: newTitle,
        due_date: newDate,
        difficulty: newDifficulty,
        is_completed: false
      }).select().single();

      if (error) throw error;
      if (data) {
        const newItems = [...items, data];
        setItems(sortItemsByUrgency(newItems));
        setNewTitle('');
        setNewDate('');
        setNewDifficulty(1);
      }
    } catch (e) {
      alert("Erro ao adicionar prazo.");
    }
  };

  const completeItem = async (id: string) => {
    // Optimistic remove
    setItems(prev => prev.filter(i => i.id !== id));
    
    try {
      await supabase.from('deadline_planner_items').update({ is_completed: true }).eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteItem = async (id: string) => {
    if(!confirm("Remover este prazo?")) return;
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await supabase.from('deadline_planner_items').delete().eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  const getUrgencyStatus = (score: number) => {
    if (score <= 1) return { color: 'bg-red-500', text: 'URGENTE', border: 'border-red-600', bgCard: 'bg-red-50 dark:bg-red-900/10' };
    if (score <= 3) return { color: 'bg-yellow-500', text: 'ATENÇÃO', border: 'border-yellow-600', bgCard: 'bg-yellow-50 dark:bg-yellow-900/10' };
    return { color: 'bg-emerald-500', text: 'TRANQUILO', border: 'border-emerald-600', bgCard: 'bg-white dark:bg-sanfran-rubiDark/20' };
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-5xl mx-auto h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-[#ea580c]/10 px-4 py-2 rounded-full border border-[#ea580c]/20 mb-4">
              <Hourglass className="w-4 h-4 text-[#ea580c]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#ea580c]">Deadline Planner</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Calculadora de Prazos Reais</h2>
           <p className="text-lg font-medium text-slate-500 mt-2 italic">Priorize o que realmente importa com base na urgência.</p>
        </div>
      </header>

      {/* INPUT AREA */}
      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            <div className="md:col-span-5 space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tarefa / Prova</label>
               <input 
                 value={newTitle} 
                 onChange={e => setNewTitle(e.target.value)}
                 placeholder="Ex: Trabalho de Penal"
                 className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-[#ea580c]"
               />
            </div>

            <div className="md:col-span-3 space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data de Entrega</label>
               <input 
                 type="date"
                 value={newDate} 
                 onChange={e => setNewDate(e.target.value)}
                 className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-[#ea580c]"
               />
            </div>

            <div className="md:col-span-3 space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Peso / Dificuldade (1-5)</label>
               <div className="flex items-center gap-3 bg-slate-50 dark:bg-black/40 p-2 rounded-2xl border-2 border-slate-200 dark:border-white/10 h-[58px]">
                  <input 
                    type="range" 
                    min="1" max="5" step="1"
                    value={newDifficulty} 
                    onChange={e => setNewDifficulty(Number(e.target.value))}
                    className="flex-1 accent-[#ea580c] h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-black text-xl w-8 text-center text-slate-700 dark:text-white">{newDifficulty}</span>
               </div>
            </div>

            <div className="md:col-span-1">
               <button 
                 onClick={addItem}
                 className="w-full h-[58px] bg-[#ea580c] text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-orange-700 transition-all"
               >
                  <Plus size={24} />
               </button>
            </div>
         </div>
      </div>

      {/* LIST OF DEADLINES */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 min-h-[400px]">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Carregando Prazos...</div>
         ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
               <Hourglass size={48} className="text-slate-400 mb-4" />
               <p className="text-xl font-black text-slate-500 uppercase">Agenda Livre</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Nenhum prazo pendente.</p>
            </div>
         ) : (
            items.map(item => {
               const days = getDaysRemaining(item.due_date);
               const score = calculateUrgencyScore(days, item.difficulty);
               const status = getUrgencyStatus(score);

               return (
                  <div key={item.id} className={`p-6 rounded-[2rem] border-2 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group transition-all hover:scale-[1.01] ${status.bgCard} ${status.border}`}>
                     
                     {/* Status Bar */}
                     <div className={`absolute left-0 top-0 bottom-0 w-4 ${status.color}`}></div>

                     <div className="flex-1 pl-4">
                        <div className="flex items-center gap-3 mb-1">
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded text-white ${status.color}`}>
                              {status.text}
                           </span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <Calendar size={10} /> {new Date(item.due_date).toLocaleDateString()}
                           </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{item.title}</h3>
                        <p className="text-xs font-medium text-slate-500 mt-1">Dificuldade: {item.difficulty}/5 • {days < 0 ? `Atrasado ${Math.abs(days)} dias` : days === 0 ? 'Hoje!' : `${days} dias restantes`}</p>
                     </div>

                     <div className="flex items-center gap-4">
                        {/* Traffic Light Visual */}
                        <div className="flex gap-1.5 p-2 bg-slate-900 rounded-full">
                           <div className={`w-3 h-3 rounded-full ${score <= 1 ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`}></div>
                           <div className={`w-3 h-3 rounded-full ${score > 1 && score <= 3 ? 'bg-yellow-500' : 'bg-slate-700'}`}></div>
                           <div className={`w-3 h-3 rounded-full ${score > 3 ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                        </div>

                        <button onClick={() => completeItem(item.id)} className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                           <CheckCircle2 size={20} />
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="p-3 bg-slate-100 dark:bg-white/10 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                           <Trash2 size={20} />
                        </button>
                     </div>
                  </div>
               );
            })
         )}
      </div>

    </div>
  );
};

export default DeadlinePlanner;
