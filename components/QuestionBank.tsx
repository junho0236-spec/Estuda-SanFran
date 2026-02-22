import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronLeft,
  Filter,
  Plus,
  Loader2,
  AlertCircle
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
  
  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  // Form for new question
  const [showAddForm, setShowAddForm] = useState(false);
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
  }, []);

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

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!newQuestion.subject || !newQuestion.statement || newQuestion.options?.some(o => !o)) {
      alert('Preencha todos os campos obrigatórios e as 4 alternativas.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([newQuestion])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setQuestions([data, ...questions]);
        setShowAddForm(false);
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
      }
    } catch (error: any) {
      console.error('Error adding question:', error);
      alert(`Erro ao adicionar questão: ${error.message || JSON.stringify(error)}`);
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
    return matchSubject && matchTopic && matchDifficulty;
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
      setCorrectCount(prev => prev + 1);
    } else {
      setWrongCount(prev => prev + 1);
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
  }, [selectedSubject, selectedTopic, difficultyFilter, sortBy]);

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
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors"
        >
          {showAddForm ? 'Voltar para Questões' : <><Plus size={16} /> Nova Questão</>}
        </button>
      </header>

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
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest transition-colors"
              >
                Salvar Questão
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
              
              <div className="ml-auto text-sm text-slate-500 font-medium">
                {filteredQuestions.length} questões encontradas
              </div>
            </div>

            <div className="bg-slate-900 dark:bg-black rounded-2xl p-4 shadow-sm flex items-center justify-around text-white">
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
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  currentQuestion.difficulty === 'facil' ? 'bg-green-100 text-green-700' :
                  currentQuestion.difficulty === 'media' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {currentQuestion.difficulty}
                </span>
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
                    <p className="text-blue-900/80 dark:text-blue-200/80 leading-relaxed text-sm">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}
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
    </div>
  );
};

export default QuestionBank;
