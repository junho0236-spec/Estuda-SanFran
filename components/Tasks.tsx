
import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Calendar, Gavel } from 'lucide-react';
import { Task, Subject } from '../types';
import { supabase } from '../services/supabaseClient';

interface TasksProps {
  subjects: Subject[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  userId: string;
}

const Tasks: React.FC<TasksProps> = ({ subjects, tasks, setTasks, userId }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const newId = Math.random().toString(36).substr(2, 9);
    
    try {
      const { error } = await supabase.from('tasks').insert({
        id: newId,
        user_id: userId,
        title: newTaskTitle,
        completed: false,
        subject_id: selectedSubjectId || null,
        due_date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      const newTask: Task = {
        id: newId,
        title: newTaskTitle,
        completed: false,
        subjectId: selectedSubjectId || undefined,
        dueDate: new Date().toISOString().split('T')[0]
      };
      setTasks(prev => [newTask, ...prev]);
      setNewTaskTitle('');
    } catch (err) {
      console.error(err);
      alert("Erro ao protocolar tarefa.");
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', task.id);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !task.completed } : t));
    } catch (err) {
      console.error(err);
    }
  };

  const removeTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-300">
      <header>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Processos & Prazos</h2>
        <p className="text-slate-500 dark:text-slate-400">Gestão de tarefas com rigor franciscano.</p>
      </header>

      <div className="bg-white dark:bg-[#181818] p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl flex gap-3 border-t-4 border-t-[#9B111E]">
        <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Protocolar nova tarefa..." onKeyDown={(e) => e.key === 'Enter' && addTask()} className="flex-1 p-3 bg-transparent outline-none text-lg font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100" />
        <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="bg-slate-50 dark:bg-black/40 px-4 rounded-2xl text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest border-none outline-none hidden md:block">
          <option value="">Geral</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={addTask} className="bg-[#9B111E] text-white p-4 rounded-2xl hover:bg-[#7a0d18] transition-all shadow-lg shadow-red-100"><Plus className="w-6 h-6" /></button>
      </div>

      <div className="space-y-3">
        {tasks.map(task => {
          const subject = subjects.find(s => s.id === task.subjectId);
          return (
            <div key={task.id} className={`group flex items-center justify-between p-5 rounded-2xl border transition-all ${task.completed ? 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-slate-800 opacity-60' : 'bg-white dark:bg-[#181818] border-slate-100 dark:border-slate-800 shadow-sm hover:border-[#9B111E]/30'}`}>
              <div className="flex items-center gap-4 flex-1">
                <button onClick={() => toggleTask(task)} className={`transition-colors ${task.completed ? 'text-[#1094ab]' : 'text-slate-200 dark:text-slate-700 hover:text-[#9B111E]'}`}>
                  {task.completed ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                </button>
                <div className="flex-1">
                  <p className={`font-bold text-slate-800 dark:text-slate-100 ${task.completed ? 'line-through opacity-50' : ''}`}>{task.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {subject && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>{subject.name}</span>
                    )}
                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-300 dark:text-slate-500 uppercase tracking-widest"><Calendar className="w-3 h-3" /> Hoje</span>
                  </div>
                </div>
              </div>
              <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 dark:text-slate-600 hover:text-[#9B111E] transition-all"><Trash2 className="w-5 h-5" /></button>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="py-20 text-center text-slate-300 dark:text-slate-700 flex flex-col items-center gap-4">
            <Gavel className="w-12 h-12 opacity-10" />
            <p className="font-bold text-xs uppercase tracking-widest italic">A justiça foi feita. Pauta limpa!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
