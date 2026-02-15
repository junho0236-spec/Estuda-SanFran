
import React, { useState } from 'react';
import { Plus, Book, Trash2, BookOpen, GraduationCap, ChevronRight, ChevronLeft, MoreVertical, CheckCircle, Info } from 'lucide-react';
import { Reading, Subject } from '../types';
import { supabase } from '../services/supabaseClient';

interface LibraryProps {
  readings: Reading[];
  setReadings: React.Dispatch<React.SetStateAction<Reading[]>>;
  subjects: Subject[];
  userId: string;
}

const Library: React.FC<LibraryProps> = ({ readings, setReadings, subjects, userId }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReading, setNewReading] = useState({
    title: '',
    author: '',
    total_pages: 100,
    current_page: 0,
    subject_id: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const addReading = async () => {
    if (!newReading.title.trim()) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.from('readings').insert({
        ...newReading,
        user_id: userId,
        status: 'lendo'
      }).select();
      
      if (error) throw error;
      if (data) setReadings(prev => [data[0], ...prev]);
      
      setNewReading({ title: '', author: '', total_pages: 100, current_page: 0, subject_id: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao protocolar leitura.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateProgress = async (id: string, newPage: number) => {
    const reading = readings.find(r => r.id === id);
    if (!reading) return;
    
    const cappedPage = Math.min(Math.max(0, newPage), reading.total_pages);
    const newStatus = cappedPage === reading.total_pages ? 'concluido' : 'lendo';

    try {
      const { error } = await supabase.from('readings').update({
        current_page: cappedPage,
        status: newStatus
      }).eq('id', id).eq('user_id', userId);

      if (error) throw error;
      setReadings(prev => prev.map(r => r.id === id ? { ...r, current_page: cappedPage, status: newStatus as any } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteReading = async (id: string) => {
    if (!confirm("Deseja remover esta obra do seu acervo?")) return;
    try {
      const { error } = await supabase.from('readings').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      setReadings(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Biblioteca de Doutrina</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-lg mt-1">Sua base de conhecimento jurídico.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-8 py-3.5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-sanfran-rubiDark transition-all"
        >
          <Plus className="w-5 h-5" /> Protocolar Obra
        </button>
      </header>

      {showAddForm && (
        <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border-2 border-sanfran-rubi shadow-2xl animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Título da Obra</label>
              <input 
                value={newReading.title} 
                onChange={e => setNewReading({...newReading, title: e.target.value})}
                placeholder="Ex: Curso de Direito Civil" 
                className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold outline-none focus:border-sanfran-rubi"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Autor / Doutrinador</label>
              <input 
                value={newReading.author} 
                onChange={e => setNewReading({...newReading, author: e.target.value})}
                placeholder="Ex: Maria Helena Diniz" 
                className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold outline-none focus:border-sanfran-rubi"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cadeira (Opcional)</label>
              <select 
                value={newReading.subject_id} 
                onChange={e => setNewReading({...newReading, subject_id: e.target.value})}
                className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold outline-none"
              >
                <option value="">Nenhuma</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Total de Páginas</label>
              <input 
                type="number"
                value={newReading.total_pages} 
                onChange={e => setNewReading({...newReading, total_pages: parseInt(e.target.value)})}
                className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold outline-none focus:border-sanfran-rubi"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button 
                onClick={addReading}
                disabled={isSaving}
                className="w-full py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSaving ? "Sincronizando..." : "Confirmar Protocolo"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {readings.length === 0 && !showAddForm && (
          <div className="col-span-full py-32 text-center border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem] flex flex-col items-center gap-6">
             <Book className="w-16 h-16 text-slate-200 dark:text-white/5" />
             <div className="space-y-1">
               <p className="text-xl font-black text-slate-300 dark:text-slate-700 uppercase">Acervo Vazio</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inicie seu dossiê de leituras acadêmicas.</p>
             </div>
          </div>
        )}

        {readings.map(reading => {
          const progress = (reading.current_page / reading.total_pages) * 100;
          const subject = subjects.find(s => s.id === reading.subject_id);
          
          return (
            <div key={reading.id} className={`bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-8 border-2 transition-all group relative overflow-hidden flex flex-col justify-between ${reading.status === 'concluido' ? 'border-emerald-500/30 bg-emerald-50/5' : 'border-slate-200 dark:border-sanfran-rubi/30 shadow-xl'}`}>
              <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: subject?.color || '#9B111E' }} />
              
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl ${reading.status === 'concluido' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                    {reading.status === 'concluido' ? <CheckCircle className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                  </div>
                  <button onClick={() => deleteReading(reading.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h4 className={`text-xl font-black uppercase tracking-tight leading-tight ${reading.status === 'concluido' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                    {reading.title}
                  </h4>
                  <p className="text-xs font-bold text-slate-400 mt-1">{reading.author || "Autor Desconhecido"}</p>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Progresso Doutrinário</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{Math.round(progress)}%</span>
                   </div>
                   <div className="h-3 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${reading.status === 'concluido' ? 'bg-emerald-500' : 'bg-sanfran-rubi shadow-[0_0_10px_rgba(155,17,30,0.5)]'}`}
                        style={{ width: `${progress}%` }}
                      />
                   </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <button 
                    onClick={() => updateProgress(reading.id, reading.current_page - 5)}
                    className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-sanfran-rubi hover:text-white transition-all"
                   >
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                   <div className="text-center min-w-[60px]">
                      <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{reading.current_page}</span>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">pág</span>
                   </div>
                   <button 
                    onClick={() => updateProgress(reading.id, reading.current_page + 5)}
                    className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-sanfran-rubi hover:text-white transition-all"
                   >
                     <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
                <div className="text-right">
                   <span className="text-[9px] font-black uppercase text-slate-300 block">Total</span>
                   <span className="text-sm font-bold text-slate-400">{reading.total_pages} pág.</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Library;
