
import React, { useState, useMemo } from 'react';
import { 
  Plus, Trash2, CheckCircle2, CheckSquare, Circle, Calendar, Gavel, AlertTriangle, Briefcase, BookOpen, Hash, ArrowUpCircle, Clock, X, FileText, Scale
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
        id: newId, user_id: userId, title: newTaskTitle, completed: false, subject_id: selectedSubjectId || null,
        due_date: today, priority: selectedPriority, category: selectedCategory, created_at: now
      };
      const { error } = await supabase.from('tasks').insert(dbPayload);
      if (error) throw error;

      const newTask: Task = {
        id: newId, title: newTaskTitle, completed: false, subjectId: selectedSubjectId || undefined,
        dueDate: today, priority: selectedPriority, category: selectedCategory
      };
      setTasks(prev => [newTask, ...prev]);
      setNewTaskTitle('');
      setIsAdding(false);
    } catch (err) { console.error(err); }
  };

  const toggleTask = async (task: Task) => {
    const isNowCompleted = !task.completed;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: isNowCompleted } : t));
    await supabase.from('tasks').update({ completed: isNowCompleted }).eq('id', task.id).eq('user_id', userId);
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pendentes') return !t.completed;
    if (filter === 'concluidos') return t.completed;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <FileText className="text-sanfran-rubi" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Diário Oficial SanFran</span>
           </div>
           <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Pauta de Julgamento</h2>
        </div>
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
          {(['pendentes', 'concluidos', 'todos'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-sanfran-rubi text-white shadow-lg' : 'text-slate-400'}`}>
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-2 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
         <div className="flex">
            <input 
              value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} 
              placeholder="Descreva o ato processual..." 
              className="flex-1 p-6 bg-transparent outline-none text-2xl font-black text-slate-900 dark:text-white"
            />
            <button onClick={addTask} className="px-10 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-xs tracking-widest m-2">Protocolar</button>
         </div>
      </div>

      <div className="bg-white dark:bg-[#f8f8f8] dark:bg-sanfran-rubiDark/10 rounded-[3rem] border border-slate-200 dark:border-sanfran-rubi/10 overflow-hidden shadow-xl">
        <div className="p-10 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5">
           <h3 className="text-center font-serif italic text-slate-600 dark:text-slate-400">"Pauta de atos e prazos acadêmicos para a presente instância."</h3>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {filteredTasks.map(task => (
            <div key={task.id} className="p-8 flex items-start gap-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
               <button onClick={() => toggleTask(task)} className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-sanfran-rubi'}`}>
                  <CheckSquare size={16} />
               </button>
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                     <span className="text-[9px] font-black text-sanfran-rubi uppercase">PROCESSO Nº SF-{task.id.toUpperCase()}</span>
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                     <span className="text-[9px] font-black text-slate-400 uppercase">{task.priority}</span>
                  </div>
                  <h4 className={`text-xl font-black tracking-tight ${task.completed ? 'line-through text-slate-300' : 'text-slate-950 dark:text-white'}`}>{task.title}</h4>
                  <div className="mt-2 flex items-center gap-4">
                     <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Scale size={12} /> Cadeira: {subjects.find(s => s.id === task.subjectId)?.name || 'Geral'}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Clock size={12} /> Prazo: {task.dueDate}</span>
                  </div>
               </div>
               <button onClick={async () => { if(confirm("Arquivar?")) { await supabase.from('tasks').delete().eq('id', task.id); setTasks(prev => prev.filter(t => t.id !== task.id)); } }} className="opacity-0 group-hover:opacity-100 p-3 text-slate-200 hover:text-red-500 transition-all"><Trash2 size={20}/></button>
            </div>
          ))}
          {filteredTasks.length === 0 && <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest italic">Pauta encerrada por ora.</div>}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
