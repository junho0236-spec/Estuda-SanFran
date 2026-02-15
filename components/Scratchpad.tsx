
import React, { useState, useEffect, useCallback } from 'react';
import { Feather, X, Save, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface ScratchpadProps {
  userId: string;
  isExtremeFocus: boolean;
}

const Scratchpad: React.FC<ScratchpadProps> = ({ userId, isExtremeFocus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Carregar nota inicial
  useEffect(() => {
    const fetchNote = async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('content')
        .eq('user_id', userId)
        .single();
      
      if (data) setContent(data.content);
    };
    fetchNote();
  }, [userId]);

  // Debounce para salvar automaticamente
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (content) {
        setIsSaving(true);
        const { error } = await supabase
          .from('notes')
          .upsert({ user_id: userId, content, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        
        if (error) console.error("Erro ao salvar nota:", error);
        setIsSaving(false);
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [content, userId]);

  return (
    <>
      {/* Botão Gatilho */}
      <div className={`fixed z-[55] transition-all duration-700 ${isExtremeFocus ? 'bottom-8 right-8' : 'bottom-6 right-6 lg:bottom-10 lg:right-10'}`}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-4 rounded-full border-2 shadow-2xl backdrop-blur-xl transition-all hover:scale-110 active:scale-90 flex items-center justify-center ${isOpen ? 'bg-usp-gold text-white border-usp-gold' : 'bg-white dark:bg-sanfran-rubiDark/40 text-usp-gold border-slate-200 dark:border-sanfran-rubi/30'}`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Feather className="w-6 h-6" />}
        </button>
      </div>

      {/* Painel do Caderno */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#fffdf0] dark:bg-[#0f0c08] shadow-[-20px_0_50px_rgba(0,0,0,0.1)] transition-transform duration-500 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} border-l-8 border-l-usp-gold flex flex-col`}>
        <div className="p-8 flex items-center justify-between border-b border-usp-gold/20">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-usp-gold uppercase tracking-tighter flex items-center gap-3">
              <FileText size={20} /> Caderno de Notas
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {isSaving ? 'Sincronizando Doutrina...' : 'Arquivado com Sucesso'}
            </p>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-sanfran-rubi">
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex-1 p-8 relative">
          {/* Linhas do Caderno Legal */}
          <div className="absolute inset-0 pointer-events-none flex flex-col h-full opacity-50 dark:opacity-10 px-8 py-8">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="w-full border-b border-blue-200 h-8" />
            ))}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Anotar insights jurídicos, súmulas ou lembretes da pauta..."
            className="w-full h-full bg-transparent border-none outline-none resize-none font-serif text-lg leading-8 text-slate-800 dark:text-slate-200 relative z-10 placeholder:text-slate-300 dark:placeholder:text-slate-700"
            spellCheck={false}
          />
        </div>

        <div className="p-4 bg-white/50 dark:bg-black/20 flex justify-center text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">
          Scientia Vinces • Academia SanFran
        </div>
      </div>
    </>
  );
};

export default Scratchpad;
