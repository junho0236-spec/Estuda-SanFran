import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  MoreHorizontal,
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
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMoreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [mobileMoreOpen]);

  const toolbarBtn =
    'flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors touch-manipulation';

  return (
    <header className="mb-6 flex min-w-0 flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:gap-3 sm:text-3xl md:text-4xl">
          <BookOpen className="shrink-0 text-blue-500" size={28} />
          <span className="min-w-0">Banco de Questões</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Treine com questões de múltipla escolha e acompanhe seu desempenho.
        </p>
      </div>

      {/* Mobile: ações principais + menu «Mais» */}
      <div className="relative w-full min-w-0 md:hidden" ref={mobileMenuRef}>
        <div className="flex flex-wrap items-stretch gap-2">
          <button
            type="button"
            onClick={onOpenMockSetup}
            className={`${toolbarBtn} flex-1 bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 sm:flex-none`}
          >
            <Timer size={14} /> Simulado
          </button>
          <button
            type="button"
            onClick={onOpenAiGenerator}
            className={`${toolbarBtn} flex-1 bg-purple-600 text-white shadow-lg shadow-purple-900/20 hover:bg-purple-700 sm:flex-none`}
          >
            <Sparkles size={14} /> IA
          </button>
          {selectedForNotebookCount > 0 && (
            <button
              type="button"
              onClick={() => {
                onOpenNotebookModal();
                setMobileMoreOpen(false);
              }}
              className={`${toolbarBtn} flex-1 bg-blue-600 text-white hover:bg-blue-700 sm:flex-none`}
            >
              <Plus size={14} /> Adicionar ({selectedForNotebookCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileMoreOpen((o) => !o)}
            aria-expanded={mobileMoreOpen}
            className={`${toolbarBtn} shrink-0 border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800`}
          >
            <MoreHorizontal size={16} aria-hidden />
            Mais
            <ChevronDown
              size={16}
              className={`transition-transform ${mobileMoreOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        </div>

        {mobileMoreOpen && (
          <div className="absolute right-0 z-40 mt-2 w-full min-w-0 max-w-md rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex max-h-[min(70dvh,28rem)] flex-col gap-1 overflow-y-auto overscroll-y-contain">
              <button
                type="button"
                onClick={() => {
                  onToggleXRay();
                  setMobileMoreOpen(false);
                }}
                className={`${toolbarBtn} w-full justify-start ${
                  showXRay
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {showXRay ? <EyeOff size={14} /> : <Eye size={14} />} Raio-X
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleGlossary();
                  setMobileMoreOpen(false);
                }}
                className={`${toolbarBtn} w-full justify-start ${
                  showManualGlossarySearch
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400'
                }`}
              >
                <Book size={14} /> Dicionário
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportPdf();
                  setMobileMoreOpen(false);
                }}
                disabled={isExporting}
                className={`${toolbarBtn} w-full justify-start bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50`}
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {isExporting ? `Gerando (${exportProgress}%)...` : 'Exportar PDF'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSmartReview();
                  setMobileMoreOpen(false);
                }}
                className={`${toolbarBtn} w-full justify-start bg-amber-500 text-white hover:bg-amber-600`}
              >
                <Zap size={14} /> Reforço
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleNotebookMode();
                  setMobileMoreOpen(false);
                }}
                className={`${toolbarBtn} w-full justify-start ${
                  showNotebookCreationMode
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                }`}
              >
                <NotebookText size={14} /> Caderno
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleErrorNotebook();
                  setMobileMoreOpen(false);
                }}
                className={`${toolbarBtn} w-full justify-start ${
                  isErrorNotebookMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                <BookX size={14} /> {isErrorNotebookMode ? 'Sair dos Erros' : 'Caderno de Erros'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: barra completa */}
      <div className="hidden flex-wrap items-center gap-3 md:flex">
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
