
import React, { useState, useEffect } from 'react';
import { FileSignature, Book, Copy, Check, Info, FileText, ChevronRight, Gavel, Scale, Briefcase, Plus, Search } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { PetitumTemplate, PetitumSection } from '../types';

interface PetitumProps {
  userId: string;
}

const Petitum: React.FC<PetitumProps> = ({ userId }) => {
  const [templates, setTemplates] = useState<PetitumTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PetitumTemplate | null>(null);
  const [activeSection, setActiveSection] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  // Load Templates
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from('petitum_templates').select('*').order('created_at', { ascending: false });
      if (data) setTemplates(data);
    } catch (e) {
      console.error("Erro ao carregar modelos:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const copyStructure = () => {
    if (!selectedTemplate) return;
    const fullText = selectedTemplate.structure.map(s => `[${s.title}]\n${s.skeleton}`).join('\n\n');
    
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const categories = ['Todas', ...Array.from(new Set(templates.map(t => t.category)))];
  const filteredTemplates = categoryFilter === 'Todas' ? templates : templates.filter(t => t.category === categoryFilter);

  // --- MODO LISTA ---
  if (!selectedTemplate) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
          <div>
             <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/20 px-4 py-2 rounded-full border border-teal-200 dark:border-teal-800 mb-4">
                <FileSignature className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Repositório de Peças</span>
             </div>
             <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Petitum</h2>
             <p className="text-slate-500 font-bold italic text-lg mt-2">Domine a estrutura processual para a 2ª Fase.</p>
          </div>
        </header>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
           {categories.map(cat => (
             <button
               key={cat}
               onClick={() => setCategoryFilter(cat)}
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoryFilter === cat ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}
             >
               {cat}
             </button>
           ))}
        </div>

        {/* Grid de Modelos */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
           {isLoading ? (
             <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div></div>
           ) : filteredTemplates.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                <FileText size={48} className="mb-4 text-slate-400" />
                <p className="font-bold text-slate-500">Nenhum modelo encontrado.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(template => (
                   <button 
                     key={template.id}
                     onClick={() => { setSelectedTemplate(template); setActiveSection(0); }}
                     className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all text-left group relative overflow-hidden"
                   >
                      <div className={`absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity`}>
                         <Scale size={80} />
                      </div>
                      
                      <div className="relative z-10">
                         <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500">{template.category}</span>
                         </div>
                         <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight mb-2">{template.title}</h3>
                         <p className="text-xs font-medium text-slate-500 line-clamp-2">{template.description}</p>
                      </div>
                      
                      <div className="mt-6 flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                         Estudar Estrutura <ChevronRight size={14} />
                      </div>
                   </button>
                ))}
             </div>
           )}
        </div>
      </div>
    );
  }

  // --- MODO DETALHE (SPLIT VIEW) ---
  return (
    <div className="h-full flex flex-col animate-in zoom-in-95 duration-300 pb-20 md:pb-0">
       
       {/* Header */}
       <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
             <button onClick={() => setSelectedTemplate(null)} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 transition-colors">
                <ChevronRight className="rotate-180 w-5 h-5 text-slate-600" />
             </button>
             <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedTemplate.title}</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedTemplate.category} • {selectedTemplate.structure.length} Seções</p>
             </div>
          </div>
          <button 
            onClick={copyStructure}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-teal-500 hover:text-white'}`}
          >
             {copied ? <Check size={16} /> : <Copy size={16} />}
             {copied ? 'Copiado!' : 'Copiar Esqueleto'}
          </button>
       </div>

       <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-8">
          
          {/* COLUNA ESQUERDA: A PEÇA (DOCUMENTO) */}
          <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden flex flex-col relative">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
             
             <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar space-y-8">
                {selectedTemplate.structure.map((section, idx) => {
                   const isActive = activeSection === idx;
                   return (
                     <div 
                       key={idx}
                       onClick={() => setActiveSection(idx)}
                       className={`p-6 rounded-xl border-l-4 transition-all cursor-pointer group ${isActive ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-500' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300'}`}
                     >
                        <h4 className={`text-xs font-black uppercase tracking-widest mb-3 ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400 group-hover:text-slate-600'}`}>
                           {section.title}
                        </h4>
                        <p className="font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                           {section.skeleton}
                        </p>
                     </div>
                   );
                })}
             </div>
             
             <div className="p-4 bg-slate-50 dark:bg-black/20 text-center border-t border-slate-100 dark:border-white/5">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">Fim do Documento</span>
             </div>
          </div>

          {/* COLUNA DIREITA: O MENTOR (EXPLICAÇÃO) */}
          <div className="lg:w-96 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2.5rem] p-8 shadow-2xl flex flex-col shrink-0 relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Info size={120} />
             </div>

             <div className="relative z-10 flex-1 flex flex-col justify-center">
                {activeSection !== null ? (
                   <div className="animate-in slide-in-from-right-4 duration-300">
                      <div className="w-12 h-12 bg-white/20 dark:bg-black/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                         <span className="font-black text-xl">{activeSection + 1}</span>
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tight mb-4 leading-tight">
                         {selectedTemplate.structure[activeSection].title}
                      </h3>
                      <div className="w-12 h-1 bg-teal-500 mb-6"></div>
                      <p className="text-lg font-medium leading-relaxed opacity-90">
                         {selectedTemplate.structure[activeSection].explanation}
                      </p>
                   </div>
                ) : (
                   <div className="text-center opacity-50">
                      <p className="text-sm font-bold uppercase tracking-widest">Selecione uma seção para ver a explicação técnica.</p>
                   </div>
                )}
             </div>

             <div className="mt-8 pt-6 border-t border-white/10 dark:border-black/10 relative z-10">
                <div className="flex items-center gap-3 opacity-60">
                   <Gavel size={16} />
                   <p className="text-[10px] font-black uppercase tracking-widest">Dica do Examinador</p>
                </div>
             </div>
          </div>

       </div>
    </div>
  );
};

export default Petitum;
