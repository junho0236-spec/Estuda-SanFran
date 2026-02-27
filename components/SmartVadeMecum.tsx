
import React, { useState, useRef, useEffect } from 'react';
import { fetchLegalReference } from '../services/geminiService';
import { Loader2, Book, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LegalLinkProps {
  reference: string;
}

const LegalLink: React.FC<LegalLinkProps> = ({ reference }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowPopup(true);
    
    if (!content && !loading) {
      setLoading(true);
      try {
        const text = await fetchLegalReference(reference);
        setContent(text);
      } catch (err) {
        setContent("Erro ao carregar conteúdo.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowPopup(false);
    }, 300);
  };

  return (
    <span className="relative inline-block group">
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="text-blue-600 dark:text-blue-400 font-bold underline decoration-dotted cursor-help hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
      >
        {reference}
      </span>
      
      {showPopup && (
        <div 
          onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onMouseLeave={handleMouseLeave}
          className="absolute z-[9999] bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in duration-200"
        >
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Book size={16} />
              <span className="text-xs font-black uppercase tracking-widest">{reference}</span>
            </div>
            <ExternalLink size={14} className="text-slate-400" />
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultando Vade Mecum...</p>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              <ReactMarkdown>{content || "Nenhum conteúdo encontrado."}</ReactMarkdown>
            </div>
          )}
          
          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter italic">Powered by SanFran AI</p>
          </div>
        </div>
      )}
    </span>
  );
};

export const SmartText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Regex para detectar referências legais comuns
  // Exemplos: Art. 186 do CC, Súmula 350 do STF, Artigo 5º da CF
  const legalRegex = /(Art\.?\s?\d+[^\s,.;]*(?:\s?do\s?[A-Z]+)?|Súmula\s?\d+(?:\s?do\s?[A-Z]+)?|Artigo\s?\d+[^\s,.;]*(?:\s?da\s?[A-Z]+)?)/gi;

  const parts = text.split(legalRegex);
  const matches = text.match(legalRegex);

  if (!matches) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = matches.some(m => m === part);
        if (isMatch) {
          return <LegalLink key={i} reference={part} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};
