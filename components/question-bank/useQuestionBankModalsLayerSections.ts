import { useCallback, useMemo, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { Folder, GlossaryTerm, Notebook } from '../../types';
import type { QuestionBankAiConfig, QuestionBankAiConfigSetter } from './types';
import type { QuestionBankModalsLayerProps } from './QuestionBankModalsLayer';

export type QuestionBankModalsLayerSectionsParams = {
  showAIGenerator: boolean;
  setShowAIGenerator: Dispatch<SetStateAction<boolean>>;
  aiConfig: QuestionBankAiConfig;
  setAiConfig: QuestionBankAiConfigSetter;
  folders: Folder[];
  handleGenerateAI: (e: FormEvent) => void | Promise<void>;
  isGenerating: boolean;
  generatingStatus: string;
  aiCooldown: number;
  notification: { message: string; type: 'success' | 'error' } | null;
  showAiLesson: boolean;
  setShowAiLesson: Dispatch<SetStateAction<boolean>>;
  loadingAiLesson: boolean;
  aiLessonContent: string;
  selectedSubjects: string[];
  showJuridiquesModal: boolean;
  setShowJuridiquesModal: Dispatch<SetStateAction<boolean>>;
  selectedText: string;
  loadingJuridiquesExplanation: boolean;
  juridiquesExplanation: string;
  showManualGlossarySearch: boolean;
  setShowManualGlossarySearch: Dispatch<SetStateAction<boolean>>;
  manualSearchTerm: string;
  setManualSearchTerm: Dispatch<SetStateAction<string>>;
  handleManualSearch: (e?: FormEvent) => void | Promise<void>;
  isLoadingGlossary: boolean;
  activeGlossaryTerm: string | null;
  glossaryData: GlossaryTerm | null;
  setActiveGlossaryTerm: Dispatch<SetStateAction<string | null>>;
  setGlossaryData: Dispatch<SetStateAction<GlossaryTerm | null>>;
  userId: string;
  isOnline: boolean;
  glossaryPosition: { x: number; y: number };
  isNotebookModalOpen: boolean;
  setIsNotebookModalOpen: Dispatch<SetStateAction<boolean>>;
  notebooks: Notebook[];
  selectedQuestionsForNotebook: Set<string>;
  setNewNotebookName: Dispatch<SetStateAction<string>>;
  setNewNotebookDescription: Dispatch<SetStateAction<string>>;
  handleCreateNotebook: () => void | Promise<void>;
  setNotebooks: Dispatch<SetStateAction<Notebook[]>>;
  setSelectedQuestionsForNotebook: Dispatch<SetStateAction<Set<string>>>;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  isSubmitting: boolean;
  isDeckModalOpen: boolean;
  setIsDeckModalOpen: Dispatch<SetStateAction<boolean>>;
  handleConfirmFlashcardCreation: (folderId: string) => void | Promise<void>;
  isExporting: boolean;
};

export type QuestionBankModalsLayerSections = Omit<QuestionBankModalsLayerProps, 'children'>;

export function useQuestionBankModalsLayerSections(
  p: QuestionBankModalsLayerSectionsParams
): QuestionBankModalsLayerSections {
  const closeGlossaryPopover = useCallback(() => {
    p.setActiveGlossaryTerm(null);
    p.setGlossaryData(null);
  }, [p.setActiveGlossaryTerm, p.setGlossaryData]);

  const closeNotebookModal = useCallback(() => {
    p.setIsNotebookModalOpen(false);
  }, [p.setIsNotebookModalOpen]);

  const onCreateNotebookFromModal = useCallback(
    async (name: string, description: string) => {
      p.setNewNotebookName(name);
      p.setNewNotebookDescription(description);
      await p.handleCreateNotebook();
      p.setIsNotebookModalOpen(false);
    },
    [
      p.setNewNotebookName,
      p.setNewNotebookDescription,
      p.handleCreateNotebook,
      p.setIsNotebookModalOpen,
    ]
  );

  const onAddToNotebookFromModal = useCallback(
    async (notebookId: string) => {
      try {
        p.setIsSubmitting(true);
        const notebook = p.notebooks.find((n) => n.id === notebookId);
        if (!notebook) return;

        const updatedQuestionIds = Array.from(
          new Set([...notebook.question_ids, ...Array.from(p.selectedQuestionsForNotebook)])
        );

        const { error } = await supabase
          .from('notebooks')
          .update({ question_ids: updatedQuestionIds })
          .eq('id', notebookId);

        if (error) throw error;

        p.setNotebooks((prev) =>
          prev.map((n) => (n.id === notebookId ? { ...n, question_ids: updatedQuestionIds } : n))
        );
        p.showNotification('Questões adicionadas ao caderno!', 'success');
        p.setSelectedQuestionsForNotebook(new Set());
        p.setIsNotebookModalOpen(false);
      } catch {
        p.showNotification('Erro ao adicionar ao caderno.', 'error');
      } finally {
        p.setIsSubmitting(false);
      }
    },
    [
      p.notebooks,
      p.selectedQuestionsForNotebook,
      p.setNotebooks,
      p.showNotification,
      p.setSelectedQuestionsForNotebook,
      p.setIsNotebookModalOpen,
      p.setIsSubmitting,
    ]
  );

  const selectedQuestionIds = useMemo(
    () => Array.from(p.selectedQuestionsForNotebook),
    [p.selectedQuestionsForNotebook]
  );

  const aiLessonSubjectLine = useMemo(() => {
    if (p.selectedSubjects.length === 0) return '—';
    if (p.selectedSubjects.length === 1) return p.selectedSubjects[0];
    return p.selectedSubjects.join(' · ');
  }, [p.selectedSubjects]);

  const aiGenerator = useMemo(
    () => ({
      open: p.showAIGenerator,
      onClose: () => p.setShowAIGenerator(false),
      aiConfig: p.aiConfig,
      setAiConfig: p.setAiConfig,
      folders: p.folders,
      onSubmit: p.handleGenerateAI,
      isGenerating: p.isGenerating,
      generatingStatus: p.generatingStatus,
      aiCooldown: p.aiCooldown,
    }),
    [
      p.showAIGenerator,
      p.setShowAIGenerator,
      p.aiConfig,
      p.setAiConfig,
      p.folders,
      p.handleGenerateAI,
      p.isGenerating,
      p.generatingStatus,
      p.aiCooldown,
    ]
  );

  const notification = useMemo(
    () => ({
      message: p.notification?.message ?? null,
      type: p.notification?.type ?? null,
    }),
    [p.notification]
  );

  const aiLesson = useMemo(
    () => ({
      open: p.showAiLesson,
      onClose: () => p.setShowAiLesson(false),
      loading: p.loadingAiLesson,
      content: p.aiLessonContent,
      subjectLine: aiLessonSubjectLine,
    }),
    [p.showAiLesson, p.setShowAiLesson, p.loadingAiLesson, p.aiLessonContent, aiLessonSubjectLine]
  );

  const juridiques = useMemo(
    () => ({
      open: p.showJuridiquesModal,
      onClose: () => p.setShowJuridiquesModal(false),
      selectedText: p.selectedText,
      loading: p.loadingJuridiquesExplanation,
      explanation: p.juridiquesExplanation,
    }),
    [
      p.showJuridiquesModal,
      p.setShowJuridiquesModal,
      p.selectedText,
      p.loadingJuridiquesExplanation,
      p.juridiquesExplanation,
    ]
  );

  const manualGlossary = useMemo(
    () => ({
      open: p.showManualGlossarySearch,
      onClose: () => p.setShowManualGlossarySearch(false),
      term: p.manualSearchTerm,
      onTermChange: p.setManualSearchTerm,
      onSubmit: p.handleManualSearch,
      isLoading: p.isLoadingGlossary,
    }),
    [
      p.showManualGlossarySearch,
      p.setShowManualGlossarySearch,
      p.manualSearchTerm,
      p.setManualSearchTerm,
      p.handleManualSearch,
      p.isLoadingGlossary,
    ]
  );

  const glossaryPopover = useMemo(
    () => ({
      activeTerm: p.activeGlossaryTerm,
      data: p.glossaryData,
      onClose: closeGlossaryPopover,
      userId: p.userId,
      isOnline: p.isOnline,
      position: p.glossaryPosition,
    }),
    [
      p.activeGlossaryTerm,
      p.glossaryData,
      closeGlossaryPopover,
      p.userId,
      p.isOnline,
      p.glossaryPosition,
    ]
  );

  const glossaryLoadingOverlay = useMemo(
    () => ({
      visible: p.isLoadingGlossary && !p.glossaryData,
      position: p.glossaryPosition,
    }),
    [p.isLoadingGlossary, p.glossaryData, p.glossaryPosition]
  );

  const notebookModal = useMemo(
    () => ({
      isOpen: p.isNotebookModalOpen,
      onClose: closeNotebookModal,
      notebooks: p.notebooks,
      selectedQuestionIds,
      onCreateNotebook: onCreateNotebookFromModal,
      onAddToNotebook: onAddToNotebookFromModal,
      isSubmitting: p.isSubmitting,
    }),
    [
      p.isNotebookModalOpen,
      closeNotebookModal,
      p.notebooks,
      selectedQuestionIds,
      onCreateNotebookFromModal,
      onAddToNotebookFromModal,
      p.isSubmitting,
    ]
  );

  const deckPicker = useMemo(
    () => ({
      open: p.isDeckModalOpen,
      onClose: () => p.setIsDeckModalOpen(false),
      folders: p.folders,
      isSubmitting: p.isSubmitting,
      onPickFolder: (folderId: string) => {
        void p.handleConfirmFlashcardCreation(folderId);
      },
    }),
    [p.isDeckModalOpen, p.setIsDeckModalOpen, p.folders, p.isSubmitting, p.handleConfirmFlashcardCreation]
  );

  return useMemo(
    () => ({
      aiGenerator,
      notification,
      aiLesson,
      juridiques,
      manualGlossary,
      glossaryPopover,
      glossaryLoadingOverlay,
      notebookModal,
      deckPicker,
      pdfExportActive: p.isExporting,
    }),
    [
      aiGenerator,
      notification,
      aiLesson,
      juridiques,
      manualGlossary,
      glossaryPopover,
      glossaryLoadingOverlay,
      notebookModal,
      deckPicker,
      p.isExporting,
    ]
  );
}
