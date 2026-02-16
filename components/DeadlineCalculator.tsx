
import React, { useState, useEffect } from 'react';
import { CalendarClock, Gavel, AlertCircle, Calendar, ArrowRight, Trash2, Plus, Info } from 'lucide-react';

type DeadlineType = 'cpc' | 'cpp' | 'jec';

const DeadlineCalculator: React.FC = () => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState(15);
  const [type, setType] = useState<DeadlineType>('cpc');
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');
  const [resultDate, setResultDate] = useState<string | null>(null);
  const [calculationLog, setCalculationLog] = useState<string[]>([]);

  // Feriados Nacionais Fixos (Exemplo simplificado)
  const nationalHolidays = [
    '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
  ];

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
  };

  const isHoliday = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const monthDay = dateString.slice(5); // MM-DD
    
    if (nationalHolidays.includes(monthDay)) return true;
    if (holidays.includes(dateString)) return true;
    
    return false;
  };

  const isBusinessDay = (date: Date) => {
    return !isWeekend(date) && !isHoliday(date);
  };

  const calculateDeadline = () => {
    if (!startDate) return;

    // Criar data baseada na string YYYY-MM-DD, ajustando para meio-dia para evitar problemas de fuso
    const [y, m, d] = startDate.split('-').map(Number);
    let current = new Date(y, m - 1, d, 12, 0, 0);
    
    const logs: string[] = [];
    logs.push(`Publicação: ${current.toLocaleDateString()}`);

    // Art. 224 CPC: Exclui o dia do começo
    current.setDate(current.getDate() + 1);
    
    // Se o dia seguinte à publicação não for útil, prorroga o INÍCIO da contagem (CPC)
    // No CPP, conta-se corridos, mas se começar em fim de semana, o termo inicial é o primeiro dia útil?
    // Simplificação prática: A contagem começa no primeiro dia útil SEGUINTE à publicação.
    
    while (!isBusinessDay(current)) {
      logs.push(`Dia ${current.toLocaleDateString()} não é útil (Início prorrogado).`);
      current.setDate(current.getDate() + 1);
    }
    
    logs.push(`Início da Contagem: ${current.toLocaleDateString()}`);

    if (type === 'cpc') {
      // Contagem em Dias Úteis
      let count = 0;
      while (count < days) {
        // Verifica se o dia atual é útil
        // Nota: O dia de início da contagem já é o "Dia 1"? 
        // Interpretação comum: O prazo flui a partir do dia útil seguinte. 
        // Se a contagem começou hoje (current), este é o primeiro dia do prazo.
        
        if (isBusinessDay(current)) {
          count++;
          // logs.push(`${count}º Dia: ${current.toLocaleDateString()}`);
        } else {
          // logs.push(`Pula ${current.toLocaleDateString()} (Não útil)`);
        }

        // Se ainda não acabou, avança para o próximo dia para continuar verificando
        if (count < days) {
           current.setDate(current.getDate() + 1);
        }
      }
    } else {
      // Contagem em Dias Corridos (CPP / JEC em alguns casos)
      // Adiciona os dias corridos
      // Se dias = 15, e começo dia 1. Dia final = 1 + 15 - 1 = 15.
      // Como já avançamos para o dia de início, somamos (days - 1)
      
      current.setDate(current.getDate() + days - 1);
      logs.push(`Fim do prazo material: ${current.toLocaleDateString()}`);

      // Prerrogativa de prazo: Se cair em dia não útil, prorroga para o próximo útil
      while (!isBusinessDay(current)) {
        logs.push(`Vencimento em ${current.toLocaleDateString()} prorrogado (não útil).`);
        current.setDate(current.getDate() + 1);
      }
    }

    setResultDate(current.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    setCalculationLog(logs);
  };

  const addHoliday = () => {
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays([...holidays, newHoliday]);
      setNewHoliday('');
    }
  };

  const removeHoliday = (date: string) => {
    setHolidays(holidays.filter(h => h !== date));
  };

  // Recalcular quando inputs mudarem
  useEffect(() => {
    calculateDeadline();
  }, [startDate, days, type, holidays]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/20 mb-4">
              <CalendarClock className="w-4 h-4 text-sanfran-rubi" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Ferramenta Jurídica</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Calculadora de Prazos</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Contagem processual conforme Novo CPC ou CPP.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Painel de Controle */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl space-y-6">
            
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data de Publicação / Intimação</label>
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={(e) => setStartDate(e.target.value)}
                 className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi text-slate-900 dark:text-white uppercase"
               />
               <p className="text-[9px] text-slate-400 font-bold ml-1">Considera-se data da disponibilização no DJe.</p>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Prazo (Dias)</label>
               <div className="flex gap-2">
                 <input 
                   type="number" 
                   value={days} 
                   onChange={(e) => setDays(Number(e.target.value))}
                   className="flex-1 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi text-slate-900 dark:text-white"
                 />
                 <div className="flex gap-1">
                   <button onClick={() => setDays(5)} className="px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-xl font-black text-xs hover:bg-sanfran-rubi hover:text-white transition-colors">5</button>
                   <button onClick={() => setDays(10)} className="px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-xl font-black text-xs hover:bg-sanfran-rubi hover:text-white transition-colors">10</button>
                   <button onClick={() => setDays(15)} className="px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-xl font-black text-xs hover:bg-sanfran-rubi hover:text-white transition-colors">15</button>
                 </div>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Regime Legal</label>
               <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setType('cpc')}
                    className={`p-4 rounded-2xl border-2 font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${type === 'cpc' ? 'bg-sanfran-rubi text-white border-sanfran-rubi' : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-transparent hover:border-slate-300'}`}
                  >
                    <Gavel size={16} /> CPC (Úteis)
                  </button>
                  <button 
                    onClick={() => setType('cpp')}
                    className={`p-4 rounded-2xl border-2 font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${type === 'cpp' ? 'bg-usp-blue text-white border-usp-blue' : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-transparent hover:border-slate-300'}`}
                  >
                    <AlertCircle size={16} /> CPP (Corridos)
                  </button>
               </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Calendar size={12} /> Suspensões / Feriados Locais</label>
              </div>
              <div className="flex gap-2">
                <input 
                   type="date" 
                   value={newHoliday} 
                   onChange={(e) => setNewHoliday(e.target.value)}
                   className="flex-1 p-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none"
                 />
                 <button onClick={addHoliday} className="p-3 bg-slate-200 dark:bg-white/10 rounded-xl hover:bg-sanfran-rubi hover:text-white transition-colors">
                   <Plus size={18} />
                 </button>
              </div>
              
              {holidays.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {holidays.map(h => (
                    <div key={h} className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                      {h.split('-').reverse().join('/')}
                      <button onClick={() => removeHoliday(h)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Painel de Resultados */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 dark:bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden text-center md:text-left h-full flex flex-col justify-center">
             <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Calendar size={200} className="text-white dark:text-sanfran-rubiBlack" />
             </div>
             
             <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-2 relative z-10">Prazo Fatal</p>
             <h3 className="text-4xl md:text-6xl font-black text-white dark:text-sanfran-rubiBlack uppercase tracking-tighter leading-none mb-6 relative z-10 break-words">
                {resultDate || '---'}
             </h3>

             <div className="bg-white/10 dark:bg-black/5 p-6 rounded-2xl backdrop-blur-sm relative z-10 border border-white/5 dark:border-black/5">
                <div className="flex items-center gap-2 mb-4">
                   <Info size={16} className="text-usp-gold" />
                   <span className="text-[10px] font-black uppercase text-slate-300 dark:text-slate-600 tracking-widest">Memória de Cálculo</span>
                </div>
                <div className="space-y-2 text-sm font-medium text-slate-300 dark:text-slate-600">
                   {calculationLog.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <ArrowRight size={14} className="mt-1 flex-shrink-0 opacity-50" />
                        <span>{log}</span>
                      </div>
                   ))}
                </div>
             </div>
             
             <div className="mt-8 relative z-10">
                <p className="text-[9px] font-bold text-slate-500 uppercase">
                  *Atenção: Esta ferramenta é um auxílio acadêmico. Sempre confira o prazo oficial no DJe e verifique feriados locais específicos da Comarca.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeadlineCalculator;
