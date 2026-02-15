
import React, { useState } from 'react';
import { Newspaper, Search, ExternalLink, Scale, Clock, Bookmark, Filter, ShieldCheck } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const LegalNews: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Busque as decisões mais recentes e importantes sobre: ${query}. Resuma os pontos principais e cite se há Súmula ou Tema de Repercussão Geral associado.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text;
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      setResults({ text, chunks });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const trendingTopics = [
    "Tema 1046 STF",
    "Súmula 443 STJ",
    "Revisão da Vida Toda",
    "Marco Temporal"
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Dossiê de Jurisprudência</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-lg mt-1">Busca em tempo real nos Tribunais Superiores.</p>
        </div>
      </header>

      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-2 md:p-3 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl focus-within:border-usp-blue transition-all group">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center px-8 py-4">
            <Search className="w-7 h-7 text-slate-300 group-focus-within:text-usp-blue mr-5" />
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Pesquisar Tema, Súmula ou Matéria..." 
              className="flex-1 bg-transparent outline-none text-2xl font-black placeholder:text-slate-100 dark:placeholder:text-slate-800 text-slate-950 dark:text-white" 
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full md:w-32 py-5 bg-usp-blue text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-cyan-900/20 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? '...' : 'Consultar'}
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-3">
        {trendingTopics.map(t => (
          <button 
            key={t} 
            onClick={() => { setQuery(t); handleSearch(); }}
            className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-full border border-slate-200 dark:border-white/10 hover:border-usp-blue hover:text-usp-blue transition-all"
          >
            # {t}
          </button>
        ))}
      </div>

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8">
          <div className="lg:col-span-2 bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl border-t-[12px] border-t-usp-blue">
            <div className="flex items-center gap-4 mb-8">
              <Scale className="text-usp-blue w-8 h-8" />
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Parecer de Pesquisa</h3>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-serif text-lg leading-relaxed space-y-4">
              {results.text.split('\n').map((para: string, i: number) => para.trim() && (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-8 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-2">
                <Bookmark size={14} className="text-usp-gold" /> Fontes Oficiais
              </h3>
              <div className="space-y-4">
                {results.chunks?.map((chunk: any, i: number) => chunk.web && (
                  <a 
                    key={i} 
                    href={chunk.web.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 hover:border-usp-blue transition-all group"
                  >
                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase line-clamp-2 leading-tight mb-2 group-hover:text-usp-blue">
                      {chunk.web.title}
                    </p>
                    <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      <ExternalLink size={10} /> {new URL(chunk.web.uri).hostname}
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-emerald-500/10 p-6 rounded-[2rem] border border-emerald-500/30 flex items-start gap-3">
              <ShieldCheck className="text-emerald-500 w-5 h-5 flex-shrink-0" />
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-black uppercase leading-relaxed tracking-wider">
                Pesquisa fundamentada em dados públicos atualizados via Google Grounding.
              </p>
            </div>
          </div>
        </div>
      )}

      {!results && !isLoading && (
        <div className="py-20 text-center border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[4rem] flex flex-col items-center gap-6">
           <Newspaper className="w-16 h-16 text-slate-100 dark:text-white/5" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Aguardando termo para consulta de pauta.</p>
        </div>
      )}
    </div>
  );
};

export default LegalNews;
