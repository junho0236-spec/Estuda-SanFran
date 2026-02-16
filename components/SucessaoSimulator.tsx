
import React, { useState, useEffect } from 'react';
import { Calculator, Users, Coins, Heart, User, ArrowDown, Share2, Info, RefreshCw } from 'lucide-react';

interface Heir {
  id: string;
  type: 'spouse' | 'child' | 'parent';
  name: string;
  amount: number;
  percentage: number;
}

const REGIMES = [
  { id: 'comunhao_parcial', label: 'Comunhão Parcial' },
  { id: 'comunhao_universal', label: 'Comunhão Universal' },
  { id: 'separacao_total', label: 'Separação Total' },
  // { id: 'separacao_obrigatoria', label: 'Separação Obrigatória' } // Simplificando para MVP
];

const SucessaoSimulator: React.FC = () => {
  // Inputs
  const [commonPatrimony, setCommonPatrimony] = useState<number>(1000000);
  const [particularPatrimony, setParticularPatrimony] = useState<number>(0);
  const [regime, setRegime] = useState<string>('comunhao_parcial');
  
  // Family Structure
  const [hasSpouse, setHasSpouse] = useState<boolean>(true);
  const [childrenCount, setChildrenCount] = useState<number>(2);
  const [parentsCount, setParentsCount] = useState<number>(0); // 0, 1 or 2

  // Results
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [meacao, setMeacao] = useState<number>(0);
  const [heranca, setHeranca] = useState<number>(0);

  useEffect(() => {
    calculateSuccession();
  }, [commonPatrimony, particularPatrimony, regime, hasSpouse, childrenCount, parentsCount]);

  const calculateSuccession = () => {
    let currentMeacao = 0;
    let currentHeranca = 0;
    let calculatedHeirs: Heir[] = [];

    const totalAssets = commonPatrimony + particularPatrimony;

    // 1. Calcular Meação (Direito de Sócio do Casamento)
    if (hasSpouse) {
      if (regime === 'comunhao_parcial') {
        currentMeacao = commonPatrimony / 2;
      } else if (regime === 'comunhao_universal') {
        currentMeacao = totalAssets / 2;
      } else if (regime === 'separacao_total') {
        currentMeacao = 0;
      }
    }

    // 2. Definir Monte Mor (Herança Líquida)
    currentHeranca = totalAssets - currentMeacao;

    setMeacao(currentMeacao);
    setHeranca(currentHeranca);

    // 3. Ordem de Vocação Hereditária (Art. 1.829 CC)
    
    // CASO 1: DESCENDENTES (Filhos)
    if (childrenCount > 0) {
      // Concorrência do Cônjuge com Descendentes
      let spouseInheritance = 0;
      let spouseCompetes = false;

      if (hasSpouse) {
        if (regime === 'comunhao_parcial') {
          // Concorre apenas nos bens particulares
          if (particularPatrimony > 0) spouseCompetes = true;
        } else if (regime === 'separacao_total') {
          spouseCompetes = true; // Súmula 377 STF / Interpretação atual STJ
        } else if (regime === 'comunhao_universal') {
          spouseCompetes = false; // Já é meeiro de tudo
        }
      }

      if (spouseCompetes) {
        // Cálculo da cota do cônjuge na herança
        // Simplificação: Divisão por cabeça (cônjuge + filhos)
        // Nota: Art. 1.832 reserva 1/4 se cônjuge for ascendente dos herdeiros. 
        // Vamos assumir divisão igualitária para este MVP ou aplicar nos bens particulares.
        
        // No regime parcial, a concorrência é SÓ sobre bens particulares.
        const parts = childrenCount + 1;
        
        if (regime === 'comunhao_parcial') {
           // Herança Comum (50% do comum) vai só pros filhos
           const herancaComum = commonPatrimony / 2;
           // Herança Particular vai pra todos (filhos + conjuge)
           const shareParticular = particularPatrimony / parts;
           
           spouseInheritance = shareParticular;
           const childShare = (herancaComum / childrenCount) + shareParticular;
           
           for(let i=0; i<childrenCount; i++) {
             calculatedHeirs.push({ id: `child-${i}`, type: 'child', name: `Filho ${i+1}`, amount: childShare, percentage: 0 });
           }
        } else {
           // Separação Total: Herança total dividida por cabeça
           const share = currentHeranca / parts;
           spouseInheritance = share;
           for(let i=0; i<childrenCount; i++) {
             calculatedHeirs.push({ id: `child-${i}`, type: 'child', name: `Filho ${i+1}`, amount: share, percentage: 0 });
           }
        }
      } else {
        // Cônjuge não concorre (só filhos herdam)
        const share = currentHeranca / childrenCount;
        for(let i=0; i<childrenCount; i++) {
           calculatedHeirs.push({ id: `child-${i}`, type: 'child', name: `Filho ${i+1}`, amount: share, percentage: 0 });
        }
      }

      if (hasSpouse) {
        calculatedHeirs.push({ id: 'spouse', type: 'spouse', name: 'Cônjuge', amount: currentMeacao + spouseInheritance, percentage: 0 });
      }

    } 
    // CASO 2: ASCENDENTES (Pais) - Sem filhos
    else if (parentsCount > 0) {
      let spouseShare = 0;
      
      if (hasSpouse) {
        // Art. 1.837: Concorrendo com ascendentes em primeiro grau (pais), cônjuge leva 1/3 da herança.
        // Se houver só um ascendente (pai ou mãe), cônjuge leva 1/2.
        
        if (parentsCount === 2) {
           spouseShare = currentHeranca / 3;
           const parentShare = (currentHeranca * (2/3)) / 2;
           calculatedHeirs.push({ id: 'p1', type: 'parent', name: 'Pai', amount: parentShare, percentage: 0 });
           calculatedHeirs.push({ id: 'p2', type: 'parent', name: 'Mãe', amount: parentShare, percentage: 0 });
        } else {
           spouseShare = currentHeranca / 2;
           const parentShare = currentHeranca / 2;
           calculatedHeirs.push({ id: 'p1', type: 'parent', name: 'Ascendente', amount: parentShare, percentage: 0 });
        }
        
        calculatedHeirs.push({ id: 'spouse', type: 'spouse', name: 'Cônjuge', amount: currentMeacao + spouseShare, percentage: 0 });
      } else {
        // Só pais
        const share = currentHeranca / parentsCount;
        for(let i=0; i<parentsCount; i++) {
           calculatedHeirs.push({ id: `p-${i}`, type: 'parent', name: `Ascendente ${i+1}`, amount: share, percentage: 0 });
        }
      }
    } 
    // CASO 3: SÓ CÔNJUGE
    else if (hasSpouse) {
       // Art. 1.838: Em falta de descendentes e ascendentes, será deferida a sucessão por inteiro ao cônjuge sobrevivente.
       calculatedHeirs.push({ id: 'spouse', type: 'spouse', name: 'Cônjuge', amount: currentMeacao + currentHeranca, percentage: 0 });
    }
    // CASO 4: COLATERAIS (Simplificado: Estado ou Irmãos se houver, aqui vamos deixar vazio ou msg)
    else {
       // Deixar vazio ou mostrar alerta
    }

    // Calcular Porcentagens Finais (baseado no total assets)
    calculatedHeirs = calculatedHeirs.map(h => ({
      ...h,
      percentage: (h.amount / totalAssets) * 100
    }));

    setHeirs(calculatedHeirs);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col max-w-7xl mx-auto">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-pink-100 dark:bg-pink-900/20 px-4 py-2 rounded-full border border-pink-200 dark:border-pink-800 mb-4">
              <Share2 className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400">Direito das Sucessões</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">O Partilhador</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Simulador visual de herança e meação (Art. 1.829 CC).</p>
        </div>
        <button onClick={() => { setCommonPatrimony(1000000); setParticularPatrimony(0); setChildrenCount(2); setHasSpouse(true); }} className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-sanfran-rubi transition-colors">
           <RefreshCw size={20} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
         
         {/* LEFT PANEL: CONTROLS */}
         <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl space-y-6">
               
               {/* Assets */}
               <div>
                  <h3 className="text-sm font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><Coins size={16} /> Patrimônio</h3>
                  <div className="space-y-3">
                     <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Bens Comuns</label>
                        <input 
                          type="number" 
                          value={commonPatrimony} 
                          onChange={e => setCommonPatrimony(Number(e.target.value))}
                          className="w-full p-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:border-pink-500"
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Bens Particulares (De Cujus)</label>
                        <input 
                          type="number" 
                          value={particularPatrimony} 
                          onChange={e => setParticularPatrimony(Number(e.target.value))}
                          className="w-full p-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:border-pink-500"
                        />
                     </div>
                  </div>
               </div>

               <hr className="border-slate-100 dark:border-white/5" />

               {/* Family */}
               <div>
                  <h3 className="text-sm font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><Users size={16} /> Família</h3>
                  
                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Cônjuge Sobrevivente</span>
                        <button 
                          onClick={() => setHasSpouse(!hasSpouse)}
                          className={`w-12 h-6 rounded-full transition-colors relative ${hasSpouse ? 'bg-pink-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                           <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${hasSpouse ? 'left-7' : 'left-1'}`} />
                        </button>
                     </div>

                     {hasSpouse && (
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Regime de Bens</label>
                           <select 
                             value={regime} 
                             onChange={e => setRegime(e.target.value)}
                             className="w-full p-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs outline-none"
                           >
                              {REGIMES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                           </select>
                        </div>
                     )}

                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Descendentes (Filhos)</label>
                        <div className="flex items-center gap-3">
                           <input 
                             type="range" min="0" max="10" 
                             value={childrenCount} 
                             onChange={e => { setChildrenCount(Number(e.target.value)); if(Number(e.target.value)>0) setParentsCount(0); }}
                             className="flex-1 accent-pink-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                           />
                           <span className="font-black text-lg w-6 text-center">{childrenCount}</span>
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Ascendentes (Pais Vivos)</label>
                        <div className="flex items-center gap-3">
                           <input 
                             type="range" min="0" max="2" 
                             value={parentsCount} 
                             onChange={e => { setParentsCount(Number(e.target.value)); if(Number(e.target.value)>0) setChildrenCount(0); }}
                             disabled={childrenCount > 0}
                             className={`flex-1 accent-pink-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer ${childrenCount > 0 ? 'opacity-50' : ''}`}
                           />
                           <span className="font-black text-lg w-6 text-center">{parentsCount}</span>
                        </div>
                        {childrenCount > 0 && <p className="text-[8px] text-red-400 font-bold">Descendentes excluem Ascendentes</p>}
                     </div>
                  </div>
               </div>

            </div>
         </div>

         {/* RIGHT PANEL: VISUALIZATION TREE */}
         <div className="lg:col-span-8 flex flex-col">
            <div className="flex-1 bg-slate-100 dark:bg-[#0d0303] rounded-[3rem] border-4 border-slate-200 dark:border-sanfran-rubi/10 shadow-inner relative overflow-hidden p-8 flex flex-col justify-center items-center gap-12">
               {/* Background Grid */}
               <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]"></div>

               {/* TOP LEVEL: ASCENDANTS */}
               {parentsCount > 0 && (
                  <div className="flex gap-8 relative z-10 animate-in slide-in-from-top-10 duration-500">
                     {heirs.filter(h => h.type === 'parent').map((heir, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                           <div className="w-16 h-16 bg-white dark:bg-sanfran-rubiDark rounded-2xl shadow-lg border-2 border-slate-200 dark:border-white/10 flex items-center justify-center mb-2">
                              <User className="text-slate-400" />
                           </div>
                           <div className="bg-white/90 dark:bg-black/60 px-4 py-2 rounded-xl text-center border border-slate-200 dark:border-white/10 backdrop-blur-sm">
                              <p className="text-[9px] font-black uppercase text-slate-500">{heir.name}</p>
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(heir.amount)}</p>
                           </div>
                           <div className="h-8 w-0.5 bg-slate-300 dark:bg-white/10 mt-2"></div>
                        </div>
                     ))}
                  </div>
               )}

               {/* MIDDLE LEVEL: DECEASED & SPOUSE */}
               <div className="flex items-center gap-16 relative z-10">
                  {/* De Cujus */}
                  <div className="flex flex-col items-center">
                     <div className="w-24 h-24 bg-slate-900 text-white rounded-[2rem] shadow-2xl flex items-center justify-center mb-3 relative">
                        <User size={40} />
                        <span className="absolute -top-3 bg-black text-white text-[8px] font-black uppercase px-2 py-1 rounded-full">De Cujus</span>
                     </div>
                     <div className="text-center">
                        <p className="text-xs font-black uppercase text-slate-400">Patrimônio Total</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(commonPatrimony + particularPatrimony)}</p>
                     </div>
                  </div>

                  {/* Connection Line */}
                  {hasSpouse && (
                     <div className="h-1 w-16 bg-slate-300 dark:bg-white/10 relative">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white dark:bg-black p-1 rounded-full border border-slate-200 dark:border-white/20">
                           <Heart size={12} className="text-red-500 fill-current" />
                        </div>
                     </div>
                  )}

                  {/* Spouse */}
                  {hasSpouse && (
                     <div className="flex flex-col items-center animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-[2rem] shadow-xl border-2 border-pink-200 dark:border-pink-800 flex items-center justify-center mb-3">
                           <User size={32} />
                        </div>
                        <div className="bg-white/90 dark:bg-black/60 px-4 py-2 rounded-xl text-center border border-pink-200 dark:border-pink-900/50 backdrop-blur-sm">
                           <p className="text-[9px] font-black uppercase text-pink-500">Cônjuge</p>
                           <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(heirs.find(h => h.type === 'spouse')?.amount || 0)}</p>
                           <p className="text-[8px] font-bold text-slate-400">
                              (Meação: {formatCurrency(meacao)} + Herança: {formatCurrency((heirs.find(h => h.type === 'spouse')?.amount || 0) - meacao)})
                           </p>
                        </div>
                     </div>
                  )}
               </div>

               {/* Connection to Children */}
               {childrenCount > 0 && (
                  <div className="flex flex-col items-center -mt-8 relative z-0">
                     <div className="h-12 w-0.5 bg-slate-300 dark:bg-white/10"></div>
                     <div className="h-0.5 bg-slate-300 dark:bg-white/10 w-[calc(100%+4rem)] min-w-[200px]" style={{ width: `${childrenCount * 120}px` }}></div>
                     <div className="flex justify-between w-full" style={{ width: `${childrenCount * 120}px` }}>
                        {[...Array(childrenCount)].map((_, i) => (
                           <div key={i} className="flex flex-col items-center">
                              <div className="h-8 w-0.5 bg-slate-300 dark:bg-white/10"></div>
                              <ArrowDown size={12} className="text-slate-300 -mt-1" />
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* BOTTOM LEVEL: DESCENDANTS */}
               {childrenCount > 0 && (
                  <div className="flex gap-4 relative z-10 animate-in slide-in-from-bottom-10 duration-500">
                     {heirs.filter(h => h.type === 'child').map((heir, idx) => (
                        <div key={idx} className="flex flex-col items-center min-w-[100px]">
                           <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl shadow-md border-2 border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-2">
                              <User size={24} />
                           </div>
                           <div className="bg-white/90 dark:bg-black/60 px-3 py-1.5 rounded-xl text-center border border-emerald-200 dark:border-emerald-900/50 backdrop-blur-sm w-full">
                              <p className="text-[9px] font-black uppercase text-emerald-600">{heir.name}</p>
                              <p className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(heir.amount)}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               )}

               {heirs.length === 0 && (
                  <div className="text-center opacity-50">
                     <Info className="mx-auto mb-2 text-slate-400" />
                     <p className="text-sm font-bold uppercase text-slate-500">Herança Jacente? Adicione herdeiros.</p>
                  </div>
               )}

            </div>
         </div>

      </div>
    </div>
  );
};

export default SucessaoSimulator;