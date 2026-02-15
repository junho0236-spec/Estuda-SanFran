
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
  ChevronDown
} from 'lucide-react';
import { Task, Subject, TaskPriority, TaskCategory } from '../types';
import { supabase } from '../services/supabaseClient';
import { getBrasiliaDate } from '../App';

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
        created_at: new Date().toISOString()
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
    const completionTimestamp = isNowCompleted ? new Date().toISOString() : null;

    // Atualização Otimista (UX rápida)
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
      // Reverter se der erro
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
      case 'urgente': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'alta': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
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
    <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             {/* Fix: Added missing CheckSquare to lucide-react imports */}
             <div className="bg-sanfran-rubi p-3 rounded-2xl text-white shadow-xl shadow-red-900/20"><CheckSquare className="w-8 h-8" /></div>
             <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Dossiê de Prazos</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg ml-1">Gestão de pauta com rigor acadêmico.</p>
        </div>
        
        <div className="flex bg-white dark:bg-sanfran-rubiDark/20 p-1.5 rounded-2xl border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg">
          {(['pendentes', 'concluidos', 'todos'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-sanfran-rubi text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Barra de Progresso da Pauta */}
      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl overflow-hidden relative group">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-sanfran-rubi" /> Cumprimento de Pauta
          </h3>
          <span className="text-lg font-black text-sanfran-rubi tabular-nums">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-4 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-sanfran-rubi transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(155,17,30,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-4 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
           <span>{tasks.length - completedCount} Processos em Aberto</span>
           <span>{completedCount} Prazos Cumpridos</span>
        </div>
      </div>

      {/* Protocolo de Nova Tarefa */}
      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-2 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl focus-within:border-sanfran-rubi transition-all">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center px-6">
            <Gavel className="w-6 h-6 text-slate-300 mr-4" />
            <input 
              type="text" 
              value={newTaskTitle} 
              onChange={(e) => setNewTaskTitle(e.target.value)} 
              placeholder="Digite o novo processo ou prazo..." 
              onFocus={() => setIsAdding(true)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()} 
              className="flex-1 py-6 bg-transparent outline-none text-xl font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white" 
            />
          </div>
          <button 
            onClick={addTask}
            className="md:w-24 bg-sanfran-rubi text-white rounded-[2rem] flex items-center justify-center hover:bg-sanfran-rubiDark transition-all m-2 shadow-xl shadow-red-900/30"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        {isAdding && (
          <div className="p-6 pt-2 border-t border-slate-100 dark:border-sanfran-rubi/10 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-300">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cadeira</label>
                <select 
                  value={selectedSubjectId} 
                  onChange={(e) => setSelectedSubjectId(e.target.value)} 
                  className="w-full p-4 bg-slate-50 dark:bg-black/40 rounded-2xl text-xs font-bold border-none outline-none appearance-none"
                >
                  <option value="">Geral / Administrativo</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Prioridade</label>
                <select 
                  value={selectedPriority} 
                  onChange={(e) => setSelectedPriority(e.target.value as TaskPriority)} 
                  className="w-full p-4 bg-slate-50 dark:bg-black/40 rounded-2xl text-xs font-bold border-none outline-none"
                >
                  <option value="normal">⚖️ Normal</option>
                  <option value="alta">⚠️ Alta</option>
                  <option value="urgente">🚨 Urgente</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Natureza</label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value as TaskCategory)} 
                  className="w-full p-4 bg-slate-50 dark:bg-black/40 rounded-2xl text-xs font-bold border-none outline-none"
                >
                  <option value="geral">Geral</option>
                  <option value="peticao">Petição / Escrita</option>
                  <option value="estudo">Leitura / Doutrina</option>
                  <option value="audiencia">Audiência / Reunião</option>
                  <option value="admin">Administrativo</option>
                </select>
             </div>
          </div>
        )}
      </div>

      {/* Lista de Processos */}
      <div className="space-y-4">
        {filteredTasks.map(task => {
          const subject = subjects.find(s => s.id === task.subjectId);
          return (
            <div 
              key={task.id} 
              className={`group flex items-center gap-6 p-6 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${task.completed ? 'bg-slate-50 dark:bg-sanfran-rubiDark/10 border-slate-100 dark:border-sanfran-rubi/10 opacity-60 scale-[0.98]' : 'bg-white dark:bg-sanfran-rubiDark/40 border-slate-200 dark:border-sanfran-rubi/20 shadow-xl hover:shadow-2xl hover:border-sanfran-rubi/40'}`}
            >
              {/* Barra Lateral de Cadeira */}
              <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: subject?.color || '#ccc' }} />

              <button 
                onClick={() => toggleTask(task)} 
                className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-black/40 text-slate-300 hover:text-sanfran-rubi hover:bg-sanfran-rubi/10'}`}
              >
                {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 ${getPriorityColor(task.priority)}`}>
                     {task.priority === 'urgente' && <AlertTriangle className="w-3 h-3" />}
                     {task.priority}
                   </span>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                     {getCategoryIcon(task.category)}
                     {task.category}
                   </span>
                </div>
                <h4 className={`text-xl font-black truncate leading-tight transition-all ${task.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                  {task.title}
                </h4>
                <div className="flex items-center gap-4 mt-2">
                   {subject && (
                     <span className="text-[10px] font-bold uppercase tracking-tight" style={{ color: subject.color }}>{subject.name}</span>
                   )}
                   <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase">
                     <Calendar className="w-3.5 h-3.5" /> 
                     {task.completed ? `Concluído em ${new Date(task.completedAt!).toLocaleDateString()}` : `Prazo: ${task.dueDate || 'Imediato'}`}
                   </span>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => removeTask(task.id)} className="p-4 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-100 dark:border-white/5">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="py-24 text-center bg-white dark:bg-sanfran-rubiDark/20 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-sanfran-rubi/10 flex flex-col items-center gap-6">
            <div className="bg-slate-50 dark:bg-sanfran-rubiDark p-8 rounded-full">
              <Gavel className="w-20 h-20 text-slate-200 dark:text-sanfran-rubi/20" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter italic">Pauta Vazia</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Nenhum processo aguardando decisão.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
