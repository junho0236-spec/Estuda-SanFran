import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  Check, 
  X, 
  Zap, 
  Volume2, 
  Activity, 
  Sparkles, 
  Brain, 
  MessageSquare, 
  Send, 
  ArrowRight, 
  Timer, 
  AlertCircle, 
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Lightbulb,
  History,
  Mic,
  MicOff,
  Play,
  Pause,
  SkipForward,
  Settings
} from 'lucide-react';
import { Flashcard, SessionStats, UserProfile } from '../Anki';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import Markdown from 'react-markdown';

interface AnkiStudyProps {
  studyableFlashcards: Flashcard[];
  reviewQueue: Flashcard[];
  sessionStats: SessionStats;
  sessionCounters: { new: number; pending: number; completed: number };
  sessionCardsReviewed: number;
  isFlipped: boolean;
  setIsFlipped: (val: boolean) => void;
  handleReview: (quality: number) => Promise<void>;
  isAudioMode: boolean;
  setIsAudioMode: (val: boolean) => void;
  isSpeaking: boolean;
  audioSpeed: number;
  setAudioSpeed: (val: number) => void;
  isFocusMode: boolean;
  isExtremeFocus: boolean;
  isDissertativeMode: boolean;
  setIsDissertativeMode: (val: boolean) => void;
  userWrittenAnswer: string;
  setUserWrittenAnswer: (val: string) => void;
  isEvaluating: boolean;
  aiEvaluation: any;
  evaluateDissertativeAnswer: () => Promise<void>;
  followUpChat: any[];
  followUpInput: string;
  setFollowUpInput: (val: string) => void;
  handleFollowUp: () => Promise<void>;
  isImageOcclusionMode: boolean;
  occlusionRects: any[];
  revealedOcclusions: Set<number>;
  toggleOcclusion: (idx: number) => void;
  isPracticalCaseMode: boolean;
  practicalCaseData: any;
  handleGeneratePracticalCase: () => Promise<void>;
  isGeneratingPracticalCase: boolean;
  showPracticalCaseModal: boolean;
  setShowPracticalCaseModal: (val: boolean) => void;
  isJurisprudenceLoading: boolean;
  jurisprudenceResult: any;
  handleCheckJurisprudence: () => Promise<void>;
  showJurisprudenceModal: boolean;
  setShowJurisprudenceModal: (val: boolean) => void;
  isGeneratingMnemonic: boolean;
  generatedMnemonic: string;
  handleGenerateMnemonic: () => Promise<void>;
  showMnemonicModal: boolean;
  setShowMnemonicModal: (val: boolean) => void;
  userProfile: UserProfile | null;
  setMode: (mode: string) => void;
  setSearchQuery: (query: string) => void;
  startStudySession: (onlyErrors?: boolean) => void;
  setSessionStats: React.Dispatch<React.SetStateAction<SessionStats>>;
  currentTime: number;
  dailyGoal: number;
  getButtonLabel: (quality: number, card: Flashcard) => string;
  SmartText: React.FC<{ text: string }>;
  MarkdownWithLegalLinks: React.FC<{ content: string }>;
}

export const AnkiStudy: React.FC<AnkiStudyProps> = ({
  studyableFlashcards,
  reviewQueue,
  sessionStats,
  sessionCounters,
  sessionCardsReviewed,
  isFlipped,
  setIsFlipped,
  handleReview,
  isAudioMode,
  setIsAudioMode,
  isSpeaking,
  audioSpeed,
  setAudioSpeed,
  isFocusMode,
  isExtremeFocus,
  isDissertativeMode,
  setIsDissertativeMode,
  userWrittenAnswer,
  setUserWrittenAnswer,
  isEvaluating,
  aiEvaluation,
  evaluateDissertativeAnswer,
  followUpChat,
  followUpInput,
  setFollowUpInput,
  handleFollowUp,
  isImageOcclusionMode,
  occlusionRects,
  revealedOcclusions,
  toggleOcclusion,
  isPracticalCaseMode,
  practicalCaseData,
  handleGeneratePracticalCase,
  isGeneratingPracticalCase,
  showPracticalCaseModal,
  setShowPracticalCaseModal,
  isJurisprudenceLoading,
  jurisprudenceResult,
  handleCheckJurisprudence,
  showJurisprudenceModal,
  setShowJurisprudenceModal,
  isGeneratingMnemonic,
  generatedMnemonic,
  handleGenerateMnemonic,
  showMnemonicModal,
  setShowMnemonicModal,
  userProfile,
  setMode,
  setSearchQuery,
  startStudySession,
  setSessionStats,
  currentTime,
  dailyGoal,
  getButtonLabel,
  SmartText,
  MarkdownWithLegalLinks
}) => {
  const currentCard = reviewQueue[0];

  const renderPerformanceSummary = () => {
    const { new: newStats, learning, review, errors } = sessionStats;
    
    const chartData = [
      { 
        name: 'Novos', 
        acertos: newStats.total > 0 ? Math.round((newStats.correct / newStats.total) * 100) : 0, 
        total: newStats.total, 
        color: '#3b82f6',
        avgTime: newStats.total > 0 ? (newStats.totalTimeMs / newStats.total / 1000).toFixed(1) : 0
      },
      { 
        name: 'Aprender', 
        acertos: learning.total > 0 ? Math.round((learning.correct / learning.total) * 100) : 0, 
        total: learning.total, 
        color: '#ef4444',
        avgTime: learning.total > 0 ? (learning.totalTimeMs / learning.total / 1000).toFixed(1) : 0
      },
      { 
        name: 'Revisão', 
        acertos: review.total > 0 ? Math.round((review.correct / review.total) * 100) : 0, 
        total: review.total, 
        color: '#22c55e',
        avgTime: review.total > 0 ? (review.totalTimeMs / review.total / 1000).toFixed(1) : 0
      },
    ].filter(d => d.total > 0);

    const totalStudied = newStats.total + learning.total + review.total;
    const totalCorrect = newStats.correct + learning.correct + review.correct;
    const totalTimeMs = newStats.totalTimeMs + learning.totalTimeMs + review.totalTimeMs;
    const overallAccuracy = totalStudied > 0 ? Math.round((totalCorrect / totalStudied) * 100) : 0;
    const avgSessionTimeMs = totalStudied > 0 ? totalTimeMs / totalStudied : 0;

    const criticalCards = sessionStats.cardTimes.filter(ct => ct.timeMs > avgSessionTimeMs * 3 && ct.timeMs > 5000);
    
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
              Você estudou {sessionCardsReviewed} cards nesta sessão. Faltaram {remaining} para limpar o deck, mas sua taxa de acerto foi de {overallAccuracy}%.
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Você limpou o deck! Estudou {sessionCardsReviewed} cards com uma taxa de acerto de {overallAccuracy}%.
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

            {userProfile && (
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Zap className="w-6 h-6 fill-yellow-300 text-yellow-300" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase text-xs tracking-widest opacity-80">Progresso da Sessão</h3>
                      <p className="text-xl font-black">+{sessionCardsReviewed * 5} XP Acumulado</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Streak Atual</span>
                    <p className="text-2xl font-black">{userProfile.streak_days || 0} Dias</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Mascote Nível {userProfile.mascot_level || 1}</span>
                    <span>{userProfile.mascot_xp || 0} XP Total</span>
                  </div>
                  <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, ((userProfile.mascot_xp || 0) % 500) / 5)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

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
                      // showToast("A IA analisará estes cards para sugerir simplificações em breve!", "info");
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

  if (!sessionStats.isActive) {
    return renderPerformanceSummary();
  }

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
          <CheckSquare className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-black uppercase tracking-tight">Deck Limpo!</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs">Você revisou todos os cards disponíveis por enquanto. Volte mais tarde ou adicione novos cards!</p>
        <button 
          onClick={() => setMode('browse')}
          className="px-8 py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl"
        >
          Voltar ao Acervo
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header da Sessão */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-[10px] font-black text-blue-500">{sessionCounters.new}</span>
            </div>
            <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-[10px] font-black text-red-500">{sessionCounters.pending}</span>
            </div>
            <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[10px] font-black text-green-500">{sessionCounters.completed}</span>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <Timer className="w-3 h-3" />
            <span>{Math.floor((currentTime - sessionStats.startTime) / 60000)}m estudando</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAudioMode(!isAudioMode)}
            className={`p-3 rounded-xl transition-all ${isAudioMode ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
            title="Modo Áudio"
          >
            <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
          </button>
          <button 
            onClick={() => setIsDissertativeMode(!isDissertativeMode)}
            className={`p-3 rounded-xl transition-all ${isDissertativeMode ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
            title="Modo Dissertativo"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setSessionStats(prev => ({ ...prev, isActive: false }));
              setMode('browse');
            }}
            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-red-500 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Card Principal */}
      <div className="relative perspective-1000 min-h-[400px]">
        <motion.div
          className="w-full h-full"
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Frente do Card */}
          <div 
            className={`absolute inset-0 w-full h-full bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border-4 border-slate-100 dark:border-slate-800 p-8 sm:p-12 flex flex-col items-center justify-center text-center backface-hidden ${isFlipped ? 'pointer-events-none' : ''}`}
          >
            <div className="absolute top-8 left-8 flex items-center gap-2">
              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                {currentCard.tags?.[0] || 'Geral'}
              </div>
              {currentCard.is_ai_generated && (
                <Sparkles className="w-4 h-4 text-purple-500" />
              )}
            </div>

            <div className="space-y-6 max-w-2xl">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                <SmartText text={currentCard.front} />
              </div>
              
              {isImageOcclusionMode && currentCard.image_url && (
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                  <img 
                    src={currentCard.image_url} 
                    alt="Occlusion" 
                    className="max-h-[300px] object-contain"
                    referrerPolicy="no-referrer"
                  />
                  {occlusionRects.map((rect, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOcclusion(idx);
                      }}
                      className={`absolute cursor-pointer transition-all duration-300 ${revealedOcclusions.has(idx) ? 'opacity-0 scale-95' : 'bg-slate-900 dark:bg-slate-800 opacity-100 shadow-lg'}`}
                      style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.width}%`,
                        height: `${rect.height}%`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {!isFlipped && !isDissertativeMode && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setIsFlipped(true)}
                className="absolute bottom-12 px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
              >
                Mostrar Resposta
              </motion.button>
            )}
          </div>

          {/* Verso do Card */}
          <div 
            className={`absolute inset-0 w-full h-full bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border-4 border-slate-100 dark:border-slate-800 p-8 sm:p-12 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 ${!isFlipped ? 'pointer-events-none' : ''}`}
          >
            <div className="absolute top-8 left-8 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">
              Resposta
            </div>

            <div className="space-y-6 max-w-2xl overflow-y-auto max-h-[250px] custom-scrollbar pr-2">
              <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                <MarkdownWithLegalLinks content={currentCard.back} />
              </div>
            </div>

            {/* Ações de IA no Verso */}
            <div className="absolute top-8 right-8 flex items-center gap-2">
              <button 
                onClick={handleGeneratePracticalCase}
                disabled={isGeneratingPracticalCase}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-xl transition-all"
                title="Gerar Caso Prático"
              >
                <Brain className={`w-5 h-5 ${isGeneratingPracticalCase ? 'animate-pulse' : ''}`} />
              </button>
              <button 
                onClick={handleCheckJurisprudence}
                disabled={isJurisprudenceLoading}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-xl transition-all"
                title="Checar Jurisprudência"
              >
                <Activity className={`w-5 h-5 ${isJurisprudenceLoading ? 'animate-pulse' : ''}`} />
              </button>
              <button 
                onClick={handleGenerateMnemonic}
                disabled={isGeneratingMnemonic}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 rounded-xl transition-all"
                title="Gerar Mnemônico"
              >
                <Lightbulb className={`w-5 h-5 ${isGeneratingMnemonic ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modo Dissertativo Overlay */}
      <AnimatePresence>
        {isDissertativeMode && !isFlipped && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border-2 border-slate-100 dark:border-slate-800 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <Brain className="w-5 h-5" />
                <span className="font-black uppercase text-xs tracking-widest">Avaliação Dissertativa IA</span>
              </div>
              <button 
                onClick={() => setIsDissertativeMode(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea 
              value={userWrittenAnswer}
              onChange={(e) => setUserWrittenAnswer(e.target.value)}
              placeholder="Escreva sua resposta aqui para ser avaliado pela IA..."
              className="w-full h-32 p-6 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-slate-700 rounded-3xl font-medium outline-none focus:border-indigo-500 transition-all resize-none"
            />

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsFlipped(true)}
                className="px-6 py-3 text-slate-500 font-black uppercase text-[10px] tracking-widest"
              >
                Pular Avaliação
              </button>
              <button 
                onClick={evaluateDissertativeAnswer}
                disabled={!userWrittenAnswer.trim() || isEvaluating}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isEvaluating ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Avaliando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar para IA
                  </>
                )}
              </button>
            </div>

            {aiEvaluation && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${aiEvaluation.score >= 70 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    Nota: {aiEvaluation.score}%
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{aiEvaluation.feedback}</p>
                </div>

                {/* Chat de Follow-up */}
                <div className="space-y-4 bg-slate-50 dark:bg-black/20 p-6 rounded-3xl">
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {followUpChat.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm'}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      value={followUpInput}
                      onChange={(e) => setFollowUpInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
                      placeholder="Tire uma dúvida sobre a avaliação..."
                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500"
                    />
                    <button 
                      onClick={handleFollowUp}
                      className="p-2 bg-indigo-600 text-white rounded-xl"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setIsFlipped(true)}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest"
                >
                  Ver Resposta Oficial
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controles de Resposta (Apenas quando virado) */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {[
              { label: 'De novo', quality: 0, color: 'bg-red-500', hover: 'hover:bg-red-600', shadow: 'shadow-red-500/20' },
              { label: 'Difícil', quality: 2, color: 'bg-orange-500', hover: 'hover:bg-orange-600', shadow: 'shadow-orange-500/20' },
              { label: 'Bom', quality: 3, color: 'bg-green-500', hover: 'hover:bg-green-600', shadow: 'shadow-green-500/20' },
              { label: 'Fácil', quality: 5, color: 'bg-blue-500', hover: 'hover:bg-blue-600', shadow: 'shadow-blue-500/20' },
            ].map((btn) => (
              <button
                key={btn.quality}
                onClick={() => handleReview(btn.quality)}
                className={`flex flex-col items-center justify-center p-6 ${btn.color} text-white rounded-[2rem] shadow-xl ${btn.shadow} ${btn.hover} transition-all group`}
              >
                <span className="text-xs font-black uppercase tracking-widest mb-1">{btn.label}</span>
                <span className="text-[10px] font-bold opacity-70 group-hover:opacity-100 transition-opacity">
                  {getButtonLabel(btn.quality, currentCard)}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modais de IA */}
      {showPracticalCaseModal && practicalCaseData && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-8 rounded-[3rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-indigo-600">
                <Brain className="w-6 h-6" />
                <h3 className="text-xl font-black uppercase tracking-tighter">Caso Prático IA</h3>
              </div>
              <button onClick={() => setShowPracticalCaseModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-black/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">"{practicalCaseData.case}"</p>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-black uppercase tracking-widest text-slate-400">Resolução Sugerida</p>
              <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{practicalCaseData.resolution}</p>
            </div>
            <button 
              onClick={() => setShowPracticalCaseModal(false)}
              className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {showJurisprudenceModal && jurisprudenceResult && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-8 rounded-[3rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-emerald-600">
                <Activity className="w-6 h-6" />
                <h3 className="text-xl font-black uppercase tracking-tighter">Jurisprudência Atualizada</h3>
              </div>
              <button onClick={() => setShowJurisprudenceModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center ${jurisprudenceResult.status === 'updated' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {jurisprudenceResult.status === 'updated' ? 'Conteúdo Atualizado' : 'Atenção: Possível Desatualização'}
              </div>
              <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{jurisprudenceResult.analysis}</p>
              {jurisprudenceResult.sources && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fontes Consultadas</p>
                  <div className="flex flex-wrap gap-2">
                    {jurisprudenceResult.sources.map((s: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowJurisprudenceModal(false)}
              className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {showMnemonicModal && generatedMnemonic && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-[3rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-amber-500">
                <Lightbulb className="w-6 h-6" />
                <h3 className="text-xl font-black uppercase tracking-tighter">Mnemônico Criativo</h3>
              </div>
              <button onClick={() => setShowMnemonicModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-[2rem] border-2 border-dashed border-amber-200 dark:border-amber-800/50 text-center">
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-tight">
                {generatedMnemonic}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
              Use este mnemônico para facilitar a memorização do conteúdo deste card.
            </p>
            <button 
              onClick={() => setShowMnemonicModal(false)}
              className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest"
            >
              Gostei!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
