import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; // Import Quill styles
import { ArrowLeft, Save, Loader2, FileText, BrainCircuit, Sparkles, Tag, Split, Download, Gavel, Plus, Trash2, Edit3 } from 'lucide-react';
import { Note, Subject, SubjectFile } from '../types';
import { dataService } from '../services/dataService';
import { summarizeText } from '../services/geminiService';
import html2pdf from 'html2pdf.js';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { SmartText } from './SmartVadeMecum';
import * as pdfjsLib from 'pdfjs-dist';
import { Folder, Upload, File, CheckCircle2, AlertCircle } from 'lucide-react';

// Set up pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface NoteViewProps {
  subjectId: string; // Initial subject ID, can be changed
  userId: string;
  isOnline: boolean;
  initialTab?: 'notes' | 'repository' | 'assignments';
  onBack: () => void;
  onNavigateToAnki: (text: string) => void; // For generating flashcards
  subjects: Subject[]; // List of all subjects
  onToggleSidebar: (isOpen: boolean) => void; // Function to toggle sidebar visibility
}

const NoteView: React.FC<NoteViewProps> = ({ subjectId: initialSubjectId, userId, isOnline, initialTab = 'notes', onBack, onNavigateToAnki, subjects, onToggleSidebar }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<SubjectFile[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'repository' | 'assignments'>(initialTab);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFile, setSelectedFile] = useState<SubjectFile | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isVadeMecumMode, setIsVadeMecumMode] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  // Sync selectedSubjectId when initialSubjectId changes from props
  useEffect(() => {
    if (initialSubjectId && initialSubjectId !== selectedSubjectId) {
      setSelectedSubjectId(initialSubjectId);
    }
  }, [initialSubjectId]);

  const quillRef = useRef<Quill | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        setIsUploading(true);
        try {
          const path = `${userId}/notes/images/${Date.now()}_${file.name}`;
          const url = await dataService.uploadFile(file, path);
          const quill = quillRef.current;
          if (quill) {
            const range = quill.getSelection() || { index: quill.getLength(), length: 0 };
            quill.insertEmbed(range.index, 'image', url);
            quill.setSelection((range.index + 1) as any);
          }
        } catch (error) {
          console.error("Error uploading image to Quill:", error);
          alert("Erro ao carregar imagem.");
        } finally {
          setIsUploading(false);
        }
      }
    };
  }, [userId]);

  const legalCitationHandler = useCallback(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const range = quill.getSelection();
    let text = '';
    
    if (range && range.length > 0) {
      text = quill.getText(range.index, range.length);
    } else {
      text = prompt('Digite a citação legal (ex: Art. 5, CF):') || '';
    }

    if (text) {
      const url = `https://www.google.com/search?q=site:planalto.gov.br+${encodeURIComponent(text)}`;
      if (range && range.length > 0) {
        quill.format('link', url);
      } else {
        const index = range ? range.index : quill.getLength();
        quill.insertText(index, text, 'link', url);
      }
    }
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': '1' }, { 'header': '2' }, { 'font': [] }],
        [{ size: [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'image', 'video', 'legal-citation'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['clean'],
        ['code-block']
      ],
      handlers: {
        'image': imageHandler,
        'legal-citation': legalCitationHandler
      }
    },
  }), [imageHandler, legalCitationHandler]);

  const contentInitializedRef = useRef(false);

  const onEditorRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      // Evita duplicidade: Remove qualquer barra de ferramentas (ql-toolbar) que tenha ficado órfã no container pai
      const parent = node.parentElement;
      if (parent) {
        const existingToolbars = parent.querySelectorAll('.ql-toolbar');
        existingToolbars.forEach(tb => tb.remove());
      }

      if (!quillRef.current) {
        quillRef.current = new Quill(node, {
          theme: 'snow',
          modules: modules,
        });

        // Add custom icon for legal citation button
        const toolbar = node.parentElement?.querySelector('.ql-toolbar');
        if (toolbar) {
          const legalButton = toolbar.querySelector('.ql-legal-citation');
          if (legalButton) {
            legalButton.innerHTML = `
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="m14 5 3 3L7 18l-3-3L14 5Z"></path>
                <path d="m14 5 3 3-3-3Z"></path>
                <path d="M16 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"></path>
                <path d="m8 14 3 3"></path>
              </svg>
            `;
            legalButton.setAttribute('title', 'Citação Legal');
          }
        }

        quillRef.current.on('text-change', () => {
          const html = node.querySelector('.ql-editor')?.innerHTML || '';
          setNoteContent(html);
        });

        // Inicializa o conteúdo se já tivermos uma nota selecionada
        if (selectedNoteRef.current && !contentInitializedRef.current) {
          const delta = quillRef.current.clipboard.convert({ html: selectedNoteRef.current.content });
          quillRef.current.setContents(delta, 'silent');
          contentInitializedRef.current = true;
        }
      }
    } else {
      quillRef.current = null;
      contentInitializedRef.current = false;
    }
  }, [modules]); // Depende de modules para reinicializar se necessário

  // Sync content from state to editor when note is loaded or changed
  useEffect(() => {
    if (quillRef.current && selectedNote && !isLoading) {
      // Only update if the content is actually different to avoid cursor jumping
      if (quillRef.current.root.innerHTML !== selectedNote.content) {
        const delta = quillRef.current.clipboard.convert({ html: selectedNote.content });
        quillRef.current.setContents(delta, 'silent');
      }
    }
  }, [selectedNote?.id, isLoading, isVadeMecumMode]);

  const templates = {
    doutrina: '<h2>Referência Bibliográfica</h2><p><br></p><h2>Conceitos Principais</h2><p><br></p><h2>Citações Importantes</h2><p><br></p><h2>Crítica Pessoal</h2><p><br></p>',
    jurisprudencia: '<h2>Fatos</h2><p><br></p><h2>Fundamentos Jurídicos</h2><p><br></p><h2>Ratio Decidendi</h2><p><br></p><h2>Dispositivo</h2><p><br></p>',
    aula: '<h2>Data</h2><p><br></p><h2>Professor</h2><p><br></p><h2>Tema Central</h2><p><br></p><h2>Artigos Citados</h2><p><br></p>',
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background',
    'align',
    'code-block'
  ];

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subjectNotes, subjectFiles] = await Promise.all([
        dataService.getNotesBySubjectId(selectedSubjectId, userId, isOnline),
        dataService.getFilesBySubjectId(selectedSubjectId, userId, isOnline)
      ]);
      setNotes(subjectNotes);
      setFiles(subjectFiles);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erro ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubjectId, userId, isOnline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle initial selection or subject change
  useEffect(() => {
    if (notes.length > 0) {
      const shouldReset = !selectedNote || selectedNote.subject_id !== selectedSubjectId;
      if (shouldReset) {
        const firstNote = notes[0];
        setSelectedNote(firstNote);
        setNoteContent(firstNote.content);
        if (quillRef.current) {
          const delta = quillRef.current.clipboard.convert({ html: firstNote.content });
          quillRef.current.setContents(delta, 'silent');
        }
      }
    } else {
      setSelectedNote(null);
      setNoteContent('');
      if (quillRef.current) {
        quillRef.current.setContents([] as any, 'silent');
      }
    }
  }, [notes, selectedSubjectId, selectedNote]);

  const createNewNote = async () => {
    const title = prompt("Título do novo documento:");
    if (!title) return;

    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      subject_id: selectedSubjectId,
      user_id: userId,
      title: title,
      content: '',
      updated_at: new Date().toISOString(),
      tags: []
    };

    try {
      await dataService.saveNote(newNote, userId, isOnline);
      setNotes(prev => [newNote, ...prev]);
      setSelectedNote(newNote);
      setNoteContent('');
      if (quillRef.current) {
        quillRef.current.setContents([] as any, 'silent');
      }
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Erro ao criar documento.");
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Deseja realmente excluir este documento?")) return;
    
    try {
      await dataService.deleteNote(id, userId, isOnline);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setNoteContent('');
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Erro ao excluir documento.");
    }
  };

  const renameNote = async () => {
    if (!selectedNote || !newTitle.trim()) return;
    
    const updatedNote = { ...selectedNote, title: newTitle, updated_at: new Date().toISOString() };
    try {
      await dataService.saveNote(updatedNote, userId, isOnline);
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? updatedNote : n));
      setSelectedNote(updatedNote);
      setIsRenaming(false);
    } catch (error) {
      console.error("Error renaming note:", error);
      alert("Erro ao renomear documento.");
    }
  };

  // Refs to keep track of latest state for auto-save without re-triggering effects
  const noteContentRef = useRef(noteContent);
  const selectedNoteRef = useRef(selectedNote);

  useEffect(() => {
    noteContentRef.current = noteContent;
  }, [noteContent]);

  useEffect(() => {
    selectedNoteRef.current = selectedNote;
  }, [selectedNote]);

  const saveNoteContent = useCallback(async (isAuto: boolean = false) => {
    const currentNote = selectedNoteRef.current;
    const currentContent = noteContentRef.current;

    if (!currentNote) return;
    // Don't save if content is empty and it was already empty
    if (!currentContent.trim() && !currentNote.content.trim()) return; 

    if (isAuto) setIsAutoSaving(true);
    else setIsSaving(true);

    try {
      const extractedTags = (currentContent.match(/#(\w+)/g) || []).map(tag => tag.substring(1));

      const updatedNote: Note = {
        ...currentNote,
        content: currentContent,
        updated_at: new Date().toISOString(),
        tags: extractedTags,
      };

      await dataService.saveNote(updatedNote, userId, isOnline);
      
      // Update local state
      setNotes(prev => prev.map(n => n.id === currentNote.id ? updatedNote : n));
      setSelectedNote(updatedNote);
      
      if (!isAuto) alert('Anotação salva com sucesso!');
    } catch (error) {
      console.error('Error saving note:', error);
      if (!isAuto) alert('Erro ao salvar anotação.');
    } finally {
      if (isAuto) setIsAutoSaving(false);
      else setIsSaving(false);
    }
  }, [userId, isOnline]);

  // Auto-save effect - now only depends on the stable saveNoteContent function
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      saveNoteContent(true);
    }, 15000); // Every 15 seconds for better reliability

    return () => clearInterval(autoSaveInterval);
  }, [saveNoteContent]);

  const handleSaveNote = () => {
    saveNoteContent(false);
  };

  const applyTemplate = (template: keyof typeof templates) => {
    const newContent = noteContent + templates[template];
    setNoteContent(newContent);
    if (quillRef.current) {
      const delta = quillRef.current.clipboard.convert({ html: newContent });
      quillRef.current.setContents(delta, 'silent');
    }
    setIsTemplateMenuOpen(false);
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (e.g., 10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("O arquivo é muito grande. O limite é de 10MB.");
      return;
    }

    if (!userId || !selectedSubjectId) {
      alert("Erro: Usuário ou disciplina não identificados.");
      return;
    }

    setIsUploading(true);
    try {
      // Create a clean filename
      const cleanFileName = file.name.replace(/[^\w.-]/g, '_');
      const path = `${userId}/${selectedSubjectId}/${Date.now()}_${cleanFileName}`;
      
      const publicUrl = await dataService.uploadFile(file, path);
      
      if (!publicUrl) throw new Error("Não foi possível obter a URL pública do arquivo.");

      let extractedText = '';
      if (file.type === 'application/pdf') {
        try {
          extractedText = await extractTextFromPdf(file);
        } catch (err) {
          console.error("PDF extraction failed (continuing without text):", err);
        }
      }

      const newFile: SubjectFile = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        subject_id: selectedSubjectId,
        name: file.name,
        type: activeTab === 'repository' ? 'repository' : 'assignment',
        file_url: publicUrl,
        content: extractedText,
        created_at: new Date().toISOString()
      };

      await dataService.saveFile(newFile, userId, isOnline);
      setFiles(prev => [newFile, ...prev]);
      alert("Arquivo enviado com sucesso!");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      const errorMsg = error?.message || error?.error_description || String(error);
      alert(`Erro ao enviar arquivo: ${errorMsg}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteFile = async (id: string) => {
    if (!confirm("Deseja realmente excluir este arquivo?")) return;
    try {
      await dataService.deleteFile(id, userId, isOnline);
      setFiles(prev => prev.filter(f => f.id !== id));
      if (selectedFile?.id === id) setSelectedFile(null);
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Erro ao excluir arquivo.");
    }
  };

  const handleGenerateFlashcards = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    if (plainText.trim().length < 50) {
      alert("Por favor, escreva um texto mais substancial antes de gerar flashcards.");
      return;
    }
    onNavigateToAnki(plainText);
  };

  const handleGenerateFlashcardsFromFile = (file: SubjectFile) => {
    if (!file.content || file.content.trim().length < 50) {
      alert("Este arquivo não possui texto suficiente para gerar flashcards.");
      return;
    }
    onNavigateToAnki(file.content);
  };

  const handleExportPdf = () => {
    setIsExportMenuOpen(false);
    const element = document.createElement('div');
    element.innerHTML = noteContent;
    html2pdf().from(element).save('anotacao.pdf');
  };

  const handleExportDocx = async () => {
    setIsExportMenuOpen(false);
    const plainText = new DOMParser().parseFromString(noteContent, 'text/html').body.textContent || '';
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun(plainText)],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'anotacao.docx';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleSummarize = async () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";

    if (plainText.trim().length < 200) {
      alert("O texto é muito curto para ser resumido. Escreva mais um pouco.");
      return;
    }
    setIsSummarizing(true);
    try {
      const summary = await summarizeText(plainText);
      const htmlSummary = summary?.replace(/\n/g, '<br/>') || '';
      setNoteContent(htmlSummary);
      if (quillRef.current) {
        const delta = quillRef.current.clipboard.convert({ html: htmlSummary });
        quillRef.current.setContents(delta, 'silent');
      }
    } catch (error) {
      console.error("Error summarizing text:", error);
      alert("Ocorreu um erro ao tentar resumir o texto.");
    } finally {
      setIsSummarizing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        <p className="ml-3 text-slate-500">Carregando anotação...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full animate-in slide-in-from-right-4 duration-300 ${isSplitView ? 'lg:w-full' : 'lg:w-auto'}`}>
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-slate-400 hover:text-purple-500">
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-col items-start">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="mb-1 px-3 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
            {selectedNote && !isRenaming ? (
              <div className="flex items-center gap-2 group">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedNote.title || 'Documento sem título'}</h2>
                <button 
                  onClick={() => { setIsRenaming(true); setNewTitle(selectedNote.title); }} 
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition-all"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            ) : isRenaming ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-blue-500 rounded outline-none text-lg font-bold"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && renameNote()}
                />
                <button onClick={renameNote} className="text-green-500 font-bold text-sm">OK</button>
                <button onClick={() => setIsRenaming(false)} className="text-slate-400 text-sm">X</button>
              </div>
            ) : (
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Selecione um documento</h2>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Split View Button */}
          <button
            onClick={() => {
              const nextSplitState = !isSplitView;
              setIsSplitView(nextSplitState);
              onToggleSidebar(!nextSplitState); // Hide sidebar if split view is active
            }}
            className="py-2 px-4 bg-slate-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-600 transition-colors"
          >
            <Split size={18} /> {isSplitView ? 'Sair do Split' : 'Split View'}
          </button>
          {/* Vade Mecum Mode Button */}
          <button
            onClick={() => setIsVadeMecumMode(!isVadeMecumMode)}
            className={`py-2 px-4 rounded-xl font-bold flex items-center gap-2 transition-colors ${isVadeMecumMode ? 'bg-sanfran-rubi text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-300'}`}
          >
            <Gavel size={18} /> {isVadeMecumMode ? 'Sair do Vade Mecum' : 'Modo Vade Mecum'}
          </button>

          {/* AI Summarize Button */}
          <button 
            onClick={handleSummarize}
            disabled={isSummarizing || !selectedNote}
            className="py-2 px-4 bg-yellow-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={18} />} Resumir
          </button>

          {/* Generate Flashcards Button */}
          <button 
            onClick={handleGenerateFlashcards}
            disabled={!selectedNote}
            className="py-2 px-4 bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <BrainCircuit size={18} /> Gerar Flashcards
          </button>

          {/* Template Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
              disabled={!selectedNote}
              className="py-2 px-4 bg-slate-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <FileText size={18} /> Usar Template
            </button>
            {isTemplateMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                <a onClick={() => applyTemplate('doutrina')} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Fichamento de Doutrina</a>
                <a onClick={() => applyTemplate('jurisprudencia')} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Análise de Jurisprudência</a>
                <a onClick={() => applyTemplate('aula')} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Resumo de Aula</a>
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={!selectedNote}
              className="py-2 px-4 bg-green-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Download size={18} /> Exportar
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                <a onClick={handleExportPdf} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Exportar para PDF</a>
                <a onClick={handleExportDocx} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Exportar para DOCX</a>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSaveNote} 
            disabled={isSaving || isAutoSaving || !selectedNote}
            className="py-2 px-4 bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {(isSaving || isAutoSaving) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />} 
            {(isSaving || isAutoSaving) ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar for Notes and Files */}
        <div className="w-72 flex flex-col bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'notes' ? 'text-purple-600 bg-white dark:bg-slate-800 border-b-2 border-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Notas
            </button>
            <button 
              onClick={() => setActiveTab('repository')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'repository' ? 'text-blue-600 bg-white dark:bg-slate-800 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Repositório
            </button>
            <button 
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'assignments' ? 'text-green-600 bg-white dark:bg-slate-800 border-b-2 border-green-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Entregas
            </button>
          </div>

          <div className="p-4 border-bottom border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {activeTab === 'notes' ? 'Documentos' : activeTab === 'repository' ? 'PDFs / Textos' : 'Trabalhos'}
            </h3>
            {activeTab === 'notes' ? (
              <button onClick={createNewNote} className="p-1 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors">
                <Plus size={20} />
              </button>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading}
                className={`p-1 rounded-lg transition-colors ${activeTab === 'repository' ? 'text-blue-500 hover:bg-blue-50' : 'text-green-500 hover:bg-green-50'}`}
              >
                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".pdf,.doc,.docx,.txt"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeTab === 'notes' ? (
              notes.map(note => (
                <div 
                  key={note.id}
                  onClick={() => {
                    setSelectedNote(note);
                    setSelectedFile(null);
                    setNoteContent(note.content);
                    if (quillRef.current) {
                      const delta = quillRef.current.clipboard.convert({ html: note.content });
                      quillRef.current.setContents(delta, 'silent');
                    }
                  }}
                  className={`group p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between ${selectedNote?.id === note.id ? 'bg-white dark:bg-slate-800 shadow-md border-l-4 border-purple-500' : 'hover:bg-white/50 dark:hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText size={16} className={selectedNote?.id === note.id ? 'text-purple-500' : 'text-slate-400'} />
                    <span className={`text-sm font-bold truncate ${selectedNote?.id === note.id ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                      {note.title || 'Documento sem título'}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              files.filter(f => f.type === (activeTab === 'repository' ? 'repository' : 'assignment')).map(file => (
                <div 
                  key={file.id}
                  onClick={() => {
                    setSelectedFile(file);
                    setSelectedNote(null);
                  }}
                  className={`group p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between ${selectedFile?.id === file.id ? 'bg-white dark:bg-slate-800 shadow-md border-l-4 ' + (activeTab === 'repository' ? 'border-blue-500' : 'border-green-500') : 'hover:bg-white/50 dark:hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <File size={16} className={selectedFile?.id === file.id ? (activeTab === 'repository' ? 'text-blue-500' : 'text-green-500') : 'text-slate-400'} />
                    <span className={`text-sm font-bold truncate ${selectedFile?.id === file.id ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                      {file.name}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
            
            {((activeTab === 'notes' && notes.length === 0) || (activeTab !== 'notes' && files.filter(f => f.type === (activeTab === 'repository' ? 'repository' : 'assignment')).length === 0)) && !isLoading && (
              <div className="text-center py-8 px-4">
                <p className="text-xs text-slate-400 font-medium italic">Nenhum item encontrado.</p>
              </div>
            )}
          </div>
        </div>

        {/* Editor Area or File Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#181818] rounded-2xl shadow-xl p-8 relative">
            {activeTab === 'notes' ? (
              !selectedNote ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <FileText size={64} className="opacity-20" />
                  <p className="font-medium">Selecione ou crie um novo documento para começar.</p>
                  <button onClick={createNewNote} className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors">Criar Documento</button>
                </div>
              ) : isVadeMecumMode ? (
                <div className="prose dark:prose-invert max-w-none font-serif text-lg leading-relaxed">
                  <SmartText text={new DOMParser().parseFromString(noteContent, 'text/html').body.textContent || ''} />
                </div>
              ) : (
                <div ref={onEditorRef} className="h-full min-h-[400px] quill-editor-custom" />
              )
            ) : (
              !selectedFile ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <Folder size={64} className="opacity-20" />
                  <p className="font-medium">Selecione um arquivo para visualizar.</p>
                  <button onClick={() => fileInputRef.current?.click()} className={`px-6 py-2 text-white rounded-xl font-bold transition-colors ${activeTab === 'repository' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
                    Enviar Arquivo
                  </button>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-8 p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${activeTab === 'repository' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        <File size={32} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedFile.name}</h3>
                        <p className="text-sm text-slate-500">Enviado em {new Date(selectedFile.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a 
                        href={selectedFile.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="py-2 px-4 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                      >
                        Abrir Arquivo
                      </a>
                      <button 
                        onClick={() => handleGenerateFlashcardsFromFile(selectedFile)}
                        className="py-2 px-4 bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors"
                      >
                        <BrainCircuit size={18} /> Gerar Flashcards
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-slate-50 dark:bg-black/20 rounded-2xl p-6 overflow-y-auto">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Conteúdo Extraído (IA)</h4>
                    {selectedFile.content ? (
                      <div className="prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {selectedFile.content}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic">
                        <AlertCircle size={32} className="mb-2 opacity-20" />
                        <p>Nenhum texto extraído deste arquivo.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
          {selectedNote && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(noteContent.match(/#(\w+)/g) || []).map((tag, index) => (
                <span key={index} className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                  <Tag size={12} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteView;
