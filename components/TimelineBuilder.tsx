
import React, { useState, useRef } from 'react';
import { GitCommit, Move, RotateCcw, Check, Trash2, GripVertical, Info, RefreshCw, Trophy, FileText, ArrowRight, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProceduralStep {
  id: string;
  label: string;
  description: string;
}

interface Rito {
  id: string;
  name: string;
  steps: ProceduralStep[];
}

const RITOS: Record<string, Rito> = {
  'cpc_comum': {
    id: 'cpc_comum',
    name: 'Procedimento Comum Cível (CPC/15)',
    steps: [
      { id: '1', label: 'Petição Inicial', description: 'Art. 319. O processo começa por iniciativa da parte.' },
      { id: '2', label: 'Juízo de Admissibilidade', description: 'O juiz verifica os requisitos. Pode mandar emendar.' },
      { id: '3', label: 'Citação', description: 'O réu é chamado para integrar a relação processual.' },
      { id: '4', label: 'Audiência de Conciliação', description: 'Art. 334. Tentativa obrigatória de acordo.' },
      { id: '5', label: 'Contestação', description: 'Prazo de 15 dias úteis para o réu se defender.' },
      { id: '6', label: 'Réplica', description: 'Autor se manifesta sobre a contestação.' },
      { id: '7', label: 'Saneamento', description: 'Juiz fixa os pontos controvertidos e defere provas.' },
      { id: '8', label: 'Audiência de Instrução', description: 'Oitiva de partes e testemunhas.' },
      { id: '9', label: 'Sentença', description: 'Art. 487. Juiz decide o mérito da causa.' }
    ]
  },
  'cpp_comum': {
    id: 'cpp_comum',
    name: 'Procedimento Comum Ordinário (CPP)',
    steps: [
      { id: '10', label: 'Oferecimento da Denúncia', description: 'MP oferece a peça acusatória.' },
      { id: '11', label: 'Recebimento da Denúncia', description: 'Juiz aceita a acusação.' },
      { id: '12', label: 'Citação do Acusado', description: 'Réu é notificado para responder.' },
      { id: '13', label: 'Resposta à Acusação', description: 'Defesa preliminar em 10 dias.' },
      { id: '14', label: 'Absolvição Sumária?', description: 'Juiz analisa se absolve logo de cara (Art. 397).' },
      { id: '15', label: 'Audiência de Instrução', description: 'Oitiva de vítima, testemunhas e interrogatório.' },
      { id: '16', label: 'Alegações Finais', description: 'Debates orais ou memoriais escritos.' },
      { id: '17', label: 'Sentença', description: 'Condenação ou Absolvição.' }
    ]
  }
};

const TimelineBuilder: React.FC = () => {
  const [selectedRitoId, setSelectedRitoId] = useState('cpc_comum');
  const [timeline, setTimeline] = useState<ProceduralStep[]>([]);
  const [palette, setPalette] = useState<ProceduralStep[]>(RITOS['cpc_comum'].steps);
  const [draggedItem, setDraggedItem] = useState<{ item: ProceduralStep, source: 'palette' | 'timeline' } | null>(null);
  const [validationResult, setValidationResult] = useState<'success' | 'error' | null>(null);
  const [mode, setMode] = useState<'study' | 'challenge'>('study');

  const containerRef = useRef<HTMLDivElement>(null);

  const currentRito = RITOS[selectedRitoId];

  // Resetar ao mudar de rito
  const changeRito = (id: string) => {
    setSelectedRitoId(id);
    setTimeline([]);
    setPalette(RITOS[id].steps);
    setValidationResult(null);
  };

  // --- Lógica Drag and Drop Nativa ---

  const handleDragStart = (e: React.DragEvent, item: ProceduralStep, source: 'palette' | 'timeline') => {
    setDraggedItem({ item, source });
    e.dataTransfer.effectAllowed = 'move';
    // Imagem fantasma simples
    const ghost = document.createElement('div');
    ghost.textContent = item.label;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.background = '#9B111E';
    ghost.style.color = 'white';
    ghost.style.padding = '10px';
    ghost.style.borderRadius = '8px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDropOnTimeline = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.source === 'palette') {
      // Adicionar à timeline
      if (!timeline.find(i => i.id === draggedItem.item.id)) {
        setTimeline(prev => [...prev, draggedItem.item]);
        // No modo desafio, removemos da paleta para dificultar? Não, melhor deixar visual
      }
    } else {
      // Reordenar (já está na timeline) - Lógica simplificada: joga pro final se soltar na área geral
      // A reordenação precisa acontece no onDropOnItem
    }
    setDraggedItem(null);
  };

  const handleDropOnItem = (e: React.DragEvent, targetId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!draggedItem) return;

    const newTimeline = [...timeline];
    
    // Se veio da paleta, insere na posição
    if (draggedItem.source === 'palette') {
        if (timeline.find(i => i.id === draggedItem.item.id)) return; // Já existe
        const targetIndex = timeline.findIndex(i => i.id === targetId);
        newTimeline.splice(targetIndex, 0, draggedItem.item);
        setTimeline(newTimeline);
    } else {
        // Reordenar
        const oldIndex = timeline.findIndex(i => i.id === draggedItem.item.id);
        const targetIndex = timeline.findIndex(i => i.id === targetId);
        
        newTimeline.splice(oldIndex, 1);
        newTimeline.splice(targetIndex, 0, draggedItem.item);
        setTimeline(newTimeline);
    }
    setDraggedItem(null);
  };

  const removeFromTimeline = (id: string) => {
    setTimeline(prev => prev.filter(i => i.id !== id));
    setValidationResult(null);
  };

  const validateOrder = () => {
    const correctOrder = currentRito.steps.map(s => s.id);
    const userOrder = timeline.map(s => s.id);

    // Verifica se tem todos os passos e na ordem certa
    const isLengthCorrect = userOrder.length === correctOrder.length;
    const isOrderCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);

    if (isLengthCorrect && isOrderCorrect) {
      setValidationResult('success');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      setValidationResult('error');
    }
  };

  const clearTimeline = () => {
    setTimeline([]);
    setValidationResult(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-[calc(100vh-120px)] flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 flex-shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-pink-100 dark:bg-pink-900/20 px-4 py-2 rounded-full border border-pink-200 dark:border-pink-800 mb-4">
              <GitCommit className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400">Fluxograma Processual</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Linha do Tempo</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Domine o rito processual montando as peças.</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
           <select 
             value={selectedRitoId} 
             onChange={(e) => changeRito(e.target.value)}
             className="p-3 bg-white dark:bg-white/10 border-2 border-slate-200 dark:border-white/20 rounded-xl font-bold text-sm outline-none focus:border-sanfran-rubi"
           >
             {Object.values(RITOS).map(rito => (
               <option key={rito.id} value={rito.id}>{rito.name}</option>
             ))}
           </select>
           
           <div className="flex bg-slate-100 dark:bg-white/10 p-1 rounded-xl">
              <button 
                onClick={() => setMode('study')} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'study' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
              >
                Estudo Livre
              </button>
              <button 
                onClick={() => setMode('challenge')} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'challenge' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
              >
                Desafio
              </button>
           </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-8">
        
        {/* PALETA DE ITENS (SIDEBAR) */}
        <div className="lg:w-80 bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex flex-col overflow-hidden shrink-0">
           <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm flex items-center gap-2">
                 <Move size={16} className="text-slate-400" /> Peças Processuais
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Arraste para a linha do tempo</p>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {palette.map(item => {
                const isUsed = timeline.some(t => t.id === item.id);
                return (
                  <div 
                    key={item.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, item, 'palette')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing group ${isUsed ? 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 opacity-50' : 'bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 hover:border-sanfran-rubi hover:shadow-md'}`}
                  >
                     <div className="flex items-center justify-between">
                        <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 group-hover:text-sanfran-rubi transition-colors">{item.label}</span>
                        <GripVertical size={14} className="text-slate-300" />
                     </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* ÁREA DA LINHA DO TEMPO (CANVAS) */}
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-[#0d0303] rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-sanfran-rubi/20 relative overflow-hidden">
           
           {/* Controles do Canvas */}
           <div className="absolute top-6 right-6 flex gap-2 z-20">
              <button 
                onClick={clearTimeline} 
                className="p-3 bg-white dark:bg-white/10 rounded-xl shadow-lg hover:text-red-500 transition-colors"
                title="Limpar Timeline"
              >
                 <RotateCcw size={18} />
              </button>
              {mode === 'challenge' && (
                <button 
                  onClick={validateOrder} 
                  className="px-6 py-3 bg-sanfran-rubi text-white rounded-xl shadow-lg font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                >
                   <Check size={16} /> Validar
                </button>
              )}
           </div>

           {/* Feedback de Validação */}
           {validationResult && (
             <div className={`absolute top-6 left-6 right-auto md:left-1/2 md:-translate-x-1/2 z-30 px-6 py-3 rounded-2xl shadow-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 animate-in slide-in-from-top-4 ${validationResult === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                {validationResult === 'success' ? <Trophy size={18} /> : <AlertCircle size={18} />}
                {validationResult === 'success' ? 'Ordem Processual Correta!' : 'Inconsistência Detectada. Revise.'}
             </div>
           )}

           {/* A Linha do Tempo */}
           <div 
             className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar relative"
             onDragOver={(e) => e.preventDefault()}
             onDrop={handleDropOnTimeline}
           >
              {timeline.length === 0 && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none">
                    <FileText size={64} className="text-slate-400 mb-4" />
                    <p className="text-xl font-black uppercase text-slate-400 text-center">Arraste as peças aqui<br/>para iniciar o processo</p>
                 </div>
              )}

              <div className="flex flex-col items-center space-y-2 pb-20">
                 {timeline.map((step, index) => (
                    <React.Fragment key={step.id}>
                       {/* Conector */}
                       {index > 0 && (
                          <div className="h-8 w-0.5 bg-slate-300 dark:bg-white/10 my-1 relative">
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20">
                                <ArrowRight size={12} className="rotate-90" />
                             </div>
                          </div>
                       )}

                       {/* Bloco Processual */}
                       <div 
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, step, 'timeline')}
                          onDragOver={(e) => e.preventDefault()} // Necessário para permitir drop
                          onDrop={(e) => handleDropOnItem(e, step.id)}
                          className="w-full max-w-lg bg-white dark:bg-sanfran-rubiDark/40 p-5 rounded-2xl border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-lg relative group cursor-grab active:cursor-grabbing hover:border-sanfran-rubi dark:hover:border-sanfran-rubi transition-colors"
                       >
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-black text-slate-500 border border-slate-200 dark:border-white/5">
                                   {index + 1}
                                </div>
                                <div>
                                   <h4 className="font-black text-sm uppercase text-slate-900 dark:text-white tracking-tight">{step.label}</h4>
                                   <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">{step.description}</p>
                                </div>
                             </div>
                             
                             <button 
                                onClick={() => removeFromTimeline(step.id)}
                                className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                       </div>
                    </React.Fragment>
                 ))}
                 
                 {/* Dropzone Final Visual */}
                 {timeline.length > 0 && (
                    <div className="h-20 w-full max-w-lg border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center mt-4 opacity-50">
                       <span className="text-[10px] font-bold uppercase text-slate-400">Fim da Fase</span>
                    </div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default TimelineBuilder;
