import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Book, Languages, Lightbulb, Plus, Check, Loader2 } from 'lucide-react';
import { GlossaryTerm, Flashcard } from '../types';
import { dataService } from '../services/dataService';

interface GlossaryPopoverProps {
  data: GlossaryTerm;
  onClose: () => void;
  userId: string;
  isOnline: boolean;
  position: { x: number; y: number };
}

export const GlossaryPopover: React.FC<GlossaryPopoverProps> = ({
  data,
  onClose,
  userId,
  isOnline,
  position
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveToFlashcards = async () => {
    if (isSaved) return;
    setIsSaving(true);
    try {
      const newCard: Flashcard = {
        id: crypto.randomUUID(),
        front: data.term,
        back: `**Definição:** ${data.definition}${data.translation ? `\n\n**Tradução:** ${data.translation}` : ''}\n\n**Exemplo:** ${data.example}`,
        notes: data.isLatin ? 'Termo em Latim' : 'Termo Jurídico',
        subjectId: 'glossary',
        folderId: null,
        nextReview: Date.now(),
        interval: 0,
        status: 'new',
        tags: ['glossary', data.isLatin ? 'latin' : 'juridical']
      };

      await dataService.saveFlashcard(newCard, userId, isOnline);
      setIsSaved(true);
    } catch (error) {
      console.error("Error saving glossary card:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="fixed z-[100] w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      style={{ 
        left: Math.min(window.innerWidth - 340, Math.max(20, position.x - 160)),
        top: Math.min(window.innerHeight - 400, Math.max(20, position.y + 20))
      }}
    >
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-900 truncate max-w-[180px]">{data.term}</h3>
          {data.isLatin && (
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wider">
              Latim
            </span>
          )}
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-slate-200 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
        <div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {data.definition}
          </p>
        </div>

        {data.translation && (
          <div className="flex gap-3 p-3 bg-indigo-50 rounded-xl">
            <Languages className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1">Tradução Literal</p>
              <p className="text-sm text-indigo-800 italic">"{data.translation}"</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 p-3 bg-emerald-50 rounded-xl">
          <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-1">Exemplo de Uso</p>
            <p className="text-sm text-emerald-800 leading-relaxed">
              {data.example}
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
        <button
          onClick={handleSaveToFlashcards}
          disabled={isSaving || isSaved}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            isSaved 
              ? 'bg-emerald-100 text-emerald-700 cursor-default' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-200'
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSaved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isSaved ? 'Salvo no Dicionário' : 'Salvar como Flashcard'}
        </button>
      </div>
    </motion.div>
  );
};
