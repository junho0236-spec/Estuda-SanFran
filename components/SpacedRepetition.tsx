
import React, { useState, useEffect } from 'react';
import { 
  Repeat, Calendar, CheckCircle2, Circle, Plus, Trash2, 
  BookOpen, AlertCircle, RefreshCw, Flame, Zap, Trophy, 
  Star, Ghost, Sword, X, TrendingUp, Award, Target,
  ChevronRight, ChevronLeft, Brain, Sparkles, ZapIcon, ShieldCheck, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
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

const INTERVALS = [1, 3, 7, 15, 30, 60, 90];

const SpacedRepetition: React.FC<SpacedRepetitionProps> = ({ userId }) => {
  const [topics, setTopics] = useState<SpacedTopic[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [doctorFeedback, setDoctorFeedback] = useState<{ topic: string, feedback: string } | null>(null);
  const [isConsulting, setIsConsulting] = useState<string | null>(null);
  
  // Form
  const [subject, setSubject] = useState('');
  const [topicName, setTopicName] = useState('');
  const [studyDate, setStudyDate] = useState(new Date().toISOString().split('T')[0]);
  const [customIntervals, setCustomIntervals] = useState<number[]>([1, 7, 15, 30]);

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

  const consultDoctor = async (topic: SpacedTopic) => {
    setIsConsulting(topic.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Você é um especialista em técnicas de estudo e memorização (Anki/Spaced Repetition). 
        Analise o tópico: "${topic.topic}" da disciplina "${topic.subject}".
        Forneça 3 dicas práticas e rápidas para memorizar este conteúdo de forma mais eficiente. 
        Seja direto, motivador e use emojis. Responda em Português.`,
      });

      const feedback = response.text || "O médico está ocupado no momento. Tente novamente mais tarde!";
      
      // Save feedback to DB for future reference
      await supabase
        .from('spaced_topics')
        .update({ doctor_feedback: feedback })
        .eq('id', topic.id);

      setDoctorFeedback({ topic: topic.topic, feedback });
      setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, doctor_feedback: feedback } : t));
    } catch (error) {
      console.error('AI Doctor error:', error);
      toast.error('Erro ao consultar o médico AI');
    } finally {
      setIsConsulting(null);
    }
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
      const start = new Date(t.study_date);
      // Fix timezone offset for date input
      const userTimezoneOffset = start.getTimezoneOffset() * 60000;
      const adjustedStart = new Date(start.getTime() + userTimezoneOffset);

      const activeIntervals = t.custom_intervals || INTERVALS;

      activeIntervals.forEach(interval => {
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
      toast.error("Preencha a matéria e o tópico.");
      return;
    }

    try {
      const { data, error } = await supabase.from('spaced_topics').insert({
        user_id: userId,
        subject: subject,
        topic: topicName,
        study_date: studyDate,
        reviews_completed: [],
        custom_intervals: customIntervals // Assuming we add this column or handle it
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
        case 7: return '7 Dias';
        case 15: return '15 Dias';
        case 30: return '30 Dias';
        default: return `${days}d`;
    }
  };

  const getLevel = (xp: number) => Math.floor(xp / 500) + 1;
  const getProgressToNextLevel = (xp: number) => (xp % 500) / 500 * 100;

  const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-5xl mx-auto h-full flex flex-col font-sans">
      
      {/* GAMIFICATION HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Flame size={24} className="animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ofensiva</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{profile?.productivityStats?.streak || 0} Dias</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm md:col-span-2 flex flex-col justify-center"
        >
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2">
              <Award className="text-amber-500" size={20} />
              <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Estudante Nível {getLevel(profile?.arcadia_score || 0)}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">{(profile?.arcadia_score || 0) % 500} / 500 XP</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
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
           <div className="inline-flex items-center gap-2 bg-[#e0f2fe] dark:bg-sky-900/20 px-4 py-2 rounded-full border border-sky-200 dark:border-sky-800 mb-4 shadow-sm">
              <Repeat className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">Método Ebbinghaus</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none flex items-center gap-4">
             Revisão Espaçada
           </h2>
           <div className="flex items-center gap-3 mt-2">
             <p className="text-lg font-medium text-slate-500 italic">Derrote o Monstro do Esquecimento!</p>
             <motion.div
               animate={{ y: [0, -5, 0] }}
               transition={{ repeat: Infinity, duration: 2 }}
             >
               <Ghost className="text-slate-300 dark:text-slate-700" size={24} />
             </motion.div>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex border border-slate-200 dark:border-white/10">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-sky-600 shadow-sm' : 'text-slate-400'}`}
            >
              Lista
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-white/10 text-sky-600 shadow-sm' : 'text-slate-400'}`}
            >
              Calendário
            </button>
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
          </motion.button>
        </div>
      </header>

      {/* AI DOCTOR FEEDBACK MODAL */}
      {doctorFeedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] p-8 border-4 border-sky-100 dark:border-sky-900 shadow-2xl relative"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">AI Card Doctor</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{doctorFeedback.topic}</p>
                </div>
              </div>
              <button onClick={() => setDoctorFeedback(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
                <Plus className="rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-3xl border border-slate-100 dark:border-white/5 mb-6">
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
                {doctorFeedback.feedback}
              </div>
            </div>

            <button 
              onClick={() => setDoctorFeedback(null)}
              className="w-full py-4 bg-slate-900 dark:bg-white dark:text-black text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-lg transition-all"
            >
              Entendido, Doutor!
            </button>
          </motion.div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isAdding && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-[2.5rem] p-8 border-4 border-sky-100 dark:border-sky-900 shadow-2xl relative">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Novo Tópico</h3>
                  <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full"><Plus className="rotate-45 text-slate-400" /></button>
               </div>

               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Ciclo de Revisão</label>
                    <div className="flex flex-wrap gap-2">
                      {INTERVALS.map(int => (
                        <button
                          key={int}
                          onClick={() => {
                            if (customIntervals.includes(int)) {
                              setCustomIntervals(customIntervals.filter(i => i !== int));
                            } else {
                              setCustomIntervals([...customIntervals, int].sort((a, b) => a - b));
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-[10px] font-black transition-all border-2 ${customIntervals.includes(int) ? 'bg-sky-500 border-sky-500 text-white' : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-400'}`}
                        >
                          {int}d
                        </button>
                      ))}
                    </div>
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

      {viewMode === 'calendar' && (
        <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden flex flex-col p-8">
          <CalendarView topics={topics} />
        </div>
      )}

      {viewMode === 'list' && (
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
                  {topics.length === 0 ? (
                     <div className="text-center py-20 opacity-40">
                        <p className="text-xs font-black uppercase">Nenhum tópico registrado</p>
                     </div>
                  ) : (
                    topics.map(t => {
                     const activeIntervals = t.custom_intervals || [1, 7, 15, 30];
                     const progress = (t.reviews_completed.length / activeIntervals.length) * 100;
                     const isMastered = progress === 100;
                     const isUrgent = todaysReviews.some(r => r.topicId === t.id && r.status === 'overdue');
                     const isDueSoon = todaysReviews.some(r => r.topicId === t.id && r.status === 'pending');

                     return (
                        <motion.div 
                          layout
                          key={t.id} 
                          className={`bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl shadow-sm border transition-all relative group ${isUrgent ? 'border-red-200 dark:border-red-900/30' : 'border-slate-200 dark:border-white/5'}`}
                        >
                           <button onClick={() => deleteTopic(t.id)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-black/20 rounded-lg">
                              <Trash2 size={12} />
                           </button>
                           
                           <div className="mb-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{t.subject}</span>
                                <div className="flex items-center gap-2">
                                  {t.doctor_feedback ? (
                                    <button 
                                      onClick={() => setDoctorFeedback({ topic: t.topic, feedback: t.doctor_feedback! })}
                                      className="text-[8px] font-black uppercase text-sky-500 bg-sky-50 dark:bg-sky-900/20 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
                                    >
                                      <Sparkles size={10} /> Ver Dicas
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => consultDoctor(t)}
                                      disabled={isConsulting === t.id}
                                      className="text-[8px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                                    >
                                      {isConsulting === t.id ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />} 
                                      AI Doctor
                                    </button>
                                  )}
                                  {isMastered ? (
                                    <span className="text-[8px] font-black uppercase text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                      <ShieldCheck size={10} /> Forte
                                    </span>
                                  ) : isUrgent ? (
                                    <motion.span 
                                      animate={{ x: [-1, 1, -1] }}
                                      transition={{ repeat: Infinity, duration: 0.2 }}
                                      className="text-[8px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded flex items-center gap-1"
                                    >
                                      <AlertCircle size={10} /> Quase Esquecendo!
                                    </motion.span>
                                  ) : isDueSoon ? (
                                    <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                      <Clock size={10} /> Revisar em breve
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-black uppercase text-sky-500 bg-sky-50 dark:bg-sky-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                      <Brain size={10} /> Em Memória
                                    </span>
                                  )}
                                </div>
                              </div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-6">{t.topic}</h4>
                           </div>

                           <div className="flex items-center gap-1 mb-2">
                              {(t.custom_intervals || INTERVALS).map(int => (
                                 <div key={int} className={`h-1.5 flex-1 rounded-full ${t.reviews_completed.includes(int) ? 'bg-gradient-to-r from-sky-400 to-sky-600 shadow-sm' : 'bg-slate-100 dark:bg-white/10'}`}></div>
                              ))}
                           </div>
                           
                           <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase">
                              <div className="flex items-center gap-1">
                                <Sword size={10} className="text-slate-300" />
                                <span>Domínio: {Math.round(progress)}%</span>
                              </div>
                              <span>{new Date(t.study_date).toLocaleDateString()}</span>
                           </div>
                        </motion.div>
                     )
                    })
                  )}
               </div>
            </div>
         </div>
      </div>
      )}
    </div>
  );
};

export default SpacedRepetition;

const CalendarView: React.FC<{ topics: SpacedTopic[] }> = ({ topics }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  
  const monthName = currentMonth.toLocaleString('pt-BR', { month: 'long' });
  
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));

  const getReviewsForDay = (day: number) => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    
    const reviews: { topic: string; interval: number }[] = [];
    
    topics.forEach(t => {
      const start = new Date(t.study_date);
      const userTimezoneOffset = start.getTimezoneOffset() * 60000;
      const adjustedStart = new Date(start.getTime() + userTimezoneOffset);
      
      const activeIntervals = t.custom_intervals || [1, 7, 15, 30];
      
      activeIntervals.forEach(interval => {
        const targetDate = new Date(adjustedStart);
        targetDate.setDate(adjustedStart.getDate() + interval);
        targetDate.setHours(0, 0, 0, 0);
        
        if (targetDate.getTime() === date.getTime()) {
          reviews.push({ topic: t.topic, interval });
        }
      });
    });
    
    return reviews;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight capitalize">
          {monthName} <span className="text-slate-400">{year}</span>
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="bg-slate-50 dark:bg-black/40 p-4 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
            {d}
          </div>
        ))}
        
        {Array.from({ length: 42 }).map((_, i) => {
          const dayNumber = i - startDay + 1;
          const isCurrentMonth = dayNumber > 0 && dayNumber <= totalDays;
          const reviews = isCurrentMonth ? getReviewsForDay(dayNumber) : [];
          const isToday = isCurrentMonth && dayNumber === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

          return (
            <div 
              key={i} 
              className={`min-h-[120px] p-2 bg-white dark:bg-[#1a1a1a] transition-colors ${!isCurrentMonth ? 'opacity-20' : ''} ${isToday ? 'ring-2 ring-inset ring-sky-500/50' : ''}`}
            >
              {isCurrentMonth && (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-black ${isToday ? 'text-sky-500' : 'text-slate-400'}`}>
                      {dayNumber}
                    </span>
                    {reviews.length > 0 && (
                      <span className="bg-sky-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                        {reviews.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {reviews.slice(0, 3).map((r, idx) => (
                      <div key={idx} className="text-[9px] font-bold text-slate-600 dark:text-slate-400 truncate bg-slate-50 dark:bg-white/5 p-1 rounded border border-slate-100 dark:border-white/5">
                        {r.topic}
                      </div>
                    ))}
                    {reviews.length > 3 && (
                      <div className="text-[8px] font-black text-slate-400 text-center uppercase">
                        + {reviews.length - 3} mais
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
