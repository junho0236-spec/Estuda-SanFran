import React from 'react';
import { motion, AnimatePresence, type MotionValue } from 'motion/react';
import type { PanInfo } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import {
  Minimize2,
  Maximize2,
  RotateCcw,
  Smartphone,
  X,
  Check,
  Loader2,
  Sparkles,
  Edit2,
  MessageSquareText,
  Send,
  Paperclip,
  ArrowRight,
} from 'lucide-react';
import { GlossaryText } from '../GlossaryText.tsx';
import { SmartText } from '../SmartVadeMecum';
import type { Flashcard } from '../../types';
import type { SessionStats } from './types';

export interface AiEvaluationState {
  score: number;
  feedback: string;
  missing_keywords: string[];
  is_perfect: boolean;
}

export interface AnkiStudyActiveViewProps {
  isFocusMode: boolean;
  setIsFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
  setMode: React.Dispatch<React.SetStateAction<'browse' | 'study' | 'create' | 'bulk' | 'ai_create' | 'community'>>;
  currentCard: Flashcard | null;
  sessionCounters: { new: number; pending: number; completed: number };
  undoAction: () => void;
  redoAction: () => void;
  undoStack: unknown[];
  redoStack: unknown[];
  cardTimer: number;
  isCramMode: boolean;
  dragX: MotionValue<number>;
  swipeDirection: 'left' | 'right' | null;
  setSwipeDirection: React.Dispatch<React.SetStateAction<'left' | 'right' | null>>;
  isFlipped: boolean;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  isDissertativeMode: boolean;
  setIsDissertativeMode: React.Dispatch<React.SetStateAction<boolean>>;
  userWrittenAnswer: string;
  setUserWrittenAnswer: React.Dispatch<React.SetStateAction<string>>;
  handleEvaluateDissertative: () => void;
  isEvaluating: boolean;
  aiEvaluation: AiEvaluationState | null;
  setAiEvaluation: React.Dispatch<React.SetStateAction<AiEvaluationState | null>>;
  followUpChat: { role: 'user' | 'model'; text: string }[];
  followUpInput: string;
  setFollowUpInput: React.Dispatch<React.SetStateAction<string>>;
  isFollowUpLoading: boolean;
  handleFollowUp: () => void;
  handleTermClick: (term: string, position: { x: number; y: number }) => void;
  handleNextCram: () => void;
  handleReview: (quality: number) => void;
  getButtonLabel: (quality: number, card: Flashcard) => string;
  isAudioMode: boolean;
  audioSpeed: number;
  setAudioSpeed: React.Dispatch<React.SetStateAction<number>>;
  leftOverlayOpacity: MotionValue<number>;
  rightOverlayOpacity: MotionValue<number>;
  setSessionStats: React.Dispatch<React.SetStateAction<SessionStats>>;
}

export const AnkiStudyActiveView: React.FC<AnkiStudyActiveViewProps> = ({
  isFocusMode,
  setIsFocusMode,
  setMode,
  currentCard,
  sessionCounters,
  undoAction,
  redoAction,
  undoStack,
  redoStack,
  cardTimer,
  isCramMode,
  dragX,
  swipeDirection,
  setSwipeDirection,
  isFlipped,
  setIsFlipped,
  isDissertativeMode,
  setIsDissertativeMode,
  userWrittenAnswer,
  setUserWrittenAnswer,
  handleEvaluateDissertative,
  isEvaluating,
  aiEvaluation,
  setAiEvaluation,
  followUpChat,
  followUpInput,
  setFollowUpInput,
  isFollowUpLoading,
  handleFollowUp,
  handleTermClick,
  handleNextCram,
  handleReview,
  getButtonLabel,
  isAudioMode,
  audioSpeed,
  setAudioSpeed,
  leftOverlayOpacity,
  rightOverlayOpacity,
  setSessionStats,
}) => (
  <div className={`flex flex-col items-center animate-in fade-in zoom-in ${isFocusMode ? 'w-full max-w-4xl' : 'py-10'}`}>
    <div
      className={`w-full max-w-2xl mb-8 flex items-center justify-between ${isFocusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-500' : ''}`}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setIsFocusMode(!isFocusMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isFocusMode ? 'bg-white text-slate-950' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
        >
          {isFocusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {isFocusMode ? 'Sair do Foco' : 'Modo Foco'}
          <span className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[8px] ml-1">F</span>
        </button>
        <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest">
          <span
            className={`text-blue-500 flex items-center gap-1 transition-all ${!currentCard?.status || currentCard?.status === 'new' ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'opacity-70'}`}
            title="Novos"
          >
            <div
              className={`w-2 h-2 rounded-full bg-blue-500 transition-all ${!currentCard?.status || currentCard?.status === 'new' ? 'scale-[1.4] shadow-[0_0_8px_rgba(59,130,246,0.8)]' : ''}`}
            />
            {sessionCounters.new}
          </span>
          <span
            className={`text-red-500 flex items-center gap-1 transition-all ${currentCard?.status === 'learning' || currentCard?.status === 'relearning' ? 'scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'opacity-70'}`}
            title="Aprender/Revisar"
          >
            <div
              className={`w-2 h-2 rounded-full bg-red-500 transition-all ${currentCard?.status === 'learning' || currentCard?.status === 'relearning' ? 'scale-[1.4] shadow-[0_0_8px_rgba(239,68,68,0.8)]' : ''}`}
            />
            {sessionCounters.pending}
          </span>
          <span
            className={`text-green-500 flex items-center gap-1 transition-all ${currentCard?.status === 'review' ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'opacity-70'}`}
            title="Concluídos"
          >
            <div
              className={`w-2 h-2 rounded-full bg-green-500 transition-all ${currentCard?.status === 'review' ? 'scale-[1.4] shadow-[0_0_8px_rgba(34,197,94,0.8)]' : ''}`}
            />
            {sessionCounters.completed}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            onClick={undoAction}
            disabled={undoStack.length === 0}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 disabled:opacity-30 transition-colors"
            title="Desfazer (Ctrl+Z)"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
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
        <button type="button" onClick={() => setMode('browse')} className="text-slate-400 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>
      )}
    </div>

    <div className="relative w-full max-w-2xl min-h-[550px] preserve-3d group/card">
      <AnimatePresence mode="wait">
        {currentCard && (
          <motion.div
            key={currentCard.id}
            initial={{
              opacity: 0,
              scale: 0.9,
              x: swipeDirection === 'left' ? 300 : swipeDirection === 'right' ? -300 : 0,
            }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{
              opacity: 0,
              scale: 0.9,
              x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0,
              rotate: swipeDirection === 'left' ? -20 : swipeDirection === 'right' ? 20 : 0,
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            style={{ x: dragX }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_e: unknown, info: PanInfo) => {
              if (info.offset.x > 100) {
                setSwipeDirection('right');
                if (isCramMode) {
                  handleNextCram();
                } else {
                  handleReview(3);
                }
              } else if (info.offset.x < -100) {
                setSwipeDirection('left');
                if (isCramMode) {
                  handleNextCram();
                } else {
                  handleReview(0);
                }
              }
            }}
            className="absolute inset-0 w-full h-full"
          >
            <div
              className={`relative w-full h-full cursor-pointer transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
              onClick={() => !isDissertativeMode && setIsFlipped(!isFlipped)}
            >
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
                  <div
                    className="w-full mt-8 space-y-4 animate-in slide-in-from-bottom-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <textarea
                      value={userWrittenAnswer}
                      onChange={(e) => setUserWrittenAnswer(e.target.value)}
                      placeholder="Digite sua resposta dissertativa aqui..."
                      className="w-full h-32 p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold resize-none outline-none focus:border-sanfran-rubi"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDissertativeMode(false)}
                        className="px-4 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
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
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDissertativeMode(true);
                    }}
                    className="mt-8 px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sanfran-rubi hover:text-white transition-all flex items-center gap-2"
                  >
                    <small>
                      <Edit2 size={14} />
                    </small>{' '}
                    Responder por Escrito
                  </button>
                )}

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <span className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Pressione Espaço para virar
                  </span>
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
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAiEvaluation(null);
                                setIsFlipped(false);
                                setIsDissertativeMode(true);
                              }}
                              className="p-1 text-slate-400 hover:text-purple-600 rounded-lg transition-colors"
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
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                              Sua Resposta:
                            </span>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 italic">&quot;{userWrittenAnswer}&quot;</p>
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed mb-4 font-bold">
                            <ReactMarkdown>{aiEvaluation.feedback || ''}</ReactMarkdown>
                          </div>
                          {(aiEvaluation.missing_keywords || []).length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">O que faltou:</span>
                              <div className="flex flex-wrap gap-2">
                                {(aiEvaluation.missing_keywords || []).map((kw, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-black border border-red-100 dark:border-red-800/30"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div
                            className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 space-y-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquareText size={16} className="text-purple-500" />
                              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                                Aprofundar com Mentor IA
                              </span>
                            </div>

                            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                              {followUpChat.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div
                                    className={`max-w-[90%] p-4 rounded-2xl text-xs font-bold shadow-sm ${
                                      msg.role === 'user'
                                        ? 'bg-purple-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-100 dark:border-white/5'
                                    }`}
                                  >
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
                                type="button"
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
                        <img
                          src={currentCard.image}
                          alt="Flashcard"
                          className="max-w-full h-auto rounded-2xl border border-slate-200 dark:border-white/10 mx-auto shadow-lg"
                        />
                      </div>
                    )}

                    <div className="w-full text-left">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                        Gabarito Oficial
                      </span>
                      <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-6">
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-center">
                          <GlossaryText text={currentCard.back} onTermClick={handleTermClick} />
                        </div>
                      </div>
                    </div>
                    {currentCard.notes && (
                      <div className="w-full mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl text-left">
                        <span className="text-[10px] font-black text-yellow-800 dark:text-yellow-500 uppercase tracking-widest block mb-2">
                          Notas Pessoais
                        </span>
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
                        <div
                          key={idx}
                          className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-full text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/30"
                        >
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
    {isFlipped && currentCard && (
      <div
        className={`mt-12 w-full max-w-2xl flex flex-col items-center gap-6 ${isFocusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-500' : ''}`}
      >
        {isCramMode ? (
          <button
            type="button"
            onClick={handleNextCram}
            className="w-full p-6 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-transform"
          >
            Próximo Card <ArrowRight size={18} />
            <span className="px-2 py-0.5 bg-black/20 rounded text-[8px]">Enter</span>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-4 w-full">
            <button
              type="button"
              onClick={() => handleReview(0)}
              className="flex flex-col items-center gap-1 p-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-transform"
            >
              <span>Errei</span>
              <span className="text-[8px] opacity-60">~{getButtonLabel(0, currentCard)}</span>
              <span className="px-2 py-0.5 bg-black/20 rounded text-[8px]">1</span>
            </button>
            <button
              type="button"
              onClick={() => handleReview(2)}
              className="flex flex-col items-center gap-1 p-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-transform"
            >
              <span>Difícil</span>
              <span className="text-[8px] opacity-60">~{getButtonLabel(2, currentCard)}</span>
              <span className="px-2 py-0.5 bg-black/20 rounded text-[8px]">2</span>
            </button>
            <button
              type="button"
              onClick={() => handleReview(3)}
              className="flex flex-col items-center gap-1 p-4 bg-usp-gold text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-transform"
            >
              <span>Bom</span>
              <span className="text-[8px] opacity-60">{getButtonLabel(3, currentCard)}</span>
              <span className="px-2 py-0.5 bg-black/20 rounded text-[8px]">3</span>
            </button>
            <button
              type="button"
              onClick={() => handleReview(5)}
              className="flex flex-col items-center gap-1 p-4 bg-usp-blue text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-transform"
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
              {[1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  type="button"
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
      <button
        type="button"
        onClick={() => {
          window.speechSynthesis.cancel();
          setSessionStats((prev) => ({ ...prev, isFinished: true }));
        }}
        className="mt-12 text-slate-400 font-black text-xs uppercase underline hover:text-red-500 transition-colors"
      >
        Sair da Audiência
      </button>
    )}
  </div>
);
