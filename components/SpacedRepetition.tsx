
import React, { useState, useEffect } from 'react';
import { 
  Repeat, Calendar, CheckCircle2, Circle, Plus, Trash2, 
  BookOpen, AlertCircle, RefreshCw, Flame, Zap, Trophy, 
  Star, Ghost, Sword, X, TrendingUp, Award, Target,
  ChevronRight, Brain, Sparkles, ZapIcon, ShieldCheck, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { SpacedTopic, UserProfile } from '../types';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

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

const getIntervalsForCycles = (num: number) => {
  const intervals = [1, 3, 7, 15];
  if (num <= 4) return intervals.slice(0, num);
  for (let i = 4; i < num; i++) {
    intervals.push(intervals[i - 1] * 2);
  }
  return intervals;
};

const SpacedRepetition: React.FC<SpacedRepetitionProps> = ({ userId }) => {
  const [topics, setTopics] = useState<SpacedTopic[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form
  const [subject, setSubject] = useState('');
  const [topicName, setTopicName] = useState('');
  const [studyDate, setStudyDate] = useState(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD
  const [cycles, setCycles] = useState(4);

  // Derived state
  const [todaysReviews, setTodaysReviews] = useState<ReviewTask[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<boolean[]>(new Array(7).fill(false));

  useEffect(() => {
    fetchTopics();
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('user_persona')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      // Map persona_data to profile fields if needed, 
      // but based on Profile.tsx it seems it's flattened or handled in dataService
      // Let's assume it's flattened for now or just use what we get
      setProfile(data);
    }
  };

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
      calculateWeeklyActivity(data);
    }
    setLoading(false);
  };

  const calculateWeeklyActivity = (data: SpacedTopic[]) => {
    const activity = new Array(7).fill(false);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    data.forEach(t => {
      const studyDate = new Date(t.study_date);
      studyDate.setHours(0, 0, 0, 0);
      const diff = Math.floor((studyDate.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < 7) {
        activity[diff] = true;
      }
    });
    setWeeklyActivity(activity);
  };

  const calculateReviews = (data: SpacedTopic[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tasks: ReviewTask[] = [];

    data.forEach(t => {
      // Use T00:00:00 to ensure it's treated as local time
      const adjustedStart = new Date(t.study_date + 'T00:00:00');
      const topicIntervals = getIntervalsForCycles(t.cycles || 4);

      topicIntervals.forEach(interval => {
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

    // Ordenar: Atrasadas primeiro, depois por intervalo menor, depois por tópico
    tasks.sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (a.status !== 'overdue' && b.status === 'overdue') return 1;
        if (a.interval !== b.interval) return a.interval - b.interval;
        return a.topic.localeCompare(b.topic);
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
        cycles: cycles,
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
    
    if (task.status === 'pending' || task.status === 'overdue') {
       confetti({ 
         particleCount: 100, 
         spread: 70, 
         origin: { y: 0.6 },
         colors: ['#0ea5e9', '#f59e0b', '#10b981']
       });
       toast.success("+50 XP: Revisão Concluída!", {
         icon: <Zap className="text-amber-500" size={16} />,
         description: "Você está derrotando a curva do esquecimento!"
       });

       // Update XP in profile
       if (profile) {
         const newXP = (profile.arcadia_score || 0) + 50;
         setProfile({ ...profile, arcadia_score: newXP });
         
         // Update in DB
         await supabase.from('user_persona').update({
           arcadia_score: newXP
         }).eq('id', userId);
       }
    }

    try {
      await supabase.from('spaced_topics').update({
        reviews_completed: newCompleted
      }).eq('id', task.topicId);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao sincronizar.");
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
        case 3: return '3 Dias';
        case 7: return '7 Dias';
        case 15: return '15 Dias';
        case 30: return '30 Dias';
        case 60: return '60 Dias';
        default: return `${days}d`;
    }
  };

  const getLevel = (xp: number) => Math.floor(xp / 500) + 1;
  const getProgressToNextLevel = (xp: number) => (xp % 500) / 500 * 100;

  const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-6 xl:px-0 max-w-6xl mx-auto h-full flex flex-col font-sans">
      
      {/* GAMIFICATION HEADER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-2">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm flex items-center gap-4"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Flame size={20} className="sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Ofensiva</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{profile?.productivityStats?.streak || 0} Dias</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm sm:col-span-1 md:col-span-2 flex flex-col justify-center"
        >
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2">
              <Award className="text-amber-500" size={18} />
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Nível {getLevel(profile?.arcadia_score || 0)}</span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">{(profile?.arcadia_score || 0) % 500} / 500 XP</span>
          </div>
          <div className="h-2.5 sm:h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${getProgressToNextLevel(profile?.arcadia_score || 0)}%` }}
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
            />
          </div>
        </motion.div>
      </div>

      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-[#e0f2fe] dark:bg-sky-900/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-sky-200 dark:border-sky-800 mb-3 sm:mb-4 shadow-sm">
              <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">Método Ebbinghaus</span>
           </div>
           <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none flex flex-wrap items-center gap-2 sm:gap-4">
             Revisão Espaçada
           </h2>
           <div className="flex items-center gap-3 mt-2">
             <p className="text-base sm:text-lg font-medium text-slate-500 italic">Derrote o Monstro do Esquecimento!</p>
             <motion.div
               animate={{ y: [0, -5, 0] }}
               transition={{ repeat: Infinity, duration: 2 }}
             >
               <Ghost className="text-slate-300 dark:text-slate-700" size={24} />
             </motion.div>
           </div>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAdding(true)}
          className="group relative flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all overflow-hidden"
        >
           <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
           <Plus size={16} className="relative z-10" /> 
           <span className="relative z-10">Registrar Estudo</span>
           <motion.div 
             animate={{ scale: [1, 1.2, 1] }}
             transition={{ repeat: Infinity, duration: 1.5 }}
             className="absolute -right-1 -top-1"
           >
             <Sparkles size={12} className="text-white/50" />
           </motion.div>
        </motion.button>
      </header>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {isAdding && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
           >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border-4 border-sky-100 dark:border-sky-900 shadow-2xl relative overflow-y-auto max-h-[90vh]"
              >
                 <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Plus size={20} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Novo Tópico</h3>
                    </div>
                    <button 
                      onClick={() => setIsAdding(false)} 
                      className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="text-slate-400" />
                    </button>
                 </div>

                 <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Data do Estudo</label>
                         <div className="relative">
                           <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                           <input 
                              type="date"
                              value={studyDate} 
                              onChange={e => setStudyDate(e.target.value)}
                              className="w-full pl-12 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-sky-500 transition-all"
                           />
                         </div>
                      </div>
                      <div>
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Disciplina / Matéria</label>
                         <div className="relative">
                           <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                           <input 
                              value={subject} 
                              onChange={e => setSubject(e.target.value)}
                              placeholder="Ex: Direito Civil"
                              className="w-full pl-12 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-sky-500 transition-all"
                           />
                         </div>
                      </div>
                      <div>
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Tópico Específico</label>
                         <div className="relative">
                           <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                           <input 
                              value={topicName} 
                              onChange={e => setTopicName(e.target.value)}
                              placeholder="Ex: Teoria das Incapacidades"
                              className="w-full pl-12 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-sky-500 transition-all"
                           />
                         </div>
                      </div>
                    </div>

                    <div className="bg-sky-50 dark:bg-sky-900/10 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/30">
                       <div className="flex justify-between items-center mb-4">
                          <p className="text-[10px] font-black uppercase text-sky-600 dark:text-sky-400 tracking-widest flex items-center gap-2">
                            <Brain size={12} /> Plano de Revisão
                          </p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-slate-400">Ciclos:</span>
                             <select 
                               value={cycles}
                               onChange={(e) => setCycles(parseInt(e.target.value))}
                               className="bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black p-1 outline-none"
                             >
                               {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                 <option key={n} value={n}>{n}</option>
                               ))}
                             </select>
                          </div>
                       </div>
                       <div className="flex justify-between gap-1">
                         {getIntervalsForCycles(cycles).map(int => (
                           <div key={int} className="flex flex-col items-center gap-1 flex-1">
                             <div className="w-full h-1 bg-sky-200 dark:bg-sky-800 rounded-full" />
                             <span className="text-[8px] font-bold text-sky-600 dark:text-sky-400">{getIntervalLabel(int)}</span>
                           </div>
                         ))}
                       </div>
                       <p className="text-[9px] text-slate-400 mt-3 italic">
                         * Este tópico será revisado até completar {getIntervalLabel(getIntervalsForCycles(cycles).slice(-1)[0])}.
                       </p>
                    </div>

                    <button 
                       onClick={handleAddTopic}
                       className="w-full py-5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-3 group"
                    >
                       <span>Agendar Revisões</span>
                       <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 xl:h-full min-h-0">
         
         {/* LEFT: REVIEWS FOR TODAY */}
         <div className="xl:col-span-7 flex flex-col xl:h-full min-h-[400px]">
            <div className="flex items-center gap-3 mb-4">
               <Calendar className="text-sky-500" size={20} />
               <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Revisões de Hoje</h3>
               <span className="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full text-[10px] font-bold">{todaysReviews.length}</span>
            </div>

            <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-3xl xl:rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden flex flex-col relative min-h-[300px]">
               {todaysReviews.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                     <motion.div 
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       className="relative"
                     >
                        <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full" />
                        <Trophy size={80} className="text-amber-500 relative z-10" />
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                          className="absolute -inset-4 border-2 border-dashed border-amber-200 dark:border-amber-900/30 rounded-full"
                        />
                     </motion.div>
                     
                     <div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Missão Cumprida!</p>
                        <p className="text-sm font-bold text-slate-400 mt-2">Você derrotou a curva do esquecimento hoje.</p>
                     </div>

                     <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-[2rem] w-full max-w-sm border border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Atividade da Semana</p>
                        <div className="flex justify-between items-center">
                           {daysOfWeek.map((day, i) => (
                              <div key={i} className="flex flex-col items-center gap-2">
                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${weeklyActivity[i] ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-200 dark:bg-white/5 text-slate-400'}`}>
                                    {weeklyActivity[i] ? <CheckCircle2 size={14} /> : day}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     <button 
                       onClick={() => setIsAdding(true)}
                       className="text-sky-500 font-bold text-xs uppercase tracking-widest hover:underline"
                     >
                       + Registrar novo estudo
                     </button>
                  </div>
               ) : (
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
                     {todaysReviews.map((task, idx) => (
                        <div key={`${task.topicId}-${task.interval}`} className={`group p-3 sm:p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${task.status === 'overdue' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-sky-200 dark:hover:border-sky-900'}`}>
                           <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${task.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
                                 <span className="text-[8px] sm:text-[10px] font-black uppercase">Rev</span>
                                 <span className="text-xs sm:text-sm font-black leading-none">{getIntervalLabel(task.interval)}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                 <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white dark:bg-black/20 px-1.5 py-0.5 rounded border border-slate-100 dark:border-white/5 truncate max-w-[120px]">
                                       {task.subject}
                                    </span>
                                    {task.status === 'overdue' && <span className="text-[8px] sm:text-[9px] font-black uppercase text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Atrasado</span>}
                                 </div>
                                 <h4 className="font-bold text-slate-800 dark:text-slate-200 leading-tight text-sm sm:text-base truncate">{task.topic}</h4>
                              </div>
                           </div>
                           <button 
                              onClick={() => completeReview(task)}
                              className={`p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center gap-2 sm:block ${task.status === 'overdue' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white dark:bg-black/20 text-slate-300 hover:text-sky-50 text-xs sm:text-base font-bold hover:bg-sky-50 dark:hover:bg-sky-900/20'}`}
                           >
                              <CheckCircle2 size={24} className="shrink-0" />
                              <span className="sm:hidden">Concluir Revisão</span>
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* RIGHT: ALL TOPICS */}
         <div className="xl:col-span-5 flex flex-col xl:h-full min-h-[400px]">
            <div className="flex items-center gap-3 mb-4">
               <BookOpen className="text-slate-400" size={20} />
               <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Tópicos Ativos</h3>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-black/20 rounded-3xl xl:rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col min-h-[300px]">
               <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {topics.length === 0 ? (
                     <div className="text-center py-20 opacity-40">
                        <p className="text-xs font-black uppercase">Nenhum tópico registrado</p>
                     </div>
                  ) : (
                    topics.map(t => {
                     const topicIntervals = getIntervalsForCycles(t.cycles || 4);
                     const progress = (t.reviews_completed.length / topicIntervals.length) * 100;
                     const isMastered = progress === 100;
                     const isUrgent = todaysReviews.some(r => r.topicId === t.id && r.status === 'overdue');
                     const isDueSoon = todaysReviews.some(r => r.topicId === t.id && r.status === 'pending');

                     return (
                        <motion.div 
                          layout
                          key={t.id} 
                          className={`bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl shadow-sm border transition-all relative group ${isUrgent ? 'border-red-200 dark:border-red-900/30 ring-1 ring-red-500/10' : 'border-slate-200 dark:border-white/5'}`}
                        >
                           <button onClick={() => deleteTopic(t.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 dark:bg-black/20 rounded-xl">
                              <Trash2 size={14} />
                           </button>
                           
                           <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 dark:bg-black/20 px-2 py-1 rounded-lg border border-slate-100 dark:border-white/5">{t.subject}</span>
                                {isMastered ? (
                                  <span className="text-[9px] font-black uppercase text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <ShieldCheck size={12} /> Consolidado
                                  </span>
                                ) : isUrgent ? (
                                  <motion.span 
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="text-[9px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg flex items-center gap-1"
                                  >
                                    <AlertCircle size={12} /> Crítico
                                  </motion.span>
                                ) : isDueSoon ? (
                                  <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <Clock size={12} /> Revisar Hoje
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black uppercase text-sky-500 bg-sky-50 dark:bg-sky-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <Brain size={12} /> Em Memória
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight pr-8">{t.topic}</h4>
                           </div>

                           {/* Ebbinghaus Curve Visualization */}
                           <div className="relative h-12 mb-4 bg-slate-50 dark:bg-black/20 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 p-2">
                              <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                 {/* Grid lines */}
                                 <line x1="0" y1="35" x2="100" y2="35" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-800" />
                                 
                                 {/* The Curve */}
                                 <path 
                                    d="M 0 5 Q 20 35 100 35" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    className="text-slate-200 dark:text-slate-800"
                                 />
                                 
                                 {/* Progress on Curve */}
                                 <motion.path 
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: t.reviews_completed.length / (t.cycles || 4) }}
                                    d="M 0 5 Q 20 35 100 35" 
                                    fill="none" 
                                    stroke="url(#curveGradient)" 
                                    strokeWidth="3" 
                                    strokeLinecap="round"
                                 />
                                 <defs>
                                    <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                       <stop offset="0%" stopColor="#0ea5e9" />
                                       <stop offset="100%" stopColor="#10b981" />
                                    </linearGradient>
                                 </defs>
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                                 <span className="text-[8px] font-black text-slate-400 uppercase">Início</span>
                                 <span className="text-[8px] font-black text-slate-400 uppercase">Domínio</span>
                              </div>
                           </div>

                           <div className="flex items-center gap-1.5 mb-4">
                              {getIntervalsForCycles(t.cycles || 4).map(int => (
                                 <div 
                                   key={int} 
                                   className={`h-2 flex-1 rounded-full transition-all duration-500 ${t.reviews_completed.includes(int) ? 'bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm' : 'bg-slate-100 dark:bg-white/5'}`}
                                   title={getIntervalLabel(int)}
                                 />
                              ))}
                           </div>
                           
                           <div className="flex justify-between items-center text-[10px] text-slate-500 font-black uppercase tracking-tight">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                  <TrendingUp size={12} className="text-sky-500" />
                                </div>
                                <span>Domínio: {Math.round((t.reviews_completed.length / (t.cycles || 4)) * 100)}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-slate-400" />
                                <span>{new Date(t.study_date + 'T00:00:00').toLocaleDateString()}</span>
                              </div>
                           </div>
                        </motion.div>
                     );
                    })
                  )}
               </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default SpacedRepetition;
