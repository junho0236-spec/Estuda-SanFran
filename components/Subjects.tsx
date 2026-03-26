
import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, GraduationCap, FileText, X, Save, RotateCcw } from 'lucide-react';
import { Subject, Task } from '../types';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface SubjectsProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  userId: string;
  onViewNotes: (subjectId: string) => void;
  onViewRepository: (subjectId: string) => void;
  onViewAssignments: (subjectId: string) => void;
  tasks: Task[];
}

const Subjects: React.FC<SubjectsProps> = ({ subjects, setSubjects, userId, onViewNotes, onViewRepository, onViewAssignments, tasks }) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#9B111E');
  const [isSaving, setIsSaving] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // New state for additional fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [absences, setAbsences] = useState(0);
  const [maxAbsences, setMaxAbsences] = useState(20);
  const [semesterYear, setSemesterYear] = useState('');
  const [workload, setWorkload] = useState(0);
  const [p1Date, setP1Date] = useState('');
  const [p2Date, setP2Date] = useState('');

  const [selectedSubjectForContent, setSelectedSubjectForContent] = useState<Subject | null>(null);
  const [subjectContent, setSubjectContent] = useState('');
  const [isSavingContent, setIsSavingContent] = useState(false);

  const colors = [
    '#9B111E', '#1094ab', '#fcb421', '#1a1a1a', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
  ];

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    setIsSaving(true);
    const subjectData = {
      name: newSubjectName,
      color: selectedColor,
      semester_start_date: startDate || null,
      semester_end_date: endDate || null,
      absences: absences,
      max_absences: maxAbsences,
      semester_year: semesterYear || null,
      workload: workload,
      p1_date: p1Date || null,
      p2_date: p2Date || null
    };

    try {
      if (editingSubject) {
        // Update existing subject
        const { data, error } = await supabase.from('subjects').update(subjectData).eq('id', editingSubject.id).select();
        if (error) throw error;
        setSubjects(prev => prev.map(s => s.id === editingSubject.id ? data[0] : s));
        setEditingSubject(null);
      } else {
        // Add new subject
        const newSubject: Subject = {
          id: crypto.randomUUID(),
          ...subjectData
        };
        const { error } = await supabase.from('subjects').insert({ ...newSubject, user_id: userId });
        if (error) throw error;
        setSubjects(prev => [...prev, newSubject]);
      }
      
      // Reset form
      setNewSubjectName('');
      setSelectedColor('#9B111E');
      setStartDate('');
      setEndDate('');
      setAbsences(0);
      setMaxAbsences(20);
      setSemesterYear('');
      setWorkload(0);
      setP1Date('');
      setP2Date('');

    } catch (err) {
      console.error(err);
      alert("Erro ao salvar disciplina.");
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

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setNewSubjectName(subject.name);
    setSelectedColor(subject.color);
    setStartDate(subject.semester_start_date || '');
    setEndDate(subject.semester_end_date || '');
    setAbsences(subject.absences || 0);
    setMaxAbsences(subject.max_absences || 20);
    setSemesterYear(subject.semester_year || '');
    setWorkload(subject.workload || 0);
    setP1Date(subject.p1_date || '');
    setP2Date(subject.p2_date || '');
  };

  const handleSaveContent = async () => {
    if (!selectedSubjectForContent) return;
    setIsSavingContent(true);
    try {
      const { error } = await supabase.from('subjects').update({
        content: subjectContent
      }).eq('id', selectedSubjectForContent.id);

      if (error) throw error;

      setSubjects(prev => prev.map(s => s.id === selectedSubjectForContent.id ? { ...s, content: subjectContent } : s));
      toast.success("Conteúdo da disciplina salvo!");
      setSelectedSubjectForContent(null);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar conteúdo.");
    } finally {
      setIsSavingContent(false);
    }
  };

  const openSubjectContent = (subject: Subject) => {
    setSelectedSubjectForContent(subject);
    setSubjectContent(subject.content || '');
  };

  const getNextDeadline = (subjectId: string) => {
    const subjectTasks = tasks
      .filter(t => t.subjectId === subjectId && !t.completed && t.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    if (subjectTasks.length === 0) return null;

    const nextTask = subjectTasks[0];
    const diffTime = new Date(nextTask.dueDate!).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null; // Deadline passed

    return {
      title: nextTask.title,
      days: diffDays
    };
  };

  const getSemesterProgress = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    if (now < start) return 0;
    if (now > end) return 100;
    const total = end - start;
    const current = now - start;
    return (current / total) * 100;
  };

  const getRemainingClasses = (subject: Subject) => {
    if (!subject.workload || !subject.semester_start_date || !subject.semester_end_date) return null;
    const progress = getSemesterProgress(subject.semester_start_date, subject.semester_end_date);
    const totalClasses = Math.ceil(subject.workload / 2); // Assume 2h per class
    const classesElapsed = Math.floor((progress / 100) * totalClasses);
    const remaining = totalClasses - classesElapsed;
    return remaining > 0 ? remaining : 0;
  };

  const ExamTimeline = () => {
    const allExams = subjects
      .flatMap(s => [
        { subject: s.name, color: s.color, date: s.p1_date, type: 'P1' },
        { subject: s.name, color: s.color, date: s.p2_date, type: 'P2' }
      ])
      .filter(e => e.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    if (allExams.length === 0) return null;

    return (
      <div className="bg-white dark:bg-[#181818] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <BookOpen size={14} /> Linha do Tempo de Provas
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {allExams.map((exam, idx) => {
            const date = new Date(exam.date!);
            const isSoon = (date.getTime() - new Date().getTime()) < (7 * 24 * 60 * 60 * 1000);
            return (
              <div key={idx} className={`flex-shrink-0 p-4 rounded-2xl border ${isSoon ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-slate-800'} min-w-[160px]`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: exam.color }}>{exam.type}</span>
                  <span className="text-[10px] font-bold text-slate-400">{date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{exam.subject}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      <header>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Cadeiras Acadêmicas</h2>
        <p className="text-slate-500 dark:text-slate-400">Organize sua vida jurídica por disciplinas.</p>
      </header>

      <ExamTimeline />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-[#181818] p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 border-t-4 border-t-[#9B111E]">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100"><GraduationCap className="text-[#9B111E]" /> {editingSubject ? 'Editar Cadeira' : 'Matrícula'}</h3>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nome da Cadeira</label>
                  <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Ex: Teoria Geral do Estado" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Semestre / Ano</label>
                  <input type="text" value={semesterYear} onChange={(e) => setSemesterYear(e.target.value)} placeholder="Ex: 1º Semestre / 2026" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Início do Semestre</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Fim do Semestre</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Faltas Atuais</label>
                    <input type="number" value={absences} onChange={(e) => setAbsences(parseInt(e.target.value))} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Máximo de Faltas</label>
                    <input type="number" value={maxAbsences} onChange={(e) => setMaxAbsences(parseInt(e.target.value))} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Carga Horária (horas)</label>
                  <input type="number" value={workload} onChange={(e) => setWorkload(parseInt(e.target.value))} placeholder="Ex: 60" className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data P1 (Prova)</label>
                    <input type="date" value={p1Date} onChange={(e) => setP1Date(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data P2 (Prova)</label>
                    <input type="date" value={p2Date} onChange={(e) => setP2Date(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#9B111E] text-slate-800 dark:text-slate-100" />
                  </div>
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
                  <Plus className="w-5 h-5" /> {isSaving ? 'Salvando...' : (editingSubject ? 'Atualizar Cadeira' : 'Adicionar Cadeira')}
                </button>
                {editingSubject && (
                  <button onClick={() => { setEditingSubject(null); setNewSubjectName(''); setSelectedColor('#9B111E'); setStartDate(''); setEndDate(''); setAbsences(0); setMaxAbsences(20); setSemesterYear(''); setWorkload(0); }} className="w-full text-center text-xs text-slate-400 font-bold mt-2">Cancelar Edição</button>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {subjects.map(subject => {
                const nextDeadline = getNextDeadline(subject.id);
                const progress = getSemesterProgress(subject.semester_start_date, subject.semester_end_date);
                const absencePercentage = subject.max_absences ? ((subject.absences || 0) / subject.max_absences) * 100 : 0;

                return (
                  <div 
                    key={subject.id} 
                    className="bg-white dark:bg-[#181818] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-xl hover:scale-[1.02] transition-all border-l-8 cursor-pointer relative group" 
                    style={{ borderLeftColor: subject.color }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800" style={{ color: subject.color }}><BookOpen className="w-6 h-6" /></div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(subject)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-blue-500 transition-colors"><Plus className="w-5 h-5" /></button>
                        <button onClick={() => removeSubject(subject.id)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-[#9B111E] transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight" onClick={() => onViewNotes(subject.id)}>{subject.name}</h4>
                      
                      <div className="mt-3 flex gap-2">
                        <button 
                          onClick={() => onViewNotes(subject.id)}
                          className="flex-1 py-2 bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all"
                        >
                          Notas
                        </button>
                        <button 
                          onClick={() => onViewRepository(subject.id)}
                          className="flex-1 py-2 bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                        >
                          Repositório
                        </button>
                        <button 
                          onClick={() => onViewAssignments(subject.id)}
                          className="flex-1 py-2 bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all"
                        >
                          Entregas
                        </button>
                        <button 
                          onClick={() => openSubjectContent(subject)}
                          className="flex-1 py-2 bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all"
                        >
                          Documento
                        </button>
                      </div>

                      <div className="mt-4 space-y-3" onClick={() => onViewNotes(subject.id)}>
                        {nextDeadline && (
                          <div className={`p-2 rounded-lg text-xs font-bold flex items-center gap-2 ${nextDeadline.days <= 3 ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'}`}>
                            <span className="text-lg">🔥</span> {nextDeadline.title} em {nextDeadline.days} dia{nextDeadline.days !== 1 ? 's' : ''}
                          </div>
                        )}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Faltas</span>
                            <span className={`text-sm font-bold ${absencePercentage > 80 ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>{subject.absences || 0}/{subject.max_absences || 20}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-black/30 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full ${absencePercentage > 80 ? 'bg-red-500' : 'bg-slate-400'}`} style={{ width: `${absencePercentage}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progresso do Semestre</span>
                          <div className="w-full bg-slate-100 dark:bg-black/30 rounded-full h-2.5 mt-1">
                            <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                        {getRemainingClasses(subject) !== null && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aulas Restantes</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">~{getRemainingClasses(subject)} aulas</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
      </div>

      {/* CONTENT MODAL (DOCS) */}
      <AnimatePresence>
        {selectedSubjectForContent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-4xl rounded-3xl p-6 sm:p-8 border-4 border-slate-100 dark:border-slate-800 shadow-2xl relative flex flex-col h-[85vh]"
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight">{selectedSubjectForContent.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conteúdo da Disciplina</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSubjectForContent(null)} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 min-h-0 mb-6">
                <textarea
                  value={subjectContent}
                  onChange={(e) => setSubjectContent(e.target.value)}
                  placeholder="Adicione aqui o conteúdo programático ou resumos desta disciplina..."
                  className="w-full h-full p-6 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-medium outline-none focus:border-slate-500 transition-all resize-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setSelectedSubjectForContent(null)}
                  className="px-6 py-3 text-slate-500 font-bold uppercase text-xs tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveContent}
                  disabled={isSavingContent}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: selectedSubjectForContent.color }}
                >
                  {isSavingContent ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{isSavingContent ? 'Salvando...' : 'Salvar Conteúdo'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Subjects;
