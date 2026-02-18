
import React, { useState, useEffect } from 'react';
import { ListTodo, Plus, Trash2, CheckCircle2, Circle, AlertCircle, TrafficCone, GripVertical, FileText, Download, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { SyllabusTracker as Tracker, SyllabusTopic, ConfidenceLevel } from '../types';

interface SyllabusTrackerProps {
  userId: string;
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { color: string, label: string, bg: string }> = {
  'none': { color: 'text-slate-300', label: 'Não Iniciado', bg: 'bg-slate-100 dark:bg-white/5' },
  'low': { color: 'text-red-500', label: 'Inseguro', bg: 'bg-red-50 dark:bg-red-900/10' },
  'medium': { color: 'text-yellow-500', label: 'Em Progresso', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
  'high': { color: 'text-emerald-500', label: 'Dominado', bg: 'bg-emerald-50 dark:bg-emerald-900/10' }
};

const SyllabusTracker: React.FC<SyllabusTrackerProps> = ({ userId }) => {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [activeTracker, setActiveTracker] = useState<Tracker | null>(null);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Create Form
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  
  // Add Topic Form
  const [bulkTopics, setBulkTopics] = useState('');

  useEffect(() => {
    fetchTrackers();
  }, [userId]);

  const fetchTrackers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('syllabus_trackers').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar editais:", error);
        return;
      }

      if (data) {
        setTrackers(data);
        if (data.length > 0 && !activeTracker) setActiveTracker(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTracker) {
      fetchTopics(activeTracker.id);
    }
  }, [activeTracker]);

  const fetchTopics = async (trackerId: string) => {
    const { data } = await supabase.from('syllabus_topics').select('*').eq('tracker_id', trackerId).order('created_at', { ascending: true });
    if (data) setTopics(data);
  };

  const createTracker = async () => {
    if (!newTitle.trim() || !newSubject.trim()) return;
    
    // Validação básica do userId
    if (!userId) {
      alert("Erro de autenticação: ID do usuário não encontrado. Tente fazer login novamente.");
      return;
    }

    try {
      const payload = {
        user_id: userId,
        title: newTitle.trim(),
        subject_name: newSubject.trim(),
        subject_id: null
      };

      const { data, error } = await supabase.from('syllabus_trackers').insert(payload).select().single();

      if (error) {
        console.error("Supabase Error:", error);
        throw new Error(error.message);
      }

      if (data) {
        setTrackers([data, ...trackers]);
        setActiveTracker(data);
        setIsCreating(false);
        setNewTitle('');
        setNewSubject('');
      }
    } catch (e: any) {
      console.error("Erro detalhado ao criar edital:", e);
      let msg = "Erro desconhecido ao criar edital.";
      if (e.message?.includes("relation") && e.message?.includes("does not exist")) {
        msg = "A tabela 'syllabus_trackers' não existe no banco de dados. Execute o SQL de instalação.";
      } else if (e.message) {
        msg = `Erro: ${e.message}`;
      }
      alert(msg);
    }
  };

  const deleteTracker = async (id: string) => {
    if (!confirm("Excluir este edital e todos os tópicos?")) return;
    try {
      const { error } = await supabase.from('syllabus_trackers').delete().eq('id', id);
      if (error) throw error;
      
      const remaining = trackers.filter(t => t.id !== id);
      setTrackers(remaining);
      setActiveTracker(remaining.length > 0 ? remaining[0] : null);
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao excluir: ${e.message}`);
    }
  };

  const addBulkTopics = async () => {
    if (!activeTracker || !bulkTopics.trim()) return;
    const lines = bulkTopics.split('\n').filter(line => line.trim() !== '');
    
    try {
      const payloads = lines.map(line => ({
        tracker_id: activeTracker.id,
        user_id: userId,
        title: line.trim(),
        is_completed: false,
        confidence_level: 'none'
      }));

      const { data, error } = await supabase.from('syllabus_topics').insert(payloads).select();
      if (error) throw error;
      
      if (data) setTopics([...topics, ...data]);
      setBulkTopics('');
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao adicionar tópicos: ${e.message}`);
    }
  };

  const toggleComplete = async (topic: SyllabusTopic) => {
    const newStatus = !topic.is_completed;
    // Optimistic
    setTopics(topics.map(t => t.id === topic.id ? { ...t, is_completed: newStatus } : t));
    
    try {
      await supabase.from('syllabus_topics').update({ is_completed: newStatus }).eq('id', topic.id);
    } catch (e) {
      console.error(e);
    }
  };

  const changeConfidence = async (topicId: string, level: ConfidenceLevel) => {
    setTopics(topics.map(t => t.id === topicId ? { ...t, confidence_level: level } : t));
    try {
      await supabase.from('syllabus_topics').update({ confidence_level: level }).eq('id', topicId);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTopic = async (id: string) => {
    try {
      await supabase.from('syllabus_topics').delete().eq('id', id);
      setTopics(topics.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const progress = topics.length > 0 ? Math.round((topics.filter(t => t.is_completed).length / topics.length) * 100) : 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-5xl mx-auto h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-[#4f46e5]/10 px-4 py-2 rounded-full border border-[#4f46e5]/20 mb-4">
              <ListTodo className="w-4 h-4 text-[#4f46e5]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4f46e5]">Syllabus Tracker</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Rastreador de Edital</h2>
           <p className="text-lg font-medium text-slate-500 mt-2 italic">Mapeie seu progresso tópico por tópico.</p>
        </div>
        
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-8 py-4 bg-[#4f46e5] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
        >
           <Plus size={16} /> Novo Edital
        </button>
      </header>

      {isCreating && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] p-8 border-4 border-[#4f46e5] shadow-2xl relative">
               <button onClick={() => setIsCreating(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-6">Criar Rastreador</h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Título do Edital</label>
                     <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: OAB 41 - Direito Civil" className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-[#4f46e5]" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Disciplina / Área</label>
                     <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Ex: Civil" className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-[#4f46e5]" />
                  </div>
                  <button onClick={createTracker} className="w-full py-4 bg-[#4f46e5] text-white rounded-xl font-black uppercase text-xs shadow-lg mt-2 hover:bg-[#4338ca] transition-colors">
                     Criar e Iniciar
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* TRACKER SELECTOR */}
      {trackers.length > 0 && (
         <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {trackers.map(t => (
               <button
                  key={t.id}
                  onClick={() => setActiveTracker(t)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${activeTracker?.id === t.id ? 'bg-[#4f46e5] text-white border-[#4f46e5]' : 'bg-white dark:bg-white/5 text-slate-500 border-transparent hover:border-slate-200'}`}
               >
                  {t.title}
               </button>
            ))}
         </div>
      )}

      {activeTracker ? (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-0">
            
            {/* LEFT: PROGRESS & INPUT */}
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl text-center">
                  <div className="relative w-32 h-32 mx-auto mb-6">
                     <svg className="w-full h-full transform -rotate-90">
                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-white/5" />
                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="283" strokeDashoffset={283 - (progress / 100) * 283} className="text-[#4f46e5] transition-all duration-1000" strokeLinecap="round" />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{progress}%</span>
                     </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{activeTracker.title}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase">{topics.filter(t => t.is_completed).length}/{topics.length} Tópicos</p>
                  
                  <button onClick={() => deleteTracker(activeTracker.id)} className="mt-6 text-red-400 text-[10px] font-bold uppercase hover:underline flex items-center justify-center gap-1">
                     <Trash2 size={12} /> Excluir Edital
                  </button>
               </div>

               <div className="bg-slate-50 dark:bg-[#1a1a1a] p-6 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block flex items-center gap-2">
                     <FileText size={12} /> Adicionar Tópicos (Múltiplos)
                  </label>
                  <textarea 
                     value={bulkTopics}
                     onChange={e => setBulkTopics(e.target.value)}
                     placeholder="Cole a lista de tópicos aqui (um por linha)..."
                     className="w-full h-32 p-4 bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-[#4f46e5] resize-none mb-3"
                  />
                  <button onClick={addBulkTopics} disabled={!bulkTopics.trim()} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 disabled:opacity-50">
                     Adicionar à Lista
                  </button>
               </div>
            </div>

            {/* RIGHT: TOPIC LIST */}
            <div className="lg:col-span-2 bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl flex flex-col overflow-hidden h-[600px]">
               <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                  <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-wide">Conteúdo Programático</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Organize por confiança</span>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {topics.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <ListTodo size={48} className="text-slate-400 mb-4" />
                        <p className="text-sm font-bold uppercase text-slate-500">Lista Vazia</p>
                     </div>
                  )}
                  {topics.map(topic => (
                     <div key={topic.id} className={`group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all ${topic.is_completed ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-slate-50 dark:bg-white/5'}`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                           <button onClick={() => toggleComplete(topic)} className={`shrink-0 transition-colors ${topic.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}>
                              {topic.is_completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                           </button>
                           <span className={`text-sm font-medium truncate ${topic.is_completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700 dark:text-slate-200'}`}>{topic.title}</span>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                           {/* Confidence Selector */}
                           <div className="flex bg-white dark:bg-black/20 rounded-lg p-1 border border-slate-100 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {(['low', 'medium', 'high'] as ConfidenceLevel[]).map(level => (
                                 <button
                                    key={level}
                                    onClick={() => changeConfidence(topic.id, level)}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${topic.confidence_level === level ? CONFIDENCE_CONFIG[level].bg : 'hover:bg-slate-100 dark:hover:bg-white/10'}`}
                                    title={CONFIDENCE_CONFIG[level].label}
                                 >
                                    <div className={`w-2 h-2 rounded-full ${CONFIDENCE_CONFIG[level].color}`} />
                                 </button>
                              ))}
                           </div>
                           
                           {/* Confidence Indicator (Always Visible) */}
                           <div className={`w-2 h-2 rounded-full ${CONFIDENCE_CONFIG[topic.confidence_level].color} group-hover:hidden`} title={CONFIDENCE_CONFIG[topic.confidence_level].label} />

                           <button onClick={() => deleteTopic(topic.id)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={14} />
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

         </div>
      ) : (
         <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] opacity-50">
            <ListTodo size={64} className="text-slate-400 mb-6" />
            <p className="text-xl font-black uppercase text-slate-500">Nenhum Edital Selecionado</p>
            <p className="text-xs font-bold text-slate-400 mt-2">Crie ou selecione um rastreador acima.</p>
         </div>
      )}

    </div>
  );
};

export default SyllabusTracker;
