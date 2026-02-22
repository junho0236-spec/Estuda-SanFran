
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  ArrowRight, 
  BookOpen,
  CalendarCheck,
  BrainCircuit,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { GoogleGenAI } from '@google/genai';
import { DynamicStudyPlan, DailyPlan } from '../types';

interface ReverseStudyPlannerProps {
  userId: string;
}

const ReverseStudyPlanner: React.FC<ReverseStudyPlannerProps> = ({ userId }) => {
  const [mode, setMode] = useState<'list' | 'create' | 'view'>('list');
  const [plans, setPlans] = useState<DynamicStudyPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<DynamicStudyPlan | null>(null);

  // Creation State
  const [step, setStep] = useState(1); // 1: Setup, 2: Syllabus, 3: Review
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newHours, setNewHours] = useState(3);
  const [syllabus, setSyllabus] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<DailyPlan[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [userId]);

  const fetchPlans = async () => {
    // We will use a new table 'dynamic_study_plans'
    const { data, error } = await supabase
      .from('dynamic_study_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (data && !error) {
      setPlans(data);
    } else if (error && error.code === '42P01') {
      // Table doesn't exist yet, ignore or show message
      console.log("Tabela dynamic_study_plans não existe ainda.");
    }
  };

  const handleGenerate = async () => {
    if (!syllabus.trim()) {
      alert("Por favor, insira o edital ou os tópicos a serem estudados.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const prompt = `
        Você é um especialista em planejamento de estudos para concursos e OAB.
        Crie um cronograma de estudos diário otimizado.
        
        Objetivo: ${newTitle}
        Data da Prova: ${newDate}
        Horas diárias disponíveis: ${newHours}h
        Edital / Conteúdo a estudar:
        ${syllabus}
        
        Divida o conteúdo de forma lógica desde hoje até a data da prova.
        Retorne APENAS um JSON válido no seguinte formato:
        [
          {
            "date": "YYYY-MM-DD",
            "topics": ["Tópico 1", "Tópico 2"],
            "notes": "Dica de estudo para o dia"
          }
        ]
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const planData = JSON.parse(response.text || '[]');
      setGeneratedPlan(planData);
      setStep(3);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar cronograma com IA. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const savePlan = async () => {
    try {
      const payload = {
        user_id: userId,
        title: newTitle,
        exam_date: newDate,
        daily_hours: newHours,
        syllabus: syllabus,
        generated_plan: generatedPlan
      };

      const { data, error } = await supabase.from('dynamic_study_plans').insert(payload).select().single();
      if (error) throw error;
      
      if (data) {
        setPlans([data, ...plans]);
        setCurrentPlan(data);
        setMode('view');
        // Reset form
        setStep(1); setNewTitle(''); setNewDate(''); setSyllabus(''); setGeneratedPlan([]);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar cronograma. Verifique se a tabela 'dynamic_study_plans' foi criada.");
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    await supabase.from('dynamic_study_plans').delete().eq('id', id);
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
                <BrainCircuit className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Planejamento com IA</span>
             </div>
             <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Cronograma Dinâmico</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">Cole o edital. A IA monta o plano.</p>
          </div>
          <button 
            onClick={() => { setMode('create'); setStep(1); }}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
          >
             <Plus size={16} /> Novo Cronograma
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {plans.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
                 <Calendar size={64} className="mx-auto mb-4 text-slate-400" />
                 <p className="text-xl font-black uppercase text-slate-500">Nenhum Cronograma</p>
                 <p className="text-xs font-bold text-slate-400 mt-2">Crie seu primeiro plano de estudos inteligente.</p>
              </div>
           )}
           {plans.map(plan => (
              <div key={plan.id} className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-lg hover:shadow-xl transition-all relative group flex flex-col">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight mb-1">{plan.title}</h3>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={10} /> Prova: {new Date(plan.exam_date).toLocaleDateString()}
                       </p>
                    </div>
                    <button onClick={() => handleDeletePlan(plan.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Trash2 size={16} />
                    </button>
                 </div>
                 
                 <div className="space-y-2 mb-6 flex-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                       <span>Carga Diária</span>
                       <span>{plan.daily_hours}h</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                       <span>Dias Planejados</span>
                       <span>{plan.generated_plan?.length || 0}</span>
                    </div>
                 </div>

                 <button 
                   onClick={() => { setCurrentPlan(plan); setMode('view'); }}
                   className="w-full py-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 mt-auto"
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
        <div className="max-w-3xl mx-auto py-10 animate-in slide-in-from-bottom-4 px-4">
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
                       <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: OAB 41, Concurso TJSP" className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-emerald-500" />
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
                       <button onClick={() => { if(newTitle && newDate) setStep(2); else alert('Preencha título e data da prova'); }} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg">Próximo</button>
                    </div>
                 </div>
              )}

              {step === 2 && (
                 <div className="space-y-6">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase text-center">Edital / Conteúdo</h3>
                    <p className="text-sm text-slate-500 text-center mb-4">Cole abaixo os tópicos do edital ou as matérias que você precisa estudar. A IA vai analisar o volume e distribuir até a data da prova.</p>
                    
                    <textarea 
                      value={syllabus} 
                      onChange={e => setSyllabus(e.target.value)} 
                      placeholder="Ex: Direito Civil: 1. LINDB. 2. Pessoas Naturais. 3. Pessoas Jurídicas... Direito Penal: 1. Princípios. 2. Teoria do Crime..." 
                      className="w-full h-64 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-medium text-sm outline-none focus:border-emerald-500 resize-none custom-scrollbar"
                    />

                    <div className="flex gap-4 pt-4">
                       <button onClick={() => setStep(1)} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs" disabled={isGenerating}>Voltar</button>
                       <button 
                         onClick={handleGenerate} 
                         disabled={isGenerating}
                         className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                       >
                          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                          {isGenerating ? 'Analisando...' : 'Gerar Cronograma com IA'}
                       </button>
                    </div>
                 </div>
              )}

              {step === 3 && (
                 <div className="space-y-6">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase text-center">Prévia do Plano</h3>
                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                       <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {generatedPlan.length} Dias de Estudo Planejados
                       </p>
                       <p className="text-xs text-slate-400 mt-1">Até {new Date(newDate).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                      {generatedPlan.slice(0, 5).map((day, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mb-1">{day.date}</div>
                          <ul className="list-disc list-inside text-sm font-medium text-slate-700 dark:text-slate-300">
                            {day.topics.map((t, i) => <li key={i}>{t}</li>)}
                          </ul>
                        </div>
                      ))}
                      {generatedPlan.length > 5 && (
                        <div className="text-center text-xs font-bold text-slate-400 py-2">
                          + {generatedPlan.length - 5} dias gerados...
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button onClick={() => setStep(2)} className="flex-1 py-4 text-slate-500 font-bold uppercase text-xs">Refazer</button>
                       <button onClick={savePlan} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} /> Salvar Plano
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
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{currentPlan.generated_plan.length} Dias Planejados</p>
                 </div>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-white/10 z-0"></div>
              
              <div className="space-y-6 z-10 relative pl-0">
                 {currentPlan.generated_plan.map((day, idx) => {
                    const dateObj = new Date(day.date + 'T00:00:00');
                    return (
                      <div key={idx} className="flex gap-6 group">
                         {/* Date Bubble */}
                         <div className="w-12 flex flex-col items-center shrink-0 pt-2 bg-[#fcfcfc] dark:bg-sanfran-rubiBlack z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              {dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                            </span>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${idx === 0 ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg scale-110' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                               {dateObj.getDate()}
                            </div>
                         </div>

                         {/* Content Card */}
                         <div className={`flex-1 p-5 rounded-2xl border-2 transition-all ${idx === 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-sanfran-rubiDark/20 border-slate-200 dark:border-white/5 hover:border-slate-300'}`}>
                            <div className="flex flex-col gap-3">
                               <div className="space-y-2">
                                  {day.topics.map((topic, tIdx) => (
                                     <div key={tIdx} className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-slate-100 dark:border-white/5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-snug">{topic}</span>
                                     </div>
                                  ))}
                               </div>
                               {day.notes && (
                                 <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
                                   <p className="text-xs font-medium text-amber-800 dark:text-amber-200 italic">
                                     💡 {day.notes}
                                   </p>
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                    );
                 })}
              </div>
           </div>
        </div>
     );
  }

  return null;
};

export default ReverseStudyPlanner;

