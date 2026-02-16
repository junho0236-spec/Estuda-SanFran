
import React, { useState, useEffect } from 'react';
import { Book, ChevronRight, CheckCircle2, Circle, ArrowLeft, BarChart3, Scale, Search } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

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
// Como não podemos ter o texto completo, geramos a estrutura de artigos.
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
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({}); // lawId -> count

  // Fetch initial stats for dashboard
  useEffect(() => {
    fetchStats();
  }, [userId]);

  // Fetch specific law progress when selected
  useEffect(() => {
    if (selectedLaw) {
      fetchLawProgress(selectedLaw.id);
    }
  }, [selectedLaw, userId]);

  const fetchStats = async () => {
    // In a real app with huge data, we would use a specialized RPC function or a view.
    // Here we fetch all progress to count client-side for the prototype.
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
    setLoading(true);
    const { data } = await supabase
      .from('user_law_progress')
      .select('article_id')
      .eq('user_id', userId)
      .eq('law_id', lawId);
    
    if (data) {
      setReadArticles(new Set(data.map(d => d.article_id)));
    }
    setLoading(false);
  };

  const toggleArticle = async (articleId: string) => {
    if (!selectedLaw) return;
    
    const isRead = readArticles.has(articleId);
    const newSet = new Set(readArticles);
    
    // Optimistic update
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
      
      // Update local stats for dashboard
      setStats(prev => ({
        ...prev,
        [selectedLaw.id]: (prev[selectedLaw.id] || 0) + (isRead ? -1 : 1)
      }));

    } catch (e) {
      console.error("Erro ao salvar progresso:", e);
      // Revert on error
      if (isRead) newSet.add(articleId); else newSet.delete(articleId);
      setReadArticles(newSet);
    }
  };

  // Render Grid of Articles
  const renderGrid = (start: number, end: number) => {
    const articles = [];
    for (let i = start; i <= end; i++) {
      const id = i.toString();
      const isRead = readArticles.has(id);
      articles.push(
        <button
          key={id}
          onClick={() => toggleArticle(id)}
          className={`w-8 h-8 rounded-md text-[9px] font-black flex items-center justify-center transition-all ${
            isRead 
              ? 'bg-emerald-500 text-white shadow-sm scale-95' 
              : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
          }`}
          title={`Artigo ${id}º`}
        >
          {i}
        </button>
      );
    }
    return <div className="flex flex-wrap gap-2">{articles}</div>;
  };

  if (selectedLaw) {
    const progress = readArticles.size;
    const total = selectedLaw.totalArticles;
    const percentage = Math.round((progress / total) * 100);

    return (
      <div className="space-y-6 h-full flex flex-col animate-in slide-in-from-right-8 duration-500 pb-20 px-2 md:px-0">
        {/* Header Lei Selecionada */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedLaw(null)} 
              className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:text-sanfran-rubi transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                 <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-white">{selectedLaw.nickname}</h2>
                 <span className={`px-2 py-0.5 rounded text-[10px] font-black ${selectedLaw.color}`}>{selectedLaw.name}</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {progress} de {total} artigos lidos ({percentage}%)
              </p>
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10">
             <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
        </header>

        {/* Content Lei */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
           {/* General Progress Bar */}
           <div className="w-full h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sanfran-rubi transition-all duration-1000"
                style={{ width: `${percentage}%` }}
              />
           </div>

           {/* Sections */}
           {selectedLaw.sections.map((section, idx) => (
             <div key={idx} className="bg-white dark:bg-sanfran-rubiDark/30 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{section.title}</h3>
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Arts. {section.start} a {section.end}</span>
                </div>
                {renderGrid(section.start, section.end)}
             </div>
           ))}
           
           {/* Fallback for remaining articles not in sections */}
           <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 opacity-70">
              <h3 className="font-black text-slate-500 uppercase text-xs tracking-widest mb-4">Disposições Finais e Transitórias</h3>
              <p className="text-[10px] text-slate-400 mb-4">Artigos fora das seções principais mapeadas.</p>
              {/* Simple grid check for visual completeness if specific sections don't cover all */}
           </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD (LIVRARIA) ---
  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="inline-flex items-center gap-2 bg-rose-100 dark:bg-rose-900/20 px-4 py-2 rounded-full border border-rose-200 dark:border-rose-800 mb-4">
              <Scale className="w-4 h-4 text-rose-700 dark:text-rose-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">Vade Mecum Visual</span>
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Lei Seca</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Acompanhe sua leitura dos códigos artigo por artigo.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {LAWS.map(law => {
          const count = stats[law.id] || 0;
          const percent = Math.round((count / law.totalArticles) * 100);
          
          return (
            <button 
              key={law.id}
              onClick={() => setSelectedLaw(law)}
              className="group relative bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 hover:border-slate-300 dark:hover:border-white/20 shadow-xl hover:shadow-2xl transition-all text-left overflow-hidden"
            >
               {/* Spine Decoration */}
               <div className={`absolute top-0 left-0 w-3 h-full ${law.color}`} />
               
               <div className="pl-4 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${law.color}`}>
                        <Book size={20} />
                     </div>
                     <div className="text-right">
                        <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{percent}%</span>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Lido</span>
                     </div>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">{law.nickname}</h3>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{law.name}</p>
                  
                  <div className="mt-6">
                     <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-2">
                        <span>Progresso</span>
                        <span>{count}/{law.totalArticles} Arts.</span>
                     </div>
                     <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                           className={`h-full ${law.color} transition-all duration-1000`} 
                           style={{ width: `${percent}%` }}
                        />
                     </div>
                  </div>
               </div>

               <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  <Scale size={150} />
               </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeiSeca;
