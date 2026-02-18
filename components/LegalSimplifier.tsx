
import React, { useState } from 'react';
import { Sparkles, MessageSquare, ArrowRight, Copy, Check, Zap } from 'lucide-react';
import { simplifyLegalText } from '../services/geminiService';

const LegalSimplifier: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSimplify = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setOutputText('');

    try {
      const result = await simplifyLegalText(inputText);
      setOutputText(result || 'Não foi possível simplificar o texto no momento.');
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

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in duration-500">
      
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
        
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
           <Zap className="w-4 h-4 text-yellow-500" fill="currentColor" />
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Powered by Gemini Flash (Low Cost)</span>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
         
         {/* INPUT */}
         <div className="flex flex-col h-full bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
               <MessageSquare size={14} /> Texto Original
            </label>
            <textarea 
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               placeholder="Cole aqui aquele parágrafo impossível de entender..."
               className="flex-1 w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl p-6 font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 outline-none focus:border-purple-500 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
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
                  <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors">
                     {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
               )}
            </div>

            <div className="flex-1 w-full bg-white/5 border border-white/5 rounded-2xl p-6 font-medium text-lg leading-relaxed text-slate-200 overflow-y-auto custom-scrollbar relative z-10">
               {outputText ? (
                  outputText
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
