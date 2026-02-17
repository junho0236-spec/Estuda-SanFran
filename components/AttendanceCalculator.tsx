
import React, { useState, useEffect } from 'react';
import { UserX, Plus, Minus, Trash2, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { AttendanceRecord } from '../types';

interface AttendanceCalculatorProps {
  userId: string;
}

const AttendanceCalculator: React.FC<AttendanceCalculatorProps> = ({ userId }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [subjectName, setSubjectName] = useState('');
  const [totalHours, setTotalHours] = useState('');

  useEffect(() => {
    fetchRecords();
  }, [userId]);

  const fetchRecords = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setRecords(data);
    setIsLoading(false);
  };

  const handleAddRecord = async () => {
    if (!subjectName.trim() || !totalHours || isNaN(Number(totalHours))) {
      alert("Preencha o nome da matéria e a carga horária válida.");
      return;
    }

    try {
      const { data, error } = await supabase.from('attendance_records').insert({
        user_id: userId,
        subject_name: subjectName,
        total_hours: Number(totalHours),
        absences: 0
      }).select().single();

      if (error) throw error;
      if (data) setRecords([data, ...records]);
      
      setIsAdding(false);
      setSubjectName('');
      setTotalHours('');
    } catch (e) {
      console.error(e);
      alert("Erro ao adicionar matéria.");
    }
  };

  const updateAbsence = async (id: string, newAbsences: number) => {
    // Optimistic UI
    setRecords(prev => prev.map(r => r.id === id ? { ...r, absences: newAbsences } : r));

    try {
      await supabase.from('attendance_records').update({ absences: newAbsences }).eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm("Remover esta matéria do controle de faltas?")) return;
    try {
      await supabase.from('attendance_records').delete().eq('id', id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) { console.error(e); }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-slate-900 text-white dark:bg-black border-slate-700'; // Reprovado
    if (percentage >= 80) return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
    if (percentage >= 50) return 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-slate-800 dark:bg-white';
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getStatusText = (percentage: number, remaining: number) => {
    if (percentage >= 100) return 'REPROVADO POR FALTA';
    if (percentage >= 80) return `PERIGO: Restam ${remaining.toFixed(0)} faltas`;
    if (percentage >= 50) return `Atenção: Restam ${remaining.toFixed(0)} faltas`;
    return `Seguro: Restam ${remaining.toFixed(0)} faltas`;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-5xl mx-auto h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/20 mb-4">
              <UserX className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Gestão de Presença</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Calculadora de Faltas</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Monitore o limite de 75% de frequência obrigatória.</p>
        </div>
        
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all"
        >
           <Plus size={16} /> Adicionar Matéria
        </button>
      </header>

      {/* CREATE MODAL */}
      {isAdding && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] p-8 border-4 border-slate-200 dark:border-slate-800 shadow-2xl relative">
               <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-6">Nova Matéria</h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Nome da Disciplina</label>
                     <input 
                        value={subjectName} 
                        onChange={e => setSubjectName(e.target.value)}
                        placeholder="Ex: Processo Civil II"
                        className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-slate-500"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1 block">Carga Horária Total (Semestre)</label>
                     <input 
                        type="number"
                        value={totalHours} 
                        onChange={e => setTotalHours(e.target.value)}
                        placeholder="Ex: 60"
                        className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none focus:border-slate-500"
                     />
                     <p className="text-[9px] text-slate-400 mt-1 font-bold">*Limite de faltas será 25% deste valor.</p>
                  </div>

                  <div className="flex gap-3 mt-4">
                     <button onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-slate-100 dark:bg-white/10 text-slate-500 rounded-xl font-black uppercase text-xs">Cancelar</button>
                     <button onClick={handleAddRecord} className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-xs shadow-lg">Salvar</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
         {records.length === 0 && !isLoading && (
            <div className="col-span-full py-20 text-center opacity-40 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
               <UserX size={48} className="mx-auto mb-4 text-slate-400" />
               <p className="text-xl font-black text-slate-500 uppercase">Nenhuma matéria registrada</p>
            </div>
         )}

         {records.map(record => {
            const limit = record.total_hours * 0.25;
            const percentage = (record.absences / limit) * 100;
            const remaining = limit - record.absences;
            const cardColor = getStatusColor(percentage);
            const progressColor = getProgressBarColor(percentage);

            return (
               <div key={record.id} className={`p-6 rounded-[2.5rem] border-2 shadow-lg relative group transition-all hover:scale-[1.02] ${cardColor}`}>
                  
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="text-lg font-black uppercase tracking-tight leading-none mb-1">{record.subject_name}</h3>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{record.total_hours}h Totais • Limite: {limit}h</p>
                     </div>
                     <button 
                        onClick={() => deleteRecord(record.id)}
                        className="p-2 bg-black/10 dark:bg-white/10 rounded-full hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                     <button 
                        onClick={() => updateAbsence(record.id, Math.max(0, record.absences - 1))}
                        className="w-12 h-12 rounded-xl bg-white/20 dark:bg-black/20 flex items-center justify-center font-black text-xl hover:bg-white/40 transition-colors"
                     >
                        <Minus size={20} />
                     </button>
                     
                     <div className="text-center">
                        <span className="text-5xl font-black tabular-nums tracking-tighter leading-none">{record.absences}</span>
                        <span className="text-[9px] font-bold block uppercase tracking-widest opacity-60">Faltas</span>
                     </div>

                     <button 
                        onClick={() => updateAbsence(record.id, record.absences + 1)}
                        className="w-12 h-12 rounded-xl bg-white/20 dark:bg-black/20 flex items-center justify-center font-black text-xl hover:bg-white/40 transition-colors"
                     >
                        <Plus size={20} />
                     </button>
                  </div>

                  <div className="space-y-2">
                     <div className="flex justify-between items-end px-1">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-80 flex items-center gap-1">
                           {percentage >= 80 ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                           {getStatusText(percentage, remaining)}
                        </span>
                        <span className="text-xs font-bold tabular-nums">{Math.round(percentage)}%</span>
                     </div>
                     <div className="h-4 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-0.5">
                        <div 
                           className={`h-full rounded-full transition-all duration-500 ${progressColor}`} 
                           style={{ width: `${Math.min(100, percentage)}%` }} 
                        />
                     </div>
                  </div>

               </div>
            );
         })}
      </div>

    </div>
  );
};

export default AttendanceCalculator;
