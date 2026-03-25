import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  Check, 
  Sparkles, 
  Upload, 
  FileText, 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Trash2, 
  Edit2, 
  Brain, 
  Search, 
  Paperclip, 
  Link as LinkIcon, 
  History, 
  RotateCcw, 
  Loader2, 
  Zap, 
  Copy, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Flashcard, Folder, Subject } from '../Anki';
import Markdown from 'react-markdown';

interface AnkiCreateProps {
  mode: string;
  setMode: (mode: string) => void;
  folders: Folder[];
  subjects: Subject[];
  currentFolderId: string | null;
  handleCreateCard: (card: Partial<Flashcard>) => Promise<void>;
  handleAIGenerate: (text: string, subjectId: string, folderId: string, files: File[], urls: string) => Promise<void>;
  handleSaveAIGeneratedCards: (cards: Partial<Flashcard>[], subjectId: string, folderId: string) => Promise<void>;
  handleBulkImport: (text: string, subjectId: string, folderId: string) => Promise<void>;
  handleGenerateCloze: (text: string) => string;
  isGenerating: boolean;
  aiGeneratedPreviews: Partial<Flashcard>[];
  setAiGeneratedPreviews: React.Dispatch<React.SetStateAction<Partial<Flashcard>[]>>;
  aiGenerationHistory: any[];
  restoreFromHistory: (item: any) => void;
  isPreviewMode: boolean;
  setIsPreviewMode: (val: boolean) => void;
  SmartText: React.FC<{ text: string }>;
}

export const AnkiCreate: React.FC<AnkiCreateProps> = ({
  mode,
  setMode,
  folders,
  subjects,
  currentFolderId,
  handleCreateCard,
  handleAIGenerate,
  handleSaveAIGeneratedCards,
  handleBulkImport,
  handleGenerateCloze,
  isGenerating,
  aiGeneratedPreviews,
  setAiGeneratedPreviews,
  aiGenerationHistory,
  restoreFromHistory,
  isPreviewMode,
  setIsPreviewMode,
  SmartText
}) => {
  // Manual Create State
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [newCardNotes, setNewCardNotes] = useState('');
  const [newCardTags, setNewCardTags] = useState<string[]>([]);
  const [newCardSource, setNewCardSource] = useState('');
  const [newCardSubjectId, setNewCardSubjectId] = useState(subjects[0]?.id || '');
  const [newCardFolderId, setNewCardFolderId] = useState(currentFolderId || '');
  const [newCardImageUrl, setNewCardImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // AI Create State
  const [aiInputText, setAiInputText] = useState('');
  const [aiSelectedSubjectId, setAiSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [aiSelectedFolderId, setAiSelectedFolderId] = useState(currentFolderId || '');
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [aiUrls, setAiUrls] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Bulk Import State
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkSubjectId, setBulkSubjectId] = useState(subjects[0]?.id || '');
  const [bulkFolderId, setBulkFolderId] = useState(currentFolderId || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onManualCreate = async () => {
    if (!newCardFront.trim() || !newCardBack.trim()) return;
    setIsSaving(true);
    try {
      await handleCreateCard({
        front: newCardFront,
        back: newCardBack,
        notes: newCardNotes,
        tags: newCardTags,
        source: newCardSource,
        subject_id: newCardSubjectId,
        folder_id: newCardFolderId,
        image_url: newCardImageUrl
      });
      setNewCardFront('');
      setNewCardBack('');
      setNewCardNotes('');
      setNewCardTags([]);
      setNewCardSource('');
      setNewCardImageUrl('');
    } finally {
      setIsSaving(false);
    }
  };

  const onAIGenerate = async () => {
    await handleAIGenerate(aiInputText, aiSelectedSubjectId, aiSelectedFolderId, aiFiles, aiUrls);
  };

  const onBulkImport = async () => {
    await handleBulkImport(bulkImportText, bulkSubjectId, bulkFolderId);
    setBulkImportText('');
    setMode('browse');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAiFiles(Array.from(e.target.files));
    }
  };

  if (mode === 'create') {
    return (
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border-2 border-slate-100 dark:border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => setMode('browse')} className="p-3 bg-slate-100 dark:bg-white/5 rounded-full hover:text-sanfran-rubi transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Novo Card Manual</h3>
            <p className="text-sm font-bold text-slate-500">Adicione conhecimento ao seu acervo pessoal.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Frente (Pergunta/Conceito)</label>
              <textarea 
                value={newCardFront}
                onChange={(e) => setNewCardFront(e.target.value)}
                placeholder="Ex: O que é o Princípio da Dignidade da Pessoa Humana?"
                className="w-full h-40 p-6 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-[2rem] font-bold outline-none focus:border-sanfran-rubi transition-colors resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Verso (Resposta/Definição)</label>
              <textarea 
                value={newCardBack}
                onChange={(e) => setNewCardBack(e.target.value)}
                placeholder="Ex: É o valor supremo que atrai o conteúdo de todos os direitos fundamentais..."
                className="w-full h-40 p-6 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-[2rem] font-bold outline-none focus:border-sanfran-rubi transition-colors resize-none"
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Disciplina</label>
                <select 
                  value={newCardSubjectId}
                  onChange={(e) => setNewCardSubjectId(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi"
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pasta/Deck</label>
                <select 
                  value={newCardFolderId}
                  onChange={(e) => setNewCardFolderId(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi"
                >
                  <option value="">Raiz</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Notas Pessoais (Opcional)</label>
              <textarea 
                value={newCardNotes}
                onChange={(e) => setNewCardNotes(e.target.value)}
                placeholder="Dicas, mnemônicos ou observações extras..."
                className="w-full h-24 p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-medium outline-none focus:border-sanfran-rubi transition-colors resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Fonte/Referência</label>
              <div className="relative">
                <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  value={newCardSource}
                  onChange={(e) => setNewCardSource(e.target.value)}
                  placeholder="Ex: Art. 5º, CF/88 ou Doutrina X"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-sanfran-rubi"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setMode('browse')}
                className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={onManualCreate}
                disabled={isSaving || !newCardFront.trim() || !newCardBack.trim()}
                className="flex-[2] py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sanfran-rubi/20 hover:bg-sanfran-rubiDark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Card
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'ai_create') {
    if (isPreviewMode) {
      return (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border-4 border-purple-500 animate-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                <Sparkles className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Preview da IA</h3>
                <p className="text-sm font-bold text-slate-500">Revise os {aiGeneratedPreviews.length} cards gerados antes de salvar.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsPreviewMode(false)}
                className="px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase text-[10px] tracking-widest"
              >
                Voltar
              </button>
              <button 
                onClick={() => handleSaveAIGeneratedCards(aiGeneratedPreviews, aiSelectedSubjectId, aiSelectedFolderId)}
                className="px-8 py-3 bg-purple-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-purple-500/20"
              >
                Salvar Todos ({aiGeneratedPreviews.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
            {aiGeneratedPreviews.map((card, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-black/40 p-6 rounded-3xl border-2 border-slate-100 dark:border-white/5 group relative">
                <button 
                  onClick={() => setAiGeneratedPreviews(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-800 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <Trash2 size={14} />
                </button>
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block mb-1">Frente</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{card.front}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Verso</span>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">{card.back}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-4 border-purple-500 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-10 relative z-10">
          <button onClick={() => setMode('browse')} className="p-3 bg-slate-100 dark:bg-white/5 rounded-full hover:text-purple-600 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-500 w-6 h-6 animate-pulse" />
              <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">IA Generator Jurídico</h3>
            </div>
            <p className="text-sm font-bold text-slate-500">Criação automática baseada em doutrina, lei ou anotações.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
          <div className="md:col-span-2 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Conteúdo Base</label>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-600 hover:text-purple-700"
                >
                  <History size={12} /> Histórico
                </button>
              </div>
              <textarea 
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                placeholder="Cole aqui o texto da lei, doutrina ou suas anotações de aula. A IA transformará tudo em flashcards otimizados..."
                className="w-full h-64 p-8 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-[2.5rem] font-bold outline-none focus:border-purple-500 transition-colors resize-none shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Anexar Documentos (PDF/DOCX)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 bg-slate-50 dark:bg-black/20 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-500 transition-all group"
                >
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-purple-500 transition-colors" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {aiFiles.length > 0 ? `${aiFiles.length} arquivos selecionados` : 'Clique para enviar'}
                  </p>
                  <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Links da Web (Opcional)</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    value={aiUrls}
                    onChange={(e) => setAiUrls(e.target.value)}
                    placeholder="https://planalto.gov.br/..."
                    className="w-full pl-12 pr-4 py-6 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-3xl font-bold outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-slate-50 dark:bg-black/40 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Disciplina Alvo</label>
                <select 
                  value={aiSelectedSubjectId}
                  onChange={(e) => setAiSelectedSubjectId(e.target.value)}
                  className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-purple-500"
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pasta de Destino</label>
                <select 
                  value={aiSelectedFolderId}
                  onChange={(e) => setAiSelectedFolderId(e.target.value)}
                  className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-purple-500"
                >
                  <option value="">Raiz</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div className="pt-4">
                <button 
                  onClick={onAIGenerate}
                  disabled={isGenerating || (!aiInputText.trim() && aiFiles.length === 0 && !aiUrls.trim())}
                  className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-purple-500/30 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex flex-col items-center justify-center gap-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-[10px]">Processando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      Gerar Flashcards
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-3xl border border-purple-100 dark:border-purple-900/20">
              <div className="flex items-center gap-3 mb-3">
                <Brain className="text-purple-600 w-5 h-5" />
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Dica da IA</span>
              </div>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Para melhores resultados, cole textos de até 5.000 caracteres ou anexe PDFs focados em um único tema jurídico.
              </p>
            </div>
          </div>
        </div>

        {/* Histórico Overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 z-20 bg-white dark:bg-slate-900 p-10 overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                  <History className="text-purple-600" /> Histórico de Gerações
                </h3>
                <button onClick={() => setShowHistory(false)} className="p-3 bg-slate-100 dark:bg-white/5 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {aiGenerationHistory.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => {
                      restoreFromHistory(item);
                      setShowHistory(false);
                    }}
                    className="p-6 bg-slate-50 dark:bg-black/40 border-2 border-slate-100 dark:border-white/5 rounded-3xl cursor-pointer hover:border-purple-500 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(item.timestamp).toLocaleDateString()}</span>
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg text-[8px] font-black uppercase">
                        {(subjects.find(s => s.id === item.subjectId))?.name || 'Geral'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-3 mb-4 italic">
                      "{item.text || (item.files.length > 0 ? `${item.files.length} arquivos` : 'Link da Web')}"
                    </p>
                    <div className="flex items-center gap-2 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <RotateCcw size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Restaurar</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (mode === 'bulk') {
    return (
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border-2 border-slate-100 dark:border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => setMode('browse')} className="p-3 bg-slate-100 dark:bg-white/5 rounded-full hover:text-usp-blue transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Importação em Lote</h3>
            <p className="text-sm font-bold text-slate-500">Importe múltiplos cards usando um formato simples.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Dados para Importação</label>
              <textarea 
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                placeholder="Frente do Card;Verso do Card;Tag1,Tag2&#10;Segunda Pergunta;Segunda Resposta;Tag3"
                className="w-full h-80 p-8 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-[2.5rem] font-mono text-sm outline-none focus:border-usp-blue transition-colors resize-none shadow-inner"
              />
            </div>
            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Formato Esperado</h4>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Use o formato: <code className="bg-white dark:bg-slate-800 px-1 rounded">Frente;Verso;Tags</code> (separados por ponto e vírgula). Cada linha representa um novo card.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-slate-50 dark:bg-black/40 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Disciplina Alvo</label>
                <select 
                  value={bulkSubjectId}
                  onChange={(e) => setBulkSubjectId(e.target.value)}
                  className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-usp-blue"
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Pasta de Destino</label>
                <select 
                  value={bulkFolderId}
                  onChange={(e) => setBulkFolderId(e.target.value)}
                  className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 rounded-2xl font-bold outline-none focus:border-usp-blue"
                >
                  <option value="">Raiz</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div className="pt-4">
                <button 
                  onClick={onBulkImport}
                  disabled={!bulkImportText.trim()}
                  className="w-full py-6 bg-usp-blue text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-usp-blue/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                >
                  <Upload className="w-5 h-5" />
                  Importar Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
