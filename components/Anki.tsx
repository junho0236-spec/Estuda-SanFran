
import React, { useState } from 'react';
import { 
  Plus, 
  BrainCircuit, 
  Sparkles, 
  RotateCcw, 
  Folder as FolderIcon, 
  ChevronRight, 
  ArrowLeft, 
  Trash2, 
  FolderPlus, 
  AlertCircle, 
  ShieldAlert, 
  ExternalLink, 
  ShieldCheck,
  CheckSquare,
  Square,
  X,
  FileText,
  Gavel
} from 'lucide-react';
import { Flashcard, Subject, Folder } from '../types';
import { generateFlashcards } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

interface AnkiProps {
  subjects: Subject[];
  flashcards: Flashcard[];
  setFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  userId: string;
}

const Anki: React.FC<AnkiProps> = ({ subjects, flashcards, setFlashcards, folders, setFolders, userId }) => {
  const [mode, setMode] = useState<'browse' | 'study' | 'generate' | 'create' | 'bulk'>('browse');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [aiInput, setAiInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  const getSubfolderIds = (folderId: string | null): string[] => {
    let ids: string[] = folderId ? [folderId] : [];
    const children = folders.filter(f => f.parentId === folderId);
    children.forEach(child => {
      ids = [...ids, ...getSubfolderIds(child.id)];
    });
    return ids;
  };

  const currentCards = flashcards.filter(f => f.folderId === currentFolderId);

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

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return;
    setIsGenerating(true);
    
    try {
      const lines = bulkInput.split('\n');
      const cardsToInsert = lines.map(line => {
        const parts = line.split(/[|:-]/); // Aceita |, : ou - como separador
        if (parts.length < 2) return null;
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          front: parts[0].trim(),
          back: parts.slice(1).join(':').trim(),
          subject_id: selectedSubjectId,
          folder_id: currentFolderId,
          next_review: Date.now(),
          interval: 0,
          user_id: userId
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
        interval: c.interval
      }));

      setFlashcards(prev => [...prev, ...formattedCards]);
      setMode('browse');
      setBulkInput('');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiInput.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      const cards = await generateFlashcards(aiInput, subject?.name || 'Geral');
      
      const cardsToInsert = cards.map((c: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        front: c.front,
        back: c.back,
        subject_id: selectedSubjectId,
        folder_id: currentFolderId,
        next_review: Date.now(),
        interval: 0,
        user_id: userId
      }));

      const { error } = await supabase.from('flashcards').insert(cardsToInsert);
      if (error) throw error;

      const formattedCards: Flashcard[] = cardsToInsert.map((c: any) => ({
        id: c.id, 
        front: c.front, 
        back: c.back, 
        subjectId: c.subject_id, 
        folderId: c.folder_id, 
        nextReview: c.next_review, 
        interval: c.interval
      }));

      setFlashcards(prev => [...prev, ...formattedCards]);
      setMode('browse');
      setAiInput('');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsGenerating(false);
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
        interval: 0
      });
      if (error) throw error;
      setFlashcards(prev => [...prev, { 
        id: newId, 
        front: manualFront, 
        back: manualBack, 
        subjectId: selectedSubjectId, 
        folderId: currentFolderId, 
        nextReview: Date.now(), 
        interval: 0 
      }]);
      setManualFront(''); 
      setManualBack(''); 
      // Não mudamos o modo aqui para permitir criar vários seguidos
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

  const currentFolders = folders.filter(f => f.parentId === currentFolderId);
  const currentContextIds = getSubfolderIds(currentFolderId);
  const reviewQueue = flashcards.filter(f => 
    f.nextReview <= Date.now() && 
    (currentFolderId === null ? true : currentContextIds.includes(f.folderId as string))
  );

  const handleReview = async (quality: number) => {
    const card = reviewQueue[currentIndex];
    const newInterval = quality === 0 ? 0 : (card.interval === 0 ? 1 : card.interval * 2);
    const nextReview = Date.now() + newInterval * 24 * 60 * 60 * 1000;
    try {
      await supabase.from('flashcards').update({ 
        interval: newInterval, 
        next_review: nextReview 
      }).eq('id', card.id).eq('user_id', userId);
      
      setFlashcards(prev => prev.map(f => f.id === card.id ? { ...f, interval: newInterval, nextReview } : f));
      
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
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Flashcards</h2>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mt-1">Acervo Jurídico.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {mode === 'browse' && (
            <>
              {isSelectionMode ? (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
                   <button onClick={selectAllInFolder} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-sm">
                    {selectedCardIds.size === currentCards.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    Todos
                  </button>
                  <button onClick={() => {}} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                    <Trash2 className="w-4 h-4" /> Deletar
                  </button>
                  <button onClick={() => setIsSelectionMode(false)} className="p-3 text-slate-500"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <>
                  <button onClick={() => { setMode('study'); setCurrentIndex(0); setIsFlipped(false); }} disabled={reviewQueue.length === 0} className="flex items-center gap-2 px-8 py-3.5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50 hover:bg-sanfran-rubiDark shadow-xl">
                    <RotateCcw className="w-5 h-5" /> Estudar ({reviewQueue.length})
                  </button>
                  <button onClick={() => {setMode('create'); setErrorMessage(null);}} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi dark:text-white border-2 border-sanfran-rubi rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 shadow-xl">
                    <Plus className="w-5 h-5" /> Novo
                  </button>
                  <button onClick={() => setMode('bulk')} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-sanfran-rubiDark text-usp-blue border-2 border-usp-blue rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 shadow-xl">
                    <FileText className="w-5 h-5" /> Importar
                  </button>
                  <button onClick={() => setMode('generate')} className="flex items-center gap-2 px-6 py-3.5 bg-usp-blue text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                    <Sparkles className="w-5 h-5" /> IA
                  </button>
                  <button onClick={() => setShowFolderInput(true)} className="p-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi border-2 border-slate-200 rounded-2xl shadow-sm"><FolderPlus className="w-6 h-6" /></button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {mode === 'browse' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {currentFolders.map(folder => (
            <div key={folder.id} onClick={() => setCurrentFolderId(folder.id)} className="bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2rem] border-2 border-slate-200 dark:border-sanfran-rubi/40 shadow-xl cursor-pointer hover:border-usp-gold border-l-[10px] border-l-usp-gold transition-all">
              <FolderIcon className="text-usp-gold w-8 h-8 mb-4" />
              <h4 className="font-black text-slate-950 dark:text-white uppercase tracking-tight">{folder.name}</h4>
            </div>
          ))}
          {currentCards.map(card => {
            const subject = subjects.find(s => s.id === card.subjectId);
            return (
              <div key={card.id} className="bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2rem] border-2 border-slate-200 dark:border-sanfran-rubi/40 shadow-xl flex flex-col justify-between h-[240px] border-l-[10px] group transition-all" style={{ borderLeftColor: subject?.color || '#9B111E' }}>
                <p className="font-black text-slate-950 dark:text-white line-clamp-4 leading-tight">{card.front}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-[9px] font-black uppercase text-slate-400">PRAZO: {new Date(card.nextReview).toLocaleDateString()}</span>
                  <BrainCircuit className="w-5 h-5 text-sanfran-rubi opacity-40" />
                </div>
              </div>
            );
          })}
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
              <div className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-black/80 border-[6px] border-usp-blue/40 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180">
                <span className="text-xs font-black text-usp-blue uppercase tracking-[0.3em] mb-8">Resposta</span>
                <p className="text-2xl font-black text-slate-950 dark:text-white leading-tight">{reviewQueue[currentIndex].back}</p>
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
          <button onClick={handleBulkImport} className="w-full mt-6 py-6 bg-usp-blue text-white rounded-[2rem] font-black uppercase text-lg shadow-xl">Protocolar Cards em Lote</button>
        </div>
      )}

      {mode === 'create' && (
        <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-sanfran-rubi shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setMode('browse')} className="p-3"><ArrowLeft className="w-8 h-8 text-slate-400" /></button>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Criação Manual</h3>
          </div>
          <div className="space-y-6">
            <input value={manualFront} onChange={(e) => setManualFront(e.target.value)} placeholder="Enunciado / Pergunta" className="w-full p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-2xl font-bold outline-none" />
            <textarea value={manualBack} onChange={(e) => setManualBack(e.target.value)} placeholder="Doutrina / Resposta" className="w-full h-40 p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-3xl font-bold resize-none outline-none" />
            <button onClick={handleManualCreate} className="w-full py-6 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-lg shadow-xl flex items-center justify-center gap-3">
              <Gavel className="w-6 h-6" /> Protocolar Card
            </button>
            <p className="text-center text-[10px] font-black uppercase text-slate-400">Você pode criar vários cards seguidos. Clique no botão acima para salvar e continuar.</p>
          </div>
        </div>
      )}

      {mode === 'generate' && (
        <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-usp-blue shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setMode('browse')} className="p-3"><ArrowLeft className="w-8 h-8 text-slate-400" /></button>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Processamento IA</h3>
          </div>
          <textarea 
            value={aiInput} 
            onChange={(e) => setAiInput(e.target.value)} 
            placeholder="Cole o texto jurídico aqui para converter em cards..." 
            className="w-full h-60 p-8 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 rounded-[2.5rem] font-bold resize-none outline-none" 
          />
          <button onClick={handleGenerate} disabled={isGenerating} className="w-full mt-6 py-6 bg-usp-blue text-white rounded-[2rem] font-black uppercase text-lg shadow-xl flex items-center justify-center gap-4">
            {isGenerating ? "Processando..." : "Gerar via IA"}
          </button>
          {errorMessage && <p className="mt-4 text-red-600 font-bold text-center uppercase text-xs">{errorMessage}</p>}
        </div>
      )}
    </div>
  );
};

export default Anki;
