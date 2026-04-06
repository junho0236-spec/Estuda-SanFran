import React from 'react';
import { X, Check, Save } from 'lucide-react';
import type { Folder } from '../../types';
import { FOLDER_COLORS, FOLDER_ICONS } from './constants';

export interface AnkiNewFolderModalProps {
  open: boolean;
  onClose: () => void;
  newFolderName: string;
  onNewFolderNameChange: (v: string) => void;
  newFolderColor: string;
  onNewFolderColorChange: (border: string) => void;
  newFolderIcon: string;
  onNewFolderIconChange: (value: string) => void;
  newFolderTargetDate: string;
  onNewFolderTargetDateChange: (v: string) => void;
  onCreateFolder: () => void;
}

export const AnkiNewFolderModal: React.FC<AnkiNewFolderModalProps> = ({
  open,
  onClose,
  newFolderName,
  onNewFolderNameChange,
  newFolderColor,
  onNewFolderColorChange,
  newFolderIcon,
  onNewFolderIconChange,
  newFolderTargetDate,
  onNewFolderTargetDateChange,
  onCreateFolder,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
            Nova Pasta
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Nome da Pasta
            </label>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => onNewFolderNameChange(e.target.value)}
              placeholder="Ex: Direito Civil, OAB 2024..."
              className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && onCreateFolder()}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cor do Deck</label>
            <div className="grid grid-cols-5 gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => onNewFolderColorChange(color.border)}
                  className={`w-full aspect-square rounded-xl transition-all border-4 ${color.bg} ${newFolderColor === color.border ? 'border-white dark:border-slate-800 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ícone</label>
            <div className="grid grid-cols-5 gap-2">
              {FOLDER_ICONS.map((iconObj) => {
                const IconComp = iconObj.icon;
                return (
                  <button
                    key={iconObj.value}
                    type="button"
                    onClick={() => onNewFolderIconChange(iconObj.value)}
                    className={`w-full aspect-square rounded-xl transition-all flex items-center justify-center border-2 ${newFolderIcon === iconObj.value ? 'bg-slate-100 dark:bg-white/10 border-sanfran-rubi text-sanfran-rubi' : 'border-slate-100 dark:border-white/5 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    title={iconObj.name}
                  >
                    <IconComp className="w-6 h-6" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Data da Prova (Opcional - Modo Véspera)
            </label>
            <input
              type="date"
              value={newFolderTargetDate}
              onChange={(e) => onNewFolderTargetDateChange(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi transition-colors text-slate-700 dark:text-slate-300"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Se definido, o algoritmo aumentará a frequência de revisão dos cards desta pasta conforme a data se
              aproxima.
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateFolder}
            disabled={!newFolderName.trim()}
            className="w-full py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-sanfran-rubi/20 hover:bg-sanfran-rubiDark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Criar Pasta
          </button>
        </div>
      </div>
    </div>
  );
};

export interface AnkiEditFolderModalProps {
  folder: Folder;
  onClose: () => void;
  onChange: (folder: Folder) => void;
  onSave: () => void;
}

export const AnkiEditFolderModal: React.FC<AnkiEditFolderModalProps> = ({
  folder: editingFolder,
  onClose,
  onChange,
  onSave,
}) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
          Editar Pasta
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Pasta</label>
          <input
            autoFocus
            value={editingFolder.name}
            onChange={(e) => onChange({ ...editingFolder, name: e.target.value })}
            className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-purple-500 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cor do Deck</label>
          <div className="grid grid-cols-5 gap-2">
            {FOLDER_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => onChange({ ...editingFolder, color: color.border })}
                className={`w-full aspect-square rounded-xl transition-all border-4 ${color.bg} ${(editingFolder.color || 'border-l-usp-gold') === color.border ? 'border-white dark:border-slate-800 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ícone</label>
          <div className="grid grid-cols-5 gap-2">
            {FOLDER_ICONS.map((iconObj) => {
              const IconComp = iconObj.icon;
              return (
                <button
                  key={iconObj.value}
                  type="button"
                  onClick={() => onChange({ ...editingFolder, icon: iconObj.value })}
                  className={`w-full aspect-square rounded-xl transition-all flex items-center justify-center border-2 ${(editingFolder.icon || 'folder') === iconObj.value ? 'bg-slate-100 dark:bg-white/10 border-sanfran-rubi text-sanfran-rubi' : 'border-slate-100 dark:border-white/5 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                  title={iconObj.name}
                >
                  <IconComp className="w-6 h-6" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Data da Prova (Opcional - Modo Véspera)
          </label>
          <input
            type="date"
            value={editingFolder.targetDate ? new Date(editingFolder.targetDate).toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onChange({
                ...editingFolder,
                targetDate: e.target.value ? new Date(e.target.value).getTime() : undefined,
              })
            }
            className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi transition-colors text-slate-700 dark:text-slate-300"
          />
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Se definido, o algoritmo aumentará a frequência de revisão dos cards desta pasta conforme a data se
            aproxima.
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={!editingFolder.name.trim()}
          className="w-full py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-sanfran-rubi/20 hover:bg-sanfran-rubiDark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          Salvar Alterações
        </button>
      </div>
    </div>
  </div>
);
