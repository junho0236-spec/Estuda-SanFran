import React from 'react';
import { X } from 'lucide-react';
import type { Flashcard } from '../../types';

export interface AnkiEditCardModalProps {
  editingCard: Flashcard;
  onClose: () => void;
  onChange: (card: Flashcard) => void;
  onSave: () => void;
}

export const AnkiEditCardModal: React.FC<AnkiEditCardModalProps> = ({
  editingCard,
  onClose,
  onChange,
  onSave,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className="bg-white dark:bg-sanfran-rubiDark rounded-[3rem] p-8 w-full max-w-2xl shadow-2xl border-4 border-slate-100 dark:border-sanfran-rubi/30 relative overflow-hidden animate-in zoom-in-95 duration-300">
      <div className="absolute top-0 right-0 p-6">
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>
      </div>

      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
        Editar Flashcard
      </h3>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
            Pergunta
          </label>
          <input
            value={editingCard.front}
            onChange={(e) => onChange({ ...editingCard, front: e.target.value })}
            className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
            Resposta
          </label>
          <textarea
            value={editingCard.back}
            onChange={(e) => onChange({ ...editingCard, back: e.target.value })}
            className="w-full h-32 p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold resize-none outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
            Imagem (Opcional)
          </label>
          {editingCard.image ? (
            <div className="relative mb-2">
              <img
                src={editingCard.image}
                alt="Card"
                className="max-h-40 rounded-xl border border-slate-200 dark:border-white/10"
              />
              <button
                type="button"
                onClick={() => onChange({ ...editingCard, image: undefined })}
                className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-full shadow-lg"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    onChange({ ...editingCard, image: event.target?.result as string });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          )}
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 mb-2 block">
            Notas Pessoais
          </label>
          <textarea
            value={editingCard.notes || ''}
            onChange={(e) => onChange({ ...editingCard, notes: e.target.value })}
            placeholder="Adicione mnemônicos, dicas ou observações..."
            className="w-full h-24 p-4 bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-200 dark:border-yellow-700/30 rounded-2xl font-bold resize-none outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onSave}
          className="w-full py-4 mt-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm shadow-xl hover:bg-sanfran-rubiDark transition-colors"
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  </div>
);
