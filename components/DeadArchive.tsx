
import React, { useState, useEffect } from 'react';
import { Archive, Trash2, RotateCcw, Ghost, FileText, BrainCircuit, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Task, Flashcard } from '../types';

interface DeadArchiveProps {
  userId: string;
}

const DeadArchive: React.FC<DeadArchiveProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'flashcards'>('tasks');
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [archivedCards, setArchivedCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchArchive();
  }, [userId]);

  const fetchArchive = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, cardsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId).not('archived_at', 'is', null).order('archived_at', { ascending: false }),
        supabase.from('flashcards').select('*').eq('user_id', userId).not('archived_at', 'is', null).order('archived_at', { ascending: false })
      ]);

      if (tasksRes.data) {
        setArchivedTasks(tasksRes.data.map(t => ({
          id: t.id, title: t.title, completed: t.completed, subjectId: t.subject_id, dueDate: t.due_date, completedAt: t.completed_at,
          priority: t.priority || 'normal', category: t.category || 'geral', archived_at: t.archived_at
        })));
      }

      if (cardsRes.data) {
        setArchivedCards(cardsRes.data.map(c => ({
          id: c.id, front: c.front, back: c.back, subjectId: c.subject_id, folderId: c.folder_id, nextReview: c.next_review, interval: c.interval, archived_at: c.archived_at
        })));
      }

    } catch (e) {
      console.error("Erro ao carregar arquivo morto:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreItem = async (id: string, type: 'task' | 'card') => {
    const table = type === 'task' ? 'tasks' : 'flashcards';
    try {
      const { error } = await supabase.from(table).update({ archived_at: null }).eq('id', id).eq('user_id', userId);
      if (error) throw error;
      
      if (type === 'task') {
        setArchivedTasks(prev => prev.filter(t => t.id !== id));
      } else {
        setArchivedCards(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      alert("Falha ao restaurar item.");
    }
  };

  const shredItem = async (id: string, type: 'task' | 'card') => {
    if (!confirm("Tem certeza? Esta ação irá TRITURAR o item para sempre. Sem volta.")) return;
    
    const table = type === 'task' ? 'tasks' : 'flashcards';
    try {
      const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;

      if (type === 'task') {
        setArchivedTasks(prev => prev.filter(t => t.id !== id));
      } else {
        setArchivedCards(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      alert("Falha ao triturar item.");
    }
  };

  const getDaysInArchive = (dateStr?: string | null) => {
    if (!dateStr) return 0;
    const archivedDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - archivedDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  return (
    <div className="min-h-full bg-stone-950 text-stone-300 p-6 md:p-10 rounded-[3rem] border-8 border-stone-900 shadow-2xl relative overflow-hidden font-serif animate-in fade-in duration-700">
      
      {/* Background Texture - Dust/Noise */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent pointer-events-none"></div>

      <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10 relative z-10">
        <div>
           <div className="flex items-center gap-3 mb-2 text-stone-500">
              <Archive size={32} />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Departamento de Arquivos Mortos</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-bold text-stone-200 tracking-tighter">O Porão</h2>
           <p className="text-stone-500 italic mt-2 text-sm max-w-md">"Aqui jazem as ideias abandonadas e os prazos perdidos. Cuidado com a poeira."</p>
        </div>
        <div className="flex gap-2 bg-stone-900 p-1 rounded-xl border border-stone-800">
           <button 
             onClick={() => setActiveTab('tasks')} 
             className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'tasks' ? 'bg-stone-800 text-stone-200 shadow-lg' : 'text-stone-600 hover:text-stone-400'}`}
           >
             <FileText size={14} /> Processos ({archivedTasks.length})
           </button>
           <button 
             onClick={() => setActiveTab('flashcards')} 
             className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'flashcards' ? 'bg-stone-800 text-stone-200 shadow-lg' : 'text-stone-600 hover:text-stone-400'}`}
           >
             <BrainCircuit size={14} /> Memórias ({archivedCards.length})
           </button>
        </div>
      </header>

      {/* WARNING BANNER */}
      <div className="bg-orange-900/20 border border-orange-900/40 p-4 rounded-xl mb-8 flex items-start gap-3 relative z-10">
         <AlertTriangle className="text-orange-700 w-5 h-5 shrink-0 mt-0.5" />
         <div>
            <p className="text-xs font-bold text-orange-800/80 uppercase tracking-widest mb-1">Aviso de Limpeza</p>
            <p className="text-xs text-orange-900/60 font-sans">Itens deixados neste arquivo por mais de 30 dias serão automaticamente incinerados pelo sistema.</p>
         </div>
      </div>

      {isLoading ? (
         <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <RefreshCw className="animate-spin mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Soprando a poeira...</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 pb-20">
            {activeTab === 'tasks' && archivedTasks.length === 0 && (
               <div className="col-span-full py-20 text-center opacity-30">
                  <Ghost size={64} className="mx-auto mb-4" />
                  <p className="text-xl font-bold">Nenhum processo arquivado.</p>
               </div>
            )}
            {activeTab === 'flashcards' && archivedCards.length === 0 && (
               <div className="col-span-full py-20 text-center opacity-30">
                  <Ghost size={64} className="mx-auto mb-4" />
                  <p className="text-xl font-bold">Nenhuma memória esquecida.</p>
               </div>
            )}

            {(activeTab === 'tasks' ? archivedTasks : archivedCards).map((item: any) => (
               <div key={item.id} className="group bg-[#e6e2d3] text-stone-800 p-6 rounded-sm shadow-xl relative rotate-1 hover:rotate-0 transition-transform duration-300 min-h-[180px] flex flex-col justify-between" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/paper.png')" }}>
                  {/* Tape Effect */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-yellow-600/30 rotate-2 backdrop-blur-sm"></div>
                  
                  <div>
                     <div className="flex justify-between items-start mb-4 opacity-60">
                        <span className="text-[9px] font-black uppercase tracking-widest border border-stone-800 px-1 pt-0.5">Confidencial</span>
                        <span className="text-[10px] font-bold font-sans">{getDaysInArchive(item.archived_at)} dias arquivado</span>
                     </div>
                     <h3 className="font-bold text-lg leading-tight mb-2 line-through decoration-stone-500/50">
                        {activeTab === 'tasks' ? item.title : item.front}
                     </h3>
                     {activeTab === 'flashcards' && <p className="text-xs italic opacity-70 line-clamp-2">{item.back}</p>}
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-stone-800/10 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                        onClick={() => restoreItem(item.id, activeTab === 'tasks' ? 'task' : 'card')}
                        className="p-2 bg-emerald-700 text-white rounded hover:bg-emerald-800 transition-colors shadow-sm"
                        title="Restaurar"
                     >
                        <RotateCcw size={16} />
                     </button>
                     <button 
                        onClick={() => shredItem(item.id, activeTab === 'tasks' ? 'task' : 'card')}
                        className="p-2 bg-red-800 text-white rounded hover:bg-red-900 transition-colors shadow-sm"
                        title="Triturar Permanentemente"
                     >
                        <Trash2 size={16} />
                     </button>
                  </div>
               </div>
            ))}
         </div>
      )}
    </div>
  );
};

export default DeadArchive;
