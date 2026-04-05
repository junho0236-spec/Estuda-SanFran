import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  X,
  Target,
  AlertCircle,
  Loader2,
  MessageSquareText,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  BookOpen,
  Scale,
  Zap,
  Lightbulb,
  Gavel,
  Send,
  PlusSquare,
  MessageSquare,
  Volume2,
} from 'lucide-react';
import type { Question, QuestionAiCommentary, QuestionAiCorrection } from '../../types';
import { QuestionComments } from '../QuestionComments';
import { GlossaryText } from '../GlossaryText.tsx';
import { QB_OPTION_FOCUS } from './questionBankHelpers';
import { QuestionAlternativeAnalysisBlocks } from './QuestionAlternativeAnalysisBlocks';
import { QuestionBankListPagination } from './QuestionBankListPagination';
import type { FollowUpMessage } from './QuestionBankSingleQuestionView';

export type QuestionBankListViewProps = {
  pagedQuestions: Question[];
  listPage: number;
  listPageSize: number;
  activeQuestionId: string | null;
  selectedQuestionsForNotebook: Set<string>;
  toggleQuestionSelection: (questionId: string) => void;
  userId: string;
  onDeleteQuestion: (questionId: string) => void;
  getXRayStats: (questionId: string) => {
    totalAttempts: number;
    correctAttempts: number;
    lastAttemptCorrect: boolean;
    avgTime: string;
  };
  correctQuestions: string[];
  wrongQuestions: string[];
  showXRay: boolean;
  expandedQuestionId: string | null;
  setExpandedQuestionId: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setSelectedOption: React.Dispatch<React.SetStateAction<number | null>>;
  setShowExplanation: React.Dispatch<React.SetStateAction<boolean>>;
  onTermClick: (term: string, position: { x: number; y: number }) => void;
  selectedText: string;
  onJuridiquesTranslate: () => void;
  loadingJuridiquesExplanation: boolean;
  isMockMode: boolean;
  onAudioHint: (question: Question) => void;
  isGeneratingHint: boolean;
  onSaveAsPrecedent: (question: Question) => void;
  isSavingPrecedent: Record<string, boolean>;
  onAnswerOption: (optionIndex: number, questionOverride?: Question) => void;
  mockAnswers: Record<string, number>;
  isMockFinished: boolean;
  selectedOption: number | null;
  showExplanation: boolean;
  eliminatedOptions: Record<string, number[]>;
  onToggleElimination: (questionId: string, optionIndex: number) => void;
  loadingAiCommentary: Record<string, boolean>;
  aiCommentary: Record<string, QuestionAiCommentary>;
  followUpChat: Record<string, FollowUpMessage[]>;
  followUpInput: Record<string, string>;
  setFollowUpInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isFollowUpLoading: Record<string, boolean>;
  onFollowUp: (questionId: string, statement: string) => void;
  onCreateFlashcardFromError: (question: Question) => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  filteredQuestionCount: number;
  onPrevListPage: () => void;
  onNextListPage: () => void;
  onEnterFocusMode: () => void;
};

export function QuestionBankListView({
  pagedQuestions,
  listPage,
  listPageSize,
  activeQuestionId,
  selectedQuestionsForNotebook,
  toggleQuestionSelection,
  userId,
  onDeleteQuestion,
  getXRayStats,
  correctQuestions,
  wrongQuestions,
  showXRay,
  expandedQuestionId,
  setExpandedQuestionId,
  setCurrentIndex,
  setSelectedOption,
  setShowExplanation,
  onTermClick,
  selectedText,
  onJuridiquesTranslate,
  loadingJuridiquesExplanation,
  isMockMode,
  onAudioHint,
  isGeneratingHint,
  onSaveAsPrecedent,
  isSavingPrecedent,
  onAnswerOption,
  mockAnswers,
  isMockFinished,
  selectedOption,
  showExplanation,
  eliminatedOptions,
  onToggleElimination,
  loadingAiCommentary,
  aiCommentary,
  followUpChat,
  followUpInput,
  setFollowUpInput,
  isFollowUpLoading,
  onFollowUp,
  onCreateFlashcardFromError,
  showNotification,
  filteredQuestionCount,
  onPrevListPage,
  onNextListPage,
  onEnterFocusMode,
}: QuestionBankListViewProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-8">
        {pagedQuestions.map((q, idx) => {
          const globalIdx = (listPage - 1) * listPageSize + idx;
          return (
            <div
              key={q.id}
              className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden relative pl-20 p-8 transition-all duration-300 ${activeQuestionId === q.id ? 'ring-2 ring-purple-500 shadow-lg' : ''}`}
            >
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
                          onDeleteQuestion(q.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                        title="Excluir questão permanentemente"
                        type="button"
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
                <span className="font-bold text-slate-900 dark:text-white">{globalIdx + 1}</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">{q.id.substring(0, 8)}</span>
                <span className="text-slate-400 mx-1">•</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">{q.subject}</span>
                <span className="text-slate-400 mx-1">▸</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium truncate">{q.topic}</span>
              </div>

              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-4 text-xs font-medium text-slate-500">
                    <span>
                      Ano: <span className="text-slate-900 dark:text-white">{q.year || 'N/A'}</span>
                    </span>
                    <span>
                      Estilo: <span className="text-slate-900 dark:text-white">{q.exam_board || 'N/A'}</span>
                    </span>
                    <span>
                      Dificuldade: <span className="text-slate-900 dark:text-white capitalize">{q.difficulty}</span>
                    </span>
                  </div>
                  {q.legislation_tags && q.legislation_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {q.legislation_tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-100 dark:border-amber-900/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.jurisprudence_tags && q.jurisprudence_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {q.jurisprudence_tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-100 dark:border-purple-900/30"
                        >
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
                          {!stats.lastAttemptCorrect && stats.totalAttempts > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold shadow-sm border border-red-100 dark:border-red-900/30">
                              <AlertCircle size={12} />
                              Última tentativa: Erro
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="p-6">
                <div id={`qb-statement-${q.id}`} className="text-slate-800 dark:text-slate-200 leading-relaxed mb-4">
                  <GlossaryText text={q.statement} onTermClick={onTermClick} />
                </div>
                {selectedText && (
                  <button
                    onClick={onJuridiquesTranslate}
                    disabled={loadingJuridiquesExplanation}
                    type="button"
                    className="mb-4 flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingJuridiquesExplanation ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <MessageSquareText size={14} />
                    )}{' '}
                    Traduzir Juridiquês
                  </button>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (expandedQuestionId === q.id) {
                        setExpandedQuestionId(null);
                      } else {
                        setExpandedQuestionId(q.id);
                        setCurrentIndex(globalIdx);
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
                    type="button"
                    onClick={() => onAudioHint(q)}
                    disabled={isGeneratingHint}
                    className={`p-2 rounded-full ${activeQuestionId === q.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {isGeneratingHint ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                  </button>
                </div>

                {!isMockMode && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentIndex(globalIdx);
                        onEnterFocusMode();
                        setSelectedOption(null);
                        setShowExplanation(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold transition-colors"
                    >
                      Modo Foco
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveAsPrecedent(q)}
                      disabled={isSavingPrecedent[q.id]}
                      className="px-4 py-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 text-sm font-bold transition-colors flex items-center gap-2"
                      title="Salvar como Precedente Relevante"
                    >
                      {isSavingPrecedent[q.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Gavel size={16} />
                      )}
                      <span>Salvar Precedente</span>
                    </button>
                  </div>
                )}
              </div>

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
                          btnClass += 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
                        } else {
                          btnClass += isEliminated
                            ? 'border-slate-100 dark:border-slate-800 opacity-40 grayscale'
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10';
                        }
                      } else if (isCorrect) {
                        btnClass += 'border-green-500 bg-green-50 dark:bg-green-900/10';
                      } else if (isSelected && !isCorrect) {
                        btnClass += 'border-red-500 bg-red-50 dark:bg-red-900/10';
                      } else {
                        btnClass += 'border-slate-200 dark:border-slate-800 opacity-50';
                      }

                      return (
                        <div key={optIdx} className="relative">
                          <button
                            type="button"
                            onClick={() => onAnswerOption(optIdx, q)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              onToggleElimination(q.id, optIdx);
                            }}
                            disabled={showStatus && !isMockMode}
                            className={btnClass}
                            aria-label={`Alternativa ${letter}${statusHint}. ${option}`}
                            aria-pressed={!showStatus ? isSelected : undefined}
                          >
                            <div
                              className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                                showStatus && isCorrect
                                  ? 'bg-green-500 text-white'
                                  : showStatus && isSelected && !isCorrect
                                    ? 'bg-red-500 text-white'
                                    : isSelected && !showStatus
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {letter}
                            </div>
                            <div
                              className={`flex-1 pt-1 text-slate-700 dark:text-slate-300 ${isEliminated && !showStatus ? 'line-through' : ''}`}
                            >
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
                                onToggleElimination(q.id, optIdx);
                              }}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                                isEliminated
                                  ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 opacity-100'
                                  : 'text-slate-300 hover:text-orange-400'
                              }`}
                              title={isEliminated ? 'Restaurar alternativa' : 'Riscar alternativa (Botão Direito)'}
                              aria-label={
                                isEliminated ? `Restaurar alternativa ${letter}` : `Riscar alternativa ${letter}`
                              }
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
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Gerando Correção Estratégica...
                          </p>
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
                                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <h4 className="font-black text-indigo-800 dark:text-indigo-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <BookOpen size={14} aria-hidden /> Doutrina e Contexto
                                    </h4>
                                    <p className="text-indigo-900/80 dark:text-indigo-200/80 text-sm leading-relaxed">
                                      {ac.doctrineAndContext}
                                    </p>
                                  </div>

                                  <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                    <h4 className="font-black text-emerald-800 dark:text-emerald-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Scale size={14} aria-hidden /> Fundamentação Legal
                                    </h4>
                                    <p className="text-emerald-900/80 dark:text-emerald-200/80 text-sm font-medium">
                                      {ac.legalBasis}
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <h4
                                      id={`qb-alt-h-${q.id}`}
                                      className="font-black text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"
                                    >
                                      <Gavel size={14} aria-hidden /> Análise das Alternativas
                                    </h4>
                                    <QuestionAlternativeAnalysisBlocks
                                      analysis={ac.alternativesAnalysis}
                                      headingId={`qb-alt-h-${q.id}`}
                                    />
                                  </div>

                                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-10" aria-hidden>
                                      <Zap size={40} className="text-amber-500" />
                                    </div>
                                    <h4 className="font-black text-amber-800 dark:text-amber-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                      <Lightbulb size={14} aria-hidden /> Pulo do Gato (Dica de Ouro)
                                    </h4>
                                    <p className="text-amber-900/80 dark:text-amber-200/80 text-sm font-bold italic">
                                      &quot;{ac.mnemonic}&quot;
                                    </p>
                                  </div>
                                </div>
                              );
                            })()
                          )}
                          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquareText size={16} className="text-purple-500" />
                              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                                Aprofundar com Mentor IA
                              </span>
                            </div>

                            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                              {(followUpChat[q.id] || []).map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div
                                    className={`max-w-[90%] p-4 rounded-2xl text-xs font-bold shadow-sm ${
                                      msg.role === 'user'
                                        ? 'bg-purple-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-100 dark:border-white/5'
                                    }`}
                                  >
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
                                onChange={(e) =>
                                  setFollowUpInput((prev) => ({ ...prev, [q.id]: e.target.value }))
                                }
                                onKeyDown={(e) => e.key === 'Enter' && onFollowUp(q.id, q.statement)}
                                placeholder="Tire uma dúvida ou peça para aprofundar..."
                                className="flex-1 p-3 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-purple-500"
                              />
                              <button
                                type="button"
                                onClick={() => onFollowUp(q.id, q.statement)}
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
                              type="button"
                              onClick={() => onCreateFlashcardFromError(q)}
                              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${selectedOption === q.correct_answer ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-900/20'}`}
                              disabled={selectedOption === q.correct_answer}
                            >
                              <PlusSquare size={16} /> Virar Flashcard do Erro
                            </button>
                          </div>

                          <QuestionComments
                            questionId={q.id}
                            userId={userId}
                            isAnswered={
                              correctQuestions.includes(q.id) ||
                              wrongQuestions.includes(q.id) ||
                              (expandedQuestionId === q.id && showExplanation)
                            }
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
          );
        })}
      </div>
      <QuestionBankListPagination
        filteredCount={filteredQuestionCount}
        listPageSize={listPageSize}
        listPage={listPage}
        onPrevPage={onPrevListPage}
        onNextPage={onNextListPage}
      />
    </>
  );
}
