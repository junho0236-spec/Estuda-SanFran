import React from 'react';
import { motion } from 'motion/react';
import {
  Folder as FolderIcon,
  Flame,
  Trophy,
  Activity,
  TrendingUp,
  Calendar,
  AlertCircle,
  Search,
  Edit2,
  Play,
  Pause,
  Trash2,
  CheckSquare,
  Square,
  MoreVertical,
  FileDown,
  RotateCcw,
  Sparkles,
  Archive,
  BrainCircuit,
} from 'lucide-react';
import { SmartText } from '../SmartVadeMecum';
import { FOLDER_ICONS } from './constants';
import type {
  AnkiStreakStats,
  AnkiForecastDay,
  HeatmapHoverState,
  Flashcard,
  Folder,
  Subject,
} from './ankiBrowseTypes';
import type { SessionStats } from './types';

export interface AnkiBrowseViewProps {
  showRootDashboard: boolean;
  stats: AnkiStreakStats;
  dailyGoal: number;
  studyHistory: Record<string, number>;
  hoveredHeatmapDay: HeatmapHoverState;
  setHoveredHeatmapDay: React.Dispatch<React.SetStateAction<HeatmapHoverState>>;
  onHeatmapDateClick: (dateStr: string) => void;
  forecast: AnkiForecastDay[];
  maxForecast: number;
  sessionStats: SessionStats;
  isAdvanceMode: boolean;
  setIsAdvanceMode: React.Dispatch<React.SetStateAction<boolean>>;
  startStudySession: () => void;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  isGlobalSearch: boolean;
  setIsGlobalSearch: React.Dispatch<React.SetStateAction<boolean>>;
  isTableView: boolean;
  currentCards: Flashcard[];
  folders: Folder[];
  subjects: Subject[];
  currentFolders: Folder[];
  publicDecks: { id: string; version?: number }[];
  isSelectionMode: boolean;
  selectedCardIds: Set<string>;
  selectedFolderIds: Set<string>;
  activeMenuFolderId: string | null;
  setActiveMenuFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingCard: React.Dispatch<React.SetStateAction<Flashcard | null>>;
  setEditingFolder: React.Dispatch<React.SetStateAction<Folder | null>>;
  toggleFolderSelection: (id: string) => void;
  toggleCardSelection: (id: string) => void;
  getFolderStats: (folderId: string) => {
    newCount: number;
    learningCount: number;
    reviewCount: number;
    mastery: number;
    totalCount: number;
  };
  toggleSuspension: (cardId: string, e: React.MouseEvent) => void;
  archiveCard: (cardId: string, e: React.MouseEvent) => void;
  handleExportFolder: (folderId: string, folderName: string) => void;
  handleResetFolderProgress: (folderId: string) => void;
  handlePublishDeck: (folderId?: string, folderName?: string) => void;
  deleteFolder: (folderId: string, e: React.MouseEvent) => void;
}

export const AnkiBrowseView: React.FC<AnkiBrowseViewProps> = ({
  showRootDashboard,
  stats,
  dailyGoal,
  studyHistory,
  hoveredHeatmapDay,
  setHoveredHeatmapDay,
  onHeatmapDateClick,
  forecast,
  maxForecast,
  sessionStats,
  isAdvanceMode,
  setIsAdvanceMode,
  startStudySession,
  searchQuery,
  setSearchQuery,
  isGlobalSearch,
  setIsGlobalSearch,
  isTableView,
  currentCards,
  folders,
  subjects,
  currentFolders,
  publicDecks,
  isSelectionMode,
  selectedCardIds,
  selectedFolderIds,
  activeMenuFolderId,
  setActiveMenuFolderId,
  setCurrentFolderId,
  setEditingCard,
  setEditingFolder,
  toggleFolderSelection,
  toggleCardSelection,
  getFolderStats,
  toggleSuspension,
  archiveCard,
  handleExportFolder,
  handleResetFolderProgress,
  handlePublishDeck,
  deleteFolder,
}) => (
  <div className="space-y-6">
    {showRootDashboard && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-in slide-in-from-top-4 duration-500">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl transition-all duration-500 ${stats.isGoalReached ? 'bg-usp-gold/20 shadow-[0_0_15px_rgba(255,184,28,0.5)]' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}
              >
                <Flame
                  className={`w-6 h-6 ${stats.isGoalReached ? 'text-usp-gold fill-usp-gold' : stats.streak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-slate-400'}`}
                />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">Constância</h3>
                <p
                  className={`text-[10px] font-black uppercase tracking-widest ${stats.isGoalReached ? 'text-usp-gold' : 'text-emerald-600 dark:text-emerald-400'}`}
                >
                  {stats.message}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.streak}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Dias de Streak</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Diária</span>
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${stats.isGoalReached ? 'text-usp-gold' : 'text-emerald-600 dark:text-emerald-400'}`}
              >
                {stats.cardsToday} / {dailyGoal} cards
              </span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${stats.isGoalReached ? 'bg-usp-gold' : 'bg-emerald-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (stats.cardsToday / dailyGoal) * 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-3xl relative heatmap-container">
            <div className="grid grid-rows-7 grid-flow-col gap-1 h-28 overflow-x-auto pb-2 custom-scrollbar overflow-y-visible">
              {Array.from({ length: 20 * 7 }).map((_, i) => {
                const date = new Date();
                const dayOffset = 20 * 7 - 1 - i;
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
                    role="button"
                    tabIndex={0}
                    className={`w-3 h-3 rounded-sm ${colorClass} transition-all hover:scale-150 cursor-pointer relative`}
                    onClick={() => onHeatmapDateClick(dateStr)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onHeatmapDateClick(dateStr);
                      }
                    }}
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
                          isTopHalf,
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
                  transform: `translateX(-50%) translateY(${hoveredHeatmapDay.isTopHalf ? '0' : '-100%'})`,
                }}
              >
                <div className="flex items-center gap-2 relative">
                  <div
                    className={`w-2 h-2 rounded-full ${hoveredHeatmapDay.count > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}
                  />
                  {hoveredHeatmapDay.date}: {hoveredHeatmapDay.count} cards
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-slate-900 rotate-45 ${
                      hoveredHeatmapDay.isTopHalf
                        ? '-top-2.5 border-t border-l border-white/10'
                        : '-bottom-2.5 border-b border-r border-white/10'
                    }`}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Menos</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-sm bg-slate-200 dark:bg-white/5" />
                <div className="w-2 h-2 rounded-sm bg-emerald-400" />
                <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                <div className="w-2 h-2 rounded-sm bg-emerald-600" />
                <div className="w-2 h-2 rounded-sm bg-emerald-700" />
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
                type="button"
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
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {forecast.reduce((acc, curr) => acc + curr.count, 0)}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total</span>
              </div>
            </div>
          </div>

          <div className="relative h-32 mt-4 flex items-end justify-between gap-1.5">
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-slate-200 dark:border-white/10 z-0 pointer-events-none"
              style={{ bottom: `${(dailyGoal / maxForecast) * 100}%` }}
            >
              <span className="absolute right-0 -top-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                Meta: {dailyGoal}
              </span>
            </div>

            {forecast.map((day, i) => {
              const totalHeight = (day.count / maxForecast) * 100;
              const newHeight = (day.counts.new / day.count) * 100 || 0;
              const learningHeight = (day.counts.learning / day.count) * 100 || 0;
              const reviewHeight = (day.counts.review / day.count) * 100 || 0;

              const avgTime =
                sessionStats.cardTimes.length > 0
                  ? sessionStats.cardTimes.reduce((acc, curr) => acc + curr.timeMs, 0) /
                    sessionStats.cardTimes.length /
                    1000
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

                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 translate-y-2 group-hover:translate-y-0">
                      <div className="bg-slate-900 text-white p-2 rounded-xl shadow-2xl border border-white/10 min-w-[120px]">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 border-b border-white/10 pb-1">
                          {day.label}
                        </p>
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
                              <p className="text-[8px] font-black text-orange-400 uppercase">
                                ⚠️ Prova: {day.exams.join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest ${i === 0 ? 'text-sanfran-rubi' : 'text-slate-400'}`}
                  >
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
          placeholder={isGlobalSearch ? 'Busca Global em todo o acervo...' : 'Pesquisar cards nesta pasta...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-4 pl-12 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi transition-all"
        />
      </div>
      <button
        type="button"
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
                {isGlobalSearch && (
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Pasta</th>
                )}
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                  Status
                </th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {currentCards.map((card) => (
                <tr
                  key={card.id}
                  className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group"
                >
                  <td className="p-6">
                    <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{card.front}</p>
                  </td>
                  <td className="p-6">
                    <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">{card.back}</p>
                  </td>
                  {isGlobalSearch && (
                    <td className="p-6">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {(folders || []).find((f) => f.id === card.folderId)?.name || 'Raiz'}
                      </span>
                    </td>
                  )}
                  <td className="p-6 text-center">
                    {card.is_suspended ? (
                      <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-[9px] font-black uppercase">
                        Suspenso
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase">
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setEditingCard(card)}
                        className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => toggleSuspension(card.id, e)}
                        className={`p-2 transition-colors ${card.is_suspended ? 'text-emerald-500 hover:text-emerald-600' : 'text-orange-500 hover:text-orange-600'}`}
                        title={card.is_suspended ? 'Reativar' : 'Suspender'}
                      >
                        {card.is_suspended ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
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
        {currentFolders.map((folder) => {
          const fstats = getFolderStats(folder.id);
          const hasUpdate =
            folder.original_deck_id &&
            publicDecks.some(
              (pd) => pd.id === folder.original_deck_id && (pd.version || 1) > (folder.version || 1)
            );
          const isSelected = selectedFolderIds.has(folder.id);

          return (
            <div
              key={folder.id}
              role="button"
              tabIndex={0}
              onClick={() => (isSelectionMode ? toggleFolderSelection(folder.id) : setCurrentFolderId(folder.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (isSelectionMode) toggleFolderSelection(folder.id);
                  else setCurrentFolderId(folder.id);
                }
              }}
              className={`group bg-white dark:bg-sanfran-rubiDark/50 p-6 rounded-[2.5rem] border-2 shadow-xl cursor-pointer hover:shadow-2xl hover:-translate-y-1 border-l-[10px] ${folder.color || 'border-l-usp-gold'} transition-all relative flex flex-col justify-between min-h-[280px] h-auto overflow-hidden ${isSelected ? 'border-sanfran-rubi bg-red-50/30 dark:bg-sanfran-rubi/10' : 'border-slate-200 dark:border-sanfran-rubi/40 hover:border-sanfran-rubi/50'}`}
            >
              {isSelectionMode && (
                <div className="absolute top-4 right-4 z-30">
                  {isSelected ? (
                    <CheckSquare className="w-6 h-6 text-sanfran-rubi" />
                  ) : (
                    <Square className="w-6 h-6 text-slate-300" />
                  )}
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
                    type="button"
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
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                      >
                        <Edit2 className="w-4 h-4 text-blue-500" /> Personalizar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportFolder(folder.id, folder.name);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                      >
                        <FileDown className="w-4 h-4 text-emerald-500" /> Exportar (.apkg)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetFolderProgress(folder.id);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                      >
                        <RotateCcw className="w-4 h-4 text-orange-500" /> Zerar Progresso
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublishDeck(folder.id, folder.name);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                      >
                        <Sparkles className="w-4 h-4 text-purple-500" /> Compartilhar
                      </button>
                      <div className="h-px bg-slate-100 dark:bg-white/10 mx-2" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id, e);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        <Trash2 className="w-4 h-4" /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-start justify-between mb-6">
                  {(() => {
                    const IconComp = FOLDER_ICONS.find((i) => i.value === folder.icon)?.icon || FolderIcon;
                    return (
                      <IconComp className={`${folder.color?.replace('border-l-', 'text-') || 'text-usp-gold'} w-10 h-10`} />
                    );
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

              <div className="mt-auto">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Novos</span>
                    <span className="text-base font-black text-blue-600 leading-none">{fstats.newCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Aprender</span>
                    <span className="text-base font-black text-orange-600 leading-none">{fstats.learningCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Revisar</span>
                    <span className="text-base font-black text-emerald-600 leading-none">{fstats.reviewCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Domínio</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-none">
                      {fstats.mastery}%
                    </span>
                  </div>
                </div>

                <div className="h-1.5 bg-slate-100 dark:bg-white/5 overflow-hidden rounded-full">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out"
                    style={{ width: `${fstats.mastery}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {currentCards.map((card) => {
          const subject = (subjects || []).find((s) => s.id === card.subjectId);
          const isSelected = selectedCardIds.has(card.id);

          return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => (isSelectionMode ? toggleCardSelection(card.id) : setEditingCard(card))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (isSelectionMode) toggleCardSelection(card.id);
                  else setEditingCard(card);
                }
              }}
              className={`group bg-white dark:bg-sanfran-rubiDark/50 p-10 rounded-[3rem] border-2 shadow-xl flex flex-col justify-between min-h-[240px] border-l-[10px] transition-all relative cursor-pointer ${isSelected ? 'border-sanfran-rubi bg-red-50/30 dark:bg-sanfran-rubi/10' : 'border-slate-200 dark:border-sanfran-rubi/40 hover:border-sanfran-rubi/50'}`}
              style={{ borderLeftColor: isSelected ? undefined : subject?.color || '#9B111E' }}
            >
              {!isSelectionMode && (
                <button
                  type="button"
                  onClick={(e) => archiveCard(card.id, e)}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Mover para Arquivo Morto"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
              {isSelectionMode && (
                <div className="absolute top-4 right-4">
                  {isSelected ? (
                    <CheckSquare className="w-6 h-6 text-sanfran-rubi" />
                  ) : (
                    <Square className="w-6 h-6 text-slate-300" />
                  )}
                </div>
              )}
              <div className="font-black text-slate-900 dark:text-white line-clamp-4 leading-tight">
                <SmartText text={card.front} />
              </div>
              {isGlobalSearch && (
                <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
                  {(() => {
                    const folderObj = (folders || []).find((f) => f.id === card.folderId);
                    const IconComp = FOLDER_ICONS.find((i) => i.value === folderObj?.icon)?.icon || FolderIcon;
                    return <IconComp size={10} />;
                  })()}
                  {(folders || []).find((f) => f.id === card.folderId)?.name || 'Raiz'}
                </div>
              )}
              <div className="flex justify-between items-center mt-4">
                <span className="text-[9px] font-black uppercase text-slate-400">
                  PRAZO: {new Date(card.nextReview).toLocaleDateString()}
                </span>
                <BrainCircuit className="w-5 h-5 text-sanfran-rubi opacity-40" />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
