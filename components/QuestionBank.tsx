import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Question, UserProgress } from '../types';
import { sampleQuestions } from './sampleQuestions';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  BookOpen, 
  CheckCircle2, 
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
  PlusSquare
} from 'lucide-react';

interface QuestionBankProps {
  userId: string;
  onCorrectAnswer?: () => void;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ userId, onCorrectAnswer }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Filters
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [examBoards, setExamBoards] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
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
  const [viewMode, setViewMode] = useState<'list' | 'single'>('list');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, number[]>>({});
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stats
  const [correctCount, setCorrectCount] = useState(0);

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
  const [wrongCount, setWrongCount] = useState(0);

  // Form for new question
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    subject: '',
    topic: '',
    count: 3,
    difficulty: 'media' as 'facil' | 'media' | 'dificil'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    subject: '',
    topic: '',
    statement: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: '',
    difficulty: 'media',
    exam_board: '',
    year: new Date().getFullYear()
  });

  useEffect(() => {
    fetchQuestions();
    fetchUserProgress();
  }, [userId]);

  const fetchUserProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching user progress:', error);
        return;
      }

      if (data) {
        setFavorites(data.favorites || []);
        setWrongQuestions(data.wrong_questions || []);
        setCorrectQuestions(data.correct_questions || []);
        setNotes(data.notes || {});
        setCorrectCount(data.correct_count || 0);
        setWrongCount(data.wrong_count || 0);
        
        // Sync to local storage as backup
        localStorage.setItem(`sanfran_favorites_${userId}`, JSON.stringify(data.favorites || []));
        localStorage.setItem(`sanfran_wrong_${userId}`, JSON.stringify(data.wrong_questions || []));
        localStorage.setItem(`sanfran_correct_${userId}`, JSON.stringify(data.correct_questions || []));
        localStorage.setItem(`sanfran_notes_${userId}`, JSON.stringify(data.notes || {}));
        localStorage.setItem(`sanfran_correct_count_${userId}`, (data.correct_count || 0).toString());
        localStorage.setItem(`sanfran_wrong_count_${userId}`, (data.wrong_count || 0).toString());
      } else {
        // Fallback to local storage if no DB data yet
        const storedFavorites = localStorage.getItem(`sanfran_favorites_${userId}`);
        if (storedFavorites) setFavorites(JSON.parse(storedFavorites));
        
        const storedWrong = localStorage.getItem(`sanfran_wrong_${userId}`);
        if (storedWrong) setWrongQuestions(JSON.parse(storedWrong));

        const storedCorrectIds = localStorage.getItem(`sanfran_correct_${userId}`);
        if (storedCorrectIds) setCorrectQuestions(JSON.parse(storedCorrectIds));
        
        const storedNotes = localStorage.getItem(`sanfran_notes_${userId}`);
        if (storedNotes) setNotes(JSON.parse(storedNotes));

        const storedCorrect = localStorage.getItem(`sanfran_correct_count_${userId}`);
        if (storedCorrect) setCorrectCount(parseInt(storedCorrect));
        
        const storedWrongCount = localStorage.getItem(`sanfran_wrong_count_${userId}`);
        if (storedWrongCount) setWrongCount(parseInt(storedWrongCount));
      }
    } catch (err) {
      console.error('Failed to sync progress:', err);
    }
  };

  const syncUserProgress = async (updates: any) => {
    try {
      // Get current state to ensure we don't overwrite with old data
      const { data: current } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      const payload = {
        user_id: userId,
        favorites: updates.favorites !== undefined ? updates.favorites : (current?.favorites || favorites),
        wrong_questions: updates.wrongQuestions !== undefined ? updates.wrongQuestions : (current?.wrong_questions || wrongQuestions),
        correct_questions: updates.correctQuestions !== undefined ? updates.correctQuestions : (current?.correct_questions || correctQuestions),
        notes: updates.notes !== undefined ? updates.notes : (current?.notes || notes),
        correct_count: updates.correctCount !== undefined ? updates.correctCount : (current?.correct_count || correctCount),
        wrong_count: updates.wrongCount !== undefined ? updates.wrongCount : (current?.wrong_count || wrongCount),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_progress')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (err) {
      console.error('Error syncing to Supabase:', err);
      // We don't show notification for background sync errors to avoid annoying the user
      // but we keep local storage updated
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
    localStorage.setItem(`sanfran_favorites_${userId}`, JSON.stringify(newFavorites));
    syncUserProgress({ favorites: newFavorites });
  };

  const handleCreateFlashcardFromError = (question: Question) => {
    const front = question.statement;
    const correctOptionText = question.options[question.correct_answer];
    const back = `Resposta Correta: ${String.fromCharCode(65 + question.correct_answer)}) ${correctOptionText}\n\nExplicação: ${question.explanation || 'Nenhuma explicação fornecida.'}`;

    // Encode the flashcard data to be passed via URL state
    const flashcardData = {
      front,
      back,
      subject: question.subject,
      topic: question.topic,
    };

    // Navigate to Anki and pass the flashcard data in state
    navigate('/anki', { state: { newFlashcard: flashcardData } });
  };

  // AI Commented Answer State
  const [aiCommentary, setAiCommentary] = useState<string | null>(null);
  const [loadingAiCommentary, setLoadingAiCommentary] = useState(false);

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
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

    const uniqueYears = Array.from(new Set(data.map(q => q.year))).filter(Boolean) as number[];
    setYears(uniqueYears.sort((a, b) => b - a));
  };

  const handleImportSamples = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .insert(sampleQuestions)
        .select();

      if (error) throw error;

      if (data) {
        setQuestions([...data, ...questions]);
        showNotification(`${data.length} questões importadas com sucesso!`, 'success');
        
        // Update filters
        const newSubjects = Array.from(new Set([...subjects, ...data.map(q => q.subject)])).filter(Boolean);
        setSubjects(newSubjects);
        
        const newTopics = Array.from(new Set([...topics, ...data.map(q => q.topic)])).filter(Boolean);
        setTopics(newTopics);

        const newExamBoards = Array.from(new Set([...examBoards, ...data.map(q => q.exam_board)])).filter(Boolean) as string[];
        setExamBoards(newExamBoards);

        const newYears = Array.from(new Set([...years, ...data.map(q => q.year)])).filter(Boolean) as number[];
        setYears(newYears.sort((a, b) => b - a));
        
        setViewMode('list');
      }
    } catch (error: any) {
      console.error('Error importing questions:', error);
      showNotification(`Erro ao importar questões: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
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
      const { data, error } = await supabase
        .from('questions')
        .insert([newQuestion])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setQuestions([data, ...questions]);
        setShowAddForm(false);
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
          year: new Date().getFullYear()
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
        if (data.year && !years.includes(data.year)) {
          setYears([...years, data.year].sort((a, b) => b - a));
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

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiConfig.subject) {
      showNotification('Preencha a matéria/assunto.', 'error');
      return;
    }

    try {
      setIsGenerating(true);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Crie ${aiConfig.count} questões de múltipla escolha de nível ${aiConfig.difficulty} sobre a matéria "${aiConfig.subject}" e tópico "${aiConfig.topic}".
      Cada questão deve ter 4 alternativas.
      A explicação deve ser detalhada, explicando por que a alternativa correta está certa e por que cada uma das outras alternativas está incorreta.
      Inclua também uma banca fictícia ou real (ex: CESPE, FGV, FCC) e o ano atual.
      Retorne as questões no formato JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
                  description: "As 4 alternativas da questão"
                },
                correct_answer: { type: Type.INTEGER, description: "O índice da alternativa correta (0 a 3)" },
                explanation: { type: Type.STRING, description: "Explicação detalhada de cada alternativa" },
                difficulty: { type: Type.STRING, description: "A dificuldade: 'facil', 'media' ou 'dificil'" },
                exam_board: { type: Type.STRING, description: "A banca examinadora (ex: FGV, CESPE)" },
                year: { type: Type.INTEGER, description: "O ano da questão" }
              },
              required: ["subject", "topic", "statement", "options", "correct_answer", "explanation", "difficulty", "exam_board", "year"]
            }
          }
        }
      });

      if (response.text) {
        const generatedQuestions = JSON.parse(response.text);
        
        const { data, error } = await supabase
          .from('questions')
          .insert(generatedQuestions)
          .select();

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

          const newYears = Array.from(new Set([...years, ...data.map(q => q.year)])).filter(Boolean) as number[];
          setYears(newYears.sort((a, b) => b - a));
          
          setViewMode('list');
        }
      }
    } catch (error: any) {
      console.error('Error generating questions:', error);
      showNotification(`Erro ao gerar questões: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(newQuestion.options || [])];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
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
    
    let matchStatus = true;
    const isWrong = wrongQuestions.includes(q.id);
    const isCorrect = correctQuestions.includes(q.id);
    
    if (questionStatus === 'wrong') {
      matchStatus = isWrong;
    } else if (questionStatus === 'correct') {
      matchStatus = isCorrect;
    } else if (questionStatus === 'resolved') {
      matchStatus = isWrong || isCorrect;
    } else if (questionStatus === 'unresolved') {
      matchStatus = !isWrong && !isCorrect;
    }
    
    return matchSearch && matchSubject && matchTopic && matchDifficulty && matchExamBoard && matchYear && matchStatus;
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
    if (showExplanation && !questionOverride) return; // Already answered in single view
    // For inline view, we might need a separate state if we allow multiple answered questions in list
    // But for now let's keep it simple: if it's the expanded one, we use the same states
    
    setSelectedOption(index);
    setShowExplanation(true);
    
    if (index === targetQuestion.correct_answer) {
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      if (onCorrectAnswer) onCorrectAnswer();
      localStorage.setItem(`sanfran_correct_count_${userId}`, newCount.toString());
      
      let newCorrect = [...correctQuestions];
      if (!correctQuestions.includes(targetQuestion.id)) {
        newCorrect.push(targetQuestion.id);
        setCorrectQuestions(newCorrect);
        localStorage.setItem(`sanfran_correct_${userId}`, JSON.stringify(newCorrect));
      }

      let newWrong = wrongQuestions;
      // If answered correctly, remove from wrong questions list if present
      if (wrongQuestions.includes(targetQuestion.id)) {
        newWrong = wrongQuestions.filter(id => id !== targetQuestion.id);
        setWrongQuestions(newWrong);
        localStorage.setItem(`sanfran_wrong_${userId}`, JSON.stringify(newWrong));
      }
      syncUserProgress({ correctCount: newCount, wrongQuestions: newWrong, correctQuestions: newCorrect });
    } else {
      const newCount = wrongCount + 1;
      setWrongCount(newCount);
      localStorage.setItem(`sanfran_wrong_count_${userId}`, newCount.toString());
      
      let newWrong = [...wrongQuestions];
      // If answered incorrectly, add to wrong questions list
      if (!wrongQuestions.includes(targetQuestion.id)) {
        newWrong.push(targetQuestion.id);
        setWrongQuestions(newWrong);
        localStorage.setItem(`sanfran_wrong_${userId}`, JSON.stringify(newWrong));
      }
      syncUserProgress({ wrongCount: newCount, wrongQuestions: newWrong });
    }
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
    // Only save if content changed from storage
    const storedNotes = localStorage.getItem(`sanfran_notes_${userId}`);
    const parsedStored = storedNotes ? JSON.parse(storedNotes) : {};
    
    if (parsedStored[questionId] !== noteText) {
       const newNotes = { ...notes, [questionId]: noteText };
       setNotes(newNotes);
       localStorage.setItem(`sanfran_notes_${userId}`, JSON.stringify(newNotes));
       syncUserProgress({ notes: newNotes });
       showNotification('Anotação salva com sucesso!', 'success');
    }
  };

  const resetStats = () => {
    if (confirm('Deseja realmente zerar suas estatísticas de acertos e erros?')) {
      setCorrectCount(0);
      setWrongCount(0);
      localStorage.removeItem(`sanfran_correct_count_${userId}`);
      localStorage.removeItem(`sanfran_wrong_count_${userId}`);
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
  }, [selectedSubject, selectedTopic, difficultyFilter, sortBy, searchTerm, selectedExamBoard, selectedYear, questionStatus]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="mt-4 text-sm text-slate-500">Carregando questões...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500 pb-24">
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
        
        <div className="flex gap-2">
          <button
              onClick={handleImportSamples}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors"
            >
              <Download size={16} /> Importar Exemplos
            </button>
          <button
            onClick={() => setShowAIGenerator(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-colors"
          >
            <Sparkles size={16} /> Gerar com IA
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors"
          >
            {showAddForm ? 'Voltar para Questões' : <><Plus size={16} /> Nova Questão</>}
          </button>
        </div>
      </header>

      <div id="ai-generator-portal">
        {showAIGenerator && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md animate-in zoom-in-95 duration-300">
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
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Matéria / Assunto *</label>
                <input
                  type="text"
                  required
                  value={aiConfig.subject}
                  onChange={e => setAiConfig({...aiConfig, subject: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ex: Direito Penal"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tópico Específico (Opcional)</label>
                <input
                  type="text"
                  value={aiConfig.topic}
                  onChange={e => setAiConfig({...aiConfig, topic: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ex: Crimes contra a vida"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
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
                  disabled={isGenerating}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Gerar Questões
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      <div id="add-form-portal">
        {showAddForm ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Adicionar Nova Questão</h2>
            
            <form onSubmit={handleAddQuestion} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Matéria *</label>
                  <input
                    type="text"
                    required
                    value={newQuestion.subject}
                    onChange={e => setNewQuestion({...newQuestion, subject: e.target.value})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Direito Civil"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tópico</label>
                  <input
                    type="text"
                    value={newQuestion.topic}
                    onChange={e => setNewQuestion({...newQuestion, topic: e.target.value})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Contratos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Enunciado *</label>
                <textarea
                  required
                  rows={4}
                  value={newQuestion.statement}
                  onChange={e => setNewQuestion({...newQuestion, statement: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Digite o enunciado da questão..."
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Alternativas *</label>
                {newQuestion.options?.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={newQuestion.correct_answer === idx}
                      onChange={() => setNewQuestion({...newQuestion, correct_answer: idx})}
                      className="w-5 h-5 text-blue-600"
                    />
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={e => handleOptionChange(idx, e.target.value)}
                      className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={`Alternativa ${String.fromCharCode(65 + idx)}`}
                    />
                  </div>
                ))}
                <p className="text-xs text-slate-500">Selecione o botão ao lado da alternativa correta.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Explicação (Opcional)</label>
                <textarea
                  rows={3}
                  value={newQuestion.explanation}
                  onChange={e => setNewQuestion({...newQuestion, explanation: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Explique por que a alternativa está correta..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Banca (Opcional)</label>
                  <input
                    type="text"
                    value={newQuestion.exam_board}
                    onChange={e => setNewQuestion({...newQuestion, exam_board: e.target.value})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: FGV, CESPE"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ano (Opcional)</label>
                  <input
                    type="number"
                    value={newQuestion.year}
                    onChange={e => setNewQuestion({...newQuestion, year: parseInt(e.target.value) || new Date().getFullYear()})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Dificuldade</label>
                  <select
                    value={newQuestion.difficulty}
                    onChange={e => setNewQuestion({...newQuestion, difficulty: e.target.value as any})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="facil">Fácil</option>
                    <option value="media">Média</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    'Salvar Questão'
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Filters & Stats */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex-1 relative">
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
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">Minhas questões:</span>
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      onClick={() => setQuestionStatus('all')}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${questionStatus === 'all' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                    >
                      Todas
                    </button>
                    <button 
                      onClick={() => setQuestionStatus('correct')}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${questionStatus === 'correct' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                    >
                      Certas
                    </button>
                    <button 
                      onClick={() => setQuestionStatus('wrong')}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${questionStatus === 'wrong' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'}`}
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
          <div key="question-area-container">
            {filteredQuestions.length > 0 && currentQuestion ? (
              viewMode === 'list' ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredQuestions.map((q, idx) => (
                  <div 
                    key={q.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm">
                      <span className="font-bold text-slate-900 dark:text-white">{idx + 1}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{q.id.substring(0, 8)}</span>
                      <span className="text-slate-400 mx-1">•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{q.subject}</span>
                      <span className="text-slate-400 mx-1">▸</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium truncate">{q.topic}</span>
                    </div>
                    
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4 text-xs font-medium text-slate-500">
                      <span>Ano: <span className="text-slate-900 dark:text-white">{q.year || 'N/A'}</span></span>
                      <span>Banca: <span className="text-slate-900 dark:text-white">{q.exam_board || 'N/A'}</span></span>
                      <span>Dificuldade: <span className="text-slate-900 dark:text-white capitalize">{q.difficulty}</span></span>
                    </div>
                    
                    <div className="p-6">
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed mb-6">
                        {q.statement}
                      </p>
                      
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
                      </div>

                      {/* Expanded Accordion Content */}
                      {expandedQuestionId === q.id && (
                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
                          <div className="space-y-3">
                            {q.options.map((option, optIdx) => {
                              const isSelected = selectedOption === optIdx;
                              const isCorrect = q.correct_answer === optIdx;
                              const showStatus = showExplanation;
                              const isEliminated = (eliminatedOptions[q.id] || []).includes(optIdx);
                              
                              let btnClass = "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative group ";
                              
                              if (!showStatus) {
                                btnClass += isEliminated 
                                  ? "border-slate-100 dark:border-slate-800 opacity-40 grayscale" 
                                  : "border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10";
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
                                    disabled={showExplanation}
                                    className={btnClass}
                                  >
                                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                                      showStatus && isCorrect ? 'bg-green-500 text-white' :
                                      showStatus && isSelected && !isCorrect ? 'bg-red-500 text-white' :
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

                          {showExplanation && q.explanation && (
                            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-bottom-4">
                              <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                <BookOpen size={18} /> Explicação
                              </h4>
                              <p className="text-blue-900/80 dark:text-blue-200/80 leading-relaxed text-sm whitespace-pre-wrap">
                                {q.explanation}
                              </p>
                              <button
                                onClick={() => handleCreateFlashcardFromError(q)}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-blue-700 transition-colors"
                              >
                                <PlusSquare size={16} /> Criar Flashcard do Erro
                              </button>
                            </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
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
                  <div className="flex gap-4 text-xs font-medium text-slate-500">
                    <span>Ano: <span className="text-slate-900 dark:text-white">{currentQuestion.year || 'N/A'}</span></span>
                    <span>Banca: <span className="text-slate-900 dark:text-white">{currentQuestion.exam_board || 'N/A'}</span></span>
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
                <div className="text-lg md:text-xl text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-8 whitespace-pre-wrap">
                  {currentQuestion.statement}
                </div>

                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = currentQuestion.correct_answer === idx;
                    const showStatus = showExplanation;
                    const isEliminated = (eliminatedOptions[currentQuestion.id] || []).includes(idx);
                    
                    let btnClass = "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative group ";
                    
                    if (!showStatus) {
                      btnClass += isEliminated 
                        ? "border-slate-100 dark:border-slate-800 opacity-40 grayscale" 
                        : "border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10";
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
                          disabled={showExplanation}
                          className={btnClass}
                        >
                          <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                            showStatus && isCorrect ? 'bg-green-500 text-white' :
                            showStatus && isSelected && !isCorrect ? 'bg-red-500 text-white' :
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
                {showExplanation && currentQuestion.explanation && (
                  <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-bottom-4">
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                      <BookOpen size={18} /> Explicação
                    </h4>
                    <p className="text-blue-900/80 dark:text-blue-200/80 leading-relaxed text-sm whitespace-pre-wrap">
                      {currentQuestion.explanation}
                    </p>
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
                  onClick={() => setShowAddForm(true)}
                  className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                >
                  Adicionar Questão
                </button>
              )}
            </div>
          )}
          </div>
          </>
        )}
      </div>

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
    </div>
  );
};

export default QuestionBank;
