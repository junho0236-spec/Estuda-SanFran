
import React, { useState, useEffect } from 'react';
import { Book, ChevronRight, CheckCircle2, Circle, ArrowLeft, BarChart3, Scale, Search, PenTool, Highlighter, Paperclip, X, Save, Trash2, Flame, Thermometer } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ArticleAnnotation } from '../types';

interface LawSection {
  title: string;
  start: number;
  end: number;
}

interface LawStructure {
  id: string;
  name: string;
  nickname: string;
  totalArticles: number;
  color: string;
  sections: LawSection[];
}

// --- MOCK DATA GENERATOR ---
const LAWS: LawStructure[] = [
  {
    id: 'cf',
    name: 'Constituição Federal',
    nickname: 'CRFB/88',
    totalArticles: 250,
    color: 'bg-usp-blue text-white',
    sections: [
      { title: 'Princípios Fundamentais', start: 1, end: 4 },
      { title: 'Direitos Fundamentais', start: 5, end: 17 },
      { title: 'Organização do Estado', start: 18, end: 43 },
      { title: 'Organização dos Poderes', start: 44, end: 135 },
      { title: 'Tributação e Orçamento', start: 145, end: 169 },
      { title: 'Ordem Econômica', start: 170, end: 192 },
      { title: 'Ordem Social', start: 193, end: 232 },
    ]
  },
  {
    id: 'cc',
    name: 'Código Civil',
    nickname: 'CC/02',
    totalArticles: 2046,
    color: 'bg-sanfran-rubi text-white',
    sections: [
      { title: 'Parte Geral', start: 1, end: 232 },
      { title: 'Obrigações', start: 233, end: 965 },
      { title: 'Empresa', start: 966, end: 1195 },
      { title: 'Coisas (Reais)', start: 1196, end: 1510 },
      { title: 'Família', start: 1511, end: 1783 },
      { title: 'Sucessões', start: 1784, end: 2027 },
    ]
  },
  {
    id: 'cpc',
    name: 'Processo Civil',
    nickname: 'CPC/15',
    totalArticles: 1072,
    color: 'bg-emerald-600 text-white',
    sections: [
      { title: 'Parte Geral', start: 1, end: 317 },
      { title: 'Processo de Conhecimento', start: 318, end: 538 },
      { title: 'Tutela Provisória', start: 294, end: 311 }, // Note: Ordem didática pode variar
      { title: 'Execução', start: 771, end: 925 },
      { title: 'Recursos', start: 994, end: 1044 },
    ]
  },
  {
    id: 'cp',
    name: 'Código Penal',
    nickname: 'CP',
    totalArticles: 361,
    color: 'bg-red-800 text-white',
    sections: [
      { title: 'Parte Geral', start: 1, end: 120 },
      { title: 'Pessoa', start: 121, end: 154 },
      { title: 'Patrimônio', start: 155, end: 183 },
      { title: 'Dignidade Sexual', start: 213, end: 234 },
      { title: 'Fé Pública', start: 289, end: 311 },
      { title: 'Administração Pública', start: 312, end: 359 },
    ]
  },
  {
    id: 'cpp',
    name: 'Processo Penal',
    nickname: 'CPP',
    totalArticles: 811,
    color: 'bg-slate-800 text-white',
    sections: [
      { title: 'Inquérito Policial', start: 4, end: 23 },
      { title: 'Ação Penal', start: 24, end: 62 },
      { title: 'Competência', start: 69, end: 91 },
      { title: 'Provas', start: 155, end: 250 },
      { title: 'Prisão e Liberdade', start: 282, end: 350 },
      { title: 'Nulidades', start: 563, end: 573 },
      { title: 'Recursos', start: 574, end: 667 },
    ]
  },
  {
    id: 'clt',
    name: 'Consolidação das Leis do Trabalho',
    nickname: 'CLT',
    totalArticles: 922,
    color: 'bg-orange-600 text-white',
    sections: [
      { title: 'Normas Gerais', start: 1, end: 56 },
      { title: 'Normas Especiais', start: 57, end: 510 },
      { title: 'Contrato Individual', start: 442, end: 510 },
      { title: 'Processo do Trabalho', start: 763, end: 910 },
    ]
  }
];

interface LeiSecaProps {
  userId: string;
}

const LeiSeca: React.FC<LeiSecaProps> = ({ userId }) => {
  const [selectedLaw, setSelectedLaw] = useState<LawStructure | null>(null);
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());
  const [annotations, setAnnotations] = useState<Record<string, ArticleAnnotation>>({});
  const [stats, setStats] = useState<Record<string, number>>({}); // lawId -> count
  
  // Heatmap State
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [maxClicks, setMaxClicks] = useState(1); // Para normalizar a cor

  // UI State
  const [loading, setLoading] = useState(false);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState<'yellow' | 'green' | 'pink' | 'blue' | 'none'>('none');

  // Fetch initial stats for dashboard
  useEffect(() => {
    fetchStats();
  }, [userId]);

  // Fetch specific law progress when selected
  useEffect(() => {
    if (selectedLaw) {
      fetchLawProgress(selectedLaw.id);
      fetchAnnotations(selectedLaw.id);
      fetchHeatmap(selectedLaw.id);
    }
  }, [selectedLaw, userId]);

  const fetchStats = async () => {
    const { data } = await supabase.from('user_law_progress').select('law_id').eq('user_id', userId);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(row => {
        counts[row.law_id] = (counts[row.law_id] || 0) + 1;
      });
      setStats(counts);
    }
  };

  const fetchLawProgress = async (lawId: string) => {
    const { data } = await supabase
      .from('user_law_progress')
      .select('article_id')
      .eq('user_id', userId)
      .eq('law_id', lawId);
    
    if (data) {
      setReadArticles(new Set(data.map(d => d.article_id)));
    }
  };

  const fetchAnnotations = async (lawId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('user_annotations')
      .select('*')
      .eq('user_id', userId)
      .eq('law_id', lawId);
    
    if (data) {
      const annotMap: Record<string, ArticleAnnotation> = {};
      data.forEach(annot => {
        annotMap[annot.article_id] = annot;
      });
      setAnnotations(annotMap);
    }
    setLoading(false);
  };

  const fetchHeatmap = async (lawId: string) => {
    try {
      const { data } = await supabase
        .from('user_article_heatmap')
        .select('article_id, click_count')
        .eq('user_id', userId)
        .eq('law_id', lawId);

      if (data) {
        const heatMap: Record<string, number> = {};
        let max = 1;
        data.forEach(row => {
          heatMap[row.article_id] = row.click_count;
          if (row.click_count > max) max = row.click_count;
        });
        setHeatmapData(heatMap);
        setMaxClicks(max);
      }
    } catch (e) {
      console.error("Erro ao carregar heatmap (tabela pode não existir ainda).");
    }
  };

  const incrementHeatmap = async (articleId: string) => {
    if (!selectedLaw) return;
    
    // Optimistic Update
    const currentCount = heatmapData[articleId] || 0;
    const newCount = currentCount + 1;
    setHeatmapData(prev => ({ ...prev, [articleId]: newCount }));
    if (newCount > maxClicks) setMaxClicks(newCount);

    try {
      // Upsert logic via Supabase
      // First try to select to see if it exists
      const { data: existing } = await supabase
        .from('user_article_heatmap')
        .select('id, click_count')
        .match({ user_id: userId, law_id: selectedLaw.id, article_id: articleId })
        .single();

      if (existing) {
        await supabase
          .from('user_article_heatmap')
          .update({ click_count: existing.click_count + 1 })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_article_heatmap')
          .insert({ user_id: userId, law_id: selectedLaw.id, article_id: articleId, click_count: 1 });
      }
    } catch (e) {
      console.error("Erro ao salvar heatmap:", e);
    }
  };

  const toggleArticleRead = async (articleId: string) => {
    if (!selectedLaw) return;
    
    const isRead = readArticles.has(articleId);
    const newSet = new Set(readArticles);
    
    if (isRead) {
      newSet.delete(articleId);
    } else {
      newSet.add(articleId);
    }
    setReadArticles(newSet);

    try {
      if (isRead) {
        await supabase
          .from('user_law_progress')
          .delete()
          .match({ user_id: userId, law_id: selectedLaw.id, article_id: articleId });
      } else {
        await supabase
          .from('user_law_progress')
          .insert({ user_id: userId, law_id: selectedLaw.id, article_id: articleId });
      }
      
      setStats(prev => ({
        ...prev,
        [selectedLaw.id]: (prev[selectedLaw.id] || 0) + (isRead ? -1 : 1)
      }));

    } catch (e) {
      console.error("Erro ao salvar progresso:", e);
      if (isRead) newSet.add(articleId); else newSet.delete(articleId);
      setReadArticles(newSet);
    }
  };

  const openAnnotationModal = (articleId: string) => {
    setCurrentArticle(articleId);
    const existing = annotations[articleId];
    setNoteContent(existing?.content || '');
    setNoteColor(existing?.color || 'none');
    setModalOpen(true);
  };

  const saveAnnotation = async () => {
    if (!selectedLaw || !currentArticle) return;

    // Check if empty (delete)
    if (!noteContent.trim() && noteColor === 'none') {
        const { error } = await supabase
            .from('user_annotations')
            .delete()
            .match({ user_id: userId, law_id: selectedLaw.id, article_id: currentArticle });
        
        if (!error) {
            const newAnnots = { ...annotations };
            delete newAnnots[currentArticle];
            setAnnotations(newAnnots);
        }
        setModalOpen(false);
        return;
    }

    // Upsert payload
    const payload = {
        user_id: userId,
        law_id: selectedLaw.id,
        article_id: currentArticle,
        content: noteContent,
        color: noteColor
    };

    try {
        const existing = annotations[currentArticle];
        let error;
        
        // Manually handling upsert logic for safety
        if (existing && existing.id) {
             const res = await supabase.from('user_annotations').update({ content: noteContent, color: noteColor }).eq('id', existing.id).select().single();
             if (res.data) setAnnotations(prev => ({ ...prev, [currentArticle]: res.data }));
             error = res.error;
        } else {
             // Check if exists in DB but not in state (rare)
             const { data: dbData } = await supabase.from('user_annotations').select('id').match({ user_id: userId, law_id: selectedLaw.id, article_id: currentArticle }).single();
             
             if (dbData) {
                 const res = await supabase.from('user_annotations').update({ content: noteContent, color: noteColor }).eq('id', dbData.id).select().single();
                 if (res.data) setAnnotations(prev => ({ ...prev, [currentArticle]: res.data }));
                 error = res.error;
             } else {
                 const res = await supabase.from('user_annotations').insert(payload).select().single();
                 if (res.data) {
                     setAnnotations(prev => ({ ...prev, [currentArticle]: res.data }));
                 }
                 error = res.error;
             }
        }

        if (error) throw error;
        setModalOpen(false);
    } catch (e: any) {
        alert("Erro ao salvar anotação. Verifique se a tabela 'user_annotations' foi criada.");
        console.error(e);
    }
  };

  const handleArticleClick = (articleId: string) => {
    // Independente do modo, sempre conta como "consultado" para o heatmap
    incrementHeatmap(articleId);

    if (isAnnotationMode) {
      openAnnotationModal(articleId);
    } else {
      toggleArticleRead(articleId);
    }
  };

  const getHighlightClass = (color: string) => {
    switch (color) {
        case 'yellow': return 'bg-yellow-200 text-yellow-900 border-yellow-300 dark:bg-yellow-900/60 dark:text-yellow-100 dark:border-yellow-700';
        case 'green': return 'bg-green-200 text-green-900 border-green-300 dark:bg-green-900/60 dark:text-green-100 dark:border-green-700';
        case 'pink': return 'bg-pink-200 text-pink-900 border-pink-300 dark:bg-pink-900/60 dark:text-pink-100 dark:border-pink-700';
        case 'blue': return 'bg-cyan-200 text-cyan-900 border-cyan-300 dark:bg-cyan-900/60 dark:text-cyan-100 dark:border-cyan-700';
        default: return '';
    }
  };

  const getHeatmapStyle = (count: number) => {
    // Gradiente: Azul (Frio/Pouco) -> Roxo -> Vermelho (Quente/Muito)
    if (count === 0) return 'bg-white dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10';
    
    // Normalização simplificada para thresholds
    if (count <= 2) return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-800'; // Cold
    if (count <= 5) return 'bg-indigo-200 text-indigo-800 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-700'; // Warm
    if (count <= 10) return 'bg-orange-300 text-orange-900 border-orange-400 dark:bg-orange-800/60 dark:text-orange-100 dark:border-orange-700'; // Hot
    return 'bg-red-500 text-white border-red-600 shadow-md shadow-red-500/30'; // Very Hot
  };

  // Render Grid of Articles
  const renderGrid = (start: number, end: number) => {
    const articles = [];
    for (let i = start; i <= end; i++) {
      const id = i.toString();
      const isRead = readArticles.has(id);
      const annotation = annotations[id];
      const hasNote = annotation && annotation.content && annotation.content.trim().length > 0;
      
      const clickCount = heatmapData[id] || 0;

      let buttonClass = '';
      if (isHeatmapMode) {
        buttonClass = getHeatmapStyle(clickCount);
      } else {
        const highlightClass = annotation && annotation.color !== 'none' ? getHighlightClass(annotation.color) : '';
        buttonClass = highlightClass ? highlightClass : 
          isRead 
            ? 'bg-slate-800 text-white border-slate-800 shadow-inner' 
            : 'bg-white dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10 hover:border-sanfran-rubi';
      }

      articles.push(
        <button
          key={id}
          onClick={() => handleArticleClick(id)}
          className={`relative w-10 h-10 rounded-xl text-[10px] font-black flex items-center justify-center transition-all border-2 ${buttonClass}`}
          title={isHeatmapMode ? `Art. ${id} - ${clickCount} consultas` : `Artigo ${id}º`}
        >
          {i}
          {/* Clip Icon if has note */}
          {!isHeatmapMode && hasNote && (
            <div className="absolute -top-2 -right-2 bg-white dark:bg-black rounded-full p-0.5 border border-slate-200 dark:border-white/20 shadow-sm z-10">
                <Paperclip size={10} className="text-sanfran-rubi" />
            </div>
          )}
          {/* Read Check if highlighted but also read */}
          {!isHeatmapMode && isRead && annotation && annotation.color !== 'none' && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                <CheckCircle2 size={12} className="opacity-50" />
             </div>
          )}
        </button>
      );
    }
    return articles;
  };

  if (selectedLaw) {
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-500 pb-20 px-2 md:px-0">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedLaw(null)} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-200" />
            </button>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedLaw.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`px-2 py-0.5 rounded text-[10px] font-black ${selectedLaw.color}`}>{selectedLaw.nickname}</span>
                 <span className="text-xs font-bold text-slate-400">{readArticles.size} / {selectedLaw.totalArticles} Lidos</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
             <div className="flex items-center gap-3">
                {isHeatmapMode && (
                   <div className="flex items-center gap-1 bg-white dark:bg-black/20 px-3 py-1 rounded-full border border-slate-100 dark:border-white/5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-sky-200"></span>
                      <span className="w-2 h-2 rounded-full bg-indigo-300"></span>
                      <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-[9px] font-bold uppercase text-slate-400 ml-1">Intensidade</span>
                   </div>
                )}
                
                <button 
                  onClick={() => setIsHeatmapMode(!isHeatmapMode)}
                  className={`p-3 rounded-xl transition-all shadow-sm flex items-center gap-2 ${isHeatmapMode ? 'bg-orange-100 text-orange-600 border-2 border-orange-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-orange-500'}`}
                  title="Modo Mapa de Calor"
                >
                   <Flame size={18} fill={isHeatmapMode ? "currentColor" : "none"} />
                </button>
             </div>

             <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                <button 
                  onClick={() => setIsAnnotationMode(false)}
                  disabled={isHeatmapMode}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!isAnnotationMode && !isHeatmapMode ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30'}`}
                >
                   <CheckCircle2 size={14} /> Leitura
                </button>
                <button 
                  onClick={() => setIsAnnotationMode(true)}
                  disabled={isHeatmapMode}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isAnnotationMode && !isHeatmapMode ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30'}`}
                >
                   <PenTool size={14} /> Grifo & Notas
                </button>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
          {selectedLaw.sections.map((section, idx) => (
            <div key={idx} className="bg-white dark:bg-sanfran-rubiDark/20 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/20 p-6 md:p-8 shadow-sm">
               <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase text-sm mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                  <Book size={16} className="text-slate-400" /> {section.title}
               </h3>
               <div className="flex flex-wrap gap-3">
                  {renderGrid(section.start, section.end)}
               </div>
            </div>
          ))}
        </div>

        {/* --- MODAL DE ANOTAÇÃO --- */}
        {modalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#1a0505] rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border-4 border-slate-100 dark:border-sanfran-rubi/30 relative overflow-hidden animate-in zoom-in-95 duration-300">
                 
                 <div className="absolute top-0 right-0 p-6">
                    <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                       <X size={24} />
                    </button>
                 </div>

                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">
                    Artigo {currentArticle}º
                 </h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Vade Mecum Pessoal</p>

                 <div className="space-y-6">
                    {/* Color Picker */}
                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block flex items-center gap-2">
                          <Highlighter size={14} /> Marca-texto
                       </label>
                       <div className="flex gap-3">
                          {[
                             { id: 'none', bg: 'bg-slate-100 dark:bg-white/10', border: 'border-slate-200 dark:border-white/20' },
                             { id: 'yellow', bg: 'bg-yellow-300', border: 'border-yellow-500' },
                             { id: 'green', bg: 'bg-green-400', border: 'border-green-600' },
                             { id: 'blue', bg: 'bg-cyan-300', border: 'border-cyan-500' },
                             { id: 'pink', bg: 'bg-pink-300', border: 'border-pink-500' },
                          ].map((c) => (
                             <button
                                key={c.id}
                                onClick={() => setNoteColor(c.id as any)}
                                className={`w-10 h-10 rounded-full border-4 transition-transform ${c.bg} ${c.border} ${noteColor === c.id ? 'scale-125 ring-2 ring-offset-2 ring-slate-300 dark:ring-slate-600' : 'hover:scale-110'}`}
                                title={c.id === 'none' ? 'Sem cor' : c.id}
                             >
                                {c.id === 'none' && <X size={16} className="text-slate-400 mx-auto" />}
                             </button>
                          ))}
                       </div>
                    </div>

                    {/* Text Area */}
                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block flex items-center gap-2">
                          <Paperclip size={14} /> Remissões e Notas
                       </label>
                       <textarea 
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Ex: Vide Súmula Vinculante 13..."
                          className="w-full h-40 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-serif text-lg text-slate-800 dark:text-slate-200 outline-none focus:border-sanfran-rubi resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600 leading-relaxed"
                       />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                       <button 
                          onClick={saveAnnotation}
                          className="flex-1 py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-sanfran-rubiDark transition-all flex items-center justify-center gap-2"
                       >
                          <Save size={16} /> Salvar Anotação
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/20 mb-4">
              <Book className="w-4 h-4 text-sanfran-rubi" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Legislação Seca</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Vade Mecum Digital</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Controle de leitura e revisão dos códigos.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {LAWS.map((law) => {
          const count = stats[law.id] || 0;
          const percentage = Math.min(100, Math.round((count / law.totalArticles) * 100));
          
          return (
            <button 
              key={law.id} 
              onClick={() => setSelectedLaw(law)}
              className="group bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg hover:shadow-2xl transition-all text-left relative overflow-hidden"
            >
               <div className={`absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity`}>
                  <Scale size={80} />
               </div>

               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${law.color}`}>
                  <Book size={24} />
               </div>

               <div className="relative z-10">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{law.nickname}</h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{law.name}</p>
               </div>

               <div className="mt-8 space-y-2 relative z-10">
                  <div className="flex justify-between items-end">
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Progresso</span>
                     <span className="text-sm font-black text-slate-900 dark:text-white">{percentage}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-black/20 rounded-full overflow-hidden">
                     <div className={`h-full rounded-full transition-all duration-1000 ${law.color.split(' ')[0]}`} style={{ width: `${percentage}%` }}></div>
                  </div>
               </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeiSeca;
