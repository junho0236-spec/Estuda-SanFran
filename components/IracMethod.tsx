
import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Save, X, BookOpen, Scale, Gavel, FileSearch, Check, Archive, Bookmark } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { IracEntry } from '../types';

interface IracMethodProps {
  userId: string;
}

const IracMethod: React.FC<IracMethodProps> = ({ userId }) => {
  const [entries, setEntries] = useState<IracEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    facts: '',
    issue: '',
    rule: '',
    analysis: '',
    conclusion: '',
    tags: ''
  });

  useEffect(() => {
    fetchEntries();
  }, [userId]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('irac_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setEntries(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.issue.trim()) {
      alert("Título e Questão Jurídica são obrigatórios.");
      return;
    }

    try {
      const { data, error } = await supabase.from('irac_entries').insert({
        user_id: userId,
        case_title: formData.title,
        facts: formData.facts,
        issue: formData.issue,
        rule: formData.rule,
        analysis: formData.analysis,
        conclusion: formData.conclusion,
        tags: formData.tags
      }).select().single();

      if (error) throw error;
      if (data) setEntries([data, ...entries]);
      
      setIsCreating(false);
      setFormData({
        title: '', facts: '', issue: '', rule: '', analysis: '', conclusion: '', tags: ''
      });
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar fichamento.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Descartar esta ficha permanentemente?")) return;
    try {
      await supabase.from('irac_entries').delete().eq('id', id);
      setEntries(entries.filter(e => e.id !== id));
    } catch (e) { console.error(e); }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-6xl mx-auto h-full flex flex-col font-serif">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 font-sans">
        <div>
           <div className="inline-flex items-center gap-2 bg-[#fdfbf7] border-2 border-[#e7e5e4] dark:bg-[#292524] dark:border-[#44403c] px-4 py-2 rounded-full mb-4 shadow-sm">
              <FileText className="w-4 h-4 text-amber-700 dark:text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400">Método de Estudo de Caso</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Fichamento IRAC</h2>
           <p className="text-lg font-medium text-slate-500 mt-2 italic">Issue, Rule, Analysis, Conclusion. O padrão ouro da análise jurídica.</p>
        </div>
        
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-8 py-4 bg-amber-900 dark:bg-amber-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
        >
           <Plus size={16} /> Nova Ficha
        </button>
      </header>

      {/* CREATE MODAL */}
      {isCreating && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-[#fdfbf7] dark:bg-[#1c1917] w-full max-w-4xl h-[90vh] rounded-[2rem] shadow-2xl border-4 border-[#e7e5e4] dark:border-[#292524] relative flex flex-col overflow-hidden">
               
               {/* Modal Header */}
               <div className="p-6 border-b border-[#e7e5e4] dark:border-[#292524] flex justify-between items-center bg-white dark:bg-[#0d0303]">
                  <div>
                     <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tight">Novo Fichamento</h3>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preencha os campos estruturados</p>
                  </div>
                  <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400"><X size={24} /></button>
               </div>

               {/* Form Content */}
               <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Identificação do Caso / Acórdão</label>
                     <input 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="Ex: RE 574.706 (Tese do Século)"
                        className="w-full p-4 bg-white dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-lg outline-none focus:border-amber-500 transition-colors"
                     />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* FACTS */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                           <BookOpen size={14} /> Fatos Relevantes (Facts)
                        </label>
                        <textarea 
                           value={formData.facts} 
                           onChange={e => setFormData({...formData, facts: e.target.value})}
                           placeholder="O que aconteceu? Quem fez o quê para quem?"
                           className="w-full h-40 p-4 bg-white dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl font-serif text-slate-700 dark:text-slate-300 leading-relaxed outline-none focus:border-amber-500 resize-none transition-colors"
                        />
                     </div>

                     {/* ISSUE */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                           <FileSearch size={14} /> Questão Jurídica (Issue)
                        </label>
                        <textarea 
                           value={formData.issue} 
                           onChange={e => setFormData({...formData, issue: e.target.value})}
                           placeholder="Qual a pergunta legal que o juiz deve responder?"
                           className="w-full h-40 p-4 bg-white dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl font-serif text-slate-700 dark:text-slate-300 leading-relaxed outline-none focus:border-amber-500 resize-none transition-colors"
                        />
                     </div>

                     {/* RULE */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                           <Scale size={14} /> Fundamento / Regra (Rule)
                        </label>
                        <textarea 
                           value={formData.rule} 
                           onChange={e => setFormData({...formData, rule: e.target.value})}
                           placeholder="Qual lei, princípio ou precedente se aplica?"
                           className="w-full h-40 p-4 bg-white dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl font-serif text-slate-700 dark:text-slate-300 leading-relaxed outline-none focus:border-amber-500 resize-none transition-colors"
                        />
                     </div>

                     {/* ANALYSIS */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                           <Gavel size={14} /> Análise / Aplicação (Analysis)
                        </label>
                        <textarea 
                           value={formData.analysis} 
                           onChange={e => setFormData({...formData, analysis: e.target.value})}
                           placeholder="Como a regra se aplica aos fatos deste caso específico?"
                           className="w-full h-40 p-4 bg-white dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl font-serif text-slate-700 dark:text-slate-300 leading-relaxed outline-none focus:border-amber-500 resize-none transition-colors"
                        />
                     </div>
                  </div>

                  {/* CONCLUSION */}
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                        <Check size={14} /> Conclusão / Decisão (Conclusion)
                     </label>
                     <textarea 
                        value={formData.conclusion} 
                        onChange={e => setFormData({...formData, conclusion: e.target.value})}
                        placeholder="Qual foi o veredito final?"
                        className="w-full h-24 p-4 bg-white dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl font-serif text-slate-700 dark:text-slate-300 leading-relaxed outline-none focus:border-amber-500 resize-none transition-colors"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Área / Tags (Opcional)</label>
                     <input 
                        value={formData.tags} 
                        onChange={e => setFormData({...formData, tags: e.target.value})}
                        placeholder="Ex: Direito Civil, Contratos"
                        className="w-full p-4 bg-white dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-amber-500 transition-colors"
                     />
                  </div>

               </div>

               {/* Modal Footer */}
               <div className="p-6 border-t border-[#e7e5e4] dark:border-[#292524] bg-white dark:bg-[#0d0303] flex justify-end gap-3">
                  <button onClick={() => setIsCreating(false)} className="px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">Cancelar</button>
                  <button onClick={handleSave} className="px-8 py-3 bg-amber-900 dark:bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2">
                     <Save size={16} /> Arquivar Ficha
                  </button>
               </div>

            </div>
         </div>
      )}

      {/* CARDS GRID */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[400px]">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase font-sans">Consultando o Arquivo...</div>
         ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-[#e7e5e4] dark:border-[#292524] rounded-[3rem]">
               <Archive size={48} className="text-slate-400 mb-4" />
               <p className="text-xl font-black text-slate-500 uppercase font-sans">Arquivo Vazio</p>
               <p className="text-xs font-bold text-slate-400 mt-2 font-sans">Nenhum caso fichado ainda.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 gap-6">
               {entries.map(entry => {
                  const isExpanded = expandedId === entry.id;
                  
                  return (
                     <div 
                        key={entry.id} 
                        onClick={() => toggleExpand(entry.id)}
                        className={`group bg-[#fdfbf7] dark:bg-[#1c1917] border border-[#e7e5e4] dark:border-[#292524] rounded-sm shadow-md hover:shadow-xl transition-all relative overflow-hidden cursor-pointer ${isExpanded ? 'ring-2 ring-amber-200 dark:ring-amber-900' : ''}`}
                        style={{
                           backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
                           backgroundSize: '100% 28px',
                           lineHeight: '28px'
                        }}
                     >
                        {/* Red Margin Line */}
                        <div className="absolute top-0 bottom-0 left-12 w-0.5 bg-red-200/50 dark:bg-red-900/30"></div>
                        
                        {/* Hole Punch Visuals */}
                        <div className="absolute top-6 left-4 w-4 h-4 rounded-full bg-[#f1f5f9] dark:bg-[#0f172a] shadow-inner"></div>
                        <div className="absolute bottom-6 left-4 w-4 h-4 rounded-full bg-[#f1f5f9] dark:bg-[#0f172a] shadow-inner"></div>

                        <div className="pl-20 pr-8 py-6 relative z-10">
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-sans bg-[#fdfbf7]/80 dark:bg-[#1c1917]/80 inline-block px-1">
                                    {entry.case_title}
                                 </h3>
                                 {entry.tags && (
                                    <div className="mt-1">
                                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded font-sans no-underline">
                                          {entry.tags}
                                       </span>
                                    </div>
                                 )}
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={(e) => handleDelete(entry.id, e)} className="p-2 text-slate-300 hover:text-red-500 bg-white dark:bg-black rounded-lg shadow-sm">
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                           </div>

                           <div className="space-y-6 text-slate-700 dark:text-slate-300 text-lg">
                              {/* ISSUE (Always Visible Summary) */}
                              <div>
                                 <span className="font-bold text-amber-700 dark:text-amber-500 uppercase text-xs tracking-widest font-sans bg-[#fdfbf7]/80 dark:bg-[#1c1917]/80 px-1">Questão (Issue):</span>
                                 <p className="mt-1">{entry.issue}</p>
                              </div>

                              {isExpanded && (
                                 <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                                    <div>
                                       <span className="font-bold text-slate-500 uppercase text-xs tracking-widest font-sans bg-[#fdfbf7]/80 dark:bg-[#1c1917]/80 px-1">Fatos (Facts):</span>
                                       <p className="mt-1">{entry.facts}</p>
                                    </div>
                                    <div>
                                       <span className="font-bold text-slate-500 uppercase text-xs tracking-widest font-sans bg-[#fdfbf7]/80 dark:bg-[#1c1917]/80 px-1">Fundamento (Rule):</span>
                                       <p className="mt-1">{entry.rule}</p>
                                    </div>
                                    <div>
                                       <span className="font-bold text-slate-500 uppercase text-xs tracking-widest font-sans bg-[#fdfbf7]/80 dark:bg-[#1c1917]/80 px-1">Análise (Analysis):</span>
                                       <p className="mt-1">{entry.analysis}</p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-200 dark:border-white/10 mt-4">
                                       <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-xs tracking-widest font-sans bg-[#fdfbf7]/80 dark:bg-[#1c1917]/80 px-1">Decisão (Conclusion):</span>
                                       <p className="mt-1 font-bold">{entry.conclusion}</p>
                                    </div>
                                 </div>
                              )}
                           </div>
                           
                           {!isExpanded && (
                              <div className="mt-4 text-center font-sans">
                                 <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Clique para ler a ficha completa</span>
                              </div>
                           )}
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>
    </div>
  );
};

export default IracMethod;
