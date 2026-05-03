import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import {
  Question,
  UserProgress,
  Notebook,
  Folder,
  Flashcard,
  questionModalityLabel,
  formatAlternativesAnalysisPlain,
  type QuestionAiCommentary,
  type QuestionAiCorrection,
  type GlossaryTerm,
} from '../types';
import { dataService } from '../services/dataService';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { GEMINI_MODEL, extractPrecedent } from '../services/geminiService';
import { createTrailingDebounce } from '../utils/realtimeThrottle';
import { Loader2 } from 'lucide-react';
import { fetchTermDefinition } from '../services/geminiService';
import { exportQuestionBankPdf } from './question-bank/exportQuestionBankPdf';
import { MockResultsView } from './question-bank/MockResultsView';
import { MockSetupModal } from './question-bank/MockSetupModal';
import {
  QuestionBankFiltersPanel,
  type ActiveFilterChip,
} from './question-bank/QuestionBankFiltersPanel';
import type {
  SyncUserProgressUpdates,
  QuestionBankMockResults,
  QuestionBankAiConfig,
  QuestionBankSavedFilterPreset,
} from './question-bank/types';
import { validateAiQuestionsBatch } from './question-bank/validateAiGeneratedQuestions';
import {
  applyCanonicalTopicsToRows,
  buildTopicMinimalityInstructions,
  buildTopicReuseCatalog,
  MAX_DISTINCT_TOPICS_PER_AI_BATCH,
  TOPIC_REUSE_PROMPT_MAX_LABELS,
} from './question-bank/aiQuestionTopics';
import { dedupeSimilarAiStatements } from './question-bank/similarStatementDetection';
import {
  buildAiDistractorQualityBlock,
  buildAiHighDifficultyStemBlock,
  refineMultipleChoiceDistractors,
  shouldRefineMcDistractors,
} from './question-bank/aiDistractorInstructions';
import {
  bumpAnswerGoals,
  createDefaultAnswerGoals,
  parseAnswerGoalsFromDb,
  reconcileAnswerGoals,
  type QuestionAnswerGoalsPersisted,
} from './question-bank/answerGoals';
import {
  isQuestionDueForReviewToday,
  type QuestionStatForReview,
} from './question-bank/questionReviewQueue';
import {
  normalizeQuestionFromApi,
  buildCappedFlashcardContextForAi,
  migrateSavedFilterPresetRow,
  QUESTION_BANK_LIST_COLUMNS,
  QUESTION_BANK_FACET_COLUMNS,
  QB_USER_QUESTION_STATS_COLUMNS,
  QB_NOTEBOOK_LIST_COLUMNS,
  QB_USER_PROGRESS_COLUMNS,
} from './question-bank/questionBankHelpers';
import { filterAndSortBankQuestions } from './question-bank/filterBankQuestions';
import {
  buildAiStatementBatches,
  buildAiStatementEnforcementBlock,
  QB_STATEMENT_CASO,
  QB_STATEMENT_DIRETO,
  QB_STATEMENT_MIX,
} from './question-bank/mixedStatementBatches';
import { QuestionBankConfidenceModal } from './question-bank/QuestionBankConfidenceModal';
import { QuestionBankMockHud } from './question-bank/QuestionBankMockHud';
import { QuestionBankMainHeader } from './question-bank/QuestionBankMainHeader';
import { QuestionBankErrorInsightBanner } from './question-bank/QuestionBankErrorInsightBanner';
import { QuestionBankQuestionArea } from './question-bank/QuestionBankQuestionArea';
import { QuestionBankModalsLayer } from './question-bank/QuestionBankModalsLayer';
import { useQuestionBankModalsLayerSections } from './question-bank/useQuestionBankModalsLayerSections';
import { QuestionBankMockSessionPanel } from './question-bank/QuestionBankMockSessionPanel';
import { QuestionBankStatsGoalsNotebookShell } from './question-bank/QuestionBankStatsGoalsNotebookShell';

interface QuestionBankProps {
  userId: string;
  folders?: Folder[];
  flashcards?: Flashcard[];
  isOnline?: boolean;
}

const QUESTION_FETCH_PAGE_SIZE = 200;
const QUESTION_FACET_BOOTSTRAP_LIMIT = 5000;
const QUESTION_BANK_LIST_COLUMNS_LEGACY_FALLBACK =
  'id, user_id, subject, topic, statement, options, correct_answer, explanation, difficulty, exam_board, institution, exam_name, modality, legal_diploma, year, created_at, audio_hint, listen_count, status, is_reinforcement, legislation_tags, jurisprudence_tags, ai_summary';
const QUESTION_BANK_FACET_COLUMNS_LEGACY_FALLBACK =
  'topic, subject, exam_board, year, legislation_tags, jurisprudence_tags, institution, exam_name, legal_diploma';

/** Alinhado ao select do gerador de IA — guia a profundidade pedida ao modelo. */
const AI_DIFFICULTY_PROMPT_LABEL: Record<QuestionBankAiConfig['difficulty'], string> = {
  muito_facil: 'muito fácil (conceitos elementares, memorização direta)',
  facil: 'fácil',
  media: 'média',
  dificil: 'difícil (análise e armadilhas habituais de banca)',
  muito_dificil:
    'muito difícil (nível máximo: sutilezas doutrinárias ou jurisprudenciais, distratores sofisticados, casos limite)',
};

const QuestionBank: React.FC<QuestionBankProps> = ({ 
  userId, 
  folders = [], 
  flashcards = [],
  isOnline = true,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const qbDeepLinkApplied = useRef(false);
  const nextQuestionRangeStartRef = useRef(0);
  const facetBootstrapRef = useRef<Question[]>([]);
  /** Evita que um SELECT vazio sobrescreva a lista logo após insert local (RLS / latência). */
  const skipEmptyFetchOverwriteRef = useRef(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsHasMore, setQuestionsHasMore] = useState(true);
  const [loadingMoreQuestions, setLoadingMoreQuestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [resolvedPreviewQuestionId, setResolvedPreviewQuestionId] = useState<string | null>(null);
  
  // Filters
  const [topics, setTopics] = useState<string[]>([]);
  const [examBoards, setExamBoards] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [legislationTags, setLegislationTags] = useState<string[]>([]);
  const [jurisprudenceTags, setJurisprudenceTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedExamBoard, setSelectedExamBoard] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedLegislation, setSelectedLegislation] = useState<string>('');
  const [selectedJurisprudence, setSelectedJurisprudence] = useState<string>('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [selectedExamName, setSelectedExamName] = useState<string>('');
  const [selectedModality, setSelectedModality] = useState<string>('');
  const [selectedLegalDiploma, setSelectedLegalDiploma] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [examNames, setExamNames] = useState<string[]>([]);
  const [legalDiplomas, setLegalDiplomas] = useState<string[]>([]);
  const [careers, setCareers] = useState<string[]>([]);
  const [formationAreas, setFormationAreas] = useState<string[]>([]);
  const [educationLevels, setEducationLevels] = useState<string[]>([]);
  const [jobPositions, setJobPositions] = useState<string[]>([]);
  const [selectedCareer, setSelectedCareer] = useState('');
  const [selectedFormationArea, setSelectedFormationArea] = useState('');
  const [selectedEducationLevel, setSelectedEducationLevel] = useState('');
  const [selectedJobPosition, setSelectedJobPosition] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);
  const [listFontScalePercent, setListFontScalePercent] = useState(100);
  const [savedFilterPresets, setSavedFilterPresets] = useState<QuestionBankSavedFilterPreset[]>([]);
  const [qbDarkSynced, setQbDarkSynced] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'difficulty_asc' | 'difficulty_desc'>('newest');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<string[]>([]);
  const [correctQuestions, setCorrectQuestions] = useState<string[]>([]);
  /** Evita gravar [] no localStorage antes de ler o cache deste userId (uma gravação prematura apagaria os dados). */
  const [progressStorageHydrated, setProgressStorageHydrated] = useState(false);

  // Load from localStorage as soon as userId is available
  useEffect(() => {
    if (!userId) {
      setProgressStorageHydrated(false);
      return;
    }
    let correct: string[] = [];
    let wrong: string[] = [];
    const savedCorrect = localStorage.getItem(`correct_questions_${userId}`);
    if (savedCorrect) {
      try {
        const parsed = JSON.parse(savedCorrect);
        if (Array.isArray(parsed)) correct = parsed;
      } catch (e) {
        console.error('Error parsing correct questions from storage', e);
      }
    }
    const savedWrong = localStorage.getItem(`wrong_questions_${userId}`);
    if (savedWrong) {
      try {
        const parsed = JSON.parse(savedWrong);
        if (Array.isArray(parsed)) wrong = parsed;
      } catch (e) {
        console.error('Error parsing wrong questions from storage', e);
      }
    }
    setCorrectQuestions(correct);
    setWrongQuestions(wrong);
    setProgressStorageHydrated(true);
  }, [userId]);

  // Save to localStorage whenever state changes (inclui listas vazias após reset / sync)
  useEffect(() => {
    if (!userId || !progressStorageHydrated) return;
    localStorage.setItem(`correct_questions_${userId}`, JSON.stringify(correctQuestions));
  }, [correctQuestions, userId, progressStorageHydrated]);

  useEffect(() => {
    if (!userId || !progressStorageHydrated) return;
    localStorage.setItem(`wrong_questions_${userId}`, JSON.stringify(wrongQuestions));
  }, [wrongQuestions, userId, progressStorageHydrated]);
  const [questionStatus, setQuestionStatus] = useState<
    'all' | 'resolved' | 'unresolved' | 'correct' | 'wrong' | 'review_today'
  >('all');
  const [showXRay, setShowXRay] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'single'>('list');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const savedFiltersStorageKey = useMemo(() => `qb_filters_saved_${userId}`, [userId]);

  useEffect(() => {
    if (!userId) {
      setSavedFilterPresets([]);
      return;
    }
    try {
      const raw = localStorage.getItem(savedFiltersStorageKey);
      if (!raw) setSavedFilterPresets([]);
      else {
        const p = JSON.parse(raw) as unknown;
        setSavedFilterPresets(
          Array.isArray(p)
            ? p
                .map(migrateSavedFilterPresetRow)
                .filter((x): x is QuestionBankSavedFilterPreset => x != null)
            : []
        );
      }
    } catch {
      setSavedFilterPresets([]);
    }
    try {
      const ps = localStorage.getItem(`qb_page_size_${userId}`);
      if (ps) {
        const n = parseInt(ps, 10);
        if (!Number.isNaN(n)) setListPageSize(Math.min(100, Math.max(10, n)));
      }
      const fs = localStorage.getItem(`qb_font_pct_${userId}`);
      if (fs) {
        const n = parseInt(fs, 10);
        if (!Number.isNaN(n)) setListFontScalePercent(Math.min(130, Math.max(85, n)));
      }
    } catch {
      /* ignore */
    }
  }, [userId, savedFiltersStorageKey]);

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(`qb_page_size_${userId}`, String(listPageSize));
  }, [listPageSize, userId]);

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(`qb_font_pct_${userId}`, String(listFontScalePercent));
  }, [listFontScalePercent, userId]);

  useEffect(() => {
    setQbDarkSynced(document.documentElement.classList.contains('dark'));
  }, []);

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    let errorMessage = 'Erro desconhecido';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const err = error as any;
      // Try to extract message from Supabase error structure
      errorMessage = err.message || err.details || err.hint || (err.code ? `Erro código ${err.code}` : '');
      
      if (!errorMessage || errorMessage === '[object Object]') {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Erro de estrutura complexa no banco de dados';
        }
      }
    } else {
      errorMessage = String(error);
    }

    const errInfo = {
      error: errorMessage,
      userId: userId || undefined,
      operationType,
      path,
      rawError: error
    };
    
    console.error('Firestore Error Detail:', errInfo);
    showNotification(`Erro no banco de dados (${operationType}): ${errorMessage}`, 'error');
  };
  const [generatingPrecedentId, setGeneratingPrecedentId] = useState<string | null>(null);

  const getXRayStats = (questionId: string) => {
    const stats = questionStats[questionId];
    if (!stats) {
      return {
        totalAttempts: 0,
        correctAttempts: 0,
        lastAttemptCorrect: false,
        avgTime: '0s'
      };
    }
    
    return {
      totalAttempts: stats.totalAttempts,
      correctAttempts: stats.correctAttempts,
      lastAttemptCorrect: stats.lastAttemptCorrect,
      avgTime: '0s'
    };
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta questão permanentemente do banco de dados?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(prev => prev.filter(q => q.id !== questionId));
      showNotification('Questão excluída com sucesso.', 'success');
    } catch (error) {
      console.error('Error deleting question:', error);
      showNotification('Erro ao excluir questão.', 'error');
    }
  };

  const handleSavePrecedent = async (q: Question) => {
    try {
      setGeneratingPrecedentId(q.id);
      const summary = await extractPrecedent(q.statement, q.options[q.correct_answer]);
      
      const { error } = await supabase
        .from('questions')
        .update({ ai_summary: summary })
        .eq('id', q.id);

      if (error) throw error;

      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, ai_summary: summary } : item));
      showNotification('Precedente salvo com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving precedent:', error);
      showNotification('Erro ao gerar precedente.', 'error');
    } finally {
      setGeneratingPrecedentId(null);
    }
  };
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Notebooks and Selection States
  const [selectedQuestionsForNotebook, setSelectedQuestionsForNotebook] = useState<Set<string>>(new Set());
  const [showNotebookCreationMode, setShowNotebookCreationMode] = useState(false);
  const [isNotebookModalOpen, setIsNotebookModalOpen] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookDescription, setNewNotebookDescription] = useState('');
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('');

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, number[]>>({});
  const [confidenceLevel, setConfidenceLevel] = useState<'certeza' | 'duvida' | 'chute' | null>(null);
  const [showConfidenceSelection, setShowConfidenceSelection] = useState(false);
  const [pendingAnswerIndex, setPendingAnswerIndex] = useState<number | null>(null);
  const [sessionConfidenceStats, setSessionConfidenceStats] = useState<Record<string, 'certeza' | 'duvida' | 'chute'>>({});
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [answerGoals, setAnswerGoals] = useState(createDefaultAnswerGoals);
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const [questionStats, setQuestionStats] = useState<Record<string, QuestionStatForReview>>({});
  const [errorMastery, setErrorMastery] = useState<Record<string, number>>({});
  const [isErrorNotebookMode, setIsErrorNotebookMode] = useState(false);
  const [showAiLesson, setShowAiLesson] = useState(false);
  const [aiLessonContent, setAiLessonContent] = useState<string | null>(null);
  const [loadingAiLesson, setLoadingAiLesson] = useState(false);

  // Mock Mode States
  const [isMockMode, setIsMockMode] = useState(false);
  const [mockTimeRemaining, setMockTimeRemaining] = useState(0);
  const [mockAnswers, setMockAnswers] = useState<Record<string, number>>({});
  const [isMockFinished, setIsMockFinished] = useState(false);
  const [mockStartTime, setMockStartTime] = useState<number | null>(null);
  const [showMockSetup, setShowMockSetup] = useState(false);
  const [mockDurationMinutes, setMockDurationMinutes] = useState(60);
  const [mockQuestions, setMockQuestions] = useState<Question[]>([]);
  const [mockResults, setMockResults] = useState<QuestionBankMockResults | null>(null);
  const [mockNavUnansweredOnly, setMockNavUnansweredOnly] = useState(false);
  const [mockMarkReviewLater, setMockMarkReviewLater] = useState<Record<string, boolean>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mockAnswersRef = useRef<Record<string, number>>({});

  const clearAllQuestionFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedSubjects([]);
    setSelectedTopic('');
    setDifficultyFilter('');
    setQuestionStatus('all');
    setSelectedNotebookId('');
    setSelectedInstitution('');
    setSelectedExamName('');
    setSelectedModality('');
    setSelectedLegalDiploma('');
    setSelectedExamBoard('');
    setSelectedYear('');
    setSelectedLegislation('');
    setSelectedJurisprudence('');
    setSelectedCareer('');
    setSelectedFormationArea('');
    setSelectedEducationLevel('');
    setSelectedJobPosition('');
  }, []);

  const startMock = (questionsToUse: Question[], durationMinutes: number) => {
    setMockQuestions(questionsToUse);
    setMockTimeRemaining(durationMinutes * 60);
    setMockDurationMinutes(durationMinutes);
    setIsMockMode(true);
    setIsMockFinished(false);
    setMockAnswers({});
    setMockMarkReviewLater({});
    setMockNavUnansweredOnly(false);
    setMockStartTime(Date.now());
    setCurrentIndex(0);
    setShowMockSetup(false);
    setViewMode('single');
    
    // Zen Mode: Hide sidebar and header (handled by isMockMode state in parent/layout if needed, 
    // but here we'll just make the QuestionBank take over the screen)
  };

  const finishMockRef = useRef<() => void>(null);
  
  const finishMock = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const endTime = Date.now();
    const timeSpent = Math.floor((endTime - (mockStartTime || endTime)) / 1000);
    
    // Calculate results
    let correct = 0;
    const subjectMap: Record<string, { correct: number; total: number; confidence: Record<string, number>; correctConfidence: Record<string, number> }> = {};
    const confidenceStats = { certeza: 0, duvida: 0, chute: 0 };
    const luckyGuesses: string[] = [];
    const doubtGuesses: string[] = [];
    const reviewLaterIds = mockQuestions.filter(q => mockMarkReviewLater[q.id]).map(q => q.id);
    const unansweredIds = mockQuestions.filter(q => mockAnswers[q.id] === undefined).map(q => q.id);

    mockQuestions.forEach(q => {
      const userAnswer = mockAnswers[q.id];
      const isCorrect = userAnswer === q.correct_answer;
      const confidence = sessionConfidenceStats[q.id] || 'certeza';
      
      if (isCorrect) {
        correct++;
        if (confidence === 'chute') luckyGuesses.push(q.id);
        if (confidence === 'duvida') doubtGuesses.push(q.id);
      }
      
      if (!subjectMap[q.subject]) {
        subjectMap[q.subject] = { correct: 0, total: 0, confidence: { certeza: 0, duvida: 0, chute: 0 }, correctConfidence: { certeza: 0, duvida: 0, chute: 0 } };
      }
      subjectMap[q.subject].total++;
      subjectMap[q.subject].confidence[confidence]++;
      confidenceStats[confidence]++;
      if (isCorrect) {
        subjectMap[q.subject].correct++;
        subjectMap[q.subject].correctConfidence[confidence]++;
      }
    });
    
    const subjectStats = Object.entries(subjectMap).map(([subject, stats]) => ({
      subject,
      ...stats
    }));
    
    setMockResults({
      score: correct,
      total: mockQuestions.length,
      timeSpent,
      startedAtIso: mockStartTime != null ? new Date(mockStartTime).toISOString() : undefined,
      subjectStats,
      avgTimePerQuestion: timeSpent / (Object.keys(mockAnswers).length || 1),
      confidenceStats,
      luckyGuesses,
      doubtGuesses,
      reviewLaterIds,
      unansweredIds,
    });
    
    setIsMockFinished(true);

    const answeredQuestions = mockQuestions.filter(q => mockAnswers[q.id] !== undefined);
    let nextStats = { ...questionStats };
    let nextGoals = answerGoals;
    const nowIso = new Date().toISOString();
    for (const q of answeredQuestions) {
      const userAnswer = mockAnswers[q.id];
      const isCorrect = userAnswer === q.correct_answer;
      const cur = nextStats[q.id] || { totalAttempts: 0, correctAttempts: 0, lastAttemptCorrect: false };
      const newStat: QuestionStatForReview = {
        totalAttempts: cur.totalAttempts + 1,
        correctAttempts: isCorrect ? cur.correctAttempts + 1 : cur.correctAttempts,
        lastAttemptCorrect: isCorrect,
        updatedAt: nowIso,
      };
      nextStats[q.id] = newStat;
      nextGoals = bumpAnswerGoals(nextGoals);
      void supabase
        .from('user_question_stats')
        .upsert(
          {
            user_id: userId,
            question_id: q.id,
            total_attempts: newStat.totalAttempts,
            correct_attempts: newStat.correctAttempts,
            last_attempt_correct: newStat.lastAttemptCorrect,
            updated_at: nowIso,
          },
          { onConflict: 'user_id, question_id' }
        )
        .then(({ error }) => {
          if (error) console.error('Error saving question stat (simulado):', error);
        });
    }
    setQuestionStats(nextStats);
    setAnswerGoals(nextGoals);
    
    // Update local state and sync to Supabase
    const correctIds = mockQuestions
      .filter(q => mockAnswers[q.id] === q.correct_answer)
      .map(q => q.id);
    const wrongIds = mockQuestions
      .filter(q => mockAnswers[q.id] !== undefined && mockAnswers[q.id] !== q.correct_answer)
      .map(q => q.id);
      
    const newCorrectQuestions = [...new Set([...correctQuestions, ...correctIds])];
    const newWrongQuestions = [...new Set([...wrongQuestions, ...wrongIds])];
    const newCorrectCount = correctCount + correctIds.length;
    const newWrongCount = wrongCount + wrongIds.length;

    setCorrectQuestions(newCorrectQuestions);
    setWrongQuestions(newWrongQuestions);
    setCorrectCount(newCorrectCount);
    setWrongCount(newWrongCount);

    const currentConfidenceLevels = { ...(userProgress?.confidence_levels || {}), ...sessionConfidenceStats };

    syncUserProgress({
      correctQuestions: newCorrectQuestions,
      wrongQuestions: newWrongQuestions,
      correctCount: newCorrectCount,
      wrongCount: newWrongCount,
      confidence_levels: currentConfidenceLevels,
      question_answer_goals: nextGoals,
    });
  };

  useEffect(() => {
    finishMockRef.current = finishMock;
  }, [finishMock]);

  useEffect(() => {
    mockAnswersRef.current = mockAnswers;
  }, [mockAnswers]);

  useEffect(() => {
    if (isMockMode && !isMockFinished && mockTimeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setMockTimeRemaining(prev => {
          if (prev <= 1) {
            if (finishMockRef.current) finishMockRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMockMode, isMockFinished]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    setNotification({ message, type });
    notificationTimeoutRef.current = setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    };
  }, []);

  // Effect to capture text selection for Juridiquês Translator
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        setSelectedText(selection.toString());
      } else {
        setSelectedText('');
      }
    };

    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
    };
  }, []);

  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiConfig, setAiConfig] = useState<QuestionBankAiConfig>({
    subject: '',
    topic: '',
    context: '',
    count: 3,
    difficulty: 'media',
    examStyle: 'OAB (FGV)',
    legalFocus: [],
    statementType: 'Caso Prático (Situação Hipotética)',
    baseOnFlashcards: false,
    selectedFolderId: '',
    tribunal: 'Ambos',
    yearFilter: 'Últimos 2 anos',
    institution: '',
    examName: '',
    modality: 'multipla_escolha',
    legalDiploma: '',
    career: '',
    formationArea: '',
    educationLevel: '',
    jobPosition: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState<string>('');
  const [aiCooldown, setAiCooldown] = useState(0);
  const [isSavingPrecedent, setIsSavingPrecedent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (aiCooldown > 0) {
      const timer = setTimeout(() => setAiCooldown(aiCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [aiCooldown]);

  const aiModalPrefilledRef = useRef(false);
  useEffect(() => {
    if (!showAIGenerator) {
      aiModalPrefilledRef.current = false;
      return;
    }
    if (aiModalPrefilledRef.current) return;
    aiModalPrefilledRef.current = true;
    setAiConfig((prev) => ({
      ...prev,
      subject:
        selectedSubjects.length === 0
          ? prev.subject
          : selectedSubjects.length === 1
            ? selectedSubjects[0]
            : selectedSubjects.join('; '),
      topic: selectedTopic || prev.topic,
      examStyle: selectedExamBoard || prev.examStyle,
      institution: selectedInstitution || prev.institution,
      examName: selectedExamName || prev.examName,
      legalDiploma: selectedLegalDiploma || prev.legalDiploma,
      modality: (selectedModality as QuestionBankAiConfig['modality']) || prev.modality,
      career: selectedCareer || prev.career,
      formationArea: selectedFormationArea || prev.formationArea,
      educationLevel: selectedEducationLevel || prev.educationLevel,
      jobPosition: selectedJobPosition || prev.jobPosition,
      ...(difficultyFilter &&
      ['muito_facil', 'facil', 'media', 'dificil', 'muito_dificil'].includes(difficultyFilter)
        ? { difficulty: difficultyFilter as QuestionBankAiConfig['difficulty'] }
        : {}),
    }));
  }, [
    showAIGenerator,
    selectedSubjects,
    selectedTopic,
    selectedExamBoard,
    selectedInstitution,
    selectedExamName,
    selectedLegalDiploma,
    selectedModality,
    selectedCareer,
    selectedFormationArea,
    selectedEducationLevel,
    selectedJobPosition,
    difficultyFilter,
  ]);

  // Glossary States
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<string | null>(null);
  const [glossaryData, setGlossaryData] = useState<GlossaryTerm | null>(null);
  const [glossaryPosition, setGlossaryPosition] = useState({ x: 0, y: 0 });
  const [isLoadingGlossary, setIsLoadingGlossary] = useState(false);
  const [showManualGlossarySearch, setShowManualGlossarySearch] = useState(false);
  const [manualSearchTerm, setManualSearchTerm] = useState('');

  const handleTermClick = async (term: string, position: { x: number; y: number }) => {
    setActiveGlossaryTerm(term);
    setGlossaryPosition(position);
    setIsLoadingGlossary(true);
    setGlossaryData(null);
    
    try {
      const data = await fetchTermDefinition(term);
      if (data) {
        setGlossaryData({ ...data, term });
      }
    } catch (error) {
      console.error("Error fetching glossary term:", error);
      showNotification('Erro ao buscar definição do termo.', 'error');
    } finally {
      setIsLoadingGlossary(false);
    }
  };

  const handleManualSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualSearchTerm.trim()) return;

    setIsLoadingGlossary(true);
    setGlossaryData(null);
    // Position manual search results in the center of the screen or near the search icon
    setGlossaryPosition({ x: window.innerWidth / 2, y: 100 });
    
    try {
      const data = await fetchTermDefinition(manualSearchTerm);
      if (data) {
        setGlossaryData({ ...data, term: manualSearchTerm });
        setActiveGlossaryTerm(manualSearchTerm);
      }
    } catch (error) {
      console.error("Error in manual glossary search:", error);
      showNotification('Erro ao buscar definição.', 'error');
    } finally {
      setIsLoadingGlossary(false);
    }
  };

  const handleSaveAsPrecedent = async (question: Question) => {
    try {
      setIsSavingPrecedent(prev => ({ ...prev, [question.id]: true }));
      
      // 1. Find or create the "Precedentes Relevantes" folder
      let precedentFolder = folders.find(f => f.name === 'Precedentes Relevantes');
      let folderId = precedentFolder?.id;

      if (!folderId) {
        const newFolderId = crypto.randomUUID();
        const newFolder: Folder = {
          id: newFolderId,
          user_id: userId,
          name: 'Precedentes Relevantes',
          parentId: null,
          color: '#8b5cf6'
        };

        await dataService.saveFolder(newFolder, userId, isOnline);
        folderId = newFolderId;
      }

      // 2. Create the flashcard
      const commentary = aiCommentary[question.id];
      const front = `[PRECEDENTE] ${question.statement}`;
      let back = `**GABARITO: ${String.fromCharCode(65 + question.correct_answer)}**\n\n`;
      
      if (commentary) {
        if (typeof commentary === 'string') {
          back += `⚖️ **Correção IA:**\n\n${commentary}\n\n`;
        } else {
          back += `⚖️ **Fundamentação:** ${commentary.legalBasis}\n\n`;
          back += `❌ **Análise:** ${formatAlternativesAnalysisPlain(commentary.alternativesAnalysis)}\n\n`;
          back += `💡 **Pulo do Gato:** ${commentary.mnemonic}`;
        }
      } else {
        back += `Explicação: ${question.explanation || 'Nenhuma explicação fornecida.'}`;
      }

      const cardId = crypto.randomUUID();
      const newCard: any = {
        id: cardId,
        user_id: userId,
        folderId: folderId,
        front,
        back,
        subjectId: '', // Could be mapped if needed
        nextReview: Date.now(),
        interval: 0,
        status: 'new',
        learningStep: 0,
        easeFactor: 2.5,
        tags: [question.subject, question.topic].filter(Boolean)
      };

      await dataService.saveFlashcard(newCard, userId, isOnline);

      showNotification('Salvo em Precedentes Relevantes!', 'success');
    } catch (error: any) {
      console.error('Error saving precedent:', error);
      showNotification(`Erro ao salvar precedente: ${error.message}`, 'error');
    } finally {
      setIsSavingPrecedent(prev => ({ ...prev, [question.id]: false }));
    }
  };

  useEffect(() => {
    // Unsubscribe while tab is in background so Supabase stops sending DB change fan-out (saves Realtime + egress).
    const HIDE_UNSUB_MS = 8000;
    let questionsChannel: ReturnType<typeof supabase.channel> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const applyPayload = (payload: {
      eventType: string;
      new: Record<string, unknown>;
      old: { id: string };
    }) => {
      const mergeFilters = (next: Question[]) => {
        updateFilters([...facetBootstrapRef.current, ...next] as Question[]);
      };
      if (payload.eventType === 'INSERT') {
        setQuestions((prev) => {
          const next = [normalizeQuestionFromApi(payload.new as unknown as Question), ...prev];
          mergeFilters(next);
          return next;
        });
      } else if (payload.eventType === 'UPDATE') {
        const row = payload.new as unknown as Question;
        setQuestions((prev) => {
          const next = prev.map((q) =>
            q.id === row.id ? normalizeQuestionFromApi(row) : q
          );
          mergeFilters(next);
          return next;
        });
      } else if (payload.eventType === 'DELETE') {
        setQuestions((prev) => {
          const next = prev.filter((q) => q.id !== payload.old.id);
          mergeFilters(next);
          return next;
        });
      }
    };

    const attach = () => {
      if (questionsChannel) return;
      questionsChannel = supabase
        .channel('question_bank_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, (payload) => {
          applyPayload(payload as unknown as { eventType: string; new: Record<string, unknown>; old: { id: string } });
        })
        .subscribe();
    };

    const detach = () => {
      if (questionsChannel) {
        supabase.removeChannel(questionsChannel);
        questionsChannel = null;
      }
    };

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
        attach();
      } else {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          hideTimer = null;
          detach();
        }, HIDE_UNSUB_MS);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
      if (document.visibilityState === 'visible') attach();
    } else {
      attach();
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      if (hideTimer) clearTimeout(hideTimer);
      detach();
    };
  }, []);

  useEffect(() => {
    fetchQuestions();
    fetchUserProgress();
    fetchQuestionStats();

    if (userId) {
      const debouncedProgress = createTrailingDebounce(() => {
        void fetchUserProgress();
      }, 650);
      const debouncedNotebooks = createTrailingDebounce(() => {
        void fetchNotebooks();
      }, 650);

      const channel = supabase.channel(`user_progress_${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${userId}`
        }, () => debouncedProgress.schedule())
        .subscribe();

      const notebookChannel = supabase.channel(`notebooks_${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notebooks',
          filter: `user_id=eq.${userId}`
        }, () => debouncedNotebooks.schedule())
        .subscribe();

      return () => {
        debouncedProgress.cancel();
        debouncedNotebooks.cancel();
        supabase.removeChannel(channel);
        supabase.removeChannel(notebookChannel);
      };
    }
  }, [userId]);

  useEffect(() => {
    qbDeepLinkApplied.current = false;
  }, [userId]);

  useEffect(() => {
    if (qbDeepLinkApplied.current) return;
    const rs = searchParams.get('reviewToday');
    const sub = searchParams.get('qbSubject');
    const top = searchParams.get('qbTopic');
    const qsearch = searchParams.get('qbSearch');
    const qbAiCount = searchParams.get('qbAiCount');
    if (!rs && !sub && !top && !qsearch && (qbAiCount == null || qbAiCount === '')) return;
    qbDeepLinkApplied.current = true;
    if (sub) setSelectedSubjects([sub]);
    if (top) setSelectedTopic(top);
    if (qsearch) setSearchTerm(qsearch);
    if (rs === '1' || rs === 'true') setQuestionStatus('review_today');
    if (qbAiCount != null && qbAiCount !== '') {
      const n = parseInt(qbAiCount, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 20) {
        setAiConfig(prev => ({ ...prev, count: n }));
      }
    }
    const next = new URLSearchParams(searchParams);
    next.delete('reviewToday');
    next.delete('qbSubject');
    next.delete('qbTopic');
    next.delete('qbSearch');
    next.delete('qbAiCount');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const fetchQuestionStats = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('user_question_stats')
        .select(QB_USER_QUESTION_STATS_COLUMNS)
        .eq('user_id', userId);
      
      if (!error && data) {
        const statsMap: Record<string, any> = {};
        data.forEach(row => {
          statsMap[row.question_id] = {
            totalAttempts: row.total_attempts,
            correctAttempts: row.correct_attempts,
            lastAttemptCorrect: row.last_attempt_correct,
            updatedAt: row.updated_at != null ? String(row.updated_at) : undefined,
          };
        });
        setQuestionStats(statsMap);
      }
    } catch (err) {
      console.error('Error fetching question stats:', err);
    }
  };

  const fetchUserProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select(QB_USER_PROGRESS_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        handleFirestoreError(error, OperationType.GET, 'user_progress');
        return;
      }

      if (data) {
        setUserProgress(data);
        setAnswerGoals(parseAnswerGoalsFromDb(data.question_answer_goals));
        setFavorites(data.favorites || []);
        // Merge with local state to ensure progress is not lost
        setWrongQuestions(prev => [...new Set([...prev, ...(data.wrong_questions || data.wrong_question_ids || [])])]);
        setCorrectQuestions(prev => [...new Set([...prev, ...(data.correct_questions || [])])]);
        setNotes(data.notes || {});
        setCorrectCount(data.correct_count || 0);
        setWrongCount(data.wrong_count || 0);
        setErrorMastery(data.error_mastery || {});
      }
    } catch (err) {
      console.error('Failed to sync progress:', err);
    } finally {
      setIsProgressLoaded(true);
    }
  };

  const syncUserProgress = async (updates: SyncUserProgressUpdates = {}) => {
    if (!userId || !isProgressLoaded) {
      return;
    }
    try {
      // updates (explícito) > estado React. Não reutilizar o banco quando local é 0 ou [] — evita reaplicar contadores antigos após reset.
      const payload = {
        user_id: userId,
        favorites: updates.favorites ?? favorites,
        wrong_questions: updates.wrongQuestions ?? wrongQuestions,
        correct_questions: updates.correctQuestions ?? correctQuestions,
        notes: updates.notes ?? notes,
        correct_count: updates.correctCount ?? correctCount,
        wrong_count: updates.wrongCount ?? wrongCount,
        error_mastery: updates.errorMastery ?? errorMastery,
        confidence_levels: updates.confidence_levels ?? (userProgress?.confidence_levels ?? {}),
        question_answer_goals: updates.question_answer_goals ?? answerGoals,
        updated_at: new Date().toISOString()
      };

      let { data, error } = await supabase
        .from('user_progress')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (error) {
        console.warn("Upsert failed, attempting fallback update...", error.message);
        // Fallback: try to update only the most critical columns
        const fallbackPayload = {
          user_id: userId,
          correct_questions: payload.correct_questions,
          wrong_questions: payload.wrong_questions,
          correct_count: payload.correct_count,
          wrong_count: payload.wrong_count,
          question_answer_goals: payload.question_answer_goals,
          updated_at: payload.updated_at
        };
        
        const retry = await supabase
          .from('user_progress')
          .upsert(fallbackPayload, { onConflict: 'user_id' })
          .select()
          .single();
          
        if (retry.error) {
          handleFirestoreError(retry.error, OperationType.WRITE, 'user_progress');
        } else {
          setUserProgress(retry.data);
        }
      } else if (data) {
        setUserProgress(data);
      }
    } catch (err) {
      console.error('Unexpected error in syncUserProgress:', err);
    }
  };

  const fetchNotebooks = async () => {
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select(QB_NOTEBOOK_LIST_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotebooks(data || []);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, [userId]);

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionsForNotebook(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(questionId)) {
        newSelection.delete(questionId);
      } else {
        newSelection.add(questionId);
      }
      return newSelection;
    });
  };

  const handleCreateNotebook = async () => {
    if (newNotebookName.trim() === '') {
      showNotification('O nome do caderno não pode ser vazio.', 'error');
      return;
    }
    if (selectedQuestionsForNotebook.size === 0) {
      showNotification('Selecione pelo menos uma questão para criar um caderno.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('notebooks')
        .insert({
          user_id: userId,
          name: newNotebookName.trim(),
          description: newNotebookDescription.trim(),
          question_ids: Array.from(selectedQuestionsForNotebook),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setNotebooks(prev => [data, ...prev]);
        showNotification(`Caderno '${data.name}' criado com sucesso!`, 'success');
        setNewNotebookName('');
        setSelectedQuestionsForNotebook(new Set());
        setShowNotebookCreationMode(false);
      }
    } catch (error: any) {
      console.error('Error creating notebook:', error);
      showNotification(`Erro ao criar caderno: ${error.message || JSON.stringify(error)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFavorite = async (questionId: string) => {
    let newFavorites;
    if (favorites.includes(questionId)) {
      newFavorites = favorites.filter(id => id !== questionId);
      showNotification('Removido dos favoritos', 'success');
    } else {
      newFavorites = [...favorites, questionId];
      showNotification('Adicionado aos favoritos', 'success');
    }
    setFavorites(newFavorites);
    syncUserProgress({ favorites: newFavorites });
  };

  const handleJuridiquesTranslate = async () => {
    if (selectedText.trim() === '') {
      showNotification('Selecione um trecho de texto para traduzir.', 'error');
      return;
    }

    try {
      setLoadingJuridiquesExplanation(true);
      setShowJuridiquesModal(true);
      setJuridiquesExplanation(null); // Clear previous explanation

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const prompt = `Explique o seguinte trecho de texto jurídico em termos simples, como se estivesse explicando para um estudante do 1º semestre de Direito. Foque na clareza e evite jargões complexos, a menos que os explique imediatamente:

"""
${selectedText}
"""

Forneça a explicação de forma concisa e didática.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt
      });

      if (response.text) {
        setJuridiquesExplanation(response.text);
      } else {
        setJuridiquesExplanation('Não foi possível gerar uma explicação. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Error translating juridiques:', error);
      setJuridiquesExplanation(`Erro ao traduzir: ${error.message || JSON.stringify(error)}`);
    } finally {
      setLoadingJuridiquesExplanation(false);
    }
  };

  const [aiCommentary, setAiCommentary] = useState<Record<string, QuestionAiCommentary>>({});
  const [followUpChat, setFollowUpChat] = useState<Record<string, { role: 'user' | 'assistant', text: string }[]>>({});
  const [isFollowUpLoading, setIsFollowUpLoading] = useState<Record<string, boolean>>({});
  const [followUpInput, setFollowUpInput] = useState<Record<string, string>>({});
  const [loadingAiCommentary, setLoadingAiCommentary] = useState<Record<string, boolean>>({});
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [flashcardToCreate, setFlashcardToCreate] = useState<any>(null);

  const handleFollowUp = async (questionId: string, questionStatement: string) => {
    const input = followUpInput[questionId] || '';
    if (!input.trim()) return;

    const userMsg = { role: 'user' as const, text: input };
    setFollowUpChat(prev => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), userMsg]
    }));
    setFollowUpInput(prev => ({ ...prev, [questionId]: '' }));
    setIsFollowUpLoading(prev => ({ ...prev, [questionId]: true }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({ model: "gemini-3.1-flash-lite-preview" });
      
      // Context for the chat
      const context = `Você é um professor de Direito especialista em concursos. Estamos discutindo a seguinte questão: ${questionStatement}.`;
      
      const response = await chat.sendMessage({ message: `${context}\n\n${input}` });
      
      if (response.text) {
        setFollowUpChat(prev => ({
          ...prev,
          [questionId]: [...(prev[questionId] || []), { role: 'assistant', text: response.text! }]
        }));
      }
    } catch (error) {
      console.error('Error in follow-up chat:', error);
    } finally {
      setIsFollowUpLoading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const generateIntelligentCorrection = async (question: Question) => {
    // 1. Check if already in state
    if (aiCommentary[question.id]) return;

    try {
      setLoadingAiCommentary(prev => ({ ...prev, [question.id]: true }));

      // 2. Check-First Pattern: SELECT from database
      let { data: dbQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('texto_gabarito_ia, ai_correction')
        .eq('id', question.id)
        .single();

      // Se a coluna texto_gabarito_ia não existir, tenta buscar apenas ai_correction
      if (fetchError && fetchError.code === '42703') {
        const result = await supabase
          .from('questions')
          .select('ai_correction')
          .eq('id', question.id)
          .single();
        
        dbQuestion = result.data ? { texto_gabarito_ia: null, ai_correction: result.data.ai_correction } : null;
        fetchError = result.error;
      }

      // Cenário A (Cache Hit)
      if (!fetchError) {
        if (dbQuestion?.texto_gabarito_ia) {
          try {
            const parsedData = JSON.parse(dbQuestion.texto_gabarito_ia);
            setAiCommentary(prev => ({ ...prev, [question.id]: parsedData as QuestionAiCommentary }));
            return;
          } catch (e) {
            // Se não for JSON, exibe como string simples
            setAiCommentary(prev => ({ ...prev, [question.id]: dbQuestion.texto_gabarito_ia }));
            return;
          }
        } else if (dbQuestion?.ai_correction) {
          // Fallback para o formato antigo
          setAiCommentary(prev => ({
            ...prev,
            [question.id]: dbQuestion.ai_correction as QuestionAiCommentary,
          }));
          return;
        }
      }

      // Cenário B (Primeira Geração)
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      
      const prompt = `Como um professor de Direito especialista em concursos, forneça uma correção técnica e didática para esta questão.
      
      ENUNCIADO: ${question.statement}
      ALTERNATIVAS: ${question.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join(' | ')}
      GABARITO: Alternativa ${String.fromCharCode(65 + question.correct_answer)}
      BANCA: ${question.exam_board || 'Geral'}
      
      Preencha todos os campos do JSON solicitado. Em alternativesAnalysis, use status exatamente "Correta" ou "Incorreta" por alternativa.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              doctrineAndContext: { type: Type.STRING },
              legalBasis: { type: Type.STRING },
              alternativesAnalysis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    alternative: { type: Type.STRING },
                    status: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                },
              },
              mnemonic: { type: Type.STRING },
              doctrineLink: { type: Type.STRING },
              doctrineUrl: { type: Type.STRING },
            },
            required: [
              'doctrineAndContext',
              'legalBasis',
              'alternativesAnalysis',
              'mnemonic',
              'doctrineLink',
              'doctrineUrl',
            ],
          },
        },
      });

      if (response.text) {
        let data: QuestionAiCorrection;
        try {
          data = JSON.parse(response.text) as QuestionAiCorrection;
        } catch (e) {
          console.error('Failed to parse AI response as JSON:', e, response.text);
          setAiCommentary(prev => ({ ...prev, [question.id]: response.text as QuestionAiCommentary }));
          return;
        }

        setAiCommentary(prev => ({ ...prev, [question.id]: data as QuestionAiCommentary }));
        const serialized = response.text;

        // Imediatamente faça um UPDATE no banco de dados
        let { error: updateError } = await supabase
          .from('questions')
          .update({ 
            texto_gabarito_ia: serialized,
            ai_correction: data,
            explicacao_doutrinaria: data.doctrineAndContext
          })
          .eq('id', question.id);
          
        if (updateError && updateError.code === '42703') {
          // Fallback se a coluna texto_gabarito_ia não existir
          const result = await supabase
            .from('questions')
            .update({ 
              ai_correction: data,
              explicacao_doutrinaria: data.doctrineAndContext
            })
            .eq('id', question.id);
          updateError = result.error;
        }

        if (updateError) {
          console.error('Error persisting AI correction:', updateError);
        }
      }
    } catch (error) {
      console.error('Error generating intelligent correction:', error);
    } finally {
      setLoadingAiCommentary(prev => ({ ...prev, [question.id]: false }));
    }
  };

  const handleCreateFlashcardFromError = (question: Question, selectedIndex?: number, isCorrect?: boolean) => {
    const commentary = aiCommentary[question.id];
    
    // Format as Question and Answer
    const front = `**PERGUNTA (Questão de Concurso):**\n\n${question.statement}\n\n` + 
                  `**ALTERNATIVAS:**\n` + 
                  question.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n');
    
    let back = `**RESPOSTA CORRETA: ${String.fromCharCode(65 + question.correct_answer)}**\n\n`;
    
    if (selectedIndex !== undefined) {
      back += `**Sua Resposta anterior: ${String.fromCharCode(65 + selectedIndex)} (${isCorrect ? 'Correta' : 'Incorreta'})**\n\n`;
    }

    if (commentary) {
      if (typeof commentary === 'string') {
        back += `⚖️ **Correção IA:**\n\n${commentary}\n\n`;
      } else {
        back += `⚖️ **Fundamentação Legal:** ${commentary.legalBasis}\n\n`;
        back += `📖 **Explicação Doutrinária:** ${commentary.doctrineAndContext}\n\n`;
        back += `📋 **Análise das alternativas:** ${formatAlternativesAnalysisPlain(commentary.alternativesAnalysis)}\n\n`;
        back += `💡 **Mnemônico/Dica:** ${commentary.mnemonic}`;
      }
    } else {
      back += `**Explicação:** ${question.explanation || 'Nenhuma explicação detalhada disponível no momento.'}`;
    }

    const flashcardData = {
      front,
      back,
      subject: question.subject,
      topic: question.topic,
    };

    setFlashcardToCreate(flashcardData);
    setIsDeckModalOpen(true);
  };

  const handleConfirmFlashcardCreation = async (folderId: string) => {
    if (!flashcardToCreate || !userId) {
      console.error("Missing flashcard data or userId", { flashcardToCreate, userId });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Generate a unique ID for the flashcard
      const cardId = crypto.randomUUID();
      
      const newCard: any = {
        id: cardId,
        user_id: userId,
        folderId: folderId,
        front: flashcardToCreate.front,
        back: flashcardToCreate.back,
        notes: `Assunto: ${flashcardToCreate.subject} | Tópico: ${flashcardToCreate.topic}`,
        interval: 0,
        learningStep: 0,
        easeFactor: 2.5,
        status: 'new',
        nextReview: Date.now(),
        tags: [flashcardToCreate.subject, 'erro-questão'].filter(Boolean)
      };

      await dataService.saveFlashcard(newCard, userId, isOnline);

      showNotification('Flashcard criado com sucesso!', 'success');
      setIsDeckModalOpen(false);
      setFlashcardToCreate(null);
    } catch (error: any) {
      console.error('Error creating flashcard:', error);
      showNotification(`Erro ao criar flashcard: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Juridiquês Translator States
  const [selectedText, setSelectedText] = useState<string>('');
  const [juridiquesExplanation, setJuridiquesExplanation] = useState<string | null>(null);
  const [loadingJuridiquesExplanation, setLoadingJuridiquesExplanation] = useState(false);
  const [showJuridiquesModal, setShowJuridiquesModal] = useState(false);

  useEffect(() => {
    const anyOpen =
      showConfidenceSelection ||
      showAiLesson ||
      showJuridiquesModal ||
      showManualGlossarySearch ||
      isDeckModalOpen ||
      showAIGenerator ||
      showMockSetup ||
      isNotebookModalOpen;
    if (!anyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (showConfidenceSelection) setShowConfidenceSelection(false);
      else if (showAiLesson) setShowAiLesson(false);
      else if (isDeckModalOpen) setIsDeckModalOpen(false);
      else if (showManualGlossarySearch) setShowManualGlossarySearch(false);
      else if (showMockSetup) setShowMockSetup(false);
      else if (isNotebookModalOpen) setIsNotebookModalOpen(false);
      else if (showAIGenerator) setShowAIGenerator(false);
      else if (showJuridiquesModal) setShowJuridiquesModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    showConfidenceSelection,
    showAiLesson,
    showJuridiquesModal,
    showManualGlossarySearch,
    isDeckModalOpen,
    showAIGenerator,
    showMockSetup,
    isNotebookModalOpen,
  ]);

  const fetchQuestions = async (
    mode: 'reset' | 'append' = 'reset',
    opts?: { quiet?: boolean; preserveOnError?: boolean }
  ) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const quiet = Boolean(opts?.quiet);
    if (mode === 'reset' && !quiet) {
      setLoading(true);
    }
    if (mode === 'append') {
      setLoadingMoreQuestions(true);
    }
    try {
      const isMissingSchemaColumnError = (err: unknown): boolean => {
        if (!err || typeof err !== 'object') return false;
        const e = err as { code?: string; message?: string };
        const code = typeof e.code === 'string' ? e.code : '';
        const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';
        return (
          code === 'PGRST204' ||
          code === '42703' ||
          message.includes('column') ||
          message.includes('schema cache') ||
          message.includes('does not exist')
        );
      };

      if (mode === 'reset') {
        nextQuestionRangeStartRef.current = 0;
      }
      const from = nextQuestionRangeStartRef.current;
      const to = from + QUESTION_FETCH_PAGE_SIZE - 1;

      const runFetchWithColumns = async (
        listColumns: string,
        facetColumns: string
      ) => {
        const listQuery = supabase
          .from('questions')
          .select(listColumns)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);

        const facetPromise =
          mode === 'reset'
            ? supabase
                .from('questions')
                .select(facetColumns)
                .eq('user_id', userId)
                .limit(QUESTION_FACET_BOOTSTRAP_LIMIT)
            : Promise.resolve({ data: [] as unknown[] | null, error: null });

        return Promise.all([listQuery, facetPromise]);
      };

      let [listRes, facetRes] = await runFetchWithColumns(
        QUESTION_BANK_LIST_COLUMNS,
        QUESTION_BANK_FACET_COLUMNS
      );

      if (listRes.error && isMissingSchemaColumnError(listRes.error)) {
        console.warn(
          '[QuestionBank] Schema desatualizado detectado; usando seleção legada para compatibilidade.'
        );
        [listRes, facetRes] = await runFetchWithColumns(
          QUESTION_BANK_LIST_COLUMNS_LEGACY_FALLBACK,
          QUESTION_BANK_FACET_COLUMNS_LEGACY_FALLBACK
        );
      }

      if (
        mode === 'reset' &&
        !listRes.error &&
        facetRes.error &&
        isMissingSchemaColumnError(facetRes.error)
      ) {
        const f = await supabase
          .from('questions')
          .select(QUESTION_BANK_FACET_COLUMNS_LEGACY_FALLBACK)
          .eq('user_id', userId)
          .limit(QUESTION_FACET_BOOTSTRAP_LIMIT);
        facetRes = f;
      }

      const error = listRes.error;
      const data = listRes.data;

      if (error) {
        if (error.code === '42P01') {
          setQuestions([]);
          updateFilters([]);
          setAiCommentary({});
          facetBootstrapRef.current = [];
          setQuestionsHasMore(false);
        } else {
          throw error;
        }
      } else if (data && Array.isArray(data)) {
        const normalized = (data as unknown as Question[]).map(normalizeQuestionFromApi);

        if (
          mode === 'reset' &&
          normalized.length === 0 &&
          skipEmptyFetchOverwriteRef.current
        ) {
          console.warn(
            '[QuestionBank] SELECT devolveu 0 linhas após insert local; mantendo lista em memória.'
          );
          skipEmptyFetchOverwriteRef.current = false;
        } else {
          if (mode === 'reset' && normalized.length > 0) {
            skipEmptyFetchOverwriteRef.current = false;
          }
          nextQuestionRangeStartRef.current = from + data.length;
          setQuestionsHasMore(data.length === QUESTION_FETCH_PAGE_SIZE);

          if (mode === 'reset') {
            if (facetRes.data && Array.isArray(facetRes.data)) {
              facetBootstrapRef.current = facetRes.data as Question[];
            } else {
              facetBootstrapRef.current = [];
            }
            setQuestions(normalized);
            updateFilters([...facetBootstrapRef.current, ...normalized] as Question[]);
            setAiCommentary({});
          } else {
            setQuestions((prev) => {
              const merged = [...prev, ...normalized];
              updateFilters([...facetBootstrapRef.current, ...merged] as Question[]);
              return merged;
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      if (mode === 'reset' && !opts?.preserveOnError) {
        setQuestions([]);
        updateFilters([]);
        facetBootstrapRef.current = [];
      }
      if (mode === 'reset' && opts?.preserveOnError) {
        console.warn('[QuestionBank] fetchQuestions falhou após criar questões (lista local mantida):', error);
      }
    } finally {
      if (mode === 'reset' && !quiet) {
        setLoading(false);
      }
      if (mode === 'append') {
        setLoadingMoreQuestions(false);
      }
    }
  };

  const loadMoreQuestions = () => {
    if (!questionsHasMore || loadingMoreQuestions || loading) return;
    void fetchQuestions('append');
  };

  const updateFilters = (data: Question[]) => {
    const uniqueTopics = Array.from(new Set(data.map(q => q.topic))).filter(Boolean).sort();
    setTopics(uniqueTopics);

    const uniqueExamBoards = Array.from(new Set(data.map(q => q.exam_board))).filter(Boolean).sort() as string[];
    setExamBoards(uniqueExamBoards);

    const uniqueYears = Array.from(new Set(data.map(q => q.year?.toString()))).filter(Boolean) as string[];
    setYears(uniqueYears.sort((a, b) => b.localeCompare(a)));

    const uniqueLegislation = Array.from(new Set(data.flatMap(q => q.legislation_tags || []))).filter(Boolean).sort();
    setLegislationTags(uniqueLegislation);

    const uniqueJurisprudence = Array.from(new Set(data.flatMap(q => q.jurisprudence_tags || []))).filter(Boolean).sort();
    setJurisprudenceTags(uniqueJurisprudence);

    const uniqueInstitutions = Array.from(new Set(data.map(q => q.institution))).filter(Boolean).sort() as string[];
    setInstitutions(uniqueInstitutions);

    const uniqueExamNames = Array.from(new Set(data.map(q => q.exam_name))).filter(Boolean).sort() as string[];
    setExamNames(uniqueExamNames);

    const uniqueLegalDiplomas = Array.from(new Set(data.map(q => q.legal_diploma))).filter(Boolean).sort() as string[];
    setLegalDiplomas(uniqueLegalDiplomas);

    setCareers(Array.from(new Set(data.map((q) => q.career))).filter(Boolean).sort() as string[]);
    setFormationAreas(Array.from(new Set(data.map((q) => q.formation_area))).filter(Boolean).sort() as string[]);
    setEducationLevels(Array.from(new Set(data.map((q) => q.education_level))).filter(Boolean).sort() as string[]);
    setJobPositions(Array.from(new Set(data.map((q) => q.job_position))).filter(Boolean).sort() as string[]);
  };

  const handleSpeak = (statement: string, hint: string, id: string) => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setActiveQuestionId(null);
      return;
    }
    const textToSpeak = `${statement}. ${hint}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = voiceSpeed;
    utterance.onstart = () => setActiveQuestionId(id);
    utterance.onend = () => setActiveQuestionId(null);
    utterance.onerror = () => setActiveQuestionId(null);
    window.speechSynthesis.speak(utterance);
  };

  const handleAudioHint = async (question: Question) => {
    try {
      setIsGeneratingHint(true);
      let hint = question.audio_hint;
      let newListenCount = (question.listen_count || 0) + 1;

      if (!hint) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
        const prompt = `Resuma o ponto jurídico desta questão em uma dica de 15 palavras para ser lida por áudio: ${question.statement}`;
        
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
        });

        hint = response.text || 'Sem dica disponível.';
        
        // Save to Supabase
        const { error } = await supabase
          .from('questions')
          .update({ audio_hint: hint, listen_count: newListenCount })
          .eq('id', question.id);
        
        if (error) throw error;
      } else {
        // Increment listen_count
        await supabase
          .from('questions')
          .update({ listen_count: newListenCount })
          .eq('id', question.id);
      }

      handleSpeak(question.statement, hint, question.id);
    } catch (error) {
      console.error('Error generating audio hint:', error);
      showNotification('Erro ao gerar dica de áudio.', 'error');
    } finally {
      setIsGeneratingHint(false);
    }
  };

  const handleGenerateSmartReview = async () => {
    try {
      setIsGenerating(true);
      showNotification('Analisando seus pontos fracos...', 'success');

      // 1. Fetch weak topics from view
      const { data: weakTopics, error: weakError } = await supabase
        .from('user_weak_topics')
        .select('topic, error_count')
        .eq('user_id', userId)
        .gt('error_count', 3);

      if (weakError) throw weakError;

      if (!weakTopics || weakTopics.length === 0) {
        showNotification('Nenhum ponto fraco crítico encontrado para reforço.', 'success');
        setIsGenerating(false);
        return;
      }

      // 2. Generate questions with Gemini
      const topics = weakTopics.map(t => t.topic).join(', ');
      const smartCatalog = buildTopicReuseCatalog(questions, null, TOPIC_REUSE_PROMPT_MAX_LABELS);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const prompt = `Com base nestes temas que o aluno errou muito: ${topics}, gere 5 novas questões inéditas de nível Médio/Difícil para reforçar o aprendizado.

${buildAiDistractorQualityBlock('dificil', 'multipla_escolha')}

${buildTopicMinimalityInstructions()}

${smartCatalog.promptBlock}

Retorne em formato JSON array de objetos com: subject, topic, statement, options (array de exatamente 5 strings, alternativas A a E), correct_answer (inteiro 0 a 4), explanation, difficulty (ex: media, dificil), exam_board, year. O campo topic deve seguir a estratégia de tópicos e as regras de reutilização acima (poucos rótulos amplos, preferir um único "topic" repetido quando os temas fracos forem o mesmo eixo).`;
      
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
      });

      let newQuestions: unknown[] = [];
      try {
        const cleanedText = (response.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const firstBracket = cleanedText.indexOf('[');
        const lastBracket = cleanedText.lastIndexOf(']');
        const jsonStr = (firstBracket !== -1 && lastBracket !== -1) 
          ? cleanedText.substring(firstBracket, lastBracket + 1) 
          : cleanedText;
        const parsed = JSON.parse(jsonStr || '[]');
        if (!Array.isArray(parsed)) {
          showNotification('A IA devolveu um formato inválido (esperada uma lista de questões).', 'error');
          return;
        }
        newQuestions = parsed;
      } catch (e) {
        console.error('Failed to parse AI response as JSON:', e, response.text);
        showNotification('Não foi possível ler o JSON da IA. Tente novamente.', 'error');
        return;
      }

      const yearStr = new Date().getFullYear().toString();
      const validated = validateAiQuestionsBatch(newQuestions, 'multipla_escolha', {
        exam_board: 'Reforço personalizado (IA)',
        institution: '',
        exam_name: '',
        legal_diploma: '',
        year: yearStr,
        career: '',
        formation_area: '',
        education_level: '',
        job_position: '',
      });
      if (validated.ok === false) {
        const head = validated.errors.slice(0, 4).join(' ');
        const more =
          validated.errors.length > 4 ? ` … (+${validated.errors.length - 4} erro(s))` : '';
        showNotification(`Questões rejeitadas na validação: ${head}${more}`, 'error');
        return;
      }

      const smartRowsCanonical = applyCanonicalTopicsToRows(
        validated.rows,
        smartCatalog.canonicalByTopicKey
      );
      const { kept: keptAfterSimilarity, dropped: droppedSimilar } = dedupeSimilarAiStatements(
        smartRowsCanonical,
        questions
      );
      if (keptAfterSimilarity.length === 0) {
        showNotification(
          'Nenhuma questão guardada: os enunciados eram muito parecidos entre si ou com questões já no banco. Tente outro foco ou gere de novo.',
          'error'
        );
        return;
      }
      const questionsToSave = keptAfterSimilarity.map((row) => ({
        ...row,
        user_id: userId,
        is_reinforcement: true,
        is_annulled: false,
        is_outdated: false,
        video_url: row.video_url || '',
      }));

      const { data: insertedReview, error: insertError } = await supabase
        .from('questions')
        .insert(questionsToSave)
        .select();
      if (insertError) throw insertError;

      if (insertedReview && insertedReview.length > 0) {
        const insertedNorm = (insertedReview as Question[]).map(normalizeQuestionFromApi);
        skipEmptyFetchOverwriteRef.current = true;
        setQuestions((prev) => {
          const ids = new Set(insertedNorm.map((q) => q.id));
          const next = [...insertedNorm, ...prev.filter((q) => !ids.has(q.id))];
          updateFilters([...facetBootstrapRef.current, ...next] as Question[]);
          return next;
        });
        clearAllQuestionFilters();
        setListPage(1);
      }

      showNotification(
        droppedSimilar.length > 0
          ? `Reforço: ${questionsToSave.length} questão(ões) guardada(s). ${droppedSimilar.length} omitida(s) por enunciado muito parecido ao acervo ou ao lote.`
          : 'Reforço gerado com sucesso!',
        'success'
      );
      await fetchQuestions('reset', { preserveOnError: true });

    } catch (error) {
      console.error('Error generating smart review:', error);
      showNotification('Erro ao gerar reforço. Tente novamente.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiConfig.subject && !aiConfig.baseOnFlashcards) {
      showNotification('Preencha a matéria/assunto ou selecione uma pasta de flashcards.', 'error');
      return;
    }
    if (aiConfig.baseOnFlashcards && !aiConfig.selectedFolderId) {
      showNotification('Selecione uma pasta do acervo para usar como base.', 'error');
      return;
    }

    try {
      setIsGenerating(true);
      // Usar process.env.API_KEY para garantir que use a chave paga selecionada pelo usuário
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      
      let contextFromFlashcards = "";
      if (aiConfig.baseOnFlashcards && aiConfig.selectedFolderId) {
        const folderCards = flashcards.filter(c => c.folderId === aiConfig.selectedFolderId);
        if (folderCards.length > 0) {
          contextFromFlashcards = buildCappedFlashcardContextForAi(folderCards);
        }
      }

      let contextFromText = "";
      if (aiConfig.context) {
        contextFromText = `Baseie as questões no seguinte material de estudo fornecido:\n${aiConfig.context}`;
      }

      const isJurisprudenceMode = aiConfig.legalFocus.includes('Jurisprudência Atualizada');
      let jurisprudencePrompt = "";
      if (isJurisprudenceMode) {
        jurisprudencePrompt = `
        MODO ESPECIALIZADO: JURISPRUDÊNCIA (${aiConfig.tribunal}).
        FILTRO DE ANO: ${aiConfig.yearFilter}.
        INSTRUÇÕES:
        1. Baseie os enunciados em casos reais julgados recentemente pelo ${aiConfig.tribunal}.
        2. Use frases como "Conforme informativo XXX do ${aiConfig.tribunal === 'Ambos' ? 'STF/STJ' : aiConfig.tribunal}, no caso de..." ou "Segundo o entendimento fixado no RE/ARE XXX...".
        3. Na explicação, inclua OBRIGATORIAMENTE o número do informativo ou o Recurso Extraordinário (RE/ARE) que baseou a resposta.
        `;
      }
      
      const totalQuestions = aiConfig.count;
      const chunkSize = 5;
      const batches = buildAiStatementBatches(totalQuestions, chunkSize, aiConfig.statementType);
      const allGeneratedQuestions = [];
      const isMultipla = aiConfig.modality === 'multipla_escolha';
      const optionsSchemaDesc = isMultipla
        ? 'Exatamente 5 strings: alternativas A a E.'
        : 'Exatamente 2 strings: primeira e segunda alternativa (ex.: Certo e Errado), na mesma ordem usada em correct_answer.';
      const correctAnswerSchemaDesc = isMultipla
        ? 'Índice inteiro da alternativa correta: 0 a 4.'
        : 'Índice inteiro da alternativa correta: 0 ou 1 (alinhar com a ordem do array options).';
      const explanationSchemaDesc = isMultipla
        ? 'Explicação detalhada referindo cada alternativa A–E.'
        : 'Explicação detalhada para Certo e para Errado.';

      const subjectTrim = aiConfig.subject.trim();
      const topicCatalog = buildTopicReuseCatalog(
        questions,
        subjectTrim || null,
        TOPIC_REUSE_PROMPT_MAX_LABELS
      );
      const topicSuggestionLine = aiConfig.topic.trim()
        ? `Preferência opcional do aluno para o tópico (não obrigatório seguir literalmente; respeite as regras de reutilização de rótulos): "${aiConfig.topic.trim()}".`
        : '';
      const subjectLineForPrompt = subjectTrim
        ? `Matéria de referência: "${subjectTrim}". As questões devem ser coerentes com esta matéria.`
        : `Defina o campo "subject" de cada questão de forma coerente com o material base (flashcards ou texto) e com a disciplina jurídica abordada.`;

      const topicSchemaDesc =
        topicCatalog.topicLabelsInPrompt.length > 0
          ? `Tópico: preferir 1 único valor repetido em todas as questões quando possível; no máximo ${MAX_DISTINCT_TOPICS_PER_AI_BATCH} distintos no array; rótulos amplos; copiar EXATAMENTE um rótulo das instruções TÓPICOS JÁ USADOS quando encaixar.`
          : `Tópico: preferir 1 único valor repetido em todas as questões; no máximo ${MAX_DISTINCT_TOPICS_PER_AI_BATCH} distintos; nomes amplos (capítulo/disciplina), não micro-assuntos por questão.`;

      let progressDone = 0;
      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const { size: currentBatchSize, statementType: statementForThisBatch } = batches[batchIdx];
        const statementSchemaDesc =
          statementForThisBatch === QB_STATEMENT_CASO
            ? 'Obrigatório: enunciado em formato de caso prático (narrativa com partes e fatos, depois a pergunta). Não use apenas definição doutrinária ou pergunta abstrata sem cenário.'
            : 'Obrigatório: enunciado direto, sucinto, sem narrativa de caso; comando ou tese objetiva.';
        progressDone += currentBatchSize;
        const mixHint =
          aiConfig.statementType === QB_STATEMENT_MIX
            ? ` (mistura: neste lote só ${statementForThisBatch === QB_STATEMENT_DIRETO ? 'enunciados diretos' : 'casos práticos'})`
            : '';
        setGeneratingStatus(
          `Gerando lote ${batchIdx + 1} de ${batches.length}${mixHint}... (${Math.min(progressDone, totalQuestions)}/${totalQuestions})`
        );

        const prompt = `Crie ${currentBatchSize} questões com a DIFICULDADE PEDIDA pelo utilizador: ${AI_DIFFICULTY_PROMPT_LABEL[aiConfig.difficulty]}.

        O campo JSON "difficulty" de TODAS as questões deste lote DEVE ser EXATAMENTE a string: "${aiConfig.difficulty}" (código do sistema: snake_case, sem acentos). Proibido devolver apenas "facil", "media" ou "dificil" se o pedido for outro nível (ex.: muito_facil ou muito_dificil).
        ${subjectLineForPrompt}
        ${topicSuggestionLine}

        Modalidade: ${questionModalityLabel(aiConfig.modality)} (código no JSON: ${aiConfig.modality}).
        Estilo de Prova: ${aiConfig.examStyle}.
        Instituição: ${aiConfig.institution || 'Geral'}.
        Nome do Exame/Concurso: ${aiConfig.examName || 'Geral'}.
        Diploma Legal de Referência: ${aiConfig.legalDiploma || 'Geral'}.
        Foco Jurídico: ${aiConfig.legalFocus.join(', ') || 'Geral'}.
        Tipo de Enunciado: ${statementForThisBatch}.
        ${buildAiStatementEnforcementBlock(statementForThisBatch)}
        ${buildAiHighDifficultyStemBlock(aiConfig.difficulty, aiConfig.modality)}
        ${aiConfig.statementType === QB_STATEMENT_MIX ? `Regra do pedido (mistura): o aluno pediu ${totalQuestions} questão(ões) no total, repartidas entre enunciado direto e caso prático segundo: total par → metade de cada; total ímpar → a questão extra é sempre enunciado direto. Este lote deve seguir APENAS o tipo indicado acima.` : ''}
        Ano da Questão: OBRIGATORIAMENTE ${new Date().getFullYear()}.
        Carreira / trilho: ${aiConfig.career || 'Geral'}.
        Área de formação: ${aiConfig.formationArea || 'Geral'}.
        Escolaridade alvo: ${aiConfig.educationLevel || 'Geral'}.
        Cargo / função: ${aiConfig.jobPosition || 'Geral'}.
        ${jurisprudencePrompt}
        ${contextFromFlashcards}
        ${contextFromText}

        ${buildTopicMinimalityInstructions()}

        ${topicCatalog.promptBlock}
        
        ${buildAiDistractorQualityBlock(aiConfig.difficulty, aiConfig.modality, statementForThisBatch)}
        ${aiConfig.modality === 'multipla_escolha' ? 'Cada questão deve ter 5 alternativas (A, B, C, D, E).' : 'Cada questão deve ser de Certo ou Errado (duas alternativas: Certo e Errado).'}
        A explicação deve ser EXTREMAMENTE detalhada, contendo uma análise individual para cada alternativa (ou para o item Certo/Errado), explicando por que a resposta correta está certa e por que as incorretas estão erradas, fundamentando com base no foco jurídico selecionado e no diploma legal mencionado.
        
        IMPORTANTE: Identifique e extraia tags de legislação (ex: "Art. 5, CF", "Código Penal") e jurisprudência (ex: "Súmula 123 STJ", "Informativo 999 STF") associadas a cada questão.
        Não gere questões anuladas nem desatualizadas: use is_annulled=false e is_outdated=false. Deixe video_url vazio.
        
        Retorne as questões no formato JSON.`;

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, description: "A matéria (ex: Direito Civil)" },
                  topic: { type: Type.STRING, description: topicSchemaDesc },
                  statement: { type: Type.STRING, description: statementSchemaDesc },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: optionsSchemaDesc,
                  },
                  correct_answer: { type: Type.INTEGER, description: correctAnswerSchemaDesc },
                  explanation: { type: Type.STRING, description: explanationSchemaDesc },
                  difficulty: {
                    type: Type.STRING,
                    description: `Obrigatório neste pedido: exatamente "${aiConfig.difficulty}". Códigos válidos no sistema: muito_facil, facil, media, dificil, muito_dificil (sempre estes cinco, em snake_case).`,
                  },
                  exam_board: { type: Type.STRING, description: "A banca examinadora (Estilo)" },
                  institution: { type: Type.STRING, description: "A instituição (ex: USP, OAB, TJ-SP)" },
                  exam_name: { type: Type.STRING, description: "O nome do exame/concurso" },
                  modality: { type: Type.STRING, description: "Obrigatório: exatamente 'multipla_escolha' ou 'certo_errado' (código do sistema)" },
                  legal_diploma: { type: Type.STRING, description: "O diploma legal de referência (ex: CPC, CP, CF/88)" },
                  year: { type: Type.STRING, description: "O ano da questão" },
                  legislation_tags: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Tags de legislação (ex: Artigos de Lei, Códigos)"
                  },
                  jurisprudence_tags: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Tags de jurisprudência (ex: Súmulas, Informativos)"
                  },
                  career: { type: Type.STRING, description: "Carreira ou trilho de concurso" },
                  formation_area: { type: Type.STRING, description: "Área de formação" },
                  education_level: { type: Type.STRING, description: "Escolaridade exigida ou alvo" },
                  job_position: { type: Type.STRING, description: "Cargo do edital" },
                  is_annulled: { type: Type.BOOLEAN, description: "Sempre false para novas questões" },
                  is_outdated: { type: Type.BOOLEAN, description: "Sempre false para novas questões" },
                  video_url: { type: Type.STRING, description: "Vazio para questões geradas" },
                },
                required: ["subject", "topic", "statement", "options", "correct_answer", "explanation", "difficulty", "exam_board", "year"]
              }
            }
          }
        });

        if (response.text) {
          let chunkParsed: unknown;
          try {
            chunkParsed = JSON.parse(response.text);
          } catch {
            showNotification(
              `Lote ${batchIdx + 1}: resposta da IA não é JSON válido. Gere menos questões por vez ou tente de novo.`,
              'error'
            );
            throw new SyntaxError('Invalid AI JSON chunk');
          }
          if (!Array.isArray(chunkParsed)) {
            showNotification(
              `Lote ${batchIdx + 1}: a IA devolveu um objeto em vez de uma lista de questões.`,
              'error'
            );
            throw new Error('AI response is not an array');
          }
          allGeneratedQuestions.push(...chunkParsed);
        }
      }

      if (allGeneratedQuestions.length > 0) {
        let questionsForValidation = allGeneratedQuestions;
        if (shouldRefineMcDistractors(aiConfig.modality, aiConfig.difficulty)) {
          setGeneratingStatus(
            aiConfig.difficulty === 'muito_dificil'
              ? 'Aperfeiçoando alternativas (refino avançado: várias passagens)...'
              : 'Aperfeiçoando alternativas (distratores)...'
          );
          questionsForValidation = await refineMultipleChoiceDistractors(
            ai,
            allGeneratedQuestions,
            aiConfig.difficulty
          );
        }

        const yearStr = new Date().getFullYear().toString();
        const validated = validateAiQuestionsBatch(
          questionsForValidation,
          aiConfig.modality,
          {
            exam_board: aiConfig.examStyle,
            institution: aiConfig.institution || '',
            exam_name: aiConfig.examName || '',
            legal_diploma: aiConfig.legalDiploma || '',
            year: yearStr,
            career: aiConfig.career || '',
            formation_area: aiConfig.formationArea || '',
            education_level: aiConfig.educationLevel || '',
            job_position: aiConfig.jobPosition || '',
          }
        );
        if (validated.ok === false) {
          const head = validated.errors.slice(0, 4).join(' ');
          const more =
            validated.errors.length > 4 ? ` … (+${validated.errors.length - 4} erro(s))` : '';
          showNotification(`Validação falhou — nada foi guardado. ${head}${more}`, 'error');
          return;
        }

        const rowsWithUserDifficulty = validated.rows.map((row) => ({
          ...row,
          difficulty: aiConfig.difficulty,
        }));
        const rowsCanonicalTopics = applyCanonicalTopicsToRows(
          rowsWithUserDifficulty,
          topicCatalog.canonicalByTopicKey
        );
        const { kept: keptAfterSimilarity, dropped: droppedSimilar } = dedupeSimilarAiStatements(
          rowsCanonicalTopics,
          questions
        );
        if (keptAfterSimilarity.length === 0) {
          showNotification(
            'Nada foi guardado: os enunciados gerados eram muito parecidos entre si ou com questões já no banco. Ajuste matéria, tópico ou contexto e tente de novo.',
            'error'
          );
          return;
        }
        const sanitizedInitialQuestions = keptAfterSimilarity.map((row) => ({
          user_id: userId,
          ...row,
          is_annulled: false,
          is_outdated: false,
          video_url: row.video_url || '',
        }));

        let { data, error } = await supabase
          .from('questions')
          .insert(sanitizedInitialQuestions)
          .select();

        // Fallback for missing columns
        if (error && error.message?.includes("column")) {
          console.warn("Some columns not found, retrying with basic columns...");
          const basicColumns = ['user_id', 'subject', 'topic', 'statement', 'options', 'correct_answer', 'explanation', 'difficulty', 'year'];
          const retryQuestions = sanitizedInitialQuestions.map((q: any) => {
            const filtered: any = {};
            basicColumns.forEach(col => { if (q[col] !== undefined) filtered[col] = q[col]; });
            // Add tags if they exist
            if (q.legislation_tags) filtered.legislation_tags = q.legislation_tags;
            if (q.jurisprudence_tags) filtered.jurisprudence_tags = q.jurisprudence_tags;
            // Try adding new columns one by one or just use a safer approach
            return filtered;
          });
          
          const retry = await supabase
            .from('questions')
            .insert(retryQuestions)
            .select();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;

        if (data && data.length > 0) {
          const insertedNorm = (data as Question[]).map(normalizeQuestionFromApi);
          skipEmptyFetchOverwriteRef.current = true;
          setQuestions((prev) => {
            const ids = new Set(insertedNorm.map((q) => q.id));
            const next = [...insertedNorm, ...prev.filter((q) => !ids.has(q.id))];
            updateFilters([...facetBootstrapRef.current, ...next] as Question[]);
            return next;
          });
          clearAllQuestionFilters();
          setIsErrorNotebookMode(false);
          setListPage(1);
          setShowAIGenerator(false);
          showNotification(
            droppedSimilar.length > 0
              ? `${data.length} questão(ões) guardada(s). ${droppedSimilar.length} omitida(s) por enunciado muito parecido (mesmo lote ou acervo).`
              : `${data.length} questões geradas com sucesso!`,
            'success'
          );
          await fetchQuestions('reset', { quiet: true, preserveOnError: true });
          setViewMode('list');
        } else {
          clearAllQuestionFilters();
          setIsErrorNotebookMode(false);
          setListPage(1);
          setShowAIGenerator(false);
          skipEmptyFetchOverwriteRef.current = true;
          showNotification(
            `${sanitizedInitialQuestions.length} questão(ões) guardada(s). A sincronizar a lista…`,
            'success'
          );
          await fetchQuestions('reset', { quiet: true, preserveOnError: true });
          setViewMode('list');
        }
      } else {
        showNotification(
          'Nenhuma questão foi recebida da IA (resposta vazia em todos os lotes). Tente de novo.',
          'error'
        );
      }
    } catch (error: any) {
      console.error('Error generating questions:', error);
      
      const errorMessage = error.message || "";
      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        showNotification("Limite da Inteligência Artificial atingido. Por favor, aguarde um minuto ou tente gerar uma quantidade menor de questões (Ex: 3 por vez).", 'error');
        setAiCooldown(30);
      } else {
        showNotification(`Erro ao gerar questões: ${error.message}`, 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const startErrorRetrain = () => {
    const errorQuestions = questions.filter(q => wrongQuestions.includes(q.id));
    if (errorQuestions.length === 0) {
      showNotification('Você não tem erros para vencer no momento!', 'success');
      return;
    }
    setIsErrorNotebookMode(true);
    setViewMode('single');
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
  };

  const generateAiLesson = async (subject: string) => {
    try {
      setLoadingAiLesson(true);
      setShowAiLesson(true);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const scope =
        subject.includes(';') || subject.includes(',')
          ? `nas seguintes disciplinas: ${subject.replace(/;/g, ', ')}`
          : `na disciplina de ${subject}`;
      const prompt = `Você é um professor de Direito especialista em concursos e OAB. 
      O aluno está tendo erros recorrentes ${scope}.
      Crie uma aula resumida e focada, explicando os conceitos fundamentais, as principais pegadinhas de banca e dicas de memorização (mnemônicos) para ${subject.includes(';') ? 'essas áreas' : 'este tema'}.
      Use uma linguagem clara, direta e motivadora. Formate em Markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt
      });

      setAiLessonContent(response.text);
    } catch (error) {
      console.error('Error generating AI lesson:', error);
      showNotification('Erro ao gerar aula da IA.', 'error');
    } finally {
      setLoadingAiLesson(false);
    }
  };

  const filteredTopics = useMemo(() => {
    const set = new Set<string>();
    if (selectedSubjects.length === 0) {
      for (const t of topics) {
        if (t && t !== 'Todos') set.add(t);
      }
      return [...set].sort((a, b) => a.localeCompare(b, 'pt'));
    }
    for (const q of questions) {
      if (selectedSubjects.includes(q.subject) && q.topic && q.topic !== 'Todos') set.add(q.topic);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt'));
  }, [questions, topics, selectedSubjects]);

  useEffect(() => {
    if (!selectedTopic || selectedTopic === 'Todos') return;
    if (!filteredTopics.includes(selectedTopic)) {
      setSelectedTopic('');
    }
  }, [selectedTopic, filteredTopics]);

  const currentYear = new Date().getFullYear().toString();

  const baseFilteredQuestions = useMemo(
    () =>
      filterAndSortBankQuestions({
        questions,
        searchTerm,
        selectedSubjects,
        selectedTopic,
        difficultyFilter,
        selectedExamBoard,
        selectedYear,
        selectedLegislation,
        selectedJurisprudence,
        selectedInstitution,
        selectedExamName,
        selectedModality,
        selectedLegalDiploma,
        selectedCareer,
        selectedFormationArea,
        selectedEducationLevel,
        selectedJobPosition,
        wrongQuestions,
        correctQuestions,
        selectedNotebookId,
        notebooks,
        isErrorNotebookMode,
        questionStatus,
        questionStats,
        sortBy,
      }),
    [
    questions,
    searchTerm,
    selectedSubjects,
    selectedTopic,
    difficultyFilter,
    selectedExamBoard,
    selectedYear,
    selectedLegislation,
    selectedJurisprudence,
    selectedInstitution,
    selectedExamName,
    selectedModality,
    selectedLegalDiploma,
    selectedCareer,
    selectedFormationArea,
    selectedEducationLevel,
    selectedJobPosition,
    wrongQuestions,
    correctQuestions,
    selectedNotebookId,
    notebooks,
    isErrorNotebookMode,
    questionStatus,
    questionStats,
    sortBy,
  ]);

  const filteredQuestions = useMemo(() => {
    if (
      questionStatus !== 'unresolved' ||
      !showExplanation ||
      !resolvedPreviewQuestionId
    ) {
      return baseFilteredQuestions;
    }

    if (baseFilteredQuestions.some((q) => q.id === resolvedPreviewQuestionId)) {
      return baseFilteredQuestions;
    }

    const previewQuestion = questions.find((q) => q.id === resolvedPreviewQuestionId);
    if (!previewQuestion) return baseFilteredQuestions;

    const stillMatchesOtherFilters =
      filterAndSortBankQuestions({
        questions: [previewQuestion],
        searchTerm,
        selectedSubjects,
        selectedTopic,
        difficultyFilter,
        selectedExamBoard,
        selectedYear,
        selectedLegislation,
        selectedJurisprudence,
        selectedInstitution,
        selectedExamName,
        selectedModality,
        selectedLegalDiploma,
        selectedCareer,
        selectedFormationArea,
        selectedEducationLevel,
        selectedJobPosition,
        wrongQuestions,
        correctQuestions,
        selectedNotebookId,
        notebooks,
        isErrorNotebookMode,
        questionStatus: 'all',
        questionStats,
        sortBy,
      }).length > 0;

    if (!stillMatchesOtherFilters) return baseFilteredQuestions;

    return [previewQuestion, ...baseFilteredQuestions];
  }, [
    questionStatus,
    showExplanation,
    resolvedPreviewQuestionId,
    baseFilteredQuestions,
    questions,
    searchTerm,
    selectedSubjects,
    selectedTopic,
    difficultyFilter,
    selectedExamBoard,
    selectedYear,
    selectedLegislation,
    selectedJurisprudence,
    selectedInstitution,
    selectedExamName,
    selectedModality,
    selectedLegalDiploma,
    selectedCareer,
    selectedFormationArea,
    selectedEducationLevel,
    selectedJobPosition,
    wrongQuestions,
    correctQuestions,
    selectedNotebookId,
    notebooks,
    isErrorNotebookMode,
    questionStats,
    sortBy,
  ]);

  const pagedQuestions = useMemo(() => {
    const start = (listPage - 1) * listPageSize;
    return filteredQuestions.slice(start, start + listPageSize);
  }, [filteredQuestions, listPage, listPageSize]);

  useEffect(() => {
    const maxP = Math.max(1, Math.ceil(filteredQuestions.length / listPageSize) || 1);
    if (listPage > maxP) setListPage(maxP);
  }, [filteredQuestions.length, listPageSize, listPage]);

  useEffect(() => {
    setListPage(1);
  }, [
    searchTerm,
    selectedSubjects,
    selectedTopic,
    selectedExamBoard,
    selectedYear,
    selectedLegislation,
    selectedJurisprudence,
    selectedInstitution,
    selectedExamName,
    selectedModality,
    selectedLegalDiploma,
    difficultyFilter,
    selectedNotebookId,
    selectedCareer,
    selectedFormationArea,
    selectedEducationLevel,
    selectedJobPosition,
    questionStatus,
    sortBy,
    isErrorNotebookMode,
  ]);

  const persistSavedPresets = useCallback(
    (next: QuestionBankSavedFilterPreset[]) => {
      setSavedFilterPresets(next);
      try {
        localStorage.setItem(savedFiltersStorageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [savedFiltersStorageKey]
  );

  const handleLoadSavedPreset = useCallback(
    (p: QuestionBankSavedFilterPreset) => {
      setSearchTerm(p.searchTerm);
      const subs =
        Array.isArray(p.selectedSubjects) && p.selectedSubjects.length > 0
          ? p.selectedSubjects
          : p.selectedSubject && p.selectedSubject !== 'Todos'
            ? [p.selectedSubject]
            : [];
      setSelectedSubjects(subs);
      setSelectedTopic(p.selectedTopic);
      setSelectedExamBoard(p.selectedExamBoard);
      setSelectedYear(p.selectedYear);
      setSelectedLegislation(p.selectedLegislation);
      setSelectedJurisprudence(p.selectedJurisprudence);
      setSelectedInstitution(p.selectedInstitution);
      setSelectedExamName(p.selectedExamName);
      setSelectedModality(p.selectedModality);
      setSelectedLegalDiploma(p.selectedLegalDiploma);
      setDifficultyFilter(p.difficultyFilter);
      setSelectedNotebookId(p.selectedNotebookId);
      setSelectedCareer(p.selectedCareer);
      setSelectedFormationArea(p.selectedFormationArea);
      setSelectedEducationLevel(p.selectedEducationLevel);
      setSelectedJobPosition(p.selectedJobPosition);
      setQuestionStatus(p.questionStatus);
      showNotification('Filtro carregado.', 'success');
    },
    []
  );

  const handleSaveNamedFilter = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const preset: QuestionBankSavedFilterPreset = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `qb-${Date.now()}`,
        name: trimmed,
        createdAt: new Date().toISOString(),
        searchTerm,
        selectedSubjects,
        selectedSubject: selectedSubjects[0] ?? '',
        selectedTopic,
        selectedExamBoard,
        selectedYear,
        selectedLegislation,
        selectedJurisprudence,
        selectedInstitution,
        selectedExamName,
        selectedModality,
        selectedLegalDiploma,
        difficultyFilter,
        selectedNotebookId,
        selectedCareer,
        selectedFormationArea,
        selectedEducationLevel,
        selectedJobPosition,
        questionStatus,
      };
      persistSavedPresets([...savedFilterPresets, preset]);
      showNotification('Filtro guardado.', 'success');
    },
    [
      difficultyFilter,
      persistSavedPresets,
      questionStatus,
      savedFilterPresets,
      searchTerm,
      selectedCareer,
      selectedEducationLevel,
      selectedExamBoard,
      selectedExamName,
      selectedFormationArea,
      selectedInstitution,
      selectedJobPosition,
      selectedJurisprudence,
      selectedLegalDiploma,
      selectedLegislation,
      selectedModality,
      selectedNotebookId,
      selectedSubjects,
      selectedTopic,
      selectedYear,
    ]
  );

  const activeFilterChips = useMemo((): ActiveFilterChip[] => {
    const c: ActiveFilterChip[] = [];
    if (searchTerm.trim())
      c.push({ id: 'search', label: `Busca: ${searchTerm}`, onRemove: () => setSearchTerm('') });
    selectedSubjects.forEach((sub, idx) => {
      const safeId = sub.slice(0, 40).replace(/\s+/g, '-');
      c.push({
        id: `subject-${idx}-${safeId}`,
        label: `Disciplina: ${sub}`,
        onRemove: () => {
          setSelectedSubjects((prev) => prev.filter((s) => s !== sub));
        },
      });
    });
    if (selectedTopic)
      c.push({ id: 'topic', label: `Assunto: ${selectedTopic}`, onRemove: () => setSelectedTopic('') });
    if (selectedExamBoard)
      c.push({
        id: 'board',
        label: `Banca: ${selectedExamBoard}`,
        onRemove: () => setSelectedExamBoard(''),
      });
    if (selectedInstitution)
      c.push({
        id: 'inst',
        label: `Instituição: ${selectedInstitution}`,
        onRemove: () => setSelectedInstitution(''),
      });
    if (selectedJobPosition)
      c.push({
        id: 'job',
        label: `Cargo: ${selectedJobPosition}`,
        onRemove: () => setSelectedJobPosition(''),
      });
    if (selectedYear)
      c.push({ id: 'year', label: `Ano: ${selectedYear}`, onRemove: () => setSelectedYear('') });
    if (selectedCareer)
      c.push({
        id: 'career',
        label: `Carreira: ${selectedCareer}`,
        onRemove: () => setSelectedCareer(''),
      });
    if (selectedFormationArea)
      c.push({
        id: 'form',
        label: `Formação: ${selectedFormationArea}`,
        onRemove: () => setSelectedFormationArea(''),
      });
    if (selectedEducationLevel)
      c.push({
        id: 'edu',
        label: `Escolaridade: ${selectedEducationLevel}`,
        onRemove: () => setSelectedEducationLevel(''),
      });
    if (difficultyFilter)
      c.push({
        id: 'diff',
        label: `Dificuldade: ${difficultyFilter}`,
        onRemove: () => setDifficultyFilter(''),
      });
    if (selectedLegislation)
      c.push({
        id: 'leg',
        label: `Legislação: ${selectedLegislation}`,
        onRemove: () => setSelectedLegislation(''),
      });
    if (selectedJurisprudence)
      c.push({
        id: 'jur',
        label: `Jurisprudência: ${selectedJurisprudence}`,
        onRemove: () => setSelectedJurisprudence(''),
      });
    if (selectedExamName)
      c.push({
        id: 'exam',
        label: `Prova: ${selectedExamName}`,
        onRemove: () => setSelectedExamName(''),
      });
    if (selectedLegalDiploma)
      c.push({
        id: 'dip',
        label: `Diploma: ${selectedLegalDiploma}`,
        onRemove: () => setSelectedLegalDiploma(''),
      });
    if (selectedModality)
      c.push({
        id: 'mod',
        label: `Modalidade: ${selectedModality}`,
        onRemove: () => setSelectedModality(''),
      });
    if (selectedNotebookId)
      c.push({
        id: 'nb',
        label: 'Caderno',
        onRemove: () => setSelectedNotebookId(''),
      });
    return c;
  }, [
    difficultyFilter,
    searchTerm,
    selectedCareer,
    selectedEducationLevel,
    selectedExamBoard,
    selectedExamName,
    selectedFormationArea,
    selectedInstitution,
    selectedJobPosition,
    selectedJurisprudence,
    selectedLegalDiploma,
    selectedLegislation,
    selectedModality,
    selectedNotebookId,
    selectedSubjects,
    selectedTopic,
    selectedYear,
  ]);

  const toggleQbDark = useCallback(() => {
    setQbDarkSynced((d) => {
      const next = !d;
      document.documentElement.classList.toggle('dark', next);
      try {
        localStorage.setItem('omnistudy_darkmode', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const fontSteps = [85, 100, 115, 130] as const;
  const onListFontIncrease = useCallback(() => {
    setListFontScalePercent((p) => {
      const i = fontSteps.indexOf(p as (typeof fontSteps)[number]);
      const idx = i === -1 ? 1 : i;
      return fontSteps[Math.min(fontSteps.length - 1, idx + 1)];
    });
  }, []);
  const onListFontDecrease = useCallback(() => {
    setListFontScalePercent((p) => {
      const i = fontSteps.indexOf(p as (typeof fontSteps)[number]);
      const idx = i === -1 ? 1 : i;
      return fontSteps[Math.max(0, idx - 1)];
    });
  }, []);

  const handleExportPDF = () => exportQuestionBankPdf(filteredQuestions, { setIsExporting, setExportProgress });

  const getNextUnansweredMockIndex = (from: number): number => {
    for (let i = from + 1; i < mockQuestions.length; i++) {
      if (mockAnswers[mockQuestions[i].id] === undefined) return i;
    }
    return -1;
  };
  const getPrevUnansweredMockIndex = (from: number): number => {
    for (let i = from - 1; i >= 0; i--) {
      if (mockAnswers[mockQuestions[i].id] === undefined) return i;
    }
    return -1;
  };

  const currentQuestion =
    isMockMode && mockQuestions.length > 0
      ? mockQuestions[Math.min(currentIndex, mockQuestions.length - 1)]
      : filteredQuestions[currentIndex];

  const handleAnswer = (index: number, questionOverride?: Question) => {
    const targetQuestion = questionOverride || currentQuestion;
    
    if (isMockMode) {
      if (isMockFinished) return;
      setPendingAnswerIndex(index);
      setShowConfidenceSelection(true);
      return;
    }

    if (showExplanation && !questionOverride) return; 
    
    setSelectedOption(index);
    setPendingAnswerIndex(index);
    setShowConfidenceSelection(true);
  };

  const confirmAnswer = (level: 'certeza' | 'duvida' | 'chute') => {
    if (pendingAnswerIndex === null) return;
    
    const index = pendingAnswerIndex;
    const targetQuestion = isMockMode ? currentQuestion : (currentQuestion || filteredQuestions[currentIndex]);
    
    setConfidenceLevel(level);
    setShowConfidenceSelection(false);
    setSessionConfidenceStats(prev => ({ ...prev, [targetQuestion.id]: level }));

    if (isMockMode) {
      setMockAnswers(prev => ({ ...prev, [targetQuestion.id]: index }));
      setPendingAnswerIndex(null);

      if (viewMode === 'single') {
        setTimeout(() => {
          setCurrentIndex(prevIdx => {
            const ans = mockAnswersRef.current;
            const len = mockQuestions.length;
            if (len === 0) return prevIdx;
            if (!mockNavUnansweredOnly) {
              return Math.min(prevIdx + 1, len - 1);
            }
            for (let i = prevIdx + 1; i < len; i++) {
              if (ans[mockQuestions[i].id] === undefined) return i;
            }
            return prevIdx;
          });
          setSelectedOption(null);
          setShowExplanation(false);
        }, 300);
      }
      return;
    }
    
    if (questionStatus === 'unresolved') {
      setResolvedPreviewQuestionId(targetQuestion.id);
    }

    setShowExplanation(true);

    const nextGoals = bumpAnswerGoals(answerGoals);
    setAnswerGoals(nextGoals);
    
    // Trigger Intelligent Correction
    generateIntelligentCorrection(targetQuestion);
    
    // Auto-create flashcard for Doubt or Guess
    if (level === 'duvida' || level === 'chute') {
      showNotification('Dúvida/Chute detectado: Sugestão de Flashcard habilitada.', 'success');
    }

    if (index === targetQuestion.correct_answer) {
      // Não atualizar questions.status: a tabela pode ser compartilhada; resultado do usuário fica em
      // user_progress + user_question_stats (e correctQuestions/wrongQuestions).
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      
      let newCorrect = [...correctQuestions];
      if (!correctQuestions.includes(targetQuestion.id)) {
        newCorrect.push(targetQuestion.id);
        setCorrectQuestions(newCorrect);
      }

      let newWrong = [...wrongQuestions];
      let newMastery = { ...errorMastery };

      // Smart Error Notebook Logic: If it was in wrong questions, track mastery
      if (wrongQuestions.includes(targetQuestion.id)) {
        const currentMastery = (newMastery[targetQuestion.id] || 0) + 1;
        if (currentMastery >= 2) {
          // Archived from error notebook after 2 consecutive correct answers
          newWrong = wrongQuestions.filter(id => id !== targetQuestion.id);
          delete newMastery[targetQuestion.id];
          setWrongQuestions(newWrong);
          showNotification('Questão vencida! Removida do Caderno de Erros.', 'success');
        } else {
          newMastery[targetQuestion.id] = currentMastery;
          showNotification(`Acerto consecutivo: ${currentMastery}/2 para vencer esta questão.`, 'success');
        }
        setErrorMastery(newMastery);
      }
      
      const currentConfidenceLevels = { ...(userProgress?.confidence_levels || {}), [targetQuestion.id]: level };
      
      // Update question stats in new table
      const currentStat = questionStats[targetQuestion.id] || { totalAttempts: 0, correctAttempts: 0, lastAttemptCorrect: false };
      const isCorrect = index === targetQuestion.correct_answer;
      const attemptNow = new Date().toISOString();
      const newStat: QuestionStatForReview = {
        totalAttempts: currentStat.totalAttempts + 1,
        correctAttempts: isCorrect ? currentStat.correctAttempts + 1 : currentStat.correctAttempts,
        lastAttemptCorrect: isCorrect,
        updatedAt: attemptNow,
      };
      
      setQuestionStats(prev => ({ ...prev, [targetQuestion.id]: newStat }));
      
      supabase.from('user_question_stats').upsert({
        user_id: userId,
        question_id: targetQuestion.id,
        total_attempts: newStat.totalAttempts,
        correct_attempts: newStat.correctAttempts,
        last_attempt_correct: newStat.lastAttemptCorrect,
        updated_at: attemptNow,
      }, { onConflict: 'user_id, question_id' }).then(({ error }) => {
        if (error) console.error('Error saving question stat:', error);
      });

      syncUserProgress({ 
        correctCount: newCount, 
        wrongQuestions: newWrong, 
        correctQuestions: newCorrect,
        errorMastery: newMastery,
        confidence_levels: currentConfidenceLevels,
        question_answer_goals: nextGoals,
      });
    } else {
      // Ver comentário no ramo de acerto: não gravar status na linha compartilhada de questions.
      const newCount = wrongCount + 1;
      setWrongCount(newCount);
      
      let newWrong = [...wrongQuestions];
      let newMastery = { ...errorMastery };

      // Reset mastery on error
      newMastery[targetQuestion.id] = 0;
      setErrorMastery(newMastery);

      if (!wrongQuestions.includes(targetQuestion.id)) {
        newWrong.push(targetQuestion.id);
        setWrongQuestions(newWrong);
      }
      
      const currentConfidenceLevels = { ...(userProgress?.confidence_levels || {}), [targetQuestion.id]: level };

      // Update question stats in new table
      const currentStat = questionStats[targetQuestion.id] || { totalAttempts: 0, correctAttempts: 0, lastAttemptCorrect: false };
      const attemptNowWrong = new Date().toISOString();
      const newStat: QuestionStatForReview = {
        totalAttempts: currentStat.totalAttempts + 1,
        correctAttempts: currentStat.correctAttempts,
        lastAttemptCorrect: false,
        updatedAt: attemptNowWrong,
      };
      
      setQuestionStats(prev => ({ ...prev, [targetQuestion.id]: newStat }));
      
      supabase.from('user_question_stats').upsert({
        user_id: userId,
        question_id: targetQuestion.id,
        total_attempts: newStat.totalAttempts,
        correct_attempts: newStat.correctAttempts,
        last_attempt_correct: newStat.lastAttemptCorrect,
        updated_at: attemptNowWrong,
      }, { onConflict: 'user_id, question_id' }).then(({ error }) => {
        if (error) console.error('Error saving question stat:', error);
      });

      syncUserProgress({ 
        wrongCount: newCount, 
        wrongQuestions: newWrong,
        errorMastery: newMastery,
        confidence_levels: currentConfidenceLevels,
        question_answer_goals: nextGoals,
      });
    }
    setPendingAnswerIndex(null);
  };

  const toggleElimination = (questionId: string, optionIndex: number) => {
    setEliminatedOptions(prev => {
      const current = prev[questionId] || [];
      if (current.includes(optionIndex)) {
        return { ...prev, [questionId]: current.filter(i => i !== optionIndex) };
      } else {
        return { ...prev, [questionId]: [...current, optionIndex] };
      }
    });
  };

  const handleSaveNote = (questionId: string, noteText: string) => {
     const newNotes = { ...notes, [questionId]: noteText };
     setNotes(newNotes);
     syncUserProgress({ notes: newNotes });
     showNotification('Anotação salva com sucesso!', 'success');
  };

  const resetStats = () => {
    if (confirm('Deseja realmente zerar suas estatísticas de acertos e erros?')) {
      setCorrectCount(0);
      setWrongCount(0);
      setCorrectQuestions([]);
      setWrongQuestions([]);
      setErrorMastery({});
      setUserProgress(prev =>
        prev
          ? {
              ...prev,
              correct_count: 0,
              wrong_count: 0,
              correct_questions: [],
              wrong_questions: [],
              error_mastery: {},
              confidence_levels: {},
            }
          : null
      );
      syncUserProgress({
        correctCount: 0,
        wrongCount: 0,
        correctQuestions: [],
        wrongQuestions: [],
        errorMastery: {},
        confidence_levels: {},
      });
      showNotification('Estatísticas zeradas', 'success');
    }
  };

  const handleNext = () => {
    if (isMockMode && mockQuestions.length > 0) {
      if (mockNavUnansweredOnly) {
        const n = getNextUnansweredMockIndex(currentIndex);
        if (n >= 0) setCurrentIndex(n);
      } else if (currentIndex < mockQuestions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
      setSelectedOption(null);
      setShowExplanation(false);
      return;
    }
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    }
  };

  const handlePrev = () => {
    if (isMockMode && mockQuestions.length > 0) {
      if (mockNavUnansweredOnly) {
        const p = getPrevUnansweredMockIndex(currentIndex);
        if (p >= 0) setCurrentIndex(p);
      } else if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
      setSelectedOption(null);
      setShowExplanation(false);
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedOption(null);
      setShowExplanation(false);
    }
  };

  // Reset state when filters change
  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setResolvedPreviewQuestionId(null);
    setViewMode('list');
  }, [
    selectedSubjects,
    selectedTopic,
    difficultyFilter,
    sortBy,
    searchTerm,
    selectedExamBoard,
    selectedYear,
    questionStatus,
    selectedNotebookId,
    selectedLegislation,
    selectedJurisprudence,
    selectedInstitution,
    selectedExamName,
    selectedModality,
    selectedLegalDiploma,
    selectedCareer,
    selectedFormationArea,
    selectedEducationLevel,
    selectedJobPosition,
  ]);

  useEffect(() => {
    if (!showExplanation) {
      setResolvedPreviewQuestionId(null);
    }
  }, [showExplanation]);

  const modalsLayerSections = useQuestionBankModalsLayerSections({
    showAIGenerator,
    setShowAIGenerator,
    aiConfig,
    setAiConfig,
    folders,
    handleGenerateAI,
    isGenerating,
    generatingStatus,
    aiCooldown,
    notification,
    showAiLesson,
    setShowAiLesson,
    loadingAiLesson,
    aiLessonContent,
    selectedSubjects,
    showJuridiquesModal,
    setShowJuridiquesModal,
    selectedText,
    loadingJuridiquesExplanation,
    juridiquesExplanation,
    showManualGlossarySearch,
    setShowManualGlossarySearch,
    manualSearchTerm,
    setManualSearchTerm,
    handleManualSearch,
    isLoadingGlossary,
    activeGlossaryTerm,
    glossaryData,
    setActiveGlossaryTerm,
    setGlossaryData,
    userId,
    isOnline,
    glossaryPosition,
    isNotebookModalOpen,
    setIsNotebookModalOpen,
    notebooks,
    selectedQuestionsForNotebook,
    setNewNotebookName,
    setNewNotebookDescription,
    handleCreateNotebook,
    setNotebooks,
    setSelectedQuestionsForNotebook,
    setIsSubmitting,
    showNotification,
    isSubmitting,
    isDeckModalOpen,
    setIsDeckModalOpen,
    handleConfirmFlashcardCreation,
    isExporting,
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="mt-4 text-sm text-slate-500">Carregando questões...</p>
      </div>
    );
  }

  if (isMockMode && isMockFinished && mockResults) {
    return (
      <MockResultsView
        mockResults={mockResults}
        mockQuestions={mockQuestions}
        mockAnswers={mockAnswers}
        sessionConfidenceStats={sessionConfidenceStats}
        onExitMock={() => {
          setIsMockMode(false);
          setIsMockFinished(false);
          setMockResults(null);
          setViewMode('list');
        }}
        onReviewErrors={() => {
          setIsMockFinished(false);
          setQuestionStatus('wrong');
          setViewMode('list');
        }}
        onCreateFlashcardFromError={handleCreateFlashcardFromError}
        showNotification={showNotification}
      />
    );
  }

  return (
    <div
      className={`${
        isMockMode
          ? 'fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 overflow-y-auto'
          : 'w-full min-w-0 max-w-4xl mx-auto px-3 py-4 sm:px-4 md:p-8 animate-in fade-in duration-500 pb-24'
      }`}
    >
      <QuestionBankConfidenceModal
        open={showConfidenceSelection}
        onClose={() => setShowConfidenceSelection(false)}
        onSelect={(level) => confirmAnswer(level)}
      />

      {isMockMode && !isMockFinished && (
        <QuestionBankMockHud
          mockTimeRemaining={mockTimeRemaining}
          answeredCount={Object.keys(mockAnswers).length}
          totalQuestions={mockQuestions.length}
          onFinishClick={() => {
            if (window.confirm('Tem certeza que deseja finalizar o simulado agora?')) {
              finishMock();
            }
          }}
        />
      )}

      {!isMockMode && (
        <QuestionBankMainHeader
          showXRay={showXRay}
          onToggleXRay={() => setShowXRay(!showXRay)}
          showManualGlossarySearch={showManualGlossarySearch}
          onToggleGlossary={() => setShowManualGlossarySearch(!showManualGlossarySearch)}
          onOpenMockSetup={() => setShowMockSetup(true)}
          onExportPdf={handleExportPDF}
          isExporting={isExporting}
          exportProgress={exportProgress}
          onOpenAiGenerator={() => setShowAIGenerator(true)}
          onSmartReview={handleGenerateSmartReview}
          showNotebookCreationMode={showNotebookCreationMode}
          onToggleNotebookMode={() => setShowNotebookCreationMode((prev) => !prev)}
          selectedForNotebookCount={selectedQuestionsForNotebook.size}
          onOpenNotebookModal={() => setIsNotebookModalOpen(true)}
          isErrorNotebookMode={isErrorNotebookMode}
          onToggleErrorNotebook={() => {
            if (isErrorNotebookMode) {
              setIsErrorNotebookMode(false);
              setViewMode('list');
            } else {
              setIsErrorNotebookMode(true);
              setViewMode('list');
            }
          }}
        />
      )}

      {!isMockMode && (questionsHasMore || questions.length > 0) && (
        <div className="mb-6 flex flex-col items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
            {questions.length} questão(ões) carregada(s)
            {questionsHasMore ? ' — há mais no servidor.' : ' — acervo completo carregado.'}
          </p>
          {questionsHasMore && (
            <button
              type="button"
              onClick={() => loadMoreQuestions()}
              disabled={loadingMoreQuestions || loading}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {loadingMoreQuestions ? 'A carregar…' : 'Carregar mais questões'}
            </button>
          )}
        </div>
      )}

      {isErrorNotebookMode && !isMockMode && !isMockFinished && (
        <QuestionBankErrorInsightBanner
          wrongCount={wrongQuestions.length}
          selectedSubjects={selectedSubjects}
          onStartErrorRetrain={startErrorRetrain}
          onGenerateAiLesson={generateAiLesson}
        />
      )}

      <MockSetupModal
        open={showMockSetup}
        onClose={() => setShowMockSetup(false)}
        filteredQuestionCount={filteredQuestions.length}
        mockDurationMinutes={mockDurationMinutes}
        setMockDurationMinutes={setMockDurationMinutes}
        onStart={() => {
          if (filteredQuestions.length === 0) {
            showNotification('Não há questões disponíveis com os filtros atuais.', 'error');
            return;
          }
          startMock(filteredQuestions, mockDurationMinutes);
        }}
      />

      {isMockMode && !isMockFinished && (
        <QuestionBankMockSessionPanel
          mockQuestions={mockQuestions}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          currentQuestion={currentQuestion}
          mockAnswers={mockAnswers}
          mockNavUnansweredOnly={mockNavUnansweredOnly}
          setMockNavUnansweredOnly={setMockNavUnansweredOnly}
          mockMarkReviewLater={mockMarkReviewLater}
          getNextUnansweredMockIndex={getNextUnansweredMockIndex}
          getPrevUnansweredMockIndex={getPrevUnansweredMockIndex}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}

      <QuestionBankModalsLayer {...modalsLayerSections}>
          <>
            {/* Filters & Stats */}
          <QuestionBankStatsGoalsNotebookShell
            isMockMode={isMockMode}
            correctCount={correctCount}
            wrongCount={wrongCount}
            answerGoals={answerGoals}
            onSaveAnswerGoals={(daily, weekly) => {
              if (!isProgressLoaded) {
                showNotification('Carregando o progresso. Tente de novo em instantes.', 'error');
                return;
              }
              const base = reconcileAnswerGoals(answerGoals);
              const next: QuestionAnswerGoalsPersisted = {
                ...base,
                daily_target: daily,
                weekly_target: weekly,
              };
              setAnswerGoals(next);
              void syncUserProgress({ question_answer_goals: next });
              showNotification('Metas guardadas.', 'success');
            }}
            goalsBarDisabled={!isOnline || !isProgressLoaded}
            showNotebookCreationMode={showNotebookCreationMode}
            newNotebookName={newNotebookName}
            setNewNotebookName={setNewNotebookName}
            newNotebookDescription={newNotebookDescription}
            setNewNotebookDescription={setNewNotebookDescription}
            onCreateNotebook={handleCreateNotebook}
            onCancelNotebookCreation={() => {
              setShowNotebookCreationMode(false);
              setSelectedQuestionsForNotebook(new Set());
              setNewNotebookName('');
            }}
            isSubmitting={isSubmitting}
            selectedForNotebookCount={selectedQuestionsForNotebook.size}
            onOpenNotebookCreation={() => setShowNotebookCreationMode(true)}
          >
            <QuestionBankFiltersPanel
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedSubjects={selectedSubjects}
              setSelectedSubjects={setSelectedSubjects}
              setSelectedTopic={setSelectedTopic}
              filteredTopics={filteredTopics}
              selectedTopic={selectedTopic}
              selectedExamBoard={selectedExamBoard}
              setSelectedExamBoard={setSelectedExamBoard}
              examBoards={examBoards}
              selectedInstitution={selectedInstitution}
              setSelectedInstitution={setSelectedInstitution}
              institutions={institutions}
              selectedJobPosition={selectedJobPosition}
              setSelectedJobPosition={setSelectedJobPosition}
              jobPositions={jobPositions}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              years={years}
              showAdvanced={showAdvancedFilters}
              setShowAdvanced={setShowAdvancedFilters}
              selectedCareer={selectedCareer}
              setSelectedCareer={setSelectedCareer}
              careers={careers}
              selectedFormationArea={selectedFormationArea}
              setSelectedFormationArea={setSelectedFormationArea}
              formationAreas={formationAreas}
              selectedEducationLevel={selectedEducationLevel}
              setSelectedEducationLevel={setSelectedEducationLevel}
              educationLevels={educationLevels}
              difficultyFilter={difficultyFilter}
              setDifficultyFilter={setDifficultyFilter}
              selectedLegislation={selectedLegislation}
              setSelectedLegislation={setSelectedLegislation}
              legislationTags={legislationTags}
              selectedJurisprudence={selectedJurisprudence}
              setSelectedJurisprudence={setSelectedJurisprudence}
              jurisprudenceTags={jurisprudenceTags}
              selectedExamName={selectedExamName}
              setSelectedExamName={setSelectedExamName}
              examNames={examNames}
              selectedModality={selectedModality}
              setSelectedModality={setSelectedModality}
              selectedLegalDiploma={selectedLegalDiploma}
              setSelectedLegalDiploma={setSelectedLegalDiploma}
              legalDiplomas={legalDiplomas}
              notebooks={notebooks}
              selectedNotebookId={selectedNotebookId}
              setSelectedNotebookId={setSelectedNotebookId}
              questionStatus={questionStatus}
              setQuestionStatus={setQuestionStatus}
              filteredQuestionCount={filteredQuestions.length}
              activeFilterChips={activeFilterChips}
              onClearFilters={clearAllQuestionFilters}
              onApplyFilters={() => {
                setCurrentIndex(0);
                setViewMode('list');
                setSelectedOption(null);
                setShowExplanation(false);
                resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              savedPresets={savedFilterPresets}
              onLoadPreset={handleLoadSavedPreset}
              onSaveCurrentFilter={handleSaveNamedFilter}
              onOpenMockSetup={() => setShowMockSetup(true)}
              sortBy={sortBy}
              setSortBy={setSortBy}
              listPageSize={listPageSize}
              setListPageSize={setListPageSize}
              listFontScalePercent={listFontScalePercent}
              onFontIncrease={onListFontIncrease}
              onFontDecrease={onListFontDecrease}
              isDarkMode={qbDarkSynced}
              onToggleDarkMode={toggleQbDark}
            />
          </QuestionBankStatsGoalsNotebookShell>

          {/* Question Area */}
          <QuestionBankQuestionArea
            resultsSectionRef={resultsSectionRef}
            listFontScalePercent={listFontScalePercent}
            showQuestionChrome={
              Boolean(
                (isMockMode ? mockQuestions.length > 0 : filteredQuestions.length > 0) && currentQuestion
              )
            }
            viewMode={viewMode}
            listViewProps={{
              pagedQuestions,
              listPage,
              listPageSize,
              activeQuestionId,
              selectedQuestionsForNotebook,
              toggleQuestionSelection,
              userId,
              onDeleteQuestion: handleDeleteQuestion,
              getXRayStats,
              correctQuestions,
              wrongQuestions,
              showXRay,
              expandedQuestionId,
              setExpandedQuestionId,
              setCurrentIndex,
              setSelectedOption,
              setShowExplanation,
              onTermClick: handleTermClick,
              selectedText,
              onJuridiquesTranslate: handleJuridiquesTranslate,
              loadingJuridiquesExplanation,
              isMockMode,
              onAudioHint: handleAudioHint,
              isGeneratingHint,
              onSaveAsPrecedent: handleSaveAsPrecedent,
              isSavingPrecedent,
              onAnswerOption: handleAnswer,
              mockAnswers,
              isMockFinished,
              selectedOption,
              showExplanation,
              eliminatedOptions,
              onToggleElimination: toggleElimination,
              loadingAiCommentary,
              aiCommentary,
              followUpChat,
              followUpInput,
              setFollowUpInput,
              isFollowUpLoading,
              onFollowUp: handleFollowUp,
              onCreateFlashcardFromError: handleCreateFlashcardFromError,
              showNotification,
              resolvedPreviewQuestionId,
              isUnresolvedFilterActive: questionStatus === 'unresolved',
              filteredQuestionCount: filteredQuestions.length,
              onPrevListPage: () => setListPage((p) => Math.max(1, p - 1)),
              onNextListPage: () =>
                setListPage((p) =>
                  Math.min(Math.max(1, Math.ceil(filteredQuestions.length / listPageSize)), p + 1)
                ),
              onEnterFocusMode: () => setViewMode('single'),
            }}
            singleCurrentQuestion={currentQuestion ?? undefined}
            singleViewProps={{
              onBackToList: () => setViewMode('list'),
              userId,
              getXRayStats,
              onDeleteQuestion: handleDeleteQuestion,
              showXRay,
              favorites,
              onToggleFavorite: toggleFavorite,
              selectedText,
              onJuridiquesTranslate: handleJuridiquesTranslate,
              loadingJuridiquesExplanation,
              onAnswerOption: (idx) => handleAnswer(idx),
              isMockMode,
              mockAnswers,
              isMockFinished,
              selectedOption,
              showExplanation,
              eliminatedOptions,
              onToggleElimination: toggleElimination,
              loadingAiCommentary,
              aiCommentary,
              followUpChat,
              followUpInput,
              setFollowUpInput,
              isFollowUpLoading,
              onFollowUp: handleFollowUp,
              onCreateFlashcardFromError: handleCreateFlashcardFromError,
              confidenceLevel,
              onSaveAsPrecedent: handleSaveAsPrecedent,
              isSavingPrecedent,
              notes,
              setNotes,
              onSaveNote: handleSaveNote,
              correctQuestions,
              wrongQuestions,
              showNotification,
              onPrev: handlePrev,
              onNext: handleNext,
              currentIndex,
              filteredQuestionCount: filteredQuestions.length,
              mockQuestionCount: mockQuestions.length,
              mockNavUnansweredOnly,
              getPrevUnansweredMockIndex,
              getNextUnansweredMockIndex,
              mockMarkReviewLater,
              setMockMarkReviewLater,
              resolvedPreviewQuestionId,
              isUnresolvedFilterActive: questionStatus === 'unresolved',
            }}
            emptyTotalQuestionsInDb={questions.length}
            onOpenAiGenerator={() => setShowAIGenerator(true)}
          />
          </>
      </QuestionBankModalsLayer>
      </div>
  );
};

export default QuestionBank;
