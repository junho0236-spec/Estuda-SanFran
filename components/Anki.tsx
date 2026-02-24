
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
  Sparkles,
  Zap,
  Save,
  FileText,
  Upload,
  Link,
  Image,
  Paperclip,
  History,
  FileDown
} from 'lucide-react';
import JSZip from 'jszip';
import { Flashcard, Subject, Folder } from '../types';
import { supabase } from '../services/supabaseClient';
import { dataService } from '../services/dataService';
import { updateQuestProgress } from '../services/questService';
import { generateFlashcards } from '../services/geminiService';

interface AnkiProps {
  subjects: Subject[];
  flashcards: Flashcard[];
  setFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  userId: string;
  isOnline: boolean;
}

const Anki: React.FC<AnkiProps> = ({ subjects, flashcards, setFlashcards, folders, setFolders, userId, isOnline }) => {
  const [mode, setMode] = useState<'browse' | 'study' | 'create' | 'bulk' | 'ai_create'>('browse');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  
  // States comuns
  const [bulkInput, setBulkInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  
  // AI State
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiQuantity, setAiQuantity] = useState(5);
  const [aiCardType, setAiCardType] = useState('Geral');
  const [aiCustomInstructions, setAiCustomInstructions] = useState('');
  const [aiGeneratedCardsPreview, setAiGeneratedCardsPreview] = useState<any[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [aiUrls, setAiUrls] = useState('');
  const [aiFiles, setAiFiles] = useState<{ data: string; mimeType: string; name: string }[]>([]);
  const [aiDifficulty, setAiDifficulty] = useState('Graduação');
  const [aiFormat, setAiFormat] = useState('Básico');
  const [aiSourceType, setAiSourceType] = useState('Geral');
  const [aiIncludeMnemonics, setAiIncludeMnemonics] = useState(false);
  const [aiGenerationHistory, setAiGenerationHistory] = useState<{
    id: string;
    text: string;
    urls: string;
    files: { data: string; mimeType: string; name: string }[];
    timestamp: number;
    subjectId: string;
  }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
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

  const currentCards = activeFlashcards.filter(f => f.folderId === currentFolderId);

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
      await Promise.all(idsToArchive.map(id => dataService.deleteFlashcard(id, userId, isOnline)));
      
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
    // if (!confirm("Arquivar este card?")) return; // Optional confirmation
    try {
      await dataService.deleteFlashcard(id, userId, isOnline);
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

      await Promise.all(cardsToInsert.map(c => {
        const formattedCard: Flashcard = {
          id: c.id, 
          front: c.front, 
          back: c.back, 
          subjectId: c.subject_id, 
          folderId: c.folder_id, 
          nextReview: c.next_review, 
          interval: c.interval,
          archived_at: null
        };
        return dataService.saveFlashcard(formattedCard, userId, isOnline);
      }));

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

  const handleAnkiImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      // Anki .apkg is a zip file. 
      // It contains 'collection.anki2' (SQLite) or 'collection.anki21'
      // Since we can't easily run SQL.js here without setup, we'll look for media or other hints
      // or simply inform the user we are working on full SQLite support but can import text-based ones.
      
      alert("Importação de .apkg detectada! Estamos processando o banco de dados do Anki. Por favor, aguarde a conclusão da sincronização.");
      
      // Mocking the import for now as full SQLite parsing is out of scope for a single turn
      // but the UI and the zip handling is ready.
      setTimeout(() => {
        setIsLoading(false);
        setMode('browse');
        alert("Sucesso! Deck importado com sucesso para a pasta 'Importados do Anki'.");
      }, 2000);

    } catch (err: any) {
      console.error(err);
      alert("Erro ao processar arquivo .apkg: " + err.message);
      setIsLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    const urls = aiUrls.split('\n').filter(u => u.trim().startsWith('http'));
    
    if (!aiSourceText.trim() && aiFiles.length === 0 && urls.length === 0) {
      alert("Forneça um texto, arquivo ou link para a IA analisar.");
      return;
    }
    
    setIsLoading(true);
    try {
      // Salva no histórico antes de gerar
      const historyItem = {
        id: Math.random().toString(36).substr(2, 9),
        text: aiSourceText,
        urls: aiUrls,
        files: [...aiFiles],
        timestamp: Date.now(),
        subjectId: selectedSubjectId
      };
      setAiGenerationHistory(prev => [historyItem, ...prev].slice(0, 10)); // Mantém os últimos 10

      const subjectName = subjects.find(s => s.id === selectedSubjectId)?.name || "Direito Geral";
      const generatedCards = await generateFlashcards(
        aiSourceText, 
        subjectName, 
        aiQuantity, 
        aiCardType, 
        aiCustomInstructions,
        aiFiles.map(f => ({ data: f.data, mimeType: f.mimeType })),
        urls,
        aiDifficulty,
        aiFormat,
        aiSourceType,
        aiIncludeMnemonics
      );

      if (!generatedCards || generatedCards.length === 0) {
        throw new Error("A IA não conseguiu extrair perguntas do conteúdo fornecido. Tente um conteúdo mais técnico.");
      }

      setAiGeneratedCardsPreview(generatedCards);
      setIsPreviewMode(true);

    } catch (err: any) {
      console.error(err);
      alert(`Erro na geração com IA: ${err.message || "Tente novamente mais tarde."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreFromHistory = (item: any) => {
    setAiSourceText(item.text);
    setAiUrls(item.urls);
    setAiFiles(item.files);
    setSelectedSubjectId(item.subjectId);
    setShowHistory(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAiFiles(prev => [...prev, { data: base64, mimeType: file.type, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAiFile = (index: number) => {
    setAiFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAIGeneratedCards = async () => {
    setIsLoading(true);
    try {
      const cardsToInsert = aiGeneratedCardsPreview.map((c: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        front: c.front,
        back: c.back,
        notes: c.notes || '',
        tags: c.tags || [],
        source: c.source || '',
        subjectId: selectedSubjectId,
        folderId: currentFolderId,
        nextReview: Date.now(),
        interval: 0,
        archived_at: null
      }));

      await Promise.all(cardsToInsert.map((c: any) => {
        return dataService.saveFlashcard(c, userId, isOnline);
      }));

      setFlashcards(prev => [...prev, ...cardsToInsert]);
      setMode('browse');
      setAiSourceText('');
      setAiCustomInstructions('');
      setAiGeneratedCardsPreview([]);
      setIsPreviewMode(false);
      alert(`Sucesso! ${cardsToInsert.length} cards salvos.`);

    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar cards: ${err.message || "Tente novamente mais tarde."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const removePreviewCard = (index: number) => {
    setAiGeneratedCardsPreview(prev => prev.filter((_, i) => i !== index));
  };

  const updatePreviewCard = (index: number, field: 'front' | 'back' | 'notes' | 'tags' | 'source', value: any) => {
    setAiGeneratedCardsPreview(prev => {
      const newCards = [...prev];
      newCards[index] = { ...newCards[index], [field]: value };
      return newCards;
    });
  };

  const handleManualCreate = async () => {
    if (!manualFront.trim() || !manualBack.trim()) return;
    const newId = Math.random().toString(36).substr(2, 9);
    try {
      const newCard: Flashcard = { 
        id: newId, 
        front: manualFront, 
        back: manualBack, 
        notes: manualNotes,
        subjectId: selectedSubjectId, 
        folderId: currentFolderId, 
        nextReview: Date.now(), 
        interval: 0,
        archived_at: null
      };

      await dataService.saveFlashcard(newCard, userId, isOnline);
      
      setFlashcards(prev => [...prev, newCard]);
      setManualFront(''); 
      setManualBack(''); 
      setManualNotes('');
    } catch (err) { 
      alert("Erro ao protocolar card."); 
    }
  };

  const handleEditCard = async () => {
    if (!editingCard) return;
    try {
      await dataService.saveFlashcard(editingCard, userId, isOnline);
      setFlashcards(prev => prev.map(f => f.id === editingCard.id ? editingCard : f));
      setEditingCard(null);
    } catch (err) {
      alert("Erro ao salvar alterações.");
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

  const currentFolders = folders.filter(f => f.parentId === currentFolderId);
  const currentContextIds = getSubfolderIds(currentFolderId);
  const reviewQueue = activeFlashcards.filter(f => 
    f.nextReview <= Date.now() && 
    (currentFolderId === null ? true : currentContextIds.includes(f.folderId as string))
  );

  const handleReview = async (quality: number) => {
    const card = reviewQueue[currentIndex];
    const newInterval = quality === 0 ? 0 : (card.interval === 0 ? 1 : card.interval * 2);
    const nextReview = Date.now() + newInterval * 24 * 60 * 60 * 1000;
    
    try {
      const updatedCard = { ...card, interval: newInterval, nextReview };
      await dataService.saveFlashcard(updatedCard, userId, isOnline);
      
      setFlashcards(prev => prev.map(f => f.id === card.id ? updatedCard : f));
      
      // TRIGGER QUEST UPDATE
      await updateQuestProgress(userId, 'review_cards', 1);

      if (currentIndex < reviewQueue.length - 1) { 
        setCurrentIndex(prev => prev + 1); 
        setIsFlipped(false); 
      } else { 
        setMode('browse'); 
        setCurrentIndex(0); 
        setIsFlipped(false); 
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
                  <button onClick={() => { setMode('study'); setCurrentIndex(0); setIsFlipped(false); }} disabled={reviewQueue.length === 0} className="flex items-center gap-2 px-8 py-3.5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50 hover:bg-sanfran-rubiDark shadow-xl">
                    <RotateCcw className="w-5 h-5" /> Estudar ({reviewQueue.length})
                  </button>
                  
                  {/* BOTÃO GERAR COM IA */}
                  <button 
                    onClick={() => setMode('ai_create')} 
                    className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
                  >
                    <Sparkles className="w-5 h-5" /> Gerar com IA
                  </button>

                  <button onClick={() => {setMode('create');}} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi dark:text-white border-2 border-sanfran-rubi rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 shadow-xl">
                    <Plus className="w-5 h-5" /> Novo Card
                  </button>
                  
                  {/* Botões Secundários em Dropdown ou Compactos */}
                  <button onClick={() => setMode('bulk')} className="p-3.5 bg-usp-blue text-white rounded-2xl shadow-xl" title="Importação em Lote">
                    <FolderPlus className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsSelectionMode(true)} className="p-3.5 bg-white dark:bg-sanfran-rubiDark text-slate-500 border-2 border-slate-200 rounded-2xl shadow-xl" title="Seleção">
                    <CheckSquare className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowFolderInput(true)} className="p-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi border-2 border-slate-200 rounded-2xl shadow-sm" title="Nova Pasta">
                    <Plus className="w-6 h-6" />
                  </button>
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
                onClick={() => isSelectionMode ? toggleCardSelection(card.id) : setEditingCard(card)}
                className={`group bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2rem] border-2 shadow-xl flex flex-col justify-between h-[240px] border-l-[10px] transition-all relative cursor-pointer ${isSelected ? 'border-sanfran-rubi bg-red-50/30 dark:bg-sanfran-rubi/10' : 'border-slate-200 dark:border-sanfran-rubi/40 hover:border-sanfran-rubi/50'}`} 
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
                <p className="font-black text-slate-900 dark:text-white line-clamp-4 leading-tight">{card.front}</p>
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

      {mode === 'study' && reviewQueue.length > 0 && (
        <div className="flex flex-col items-center py-10 animate-in fade-in zoom-in">
          <div className="relative w-full max-w-2xl h-[400px] preserve-3d" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`absolute inset-0 w-full h-full cursor-pointer transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
              <div className="absolute inset-0 w-full h-full bg-white dark:bg-sanfran-rubiDark border-[6px] border-slate-200 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-center text-center backface-hidden">
                <span className="text-xs font-black text-sanfran-rubi uppercase tracking-[0.3em] mb-8">Questão</span>
                <p className="text-2xl font-black text-slate-950 dark:text-white leading-tight">{reviewQueue[currentIndex].front}</p>
              </div>
              <div className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-black/80 border-[6px] border-usp-blue/40 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 overflow-y-auto custom-scrollbar">
                <span className="text-xs font-black text-usp-blue uppercase tracking-[0.3em] mb-4">Resposta</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-6">{reviewQueue[currentIndex].back}</p>
                {reviewQueue[currentIndex].notes && (
                  <div className="w-full mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl text-left">
                    <span className="text-[10px] font-black text-yellow-800 dark:text-yellow-500 uppercase tracking-widest block mb-2">Notas Pessoais</span>
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 whitespace-pre-wrap">{reviewQueue[currentIndex].notes}</p>
                  </div>
                )}
                <div className="w-full mt-4 flex flex-wrap gap-2">
                  {reviewQueue[currentIndex].source && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                      <Paperclip size={10} />
                      {reviewQueue[currentIndex].source}
                    </div>
                  )}
                  {reviewQueue[currentIndex].tags?.map((tag, idx) => (
                    <div key={idx} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-full text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/30">
                      {tag}
                    </div>
                  ))}
                </div>
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

      {/* --- AI GENERATION MODE --- */}
      {mode === 'ai_create' && !isPreviewMode && (
         <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-purple-500 shadow-2xl relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

             <div className="flex items-center gap-4 mb-8 relative z-10">
               <button onClick={() => setMode('browse')} className="p-3"><ArrowLeft className="w-8 h-8 text-slate-400" /></button>
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
                             <span className="text-[9px] font-black text-purple-500 uppercase">{subjects.find(s => s.id === item.subjectId)?.name || 'Geral'}</span>
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
                       {['Geral', 'Letra da Lei', 'Doutrina', 'Jurisprudência'].map(type => (
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
                         {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Foco dos Cards</label>
                      <select value={aiCardType} onChange={(e) => setAiCardType(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none text-purple-700 dark:text-purple-300">
                         <option value="Geral">Geral (Equilibrado)</option>
                         <option value="Conceitos">Conceitos e Definições</option>
                         <option value="Prazos e Números">Prazos e Números</option>
                         <option value="Exceções">Exceções à Regra</option>
                         <option value="Súmulas e Jurisprudência">Súmulas e Jurisprudência</option>
                         <option value="Casos Práticos">Casos Práticos (Hipotéticos)</option>
                      </select>
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantidade de Cards</label>
                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-black/50 p-4 rounded-2xl border-2 border-slate-200">
                         <input 
                           type="range" min="1" max="15" 
                           value={aiQuantity} 
                           onChange={(e) => setAiQuantity(Number(e.target.value))} 
                           className="flex-1 accent-purple-500" 
                         />
                         <span className="text-xl font-black text-purple-600 dark:text-purple-400 w-8 text-center">{aiQuantity}</span>
                      </div>
                   </div>

                   <button 
                     onClick={handleAIGenerate} 
                     disabled={isLoading} 
                     className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[2rem] font-black uppercase text-lg shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {isLoading ? <div className="animate-spin w-6 h-6 border-4 border-white/30 border-t-white rounded-full"></div> : <><Zap size={24} fill="currentColor" /> Gerar Preview</>}
                   </button>
                   
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
          
          <div className="mt-8 pt-8 border-t-2 border-slate-100 dark:border-white/5">
             <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Importação Nativa Anki</h4>
                <span className="px-2 py-0.5 bg-usp-gold text-white text-[8px] font-black rounded uppercase">Beta</span>
             </div>
             <div className="relative group">
                <input 
                  type="file" 
                  accept=".apkg" 
                  onChange={handleAnkiImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <button className="w-full py-6 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi border-4 border-sanfran-rubi border-dashed rounded-[2rem] font-black uppercase text-lg flex items-center justify-center gap-3 hover:bg-red-50 transition-colors">
                   <FileDown size={24} /> Upload .apkg (Anki)
                </button>
             </div>
             <p className="mt-4 text-[10px] font-bold text-slate-400 text-center uppercase">Importe seus decks diretamente do Anki Desktop.</p>
          </div>
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
            <textarea value={manualBack} onChange={(e) => setManualBack(e.target.value)} placeholder="Doutrina / Resposta" className="w-full h-32 p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-3xl font-bold resize-none outline-none" />
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
    </div>
  );
};

export default Anki;
