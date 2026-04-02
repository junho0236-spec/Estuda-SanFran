import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import {
  Question,
  UserProgress,
  Notebook,
  Folder,
  Flashcard,
  normalizeQuestionModality,
  questionModalityLabel,
  formatAlternativesAnalysisPlain,
  isAlternativesAnalysisArray,
  type QuestionAiCommentary,
  type QuestionAiCorrection,
  type AiCorrectionAlternativesAnalysis,
} from '../types';
import { dataService } from '../services/dataService';
import { sampleQuestions } from './sampleQuestions';
import { NotebookModal } from './NotebookModal';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { GEMINI_MODEL, extractPrecedent } from '../services/geminiService';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { QuestionComments } from './QuestionComments';
import { 
  BookOpen, 
  CheckCircle2, 
  Check,
  XCircle, 
  ChevronRight, 
  ChevronLeft,
  Plus,
  Save,
  Loader2,
  AlertCircle,
  Download,
  Star,
  ArrowLeft,
  LayoutList,
  Sparkles,
  X,
  RotateCcw,
  EyeOff,
  Eye,
  PlusSquare,
  NotebookText,
  MessageSquareText,
  Zap,
  Lightbulb,
  ExternalLink,
  Scale,
  Gavel,
  ShieldCheck,
  FileText,
  Timer,
  Clock,
  History,
  Target,
  BrainCircuit,
  Maximize2,
  Minimize2,
  Play,
  CheckCircle,
  AlertTriangle,
  BookX,
  Sword,
  Book,
  Search,
  Settings,
  Volume2,
  Send,
  MessageSquare,
  Folder as FolderIcon,
  Bookmark,
  ListFilter
} from 'lucide-react';
import { GlossaryText } from './GlossaryText.tsx';
import { GlossaryPopover } from './GlossaryPopover.tsx';
import { fetchTermDefinition } from '../services/geminiService';
import { GlossaryTerm } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { exportQuestionBankPdf } from './question-bank/exportQuestionBankPdf';
import { MockResultsView } from './question-bank/MockResultsView';
import { MockSetupModal } from './question-bank/MockSetupModal';
import { QuestionBankAIGeneratorModal } from './question-bank/QuestionBankAIGeneratorModal';
import { QuestionBankFiltersPanel } from './question-bank/QuestionBankFiltersPanel';
import type {
  SyncUserProgressUpdates,
  QuestionBankMockResults,
  QuestionBankAiConfig,
} from './question-bank/types';
import { validateAiQuestionsBatch } from './question-bank/validateAiGeneratedQuestions';
import { dedupeSimilarAiStatements } from './question-bank/similarStatementDetection';
import {
  bumpAnswerGoals,
  createDefaultAnswerGoals,
  parseAnswerGoalsFromDb,
  reconcileAnswerGoals,
  type QuestionAnswerGoalsPersisted,
} from './question-bank/answerGoals';
import { QuestionBankGoalsBar } from './question-bank/QuestionBankGoalsBar';
import {
  isQuestionDueForReviewToday,
  type QuestionStatForReview,
} from './question-bank/questionReviewQueue';

function normalizeQuestionFromApi(q: Question): Question {
  const m = normalizeQuestionModality((q as { modality?: string | null }).modality);
  return { ...q, modality: m };
}

const QB_OPTION_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

function QuestionAlternativeAnalysisBlocks({
  analysis,
  headingId,
}: {
  analysis: AiCorrectionAlternativesAnalysis | undefined;
  headingId: string;
}) {
  if (analysis == null || analysis === '') return null;
  if (isAlternativesAnalysisArray(analysis)) {
    return (
      <ul className="m-0 list-none space-y-2 p-0" aria-labelledby={headingId}>
        {analysis.map((alt, idx) => (
          <li key={`${alt.alternative}-${idx}`}>
            <div
              className={`rounded-xl border p-4 ${
                alt.status === 'Correta'
                  ? 'border-green-100 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10'
                  : 'border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10'
              }`}
              role="group"
              aria-label={`Alternativa ${alt.alternative}, ${alt.status === 'Correta' ? 'correta' : 'incorreta'}. ${alt.explanation}`}
            >
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                <span className="font-black uppercase">
                  [{alt.alternative}] {alt.status}:
                </span>{' '}
                {alt.explanation}
              </p>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p
      className="text-sm leading-relaxed text-slate-600 dark:text-slate-400"
      role="region"
      aria-label="Análise das alternativas"
    >
      {analysis}
    </p>
  );
}

interface QuestionBankProps {
  userId: string;
  folders?: Folder[];
  flashcards?: Flashcard[];
  isOnline?: boolean;
  /** Chamado após persistir `user_progress` com sucesso (debounced). Atualiza contadores no App sem depender só do realtime. */
  onUserProgressSynced?: () => void | Promise<void>;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ 
  userId, 
  folders = [], 
  flashcards = [],
  isOnline = true,
  onUserProgressSynced
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const qbDeepLinkApplied = useRef(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Filters
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [examBoards, setExamBoards] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [legislationTags, setLegislationTags] = useState<string[]>([]);
  const [jurisprudenceTags, setJurisprudenceTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
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
  const [hideResolved, setHideResolved] = useState(false);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [examNames, setExamNames] = useState<string[]>([]);
  const [legalDiplomas, setLegalDiplomas] = useState<string[]>([]);
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
  const [showFilters, setShowFilters] = useState(false);
  const [showXRay, setShowXRay] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'single'>('list');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
    // Set up real-time listener for questions
    const questionsChannel = supabase
      .channel('question_bank_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'questions' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setQuestions(prev => [normalizeQuestionFromApi(payload.new as Question), ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setQuestions(prev =>
            prev.map(q =>
              q.id === (payload.new as Question).id ? normalizeQuestionFromApi(payload.new as Question) : q
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setQuestions(prev => prev.filter(q => q.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(questionsChannel);
    };
  }, []);

  useEffect(() => {
    fetchQuestions();
    fetchUserProgress();
    fetchQuestionStats();

    if (userId) {
      const channel = supabase.channel(`user_progress_${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${userId}`
        }, () => {
          fetchUserProgress();
        })
        .subscribe();

      const notebookChannel = supabase.channel(`notebooks_${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'question_notebooks',
          filter: `user_id=eq.${userId}`
        }, () => {
          fetchNotebooks();
        })
        .subscribe();

      return () => {
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
    if (!rs && !sub && !top && !qsearch) return;
    qbDeepLinkApplied.current = true;
    if (sub) setSelectedSubject(sub);
    if (top) setSelectedTopic(top);
    if (qsearch) setSearchTerm(qsearch);
    if (rs === '1' || rs === 'true') setQuestionStatus('review_today');
    const next = new URLSearchParams(searchParams);
    next.delete('reviewToday');
    next.delete('qbSubject');
    next.delete('qbTopic');
    next.delete('qbSearch');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const fetchQuestionStats = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('user_question_stats')
        .select('*')
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
        .select('*')
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

  const appProgressNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (appProgressNotifyTimerRef.current) {
        clearTimeout(appProgressNotifyTimerRef.current);
        appProgressNotifyTimerRef.current = null;
      }
    };
  }, []);

  const scheduleAppProgressRefresh = useCallback(() => {
    if (!onUserProgressSynced) return;
    if (appProgressNotifyTimerRef.current) clearTimeout(appProgressNotifyTimerRef.current);
    appProgressNotifyTimerRef.current = setTimeout(() => {
      appProgressNotifyTimerRef.current = null;
      void onUserProgressSynced();
    }, 400);
  }, [onUserProgressSynced]);

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
          scheduleAppProgressRefresh();
        }
      } else if (data) {
        setUserProgress(data);
        scheduleAppProgressRefresh();
      }
    } catch (err) {
      console.error('Unexpected error in syncUserProgress:', err);
    }
  };

  const fetchNotebooks = async () => {
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
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
      
      const prompt = `Como um professor de Direito especialista em concursos, forneça uma correção técnica e didática para esta questão:
      
      ENUNCIADO: ${question.statement}
      ALTERNATIVAS: ${question.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join(' | ')}
      GABARITO: Alternativa ${String.fromCharCode(65 + question.correct_answer)}
      BANCA: ${question.exam_board || 'Geral'}
      
      Siga RIGOROSAMENTE este formato JSON:
      {
        "doctrineAndContext": "Explicação didática do conceito central da questão (1 ou 2 parágrafos)",
        "legalBasis": "Artigo da lei, súmula ou informativo que fundamenta a resposta",
        "alternativesAnalysis": [
          { "alternative": "A", "status": "Correta" ou "Incorreta", "explanation": "Explicação breve" },
          ...
        ],
        "mnemonic": "Um 'Pulo do Gato' (dica ou mnemônico) para não errar mais",
        "doctrineLink": "Referência curta ao tópico doutrinário (ex: Direito Penal - Teoria do Erro)",
        "doctrineUrl": "URL de uma fonte externa confiável sobre o assunto"
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt
      });

      if (response.text) {
        let data;
        try {
          // Remove potential markdown code blocks
          const cleanedText = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const firstBrace = cleanedText.indexOf('{');
          const lastBrace = cleanedText.lastIndexOf('}');
          const jsonStr = (firstBrace !== -1 && lastBrace !== -1)
            ? cleanedText.substring(firstBrace, lastBrace + 1)
            : cleanedText;
          data = JSON.parse(jsonStr);
        } catch (e) {
          console.error('Failed to parse AI response as JSON:', e, response.text);
          // Fallback to string if parsing fails completely
          setAiCommentary(prev => ({ ...prev, [question.id]: response.text }));
          return;
        }

        setAiCommentary(prev => ({ ...prev, [question.id]: data as QuestionAiCommentary }));
        
        // Imediatamente faça um UPDATE no banco de dados
        let { error: updateError } = await supabase
          .from('questions')
          .update({ 
            texto_gabarito_ia: response.text, // Salva a string gerada
            ai_correction: data, // Mantém para compatibilidade
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

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist yet, we'll use samples
        if (error.code === '42P01') {
          const questionsWithIds = sampleQuestions.map((q, i) =>
            normalizeQuestionFromApi({
              ...(q as Question),
              id: (q as any).id || `sample-${i}`,
            })
          );
          setQuestions(questionsWithIds);
          updateFilters(questionsWithIds);
        } else {
          throw error;
        }
      } else if (data) {
        if (data.length === 0) {
          // Fallback to samples if DB is empty
          const questionsWithIds = sampleQuestions.map((q, i) =>
            normalizeQuestionFromApi({
              ...(q as Question),
              id: (q as any).id || `sample-${i}`,
            })
          );
          setQuestions(questionsWithIds);
          updateFilters(questionsWithIds);
        } else {
          const normalized = (data as Question[]).map(normalizeQuestionFromApi);
          setQuestions(normalized);
          updateFilters(normalized);
          
          // Pre-populate aiCommentary from existing data in DB
          const existingCommentaries: Record<string, QuestionAiCommentary> = {};
          normalized.forEach(q => {
            if (q.ai_correction) {
              existingCommentaries[q.id] = q.ai_correction;
            }
          });
          if (Object.keys(existingCommentaries).length > 0) {
            setAiCommentary(prev => ({ ...prev, ...existingCommentaries }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      // Final fallback
      const questionsWithIds = sampleQuestions.map((q, i) =>
        normalizeQuestionFromApi({
          ...(q as Question),
          id: (q as any).id || `sample-${i}`,
        })
      );
      setQuestions(questionsWithIds);
      updateFilters(questionsWithIds);
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (data: Question[]) => {
    // Extract unique subjects and topics
    const uniqueSubjects = Array.from(new Set(data.map(q => q.subject))).filter(Boolean).sort();
    setSubjects(uniqueSubjects);
    
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const prompt = `Com base nestes temas que o aluno errou muito: ${topics}, gere 5 novas questões inéditas de nível Médio/Difícil para reforçar o aprendizado. Retorne em formato JSON array de objetos com: subject, topic, statement, options (array de exatamente 5 strings, alternativas A a E), correct_answer (inteiro 0 a 4), explanation, difficulty (ex: media, dificil), exam_board, year.`;
      
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
      });
      if (validated.ok === false) {
        const head = validated.errors.slice(0, 4).join(' ');
        const more =
          validated.errors.length > 4 ? ` … (+${validated.errors.length - 4} erro(s))` : '';
        showNotification(`Questões rejeitadas na validação: ${head}${more}`, 'error');
        return;
      }

      const { kept: keptAfterSimilarity, dropped: droppedSimilar } = dedupeSimilarAiStatements(
        validated.rows,
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
      }));

      const { error: insertError } = await supabase.from('questions').insert(questionsToSave);
      if (insertError) throw insertError;

      showNotification(
        droppedSimilar.length > 0
          ? `Reforço: ${questionsToSave.length} questão(ões) guardada(s). ${droppedSimilar.length} omitida(s) por enunciado muito parecido ao acervo ou ao lote.`
          : 'Reforço gerado com sucesso!',
        'success'
      );
      await fetchQuestions(); // Refresh list

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
          contextFromFlashcards = `Baseie as questões no seguinte conteúdo jurídico (flashcards):\n${folderCards.map(c => `- ${c.front}: ${c.back}`).join('\n')}`;
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
      const chunkSize = 3;
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

      for (let i = 0; i < totalQuestions; i += chunkSize) {
        const currentBatchSize = Math.min(chunkSize, totalQuestions - i);
        setGeneratingStatus(`Gerando lote ${Math.floor(i / chunkSize) + 1} de ${Math.ceil(totalQuestions / chunkSize)}... (${i + currentBatchSize}/${totalQuestions} concluídas)`);

        const prompt = `Crie ${currentBatchSize} questões de nível ${aiConfig.difficulty} sobre a matéria "${aiConfig.subject}" e tópico "${aiConfig.topic}".
        Modalidade: ${questionModalityLabel(aiConfig.modality)} (código no JSON: ${aiConfig.modality}).
        Estilo de Prova: ${aiConfig.examStyle}.
        Instituição: ${aiConfig.institution || 'Geral'}.
        Nome do Exame/Concurso: ${aiConfig.examName || 'Geral'}.
        Diploma Legal de Referência: ${aiConfig.legalDiploma || 'Geral'}.
        Foco Jurídico: ${aiConfig.legalFocus.join(', ') || 'Geral'}.
        Tipo de Enunciado: ${aiConfig.statementType}.
        Ano da Questão: OBRIGATORIAMENTE ${new Date().getFullYear()}.
        ${jurisprudencePrompt}
        ${contextFromFlashcards}
        ${contextFromText}
        
        ${aiConfig.modality === 'multipla_escolha' ? 'Cada questão deve ter 5 alternativas (A, B, C, D, E).' : 'Cada questão deve ser de Certo ou Errado (duas alternativas: Certo e Errado).'}
        A explicação deve ser EXTREMAMENTE detalhada, contendo uma análise individual para cada alternativa (ou para o item Certo/Errado), explicando por que a resposta correta está certa e por que as incorretas estão erradas, fundamentando com base no foco jurídico selecionado e no diploma legal mencionado.
        
        IMPORTANTE: Identifique e extraia tags de legislação (ex: "Art. 5, CF", "Código Penal") e jurisprudência (ex: "Súmula 123 STJ", "Informativo 999 STF") associadas a cada questão.
        
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
                  topic: { type: Type.STRING, description: "O tópico (ex: Contratos)" },
                  statement: { type: Type.STRING, description: "O enunciado da questão" },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: optionsSchemaDesc,
                  },
                  correct_answer: { type: Type.INTEGER, description: correctAnswerSchemaDesc },
                  explanation: { type: Type.STRING, description: explanationSchemaDesc },
                  difficulty: { type: Type.STRING, description: "A dificuldade: 'facil', 'media' ou 'dificil'" },
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
                  }
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
              `Lote ${Math.floor(i / chunkSize) + 1}: resposta da IA não é JSON válido. Gere menos questões por vez ou tente de novo.`,
              'error'
            );
            throw new SyntaxError('Invalid AI JSON chunk');
          }
          if (!Array.isArray(chunkParsed)) {
            showNotification(
              `Lote ${Math.floor(i / chunkSize) + 1}: a IA devolveu um objeto em vez de uma lista de questões.`,
              'error'
            );
            throw new Error('AI response is not an array');
          }
          allGeneratedQuestions.push(...chunkParsed);
        }

        if (i + chunkSize < totalQuestions) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      if (allGeneratedQuestions.length > 0) {
        const yearStr = new Date().getFullYear().toString();
        const validated = validateAiQuestionsBatch(
          allGeneratedQuestions,
          aiConfig.modality,
          {
            exam_board: aiConfig.examStyle,
            institution: aiConfig.institution || '',
            exam_name: aiConfig.examName || '',
            legal_diploma: aiConfig.legalDiploma || '',
            year: yearStr,
          }
        );
        if (validated.ok === false) {
          const head = validated.errors.slice(0, 4).join(' ');
          const more =
            validated.errors.length > 4 ? ` … (+${validated.errors.length - 4} erro(s))` : '';
          showNotification(`Validação falhou — nada foi guardado. ${head}${more}`, 'error');
          return;
        }

        const { kept: keptAfterSimilarity, dropped: droppedSimilar } = dedupeSimilarAiStatements(
          validated.rows,
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

        if (data) {
          const inserted = (data as Question[]).map(normalizeQuestionFromApi);
          setQuestions([...inserted, ...questions]);
          setShowAIGenerator(false);
          showNotification(
            droppedSimilar.length > 0
              ? `${data.length} questão(ões) guardada(s). ${droppedSimilar.length} omitida(s) por enunciado muito parecido (mesmo lote ou acervo).`
              : `${data.length} questões geradas com sucesso!`,
            'success'
          );
          
          const newSubjects = Array.from(new Set([...subjects, ...data.map(q => q.subject)])).filter(Boolean);
          setSubjects(newSubjects);
          
          const newTopics = Array.from(new Set([...topics, ...data.map(q => q.topic)])).filter(Boolean);
          setTopics(newTopics);

          const newExamBoards = Array.from(new Set([...examBoards, ...data.map(q => q.exam_board)])).filter(Boolean) as string[];
          setExamBoards(newExamBoards);

          const newYears = Array.from(new Set([...years, ...data.map(q => q.year?.toString())])).filter(Boolean) as string[];
          setYears(newYears.sort((a, b) => b.localeCompare(a)));
          
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
      const prompt = `Você é um professor de Direito especialista em concursos e OAB. 
      O aluno está tendo erros recorrentes na disciplina de ${subject}.
      Crie uma aula resumida e focada, explicando os conceitos fundamentais, as principais pegadinhas de banca e dicas de memorização (mnemônicos) para este tema.
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

  const filteredTopics = selectedSubject && selectedSubject !== 'Todos'
    ? Array.from(new Set(questions.filter(q => q.subject === selectedSubject).map(q => q.topic))).filter(Boolean).sort()
    : topics;

  const currentYear = new Date().getFullYear().toString();

  const filteredQuestions = questions.filter(q => {
    const matchSearch = searchTerm === '' || 
      q.statement.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (q.explanation && q.explanation.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchSubject = selectedSubject === '' || selectedSubject === 'Todos' || q.subject === selectedSubject;
    const matchTopic = selectedTopic === '' || selectedTopic === 'Todos' || q.topic === selectedTopic;
    const matchDifficulty = difficultyFilter === '' || difficultyFilter === 'Todos' || q.difficulty === difficultyFilter;
    const matchExamBoard = selectedExamBoard === '' || selectedExamBoard === 'Todos' || q.exam_board === selectedExamBoard;
    const matchYear = selectedYear === '' || selectedYear === 'Todos' || q.year?.toString() === selectedYear;
    const matchLegislation = selectedLegislation === '' || selectedLegislation === 'Todos' || (q.legislation_tags && q.legislation_tags.includes(selectedLegislation));
    const matchJurisprudence = selectedJurisprudence === '' || selectedJurisprudence === 'Todos' || (q.jurisprudence_tags && q.jurisprudence_tags.includes(selectedJurisprudence));
    const matchInstitution = selectedInstitution === '' || selectedInstitution === 'Todos' || q.institution === selectedInstitution;
    const matchExamName = selectedExamName === '' || selectedExamName === 'Todos' || q.exam_name === selectedExamName;
    const matchModality = selectedModality === '' || selectedModality === 'Todos' || q.modality === selectedModality;
    const matchLegalDiploma = selectedLegalDiploma === '' || selectedLegalDiploma === 'Todos' || q.legal_diploma === selectedLegalDiploma;
    
    let matchNotebook = true;
    if (selectedNotebookId) {
      const notebook = notebooks.find(n => n.id === selectedNotebookId);
      matchNotebook = notebook ? notebook.question_ids.includes(q.id) : true;
    }
    
    let matchStatus = true;
    const isWrong = wrongQuestions.includes(q.id);
    const isCorrect = correctQuestions.includes(q.id);
    
    if (isErrorNotebookMode) {
      matchStatus = isWrong;
    } else if (questionStatus === 'wrong') {
      matchStatus = isWrong;
    } else if (questionStatus === 'correct') {
      matchStatus = isCorrect;
    } else if (questionStatus === 'resolved') {
      matchStatus = isWrong || isCorrect;
    } else if (questionStatus === 'unresolved') {
      matchStatus = !isWrong && !isCorrect;
    } else if (questionStatus === 'review_today') {
      matchStatus = isQuestionDueForReviewToday(q.id, wrongQuestions, questionStats);
    }

    if (questionStatus !== 'review_today' && hideResolved && (isWrong || isCorrect)) {
      matchStatus = false;
    }
    
    return matchSearch && matchSubject && matchTopic && matchDifficulty && matchExamBoard && matchYear && matchLegislation && matchJurisprudence && matchNotebook && matchStatus && matchInstitution && matchExamName && matchModality && matchLegalDiploma;
  }).sort((a, b) => {
    const createdMs = (q: Question): number | null => {
      if (!q.created_at) return null;
      const t = Date.parse(q.created_at);
      return Number.isNaN(t) ? null : t;
    };

    if (sortBy === 'newest') {
      const na = createdMs(a) ?? 0;
      const nb = createdMs(b) ?? 0;
      return nb - na;
    }
    if (sortBy === 'oldest') {
      const na = createdMs(a) ?? Number.POSITIVE_INFINITY;
      const nb = createdMs(b) ?? Number.POSITIVE_INFINITY;
      return na - nb;
    }

    const difficultyMap = { 'muito_facil': 1, 'facil': 2, 'media': 3, 'dificil': 4, 'muito_dificil': 5 };
    const diffA = difficultyMap[a.difficulty] || 0;
    const diffB = difficultyMap[b.difficulty] || 0;

    if (sortBy === 'difficulty_asc') return diffA - diffB;
    if (sortBy === 'difficulty_desc') return diffB - diffA;

    return 0;
  });

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
    setViewMode('list');
  }, [selectedSubject, selectedTopic, difficultyFilter, sortBy, searchTerm, selectedExamBoard, selectedYear, questionStatus, selectedNotebookId]);

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
    <div className={`${isMockMode ? 'fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 overflow-y-auto' : 'max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500 pb-24'}`}>
      {/* Confidence Selection Modal */}
      <AnimatePresence>
        {showConfidenceSelection && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
            role="presentation"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="qb-confidence-title"
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full text-center relative"
            >
              <button 
                type="button"
                onClick={() => setShowConfidenceSelection(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Fechar diálogo de nível de confiança"
              >
                <X size={24} aria-hidden />
              </button>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6" aria-hidden>
                <BrainCircuit className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
              <h3 id="qb-confidence-title" className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Nível de Confiança</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Como você avalia sua resposta para esta questão?</p>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => confirmAnswer('certeza')}
                  className="flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    <div className="text-left">
                      <span className="block font-black text-emerald-900 dark:text-emerald-400 text-sm uppercase tracking-widest">Certeza</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-500 font-bold">Tenho o fundamento jurídico</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => confirmAnswer('duvida')}
                  className="flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
                    <div className="text-left">
                      <span className="block font-black text-amber-900 dark:text-amber-400 text-sm uppercase tracking-widest">Dúvida</span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-500 font-bold">Fiquei entre duas alternativas</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => confirmAnswer('chute')}
                  className="flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-2xl transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                    <div className="text-left">
                      <span className="block font-black text-red-900 dark:text-red-400 text-sm uppercase tracking-widest">Chute</span>
                      <span className="text-[10px] text-red-700 dark:text-red-500 font-bold">Não conheço o tema</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-red-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mock Mode Floating Timer */}
      {isMockMode && !isMockFinished && (
        <div className={`fixed top-6 right-6 z-[110] flex items-center gap-4 p-4 rounded-3xl border-2 shadow-2xl backdrop-blur-md transition-all duration-500 ${mockTimeRemaining < 600 ? 'bg-red-50/90 border-red-500 animate-pulse' : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800'}`}>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Restante</span>
            <span className={`text-2xl font-black tabular-nums ${mockTimeRemaining < 600 ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
              {formatTime(mockTimeRemaining)}
            </span>
          </div>
          <div className={`p-3 rounded-2xl ${mockTimeRemaining < 600 ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
            <Clock size={24} />
          </div>
          <button
            onClick={() => {
              if (window.confirm('Tem certeza que deseja finalizar o simulado agora?')) {
                finishMock();
              }
            }}
            className="ml-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            Finalizar
          </button>
        </div>
      )}

      {/* Mock Mode Progress Header */}
      {isMockMode && !isMockFinished && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-800 z-[110]">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(Object.keys(mockAnswers).length / mockQuestions.length) * 100}%` }}
          ></div>
        </div>
      )}

      {!isMockMode && (
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
              onClick={() => setShowXRay(!showXRay)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${showXRay ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              title="Ocultar/Mostrar Raio-X"
            >
              {showXRay ? <EyeOff size={14} /> : <Eye size={14} />} Raio-X
            </button>
            <button
              onClick={() => setShowManualGlossarySearch(!showManualGlossarySearch)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${showManualGlossarySearch ? 'bg-indigo-600 text-white' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200'}`}
              title="Dicionário Jurídico"
            >
              <Book size={14} /> Dicionário
            </button>
            <button
              onClick={() => setShowMockSetup(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-emerald-900/20"
            >
              <Timer size={14} /> Simulado
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-slate-900/20"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} 
              {isExporting ? `Gerando (${exportProgress}%)...` : 'Exportar PDF'}
            </button>
            <button
              onClick={() => setShowAIGenerator(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-purple-900/20"
            >
              <Sparkles size={14} /> IA
            </button>
            <button
              onClick={handleGenerateSmartReview}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-amber-900/20"
            >
              <Zap size={14} /> Reforço
            </button>
            <button
              onClick={() => setShowNotebookCreationMode(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${showNotebookCreationMode ? 'bg-orange-600 text-white' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200'}`}
            >
              <NotebookText size={14} /> Caderno
            </button>
            {selectedQuestionsForNotebook.size > 0 && (
              <button
                onClick={() => setIsNotebookModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors"
              >
                <Plus size={14} /> Adicionar ({selectedQuestionsForNotebook.size})
              </button>
            )}
            <button
              onClick={() => {
                if (isErrorNotebookMode) {
                  setIsErrorNotebookMode(false);
                  setViewMode('list');
                } else {
                  setIsErrorNotebookMode(true);
                  setViewMode('list');
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${isErrorNotebookMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400'}`}
            >
              <BookX size={14} /> {isErrorNotebookMode ? 'Sair dos Erros' : 'Caderno de Erros'}
            </button>
          </div>
        </header>
      )}

      {/* AI Insight Banner for Error Notebook */}
      {isErrorNotebookMode && !isMockMode && !isMockFinished && (
        <div className="mb-8 p-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-[2rem] text-white shadow-xl shadow-red-900/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BrainCircuit size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">Insight de Desempenho Inteligente</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm font-bold leading-relaxed max-w-2xl">
                Você tem <span className="text-2xl px-2">{wrongQuestions.length}</span> erros recorrentes. 
                {selectedSubject && selectedSubject !== 'Todos' ? (
                  <> A disciplina de <span className="underline decoration-2 underline-offset-4">{selectedSubject}</span> é onde você mais precisa de reforço.</>
                ) : (
                  <> Analisamos seu histórico e identificamos lacunas importantes em temas fundamentais.</>
                )}
              </p>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={startErrorRetrain}
                  className="px-6 py-3 bg-white text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2 shadow-lg"
                >
                  <Sword size={16} /> Vencer Meus Erros
                </button>
                {selectedSubject && selectedSubject !== 'Todos' && (
                  <button
                    onClick={() => generateAiLesson(selectedSubject)}
                    className="px-6 py-3 bg-red-900/20 hover:bg-red-900/30 text-white border border-white/30 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 backdrop-blur-sm"
                  >
                    <Sparkles size={16} /> Aula Resumida IA
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
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
        <div className="max-w-4xl mx-auto pt-24 pb-32 px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl shrink-0">
                <Target className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Simulado em Curso</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Questão {currentIndex + 1} de {mockQuestions.length}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={mockNavUnansweredOnly}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setMockNavUnansweredOnly(v);
                    if (v && currentQuestion && mockAnswers[currentQuestion.id] !== undefined) {
                      const next = getNextUnansweredMockIndex(currentIndex);
                      if (next >= 0) setCurrentIndex(next);
                      else {
                        const first = mockQuestions.findIndex((q) => mockAnswers[q.id] === undefined);
                        if (first >= 0) setCurrentIndex(first);
                      }
                    }
                  }}
                />
                <ListFilter size={16} className="shrink-0 text-slate-400" aria-hidden />
                Só não respondidas
              </label>
              <button
                type="button"
                onClick={handlePrev}
                disabled={
                  mockNavUnansweredOnly
                    ? getPrevUnansweredMockIndex(currentIndex) < 0
                    : currentIndex === 0
                }
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
                aria-label="Questão anterior"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  mockNavUnansweredOnly
                    ? getNextUnansweredMockIndex(currentIndex) < 0
                    : currentIndex === mockQuestions.length - 1
                }
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
                aria-label="Próxima questão"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          {/* Question Navigation Bar */}
          <div className="flex flex-wrap gap-2 mb-8 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg">
            {mockQuestions.map((q, idx) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                title={mockMarkReviewLater[q.id] ? 'Marcada para revisar depois' : undefined}
                className={`w-10 h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${
                  currentIndex === idx
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 ring-blue-400/50'
                    : mockMarkReviewLater[q.id]
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 ring-amber-400/60'
                      : mockAnswers[q.id] !== undefined
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-transparent'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 ring-transparent'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div id="ai-generator-portal">
        <QuestionBankAIGeneratorModal
          open={showAIGenerator}
          onClose={() => setShowAIGenerator(false)}
          aiConfig={aiConfig}
          setAiConfig={setAiConfig}
          folders={folders}
          onSubmit={handleGenerateAI}
          isGenerating={isGenerating}
          generatingStatus={generatingStatus}
          aiCooldown={aiCooldown}
        />
      </div>

      <div id="add-form-portal">
      </div>

          <>
            {/* Filters & Stats */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 overflow-hidden">
            {/* Quick Stats */}
            <div className="p-4 grid grid-cols-3 gap-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-[5px_5px_10px_#d1d9e6,-5px_-5px_10px_#ffffff] dark:shadow-[5px_5px_10px_#000000,-5px_-5px_10px_#2a2a2a]">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{correctCount + wrongCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Questões</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-[5px_5px_10px_#d1d9e6,-5px_-5px_10px_#ffffff] dark:shadow-[5px_5px_10px_#000000,-5px_-5px_10px_#2a2a2a]">
                <span className="text-3xl font-black text-green-600 dark:text-green-400">{correctCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Acertos</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-[5px_5px_10px_#d1d9e6,-5px_-5px_10px_#ffffff] dark:shadow-[5px_5px_10px_#000000,-5px_-5px_10px_#2a2a2a]">
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {correctCount + wrongCount > 0 ? ((correctCount / (correctCount + wrongCount)) * 100).toFixed(0) : 0}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Aproveit.</span>
              </div>
            </div>
            {!isMockMode && (
              <QuestionBankGoalsBar
                goals={answerGoals}
                onSaveTargets={(daily, weekly) => {
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
                disabled={!isOnline || !isProgressLoaded}
              />
            )}
            {showNotebookCreationMode && (
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4 bg-orange-50 dark:bg-orange-900/20 animate-in fade-in duration-300">
                <h3 className="text-lg font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2">
                  <NotebookText size={20} /> Criar Novo Caderno
                </h3>
                <input
                  type="text"
                  placeholder="Nome do Caderno (Ex: Reta Final OAB - Ética)"
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Descrição (Opcional)"
                  value={newNotebookDescription}
                  onChange={(e) => setNewNotebookDescription(e.target.value)}
                  className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateNotebook}
                    disabled={selectedQuestionsForNotebook.size === 0 || newNotebookName.trim() === '' || isSubmitting}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />} Criar
                  </button>
                  <button
                    onClick={() => {
                      setShowNotebookCreationMode(false);
                      setSelectedQuestionsForNotebook(new Set());
                      setNewNotebookName('');
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors"
                  >
                    <X size={16} /> Cancelar
                  </button>
                </div>
              </div>
            )}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex-1 relative max-w-3xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md leading-5 bg-slate-50 dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              {selectedQuestionsForNotebook.size > 0 && (
                <div className="ml-4 animate-in slide-in-from-right-4 duration-300">
                  <button
                    onClick={() => setShowNotebookCreationMode(true)}
                    className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-orange-900/20"
                  >
                    <NotebookText size={14} /> Adicionar ao Caderno ({selectedQuestionsForNotebook.size})
                  </button>
                </div>
              )}
            </div>
            
            <QuestionBankFiltersPanel
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              selectedSubject={selectedSubject}
              setSelectedSubject={setSelectedSubject}
              setSelectedTopic={setSelectedTopic}
              subjects={subjects}
              filteredTopics={filteredTopics}
              selectedTopic={selectedTopic}
              selectedExamBoard={selectedExamBoard}
              setSelectedExamBoard={setSelectedExamBoard}
              examBoards={examBoards}
              selectedLegislation={selectedLegislation}
              setSelectedLegislation={setSelectedLegislation}
              legislationTags={legislationTags}
              selectedJurisprudence={selectedJurisprudence}
              setSelectedJurisprudence={setSelectedJurisprudence}
              jurisprudenceTags={jurisprudenceTags}
              selectedInstitution={selectedInstitution}
              setSelectedInstitution={setSelectedInstitution}
              institutions={institutions}
              selectedExamName={selectedExamName}
              setSelectedExamName={setSelectedExamName}
              examNames={examNames}
              selectedModality={selectedModality}
              setSelectedModality={setSelectedModality}
              selectedLegalDiploma={selectedLegalDiploma}
              setSelectedLegalDiploma={setSelectedLegalDiploma}
              legalDiplomas={legalDiplomas}
              difficultyFilter={difficultyFilter}
              setDifficultyFilter={setDifficultyFilter}
              notebooks={notebooks}
              selectedNotebookId={selectedNotebookId}
              setSelectedNotebookId={setSelectedNotebookId}
              questionStatus={questionStatus}
              setQuestionStatus={setQuestionStatus}
              hideResolved={hideResolved}
              setHideResolved={setHideResolved}
              filteredQuestionCount={filteredQuestions.length}
              onClearFilters={() => {
                setSearchTerm('');
                setSelectedSubject('');
                setSelectedTopic('');
                setDifficultyFilter('');
                setQuestionStatus('all');
                setSelectedNotebookId('');
                setSelectedInstitution('');
                setSelectedExamName('');
                setSelectedModality('');
                setSelectedLegalDiploma('');
                setHideResolved(false);
              }}
            />
          </div>

          {/* Question Area */}
          <div key="question-area-container" className="w-full">
            <div className="flex-1">
              {(isMockMode ? mockQuestions.length > 0 : filteredQuestions.length > 0) && currentQuestion ? (
                viewMode === 'list' ? (
                <div className="grid grid-cols-1 gap-8">
                  {filteredQuestions.map((q, idx) => (
                    <div 
                      key={q.id}
                      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden relative pl-20 p-8 transition-all duration-300 ${activeQuestionId === q.id ? 'ring-2 ring-purple-500 shadow-lg' : ''}`}
                    >
                      {/* Checkbox for Notebook Selection */}
                      <div className="absolute top-8 left-6 z-10">
                        <input 
                          type="checkbox"
                          checked={selectedQuestionsForNotebook.has(q.id)}
                          onChange={() => toggleQuestionSelection(q.id)}
                          className="w-6 h-6 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      </div>
                      
                      {(() => {
                        const stats = getXRayStats(q.id);
                        return (
                          <div className="absolute top-8 right-8 z-10 flex items-center gap-3">
                            {q.user_id === userId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteQuestion(q.id);
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                                title="Excluir questão permanentemente"
                              >
                                <X size={20} />
                              </button>
                            )}
                            {stats.totalAttempts > 0 && (
                              <div className={stats.lastAttemptCorrect ? 'text-green-500' : 'text-red-500'}>
                                <Target size={32} />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm">
                        <span className="font-bold text-slate-900 dark:text-white">{idx + 1}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{q.id.substring(0, 8)}</span>
                      <span className="text-slate-400 mx-1">•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{q.subject}</span>
                      <span className="text-slate-400 mx-1">▸</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium truncate">{q.topic}</span>
                    </div>
                    
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex gap-4 text-xs font-medium text-slate-500">
                          <span>Ano: <span className="text-slate-900 dark:text-white">{new Date().getFullYear()}</span></span>
                          <span>Estilo: <span className="text-slate-900 dark:text-white">{q.exam_board || 'N/A'}</span></span>
                          <span>Dificuldade: <span className="text-slate-900 dark:text-white capitalize">{q.difficulty}</span></span>
                        </div>
                        {q.legislation_tags && q.legislation_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {q.legislation_tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-100 dark:border-amber-900/30">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {q.jurisprudence_tags && q.jurisprudence_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {q.jurisprudence_tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-100 dark:border-purple-900/30">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {(correctQuestions.includes(q.id) || wrongQuestions.includes(q.id)) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                            <MessageSquare size={10} /> Discussão Liberada
                          </span>
                        )}
                      </div>
                      
                      {showXRay && (
                        <div className="flex flex-wrap items-center gap-2">
                          {(() => {
                            const stats = getXRayStats(q.id);
                            return (
                              <>
                                { /* Removed: Você acertou stats */ }
                                {!stats.lastAttemptCorrect && stats.totalAttempts > 0 && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold shadow-sm border border-red-100 dark:border-red-900/30">
                                    <AlertCircle size={12} />
                                    Última tentativa: Erro
                                  </span>
                                )}
                                { /* Removed: Tempo médio stats */ }
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <div
                        id={`qb-statement-${q.id}`}
                        className="text-slate-800 dark:text-slate-200 leading-relaxed mb-4"
                      >
                        <GlossaryText text={q.statement} onTermClick={handleTermClick} />
                      </div>
                      {selectedText && (
                        <button
                          onClick={handleJuridiquesTranslate}
                          disabled={loadingJuridiquesExplanation}
                          className="mb-4 flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingJuridiquesExplanation ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquareText size={14} />} Traduzir Juridiquês
                        </button>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            if (expandedQuestionId === q.id) {
                              setExpandedQuestionId(null);
                            } else {
                              setExpandedQuestionId(q.id);
                              setCurrentIndex(idx);
                              setSelectedOption(null);
                              setShowExplanation(false);
                            }
                          }}
                          className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
                            expandedQuestionId === q.id 
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' 
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                          }`}
                        >
                          {expandedQuestionId === q.id ? 'Fechar Questão' : 'Resolver Questão'}
                        </button>
                        
                        <button
                          onClick={() => handleAudioHint(q)}
                          disabled={isGeneratingHint}
                          className={`p-2 rounded-full ${activeQuestionId === q.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {isGeneratingHint ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                        </button>
                        
                      </div>
                        
                        {!isMockMode && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setCurrentIndex(idx);
                                setViewMode('single');
                                setSelectedOption(null);
                                setShowExplanation(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold transition-colors"
                            >
                              Modo Foco
                            </button>
                            <button
                              onClick={() => handleSaveAsPrecedent(q)}
                              disabled={isSavingPrecedent[q.id]}
                              className="px-4 py-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 text-sm font-bold transition-colors flex items-center gap-2"
                              title="Salvar como Precedente Relevante"
                            >
                              {isSavingPrecedent[q.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel size={16} />}
                              <span>Salvar Precedente</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Expanded Accordion Content */}
                      {expandedQuestionId === q.id && (
                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
                          <div
                            className="space-y-3"
                            role="group"
                            aria-label="Alternativas da questão"
                            aria-labelledby={`qb-statement-${q.id}`}
                          >
                            {q.options.map((option, optIdx) => {
                              const isSelected = isMockMode ? mockAnswers[q.id] === optIdx : selectedOption === optIdx;
                              const isCorrect = q.correct_answer === optIdx;
                              const showStatus = isMockMode ? isMockFinished : showExplanation;
                              const isEliminated = (eliminatedOptions[q.id] || []).includes(optIdx);
                              const letter = String.fromCharCode(65 + optIdx);
                              const statusHint = showStatus
                                ? isCorrect
                                  ? ', gabarito'
                                  : isSelected
                                    ? ', sua resposta'
                                    : ''
                                : isSelected
                                  ? ', selecionada'
                                  : '';
                              
                              let btnClass = `w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative group ${QB_OPTION_FOCUS} `;
                              
                              if (!showStatus) {
                                if (isSelected) {
                                  btnClass += "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
                                } else {
                                  btnClass += isEliminated 
                                    ? "border-slate-100 dark:border-slate-800 opacity-40 grayscale" 
                                    : "border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10";
                                }
                              } else {
                                if (isCorrect) {
                                  btnClass += "border-green-500 bg-green-50 dark:bg-green-900/10";
                                } else if (isSelected && !isCorrect) {
                                  btnClass += "border-red-500 bg-red-50 dark:bg-red-900/10";
                                } else {
                                  btnClass += "border-slate-200 dark:border-slate-800 opacity-50";
                                }
                              }

                              return (
                                <div key={optIdx} className="relative">
                                  <button
                                    type="button"
                                    onClick={() => handleAnswer(optIdx, q)}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      toggleElimination(q.id, optIdx);
                                    }}
                                    disabled={showStatus && !isMockMode}
                                    className={btnClass}
                                    aria-label={`Alternativa ${letter}${statusHint}. ${option}`}
                                    aria-pressed={!showStatus ? isSelected : undefined}
                                  >
                                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                                      showStatus && isCorrect ? 'bg-green-500 text-white' :
                                      showStatus && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                                      isSelected && !showStatus ? 'bg-blue-500 text-white' :
                                      'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                      {letter}
                                    </div>
                                    <div className={`flex-1 pt-1 text-slate-700 dark:text-slate-300 ${isEliminated && !showStatus ? 'line-through' : ''}`}>
                                      {option}
                                    </div>
                                    {showStatus && isCorrect && <CheckCircle2 className="text-green-500 shrink-0 mt-1" />}
                                    {showStatus && isSelected && !isCorrect && <XCircle className="text-red-500 shrink-0 mt-1" />}
                                  </button>
                                  
                                  {!showStatus && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleElimination(q.id, optIdx);
                                      }}
                                      className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                                        isEliminated ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 opacity-100' : 'text-slate-300 hover:text-orange-400'
                                      }`}
                                      title={isEliminated ? "Restaurar alternativa" : "Riscar alternativa (Botão Direito)"}
                                      aria-label={isEliminated ? `Restaurar alternativa ${letter}` : `Riscar alternativa ${letter}`}
                                    >
                                      {isEliminated ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {showExplanation && (
                            <div className="mt-8 space-y-4 animate-in slide-in-from-bottom-4">
                              {loadingAiCommentary[q.id] ? (
                                <div
                                  className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3"
                                  aria-live="polite"
                                  aria-busy="true"
                                >
                                  <Loader2 className="w-6 h-6 text-purple-500 animate-spin" aria-hidden />
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gerando Correção Estratégica...</p>
                                </div>
                              ) : aiCommentary[q.id] ? (
                                <>
                                  {typeof aiCommentary[q.id] === 'string' ? (
                                  <div
                                    className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700"
                                    role="region"
                                    aria-label="Correção em texto da inteligência artificial"
                                  >
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                      <Markdown remarkPlugins={[remarkGfm]}>{aiCommentary[q.id] as string}</Markdown>
                                    </div>
                                  </div>
                                ) : (
                                  (() => {
                                    const ac = aiCommentary[q.id] as QuestionAiCorrection;
                                    return (
                                  <div
                                    className="space-y-4"
                                    role="region"
                                    aria-label="Correção comentada pela inteligência artificial"
                                  >
                                    {/* Doutrina e Contexto */}
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <h4 className="font-black text-indigo-800 dark:text-indigo-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <BookOpen size={14} aria-hidden /> Doutrina e Contexto
                                    </h4>
                                    <p className="text-indigo-900/80 dark:text-indigo-200/80 text-sm leading-relaxed">
                                      {ac.doctrineAndContext}
                                    </p>
                                  </div>

                                  {/* Fundamentação Legal */}
                                  <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                    <h4 className="font-black text-emerald-800 dark:text-emerald-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Scale size={14} aria-hidden /> Fundamentação Legal
                                    </h4>
                                    <p className="text-emerald-900/80 dark:text-emerald-200/80 text-sm font-medium">
                                      {ac.legalBasis}
                                    </p>
                                  </div>

                                  {/* Análise das Alternativas */}
                                  <div className="space-y-2">
                                    <h4 id={`qb-alt-h-${q.id}`} className="font-black text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Gavel size={14} aria-hidden /> Análise das Alternativas
                                    </h4>
                                    <QuestionAlternativeAnalysisBlocks
                                      analysis={ac.alternativesAnalysis}
                                      headingId={`qb-alt-h-${q.id}`}
                                    />
                                  </div>

                                  {/* Pulo do Gato */}
                                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-10" aria-hidden>
                                      <Zap size={40} className="text-amber-500" />
                                    </div>
                                    <h4 className="font-black text-amber-800 dark:text-amber-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Lightbulb size={14} aria-hidden /> Pulo do Gato (Dica de Ouro)
                                    </h4>
                                    <p className="text-amber-900/80 dark:text-amber-200/80 text-sm font-bold italic">
                                      "{ac.mnemonic}"
                                    </p>
                                  </div>
                                </div>
                                    );
                                  })()
                                )}
                                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <MessageSquareText size={16} className="text-purple-500" />
                                      <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Aprofundar com Mentor IA</span>
                                    </div>
                                    
                                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                      {(followUpChat[q.id] || []).map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[90%] p-4 rounded-2xl text-xs font-bold shadow-sm ${
                                            msg.role === 'user' 
                                              ? 'bg-purple-600 text-white rounded-tr-none' 
                                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-100 dark:border-white/5'
                                          }`}>
                                            <div className="prose prose-xs dark:prose-invert max-w-none">
                                              <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      {isFollowUpLoading[q.id] && (
                                        <div className="flex justify-start">
                                          <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-2xl rounded-tl-none">
                                            <Loader2 size={14} className="animate-spin text-purple-500" />
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex gap-2">
                                      <input 
                                        type="text"
                                        value={followUpInput[q.id] || ''}
                                        onChange={(e) => setFollowUpInput(prev => ({ ...prev, [q.id]: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleFollowUp(q.id, q.statement)}
                                        placeholder="Tire uma dúvida ou peça para aprofundar..."
                                        className="flex-1 p-3 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-purple-500"
                                      />
                                      <button 
                                        onClick={() => handleFollowUp(q.id, q.statement)}
                                        disabled={isFollowUpLoading[q.id] || !(followUpInput[q.id] || '').trim()}
                                        className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                                      >
                                        {isFollowUpLoading[q.id] ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Send className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex gap-3 pt-2">
                                    <button
                                      onClick={() => handleCreateFlashcardFromError(q)}
                                      className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${selectedOption === q.correct_answer ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-900/20'}`}
                                      disabled={selectedOption === q.correct_answer}
                                    >
                                      <PlusSquare size={16} /> Virar Flashcard do Erro
                                    </button>
                                  </div>

                                  <QuestionComments 
                                    questionId={q.id} 
                                    userId={userId} 
                                    isAnswered={correctQuestions.includes(q.id) || wrongQuestions.includes(q.id) || (expandedQuestionId === q.id && showExplanation)}
                                    questionTitle={q.statement}
                                    showNotification={showNotification}
                                  />
                                </>
                              ) : (
                                <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                  <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                    <BookOpen size={18} /> Explicação Padrão
                                  </h4>
                                  <p className="text-blue-900/80 dark:text-blue-200/80 leading-relaxed text-sm whitespace-pre-wrap">
                                    {q.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setViewMode('list')}
                  className="self-start flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold text-sm uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  <ArrowLeft size={18} /> Voltar para a Lista
                </button>
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
              {/* Target & Delete Icons */}
              {(() => {
                const stats = getXRayStats(currentQuestion.id);
                return (
                  <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
                    {currentQuestion.user_id === userId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(currentQuestion.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                        title="Excluir questão permanentemente"
                      >
                        <X size={20} />
                      </button>
                    )}
                    {stats.totalAttempts > 0 && (
                      <div className={stats.lastAttemptCorrect ? 'text-green-500' : 'text-red-500'}>
                        <Target size={32} />
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Question Header */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">
                      {currentQuestion.subject}
                    </span>
                    {currentQuestion.topic && (
                      <span className="inline-block px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold uppercase tracking-wider">
                        {currentQuestion.topic}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-4 text-xs font-medium text-slate-500">
                      <span>Ano: <span className="text-slate-900 dark:text-white">{currentQuestion.year || 'N/A'}</span></span>
                      <span>Banca: <span className="text-slate-900 dark:text-white">{currentQuestion.exam_board || 'N/A'}</span></span>
                    </div>
                    
                    {showXRay && (
                      <div className="flex flex-wrap items-center gap-2">
                        {(() => {
                          const stats = getXRayStats(currentQuestion.id);
                          return (
                            <>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                                <Target size={20} className="text-blue-500" />
                                { /* Removed: Você acertou stats */ }
                              </span>
                              {!stats.lastAttemptCorrect && stats.totalAttempts > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold shadow-sm border border-red-100 dark:border-red-900/30">
                                  <AlertCircle size={12} />
                                  Última tentativa: Erro
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                                <Clock size={12} />
                                Tempo médio: {stats.avgTime}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleFavorite(currentQuestion.id)}
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 active:scale-90"
                    title={favorites.includes(currentQuestion.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Star 
                      size={20} 
                      className={`transition-all duration-300 ${favorites.includes(currentQuestion.id) ? "fill-yellow-500 text-yellow-500 scale-110" : "text-slate-400"}`} 
                    />
                  </button>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    currentQuestion.difficulty === 'facil' ? 'bg-green-100 text-green-700' :
                    currentQuestion.difficulty === 'media' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {currentQuestion.difficulty}
                  </span>
                </div>
              </div>

              {/* Question Body */}
              <div className="p-6 md:p-8">
                <div
                  id={`qb-statement-${currentQuestion.id}`}
                  className="text-lg md:text-xl text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-4 whitespace-pre-wrap"
                >
                  {currentQuestion.statement}
                </div>
                {selectedText && (
                  <button
                    onClick={handleJuridiquesTranslate}
                    disabled={loadingJuridiquesExplanation}
                    className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingJuridiquesExplanation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareText size={18} />} Traduzir Juridiquês
                  </button>
                )}

                <div
                  className="space-y-3"
                  role="group"
                  aria-label="Alternativas da questão"
                  aria-labelledby={`qb-statement-${currentQuestion.id}`}
                >
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = isMockMode ? mockAnswers[currentQuestion.id] === idx : selectedOption === idx;
                    const isCorrect = currentQuestion.correct_answer === idx;
                    const showStatus = isMockMode ? isMockFinished : showExplanation;
                    const isEliminated = (eliminatedOptions[currentQuestion.id] || []).includes(idx);
                    const letter = String.fromCharCode(65 + idx);
                    const statusHint = showStatus
                      ? isCorrect
                        ? ', gabarito'
                        : isSelected
                          ? ', sua resposta'
                          : ''
                      : isSelected
                        ? ', selecionada'
                        : '';
                    
                    let btnClass = `w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative group ${QB_OPTION_FOCUS} `;
                    
                    if (!showStatus) {
                      if (isSelected) {
                        btnClass += "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
                      } else {
                        btnClass += isEliminated 
                          ? "border-slate-100 dark:border-slate-800 opacity-40 grayscale" 
                          : "border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10";
                      }
                    } else {
                      if (isCorrect) {
                        btnClass += "border-green-500 bg-green-50 dark:bg-green-900/10";
                      } else if (isSelected && !isCorrect) {
                        btnClass += "border-red-500 bg-red-50 dark:bg-red-900/10";
                      } else {
                        btnClass += "border-slate-200 dark:border-slate-800 opacity-50";
                      }
                    }

                    return (
                      <div key={idx} className="relative">
                        <button
                          type="button"
                          onClick={() => handleAnswer(idx)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            toggleElimination(currentQuestion.id, idx);
                          }}
                          disabled={showStatus && !isMockMode}
                          className={btnClass}
                          aria-label={`Alternativa ${letter}${statusHint}. ${option}`}
                          aria-pressed={!showStatus ? isSelected : undefined}
                        >
                          <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                            showStatus && isCorrect ? 'bg-green-500 text-white' :
                            showStatus && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                            isSelected && !showStatus ? 'bg-blue-500 text-white' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {letter}
                          </div>
                          <div className={`flex-1 pt-1 text-slate-700 dark:text-slate-300 ${isEliminated && !showStatus ? 'line-through' : ''}`}>
                            {option}
                          </div>
                          {showStatus && isCorrect && <CheckCircle2 className="text-green-500 shrink-0 mt-1" />}
                          {showStatus && isSelected && !isCorrect && <XCircle className="text-red-500 shrink-0 mt-1" />}
                        </button>
                        
                        {!showStatus && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleElimination(currentQuestion.id, idx);
                            }}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                              isEliminated ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 opacity-100' : 'text-slate-300 hover:text-orange-400'
                            }`}
                            title={isEliminated ? "Restaurar alternativa" : "Riscar alternativa (Botão Direito)"}
                            aria-label={isEliminated ? `Restaurar alternativa ${letter}` : `Riscar alternativa ${letter}`}
                          >
                            {isEliminated ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {showExplanation && (
                  <div className="mt-8 space-y-4 animate-in slide-in-from-bottom-4">
                    {loadingAiCommentary[currentQuestion.id] ? (
                      <div
                        className="p-12 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-4"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" aria-hidden />
                        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Consultando Jurisprudência...</p>
                      </div>
                    ) : aiCommentary[currentQuestion.id] ? (
                      <>
                        {typeof aiCommentary[currentQuestion.id] === 'string' ? (
                        <div className="space-y-6" role="region" aria-label="Correção em texto da inteligência artificial">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Correção Comentada IA</span>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                          </div>
                          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <Markdown remarkPlugins={[remarkGfm]}>{aiCommentary[currentQuestion.id] as string}</Markdown>
                            </div>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const ac = aiCommentary[currentQuestion.id] as QuestionAiCorrection;
                          return (
                        <div
                          className="space-y-6"
                          role="region"
                          aria-label="Correção comentada pela inteligência artificial"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Correção Comentada IA</span>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                          </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Doutrina e Contexto */}
                          <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-900/30">
                            <h4 className="font-black text-indigo-800 dark:text-indigo-400 text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                              <BookOpen size={16} aria-hidden /> Doutrina e Contexto
                            </h4>
                            <p className="text-indigo-900/80 dark:text-indigo-200/80 text-sm leading-relaxed">
                              {ac.doctrineAndContext}
                            </p>
                          </div>

                          <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-900/30">
                            <h4 className="font-black text-emerald-800 dark:text-emerald-400 text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Scale size={16} aria-hidden /> Fundamentação Legal
                            </h4>
                            <p className="text-emerald-900/80 dark:text-emerald-200/80 text-sm font-bold leading-relaxed">
                              {ac.legalBasis}
                            </p>
                          </div>

                          <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border-2 border-amber-100 dark:border-amber-900/30 relative overflow-hidden">
                            <div className="absolute -top-2 -right-2 opacity-10 rotate-12" aria-hidden>
                              <Zap size={80} className="text-amber-500" />
                            </div>
                            <h4 className="font-black text-amber-800 dark:text-amber-400 text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Lightbulb size={16} aria-hidden /> Pulo do Gato
                            </h4>
                            <p className="text-amber-900/80 dark:text-amber-200/80 text-sm font-black italic leading-relaxed">
                              "{ac.mnemonic}"
                            </p>
                          </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 space-y-3">
                          <h4 id={`qb-alt-h-single-${currentQuestion.id}`} className="font-black text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Gavel size={16} aria-hidden /> Análise Técnica das Alternativas
                          </h4>
                          <QuestionAlternativeAnalysisBlocks
                            analysis={ac.alternativesAnalysis}
                            headingId={`qb-alt-h-single-${currentQuestion.id}`}
                          />
                        </div>
                      </div>
                          );
                        })()
                      )}
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquareText size={16} className="text-purple-500" />
                            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Aprofundar com Mentor IA</span>
                          </div>
                          
                          <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {(followUpChat[currentQuestion.id] || []).map((msg, i) => (
                              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] p-4 rounded-2xl text-xs font-bold shadow-sm ${
                                  msg.role === 'user' 
                                    ? 'bg-purple-600 text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-100 dark:border-white/5'
                                }`}>
                                  <div className="prose prose-xs dark:prose-invert max-w-none">
                                    <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {isFollowUpLoading[currentQuestion.id] && (
                              <div className="flex justify-start">
                                <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-2xl rounded-tl-none">
                                  <Loader2 size={14} className="animate-spin text-purple-500" />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={followUpInput[currentQuestion.id] || ''}
                              onChange={(e) => setFollowUpInput(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleFollowUp(currentQuestion.id, currentQuestion.statement)}
                              placeholder="Tire uma dúvida ou peça para aprofundar..."
                              className="flex-1 p-3 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-purple-500"
                            />
                            <button 
                              onClick={() => handleFollowUp(currentQuestion.id, currentQuestion.statement)}
                              disabled={isFollowUpLoading[currentQuestion.id] || !(followUpInput[currentQuestion.id] || '').trim()}
                              className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                              {isFollowUpLoading[currentQuestion.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                          <button
                            onClick={() => handleCreateFlashcardFromError(currentQuestion, selectedOption, selectedOption === currentQuestion.correct_answer)}
                            className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${
                              (selectedOption === currentQuestion.correct_answer && confidenceLevel === 'certeza') 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-xl shadow-purple-900/20 active:scale-95'
                            }`}
                            disabled={selectedOption === currentQuestion.correct_answer && confidenceLevel === 'certeza'}
                          >
                            <PlusSquare size={20} /> {selectedOption === currentQuestion.correct_answer ? 'Flashcard da Dúvida' : 'Flashcard do Erro'}
                          </button>
                          <button
                            onClick={() => handleSaveAsPrecedent(currentQuestion)}
                            disabled={isSavingPrecedent[currentQuestion.id]}
                            className="flex-1 py-4 bg-white dark:bg-slate-800 border-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-purple-900/5 active:scale-95"
                          >
                            {isSavingPrecedent[currentQuestion.id] ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gavel size={20} />}
                            Salvar como Precedente
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                          <BookOpen size={18} /> Explicação
                        </h4>
                        <p className="text-blue-900/80 dark:text-blue-200/80 leading-relaxed text-sm whitespace-pre-wrap">
                          {currentQuestion.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Personal Notes */}
                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <LayoutList size={18} /> Minhas Anotações
                  </h4>
                  <div className="relative">
                    <textarea
                      value={notes[currentQuestion.id] || ''}
                      onChange={(e) => {
                        const newNotes = { ...notes, [currentQuestion.id]: e.target.value };
                        setNotes(newNotes);
                      }}
                      onBlur={(e) => {
                        handleSaveNote(currentQuestion.id, e.target.value);
                      }}
                      className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm text-slate-700 dark:text-slate-300 min-h-[100px]"
                      placeholder="Adicione suas observações sobre esta questão..."
                    />
                    <div className="absolute bottom-3 right-3">
                      <button 
                        onClick={() => handleSaveNote(currentQuestion.id, notes[currentQuestion.id] || '')}
                        className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        title="Salvar anotação"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <QuestionComments 
                  questionId={currentQuestion.id} 
                  userId={userId} 
                  isAnswered={correctQuestions.includes(currentQuestion.id) || wrongQuestions.includes(currentQuestion.id) || showExplanation}
                  questionTitle={currentQuestion.statement}
                  showNotification={showNotification}
                />
              </div>

              {/* Footer / Navigation */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={
                    isMockMode && mockQuestions.length > 0
                      ? mockNavUnansweredOnly
                        ? getPrevUnansweredMockIndex(currentIndex) < 0
                        : currentIndex === 0
                      : currentIndex === 0
                  }
                  className="px-4 py-2 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors font-bold text-sm uppercase tracking-wider"
                >
                  <ChevronLeft size={18} /> Anterior
                </button>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-slate-400">
                    {currentIndex + 1} /{' '}
                    {isMockMode && mockQuestions.length > 0 ? mockQuestions.length : filteredQuestions.length}
                  </span>
                  {isMockMode && currentQuestion && (
                    <button
                      type="button"
                      onClick={() =>
                        setMockMarkReviewLater((prev) => ({
                          ...prev,
                          [currentQuestion.id]: !prev[currentQuestion.id],
                        }))
                      }
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors ${
                        mockMarkReviewLater[currentQuestion.id]
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
                          : 'bg-slate-200/80 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Bookmark size={12} className={mockMarkReviewLater[currentQuestion.id] ? 'fill-current' : ''} />
                      Revisar depois
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    isMockMode && mockQuestions.length > 0
                      ? mockNavUnansweredOnly
                        ? getNextUnansweredMockIndex(currentIndex) < 0
                        : currentIndex === mockQuestions.length - 1
                      : currentIndex === filteredQuestions.length - 1
                  }
                  className="px-4 py-2 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors font-bold text-sm uppercase tracking-wider"
                >
                  Próxima <ChevronRight size={18} />
                </button>
              </div>
            </div>
            </div>
            )
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Nenhuma questão encontrada</h3>
              <p className="text-slate-500">
                {questions.length === 0 
                  ? "O banco de questões está vazio. Use o Gerador de IA para criar questões!" 
                  : "Nenhuma questão corresponde aos filtros selecionados."}
              </p>
              {questions.length === 0 && (
                <button
                  onClick={() => setShowAIGenerator(true)}
                  className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 mx-auto"
                >
                  <Sparkles size={18} />
                  Gerar Questões com IA
                </button>
              )}
            </div>
          )}
            </div>
          </div>
          </>
        <div id="notification-portal">
          {notification && (
            <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
              notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span className="font-bold text-sm">{notification.message}</span>
            </div>
          )}
        </div>

      {showAiLesson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[130] flex items-center justify-center p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qb-ai-lesson-title"
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl" aria-hidden>
                  <Sparkles className="text-purple-600 dark:text-purple-400" size={24} />
                </div>
                <div>
                  <h2 id="qb-ai-lesson-title" className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Aula Resumida IA</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedSubject}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowAiLesson(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all" aria-label="Fechar aula resumida">
                <X size={24} aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
              {loadingAiLesson ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 border-4 border-purple-100 dark:border-purple-900/30 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BrainCircuit className="text-purple-500 animate-bounce" size={32} />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Preparando sua Aula...</h3>
                  <p className="text-slate-500 text-center max-w-xs font-medium">
                    Nossa IA está analisando seus erros e preparando um resumo focado para você vencer esse tema.
                  </p>
                </div>
              ) : (
                <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-p:font-medium prose-p:leading-relaxed prose-strong:text-purple-600 dark:prose-strong:text-purple-400">
                  <Markdown remarkPlugins={[remarkGfm]}>{aiLessonContent}</Markdown>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowAiLesson(false)}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              >
                Entendido, Vamos Praticar!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Juridiquês Translator Modal */}
      {showJuridiquesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qb-juridiques-title"
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 id="qb-juridiques-title" className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquareText className="text-blue-500" aria-hidden />
                Tradutor de Juridiquês
              </h2>
              <button type="button" onClick={() => setShowJuridiquesModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Fechar tradutor">
                <X size={24} aria-hidden />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Trecho Selecionado</h3>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 italic">
                  "{selectedText}"
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-2">Explicação Simples</h3>
                {loadingJuridiquesExplanation ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-sm text-slate-500">A IA está simplificando o texto para você...</p>
                  </div>
                ) : (
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {juridiquesExplanation}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowJuridiquesModal(false)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Glossary Search Modal */}
      {showManualGlossarySearch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qb-glossary-title"
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md animate-in zoom-in-95 duration-300"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 id="qb-glossary-title" className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Book className="text-indigo-500" aria-hidden />
                Dicionário Jurídico
              </h2>
              <button type="button" onClick={() => setShowManualGlossarySearch(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Fechar dicionário">
                <X size={24} aria-hidden />
              </button>
            </div>
            
            <form onSubmit={handleManualSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Termo ou Expressão</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={manualSearchTerm}
                    onChange={e => setManualSearchTerm(e.target.value)}
                    className="w-full p-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                    placeholder="Ex: Habeas Corpus, Lide, Prescrição..."
                  />
                  <button
                    type="submit"
                    disabled={isLoadingGlossary}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isLoadingGlossary ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search size={20} />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic">
                A IA da SanFran definirá o termo juridicamente para você.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Glossary Popover */}
      <AnimatePresence>
        {activeGlossaryTerm && glossaryData && (
          <GlossaryPopover
            data={glossaryData}
            onClose={() => {
              setActiveGlossaryTerm(null);
              setGlossaryData(null);
            }}
            userId={userId}
            isOnline={isOnline}
            position={glossaryPosition}
          />
        )}
      </AnimatePresence>

      {isLoadingGlossary && !glossaryData && (
        <div 
          className="fixed z-[100] p-4 bg-white rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-3 animate-in fade-in duration-200"
          style={{ left: glossaryPosition.x, top: glossaryPosition.y + 20 }}
        >
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          <span className="text-sm font-bold text-slate-600">Buscando definição...</span>
        </div>
      )}
      {isNotebookModalOpen && (
        <NotebookModal
          isOpen={isNotebookModalOpen}
          onClose={() => setIsNotebookModalOpen(false)}
          notebooks={notebooks}
          selectedQuestionIds={Array.from(selectedQuestionsForNotebook)}
          onCreateNotebook={async (name, description) => {
            setNewNotebookName(name);
            setNewNotebookDescription(description);
            await handleCreateNotebook();
            setIsNotebookModalOpen(false);
          }}
          onAddToNotebook={async (notebookId) => {
            try {
              setIsSubmitting(true);
              const notebook = notebooks.find(n => n.id === notebookId);
              if (!notebook) return;
              
              const updatedQuestionIds = Array.from(new Set([...notebook.question_ids, ...Array.from(selectedQuestionsForNotebook)]));
              
              const { error } = await supabase
                .from('notebooks')
                .update({ question_ids: updatedQuestionIds })
                .eq('id', notebookId);
              
              if (error) throw error;
              
              setNotebooks(prev => prev.map(n => n.id === notebookId ? {...n, question_ids: updatedQuestionIds} : n));
              showNotification('Questões adicionadas ao caderno!', 'success');
              setSelectedQuestionsForNotebook(new Set());
              setIsNotebookModalOpen(false);
            } catch (error: any) {
              showNotification('Erro ao adicionar ao caderno.', 'error');
            } finally {
              setIsSubmitting(false);
            }
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {isDeckModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qb-deck-title"
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md animate-in zoom-in-95 duration-300"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 id="qb-deck-title" className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BrainCircuit className="text-indigo-500" aria-hidden />
                Escolher Baralho
              </h2>
              <button type="button" onClick={() => setIsDeckModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Fechar seleção de baralho">
                <X size={24} aria-hidden />
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {folders.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Nenhum baralho encontrado. Crie um primeiro no Anki.</p>
              ) : (
                folders.map(folder => (
                  <button
                    key={folder.id}
                    disabled={isSubmitting}
                    onClick={() => handleConfirmFlashcardCreation(folder.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderIcon size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{folder.name}</p>
                      <p className="text-xs text-slate-500">{isSubmitting ? 'Criando...' : 'Adicionar a este baralho'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeckModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Hidden container for PDF export */}
      {isExporting && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px', backgroundColor: '#ffffff', zIndex: -1 }}>
          <div id="pdf-cover" className="p-16 bg-white flex flex-col items-center justify-center text-center h-[1100px]">
            <div className="w-32 h-32 bg-[#800020] rounded-3xl flex items-center justify-center mb-12 border border-gray-200">
              <Scale className="w-16 h-16 text-white" />
            </div>
            
            <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-4 font-serif">
              CADERNO DE QUESTÕES
            </h1>
            <h2 className="text-2xl font-bold text-[#800020] tracking-widest uppercase mb-24">
              Exame de Proficiência Jurídica
            </h2>

            <div className="w-full max-w-2xl space-y-8 text-left mb-24">
              <div className="border-b-2 border-gray-300 pb-2">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Nome do Aluno</span>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="border-b-2 border-gray-300 pb-2">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Número USP</span>
                </div>
                <div className="border-b-2 border-gray-300 pb-2">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Data</span>
                </div>
              </div>
            </div>

            <div className="w-full max-w-2xl bg-gray-50 p-8 rounded-2xl border border-gray-200 text-left">
              <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wider">Instruções ao Candidato</h3>
              <ul className="space-y-3 text-gray-600 text-sm font-medium list-disc list-inside">
                <li>Verifique se este caderno contém todas as questões solicitadas.</li>
                <li>Leia atentamente cada questão antes de assinalar a resposta.</li>
                <li>Preencha o gabarito ao final do caderno com caneta esferográfica de tinta azul ou preta.</li>
                <li>Não é permitido o uso de material de consulta durante a resolução.</li>
                <li>O tempo sugerido para resolução é de 3 minutos por questão.</li>
              </ul>
            </div>
          </div>

          <div id="pdf-header" className="p-8 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#800020] rounded-xl flex items-center justify-center border border-gray-200">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SANFRAN ACADEMY</h1>
                <p className="text-sm text-gray-500 font-medium">Excelência no Ensino Jurídico - XI de Agosto</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#800020]">Simulado Oficial</p>
              <p className="text-sm text-gray-500 font-medium">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
      </div>
  );
};

export default QuestionBank;
