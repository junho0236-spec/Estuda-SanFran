import React, { useState } from 'react';
import { FileText, Calendar, Paperclip, Gavel, CheckCircle2, Archive, Clock } from 'lucide-react';
import { Task, Subject } from '../types';
import { dataService } from '../services/dataService';
import { getBrasiliaISOString } from '../App';
import { updateQuestProgress } from '../services/questService';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

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

const TaskMasterDetail: React.FC<TaskMasterDetailProps> = ({ tasks, subjects, setTasks, userId, isOnline }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  const toggleTask = async (task: Task) => {
    const isNowCompleted = !task.completed;
    const completionTimestamp = isNowCompleted ? getBrasiliaISOString() : null;

    const updatedTask = { 
      ...task, 
      completed: isNowCompleted, 
      completedAt: completionTimestamp || undefined 
    };

    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));

    try {
      await dataService.saveTask(updatedTask, userId, isOnline);
      if (isNowCompleted) {
        await updateQuestProgress(userId, 'complete_task', 1);
      }
    } catch (err) {
      console.error("Erro na sentença:", err);
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    }
  };

  const archiveTask = async (id: string) => {
    try {
      await dataService.deleteTask(id, userId, isOnline);
      setTasks(prev => prev.filter(t => t.id !== id));
      if (selectedTaskId === id) setSelectedTaskId(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao arquivar processo.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-[#F8F9FA] rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      {/* Left Pane (30%) */}
      <div className="w-[30%] bg-white border-r border-slate-200 overflow-y-auto">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Tarefas</h2>
        </div>
        {tasks.map(task => {
          const subject = subjects.find(s => s.id === task.subjectId);
          const isActive = selectedTaskId === task.id;
          return (
            <button
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className={`w-full p-4 text-left border-b border-slate-50 transition-colors ${isActive ? 'bg-red-50 border-l-4 border-l-[#800000]' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500">{subject?.name || 'Geral'}</span>
                <div className={`w-2 h-2 rounded-full ${task.completed ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              </div>
              <h3 className={`font-semibold text-sm ${isActive ? 'text-[#800000]' : 'text-slate-900'}`}>{task.title}</h3>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                <Calendar size={12} />
                {task.dueDate || 'Sem prazo'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Pane (70%) */}
      <div className="w-[70%] bg-white flex flex-col">
        {selectedTask ? (
          <>
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h1 className="text-3xl font-bold text-slate-900">{selectedTask.title}</h1>
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleTask(selectedTask)}
                  className={`p-2 rounded-full ${selectedTask.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  <CheckCircle2 size={20} />
                </button>
                <button 
                  onClick={() => archiveTask(selectedTask.id)}
                  className="p-2 rounded-full bg-slate-100 text-slate-600"
                >
                  <Archive size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600">Descrição detalhada do processo ou tarefa. Espaço para anotações estilo Notion.</p>
                <ul>
                  <li>Análise preliminar dos fatos.</li>
                  <li>Pesquisa de jurisprudência relevante.</li>
                  <li>Redação da peça processual.</li>
                </ul>
              </div>
              
              <div className="mt-12">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Paperclip size={18} className="text-[#800000]" />
                  Arquivos e Anexos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <FileText className="text-[#800000]" />
                    <span className="text-sm text-slate-700">Memorial_Civil.pdf</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <FileText className="text-[#800000]" />
                    <span className="text-sm text-slate-700">Jurisprudencia_STF.jpg</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-serif font-bold text-slate-900 mb-2">Salve, Júnior!</h1>
              <p className="text-slate-500 text-lg">Seu gabinete está pronto para a sessão de hoje.</p>
            </div>

            <div className="w-full h-80 mb-12">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} />
                  <Radar name="Competência" dataKey="A" stroke="#800000" fill="#800000" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full max-w-md bg-slate-50 p-6 rounded-[24px] shadow-sm mb-8 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-[#800000]" />
                Próxima Audiência
              </h3>
              <p className="text-lg font-semibold text-slate-800">Entrega de Petição - Civil III</p>
              <p className="text-sm text-slate-500">Prazo: 12 de Março, 14:00</p>
            </div>

            <blockquote className="text-center italic text-slate-600 text-lg font-serif">
              "Direito é a técnica da coexistência humana." — Norberto Bobbio
            </blockquote>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskMasterDetail;
