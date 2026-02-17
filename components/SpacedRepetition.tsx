
import React, { useState, useEffect } from 'react';
import { Repeat, Calendar, CheckCircle2, Circle, Plus, Trash2, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { SpacedTopic } from '../types';
import confetti from 'canvas-confetti';

interface SpacedRepetitionProps {
  userId: string;
}

interface ReviewTask {
  topicId: string;
  subject: string;
  topic: string;
  interval: number; // 1, 7, 15, 30
  dueDate: Date;
  status: 'pending' | 'done' | 'overdue';
}

const INTERVALS = [1, 7, 15, 30];

const SpacedRepetition: React.FC<SpacedRepetitionProps> = ({ userId }) => {
  const [topics, setTopics] = useState<SpacedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form
  const [subject, setSubject] = useState('');
  const [topicName, setTopicName] = useState('');
  const [studyDate, setStudyDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived state
  const [todaysReviews, setTodaysReviews] = useState<ReviewTask[]>([]);

  useEffect(() => {
    fetchTopics();
  }, [userId]);

  const fetchTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('spaced_topics')
      .select('*')
      .eq('user_id', userId)
      .order('study_date', { ascending: false });
    
    if (data) {
      setTopics(data);
      calculateReviews(data);
    }
    setLoading(false);
  };

  const calculateReviews = (data: SpacedTopic[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tasks: ReviewTask[] = [];

    data.forEach(t => {
      const start = new Date(t.study_date);
      // Fix timezone offset for date input
      const userTimezoneOffset = start.getTimezoneOffset() * 60000;
      const adjustedStart = new Date(start.getTime() + userTimezoneOffset);

      INTERVALS.forEach(interval => {
        if (t.reviews_completed.includes(interval)) return; // Already done

        const targetDate = new Date(adjustedStart);
        targetDate.setDate(adjustedStart.getDate() + interval);
        targetDate.setHours(0, 0, 0, 0);

        // Se a data alvo é hoje ou já passou (atrasada)
        if (targetDate <= today) {
          tasks.push({
            topicId: t.id,
            subject: t.subject,
            topic: t.topic,
            interval: interval,
            dueDate: targetDate,
            status: targetDate.getTime() === today.getTime() ? 'pending' : 'overdue'
          });
        }
      });
    });

    // Ordenar: Atrasadas primeiro, depois por intervalo menor
    tasks.sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (a.status !== 'overdue' && b.status === 'overdue') return 1;
        return a.interval - b.interval;
    });

    setTodaysReviews(tasks);
  };

  const handleAddTopic = async () => {
    if (!subject.trim() || !topicName.trim()) {
      alert("Preencha a matéria e o tópico.");
      return;
    }

    try {
      const { data, error } = await supabase.from('spaced_topics').insert({
        user_id: userId,
        subject: subject,
        topic: topicName,
        study_date: studyDate,
        reviews_completed: []
      }).select().single();

      if (error) throw error;
      if (data) {
        const newTopics = [data, ...topics];
        setTopics(newTopics);
        calculateReviews(newTopics);
      }
      
      setIsAdding(false);
      setTopicName('');
      // Mantém a matéria para facilitar inserção em lote
    } catch (e) {
      console.error(e);
      alert("Erro ao registrar estudo.");
    }
  };

  const completeReview = async (task: ReviewTask) => {
    const topic = topics.find(t => t.id === task.topicId);
    if (!topic) return;

    const newCompleted = [...topic.reviews_completed, task.interval];
    
    // Optimistic update
    const updatedTopics = topics.map(t => t.id === task.topicId ? { ...t, reviews_completed: newCompleted } : t);
    setTopics(updatedTopics);
    calculateReviews(updatedTopics);
    
    if (task.status === 'pending') {
       confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }

    try {
      await supabase.from('spaced_topics').update({
        reviews_completed: newCompleted
      }).eq('id', task.topicId);
    } catch (e) {
      console.error(e);
      alert("Erro ao sincronizar.");
    }
  };

  const deleteTopic = async (id: string) => {
    if (!confirm("Remover este tópico e todo o histórico de revisões?")) return;
    try {
      await supabase.from('spaced_topics').delete().eq('id', id);
      const newTopics = topics.filter(t => t.id !== id);
      setTopics(newTopics);
      calculateReviews(newTopics);
    } catch (e) { console.error(e); }
  };

  const getIntervalLabel = (days: number) => {
    switch (days) {
        case 1: return '24h';
        case 7: return '7 Dias';
        case 15: return '15 Dias';
        case 30: return '30 Dias';
        default: return `${days}d`;
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-5xl mx-auto h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-[#e0f2fe] dark:bg-sky-900/20 px-4 py-2 rounded-full border border-sky-200 dark:border-sky-800 mb-4 shadow-sm">
              <Repeat className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">Método Ebbinghaus</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Revisão Espaçada</h2>
           <p className="text-lg font-medium text-slate-500 mt-2 italic">Derrote a Curva do Esquecimento com revisões programadas.</p>
        </div>
        
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-8 py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
        >
           <Plus size={16} /> Registrar Estudo
        </button>
      </header>

      {/* CREATE MODAL */}
      {isAdding && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-[2.5rem] p-8 border-4 border-sky-100 dark:border-sky-900 shadow-2xl relative">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Novo Tópico</h3>
                  <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full"><Plus className="rotate-45 text-slate-400" /></button>
               </div>

               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Data do Estudo</label>
                     <input 
                        type="date"
                        value={studyDate} 
                        onChange={e => setStudyDate(e.target.value)}
                        className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-sky-500"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Disciplina</label>
                     <input 
                        value={subject} 
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Ex: Direito Civil"
                        className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-sky-500"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Tópico Estudado</label>
                     <input 
                        value={topicName} 
                        onChange={e => setTopicName(e.target.value)}
                        placeholder="Ex: Teoria das Incapacidades"
                        className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-sky-500"
                     />
                  </div>

                  <button 
                     onClick={handleAddTopic}
                     className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-lg transition-all mt-4"
                  >
                     Agendar Revisões
                  </button>
               </div>
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0">
         
         {/* LEFT: REVIEWS FOR TODAY */}
         <div className="lg:col-span-7 flex flex-col h-full min-h-0">
            <div className="flex items-center gap-3 mb-4">
               <Calendar className="text-sky-500" size={20} />
               <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Revisões de Hoje</h3>
               <span className="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full text-xs font-bold">{todaysReviews.length}</span>
            </div>

            <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden flex flex-col relative">
               {todaysReviews.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-50 p-8 text-center">
                     <CheckCircle2 size={64} className="text-sky-300 mb-4" />
                     <p className="text-xl font-black text-slate-400 uppercase">Tudo em dia!</p>
                     <p className="text-xs font-bold text-slate-300 mt-2">Nenhuma revisão pendente para hoje.</p>
                  </div>
               ) : (
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                     {todaysReviews.map((task, idx) => (
                        <div key={`${task.topicId}-${task.interval}`} className={`group p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${task.status === 'overdue' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-sky-200 dark:hover:border-sky-900'}`}>
                           <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${task.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
                                 <span className="text-[10px] font-black uppercase">Rev</span>
                                 <span className="text-sm font-black leading-none">{getIntervalLabel(task.interval)}</span>
                              </div>
                              <div>
                                 <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white dark:bg-black/20 px-2 py-0.5 rounded border border-slate-100 dark:border-white/5">
                                       {task.subject}
                                    </span>
                                    {task.status === 'overdue' && <span className="text-[9px] font-black uppercase text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Atrasado</span>}
                                 </div>
                                 <h4 className="font-bold text-slate-800 dark:text-slate-200 leading-tight">{task.topic}</h4>
                              </div>
                           </div>
                           <button 
                              onClick={() => completeReview(task)}
                              className={`p-3 rounded-xl transition-all ${task.status === 'overdue' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white dark:bg-black/20 text-slate-300 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20'}`}
                           >
                              <CheckCircle2 size={24} />
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* RIGHT: ALL TOPICS */}
         <div className="lg:col-span-5 flex flex-col h-full min-h-0">
            <div className="flex items-center gap-3 mb-4">
               <BookOpen className="text-slate-400" size={20} />
               <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Tópicos Ativos</h3>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-black/20 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col">
               <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {topics.length === 0 && (
                     <div className="text-center py-20 opacity-40">
                        <p className="text-xs font-black uppercase">Nenhum tópico registrado</p>
                     </div>
                  )}
                  {topics.map(t => {
                     const progress = (t.reviews_completed.length / 4) * 100;
                     return (
                        <div key={t.id} className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 relative group">
                           <button onClick={() => deleteTopic(t.id)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-black/20 rounded-lg">
                              <Trash2 size={12} />
                           </button>
                           
                           <div className="mb-2">
                              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{t.subject}</span>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-6">{t.topic}</h4>
                           </div>

                           <div className="flex items-center gap-1 mb-2">
                              {INTERVALS.map(int => (
                                 <div key={int} className={`h-1.5 flex-1 rounded-full ${t.reviews_completed.includes(int) ? 'bg-sky-500' : 'bg-slate-100 dark:bg-white/10'}`}></div>
                              ))}
                           </div>
                           
                           <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase">
                              <span>Estudado em: {new Date(t.study_date).toLocaleDateString()}</span>
                              <span>{Math.round(progress)}%</span>
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default SpacedRepetition;
