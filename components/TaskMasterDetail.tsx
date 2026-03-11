import React, { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { Task, Subject } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface TaskMasterDetailProps {
  tasks: Task[];
  subjects: Subject[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  userId: string;
  isOnline: boolean;
}

const radarData = [
  { subject: 'Civil', A: 120, fullMark: 150 },
  { subject: 'Penal', A: 98, fullMark: 150 },
  { subject: 'Constitucional', A: 86, fullMark: 150 },
  { subject: 'Tributário', A: 99, fullMark: 150 },
  { subject: 'Administrativo', A: 85, fullMark: 150 },
  { subject: 'Trabalho', A: 65, fullMark: 150 },
];

const TaskMasterDetail: React.FC<TaskMasterDetailProps> = ({ tasks, subjects }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  return (
    <div className="flex h-full bg-[#F9FAFB] rounded-3xl overflow-hidden">
      {/* Left Pane (30%) */}
      <div className="w-[30%] p-6 overflow-y-auto space-y-4">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Tarefas</h2>
        {tasks.map(task => {
          const subject = subjects.find(s => s.id === task.subjectId);
          const isActive = selectedTaskId === task.id;
          return (
            <button
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className={`w-full p-5 text-left bg-white rounded-[20px] shadow-sm transition-all border ${isActive ? 'border-[#800000]' : 'border-transparent'}`}
            >
              <h3 className="font-semibold text-slate-900 mb-1">{task.title}</h3>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{subject?.name || 'Geral'}</span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {task.dueDate || 'Sem prazo'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Pane (70%) */}
      <div className="w-[70%] bg-white flex flex-col items-center justify-center p-12">
        {selectedTask ? (
          <div className="w-full h-full flex flex-col">
            <h1 className="text-4xl font-bold text-slate-900 mb-8">{selectedTask.title}</h1>
            <div className="flex-1 bg-slate-50 rounded-3xl p-8">
              <p className="text-slate-500">Detalhes da tarefa selecionada.</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-5xl font-serif font-bold text-slate-900 mb-12">Salve, Júnior!</h1>
            <div className="w-[500px] h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} />
                  <Radar name="Competência" dataKey="A" stroke="#800000" fill="#800000" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-[#800000] flex items-center justify-center text-white shadow-lg hover:scale-105 transition-all">
        <Plus size={28} />
      </button>
    </div>
  );
};

export default TaskMasterDetail;
