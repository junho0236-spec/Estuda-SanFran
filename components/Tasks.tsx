
import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Gavel, 
  Filter, 
  AlertTriangle, 
  Briefcase, 
  BookOpen, 
  Hash,
  Clock,
  Sparkles,
  X,
  FileText,
  Stamp,
  Scale,
  Archive
} from 'lucide-react';
import { Task, Subject, TaskPriority, TaskCategory } from '../types';
import { supabase } from '../services/supabaseClient';
import { getBrasiliaDate, getBrasiliaISOString } from '../App';
import { updateQuestProgress } from '../services/questService';

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

  // Gera um número de processo fictício baseado no ID e data
  const getProcessNumber = (id: string, dateStr?: string) => {
    const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
    const suffix = id.substring(0, 4).toUpperCase();
    return `SF-${suffix}/${year}`;
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const today = getBrasiliaDate();
    const now = getBrasiliaISOString();
    
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
        created_at: now,
        archived_at: null
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
        category: selectedCategory,
        archived_at: null
      };
      
      setTasks(prev => [newTask, ...prev]);
      setNewTaskTitle('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao autuar processo.");
    }
  };

  const toggleTask = async (task: Task) => {
    const isNowCompleted = !task.completed;
    const completionTimestamp = isNowCompleted ? getBrasiliaISOString() : null;

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

      // UPDATE QUEST
      if (isNowCompleted) {
        await updateQuestProgress(userId, 'complete_task', 1);
      }

    } catch (err) {
      console.error("Erro na sentença:", err);
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    }
  };

  const archiveTask = async (id: string) => {
    // Soft Delete (Arquivar)
    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ archived_at: now })
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
      // Remove da visualização atual, mas não deleta
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao arquivar processo.");
    }
  };

  // Filtrar tarefas que NÃO estão arquivadas
  const activeTasks = tasks.filter(t => !t.archived_at);

  const filteredTasks = activeTasks.filter(t => {
    if (filter === 'pendentes') return !t.completed;
    if (filter === 'concluidos') return t.completed;
    return true;
  });

  const getPriorityColor = (p?: TaskPriority) => {
    switch (p) {
      case 'urgente': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50';
      case 'alta': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-900/50';
      default: return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const getPriorityLabel = (p?: TaskPriority) => {
    switch (p) {
      case 'urgente': return 'Prioridade Legal';
      case 'alta': return 'Tramitação Rápida';
      default: return 'Rito Ordinário';
    }
  };

  const getCategoryIcon = (c?: TaskCategory) => {
    switch (c) {
      case 'peticao': return <FileText className="w-3 h-3" />;
      case 'estudo': return <BookOpen className="w-3 h-3" />;
      case 'audiencia': return <Clock className="w-3 h-3" />;
      case 'admin': return <Briefcase className="w-3 h-3" />;
      default: return <Hash className="w-3 h-3" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700 pb-20">
      
      {/* Header Estilo Diário Oficial */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b-4 border-double border-slate-200 dark:border-sanfran-rubi/20">
        <div className="flex items-center gap-6">
           <div className="bg-slate-900 dark:bg-white p-4 rounded-lg shadow-2xl">
              <Scale className="w-8 h-8 text-white dark:text-sanfran-rubiBlack" />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Poder Judiciário Acadêmico</p>
              <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter font-serif leading-none">
                Pauta de Julgamento
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1 font-serif italic">
                Sessão Ordinária do Largo de São Francisco
              </p>
           </div>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-sanfran-rubiDark/20 p-1.5 rounded-lg border border-slate-200 dark:border-sanfran-rubi/30 self-start lg:self-center">
          {(['pendentes', 'concluidos', 'todos'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Input de Autuação */}
      <div className={`bg-white dark:bg-sanfran-rubiDark/20 p-1 rounded-2xl border-2 transition-all shadow-lg ${isAdding ? 'border-sanfran-rubi ring-4 ring-sanfran-rubi/5' : 'border-slate-200 dark:border-sanfran-rubi/30'}`}>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center px-6 py-4">
            <div className="mr-4 p-2 bg-slate-100 dark:bg-white/5 rounded-lg">
               <Gavel className="w-6 h-6 text-slate-400" />
            </div>
            <input 
              type="text" 
              value={newTaskTitle} 
              onChange={(e) => setNewTaskTitle(e.target.value)} 
              placeholder="Autuar novo processo na pauta..." 
              onFocus={() => setIsAdding(true)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()} 
              className="flex-1 bg-transparent outline-none text-lg font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-950 dark:text-white font-serif" 
            />
          </div>
          <div className="p-2">
            <button 
              onClick={addTask}
              className="w-full md:w-auto h-full px-8 bg-slate-900 dark:bg-sanfran-rubi text-white rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all font-black uppercase text-[10px] tracking-widest shadow-md"
            >
              <Stamp className="w-4 h-4" /> Autuar
            </button>
          </div>
        </div>

        {isAdding && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Vara / Competência</label>
                <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-black/40 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/10 outline-none focus:border-sanfran-rubi">
                  <option value="">Geral / Administrativo</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Rito Processual</label>
                <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value as TaskPriority)} className="w-full p-3 bg-slate-50 dark:bg-black/40 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/10 outline-none focus:border-sanfran-rubi">
                  <option value="normal">Rito Ordinário</option>
                  <option value="alta">Tramitação Prioritária</option>
                  <option value="urgente">Liminar / Urgente</option>
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Natureza da Ação</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as TaskCategory)} className="w-full p-3 bg-slate-50 dark:bg-black/40 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/10 outline-none focus:border-sanfran-rubi">
                  <option value="geral">Diversos</option>
                  <option value="peticao">Petição / Redação</option>
                  <option value="estudo">Doutrina / Estudo</option>
                  <option value="audiencia">Audiência / Evento</option>
                </select>
             </div>
          </div>
        )}
      </div>

      {/* Lista de Processos */}
      <div className="space-y-4">
        {filteredTasks.map(task => {
          const subject = subjects.find(s => s.id === task.subjectId);
          const processNumber = getProcessNumber(task.id, task.dueDate);
          
          return (
            <div 
              key={task.id} 
              className={`group relative bg-white dark:bg-sanfran-rubiDark/30 border-l-[6px] rounded-r-xl shadow-sm hover:shadow-xl transition-all p-0 flex flex-col md:flex-row overflow-hidden ${task.completed ? 'opacity-60 grayscale-[0.5]' : 'opacity-100'}`}
              style={{ borderLeftColor: subject?.color || '#334155' }}
            >
              {/* Background Pattern de "Papel" */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

              {/* Coluna de Informações do Processo */}
              <div className="p-5 md:w-64 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                 <div>
                    <span className="font-mono text-[10px] font-black text-slate-400 block mb-1 tracking-wider">AUTOS Nº</span>
                    <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-200/50 dark:bg-white/10 px-2 py-1 rounded select-all">
                      {processNumber}
                    </span>
                 </div>
                 
                 <div className="mt-4 md:mt-0 space-y-2">
                    <div className={`inline-flex items-center px-2 py-1 rounded border text-[9px] font-black uppercase tracking-wide ${getPriorityColor(task.priority)}`}>
                       {task.priority === 'urgente' && <AlertTriangle className="w-3 h-3 mr-1" />}
                       {getPriorityLabel(task.priority)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                       {getCategoryIcon(task.category)}
                       {task.category || 'Geral'}
                    </div>
                 </div>
              </div>

              {/* Conteúdo Principal */}
              <div className="flex-1 p-5 flex flex-col justify-center relative">
                 {/* Carimbo de Status */}
                 <div className="absolute top-2 right-4 pointer-events-none opacity-80 rotate-[-5deg]">
                    {task.completed ? (
                       <div className="border-2 border-emerald-600 text-emerald-600 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 bg-emerald-50/80 dark:bg-emerald-900/20">
                          <CheckCircle2 size={12} /> Transitado em Julgado
                       </div>
                    ) : (
                       <div className="border-2 border-sanfran-rubi text-sanfran-rubi px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 bg-red-50/80 dark:bg-red-900/20">
                          <BookOpen size={12} /> Concluso p/ Relator
                       </div>
                    )}
                 </div>

                 {subject && (
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }}></div>
                      {subject.name}
                   </span>
                 )}
                 
                 <h3 className={`text-xl md:text-2xl font-serif font-bold leading-tight ${task.completed ? 'line-through text-slate-400 decoration-slate-300' : 'text-slate-900 dark:text-white'}`}>
                    {task.title}
                 </h3>
                 
                 <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                       <Calendar className="w-3.5 h-3.5" />
                       <span className="uppercase text-[10px] font-bold tracking-wide">{task.dueDate || 'Sem Prazo'}</span>
                    </span>
                 </div>
              </div>

              {/* Ações */}
              <div className="p-4 flex md:flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-black/10">
                 <button 
                  onClick={() => toggleTask(task)}
                  className={`p-3 rounded-xl transition-all shadow-sm ${task.completed ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/20 hover:scale-105'}`}
                  title={task.completed ? "Reabrir Processo" : "Julgar Procedente (Concluir)"}
                 >
                    {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Gavel className="w-5 h-5" />}
                 </button>
                 
                 <button 
                  onClick={() => archiveTask(task.id)}
                  className="p-3 rounded-xl bg-white dark:bg-white/5 text-slate-400 hover:text-sanfran-rubi hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-slate-200 dark:border-white/10"
                  title="Arquivar Processo (Arquivo Morto)"
                 >
                    <Archive className="w-5 h-5" />
                 </button>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="py-24 text-center border-[6px] border-double border-slate-200 dark:border-white/5 rounded-3xl bg-slate-50/50 dark:bg-sanfran-rubiDark/10">
            <div className="inline-block p-6 rounded-full bg-white dark:bg-white/5 shadow-sm mb-4">
               <Briefcase className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-700 dark:text-slate-300">Pauta Livre</h3>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-1">Nenhum processo aguardando julgamento nesta instância.</p>
          </div>
        )}
      </div>

      <div className="text-center pt-8 border-t border-slate-200 dark:border-white/10">
         <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
            Tribunal Acadêmico XI de Agosto • {new Date().getFullYear()}
         </p>
      </div>
    </div>
  );
};

export default Tasks;
