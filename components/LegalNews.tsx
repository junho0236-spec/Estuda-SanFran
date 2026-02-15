
import React, { useState } from 'react';
import { Newspaper, Search, ExternalLink, Scale, Clock, Bookmark, MapPin, ShieldCheck, Sparkles, Navigation, AlertTriangle, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const LegalNews: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [mapResults, setMapResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'news' | 'courts'>('news');

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResults(null);
    setMapResults([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      
      if (activeTab === 'news') {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Jurisprudência e notícias recentes sobre: ${query}. Resuma tecnicamente.`,
          config: { tools: [{ googleSearch: {} }] }
        });
        setResults({ text: response.text, chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks });
      } else {
        // Timeout para Geolocation para não travar o botão
        const locationPromise = new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 3000); // 3 segundos de limite
          navigator.geolocation.getCurrentPosition(
            (pos) => { clearTimeout(timeout); resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
            () => { clearTimeout(timeout); resolve(null); }
          );
        });

        const latLng = await locationPromise;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Liste tribunais e fóruns em ${query}.`,
          config: { 
            tools: [{ googleMaps: {} }],
            toolConfig: latLng ? { retrievalConfig: { latLng: latLng as any } } : undefined
          }
        });
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        setMapResults(chunks.filter((c: any) => c.maps));
        setResults({ text: response.text, chunks: [] });
      }
    } catch (err: any) {
      console.error(err);
      setError("Falha na consulta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Consultoria IA</h2>
        </div>
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
           <button onClick={() => setActiveTab('news')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'news' ? 'bg-usp-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Jurisprudência</button>
           <button onClick={() => setActiveTab('courts')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'courts' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Tribunais</button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-900/30 p-6 rounded-[2rem] flex items-center gap-4">
           <AlertTriangle className="text-red-600 w-8 h-8" />
           <p className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-tight">{error}</p>
        </div>
      )}

      <div className={`bg-white dark:bg-sanfran-rubiDark/30 p-2 md:p-3 rounded-[3rem] border-2 shadow-2xl transition-all ${activeTab === 'news' ? 'focus-within:border-usp-blue' : 'focus-within:border-emerald-500'} border-slate-200 dark:border-sanfran-rubi/30`}>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center px-8 py-4">
            {activeTab === 'news' ? <Search className="w-7 h-7 text-slate-300 mr-5" /> : <MapPin className="w-7 h-7 text-slate-300 mr-5" />}
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder={activeTab === 'news' ? "Matéria Jurídica..." : "Sua Cidade..."} 
              className="flex-1 bg-transparent outline-none text-2xl font-black text-slate-950 dark:text-white" 
            />
          </div>
          <button type="submit" disabled={isLoading} className={`w-full md:w-40 py-5 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'news' ? 'bg-usp-blue' : 'bg-emerald-500'}`}>
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Consultar'}
          </button>
        </form>
      </div>

      {results && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={`lg:col-span-2 bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] p-10 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl border-t-[12px] ${activeTab === 'news' ? 'border-t-usp-blue' : 'border-t-emerald-500'}`}>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6">Parecer IA</h3>
            <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-serif text-lg leading-relaxed">
              {results.text}
            </div>
          </div>
          <div className="lg:col-span-1 space-y-4">
            {mapResults.map((chunk, i) => (
              <a key={i} href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="block p-4 bg-white dark:bg-white/5 rounded-2xl border-2 border-emerald-500/20 hover:border-emerald-500 transition-all">
                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase mb-1">{chunk.maps.title}</p>
                <span className="text-[8px] font-bold text-emerald-500 uppercase">Ver no Mapa</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalNews;
