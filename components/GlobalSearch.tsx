
import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, BookOpen, CheckSquare, Brain, ArrowRight, Command } from 'lucide-react';
import { View, Flashcard, Task, Reading, Subject } from '../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
  tasks: Task[];
  readings: Reading[];
  subjects: Subject[];
  onNavigate: (view: View) => void;
}

interface SearchResult {
  id: string;
  type: 'flashcard' | 'task' | 'reading';
  title: string;
  subtitle: string;
  content?: string;
  view: View;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ 
  isOpen, 
  onClose, 
  flashcards, 
  tasks, 
  readings, 
  subjects,
  onNavigate 
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (query.length < 2) return [];

    const searchStr = query.toLowerCase();
    const matches: SearchResult[] = [];

    // Search Flashcards
    flashcards.forEach(f => {
      const subject = subjects.find(s => s.id === f.subjectId)?.name || 'Geral';
      if (f.front.toLowerCase().includes(searchStr) || f.back.toLowerCase().includes(searchStr)) {
        matches.push({
          id: f.id,
          type: 'flashcard',
          title: f.front,
          subtitle: `Flashcard • ${subject}`,
          content: f.back,
          view: View.Anki
        });
      }
    });

    // Search Tasks
    tasks.forEach(t => {
      const subject = subjects.find(s => s.id === t.subjectId)?.name || 'Geral';
      if (t.title.toLowerCase().includes(searchStr)) {
        matches.push({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: `Tarefa • ${subject}`,
          view: View.Tasks
        });
      }
    });

    // Search Readings (Library)
    readings.forEach(r => {
      const subject = subjects.find(s => s.id === r.subject_id)?.name || 'Geral';
      if (r.title.toLowerCase().includes(searchStr) || r.author.toLowerCase().includes(searchStr)) {
        matches.push({
          id: r.id,
          type: 'reading',
          title: r.title,
          subtitle: `Biblioteca • ${r.author} • ${subject}`,
          view: View.Library
        });
      }
    });

    return matches.slice(0, 10); // Limit to 10 results for performance
  }, [query, flashcards, tasks, readings, subjects]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0d0303] w-full max-w-2xl rounded-[2.5rem] border-4 border-sanfran-rubi shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Search Input */}
        <div className="p-6 border-b border-slate-100 dark:border-sanfran-rubi/20 flex items-center gap-4 bg-slate-50/50 dark:bg-white/5">
          <Search className="text-sanfran-rubi w-6 h-6" />
          <input 
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar em flashcards, tarefas, biblioteca..."
            className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-lg border border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-400 uppercase">
              <Command size={10} /> K
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-sanfran-rubi transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] p-4 custom-scrollbar">
          {query.length < 2 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-black uppercase tracking-widest">O que você procura, Doutor(a)?</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Digite pelo menos 2 caracteres para iniciar a busca.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
              <X size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-black uppercase tracking-widest">Nenhum resultado encontrado</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Tente outros termos ou verifique a ortografia.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    onNavigate(result.view);
                    onClose();
                  }}
                  className="w-full group flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all text-left"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    result.type === 'flashcard' ? 'bg-red-50 dark:bg-red-900/20 text-sanfran-rubi' :
                    result.type === 'task' ? 'bg-cyan-50 dark:bg-cyan-900/20 text-usp-blue' :
                    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                  }`}>
                    {result.type === 'flashcard' && <Brain size={20} />}
                    {result.type === 'task' && <CheckSquare size={20} />}
                    {result.type === 'reading' && <BookOpen size={20} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {result.subtitle}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                      {result.title}
                    </h4>
                    {result.content && (
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {result.content}
                      </p>
                    )}
                  </div>

                  <ArrowRight size={16} className="text-slate-300 group-hover:text-sanfran-rubi transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-sanfran-rubi/10 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span className="px-1.5 py-0.5 bg-white dark:bg-white/10 rounded border border-slate-200 dark:border-white/10">ESC</span> Fechar
            </div>
            <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span className="px-1.5 py-0.5 bg-white dark:bg-white/10 rounded border border-slate-200 dark:border-white/10">ENTER</span> Abrir
            </div>
          </div>
          <div className="text-[9px] font-black text-sanfran-rubi uppercase tracking-[0.2em] opacity-50">
            SanFran Search Engine
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
