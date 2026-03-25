// Anki.tsx - Community Features and Card Rating
// Anki.tsx - Community Features and Card Rating

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
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
  AlertTriangle,
  ExternalLink,
  Edit3,
  CheckCircle2,
  Settings2,
  Activity,
  Volume2,
  ZapOff,
  Star,
  ShieldCheck,
  Eye,
  AlertCircle,
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
  Timer,
  Mic
} from 'lucide-react';
import { Flashcard, Subject, Folder, StudySession, UserProfile } from '../types';
import { dataService } from '../services/dataService';
import { useAnkiLogic } from '../hooks/useAnkiLogic';
import { AnkiBrowse } from './Anki/AnkiBrowse';
import { AnkiStudy } from './Anki/AnkiStudy';
import { AnkiCommunity } from './Anki/AnkiCommunity';
import { AnkiCreate } from './Anki/AnkiCreate';
import { MascotEvolution, LeagueProgress } from './AnkiStats';
import { FOLDER_COLORS, FOLDER_ICONS } from '../constants';

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
  userProfile?: UserProfile | null;
  setUserProfile?: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const Anki: React.FC<AnkiProps> = ({ 
  subjects: initialSubjects, 
  flashcards: initialFlashcards, 
  setFlashcards: setInitialFlashcards, 
  folders: initialFolders, 
  setFolders: setInitialFolders, 
  userId, 
  isOnline, 
  initialText, 
  setInitialText, 
  setStudySessions, 
  isLoadingFlashcards,
  userProfile,
  setUserProfile
}) => {
  const location = useLocation();
  const { state } = location;

  const anki = useAnkiLogic(userId, isOnline);

  // Sync initial props with hook state if needed
  useEffect(() => {
    if (initialFolders.length > 0) anki.setFolders(initialFolders);
    if (initialSubjects.length > 0) anki.setSubjects(initialSubjects);
    if (initialFlashcards.length > 0) anki.setFlashcards(initialFlashcards);
  }, [initialFolders, initialSubjects, initialFlashcards]);

  const [whiteNoiseType, setWhiteNoiseType] = useState<'none' | 'rain' | 'waves' | 'static'>('none');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // White Noise Audio Handler
  useEffect(() => {
    if (whiteNoiseType !== 'none' && anki.mode === 'study') {
      const audioUrls = {
        rain: 'https://www.soundjay.com/nature/rain-01.mp3',
        waves: 'https://www.soundjay.com/nature/ocean-waves-1.mp3',
        static: 'https://www.soundjay.com/misc/white-noise-01.mp3'
      };
      
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrls[whiteNoiseType as keyof typeof audioUrls]);
        audioRef.current.loop = true;
      } else {
        audioRef.current.src = audioUrls[whiteNoiseType as keyof typeof audioUrls];
      }
      
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [whiteNoiseType, anki.mode]);
  };
  }, [whiteNoiseType, mode]);
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<string | null>(null);
  const [glossaryData, setGlossaryData] = useState<GlossaryTerm | null>(null);
  const [glossaryPosition, setGlossaryPosition] = useState({ x: 0, y: 0 });
  const [isLoadingGlossary, setIsLoadingGlossary] = useState(false);

  const handleSemanticSearch = async () => {
    if (!semanticSearchQuery.trim()) return;
    
    setIsSemanticSearching(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Você é um especialista em Direito. O usuário está pesquisando por: "${semanticSearchQuery}". 
      Retorne uma lista de 5 a 10 termos jurídicos estritamente relacionados, sinônimos ou conceitos que abrangem essa pesquisa (ex: se pesquisar "prisão preventiva", inclua "medidas cautelares", "periculum libertatis", "prisão cautelar").
      Retorne APENAS os termos separados por vírgula, sem explicações.`;
      
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
      });
      
      const relatedTerms = response.text?.split(',').map(t => t.trim().toLowerCase()) || [];
      setSearchQuery(semanticSearchQuery + ' ' + relatedTerms.join(' '));
      showToast("Busca semântica concluída! Termos relacionados incluídos.", "success");
    } catch (error) {
      console.error("Semantic search failed:", error);
      showToast("Erro na busca semântica. Tente novamente.", "error");
    } finally {
      setIsSemanticSearching(false);
    }
  };

  const insertTableTemplate = () => {
    const template = `
| Conceito A | Conceito B |
| :--- | :--- |
| Diferença 1 | Diferença 1 |
| Diferença 2 | Diferença 2 |
`;
    setManualBack(prev => prev + template);
  };

  const insertDiagramTemplate = () => {
    const template = `
\`\`\`mermaid
graph TD
    A[Início] --> B{Condição}
    B -- Sim --> C[Resultado 1]
    B -- Não --> D[Resultado 2]
\`\`\`
`;
    setManualBack(prev => prev + template);
  };

  const insertMnemonicTemplate = () => {
    const template = `
> **Mnemônico:** [PALAVRA]
> - **P**...
> - **A**...
> - **L**...
`;
    setManualBack(prev => prev + template);
  };

  const insertCaseTemplate = () => {
    const template = `
**Caso Prático:**
João, servidor público, [situação]...
**Questão:** Qual a responsabilidade de João?
**Resposta:** [Fundamentação Legal]
`;
    setManualBack(prev => prev + template);
  };

  const handleGlossaryTerm = async (term: string, position: { x: number; y: number }) => {
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
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<string | null>(null);
  const [glossaryData, setGlossaryData] = useState<any | null>(null);
  const [isGlossaryLoading, setIsGlossaryLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);


  const currentContextIds = useMemo(() => getSubfolderIds(currentFolderId), h-4" /> Arquivar ({selectedCardIds.size})
                  </button>
                  <button onClick={() => {setIsSelectionMode(false); setSelectedCardIds(new Set()); setSelectedFolderIds(new Set());}} className="p-3 text-slate-500"><X className="w-5 h-5" /></button>
                </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in slide-in-from-top-4 duration-500">
              {/* Mascot Widget */}
              {userProfile && (
                <MascotEvolution 
                  level={userProfile.mascot_level || 1} 
                  xp={userProfile.mascot_xp || 0} 
                />
              )}

              {/* League Widget */}
              {userProfile && (
                <LeagueProgress 
                  division={userProfile.league_division || 'Bronze'} 
                  weeklyCards={userProfile.weekly_cards_reviewed || 0} 
                />
              )}

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
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-sanfran-rubi transition-colors" />
              <input 
                type="text" 
                placeholder={isGlobalSearch ? "Busca Global em todo o acervo..." : "Pesquisar cards nesta pasta..."} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-4 pl-12 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi transition-all"
              />
            </div>
            
            <div className="relative flex-1 w-full group">
              <Sparkles className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isSemanticSearching ? 'text-usp-gold animate-pulse' : 'text-slate-400 group-focus-within:text-usp-gold'}`} />
              <input 
                type="text" 
                placeholder="Busca Semântica (IA)..." 
                value={semanticSearchQuery}
                onChange={(e) => setSemanticSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                className="w-full p-4 pl-12 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-usp-gold transition-all"
              />
              <button 
                onClick={handleSemanticSearch}
                disabled={isSemanticSearching || !semanticSearchQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-usp-gold text-white rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
              >
                {isSemanticSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            <button 
              onClick={() => setIsGlobalSearch(!isGlobalSearch)}
              className={`px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border-2 ${isGlobalSearch ? 'bg-sanfran-rubi border-sanfran-rubi text-white shadow-lg' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'}`}
            >
              {isGlobalSearch ? 'Busca Global Ativa' : 'Ativar Busca Global'}
            </button>
            <button 
              onClick={() => setIsHeatMode(!isHeatMode)}
              className={`px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border-2 flex items-center gap-2 ${isHeatMode ? 'bg-orange-600 border-orange-600 text-white shadow-lg' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-orange-500/50'}`}
              title="Priorizar pastas com muitos cards vencidos"
            >
              <Flame size={16} className={isHeatMode ? 'fill-white animate-pulse' : ''} />
              {isHeatMode ? 'Filtro de Calor Ativo' : 'Filtro de Calor'}
            </button>
          </div>
          
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 animate-in slide-in-from-left-4">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${!selectedTag ? 'bg-sanfran-rubi border-sanfran-rubi text-white shadow-lg' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'}`}
              >
                Todos
              </button>
              {allTags.map(tag => {
                const isHierarchical = tag.includes('/');
                const parts = tag.split('/');
                const label = isHierarchical ? parts[parts.length - 1] : tag;
                const depth = isHierarchical ? parts.length - 1 : 0;
                
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${selectedTag === tag ? 'bg-sanfran-rubi border-sanfran-rubi text-white shadow-lg' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'}`}
                    style={{ marginLeft: depth > 0 ? `${depth * 4}px` : '0' }}
                  >
                    {isHierarchical && <div className="w-1 h-1 rounded-full bg-slate-300" />}
                    {label}
                  </button>
                );
              })}
            </div>
          )}

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
                          <div className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                            <MarkdownWithLegalLinks content={card.front} />
                          </div>
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
                {isHeatMode && stats.heatScore > 0 && (
                  <div className="absolute top-4 left-4 z-20">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border-2 border-white dark:border-slate-900 ${stats.heatScore > 0.5 ? 'bg-red-600 text-white animate-bounce' : 'bg-orange-500 text-white'}`}>
                      <Flame size={12} className="fill-current" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{Math.round(stats.heatScore * 100)}% Calor</span>
                    </div>
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

                  <h4 className="font-black text-slate-950 dark:text-white uppercase text-lg leading-tight tracking-tight mb-6 line-clamp-3 break-words">
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
          <div className={`w-full max-w-2xl mb-8 flex items-center justify-between ${isExtremeFocus ? 'hidden' : isFocusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-500' : ''}`}>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isFocusMode ? 'bg-white text-slate-950' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
              >
                {isFocusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />} 
                {isFocusMode ? 'Sair do Foco' : 'Modo Foco'}
                <span className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[8px] ml-1">F</span>
              </button>
              <button 
                onClick={() => setIsExtremeFocus(!isExtremeFocus)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isExtremeFocus ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
                title="Modo Foco Extremo: Esconde tudo, foca apenas na pergunta."
              >
                <Zap size={14} fill={isExtremeFocus ? "currentColor" : "none"} />
                {isExtremeFocus ? 'Foco Extremo Ativo' : 'Foco Extremo'}
              </button>
              
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                <button 
                  onClick={() => setWhiteNoiseType('none')}
                  className={`p-2 rounded-lg transition-all ${whiteNoiseType === 'none' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                  title="Sem Ruído"
                >
                  <Volume2 size={14} className="opacity-30" />
                </button>
                <button 
                  onClick={() => setWhiteNoiseType('rain')}
                  className={`p-2 rounded-lg transition-all ${whiteNoiseType === 'rain' ? 'bg-white dark:bg-slate-800 text-blue-500 shadow-sm' : 'text-slate-400'}`}
                  title="Chuva"
                >
                  <Sparkles size={14} />
                </button>
                <button 
                  onClick={() => setWhiteNoiseType('waves')}
                  className={`p-2 rounded-lg transition-all ${whiteNoiseType === 'waves' ? 'bg-white dark:bg-slate-800 text-cyan-500 shadow-sm' : 'text-slate-400'}`}
                  title="Ondas"
                >
                  <Activity size={14} />
                </button>
                <button 
                  onClick={() => setWhiteNoiseType('static')}
                  className={`p-2 rounded-lg transition-all ${whiteNoiseType === 'static' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                  title="Ruído Branco"
                >
                  <Zap size={14} className="opacity-50" />
                </button>
              </div>
              <button 
                onClick={() => {
                  setIsPodcastMode(!isPodcastMode);
                  if (!isPodcastMode) {
                    showToast("Modo Podcast Ativado: Use comandos de voz 'Bom', 'Fácil', 'Mostrar'", "info");
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isPodcastMode ? 'bg-sanfran-rubi text-white shadow-lg shadow-sanfran-rubi/30' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
                title="Modo Podcast (Hands-free)"
              >
                <Mic size={14} />
                {isPodcastMode ? 'Podcast Ativo' : 'Modo Podcast'}
                <span className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[8px] ml-1">P</span>
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
              <div className={`flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest ${isExtremeFocus ? 'hidden' : ''}`}>
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

            {/* AI Tools Bar */}
            <div className={`flex items-center gap-2 mb-4 w-full max-w-2xl ${isExtremeFocus ? 'hidden' : ''}`}>
              <button 
                onClick={handleGenerateMnemonic}
                className="flex-1 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                Me ajude a decorar
              </button>
              <button 
                onClick={handleGeneratePracticalCase}
                className="flex-1 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition-all flex items-center justify-center gap-2"
              >
                <Gavel size={14} />
                Gerar Caso Prático
              </button>
              {isFlipped && (
                <button 
                  onClick={handleCheckJurisprudence}
                  className="flex-1 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  <Search size={14} />
                  Jurisprudência Viva
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
                          <SmartText text={currentCard.front} />
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
                              {isEvaluating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
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
                                    className="p-1 text-slate-400 hover:text-purple-600 transition-colors"
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
                            <div className="w-full mb-6 relative inline-block mx-auto">
                              <img src={currentCard.image} alt="Flashcard" className="max-w-full h-auto rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg" />
                              {currentCard.occlusion_data?.rects.map((r: any) => (
                                <div 
                                  key={r.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isFlipped) setIsFlipped(true);
                                  }}
                                  className={`absolute border-2 transition-all duration-500 ${isFlipped ? 'bg-transparent border-sanfran-rubi/30' : 'bg-slate-900 border-sanfran-rubi'}`}
                                  style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
                                />
                              ))}
                            </div>
                          )}
                          
                          <div className="w-full text-left">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Gabarito Oficial</span>
                            <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-6">
                              <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-center">
                                <MarkdownWithLegalLinks content={currentCard.back} />
                              </div>
                            </div>
                          </div>
                          {currentCard.notes && (
                            <div className="w-full mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl text-left">
                              <span className="text-[10px] font-black text-yellow-800 dark:text-yellow-500 uppercase tracking-widest block mb-2">Notas Pessoais</span>
                              <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 whitespace-pre-wrap">
                                <MarkdownWithLegalLinks content={currentCard.notes} />
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
            <div className={`mt-12 w-full max-w-2xl flex flex-col items-center gap-6 ${isExtremeFocus ? 'hidden' : isFocusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-500' : ''}`}>
              {isCramMode ? (
                <button 
                  onClick={handleNextCram} 
                  className="w-full p-6 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-transform"
                >
                  Próximo Card <ArrowRight size={18} />
                  <span className="px-2 py-0.5 bg-black/20 rounded text-[8px] ml-2">Enter</span>
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

      {/* Mnemonic Modal */}
      {showMnemonicModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                    <Sparkles className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Mnemônico IA</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memorização Facilitada</p>
                  </div>
                </div>
                <button onClick={() => setShowMnemonicModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {isGeneratingMnemonic ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                  <p className="text-sm font-bold text-slate-500 animate-pulse">A IA está criando algo criativo para você...</p>
                </div>
              ) : generatedMnemonic ? (
                <div className="space-y-6">
                  <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-3xl border border-purple-100 dark:border-purple-900/20">
                    <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3">O Mnemônico</h4>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight text-center">{generatedMnemonic.phrase}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Significado</h4>
                    <div className="grid gap-2">
                      {generatedMnemonic.explanation.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
                          <span className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg text-sm font-black text-purple-600 shadow-sm">{item.letter}</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowMnemonicModal(false)}
                  className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Entendi!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Practical Case Modal */}
      {showPracticalCaseModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                    <Gavel className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Caso Prático IA</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aplicação real do conceito</p>
                  </div>
                </div>
                <button onClick={() => setShowPracticalCaseModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {isGeneratingPracticalCase ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
                  <p className="text-sm font-bold text-slate-500 animate-pulse">A IA está redigindo um caso jurídico para você...</p>
                </div>
              ) : practicalCaseData ? (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">O Cenário</h4>
                    <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed italic">"{practicalCaseData.case}"</p>
                  </div>

                  <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">A Pergunta</h4>
                    <p className="text-slate-900 dark:text-white font-black text-lg tracking-tight">{practicalCaseData.question}</p>
                  </div>

                  <div className="relative group">
                    <div className={`p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 transition-all duration-500 ${!isFlipped ? 'blur-md select-none' : ''}`}>
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Decisão Fundamentada</h4>
                      <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">{practicalCaseData.answer}</p>
                    </div>
                    {!isFlipped && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button 
                          onClick={() => setIsFlipped(true)}
                          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 transition-all"
                        >
                          Revelar Resposta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                {isFlipped && (
                  <button 
                    onClick={() => {
                      setShowPracticalCaseModal(false);
                      setIsFlipped(false);
                      setPracticalCaseData(null);
                    }}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Próximo Card
                  </button>
                )}
                {!isFlipped && !isGeneratingPracticalCase && (
                  <button 
                    onClick={() => setShowPracticalCaseModal(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-slate-200"
                  >
                    Fechar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jurisprudence Modal */}
      {showJurisprudenceModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                    <Search className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Jurisprudência Viva</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Verificação em tempo real (STF/STJ)</p>
                  </div>
                </div>
                <button onClick={() => setShowJurisprudenceModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {isJurisprudenceLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                  <p className="text-sm font-bold text-slate-500 animate-pulse">Consultando bases de dados jurídicas...</p>
                </div>
              ) : jurisprudenceResult ? (
                <div className="space-y-6">
                  <div className={`p-6 rounded-3xl border-2 flex items-center gap-4 ${
                    jurisprudenceResult.status === 'atualizado' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : jurisprudenceResult.status === 'desatualizado'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    {jurisprudenceResult.isValid ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                    <div>
                      <h4 className="font-black uppercase text-sm tracking-tight">Status: {jurisprudenceResult.status.toUpperCase()}</h4>
                      <p className="text-xs font-bold opacity-80">{jurisprudenceResult.isValid ? 'Este entendimento permanece sólido.' : 'Atenção: Houve mudanças recentes.'}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Fundamentação Atualizada</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed font-bold">
                      <ReactMarkdown>{jurisprudenceResult.explanation}</ReactMarkdown>
                    </div>
                  </div>

                  {jurisprudenceResult.sources && jurisprudenceResult.sources.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fontes Consultadas</h4>
                      <div className="flex flex-wrap gap-2">
                        {jurisprudenceResult.sources.map((url: string, i: number) => (
                          <a 
                            key={i} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <ExternalLink size={12} />
                            Fonte {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowJurisprudenceModal(false)}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Continuar Revisão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- AI GENERATION MODE --- */}
      {mode === 'ai_create' && !isPreviewMode && (
         <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-purple-500 shadow-2xl relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

             <div className="flex items-center gap-4 mb-8 relative z-10">
               <button onClick={() => setMode('browse')} className="p-3"><ArrowLeft className="w-8 h-8 text-slate-700 dark:text-slate-300" /></button>
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

                   <div className="flex gap-4">
                     <button 
                       onClick={handleAIGenerate} 
                       disabled={isLoading} 
                       className="flex-1 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[2rem] font-black uppercase text-lg shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                       {isLoading ? <div className="animate-spin w-6 h-6 border-4 border-white/30 border-t-white rounded-full"></div> : <><Zap size={24} fill="currentColor" /> Gerar Preview</>}
                     </button>
                     
                     <button 
                       onClick={() => handleGenerateCloze(aiSourceText)}
                       disabled={isGeneratingCloze || !aiSourceText.trim()}
                       className="flex-1 py-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-[2rem] font-black uppercase text-lg shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                       {isGeneratingCloze ? <div className="animate-spin w-6 h-6 border-4 border-white/30 border-t-white rounded-full"></div> : <><Edit3 size={24} /> Gerar 5 Clozes</>}
                     </button>
                   </div>
                   
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
                 className="py-4 px-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black uppercase text-sm shadow-xl hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
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
                             className="w-full h-24 p-3 bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl font-medium resize-none outline-none focus:border-purple-500" 
                           />
                         </div>
                         <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 mb-1 block">Notas (Opcional)</label>
                           <textarea 
                             value={card.notes || ''} 
                             onChange={(e) => updatePreviewCard(index, 'notes', e.target.value)} 
                             placeholder="Adicione mnemônicos ou observações..."
                             className="w-full h-16 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/30 rounded-xl font-medium resize-none outline-none focus:border-yellow-500" 
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
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase">Importação em Lote</h3>
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
                <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold">
                   {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <input value={manualFront} onChange={(e) => setManualFront(e.target.value)} placeholder="Enunciado / Pergunta" className="w-full p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={insertTableTemplate}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-sanfran-rubi hover:text-white transition-all flex items-center gap-2"
                >
                  <Table size={12} /> Tabela Comparativa
                </button>
                <button 
                  onClick={insertDiagramTemplate}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-sanfran-rubi hover:text-white transition-all flex items-center gap-2"
                >
                  <Activity size={12} /> Diagrama (Mermaid)
                </button>
                <button 
                  onClick={insertMnemonicTemplate}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-sanfran-rubi hover:text-white transition-all flex items-center gap-2"
                >
                  <Sparkles size={12} /> Mnemônico
                </button>
                <button 
                  onClick={insertCaseTemplate}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-sanfran-rubi hover:text-white transition-all flex items-center gap-2"
                >
                  <Gavel size={12} /> Caso Prático
                </button>
              </div>
              <textarea value={manualBack} onChange={(e) => setManualBack(e.target.value)} placeholder="Doutrina / Resposta, Fluxograma, Tabela..." className="w-full h-32 p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-3xl font-bold resize-none outline-none" />
              <div className="absolute bottom-4 right-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                Dica: Você pode colar (Ctrl+V) uma imagem aqui
              </div>
            </div>

            {/* Image Occlusion Drawing UI */}
            {manualImage && (
              <div className="mt-4 p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className={`w-5 h-5 ${isImageOcclusionMode ? 'text-sanfran-rubi' : 'text-slate-400'}`} />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Image Occlusion Jurídico</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsImageOcclusionMode(!isImageOcclusionMode);
                      if (!isImageOcclusionMode) setOcclusionRects([]);
                    }}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isImageOcclusionMode ? 'bg-sanfran-rubi text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}
                  >
                    {isImageOcclusionMode ? 'Desativar' : 'Ativar'}
                  </button>
                </div>

                {isImageOcclusionMode && (
                  <div className="space-y-4">
                    <p className="text-[10px] text-slate-500 font-bold italic">Arraste sobre a imagem para criar as máscaras (tampas).</p>
                    <div 
                      className="relative inline-block cursor-crosshair overflow-hidden rounded-xl border border-slate-200 dark:border-white/10"
                      onMouseDown={(e) => {
                        if (!imageRef.current) return;
                        const rect = imageRef.current.getBoundingClientRect();
                        setIsDrawing(true);
                        setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                      }}
                      onMouseMove={(e) => {
                        if (!isDrawing || !imageRef.current) return;
                        // Visual feedback could be added here
                      }}
                      onMouseUp={(e) => {
                        if (!isDrawing || !imageRef.current) return;
                        const rect = imageRef.current.getBoundingClientRect();
                        const endX = e.clientX - rect.left;
                        const endY = e.clientY - rect.top;
                        
                        const newRect = {
                          id: crypto.randomUUID(),
                          x: Math.min(startPos.x, endX),
                          y: Math.min(startPos.y, endY),
                          width: Math.abs(startPos.x - endX),
                          height: Math.abs(startPos.y - endY)
                        };

                        if (newRect.width > 5 && newRect.height > 5) {
                          setOcclusionRects(prev => [...prev, newRect]);
                        }
                        setIsDrawing(false);
                      }}
                    >
                      <img 
                        ref={imageRef}
                        src={manualImage} 
                        alt="Occlusion Preview" 
                        className="max-w-full h-auto rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                      <svg className="absolute inset-0 pointer-events-none w-full h-full">
                        {occlusionRects.map(rect => (
                          <rect 
                            key={rect.id}
                            x={rect.x}
                            y={rect.y}
                            width={rect.width}
                            height={rect.height}
                            fill="#800000"
                            fillOpacity="0.8"
                            stroke="#fff"
                            strokeWidth="1"
                          />
                        ))}
                      </svg>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => setOcclusionRects([])}
                        className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                      >
                        Limpar Máscaras
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-6 h-6 text-purple-200" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-200">Amostra Grátis</span>
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter">{previewDeck.name}</h3>
                  <p className="text-purple-100 font-bold text-sm">Visualizando 5 cards aleatórios para conferência de estilo.</p>
                </div>
                <button onClick={() => setIsPreviewModalOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
                  <Star size={14} className="text-usp-gold fill-usp-gold" />
                  <span className="text-xs font-black">{previewDeck.rating || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
                  <FileDown size={14} />
                  <span className="text-xs font-black">{previewDeck.downloads || 0} Downloads</span>
                </div>
                {previewDeck.is_verified && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-usp-gold/20 rounded-2xl border border-usp-gold/40">
                    <ShieldCheck size={14} className="text-usp-gold" />
                    <span className="text-xs font-black text-usp-gold uppercase tracking-widest">Verificado</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
              {(previewDeck.cards?.slice(0, 5) || []).map((card: any, idx: number) => (
                <div key={idx} className="p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] border-2 border-slate-100 dark:border-white/5 relative group">
                  <span className="absolute top-6 right-8 text-[10px] font-black text-slate-300 uppercase">Card {idx + 1}</span>
                  <div className="mb-4">
                    <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest block mb-2">Pergunta</span>
                    <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{card.front}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Resposta</span>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed">{card.back}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-10 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex gap-4">
              <button 
                onClick={() => setIsPreviewModalOpen(false)}
                className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[2rem] font-black uppercase text-xs tracking-widest border-2 border-slate-200 dark:border-white/10"
              >
                Voltar
              </button>
              <button 
                onClick={() => { handleDownloadDeck(previewDeck); setIsPreviewModalOpen(false); }}
                className="flex-[2] py-5 bg-purple-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-purple-500/20"
              >
                Gostei, Baixar Agora
              </button>
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
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cards Revisados</span>
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
