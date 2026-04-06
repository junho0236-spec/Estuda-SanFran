import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { NotebookModal } from '../NotebookModal';
import { GlossaryPopover } from '../GlossaryPopover.tsx';
import type { Notebook, Folder, GlossaryTerm } from '../../types';
import { QuestionBankAIGeneratorModal } from './QuestionBankAIGeneratorModal';
import type { QuestionBankAIGeneratorModalProps } from './QuestionBankAIGeneratorModal';
import { QuestionBankAiLessonModal } from './QuestionBankAiLessonModal';
import { QuestionBankJuridiquesModal } from './QuestionBankJuridiquesModal';
import { QuestionBankManualGlossaryModal } from './QuestionBankManualGlossaryModal';
import { QuestionBankDeckPickerModal } from './QuestionBankDeckPickerModal';
import { QuestionBankNotificationToast } from './QuestionBankNotificationToast';
import { QuestionBankPdfHiddenShell } from './QuestionBankPdfHiddenShell';

export type QuestionBankModalsLayerProps = {
  children: React.ReactNode;
  aiGenerator: QuestionBankAIGeneratorModalProps;
  notification: {
    message: string | null;
    type: 'success' | 'error' | null;
  };
  aiLesson: {
    open: boolean;
    onClose: () => void;
    loading: boolean;
    content: string;
    subjectLine: string;
  };
  juridiques: {
    open: boolean;
    onClose: () => void;
    selectedText: string;
    loading: boolean;
    explanation: string;
  };
  manualGlossary: {
    open: boolean;
    onClose: () => void;
    term: string;
    onTermChange: React.Dispatch<React.SetStateAction<string>>;
    onSubmit: () => void;
    isLoading: boolean;
  };
  glossaryPopover: {
    activeTerm: string | null;
    data: GlossaryTerm | null;
    onClose: () => void;
    userId: string;
    isOnline: boolean;
    position: { x: number; y: number };
  };
  glossaryLoadingOverlay: {
    visible: boolean;
    position: { x: number; y: number };
  };
  notebookModal: {
    isOpen: boolean;
    onClose: () => void;
    notebooks: Notebook[];
    selectedQuestionIds: string[];
    onCreateNotebook: (name: string, description: string) => Promise<void>;
    onAddToNotebook: (notebookId: string) => Promise<void>;
    isSubmitting: boolean;
  };
  deckPicker: {
    open: boolean;
    onClose: () => void;
    folders: Folder[];
    isSubmitting: boolean;
    onPickFolder: (folderId: string) => void;
  };
  pdfExportActive: boolean;
};

function QuestionBankModalsLayerInner({
  children,
  aiGenerator,
  notification,
  aiLesson,
  juridiques,
  manualGlossary,
  glossaryPopover,
  glossaryLoadingOverlay,
  notebookModal,
  deckPicker,
  pdfExportActive,
}: QuestionBankModalsLayerProps) {
  return (
    <>
      <div id="ai-generator-portal">
        <QuestionBankAIGeneratorModal {...aiGenerator} />
      </div>

      <div id="add-form-portal" />

      {children}

      <div id="notification-portal">
        <QuestionBankNotificationToast message={notification.message} type={notification.type} />
      </div>

      <QuestionBankAiLessonModal
        open={aiLesson.open}
        onClose={aiLesson.onClose}
        loading={aiLesson.loading}
        content={aiLesson.content}
        subjectLine={aiLesson.subjectLine}
      />

      <QuestionBankJuridiquesModal
        open={juridiques.open}
        onClose={juridiques.onClose}
        selectedText={juridiques.selectedText}
        loading={juridiques.loading}
        explanation={juridiques.explanation}
      />

      <QuestionBankManualGlossaryModal
        open={manualGlossary.open}
        onClose={manualGlossary.onClose}
        term={manualGlossary.term}
        onTermChange={manualGlossary.onTermChange}
        onSubmit={manualGlossary.onSubmit}
        isLoading={manualGlossary.isLoading}
      />

      <AnimatePresence>
        {glossaryPopover.activeTerm && glossaryPopover.data && (
          <GlossaryPopover
            data={glossaryPopover.data}
            onClose={glossaryPopover.onClose}
            userId={glossaryPopover.userId}
            isOnline={glossaryPopover.isOnline}
            position={glossaryPopover.position}
          />
        )}
      </AnimatePresence>

      {glossaryLoadingOverlay.visible && (
        <div
          className="fixed z-[100] p-4 bg-white rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-3 animate-in fade-in duration-200"
          style={{
            left: glossaryLoadingOverlay.position.x,
            top: glossaryLoadingOverlay.position.y + 20,
          }}
        >
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          <span className="text-sm font-bold text-slate-600">Buscando definição...</span>
        </div>
      )}

      {notebookModal.isOpen && (
        <NotebookModal
          isOpen={notebookModal.isOpen}
          onClose={notebookModal.onClose}
          notebooks={notebookModal.notebooks}
          selectedQuestionIds={notebookModal.selectedQuestionIds}
          onCreateNotebook={notebookModal.onCreateNotebook}
          onAddToNotebook={notebookModal.onAddToNotebook}
          isSubmitting={notebookModal.isSubmitting}
        />
      )}

      <QuestionBankDeckPickerModal
        open={deckPicker.open}
        onClose={deckPicker.onClose}
        folders={deckPicker.folders}
        isSubmitting={deckPicker.isSubmitting}
        onPickFolder={deckPicker.onPickFolder}
      />

      <QuestionBankPdfHiddenShell active={pdfExportActive} />
    </>
  );
}

export const QuestionBankModalsLayer = memo(QuestionBankModalsLayerInner);
