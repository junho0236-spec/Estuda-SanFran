
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  BarChart2, 
  Clock, 
  Plus, 
  Trash2, 
  Save, 
  ArrowRight, 
  BookOpen,
  History,
  CheckCircle2,
  CalendarCheck,
  X
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { StudyPlan, PlanSubject } from '../types';

interface ReverseStudyPlannerProps {
  userId: string;
}

const COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
];

const ReverseStudyPlanner: React.FC<ReverseStudyPlannerProps> = ({ userId }) => {
  const [mode, setMode] = useState<'list' | 'create' | 'view'>('list');
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<StudyPlan | null>(null);

  // Creation State
  const [step, setStep] = useState(1); // 1: Setup, 2: Subjects, 3: Review
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newHours, setNewHours] = useState(3);
  const [newSubjects, setNewSubjects] = useState<PlanSubject[]>([
    { name: 'Direito Civil', weight: 2, color: COLORS[0] },
    { name: 'Direito Penal', weight: 1, color: COLORS[1] }
  ]);

  // Subject Input
  const [subName, setSubName] = useState('');
  const [subWeight, setSubWeight] = useState(1);

  useEffect(() => {
    fetchPlans();
  }, [userId]);

  const fetchPlans = async () => {
    const { data } = await supabase.from('study_plans').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setPlans(data);
  };

  const addSubject = () => {
    if (!subName.trim()) return;
    setNewSubjects([...newSubjects, { 
      name: subName, 
      weight: subWeight, 
      color: COLORS[newSubjects.length % COLORS.length] 
    }]);
    setSubName('');
    setSubWeight(1);
  };

  const removeSubject = (idx: number) => {
    setNewSubjects(newSubjects.filter((_, i) => i !== idx));
  };

  const savePlan = async () => {
    try {
      const payload = {
        user_id: userId,
        title: newTitle,
        exam_date: newDate,
        daily_hours: newHours,
        subjects_config: newSubjects
      };

      const { data, error } = await supabase.from('study_plans').insert(payload).select().single();
      if (error) throw error;
      
      if (data) {
        setPlans([data, ...plans]);
        setCurrentPlan(data);
        setMode('view');
        // Reset form
        setStep(1); setNewTitle(''); setNewDate(''); setNewSubjects([]);
      }
    } catch (e) {
      alert("Erro ao salvar cronograma.");
    }
  };

  // --- CALCULATION LOGIC ---
  const generateSchedule = useMemo(() => {
    const plan = currentPlan || (mode === 'create' && step === 3 ? {
      title: newTitle,
      exam_date: newDate,
      daily_hours: newHours,
      subjects_config: newSubjects
    } as StudyPlan : null);

    if (!plan) return [];

    const targetDate = new Date(plan.exam_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) return [];

    const schedule = [];
    const subjects = plan.subjects_config;
    
    // Calculate proportions
    const totalWeight = subjects.reduce((acc, s) => acc + s.weight, 0);
    
    // Create a pool of hours based on total capacity
    // Simplified logic: Distribute hours cyclically day by day
    
    let currentSubjectIdx = 0;
    
    for (let d = 0; d < totalDays; d++) {
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() + d);
      
      const daySlots = [];
      let hoursFilled = 0;

      // Fill the day
      while (hoursFilled < plan.daily_hours) {
        const subj = subjects[currentSubjectIdx];
        // Allocate hours based on weight relative to remaining daily hours?
        // Let's keep it simple: Allocate 1 hour blocks based on weight probability or round robin
        
        // Better: Weighted Round Robin for the whole period.
        // Let's create a "deck" of subjects based on weight
        // E.g. Weight 2 = 2 cards in deck.
        // Shuffle deck? No, let's keep sequence for consistency.
        
        // Dynamic Allocation Strategy:
        // Assign hours to current subject based on its weight, then move next.
        
        const hoursToAssign = Math.min(subj.weight, plan.daily_hours - hoursFilled);
        
        daySlots.push({
           subject: subj.name,
           color: subj.color,
           hours: hoursToAssign
        });

        hoursFilled += hoursToAssign;
        currentSubjectIdx = (currentSubjectIdx + 1) % subjects.length;
      }

      schedule.push({
        date: dayDate,
        slots: daySlots
      });
    }

    return schedule;
  }, [currentPlan, mode, step]);

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    await supabase.from('study_plans').delete().eq('id', id);
    setPlans(plans.filter(p => p.id !== id));
    if (currentPlan?.id === id) {
      setCurrentPlan(null);
      setMode('list');
    }
  };

  // --- RENDERS ---

  if (mode === 'list') {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
             <div className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-700 dark:border-white/20 mb-4">
                <CalendarCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Algoritmo de Estudo</span>
             </div>
             <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Cronograma Reverso</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">Defina a data. Nós definimos o caminho.</p>
          </div>
          <button 
            onClick={() => { setMode('create'); setStep(1); }}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
          >
             <Plus size={16} /> Novo Planejamento
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {plans.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
                 <Calendar size={64} className="mx-auto mb-4 text-slate-400" />
                 <p className="text-xl font-black uppercase text-slate-500">Nenhum Cronograma</p>
                 <p className="text-xs font-bold text-slate-400 mt-2">Crie seu primeiro plano de estudos baseado na data da prova.</p>
              </div>
           )}
           {plans.map(plan => (
              <div key={plan.id} className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-lg hover:shadow-xl transition-all relative group">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight mb-1">{plan.title}</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={10} /> {new Date(plan.exam_date).toLocaleDateString()}
                       </p>
                    </div>
                    <button onClick={() => handleDeletePlan(plan.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Trash2 size={16} />
                    </button>
                 </div>
                 
                 <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                       <span>Carga Diária</span>
                       <span>{plan.daily_hours}h</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                       <span>Matérias</span>
                       <span>{plan.subjects_config.length}</span>
                    </div>
                 </div>

                 <button 
                   onClick={() => { setCurrentPlan(plan); setMode('view'); }}
                   className="w-full py-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                 >
                    <BookOpen size={14} /> Abrir Cronograma
                 </button>
              </div>
           ))}
        </div>
      </div>
    );
  }

  if (mode === 'create') {
     return (
        <div className="max-w-2xl mx-auto py-10 animate-in slide-in-from-bottom-4 px-4">
           {/* Steps Indicator */}
           <div className="flex justify-center mb-8 gap-2">
              {[1, 2, 3].map(s => (
                 <div key={s} className={`h-1 w-12 rounded-full transition-colors ${step >= s ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`} />
              ))}
           </div>

           <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
              
              {step === 1 && (
                 <div className="space-y-6">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase text-center">Configuração Inicial</h3>
                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Objetivo (Título)</label>
                       <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: OAB 41" className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data da Prova</label>
                       <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Horas por Dia</label>
                       <div className="flex items-center gap-4 bg-slate-50 dark:bg-black/40 p-4 rounded-xl border-2 border-slate-200 dark:border-white/10">
                          <input type="range" min="1" max="12" value={newHours} onChange={e => setNewHours(Number(e.target.value))} className="flex-1 accent-emerald-500" />
                          <span className="font-black text-xl w-12 text-center">{newHours}h</span>
                       </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                       <button onClick={() => setMode('list')} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs">Cancelar</button>
                       <button onClick={() => { if(newTitle && newDate) setStep(2); else alert('Preencha tudo'); }} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg">Próximo</button>
                    </div>
                 </div>
              )}

              {step === 2 && (
                 <div className="space-y-6">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase text-center">Matérias & Pesos</h3>
                    
                    <div className="flex gap-2">
                       <input value={subName} onChange={e => setSubName(e.target.value)} placeholder="Matéria (Ex: Civil)" className="flex-1 p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none" />
                       <select value={subWeight} onChange={e => setSubWeight(Number(e.target.value))} className="w-24 p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none">
                          <option value={1}>Peso 1</option>
                          <option value={2}>Peso 2</option>
                          <option value={3}>Peso 3</option>
                       </select>
                       <button onClick={addSubject} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl"><Plus size={20} /></button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                       {newSubjects.map((s, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                             <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${s.color}`}></div>
                                <span className="font-bold text-sm">{s.name}</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Peso {s.weight}</span>
                                <button onClick={() => removeSubject(idx)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                             </div>
                          </div>
                       ))}
                       {newSubjects.length === 0 && <p className="text-center text-xs text-slate-400 py-4">Adicione matérias para distribuir.</p>}
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button onClick={() => setStep(1)} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs">Voltar</button>
                       <button onClick={() => { if(newSubjects.length > 0) setStep(3); else alert('Adicione matérias'); }} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg">Gerar Prévia</button>
                    </div>
                 </div>
              )}

              {step === 3 && (
                 <div className="space-y-6">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase text-center">Prévia do Plano</h3>
                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                       <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {generateSchedule.length} Dias de Estudo até {new Date(newDate).toLocaleDateString()}
                       </p>
                       <p className="text-xs text-slate-400 mt-1">Carga Total: {generateSchedule.length * newHours} Horas</p>
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                       <button onClick={() => setStep(2)} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs">Ajustar</button>
                       <button onClick={savePlan} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} /> Confirmar Plano
                       </button>
                    </div>
                 </div>
              )}

           </div>
        </div>
     );
  }

  // --- VIEW: TIMELINE ---
  if (mode === 'view' && currentPlan) {
     return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in zoom-in-95 duration-300">
           
           <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-4">
                 <button onClick={() => setMode('list')} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 transition-colors">
                    <ArrowRight className="rotate-180 w-5 h-5 text-slate-600" />
                 </button>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{currentPlan.title}</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{generateSchedule.length} Dias Restantes</p>
                 </div>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-white/10 z-0"></div>
              
              <div className="space-y-6 z-10 relative pl-0">
                 {generateSchedule.map((day, idx) => (
                    <div key={idx} className="flex gap-6 group">
                       {/* Date Bubble */}
                       <div className="w-12 flex flex-col items-center shrink-0 pt-2 bg-[#fcfcfc] dark:bg-sanfran-rubiBlack z-10">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{day.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${idx === 0 ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg scale-110' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                             {day.date.getDate()}
                          </div>
                       </div>

                       {/* Content Card */}
                       <div className={`flex-1 p-4 rounded-2xl border-2 transition-all ${idx === 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-sanfran-rubiDark/20 border-slate-200 dark:border-white/5 hover:border-slate-300'}`}>
                          <div className="flex flex-col gap-2">
                             {day.slots.map((slot, sIdx) => (
                                <div key={sIdx} className="flex items-center justify-between p-2 bg-white/50 dark:bg-black/20 rounded-lg border border-slate-100 dark:border-white/5">
                                   <div className="flex items-center gap-3">
                                      <div className={`w-2 h-8 rounded-full ${slot.color}`}></div>
                                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{slot.subject}</span>
                                   </div>
                                   <span className="text-xs font-black text-slate-400">{slot.hours}h</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
     );
  }

  return null;
};

export default ReverseStudyPlanner;
