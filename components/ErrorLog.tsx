
import React, { useState, useEffect } from 'react';
import { BookX, AlertTriangle, PenTool, TrendingUp, Plus, Trash2, Save, X, Filter } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ErrorLogEntry, ErrorReason } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

interface ErrorLogProps {
  userId: string;
}

const DISCIPLINES_OAB = [
  "Ética Profissional", "Direito Constitucional", "Direito Administrativo", "Direito Civil",
  "Processo Civil", "Direito Penal", "Processo Penal", "Direito do Trabalho", "Processo do Trabalho",
  "Direito Empresarial", "Direito Tributário", "Direitos Humanos", "Direito Internacional",
  "ECA", "Direito Ambiental", "Direito do Consumidor", "Filosofia do Direito"
];

const REASONS: Record<ErrorReason, { label: string, color: string }> = {
  'falta_de_atencao': { label: 'Falta de Atenção', color: '#f59e0b' }, // Amber
  'lacuna_teorica': { label: 'Lacuna Teórica', color: '#ef4444' }, // Red
  'interpretacao': { label: 'Interpretação', color: '#3b82f6' }, // Blue
  'pegadinha': { label: 'Pegadinha da Banca', color: '#a855f7' }, // Purple
  'esquecimento': { label: 'Branco / Esquecimento', color: '#64748b' } // Slate
};

const ErrorLog: React.FC<ErrorLogProps> = ({ userId }) => {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [newDiscipline, setNewDiscipline] = useState(DISCIPLINES_OAB[0]);
  const [newTopic, setNewTopic] = useState('');
  const [newReason, setNewReason] = useState<ErrorReason>('lacuna_teorica');
  const [newJustification, setNewJustification] = useState('');

  // Stats
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');

  useEffect(() => {
    fetchLogs();
  }, [userId]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setLogs(data);
    setLoading(false);
  };

  const handleAddLog = async () => {
    if (!newTopic.trim() || !newJustification.trim()) {
      alert("Preencha o tema e a justificativa.");
      return;
    }

    try {
      const { data, error } = await supabase.from('error_logs').insert({
        user_id: userId,
        discipline: newDiscipline,
        topic: newTopic,
        reason: newReason,
        justification: newJustification
      }).select().single();

      if (error) throw error;
      if (data) setLogs([data, ...logs]);
      
      setShowForm(false);
      setNewTopic('');
      setNewJustification('');
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar no caderno.");
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Arrancar esta folha do caderno?")) return;
    try {
      await supabase.from('error_logs').delete().eq('id', id);
      setLogs(logs.filter(l => l.id !== id));
    } catch (e) { console.error(e); }
  };

  // Analytics Data
  const reasonData = Object.keys(REASONS).map(key => {
    const count = logs.filter(l => l.reason === key).length;
    return { name: REASONS[key as ErrorReason].label, value: count, color: REASONS[key as ErrorReason].color };
  }).filter(d => d.value > 0);

  const disciplineData = DISCIPLINES_OAB.map(disc => {
    const count = logs.filter(l => l.discipline === disc).length;
    return { name: disc, value: count };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-5xl mx-auto h-full flex flex-col font-sans">
      
      {/* HEADER DARK ACADEMIA */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-full border border-slate-800 mb-4 shadow-lg">
              <BookX className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Black Book</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Caderno de Erros</h2>
           <p className="text-lg font-medium text-slate-500 mt-2 italic">"O sucesso é construído sobre as ruínas dos erros corrigidos."</p>
        </div>
        
        <div className="flex bg-slate-200 dark:bg-white/10 p-1 rounded-xl">
           <button 
             onClick={() => setActiveTab('list')} 
             className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
           >
             Registros
           </button>
           <button 
             onClick={() => setActiveTab('stats')} 
             className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
           >
             Análise
           </button>
        </div>
      </header>

      {/* NEW ENTRY BUTTON */}
      {activeTab === 'list' && (
        <button 
          onClick={() => setShowForm(true)}
          className="w-full md:w-auto self-start bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:shadow-red-500/20 transition-all flex items-center gap-3"
        >
           <Plus size={18} /> Novo Erro
        </button>
      )}

      {/* MODAL FORM */}
      {showForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#121212] w-full max-w-2xl rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative">
               <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-white uppercase mb-8 flex items-center gap-3">
                  <AlertTriangle className="text-red-500" /> Registrar Falha
               </h3>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Disciplina</label>
                     <select 
                        value={newDiscipline} 
                        onChange={e => setNewDiscipline(e.target.value)}
                        className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm outline-none focus:border-red-500"
                     >
                        {DISCIPLINES_OAB.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Motivo do Erro</label>
                     <select 
                        value={newReason} 
                        onChange={e => setNewReason(e.target.value as ErrorReason)}
                        className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm outline-none focus:border-red-500"
                     >
                        {Object.entries(REASONS).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                     </select>
                  </div>
               </div>

               <div className="mb-6">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Tema Específico</label>
                  <input 
                     value={newTopic} 
                     onChange={e => setNewTopic(e.target.value)}
                     placeholder="Ex: Recursos no Processo Civil - Prazos"
                     className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm outline-none focus:border-red-500"
                  />
               </div>

               <div className="mb-8">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Justificativa Correta (Onde errei?)</label>
                  <textarea 
                     value={newJustification} 
                     onChange={e => setNewJustification(e.target.value)}
                     placeholder="Explique o conceito correto para fixação..."
                     className="w-full h-32 p-4 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 font-serif text-sm outline-none focus:border-red-500 resize-none leading-relaxed"
                  />
               </div>

               <button 
                  onClick={handleAddLog}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-lg transition-all flex items-center justify-center gap-2"
               >
                  <Save size={18} /> Gravar no Caderno
               </button>
            </div>
         </div>
      )}

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[400px]">
         
         {activeTab === 'list' && (
            <div className="grid grid-cols-1 gap-4">
               {loading ? (
                  <div className="text-center py-20 text-slate-400 font-bold uppercase animate-pulse">Carregando Caderno...</div>
               ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                     <PenTool size={48} className="text-slate-400 mb-4" />
                     <p className="text-xl font-black text-slate-500 uppercase">Caderno em Branco</p>
                     <p className="text-xs font-bold text-slate-400 mt-2">Nenhum erro registrado. Continue praticando.</p>
                  </div>
               ) : (
                  logs.map(log => (
                     <div key={log.id} className="group bg-[#1a1a1a] border-l-4 border-slate-700 rounded-r-xl p-6 shadow-lg relative overflow-hidden transition-all hover:translate-x-1 hover:shadow-xl">
                        {/* Paper Texture Overlay */}
                        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/lined-paper.png')] pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                           <div>
                              <div className="flex items-center gap-3 mb-1">
                                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-1 rounded">
                                    {log.discipline}
                                 </span>
                                 <span className="text-[10px] font-bold" style={{ color: REASONS[log.reason].color }}>
                                    {REASONS[log.reason].label}
                                 </span>
                              </div>
                              <h3 className="text-xl font-black text-white uppercase tracking-tight">{log.topic}</h3>
                           </div>
                           <button onClick={() => handleDeleteLog(log.id)} className="text-slate-600 hover:text-red-500 transition-colors">
                              <Trash2 size={18} />
                           </button>
                        </div>

                        <div className="relative z-10 pl-4 border-l-2 border-slate-800">
                           <p className="text-sm font-serif text-slate-300 leading-relaxed italic">
                              "{log.justification}"
                           </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
                           <span className="text-[9px] font-black uppercase text-slate-600">
                              {new Date(log.created_at).toLocaleDateString()}
                           </span>
                        </div>
                     </div>
                  ))
               )}
            </div>
         )}

         {activeTab === 'stats' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               
               {/* Gráfico de Motivos */}
               <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                     <AlertTriangle size={18} className="text-red-500" /> Diagnóstico de Erros
                  </h3>
                  <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={reasonData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                           >
                              {reasonData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                              ))}
                           </Pie>
                           <ReTooltip 
                              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                              itemStyle={{ color: '#fff' }}
                           />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 justify-center">
                     {reasonData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                           <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{entry.name} ({entry.value})</span>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Gráfico de Disciplinas */}
               <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                     <TrendingUp size={18} className="text-blue-500" /> Pontos Fracos (Top 5)
                  </h3>
                  <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={disciplineData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                           <XAxis type="number" hide />
                           <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} />
                           <ReTooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                           <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                  <p className="text-center text-[10px] text-slate-500 mt-4 uppercase font-bold">Disciplinas com maior incidência de erros</p>
               </div>

            </div>
         )}

      </div>
    </div>
  );
};

export default ErrorLog;
