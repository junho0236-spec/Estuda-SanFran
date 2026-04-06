import React from 'react';
import {
  ArrowLeft,
  Upload,
  FileDown,
  Loader2,
  X,
  Gavel,
} from 'lucide-react';
import type { Subject } from '../../types';

export interface AnkiBulkImportPanelProps {
  onBack: () => void;
  bulkInput: string;
  onBulkInputChange: (v: string) => void;
  isLoading: boolean;
  onBulkImport: () => void;
  onAnkiFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AnkiBulkImportPanel: React.FC<AnkiBulkImportPanelProps> = ({
  onBack,
  bulkInput,
  onBulkInputChange,
  isLoading,
  onBulkImport,
  onAnkiFileChange,
}) => (
  <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-usp-blue shadow-2xl">
    <div className="flex items-center gap-4 mb-8">
      <button type="button" onClick={onBack} className="p-3">
        <ArrowLeft className="w-8 h-8 text-slate-400" />
      </button>
      <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
        Importação em Lote
      </h3>
    </div>

    <div className="space-y-6">
      <p className="text-sm font-bold text-slate-500">
        Cole seus dados abaixo (JSON, CSV ou Texto Simples). <br />
        Exemplo: <code className="bg-slate-100 dark:bg-white/5 p-1 rounded">Pergunta | Resposta</code>
      </p>

      <textarea
        value={bulkInput}
        onChange={(e) => onBulkInputChange(e.target.value)}
        placeholder={`Cole aqui seus cards...\n\nExemplo CSV: Pergunta; Resposta\nExemplo JSON: [{"front": "P", "back": "R"}]\nExemplo Simples: Pergunta | Resposta`}
        className="w-full h-64 p-8 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-white/10 rounded-[2.5rem] font-bold resize-none outline-none focus:border-usp-blue transition-all"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onBulkImport}
          disabled={isLoading}
          className="py-6 bg-usp-blue text-white rounded-[2rem] font-black uppercase text-lg shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
          Importar Texto
        </button>

        <div className="relative group">
          <input
            type="file"
            className="hidden"
            id="anki-upload"
            accept=".apkg,.csv,.json"
            onChange={onAnkiFileChange}
          />
          <label
            htmlFor="anki-upload"
            className="w-full py-6 bg-white dark:bg-sanfran-rubiDark border-4 border-sanfran-rubi border-dashed text-sanfran-rubi rounded-[2rem] font-black uppercase text-lg shadow-xl hover:bg-red-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <FileDown size={24} />
            Upload Arquivo
          </label>
        </div>
      </div>
    </div>

    <div className="mt-10 p-8 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border-2 border-blue-100 dark:border-blue-800/30">
      <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4">
        Formatos Suportados
      </h4>
      <ul className="space-y-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
        <li className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          Anki (.apkg) - Importação nativa de baralhos
        </li>
        <li className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          CSV / TXT - Use ponto e vírgula (;) ou barra (|)
        </li>
        <li className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          JSON - Formato estruturado de objetos
        </li>
      </ul>
    </div>
  </div>
);

export interface AnkiManualCreatePanelProps {
  onBack: () => void;
  subjects: Subject[];
  selectedSubjectId: string;
  onSubjectChange: (id: string) => void;
  manualFront: string;
  onManualFrontChange: (v: string) => void;
  manualBack: string;
  onManualBackChange: (v: string) => void;
  manualNotes: string;
  onManualNotesChange: (v: string) => void;
  manualImage: string | null;
  onClearManualImage: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManualCreate: () => void;
}

export const AnkiManualCreatePanel: React.FC<AnkiManualCreatePanelProps> = ({
  onBack,
  subjects,
  selectedSubjectId,
  onSubjectChange,
  manualFront,
  onManualFrontChange,
  manualBack,
  onManualBackChange,
  manualNotes,
  onManualNotesChange,
  manualImage,
  onClearManualImage,
  onPaste,
  onImageUpload,
  onManualCreate,
}) => (
  <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-sanfran-rubi shadow-2xl">
    <div className="flex items-center gap-4 mb-8">
      <button type="button" onClick={onBack} className="p-3">
        <ArrowLeft className="w-8 h-8 text-slate-400" />
      </button>
      <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
        Criação Manual
      </h3>
    </div>
    <div className="space-y-6" onPaste={onPaste}>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disciplina</label>
        <select
          value={selectedSubjectId}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none"
        >
          {(subjects || []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <input
        value={manualFront}
        onChange={(e) => onManualFrontChange(e.target.value)}
        placeholder="Enunciado / Pergunta"
        className="w-full p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none"
      />
      <div className="relative">
        <textarea
          value={manualBack}
          onChange={(e) => onManualBackChange(e.target.value)}
          placeholder="Doutrina / Resposta, Fluxograma, Tabela..."
          className="w-full h-32 p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-3xl font-bold resize-none outline-none"
        />
        <div className="absolute bottom-4 right-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
          Dica: Você pode colar (Ctrl+V) uma imagem aqui
        </div>
      </div>
      {manualImage && (
        <div className="relative mt-4">
          <img
            src={manualImage}
            alt="Uploaded"
            className="max-w-full h-auto rounded-xl border border-slate-200 dark:border-white/10"
          />
          <button
            type="button"
            onClick={onClearManualImage}
            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        className="mt-4 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sanfran-rubi file:text-white hover:file:bg-sanfran-rubiDark"
      />
      <textarea
        value={manualNotes}
        onChange={(e) => onManualNotesChange(e.target.value)}
        placeholder="Notas Pessoais (Opcional) - Mnemônicos, dicas, etc."
        className="w-full h-24 p-6 bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-200 dark:border-yellow-700/30 rounded-3xl font-bold resize-none outline-none placeholder:text-yellow-600/50"
      />
      <button
        type="button"
        onClick={onManualCreate}
        className="w-full py-6 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-lg shadow-xl flex items-center justify-center gap-3"
      >
        <Gavel className="w-6 h-6" /> Protocolar Card
      </button>
      <p className="text-center text-[10px] font-black uppercase text-slate-400">
        Você pode criar vários cards seguidos. Clique no botão acima para salvar e continuar.
      </p>
    </div>
  </div>
);
