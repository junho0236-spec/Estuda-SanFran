
import React, { useState, useEffect } from 'react';
import { ClipboardCheck, FileText, CheckCircle2, Circle, Trophy, RefreshCw, Bookmark, FolderOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabaseClient';

interface ChecklistProps {
  userId: string;
}

interface Template {
  id: string;
  title: string;
  category: 'Cível' | 'Penal' | 'Trabalhista';
  items: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'pi_civel',
    title: 'Petição Inicial (Art. 319 CPC)',
    category: 'Cível',
    items: [
      'Endereçamento ao Juízo Competente',
      'Qualificação das Partes (Autor e Réu)',
      'Fatos e Fundamentos Jurídicos',
      'Pedidos (com especificações)',
      'Valor da Causa',
      'Provas a Produzir',
      'Opção pela Audiência de Conciliação',
      'Local, Data e Assinatura'
    ]
  },
  {
    id: 'apelacao',
    title: 'Apelação (Art. 1.010 CPC)',
    category: 'Cível',
    items: [
      'Folha de Rosto: Endereçamento ao Juízo a quo',
      'Qualificação (Apelante e Apelado)',
      'Juízo de Admissibilidade (Tempestividade e Preparo)',
      'Folha de Razões: Endereçamento ao Tribunal (ad quem)',
      'Resumo dos Fatos',
      'Preliminares Recursais',
      'Mérito (Razões para Reforma ou Nulidade)',
      'Pedido de Nova Decisão',
      'Local, Data e Assinatura'
    ]
  },
  {
    id: 'agravo',
    title: 'Agravo de Instrumento',
    category: 'Cível',
    items: [
      'Endereçamento Direto ao Tribunal',
      'Qualificação com nomes dos Advogados',
      'Exposição do Fato e Direito',
      'Razões do Pedido de Reforma',
      'Peças Obrigatórias (Cópia da Decisão, Certidão Intimação)',
      'Preparo',
      'Pedido Liminar / Efeito Suspensivo (se houver)',
      'Pedido Final'
    ]
  },
  {
    id: 'resp_acusacao',
    title: 'Resposta à Acusação (CPP)',
    category: 'Penal',
    items: [
      'Endereçamento ao Juiz da Causa',
      'Qualificação do Acusado',
      'Fundamentação: Art. 396 e 396-A CPP',
      'Preliminares (Nulidades)',
      'Mérito (Excludentes, Atipicidade)',
      'Pedidos: Absolvição Sumária (Art. 397)',
      'Rol de Testemunhas',
      'Local, Data e Assinatura'
    ]
  },
  {
    id: 'memoriais',
    title: 'Memoriais (Alegações Finais)',
    category: 'Penal',
    items: [
      'Endereçamento',
      'Relatório Breve',
      'Preliminares',
      'Mérito Principal (Absolvição Art. 386)',
      'Teses Subsidiárias (Dosimetria, Regime)',
      'Pedidos (Principal e Subsidiários)',
      'Local, Data e Assinatura'
    ]
  },
  {
    id: 'reclamat',
    title: 'Reclamação Trabalhista (Art. 840 CLT)',
    category: 'Trabalhista',
    items: [
      'Endereçamento ao Juízo do Trabalho',
      'Qualificação (Reclamante e Reclamada)',
      'Breve exposição dos fatos (Simplicidade)',
      'Pedidos Líquidos e Certos (com valores)',
      'Requerimento de Gratuidade (se couber)',
      'Honorários Sucumbenciais',
      'Valor da Causa',
      'Local, Data e Assinatura'
    ]
  },
  {
    id: 'ro_trab',
    title: 'Recurso Ordinário (Art. 895 CLT)',
    category: 'Trabalhista',
    items: [
      'Peça de Interposição ao Juízo a quo',
      'Juízo de Admissibilidade (Preparo: Custas + Depósito)',
      'Razões ao TRT',
      'Preliminares',
      'Mérito Recursal',
      'Pedido de Reforma',
      'Local, Data e Assinatura'
    ]
  }
];

const Checklist: React.FC<ChecklistProps> = ({ userId }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATES[0].id);
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

  useEffect(() => {
    loadProgress(selectedTemplateId);
  }, [selectedTemplateId]);

  const loadProgress = async (templateId: string) => {
    setLoading(true);
    setCheckedIndices(new Set());
    setCompleted(false);

    try {
      const { data } = await supabase
        .from('checklist_states')
        .select('checked_indices, completed')
        .match({ user_id: userId, template_id: templateId })
        .single();

      if (data) {
        setCheckedIndices(new Set(data.checked_indices || []));
        setCompleted(data.completed || false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (indices: number[], isComplete: boolean) => {
    try {
      await supabase
        .from('checklist_states')
        .upsert({
          user_id: userId,
          template_id: selectedTemplateId,
          checked_indices: indices,
          completed: isComplete,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, template_id' });
    } catch (e) {
      console.error("Erro ao salvar progresso:", e);
    }
  };

  const toggleCheck = (index: number) => {
    const newSet = new Set(checkedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    
    setCheckedIndices(newSet);
    
    const isComplete = newSet.size === activeTemplate.items.length;
    setCompleted(isComplete);
    
    if (isComplete && !completed) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }

    saveProgress(Array.from(newSet) as number[], isComplete);
  };

  const resetChecklist = () => {
    if(confirm("Reiniciar checklist?")) {
      setCheckedIndices(new Set());
      setCompleted(false);
      saveProgress([], false);
    }
  };

  const progressPercentage = Math.round((checkedIndices.size / activeTemplate.items.length) * 100);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/20 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
              <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Validador Processual</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Checklist de Peças</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Estruture sua peça sem esquecer nenhum requisito formal.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0">
        
        {/* SIDEBAR SELECTION */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] p-6 border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl overflow-hidden h-fit">
           <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2">
              <FolderOpen size={16} /> Selecione o Modelo
           </h3>
           <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {['Cível', 'Penal', 'Trabalhista'].map(cat => (
                 <div key={cat} className="mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-2">{cat}</p>
                    {TEMPLATES.filter(t => t.category === cat).map(template => (
                       <button
                         key={template.id}
                         onClick={() => setSelectedTemplateId(template.id)}
                         className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all mb-2 flex items-center justify-between ${selectedTemplateId === template.id ? 'bg-sanfran-rubi text-white shadow-lg' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100'}`}
                       >
                          {template.title}
                          {selectedTemplateId === template.id && <Bookmark size={12} fill="currentColor" />}
                       </button>
                    ))}
                 </div>
              ))}
           </div>
        </div>

        {/* MAIN CHECKLIST AREA */}
        <div className="lg:col-span-8 flex flex-col h-full">
           <div className={`flex-1 bg-white dark:bg-[#fffdf5] dark:text-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-t-[12px] relative overflow-hidden transition-all ${completed ? 'border-emerald-500' : 'border-blue-500'}`}>
              
              {/* Paper Texture */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
              
              <div className="flex justify-between items-start mb-8 border-b-2 border-slate-100 pb-6 relative z-10">
                 <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">{activeTemplate.category}</span>
                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-800">{activeTemplate.title}</h3>
                 </div>
                 <div className="text-right">
                    <div className="text-3xl font-black tabular-nums text-slate-800">{progressPercentage}%</div>
                    <button onClick={resetChecklist} className="text-slate-400 hover:text-red-500 transition-colors p-1"><RefreshCw size={16} /></button>
                 </div>
              </div>

              <div className="space-y-4 relative z-10">
                 {activeTemplate.items.map((item, idx) => {
                    const isChecked = checkedIndices.has(idx);
                    return (
                       <button 
                         key={idx}
                         onClick={() => toggleCheck(idx)}
                         className="w-full flex items-center gap-4 group text-left"
                       >
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent group-hover:border-blue-400'}`}>
                             <CheckCircle2 size={18} />
                          </div>
                          <span className={`text-lg font-serif font-medium transition-all ${isChecked ? 'text-slate-400 line-through decoration-slate-300 decoration-2' : 'text-slate-700'}`}>
                             {item}
                          </span>
                       </button>
                    )
                 })}
              </div>

              {completed && (
                 <div className="mt-12 p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex items-center gap-4 animate-in slide-in-from-bottom-4">
                    <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                       <Trophy size={24} />
                    </div>
                    <div>
                       <h4 className="font-black text-emerald-800 uppercase text-sm">Peça Estruturada!</h4>
                       <p className="text-xs text-emerald-700 font-medium">Você preencheu todos os requisitos formais. Agora foque no direito material.</p>
                    </div>
                 </div>
              )}

              {/* Binder Rings Simulation */}
              <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col gap-12 opacity-20 pointer-events-none">
                 {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-4 h-4 rounded-full bg-black shadow-inner border-2 border-slate-600"></div>
                 ))}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Checklist;
