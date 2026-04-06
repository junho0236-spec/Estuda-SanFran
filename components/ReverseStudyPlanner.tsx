
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
  X,
  Loader2,
  Sparkles
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { STUDY_PLANS_LIST_COLUMNS } from '../utils/supabaseSelectColumns';
import { StudyPlan, PlanSubject, DailyPlan } from '../types';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { GEMINI_MODEL } from '../services/geminiService';

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
  const [step, setStep] = useState(1); // 1: Setup, 2: Subjects/Syllabus, 3: Review
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newHours, setNewHours] = useState(3);
  const [newSyllabus, setNewSyllabus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<DailyPlan[]>([]);
  const [newSubjects, setNewSubjects] = useState<PlanSubject[]>([]);

  // Subject Input
  const [subName, setSubName] = useState('');
  const [subWeight, setSubWeight] = useState(1);

  useEffect(() => {
    fetchPlans();
  }, [userId]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('study_plans')
      .select(STUDY_PLANS_LIST_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
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
        subjects_config: newSubjects,
        syllabus_text: newSyllabus,
        generated_schedule: generatedSchedule
      };

      const { data, error } = await supabase.from('study_plans').insert(payload).select().single();
      if (error) throw error;
      
      if (data) {
        setPlans([data, ...plans]);
        setCurrentPlan(data);
        setMode('view');
        // Reset form
        setStep(1); setNewTitle(''); setNewDate(''); setNewSubjects([]); setNewSyllabus(''); setGeneratedSchedule([]);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar cronograma: ${e.message || JSON.stringify(e)}`);
    }
  };

  const generateWithAI = async () => {
    if (!newSyllabus.trim()) {
      alert("Por favor, insira o edital.");
      return;
    }
    setIsGenerating(true);
    try {
      let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || (import.meta as any).env.VITE_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      
      // Fallback if API key is missing (e.g. .env.local was deleted)
      if (!apiKey) {
        const aistudio = (window as any).aistudio;
        if (aistudio && aistudio.hasSelectedApiKey) {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (!hasKey) {
            await aistudio.openSelectKey();
            // Assume success after openSelectKey returns
          }
          apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
        }
      }
      
      if (!apiKey) {
         throw new Error("Chave da API não encontrada. Verifique se VITE_API_KEY está configurada no Vercel ou .env.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é um especialista em planejamento de estudos. O usuário tem uma prova na data ${newDate} e pode estudar ${newHours} horas por dia.
Aqui está o edital (conteúdo programático):
${newSyllabus}

Crie um ciclo de estudos semanal (7 dias, do Dia 1 ao Dia 7) otimizado, distribuindo os tópicos do edital. Este ciclo será repetido até a prova.
Retorne um JSON seguindo o schema fornecido.
Use cores do tailwind (ex: bg-red-500, bg-blue-500, bg-green-500, bg-yellow-500, bg-purple-500, bg-pink-500, bg-indigo-500, bg-orange-500) para as matérias.
A soma das horas de cada dia deve ser no máximo ${newHours}.
Seja realista e distribua bem o conteúdo. Foque nos tópicos principais.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "Dia da semana (ex: Dia 1, Dia 2, ..., Dia 7)" },
                slots: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      subject: { type: Type.STRING, description: "Nome da matéria" },
                      topic: { type: Type.STRING, description: "Tópico específico" },
                      hours: { type: Type.NUMBER, description: "Horas dedicadas" },
                      color: { type: Type.STRING, description: "Cor do Tailwind" }
                    },
                    required: ["subject", "topic", "hours", "color"]
                  }
                }
              },
              required: ["date", "slots"]
            }
          }
        }
      });

      const jsonStr = response.text?.trim() || "[]";
      let parsed = JSON.parse(jsonStr);
      
      if (!Array.isArray(parsed)) {
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.schedule)) {
          parsed = parsed.schedule;
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.slots)) {
          parsed = parsed.slots;
        } else {
          parsed = [];
        }
      }
      
      parsed = parsed as DailyPlan[];
      
      // Expand the 7-day cycle to the full period until the exam
      const targetDate = new Date(newDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffTime = targetDate.getTime() - today.getTime();
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (totalDays > 0 && parsed.length > 0) {
        const fullSchedule: DailyPlan[] = [];
        for (let d = 0; d < totalDays; d++) {
          const dayDate = new Date(today);
          dayDate.setDate(today.getDate() + d);
          const cycleDay = parsed[d % parsed.length];
          
          const year = dayDate.getFullYear();
          const month = String(dayDate.getMonth() + 1).padStart(2, '0');
          const day = String(dayDate.getDate()).padStart(2, '0');
          
          fullSchedule.push({
            date: `${year}-${month}-${day}`,
            slots: Array.isArray(cycleDay.slots) ? cycleDay.slots : []
          });
        }
        parsed = fullSchedule;
      }
      
      // Extract subjects from the generated schedule
      const subjectsMap = new Map<string, string>();
      parsed.forEach(day => {
        if (Array.isArray(day.slots)) {
          day.slots.forEach(slot => {
            if (!subjectsMap.has(slot.subject)) {
              subjectsMap.set(slot.subject, slot.color);
            }
          });
        }
      });
      
      const extractedSubjects = Array.from(subjectsMap.entries()).map(([name, color]) => ({
        name,
        color,
        weight: 1
      }));
      
      setNewSubjects(extractedSubjects);
      setGeneratedSchedule(parsed);
      setStep(3);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar cronograma com IA: " + (e instanceof Error ? e.message : JSON.stringify(e)));
    } finally {
      setIsGenerating(false);
    }
  };

  // --- CALCULATION LOGIC ---
  const displaySchedule = useMemo(() => {
    if (currentPlan && currentPlan.generated_schedule && currentPlan.generated_schedule.length > 0) {
      return currentPlan.generated_schedule.map(day => ({
        ...day,
        date: new Date(day.date + 'T00:00:00')
      }));
    }
    
    if (mode === 'create' && step === 3 && generatedSchedule.length > 0) {
      return generatedSchedule.map(day => ({
        ...day,
        date: new Date(day.date + 'T00:00:00')
      }));
    }

    // Fallback to old logic if no generated schedule
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
           topic: 'Estudo Geral',
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
  }, [currentPlan, mode, step, generatedSchedule]);

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
             <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Cronograma Dinâmico</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">A IA analisa o edital e cria seu plano de estudos.</p>
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
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase text-center">Edital & Conteúdo</h3>
                    
                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cole o Edital ou Tópicos</label>
                       <textarea 
                         value={newSyllabus} 
                         onChange={e => setNewSyllabus(e.target.value)} 
                         placeholder="Ex: Direito Civil: Obrigações, Contratos, Direitos Reais..." 
                         className="w-full h-48 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 resize-none mt-2"
                       />
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button onClick={() => setStep(1)} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs">Voltar</button>
                       <button 
                         onClick={generateWithAI} 
                         disabled={isGenerating}
                         className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                       >
                          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {isGenerating ? 'Analisando Edital...' : 'Gerar com IA'}
                       </button>
                    </div>
                 </div>
              )}

              {step === 3 && (
                 <div className="space-y-6">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase text-center">Prévia do Plano</h3>
                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                       <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {displaySchedule.length} Dias de Estudo até {new Date(newDate).toLocaleDateString()}
                       </p>
                       <p className="text-xs text-slate-400 mt-1">Carga Total: {displaySchedule.length * newHours} Horas</p>
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
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{displaySchedule.length} Dias Restantes</p>
                 </div>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-white/10 z-0"></div>
              
              <div className="space-y-6 z-10 relative pl-0">
                 {displaySchedule.map((day, idx) => (
                    <div key={idx} className="flex gap-6 group">
                       {/* Date Bubble */}
                       <div className="w-12 flex flex-col items-center shrink-0 pt-2 bg-[#F8F9FA] dark:bg-sanfran-rubiBlack z-10">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{day.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${idx === 0 ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg scale-110' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                             {day.date.getDate()}
                          </div>
                       </div>

                       {/* Content Card */}
                       <div className={`flex-1 p-4 rounded-2xl border-2 transition-all ${idx === 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-sanfran-rubiDark/20 border-slate-200 dark:border-white/5 hover:border-slate-300'}`}>
                          <div className="flex flex-col gap-2">
                             {day.slots.map((slot, sIdx) => (
                                <div key={sIdx} className="flex flex-col p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-slate-100 dark:border-white/5">
                                   <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-3">
                                         <div className={`w-2 h-4 rounded-full ${slot.color}`}></div>
                                         <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{slot.subject}</span>
                                      </div>
                                      <span className="text-xs font-black text-slate-400">{slot.hours}h</span>
                                   </div>
                                   <p className="text-xs text-slate-500 dark:text-slate-400 pl-5">{slot.topic}</p>
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
