
import React, { useState } from 'react';
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
  Gavel,
  Check,
  Archive,
  Layers,
  Calendar,
  Play
} from 'lucide-react';
import { Flashcard, Subject, Folder } from '../types';
import { supabase } from '../services/supabaseClient';
import { updateQuestProgress } from '../services/questService';

interface AnkiProps {
  subjects: Subject[];
  flashcards: Flashcard[];
  setFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  userId: string;
}

const Anki: React.FC<AnkiProps> = ({ subjects, flashcards, setFlashcards, folders, setFolders, userId }) => {
  const [mode, setMode] = useState<'browse' | 'study' | 'create' | 'bulk'>('browse');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [bulkInput, setBulkInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Study Session State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [showStudyOptions, setShowStudyOptions] = useState(false);

  // Creation State
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  
  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Filter out archived cards from the main view
  const activeFlashcards = flashcards.filter(f => !f.archived_at);

  const getSubfolderIds = (folderId: string | null): string[] => {
    let ids: string[] = folderId ? [folderId] : [];
    const children = folders.filter(f => f.parentId === folderId);
    children.forEach(child => {
      ids = [...ids, ...getSubfolderIds(child.id)];
    });
    return ids;
  };

  // Cards directly in the current folder (for browsing)
  const currentCards = activeFlashcards.filter(f => f.folderId === currentFolderId);
  const currentFolders = folders.filter(f => f.parentId === currentFolderId);

  // Cards in the current folder AND subfolders (for studying scope)
  const currentContextIds = getSubfolderIds(currentFolderId);
  const cardsInScope = activeFlashcards.filter(f => 
    (currentFolderId === null ? true : currentContextIds.includes(f.folderId as string))
  );
  
  const dueCards = cardsInScope.filter(f => f.nextReview <= Date.now());

  const toggleCardSelection = (id: string) => {
    const newSelection = new Set(selectedCardIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedCardIds(newSelection);
  };

  const selectAllInFolder = () => {
    if (selectedCardIds.size === currentCards.length) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(currentCards.map(c => c.id)));
    }
  };

  const archiveSelectedCards = async () => {
    if (selectedCardIds.size === 0) return;
    if (!confirm(`Deseja mover estes ${selectedCardIds.size} cards para o Arquivo Morto?`)) return;

    try {
      const idsToArchive = Array.from(selectedCardIds);
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('flashcards')
        .update({ archived_at: now })
        .in('id', idsToArchive)
        .eq('user_id', userId);
      
      if (error) throw error;

      // Update local state by removing archived cards from active view
      setFlashcards(prev => prev.filter(f => !selectedCardIds.has(f.id)));
      setSelectedCardIds(new Set());
      setIsSelectionMode(false);
    } catch (err) {
      alert("Falha ao arquivar cards selecionados.");
    }
  };

  const archiveCard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('flashcards')
        .update({ archived_at: now })
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
      setFlashcards(prev => prev.filter(f => f.id !== id));
      
      if (selectedCardIds.has(id)) {
        const newSelection = new Set(selectedCardIds);
        newSelection.delete(id);
        setSelectedCardIds(newSelection);
      }
    } catch (err) {
      alert("Erro ao arquivar card.");
    }
  };

  const deleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja eliminar esta pasta? Todos os flashcards nela contidos ficarão órfãos de categoria.")) return;
    try {
      const { error } = await supabase.from('folders').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      
      setFolders(prev => prev.filter(f => f.id !== id));
      setFlashcards(prev => prev.map(f => f.folderId === id ? { ...f, folderId: null } : f));
      
      if (currentFolderId === id) {
        setCurrentFolderId(null);
      }
    } catch (err) {
      alert("Erro ao eliminar pasta.");
    }
  };

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return;
    setIsLoading(true);
    
    try {
      const lines = bulkInput.split('\n');
      const cardsToInsert = lines.map(line => {
        const parts = line.split(/[|:-]/);
        if (parts.length < 2) return null;
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          front: parts[0].trim(),
          back: parts.slice(1).join(':').trim(),
          subject_id: selectedSubjectId,
          folder_id: currentFolderId,
          next_review: Date.now(),
          interval: 0,
          user_id: userId,
          archived_at: null
        };
      }).filter(Boolean) as any[];

      if (cardsToInsert.length === 0) throw new Error("Formato inválido. Use: Pergunta | Resposta");

      const { error } = await supabase.from('flashcards').insert(cardsToInsert);
      if (error) throw error;

      const formattedCards: Flashcard[] = cardsToInsert.map(c => ({
        id: c.id, 
        front: c.front, 
        back: c.back, 
        subjectId: c.subject_id, 
        folderId: c.folder_id, 
        nextReview: c.next_review, 
        interval: c.interval,
        archived_at: null
      }));

      setFlashcards(prev => [...prev, ...formattedCards]);
      setMode('browse');
      setBulkInput('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCreate = async () => {
    if (!manualFront.trim() || !manualBack.trim()) return;
    const newId = Math.random().toString(36).substr(2, 9);
    try {
      const { error } = await supabase.from('flashcards').insert({
        id: newId, 
        user_id: userId, 
        front: manualFront, 
        back: manualBack, 
        subject_id: selectedSubjectId, 
        folder_id: currentFolderId, 
        next_review: Date.now(), 
        interval: 0,
        archived_at: null
      });
      if (error) throw error;
      setFlashcards(prev => [...prev, { 
        id: newId, 
        front: manualFront, 
        back: manualBack, 
        subjectId: selectedSubjectId, 
        folderId: currentFolderId, 
        nextReview: Date.now(), 
        interval: 0,
        archived_at: null
      }]);
      setManualFront(''); 
      setManualBack(''); 
    } catch (err) { 
      alert("Erro ao protocolar card."); 
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const newId = Math.random().toString(36).substr(2, 9);
    try {
      const { error } = await supabase.from('folders').insert({ 
        id: newId, 
        user_id: userId, 
        name: newFolderName, 
        parent_id: currentFolderId 
      });
      if (error) throw error;
      setFolders(prev => [...prev, { id: newId, name: newFolderName, parentId: currentFolderId }]);
      setNewFolderName(''); 
      setShowFolderInput(false);
    } catch (err) { 
      alert("Erro ao criar pasta."); 
    }
  };

  const startStudySession = (type: 'due' | 'all') => {
    const queue = type === 'due' ? dueCards : cardsInScope;
    setStudyQueue(queue);
    setMode('study');
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowStudyOptions(false);
  };

  const handleReview = async (quality: number) => {
    const card = studyQueue[currentIndex];
    const newInterval = quality === 0 ? 0 : (card.interval === 0 ? 1 : card.interval * 2);
    const nextReview = Date.now() + newInterval * 24 * 60 * 60 * 1000;
    
    try {
      await supabase.from('flashcards').update({ 
        interval: newInterval, 
        next_review: nextReview 
      }).eq('id', card.id).eq('user_id', userId);
      
      setFlashcards(prev => prev.map(f => f.id === card.id ? { ...f, interval: newInterval, nextReview } : f));
      
      // TRIGGER QUEST UPDATE
      await updateQuestProgress(userId, 'review_cards', 1);

      if (currentIndex < studyQueue.length - 1) { 
        setCurrentIndex(prev => prev + 1); 
        setIsFlipped(false); 
      } else { 
        setMode('browse'); 
        setCurrentIndex(0); 
        setIsFlipped(false); 
        setStudyQueue([]);
      }
    } catch (err) { 
      alert("Erro ao atualizar revisão."); 
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             {currentFolderId && (
               <button onClick={() => setCurrentFolderId(folders.find(f => f.id === currentFolderId)?.parentId || null)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:text-sanfran-rubi">
                  <ArrowLeft className="w-5 h-5" />
               </button>
             )}
             <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Flashcards</h2>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mt-1">Acervo Jurídico {currentFolderId ? `• ${folders.find(f => f.id === currentFolderId)?.name}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {mode === 'browse' && (
            <>
              {isSelectionMode ? (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
                   <button onClick={selectAllInFolder} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-sm">
                    {selectedCardIds.size === currentCards.length && currentCards.length > 0 ? <CheckSquare className="w-4 h-4 text-sanfran-rubi" /> : <Square className="w-4 h-4" />}
                    {selectedCardIds.size === currentCards.length && currentCards.length > 0 ? 'Desmarcar' : 'Tudo'}
                  </button>
                  <button onClick={archiveSelectedCards} disabled={selectedCardIds.size === 0} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg disabled:opacity-50">
                    <Archive className="w-4 h-4" /> Arquivar ({selectedCardIds.size})
                  </button>
                  <button onClick={() => {setIsSelectionMode(false); setSelectedCardIds(new Set());}} className="p-3 text-slate-500"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setShowStudyOptions(true)} 
                    disabled={cardsInScope.length === 0} 
                    className="flex items-center gap-2 px-8 py-3.5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50 hover:bg-sanfran-rubiDark shadow-xl"
                  >
                    <RotateCcw className="w-5 h-5" /> Estudar
                  </button>
                  <button onClick={() => {setMode('create');}} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi dark:text-white border-2 border-sanfran-rubi rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 shadow-xl">
                    <Plus className="w-5 h-5" /> Novo Card
                  </button>
                  <button onClick={() => setMode('bulk')} className="flex items-center gap-2 px-6 py-3.5 bg-usp-blue text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                    <Plus className="w-5 h-5" /> Em Lote
                  </button>
                  <button onClick={() => setIsSelectionMode(true)} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-sanfran-rubiDark text-slate-500 border-2 border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 shadow-xl">
                    <CheckSquare className="w-5 h-5" /> Selecionar
                  </button>
                  <button onClick={() => setShowFolderInput(true)} className="p-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi border-2 border-slate-200 rounded-2xl shadow-sm"><FolderPlus className="w-6 h-6" /></button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showFolderInput && (
        <div className="flex gap-2 animate-in slide-in-from-top-4">
           <input 
            value={newFolderName} 
            onChange={(e) => setNewFolderName(e.target.value)} 
            placeholder="Nome da nova pasta..." 
            className="flex-1 p-4 bg-white dark:bg-black/40 border-2 border-slate-200 rounded-2xl font-bold outline-none"
           />
           <button onClick={handleCreateFolder} className="p-4 bg-sanfran-rubi text-white rounded-2xl font-black"><Check className="w-6 h-6" /></button>
           <button onClick={() => setShowFolderInput(false)} className="p-4 bg-slate-200 text-slate-500 rounded-2xl font-black"><X className="w-6 h-6" /></button>
        </div>
      )}

      {/* MODAL DE OPÇÕES DE ESTUDO */}
      {showStudyOptions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowStudyOptions(false)}>
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border-4 border-sanfran-rubi relative" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 text-center">Configurar Sessão</h3>
              
              <div className="space-y-4">
                 <button 
                   onClick={() => startStudySession('due')}
                   disabled={dueCards.length === 0}
                   className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl hover:border-sanfran-rubi transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                 >
                    <div className="flex items-center gap-3">
                       <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-lg text-red-600 dark:text-red-400">
                          <Calendar size={20} />
                       </div>
                       <div className="text-left">
                          <p className="font-bold text-slate-900 dark:text-white">Revisão Pendente</p>
                          <p className="text-xs text-slate-500">Apenas o que venceu</p>
                       </div>
                    </div>
                    <span className="text-2xl font-black text-sanfran-rubi">{dueCards.length}</span>
                 </button>

                 <button 
                   onClick={() => startStudySession('all')}
                   disabled={cardsInScope.length === 0}
                   className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl hover:border-sanfran-rubi transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                 >
                    <div className="flex items-center gap-3">
                       <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                          <Layers size={20} />
                       </div>
                       <div className="text-left">
                          <p className="font-bold text-slate-900 dark:text-white">Revisão Geral</p>
                          <p className="text-xs text-slate-500">Todo o acervo atual</p>
                       </div>
                    </div>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{cardsInScope.length}</span>
                 </button>
              </div>

              <button onClick={() => setShowStudyOptions(false)} className="w-full mt-6 py-4 text-slate-400 font-bold uppercase text-xs hover:text-slate-600">Cancelar</button>
           </div>
        </div>
      )}

      {mode === 'browse' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {currentFolders.map(folder => (
            <div key={folder.id} onClick={() => setCurrentFolderId(folder.id)} className="group bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2rem] border-2 border-slate-200 dark:border-sanfran-rubi/40 shadow-xl cursor-pointer hover:border-usp-gold border-l-[10px] border-l-usp-gold transition-all relative">
              <button 
                onClick={(e) => deleteFolder(folder.id, e)} 
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <FolderIcon className="text-usp-gold w-8 h-8 mb-4" />
              <h4 className="font-black text-slate-950 dark:text-white uppercase tracking-tight">{folder.name}</h4>
            </div>
          ))}
          {currentCards.map(card => {
            const subject = subjects.find(s => s.id === card.subjectId);
            const isSelected = selectedCardIds.has(card.id);
            
            return (
              <div 
                key={card.id} 
                onClick={() => isSelectionMode ? toggleCardSelection(card.id) : null}
                className={`group bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2rem] border-2 shadow-xl flex flex-col justify-between h-[240px] border-l-[10px] transition-all relative ${isSelected ? 'border-sanfran-rubi bg-red-50/30 dark:bg-sanfran-rubi/10' : 'border-slate-200 dark:border-sanfran-rubi/40'} ${isSelectionMode ? 'cursor-pointer' : ''}`} 
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
                <p className="font-black text-slate-950 dark:text-white line-clamp-4 leading-tight">{card.front}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-[9px] font-black uppercase text-slate-400">PRAZO: {new Date(card.nextReview).toLocaleDateString()}</span>
                  <BrainCircuit className="w-5 h-5 text-sanfran-rubi opacity-40" />
                </div>
              </div>
            );
          })}
          
          {currentCards.length === 0 && currentFolders.length === 0 && (
            <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem]">
               <BrainCircuit className="w-16 h-16 text-slate-100 dark:text-white/5 mx-auto mb-4" />
               <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum card ou pasta neste nível.</p>
            </div>
          )}
        </div>
      )}

      {mode === 'study' && studyQueue.length > 0 && (
        <div className="flex flex-col items-center py-10 animate-in fade-in zoom-in">
          <div className="relative w-full max-w-2xl h-[400px] preserve-3d" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`absolute inset-0 w-full h-full cursor-pointer transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
              <div className="absolute inset-0 w-full h-full bg-white dark:bg-sanfran-rubiDark border-[6px] border-slate-200 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-center text-center backface-hidden">
                <div className="absolute top-6 left-6 text-xs font-black uppercase text-slate-300">{currentIndex + 1} / {studyQueue.length}</div>
                <span className="text-xs font-black text-sanfran-rubi uppercase tracking-[0.3em] mb-8">Questão</span>
                <p className="text-2xl font-black text-slate-950 dark:text-white leading-tight">{studyQueue[currentIndex].front}</p>
              </div>
              <div className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-black/80 border-[6px] border-usp-blue/40 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180">
                <span className="text-xs font-black text-usp-blue uppercase tracking-[0.3em] mb-8">Resposta</span>
                <p className="text-2xl font-black text-slate-950 dark:text-white leading-tight">{studyQueue[currentIndex].back}</p>
              </div>
            </div>
          </div>
          {isFlipped && (
            <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-2xl">
              <button onClick={() => handleReview(0)} className="p-6 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Difícil</button>
              <button onClick={() => handleReview(3)} className="p-6 bg-usp-gold text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Médio</button>
              <button onClick={() => handleReview(5)} className="p-6 bg-usp-blue text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Fácil</button>
            </div>
          )}
          <button onClick={() => setMode('browse')} className="mt-12 text-slate-400 font-black text-xs uppercase underline">Sair da Audiência</button>
        </div>
      )}

      {mode === 'bulk' && (
        <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-usp-blue shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setMode('browse')} className="p-3"><ArrowLeft className="w-8 h-8 text-slate-400" /></button>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase">Importação em Lote</h3>
          </div>
          <p className="text-sm font-bold text-slate-500 mb-6">Cole as perguntas e respostas separadas por uma barra vertical. <br/> Exemplo: <code className="bg-slate-100 p-1 rounded">Habeas Corpus | Remédio constitucional para liberdade</code></p>
          <textarea 
            value={bulkInput} 
            onChange={(e) => setBulkInput(e.target.value)} 
            placeholder="Pergunta 1 | Resposta 1&#10;Pergunta 2 | Resposta 2" 
            className="w-full h-60 p-8 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-[2.5rem] font-bold resize-none outline-none" 
          />
          <button onClick={handleBulkImport} disabled={isLoading} className="w-full mt-6 py-6 bg-usp-blue text-white rounded-[2rem] font-black uppercase text-lg shadow-xl">
            {isLoading ? "Processando..." : "Protocolar Cards em Lote"}
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-sanfran-rubi shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setMode('browse')} className="p-3"><ArrowLeft className="w-8 h-8 text-slate-400" /></button>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Criação Manual</h3>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disciplina</label>
                <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold">
                   {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <input value={manualFront} onChange={(e) => setManualFront(e.target.value)} placeholder="Enunciado / Pergunta" className="w-full p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none" />
            <textarea value={manualBack} onChange={(e) => setManualBack(e.target.value)} placeholder="Doutrina / Resposta" className="w-full h-40 p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-3xl font-bold resize-none outline-none" />
            <button onClick={handleManualCreate} className="w-full py-6 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-lg shadow-xl flex items-center justify-center gap-3">
              <Gavel className="w-6 h-6" /> Protocolar Card
            </button>
            <p className="text-center text-[10px] font-black uppercase text-slate-400">Você pode criar vários cards seguidos. Clique no botão acima para salvar e continuar.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Anki;
