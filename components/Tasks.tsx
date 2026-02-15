
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
  Sparkles
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
      alert("Erro ao protocolar tarefa no dossiê. Verifique se as colunas 'priority' e 'category' foram criadas no Supabase.");
    }
  };

  const toggleTask = async (task: Task) => {
    const isNowCompleted = !task.completed;
    const completionTimestamp = isNowCompleted ? new Date().toISOString() : null;

    // Atualização Otimista para resposta instantânea
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
      // Reverter estado local em caso de falha crítica
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
    <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
             <div className="bg-sanfran-rubi p-4 rounded-3xl text-white shadow-2xl shadow-red-900/30 scale-110"><CheckSquare className="w-8 h-8" /></div>
             <div>
                <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Dossiê de Prazos</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-lg mt-1 italic">Gestão de pauta e excelência processual.</p>
             </div>
          </div>
        </div>
        
        <div className="flex bg-white dark:bg-sanfran-rubiDark/20 p-2 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl backdrop-blur-md">
          {(['pendentes', 'concluidos', 'todos'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-sanfran-rubi text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Barra de Progresso da Pauta */}
      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-10 rounded-[3rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sanfran-rubi/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-sanfran-rubi" /> Desempenho da Bancada
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase italic">Taxa de cumprimento de obrigações</p>
          </div>
          <span className="text-4xl font-black text-sanfran-rubi tabular-nums drop-shadow-sm">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-5 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden shadow-inner p-1">
          <div 
            className="h-full bg-sanfran-rubi transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(155,17,30,0.6)] rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-6 flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
           <span className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-300 rounded-full"/> {tasks.length - completedCount} Pendências</span>
           <span className="flex items-center gap-2"><div className="w-2 h-2 bg-sanfran-rubi rounded-full"/> {completedCount} Julgados</span>
        </div>
      </div>

      {/* Protocolo de Nova Tarefa */}
      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-3 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl focus-within:border-sanfran-rubi transition-all group">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex items-center px-8 py-4">
            <Gavel className="w-7 h-7 text-slate-300 group-focus-within:text-sanfran-rubi mr-5 transition-colors" />
            <input 
              type="text" 
              value={newTaskTitle} 
              onChange={(e) => setNewTaskTitle(e.target.value)} 
              placeholder="Descreva o novo prazo ou ato processual..." 
              onFocus={() => setIsAdding(true)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()} 
              className="flex-1 bg-transparent outline-none text-2xl font-black placeholder:text-slate-200 dark:placeholder:text-slate-800 text-slate-950 dark:text-white" 
            />
          </div>
          <button 
            onClick={addTask}
            className="md:w-32 bg-sanfran-rubi text-white rounded-[2.5rem] flex items-center justify-center hover:bg-sanfran-rubiDark transition-all m-2 shadow-2xl shadow-red-900/40 group-hover:scale-105 active:scale-95"
          >
            <Plus className="w-10 h-10" />
          </button>
        </div>

        {isAdding && (
          <div className="p-8 pt-4 border-t border-slate-100 dark:border-sanfran-rubi/10 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-6 duration-400">
             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-2">
                  <BookOpen className="w-3 h-3" /> Cadeira
                </label>
                <select 
                  value={selectedSubjectId} 
                  onChange={(e) => setSelectedSubjectId(e.target.value)} 
                  className="w-full p-5 bg-slate-50 dark:bg-black/60 rounded-2xl text-xs font-black border-2 border-transparent focus:border-sanfran-rubi outline-none appearance-none transition-all shadow-inner"
                >
                  <option value="">Geral / Administrativo</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-2">
                  <AlertTriangle className="w-3 h-3" /> Prioridade
                </label>
                <select 
                  value={selectedPriority} 
                  onChange={(e) => setSelectedPriority(e.target.value as TaskPriority)} 
                  className="w-full p-5 bg-slate-50 dark:bg-black/60 rounded-2xl text-xs font-black border-2 border-transparent focus:border-sanfran-rubi outline-none transition-all shadow-inner"
                >
                  <option value="normal">⚖️ Normal</option>
                  <option value="alta">⚠️ Alta</option>
                  <option value="urgente">🚨 Urgente</option>
                </select>
             </div>
             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-2">
                  <Sparkles className="w-3 h-3" /> Natureza
                </label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value as TaskCategory)} 
                  className="w-full p-5 bg-slate-50 dark:bg-black/60 rounded-2xl text-xs font-black border-2 border-transparent focus:border-sanfran-rubi outline-none transition-all shadow-inner"
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
      <div className="space-y-6">
        {filteredTasks.map(task => {
          const subject = subjects.find(s => s.id === task.subjectId);
          return (
            <div 
              key={task.id} 
              className={`group flex items-center gap-8 p-8 rounded-[3rem] border-2 transition-all relative overflow-hidden ${task.completed ? 'bg-slate-50 dark:bg-sanfran-rubiDark/10 border-slate-100 dark:border-sanfran-rubi/10 opacity-60 scale-[0.97]' : 'bg-white dark:bg-sanfran-rubiDark/40 border-slate-200 dark:border-sanfran-rubi/20 shadow-xl hover:shadow-2xl hover:-translate-y-1'}`}
            >
              {/* Barra Lateral de Cadeira */}
              <div className="absolute left-0 top-0 bottom-0 w-3 shadow-sm" style={{ backgroundColor: subject?.color || '#333' }} />

              <button 
                onClick={() => toggleTask(task)} 
                className={`flex-shrink-0 w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 text-white shadow-xl rotate-[360deg]' : 'bg-slate-50 dark:bg-black/60 text-slate-200 dark:text-slate-800 border-2 border-slate-100 dark:border-white/5 hover:border-sanfran-rubi hover:text-sanfran-rubi'}`}
              >
                {task.completed ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                   <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center gap-2 border ${getPriorityColor(task.priority)}`}>
                     {task.priority === 'urgente' && <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />}
                     {task.priority}
                   </span>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 bg-slate-50 dark:bg-black/20 px-4 py-1.5 rounded-full">
                     {getCategoryIcon(task.category)}
                     {task.category}
                   </span>
                </div>
                <h4 className={`text-2xl font-black truncate leading-tight transition-all tracking-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-950 dark:text-white'}`}>
                  {task.title}
                </h4>
                <div className="flex flex-wrap items-center gap-6 mt-3">
                   {subject && (
                     <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                        {subject.name}
                     </span>
                   )}
                   <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <Calendar className="w-4 h-4 text-slate-300" /> 
                     {task.completed ? `Concluído em ${new Date(task.completedAt!).toLocaleDateString()}` : `Protocolado: ${task.dueDate || 'Imediato'}`}
                   </span>
                </div>
              </div>

              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                <button onClick={() => removeTask(task.id)} className="p-5 text-slate-300 hover:text-red-500 transition-all bg-slate-50 dark:bg-black/60 rounded-3xl border border-slate-100 dark:border-white/5 shadow-lg active:scale-90">
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="py-32 text-center bg-white dark:bg-sanfran-rubiDark/20 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-sanfran-rubi/10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000">
            <div className="bg-slate-50 dark:bg-sanfran-rubiDark p-10 rounded-full relative">
              <Gavel className="w-24 h-24 text-slate-100 dark:text-sanfran-rubi/10" />
              <div className="absolute inset-0 border-4 border-sanfran-rubi/10 rounded-full animate-ping" />
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter italic">Tribunal em Recesso</p>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma demanda pendente para esta pauta.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
