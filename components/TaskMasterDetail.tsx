import React, { useState } from 'react';
import { Plus, Calendar, Clock, ChevronRight, FileText, Trash2, CheckCircle2 } from 'lucide-react';
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
    <div className="flex h-[calc(100vh-120px)] bg-[#F8F9FA] rounded-[32px] overflow-hidden border border-slate-200 shadow-sm">
      
      {/* PAINEL ESQUERDO: LISTA DE TAREFAS */}
      <div className="w-[350px] bg-white border-r border-slate-200 flex flex-col">
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tarefas</h2>
          <button 
            onClick={() => alert('Abrir Modal de Nova Tarefa')}
            className="mt-6 w-full py-4 bg-[#800000] text-white rounded-2xl font-bold hover:bg-red-900 transition-all shadow-lg shadow-red-900/10 flex items-center justify-center gap-2 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
            Autuar Novo Processo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
          {tasks.map(task => {
            const subject = subjects.find(s => s.id === task.subjectId);
            const isActive = selectedTaskId === task.id;
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`w-full p-5 text-left rounded-[24px] transition-all duration-200 ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                    : 'bg-transparent hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                    {subject?.name || 'Geral'}
                  </span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                </div>
                <h3 className={`font-bold leading-tight mb-3 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {task.title}
                </h3>
                <div className={`flex items-center gap-1.5 text-[11px] font-medium ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Calendar size={12} />
                  {task.dueDate || 'Sem prazo'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PAINEL DIREITO: CONTEÚDO DINÂMICO */}
      <div className="flex-1 bg-white relative overflow-y-auto">
        {selectedTask ? (
          <div className="max-w-4xl mx-auto p-12 py-16">
            <div className="flex justify-between items-start mb-10">
              <div>
                <div className="flex items-center gap-2 text-[#800000] font-bold text-xs uppercase tracking-widest mb-4">
                  <div className="w-8 h-[2px] bg-[#800000]" />
                  Gabinete de Instrução
                </div>
                <h1 className="text-5xl font-serif text-slate-900 leading-tight">{selectedTask.title}</h1>
              </div>
              <div className="flex gap-2">
                <button className="p-3 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors">
                  <CheckCircle2 size={24} />
                </button>
                <button className="p-3 rounded-full bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700 transition-colors">
                  <Trash2 size={24} />
                </button>
              </div>
            </div>

            <div className="prose prose-slate max-w-none">
              <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 min-h-[400px]">
                <p className="text-slate-400 italic mb-4">Clique para começar a redigir sua tese jurídica ou anotações de aula...</p>
                <div className="h-px bg-slate-200 w-full my-6" />
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="font-medium text-sm text-slate-400">Anexo: Memorial_Descritivo.pdf</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ESTADO VAZIO: DASHBOARD CONTEXTUAL */
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-8">
              <h1 className="text-6xl font-serif text-slate-900 mb-4 tracking-tight">Salve, Júnior!</h1>
              <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
                Seu gabinete está pronto para a sessão de hoje. Revise suas métricas antes de autuar novos processos.
              </p>
            </div>

            <div className="w-full max-w-2xl h-[450px] relative drop-shadow-2xl">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                  <Radar
                    name="Nível"
                    dataKey="A"
                    stroke="#800000"
                    strokeWidth={3}
                    fill="#800000"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-12 space-y-8">
              <div className="inline-flex flex-col items-center p-6 bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100">
                 <div className="flex items-center gap-2 text-[#800000] font-black text-[10px] uppercase tracking-[0.2em] mb-2">
                    <Clock size={14} /> Próxima Audiência
                 </div>
                 <span className="text-slate-900 font-bold text-xl">Entrega de Petição - Civil III</span>
                 <div className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-100">
                    Hoje, às 14:00
                 </div>
              </div>

              <blockquote className="max-w-lg">
                <p className="text-xl font-serif italic text-slate-400 leading-relaxed">
                  "Direito é a técnica da coexistência humana."
                </p>
                <footer className="mt-4 text-[10px] font-bold tracking-[0.3em] text-slate-300 uppercase">
                  — Norberto Bobbio
                </footer>
              </blockquote>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskMasterDetail;