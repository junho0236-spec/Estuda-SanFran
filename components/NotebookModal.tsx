import React, { useState } from 'react';
import { X, Loader2, Plus, BookOpen } from 'lucide-react';
import { Notebook } from '../types';

interface NotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebooks: Notebook[];
  selectedQuestionIds: string[];
  onCreateNotebook: (name: string, description: string) => Promise<void>;
  onAddToNotebook: (notebookId: string) => Promise<void>;
  isSubmitting: boolean;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({
  isOpen,
  onClose,
  notebooks,
  selectedQuestionIds,
  onCreateNotebook,
  onAddToNotebook,
  isSubmitting,
}) => {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen size={20} /> Adicionar ao Caderno
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('select')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm ${mode === 'select' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
          >
            Selecionar
          </button>
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm ${mode === 'create' ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
          >
            Criar Novo
          </button>
        </div>

        {mode === 'select' ? (
          <div className="space-y-2">
            {notebooks.map(n => (
              <button
                key={n.id}
                onClick={() => onAddToNotebook(n.id)}
                className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <div className="font-bold text-slate-900 dark:text-white">{n.name}</div>
                <div className="text-xs text-slate-500">{n.question_ids.length} questões</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nome do Caderno"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
            />
            <input
              type="text"
              placeholder="Descrição (Opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
            />
            <button
              onClick={() => onCreateNotebook(name, description)}
              disabled={isSubmitting || name.trim() === ''}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Criar Caderno
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
