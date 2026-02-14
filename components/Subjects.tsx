
import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, GraduationCap } from 'lucide-react';
import { Subject } from '../types';
import { supabase } from '../services/supabaseClient';

interface SubjectsProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  userId: string;
}

const Subjects: React.FC<SubjectsProps> = ({ subjects, setSubjects, userId }) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#9B111E');
  const [isSaving, setIsSaving] = useState(false);

  const colors = [
    '#9B111E', '#1094ab', '#fcb421', '#1a1a1a', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
  ];

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    setIsSaving(true);
    const newSubject: Subject = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSubjectName,
      color: selectedColor
    };

    try {
      const { error } = await supabase.from('subjects').insert({
        ...newSubject,
        user_id: userId
      });
      if (error) throw error;
      setSubjects(prev => [...prev, newSubject]);
      setNewSubjectName('');
    } catch (err) {
      console.error(err);
      alert("Erro ao protocolar disciplina.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeSubject = async (id: string) => {
    if (!confirm('Deseja realmente remover esta cadeira acadêmica?')) return;
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao remover disciplina.");
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      <header>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Cadeiras Acadêmicas</h2>
        <p className="text-slate-500 dark:text-slate-400">Organize sua vida jurídica por disciplinas.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#181818] p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 border-t-4 border-t-[#9B111E]">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100"><GraduationCap className="text-[#9B111E]" /> Matrícula</h3>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nome da Cadeira</label>
              <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Ex: Teoria Geral do Estado" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Selo de Identificação</label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map(color => (
                  <button key={color} onClick={() => setSelectedColor(color)} className={`h-10 rounded-xl transition-all ${selectedColor === color ? 'ring-4 ring-slate-100 dark:ring-white/10 scale-90 shadow-inner' : 'hover:scale-105 opacity-80'}`} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <button 
              disabled={isSaving}
              onClick={addSubject} 
              className="w-full py-4 bg-[#9B111E] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#7a0d18] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" /> {isSaving ? 'Protocolando...' : 'Adicionar Cadeira'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map(subject => (
            <div key={subject.id} className="bg-white dark:bg-[#181818] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all border-l-8" style={{ borderLeftColor: subject.color }}>
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800" style={{ color: subject.color }}><BookOpen className="w-6 h-6" /></div>
                <button onClick={() => removeSubject(subject.id)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-[#9B111E] transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
              <div className="mt-4">
                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{subject.name}</h4>
                <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-500">SanFran FDUSP</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Subjects;
