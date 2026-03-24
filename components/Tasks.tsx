
import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  Gavel, 
  AlertTriangle, 
  BookOpen, 
  Stamp,
  Scale
} from 'lucide-react';
import { Task, Subject, TaskPriority, TaskCategory } from '../types';
import { dataService } from '../services/dataService';
import { getBrasiliaDate, getBrasiliaISOString } from '../utils';
import { updateQuestProgress } from '../services/questService';

interface TasksProps {
  subjects: Subject[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  userId: string;
  isOnline: boolean;
}

const Tasks: React.FC<TasksProps> = ({ subjects, tasks, setTasks, userId, isOnline }) => {
  const [filter, setFilter] = useState<'urgente' | 'pendente' | 'concluido' | 'todos'>('todos');

  const filteredTasks = tasks.filter(t => {
    if (filter === 'urgente') return t.priority === 'urgente' && !t.completed;
    if (filter === 'pendente') return !t.completed;
    if (filter === 'concluido') return t.completed;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">Minha Pauta de Julgamento</h1>
        <div className="flex gap-3">
          {[
            { id: 'urgente', label: '🔴 URGENTE', color: 'bg-red-100 text-red-700' },
            { id: 'pendente', label: '🟡 PENDENTE', color: 'bg-yellow-100 text-yellow-700' },
            { id: 'concluido', label: '🟢 CONCLUÍDO', color: 'bg-emerald-100 text-emerald-700' },
            { id: 'todos', label: 'TODOS', color: 'bg-slate-200 text-slate-700' },
          ].map(f => (
            <button 
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filter === f.id ? f.color : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map(task => {
          const subject = subjects.find(s => s.id === task.subjectId);
          return (
            <div key={task.id} className="bg-white p-6 rounded-[20px] shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="text-sm font-bold text-slate-500 mb-2">{subject?.name || 'Geral'}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">{task.title}</h3>
              </div>
              <div className="flex items-center justify-between mt-4 border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar size={16} />
                  {task.dueDate || 'Sem prazo'}
                </div>
                {task.completed ? (
                  <div className="text-amber-500 font-bold flex items-center gap-1">
                    <Stamp size={20} />
                    <span className="text-xs">Transitado em Julgado</span>
                  </div>
                ) : (
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${task.priority === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {task.priority === 'urgente' ? 'URGENTE' : 'SENTENCIADO'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-xl hover:scale-105 transition-all group">
        <Gavel size={32} />
        <span className="absolute bottom-20 right-0 bg-slate-900 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Autuar Nova Tarefa
        </span>
      </button>
    </div>
  );
};

export default Tasks;
