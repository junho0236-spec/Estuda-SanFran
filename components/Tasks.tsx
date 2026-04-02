
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Calendar, 
  Gavel, 
  AlertTriangle, 
  TrendingUp,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { Task, Subject, View } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TaskSummaryWidgetProps {
  subjects: Subject[];
  tasks: Task[];
  onNavigate: (view: View) => void;
}

const TaskSummaryWidget: React.FC<TaskSummaryWidgetProps> = ({ subjects, tasks, onNavigate }) => {
  const pendingTasks = tasks.filter(t => !t.completed);
  const urgentTasks = pendingTasks.filter(t => t.priority === 'urgente');
  
  // Burndown Data: Created vs Completed over the last 7 days
  const burndownData = useMemo(() => {
    const data = [];
    const now = new Date();
    // Use a fixed reference for "today" in Brasilia time to avoid TZ shifts
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const created = tasks.filter(t => {
        const createdAt = (t as any).created_at || (t as any).createdAt;
        return createdAt?.startsWith(dateStr);
      }).length;
      
      const completed = tasks.filter(t => t.completed && t.completedAt?.startsWith(dateStr)).length;
      
      data.push({
        name: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        criadas: created,
        concluidas: completed,
      });
    }
    return data;
  }, [tasks]);

  // Suggest "Cleanup Day" if creation > completion trend in the last 7 days
  const totalCreated = burndownData.reduce((acc, d) => acc + d.criadas, 0);
  const totalCompleted = burndownData.reduce((acc, d) => acc + d.concluidas, 0);
  const needsCleanup = (totalCreated > totalCompleted * 1.5 && pendingTasks.length > 5) || pendingTasks.length > 20;

  // Sort pending tasks by due date
  const sortedPendingTasks = useMemo(() => {
    return [...pendingTasks].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [pendingTasks]);

  return (
    <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-6 md:p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl md:text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-3">
            <Gavel className="text-sanfran-rubi" />
            Pauta de Julgamento
          </h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Resumo de Produtividade</p>
        </div>
        <button 
          onClick={() => onNavigate(View.Tasks)}
          className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl hover:bg-sanfran-rubi hover:text-white transition-all group"
        >
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Burndown Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              Fluxo de Trabalho
            </h4>
            {needsCleanup && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-black animate-pulse"
              >
                <AlertTriangle size={12} />
                SUGESTÃO: DIA DE FAXINA
              </motion.div>
            )}
          </div>
          
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)'
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '20px' }} />
                <Line 
                  type="monotone" 
                  dataKey="criadas" 
                  stroke="#ef4444" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  name="Criadas"
                />
                <Line 
                  type="monotone" 
                  dataKey="concluidas" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  name="Concluídas"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick List */}
        <div className="space-y-4">
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 size={16} className="text-sanfran-rubi" />
            Próximas Sentenças
          </h4>
          
          <div className="space-y-3">
            {sortedPendingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-slate-50 dark:bg-white/5 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-white/5 text-slate-400 italic">
                <CheckCircle2 size={40} className="mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Nada pendente na pauta</p>
                <p className="text-[10px] mt-1">Aproveite o tempo livre!</p>
              </div>
            ) : (
              sortedPendingTasks.slice(0, 3).map(task => {
                const subject = subjects.find(s => s.id === task.subjectId);
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));
                
                return (
                  <div 
                    key={task.id} 
                    onClick={() => onNavigate(View.Tasks)}
                    className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 hover:border-sanfran-rubi/30 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className={`w-1.5 h-10 rounded-full shrink-0 ${task.priority === 'urgente' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-sanfran-rubi'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                        {subject?.name || 'Geral'}
                      </p>
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-sanfran-rubi transition-colors">
                        {task.title}
                      </h5>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${isOverdue ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                        <Calendar size={10} />
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'S/P'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {sortedPendingTasks.length > 3 && (
              <button 
                onClick={() => onNavigate(View.Tasks)}
                className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-sanfran-rubi transition-colors flex items-center justify-center gap-2"
              >
                + {sortedPendingTasks.length - 3} outras tarefas na pauta
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSummaryWidget;
