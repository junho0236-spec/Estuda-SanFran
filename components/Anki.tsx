
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
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Key
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
  const [mode, setMode] = useState<'browse' | 'study' | 'generate' | 'create'>('browse');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [aiInput, setAiInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Estados para Seleção em Massa
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Estados para Configuração de IA
  const [genCount, setGenCount] = useState('auto');
  const [frontLen, setFrontLen] = useState('medio');
  const [backLen, setBackLen] = useState('medio');

  const getSubfolderIds = (folderId: string | null): string[] => {
    let ids: string[] = folderId ? [folderId] : [];
    const children = folders.filter(f => f.parentId === folderId);
    children.forEach(child => {
      ids = [...ids, ...getSubfolderIds(child.id)];
    });
    return ids;
  };

  const currentCards = flashcards.filter(f => f.folderId === currentFolderId);

  const handleOpenKeySelector = async () => {
    try {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setErrorMessage(null);
        alert("Chave API atualizada. Tente gerar os cartões novamente.");
      } else {
        window.open('https://aistudio.google.com/app/apikey', '_blank');
      }
    } catch (err) {
      console.error("Erro ao abrir seletor de chaves:", err);
    }
  };

  const handleGenerate = async () => {
    if (!aiInput.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      const cards = await generateFlashcards(aiInput, subject?.name || 'Geral', {
        count: genCount,
        frontLength: frontLen,
        backLength: backLen
      });
      
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
      // Tenta extrair a mensagem de erro se for um objeto JSON vindo da API
      let displayMsg = err.message;
      try {
        if (displayMsg.includes('Resource has been exhausted') || displayMsg.includes('429')) {
          displayMsg = "COTA EXCEDIDA: O limite de requisições gratuitas foi atingido. Aguarde alguns instantes ou vincule sua própria Chave API.";
        }
      } catch(e) {}
      setErrorMessage(displayMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteFlashcard = async (id: string) => {
    if (!confirm("Deseja realmente eliminar este card do processo de estudos?")) return;
    try {
      const { error } = await supabase.from('flashcards').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      setFlashcards(prev => prev.filter(card => card.id !== id));
    } catch (err) {
      alert("Falha ao remover o card do sistema.");
    }
  };

  const deleteFolder = async (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    if (!confirm("Deseja realmente excluir este pack e todos os sub-diretórios?")) return;
    try {
      const idsToDelete = getSubfolderIds(folderId);
      const { error } = await supabase.from('folders').delete().in('id', idsToDelete).eq('user_id', userId);
      if (error) throw error;
      setFolders(prev => prev.filter(f => !idsToDelete.includes(f.id)));
      setFlashcards(prev => prev.filter(fc => !idsToDelete.includes(fc.folderId as string)));
      if (currentFolderId === folderId) setCurrentFolderId(null);
    } catch (err) {
      console.error("Erro ao deletar pasta:", err);
    }
  };

  const handleManualCreate = async () => {
    if (!manualFront.trim() || !manualBack.trim()) return;
    const newId = Math.random().toString(36).substr(2, 9);
    try {
      const { error } = await supabase.from('flashcards').insert({
        id: newId, user_id: userId, front: manualFront, back: manualBack, subject_id: selectedSubjectId, folder_id: currentFolderId, next_review: Date.now(), interval: 0
      });
      if (error) throw error;
      setFlashcards(prev => [...prev, { id: newId, front: manualFront, back: manualBack, subjectId: selectedSubjectId, folderId: currentFolderId, nextReview: Date.now(), interval: 0 }]);
      setManualFront(''); setManualBack(''); setMode('browse');
    } catch (err) { alert("Erro ao protocolar card."); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const newId = Math.random().toString(36).substr(2, 9);
    try {
      const { error } = await supabase.from('folders').insert({ id: newId, user_id: userId, name: newFolderName, parent_id: currentFolderId });
      if (error) throw error;
      setFolders(prev => [...prev, { id: newId, name: newFolderName, parentId: currentFolderId }]);
      setNewFolderName(''); setShowFolderInput(false);
    } catch (err) { alert("Erro ao criar pasta."); }
  };

  const currentFolders = folders.filter(f => f.parentId === currentFolderId);
  const currentContextIds = getSubfolderIds(currentFolderId);
  const reviewQueue = flashcards.filter(f => f.nextReview <= Date.now() && (currentFolderId === null ? true : currentContextIds.includes(f.folderId as string)));

  const handleReview = async (quality: number) => {
    const card = reviewQueue[currentIndex];
    const newInterval = quality === 0 ? 0 : (card.interval === 0 ? 1 : card.interval * 2);
    const nextReview = Date.now() + newInterval * 24 * 60 * 60 * 1000;
    try {
      await supabase.from('flashcards').update({ interval: newInterval, next_review: nextReview }).eq('id', card.id).eq('user_id', userId);
      setFlashcards(prev => prev.map(f => f.id === card.id ? { ...f, interval: newInterval, nextReview } : f));
      if (currentIndex < reviewQueue.length - 1) { 
        setCurrentIndex(prev => prev + 1); setIsFlipped(false); 
      } else { 
        setMode('browse'); setCurrentIndex(0); setIsFlipped(false); 
      }
    } catch (err) { alert("Erro ao atualizar revisão."); }
  };

  const isQuotaError = errorMessage?.includes("429") || errorMessage?.includes("COTA EXCEDIDA") || errorMessage?.includes("exhausted");

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Flashcards</h2>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mt-1">Mantenha a jurisprudência em dia.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {mode === 'browse' && (
            <>
              {isSelectionMode ? (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl animate-in slide-in-from-right-4">
                  <button onClick={() => { if(selectedCardIds.size === currentCards.length) setSelectedCardIds(new Set()); else setSelectedCardIds(new Set(currentCards.map(c => c.id))); }} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all">
                    {selectedCardIds.size === currentCards.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />} Todos
                  </button>
                  <button onClick={async () => { if(selectedCardIds.size === 0) return; if(!confirm(`Deletar ${selectedCardIds.size} cards?`)) return; try { await supabase.from('flashcards').delete().in('id', Array.from(selectedCardIds)).eq('user_id', userId); setFlashcards(prev => prev.filter(card => !selectedCardIds.has(card.id))); setSelectedCardIds(new Set()); setIsSelectionMode(false); } catch(err) { alert("Erro ao deletar."); } }} disabled={selectedCardIds.size === 0} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-red-700 disabled:opacity-30 transition-all">
                    <Trash2 className="w-4 h-4" /> Deletar ({selectedCardIds.size})
                  </button>
                  <button onClick={() => { setIsSelectionMode(false); setSelectedCardIds(new Set()); }} className="p-3 text-slate-500 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <>
                  <button onClick={() => { setMode('study'); setCurrentIndex(0); setIsFlipped(false); }} disabled={reviewQueue.length === 0} className="flex items-center gap-2 px-8 py-3.5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50 hover:bg-sanfran-rubiDark shadow-xl transition-all">
                    <RotateCcw className="w-5 h-5" /> Estudar ({reviewQueue.length})
                  </button>
                  <button onClick={() => setIsSelectionMode(true)} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-sanfran-rubiDark text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-sanfran-rubi/20 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Selecionar</button>
                  <button onClick={() => {setMode('create'); setErrorMessage(null);}} className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi dark:text-white border-2 border-sanfran-rubi rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 shadow-xl transition-all"><Plus className="w-5 h-5" /> Novo</button>
                  <button onClick={() => {setMode('generate'); setErrorMessage(null);}} className="flex items-center gap-2 px-6 py-3.5 bg-usp-blue text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#0d7c8f] shadow-xl transition-all"><Sparkles className="w-5 h-5" /> IA</button>
                  <button onClick={() => setShowFolderInput(true)} className="p-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi dark:text-usp-gold border-2 border-slate-200 dark:border-sanfran-rubi/40 rounded-2xl hover:bg-slate-50 shadow-sm transition-all"><FolderPlus className="w-6 h-6" /></button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {mode === 'browse' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {currentFolders.map(folder => (
            <div key={folder.id} onClick={() => !isSelectionMode && setCurrentFolderId(folder.id)} className={`bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2rem] border-2 shadow-xl transition-all group relative border-l-[10px] border-l-usp-gold ${isSelectionMode ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-2xl hover:border-usp-gold cursor-pointer border-slate-200 dark:border-sanfran-rubi/40'}`}>
              <FolderIcon className="text-usp-gold w-8 h-8 mb-4" />
              <h4 className="font-black text-slate-950 dark:text-white truncate uppercase tracking-tight">{folder.name}</h4>
              {!isSelectionMode && <button onClick={(e) => deleteFolder(e, folder.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-sanfran-rubi transition-opacity"><Trash2 className="w-5 h-5" /></button>}
            </div>
          ))}
          {currentCards.map(card => {
            const subject = subjects.find(s => s.id === card.subjectId);
            const isSelected = selectedCardIds.has(card.id);
            return (
              <div key={card.id} onClick={() => isSelectionMode && (isSelected ? setSelectedCardIds(prev => {const n = new Set(prev); n.delete(card.id); return n;}) : setSelectedCardIds(prev => new Set(prev).add(card.id)))} className={`bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2rem] border-2 shadow-xl group flex flex-col justify-between h-[240px] border-l-[10px] relative transition-all ${isSelectionMode ? 'cursor-pointer hover:scale-[1.03]' : 'hover:scale-[1.02] border-slate-200 dark:border-sanfran-rubi/40'} ${isSelected ? 'border-usp-gold ring-4 ring-usp-gold/20' : 'border-slate-200 dark:border-sanfran-rubi/40'}`} style={{ borderLeftColor: isSelected ? '#fcb421' : (subject?.color || '#9B111E') }}>
                {isSelectionMode && <div className={`absolute top-4 right-4 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-usp-gold border-usp-gold text-slate-900' : 'bg-white/10 border-slate-300 dark:border-white/20'}`}>{isSelected && <ShieldCheck className="w-4 h-4" />}</div>}
                <p className={`font-black text-slate-950 dark:text-white line-clamp-4 leading-tight ${isSelected ? 'text-usp-gold dark:text-usp-gold' : ''}`}>{card.front}</p>
                <div className="flex justify-between items-center mt-4">
                  <div><span className="text-[9px] font-black uppercase text-slate-400 block">PRAZO: {new Date(card.nextReview).toLocaleDateString()}</span><span className="text-[8px] font-bold text-slate-300 uppercase truncate max-w-[100px] block">{subject?.name}</span></div>
                  <BrainCircuit className={`w-5 h-5 transition-colors ${isSelected ? 'text-usp-gold opacity-100' : 'text-sanfran-rubi opacity-40'}`} />
                </div>
                {!isSelectionMode && <button onClick={() => deleteFlashcard(card.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all transform hover:scale-110"><Trash2 className="w-4 h-4" /></button>}
              </div>
            );
          })}
        </div>
      )}

      {mode === 'study' && reviewQueue.length > 0 && (
        <div className="flex flex-col items-center py-10 animate-in fade-in zoom-in duration-500">
          <div className="mb-6 flex items-center gap-4 text-slate-400 font-black text-xs uppercase tracking-widest">
            <span>Card {currentIndex + 1} de {reviewQueue.length}</span>
            <div className="w-32 h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-sanfran-rubi transition-all" style={{ width: `${((currentIndex + 1) / reviewQueue.length) * 100}%` }}></div></div>
          </div>
          <div className="relative w-full max-w-2xl h-[400px] preserve-3d">
            <div onClick={() => setIsFlipped(!isFlipped)} className={`absolute inset-0 w-full h-full cursor-pointer transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
              <div className="absolute inset-0 w-full h-full bg-white dark:bg-sanfran-rubiDark border-[6px] border-slate-200 dark:border-sanfran-rubi/40 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-center text-center backface-hidden">
                <span className="text-xs font-black text-sanfran-rubi uppercase tracking-[0.3em] mb-8">Questão Jurídica</span>
                <p className="text-2xl font-black text-slate-950 dark:text-white leading-tight">{reviewQueue[currentIndex].front}</p>
                <p className="absolute bottom-12 text-slate-500 text-xs font-black uppercase animate-pulse">Toque para desvelar</p>
              </div>
              <div className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-black/80 border-[6px] border-usp-blue/40 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180">
                <span className="text-xs font-black text-usp-blue uppercase tracking-[0.3em] mb-8">Doutrina / Resposta</span>
                <p className="text-2xl font-black text-slate-950 dark:text-white leading-tight">{reviewQueue[currentIndex].back}</p>
              </div>
            </div>
          </div>
          {isFlipped && (
            <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-6">
              <button onClick={() => handleReview(0)} className="p-6 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-transform">Difícil</button>
              <button onClick={() => handleReview(3)} className="p-6 bg-usp-gold text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-transform">Médio</button>
              <button onClick={() => handleReview(5)} className="p-6 bg-usp-blue text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-transform">Fácil</button>
            </div>
          )}
          <button onClick={() => setMode('browse')} className="mt-12 text-slate-600 dark:text-slate-300 font-black text-xs uppercase underline underline-offset-8">Encerrar Audiência</button>
        </div>
      )}

      {(mode === 'create' || mode === 'generate') && (
        <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-slate-300 dark:border-sanfran-rubi/50 shadow-2xl animate-in slide-in-from-bottom-8 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setMode('browse')} className="p-3 hover:bg-slate-100 dark:hover:bg-white/10 rounded-2xl text-slate-500 dark:text-white transition-all"><ArrowLeft className="w-8 h-8" /></button>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">{mode === 'create' ? 'Protocolo Manual' : 'Processamento IA'}</h3>
          </div>

          {errorMessage && (
            <div className={`mb-8 p-6 rounded-3xl border-2 flex flex-col md:flex-row gap-6 animate-in shake duration-300 ${isQuotaError ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/10 dark:border-amber-500/30' : 'bg-red-50 border-red-300 dark:bg-red-900/10 dark:border-red-500/30'}`}>
              <div className={`p-4 rounded-2xl shrink-0 flex items-center justify-center h-fit ${isQuotaError ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                {isQuotaError ? <Key className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className={`text-sm font-black uppercase tracking-tight mb-1 ${isQuotaError ? 'text-amber-800 dark:text-amber-400' : 'text-red-800 dark:text-red-400'}`}>
                    {isQuotaError ? 'Protocolo de Cota Excedida' : 'Falha Técnica no Processamento'}
                  </p>
                  <p className={`text-xs font-bold leading-relaxed ${isQuotaError ? 'text-amber-700/80 dark:text-amber-400/80' : 'text-red-700/80 dark:text-red-400/80'}`}>
                    {errorMessage}
                  </p>
                </div>
                {isQuotaError && (
                  <div className="flex flex-wrap gap-4 pt-2">
                    <button 
                      onClick={handleOpenKeySelector}
                      className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-700 transition-all shadow-md"
                    >
                      <Key className="w-4 h-4" /> Selecionar Chave Própria
                    </button>
                    <a 
                      href="https://ai.google.dev/gemini-api/docs/billing" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-2 border-amber-200 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-50 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" /> Doutrina sobre Faturamento
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Disciplina Vinculada</label>
                <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-300 dark:border-sanfran-rubi/30 rounded-2xl font-black text-slate-950 dark:text-white outline-none">
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {mode === 'generate' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Volume de Cards</label>
                  <div className="flex gap-2">
                    {['auto', '5', '10', '15'].map(num => (
                      <button key={num} onClick={() => setGenCount(num)} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all ${genCount === num ? 'bg-usp-gold border-usp-gold text-white' : 'bg-white dark:bg-black/40 border-slate-200 text-slate-400'}`}>
                        {num === 'auto' ? 'Auto' : num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {mode === 'generate' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Extensão da Frente</label>
                  <div className="flex gap-2 bg-slate-50 dark:bg-black/40 p-1.5 rounded-2xl border-2 border-slate-200">
                    {[{id:'curto', icon:AlignLeft, label:'Curta'}, {id:'medio', icon:AlignCenter, label:'Média'}, {id:'longo', icon:AlignJustify, label:'Longa'}].map(opt => (
                      <button key={opt.id} onClick={() => setFrontLen(opt.id)} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${frontLen === opt.id ? 'bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi shadow-sm' : 'text-slate-400'}`}>
                        <opt.icon className="w-4 h-4" /><span className="text-[8px] font-black uppercase">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Extensão do Verso</label>
                  <div className="flex gap-2 bg-slate-50 dark:bg-black/40 p-1.5 rounded-2xl border-2 border-slate-200">
                    {[{id:'curto', icon:AlignLeft, label:'Direta'}, {id:'medio', icon:AlignCenter, label:'Médio'}, {id:'longo', icon:AlignJustify, label:'Doutrinária'}].map(opt => (
                      <button key={opt.id} onClick={() => setBackLen(opt.id)} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${backLen === opt.id ? 'bg-white dark:bg-sanfran-rubiDark text-usp-blue shadow-sm' : 'text-slate-400'}`}>
                        <opt.icon className="w-4 h-4" /><span className="text-[8px] font-black uppercase">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <textarea value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Cole o texto aqui..." className="w-full h-60 p-8 bg-slate-50 dark:bg-black/50 border-2 border-slate-300 rounded-[2.5rem] font-bold outline-none focus:border-usp-blue shadow-inner" />
            <button onClick={mode === 'create' ? handleManualCreate : handleGenerate} disabled={isGenerating || (mode === 'generate' && !aiInput.trim())} className="w-full py-6 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-lg tracking-widest shadow-2xl hover:bg-sanfran-rubiDark disabled:opacity-30 flex items-center justify-center gap-4 transition-all">
              {isGenerating ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><ShieldCheck className="w-6 h-6" /><span>Gerar Cartões via IA</span></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Anki;
