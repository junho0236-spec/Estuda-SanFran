import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
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
  RotateCcw
} from 'lucide-react';

interface Question {
  id: string;
  subject: string;
  topic: string;
  statement: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: 'facil' | 'media' | 'dificil';
}

interface QuestionBankProps {
  userId: string;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ userId }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Filters
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('Todos');
  const [selectedTopic, setSelectedTopic] = useState<string>('Todos');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'difficulty_asc' | 'difficulty_desc'>('newest');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<string[]>([]);
  const [showWrongOnly, setShowWrongOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'single'>('list');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  
  // Stats
  const [correctCount, setCorrectCount] = useState(0);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
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
    difficulty: 'media'
  });

  useEffect(() => {
    fetchQuestions();
    // Load favorites from local storage
    const storedFavorites = localStorage.getItem(`sanfran_favorites_${userId}`);
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites));
    }
    
    // Load wrong questions from local storage
    const storedWrong = localStorage.getItem(`sanfran_wrong_${userId}`);
    if (storedWrong) {
      setWrongQuestions(JSON.parse(storedWrong));
    }

    // Load notes from local storage
    const storedNotes = localStorage.getItem(`sanfran_notes_${userId}`);
    if (storedNotes) {
      setNotes(JSON.parse(storedNotes));
    }

    // Load stats from local storage
    const storedCorrect = localStorage.getItem(`sanfran_correct_count_${userId}`);
    if (storedCorrect) setCorrectCount(parseInt(storedCorrect));
    
    const storedWrongCount = localStorage.getItem(`sanfran_wrong_count_${userId}`);
    if (storedWrongCount) setWrongCount(parseInt(storedWrongCount));
  }, [userId]);

  const toggleFavorite = (questionId: string) => {
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
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist yet, we'll just use empty array
        if (error.code === '42P01') {
          console.log('Table questions does not exist yet');
          setQuestions([]);
        } else {
          throw error;
        }
      } else if (data) {
        setQuestions(data);
        
        // Extract unique subjects and topics
        const uniqueSubjects = Array.from(new Set(data.map(q => q.subject))).filter(Boolean);
        setSubjects(uniqueSubjects);
        
        const uniqueTopics = Array.from(new Set(data.map(q => q.topic))).filter(Boolean);
        setTopics(uniqueTopics);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
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
          difficulty: 'media'
        });
        
        if (!subjects.includes(data.subject)) {
          setSubjects([...subjects, data.subject]);
        }
        if (data.topic && !topics.includes(data.topic)) {
          setTopics([...topics, data.topic]);
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
                difficulty: { type: Type.STRING, description: "A dificuldade: 'facil', 'media' ou 'dificil'" }
              },
              required: ["subject", "topic", "statement", "options", "correct_answer", "explanation", "difficulty"]
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
    const matchSubject = selectedSubject === 'Todos' || q.subject === selectedSubject;
    const matchTopic = selectedTopic === 'Todos' || q.topic === selectedTopic;
    const matchDifficulty = difficultyFilter === 'Todos' || q.difficulty === difficultyFilter;
    const matchFavorite = !showFavoritesOnly || favorites.includes(q.id);
    const matchWrong = !showWrongOnly || wrongQuestions.includes(q.id);
    
    return matchSubject && matchTopic && matchDifficulty && matchFavorite && matchWrong;
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

  const handleAnswer = (index: number) => {
    if (showExplanation) return; // Already answered
    
    setSelectedOption(index);
    setShowExplanation(true);
    
    if (index === currentQuestion.correct_answer) {
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      localStorage.setItem(`sanfran_correct_count_${userId}`, newCount.toString());
      
      // If answered correctly, remove from wrong questions list if present
      if (wrongQuestions.includes(currentQuestion.id)) {
        const newWrong = wrongQuestions.filter(id => id !== currentQuestion.id);
        setWrongQuestions(newWrong);
        localStorage.setItem(`sanfran_wrong_${userId}`, JSON.stringify(newWrong));
      }
    } else {
      const newCount = wrongCount + 1;
      setWrongCount(newCount);
      localStorage.setItem(`sanfran_wrong_count_${userId}`, newCount.toString());
      
      // If answered incorrectly, add to wrong questions list
      if (!wrongQuestions.includes(currentQuestion.id)) {
        const newWrong = [...wrongQuestions, currentQuestion.id];
        setWrongQuestions(newWrong);
        localStorage.setItem(`sanfran_wrong_${userId}`, JSON.stringify(newWrong));
      }
    }
  };

  const handleSaveNote = (questionId: string, noteText: string) => {
    // Only save if content changed from storage
    const storedNotes = localStorage.getItem(`sanfran_notes_${userId}`);
    const parsedStored = storedNotes ? JSON.parse(storedNotes) : {};
    
    if (parsedStored[questionId] !== noteText) {
       const newNotes = { ...notes, [questionId]: noteText };
       setNotes(newNotes);
       localStorage.setItem(`sanfran_notes_${userId}`, JSON.stringify(newNotes));
       showNotification('Anotação salva com sucesso!', 'success');
    }
  };

  const resetStats = () => {
    if (confirm('Deseja realmente zerar suas estatísticas de acertos e erros?')) {
      setCorrectCount(0);
      setWrongCount(0);
      localStorage.removeItem(`sanfran_correct_count_${userId}`);
      localStorage.removeItem(`sanfran_wrong_count_${userId}`);
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
  }, [selectedSubject, selectedTopic, difficultyFilter, sortBy, showFavoritesOnly, showWrongOnly]);

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
          {questions.length === 0 && (
            <button
              onClick={handleImportSamples}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors"
            >
              <Download size={16} /> Importar Exemplos
            </button>
          )}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 text-slate-500">
                <Filter size={18} />
                <span className="text-sm font-bold uppercase tracking-wider">Filtros:</span>
              </div>
              
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium outline-none"
              >
                <option value="Todos">Todas as Matérias</option>
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium outline-none"
              >
                <option value="Todos">Todos os Tópicos</option>
                {topics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium outline-none"
              >
                <option value="Todos">Qualquer Dificuldade</option>
                <option value="facil">Fácil</option>
                <option value="media">Média</option>
                <option value="dificil">Difícil</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium outline-none"
              >
                <option value="newest">Mais Recentes</option>
                <option value="oldest">Mais Antigas</option>
                <option value="difficulty_asc">Mais Fáceis Primeiro</option>
                <option value="difficulty_desc">Mais Difíceis Primeiro</option>
              </select>

              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showFavoritesOnly 
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Star size={16} className={showFavoritesOnly ? 'fill-yellow-500 text-yellow-500' : ''} />
                Favoritas {favorites.length > 0 && <span className="ml-1 opacity-75">({favorites.length})</span>}
              </button>

              <button
                onClick={() => setShowWrongOnly(!showWrongOnly)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showWrongOnly 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800' 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <AlertCircle size={16} className={showWrongOnly ? 'text-red-500' : ''} />
                Revisar Erros {wrongQuestions.length > 0 && <span className="ml-1 opacity-75">({wrongQuestions.length})</span>}
              </button>
              
              <div className="ml-auto text-sm text-slate-500 font-medium">
                {filteredQuestions.length} questões encontradas
              </div>
            </div>

            <div className="bg-slate-900 dark:bg-black rounded-2xl p-4 shadow-sm flex items-center justify-around text-white relative group">
              <button 
                onClick={resetStats}
                className="absolute top-2 right-2 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Zerar estatísticas"
              >
                <RotateCcw size={12} />
              </button>
              <div className="text-center">
                <div className="text-2xl font-black text-green-400">{correctCount}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400">Acertos</div>
              </div>
              <div className="w-px h-8 bg-slate-700"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-red-400">{wrongCount}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400">Erros</div>
              </div>
              <div className="w-px h-8 bg-slate-700"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-blue-400">
                  {correctCount + wrongCount > 0 
                    ? Math.round((correctCount / (correctCount + wrongCount)) * 100) 
                    : 0}%
                </div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400">Aproveitamento</div>
              </div>
            </div>
          </div>

          {/* Question Area */}
          {filteredQuestions.length > 0 && currentQuestion ? (
            viewMode === 'list' ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredQuestions.map((q, idx) => (
                  <div 
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setViewMode('single');
                      setSelectedOption(null);
                      setShowExplanation(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-bold uppercase tracking-wider">
                          {q.subject}
                        </span>
                        {q.topic && (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-xs font-bold uppercase tracking-wider">
                            {q.topic}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                          q.difficulty === 'facil' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          q.difficulty === 'media' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {q.difficulty}
                        </span>
                      </div>
                      
                      {favorites.includes(q.id) && (
                        <Star size={16} className="fill-yellow-500 text-yellow-500 shrink-0 animate-in zoom-in duration-300" />
                      )}
                    </div>
                    
                    <p className="text-slate-700 dark:text-slate-300 font-medium line-clamp-2 mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {q.statement}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-400 font-medium">
                        ID: {q.id.substring(0, 8)}...
                      </span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Resolver <ChevronRight size={14} />
                      </span>
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
                  <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                    {currentQuestion.subject}
                  </span>
                  {currentQuestion.topic && (
                    <span className="inline-block ml-2 px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                      {currentQuestion.topic}
                    </span>
                  )}
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
                    
                    let btnClass = "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 ";
                    
                    if (!showStatus) {
                      btnClass += "border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10";
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
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
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
                        <div className="flex-1 pt-1 text-slate-700 dark:text-slate-300">
                          {option}
                        </div>
                        {showStatus && isCorrect && <CheckCircle2 className="text-green-500 shrink-0 mt-1" />}
                        {showStatus && isSelected && !isCorrect && <XCircle className="text-red-500 shrink-0 mt-1" />}
                      </button>
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
        </>
      )}
      {notification && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
