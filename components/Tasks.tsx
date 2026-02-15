
import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  CheckSquare,
  Circle, 
  Calendar, 
  Gavel, 
  Filter, 
  AlertTriangle, 
  Briefcase, 
  BookOpen, 
  Hash,
  ArrowUpCircle,
  Clock,
  ChevronDown,
  Sparkles,
  X
} from 'lucide-react';
import { Task, Subject, TaskPriority, TaskCategory } from '../types';
import { supabase } from '../services/supabaseClient';
import { getBrasiliaDate, getBrasiliaISOString } from '../App';

interface TasksProps {
  subjects: Subject[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  userId: string;
}

const Tasks: React.FC<TasksProps> = ({ subjects, tasks, setTasks, userId }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>('normal');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('geral');
  const [filter, setFilter] = useState<'todos' | 'pendentes' | 'concluidos'>('pendentes');
  const [isAdding, setIsAdding] = useState(false);

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const today = getBrasiliaDate();
    const now = getBrasiliaISOString();
    
    try {
      const dbPayload = {
        id: newId,
        user_id: userId,
        title: newTaskTitle,
        completed: false,
        subject_id: selectedSubjectId || null,
        due_date: today,
        priority: selectedPriority,
        category: selectedCategory,
        created_at: now
      };

      const { error } = await supabase.from('tasks').insert(dbPayload);
      if (error) throw error;

      const newTask: Task = {
        id: newId,
        title: newTaskTitle,
        completed: false,
        subjectId: selectedSubjectId || undefined,
        dueDate: today,
        priority: selectedPriority,
        category: selectedCategory
      };
      
      setTasks(prev => [newTask, ...prev]);
      setNewTaskTitle('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao protocolar tarefa no dossiê.");
    }
  };

  const toggleTask = async (task: Task) => {
    const isNowCompleted = !task.completed;
    const completionTimestamp = isNowCompleted ? getBrasiliaISOString() : null;

    setTasks(prev => prev.map(t => t.id === task.id ? { 
      ...t, 
      completed: isNowCompleted, 
      completedAt: completionTimestamp || undefined 
    } : t));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: isNowCompleted,
          completed_at: completionTimestamp 
        })
        .eq('id', task.id)
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (err) {
      console.error("Erro na sincronização da tarefa:", err);
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    }
  };

  const removeTask = async (id: string) => {
    if (!confirm("Deseja arquivar definitivamente este processo?")) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pendentes') return !t.completed;
    if (filter === 'concluidos') return t.completed;
    return true;
  });

  const getPriorityColor = (p?: TaskPriority) => {
    switch (p) {
      case 'urgente': return 'text-red-600 bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800';
      case 'alta': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const getCategoryIcon = (c?: TaskCategory) => {
    switch (c) {
      case 'peticao': return <Gavel className="w-4 h-4" />;
      case 'estudo': return <BookOpen className="w-4 h-4" />;
      case 'audiencia': return <Clock className="w-4 h-4" />;
      case 'admin': return <Briefcase className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 animate-in slide-in-from-bottom-8 duration-700 pb-20">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2 text-center lg:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4">
             <div className="bg-sanfran-rubi p-3 md:p-4 rounded-3xl text-white shadow-2xl shadow-red-900/30"><CheckSquare className="w-6 h-6 md:w-8 md:h-8" /></div>
             <div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Dossiê de Prazos</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm md:text-lg mt-1 italic">Gestão de pauta e excelência.</p>
             </div>
          </div>
        </div>
        
        <div className="flex bg-white dark:bg-sanfran-rubiDark/20 p-1.5 rounded-2xl border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl backdrop-blur-md self-center">
          {(['pendentes', 'concluidos', 'todos'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-sanfran-rubi text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-sanfran-rubi/5 rounded-full -mr-12 md:-mr-16 -mt-12 md:-mt-16" />
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="space-y-1">
            <h3 className="text-[10px] md:text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-sanfran-rubi" /> Desempenho
            </h3>
            <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase italic">Taxa de cumprimento</p>
          </div>
          <span className="text-3xl md:text-4xl font-black text-sanfran-rubi tabular-nums drop-shadow-sm">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-4 md:h-5 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden shadow-inner p-1">
          <div 
            className="h-full bg-sanfran-rubi transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(155,17,30,0.5)] rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-4 md:mt-6 flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
           <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full"/> {tasks.length - completedCount} Pendentes</span>
           <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-sanfran-rubi rounded-full"/> {completedCount} Julgados</span>
        </div>
      </div>

      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-2 md:p-3 rounded-[2rem] md:rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl focus-within:border-sanfran-rubi transition-all group">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center px-4 md:px-8 py-3 md:py-4">
            <Gavel className="w-5 h-5 md:w-7 md:h-7 text-slate-300 group-focus-within:text-sanfran-rubi mr-3 md:mr-5" />
            <input 
              type="text" 
              value={newTaskTitle} 
              onChange={(e) => setNewTaskTitle(e.target.value)} 
              placeholder="Descreva o ato..." 
              onFocus={() => setIsAdding(true)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()} 
              className="flex-1 bg-transparent outline-none text-lg md:text-2xl font-black placeholder:text-slate-200 dark:placeholder:text-slate-800 text-slate-950 dark:text-white" 
            />
          </div>
          <div className="flex justify-end p-2 md:p-0">
            <button 
              onClick={addTask}
              className="w-16 md:w-32 h-16 md:h-auto bg-sanfran-rubi text-white rounded-2xl md:rounded-[2.5rem] flex items-center justify-center hover:bg-sanfran-rubiDark transition-all shadow-xl shadow-red-900/20 active:scale-95"
            >
              <Plus className="w-8 h-8 md:w-10 md:h-10" />
            </button>
          </div>
        </div>

        {isAdding && (
          <div className="p-4 md:p-8 pt-2 md:pt-4 border-t border-slate-100 dark:border-sanfran-rubi/10 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 animate-in slide-in-from-top-6 duration-400">
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-1">
                  <BookOpen className="w-3 h-3" /> Cadeira
                </label>
                <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-3 md:p-4 bg-slate-50 dark:bg-black/60 rounded-xl text-[10px] font-black border-2 border-transparent focus:border-sanfran-rubi outline-none appearance-none shadow-inner">
                  <option value="">Administrativo</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-1">
                  <AlertTriangle className="w-3 h-3" /> Prioridade
                </label>
                <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value as TaskPriority)} className="w-full p-3 md:p-4 bg-slate-50 dark:bg-black/60 rounded-xl text-[10px] font-black border-2 border-transparent focus:border-sanfran-rubi outline-none shadow-inner">
                  <option value="normal">⚖️ Normal</option>
                  <option value="alta">⚠️ Alta</option>
                  <option value="urgente">🚨 Urgente</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-1">
                  <Sparkles className="w-3 h-3" /> Natureza
                </label>
                <div className="relative">
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as TaskCategory)} className="w-full p-3 md:p-4 bg-slate-50 dark:bg-black/60 rounded-xl text-[10px] font-black border-2 border-transparent focus:border-sanfran-rubi outline-none shadow-inner">
                    <option value="geral">Geral</option>
                    <option value="peticao">Petição</option>
                    <option value="estudo">Estudo</option>
                    <option value="audiencia">Audiência</option>
                  </select>
                </div>
             </div>
             <div className="sm:col-span-3 flex justify-center pt-2">
               <button onClick={() => setIsAdding(false)} className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2 hover:text-sanfran-rubi"><X className="w-3 h-3" /> Minimizar Detalhes</button>
             </div>
          </div>
        )}
      </div>

      <div className="space-y-4 md:space-y-6">
        {filteredTasks.map(task => {
          const subject = subjects.find(s => s.id === task.subjectId);
          return (
            <div 
              key={task.id} 
              className={`group flex flex-col sm:flex-row sm:items-center gap-4 md:gap-8 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border-2 transition-all relative overflow-hidden ${task.completed ? 'bg-slate-50 dark:bg-sanfran-rubiDark/10 border-slate-100 dark:border-sanfran-rubi/10 opacity-60' : 'bg-white dark:bg-sanfran-rubiDark/40 border-slate-200 dark:border-sanfran-rubi/20 shadow-xl'}`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-2 md:w-3" style={{ backgroundColor: subject?.color || '#333' }} />

              <div className="flex items-center gap-4 flex-1 min-w-0">
                <button 
                  onClick={() => toggleTask(task)} 
                  className={`flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-black/60 text-slate-200 dark:text-slate-800 border-2 border-slate-100 dark:border-white/5 hover:border-sanfran-rubi'}`}
                >
                  {task.completed ? <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" /> : <Circle className="w-6 h-6 md:w-8 md:h-8" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getPriorityColor(task.priority)}`}>
                       {task.priority}
                     </span>
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 bg-slate-50 dark:bg-black/20 px-3 py-1 rounded-full">
                       {getCategoryIcon(task.category)}
                       {task.category}
                     </span>
                  </div>
                  <h4 className={`text-lg md:text-2xl font-black truncate leading-tight tracking-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-950 dark:text-white'}`}>
                    {task.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-2">
                     {subject && (
                       <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 truncate max-w-[150px]">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subject.color }} />
                          {subject.name}
                       </span>
                     )}
                     <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                       <Calendar className="w-3.5 h-3.5" /> 
                       {task.completed ? `Julgado` : `Pauta: ${task.dueDate || 'Ativa'}`}
                     </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end sm:opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => removeTask(task.id)} className="p-3 md:p-4 text-slate-300 hover:text-red-500 transition-all bg-slate-50 dark:bg-black/60 rounded-xl md:rounded-3xl border border-slate-100 dark:border-white/5">
                  <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="py-20 md:py-32 text-center bg-white dark:bg-sanfran-rubiDark/20 rounded-[2rem] md:rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-sanfran-rubi/10 flex flex-col items-center gap-6 md:gap-8 animate-in fade-in duration-1000">
            <div className="bg-slate-50 dark:bg-sanfran-rubiDark p-6 md:p-10 rounded-full relative">
              <Gavel className="w-16 h-16 md:w-24 md:h-24 text-slate-100 dark:text-sanfran-rubi/10" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl md:text-3xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter italic">Pauta Vazia</p>
              <p className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest px-6">Nenhum processo pendente para esta instância.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
