
import React, { useState, useEffect } from 'react';
import { Banknote, Calculator, FileText, TrendingUp, DollarSign, History, Save, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface HonorariosProps {
  userId: string;
}

// Dados Simplificados da Tabela OAB/SP 2024
const OAB_TABLE: Record<string, { label: string, acts: Record<string, number> }> = {
  'civel': {
    label: 'Cível e Família',
    acts: {
      'consulta': 490.50,
      'hora_intelectual': 290.00,
      'rito_comum': 5000.00,
      'juizado_especial': 2500.00,
      'divorcio_consensual': 4000.00,
      'divorcio_litigioso': 8000.00,
      'inventario_jud': 6000.00,
      'alimentos': 3500.00,
      'usucapiao': 7000.00
    }
  },
  'trabalhista': {
    label: 'Trabalhista',
    acts: {
      'consulta': 490.50,
      'reclamacao': 4000.00,
      'contestacao': 4000.00,
      'audiencia': 1100.00,
      'parecer': 2500.00,
      'recurso_ordinario': 3500.00
    }
  },
  'criminal': {
    label: 'Criminal',
    acts: {
      'consulta': 550.00,
      'delegacia_dia': 4500.00,
      'audiencia_custodia': 3500.00,
      'juri_plenario': 20000.00,
      'hc_tj': 7000.00,
      'defesa_sumario': 6000.00
    }
  },
  'previdenciario': {
    label: 'Previdenciário',
    acts: {
      'consulta': 490.50,
      'processo_admin': 3000.00,
      'processo_judicial': 4000.00,
      'mandado_seguranca': 5000.00
    }
  }
};

const Honorarios: React.FC<HonorariosProps> = ({ userId }) => {
  const [selectedArea, setSelectedArea] = useState<string>('civel');
  const [selectedAct, setSelectedAct] = useState<string>('consulta');
  const [causeValue, setCauseValue] = useState<string>('');
  const [marginPercent, setMarginPercent] = useState<number>(0);
  const [successPercent, setSuccessPercent] = useState<number>(20);
  const [clientName, setClientName] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('honorarios_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setHistory(data);
  };

  const getLabel = (area: string, act: string) => {
    // Tenta encontrar label legível, ou formata a key
    const actKey = act;
    return actKey.replace(/_/g, ' ').toUpperCase();
  };

  const baseFee = OAB_TABLE[selectedArea].acts[selectedAct] || 0;
  const marginValue = baseFee * (marginPercent / 100);
  const contractFee = baseFee + marginValue;
  
  const numericCauseValue = parseFloat(causeValue.replace(/\D/g, '')) / 100 || 0;
  const successFee = numericCauseValue * (successPercent / 100);
  
  const totalEstimate = contractFee + successFee;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleCauseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') {
      setCauseValue('');
      return;
    }
    const val = parseFloat(raw) / 100;
    setCauseValue(val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  const saveSimulation = async () => {
    try {
      const payload = {
        user_id: userId,
        client_name: clientName || 'Cliente Anônimo',
        area: OAB_TABLE[selectedArea].label,
        act_type: getLabel(selectedArea, selectedAct),
        cause_value: numericCauseValue,
        base_fee: baseFee,
        success_fee_percent: successPercent,
        total_estimate: totalEstimate
      };

      const { data, error } = await supabase.from('honorarios_logs').insert(payload).select().single();
      if (error) throw error;
      
      if (data) setHistory(prev => [data, ...prev]);
      alert("Orçamento salvo com sucesso!");
      setClientName('');
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar.");
    }
  };

  const deleteHistory = async (id: string) => {
    if(!confirm("Apagar registro?")) return;
    await supabase.from('honorarios_logs').delete().eq('id', id);
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 max-w-6xl mx-auto">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-200 dark:border-emerald-800 mb-4">
              <Banknote className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Financeiro</span>
           </div>
           <h2 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Simulador de Honorários</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Baseado na Tabela de Honorários da OAB/SP.</p>
        </div>
        
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-sanfran-rubi rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
        >
          <History className="w-4 h-4" /> Histórico
        </button>
      </header>

      {showHistory ? (
        <div className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2rem] shadow-xl border border-slate-200 dark:border-sanfran-rubi/30">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase">Orçamentos Salvos</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-red-500"><Trash2 size={20} /></button>
           </div>
           <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {history.length === 0 && <p className="text-center text-slate-400">Nenhum registro.</p>}
              {history.map(item => (
                 <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex justify-between items-center">
                    <div>
                       <p className="font-bold text-slate-900 dark:text-white">{item.client_name}</p>
                       <p className="text-xs text-slate-500">{item.act_type} ({item.area})</p>
                       <p className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black text-emerald-600">{formatCurrency(item.total_estimate)}</p>
                       <button onClick={() => deleteHistory(item.id)} className="text-xs text-red-400 hover:underline">Excluir</button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          
          {/* LADO ESQUERDO: INPUTS */}
          <div className="space-y-6">
             <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl space-y-6">
                
                <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Área de Atuação</label>
                   <div className="grid grid-cols-2 gap-2">
                      {Object.keys(OAB_TABLE).map(key => (
                         <button
                           key={key}
                           onClick={() => { setSelectedArea(key); setSelectedAct(Object.keys(OAB_TABLE[key].acts)[0]); }}
                           className={`p-3 rounded-xl text-xs font-black uppercase tracking-wide border-2 transition-all ${selectedArea === key ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'bg-slate-50 dark:bg-black/20 border-transparent text-slate-500 hover:bg-slate-100'}`}
                         >
                            {OAB_TABLE[key].label}
                         </button>
                      ))}
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Ato Processual</label>
                   <select 
                     value={selectedAct} 
                     onChange={(e) => setSelectedAct(e.target.value)}
                     className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500"
                   >
                      {Object.keys(OAB_TABLE[selectedArea].acts).map(act => (
                         <option key={act} value={act}>{getLabel(selectedArea, act)}</option>
                      ))}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Margem de Lucro (%)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={marginPercent} 
                        onChange={(e) => setMarginPercent(parseFloat(e.target.value))} 
                        className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold text-center outline-none focus:border-emerald-500" 
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Honorários Êxito (%)</label>
                      <input 
                        type="number" 
                        min="0"
                        max="50"
                        value={successPercent} 
                        onChange={(e) => setSuccessPercent(parseFloat(e.target.value))} 
                        className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold text-center outline-none focus:border-emerald-500" 
                      />
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Valor da Causa / Proveito Econômico</label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                      <input 
                        value={causeValue}
                        onChange={handleCauseChange}
                        placeholder="0,00"
                        className="w-full p-4 pl-12 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold text-lg outline-none focus:border-emerald-500 tabular-nums"
                      />
                   </div>
                </div>

             </div>
          </div>

          {/* LADO DIREITO: ORÇAMENTO (RECEIPT) */}
          <div className="relative">
             <div className="bg-white text-slate-900 p-8 rounded-[1rem] shadow-2xl border-t-8 border-emerald-600 relative overflow-hidden font-mono text-sm leading-relaxed">
                {/* Paper texture */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] pointer-events-none"></div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-100 rounded-full shadow-inner"></div>

                <div className="text-center mb-8 border-b-2 border-dashed border-slate-300 pb-6">
                   <h3 className="text-2xl font-black uppercase tracking-tighter">Proposta de Honorários</h3>
                   <p className="text-xs text-slate-500 mt-1">Escritório Modelo SanFran</p>
                   <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString()}</p>
                </div>

                <div className="space-y-4 mb-8">
                   <div className="flex justify-between">
                      <span>SERVIÇO</span>
                      <span className="font-bold text-right">{getLabel(selectedArea, selectedAct)}</span>
                   </div>
                   <div className="flex justify-between text-slate-500">
                      <span>Tabela OAB/SP (Mín.)</span>
                      <span>{formatCurrency(baseFee)}</span>
                   </div>
                   <div className="flex justify-between text-slate-500">
                      <span>Margem ({marginPercent}%)</span>
                      <span>+ {formatCurrency(marginValue)}</span>
                   </div>
                   <div className="flex justify-between font-bold pt-2 border-t border-slate-200">
                      <span>HONORÁRIOS CONTRATUAIS</span>
                      <span>{formatCurrency(contractFee)}</span>
                   </div>
                </div>

                <div className="space-y-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
                   <div className="flex justify-between text-slate-500 text-xs">
                      <span>Base de Cálculo (Causa)</span>
                      <span>{formatCurrency(numericCauseValue)}</span>
                   </div>
                   <div className="flex justify-between font-bold text-emerald-700">
                      <span>HONORÁRIOS ÊXITO ({successPercent}%)</span>
                      <span>+ {formatCurrency(successFee)}</span>
                   </div>
                </div>

                <div className="flex justify-between items-center text-xl font-black bg-slate-900 text-white p-4 rounded-xl">
                   <span>TOTAL ESTIMADO</span>
                   <span>{formatCurrency(totalEstimate)}</span>
                </div>

                <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300">
                   <input 
                     value={clientName}
                     onChange={e => setClientName(e.target.value)}
                     placeholder="Nome do Cliente (Opcional)"
                     className="w-full bg-transparent outline-none font-bold text-center placeholder:text-slate-300 text-slate-900 mb-4"
                   />
                   <button 
                     onClick={saveSimulation}
                     className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
                   >
                      <Save size={16} /> Salvar Orçamento
                   </button>
                </div>
             </div>
             
             {/* Efeito de sombra curvada embaixo */}
             <div className="absolute -bottom-4 left-4 right-4 h-4 bg-black/20 blur-xl rounded-[100%] -z-10"></div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Honorarios;