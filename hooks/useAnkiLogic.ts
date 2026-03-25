import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Flashcard, 
  Folder, 
  Subject, 
  StudyHistory, 
  DeckRequest, 
  CollaborativeDeck 
} from '../types';
import { dataService } from '../services/dataService';
import { questService } from '../services/questService';
import { geminiService, generateFlashcardsStream } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import JSZip from 'jszip';

export const useAnkiLogic = (userId: string, isOnline: boolean) => {
  const [mode, setMode] = useState<'browse' | 'study' | 'create' | 'bulk' | 'ai_create' | 'community'>('browse');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [activeMenuFolderId, setActiveMenuFolderId] = useState<string | null>(null);
  const [isTableView, setIsTableView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  
  // Toast & Modal State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; confirmText?: string; cancelText?: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const askConfirmation = (title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => {
    setConfirmModal({ title, message, onConfirm, confirmText, cancelText });
  };

  // AI Generation State
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiUrls, setAiUrls] = useState('');
  const [aiFiles, setAiFiles] = useState<{ data: string; mimeType: string; name: string }[]>([]);
  const [aiDifficulty, setAiDifficulty] = useState('Graduação');
  const [aiFormat, setAiFormat] = useState('Básico');
  const [aiSourceType, setAiSourceType] = useState('Geral');
  const [aiIncludeMnemonics, setAiIncludeMnemonics] = useState(false);
  const [aiQuantity, setAiQuantity] = useState(5);
  const [aiCardType, setAiCardType] = useState('Geral');
  const [aiFrontLength, setAiFrontLength] = useState<'curta' | 'normal' | 'extensa'>('normal');
  const [aiBackLength, setAiBackLength] = useState<'curta' | 'normal' | 'extensa'>('normal');
  const [aiCustomInstructions, setAiCustomInstructions] = useState('');
  const [aiGeneratedCardsPreview, setAiGeneratedCardsPreview] = useState<Partial<Flashcard>[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [aiGenerationHistory, setAiGenerationHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isGeneratingCloze, setIsGeneratingCloze] = useState(false);

  // Selection Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  // Community State
  const [publicDecks, setPublicDecks] = useState<any[]>([]);
  const [isFetchingCommunity, setIsFetchingCommunity] = useState(false);
  const [deckRequests, setDeckRequests] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [f, s, c] = await Promise.all([
        dataService.getFolders(),
        dataService.getSubjects(),
        dataService.getCards()
      ]);
      setFolders(f);
      setSubjects(s);
      setFlashcards(c);
      if (s.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(s[0].id);
      }
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, selectedSubjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper functions
  const getSubfolderIds = (folderId: string | null): string[] => {
    let ids: string[] = folderId ? [folderId] : [];
    const children = (folders || []).filter(f => f.parentId === folderId);
    children.forEach(child => {
      ids = [...ids, ...getSubfolderIds(child.id)];
    });
    return ids;
  };

  const toggleCardSelection = (id: string) => {
    const newSelection = new Set(selectedCardIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedCardIds(newSelection);
  };

  const toggleFolderSelection = (id: string) => {
    const newSelection = new Set(selectedFolderIds);
    const subfolderIds = getSubfolderIds(id);
    const cardIdsInFolder = flashcards.filter(f => subfolderIds.includes(f.folderId as string)).map(f => f.id);
    const newCardSelection = new Set(selectedCardIds);

    if (newSelection.has(id)) {
      newSelection.delete(id);
      cardIdsInFolder.forEach(cid => newCardSelection.delete(cid));
    } else {
      newSelection.add(id);
      cardIdsInFolder.forEach(cid => newCardSelection.add(cid));
    }
    setSelectedFolderIds(newSelection);
    setSelectedCardIds(newCardSelection);
  };

  const archiveSelectedCards = async () => {
    if (selectedCardIds.size === 0 && selectedFolderIds.size === 0) return;
    
    askConfirmation(
      "Arquivar Selecionados",
      `Deseja mover estes ${selectedCardIds.size} cards e ${selectedFolderIds.size} pastas para o Arquivo Morto?`,
      async () => {
        try {
          const idsToArchive = Array.from(selectedCardIds);
          const folderIdsToArchive = Array.from(selectedFolderIds);

          await Promise.all([
            ...idsToArchive.map(id => dataService.deleteFlashcard(id, userId, isOnline)),
            ...folderIdsToArchive.map(id => dataService.deleteFolder(id, userId, isOnline))
          ]);
          
          setFlashcards(prev => prev.filter(f => !selectedCardIds.has(f.id)));
          setFolders(prev => prev.filter(f => !selectedFolderIds.has(f.id)));
          setSelectedCardIds(new Set());
          setSelectedFolderIds(new Set());
          setIsSelectionMode(false);
          showToast("Itens arquivados com sucesso!", "success");
        } catch (err) {
          showToast("Falha ao arquivar itens selecionados.", "error");
        }
      }
    );
  };

  const handleAIGenerate = async () => {
    const urls = aiUrls.split('\n').filter(u => u.trim().startsWith('http'));
    
    if (!aiSourceText.trim() && aiFiles.length === 0 && urls.length === 0) {
      showToast("Forneça um texto, arquivo ou link para a IA analisar.", "info");
      return;
    }
    
    setIsLoading(true);
    setAiGeneratedCardsPreview([]); 
    setIsPreviewMode(true); 

    try {
      const historyItem = {
        id: crypto.randomUUID(),
        text: aiSourceText,
        urls: aiUrls,
        files: [...aiFiles],
        timestamp: Date.now(),
        subjectId: selectedSubjectId
      };
      setAiGenerationHistory(prev => [historyItem, ...prev].slice(0, 10));

      const subjectName = (subjects || []).find(s => s.id === selectedSubjectId)?.name || "Direito Geral";
      
      await generateFlashcardsStream(
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
        aiIncludeMnemonics,
        (partialCards) => {
          setAiGeneratedCardsPreview(partialCards);
        },
        aiFrontLength,
        aiBackLength
      );

    } catch (err: any) {
      console.error(err);
      showToast(`Erro na geração com IA: ${err.message || "Tente novamente mais tarde."}`, "error");
      setIsPreviewMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAIGeneratedCards = async () => {
    setIsLoading(true);
    try {
      const cardsToInsert = aiGeneratedCardsPreview.map((c: any) => ({
        id: crypto.randomUUID(),
        front: c.front,
        back: c.back,
        notes: c.notes || '',
        tags: c.tags || [],
        source: c.source || '',
        subjectId: selectedSubjectId || null,
        folderId: currentFolderId || null,
        nextReview: Date.now(),
        interval: 0,
        status: 'new' as const,
        learningStep: 0,
        easeFactor: 2.5,
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
      showToast(`Sucesso! ${cardsToInsert.length} cards salvos.`, "success");

    } catch (err: any) {
      console.error(err);
      showToast(`Erro ao salvar cards: ${err.message || "Tente novamente mais tarde."}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mode, setMode,
    folders, setFolders,
    subjects, setSubjects,
    flashcards, setFlashcards,
    currentFolderId, setCurrentFolderId,
    selectedSubjectId, setSelectedSubjectId,
    isLoading, setIsLoading,
    error, setError,
    activeMenuFolderId, setActiveMenuFolderId,
    isTableView, setIsTableView,
    searchQuery, setSearchQuery,
    selectedTag, setSelectedTag,
    isGlobalSearch, setIsGlobalSearch,
    toast, setToast,
    confirmModal, setConfirmModal,
    showToast, askConfirmation,
    aiSourceText, setAiSourceText,
    aiUrls, setAiUrls,
    aiFiles, setAiFiles,
    aiDifficulty, setAiDifficulty,
    aiFormat, setAiFormat,
    aiSourceType, setAiSourceType,
    aiIncludeMnemonics, setAiIncludeMnemonics,
    aiQuantity, setAiQuantity,
    aiCardType, setAiCardType,
    aiFrontLength, setAiFrontLength,
    aiBackLength, setAiBackLength,
    aiCustomInstructions, setAiCustomInstructions,
    aiGeneratedCardsPreview, setAiGeneratedCardsPreview,
    isPreviewMode, setIsPreviewMode,
    aiGenerationHistory, setAiGenerationHistory,
    showHistory, setShowHistory,
    isGeneratingCloze, setIsGeneratingCloze,
    isSelectionMode, setIsSelectionMode,
    selectedCardIds, setSelectedCardIds,
    selectedFolderIds, setSelectedFolderIds,
    publicDecks, setPublicDecks,
    isFetchingCommunity, setIsFetchingCommunity,
    deckRequests, setDeckRequests,
    fetchData,
    toggleCardSelection,
    toggleFolderSelection,
    archiveSelectedCards,
    handleAIGenerate,
    handleSaveAIGeneratedCards,
    toggleSuspension: async (cardId: string) => {
      const card = flashcards.find(f => f.id === cardId);
      if (!card) return;
      const updatedCard = { ...card, is_suspended: !card.is_suspended };
      try {
        await dataService.saveFlashcard(updatedCard, userId, isOnline);
        setFlashcards(prev => prev.map(f => f.id === cardId ? updatedCard : f));
      } catch (err) {
        showToast("Erro ao alterar status do card.", "error");
      }
    },
    archiveCard: async (id: string) => {
      try {
        await dataService.deleteFlashcard(id, userId, isOnline);
        setFlashcards(prev => prev.filter(f => f.id !== id));
        if (selectedCardIds.has(id)) {
          const newSelection = new Set(selectedCardIds);
          newSelection.delete(id);
          setSelectedCardIds(newSelection);
        }
      } catch (err) {
        showToast("Erro ao arquivar card.", "error");
      }
    },
    deleteFolder: async (id: string) => {
      askConfirmation(
        "Eliminar Pasta",
        "Deseja eliminar esta pasta? Todos os flashcards dentro dela E de suas subpastas TAMBÉM serão excluídos permanentemente.",
        async () => {
          try {
            await dataService.deleteFolder(id, userId, isOnline);
            const allFolderIdsToDelete = [id, ...getSubfolderIds(id)];
            setFlashcards(prev => prev.filter(f => !f.folderId || !allFolderIdsToDelete.includes(f.folderId)));
            setFolders(prev => prev.filter(f => !allFolderIdsToDelete.includes(f.id)));
            if (allFolderIdsToDelete.includes(currentFolderId || '')) {
              setCurrentFolderId(null);
            }
            setActiveMenuFolderId(null);
            showToast("Pasta eliminada com sucesso.", "success");
          } catch (err) {
            showToast("Erro ao eliminar pasta. Tente novamente.", "error");
          }
        },
        "Eliminar",
        "Cancelar"
      );
    },
    handleRenameFolder: async (id: string, currentName: string) => {
      const newName = prompt("Novo nome para a pasta:", currentName);
      if (!newName || newName === currentName) return;
      const folder = folders.find(f => f.id === id);
      if (!folder) return;
      try {
        const updatedFolder = { ...folder, name: newName };
        await dataService.saveFolder(updatedFolder, userId, isOnline);
        setFolders(prev => prev.map(f => f.id === id ? updatedFolder : f));
        setActiveMenuFolderId(null);
      } catch (err) {
        showToast("Erro ao renomear pasta.", "error");
      }
    },
    handleResetFolderProgress: async (folderId: string) => {
      askConfirmation(
        "Zerar Progresso",
        "Deseja zerar o progresso de todos os cards nesta pasta? Eles voltarão ao status de 'Novos'.",
        async () => {
          try {
            const subfolderIds = getSubfolderIds(folderId);
            const cardsToReset = flashcards.filter(f => subfolderIds.includes(f.folderId as string));
            await Promise.all(cardsToReset.map(card => {
              const updatedCard: Flashcard = { 
                ...card, 
                interval: 0, 
                nextReview: Date.now(),
                status: 'new',
                learningStep: 0,
                easeFactor: 2.5
              };
              return dataService.saveFlashcard(updatedCard, userId, isOnline);
            }));
            setFlashcards(prev => prev.map(f => {
              if (subfolderIds.includes(f.folderId as string)) {
                return { 
                  ...f, 
                  interval: 0, 
                  nextReview: Date.now(),
                  status: 'new',
                  learningStep: 0,
                  easeFactor: 2.5
                };
              }
              return f;
            }));
            setActiveMenuFolderId(null);
            showToast("Progresso zerado com sucesso!", "success");
          } catch (err) {
            showToast("Erro ao zerar progresso.", "error");
          }
        }
      );
    },
    handleExportFolder: async (folderId: string, folderName: string) => {
      setIsLoading(true);
      try {
        const subfolderIds = getSubfolderIds(folderId);
        const cardsToExport = flashcards.filter(f => subfolderIds.includes(f.folderId as string));
        if (cardsToExport.length === 0) {
          showToast("Não há cards nesta pasta para exportar.", "info");
          return;
        }
        const zip = new JSZip();
        const deckData = {
          name: folderName,
          cards: cardsToExport.map(c => ({
            front: c.front,
            back: c.back,
            notes: c.notes,
            tags: c.tags
          }))
        };
        zip.file("deck.json", JSON.stringify(deckData, null, 2));
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${folderName.replace(/\s+/g, '_')}.apkg`;
        link.click();
        setActiveMenuFolderId(null);
      } catch (err) {
        showToast("Erro ao exportar deck.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    fetchPublicDecks: async () => {
      setIsFetchingCommunity(true);
      try {
        const { data, error } = await supabase.from('public_decks').select('*').order('downloads', { ascending: false });
        if (error) throw error;
        setPublicDecks(data || []);
      } catch (err) {
        console.error("Erro ao buscar decks públicos:", err);
      } finally {
        setIsFetchingCommunity(false);
      }
    },
    handleDownloadDeck: async (deck: any) => {
      setIsLoading(true);
      try {
        const folderId = crypto.randomUUID();
        const folderName = `${deck.name} (Cópia)`;
        const { error: folderError } = await supabase.from('folders').insert({
          id: folderId,
          user_id: userId,
          name: folderName,
          parent_id: null,
          original_deck_id: deck.id,
          version: deck.version || 1
        });
        if (folderError) throw folderError;
        const cardsToInsert = deck.cards.map((c: any) => ({
          id: crypto.randomUUID(),
          front: c.front,
          back: c.back,
          notes: c.notes || '',
          tags: c.tags || [],
          subjectId: selectedSubjectId,
          folderId: folderId,
          nextReview: Date.now(),
          interval: 0,
          status: 'new',
          learningStep: 0,
          easeFactor: 2.5,
          archived_at: null,
          is_suspended: false
        }));
        await Promise.all(cardsToInsert.map((c: any) => dataService.saveFlashcard(c, userId, isOnline)));
        setFolders(prev => [...prev, { 
          id: folderId, 
          name: folderName, 
          parentId: null, 
          user_id: userId,
          original_deck_id: deck.id,
          version: deck.version || 1
        }]);
        setFlashcards(prev => [...prev, ...cardsToInsert]);
        await supabase.from('public_decks').update({ downloads: (deck.downloads || 0) + 1 }).eq('id', deck.id);
        showToast(`Deck "${deck.name}" baixado com sucesso!`, "success");
        setMode('browse');
        setCurrentFolderId(folderId);
      } catch (err) {
        showToast("Falha ao baixar deck da comunidade.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    handleLikeDeck: async (deck: any) => {
      try {
        const { error } = await supabase.from('public_decks').update({ likes: (deck.likes || 0) + 1 }).eq('id', deck.id);
        if (error) throw error;
        setPublicDecks(prev => prev.map(d => d.id === deck.id ? { ...d, likes: (d.likes || 0) + 1 } : d));
      } catch (err) {
        console.error("Erro ao curtir deck:", err);
      }
    },
    handleBulkImport: async (input: string) => {
      if (!input.trim()) return;
      setIsLoading(true);
      try {
        let cardsToInsert: any[] = [];
        try {
          const jsonData = JSON.parse(input);
          const arrayData = Array.isArray(jsonData) ? jsonData : (jsonData.cards || jsonData.flashcards || []);
          if (arrayData.length > 0) {
            cardsToInsert = arrayData.map((item: any) => ({
              id: crypto.randomUUID(),
              front: item.front || item.question || item.p || item.frente,
              back: item.back || item.answer || item.r || item.verso,
              subject_id: selectedSubjectId,
              folder_id: currentFolderId,
              next_review: Date.now(),
              interval: 0,
              status: 'new',
              learningStep: 0,
              easeFactor: 2.5,
              user_id: userId,
              archived_at: null
            }));
          }
        } catch (e) {
          const lines = input.split('\n');
          cardsToInsert = lines.map(line => {
            if (!line.trim()) return null;
            let parts = line.split(';');
            if (parts.length < 2) parts = line.split('\t');
            if (parts.length < 2) parts = line.split('|');
            if (parts.length < 2) parts = line.split(',');
            if (parts.length < 2) return null;
            return {
              id: crypto.randomUUID(),
              front: parts[0].trim().replace(/^"|"$/g, ''),
              back: parts.slice(1).join(';').trim().replace(/^"|"$/g, ''),
              subject_id: selectedSubjectId,
              folder_id: currentFolderId,
              next_review: Date.now(),
              interval: 0,
              status: 'new',
              learningStep: 0,
              easeFactor: 2.5,
              user_id: userId,
              archived_at: null
            };
          }).filter(Boolean);
        }
        if (cardsToInsert.length === 0) throw new Error("Formato inválido.");
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
        showToast("Cards importados com sucesso!", "success");
      } catch (err: any) {
        showToast(err.message, "error");
      } finally {
        setIsLoading(false);
      }
    },
    restoreFromHistory: (item: any) => {
      setAiSourceText(item.text);
      setAiUrls(item.urls);
      setAiFiles(item.files);
      setSelectedSubjectId(item.subjectId);
      setShowHistory(false);
    },
    removeAiFile: (index: number) => {
      setAiFiles(prev => prev.filter((_, i) => i !== index));
    },
    removePreviewCard: (index: number) => {
      setAiGeneratedCardsPreview(prev => prev.filter((_, i) => i !== index));
    },
    updatePreviewCard: (index: number, field: 'front' | 'back' | 'notes' | 'tags' | 'source', value: any) => {
      setAiGeneratedCardsPreview(prev => {
        const newCards = [...prev];
        newCards[index] = { ...newCards[index], [field]: value };
        return newCards;
      });
    },
    handleManualCreate: async (card: Partial<Flashcard>) => {
      const newId = crypto.randomUUID();
      try {
        const newCard: Flashcard = { 
          id: newId, 
          front: card.front || '', 
          back: card.back || '', 
          notes: card.notes || '',
          image: card.image || undefined,
          subjectId: card.subjectId || selectedSubjectId || null, 
          folderId: card.folderId || currentFolderId || null, 
          nextReview: Date.now(), 
          interval: 0,
          status: 'new',
          learningStep: 0,
          easeFactor: 2.5,
          archived_at: null
        };
        await dataService.saveFlashcard(newCard, userId, isOnline);
        setFlashcards(prev => [...prev, newCard]);
        showToast("Card criado com sucesso!", "success");
      } catch (err: any) { 
        showToast(`Erro ao criar card: ${err.message}`, "error");
      }
    },
    handleEditCard: async (card: Flashcard) => {
      try {
        await dataService.saveFlashcard(card, userId, isOnline);
        setFlashcards(prev => prev.map(f => f.id === card.id ? card : f));
        showToast("Card atualizado com sucesso!", "success");
      } catch (err: any) {
        showToast(`Erro ao salvar alterações: ${err.message}`, "error");
      }
    },
    handleCreateFolder: async (folder: Partial<Folder>) => {
      const newId = crypto.randomUUID();
      try {
        const newFolder: Folder = { 
          id: newId, 
          name: folder.name || 'Nova Pasta', 
          parentId: folder.parentId || currentFolderId, 
          color: folder.color || '#ccc',
          icon: folder.icon || 'folder',
          targetDate: folder.targetDate,
          user_id: userId
        };
        await dataService.saveFolder(newFolder, userId, isOnline);
        setFolders(prev => [...prev, newFolder]);
        showToast("Pasta criada com sucesso!", "success");
      } catch (err) { 
        showToast("Erro ao criar pasta.", "error");
      }
    },
    handleUpdateFolder: async (folder: Folder) => {
      try {
        await dataService.saveFolder(folder, userId, isOnline);
        setFolders(prev => prev.map(f => f.id === folder.id ? folder : f));
        showToast("Pasta atualizada com sucesso!", "success");
      } catch (err) {
        showToast("Erro ao atualizar pasta.", "error");
      }
    },
    fetchDeckRequests: async () => {
      try {
        const { data, error } = await supabase.from('deck_requests').select('*').order('votes', { ascending: false });
        if (error) throw error;
        setDeckRequests(data);
      } catch (err) {
        console.error("Erro ao carregar pedidos de decks:", err);
      }
    },
    handleCreateDeckRequest: async (topic: string) => {
      if (!topic.trim()) return;
      try {
        const { error } = await supabase.from('deck_requests').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          topic: topic,
          votes: 0,
        });
        if (error) throw error;
        showToast("Pedido enviado com sucesso!", "success");
      } catch (err) {
        showToast("Erro ao enviar pedido.", "error");
      }
    },
    handleSemanticSearch: async (semanticSearchQuery: string) => {
      if (!semanticSearchQuery.trim()) return;
      
      setIsLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const prompt = `Você é um especialista em Direito. O usuário está pesquisando por: "${semanticSearchQuery}". 
        Retorne uma lista de 5 a 10 termos jurídicos estritamente relacionados, sinônimos ou conceitos que abrangem essa pesquisa (ex: se pesquisar "prisão preventiva", inclua "medidas cautelares", "periculum libertatis", "prisão cautelar").
        Retorne APENAS os termos separados por vírgula, sem explicações.`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt
        });
        
        const relatedTerms = response.text?.split(',').map(t => t.trim().toLowerCase()) || [];
        setSearchQuery(semanticSearchQuery + ' ' + relatedTerms.join(' '));
        showToast("Busca semântica concluída! Termos relacionados incluídos.", "success");
      } catch (error) {
        console.error("Semantic search failed:", error);
        showToast("Erro na busca semântica. Tente novamente.", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };
};
