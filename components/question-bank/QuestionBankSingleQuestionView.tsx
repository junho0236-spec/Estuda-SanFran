import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  X,
  Target,
  AlertCircle,
  Clock,
  Star,
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
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Bookmark,
} from 'lucide-react';
import type { Question, QuestionAiCommentary, QuestionAiCorrection } from '../../types';
import { QuestionComments } from '../QuestionComments';
import { QB_OPTION_FOCUS } from './questionBankHelpers';
import { QuestionAlternativeAnalysisBlocks } from './QuestionAlternativeAnalysisBlocks';

export type FollowUpMessage = { role: 'user' | 'assistant'; text: string };

export type QuestionBankSingleQuestionViewProps = {
  onBackToList: () => void;
  currentQuestion: Question;
  userId: string;
  getXRayStats: (questionId: string) => {
    totalAttempts: number;
    correctAttempts: number;
    lastAttemptCorrect: boolean;
    avgTime: string;
  };
  onDeleteQuestion: (questionId: string) => void;
  showXRay: boolean;
  favorites: string[];
  onToggleFavorite: (questionId: string) => void;
  selectedText: string;
  onJuridiquesTranslate: () => void;
  loadingJuridiquesExplanation: boolean;
  onAnswerOption: (optionIndex: number) => void;
  isMockMode: boolean;
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
  onCreateFlashcardFromError: (
    question: Question,
    selectedIndex?: number,
    isCorrect?: boolean
  ) => void;
  confidenceLevel: 'certeza' | 'duvida' | 'chute' | null;
  onSaveAsPrecedent: (question: Question) => void;
  isSavingPrecedent: Record<string, boolean>;
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveNote: (questionId: string, value: string) => void;
  correctQuestions: string[];
  wrongQuestions: string[];
  showNotification: (message: string, type?: 'success' | 'error') => void;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  filteredQuestionCount: number;
  mockQuestionCount: number;
  mockNavUnansweredOnly: boolean;
  getPrevUnansweredMockIndex: (idx: number) => number;
  getNextUnansweredMockIndex: (idx: number) => number;
  mockMarkReviewLater: Record<string, boolean>;
  setMockMarkReviewLater: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  resolvedPreviewQuestionId?: string | null;
  isUnresolvedFilterActive?: boolean;
};

export function QuestionBankSingleQuestionView({
  onBackToList,
  currentQuestion,
  userId,
  getXRayStats,
  onDeleteQuestion,
  showXRay,
  favorites,
  onToggleFavorite,
  selectedText,
  onJuridiquesTranslate,
  loadingJuridiquesExplanation,
  onAnswerOption,
  isMockMode,
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
  confidenceLevel,
  onSaveAsPrecedent,
  isSavingPrecedent,
  notes,
  setNotes,
  onSaveNote,
  correctQuestions,
  wrongQuestions,
  showNotification,
  onPrev,
  onNext,
  currentIndex,
  filteredQuestionCount,
  mockQuestionCount,
  mockNavUnansweredOnly,
  getPrevUnansweredMockIndex,
  getNextUnansweredMockIndex,
  mockMarkReviewLater,
  setMockMarkReviewLater,
  resolvedPreviewQuestionId,
  isUnresolvedFilterActive,
}: QuestionBankSingleQuestionViewProps) {
  const q = currentQuestion;
  const statsHeader = getXRayStats(q.id);
  const isRecentlyResolvedPreview =
    !!isUnresolvedFilterActive && !!showExplanation && resolvedPreviewQuestionId === q.id;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBackToList}
        className="self-start flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-bold text-sm uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
      >
        <ArrowLeft size={18} /> Voltar para a Lista
      </button>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
          {q.user_id === userId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteQuestion(q.id);
              }}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
              title="Excluir questão permanentemente"
            >
              <X size={20} />
            </button>
          )}
          {statsHeader.totalAttempts > 0 && (
            <div className={statsHeader.lastAttemptCorrect ? 'text-green-500' : 'text-red-500'}>
              <Target size={32} />
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">
                {q.subject}
              </span>
              {q.topic && (
                <span className="inline-block px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold uppercase tracking-wider">
                  {q.topic}
                </span>
              )}
              {isRecentlyResolvedPreview && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-900/40">
                  <CheckCircle2 size={12} /> Recém Respondida
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-4 text-xs font-medium text-slate-500">
                <span>
                  Ano: <span className="text-slate-900 dark:text-white">{q.year || 'N/A'}</span>
                </span>
                <span>
                  Banca: <span className="text-slate-900 dark:text-white">{q.exam_board || 'N/A'}</span>
                </span>
              </div>

              {showXRay && (
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const stats = getXRayStats(q.id);
                    return (
                      <>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                          <Target size={20} className="text-blue-500" />
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
              type="button"
              onClick={() => onToggleFavorite(q.id)}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 active:scale-90"
              title={favorites.includes(q.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Star
                size={20}
                className={`transition-all duration-300 ${
                  favorites.includes(q.id) ? 'fill-yellow-500 text-yellow-500 scale-110' : 'text-slate-400'
                }`}
              />
            </button>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                q.difficulty === 'facil'
                  ? 'bg-green-100 text-green-700'
                  : q.difficulty === 'media'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {q.difficulty}
            </span>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div
            id={`qb-statement-${q.id}`}
            className="text-lg md:text-xl text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-4 whitespace-pre-wrap"
          >
            {q.statement}
          </div>
          {!!selectedText && (
            <button
              type="button"
              onClick={onJuridiquesTranslate}
              disabled={loadingJuridiquesExplanation}
              className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingJuridiquesExplanation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquareText size={18} />
              )}{' '}
              Traduzir Juridiquês
            </button>
          )}

          <div
            className="space-y-3"
            role="group"
            aria-label="Alternativas da questão"
            aria-labelledby={`qb-statement-${q.id}`}
          >
            {q.options.map((option, idx) => {
              const isSelected = isMockMode ? mockAnswers[q.id] === idx : selectedOption === idx;
              const isCorrect = q.correct_answer === idx;
              const showStatus = isMockMode ? isMockFinished : showExplanation;
              const isEliminated = (eliminatedOptions[q.id] || []).includes(idx);
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
                <div key={idx} className="relative">
                  <button
                    type="button"
                    onClick={() => onAnswerOption(idx)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onToggleElimination(q.id, idx);
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
                      className={`flex-1 pt-1 text-slate-700 dark:text-slate-300 ${
                        isEliminated && !showStatus ? 'line-through' : ''
                      }`}
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
                        onToggleElimination(q.id, idx);
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
                  className="p-12 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-4"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" aria-hidden />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">
                    Consultando Jurisprudência...
                  </p>
                </div>
              ) : aiCommentary[q.id] ? (
                <>
                  {typeof aiCommentary[q.id] === 'string' ? (
                    <div className="space-y-6" role="region" aria-label="Correção em texto da inteligência artificial">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                          Correção Comentada IA
                        </span>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Markdown remarkPlugins={[remarkGfm]}>{aiCommentary[q.id] as string}</Markdown>
                        </div>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const ac = aiCommentary[q.id] as QuestionAiCorrection;
                      return (
                        <div
                          className="space-y-6"
                          role="region"
                          aria-label="Correção comentada pela inteligência artificial"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                              Correção Comentada IA
                            </span>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                {'"'}{ac.mnemonic}{'"'}
                              </p>
                            </div>
                          </div>

                          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 space-y-3">
                            <h4
                              id={`qb-alt-h-single-${q.id}`}
                              className="font-black text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2"
                            >
                              <Gavel size={16} aria-hidden /> Análise Técnica das Alternativas
                            </h4>
                            <QuestionAlternativeAnalysisBlocks
                              analysis={ac.alternativesAnalysis}
                              headingId={`qb-alt-h-single-${q.id}`}
                            />
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

                  <div className="flex gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        onCreateFlashcardFromError(
                          q,
                          selectedOption,
                          selectedOption === q.correct_answer
                        )
                      }
                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${
                        selectedOption === q.correct_answer && confidenceLevel === 'certeza'
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700 shadow-xl shadow-purple-900/20 active:scale-95'
                      }`}
                      disabled={selectedOption === q.correct_answer && confidenceLevel === 'certeza'}
                    >
                      <PlusSquare size={20} />{' '}
                      {selectedOption === q.correct_answer ? 'Flashcard da Dúvida' : 'Flashcard do Erro'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveAsPrecedent(q)}
                      disabled={isSavingPrecedent[q.id]}
                      className="flex-1 py-4 bg-white dark:bg-slate-800 border-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-purple-900/5 active:scale-95"
                    >
                      {isSavingPrecedent[q.id] ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Gavel size={20} />
                      )}
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
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <LayoutList size={18} /> Minhas Anotações
            </h4>
            <div className="relative">
              <textarea
                value={notes[q.id] || ''}
                onChange={(e) => {
                  const newNotes = { ...notes, [q.id]: e.target.value };
                  setNotes(newNotes);
                }}
                onBlur={(e) => {
                  onSaveNote(q.id, e.target.value);
                }}
                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm text-slate-700 dark:text-slate-300 min-h-[100px]"
                placeholder="Adicione suas observações sobre esta questão..."
              />
              <div className="absolute bottom-3 right-3">
                <button
                  type="button"
                  onClick={() => onSaveNote(q.id, notes[q.id] || '')}
                  className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  title="Salvar anotação"
                >
                  <CheckCircle2 size={16} />
                </button>
              </div>
            </div>
          </div>

          <QuestionComments
            questionId={q.id}
            userId={userId}
            isAnswered={
              correctQuestions.includes(q.id) || wrongQuestions.includes(q.id) || showExplanation
            }
            questionTitle={q.statement}
            showNotification={showNotification}
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={
              isMockMode && mockQuestionCount > 0
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
              {currentIndex + 1} / {isMockMode && mockQuestionCount > 0 ? mockQuestionCount : filteredQuestionCount}
            </span>
            {isMockMode && (
              <button
                type="button"
                onClick={() =>
                  setMockMarkReviewLater((prev) => ({
                    ...prev,
                    [q.id]: !prev[q.id],
                  }))
                }
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  mockMarkReviewLater[q.id]
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
                    : 'bg-slate-200/80 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                <Bookmark size={12} className={mockMarkReviewLater[q.id] ? 'fill-current' : ''} />
                Revisar depois
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onNext}
            disabled={
              isMockMode && mockQuestionCount > 0
                ? mockNavUnansweredOnly
                  ? getNextUnansweredMockIndex(currentIndex) < 0
                  : currentIndex === mockQuestionCount - 1
                : currentIndex === filteredQuestionCount - 1
            }
            className="px-4 py-2 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors font-bold text-sm uppercase tracking-wider"
          >
            Próxima <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
