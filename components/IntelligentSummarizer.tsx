import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, BookOpen, Brain, Copy, Check, History, Trash2, X, Loader2, Zap, ArrowRight, Key } from 'lucide-react';
import { summarizeText, extractKeyPoints, generateMindMap } from '../services/geminiService';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../services/supabaseClient';

interface IntelligentSummarizerProps {
  userId: string;
}

interface SummaryHistory {
  id: string;
  user_id: string;
  original_text: string;
  generated_text: string;
  type: 'summary' | 'key_points' | 'mind_map';
  created_at: string;
}

export const IntelligentSummarizer: React.FC<IntelligentSummarizerProps> = ({ userId }) => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generationType, setGenerationType] = useState<'summary' | 'key_points' | 'mind_map'>('summary');
  const [history, setHistory] = useState<SummaryHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de resumos:", err);
    }
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setOutputText('');

    try {
      let result: string | undefined;
      switch (generationType) {
        case 'summary':
          result = await summarizeText(inputText);
          break;
        case 'key_points':
          result = await extractKeyPoints(inputText);
          break;
        case 'mind_map':
          result = await generateMindMap(inputText);
          break;
        default:
          result = 'Tipo de geração inválido.';
      }
      const finalResult = result || `Não foi possível gerar ${generationType} no momento.`;
      setOutputText(finalResult);

      if (userId && result) {
        const { data, error } = await supabase.from('summaries').insert({
          user_id: userId,
          original_text: inputText,
          generated_text: finalResult,
          type: generationType
        }).select().single();

        if (!error && data) {
          setHistory(prev => [data, ...prev].slice(0, 10));
        }
      }
    } catch (error) {
      setOutputText('Erro ao conectar com o assistente inteligente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadFromHistory = (item: SummaryHistory) => {
    setInputText(item.original_text);
    setOutputText(item.generated_text);
    setGenerationType(item.type);
    setShowHistory(false);
  };

  const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await supabase.from('summaries').delete().eq('id', id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Erro ao deletar item do histórico:", err);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8">
        <div>
           <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/20 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800 mb-4">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">IA Assistant</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Resumidor Inteligente</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Transforme textos longos em resumos, pontos-chave ou mapas mentais.</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
             <Zap className="w-4 h-4 text-yellow-500" fill="currentColor" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Powered by Gemini Flash (Low Cost)</span>
          </div>
          {history.length > 0 && (
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs font-bold"
            >
              <History className="w-4 h-4" />
              {showHistory ? 'Ocultar Histórico' : 'Ver Histórico'}
            </button>
          )}
        </div>
      </header>

      {showHistory && history.length > 0 && (
        <div className="mb-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm animate-in slide-in-from-top-4">
          <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest mb-3">Gerações Recentes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {history.map(item => (
              <div 
                key={item.id} 
                onClick={() => loadFromHistory(item)}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors group relative"
              >
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-serif italic mb-2">"{item.original_text}"</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-200 line-clamp-1">
                    <ArrowRight className="w-3 h-3 inline mr-1 text-blue-500" />
                    {item.generated_text.replace(/[#*]/g, '')}
                  </p>
                  <button 
                    onClick={(e) => deleteHistoryItem(e, item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
         
         {/* INPUT */}
         <div className="flex flex-col h-full bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
               <FileText size={14} /> Texto Original
            </label>
            <textarea 
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               placeholder="Cole aqui o texto longo para resumir, extrair pontos-chave ou gerar um mapa mental..."
               className="flex-1 w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl p-6 font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
            <div className="mt-4 flex flex-col sm:flex-row justify-end gap-3">
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <button 
                  onClick={() => setGenerationType('summary')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${generationType === 'summary' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                >
                  <BookOpen size={14} className="inline mr-2" /> Resumir
                </button>
                <button 
                  onClick={() => setGenerationType('key_points')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${generationType === 'key_points' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                >
                  <Key size={14} className="inline mr-2" /> Pontos-Chave
                </button>
                <button 
                  onClick={() => setGenerationType('mind_map')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${generationType === 'mind_map' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                >
                  <Brain size={14} className="inline mr-2" /> Mapa Mental
                </button>
              </div>
               <button 
                  onClick={handleGenerate}
                  disabled={loading || !inputText}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {loading ? 'Gerando...' : 'Gerar Agora'}
               </button>
            </div>
         </div>

         {/* OUTPUT */}
         <div className="flex flex-col h-full bg-slate-900 dark:bg-black p-6 rounded-[2.5rem] border-2 border-slate-800 dark:border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-4 relative z-10">
               <label className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-2">
                  <Sparkles size={14} /> Resultado
               </label>
               {outputText && (
                  <button 
                    onClick={handleCopy} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                  >
                     {copied ? <Check size={14} /> : <Copy size={14} />}
                     {copied ? 'Copiado!' : 'Copiar Texto'}
                  </button>
               )}
            </div>

            <div className="flex-1 w-full bg-white/5 border border-white/5 rounded-2xl p-6 font-medium text-lg leading-relaxed text-slate-200 overflow-y-auto custom-scrollbar relative z-10">
               {outputText ? (
                  <div className="markdown-body prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-blue-300 prose-a:text-blue-400">
                    <Markdown remarkPlugins={[remarkGfm]}>{outputText}</Markdown>
                  </div>
               ) : (
                  <span className="text-slate-600 italic">O resultado aparecerá aqui...</span>
               )}
            </div>
         </div>

      </div>
    </div>
  );
};

export default IntelligentSummarizer;
