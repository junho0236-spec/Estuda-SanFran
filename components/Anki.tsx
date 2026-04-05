// Anki.tsx - Community Features and Card Rating
// Force rebuild to resolve Vercel resolution error for AnkiStats
// Anki.tsx - Community Features and Card Rating

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { GEMINI_MODEL } from '../services/geminiService';
import confetti from 'canvas-confetti';
import { 
  Plus, 
  BrainCircuit, 
  RotateCcw, 
  Folder as FolderIcon, 
  ArrowLeft, 
  Trash2, 
  FolderPlus, 
  CheckSquare,
  Square,
  X,
  Gavel,
  Check,
  Archive,
  Sparkles,
  Zap,
  Save,
  Flame,
  Trophy,
  TrendingUp,
  FileText,
  Upload,
  Link,
  Image,
  Paperclip,
  History,
  FileDown,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Edit2,
  Filter,
  Loader2,
  Download,
  Search,
  Calendar,
  LayoutGrid,
  List,
  Play,
  Pause,
  Settings2,
  Activity,
  Volume2,
  ZapOff,
  Star,
  ShieldCheck,
  Eye,
  AlertCircle,
  CheckCircle2,
  Info,
  Circle,
  ArrowRight,
  Maximize2,
  Clock,
  Minimize2,
  Smartphone,
  MessageSquareText,
  Send,
  Book,
  Scale,
  Hammer,
  Briefcase,
  GraduationCap,
  Landmark,
  Library,
  Timer
} from 'lucide-react';
import JSZip from 'jszip';
import { Flashcard, Subject, Folder, DeckRequest, StudySession, GlossaryTerm } from '../types';
import { supabase } from '../services/supabaseClient';
import { dataService } from '../services/dataService';
import { updateQuestProgress } from '../services/questService';
import { generateFlashcards, generateFlashcardsStream, evaluateDissertativeAnswer, fetchTermDefinition } from '../services/geminiService';
import { SmartText } from './SmartVadeMecum';
import { GlossaryText } from './GlossaryText.tsx';
import { GlossaryPopover } from './GlossaryPopover.tsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SessionStats {
  isActive: boolean;
  isFinished: boolean;
  new: { total: number; correct: number; totalTimeMs: number };
  learning: { total: number; correct: number; totalTimeMs: number };
  review: { total: number; correct: number; totalTimeMs: number };
  errors: Flashcard[];
  cardTimes: { card: Flashcard; timeMs: number }[];
}

interface AnkiProps {
  subjects: Subject[];
  flashcards: Flashcard[];
  setFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  userId: string;
  isOnline: boolean;
  initialText: string | null;
  setInitialText: React.Dispatch<React.SetStateAction<string | null>>;
  setStudySessions?: React.Dispatch<React.SetStateAction<any[]>>;
  isLoadingFlashcards?: boolean;
}

const FOLDER_COLORS = [
  { name: 'Dourado', border: 'border-l-usp-gold', text: 'text-usp-gold', bg: 'bg-usp-gold' },
  { name: 'Rubi', border: 'border-l-sanfran-rubi', text: 'text-sanfran-rubi', bg: 'bg-sanfran-rubi' },
  { name: 'Azul', border: 'border-l-blue-500', text: 'text-blue-500', bg: 'bg-blue-500' },
  { name: 'Esmeralda', border: 'border-l-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500' },
  { name: 'Âmbar', border: 'border-l-amber-500', text: 'text-amber-500', bg: 'bg-amber-500' },
  { name: 'Roxo', border: 'border-l-purple-500', text: 'text-purple-500', bg: 'bg-purple-500' },
  { name: 'Rosa', border: 'border-l-pink-500', text: 'text-pink-500', bg: 'bg-pink-500' },
  { name: 'Ciano', border: 'border-l-cyan-500', text: 'text-cyan-500', bg: 'bg-cyan-500' },
  { name: 'Laranja', border: 'border-l-orange-500', text: 'text-orange-500', bg: 'bg-orange-500' },
  { name: 'Indigo', border: 'border-l-indigo-500', text: 'text-indigo-500', bg: 'bg-indigo-500' },
];

const FOLDER_ICONS = [
  { name: 'Pasta', value: 'folder', icon: FolderIcon },
  { name: 'Balança', value: 'scale', icon: Scale },
  { name: 'Livro', value: 'book', icon: Book },
  { name: 'Martelo', value: 'hammer', icon: Hammer },
  { name: 'Maleta', value: 'briefcase', icon: Briefcase },
  { name: 'Formatura', value: 'graduation', icon: GraduationCap },
  { name: 'Tribunal', value: 'landmark', icon: Landmark },
  { name: 'Biblioteca', value: 'library', icon: Library },
  { name: 'Documento', value: 'document', icon: FileText }
];

const Anki: React.FC<AnkiProps> = ({ subjects, flashcards, setFlashcards, folders, setFolders, userId, isOnline, initialText, setInitialText, setStudySessions, isLoadingFlashcards }) => {
  const location = useLocation();
  const { state } = location;

  const [mode, setMode] = useState<'browse' | 'study' | 'create' | 'bulk' | 'ai_create' | 'community'>('browse');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>((subjects && subjects.length > 0) ? subjects[0].id : '');
  
  // Community State
  const [publicDecks, setPublicDecks] = useState<any[]>([]);
  const [isFetchingCommunity, setIsFetchingCommunity] = useState(false);
  const [communitySearch, setCommunitySearch] = useState('');
  
  // States comuns
  const [bulkInput, setBulkInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Glossary States
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<string | null>(null);
  const [glossaryData, setGlossaryData] = useState<GlossaryTerm | null>(null);
  const [glossaryPosition, setGlossaryPosition] = useState({ x: 0, y: 0 });
  const [isLoadingGlossary, setIsLoadingGlossary] = useState(false);

  const handleTermClick = async (term: string, position: { x: number; y: number }) => {
    setActiveGlossaryTerm(term);
    setGlossaryPosition(position);
    setIsLoadingGlossary(true);
    setGlossaryData(null);

    try {
      const data = await fetchTermDefinition(term);
      setGlossaryData(data);
    } catch (error) {
      console.error("Error fetching glossary term:", error);
    } finally {
      setIsLoadingGlossary(false);
    }
  };
  const [isFlipped, setIsFlipped] = useState(false);
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualImage, setManualImage] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0].border);
  const [newFolderIcon, setNewFolderIcon] = useState(FOLDER_ICONS[0].value);
  const [newFolderTargetDate, setNewFolderTargetDate] = useState<string>('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [dailyGoal, setDailyGoal] = useState(50);
  const [sessionCounters, setSessionCounters] = useState({ new: 0, pending: 0, completed: 0 });
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    isActive: false,
    isFinished: false,
    new: { total: 0, correct: 0, totalTimeMs: 0 },
    learning: { total: 0, correct: 0, totalTimeMs: 0 },
    review: { total: 0, correct: 0, totalTimeMs: 0 },
    errors: [],
    cardTimes: []
  });
  const [hoveredHeatmapDay, setHoveredHeatmapDay] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
    isTopHalf: boolean;
  } | null>(null);
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState<string | null>(null);
  const [dailySummaryData, setDailySummaryData] = useState<any[]>([]);
  const [isDailySummaryLoading, setIsDailySummaryLoading] = useState(false);

  const handleHeatmapClick = async (dateStr: string) => {
    setSelectedHeatmapDate(dateStr);
    setIsDailySummaryLoading(true);
    try {
      const sessions = await dataService.getStudySessionsByDate(userId, dateStr, isOnline);
      setDailySummaryData(sessions);
    } catch (err) {
      console.error("Error fetching daily summary:", err);
    } finally {
      setIsDailySummaryLoading(false);
    }
  };

  useEffect(() => {
    if (state && (state as any).newFlashcard) {
      const { newFlashcard } = state as any;
      setManualFront(newFlashcard.front);
      setManualBack(newFlashcard.back);
      setSelectedSubjectId((subjects || []).find(s => s.name === newFlashcard.subject)?.id || selectedSubjectId);
      setMode('create');
      // Clear the state so it doesn't persist on subsequent visits
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [state, subjects, selectedSubjectId, setManualFront, setManualBack, setSelectedSubjectId, setMode, location.pathname]);

  useEffect(() => {
    if (!selectedSubjectId && subjects && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);
  const [isTableView, setIsTableView] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  
  // Custom UI for notifications and confirmations
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const askConfirmation = (title: string, message: string, onConfirm: () => void, confirmText = "Confirmar", cancelText = "Cancelar") => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      confirmText,
      cancelText
    });
  };
  const [selectedFolderIdsForSession, setSelectedFolderIdsForSession] = useState<Set<string>>(new Set());
  const [studyHistory, setStudyHistory] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q')?.trim();
    if (!q) return;
    setSearchQuery(q);
    setIsGlobalSearch(true);
    setMode('browse');
    const next = new URLSearchParams(location.search);
    next.delete('q');
    const qs = next.toString();
    window.history.replaceState({}, '', `${location.pathname}${qs ? `?${qs}` : ''}`);
  }, [location.search, location.pathname]);
  const [isCramMode, setIsCramMode] = useState(false);
  const [isAdvanceMode, setIsAdvanceMode] = useState(false);
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [cardTimer, setCardTimer] = useState(0);
  const [cardStartTime, setCardStartTime] = useState(Date.now());

  // Dissertative Mode State
  const [isDissertativeMode, setIsDissertativeMode] = useState(false);
  const [userWrittenAnswer, setUserWrittenAnswer] = useState('');
  const [aiEvaluation, setAiEvaluation] = useState<{ score: number; feedback: string; missing_keywords: string[]; is_perfect: boolean } | null>(null);
  const [followUpChat, setFollowUpChat] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const dragX = useMotionValue(0);
  const leftOverlayOpacity = useTransform(dragX, [-150, -50, 0], [0.6, 0, 0]);
  const rightOverlayOpacity = useTransform(dragX, [0, 50, 150], [0, 0, 0.6]);
  
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [isFirstCardOfSession, setIsFirstCardOfSession] = useState(true);
  const utteranceRefs = useRef<SpeechSynthesisUtterance[]>([]);

  const pushToHistory = (card: Flashcard) => {
    const currentState = {
      isFlipped,
      userWrittenAnswer,
      aiEvaluation,
      followUpChat: [...followUpChat],
      isDissertativeMode,
      cardState: { ...card },
      sessionCounters: { ...sessionCounters }
    };
    setUndoStack(prev => [...prev.slice(-19), currentState]); // Limit to 20 items
    setRedoStack([]); // Clear redo stack on new action
  };

  const undoAction = async () => {
    window.speechSynthesis.cancel(); // Abort audio before transition
    if (undoStack.length === 0) return;

    const prevState = undoStack[undoStack.length - 1];
    
    // Revert in DB
    if (prevState.cardState) {
      setFlashcards(prev => prev.map(f => f.id === prevState.cardState.id ? prevState.cardState : f));
      await dataService.saveFlashcard(prevState.cardState, userId, isOnline);
    }

    if (prevState.sessionCounters) {
      setSessionCounters(prevState.sessionCounters);
    }

    setUndoStack(prev => prev.slice(0, -1));
    // We don't need to restore UI state like isFlipped because the card will reappear in the queue
    setIsFlipped(false);
    setUserWrittenAnswer('');
    setAiEvaluation(null);
    setFollowUpChat([]);
    setIsDissertativeMode(false);
  };

  const redoAction = async () => {
    // Redo is complex with dynamic queues, so we'll just disable it for now or implement later
    // The user rarely needs redo for flashcards anyway
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (mode !== 'study' || isDissertativeMode) return;
      
      // Space to flip
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) {
          redoAction();
        } else {
          undoAction();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        redoAction();
      }

      // Focus Mode Toggle
      if (e.code === 'KeyF') {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
      }
      if (e.code === 'Escape' && isFocusMode) {
        e.preventDefault();
        setIsFocusMode(false);
      }
      
      // 1, 2, 3, 4 for ratings (if flipped)
      if (isFlipped && !isCramMode) {
        if (e.key === '1') handleReview(0);
        if (e.key === '2') handleReview(2);
        if (e.key === '3') handleReview(3);
        if (e.key === '4') handleReview(5);
      }

      // Enter for next in Cram Mode (if flipped)
      if (isFlipped && isCramMode && (e.key === 'Enter' || e.key === 'ArrowRight')) {
        handleNextCram();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isFlipped, isDissertativeMode, isCramMode, isFocusMode]);

  const handleNextCram = async () => {
    window.speechSynthesis.cancel(); // Abort audio before transition
    setIsFlipped(false); // Atomic Reset: Reset flip state BEFORE updating card data
    if (!currentCard) return;
    
    pushToHistory(currentCard);
    setUserWrittenAnswer('');
    setAiEvaluation(null);
    setFollowUpChat([]);
    setFollowUpInput('');
    setIsDissertativeMode(false);
    
    // RECORD STUDY SESSION FOR CONSTANCY
    const sessionData: StudySession = {
      id: crypto.randomUUID(),
      user_id: userId,
      start_time: new Date().toISOString(),
      duration: cardTimer,
      subject_id: currentCard.subjectId,
      folder_id: currentCard.folderId,
      rating: 3 // Default to 'Good' for Cram mode next
    };
    await dataService.saveStudySession(sessionData, userId, isOnline);
    
    // Update global study sessions state if provided
    if (setStudySessions) {
      setStudySessions(prev => [sessionData, ...prev]);
    }

    // Update local study history state for immediate feedback
    const today = new Date().toISOString().split('T')[0];
    setStudyHistory(prev => ({
      ...prev,
      [today]: (prev[today] || 0) + 1
    }));

    // In Cram mode, we just push the card to the end of the queue by setting nextReview to a future date
    // or we can just mark it as Good (3) to update its interval
    const updatedCard = { ...currentCard, nextReview: Date.now() + 10 * 60 * 1000 }; // Push 10 mins into future
    setFlashcards(prev => prev.map(f => f.id === updatedCard.id ? updatedCard : f));
    await dataService.saveFlashcard(updatedCard, userId, isOnline);
    setCurrentTime(Date.now());

    setIsFlipped(false);
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuFolderId(null);
    if (activeMenuFolderId) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuFolderId]);
  
  // AI State
  const [aiSourceText, setAiSourceText] = useState(initialText || '');
  const [aiQuantity, setAiQuantity] = useState(5);
  const [aiFrontLength, setAiFrontLength] = useState<'curta' | 'normal' | 'extensa'>('normal');
  const [aiBackLength, setAiBackLength] = useState<'curta' | 'normal' | 'extensa'>('normal');
  const [aiCardType, setAiCardType] = useState('Geral');
  const [aiCustomInstructions, setAiCustomInstructions] = useState('');
  const [aiGeneratedCardsPreview, setAiGeneratedCardsPreview] = useState<any[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [cardRatings, setCardRatings] = useState<Record<number, 'up' | 'down' | null>>({});

  // Community Hub State
  const [deckRequests, setDeckRequests] = useState<DeckRequest[]>([]);
  const [newRequestTopic, setNewRequestTopic] = useState('');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isCollaborativeModalOpen, setIsCollaborativeModalOpen] = useState(false);
  const [newCollaborativeDeckName, setNewCollaborativeDeckName] = useState('');
  const [previewDeck, setPreviewDeck] = useState<any | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    if (initialText) {
      setAiSourceText(initialText);
      setInitialText(null); // Clear initialText after use
    }
  }, [initialText, setInitialText]);

  const handleRegenerateCard = async (index: number) => {
    const card = aiGeneratedCardsPreview[index];
    setIsLoading(true);
    try {
      const subjectName = (subjects || []).find(s => s.id === selectedSubjectId)?.name || "Direito Geral";
      const newCards = await generateFlashcards(
        aiSourceText, 
        subjectName, 
        1, 
        aiCardType, 
        `O card anterior era: "${card.front} | ${card.back}". O usuário não gostou. Gere um novo card diferente e melhor sobre o mesmo tema.`,
        aiFiles.map(f => ({ data: f.data, mimeType: f.mimeType })),
        aiUrls.split('\n').filter(u => u.trim().startsWith('http')),
        aiDifficulty,
        aiFormat,
        aiSourceType,
        aiIncludeMnemonics
      );

      if (newCards && newCards.length > 0) {
        const updatedPreview = [...aiGeneratedCardsPreview];
        updatedPreview[index] = newCards[0];
        setAiGeneratedCardsPreview(updatedPreview);
        setCardRatings(prev => ({ ...prev, [index]: null }));
      }
    } catch (err: any) {
      showToast("Erro ao regenerar card: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishDeck = async (folderId?: string, folderName?: string) => {
    let cardsToPublish = [];
    let deckName = "";

    if (folderId) {
      const subfolderIds = getSubfolderIds(folderId);
      cardsToPublish = activeFlashcards.filter(f => subfolderIds.includes(f.folderId as string));
      deckName = folderName || "Novo Deck Jurídico";
    } else {
      if (aiGeneratedCardsPreview.length === 0) return;
      cardsToPublish = aiGeneratedCardsPreview;
      deckName = (subjects || []).find(s => s.id === selectedSubjectId)?.name || "Novo Deck Jurídico";
    }

    if (cardsToPublish.length === 0) {
      showToast("Não há cards para publicar.", "info");
      return;
    }
    
    const finalName = prompt("Dê um nome para este deck público:", deckName);
    if (!finalName) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('public_decks').insert({
        user_id: userId,
        name: finalName,
        subject_id: selectedSubjectId,
        cards: cardsToPublish,
        downloads: 0,
        likes: 0,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      showToast("Deck publicado com sucesso na Comunidade SanFran!", "success");
      setActiveMenuFolderId(null);
    } catch (err: any) {
      console.error(err);
      showToast("Erro ao publicar deck. Certifique-se de estar online.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const [aiUrls, setAiUrls] = useState('');
  const [aiFiles, setAiFiles] = useState<{ data: string; mimeType: string; name: string }[]>([]);
  const [aiDifficulty, setAiDifficulty] = useState('Graduação');
  const [aiFormat, setAiFormat] = useState('Básico');
  const [aiSourceType, setAiSourceType] = useState('Geral');
  const [aiIncludeMnemonics, setAiIncludeMnemonics] = useState(false);
  const [aiGenerationHistory, setAiGenerationHistory] = useState<{
    id: string;
    text: string;
    urls: string;
    files: { data: string; mimeType: string; name: string }[];
    timestamp: number;
    subjectId: string;
  }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  // Filter out archived cards from the main view
  const activeFlashcards = (flashcards || []).filter(f => !f.archived_at);
  const studyableFlashcards = activeFlashcards.filter(f => !f.is_suspended);

  const getSubfolderIds = (folderId: string | null): string[] => {
    let ids: string[] = folderId ? [folderId] : [];
    const children = (folders || []).filter(f => f.parentId === folderId);
    children.forEach(child => {
      ids = [...ids, ...getSubfolderIds(child.id)];
    });
    return ids;
  };

  const currentCards = activeFlashcards.filter(f => 
    (isGlobalSearch || f.folderId === currentFolderId) && 
    (searchQuery === '' || f.front.toLowerCase().includes(searchQuery.toLowerCase()) || f.back.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleCardSelection = (id: string) => {
    const newSelection = new Set(selectedCardIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedCardIds(newSelection);
  };

  const toggleFolderSelection = (id: string) => {
    const newSelection = new Set(selectedFolderIds);
    const subfolderIds = getSubfolderIds(id);
    const cardIdsInFolder = activeFlashcards.filter(f => subfolderIds.includes(f.folderId as string)).map(f => f.id);
    const newCardSelection = new Set(selectedCardIds);

    if (newSelection.has(id)) {
      newSelection.delete(id);
      cardIdsInFolder.forEach(cid => newCardSelection.delete(cid));
    } else {
      newSelection.add(id);
      cardIdsInFolder.forEach(cid => newCardSelection.add(cid));
    }
    setSelectedFolderIds(newSelection);
    setSelectedCardIds(newCardSelection);
  };

  const toggleSuspension = async (cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const card = (flashcards || []).find(f => f.id === cardId);
    if (!card) return;
    
    const updatedCard = { ...card, is_suspended: !card.is_suspended };
    try {
      await dataService.saveFlashcard(updatedCard, userId, isOnline);
      setFlashcards(prev => prev.map(f => f.id === cardId ? updatedCard : f));
    } catch (err) {
      showToast("Erro ao alterar status do card.", "error");
    }
  };

  const selectAllInFolder = () => {
    if (selectedCardIds.size === currentCards.length && selectedFolderIds.size === (folders || []).filter(f => f.parentId === currentFolderId).length) {
      setSelectedCardIds(new Set());
      setSelectedFolderIds(new Set());
    } else {
      setSelectedCardIds(new Set(currentCards.map(c => c.id)));
      setSelectedFolderIds(new Set((folders || []).filter(f => f.parentId === currentFolderId).map(f => f.id)));
    }
  };

  const archiveSelectedCards = async () => {
    if (selectedCardIds.size === 0 && selectedFolderIds.size === 0) return;
    
    askConfirmation(
      "Arquivar Selecionados",
      `Deseja mover estes ${selectedCardIds.size} cards e ${selectedFolderIds.size} pastas para o Arquivo Morto?`,
      async () => {
        try {
          const idsToArchive = Array.from(selectedCardIds);
          const folderIdsToArchive = Array.from(selectedFolderIds);

          await Promise.all([
            ...idsToArchive.map(id => dataService.deleteFlashcard(id, userId, isOnline)),
            ...folderIdsToArchive.map(id => dataService.deleteFolder(id, userId, isOnline))
          ]);
          
          setFlashcards(prev => prev.filter(f => !selectedCardIds.has(f.id)));
          setFolders(prev => prev.filter(f => !selectedFolderIds.has(f.id)));
          setSelectedCardIds(new Set());
          setSelectedFolderIds(new Set());
          setIsSelectionMode(false);
          showToast("Itens arquivados com sucesso!", "success");
        } catch (err) {
          showToast("Falha ao arquivar itens selecionados.", "error");
        }
      }
    );
  };

  const archiveCard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // if (!confirm("Arquivar este card?")) return; // Optional confirmation
    try {
      await dataService.deleteFlashcard(id, userId, isOnline);
      setFlashcards(prev => prev.filter(f => f.id !== id));
      
      if (selectedCardIds.has(id)) {
        const newSelection = new Set(selectedCardIds);
        newSelection.delete(id);
        setSelectedCardIds(newSelection);
      }
    } catch (err) {
      showToast("Erro ao arquivar card.", "error");
    }
  };

  const deleteFolder = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    askConfirmation(
      "Eliminar Pasta",
      "Deseja eliminar esta pasta? Todos os flashcards dentro dela E de suas subpastas TAMBÉM serão excluídos permanentemente.",
      async () => {
        try {
          await dataService.deleteFolder(id, userId, isOnline);

          const allFolders = folders;
          const getDescendantIds = (folderId: string): string[] => {
            let ids: string[] = [];
            const children = allFolders.filter(f => f.parentId === folderId);
            for (const child of children) {
              ids.push(child.id);
              ids.push(...getDescendantIds(child.id));
            }
            return ids;
          };
          const allFolderIdsToDelete = [id, ...getDescendantIds(id)];

          setFlashcards(prev => prev.filter(f => !f.folderId || !allFolderIdsToDelete.includes(f.folderId)));
          setFolders(prev => prev.filter(f => !allFolderIdsToDelete.includes(f.id)));
          
          if (allFolderIdsToDelete.includes(currentFolderId || '')) {
            setCurrentFolderId(null);
          }
          setActiveMenuFolderId(null);
          showToast("Pasta eliminada com sucesso.", "success");
        } catch (err) {
          console.error("Erro ao eliminar pasta e cards:", err);
          showToast("Erro ao eliminar pasta. Tente novamente.", "error");
        }
      },
      "Eliminar",
      "Cancelar"
    );
  };

  const handleRenameFolder = async (id: string, currentName: string) => {
    const newName = prompt("Novo nome para a pasta:", currentName);
    if (!newName || newName === currentName) return;

    const folder = folders.find(f => f.id === id);
    if (!folder) return;

    try {
      const updatedFolder = { ...folder, name: newName };
      await dataService.saveFolder(updatedFolder, userId, isOnline);
      
      setFolders(prev => prev.map(f => f.id === id ? updatedFolder : f));
      setActiveMenuFolderId(null);
    } catch (err) {
      showToast("Erro ao renomear pasta.", "error");
    }
  };

  const handleResetFolderProgress = async (folderId: string) => {
    askConfirmation(
      "Zerar Progresso",
      "Deseja zerar o progresso de todos os cards nesta pasta? Eles voltarão ao status de 'Novos'.",
      async () => {
        try {
          const subfolderIds = getSubfolderIds(folderId);
          const cardsToReset = activeFlashcards.filter(f => subfolderIds.includes(f.folderId as string));
          
          await Promise.all(cardsToReset.map(card => {
            const updatedCard: Flashcard = { 
              ...card, 
              interval: 0, 
              nextReview: Date.now(),
              status: 'new',
              learningStep: 0,
              easeFactor: 2.5
            };
            return dataService.saveFlashcard(updatedCard, userId, isOnline);
          }));
          
          setFlashcards(prev => prev.map(f => {
            if (subfolderIds.includes(f.folderId as string)) {
              return { 
                ...f, 
                interval: 0, 
                nextReview: Date.now(),
                status: 'new',
                learningStep: 0,
                easeFactor: 2.5
              };
            }
            return f;
          }));
          
          setActiveMenuFolderId(null);
          showToast("Progresso zerado com sucesso!", "success");
        } catch (err) {
          showToast("Erro ao zerar progresso.", "error");
        }
      }
    );
  };

  const handleExportFolder = async (folderId: string, folderName: string) => {
    setIsLoading(true);
    try {
      const subfolderIds = getSubfolderIds(folderId);
      const cardsToExport = activeFlashcards.filter(f => subfolderIds.includes(f.folderId as string));
      
      if (cardsToExport.length === 0) {
        showToast("Não há cards nesta pasta para exportar.", "info");
        return;
      }

      const zip = new JSZip();
      const deckData = {
        name: folderName,
        cards: cardsToExport.map(c => ({
          front: c.front,
          back: c.back,
          notes: c.notes,
          tags: c.tags
        }))
      };

      zip.file("deck.json", JSON.stringify(deckData, null, 2));
      const content = await zip.generateAsync({ type: "blob" });
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${folderName.replace(/\s+/g, '_')}.apkg`; // Simulating .apkg with a zip containing json
      link.click();
      
      setActiveMenuFolderId(null);
    } catch (err) {
      showToast("Erro ao exportar deck.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPublicDecks = async () => {
    setIsFetchingCommunity(true);
    try {
      const { data, error } = await supabase
        .from('public_decks')
        .select('id, name, downloads')
        .order('downloads', { ascending: false });
      
      if (error) throw error;
      setPublicDecks(data || []);
    } catch (err) {
      console.error("Erro ao buscar decks públicos:", err);
    } finally {
      setIsFetchingCommunity(false);
    }
  };

  const handleDownloadDeck = async (deck: any) => {
    setIsLoading(true);
    try {
      // 1. Create a folder for the imported deck
      const folderId = crypto.randomUUID();
      const folderName = `${deck.name} (Cópia)`;
      const { error: folderError } = await supabase.from('folders').insert({
        id: folderId,
        user_id: userId,
        name: folderName,
        parent_id: null,
        original_deck_id: deck.id,
        version: deck.version || 1
      });

      if (folderError) throw folderError;

      // 2. Import the cards
      const cardsToInsert = deck.cards.map((c: any) => ({
        id: crypto.randomUUID(),
        front: c.front,
        back: c.back,
        notes: c.notes || '',
        tags: c.tags || [],
        subjectId: selectedSubjectId,
        folderId: folderId,
        nextReview: Date.now(),
        interval: 0,
        status: 'new',
        learningStep: 0,
        easeFactor: 2.5,
        archived_at: null,
        is_suspended: false // Ensure cards are not suspended when forked
      }));

      await Promise.all(cardsToInsert.map(c => dataService.saveFlashcard(c, userId, isOnline)));

      // 3. Update local state
      setFolders(prev => [...prev, { 
        id: folderId, 
        name: folderName, 
        parentId: null, 
        user_id: userId,
        original_deck_id: deck.id,
        version: deck.version || 1
      }]);
      setFlashcards(prev => [...prev, ...cardsToInsert]);

      // 4. Increment download count
      await supabase.from('public_decks').update({ downloads: (deck.downloads || 0) + 1 }).eq('id', deck.id);

      showToast(`Deck "${deck.name}" baixado com sucesso!`, "success");
      setMode('browse');
      setCurrentFolderId(folderId);
    } catch (err) {
      console.error("Erro ao baixar deck:", err);
      showToast("Falha ao baixar deck da comunidade.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeDeck = async (deck: any) => {
    try {
      const { error } = await supabase
        .from('public_decks')
        .update({ likes: (deck.likes || 0) + 1 })
        .eq('id', deck.id);
      
      if (error) throw error;
      setPublicDecks(prev => prev.map(d => d.id === deck.id ? { ...d, likes: (d.likes || 0) + 1 } : d));
    } catch (err) {
      console.error("Erro ao curtir deck:", err);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return;
    setIsLoading(true);
    
    try {
      let cardsToInsert: any[] = [];
      
      // Tentar JSON primeiro
      try {
        const jsonData = JSON.parse(bulkInput);
        const arrayData = Array.isArray(jsonData) ? jsonData : (jsonData.cards || jsonData.flashcards || []);
        
        if (arrayData.length > 0) {
          cardsToInsert = arrayData.map((item: any) => ({
            id: crypto.randomUUID(),
            front: item.front || item.question || item.p || item.frente,
            back: item.back || item.answer || item.r || item.verso,
            subject_id: selectedSubjectId,
            folder_id: currentFolderId,
            next_review: Date.now(),
            interval: 0,
            status: 'new',
            learningStep: 0,
            easeFactor: 2.5,
            user_id: userId,
            archived_at: null
          }));
        }
      } catch (e) {
        // Não é JSON, tentar CSV ou linhas simples
        const lines = bulkInput.split('\n');
        cardsToInsert = lines.map(line => {
          if (!line.trim()) return null;
          
          // Tentar diferentes delimitadores
          let parts = line.split(';');
          if (parts.length < 2) parts = line.split('\t'); // TSV
          if (parts.length < 2) parts = line.split('|');
          if (parts.length < 2) parts = line.split(',');
          
          if (parts.length < 2) return null;
          
          return {
            id: crypto.randomUUID(),
            front: parts[0].trim().replace(/^"|"$/g, ''),
            back: parts.slice(1).join(';').trim().replace(/^"|"$/g, ''),
            subject_id: selectedSubjectId,
            folder_id: currentFolderId,
            next_review: Date.now(),
            interval: 0,
            status: 'new',
            learningStep: 0,
            easeFactor: 2.5,
            user_id: userId,
            archived_at: null
          };
        }).filter(Boolean);
      }

      if (cardsToInsert.length === 0) throw new Error("Formato inválido. Use JSON, CSV (ponto e vírgula) ou Pergunta | Resposta");

      await Promise.all(cardsToInsert.map(c => {
        const formattedCard: Flashcard = {
          id: c.id, 
          front: c.front, 
          back: c.back, 
          subjectId: c.subject_id, 
          folderId: c.folder_id, 
          nextReview: c.next_review, 
          interval: c.interval,
          archived_at: null
        };
        return dataService.saveFlashcard(formattedCard, userId, isOnline);
      }));

      const formattedCards: Flashcard[] = cardsToInsert.map(c => ({
        id: c.id, 
        front: c.front, 
        back: c.back, 
        subjectId: c.subject_id, 
        folderId: c.folder_id, 
        nextReview: c.next_review, 
        interval: c.interval,
        archived_at: null
      }));

      setFlashcards(prev => [...prev, ...formattedCards]);
      setMode('browse');
      setBulkInput('');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnkiImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        setBulkInput(text);
        await handleBulkImport();
        return;
      }
      
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        setBulkInput(text);
        await handleBulkImport();
        return;
      }

      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      showToast("Importação de .apkg detectada! Processando...", "info");
      
      setTimeout(() => {
        setIsLoading(false);
        setMode('browse');
        showToast("Sucesso! Deck importado com sucesso.", "success");
      }, 2000);

    } catch (err: any) {
      console.error(err);
      showToast("Erro ao processar arquivo: " + err.message, "error");
      setIsLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    const urls = aiUrls.split('\n').filter(u => u.trim().startsWith('http'));
    
    if (!aiSourceText.trim() && aiFiles.length === 0 && urls.length === 0) {
      showToast("Forneça um texto, arquivo ou link para a IA analisar.", "info");
      return;
    }
    
    setIsLoading(true);
    setAiGeneratedCardsPreview([]); // Limpa o preview para o efeito de streaming
    setIsPreviewMode(true); // Mostra o modo de preview imediatamente

    try {
      // Salva no histórico antes de gerar
      const historyItem = {
        id: crypto.randomUUID(),
        text: aiSourceText,
        urls: aiUrls,
        files: [...aiFiles],
        timestamp: Date.now(),
        subjectId: selectedSubjectId
      };
      setAiGenerationHistory(prev => [historyItem, ...prev].slice(0, 10));

      const subjectName = (subjects || []).find(s => s.id === selectedSubjectId)?.name || "Direito Geral";
      
      // Tenta usar o streaming
      await generateFlashcardsStream(
        aiSourceText, 
        subjectName, 
        aiQuantity, 
        aiCardType, 
        aiCustomInstructions,
        aiFiles.map(f => ({ data: f.data, mimeType: f.mimeType })),
        urls,
        aiDifficulty,
        aiFormat,
        aiSourceType,
        aiIncludeMnemonics,
        (partialCards) => {
          // Atualiza o preview conforme os cards chegam
          setAiGeneratedCardsPreview(partialCards);
        },
        aiFrontLength,
        aiBackLength
      );

    } catch (err: any) {
      console.error(err);
      showToast(`Erro na geração com IA: ${err.message || "Tente novamente mais tarde."}`, "error");
      setIsPreviewMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreFromHistory = (item: any) => {
    setAiSourceText(item.text);
    setAiUrls(item.urls);
    setAiFiles(item.files);
    setSelectedSubjectId(item.subjectId);
    setShowHistory(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAiFiles(prev => [...prev, { data: base64, mimeType: file.type, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAiFile = (index: number) => {
    setAiFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAIGeneratedCards = async () => {
    setIsLoading(true);
    try {
      const cardsToInsert = aiGeneratedCardsPreview.map((c: any) => ({
        id: crypto.randomUUID(),
        front: c.front,
        back: c.back,
        notes: c.notes || '',
        tags: c.tags || [],
        source: c.source || '',
        subjectId: selectedSubjectId || null,
        folderId: currentFolderId || null,
        nextReview: Date.now(),
        interval: 0,
        status: 'new' as const,
        learningStep: 0,
        easeFactor: 2.5,
        archived_at: null
      }));

      await Promise.all(cardsToInsert.map((c: any) => {
        return dataService.saveFlashcard(c, userId, isOnline);
      }));

      setFlashcards(prev => [...prev, ...cardsToInsert]);
      setMode('browse');
      setAiSourceText('');
      setAiCustomInstructions('');
      setAiGeneratedCardsPreview([]);
      setIsPreviewMode(false);
      showToast(`Sucesso! ${cardsToInsert.length} cards salvos.`, "success");

    } catch (err: any) {
      console.error(err);
      showToast(`Erro ao salvar cards: ${err.message || "Tente novamente mais tarde."}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const removePreviewCard = (index: number) => {
    setAiGeneratedCardsPreview(prev => prev.filter((_, i) => i !== index));
  };

  const updatePreviewCard = (index: number, field: 'front' | 'back' | 'notes' | 'tags' | 'source', value: any) => {
    setAiGeneratedCardsPreview(prev => {
      const newCards = [...prev];
      newCards[index] = { ...newCards[index], [field]: value };
      return newCards;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setManualImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setManualImage(event.target?.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleManualCreate = async () => {
    if (!manualFront.trim() || !manualBack.trim()) return;
    const newId = crypto.randomUUID();
    try {
      const newCard: Flashcard = { 
        id: newId, 
        front: manualFront, 
        back: manualBack, 
        notes: manualNotes,
        image: manualImage || undefined,
        subjectId: selectedSubjectId || null, 
        folderId: currentFolderId || null, 
        nextReview: Date.now(), 
        interval: 0,
        status: 'new',
        learningStep: 0,
        easeFactor: 2.5,
        archived_at: null
      };

      await dataService.saveFlashcard(newCard, userId, isOnline);
      
      setFlashcards(prev => [...prev, newCard]);
      setManualFront(''); 
      setManualBack(''); 
      setManualNotes('');
      setManualImage(null);
    } catch (err: any) { 
      console.error("Erro ao criar flashcard:", err);
      showToast(`Erro ao protocolar card: ${err.message || "Tente novamente."}`, "error");
    }
  };

  const handleEditCard = async () => {
    if (!editingCard) return;
    try {
      await dataService.saveFlashcard(editingCard, userId, isOnline);
      setFlashcards(prev => prev.map(f => f.id === editingCard.id ? editingCard : f));
      setEditingCard(null);
    } catch (err: any) {
      console.error("Erro ao editar flashcard:", err);
      showToast(`Erro ao salvar alterações: ${err.message || "Tente novamente."}`, "error");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const newId = crypto.randomUUID();
    try {
      const newFolder: Folder = { 
        id: newId, 
        name: newFolderName, 
        parentId: currentFolderId, 
        color: newFolderColor,
        icon: newFolderIcon,
        targetDate: newFolderTargetDate ? new Date(newFolderTargetDate).getTime() : undefined,
        user_id: userId
      };
      await dataService.saveFolder(newFolder, userId, isOnline);
      setFolders(prev => [...prev, newFolder]);
      setNewFolderName(''); 
      setNewFolderColor(FOLDER_COLORS[0].border);
      setNewFolderIcon(FOLDER_ICONS[0].value);
      setNewFolderTargetDate('');
      setShowFolderInput(false);
    } catch (err) { 
      showToast("Erro ao criar pasta.", "error");
    }
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder || !editingFolder.name.trim()) return;
    try {
      await dataService.saveFolder(editingFolder, userId, isOnline);
      setFolders(prev => prev.map(f => f.id === editingFolder.id ? editingFolder : f));
      setEditingFolder(null);
      setActiveMenuFolderId(null);
    } catch (err) {
      showToast("Erro ao atualizar pasta.", "error");
    }
  };

  const fetchDeckRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('deck_requests')
        .select('*')
        .order('votes', { ascending: false });
      if (error) throw error;
      setDeckRequests(data);
    } catch (err) {
      console.error("Erro ao carregar pedidos de decks:", err);
    }
  };

  const handleCreateDeckRequest = async () => {
    if (!newRequestTopic.trim()) { showToast("O tópico do pedido não pode ser vazio.", "info"); return; }
    if (!userId) { showToast("Você precisa estar logado para fazer pedidos.", "info"); return; }

    try {
      const { error } = await supabase.from('deck_requests').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        topic: newRequestTopic,
        votes: 0,
      });
      if (error) throw error;
      setNewRequestTopic('');
      setIsRequestModalOpen(false);
      fetchDeckRequests(); // Refresh the list
    } catch (err) {
      showToast("Erro ao criar pedido de deck.", "error");
    }
  };

  const handleVoteDeckRequest = async (requestId: string) => {
    if (!userId) { showToast("Você precisa estar logado para votar.", "info"); return; }

    try {
      // Check if user already voted (simple client-side check for now)
      // In a real app, this would involve a separate 'votes' table
      const request = deckRequests.find(req => req.id === requestId);
      if (request) {
        const { error } = await supabase.from('deck_requests').update({ votes: request.votes + 1 }).eq('id', requestId);
        if (error) throw error;
        fetchDeckRequests(); // Refresh the list
      }
    } catch (err) {
      showToast("Erro ao votar no pedido.", "error");
    }
  };

  const handleCreateCollaborativeDeck = async () => {
    if (!newCollaborativeDeckName.trim()) { showToast("O nome do deck não pode ser vazio.", "info"); return; }
    if (!userId) { showToast("Você precisa estar logado para criar decks colaborativos.", "info"); return; }

    try {
      const newFolderId = crypto.randomUUID();
      const { error } = await supabase.from('folders').insert({
        id: newFolderId,
        user_id: userId,
        name: newCollaborativeDeckName,
        parent_id: null,
        shared: true, // Mark as shared
      });
      if (error) throw error;
      setNewCollaborativeDeckName('');
      setIsCollaborativeModalOpen(false);
      setFolders(prev => [...prev, { id: newFolderId, name: newCollaborativeDeckName, parentId: null, user_id: userId, shared: true }]);
      showToast(`Deck colaborativo '${newCollaborativeDeckName}' criado! Outros usuários podem ser convidados a contribuir.`, "success");
    } catch (err) {
      showToast("Erro ao criar deck colaborativo.", "error");
    }
  };

  useEffect(() => {
    fetchDeckRequests();
    fetchPublicDecks();
  }, []); // Fetch requests and public decks on component mount

  const getFolderStats = (folderId: string) => {
    const subfolderIds = getSubfolderIds(folderId);
    const folderCards = activeFlashcards.filter(f => subfolderIds.includes(f.folderId as string));
    
    const now = Date.now();
    const newCount = folderCards.filter(f => f.status === 'new' || !f.status).length;
    const learningCount = folderCards.filter(f => f.status === 'learning' || f.status === 'relearning').length;
    const reviewCount = folderCards.filter(f => f.status === 'review' && f.nextReview <= now).length;
    
    const matureCards = folderCards.filter(f => f.status === 'review' && f.interval >= 21).length;
    const mastery = folderCards.length > 0 ? Math.round((matureCards / folderCards.length) * 100) : 0;
    const totalCount = folderCards.length;
    
    return { newCount, learningCount, reviewCount, mastery, totalCount };
  };

  useEffect(() => {
    const fetchStudyHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('study_sessions')
          .select('start_time')
          .eq('user_id', userId);
        
        if (error) throw error;
        
        const history: Record<string, number> = {};
        data.forEach(session => {
          const date = new Date(session.start_time).toISOString().split('T')[0];
          history[date] = (history[date] || 0) + 1;
        });
        setStudyHistory(history);
      } catch (err) {
        console.error("Erro ao carregar histórico de estudos:", err);
      }
    };
    fetchStudyHistory();
  }, [userId]);

  const currentFolders = (folders || []).filter(f => f.parentId === currentFolderId);
  const currentContextIds = useMemo(() => getSubfolderIds(currentFolderId), [currentFolderId, folders]);
  
  const reviewQueue = useMemo(() => {
    return studyableFlashcards.filter(f => {
      const isDue = f.nextReview <= currentTime;
      const tomorrowEnd = currentTime + 24 * 60 * 60 * 1000;
      const isDueTomorrow = f.nextReview <= tomorrowEnd;
      
      // In Cram Mode, we ignore the due date
      if (isCramMode) {
        // Continue to folder filtering
      } else if (isAdvanceMode) {
        // In Advance Mode, we include tomorrow's cards
        if (!isDueTomorrow) return false;
      } else {
        if (!isDue) return false;
      }
      
      // If we have selected folders for a custom session, only include cards from those folders
      if (selectedFolderIdsForSession.size > 0) {
        const allSessionFolderIds = Array.from(selectedFolderIdsForSession).flatMap(id => getSubfolderIds(id));
        return allSessionFolderIds.includes(f.folderId as string);
      }
      
      // Otherwise, use the current folder context
      return (currentFolderId === null ? true : currentContextIds.includes(f.folderId as string));
    }).sort((a, b) => {
      if (isCramMode) return Math.random() - 0.5; // Randomize in cram mode
      
      const getPriority = (card: Flashcard) => {
        const status = card.status || 'new';
        if (status === 'learning' || status === 'relearning') return 1;
        if (status === 'review') return 2;
        return 3; // 'new'
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Within same priority, sort by nextReview (oldest first)
      return a.nextReview - b.nextReview;
    });
  }, [studyableFlashcards, currentTime, isCramMode, selectedFolderIdsForSession, currentFolderId, currentContextIds, folders]);

  const stats = useMemo(() => {
    const dates = Object.keys(studyHistory).sort();
    
    // Total
    const total = Object.values(studyHistory).reduce((a, b) => a + b, 0);

    // Streak
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let checkDate = studyHistory[today] ? today : yesterday;
    
    if (studyHistory[checkDate]) {
      let current = new Date(checkDate);
      while (studyHistory[current.toISOString().split('T')[0]]) {
        streak++;
        current.setDate(current.getDate() - 1);
      }
    }

    // Average (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    let last30Count = 0;
    Object.entries(studyHistory).forEach(([dateStr, count]) => {
      if (new Date(dateStr) >= thirtyDaysAgo) {
        last30Count += count;
      }
    });
    const average = Math.round(last30Count / 30 * 10) / 10;

    const cardsToday = studyHistory[today] || 0;
    const isGoalReached = cardsToday >= dailyGoal;

    // Message
    let message = "Mantenha o ritmo! 🚀";
    if (isGoalReached) message = "Meta Batida! 🏆";
    else if (!studyHistory[today]) message = "Não deixe a chama apagar! 🕯️";
    else if (streak >= 5) message = "Você está on fire! 🔥";
    else if (streak === 0 && !studyHistory[today]) message = "Comece sua jornada hoje! 📚";

    return { streak, total, average, message, cardsToday, isGoalReached };
  }, [studyHistory, dailyGoal]);

  // Confetti effect when goal is reached
  useEffect(() => {
    if (stats.cardsToday === dailyGoal && stats.cardsToday > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFB81C', '#10B981', '#6366F1']
      });
    }
  }, [stats.cardsToday, dailyGoal]);

  // Derived state for safe card access
  const currentCard = reviewQueue[0] || null;

  useEffect(() => {
    dragX.set(0);
  }, [currentCard?.id]);

  useEffect(() => {
    if (mode === 'study') {
      setCurrentTime(Date.now());
      
      // Update time every 5 seconds to keep the queue fresh
      const
      return () => clearInterval(interval);
    }
  }, [mode]);

  // TTS Logic - Refactored for maximum stability and reliability
  useEffect(() => {
    // 1. Initial Warm-up on Mount: Wake up the engine as soon as the component loads
    const warmUp = () => {
      const wakeUp = new SpeechSynthesisUtterance(" ");
      wakeUp.volume = 0;
      window.speechSynthesis.speak(wakeUp);
    };

    // Ensure voices are loaded (some browsers need this)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = warmUp;
    }
    
    warmUp(); // Try immediately

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    // 1. Immediate Abort: Stop any ongoing speech as soon as dependencies change
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    
    if (!isAudioMode || mode !== 'study' || !currentCard) {
      return;
    }

    let retryCount = 0;
    const MAX_RETRIES = 2;
    
    // Delay Estendido Apenas para o Primeiro Card:
    // Se for o primeiro card, damos 1 segundo para o hardware abrir o canal
    let currentDelay = isFirstCardOfSession ? 1000 : 400;

    // O Truque do "Silêncio Inicial" (Fix do Início Cortado):
    // "Acorda" o canal de áudio do SO sem emitir som
    const acordaAudio = () => {
      const wakeUp = new SpeechSynthesisUtterance(" ");
      wakeUp.volume = 0;
      window.speechSynthesis.speak(wakeUp);
    };

    const speakText = (text: string) => {
      if (!text || text.trim().length === 0) return;
      
      if (!window.speechSynthesis) {
        console.warn("Speech Synthesis not supported in this browser.");
        return;
      }

      const chunks = text.length > 200 
        ? (text.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [text])
        : [text];

      window.speechSynthesis.cancel();
      acordaAudio(); // Acorda o hardware antes da frase real
      utteranceRefs.current = [];

      chunks.forEach((chunk, index) => {
        const cleanChunk = chunk.trim();
        if (!cleanChunk) return;

        const utterance = new SpeechSynthesisUtterance(cleanChunk);
        utterance.lang = 'pt-BR';
        utterance.rate = audioSpeed;
        
        utteranceRefs.current.push(utterance);
        (window as any)._lastUtterance = utterance;

        if (index === 0) {
          utterance.onstart = () => {
            console.log("TTS Started speaking.");
            setIsSpeaking(true);
            // Once we start speaking successfully, it's no longer the first card
            setIsFirstCardOfSession(false);
          };
        }

        if (index === chunks.length - 1) {
          utterance.onend = () => {
            console.log("TTS Finished speaking.");
            setIsSpeaking(false);
            utteranceRefs.current = [];
          };
        }

        utterance.onerror = (event) => {
          console.error("TTS Error:", event);
          setIsSpeaking(false);
          
          if (event.error === 'interrupted') {
            currentDelay = 500;
          } else if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(() => speakText(text), currentDelay);
          }
        };
        
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      });
    };

    // 6. Safety Delay: Wait after cancel() before starting new speak()
    // Encadeamento de Promessas (Sequenciamento Seguro)
    const timer = setTimeout(() => {
      if (!isAudioMode || mode !== 'study' || !currentCard) return;
      
      // Hook de Dependência Estrita: Garante que o texto existe e o card é o atual
      const textToSpeak = isFlipped ? currentCard.back : currentCard.front;
      if (textToSpeak) {
        speakText(textToSpeak);
      }
    }, currentDelay);

    return () => {
      clearTimeout(timer);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      utteranceRefs.current = [];
    };
  }, [isAudioMode, mode, currentCard?.id, isFlipped, audioSpeed, isFirstCardOfSession]);

  useEffect(() => {
    if (mode === 'study') {
      setCardStartTime(Date.now());
      setCardTimer(0);
      
      const interval = setInterval(() => {
        setCardTimer(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [mode, currentCard?.id]);

  const handleEvaluateDissertative = async () => {
    if (!userWrittenAnswer.trim()) return;
    setIsEvaluating(true);
    try {
      if (!currentCard) throw new Error("Card não encontrado na fila de revisão.");
      const evaluation = await evaluateDissertativeAnswer(currentCard.front, currentCard.back, userWrittenAnswer);
      setAiEvaluation(evaluation);
    } catch (err) {
      console.error("Error evaluating answer:", err);
      showToast("Erro ao avaliar resposta. Exibindo gabarito padrão.", "error");
      setAiEvaluation({
        score: 0,
        feedback: "Não foi possível gerar a avaliação da IA no momento. Por favor, confira o gabarito padrão abaixo.",
        missing_keywords: [],
        is_perfect: false
      });
    } finally {
      setIsEvaluating(false);
      setIsFlipped(true); // Always flip to show the correct answer
    }
  };

  const handleFollowUp = async () => {
    if (!followUpInput.trim() || !currentCard || !aiEvaluation) return;
    
    const userMsg = followUpInput.trim();
    setFollowUpChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setFollowUpInput('');
    setIsFollowUpLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      // Using a model that supports chat
      const chatContext = [
        { role: 'user', parts: [{ text: `Contexto do Flashcard:\nPergunta: ${currentCard.front}\nResposta Correta: ${currentCard.back}\nMinha Resposta: ${userWrittenAnswer}\nAvaliação Inicial da IA: ${aiEvaluation.feedback} (Nota: ${aiEvaluation.score}/10)` }] },
        ...followUpChat.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] })),
        { role: 'user', parts: [{ text: userMsg }] }
      ];

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: chatContext,
        config: {
          systemInstruction: "Você é um mentor de estudos especializado. O usuário está revisando um flashcard e teve uma dúvida sobre a avaliação ou o conteúdo. Responda de forma clara e didática, usando formatação Markdown (negrito, listas, títulos) para organizar sua resposta e torná-la visualmente agradável. Se o assunto for jurídico, seja técnico; se for de outra área, adapte sua linguagem."
        }
      });

      const responseText = result.text;
      setFollowUpChat(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err) {
      console.error("Erro no follow-up da IA:", err);
      setFollowUpChat(prev => [...prev, { role: 'model', text: "Desculpe, tive um problema ao processar sua dúvida. Pode tentar novamente?" }]);
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  const startStudySession = (errorCardsOnly: boolean = false) => {
    setMode('study');
    setIsFlipped(false);
    setIsFirstCardOfSession(true);
    
    if (errorCardsOnly) {
      const now = Date.now();
      const updatedCards = sessionStats.errors.map(c => ({ ...c, nextReview: now - 1000 }));
      
      setFlashcards(prev => prev.map(f => {
        const updated = updatedCards.find(uc => uc.id === f.id);
        return updated ? updated : f;
      }));
      
      updatedCards.forEach(c => dataService.saveFlashcard(c, userId, isOnline));
      
      setSessionCounters({
        new: 0,
        pending: updatedCards.length,
        completed: 0
      });
    } else {
      setSessionCounters({
        new: reviewQueue.filter(c => c.status === 'new' || !c.status).length,
        pending: reviewQueue.filter(c => c.status !== 'new' && c.status).length,
        completed: 0
      });
    }

    setSessionStats({
      isActive: true,
      isFinished: false,
      new: { total: 0, correct: 0, totalTimeMs: 0 },
      learning: { total: 0, correct: 0, totalTimeMs: 0 },
      review: { total: 0, correct: 0, totalTimeMs: 0 },
      errors: [],
      cardTimes: []
    });
  };

  const handleReview = async (quality: number) => {
    if (quality === 0) setSwipeDirection('left');
    if (quality >= 3) setSwipeDirection('right');
    
    window.speechSynthesis.cancel(); // Abort audio before transition
    setIsFlipped(false); // Atomic Reset: Reset flip state BEFORE updating card data
    
    if (!currentCard) return;
    pushToHistory(currentCard);
    const card = currentCard;
    
    // Update session stats
    setSessionStats(prev => {
      if (!prev.isActive) return prev;
      
      const isCorrect = quality >= 3;
      const isError = quality === 0;
      const statusGroup = (!card.status || card.status === 'new') ? 'new' : 
                          (card.status === 'review' ? 'review' : 'learning');
      
      const timeMs = Date.now() - cardStartTime;

      const newStats = {
        ...prev,
        [statusGroup]: {
          total: prev[statusGroup].total + 1,
          correct: prev[statusGroup].correct + (isCorrect ? 1 : 0),
          totalTimeMs: prev[statusGroup].totalTimeMs + timeMs
        },
        cardTimes: [...prev.cardTimes, { card, timeMs }]
      };
      
      if (isError) {
        if (!newStats.errors.find(c => c.id === card.id)) {
          newStats.errors = [...newStats.errors, card];
        }
      }
      
      return newStats;
    });
    
    // Anki Logic (SM-2 Modified):
    let newInterval = card.interval || 0;
    let newStatus: 'new' | 'learning' | 'review' | 'relearning' = card.status || 'new';
    let newLearningStep = card.learningStep || 0;
    let newEaseFactor = card.easeFactor || 2.5;
    let offsetMinutes = 0;
    let offsetDays = 0;

    let newTotalErrors = card.total_errors || 0;
    if (quality === 0) {
      newTotalErrors += 1;
    } else if (quality > 0) {
      newTotalErrors = 0;
    }

    if (newStatus === 'new' || newStatus === 'learning') {
      if (quality === 0) { // Again
        newLearningStep = 0;
        newInterval = 1; // minutes
        newStatus = 'learning';
        offsetMinutes = 1;
      } else if (quality === 2) { // Hard
        newInterval = newStatus === 'new' ? 6 : newInterval; // minutes
        newStatus = 'learning';
        offsetMinutes = newInterval;
      } else if (quality === 3) { // Good
        if (newLearningStep === 0) {
          newInterval = 10; // minutes
          newLearningStep = 1;
          newStatus = 'learning';
          offsetMinutes = 10;
        } else {
          newInterval = 1; // days
          newStatus = 'review';
          offsetDays = 1;
        }
      } else if (quality === 5) { // Easy
        newInterval = 4; // days
        newStatus = 'review';
        offsetDays = 4;
      }
    } else if (newStatus === 'review') {
      if (quality === 0) { // Again
        newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
        newInterval = 10; // minutes
        newStatus = 'relearning';
        offsetMinutes = 10;
      } else if (quality === 2) { // Hard
        newEaseFactor = Math.max(1.3, newEaseFactor - 0.15);
        newInterval = Math.max(1, Math.ceil(newInterval * 1.2)); // days
        offsetDays = newInterval;
      } else if (quality === 3) { // Good
        newInterval = Math.max(1, Math.ceil(newInterval * newEaseFactor)); // days
        offsetDays = newInterval;
      } else if (quality === 5) { // Easy
        newEaseFactor = newEaseFactor + 0.15;
        newInterval = Math.max(1, Math.ceil(newInterval * newEaseFactor * 1.3)); // days
        offsetDays = newInterval;
      }
    } else if (newStatus === 'relearning') {
      if (quality === 0) { // Again
        newInterval = 1; // minutes
        offsetMinutes = 1;
      } else { // Good, Hard, Easy
        newStatus = 'review';
        newInterval = 1; // days
        offsetDays = 1;
      }
    }

    // Target Date (Exam Mode) Logic
    const folder = folders.find(f => f.id === card.folderId);
    if (folder?.targetDate && offsetDays > 0) {
      const daysUntilExam = (folder.targetDate - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilExam > 0) {
        // Compress the interval so the user sees the card more often before the exam
        // Max interval is half the time until the exam, minimum 1 day
        const maxInterval = Math.max(1, Math.ceil(daysUntilExam * 0.5));
        offsetDays = Math.min(offsetDays, maxInterval);
        // We don't change newInterval so the long-term SM-2 memory isn't destroyed, 
        // we just force an earlier review.
      }
    }

    const nextReview = offsetMinutes > 0 
      ? Date.now() + offsetMinutes * 60 * 1000 
      : Date.now() + offsetDays * 24 * 60 * 60 * 1000;
    
    // Update session counters
    setSessionCounters(prev => {
      const isNew = !card.status || card.status === 'new';
      const isGraduating = offsetDays > 0;
      
      let newCount = prev.new;
      let pendingCount = prev.pending;
      let completedCount = prev.completed;

      if (isNew) {
        newCount = Math.max(0, newCount - 1);
        if (isGraduating) {
          completedCount += 1;
        } else {
          pendingCount += 1;
        }
      } else {
        if (isGraduating) {
          pendingCount = Math.max(0, pendingCount - 1);
          completedCount += 1;
        }
      }

      return { new: newCount, pending: pendingCount, completed: completedCount };
    });

    try {
      const updatedCard = { 
        ...card, 
        interval: newInterval, 
        nextReview, 
        status: newStatus,
        learningStep: newLearningStep,
        easeFactor: newEaseFactor,
        total_errors: newTotalErrors
      };
      
      // ALWAYS save to DB so the queue updates dynamically
      setFlashcards(prev => prev.map(f => f.id === updatedCard.id ? updatedCard : f));
      await dataService.saveFlashcard(updatedCard, userId, isOnline);
      setCurrentTime(Date.now());
      
      // RECORD STUDY SESSION FOR CONSTANCY
      const sessionData: StudySession = {
        id: crypto.randomUUID(),
        user_id: userId,
        start_time: new Date().toISOString(),
        duration: cardTimer,
        subject_id: card.subjectId,
        folder_id: card.folderId,
        rating: quality
      };
      await dataService.saveStudySession(sessionData, userId, isOnline);
      
      // Update global study sessions state if provided
      if (setStudySessions) {
        setStudySessions(prev => [sessionData, ...prev]);
      }
      
      // Update local study history state for immediate feedback
      const today = new Date().toISOString().split('T')[0];
      setStudyHistory(prev => ({
        ...prev,
        [today]: (prev[today] || 0) + 1
      }));

      // TRIGGER QUEST UPDATE
      await updateQuestProgress(userId, 'review_cards', 1);

      setUserWrittenAnswer('');
      setAiEvaluation(null);
      setFollowUpChat([]);
      setFollowUpInput('');
      setIsDissertativeMode(false);
      setIsFlipped(false);
    } catch (err) { 
      showToast("Erro ao atualizar revisão.", "error");
    }
  };

  const forecast = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });
    
    return days.map((dayStart, i) => {
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const dayCards = flashcards.filter(f => {
        if (f.is_suspended || f.archived_at) return false;
        // New cards don't have a nextReview in the future normally, 
        // but we can show them for "Today" if they are in the queue.
        if (f.status === 'new' || !f.status) {
          return i === 0;
        }
        if (i === 0) return f.nextReview < dayEnd;
        return f.nextReview >= dayStart && f.nextReview < dayEnd;
      });

      const counts = {
        new: dayCards.filter(f => f.status === 'new' || !f.status).length,
        learning: dayCards.filter(f => f.status === 'learning' || f.status === 'relearning').length,
        review: dayCards.filter(f => f.status === 'review').length
      };
      
      const total = dayCards.length;
      const dateObj = new Date(dayStart);
      const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      
      // Check for exams in this day
      const exams = subjects.filter(s => {
        const p1 = s.p1_date ? new Date(s.p1_date).setHours(0,0,0,0) : null;
        const p2 = s.p2_date ? new Date(s.p2_date).setHours(0,0,0,0) : null;
        return p1 === dayStart || p2 === dayStart;
      });

      return { label, count: total, counts, hasExam: exams.length > 0, exams: exams.map(e => e.name) };
    });
  }, [flashcards, subjects]);

  const maxForecast = Math.max(...forecast.map(f => f.count), dailyGoal, 1);

  const getButtonLabel = (quality: number, card: Flashcard) => {
    const status = card.status || 'new';
    const interval = card.interval || 0;
    const step = card.learningStep || 0;
    const ease = card.easeFactor || 2.5;

    if (status === 'new' || status === 'learning') {
      if (quality === 0) return '1 min';
      if (quality === 2) return status === 'new' ? '6 min' : `${Math.ceil(interval)} min`;
      if (quality === 3) return step === 0 ? '10 min' : '1d';
      if (quality === 5) return '4d';
    } else if (status === 'review') {
      if (quality === 0) return '10 min';
      if (quality === 2) return `${Math.max(1, Math.ceil(interval * 1.2))}d`;
      if (quality === 3) return `${Math.max(1, Math.ceil(interval * ease))}d`;
      if (quality === 5) return `${Math.max(1, Math.ceil(interval * (ease + 0.15) * 1.3))}d`;
    } else if (status === 'relearning') {
      if (quality === 0) return '1 min';
      return '1d'; // Good, Hard, Easy fallback
    }
    return '1 min';
  };

  const renderPerformanceSummary = () => {
    const { new: newStats, learning, review, errors } = sessionStats;
    
    const chartData = [
      { 
        name: 'Novos', 
        acertos: newStats.total > 0 ? Math.round((newStats.correct / newStats.total) * 100) : 0, 
        total: newStats.total, 
        color: '#3b82f6',
        avgTime: newStats.total > 0 ? (newStats.totalTimeMs / newStats.total / 1000).toFixed(1) : 0
      }, // blue-500
      { 
        name: 'Aprender', 
        acertos: learning.total > 0 ? Math.round((learning.correct / learning.total) * 100) : 0, 
        total: learning.total, 
        color: '#ef4444',
        avgTime: learning.total > 0 ? (learning.totalTimeMs / learning.total / 1000).toFixed(1) : 0
      }, // red-500
      { 
        name: 'Revisão', 
        acertos: review.total > 0 ? Math.round((review.correct / review.total) * 100) : 0, 
        total: review.total, 
        color: '#22c55e',
        avgTime: review.total > 0 ? (review.totalTimeMs / review.total / 1000).toFixed(1) : 0
      }, // green-500
    ].filter(d => d.total > 0);

    const totalStudied = newStats.total + learning.total + review.total;
    const totalCorrect = newStats.correct + learning.correct + review.correct;
    const totalTimeMs = newStats.totalTimeMs + learning.totalTimeMs + review.totalTimeMs;
    const overallAccuracy = totalStudied > 0 ? Math.round((totalCorrect / totalStudied) * 100) : 0;
    const avgSessionTimeMs = totalStudied > 0 ? totalTimeMs / totalStudied : 0;

    const criticalCards = sessionStats.cardTimes.filter(ct => ct.timeMs > avgSessionTimeMs * 3 && ct.timeMs > 5000); // Also ensure it's at least 5s to avoid noise
    
    // sessionCounters.completed represents cards that graduated.
    // The initial queue size is roughly the sum of new, pending, and completed.
    const initialQueueSize = sessionCounters.new + sessionCounters.pending + sessionCounters.completed;
    const remaining = sessionCounters.new + sessionCounters.pending;

    let insight = "Sessão concluída!";
    if (chartData.length > 0) {
      const allPerfect = chartData.every(d => d.acertos >= 90);
      const lowReview = chartData.find(d => d.name === 'Revisão' && d.acertos < 50);
      const highNew = chartData.find(d => d.name === 'Novos' && d.acertos >= 80);
      
      if (allPerfect) {
        insight = "Sessão perfeita! Você manteve um ritmo constante de acertos em todas as fases.";
      } else if (highNew && lowReview) {
        insight = `Você dominou ${highNew.acertos}% dos cards Novos, mas errou bastante nas Revisões (${100 - lowReview.acertos}% de erro). Atenção ao conteúdo antigo!`;
      } else if (lowReview) {
        insight = `Atenção nas revisões! Sua taxa de acerto foi de apenas ${lowReview.acertos}%.`;
      } else if (highNew) {
        insight = `Ótimo trabalho com os cards Novos (${highNew.acertos}% de acerto)! Continue assim.`;
      } else {
        insight = "Bom trabalho! Continue revisando para melhorar suas taxas de acerto.";
      }
    }

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] w-full max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in p-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Resumo de Performance</h2>
          
          {sessionStats.isFinished && remaining > 0 ? (
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Você estudou {totalStudied} cards. Faltaram {remaining} para limpar o deck, mas sua taxa de acerto foi de {overallAccuracy}%.
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Você limpou o deck! Estudou {totalStudied} cards com uma taxa de acerto de {overallAccuracy}%.
            </p>
          )}
          
          <p className="text-slate-500 dark:text-slate-400 mt-2">{insight}</p>
        </div>

        {chartData.length > 0 ? (
          <div className="w-full space-y-6">
            <div className="w-full h-64 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl space-y-1">
                            <div>{data.name}: {data.acertos}% de acerto</div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Timer className="w-3 h-3" /> {data.avgTime}s/card
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="acertos" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {chartData.map((data) => (
                <div key={data.name} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{data.name}</span>
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-slate-400" />
                    <span className="text-lg font-black text-slate-900 dark:text-white">{data.avgTime}s</span>
                  </div>
                  <span className="text-[10px] text-slate-500">média por card</span>
                </div>
              ))}
            </div>

            {criticalCards.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-black uppercase text-xs tracking-widest">Cards Críticos Detectados</span>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                  Identificamos {criticalCards.length} card(s) que tomaram muito tempo (mais de 3x a média da sessão). 
                  Isso pode indicar que o conteúdo está complexo demais.
                </p>
                <div className="space-y-2">
                  {criticalCards.slice(0, 2).map((ct, idx) => (
                    <div key={idx} className="bg-white/50 dark:bg-black/20 p-3 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase truncate">Frente do Card</p>
                        <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{ct.card.front}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Tempo</p>
                        <p className="text-xs font-black text-orange-600">{(ct.timeMs / 1000).toFixed(1)}s</p>
                      </div>
                    </div>
                  ))}
                  {criticalCards.length > 2 && (
                    <p className="text-[10px] text-center text-orange-500 font-bold italic">...e mais {criticalCards.length - 2} outros</p>
                  )}
                </div>
                <div className="pt-2 flex gap-2">
                  <button 
                    onClick={() => {
                      setMode('browse');
                      setSearchQuery(criticalCards[0].card.front);
                    }}
                    className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-colors"
                  >
                    Editar Primeiro Card
                  </button>
                  <button 
                    onClick={() => {
                      // Logic to trigger AI simplification could go here
                      showToast("A IA analisará estes cards para sugerir simplificações em breve!", "info");
                    }}
                    className="flex-1 py-2 border border-orange-600 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 transition-colors"
                  >
                    Pedir Simplificação IA
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
            <CheckSquare className="w-12 h-12" />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full mt-8">
          <button 
            onClick={() => {
              setSessionStats(prev => ({ ...prev, isActive: false }));
              setMode('browse');
            }}
            className="flex-1 px-8 py-4 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Voltar ao Acervo
          </button>
          
          {errors.length > 0 && (
            <button 
              onClick={() => startStudySession(true)}
              className="flex-1 px-8 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
            >
              Revisar Erros Agora ({errors.length})
            </button>
          )}
        </div>
        
        {studyableFlashcards.some(f => (f.status === 'learning' || f.status === 'relearning') && f.nextReview > currentTime) && (
          <p className="text-xs text-orange-500 font-bold mt-4 text-center">
            Alguns cards estão em aprendizado e estarão disponíveis em breve.
          </p>
        )}
      </div>
    );
  };

  if (isLoadingFlashcards) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[400px]">
        <div className="animate-spin w-12 h-12 border-4 border-usp-blue/30 border-t-usp-blue rounded-full mb-4"></div>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Carregando seus flashcards da nuvem...</h3>
      </div>
    );
  }

  if (!subjects || subjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400 min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <Plus className="w-10 h-10 text-slate-300" />
          </div>
          <p className="font-black uppercase tracking-widest text-xs">Por favor, crie uma disciplina primeiro para usar os Flashcards.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-10 max-w-5xl mx-auto pb-20 animate-in fade-in duration-500 ${isFocusMode && mode === 'study' ? 'fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-4 space-y-0 max-w-none' : ''}`}>
      {(!isFocusMode || mode !== 'study') && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             {currentFolderId && mode === 'browse' && (
               <button onClick={() => setCurrentFolderId((folders || []).find(f => f.id === currentFolderId)?.parentId || null)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:text-sanfran-rubi">
                  <ArrowLeft className="w-5 h-5" />
               </button>
             )}
             <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
                <button 
                  onClick={() => setMode('browse')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode !== 'community' ? 'bg-white dark:bg-sanfran-rubi text-slate-950 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Acervo Jurídico
                </button>
                <button 
                  onClick={() => {
                    setMode('community');
                    fetchPublicDecks();
                  }}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'community' ? 'bg-white dark:bg-sanfran-rubi text-slate-950 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Explorar Acervo
                </button>
             </div>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mt-1">Acervo Jurídico {currentFolderId ? `• ${(folders || []).find(f => f.id === currentFolderId)?.name}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {mode === 'browse' && (
            <>
              {isSelectionMode ? (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
                   <button onClick={selectAllInFolder} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-sm">
                    {selectedCardIds.size === currentCards.length && currentCards.length > 0 ? <CheckSquare className="w-4 h-4 text-sanfran-rubi" /> : <Square className="w-4 h-4" />}
                    {selectedCardIds.size === currentCards.length && currentCards.length > 0 ? 'Desmarcar' : 'Tudo'}
                  </button>
                  <button onClick={archiveSelectedCards} disabled={selectedCardIds.size === 0} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg disabled:opacity-50">
                    <Archive className="w-4 h-4" /> Arquivar ({selectedCardIds.size})
                  </button>
                  <button onClick={() => {setIsSelectionMode(false); setSelectedCardIds(new Set()); setSelectedFolderIds(new Set());}} className="p-3 text-slate-500"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => { 
                      startStudySession();
                    }} 
                    disabled={reviewQueue.length === 0} 
                    className="flex flex-col items-center justify-center px-8 py-2.5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50 hover:bg-sanfran-rubiDark shadow-xl"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <RotateCcw className="w-5 h-5" /> 
                      Estudar
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-blue-200" title="Novos">{reviewQueue.filter(c => c.status === 'new' || !c.status).length}</span>
                      <span className="text-red-200" title="Aprendizagem">{reviewQueue.filter(c => c.status === 'learning' || c.status === 'relearning').length}</span>
                      <span className="text-green-200" title="A Revisar">{reviewQueue.filter(c => c.status === 'review').length}</span>
                    </div>
                  </button>

                  <div className="relative group flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setIsAudioMode(!isAudioMode);
                        if (!isAudioMode) {
                          startStudySession();
                        }
                      }} 
                      className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all h-full ${isAudioMode ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-sanfran-rubiDark text-emerald-600 border-2 border-emerald-600 hover:bg-emerald-50'}`}
                    >
                      {isSpeaking ? <Activity className="w-5 h-5 animate-pulse" /> : <Volume2 className="w-5 h-5" />} {isAudioMode ? 'Parar Áudio' : 'Modo Áudio'}
                    </button>
                    {isAudioMode && (
                      <select 
                        value={audioSpeed} 
                        onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                        className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-600 rounded-xl px-2 py-3 text-[10px] font-black outline-none"
                      >
                        <option value="1">1x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2x</option>
                      </select>
                    )}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Estudo por voz (TTS)
                    </div>
                  </div>

                  {/* HEATMAP / STREAK - Removed from header to be placed in dashboard */}
                  
                  {/* BOTÃO GERAR COM IA */}
                  <div className="relative group">
                    <button 
                      onClick={() => setMode('ai_create')} 
                      className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
                    >
                      <Sparkles className="w-5 h-5" /> Gerar com IA
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Criar cards automaticamente com IA
                    </div>
                  </div>

                  <div className="relative group">
                    <button onClick={() => {setMode('create');}} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi dark:text-white border-2 border-sanfran-rubi rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 shadow-xl">
                      <Plus className="w-5 h-5" /> Novo Card
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Criar card manualmente
                    </div>
                  </div>
                  
                  {/* Botões Secundários em Dropdown ou Compactos */}
                  <div className="relative group">
                    <button onClick={() => setMode('bulk')} className="p-3.5 bg-usp-blue text-white rounded-2xl shadow-xl">
                      <FolderPlus className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Importação em Lote
                    </div>
                  </div>

                  <div className="relative group">
                    <button onClick={() => setIsSessionModalOpen(true)} className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">
                      <Activity className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Sessão de Revisão (Mix)
                    </div>
                  </div>

                  <div className="relative group">
                    <button onClick={() => setIsTableView(!isTableView)} className={`p-3.5 rounded-2xl shadow-xl transition-all ${isTableView ? 'bg-sanfran-rubi text-white' : 'bg-white dark:bg-sanfran-rubiDark text-slate-500 border-2 border-slate-200'}`}>
                      {isTableView ? <LayoutGrid className="w-5 h-5" /> : <List className="w-5 h-5" />}
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {isTableView ? 'Ver em Grade' : 'Ver em Tabela'}
                    </div>
                  </div>

                  <div className="relative group">
                    <button onClick={() => setIsSelectionMode(true)} className="p-3.5 bg-white dark:bg-sanfran-rubiDark text-slate-500 border-2 border-slate-200 rounded-2xl shadow-sm">
                      <CheckSquare className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Modo Seleção
                    </div>
                  </div>

                  <div className="relative group">
                    <button onClick={() => setShowFolderInput(true)} className="p-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi border-2 border-slate-200 rounded-2xl shadow-sm">
                      <Plus className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Nova Pasta
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {showFolderInput && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Nova Pasta</h3>
              <button onClick={() => setShowFolderInput(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Pasta</label>
                <input 
                  autoFocus
                  value={newFolderName} 
                  onChange={(e) => setNewFolderName(e.target.value)} 
                  placeholder="Ex: Direito Civil, OAB 2024..." 
                  className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cor do Deck</label>
                <div className="grid grid-cols-5 gap-2">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setNewFolderColor(color.border)}
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
                        onClick={() => setNewFolderIcon(iconObj.value)}
                        className={`w-full aspect-square rounded-xl transition-all flex items-center justify-center border-2 ${(newFolderIcon === iconObj.value ? 'bg-slate-100 dark:bg-white/10 border-sanfran-rubi text-sanfran-rubi' : 'border-slate-100 dark:border-white/5 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        title={iconObj.name}
                      >
                        <IconComp className="w-6 h-6" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data da Prova (Opcional - Modo Véspera)</label>
                <input 
                  type="date"
                  value={newFolderTargetDate} 
                  onChange={(e) => setNewFolderTargetDate(e.target.value)} 
                  className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi transition-colors text-slate-700 dark:text-slate-300"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Se definido, o algoritmo aumentará a frequência de revisão dos cards desta pasta conforme a data se aproxima.
                </p>
              </div>

              <button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="w-full py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-sanfran-rubi/20 hover:bg-sanfran-rubiDark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Criar Pasta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Pasta */}
      {editingFolder && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Editar Pasta</h3>
              <button onClick={() => setEditingFolder(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Pasta</label>
                <input 
                  autoFocus
                  value={editingFolder.name} 
                  onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })} 
                  className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-purple-500 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateFolder()}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cor do Deck</label>
                <div className="grid grid-cols-5 gap-2">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setEditingFolder({ ...editingFolder, color: color.border })}
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
                        onClick={() => setEditingFolder({ ...editingFolder, icon: iconObj.value })}
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
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data da Prova (Opcional - Modo Véspera)</label>
                <input 
                  type="date"
                  value={editingFolder.targetDate ? new Date(editingFolder.targetDate).toISOString().split('T')[0] : ''} 
                  onChange={(e) => setEditingFolder({ ...editingFolder, targetDate: e.target.value ? new Date(e.target.value).getTime() : undefined })} 
                  className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi transition-colors text-slate-700 dark:text-slate-300"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Se definido, o algoritmo aumentará a frequência de revisão dos cards desta pasta conforme a data se aproxima.
                </p>
              </div>

              <button 
                onClick={handleUpdateFolder}
                disabled={!editingFolder.name.trim()}
                className="w-full py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-sanfran-rubi/20 hover:bg-sanfran-rubiDark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'community' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl -ml-24 -mb-24"></div>
              
            <div className="relative z-10">
              <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Hub da Comunidade</h3>
              <p className="text-purple-100 font-bold max-w-xl">Explore e baixe decks criados por outros estudantes da SanFran. Conhecimento compartilhado é conhecimento multiplicado.</p>
            </div>
            <Sparkles className="absolute bottom-8 right-8 w-24 h-24 text-white/10 rotate-12" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xl">
              <input 
                type="text"
                placeholder="Buscar decks (ex: STF, OAB, Filosofia...)"
                value={communitySearch}
                onChange={(e) => setCommunitySearch(e.target.value)}
                className="w-full p-4 pl-12 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-purple-500 transition-all"
              />
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Ordenar por:</span>
              <select className="bg-transparent font-black text-xs uppercase outline-none text-slate-600 dark:text-slate-300">
                <option>Mais Baixados</option>
                <option>Mais Recentes</option>
              </select>
            </div>
          </div>

          {isFetchingCommunity ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
              <p className="font-black text-slate-400 uppercase tracking-widest">Sincronizando com a nuvem...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicDecks
                .filter(d => d.name.toLowerCase().includes(communitySearch.toLowerCase()))
                .map(deck => (
                <div key={deck.id} className="group bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/5 shadow-xl hover:border-purple-500 transition-all flex flex-col justify-between h-[400px] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  
                  {deck.is_verified && (
                    <div className="absolute top-6 left-6 z-10">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-usp-gold/10 border border-usp-gold/30 rounded-full">
                        <ShieldCheck size={14} className="text-usp-gold" />
                        <span className="text-[10px] font-black text-usp-gold uppercase tracking-widest">Curadoria SanFran</span>
                      </div>
                    </div>
                  )}

                  <div className={deck.is_verified ? 'mt-8' : ''}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                        {deck.cards?.length || 0} Cards
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Star size={14} className={`transition-colors ${deck.rating >= 4 ? 'text-usp-gold fill-usp-gold' : ''}`} />
                          <span className="text-[10px] font-black">{deck.rating || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <FileDown size={14} />
                          <span className="text-[10px] font-black">{deck.downloads || 0}</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase leading-tight mb-1">{deck.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      Criado por: <span className="text-slate-600 dark:text-slate-300">{deck.author_name || 'Anônimo'}</span> {deck.author_year && `• ${deck.author_year}`}
                    </p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-3">
                      {deck.description || `Deck colaborativo criado para auxiliar nos estudos de ${(subjects || []).find(s => s.id === deck.subject_id)?.name || 'Direito'}.`}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleDownloadDeck(deck)}
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-purple-500/20 transition-all"
                      >
                        <Download size={16} /> Baixar Deck
                      </button>
                      <button 
                        onClick={() => { setPreviewDeck(deck); setIsPreviewModalOpen(true); }}
                        className="p-4 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-2xl hover:text-purple-500 transition-all group/preview"
                        title="Ver Amostra"
                      >
                        <Eye size={18} className="group-hover/preview:scale-110 transition-transform" />
                      </button>
                    </div>
                    <button className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-purple-500 transition-colors flex items-center justify-center gap-2">
                      <Link size={12} /> Copiar Link Permanente
                    </button>
                  </div>
                </div>
              ))}

              {publicDecks.length === 0 && (
                <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem]">
                   <Sparkles className="w-16 h-16 text-slate-100 dark:text-white/5 mx-auto mb-4" />
                   <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum deck público encontrado.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'browse' && (
        <div className="space-y-6">
          {currentFolderId === null && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-in slide-in-from-top-4 duration-500">
              {/* Heatmap Widget */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-xl flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl transition-all duration-500 ${stats.isGoalReached ? 'bg-usp-gold/20 shadow-[0_0_15px_rgba(255,184,28,0.5)]' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                      <Flame className={`w-6 h-6 ${stats.isGoalReached ? 'text-usp-gold fill-usp-gold' : stats.streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">Constância</h3>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${stats.isGoalReached ? 'text-usp-gold' : 'text-emerald-600 dark:text-emerald-400'}`}>{stats.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.streak}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Dias de Streak</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Diária</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${stats.isGoalReached ? 'text-usp-gold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {stats.cardsToday} / {dailyGoal} cards
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full rounded-full ${stats.isGoalReached ? 'bg-usp-gold' : 'bg-emerald-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (stats.cardsToday / dailyGoal) * 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-3xl relative heatmap-container">
                  <div className="grid grid-rows-7 grid-flow-col gap-1 h-28 overflow-x-auto pb-2 custom-scrollbar overflow-y-visible">
                    {Array.from({ length: 20 * 7 }).map((_, i) => {
                      const date = new Date();
                      const dayOffset = (20 * 7) - 1 - i;
                      date.setDate(date.getDate() - dayOffset);
                      const dateStr = date.toISOString().split('T')[0];
                      const count = studyHistory[dateStr] || 0;
                      
                      let colorClass = 'bg-slate-200 dark:bg-white/5';
                      if (count > 50) colorClass = 'bg-emerald-700';
                      else if (count > 20) colorClass = 'bg-emerald-600';
                      else if (count > 10) colorClass = 'bg-emerald-500';
                      else if (count > 0) colorClass = 'bg-emerald-400';

                      const rowIndex = i % 7;
                      const isTopHalf = rowIndex < 3;

                      return (
                        <div 
                          key={i} 
                          className={`w-3 h-3 rounded-sm ${colorClass} transition-all hover:scale-150 cursor-pointer relative`}
                          onClick={() => handleHeatmapClick(dateStr)}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const container = e.currentTarget.closest('.heatmap-container');
                            if (container) {
                              const containerRect = container.getBoundingClientRect();
                              setHoveredHeatmapDay({
                                date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                                count,
                                x: rect.left - containerRect.left + rect.width / 2,
                                y: rect.top - containerRect.top,
                                isTopHalf
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredHeatmapDay(null)}
                        />
                      );
                    })}
                  </div>
                  {hoveredHeatmapDay && (
                    <div 
                      className="absolute bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg z-[100] pointer-events-none shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200"
                      style={{ 
                        left: hoveredHeatmapDay.x, 
                        top: hoveredHeatmapDay.isTopHalf ? hoveredHeatmapDay.y + 20 : hoveredHeatmapDay.y - 10,
                        transform: `translateX(-50%) translateY(${hoveredHeatmapDay.isTopHalf ? '0' : '-100%'})`
                      }}
                    >
                      <div className="flex items-center gap-2 relative">
                        <div className={`w-2 h-2 rounded-full ${hoveredHeatmapDay.count > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        {hoveredHeatmapDay.date}: {hoveredHeatmapDay.count} cards
                        
                        {/* Arrow */}
                        <div 
                          className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-slate-900 rotate-45 ${
                            hoveredHeatmapDay.isTopHalf ? '-top-2.5 border-t border-l border-white/10' : '-bottom-2.5 border-b border-r border-white/10'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 px-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Menos</span>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-sm bg-slate-200 dark:bg-white/5"></div>
                      <div className="w-2 h-2 rounded-sm bg-emerald-400"></div>
                      <div className="w-2 h-2 rounded-sm bg-emerald-500"></div>
                      <div className="w-2 h-2 rounded-sm bg-emerald-600"></div>
                      <div className="w-2 h-2 rounded-sm bg-emerald-700"></div>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mais</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Trophy size={12} className="text-usp-gold" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Recorde</span>
                    </div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">{stats.streak} dias</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity size={12} className="text-emerald-500" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                    </div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">{stats.total} cards</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp size={12} className="text-blue-500" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ritmo</span>
                    </div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">{stats.average}/dia</div>
                  </div>
                </div>
              </div>

              {/* Forecast Widget */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-200 dark:border-white/10 shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Planejador Estratégico</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carga Semanal SanFran</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setIsAdvanceMode(!isAdvanceMode);
                        if (!isAdvanceMode) {
                          startStudySession();
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isAdvanceMode ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600'}`}
                    >
                      {isAdvanceMode ? 'Modo Antecipação' : 'Adiantar Revisões'}
                    </button>
                    <div className="text-right">
                      <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{forecast.reduce((acc, curr) => acc + curr.count, 0)}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total</span>
                    </div>
                  </div>
                </div>

                <div className="relative h-32 mt-4 flex items-end justify-between gap-1.5">
                  {/* Goal Line */}
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-dashed border-slate-200 dark:border-white/10 z-0 pointer-events-none"
                    style={{ bottom: `${(dailyGoal / maxForecast) * 100}%` }}
                  >
                    <span className="absolute right-0 -top-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">Meta: {dailyGoal}</span>
                  </div>

                  {forecast.map((day, i) => {
                    const totalHeight = (day.count / maxForecast) * 100;
                    const newHeight = (day.counts.new / day.count) * 100 || 0;
                    const learningHeight = (day.counts.learning / day.count) * 100 || 0;
                    const reviewHeight = (day.counts.review / day.count) * 100 || 0;

                    // Calculate estimated time (avg 15s or from session stats)
                    const avgTime = sessionStats.cardTimes.length > 0 
                      ? sessionStats.cardTimes.reduce((acc, curr) => acc + curr.timeMs, 0) / sessionStats.cardTimes.length / 1000 
                      : 15;
                    const estMinutes = Math.round((day.count * avgTime) / 60);

                    return (
                      <div key={i} className="flex flex-col items-center gap-2 flex-1 group h-full relative z-10">
                        <div className="relative w-full flex flex-col justify-end h-full items-center">
                          {day.hasExam && (
                            <div className="absolute -top-6 animate-bounce">
                              <AlertCircle className="w-4 h-4 text-orange-500" />
                            </div>
                          )}
                          
                          <div 
                            className="w-full max-w-[20px] rounded-t-md overflow-hidden flex flex-col justify-end transition-all duration-500 group-hover:ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-slate-900"
                            style={{ height: `${Math.max(totalHeight, 2)}%` }}
                          >
                            <div className="bg-blue-500" style={{ height: `${newHeight}%` }} />
                            <div className="bg-red-500" style={{ height: `${learningHeight}%` }} />
                            <div className="bg-green-500" style={{ height: `${reviewHeight}%` }} />
                          </div>

                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 translate-y-2 group-hover:translate-y-0">
                            <div className="bg-slate-900 text-white p-2 rounded-xl shadow-2xl border border-white/10 min-w-[120px]">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-1 border-b border-white/10 pb-1">{day.label}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4">
                                  <span className="text-[9px] text-slate-400">Novos</span>
                                  <span className="text-[9px] font-bold text-blue-400">{day.counts.new}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-[9px] text-slate-400">Aprendizado</span>
                                  <span className="text-[9px] font-bold text-red-400">{day.counts.learning}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-[9px] text-slate-400">Revisão</span>
                                  <span className="text-[9px] font-bold text-green-400">{day.counts.review}</span>
                                </div>
                                <div className="pt-1 mt-1 border-t border-white/10 flex items-center justify-between">
                                  <span className="text-[9px] font-black text-white">Tempo Est.</span>
                                  <span className="text-[9px] font-black text-blue-400">{estMinutes} min</span>
                                </div>
                                {day.hasExam && (
                                  <div className="pt-1 mt-1 border-t border-orange-500/30">
                                    <p className="text-[8px] font-black text-orange-400 uppercase">⚠️ Prova: {day.exams.join(', ')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${i === 0 ? 'text-sanfran-rubi' : 'text-slate-400'}`}>
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center gap-4 mb-6 animate-in slide-in-from-left-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder={isGlobalSearch ? "Busca Global em todo o acervo..." : "Pesquisar cards nesta pasta..."} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-4 pl-12 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi transition-all"
              />
            </div>
            <button 
              onClick={() => setIsGlobalSearch(!isGlobalSearch)}
              className={`px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border-2 ${isGlobalSearch ? 'bg-sanfran-rubi border-sanfran-rubi text-white shadow-lg' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'}`}
            >
              {isGlobalSearch ? 'Busca Global Ativa' : 'Ativar Busca Global'}
            </button>
          </div>

          {isTableView ? (
            <div className="bg-white dark:bg-sanfran-rubiDark/50 rounded-[2rem] border-2 border-slate-200 dark:border-sanfran-rubi/40 shadow-xl overflow-hidden animate-in fade-in duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/5 border-b-2 border-slate-100 dark:border-white/5">
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Frente</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Verso</th>
                      {isGlobalSearch && <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Pasta</th>}
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCards.map(card => (
                      <tr key={card.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                        <td className="p-6">
                          <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{card.front}</p>
                        </td>
                        <td className="p-6">
                          <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">{card.back}</p>
                        </td>
                        {isGlobalSearch && (
                          <td className="p-6">
                            <span className="text-[10px] font-black uppercase text-slate-400">
                              {(folders || []).find(f => f.id === card.folderId)?.name || 'Raiz'}
                            </span>
                          </td>
                        )}
                        <td className="p-6 text-center">
                          {card.is_suspended ? (
                            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-[9px] font-black uppercase">Suspenso</span>
                          ) : (
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase">Ativo</span>
                          )}
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingCard(card)}
                              className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => toggleSuspension(card.id, e)}
                              className={`p-2 transition-colors ${card.is_suspended ? 'text-emerald-500 hover:text-emerald-600' : 'text-orange-500 hover:text-orange-600'}`}
                              title={card.is_suspended ? 'Reativar' : 'Suspender'}
                            >
                              {card.is_suspended ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={(e) => archiveCard(card.id, e)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              title="Arquivar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {currentCards.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-20 text-center">
                          <Search className="w-12 h-12 text-slate-100 dark:text-white/5 mx-auto mb-4" />
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum card encontrado.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {currentFolders.map(folder => {
            const stats = getFolderStats(folder.id);
            const hasUpdate = folder.original_deck_id && publicDecks.some(pd => pd.id === folder.original_deck_id && (pd.version || 1) > (folder.version || 1));
            const isSelected = selectedFolderIds.has(folder.id);
            
            return (
              <div 
                key={folder.id} 
                onClick={() => isSelectionMode ? toggleFolderSelection(folder.id) : setCurrentFolderId(folder.id)} 
                className={`group bg-white dark:bg-sanfran-rubiDark/50 p-6 rounded-[2.5rem] border-2 shadow-xl cursor-pointer hover:shadow-2xl hover:-translate-y-1 border-l-[10px] ${folder.color || 'border-l-usp-gold'} transition-all relative flex flex-col justify-between min-h-[280px] h-auto overflow-hidden ${isSelected ? 'border-sanfran-rubi bg-red-50/30 dark:bg-sanfran-rubi/10' : 'border-slate-200 dark:border-sanfran-rubi/40 hover:border-sanfran-rubi/50'}`}
              >
                {isSelectionMode && (
                  <div className="absolute top-4 right-4 z-30">
                    {isSelected ? <CheckSquare className="w-6 h-6 text-sanfran-rubi" /> : <Square className="w-6 h-6 text-slate-300" />}
                  </div>
                )}
                {hasUpdate && !isSelectionMode && (
                  <div className="absolute -top-3 -right-3 z-20 animate-bounce">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-full shadow-lg border-2 border-white dark:border-slate-900">
                      <AlertCircle size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Atualização Disponível</span>
                    </div>
                  </div>
                )}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuFolderId(activeMenuFolderId === folder.id ? null : folder.id);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {activeMenuFolderId === folder.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" /> Personalizar
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleExportFolder(folder.id, folder.name); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                          <FileDown className="w-4 h-4 text-emerald-500" /> Exportar (.apkg)
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleResetFolderProgress(folder.id); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                          <RotateCcw className="w-4 h-4 text-orange-500" /> Zerar Progresso
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handlePublishDeck(folder.id, folder.name); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                          <Sparkles className="w-4 h-4 text-purple-500" /> Compartilhar
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-white/10 mx-2"></div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id, e); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        >
                          <Trash2 className="w-4 h-4" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Content */}
                <div>
                  <div className="flex items-start justify-between mb-6">
                    {(() => {
                      const IconComp = FOLDER_ICONS.find(i => i.value === folder.icon)?.icon || FolderIcon;
                      return <IconComp className={`${folder.color?.replace('border-l-', 'text-') || 'text-usp-gold'} w-10 h-10`} />;
                    })()}
                    
                    {folder.targetDate && (
                      <div className="px-3 py-1 bg-sanfran-rubi/10 border border-sanfran-rubi/20 rounded-full flex items-center gap-1.5">
                        <Calendar size={10} className="text-sanfran-rubi" />
                        <span className="text-[9px] font-black text-sanfran-rubi uppercase tracking-widest">
                          {(() => {
                            const d = new Date(folder.targetDate);
                            return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>

                  <h4 className="font-black text-slate-950 dark:text-white uppercase text-lg leading-tight mb-6 line-clamp-3 break-words">
                    {folder.name}
                  </h4>
                </div>
                
                {/* Bottom Content: Metrics & Mastery */}
                <div className="mt-auto">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Novos</span>
                      <span className="text-base font-black text-blue-600 leading-none">{stats.newCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Aprender</span>
                      <span className="text-base font-black text-orange-600 leading-none">{stats.learningCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Revisar</span>
                      <span className="text-base font-black text-emerald-600 leading-none">{stats.reviewCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Domínio</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-none">{stats.mastery}%</span>
                    </div>
                  </div>

                  <div className="h-1.5 bg-slate-100 dark:bg-white/5 overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out" 
                      style={{ width: `${stats.mastery}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {currentCards.map(card => {
            const subject = (subjects || []).find(s => s.id === card.subjectId);
            const isSelected = selectedCardIds.has(card.id);
            
            return (
              <div 
                key={card.id} 
                onClick={() => isSelectionMode ? toggleCardSelection(card.id) : setEditingCard(card)}
                className={`group bg-white dark:bg-sanfran-rubiDark/50 p-10 rounded-[3rem] border-2 shadow-xl flex flex-col justify-between min-h-[240px] border-l-[10px] transition-all relative cursor-pointer ${isSelected ? 'border-sanfran-rubi bg-red-50/30 dark:bg-sanfran-rubi/10' : 'border-slate-200 dark:border-sanfran-rubi/40 hover:border-sanfran-rubi/50'}`} 
                style={{ borderLeftColor: isSelected ? undefined : (subject?.color || '#9B111E') }}
              >
                {!isSelectionMode && (
                  <button 
                    onClick={(e) => archiveCard(card.id, e)} 
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Mover para Arquivo Morto"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
                {isSelectionMode && (
                  <div className="absolute top-4 right-4">
                    {isSelected ? <CheckSquare className="w-6 h-6 text-sanfran-rubi" /> : <Square className="w-6 h-6 text-slate-300" />}
                  </div>
                )}
                <div className="font-black text-slate-900 dark:text-white line-clamp-4 leading-tight">
                  <SmartText text={card.front} />
                </div>
                {isGlobalSearch && (
                  <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
                    {(() => {
                      const folderObj = (folders || []).find(f => f.id === card.folderId);
                      const IconComp = FOLDER_ICONS.find(i => i.value === folderObj?.icon)?.icon || FolderIcon;
                      return <IconComp size={10} />;
                    })()}
                    {(folders || []).find(f => f.id === card.folderId)?.name || 'Raiz'}
                  </div>
                )}
                <div className="flex justify-between items-center mt-4">
                  <span className="text-[9px] font-black uppercase text-slate-400">PRAZO: {new Date(card.nextReview).toLocaleDateString()}</span>
                  <BrainCircuit className="w-5 h-5 text-sanfran-rubi opacity-40" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )}

      {/* MODAL SESSÃO DE REVISÃO */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3.5rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-12 border-b border-slate-100 dark:border-white/5 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-800 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl -ml-24 -mb-24"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <button onClick={() => setIsSessionModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <h3 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Sessão de Revisão Mix</h3>
                <p className="text-indigo-100 font-bold text-lg">Selecione os baralhos para o seu treino diário.</p>
              </div>
            </div>
            
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Seus Baralhos</span>
                  <div className="h-px w-12 bg-slate-100 dark:bg-white/5"></div>
                </div>
                <button 
                  onClick={() => {
                    const allIds = (folders || []).filter(f => !f.parentId).map(f => f.id);
                    if (selectedFolderIdsForSession.size === allIds.length) {
                      setSelectedFolderIdsForSession(new Set());
                    } else {
                      setSelectedFolderIdsForSession(new Set(allIds));
                    }
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {selectedFolderIdsForSession.size === (folders || []).filter(f => !f.parentId).length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {(folders || []).filter(f => !f.parentId).map(folder => {
                  const isSelected = selectedFolderIdsForSession.has(folder.id);
                  const stats = getFolderStats(folder.id);
                  return (
                    <div 
                      key={folder.id} 
                      onClick={() => {
                        const next = new Set(selectedFolderIdsForSession);
                        if (isSelected) next.delete(folder.id);
                        else next.add(folder.id);
                        setSelectedFolderIdsForSession(next);
                      }}
                      className={`group p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all relative overflow-hidden ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-4 ring-indigo-500/10' 
                          : 'border-slate-100 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-800 bg-slate-50/50 dark:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`p-3 rounded-2xl transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 group-hover:text-indigo-500'}`}>
                          {(() => {
                            const IconComp = FOLDER_ICONS.find(i => i.value === folder.icon)?.icon || FolderIcon;
                            return <IconComp size={20} />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-black uppercase text-[11px] tracking-tight truncate ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                            {folder.name}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-200/50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                              {stats.totalCount} CARDS
                            </span>
                            {stats.reviewCount > 0 && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 rounded animate-pulse">
                                {stats.reviewCount} PENDENTES
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`transition-all ${isSelected ? 'scale-110' : 'scale-100 opacity-20'}`}>
                          {isSelected ? <CheckCircle2 className="text-indigo-600 w-6 h-6" /> : <Circle className="text-slate-400 w-6 h-6" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-10 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex items-center gap-6">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Selecionado</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {Array.from(selectedFolderIdsForSession).reduce((acc, id) => acc + getFolderStats(id).reviewCount, 0)} <span className="text-xs text-slate-400 uppercase">Cards Pendentes</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setSelectedFolderIdsForSession(new Set());
                    setIsSessionModalOpen(false);
                  }}
                  className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest border-2 border-slate-200 dark:border-white/10 hover:bg-slate-50 transition-all"
                >
                  Sair
                </button>
                <button 
                  disabled={selectedFolderIdsForSession.size === 0}
                  onClick={() => {
                    startStudySession();
                    setIsSessionModalOpen(false);
                  }}
                  className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  Iniciar Mix
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'study' && (reviewQueue.length === 0 || sessionStats.isFinished) && (
        sessionStats.isActive ? renderPerformanceSummary() : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-6 animate-in fade-in zoom-in">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
              <CheckSquare className="w-12 h-12" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Parabéns!</h2>
              <p className="text-slate-500 dark:text-slate-400">Você terminou suas revisões por agora.</p>
              {studyableFlashcards.some(f => (f.status === 'learning' || f.status === 'relearning') && f.nextReview > currentTime) && (
                <p className="text-sm text-orange-500 font-bold mt-4">
                  Alguns cards estão em aprendizado e estarão disponíveis em breve.
                </p>
              )}
            </div>
            <button 
              onClick={() => setMode('browse')}
              className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              Voltar ao Acervo
            </button>
          </div>
        )
      )}

      {mode === 'study' && reviewQueue.length > 0 && !sessionStats.isFinished && (
        <div className={`flex flex-col items-center animate-in fade-in zoom-in ${isFocusMode ? 'w-full max-w-4xl' : 'py-10'}`}>
          <div className={`w-full max-w-2xl mb-8 flex items-center justify-between ${isFocusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-500' : ''}`}>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isFocusMode ? 'bg-white text-slate-950' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
              >
                {isFocusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />} 
                {isFocusMode ? 'Sair do Foco' : 'Modo Foco'}
                <span className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[8px] ml-1">F</span>
              </button>
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest">
                <span className={`text-blue-500 flex items-center gap-1 transition-all ${(!currentCard?.status || currentCard?.status === 'new') ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'opacity-70'}`} title="Novos">
                  <div className={`w-2 h-2 rounded-full bg-blue-500 transition-all ${(!currentCard?.status || currentCard?.status === 'new') ? 'scale-[1.4] shadow-[0_0_8px_rgba(59,130,246,0.8)]' : ''}`}></div> 
                  {sessionCounters.new}
                </span>
                <span className={`text-red-500 flex items-center gap-1 transition-all ${(currentCard?.status === 'learning' || currentCard?.status === 'relearning') ? 'scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'opacity-70'}`} title="Aprender/Revisar">
                  <div className={`w-2 h-2 rounded-full bg-red-500 transition-all ${(currentCard?.status === 'learning' || currentCard?.status === 'relearning') ? 'scale-[1.4] shadow-[0_0_8px_rgba(239,68,68,0.8)]' : ''}`}></div> 
                  {sessionCounters.pending}
                </span>
                <span className={`text-green-500 flex items-center gap-1 transition-all ${(currentCard?.status === 'review') ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'opacity-70'}`} title="Concluídos">
                  <div className={`w-2 h-2 rounded-full bg-green-500 transition-all ${(currentCard?.status === 'review') ? 'scale-[1.4] shadow-[0_0_8px_rgba(34,197,94,0.8)]' : ''}`}></div> 
                  {sessionCounters.completed}
                </span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button 
                  onClick={undoAction} 
                  disabled={undoStack.length === 0}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 disabled:opacity-30 transition-colors"
                  title="Desfazer (Ctrl+Z)"
                >
                  <RotateCcw size={14} />
                </button>
                <button 
                  onClick={redoAction} 
                  disabled={redoStack.length === 0}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 disabled:opacity-30 transition-colors scale-x-[-1]"
                  title="Refazer (Ctrl+Y)"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                Tempo: {Math.floor(cardTimer / 60)}:{(cardTimer % 60).toString().padStart(2, '0')}
              </div>
              {isCramMode && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                  <Smartphone size={12} /> Tinder Mode
                </div>
              )}
            </div>
            {!isFocusMode && (
              <button onClick={() => setMode('browse')} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            )}
          </div>

          <div className="relative w-full max-w-2xl min-h-[550px] preserve-3d group/card">
            <AnimatePresence mode="wait">
              {currentCard && (
                <motion.div
                  key={currentCard.id}
                  initial={{ opacity: 0, scale: 0.9, x: swipeDirection === 'left' ? 300 : swipeDirection === 'right' ? -300 : 0 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.9, 
                    x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0,
                    rotate: swipeDirection === 'left' ? -20 : swipeDirection === 'right' ? 20 : 0
                  }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                  style={{ x: dragX }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100) {
                      setSwipeDirection('right');
                      if (isCramMode) {
                        handleNextCram();
                      } else {
                        handleReview(3); // Good
                      }
                    } else if (info.offset.x < -100) {
                      setSwipeDirection('left');
                      if (isCramMode) {
                        handleNextCram();
                      } else {
                        handleReview(0); // Again
                      }
                    }
                  }}
                  className="absolute inset-0 w-full h-full"
                >
                  <div className={`relative w-full h-full cursor-pointer transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => !isDissertativeMode && setIsFlipped(!isFlipped)}>
                    {/* Swipe Overlays */}
                    <motion.div 
                      style={{ opacity: leftOverlayOpacity }}
                      className="absolute inset-0 z-50 bg-red-500 rounded-[3rem] pointer-events-none flex items-center justify-center"
                    >
                      <div className="bg-white/20 p-8 rounded-full backdrop-blur-md">
                        <X size={80} className="text-white" />
                      </div>
                    </motion.div>
                    <motion.div 
                      style={{ opacity: rightOverlayOpacity }}
                      className="absolute inset-0 z-50 bg-emerald-500 rounded-[3rem] pointer-events-none flex items-center justify-center"
                    >
                      <div className="bg-white/20 p-8 rounded-full backdrop-blur-md">
                        <Check size={80} className="text-white" />
                      </div>
                    </motion.div>

                    <div className="absolute inset-0 w-full h-full bg-white dark:bg-sanfran-rubiDark border-[6px] border-slate-200 dark:border-white/10 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-center text-center backface-hidden">
                      <span className="text-xs font-black text-sanfran-rubi uppercase tracking-[0.3em] mb-8">Questão</span>
                      <div className="text-2xl font-black text-slate-950 dark:text-white leading-tight">
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-center">
                          <GlossaryText text={currentCard.front} onTermClick={handleTermClick} />
                        </div>
                      </div>
                      
                      {isDissertativeMode ? (
                        <div className="w-full mt-8 space-y-4 animate-in slide-in-from-bottom-4" onClick={(e) => e.stopPropagation()}>
                          <textarea 
                            value={userWrittenAnswer}
                            onChange={(e) => setUserWrittenAnswer(e.target.value)}
                            placeholder="Digite sua resposta dissertativa aqui..."
                            className="w-full h-32 p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold resize-none outline-none focus:border-sanfran-rubi"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setIsDissertativeMode(false)}
                              className="px-4 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={handleEvaluateDissertative}
                              disabled={isEvaluating || !userWrittenAnswer.trim()}
                              className="flex-1 py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isEvaluating ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                              {isEvaluating ? 'Avaliando...' : 'Enviar para Correção IA'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setIsDissertativeMode(true); }}
                          className="mt-8 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sanfran-rubi hover:text-white transition-all flex items-center gap-2"
                        >
                          <small><Edit2 size={14} /></small> Responder por Escrito
                        </button>
                      )}

                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <span className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">Pressione Espaço para virar</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-black border-[6px] border-usp-blue/40 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-start text-center backface-hidden rotate-y-180 overflow-y-auto custom-scrollbar">
                      {isFlipped && (
                        <>
                          {aiEvaluation ? (
                            <div className="w-full mb-8 animate-in fade-in duration-500">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-purple-600 uppercase tracking-[0.3em]">Avaliação IA</span>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setAiEvaluation(null); setIsFlipped(false); setIsDissertativeMode(true); }}
                                    className="p-1 text-slate
                                    title="Refazer Avaliação"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-1 bg-purple-600 text-white rounded-full text-lg font-black">
                                  {(aiEvaluation.score || 0).toFixed(1)} / 10
                                </div>
                              </div>
                              <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-purple-500/30 text-left shadow-xl">
                                <div className="mb-4 pb-4 border-b border-slate-100 dark:border-white/5">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sua Resposta:</span>
                                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 italic">"{userWrittenAnswer}"</p>
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed mb-4 font-bold">
                                  <ReactMarkdown>{aiEvaluation.feedback || ''}</ReactMarkdown>
                                </div>
                                {(aiEvaluation.missing_keywords || []).length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">O que faltou:</span>
                                    <div className="flex flex-wrap gap-2">
                                      {(aiEvaluation.missing_keywords || []).map((kw, i) => (
                                        <span key={i} className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-black border border-red-100 dark:border-red-800/30">
                                          {kw}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Follow-up Chat */}
                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 space-y-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <MessageSquareText size={16} className="text-purple-500" />
                                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Aprofundar com Mentor IA</span>
                                  </div>
                                  
                                  <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                    {followUpChat.map((msg, i) => (
                                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[90%] p-4 rounded-2xl text-xs font-bold shadow-sm ${
                                          msg.role === 'user' 
                                            ? 'bg-purple-600 text-white rounded-tr-none' 
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-100 dark:border-white/5'
                                        }`}>
                                          <div className="prose prose-xs dark:prose-invert max-w-none">
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {isFollowUpLoading && (
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
                                      value={followUpInput}
                                      onChange={(e) => setFollowUpInput(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
                                      placeholder="Tire uma dúvida ou peça para aprofundar..."
                                      className="flex-1 p-3 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-purple-500"
                                    />
                                    <button 
                                      onClick={handleFollowUp}
                                      disabled={isFollowUpLoading || !followUpInput.trim()}
                                      className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                      {isFollowUpLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Send className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-black text-usp-blue uppercase tracking-[0.3em] mb-4">Resposta</span>
                          )}
                          
                          {currentCard.image && (
                            <div className="w-full mb-6">
                              <img src={currentCard.image} alt="Flashcard" className="max-w-full h-auto rounded-2xl border border-slate-200 dark:border-white/10 mx-auto shadow-lg" />
                            </div>
                          )}
                          
                          <div className="w-full text-left">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Gabarito Oficial</span>
                            <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-6">
                              <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-center">
                                <GlossaryText text={currentCard.back} onTermClick={handleTermClick} />
                              </div>
                            </div>
                          </div>
                          {currentCard.notes && (
                            <div className="w-full mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl text-left">
                              <span className="text-[10px] font-black text-yellow-800 dark:text-yellow-500 uppercase tracking-widest block mb-2">Notas Pessoais</span>
                              <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 whitespace-pre-wrap">
                                <SmartText text={currentCard.notes} />
                              </div>
                            </div>
                          )}
                          <div className="w-full mt-4 flex flex-wrap gap-2 justify-center">
                            {currentCard.source && (
                              <div className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                                <Paperclip size={10} />
                                {currentCard.source}
                              </div>
                            )}
                            {currentCard.tags?.map((tag, idx) => (
                              <div key={idx} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-full text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/30">
                                {tag}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {isFlipped && (
            <div className={`mt-12 w-full max-w-2xl flex flex-col items-center gap-6 ${isFocusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-500' : ''}`}>
              {isCramMode ? (
                <button 
                  onClick={handleNextCram} 
                  className="w-full p-6 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-transform"
                >
                  Próximo Card <ArrowRight size={18} />
                  <span className="px-2 py-0.5 bg-black/20 rounded text-[8px]">Enter</span>
                </button>
              ) : (
                <div className="grid grid-cols-4 gap-4 w-full">
                  <button onClick={() => handleReview(0)} className="flex flex-col items-center gap-1 p-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-transform">
                    <span>Errei</span>
                    <span className="text-[8px] opacity-60">~{getButtonLabel(0, currentCard)}</span>
                    <span className="px-2 py-0.5 bg-black/20 rounded text-[8px]">1</span>
                  </button>
                  <button onClick={() => handleReview(2)} className="flex flex-col items-center gap-1 p-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-transform">
                    <span>Difícil</span>
                    <span className="text-[8px] opacity-60">~{getButtonLabel(2, currentCard)}</span>
                    <span className="px-2 py-0.5 bg-black/20 rounded text-[8px]">2</span>
                  </button>
                  <button onClick={() => handleReview(3)} className="flex flex-col items-center gap-1 p-4 bg-usp-gold text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-transform">
                    <span>Bom</span>
                    <span className="text-[8px] opacity-60">
                      {getButtonLabel(3, currentCard)}
                    </span>
                    <span className="px-2 py-0.5 bg-black/20 rounded text-[8px]">3</span>
                  </button>
                  <button 
                    onClick={() => handleReview(5)} 
                    className={`flex flex-col items-center gap-1 p-4 bg-usp-blue text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-transform`}
                  >
                    <span>Fácil</span>
                    <span className="text-[8px] opacity-60">{getButtonLabel(5, currentCard)}</span>
                    <span className="px-2 py-0.5 bg-black/20 rounded text-[8px]">4</span>
                  </button>
                </div>
              )}

              {isAudioMode && (
                <div className="flex items-center gap-4 bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Velocidade:</span>
                  <div className="flex gap-2">
                    {[1, 1.25, 1.5, 2].map(speed => (
                      <button 
                        key={speed}
                        onClick={() => setAudioSpeed(speed)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${audioSpeed === speed ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!isFocusMode && (
            <button onClick={() => {
              window.speechSynthesis.cancel();
              setSessionStats(prev => ({ ...prev, isFinished: true }));
            }} className="mt-12 text-slate-400 font-black text-xs uppercase underline hover:text-red-500 transition-colors">Sair da Audiência</button>
          )}
        </div>
      )}

      {/* --- AI GENERATION MODE --- */}
      {mode === 'ai_create' && !isPreviewMode && (
         <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-purple-500 shadow-2xl relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

             <div className="flex items-center gap-4 mb-8 relative z-10">
               <button onClick={() => setMode('browse')} className="p-3"><ArrowLeft className="w-8 h-8 text-slate-400" /></button>
               <div>
                  <div className="flex items-center gap-2">
                     <Sparkles className="text-purple-500 w-6 h-6 animate-pulse" />
                     <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase">IA Generator Avançado</h3>
                  </div>
                  <p className="text-sm font-bold text-slate-500">Criação automática baseada em doutrina ou lei.</p>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                {showHistory && (
                  <div className="md:col-span-3 bg-slate-50 dark:bg-black/30 p-6 rounded-[2rem] border-2 border-purple-200 dark:border-purple-900/30 animate-in slide-in-from-top duration-300">
                     <div className="flex items-center justify-between mb-4">
                       <h4 className="text-xs font-black uppercase tracking-[0.2em] text-purple-600">Últimas Gerações</h4>
                       <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                       {aiGenerationHistory.map((item) => (
                         <div 
                           key={item.id} 
                           onClick={() => restoreFromHistory(item)}
                           className="p-4 bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-purple-500 hover:shadow-md transition-all group"
                         >
                           <div className="flex items-center justify-between mb-2">
                             <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(item.timestamp).toLocaleTimeString()}</span>
                             <span className="text-[9px] font-black text-purple-500 uppercase">{(subjects || []).find(s => s.id === item.subjectId)?.name || 'Geral'}</span>
                           </div>
                           <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 line-clamp-2 mb-2">
                             {item.text || (item.files.length > 0 ? `${item.files.length} arquivos anexados` : item.urls || 'Sem texto')}
                           </p>
                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="text-[9px] font-black text-purple-600 uppercase">Restaurar</span>
                             <RotateCcw size={10} className="text-purple-600" />
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                )}
                <div className="md:col-span-2 space-y-4">
                    <div className="flex flex-wrap gap-2">
                       {['Geral', 'Letra da Lei', 'Doutrina', 'Jurisprudência', 'Casos Hipotéticos'].map(type => (
                         <button
                           key={type}
                           onClick={() => setAiSourceType(type)}
                           className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border-2 transition-all ${
                             aiSourceType === type 
                               ? 'border-purple-500 bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                                : 'border-slate-200 text-slate-400 hover:border-purple-200'
                           }`}
                           >
                           {type}
                         </button>
                       ))}
                    </div>

                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Texto Base (Cole aqui)</label>
                       <div className="flex items-center gap-2">
                          {aiGenerationHistory.length > 0 && (
                            <button 
                              onClick={() => setShowHistory(!showHistory)}
                              className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                                showHistory ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-purple-100 hover:text-purple-600'
                              }`}
                            >
                              <History size={12} />
                              Histórico
                            </button>
                          )}
                          <div className="relative group">
                             <input 
                               type="file" 
                               multiple 
                               accept=".pdf,.png,.jpg,.jpeg" 
                               onChange={handleFileChange} 
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                             />
                             <button className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-purple-100 hover:text-purple-600 transition-colors">
                                <Upload size={14} /> PDF / Imagem
                             </button>
                          </div>
                       </div>
                    </div>
                    
                    <div className="relative">
                      <textarea 
                        value={aiSourceText} 
                        onChange={(e) => setAiSourceText(e.target.value)} 
                        placeholder="Cole aqui o artigo da lei, o resumo da aula ou trecho da doutrina..." 
                        className="w-full h-64 p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-[2rem] font-bold resize-none outline-none focus:border-purple-500 custom-scrollbar" 
                      />
                      <div className="absolute bottom-6 right-6 px-3 py-1 bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-full border border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-500">
                         {aiSourceText.split(/\s+/).filter(Boolean).length} / 3000 palavras
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-800/30">
                       <button 
                         onClick={() => setAiIncludeMnemonics(!aiIncludeMnemonics)}
                         className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                           aiIncludeMnemonics ? 'bg-purple-600 border-purple-600' : 'bg-white dark:bg-black/50 border-slate-300'
                         }`}
                       >
                         {aiIncludeMnemonics && <Check size={14} className="text-white" />}
                       </button>
                       <div className="flex-1">
                         <p className="text-[11px] font-black text-purple-700 dark:text-purple-300 uppercase">Tentar criar mnemônicos para listas</p>
                         <p className="text-[9px] font-bold text-purple-500/70 uppercase">Ideal para decorar requisitos e princípios</p>
                       </div>
                    </div>

                    {/* Lista de Arquivos Selecionados */}
                    {aiFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {aiFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black uppercase border border-purple-200 dark:border-purple-800/50">
                            {file.mimeType.startsWith('image/') ? <Image size={12} /> : <FileText size={12} />}
                            <span className="max-w-[150px] truncate">{file.name}</span>
                            <button onClick={() => removeAiFile(idx)} className="hover:text-red-500 transition-colors"><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Link de Legislação / Doutrina</label>
                       <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl focus-within:border-purple-500 transition-colors">
                          <Link size={18} className="text-slate-400" />
                          <input 
                            type="text" 
                            value={aiUrls} 
                            onChange={(e) => setAiUrls(e.target.value)} 
                            placeholder="Ex: https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm" 
                            className="bg-transparent border-none outline-none flex-1 font-bold text-sm text-slate-700 dark:text-slate-200" 
                          />
                       </div>
                    </div>
                    
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4 block">Instruções Adicionais (Opcional)</label>
                    <textarea 
                      value={aiCustomInstructions} 
                      onChange={(e) => setAiCustomInstructions(e.target.value)} 
                      placeholder="Ex: Foque apenas na teoria da imprevisão, ignore os exemplos..." 
                      className="w-full h-24 p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-[1.5rem] font-medium resize-none outline-none focus:border-purple-500 custom-scrollbar text-sm" 
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                       {[
                         { label: 'Focar em Prazos e Datas', prompt: 'Foque intensamente em prazos e datas importantes.' },
                         { label: 'Ignorar Histórico do Direito', prompt: 'Ignore o contexto histórico, foque na aplicação atual.' },
                         { label: 'Focar em Exceções à Regra', prompt: 'Dê prioridade às exceções e ressalvas legais.' }
                       ].map((preset, idx) => (
                         <button 
                           key={idx}
                           onClick={() => setAiCustomInstructions(prev => prev ? `${prev}\n${preset.prompt}` : preset.prompt)}
                           className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black uppercase text-slate-500 hover:bg-purple-100 hover:text-purple-600 transition-colors border border-slate-200 dark:border-white/5"
                         >
                           {preset.label}
                         </button>
                       ))}
                    </div>
                 </div>
                
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disciplina</label>
                      <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none">
                         {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nível de Dificuldade</label>
                      <div className="grid grid-cols-3 gap-2">
                         {['Iniciante', 'Graduação', 'Concurso/OAB'].map(level => (
                           <button
                             key={level}
                             onClick={() => setAiDifficulty(level)}
                             className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                               aiDifficulty === level 
                                 ? 'border-purple-500 bg-purple-500 text-white' 
                                 : 'border-slate-200 text-slate-400 hover:border-purple-200'
                             }`}
                           >
                             {level}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formato do Card</label>
                      <div className="grid grid-cols-2 gap-2">
                         {[
                           { id: 'Básico', label: 'Básico (P/R)' },
                           { id: 'Cloze', label: 'Cloze (Omissão)' }
                         ].map(fmt => (
                           <button
                             key={fmt.id}
                             onClick={() => setAiFormat(fmt.id)}
                             className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                               aiFormat === fmt.id 
                                 ? 'border-indigo-500 bg-indigo-500 text-white' 
                                 : 'border-slate-200 text-slate-400 hover:border-indigo-200'
                             }`}
                           >
                             {fmt.label}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-2">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comprimento da Pergunta</label>
                       <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'curta', label: 'Curta' },
                            { id: 'normal', label: 'Normal' },
                            { id: 'extensa', label: 'Extensa' }
                          ].map(len => (
                            <button
                              key={len.id}
                              onClick={() => setAiFrontLength(len.id as any)}
                              className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                                aiFrontLength === len.id 
                                  ? 'border-purple-500 bg-purple-500 text-white' 
                                  : 'border-slate-200 text-slate-400 hover:border-purple-200'
                              }`}
                            >
                              {len.label}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comprimento da Resposta</label>
                       <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'curta', label: 'Curta' },
                            { id: 'normal', label: 'Normal' },
                            { id: 'extensa', label: 'Extensa' }
                          ].map(len => (
                            <button
                              key={len.id}
                              onClick={() => setAiBackLength(len.id as any)}
                              className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                                aiBackLength === len.id 
                                  ? 'border-purple-500 bg-purple-500 text-white' 
                                  : 'border-slate-200 text-slate-400 hover:border-purple-200'
                              }`}
                            >
                              {len.label}
                            </button>
                          ))}
                       </div>
                    </div>

                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Foco dos Cards</label>
                      <div className="grid grid-cols-2 gap-2">
                         {[
                           { id: 'Geral', label: 'Geral' },
                           { id: 'Conceitos', label: 'Conceitos' },
                           { id: 'Prazos e Números', label: 'Prazos' },
                           { id: 'Exceções', label: 'Exceções' },
                           { id: 'Súmulas e Jurisprudência', label: 'Jurisprudência' },
                           { id: 'Casos Hipotéticos', label: 'Casos Hipotéticos (OAB)' }
                         ].map(type => (
                           <button
                             key={type.id}
                             onClick={() => setAiCardType(type.id)}
                             className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                               aiCardType === type.id 
                                 ? 'border-purple-500 bg-purple-500 text-white shadow-md' 
                                 : 'border-slate-200 text-slate-400 hover:border-purple-200'
                             }`}
                           >
                             {type.label}
                           </button>
                         ))}
                      </div>
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantidade de Cards</label>
                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-black/50 p-4 rounded-2xl border-2 border-slate-200">
                         <input 
                           type="range" min="1" max="30" 
                           value={aiQuantity} 
                           onChange={(e) => setAiQuantity(Number(e.target.value))} 
                           className="flex-1 accent-purple-500" 
                         />
                         <span className="text-xl font-black text-purple-600 dark:text-purple-400 w-8 text-center">{aiQuantity}</span>
                      </div>
                   </div>

                   <button 
                     onClick={handleAIGenerate} 
                     disabled={isLoading} 
                     className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[2rem] font-black uppercase text-lg shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {isLoading ? <div className="animate-spin w-6 h-6 border-4 border-white/30 border-t-white rounded-full"></div> : <><Zap size={24} fill="currentColor" /> Gerar Preview</>}
                   </button>
                   
                   <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-800/30">
                      <p className="text-[9px] font-bold text-purple-700 dark:text-purple-300 uppercase leading-relaxed">
                         <Sparkles size={10} className="inline mr-1" />
                         Dica: Suba PDFs de doutrina ou fotos do seu caderno para extração automática via OCR.
                      </p>
                   </div>
                </div>
             </div>
         </div>
      )}

      {/* --- AI PREVIEW MODE --- */}
      {mode === 'ai_create' && isPreviewMode && (
         <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-purple-500 shadow-2xl relative overflow-hidden">
             <div className="flex items-center justify-between mb-8 relative z-10">
               <div className="flex items-center gap-4">
                 <button onClick={() => setIsPreviewMode(false)} className="p-3"><ArrowLeft className="w-8 h-8 text-slate-400" /></button>
                 <div>
                    <div className="flex items-center gap-2">
                       <Sparkles className="text-purple-500 w-6 h-6" />
                       <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase">Revisão de Cards</h3>
                    </div>
                    <p className="text-sm font-bold text-slate-500">Edite ou remova os cards gerados antes de salvar.</p>
                 </div>
               </div>
               <button 
                 onClick={handleSaveAIGeneratedCards} 
                 disabled={isLoading || aiGeneratedCardsPreview.length === 0}
                 className="py-4 px-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[2rem] font-black uppercase text-sm shadow-xl hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
               >
                 {isLoading ? <div className="animate-spin w-5 h-5 border-4 border-white/30 border-t-white rounded-full"></div> : <><Save size={18} /> Salvar {aiGeneratedCardsPreview.length} Cards</>}
               </button>
             </div>

             <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {aiGeneratedCardsPreview.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-lg font-bold">Nenhum card para revisar.</p>
                  </div>
                ) : (
                  aiGeneratedCardsPreview.map((card, index) => (
                    <div key={index} className="bg-slate-50 dark:bg-black/30 p-6 rounded-[2rem] border-2 border-slate-200 dark:border-white/10 relative group">
                       <button 
                         onClick={() => removePreviewCard(index)}
                         className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                         title="Remover Card"
                       >
                         <X size={20} />
                       </button>
                       <div className="space-y-4 pr-10">
                         <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Pergunta {index + 1}</label>
                           <input 
                             value={card.front} 
                             onChange={(e) => updatePreviewCard(index, 'front', e.target.value)} 
                             className="w-full p-3 bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-purple-500" 
                           />
                         </div>
                         <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Resposta</label>
                           <textarea 
                             value={card.back} 
                             onChange={(e) => updatePreviewCard(index, 'back', e.target.value)} 
                             className="w-full h-24 p-3 bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl font-medium resize-none outline-none" 
                           />
                         </div>
                         <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 mb-1 block">Notas (Opcional)</label>
                           <textarea 
                             value={card.notes || ''} 
                             onChange={(e) => updatePreviewCard(index, 'notes', e.target.value)} 
                             placeholder="Adicione mnemônicos ou observações..."
                             className="w-full h-16 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/30 rounded-xl font-medium resize-none outline-none" 
                           />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Fonte / Artigo</label>
                             <div className="flex items-center gap-2 p-3 bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl">
                               <Paperclip size={14} className="text-slate-400" />
                               <input 
                                 value={card.source || ''} 
                                 onChange={(e) => updatePreviewCard(index, 'source', e.target.value)} 
                                 placeholder="Ex: Art. 5º, CF"
                                 className="bg-transparent border-none outline-none flex-1 font-bold text-xs" 
                               />
                             </div>
                           </div>
                           <div>
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Tags (separadas por vírgula)</label>
                             <div className="flex items-center gap-2 p-3 bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl">
                               <Archive size={14} className="text-slate-400" />
                               <input 
                                 value={card.tags?.join(', ') || ''} 
                                 onChange={(e) => updatePreviewCard(index, 'tags', e.target.value.split(',').map((t: string) => t.trim()))} 
                                 placeholder="Ex: #prazos, #cpc"
                                 className="bg-transparent border-none outline-none flex-1 font-bold text-xs" 
                               />
                             </div>
                           </div>
                         </div>
                       </div>
                    </div>
                  ))
                )}
             </div>
         </div>
      )}

      {mode === 'bulk' && (
        <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-usp-blue shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setMode('browse')} className="p-3"><ArrowLeft className="w-8 h-8 text-slate-400" /></button>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Importação em Lote</h3>
          </div>
          
          <div className="space-y-6">
            <p className="text-sm font-bold text-slate-500">Cole seus dados abaixo (JSON, CSV ou Texto Simples). <br/> Exemplo: <code className="bg-slate-100 dark:bg-white/5 p-1 rounded">Pergunta | Resposta</code></p>
            
            <textarea 
              value={bulkInput} 
              onChange={(e) => setBulkInput(e.target.value)} 
              placeholder={`Cole aqui seus cards...\n\nExemplo CSV: Pergunta; Resposta\nExemplo JSON: [{"front": "P", "back": "R"}]\nExemplo Simples: Pergunta | Resposta`}
              className="w-full h-64 p-8 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-white/10 rounded-[2.5rem] font-bold resize-none outline-none focus:border-usp-blue transition-all" 
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={handleBulkImport} disabled={isLoading} className="py-6 bg-usp-blue text-white rounded-[2rem] font-black uppercase text-lg shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                {isLoading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                Importar Texto
              </button>
              
              <div className="relative group">
                <input 
                  type="file" 
                  className="hidden" 
                  id="anki-upload" 
                  accept=".apkg,.csv,.json" 
                  onChange={handleAnkiImport}
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
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4">Formatos Suportados</h4>
            <ul className="space-y-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Anki (.apkg) - Importação nativa de baralhos</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> CSV / TXT - Use ponto e vírgula (;) ou barra (|)</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> JSON - Formato estruturado de objetos</li>
            </ul>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-sanfran-rubi shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setMode('browse')} className="p-3"><ArrowLeft className="w-8 h-8 text-slate-400" /></button>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Criação Manual</h3>
          </div>
          <div className="space-y-6" onPaste={handlePaste}>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disciplina</label>
                <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none" />
            </div>
            <input value={manualFront} onChange={(e) => setManualFront(e.target.value)} placeholder="Enunciado / Pergunta" className="w-full p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none" />
            <div className="relative">
              <textarea value={manualBack} onChange={(e) => setManualBack(e.target.value)} placeholder="Doutrina / Resposta, Fluxograma, Tabela..." className="w-full h-32 p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-3xl font-bold resize-none outline-none" />
              <div className="absolute bottom-4 right-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                Dica: Você pode colar (Ctrl+V) uma imagem aqui
              </div>
            </div>
            {manualImage && (
              <div className="relative mt-4">
                <img src={manualImage} alt="Uploaded" className="max-w-full h-auto rounded-xl border border-slate-200 dark:border-white/10" />
                <button onClick={() => setManualImage(null)} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"><X size={16} /></button>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="mt-4 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sanfran-rubi file:text-white hover:file:bg-sanfran-rubiDark"
            />
            <textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Notas Pessoais (Opcional) - Mnemônicos, dicas, etc." className="w-full h-24 p-6 bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-200 dark:border-yellow-700/30 rounded-3xl font-bold resize-none outline-none placeholder:text-yellow-600/50" />
            <button onClick={handleManualCreate} className="w-full py-6 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-lg shadow-xl flex items-center justify-center gap-3">
              <Gavel className="w-6 h-6" /> Protocolar Card
            </button>
            <p className="text-center text-[10px] font-black uppercase text-slate-400">Você pode criar vários cards seguidos. Clique no botão acima para salvar e continuar.</p>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-sanfran-rubiDark rounded-[3rem] p-8 w-full max-w-2xl shadow-2xl border-4 border-slate-100 dark:border-sanfran-rubi/30 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 right-0 p-6">
              <button onClick={() => setEditingCard(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Editar Flashcard</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Pergunta</label>
                <input 
                  value={editingCard.front} 
                  onChange={(e) => setEditingCard({...editingCard, front: e.target.value})} 
                  className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Resposta</label>
                <textarea 
                  value={editingCard.back} 
                  onChange={(e) => setEditingCard({...editingCard, back: e.target.value})} 
                  className="w-full h-32 p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold resize-none outline-none" 
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Imagem (Opcional)</label>
                {editingCard.image ? (
                  <div className="relative mb-2">
                    <img src={editingCard.image} alt="Card" className="max-h-40 rounded-xl border border-slate-200 dark:border-white/10" />
                    <button 
                      onClick={() => setEditingCard({...editingCard, image: undefined})} 
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
                          setEditingCard({...editingCard, image: event.target?.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                    className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 mb-2 block">Notas Pessoais</label>
                <textarea 
                  value={editingCard.notes || ''} 
                  onChange={(e) => setEditingCard({...editingCard, notes: e.target.value})} 
                  placeholder="Adicione mnemônicos, dicas ou observações..."
                  className="w-full h-24 p-4 bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-200 dark:border-yellow-700/30 rounded-2xl font-bold resize-none outline-none" 
                />
              </div>
              <button 
                onClick={handleEditCard} 
                className="w-full py-4 mt-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm shadow-xl hover:bg-sanfran-rubiDark transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PREVIEW MODAL */}
      {isPreviewModalOpen && previewDeck && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-sanfran-rubiDark rounded-[3.5rem] w-full max-w-3xl shadow-2xl border-4 border-purple-500/30 relative overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-100 dark:border-white/5 bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
              <div className="flex justify-between items-center mb-4">
                <Activity className="w-10 h-10 text-white/20" />
                <button onClick={() => setIsPreviewModalOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <h3 className="text-3xl font-black tracking-tighter capitalize">
                {new Date(selectedHeatmapDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-emerald-100 font-bold text-sm mt-2 uppercase tracking-widest">Resumo Diário de Estudo</p>
            </div>
            
            <div className="p-10">
              {isDailySummaryLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Carregando resumo...</p>
                </div>
              ) : dailySummaryData.length === 0 ? (
                <div className="text-center py-12 border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem]">
                  <Activity className="w-16 h-16 text-slate-200 dark:text-white/10 mx-auto mb-4" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhuma atividade registrada para este dia.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 text-center">
                      <span className="text-3xl font-black text-slate-900 dark:text-white block mb-1">{dailySummaryData.length}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cards Revisados</span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 block mb-1">
                        {Math.round((dailySummaryData.filter(s => s.rating && s.rating >= 3).length / dailySummaryData.length) * 100) || 0}%
                      </span>
                      <span className="text-[9px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">Acerto (Bom/Fácil)</span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-500/20 text-center">
                      <span className="text-3xl font-black text-blue-600 dark:text-blue-400 block mb-1">
                        {Math.round(dailySummaryData.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 60)}m
                      </span>
                      <span className="text-[9px] font-black text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">Tempo Total</span>
                    </div>
                  </div>

                  {/* Activity by Folder */}
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FolderIcon size={14} /> Atividade por Disciplina
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(
                        dailySummaryData.reduce((acc: any, curr: any) => {
                          const folderId = curr.folder_id || curr.subject_id;
                          acc[folderId] = (acc[folderId] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([folderId, count]: [string, any]) => {
                        const folder = folders?.find(f => f.id === folderId);
                        const subject = subjects?.find(s => s.id === folderId);
                        const name = folder?.name || subject?.name || 'Geral';
                        const color = folder?.color || 'border-l-slate-500';
                        
                        return (
                          <div key={folderId} className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-l-4 ${color}`}>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{name}</span>
                            <span className="text-xs font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500">{count} cards</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* DAILY SUMMARY MODAL */}
      {selectedHeatmapDate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-100 dark:border-white/5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <div className="flex justify-between items-center mb-4">
                <Activity className="w-10 h-10 text-white/20" />
                <button onClick={() => setSelectedHeatmapDate(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <h3 className="text-3xl font-black tracking-tighter capitalize">
                {new Date(selectedHeatmapDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-emerald-100 font-bold text-sm mt-2 uppercase tracking-widest">Resumo Diário de Estudo</p>
            </div>
            
            <div className="p-10">
              {isDailySummaryLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Carregando resumo...</p>
                </div>
              ) : dailySummaryData.length === 0 ? (
                <div className="text-center py-12 border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem]">
                  <Activity className="w-16 h-16 text-slate-200 dark:text-white/10 mx-auto mb-4" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhuma atividade registrada para este dia.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 text-center">
                      <span className="text-3xl font-black text-slate-900 dark:text-white block mb-1">{dailySummaryData.length}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cards Revisados</span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 block mb-1">
                        {Math.round((dailySummaryData.filter(s => s.rating && s.rating >= 3).length / dailySummaryData.length) * 100) || 0}%
                      </span>
                      <span className="text-[9px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">Acerto (Bom/Fácil)</span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-500/20 text-center">
                      <span className="text-3xl font-black text-blue-600 dark:text-blue-400 block mb-1">
                        {Math.round(dailySummaryData.reduce((acc, curr) => acc + (curr.duration || 0), 0) / 60)}m
                      </span>
                      <span className="text-[9px] font-black text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">Tempo Total</span>
                    </div>
                  </div>

                  {/* Activity by Folder */}
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FolderIcon size={14} /> Atividade por Disciplina
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(
                        dailySummaryData.reduce((acc: any, curr: any) => {
                          const folderId = curr.folder_id || curr.subject_id;
                          acc[folderId] = (acc[folderId] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([folderId, count]: [string, any]) => {
                        const folder = folders?.find(f => f.id === folderId);
                        const subject = subjects?.find(s => s.id === folderId);
                        const name = folder?.name || subject?.name || 'Geral';
                        const color = folder?.color || 'border-l-slate-500';
                        
                        return (
                          <div key={folderId} className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-l-4 ${color}`}>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{name}</span>
                            <span className="text-xs font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500">{count} cards</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
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

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 ${
              toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
              toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' :
              'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
            {toast.type === 'error' && <AlertCircle className="w-6 h-6" />}
            {toast.type === 'info' && <Info className="w-6 h-6" />}
            <span className="font-black uppercase text-xs tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM MODAL */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="p-10">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">{confirmModal.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{confirmModal.message}</p>
              </div>
              <div className="p-8 bg-slate-50 dark:bg-white/5 flex gap-4">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest border-2 border-slate-200 dark:border-white/10"
                >
                  {confirmModal.cancelText || 'Cancelar'}
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20"
                >
                  {confirmModal.confirmText || 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
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
    </div>
  );
};

export default Anki;
