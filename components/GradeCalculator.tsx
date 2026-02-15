
import React, { useState } from 'react';
import { Calculator, Percent, ShieldCheck, AlertTriangle, GraduationCap, Gavel, Scale } from 'lucide-react';

const GradeCalculator: React.FC = () => {
  const [p1, setP1] = useState<string>('');
  const [p2, setP2] = useState<string>('');
  const [sub, setSub] = useState<string>('');

  const p1Val = parseFloat(p1) || 0;
  const p2Val = parseFloat(p2) || 0;
  const subVal = parseFloat(sub) || 0;

  // No sistema USP/SanFran geralmente se substitui a menor nota pela sub
  const effectiveP1 = subVal > p1Val && subVal > p2Val ? (p1Val < p2Val ? subVal : p1Val) : p1Val;
  const effectiveP2 = subVal > p2Val && subVal > p1Val ? (p2Val < p1Val ? subVal : p2Val) : p2Val;
  
  // Se a sub for maior que apenas uma, substitui a menor
  let finalP1 = p1Val;
  let finalP2 = p2Val;
  if (subVal > 0) {
    if (p1Val < p2Val && subVal > p1Val) finalP1 = subVal;
    else if (p2Val < p1Val && subVal > p2Val) finalP2 = subVal;
    else if (p1Val === p2Val && subVal > p1Val) finalP1 = subVal;
  }

  const media = (finalP1 + finalP2) / 2;
  const status = media >= 5.0 ? 'APROVADO' : media >= 3.0 ? 'EXAME' : 'REPROVADO';

  const needP2 = Math.max(0, (10 - p1Val));
  const needSub = Math.max(0, (10 - Math.max(p1Val, p2Val)));

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Médias SanFran</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-lg mt-1">Simulador de aprovação acadêmica.</p>
        </div>
        <div className="bg-usp-blue/10 px-6 py-3 rounded-2xl border border-usp-blue/30 flex items-center gap-3">
          <Calculator className="text-usp-blue" />
          <span className="text-[10px] font-black uppercase text-usp-blue tracking-widest">Protocolo USP</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl space-y-6">
             <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2"><Percent size={14} /> Notas Lançadas</h3>
             
             <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nota P1</label>
                  <input type="number" step="0.1" value={p1} onChange={e => setP1(e.target.value)} placeholder="0.0" className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-black outline-none focus:border-sanfran-rubi" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nota P2</label>
                  <input type="number" step="0.1" value={p2} onChange={e => setP2(e.target.value)} placeholder="0.0" className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-black outline-none focus:border-usp-blue" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nota SUB</label>
                  <input type="number" step="0.1" value={sub} onChange={e => setSub(e.target.value)} placeholder="0.0" className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-black outline-none focus:border-usp-gold" />
                </div>
             </div>
             
             <button onClick={() => {setP1(''); setP2(''); setSub('');}} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sanfran-rubi transition-colors">Limpar Planilha</button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
           <div className={`rounded-[3rem] p-10 border-t-[16px] shadow-2xl transition-all relative overflow-hidden ${media >= 5 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500' : media >= 3 ? 'bg-usp-gold/5 dark:bg-usp-gold/10 border-usp-gold' : 'bg-red-50 dark:bg-red-900/10 border-sanfran-rubi'}`}>
              <div className="absolute top-0 right-0 p-10 opacity-5">
                 {media >= 5 ? <ShieldCheck size={200} /> : <AlertTriangle size={200} />}
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                 <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Resultado Final</h4>
                    <p className={`text-6xl md:text-8xl font-black tabular-nums tracking-tighter ${media >= 5 ? 'text-emerald-600' : media >= 3 ? 'text-usp-gold' : 'text-sanfran-rubi'}`}>{media.toFixed(1)}</p>
                    <div className={`mt-4 inline-block px-6 py-2 rounded-full font-black uppercase text-xs tracking-[0.2em] text-white shadow-xl ${media >= 5 ? 'bg-emerald-500' : media >= 3 ? 'bg-usp-gold' : 'bg-sanfran-rubi'}`}>
                       {status}
                    </div>
                 </div>

                 <div className="space-y-6 md:text-right">
                    {p1 && !p2 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Precisa na P2 para passar:</p>
                        <p className="text-3xl font-black text-usp-blue">{needP2.toFixed(1)}</p>
                      </div>
                    )}
                    {(p1 || p2) && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Status da Labuta:</p>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                          {media >= 5 ? '"Justiça feita pela sua dedicação."' : '"Mantenha o foco, a academia exige rigor."'}
                        </p>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex items-center gap-6">
                 <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400"><GraduationCap size={28} /></div>
                 <div>
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Média Mínima</h5>
                    <p className="text-xl font-black text-slate-900 dark:text-white">5.0 Pontos</p>
                 </div>
              </div>
              <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex items-center gap-6">
                 <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400"><Scale size={28} /></div>
                 <div>
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Exame (Recu)</h5>
                    <p className="text-xl font-black text-slate-900 dark:text-white">3.0 a 4.9</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default GradeCalculator;
