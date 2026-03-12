import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Question, UserProgress, Notebook, Folder, Flashcard } from '../types';
import { sampleQuestions } from './sampleQuestions';
import { NotebookModal } from './NotebookModal';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { GEMINI_MODEL, extractPrecedent } from '../services/geminiService';
import Markdown from 'react-markdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { 
  BookOpen, 
  CheckCircle2, 
  Check,
  XCircle, 
  ChevronRight, 
  ChevronLeft,
  Filter,
  Plus,
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
  Trophy,
  Clock,
  BarChart3,
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
  Send
} from 'lucide-react';
import { GlossaryText } from './GlossaryText.tsx';
import { GlossaryPopover } from './GlossaryPopover.tsx';
import { fetchTermDefinition } from '../services/geminiService';
import { GlossaryTerm } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface QuestionBankProps {
  userId: string;
  onCorrectAnswer?: () => void;
  folders?: Folder[];
  flashcards?: Flashcard[];
}

const QuestionBank: React.FC<QuestionBankProps> = ({ userId, onCorrectAnswer, folders = [], flashcards = [] }) => {
  const navigate = useNavigate();
  // ... (rest of the component)

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    // Wait for React to render the hidden container
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let currentY = margin;
      
      const addWatermark = (page: number) => {
        doc.setPage(page);
        
        // Double Border
        doc.setDrawColor(122, 0, 0); // Bordô
        doc.setLineWidth(0.5);
        doc.rect(5, 5, 200, 287);
        doc.setLineWidth(0.2);
        doc.rect(7, 7, 196, 283);

        // Corner Ornaments
        doc.setLineWidth(0.5);
        doc.line(5, 10, 10, 5); // Top Left
        doc.line(205, 5, 200, 10); // Top Right
        doc.line(5, 282, 10, 287); // Bottom Left
        doc.line(205, 287, 200, 282); // Bottom Right

        // Watermark via Text (Diagonal, 4% opacity)
        doc.setGState(new (doc as any).GState({opacity: 0.04}));
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(60);
        doc.setFont('helvetica', 'bold');
        doc.text('SANFRAN ACADEMY', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
        
        // Reset state to avoid bugging the rest of the PDF
        doc.setGState(new (doc as any).GState({opacity: 1.0}));
        doc.setTextColor(0, 0, 0);
      };

      // Native PDF Generation for Questions
      let processedElements = 0;
      const totalElements = filteredQuestions.length + 3; // cover + header + questions + answer key

      // Capture Cover
      const coverEl = document.getElementById('pdf-cover');
      if (coverEl) {
        let canvas: HTMLCanvasElement | null = await html2canvas(coverEl, { scale: 1.5, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        canvas = null; // Free memory
        const imgProps = doc.getImageProperties(imgData);
        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
        
        doc.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgHeight, undefined, 'FAST');
        processedElements++;
        setExportProgress(Math.round((processedElements / totalElements) * 100));
        
        doc.addPage();
        currentY = margin;
      }

      // Capture Header
      const headerEl = document.getElementById('pdf-header');
      if (headerEl) {
        let canvas: HTMLCanvasElement | null = await html2canvas(headerEl, { scale: 1.5, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        canvas = null; // Free memory
        const imgProps = doc.getImageProperties(imgData);
        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
        
        doc.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgHeight, undefined, 'FAST');
        currentY += imgHeight + 10;
        processedElements++;
        setExportProgress(Math.round((processedElements / totalElements) * 100));
      }

      // Native PDF Generation for Questions
      for (let i = 0; i < filteredQuestions.length; i++) {
        const q = filteredQuestions[i];
        
        // Calculate text heights
        doc.setFontSize(11);
        doc.setFont('times', 'normal');
        
        const statementLines = doc.splitTextToSize(q.statement, contentWidth - 20);
        const statementHeight = statementLines.length * 6;
        
        let optionsHeight = 0;
        const optionsLines: string[][] = [];
        
        q.options.forEach(opt => {
           const lines = doc.splitTextToSize(opt, contentWidth - 30);
           optionsLines.push(lines);
           optionsHeight += lines.length * 6 + 4; // 4mm padding between options
        });
        
        const cardHeight = statementHeight + optionsHeight + 20; // paddings
        
        // Check page break
        if (currentY + cardHeight > pageHeight - margin) {
           doc.addPage();
           currentY = margin;
        }
        
        // Draw Card Border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, currentY, contentWidth, cardHeight, 3, 3, 'FD');
        
        let cardY = currentY + 10;
        
        // Draw Question Number
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(122, 0, 0);
        doc.text(`${i + 1}.`, margin + 5, cardY);
        
        // Draw Statement
        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(statementLines, margin + 15, cardY, { align: 'left', maxWidth: contentWidth - 20 });
        
        cardY += statementHeight + 5;
        
        // Draw Options
        q.options.forEach((opt, optIdx) => {
           const lines = optionsLines[optIdx];
           
           // Draw checkbox
           doc.setDrawColor(150, 150, 150);
           doc.rect(margin + 15, cardY - 4, 4, 4);
           
           // Draw Option Letter
           doc.setFont('helvetica', 'bold');
           doc.setFontSize(10);
           doc.setTextColor(100, 100, 100);
           doc.text(String.fromCharCode(65 + optIdx), margin + 17, cardY - 0.5, { align: 'center' });
           
           // Draw Option Text
           doc.setFont('times', 'normal');
           doc.setFontSize(11);
           doc.setTextColor(50, 50, 50);
           doc.text(lines, margin + 22, cardY, { align: 'left', maxWidth: contentWidth - 30 });
           
           cardY += lines.length * 6 + 4;
        });
        
        currentY += cardHeight + 5;
        
        processedElements++;
        setExportProgress(Math.round((processedElements / totalElements) * 100));
        
        if ((i + 1) % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Answer Key
      doc.addPage();
      currentY = margin;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(122, 0, 0);
      doc.text('Cartão de Respostas', pageWidth / 2, currentY + 10, { align: 'center' });
      
      let akCurrentY = currentY + 25;
      const cols = 2;
      const colWidth = contentWidth / cols;
      const rowHeight = 12;
      
      doc.setFontSize(11);
      
      for (let i = 0; i < filteredQuestions.length; i++) {
        const q = filteredQuestions[i];
        const col = i % cols;
        
        if (col === 0 && i > 0) {
          akCurrentY += rowHeight;
        }
        
        if (akCurrentY > pageHeight - margin - 20 && col === 0) {
           doc.addPage();
           akCurrentY = margin + 10;
        }
        
        const x = margin + col * colWidth;
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`${i + 1}.`, x + 5, akCurrentY);
        
        for (let lIdx = 0; lIdx < Math.min(5, q.options.length); lIdx++) {
           const letterX = x + 20 + lIdx * 12;
           const isCorrect = q.correct_answer === lIdx;
           
           if (isCorrect) {
             doc.setFillColor(122, 0, 0);
             doc.circle(letterX + 2, akCurrentY - 1.5, 3.5, 'F');
             doc.setTextColor(255, 255, 255);
           } else {
             doc.setDrawColor(150, 150, 150);
             doc.circle(letterX + 2, akCurrentY - 1.5, 3.5, 'S');
             doc.setTextColor(100, 100, 100);
           }
           
           doc.setFontSize(9);
           doc.text(String.fromCharCode(65 + lIdx), letterX + 2, akCurrentY, { align: 'center' });
        }
      }
      
      processedElements++;
      setExportProgress(Math.round((processedElements / totalElements) * 100));

      // Add watermark and page numbers to all pages
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        addWatermark(i);
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        doc.text('SanFran Academy - XI de Agosto', pageWidth / 2, pageHeight - 15, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(`Página ${i}`, pageWidth / 2, pageHeight - 11, { align: 'center' });
      }

      // Final delay to allow memory cleanup before saving
      await new Promise(resolve => setTimeout(resolve, 500));
      
      doc.save('simulado-sanfran.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar o PDF. Verifique o console para mais detalhes.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedExamBoard, setSelectedExamBoard] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'difficulty_asc' | 'difficulty_desc'>('newest');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<string[]>([]);
  const [correctQuestions, setCorrectQuestions] = useState<string[]>([]);
  const [questionStatus, setQuestionStatus] = useState<'all' | 'resolved' | 'unresolved' | 'correct' | 'wrong'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showXRay, setShowXRay] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'single'>('list');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [questionStats, setQuestionStats] = useState<Record<string, { totalAttempts: number, correctAttempts: number, lastAttemptCorrect: boolean }>>({});
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
  const [mockResults, setMockResults] = useState<{
    score: number;
    total: number;
    timeSpent: number;
    subjectStats: { subject: string; correct: number; total: number; confidence: Record<string, number>; correctConfidence: Record<string, number> }[];
    avgTimePerQuestion: number;
    confidenceStats: { certeza: number; duvida: number; chute: number };
    luckyGuesses: string[];
    doubtGuesses: string[];
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startMock = (questionsToUse: Question[], durationMinutes: number) => {
    setMockQuestions(questionsToUse);
    setMockTimeRemaining(durationMinutes * 60);
    setMockDurationMinutes(durationMinutes);
    setIsMockMode(true);
    setIsMockFinished(false);
    setMockAnswers({});
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
      subjectStats,
      avgTimePerQuestion: timeSpent / (Object.keys(mockAnswers).length || 1),
      confidenceStats,
      luckyGuesses,
      doubtGuesses
    });
    
    setIsMockFinished(true);
    
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
      confidence_levels: currentConfidenceLevels
    });
  };

  useEffect(() => {
    finishMockRef.current = finishMock;
  }, [finishMock]);

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
  const [aiConfig, setAiConfig] = useState({
    subject: '',
    topic: '',
    context: '',
    count: 3,
    difficulty: 'media' as 'facil' | 'media' | 'dificil',
    examStyle: 'OAB (FGV)' as 'OAB (FGV)' | 'Magistratura/Promotoria' | 'Acadêmico (SanFran)',
    legalFocus: [] as string[],
    statementType: 'Caso Prático (Situação Hipotética)' as 'Caso Prático (Situação Hipotética)' | 'Enunciado Direto',
    baseOnFlashcards: false,
    selectedFolderId: '',
    tribunal: 'Ambos' as 'Jurisprudência STF' | 'Jurisprudência STJ' | 'Ambos',
    yearFilter: 'Últimos 2 anos' as '2025-2026' | 'Últimos 2 anos'
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
        const { data, error } = await supabase
          .from('folders')
          .insert({
            user_id: userId,
            name: 'Precedentes Relevantes',
            color: '#8b5cf6' // Purple
          })
          .select()
          .single();
        
        if (error) throw error;
        folderId = data.id;
      }

      // 2. Create the flashcard
      const commentary = aiCommentary[question.id];
      const front = `[PRECEDENTE] ${question.statement}`;
      let back = `**GABARITO: ${String.fromCharCode(65 + question.correct_answer)}**\n\n`;
      
      if (commentary) {
        back += `⚖️ **Fundamentação:** ${commentary.legalBasis}\n\n`;
        back += `❌ **Análise:** ${commentary.alternativesAnalysis}\n\n`;
        back += `💡 **Pulo do Gato:** ${commentary.mnemonic}`;
      } else {
        back += `Explicação: ${question.explanation || 'Nenhuma explicação fornecida.'}`;
      }

      const { error: cardError } = await supabase
        .from('flashcards')
        .insert({
          user_id: userId,
          folder_id: folderId,
          front,
          back,
          subject: question.subject,
          topic: question.topic,
          next_review: new Date().toISOString()
        });

      if (cardError) throw cardError;

      showNotification('Salvo em Precedentes Relevantes!', 'success');
    } catch (error: any) {
      console.error('Error saving precedent:', error);
      showNotification(`Erro ao salvar precedente: ${error.message}`, 'error');
    } finally {
      setIsSavingPrecedent(prev => ({ ...prev, [question.id]: false }));
    }
  };
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    subject: '',
    topic: '',
    statement: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: '',
    difficulty: 'media',
    exam_board: '',
    year: new Date().getFullYear().toString()
  });

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
          console.log("[QuestionBank] User progress changed remotely, fetching...");
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
          console.log("[QuestionBank] Notebooks changed remotely, fetching...");
          fetchNotebooks();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(notebookChannel);
      };
    }
  }, [userId]);

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
            lastAttemptCorrect: row.last_attempt_correct
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
      console.log('Fetching user progress for userId:', userId);
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user progress:', error);
        return;
      }

      console.log('User progress fetched:', data);
      if (data) {
        setUserProgress(data);
        setFavorites(data.favorites || []);
        setWrongQuestions(data.wrong_question_ids || []);
        setCorrectQuestions(data.correct_questions || []);
        setNotes(data.notes || {});
        setCorrectCount(data.correct_count || 0);
        setWrongCount(data.wrong_count || 0);
        setErrorMastery(data.error_mastery || {});
      }
    } catch (err) {
      console.error('Failed to sync progress:', err);
    }
  };

  const syncUserProgress = async (updates: any) => {
    console.log('DEBUG: syncUserProgress called with:', updates);
    console.log('DEBUG: Current userId:', userId);
    try {
      // Get current state to ensure we don't overwrite with old data
      const { data: current, error: fetchError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('DEBUG: Error fetching current progress:', fetchError);
      }

      const payload = {
        user_id: userId,
        favorites: updates.favorites !== undefined ? updates.favorites : (favorites.length > 0 ? favorites : (current?.favorites || [])),
        wrong_question_ids: updates.wrongQuestions !== undefined ? updates.wrongQuestions : (wrongQuestions.length > 0 ? wrongQuestions : (current?.wrong_question_ids || [])),
        correct_questions: updates.correctQuestions !== undefined ? updates.correctQuestions : (correctQuestions.length > 0 ? correctQuestions : (current?.correct_questions || [])),
        notes: updates.notes !== undefined ? updates.notes : (Object.keys(notes).length > 0 ? notes : (current?.notes || {})),
        correct_count: updates.correctCount !== undefined ? updates.correctCount : (correctCount > 0 ? correctCount : (current?.correct_count || 0)),
        wrong_count: updates.wrongCount !== undefined ? updates.wrongCount : (wrongCount > 0 ? wrongCount : (current?.wrong_count || 0)),
        error_mastery: updates.errorMastery !== undefined ? updates.errorMastery : (Object.keys(errorMastery).length > 0 ? errorMastery : (current?.error_mastery || {})),
        confidence_levels: updates.confidence_levels !== undefined ? updates.confidence_levels : (Object.keys(userProgress?.confidence_levels || {}).length > 0 ? userProgress?.confidence_levels : (current?.confidence_levels || {})),
        updated_at: new Date().toISOString()
      };

      console.log('DEBUG: Payload to upsert:', payload);

      const { data, error } = await supabase
        .from('user_progress')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (error) {
        console.error('DEBUG: Error syncing user progress:', error);
      } else {
        console.log('DEBUG: Sync successful! Data:', data);
      }
    } catch (err) {
      console.error('DEBUG: Unexpected error in syncUserProgress:', err);
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
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
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

  const [aiCommentary, setAiCommentary] = useState<Record<string, any>>({});
  const [followUpChat, setFollowUpChat] = useState<Record<string, { role: 'user' | 'assistant', text: string }[]>>({});
  const [isFollowUpLoading, setIsFollowUpLoading] = useState<Record<string, boolean>>({});
  const [followUpInput, setFollowUpInput] = useState<Record<string, string>>({});
  const [loadingAiCommentary, setLoadingAiCommentary] = useState<Record<string, boolean>>({});

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
      const chat = ai.chats.create({ model: "gemini-3-flash-preview" });
      
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
    if (aiCommentary[question.id]) return;

    try {
      setLoadingAiCommentary(prev => ({ ...prev, [question.id]: true }));
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
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        setAiCommentary(prev => ({ ...prev, [question.id]: data }));
        // Persist to Supabase
        supabase.from('questions').update({ explicacao_doutrinaria: data.doctrineAndContext }).eq('id', question.id).then();
      }
    } catch (error) {
      console.error('Error generating intelligent correction:', error);
    } finally {
      setLoadingAiCommentary(prev => ({ ...prev, [question.id]: false }));
    }
  };

  const handleCreateFlashcardFromError = (question: Question, selectedIndex?: number, isCorrect?: boolean) => {
    const commentary = aiCommentary[question.id];
    const front = `[QUESTÃO] ${question.statement}`;
    
    let back = `**GABARITO: ${String.fromCharCode(65 + question.correct_answer)}**\n\n`;
    
    if (selectedIndex !== undefined) {
      back += `**Sua Resposta: ${String.fromCharCode(65 + selectedIndex)} (${isCorrect ? 'Correta' : 'Incorreta'})**\n\n`;
    }

    if (commentary) {
      back += `⚖️ **Fundamentação:** ${commentary.legalBasis}\n\n`;
      back += `❌ **Análise:** ${commentary.alternativesAnalysis}\n\n`;
      back += `💡 **Pulo do Gato:** ${commentary.mnemonic}`;
    } else {
      back += `Explicação: ${question.explanation || 'Nenhuma explicação fornecida.'}`;
    }

    const flashcardData = {
      front,
      back,
      subject: question.subject,
      topic: question.topic,
    };

    navigate('/anki', { state: { newFlashcard: flashcardData } });
  };

  // Juridiquês Translator States
  const [selectedText, setSelectedText] = useState<string>('');
  const [juridiquesExplanation, setJuridiquesExplanation] = useState<string | null>(null);
  const [loadingJuridiquesExplanation, setLoadingJuridiquesExplanation] = useState(false);
  const [showJuridiquesModal, setShowJuridiquesModal] = useState(false);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist yet, we'll use samples
        if (error.code === '42P01') {
          console.log('Table questions does not exist yet, using samples');
          const questionsWithIds = sampleQuestions.map((q, i) => ({
            ...q,
            id: (q as any).id || `sample-${i}`
          })) as Question[];
          setQuestions(questionsWithIds);
          updateFilters(questionsWithIds);
        } else {
          throw error;
        }
      } else if (data) {
        if (data.length === 0) {
          // Fallback to samples if DB is empty
          const questionsWithIds = sampleQuestions.map((q, i) => ({
            ...q,
            id: (q as any).id || `sample-${i}`
          })) as Question[];
          setQuestions(questionsWithIds);
          updateFilters(questionsWithIds);
        } else {
          setQuestions(data);
          updateFilters(data);
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      // Final fallback
      const questionsWithIds = sampleQuestions.map((q, i) => ({
        ...q,
        id: (q as any).id || `sample-${i}`
      })) as Question[];
      setQuestions(questionsWithIds);
      updateFilters(questionsWithIds);
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (data: Question[]) => {
    // Extract unique subjects and topics
    const uniqueSubjects = Array.from(new Set(data.map(q => q.subject))).filter(Boolean);
    setSubjects(uniqueSubjects);
    
    const uniqueTopics = Array.from(new Set(data.map(q => q.topic))).filter(Boolean);
    setTopics(uniqueTopics);

    const uniqueExamBoards = Array.from(new Set(data.map(q => q.exam_board))).filter(Boolean) as string[];
    setExamBoards(uniqueExamBoards);

    const uniqueYears = Array.from(new Set(data.map(q => q.year?.toString()))).filter(Boolean) as string[];
    setYears(uniqueYears.sort((a, b) => b.localeCompare(a)));
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!newQuestion.subject || !newQuestion.statement || newQuestion.options?.some(o => !o)) {
      showNotification('Preencha todos os campos obrigatórios e as 4 alternativas.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Sanitize question to ensure only valid columns are sent
      const sanitizedInitialQuestion = {
        user_id: user.id,
        subject: newQuestion.subject,
        topic: newQuestion.topic,
        statement: newQuestion.statement,
        options: newQuestion.options,
        correct_answer: newQuestion.correct_answer,
        explanation: newQuestion.explanation,
        difficulty: newQuestion.difficulty,
        exam_board: newQuestion.exam_board,
        year: newQuestion.year?.toString()
      };

      let { data, error } = await supabase
        .from('questions')
        .insert([sanitizedInitialQuestion])
        .select()
        .single();

      // Fallback for missing exam_board column
      if (error && error.message?.includes("exam_board")) {
        console.warn("Column 'exam_board' not found, retrying without it...");
        const { exam_board, ...sanitizedQuestion } = sanitizedInitialQuestion;
        const retry = await supabase
          .from('questions')
          .insert([sanitizedQuestion])
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      if (data) {
        setQuestions([data, ...questions]);
        showNotification('Questão adicionada com sucesso!', 'success');
        // Reset form
        setNewQuestion({
          subject: '',
          topic: '',
          statement: '',
          options: ['', '', '', ''],
          correct_answer: 0,
          explanation: '',
          difficulty: 'media',
          exam_board: '',
          year: new Date().getFullYear().toString()
        });
        
        if (!subjects.includes(data.subject)) {
          setSubjects([...subjects, data.subject]);
        }
        if (data.topic && !topics.includes(data.topic)) {
          setTopics([...topics, data.topic]);
        }
        if (data.exam_board && !examBoards.includes(data.exam_board)) {
          setExamBoards([...examBoards, data.exam_board]);
        }
        if (data.year && !years.includes(data.year.toString())) {
          setYears([...years, data.year.toString()].sort((a, b) => b.localeCompare(a)));
        }
        
        setViewMode('list');
      }
    } catch (error: any) {
      console.error('Error adding question:', error);
      showNotification(`Erro ao adicionar questão: ${error.message || JSON.stringify(error)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
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
      const prompt = `Com base nestes temas que o aluno errou muito: ${topics}, gere 5 novas questões inéditas de nível Médio/Difícil para reforçar o aprendizado. Retorne em formato JSON array de objetos com: statement, options (array de 4 strings), correct_answer (index 0-3), explanation, subject, topic, difficulty.`;
      
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const newQuestions = JSON.parse(response.text || '[]');
      
      // 3. Save new questions with is_reinforcement: true
      const questionsToSave = newQuestions.map((q: any) => ({
        ...q,
        user_id: userId,
        difficulty: 'media',
        is_reinforcement: true
      }));

      const { error: insertError } = await supabase.from('questions').insert(questionsToSave);
      if (insertError) throw insertError;

      showNotification('Reforço gerado com sucesso!', 'success');
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

      for (let i = 0; i < totalQuestions; i += chunkSize) {
        const currentBatchSize = Math.min(chunkSize, totalQuestions - i);
        setGeneratingStatus(`Gerando lote ${Math.floor(i / chunkSize) + 1} de ${Math.ceil(totalQuestions / chunkSize)}... (${i + currentBatchSize}/${totalQuestions} concluídas)`);

        const prompt = `Crie ${currentBatchSize} questões de múltipla escolha de nível ${aiConfig.difficulty} sobre a matéria "${aiConfig.subject}" e tópico "${aiConfig.topic}".
        Estilo de Prova: ${aiConfig.examStyle}.
        Foco Jurídico: ${aiConfig.legalFocus.join(', ') || 'Geral'}.
        Tipo de Enunciado: ${aiConfig.statementType}.
        ${jurisprudencePrompt}
        ${contextFromFlashcards}
        ${contextFromText}
        
        Cada questão deve ter 5 alternativas (A, B, C, D, E).
        A explicação deve ser EXTREMAMENTE detalhada, contendo uma análise individual para cada alternativa (A, B, C, D, E), explicando por que a alternativa correta está certa e por que cada uma das outras alternativas está incorreta, fundamentando com base no foco jurídico selecionado (${aiConfig.legalFocus.join(', ') || 'Lei, Jurisprudência e Doutrina'}).
        
        Inclua também uma banca real compatível com o estilo selecionado e o ano atual.
        Retorne as questões no formato JSON.`;

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
                    description: "As 5 alternativas da questão"
                  },
                  correct_answer: { type: Type.INTEGER, description: "O índice da alternativa correta (0 a 4)" },
                  explanation: { type: Type.STRING, description: "Explicação detalhada de cada alternativa (A, B, C, D, E)" },
                  difficulty: { type: Type.STRING, description: "A dificuldade: 'facil', 'media' ou 'dificil'" },
                  exam_board: { type: Type.STRING, description: "A banca examinadora" },
                  year: { type: Type.STRING, description: "O ano da questão" }
                },
                required: ["subject", "topic", "statement", "options", "correct_answer", "explanation", "difficulty", "exam_board", "year"]
              }
            }
          }
        });

        if (response.text) {
          allGeneratedQuestions.push(...JSON.parse(response.text));
        }

        if (i + chunkSize < totalQuestions) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      if (allGeneratedQuestions.length > 0) {
        const sanitizedInitialQuestions = allGeneratedQuestions.map((q: any) => ({
          user_id: userId,
          subject: q.subject,
          topic: q.topic,
          statement: q.statement,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          exam_board: q.exam_board,
          year: q.year?.toString()
        }));
        // ... (rest of the insertion logic) ...

        let { data, error } = await supabase
          .from('questions')
          .insert(sanitizedInitialQuestions)
          .select();

        // Fallback for missing exam_board column
        if (error && error.message?.includes("exam_board")) {
          console.warn("Column 'exam_board' not found, retrying without it...");
          const sanitizedQuestions = sanitizedInitialQuestions.map(({ exam_board, ...rest }: any) => rest);
          const retry = await supabase
            .from('questions')
            .insert(sanitizedQuestions)
            .select();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;

        if (data) {
          setQuestions([...data, ...questions]);
          setShowAIGenerator(false);
          showNotification(`${data.length} questões geradas com sucesso!`, 'success');
          
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

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(newQuestion.options || [])];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
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
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      });

      setAiLessonContent(response.text);
    } catch (error) {
      console.error('Error generating AI lesson:', error);
      showNotification('Erro ao gerar aula da IA.', 'error');
    } finally {
      setLoadingAiLesson(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchSearch = searchTerm === '' || 
      q.statement.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (q.explanation && q.explanation.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchSubject = selectedSubject === '' || selectedSubject === 'Todos' || q.subject === selectedSubject;
    const matchTopic = selectedTopic === '' || selectedTopic === 'Todos' || q.topic === selectedTopic;
    const matchDifficulty = difficultyFilter === '' || difficultyFilter === 'Todos' || q.difficulty === difficultyFilter;
    const matchExamBoard = selectedExamBoard === '' || selectedExamBoard === 'Todos' || q.exam_board === selectedExamBoard;
    const matchYear = selectedYear === '' || selectedYear === 'Todos' || q.year?.toString() === selectedYear;
    
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
    }
    
    return matchSearch && matchSubject && matchTopic && matchDifficulty && matchExamBoard && matchYear && matchNotebook && matchStatus;
  }).sort((a, b) => {
    if (sortBy === 'newest') return 0; // Already sorted by created_at desc from DB
    if (sortBy === 'oldest') return -1; // Reverse order
    
    const difficultyMap = { 'facil': 1, 'media': 2, 'dificil': 3 };
    const diffA = difficultyMap[a.difficulty] || 0;
    const diffB = difficultyMap[b.difficulty] || 0;
    
    if (sortBy === 'difficulty_asc') return diffA - diffB;
    if (sortBy === 'difficulty_desc') return diffB - diffA;
    
    return 0;
  });

  const currentQuestion = filteredQuestions[currentIndex];

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
      
      // Auto-advance in single view if not the last question
      if (viewMode === 'single' && currentIndex < filteredQuestions.length - 1) {
        setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
      }
      return;
    }
    
    setShowExplanation(true);
    
    // Trigger Intelligent Correction
    generateIntelligentCorrection(targetQuestion);
    
    // Auto-create flashcard for Doubt or Guess
    if (level === 'duvida' || level === 'chute') {
      showNotification('Dúvida/Chute detectado: Sugestão de Flashcard habilitada.', 'success');
    }

    if (index === targetQuestion.correct_answer) {
      supabase.from('questions').update({ status: 'Acertou' }).eq('id', targetQuestion.id).then();
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      if (onCorrectAnswer) onCorrectAnswer();
      
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
      const newStat = {
        totalAttempts: currentStat.totalAttempts + 1,
        correctAttempts: isCorrect ? currentStat.correctAttempts + 1 : currentStat.correctAttempts,
        lastAttemptCorrect: isCorrect
      };
      
      setQuestionStats(prev => ({ ...prev, [targetQuestion.id]: newStat }));
      
      supabase.from('user_question_stats').upsert({
        user_id: userId,
        question_id: targetQuestion.id,
        total_attempts: newStat.totalAttempts,
        correct_attempts: newStat.correctAttempts,
        last_attempt_correct: newStat.lastAttemptCorrect,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, question_id' }).then(({ error }) => {
        if (error) console.error('Error saving question stat:', error);
      });

      syncUserProgress({ 
        correctCount: newCount, 
        wrongQuestions: newWrong, 
        correctQuestions: newCorrect,
        errorMastery: newMastery,
        confidence_levels: currentConfidenceLevels
      });
    } else {
      supabase.from('questions').update({ status: 'Errado' }).eq('id', targetQuestion.id).then();
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
      const newStat = {
        totalAttempts: currentStat.totalAttempts + 1,
        correctAttempts: currentStat.correctAttempts,
        lastAttemptCorrect: false
      };
      
      setQuestionStats(prev => ({ ...prev, [targetQuestion.id]: newStat }));
      
      supabase.from('user_question_stats').upsert({
        user_id: userId,
        question_id: targetQuestion.id,
        total_attempts: newStat.totalAttempts,
        correct_attempts: newStat.correctAttempts,
        last_attempt_correct: newStat.lastAttemptCorrect,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, question_id' }).then(({ error }) => {
        if (error) console.error('Error saving question stat:', error);
      });

      syncUserProgress({ 
        wrongCount: newCount, 
        wrongQuestions: newWrong,
        errorMastery: newMastery,
        confidence_levels: currentConfidenceLevels
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
      syncUserProgress({ correctCount: 0, wrongCount: 0 });
      showNotification('Estatísticas zeradas', 'success');
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    }
  };

  const handlePrev = () => {
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

  // Mock Results View
  if (isMockMode && isMockFinished && mockResults) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 animate-in fade-in duration-500">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                  <Trophy className="text-emerald-600 dark:text-emerald-400" size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Resultado do Simulado</h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Desempenho Geral e Análise por Disciplina</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsMockMode(false);
                  setIsMockFinished(false);
                  setMockResults(null);
                  setViewMode('list');
                }}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Sair do Simulado
              </button>
              <button
                onClick={() => {
                  setIsMockFinished(false);
                  setQuestionStatus('wrong');
                  setViewMode('list');
                }}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-900/20"
              >
                Revisar Erros
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Score Card */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Certeza', value: mockResults.confidenceStats.certeza },
                        { name: 'Dúvida', value: mockResults.confidenceStats.duvida },
                        { name: 'Chute', value: mockResults.confidenceStats.chute }
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    {Math.round((mockResults.score / mockResults.total) * 100)}%
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verdadeiro Domínio</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-6 w-full">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Acertos</span>
                  <span className="text-2xl font-black text-emerald-600">{mockResults.score} / {mockResults.total}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Certeza Total</span>
                  <span className="text-2xl font-black text-emerald-500">{mockResults.confidenceStats.certeza}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Dúvidas (Acertos)</span>
                  <span className="text-2xl font-black text-amber-500">{mockResults.doubtGuesses.length}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Chutes (Sorte)</span>
                  <span className="text-2xl font-black text-red-500">{mockResults.luckyGuesses.length}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status</span>
                  <span className={`text-2xl font-black ${mockResults.score / mockResults.total >= 0.7 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {mockResults.score / mockResults.total >= 0.7 ? 'Aprovado' : 'Em Evolução'}
                  </span>
                </div>
              </div>
              {mockResults.luckyGuesses.length > 0 && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-sm flex items-center gap-3">
                  <AlertTriangle size={20} />
                  Revisar fundamento ({mockResults.luckyGuesses.length} acertos por sorte)
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-center items-center text-center space-y-4">
              <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <BrainCircuit size={40} className="text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Análise Metacognitiva</h3>
              {mockResults.luckyGuesses.length > 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest mb-2">
                    <AlertTriangle size={14} /> Alerta de Revisão
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    { /* Removed: Você acertou stats */ }
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 leading-relaxed">
                  Seu nível de certeza está alinhado com seus acertos. Continue focando nos temas de dúvida!
                </p>
              )}
            </div>
          </div>

          {/* Subject Stats Chart */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
              <BarChart3 className="text-blue-500" /> Desempenho por Disciplina
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockResults.subjectStats} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis 
                    dataKey="subject" 
                    type="category" 
                    width={150} 
                    tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const percent = Math.round((data.correct / data.total) * 100);
                        return (
                          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800">
                            <p className="font-black text-xs uppercase tracking-widest mb-1">{data.subject}</p>
                            <p className="text-2xl font-black text-blue-400">{percent}%</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{data.correct} de {data.total} questões</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey={(d) => (d.correct / d.total) * 100} radius={[0, 10, 10, 0]} barSize={32}>
                    {mockResults.subjectStats.map((entry, index) => {
                      const percent = (entry.correct / entry.total) * 100;
                      let color = '#ef4444'; // Red
                      if (percent >= 80) color = '#10b981'; // Green
                      else if (percent >= 60) color = '#f59e0b'; // Amber
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Review Section */}
          {(mockResults.luckyGuesses.length > 0 || mockResults.doubtGuesses.length > 0) && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                <BookOpen className="text-amber-500" /> Questões para Revisão
              </h3>
              <div className="space-y-4">
                {[...new Set([...mockResults.luckyGuesses, ...mockResults.doubtGuesses])].map(qId => {
                  const q = mockQuestions.find(q => q.id === qId);
                  if (!q) return null;
                  return (
                    <div key={q.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[70%]">{q.statement.substring(0, 50)}...</span>
                      <button 
                        onClick={() => {
                          const level = sessionConfidenceStats[q.id] || 'certeza';
                          handleCreateFlashcardFromError(q, mockAnswers[q.id], mockAnswers[q.id] === q.correct_answer);
                          showNotification('Flashcard criado!', 'success');
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                      >
                        Flashcard
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMockMode ? 'fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 overflow-y-auto' : 'max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500 pb-24'}`}>
      {/* Confidence Selection Modal */}
      <AnimatePresence>
        {showConfidenceSelection && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full text-center relative"
            >
              <button 
                onClick={() => setShowConfidenceSelection(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <BrainCircuit className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Nível de Confiança</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Como você avalia sua resposta para esta questão?</p>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => confirmAnswer('certeza')}
                  className="flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl transition-all group"
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
                  onClick={() => confirmAnswer('duvida')}
                  className="flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl transition-all group"
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
                  onClick={() => confirmAnswer('chute')}
                  className="flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-2xl transition-all group"
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

      {/* Mock Setup Modal */}
      {showMockSetup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                  <Timer className="text-emerald-600 dark:text-emerald-400" size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configurar Simulado</h2>
              </div>
              <button onClick={() => setShowMockSetup(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Questões Disponíveis</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black">{filteredQuestions.length}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  O simulado usará as questões baseadas nos seus filtros atuais. Aplique filtros de matéria ou banca antes de começar se desejar um tema específico.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Duração do Simulado (Minutos)</label>
                <div className="grid grid-cols-4 gap-3">
                  {[30, 60, 120, 240].map(mins => (
                    <button
                      key={mins}
                      onClick={() => setMockDurationMinutes(mins)}
                      className={`py-3 rounded-2xl font-black text-sm transition-all border-2 ${mockDurationMinutes === mins ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-500'}`}
                    >
                      {mins >= 60 ? `${mins/60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="range"
                    min="5"
                    max="300"
                    step="5"
                    value={mockDurationMinutes}
                    onChange={(e) => setMockDurationMinutes(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <span className="text-lg font-black text-slate-900 dark:text-white w-16 text-right">{mockDurationMinutes}m</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 leading-relaxed uppercase tracking-wider">
                  No modo simulado, o gabarito e as explicações só serão revelados após a finalização. O cronômetro não pode ser pausado.
                </p>
              </div>

              <button
                onClick={() => {
                  if (filteredQuestions.length === 0) {
                    showNotification('Não há questões disponíveis com os filtros atuais.', 'error');
                    return;
                  }
                  startMock(filteredQuestions, mockDurationMinutes);
                }}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black text-sm uppercase tracking-[0.3em] transition-all shadow-xl shadow-emerald-900/30 active:scale-[0.98]"
              >
                Começar Prova Real
              </button>
            </div>
          </div>
        </div>
      )}

      {isMockMode && !isMockFinished && (
        <div className="max-w-4xl mx-auto pt-24 pb-32 px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                <Target className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Simulado em Curso</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Questão {currentIndex + 1} de {mockQuestions.length}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => setCurrentIndex(prev => Math.min(mockQuestions.length - 1, prev + 1))}
                disabled={currentIndex === mockQuestions.length - 1}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
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
                onClick={() => setCurrentIndex(idx)}
                className={`w-10 h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all ${
                  currentIndex === idx 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : mockAnswers[q.id] !== undefined
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div id="ai-generator-portal">
        {showAIGenerator && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="text-purple-500" />
                Gerador com IA
              </h2>
              <button onClick={() => setShowAIGenerator(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleGenerateAI} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Matéria / Assunto *</label>
                  <input
                    type="text"
                    required={!aiConfig.baseOnFlashcards && !aiConfig.context}
                    value={aiConfig.subject}
                    onChange={e => setAiConfig({...aiConfig, subject: e.target.value})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Ex: Direito Penal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tópico Específico</label>
                  <input
                    type="text"
                    value={aiConfig.topic}
                    onChange={e => setAiConfig({...aiConfig, topic: e.target.value})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Ex: Crimes contra a vida"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Material de Base / Texto da Aula (Opcional)</label>
                <textarea
                  value={aiConfig.context}
                  onChange={e => setAiConfig({...aiConfig, context: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none min-h-[120px] text-sm"
                  placeholder="Cole aqui o texto da aula, anotações ou trechos de livros para que a IA crie questões baseadas exatamente neste conteúdo..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Estilo de Prova</label>
                  <select
                    value={aiConfig.examStyle}
                    onChange={e => setAiConfig({...aiConfig, examStyle: e.target.value as any})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="OAB (FGV)">OAB (FGV)</option>
                    <option value="Magistratura/Promotoria">Magistratura/Promotoria</option>
                    <option value="Acadêmico (SanFran)">Acadêmico (SanFran)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tipo de Enunciado</label>
                  <select
                    value={aiConfig.statementType}
                    onChange={e => setAiConfig({...aiConfig, statementType: e.target.value as any})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="Caso Prático (Situação Hipotética)">Caso Prático</option>
                    <option value="Enunciado Direto">Enunciado Direto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Foco Jurídico</label>
                <div className="flex flex-wrap gap-3">
                  {['Lei Seca', 'Jurisprudência Atualizada', 'Doutrina Clássica'].map(focus => (
                    <label key={focus} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiConfig.legalFocus.includes(focus)}
                        onChange={e => {
                          const newFocus = e.target.checked 
                            ? [...aiConfig.legalFocus, focus]
                            : aiConfig.legalFocus.filter(f => f !== focus);
                          setAiConfig({...aiConfig, legalFocus: newFocus});
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">{focus}</span>
                    </label>
                  ))}
                </div>
              </div>

              {aiConfig.legalFocus.includes('Jurisprudência Atualizada') && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-sm mb-2">
                    <Gavel size={18} /> Configurações de Jurisprudência
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1 uppercase">Tribunal</label>
                      <select
                        value={aiConfig.tribunal}
                        onChange={e => setAiConfig({...aiConfig, tribunal: e.target.value as any})}
                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      >
                        <option value="Jurisprudência STF">STF</option>
                        <option value="Jurisprudência STJ">STJ</option>
                        <option value="Ambos">Ambos (STF/STJ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1 uppercase">Ano / Período</label>
                      <select
                        value={aiConfig.yearFilter}
                        onChange={e => setAiConfig({...aiConfig, yearFilter: e.target.value as any})}
                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      >
                        <option value="2025-2026">2025-2026</option>
                        <option value="Últimos 2 anos">Últimos 2 anos</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/30">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={aiConfig.baseOnFlashcards}
                    onChange={e => setAiConfig({...aiConfig, baseOnFlashcards: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-bold text-purple-800 dark:text-purple-300">Basear em meus Flashcards</span>
                </label>
                
                {aiConfig.baseOnFlashcards && (
                  <select
                    value={aiConfig.selectedFolderId}
                    onChange={e => setAiConfig({...aiConfig, selectedFolderId: e.target.value})}
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  >
                    <option value="">Selecione uma pasta do Acervo</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={aiConfig.count}
                    onChange={e => setAiConfig({...aiConfig, count: parseInt(e.target.value) || 1})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Dificuldade</label>
                  <select
                    value={aiConfig.difficulty}
                    onChange={e => setAiConfig({...aiConfig, difficulty: e.target.value as any})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="facil">Fácil</option>
                    <option value="media">Média</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isGenerating || aiCooldown > 0}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Gerando...
                    </>
                  ) : aiCooldown > 0 ? (
                    <>
                      <Timer className="w-5 h-5" /> Aguarde ({aiCooldown}s)
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Gerar Questões
                    </>
                  )}
                </button>
                {isGenerating && generatingStatus && (
                  <p className="text-center text-sm text-purple-300 mt-2">{generatingStatus}</p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
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
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Filter size={16} /> {showFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
              </button>
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 animate-in slide-in-from-top-2 duration-300">
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
                  >
                    <option value="">Disciplina</option>
                    {subjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
                  >
                    <option value="">Assunto</option>
                    {topics.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <select
                    value={selectedExamBoard}
                    onChange={(e) => setSelectedExamBoard(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
                  >
                    <option value="">Banca</option>
                    {examBoards.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
                  >
                    <option value="">Ano</option>
                    {years.map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>

                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
                  >
                    <option value="">Dificuldade</option>
                    <option value="facil">Fácil</option>
                    <option value="media">Média</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              )}
              
              {notebooks.length > 0 && (
                <div className="mb-4">
                  <select
                    value={selectedNotebookId}
                    onChange={(e) => setSelectedNotebookId(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-orange-200 dark:border-orange-800 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-200"
                  >
                    <option value="">Meus Cadernos</option>
                    {notebooks.map(n => (
                      <option key={n.id} value={n.id}>{n.name} ({n.question_ids.length})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-4 mb-12">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">Minhas questões:</span>
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      onClick={() => setQuestionStatus('all')}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${questionStatus === 'all' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                    >
                      Todas
                    </button>
                    <button 
                      onClick={() => setQuestionStatus('correct')}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${questionStatus === 'correct' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                    >
                      Certas
                    </button>
                    <button 
                      onClick={() => setQuestionStatus('wrong')}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${questionStatus === 'wrong' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                    >
                      Erradas
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="text-sm text-slate-500 font-medium">
                <span className="font-bold text-slate-900 dark:text-white">{filteredQuestions.length}</span> questões encontradas
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedSubject('');
                    setSelectedTopic('');
                    setDifficultyFilter('');
                    setQuestionStatus('all');
                    setSelectedNotebookId('');
                  }}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Limpar filtro
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
                  Filtrar questões
                </button>
              </div>
            </div>
          </div>

          {/* Question Area */}
          <div key="question-area-container" className="w-full">
            <div className="flex-1">
              {filteredQuestions.length > 0 && currentQuestion ? (
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
                        if (stats.totalAttempts > 0) {
                          return (
                            <div className={`absolute top-8 right-8 z-10 ${stats.lastAttemptCorrect ? 'text-green-500' : 'text-red-500'}`}>
                              <Target size={32} />
                            </div>
                          );
                        }
                        return null;
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
                      <div className="flex gap-4 text-xs font-medium text-slate-500">
                        <span>Ano: <span className="text-slate-900 dark:text-white">{q.year || 'N/A'}</span></span>
                        <span>Banca: <span className="text-slate-900 dark:text-white">{q.exam_board || 'N/A'}</span></span>
                        <span>Dificuldade: <span className="text-slate-900 dark:text-white capitalize">{q.difficulty}</span></span>
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
                      <div className="text-slate-800 dark:text-slate-200 leading-relaxed mb-4">
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
                          <div className="space-y-3">
                            {q.options.map((option, optIdx) => {
                              const isSelected = isMockMode ? mockAnswers[q.id] === optIdx : selectedOption === optIdx;
                              const isCorrect = q.correct_answer === optIdx;
                              const showStatus = isMockMode ? isMockFinished : showExplanation;
                              const isEliminated = (eliminatedOptions[q.id] || []).includes(optIdx);
                              
                              let btnClass = "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative group ";
                              
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
                                    onClick={() => handleAnswer(optIdx, q)}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      toggleElimination(q.id, optIdx);
                                    }}
                                    disabled={showStatus && !isMockMode}
                                    className={btnClass}
                                  >
                                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                                      showStatus && isCorrect ? 'bg-green-500 text-white' :
                                      showStatus && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                                      isSelected && !showStatus ? 'bg-blue-500 text-white' :
                                      'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </div>
                                    <div className={`flex-1 pt-1 text-slate-700 dark:text-slate-300 ${isEliminated && !showStatus ? 'line-through' : ''}`}>
                                      {option}
                                    </div>
                                    {showStatus && isCorrect && <CheckCircle2 className="text-green-500 shrink-0 mt-1" />}
                                    {showStatus && isSelected && !isCorrect && <XCircle className="text-red-500 shrink-0 mt-1" />}
                                  </button>
                                  
                                  {!showStatus && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleElimination(q.id, optIdx);
                                      }}
                                      className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                                        isEliminated ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 opacity-100' : 'text-slate-300 hover:text-orange-400'
                                      }`}
                                      title={isEliminated ? "Restaurar alternativa" : "Riscar alternativa (Botão Direito)"}
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
                                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3">
                                  <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gerando Correção Estratégica...</p>
                                </div>
                              ) : aiCommentary[q.id] ? (
                                <div className="space-y-4">
                                  {/* Doutrina e Contexto */}
                                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <h4 className="font-black text-indigo-800 dark:text-indigo-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <BookOpen size={14} /> Doutrina e Contexto
                                    </h4>
                                    <p className="text-indigo-900/80 dark:text-indigo-200/80 text-sm leading-relaxed">
                                      {aiCommentary[q.id].doctrineAndContext}
                                    </p>
                                  </div>

                                  {/* Fundamentação Legal */}
                                  <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                    <h4 className="font-black text-emerald-800 dark:text-emerald-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Scale size={14} /> Fundamentação Legal
                                    </h4>
                                    <p className="text-emerald-900/80 dark:text-emerald-200/80 text-sm font-medium">
                                      {aiCommentary[q.id].legalBasis}
                                    </p>
                                  </div>

                                  {/* Análise das Alternativas */}
                                  <div className="space-y-2">
                                    <h4 className="font-black text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Gavel size={14} /> Análise das Alternativas
                                    </h4>
                                    {Array.isArray(aiCommentary[q.id].alternativesAnalysis) ? (
                                      aiCommentary[q.id].alternativesAnalysis.map((alt: any, idx: number) => (
                                        <div key={idx} className={`p-4 rounded-xl border ${alt.status === 'Correta' ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}>
                                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            <span className="font-black uppercase">[{alt.alternative}] {alt.status}:</span> {alt.explanation}
                                          </p>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                        {aiCommentary[q.id].alternativesAnalysis}
                                      </p>
                                    )}
                                  </div>

                                  {/* Pulo do Gato */}
                                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-10">
                                      <Zap size={40} className="text-amber-500" />
                                    </div>
                                    <h4 className="font-black text-amber-800 dark:text-amber-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Lightbulb size={14} /> Pulo do Gato (Dica de Ouro)
                                    </h4>
                                    <p className="text-amber-900/80 dark:text-amber-200/80 text-sm font-bold italic">
                                      "{aiCommentary[q.id].mnemonic}"
                                    </p>
                                  </div>

                                  {/* Follow-up Chat */}
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
                                              <Markdown>{msg.text}</Markdown>
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
                                </div>
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
              {/* Target Icon */}
              {(() => {
                const stats = getXRayStats(currentQuestion.id);
                if (stats.totalAttempts > 0) {
                  return (
                    <div className={`absolute top-6 right-6 z-10 ${stats.lastAttemptCorrect ? 'text-green-500' : 'text-red-500'}`}>
                      <Target size={32} />
                    </div>
                  );
                }
                return null;
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
                <div className="text-lg md:text-xl text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-4 whitespace-pre-wrap">
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

                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = isMockMode ? mockAnswers[currentQuestion.id] === idx : selectedOption === idx;
                    const isCorrect = currentQuestion.correct_answer === idx;
                    const showStatus = isMockMode ? isMockFinished : showExplanation;
                    const isEliminated = (eliminatedOptions[currentQuestion.id] || []).includes(idx);
                    
                    let btnClass = "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative group ";
                    
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
                          onClick={() => handleAnswer(idx)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            toggleElimination(currentQuestion.id, idx);
                          }}
                          disabled={showStatus && !isMockMode}
                          className={btnClass}
                        >
                          <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                            showStatus && isCorrect ? 'bg-green-500 text-white' :
                            showStatus && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                            isSelected && !showStatus ? 'bg-blue-500 text-white' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <div className={`flex-1 pt-1 text-slate-700 dark:text-slate-300 ${isEliminated && !showStatus ? 'line-through' : ''}`}>
                            {option}
                          </div>
                          {showStatus && isCorrect && <CheckCircle2 className="text-green-500 shrink-0 mt-1" />}
                          {showStatus && isSelected && !isCorrect && <XCircle className="text-red-500 shrink-0 mt-1" />}
                        </button>
                        
                        {!showStatus && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleElimination(currentQuestion.id, idx);
                            }}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                              isEliminated ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 opacity-100' : 'text-slate-300 hover:text-orange-400'
                            }`}
                            title={isEliminated ? "Restaurar alternativa" : "Riscar alternativa (Botão Direito)"}
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
                      <div className="p-12 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Consultando Jurisprudência...</p>
                      </div>
                    ) : aiCommentary[currentQuestion.id] ? (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Correção Comentada IA</span>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Doutrina e Contexto */}
                          <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-900/30">
                            <h4 className="font-black text-indigo-800 dark:text-indigo-400 text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                              <BookOpen size={16} /> Doutrina e Contexto
                            </h4>
                            <p className="text-indigo-900/80 dark:text-indigo-200/80 text-sm leading-relaxed">
                              {aiCommentary[currentQuestion.id].doctrineAndContext}
                            </p>
                          </div>

                          <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-900/30">
                            <h4 className="font-black text-emerald-800 dark:text-emerald-400 text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Scale size={16} /> Fundamentação Legal
                            </h4>
                            <p className="text-emerald-900/80 dark:text-emerald-200/80 text-sm font-bold leading-relaxed">
                              {aiCommentary[currentQuestion.id].legalBasis}
                            </p>
                          </div>

                          <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border-2 border-amber-100 dark:border-amber-900/30 relative overflow-hidden">
                            <div className="absolute -top-2 -right-2 opacity-10 rotate-12">
                              <Zap size={80} className="text-amber-500" />
                            </div>
                            <h4 className="font-black text-amber-800 dark:text-amber-400 text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Lightbulb size={16} /> Pulo do Gato
                            </h4>
                            <p className="text-amber-900/80 dark:text-amber-200/80 text-sm font-black italic leading-relaxed">
                              "{aiCommentary[currentQuestion.id].mnemonic}"
                            </p>
                          </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 space-y-3">
                          <h4 className="font-black text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Gavel size={16} /> Análise Técnica das Alternativas
                          </h4>
                          {Array.isArray(aiCommentary[currentQuestion.id].alternativesAnalysis) ? (
                            aiCommentary[currentQuestion.id].alternativesAnalysis.map((alt: any, idx: number) => (
                              <div key={idx} className={`p-4 rounded-xl border ${alt.status === 'Correta' ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  <span className="font-black uppercase">[{alt.alternative}] {alt.status}:</span> {alt.explanation}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                              {aiCommentary[currentQuestion.id].alternativesAnalysis}
                            </p>
                          )}
                        </div>

                        {/* Follow-up Chat */}
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
                                    <Markdown>{msg.text}</Markdown>
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
                      </div>
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
              </div>

              {/* Footer / Navigation */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors font-bold text-sm uppercase tracking-wider"
                >
                  <ChevronLeft size={18} /> Anterior
                </button>
                
                <span className="text-sm font-bold text-slate-400">
                  {currentIndex + 1} / {filteredQuestions.length}
                </span>
                
                <button
                  onClick={handleNext}
                  disabled={currentIndex === filteredQuestions.length - 1}
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
                  ? "O banco de questões está vazio. Adicione a primeira questão!" 
                  : "Nenhuma questão corresponde aos filtros selecionados."}
              </p>
              {questions.length === 0 && (
                <button
                  className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                >
                  Adicionar Questão
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
  
  export default QuestionBank;
      {showAiLesson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[130] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
                  <Sparkles className="text-purple-600 dark:text-purple-400" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Aula Resumida IA</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedSubject}</p>
                </div>
              </div>
              <button onClick={() => setShowAiLesson(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                <X size={24} />
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
                  <Markdown>{aiLessonContent}</Markdown>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setShowAiLesson(false)}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Entendido, Vamos Praticar!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Juridiquês Translator Modal */}
      {showJuridiquesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquareText className="text-blue-500" />
                Tradutor de Juridiquês
              </h2>
              <button onClick={() => setShowJuridiquesModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
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
                onClick={() => setShowJuridiquesModal(false)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Glossary Search Modal */}
      {showManualGlossarySearch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Book className="text-indigo-500" />
                Dicionário Jurídico
              </h2>
              <button onClick={() => setShowManualGlossarySearch(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={24} />
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
            isOnline={true} // Assuming online for AI features
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
