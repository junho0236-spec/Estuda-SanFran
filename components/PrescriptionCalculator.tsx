
import React, { useState } from 'react';
import { Hourglass, Calculator, AlertCircle, CheckCircle2, History, RotateCcw, Calendar, Scale } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface PrescriptionCalculatorProps {
  userId: string;
}

interface CalculationResult {
  limitUsed: number;
  isPrescribed: boolean;
  factToComplaint: { years: number, months: number, days: number };
  complaintToSentence: { years: number, months: number, days: number } | null;
  complaintToToday: { years: number, months: number, days: number };
  details: string;
}

const PrescriptionCalculator: React.FC<PrescriptionCalculatorProps> = ({ userId }) => {
  // Inputs
  const [penaltyYears, setPenaltyYears] = useState<number>(0);
  const [penaltyMonths, setPenaltyMonths] = useState<number>(0);
  const [dateFact, setDateFact] = useState<string>('');
  const [dateComplaint, setDateComplaint] = useState<string>('');
  const [dateSentence, setDateSentence] = useState<string>('');
  
  // Redutores
  const [isUnder21, setIsUnder21] = useState(false);
  const [isOver70, setIsOver70] = useState(false);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Helper para cálculo de datas preciso
  const getDateDiff = (start: string, end: string) => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    let years = d2.getFullYear() - d1.getFullYear();
    let months = d2.getMonth() - d1.getMonth();
    let days = d2.getDate() - d1.getDate();

    if (days < 0) {
      months--;
      // Dias no mês anterior
      const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return { years, months, days };
  };

  const getPrescriptionLimit = (pYears: number, pMonths: number) => {
    // Conversão total para meses para facilitar comparação
    const totalMonths = (pYears * 12) + pMonths;

    let limit = 20;
    if (totalMonths < 12) limit = 3;
    else if (totalMonths < 24) limit = 4;
    else if (totalMonths < 48) limit = 8;
    else if (totalMonths < 96) limit = 12;
    else if (totalMonths < 144) limit = 16;
    else limit = 20;

    return limit;
  };

  const calculate = async () => {
    if (!dateFact || !dateComplaint) {
      alert("Preencha ao menos a Data do Fato e do Recebimento da Denúncia.");
      return;
    }

    let limit = getPrescriptionLimit(penaltyYears, penaltyMonths);
    
    // Art. 115 CP - Redução pela metade
    if (isUnder21 || isOver70) {
      limit = limit / 2;
    }

    // Lapsos
    const diff1 = getDateDiff(dateFact, dateComplaint);
    
    // Se tiver sentença, calcula intervalo Denúncia -> Sentença
    // Se não, calcula Denúncia -> Hoje (prescrição em perspectiva/virtual ou real se o processo estiver parado)
    let diff2 = null;
    let diffToday = getDateDiff(dateComplaint, new Date().toISOString().split('T')[0]);

    if (dateSentence) {
      diff2 = getDateDiff(dateComplaint, dateSentence);
    }

    // Verifica Prescrição
    // Regra: Se algum lapso temporal (em anos, considerando frações convertidas) > limite
    // Simplificação prática: comparamos os anos completos + meses/dias se for "na trave"
    
    // Função auxiliar para comparar tempo corrido com limite
    const checkExceeded = (time: { years: number, months: number, days: number }, limitYears: number) => {
        // Converte tudo para dias (aproximado) ou compara hierarquicamente
        if (time.years > limitYears) return true;
        if (time.years === limitYears && (time.months > 0 || time.days > 0)) return true;
        return false;
    };

    let isPrescribed = false;
    let details = "";

    // 1. Fato -> Recebimento
    if (checkExceeded(diff1, limit)) {
      isPrescribed = true;
      details = `Prescrição Retroativa (Fato -> Denúncia) ocorreu. Lapso: ${diff1.years}a ${diff1.months}m. Limite: ${limit}a.`;
    } 
    // 2. Recebimento -> Sentença (se houver)
    else if (diff2 && checkExceeded(diff2, limit)) {
      isPrescribed = true;
      details = `Prescrição Retroativa (Denúncia -> Sentença) ocorreu. Lapso: ${diff2.years}a ${diff2.months}m. Limite: ${limit}a.`;
    }
    // 3. Recebimento -> Hoje (se não houver sentença)
    else if (!diff2 && checkExceeded(diffToday, limit)) {
      isPrescribed = true;
      details = `Prescrição da Pretensão Punitiva (Denúncia -> Hoje) ocorreu. Lapso: ${diffToday.years}a ${diffToday.months}m. Limite: ${limit}a.`;
    } else {
      details = `Prazos dentro do limite de ${limit} anos.`;
    }

    const calcResult = {
      limitUsed: limit,
      isPrescribed,
      factToComplaint: diff1,
      complaintToSentence: diff2,
      complaintToToday: diffToday,
      details
    };

    setResult(calcResult);

    // Save Log
    try {
      await supabase.from('prescription_logs').insert({
        user_id: userId,
        crime_title: `Pena Máx: ${penaltyYears}a ${penaltyMonths}m`,
        max_penalty_years: penaltyYears,
        prescription_limit: limit,
        is_prescribed: isPrescribed,
        details: calcResult
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('prescription_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if(data) setLogs(data);
    setShowLogs(true);
  };

  const reset = () => {
    setPenaltyYears(0);
    setPenaltyMonths(0);
    setDateFact('');
    setDateComplaint('');
    setDateSentence('');
    setResult(null);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 max-w-5xl mx-auto h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/20 px-4 py-2 rounded-full border border-red-200 dark:border-red-800 mb-4">
              <Hourglass className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Direito Penal</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Calculadora de Prescrição</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Análise da Extinção da Punibilidade (Art. 109 CP).</p>
        </div>
        <div className="flex gap-2">
           <button onClick={fetchLogs} className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-sanfran-rubi rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
              <History size={16} /> Histórico
           </button>
           <button onClick={reset} className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-red-500 rounded-2xl transition-all">
              <RotateCcw size={20} />
           </button>
        </div>
      </header>

      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowLogs(false)}>
           <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl border-2 border-slate-200 dark:border-sanfran-rubi/30" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-black uppercase mb-6 text-slate-900 dark:text-white">Registros de Cálculo</h3>
              <div className="space-y-3">
                 {logs.map(log => (
                    <div key={log.id} className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-center">
                       <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-white">{log.crime_title}</p>
                          <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleDateString()}</p>
                       </div>
                       <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${log.is_prescribed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {log.is_prescribed ? 'Prescrito' : 'Ativo'}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* INPUTS */}
         <div className="space-y-6">
            <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl space-y-6">
               <h3 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2 mb-4">
                  <Calculator size={16} /> Parâmetros do Delito
               </h3>

               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Pena Máxima em Abstrato</label>
                  <div className="flex gap-4">
                     <div className="flex-1 relative">
                        <input 
                          type="number" min="0" value={penaltyYears} onChange={e => setPenaltyYears(Number(e.target.value))}
                          className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-black text-center outline-none focus:border-red-500 text-lg"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Anos</span>
                     </div>
                     <div className="flex-1 relative">
                        <input 
                          type="number" min="0" value={penaltyMonths} onChange={e => setPenaltyMonths(Number(e.target.value))}
                          className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-black text-center outline-none focus:border-red-500 text-lg"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Meses</span>
                     </div>
                  </div>
               </div>

               <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Data do Fato (Consumação)</label>
                     <input 
                       type="date" value={dateFact} onChange={e => setDateFact(e.target.value)}
                       className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-red-500"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Data Recebimento Denúncia</label>
                     <input 
                       type="date" value={dateComplaint} onChange={e => setDateComplaint(e.target.value)}
                       className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-red-500"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Data Publicação Sentença (Opcional)</label>
                     <input 
                       type="date" value={dateSentence} onChange={e => setDateSentence(e.target.value)}
                       className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-red-500"
                     />
                  </div>
               </div>

               <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => setIsUnder21(!isUnder21)}
                    className={`flex-1 p-3 rounded-xl border-2 font-bold text-xs transition-all ${isUnder21 ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}
                  >
                     Menor de 21 (Fato)
                  </button>
                  <button 
                    onClick={() => setIsOver70(!isOver70)}
                    className={`flex-1 p-3 rounded-xl border-2 font-bold text-xs transition-all ${isOver70 ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}
                  >
                     Maior de 70 (Sentença)
                  </button>
               </div>

               <button 
                 onClick={calculate}
                 className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
               >
                  <Scale size={20} /> Calcular Prescrição
               </button>
            </div>
         </div>

         {/* RESULTADOS VISUAIS */}
         <div className="space-y-6">
            {result ? (
               <div className="animate-in slide-in-from-right-10 duration-500 space-y-6">
                  {/* Status Card */}
                  <div className={`p-8 rounded-[3rem] shadow-2xl text-center border-4 ${result.isPrescribed ? 'bg-emerald-500 border-emerald-400' : 'bg-red-600 border-red-500'}`}>
                     {result.isPrescribed ? <CheckCircle2 size={64} className="text-white mx-auto mb-4" /> : <AlertCircle size={64} className="text-white mx-auto mb-4" />}
                     <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2">
                        {result.isPrescribed ? 'Punibilidade Extinta' : 'Não Prescrito'}
                     </h3>
                     <p className="text-white/80 font-bold uppercase tracking-widest text-xs">
                        {result.isPrescribed ? 'O Estado perdeu o direito de punir.' : 'O Estado ainda pode punir.'}
                     </p>
                  </div>

                  {/* Detalhes */}
                  <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
                     <h4 className="text-sm font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
                        <Calendar size={16} /> Linha do Tempo
                     </h4>
                     
                     <div className="space-y-6 relative">
                        {/* Linha Vertical */}
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-white/10"></div>

                        {/* Fato -> Denúncia */}
                        <div className="relative pl-10">
                           <div className="absolute left-0 top-0 w-6 h-6 bg-slate-100 dark:bg-white/10 rounded-full border-4 border-white dark:border-sanfran-rubiBlack z-10 flex items-center justify-center">
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                           </div>
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Lapso 1: Fato até Denúncia</p>
                           <p className="text-lg font-black text-slate-800 dark:text-white">
                              {result.factToComplaint.years} anos, {result.factToComplaint.months} meses, {result.factToComplaint.days} dias
                           </p>
                        </div>

                        {/* Denúncia -> Sentença/Hoje */}
                        <div className="relative pl-10">
                           <div className="absolute left-0 top-0 w-6 h-6 bg-slate-100 dark:bg-white/10 rounded-full border-4 border-white dark:border-sanfran-rubiBlack z-10 flex items-center justify-center">
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                           </div>
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                              Lapso 2: Denúncia até {dateSentence ? 'Sentença' : 'Hoje'}
                           </p>
                           <p className="text-lg font-black text-slate-800 dark:text-white">
                              {dateSentence 
                                ? `${result.complaintToSentence?.years} anos, ${result.complaintToSentence?.months} meses` 
                                : `${result.complaintToToday.years} anos, ${result.complaintToToday.months} meses`
                              }
                           </p>
                        </div>

                        {/* Limite */}
                        <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 mt-6 relative z-10">
                           <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Limite Aplicado (Art. 109 CP)</p>
                           <p className="text-2xl font-black text-red-600 dark:text-red-400">{result.limitUsed} Anos</p>
                           {(isUnder21 || isOver70) && <span className="text-[9px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded mt-2 inline-block">Prazo reduzido pela metade (Art. 115)</span>}
                        </div>
                     </div>
                  </div>
               </div>
            ) : (
               <div className="h-full bg-slate-100 dark:bg-white/5 rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center p-8 opacity-50">
                  <Scale size={64} className="mb-4 text-slate-400" />
                  <p className="text-xl font-black uppercase text-slate-400">Aguardando Dados</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">Preencha os campos para verificar a prescrição.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default PrescriptionCalculator;