
import React, { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, ArrowRight, Copy, Check, Zap, History, Trash2, BookOpen, X } from 'lucide-react';
import { simplifyLegalText, explainLegalTerm } from '../services/geminiService';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../services/supabaseClient';

interface LegalSimplifierProps {
  userId?: string;
}

interface TranslationHistory {
  id: string;
  original_text: string;
  simplified_text: string;
  created_at: string;
}

const LegalSimplifier: React.FC<LegalSimplifierProps> = ({ userId }) => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<TranslationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // New state for term explanation
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_translations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    }
  };

  const handleSimplify = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setOutputText('');

    try {
      const result = await simplifyLegalText(inputText);
      const finalResult = result || 'Não foi possível simplificar o texto no momento.';
      setOutputText(finalResult);

      if (userId && result) {
        const { data, error } = await supabase.from('legal_translations').insert({
          user_id: userId,
          original_text: inputText,
          simplified_text: finalResult
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

  const loadFromHistory = (item: TranslationHistory) => {
    setInputText(item.original_text);
    setOutputText(item.simplified_text);
    setShowHistory(false);
  };

  const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await supabase.from('legal_translations').delete().eq('id', id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Erro ao deletar item:", err);
    }
  };

  const handleTextSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    
    if (start !== end) {
      const text = target.value.substring(start, end);
      if (text.trim().length > 0) {
        setSelectedTerm(text);
        // Reset explanation when new term is selected
        if (explanation) setExplanation(null);
      }
    } else {
      // Only clear if we are not currently viewing an explanation
      if (!explanation) setSelectedTerm(null);
    }
  };

  const handleExplainTerm = async () => {
    if (!selectedTerm) return;
    setExplaining(true);
    setExplanation(null);
    
    try {
      const result = await explainLegalTerm(selectedTerm, inputText);
      setExplanation(result || "Não foi possível explicar o termo.");
    } catch (error) {
      setExplanation("Erro ao buscar explicação.");
    } finally {
      setExplaining(false);
    }
  };

  const closeExplanation = () => {
    setExplanation(null);
    setSelectedTerm(null);
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-8">
        <div>
           <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/20 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-800 mb-4">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">IA Assistant</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Simplificador Jurídico</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Traduza o "juridiquês" complexo para uma linguagem clara e didática.</p>
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
          <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest mb-3">Traduções Recentes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {history.map(item => (
              <div 
                key={item.id} 
                onClick={() => loadFromHistory(item)}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors group relative"
              >
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-serif italic mb-2">"{item.original_text}"</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-200 line-clamp-1">
                    <ArrowRight className="w-3 h-3 inline mr-1 text-purple-500" />
                    {item.simplified_text.replace(/[#*]/g, '')}
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
         <div className="flex flex-col h-full bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl relative">
            <div className="flex justify-between items-center mb-4">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                 <MessageSquare size={14} /> Texto Original
              </label>
              {selectedTerm && !explanation && (
                <button 
                  onClick={handleExplainTerm}
                  disabled={explaining}
                  className="animate-in fade-in zoom-in px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors"
                >
                  <BookOpen size={12} />
                  {explaining ? 'Analisando...' : 'Explicar Termo Selecionado'}
                </button>
              )}
            </div>
            
            <textarea 
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               onSelect={handleTextSelect}
               placeholder="Cole aqui aquele parágrafo impossível de entender..."
               className="flex-1 w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl p-6 font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 outline-none focus:border-purple-500 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
            
            {/* Term Explanation Modal/Overlay */}
            {explanation && (
              <div className="absolute inset-x-4 bottom-20 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-purple-200 dark:border-purple-800 p-4 animate-in slide-in-from-bottom-4 z-20">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-black uppercase text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <BookOpen size={14} />
                    {selectedTerm}
                  </h4>
                  <button onClick={closeExplanation} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X size={14} />
                  </button>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm prose-purple dark:prose-invert max-w-none">
                  <Markdown remarkPlugins={[remarkGfm]}>{explanation}</Markdown>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
               <button 
                  onClick={handleSimplify}
                  disabled={loading || !inputText}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {loading ? 'Processando...' : <>Simplificar Agora <ArrowRight size={16} /></>}
               </button>
            </div>
         </div>

         {/* OUTPUT */}
         <div className="flex flex-col h-full bg-slate-900 dark:bg-black p-6 rounded-[2.5rem] border-2 border-slate-800 dark:border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-4 relative z-10">
               <label className="text-[10px] font-black uppercase text-purple-400 tracking-widest flex items-center gap-2">
                  <Sparkles size={14} /> Versão Didática
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
                  <div className="markdown-body prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-purple-300 prose-a:text-purple-400">
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

export default LegalSimplifier;
