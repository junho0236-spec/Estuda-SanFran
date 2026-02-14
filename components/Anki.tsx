
import React, { useState } from 'react';
import { Plus, BrainCircuit, Sparkles, RotateCcw, Folder as FolderIcon, ChevronRight as BreadcrumbSeparator, ArrowLeft, Trash2, FolderPlus } from 'lucide-react';
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

  const currentFolders = folders.filter(f => f.parentId === currentFolderId);
  const currentCards = flashcards.filter(f => f.folderId === currentFolderId);
  
  const getSubfolderIds = (folderId: string | null): string[] => {
    let ids = folderId ? [folderId] : [];
    const children = folders.filter(f => f.parentId === folderId);
    children.forEach(child => {
      ids = [...ids, ...getSubfolderIds(child.id)];
    });
    return ids;
  };

  const currentContextIds = getSubfolderIds(currentFolderId);
  const reviewQueue = flashcards.filter(f => 
    f.nextReview <= Date.now() && 
    (currentFolderId === null ? true : currentContextIds.includes(f.folderId as string))
  );

  const handleGenerate = async () => {
    if (!aiInput.trim()) return;
    setIsGenerating(true);
    try {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      const newCardsFromAi = await generateFlashcards(aiInput, subject?.name || 'Geral');
      
      const cardsToInsert = newCardsFromAi.map((c: any) => ({
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
      setAiInput('');
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar via AI.");
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

      const newCard: Flashcard = {
        id: newId,
        front: manualFront,
        back: manualBack,
        subjectId: selectedSubjectId,
        folderId: currentFolderId,
        nextReview: Date.now(),
        interval: 0
      };

      setFlashcards(prev => [...prev, newCard]);
      setManualFront('');
      setManualBack('');
      setMode('browse');
    } catch (err) {
      console.error(err);
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

      const newFolder: Folder = {
        id: newId,
        name: newFolderName,
        parentId: currentFolderId
      };
      setFolders(prev => [...prev, newFolder]);
      setNewFolderName('');
      setShowFolderInput(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar pasta.");
    }
  };

  const handleReview = async (quality: number) => {
    const card = reviewQueue[currentIndex];
    const newInterval = quality === 0 ? 0 : (card.interval === 0 ? 1 : card.interval * 2);
    const nextReview = Date.now() + newInterval * 24 * 60 * 60 * 1000;

    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ interval: newInterval, next_review: nextReview })
        .eq('id', card.id);
      
      if (error) throw error;

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
      console.error(err);
      alert("Erro ao atualizar revisão.");
    }
  };

  const deleteFolder = async (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    if (confirm("Deseja realmente excluir este pack? Todos os cards internos serão perdidos.")) {
      try {
        const { error } = await supabase.from('folders').delete().eq('id', folderId);
        if (error) throw error;

        const idsToDelete = getSubfolderIds(folderId);
        setFolders(prev => prev.filter(f => !idsToDelete.includes(f.id)));
        setFlashcards(prev => prev.filter(fc => !idsToDelete.includes(fc.folderId as string)));
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir pasta.");
      }
    }
  };

  const getBreadcrumbs = () => {
    const crumbs: Folder[] = [];
    let current = folders.find(f => f.id === currentFolderId);
    while (current) {
      crumbs.unshift(current);
      current = folders.find(f => f.id === current.parentId);
    }
    return crumbs;
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Flashcards</h2>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mt-1">Mantenha a jurisprudência em dia.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {mode === 'browse' && (
            <>
              <button 
                onClick={() => { setMode('study'); setCurrentIndex(0); setIsFlipped(false); }}
                disabled={reviewQueue.length === 0}
                className="flex items-center gap-2 px-8 py-3.5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50 hover:bg-sanfran-rubiDark transition-all shadow-xl"
              >
                <RotateCcw className="w-5 h-5" /> Estudar ({reviewQueue.length})
              </button>
              <button 
                onClick={() => setMode('create')}
                className="flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi dark:text-white border-2 border-sanfran-rubi dark:border-sanfran-rubi/40 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-sanfran-rubi/20 transition-all shadow-xl"
              >
                <Plus className="w-5 h-5" /> Novo Card
              </button>
              <button 
                onClick={() => setMode('generate')}
                className="flex items-center gap-2 px-8 py-3.5 bg-usp-blue text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#0d7c8f] transition-all shadow-xl"
              >
                <Sparkles className="w-5 h-5" /> Gerar IA
              </button>
              <button 
                onClick={() => setShowFolderInput(true)}
                className="p-3.5 bg-white dark:bg-sanfran-rubiDark text-sanfran-rubi dark:text-usp-gold border-2 border-slate-200 dark:border-sanfran-rubi/40 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
              >
                <FolderPlus className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>

      {mode === 'browse' && (
        <div className="flex items-center gap-4 text-[12px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 bg-white dark:bg-sanfran-rubiDark/50 p-5 rounded-[1.5rem] border border-slate-300 dark:border-sanfran-rubi/40 shadow-xl">
          <button onClick={() => setCurrentFolderId(null)} className={`hover:text-sanfran-rubi transition-colors ${currentFolderId === null ? 'text-sanfran-rubi' : ''}`}>RAIZ</button>
          {getBreadcrumbs().map(crumb => (
            <React.Fragment key={crumb.id}>
              <BreadcrumbSeparator className="w-5 h-5 text-slate-400" />
              <button onClick={() => setCurrentFolderId(crumb.id)} className={`hover:text-sanfran-rubi transition-colors ${currentFolderId === crumb.id ? 'text-sanfran-rubi' : ''}`}>{crumb.name}</button>
            </React.Fragment>
          ))}
        </div>
      )}

      {mode === 'study' && reviewQueue.length > 0 && (
        <div className="flex flex-col items-center py-10 animate-in fade-in zoom-in duration-500">
          <div onClick={() => setIsFlipped(!isFlipped)} className="relative w-full max-w-2xl h-[400px] cursor-pointer transition-transform duration-700 transform-gpu preserve-3d" style={{ perspective: '1200px' }}>
            <div className={`absolute inset-0 w-full h-full duration-700 transition-all ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
              <div className={`absolute inset-0 w-full h-full bg-white dark:bg-sanfran-rubiDark border-[6px] border-slate-200 dark:border-sanfran-rubi/40 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-center text-center backface-hidden ${isFlipped ? 'hidden' : 'flex'}`}>
                <span className="text-xs font-black text-sanfran-rubi uppercase tracking-[0.3em] mb-8">Questão Jurídica</span>
                <p className="text-3xl font-black text-slate-950 dark:text-white leading-tight">{reviewQueue[currentIndex].front}</p>
                <p className="absolute bottom-12 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Toque para desvelar a resposta</p>
              </div>
              <div className={`absolute inset-0 w-full h-full bg-slate-50 dark:bg-black/60 border-[6px] border-usp-blue/40 rounded-[3rem] shadow-2xl p-12 flex flex-col items-center justify-center text-center ${!isFlipped ? 'hidden' : 'flex'}`}>
                <span className="text-xs font-black text-usp-blue uppercase tracking-[0.3em] mb-8">Doutrina / Resposta</span>
                <p className="text-3xl font-black text-slate-950 dark:text-white leading-tight">{reviewQueue[currentIndex].back}</p>
              </div>
            </div>
          </div>

          {isFlipped && (
            <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-6">
              <button onClick={() => handleReview(0)} className="p-6 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-red-700 transition-all">Difícil</button>
              <button onClick={() => handleReview(3)} className="p-6 bg-usp-gold text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-yellow-600 transition-all">Médio</button>
              <button onClick={() => handleReview(5)} className="p-6 bg-usp-blue text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-cyan-700 transition-all">Fácil</button>
            </div>
          )}
          <button onClick={() => setMode('browse')} className="mt-12 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-[0.2em] hover:text-sanfran-rubi dark:hover:text-white transition-all underline underline-offset-8">Encerrar Audiência</button>
        </div>
      )}

      {mode === 'browse' && (
        <div className="space-y-10">
          {showFolderInput && (
            <div className="bg-white dark:bg-sanfran-rubiDark border-[4px] border-slate-300 dark:border-sanfran-rubi/50 p-6 rounded-[2.5rem] flex items-center gap-6 animate-in slide-in-from-top-4 shadow-2xl border-t-[12px] border-t-usp-gold">
              <FolderIcon className="text-usp-gold w-10 h-10" />
              <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} placeholder="Nome da Pasta..." className="flex-1 bg-slate-50 dark:bg-black/50 border-2 border-slate-300 dark:border-sanfran-rubi/30 p-5 rounded-2xl outline-none font-black text-slate-950 dark:text-white text-lg" />
              <button onClick={handleCreateFolder} className="bg-usp-gold text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Protocolar</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {currentFolders.map(folder => (
              <div key={folder.id} onClick={() => setCurrentFolderId(folder.id)} className="bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2rem] border-2 border-slate-200 dark:border-sanfran-rubi/40 shadow-xl hover:shadow-2xl hover:border-usp-gold dark:hover:border-usp-gold cursor-pointer transition-all group relative border-l-[10px] border-l-usp-gold">
                <div className="p-4 bg-yellow-50 dark:bg-usp-gold/10 rounded-2xl text-usp-gold shadow-inner mb-4 w-fit"><FolderIcon className="w-8 h-8 fill-usp-gold/20" /></div>
                <h4 className="font-black text-slate-950 dark:text-white truncate text-lg uppercase tracking-tight">{folder.name}</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest mt-2">{flashcards.filter(f => f.folderId === folder.id).length} itens</p>
                <button onClick={(e) => deleteFolder(e, folder.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-sanfran-rubi transition-all"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}

            {currentCards.map(card => (
              <div key={card.id} className="bg-white dark:bg-sanfran-rubiDark/50 p-8 rounded-[2rem] border-2 border-slate-200 dark:border-sanfran-rubi/40 shadow-xl group hover:border-sanfran-rubi hover:shadow-2xl transition-all flex flex-col justify-between h-[220px] border-l-[10px]" style={{ borderLeftColor: subjects.find(s => s.id === card.subjectId)?.color || '#9B111E' }}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-950 dark:text-white bg-slate-100 dark:bg-white/10 px-3 py-1.5 rounded-full border border-slate-300 dark:border-white/10">{subjects.find(s => s.id === card.subjectId)?.name || 'Geral'}</span>
                    <button onClick={async (e) => {
                      e.stopPropagation(); 
                      if(confirm('Excluir card?')) {
                        try {
                          const { error } = await supabase.from('flashcards').delete().eq('id', card.id);
                          if (error) throw error;
                          setFlashcards(prev => prev.filter(f => f.id !== card.id));
                        } catch (err) { console.error(err); alert("Erro ao excluir."); }
                      }
                    }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sanfran-rubi transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <p className="font-black text-slate-950 dark:text-white line-clamp-3 text-base leading-relaxed">{card.front}</p>
                </div>
                <div className="mt-auto pt-4 flex justify-between items-center border-t border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">PRAZO: {new Date(card.nextReview).toLocaleDateString()}</span>
                  <BrainCircuit className="w-5 h-5 text-sanfran-rubi opacity-40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {(mode === 'create' || mode === 'generate') && (
        <div className="bg-white dark:bg-sanfran-rubiDark p-10 rounded-[3rem] border-4 border-slate-300 dark:border-sanfran-rubi/50 shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setMode('browse')} className="p-3 hover:bg-slate-100 dark:hover:bg-white/10 rounded-2xl text-slate-500 dark:text-white transition-all"><ArrowLeft className="w-8 h-8" /></button>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
              {mode === 'create' ? 'Protocolo Manual' : 'Processamento IA'}
            </h3>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2">Disciplina do Caso</label>
              <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-black/50 border-2 border-slate-300 dark:border-sanfran-rubi/30 rounded-2xl font-black text-slate-950 dark:text-white text-lg focus:border-sanfran-rubi outline-none transition-all">
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {mode === 'create' ? (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2">Enunciado / Pergunta</label>
                  <input 
                    type="text" 
                    value={manualFront} 
                    onChange={(e) => setManualFront(e.target.value)} 
                    placeholder="Ex: Qual o prazo prescricional da ação de cobrança?" 
                    className="w-full p-5 bg-slate-50 dark:bg-black/50 border-2 border-slate-300 dark:border-sanfran-rubi/30 rounded-2xl font-bold text-slate-950 dark:text-white text-xl focus:border-sanfran-rubi outline-none transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2">Fundamentação / Resposta</label>
                  <textarea 
                    value={manualBack} 
                    onChange={(e) => setManualBack(e.target.value)} 
                    placeholder="Ex: Art. 206, § 5º, I do Código Civil: 5 anos." 
                    className="w-full h-40 p-6 bg-slate-50 dark:bg-black/50 border-2 border-slate-300 dark:border-sanfran-rubi/30 rounded-3xl font-bold text-slate-950 dark:text-white text-xl resize-none focus:border-sanfran-rubi outline-none transition-all" 
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2">Corpo da Doutrina para Processamento</label>
                <textarea 
                  value={aiInput} 
                  onChange={(e) => setAiInput(e.target.value)} 
                  placeholder="Cole aqui o texto jurídico para gerar os cards automaticamente..." 
                  className="w-full h-60 p-8 bg-slate-50 dark:bg-black/50 border-2 border-slate-300 dark:border-sanfran-rubi/30 rounded-[2.5rem] font-bold text-slate-950 dark:text-white text-xl resize-none focus:border-sanfran-rubi outline-none transition-all" 
                />
              </div>
            )}
            
            <button 
              onClick={mode === 'create' ? handleManualCreate : handleGenerate} 
              disabled={isGenerating}
              className="w-full py-6 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-lg tracking-widest shadow-2xl hover:scale-[1.01] hover:bg-sanfran-rubiDark transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>Processando Doutrina...</>
              ) : mode === 'create' ? (
                <><Plus className="w-6 h-6" /> Protocolar Card</>
              ) : (
                <><Sparkles className="w-6 h-6" /> Gerar Cartões via IA</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Anki;
