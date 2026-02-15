
import React, { useState } from 'react';
import { Newspaper, Search, ExternalLink, Scale, Clock, Bookmark, MapPin, ShieldCheck, Sparkles, Navigation } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const LegalNews: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [mapResults, setMapResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'news' | 'courts'>('news');

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      
      if (activeTab === 'news') {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Busque jurisprudência e notícias jurídicas recentes sobre: ${query}. Resuma e cite fontes oficiais.`,
          config: { tools: [{ googleSearch: {} }] }
        });
        setResults({ text: response.text, chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks });
      } else {
        // Busca de Tribunais usando Google Maps Grounding (Suportado no Gemini 2.5)
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          contents: `Quais tribunais, fóruns ou órgãos judiciários de ${query} estão próximos?`,
          config: { tools: [{ googleMaps: {} }] }
        });
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        setMapResults(chunks.filter((c: any) => c.maps));
        setResults({ text: response.text, chunks: [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Consultoria IA</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-lg mt-1">Jurisprudência e Localização de Órgãos.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
           <button onClick={() => setActiveTab('news')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'news' ? 'bg-usp-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Jurisprudência</button>
           <button onClick={() => setActiveTab('courts')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'courts' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Tribunais</button>
        </div>
      </header>

      <div className={`bg-white dark:bg-sanfran-rubiDark/30 p-2 md:p-3 rounded-[3rem] border-2 shadow-2xl transition-all group ${activeTab === 'news' ? 'focus-within:border-usp-blue' : 'focus-within:border-emerald-500'} border-slate-200 dark:border-sanfran-rubi/30`}>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center px-8 py-4">
            {activeTab === 'news' ? <Search className="w-7 h-7 text-slate-300 mr-5" /> : <MapPin className="w-7 h-7 text-slate-300 mr-5" />}
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder={activeTab === 'news' ? "Pesquisar Matéria ou Tema..." : "Digite sua cidade ou bairro..."} 
              className="flex-1 bg-transparent outline-none text-2xl font-black text-slate-950 dark:text-white" 
            />
          </div>
          <button type="submit" disabled={isLoading} className={`w-full md:w-32 py-5 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 ${activeTab === 'news' ? 'bg-usp-blue' : 'bg-emerald-500'}`}>
            {isLoading ? '...' : 'Consultar'}
          </button>
        </form>
      </div>

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8">
          <div className={`lg:col-span-2 bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl border-t-[12px] ${activeTab === 'news' ? 'border-t-usp-blue' : 'border-t-emerald-500'}`}>
            <div className="flex items-center gap-4 mb-8">
              {activeTab === 'news' ? <Scale className="text-usp-blue w-8 h-8" /> : <Navigation className="text-emerald-500 w-8 h-8" />}
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Relatório IA</h3>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-serif text-lg leading-relaxed space-y-4">
              {results.text.split('\n').map((para: string, i: number) => para.trim() && <p key={i}>{para}</p>)}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-8 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-2">
                <Bookmark size={14} className={activeTab === 'news' ? 'text-usp-blue' : 'text-emerald-500'} /> 
                {activeTab === 'news' ? 'Fontes Oficiais' : 'Locais Sugeridos'}
              </h3>
              <div className="space-y-4">
                {activeTab === 'news' ? (
                  results.chunks?.map((chunk: any, i: number) => chunk.web && (
                    <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="block p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 hover:border-usp-blue transition-all">
                      <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase line-clamp-2 leading-tight mb-2">{chunk.web.title}</p>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new URL(chunk.web.uri).hostname}</div>
                    </a>
                  ))
                ) : (
                  mapResults.map((chunk, i) => (
                    <a key={i} href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="block p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 hover:border-emerald-500 transition-all">
                       <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase mb-2">{chunk.maps.title || 'Órgão Judiciário'}</p>
                       <div className="flex items-center gap-2 text-[8px] font-bold text-emerald-500 uppercase tracking-widest">
                          <Navigation size={10} /> Ver no Mapa
                       </div>
                    </a>
                  ))
                )}
                {((activeTab === 'news' && !results.chunks?.length) || (activeTab === 'courts' && !mapResults.length)) && (
                   <p className="text-[9px] text-slate-400 uppercase font-black text-center py-4">Nenhuma referência adicional.</p>
                )}
              </div>
            </div>
            <div className="bg-usp-gold/5 p-6 rounded-[2rem] border border-usp-gold/20 flex items-start gap-3">
              <Sparkles className="text-usp-gold w-5 h-5 flex-shrink-0" />
              <p className="text-[10px] text-usp-gold dark:text-usp-gold/80 font-black uppercase tracking-wider leading-relaxed">
                Resultados fundamentados em tempo real. Sempre verifique o Diário Oficial.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalNews;
