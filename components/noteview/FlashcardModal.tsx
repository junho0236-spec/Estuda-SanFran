import React from 'react';
import { Sparkles, X } from 'lucide-react';

interface FlashcardData {
  front: string;
  back: string;
}

interface FlashcardModalProps {
  isOpen: boolean;
  data: FlashcardData | null;
  onChange: (data: FlashcardData) => void;
  onClose: () => void;
  onSave: () => void;
}

const FlashcardModal: React.FC<FlashcardModalProps> = ({ isOpen, data, onChange, onClose, onSave }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                <Sparkles className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Flashcard Gerado</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confira e salve no seu Anki</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Frente (Pergunta)</label>
              <textarea
                value={data.front}
                onChange={(e) => onChange({ ...data, front: e.target.value })}
                className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 transition-all min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Verso (Resposta)</label>
              <textarea
                value={data.back}
                onChange={(e) => onChange({ ...data, back: e.target.value })}
                className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 transition-all min-h-[120px]"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onSave}
              className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Salvar no Anki
            </button>
            <button
              onClick={onClose}
              className="px-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-slate-200"
            >
              Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardModal;
