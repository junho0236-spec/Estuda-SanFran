import React, { useState } from 'react';
import { Plus, Calendar, Clock, ChevronRight, FileText } from 'lucide-react';
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
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
      {/* Left Pane (30%) */}
      <div className="w-[30%] bg-[#F9FAFB] p-6 overflow-y-auto border-r border-slate-100 flex flex-col">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 px-2">Tarefas</h2>
        <div className="space-y-3 flex-1">
          {tasks.map(task => {
            const subject = subjects.find(s => s.id === task.subjectId);
            const isActive = selectedTaskId === task.id;
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`w-full p-5 text-left rounded-[24px] transition-all duration-300 group ${
                  isActive 
                    ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100' 
                    : 'bg-transparent hover:bg-slate-100/80 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#800000]' : 'bg-slate-300 group-hover:bg-slate-400'}`} />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{subject?.name || 'Geral'}</span>
                  </div>
                  <ChevronRight size={16} className={`${isActive ? 'text-[#800000]' : 'text-slate-300 opacity-0 group-hover:opacity-100'} transition-all`} />
                </div>
                <h3 className={`font-semibold text-base mb-3 ${isActive ? 'text-[#800000]' : 'text-slate-800'}`}>
                  {task.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Calendar size={14} />
                  {task.dueDate || 'Sem prazo'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Pane (70%) */}
      <div className="w-[70%] bg-white relative">
        {selectedTask ? (
          <div className="w-full h-full flex flex-col p-12 overflow-y-auto">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest mb-4">
                <FileText size={14} /> Detalhes da Tarefa
              </span>
              <h1 className="text-4xl font-bold text-slate-900">{selectedTask.title}</h1>
            </div>
            <div className="flex-1 bg-[#F9FAFB] rounded-[24px] p-8 border border-slate-100">
              <p className="text-slate-500 text-lg">Selecione as ações desejadas para esta tarefa ou adicione anotações.</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-between p-12">
            {/* Greeting */}
            <div className="text-center mt-4">
              <h1 className="text-5xl font-serif font-bold text-slate-900 mb-3 tracking-tight">Salve, Júnior!</h1>
              <p className="text-slate-500 text-lg font-medium">Seu gabinete está pronto para a sessão de hoje.</p>
            </div>

            {/* Central Hero: Radar Chart */}
            <div className="w-full max-w-2xl h-[400px] my-6 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <defs>
                    <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#800000" stopOpacity={0.85}/>
                      <stop offset="50%" stopColor="#1d4ed8" stopOpacity={0.7}/>
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar name="Competência" dataKey="A" stroke="#800000" strokeWidth={3} fill="url(#radarGradient)" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom Widgets */}
            <div className="w-full max-w-md flex flex-col items-center gap-8 mb-4">
              {/* Urgency Widget */}
              <div className="w-full bg-white p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 flex flex-col items-center text-center transform transition-transform hover:scale-[1.02]">
                <div className="flex items-center gap-2 text-[#800000] font-black mb-3">
                  <Clock size={18} />
                  <span className="uppercase tracking-widest text-[11px]">Próxima Audiência</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Entrega de Petição - Civil III</h3>
                <div className="bg-red-50 text-[#800000] px-5 py-2 rounded-full text-sm font-bold mt-2 flex items-center gap-2 border border-red-100">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Hoje, 14:00
                </div>
              </div>

              {/* Legal Quote */}
              <blockquote className="text-center">
                <p className="italic text-slate-500 text-lg font-serif leading-relaxed">
                  "Direito é a técnica da coexistência humana."
                </p>
                <footer className="text-xs font-sans font-bold text-slate-400 mt-3 uppercase tracking-widest">
                  — Norberto Bobbio
                </footer>
              </blockquote>
            </div>
          </div>
        )}

        {/* FAB */}
        <button className="absolute bottom-8 right-8 w-16 h-16 rounded-full bg-[#800000] flex items-center justify-center text-white shadow-[0_8px_30px_rgb(128,0,0,0.3)] hover:scale-105 hover:bg-red-900 transition-all z-10">
          <Plus size={32} />
        </button>
      </div>
    </div>
  );
};

export default TaskMasterDetail;
