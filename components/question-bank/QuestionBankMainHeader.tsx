import React from 'react';
import {
  BookOpen,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  NotebookText,
  Plus,
  Sparkles,
  Timer,
  Zap,
  Book,
  BookX,
} from 'lucide-react';

type Props = {
  showXRay: boolean;
  onToggleXRay: () => void;
  showManualGlossarySearch: boolean;
  onToggleGlossary: () => void;
  onOpenMockSetup: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  exportProgress: number;
  onOpenAiGenerator: () => void;
  onSmartReview: () => void;
  showNotebookCreationMode: boolean;
  onToggleNotebookMode: () => void;
  selectedForNotebookCount: number;
  onOpenNotebookModal: () => void;
  isErrorNotebookMode: boolean;
  onToggleErrorNotebook: () => void;
};

export function QuestionBankMainHeader({
  showXRay,
  onToggleXRay,
  showManualGlossarySearch,
  onToggleGlossary,
  onOpenMockSetup,
  onExportPdf,
  isExporting,
  exportProgress,
  onOpenAiGenerator,
  onSmartReview,
  showNotebookCreationMode,
  onToggleNotebookMode,
  selectedForNotebookCount,
  onOpenNotebookModal,
  isErrorNotebookMode,
  onToggleErrorNotebook,
}: Props) {
  return (
    <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <BookOpen className="text-blue-500" size={32} />
          Banco de Questões
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Treine com questões de múltipla escolha e acompanhe seu desempenho.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <button
          type="button"
          onClick={onToggleXRay}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${
            showXRay
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Ocultar/Mostrar Raio-X"
        >
          {showXRay ? <EyeOff size={14} /> : <Eye size={14} />} Raio-X
        </button>
        <button
          type="button"
          onClick={onToggleGlossary}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${
            showManualGlossarySearch
              ? 'bg-indigo-600 text-white'
              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200'
          }`}
          title="Dicionário Jurídico"
        >
          <Book size={14} /> Dicionário
        </button>
        <button
          type="button"
          onClick={onOpenMockSetup}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-emerald-900/20"
        >
          <Timer size={14} /> Simulado
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-slate-900/20"
        >
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {isExporting ? `Gerando (${exportProgress}%)...` : 'Exportar PDF'}
        </button>
        <button
          type="button"
          onClick={onOpenAiGenerator}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-purple-900/20"
        >
          <Sparkles size={14} /> IA
        </button>
        <button
          type="button"
          onClick={onSmartReview}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-amber-900/20"
        >
          <Zap size={14} /> Reforço
        </button>
        <button
          type="button"
          onClick={onToggleNotebookMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${
            showNotebookCreationMode
              ? 'bg-orange-600 text-white'
              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200'
          }`}
        >
          <NotebookText size={14} /> Caderno
        </button>
        {selectedForNotebookCount > 0 && (
          <button
            type="button"
            onClick={onOpenNotebookModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            <Plus size={14} /> Adicionar ({selectedForNotebookCount})
          </button>
        )}
        <button
          type="button"
          onClick={onToggleErrorNotebook}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${
            isErrorNotebookMode
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400'
          }`}
        >
          <BookX size={14} /> {isErrorNotebookMode ? 'Sair dos Erros' : 'Caderno de Erros'}
        </button>
      </div>
    </header>
  );
}
