
import React, { useState } from 'react';
// Fix: Corrigido o import de 'lucide-center' para 'lucide-react' e consolidado
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
  HelpCircle,
  ShieldCheck
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

  // Fix: Adicionado o retorno e completada a lógica da função getSubfolderIds
  const getSubfolderIds = (folderId: string | null): string[] => {
    let ids: string[] = folderId ? [folderId] : [];
    const children = folders.filter(f => f.parentId === folderId);
    children.forEach(child => {
      ids = [...ids, ...getSubfolderIds(child.id)];
    });
    return ids;
  };

  const handleGenerate = async () => {
    if (!aiInput.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      const cards = await generateFlashcards(aiInput, subject?.name || 'Geral');
      
      const newCards = cards.map((c: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        front: c.front,
        back: c.back,
        subjectId: selectedSubjectId,
        folderId: currentFolderId,
        nextReview: Date.now(),
        interval: 0
      }));

      for (const card of newCards) {
        await supabase.from('flashcards').insert({
          id: card.id,
          user_id: userId,
          front: card.front,
          back: card.back,
          subject_id: card.subjectId,
          folder_id: card.folderId,
          next_review: card.nextReview,
          interval: card.interval
        });
      }

      setFlashcards(prev => [...prev, ...newCards]);
      setMode('browse');
      setAiInput('');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentFolders = folders.filter(f => f.parentId === currentFolderId);
  const currentCards = flashcards.filter(f => f.folderId === currentFolderId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Flashcards (Anki)</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase italic mt-1 tracking-widest">Memorização Jurídica</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode('generate')} className="bg-sanfran-rubi text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase shadow-lg shadow-red-900/10">
            <Sparkles className="w-4 h-4" /> Gerar com IA
          </button>
          <button onClick={() => setMode('create')} className="bg-slate-950 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase">
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 bg-slate-100 dark:bg-white/5 p-2 rounded-lg inline-flex">
        <button onClick={() => setCurrentFolderId(null)} className="hover:text-sanfran-rubi">Início</button>
        {currentFolderId && (
          <>
            <ChevronRight className="w-3 h-3" />
            <span className="text-sanfran-rubi">Diretório Atual</span>
          </>
        )}
      </div>

      {mode === 'browse' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentFolders.length === 0 && currentCards.length === 0 && (
            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-20">
              <BrainCircuit className="w-16 h-16" />
              <p className="font-black uppercase text-xs tracking-[0.2em]">Biblioteca de Cards Vazia</p>
            </div>
          )}
          {currentFolders.map(folder => (
            <button key={folder.id} onClick={() => setCurrentFolderId(folder.id)} className="p-4 bg-white dark:bg-sanfran-rubiDark/20 rounded-2xl border border-slate-200 dark:border-sanfran-rubi/30 flex items-center gap-3 group hover:border-sanfran-rubi transition-all text-left">
              <FolderIcon className="text-sanfran-rubi group-hover:scale-110 transition-transform" />
              <span className="font-bold uppercase text-xs text-slate-900 dark:text-white">{folder.name}</span>
            </button>
          ))}
          {currentCards.map(card => (
            <div key={card.id} className="p-6 bg-white dark:bg-sanfran-rubiDark/10 rounded-2xl border border-slate-200 dark:border-sanfran-rubi/10 shadow-sm flex flex-col justify-between">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 h-12 overflow-hidden leading-relaxed">{card.front}</p>
              <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/5 pt-3">
                 <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Revisão: {new Date(card.nextReview).toLocaleDateString()}</span>
                 <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500 cursor-pointer transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'generate' && (
        <div className="bg-white dark:bg-sanfran-rubiDark/40 p-8 rounded-[2.5rem] border-t-[10px] border-t-sanfran-rubi border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-sanfran-rubi/10 p-2 rounded-lg"><Sparkles className="w-5 h-5 text-sanfran-rubi" /></div>
            <h3 className="text-xl font-black uppercase tracking-tight dark:text-white">Gerador Doutrinário AI</h3>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Cadeira Acadêmica</label>
            <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-sanfran-rubi/20 rounded-2xl font-bold outline-none focus:border-sanfran-rubi transition-all text-slate-900 dark:text-white">
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Texto para Processamento</label>
            <textarea 
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Cole aqui a ementa, doutrina ou transcrição da aula para converter em flashcards memorizáveis..."
              className="w-full h-48 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-sanfran-rubi/20 rounded-2xl outline-none focus:border-sanfran-rubi focus:ring-4 focus:ring-sanfran-rubi/10 transition-all font-bold text-slate-950 dark:text-white"
            />
          </div>
          <div className="flex justify-end items-center gap-6 pt-4">
            <button onClick={() => setMode('browse')} className="text-slate-400 hover:text-slate-600 font-black uppercase text-xs transition-colors">Abortar Protocolo</button>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-sanfran-rubi text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-sanfran-rubiDark transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating ? <RotateCcw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {isGenerating ? 'Protocolando...' : 'Confirmar Geração AI'}
            </button>
          </div>
          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-tight border border-red-100 dark:border-red-900/30">
              <ShieldAlert className="w-4 h-4" /> {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Fix: Adicionado o export default para resolver erro no App.tsx
export default Anki;
