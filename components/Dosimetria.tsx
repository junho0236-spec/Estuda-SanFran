import React, { useState, useEffect } from 'react';
import { Calculator, Scale, AlertCircle, ArrowDown, ArrowUp, Info, Check, RotateCcw, Gavel } from 'lucide-react';

const Dosimetria: React.FC = () => {
  // --- STATE DO CRIME E PENA BASE ---
  const [minYears, setMinYears] = useState<number>(0);
  const [minMonths, setMinMonths] = useState<number>(0);
  const [maxYears, setMaxYears] = useState<number>(0);
  const [maxMonths, setMaxMonths] = useState<number>(0);

  // --- FASE 1: CIRCUNSTÂNCIAS JUDICIAIS (ART. 59) ---
  const circumstancesList = [
    "Culpabilidade",
    "Antecedentes",
    "Conduta Social",
    "Personalidade do Agente",
    "Motivos do Crime",
    "Circunstâncias do Crime",
    "Consequências do Crime",
    "Comportamento da Vítima"
  ];
  const [activeCircumstances, setActiveCircumstances] = useState<Record<string, boolean>>({});

  // --- FASE 2: AGRAVANTES E ATENUANTES ---
  const [agravantesCount, setAgravantesCount] = useState<number>(0);
  const [atenuantesCount, setAtenuantesCount] = useState<number>(0);

  // --- FASE 3: CAUSAS DE AUMENTO E DIMINUIÇÃO ---
  const [increaseFraction, setIncreaseFraction] = useState<string>("0");
  const [decreaseFraction, setDecreaseFraction] = useState<string>("0");

  // --- RESULTADOS CALCULADOS ---
  const [penaBaseMonths, setPenaBaseMonths] = useState<number>(0);
  const [penaIntermediariaMonths, setPenaIntermediariaMonths] = useState<number>(0);
  const [penaFinalMonths, setPenaFinalMonths] = useState<number>(0);

  // Helper para converter meses em texto legível
  const formatSentence = (totalMonths: number) => {
    const years = Math.floor(totalMonths / 12);
    const months = Math.round(totalMonths % 12);
    const days = Math.round((totalMonths - Math.floor(totalMonths)) * 30); // Aproximação para dias se houver fração

    let text = "";
    if (years > 0) text += `${years} ano${years !== 1 ? 's' : ''}`;
    if (months > 0) text += `${text ? ' e ' : ''}${months} m${months !== 1 ? 'eses' : 'ês'}`;
    if (days > 0 && years === 0 && months === 0) text += `${days} dia${days !== 1 ? 's' : ''}`;
    
    return text || "0 meses";
  };

  // --- LÓGICA DE CÁLCULO ---
  useEffect(() => {
    // 0. Setup Inicial
    const minTotal = (minYears * 12) + minMonths;
    const maxTotal = (maxYears * 12) + maxMonths;
    
    if (maxTotal <= minTotal) {
      setPenaBaseMonths(0);
      setPenaIntermediariaMonths(0);
      setPenaFinalMonths(0);
      return;
    }

    // 1. FASE 1: Pena Base
    // Critério Ideal: 1/8 do intervalo entre min e max por circunstância negativa
    const interval = maxTotal - minTotal;
    const fractionPerCircumstance = interval / 8;
    const numNegative = Object.values(activeCircumstances).filter(Boolean).length;
    const increasePhase1 = numNegative * fractionPerCircumstance;
    
    let base = minTotal + increasePhase1;
    // Trava: Pena Base não pode passar do máximo (Súmula 231 entende-se para fase 2, mas doutrina majoritária aplica teto na fase 1 também)
    if (base > maxTotal) base = maxTotal; 
    
    setPenaBaseMonths(base);

    // 2. FASE 2: Pena Intermediária
    // Critério: 1/6 da PENA BASE para cada agravante/atenuante
    // Compensação: Agravantes - Atenuantes
    const netAgravantes = agravantesCount - atenuantesCount;
    const fractionPhase2 = base / 6;
    let intermediate = base + (netAgravantes * fractionPhase2);

    // Trava Súmula 231 STJ: A pena intermediária não pode ficar abaixo do mínimo legal, nem acima do máximo.
    if (intermediate < minTotal) intermediate = minTotal;
    if (intermediate > maxTotal) intermediate = maxTotal;

    setPenaIntermediariaMonths(intermediate);

    // 3. FASE 3: Pena Definitiva
    // Aplicação de frações sobre a pena intermediária
    // Ordem: Aumento depois Diminuição (ou sucessiva, tanto faz matematicamente se for sobre a base anterior)
    // Código Penal Art. 68 parágrafo único: No concurso de causas de aumento ou de diminuição previstas na parte especial, pode o juiz limitar-se a um só aumento ou a uma só diminuição, prevalecendo, todavia, a causa que mais aumente ou diminua.
    // Aqui faremos o cálculo sequencial simples.

    let final = intermediate;

    // Aplica Aumento
    if (increaseFraction !== "0") {
      const [num, den] = increaseFraction.split('/').map(Number);
      final = final + (final * (num / den));
    }

    // Aplica Diminuição
    if (decreaseFraction !== "0") {
      const [num, den] = decreaseFraction.split('/').map(Number);
      final = final - (final * (num / den));
    }

    setPenaFinalMonths(final);

  }, [minYears, minMonths, maxYears, maxMonths, activeCircumstances, agravantesCount, atenuantesCount, increaseFraction, decreaseFraction]);

  const toggleCircumstance = (key: string) => {
    setActiveCircumstances(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetAll = () => {
    setMinYears(0); setMinMonths(0);
    setMaxYears(0); setMaxMonths(0);
    setActiveCircumstances({});
    setAgravantesCount(0); setAtenuantesCount(0);
    setIncreaseFraction("0"); setDecreaseFraction("0");
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/20 mb-4">
              <Calculator className="w-4 h-4 text-sanfran-rubi" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Ferramenta Penal</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Dosimetria Trifásica</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Cálculo da pena conforme o Art. 68 do Código Penal.</p>
        </div>
        <button 
          onClick={resetAll}
          className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
        >
          <RotateCcw className="w-4 h-4" /> Reiniciar
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: PARÂMETROS */}
        <div className="lg:col-span-7 space-y-8">
           
           {/* 0. Preceito Secundário */}
           <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                 <Scale className="text-slate-400" />
                 <h3 className="font-black uppercase text-slate-900 dark:text-white text-sm tracking-wide">Pena em Abstrato</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mínimo Legal</p>
                    <div className="flex gap-2">
                       <input type="number" min="0" value={minYears} onChange={e => setMinYears(Number(e.target.value))} placeholder="Anos" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-black text-center outline-none focus:border-sanfran-rubi" />
                       <input type="number" min="0" value={minMonths} onChange={e => setMinMonths(Number(e.target.value))} placeholder="Meses" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-black text-center outline-none focus:border-sanfran-rubi" />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Máximo Legal</p>
                    <div className="flex gap-2">
                       <input type="number" min="0" value={maxYears} onChange={e => setMaxYears(Number(e.target.value))} placeholder="Anos" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-black text-center outline-none focus:border-sanfran-rubi" />
                       <input type="number" min="0" value={maxMonths} onChange={e => setMaxMonths(Number(e.target.value))} placeholder="Meses" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-black text-center outline-none focus:border-sanfran-rubi" />
                    </div>
                 </div>
              </div>
           </div>

           {/* 1. Primeira Fase */}
           <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="font-black uppercase text-slate-900 dark:text-white text-sm tracking-wide">1ª Fase: Circunstâncias Judiciais</h3>
                 <span className="text-[9px] font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">Art. 59 CP</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {circumstancesList.map(item => (
                    <button 
                      key={item}
                      onClick={() => toggleCircumstance(item)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${activeCircumstances[item] ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300' : 'bg-slate-50 dark:bg-black/20 border-transparent hover:border-slate-200 text-slate-600 dark:text-slate-400'}`}
                    >
                       <span className="text-[10px] font-black uppercase tracking-wide text-left">{item}</span>
                       {activeCircumstances[item] && <AlertCircle size={14} />}
                    </button>
                 ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-4 text-center">Cada circunstância negativa aumenta a pena em 1/8 do intervalo entre a pena mínima e máxima.</p>
           </div>

           {/* 2. Segunda Fase */}
           <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="font-black uppercase text-slate-900 dark:text-white text-sm tracking-wide">2ª Fase: Legais</h3>
                 <span className="text-[9px] font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-500">Arts. 61, 62, 65, 66 CP</span>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-red-500 tracking-widest">Agravantes (+1/6)</p>
                    <div className="flex items-center gap-3">
                       <button onClick={() => setAgravantesCount(Math.max(0, agravantesCount - 1))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black">-</button>
                       <span className="text-2xl font-black text-slate-900 dark:text-white w-8 text-center">{agravantesCount}</span>
                       <button onClick={() => setAgravantesCount(agravantesCount + 1)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black">+</button>
                    </div>
                    <p className="text-[9px] text-slate-400">Ex: Reincidência, Motivo Fútil.</p>
                 </div>
                 <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Atenuantes (-1/6)</p>
                    <div className="flex items-center gap-3">
                       <button onClick={() => setAtenuantesCount(Math.max(0, atenuantesCount - 1))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black">-</button>
                       <span className="text-2xl font-black text-slate-900 dark:text-white w-8 text-center">{atenuantesCount}</span>
                       <button onClick={() => setAtenuantesCount(atenuantesCount + 1)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black">+</button>
                    </div>
                    <p className="text-[9px] text-slate-400">Ex: Menoridade, Confissão.</p>
                 </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl flex gap-2">
                 <Info size={14} className="text-yellow-600 shrink-0 mt-0.5" />
                 <p className="text-[9px] text-yellow-700 dark:text-yellow-500 font-bold">A Súmula 231 do STJ impede que a pena provisória fique abaixo do mínimo legal nesta fase.</p>
              </div>
           </div>

           {/* 3. Terceira Fase */}
           <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="font-black uppercase text-slate-900 dark:text-white text-sm tracking-wide">3ª Fase: Causas de Aumento/Diminuição</h3>
              </div>

              <div className="space-y-6">
                 <div>
                    <p className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-2 flex items-center gap-1"><ArrowUp size={12}/> Majorantes</p>
                    <div className="flex gap-2 flex-wrap">
                       {["0", "1/6", "1/3", "1/2", "2/3"].map(frac => (
                          <button 
                            key={`inc-${frac}`} 
                            onClick={() => setIncreaseFraction(frac)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${increaseFraction === frac ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}
                          >
                             {frac === "0" ? 'Nenhuma' : frac}
                          </button>
                       ))}
                    </div>
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-2 flex items-center gap-1"><ArrowDown size={12}/> Minorantes</p>
                    <div className="flex gap-2 flex-wrap">
                       {["0", "1/6", "1/3", "1/2", "2/3"].map(frac => (
                          <button 
                            key={`dec-${frac}`} 
                            onClick={() => setDecreaseFraction(frac)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${decreaseFraction === frac ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}
                          >
                             {frac === "0" ? 'Nenhuma' : frac}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

        </div>

        {/* COLUNA DIREITA: RÉGUA DE CÁLCULO (STICKY) */}
        <div className="lg:col-span-5">
           <div className="sticky top-6 space-y-4">
              
              {/* Pena Base */}
              <div className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-3xl border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-bl-[3rem] -mr-4 -mt-4"></div>
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Pena Base</p>
                 <p className="text-2xl font-black text-slate-800 dark:text-slate-200">{formatSentence(penaBaseMonths)}</p>
              </div>

              {/* Pena Intermediária */}
              <div className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-3xl border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-bl-[3rem] -mr-4 -mt-4"></div>
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Pena Intermediária</p>
                 <p className="text-2xl font-black text-slate-800 dark:text-slate-200">{formatSentence(penaIntermediariaMonths)}</p>
                 {penaIntermediariaMonths === ((minYears*12)+minMonths) && agravantesCount > atenuantesCount && (
                    <span className="text-[8px] font-bold text-red-500 uppercase mt-1 block">Limitada ao mínimo (Súmula 231)</span>
                 )}
              </div>

              {/* Pena Definitiva */}
              <div className="bg-slate-900 dark:bg-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden text-center">
                 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sanfran-rubi to-red-600"></div>
                 <Gavel size={60} className="text-white/10 dark:text-black/10 absolute bottom-4 right-4" />
                 
                 <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Pena Definitiva</p>
                 <h3 className="text-4xl font-black text-white dark:text-sanfran-rubiBlack leading-tight">
                    {formatSentence(penaFinalMonths)}
                 </h3>
                 <div className="mt-6 pt-4 border-t border-white/10 dark:border-black/10 flex justify-center gap-4 text-white/50 dark:text-black/50">
                    <div className="text-center">
                       <span className="block text-[8px] font-black uppercase">Regime</span>
                       <span className="text-xs font-bold text-white dark:text-black">
                          {penaFinalMonths/12 > 8 ? 'Fechado' : penaFinalMonths/12 > 4 ? 'Semiaberto' : 'Aberto'}*
                       </span>
                    </div>
                 </div>
                 <p className="text-[7px] text-slate-500 mt-2">*Sugestão baseada apenas no quantum (Art. 33, §2º CP), desconsiderando reincidência.</p>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default Dosimetria;