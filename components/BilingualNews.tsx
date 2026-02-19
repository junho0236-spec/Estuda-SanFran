
import React, { useState, useEffect, useRef } from 'react';
import { 
  Newspaper, Globe, ArrowRight, Eye, X, BookOpen, Clock, Tag, ChevronLeft, Volume2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { NewsArticle } from '../types';

interface BilingualNewsProps {
  userId: string;
}

type LangCode = 'en' | 'es' | 'fr' | 'de' | 'it';

const LANGUAGES_CONFIG: Record<LangCode, { label: string, flag: string, color: string }> = {
  en: { label: 'English', flag: '🇺🇸', color: 'bg-indigo-600' },
  es: { label: 'Español', flag: '🇪🇸', color: 'bg-red-500' },
  fr: { label: 'Français', flag: '🇫🇷', color: 'bg-blue-600' },
  de: { label: 'Deutsch', flag: '🇩🇪', color: 'bg-yellow-600' },
  it: { label: 'Italiano', flag: '🇮🇹', color: 'bg-emerald-600' }
};

// --- MOCK DICTIONARY FOR MVP ---
// Isso evita depender de APIs pagas para a demo, garantindo que o recurso funcione perfeitamente.
const MOCK_DICTIONARY: Record<string, string> = {
  "artificial": "artificial (adj)", "intelligence": "inteligência (subst)", "is": "é (verbo)", 
  "transforming": "transformando (verbo)", "the": "o/a (artigo)", "world": "mundo (subst)",
  "of": "de (prep)", "work": "trabalho (subst)", "new": "novo (adj)", "tools": "ferramentas (subst)",
  "are": "são/estão (verbo)", "emerging": "surgindo (verbo)", "every": "cada (adj)", "day": "dia (subst)",
  "la": "a (artigo)", "casa": "casa (subst)", "de": "de (prep)", "papel": "papel (subst)",
  "es": "é (verbo)", "una": "uma (artigo)", "serie": "série (subst)", "muy": "muito (adv)", 
  "popular": "popular (adj)", "en": "em (prep)", "todo": "todo (adj)", "el": "o (artigo)", 
  "mundo": "mundo (subst)", "le": "o/a (artigo)", "tour": "torre (subst)", "eiffel": "Eiffel (nome)",
  "est": "é (verbo)", "un": "um (artigo)", "symbole": "símbolo (subst)", "france": "França (nome)",
  "der": "o (artigo)", "hund": "cachorro (subst)", "spielt": "brinca (verbo)", "im": "no (prep)",
  "garten": "jardim (subst)", "il": "o (artigo)", "colosseo": "coliseu (subst)", "è": "é (verbo)",
  "famoso": "famoso (adj)", "roma": "Roma (nome)", "apple": "Apple (empresa)", "launched": "lançou (verbo)",
  "iphone": "iPhone (produto)", "with": "com (prep)", "better": "melhor (adj)", "cameras": "câmeras (subst)",
  "travel": "viagem (subst)", "to": "para (prep)", "japan": "Japão (nome)", "amazing": "incrível (adj)",
  "barcelona": "Barcelona (nome)", "won": "venceu (verbo)", "match": "partida (subst)", "yesterday": "ontem (adv)"
};

// Fallback Articles if DB is empty
const MOCK_ARTICLES: NewsArticle[] = [
  {
    id: '1',
    title: 'AI is Transforming Work',
    headline: 'New tools are emerging every day.',
    content: "Artificial Intelligence is transforming the world of work. New tools are emerging every day to help professionals be more productive. However, there are concerns about job displacement.",
    category: 'tech',
    language: 'en',
    difficulty_level: 'Intermediate',
    source_name: 'TechDaily',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'La Casa de Papel Returns',
    headline: 'The popular series is back.',
    content: "La Casa de Papel es una serie muy popular en todo el mundo. Los personajes son carismáticos y la trama es emocionante. Netflix ha confirmado una nueva temporada derivada.",
    category: 'pop',
    language: 'es',
    difficulty_level: 'Beginner',
    source_name: 'CulturaPop',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Le Tour Eiffel',
    headline: 'Symbol of Paris.',
    content: "La Tour Eiffel est un symbole de la France. Elle a été construite par Gustave Eiffel pour l'Exposition Universelle de 1889. Aujourd'hui, elle est visitée par des millions de touristes.",
    category: 'travel',
    language: 'fr',
    difficulty_level: 'Beginner',
    source_name: 'VoyageMag',
    created_at: new Date().toISOString()
  }
];

const BilingualNews: React.FC<BilingualNewsProps> = ({ userId }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [currentLang, setCurrentLang] = useState<LangCode>('en');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<{ word: string, translation: string, x: number, y: number } | null>(null);

  useEffect(() => {
    fetchArticles();
  }, [currentLang]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bilingual_articles')
        .select('*')
        .eq('language', currentLang)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setArticles(data);
      } else {
        // Fallback to mocks filtering by lang
        setArticles(MOCK_ARTICLES.filter(a => a.language === currentLang));
      }
    } catch (e) {
      setArticles(MOCK_ARTICLES.filter(a => a.language === currentLang));
    } finally {
      setLoading(false);
    }
  };

  const handleWordClick = (e: React.MouseEvent<HTMLSpanElement>, word: string) => {
    e.stopPropagation();
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase();
    
    // Simple lookup or generic fallback for MVP
    const translation = MOCK_DICTIONARY[cleanWord] || "Tradução não disponível (Demo)";
    
    // Calculate position relative to viewport
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top - 10; // Above word

    setActiveTooltip({
       word: cleanWord,
       translation,
       x, 
       y
    });
  };

  const closeTooltip = () => setActiveTooltip(null);

  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<LangCode, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' };
      utterance.lang = langMap[currentLang];
      window.speechSynthesis.speak(utterance);
    }
  };

  const renderContent = (text: string) => {
     return text.split(' ').map((word, idx) => (
        <span 
          key={idx} 
          onClick={(e) => handleWordClick(e, word)}
          className="cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded px-0.5 transition-colors"
        >
           {word}{' '}
        </span>
     ));
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-700 pb-20 px-2 md:px-0 max-w-7xl mx-auto font-sans" onClick={closeTooltip}>
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-700 dark:border-white/20 mb-4">
              <Newspaper className="w-4 h-4 text-white" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Global Feed</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">News Reader</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Notícias reais. Tradução instantânea. Sem sair da bolha.</p>
        </div>
      </header>

      {/* Language Selector */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-4 shrink-0">
         {(Object.keys(LANGUAGES_CONFIG) as LangCode[]).map(lc => (
            <button
               key={lc}
               onClick={() => { setCurrentLang(lc); setSelectedArticle(null); }}
               className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border-2 ${currentLang === lc ? `${LANGUAGES_CONFIG[lc].color} text-white border-transparent shadow-xl scale-105` : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300'}`}
            >
               <span className="text-xl">{LANGUAGES_CONFIG[lc].flag}</span>
               {LANGUAGES_CONFIG[lc].label}
            </button>
         ))}
      </div>

      {/* Tooltip Overlay */}
      {activeTooltip && (
         <div 
            className="fixed z-50 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-bold pointer-events-none transform -translate-x-1/2 -translate-y-full animate-in zoom-in-95 duration-200"
            style={{ left: activeTooltip.x, top: activeTooltip.y }}
         >
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45"></div>
            <p className="uppercase text-[9px] text-slate-400 tracking-widest mb-0.5">{activeTooltip.word}</p>
            <p className="text-sm">{activeTooltip.translation}</p>
         </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
         
         {selectedArticle ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8 bg-white dark:bg-sanfran-rubiDark/20 rounded-[3rem] shadow-2xl border-2 border-slate-200 dark:border-white/5 relative">
               
               {/* Article Header Image */}
               <div className="h-64 md:h-80 w-full relative">
                  {selectedArticle.image_url ? (
                     <img src={selectedArticle.image_url} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                     <div className={`w-full h-full ${LANGUAGES_CONFIG[currentLang].color} flex items-center justify-center`}>
                        <Globe size={80} className="text-white/20" />
                     </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  
                  <button 
                     onClick={() => setSelectedArticle(null)}
                     className="absolute top-6 left-6 p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                  >
                     <ChevronLeft size={24} />
                  </button>

                  <div className="absolute bottom-8 left-8 right-8">
                     <div className="flex items-center gap-3 mb-3">
                        <span className="bg-sanfran-rubi text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                           {selectedArticle.category}
                        </span>
                        <span className="text-white/80 text-xs font-bold flex items-center gap-1">
                           <Clock size={12} /> {new Date(selectedArticle.created_at).toLocaleDateString()}
                        </span>
                     </div>
                     <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-tight mb-2">
                        {selectedArticle.title}
                     </h2>
                  </div>
               </div>

               {/* Article Body */}
               <div className="p-8 md:p-12 max-w-3xl mx-auto">
                  <div className="flex justify-between items-center mb-8 pb-8 border-b border-slate-200 dark:border-white/10">
                     <div className="flex items-center gap-2 text-slate-500">
                        <Globe size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">{selectedArticle.source_name || 'Agência SanFran'}</span>
                     </div>
                     <button onClick={() => playAudio(selectedArticle.content)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 rounded-full text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                        <Volume2 size={16} /> Ouvir Artigo
                     </button>
                  </div>

                  <div className="font-serif text-lg md:text-xl leading-relaxed text-slate-800 dark:text-slate-200 text-justify">
                     {renderContent(selectedArticle.content)}
                  </div>
               </div>

            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-20">
               {loading ? (
                  <div className="col-span-full py-20 text-center opacity-50 font-bold uppercase">Carregando Feed...</div>
               ) : articles.length === 0 ? (
                  <div className="col-span-full py-20 text-center opacity-50">
                     <Newspaper size={48} className="mx-auto mb-4 text-slate-400" />
                     <p className="text-xl font-black text-slate-500">Sem Notícias</p>
                     <p className="text-xs font-bold text-slate-400 mt-2">Nenhum artigo encontrado para este idioma.</p>
                  </div>
               ) : (
                  articles.map(article => (
                     <button 
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className="group bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden text-left flex flex-col h-[320px]"
                     >
                        <div className="h-40 bg-slate-200 dark:bg-black/20 relative overflow-hidden shrink-0">
                           {article.image_url ? (
                              <img src={article.image_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                           ) : (
                              <div className={`w-full h-full ${LANGUAGES_CONFIG[currentLang].color} opacity-80 flex items-center justify-center`}>
                                 <Globe size={40} className="text-white/30" />
                              </div>
                           )}
                           <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/80 backdrop-blur px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                              {article.category}
                           </div>
                        </div>
                        
                        <div className="p-6 flex flex-col justify-between flex-1">
                           <div>
                              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">
                                 {article.title}
                              </h3>
                              <p className="text-xs font-medium text-slate-500 line-clamp-2">
                                 {article.headline || article.content}
                              </p>
                           </div>
                           
                           <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5 mt-auto">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{article.difficulty_level || 'Geral'}</span>
                              <div className="flex items-center gap-1 text-indigo-500 font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                 Ler Agora <ArrowRight size={12} />
                              </div>
                           </div>
                        </div>
                     </button>
                  ))
               )}
            </div>
         )}

      </div>
    </div>
  );
};

export default BilingualNews;
