import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; // Import Quill styles
import { ArrowLeft, Save, Loader2, FileText, BrainCircuit, Sparkles, Tag, Split, Download, Gavel, Edit3, Pencil, Maximize2, Minimize2, Star, X } from 'lucide-react';
import { Note, Subject, SubjectFile } from '../types';
import { dataService } from '../services/dataService';
import { summarizeText, generateFlashcardFromHighlight } from '../services/geminiService';
import html2pdf from 'html2pdf.js';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { SmartText } from './SmartVadeMecum';
import * as pdfjsLib from 'pdfjs-dist';
import { CheckCircle2 } from 'lucide-react';
import HandwritingCanvas from './HandwritingCanvas';
import DocsToolbar from './DocsToolbar';
import { toast } from 'sonner';
import FloatingSelectionMenu from './noteview/FloatingSelectionMenu';
import FlashcardModal from './noteview/FlashcardModal';
import NoteSidebar from './noteview/NoteSidebar';
import FilePreviewPanel from './noteview/FilePreviewPanel';
import NoteEditorPane from './noteview/NoteEditorPane';

// Register Line Height for Quill
const Parchment = Quill.import('parchment');
const LineHeightStyle = new Parchment.StyleAttributor('lineheight', 'line-height', {
  scope: Parchment.Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2']
});
Quill.register(LineHeightStyle, true);

// Register Fonts
const Font = Quill.import('formats/font') as any;
Font.whitelist = ['sans-serif', 'serif', 'monospace', 'georgia', 'trebuchet', 'verdana', 'comic-sans', 'impact'];
Quill.register(Font, true);

// Register Sizes
const SizeStyle = Quill.import('attributors/style/size') as any;
SizeStyle.whitelist = ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px', '48px', '64px'];
Quill.register(SizeStyle, true);

// Register Comment
const Inline = Quill.import('blots/inline') as any;
class CommentBlot extends Inline {
  static create(value: string) {
    const node = super.create();
    node.setAttribute('data-comment', value);
    node.setAttribute('title', value);
    node.className = 'bg-yellow-200 dark:bg-yellow-900/50 border-b border-yellow-400 cursor-help';
    return node;
  }

  static formats(node: HTMLElement) {
    return node.getAttribute('data-comment');
  }
}
CommentBlot.blotName = 'comment';
CommentBlot.tagName = 'span';
Quill.register(CommentBlot);

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

const formats = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent',
  'link', 'image', 'video',
  'color', 'background',
  'align',
  'code-block',
  'lineheight',
  'comment'
];

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
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isHandwritingOpen, setIsHandwritingOpen] = useState(false);
  const [handwritingData, setHandwritingData] = useState<string | undefined>(undefined);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(true);
  const [isNewNoteTitleModalOpen, setIsNewNoteTitleModalOpen] = useState(false);
  const [newNoteTitleDraft, setNewNoteTitleDraft] = useState('');
  
  // Highlight to Card States
  const [selectionRange, setSelectionRange] = useState<{ index: number, length: number } | null>(null);
  const [floatingMenuPos, setFloatingMenuPos] = useState<{ top: number, left: number } | null>(null);
  const [isGeneratingFlashcard, setIsGeneratingFlashcard] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [newFlashcardData, setNewFlashcardData] = useState<{ front: string, back: string } | null>(null);
  
  // View Menu States
  const [editMode, setEditMode] = useState<'editing' | 'suggesting' | 'viewing'>('editing');
  const [showComments, setShowComments] = useState(false);
  const [showPrintLayout, setShowPrintLayout] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [showEquationToolbar, setShowEquationToolbar] = useState(false);
  const [showNonPrintingChars, setShowNonPrintingChars] = useState(false);
  
  // Page Layout States
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isPageless, setIsPageless] = useState(false);
  const [zoom, setZoom] = useState('100%');
  const zoomScale = useMemo(() => {
    const zoomValue = parseInt(zoom, 10);
    if (!Number.isFinite(zoomValue) || zoomValue <= 0) return 1;
    return zoomValue / 100;
  }, [zoom]);
  
  // Sync selectedSubjectId when initialSubjectId changes from props
  useEffect(() => {
    if (initialSubjectId && initialSubjectId !== selectedSubjectId) {
      setSelectedSubjectId(initialSubjectId);
    }
  }, [initialSubjectId]);

  const quillRef = useRef<Quill | null>(null);
  /** Último intervalo Quill não nulo — atualizado junto ao listener do editor (DocsToolbar usa para restaurar após menus). */
  const quillSavedRangeRef = useRef<{ index: number; length: number } | null>(null);
  const lastRangeNoteIdRef = useRef<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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
    history: { delay: 1000, maxStack: 500 },
    table: true,
    toolbar: {
      container: '#docs-toolbar',
      handlers: {
        'image': imageHandler,
        'legal-citation': legalCitationHandler,
        'undo': function() {
          if (quillRef.current) quillRef.current.history.undo();
        },
        'redo': function() {
          if (quillRef.current) quillRef.current.history.redo();
        }
      }
    },
  }), [imageHandler, legalCitationHandler]);

  const contentInitializedRef = useRef(false);

  const onEditorRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      if (!quillRef.current) {
        quillRef.current = new Quill(node, {
          theme: 'snow',
          modules: modules,
          formats: formats,
        });

        // Toolbar lives in #docs-toolbar (not a DOM parent of the editor mount)
        const toolbar = document.querySelector('#docs-toolbar');
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

        quillRef.current.on('selection-change', (range: any) => {
          if (range) {
            quillSavedRangeRef.current = { index: range.index, length: range.length };
          }
          if (range && range.length > 0) {
            const quill = quillRef.current;
            const bounds = quill?.getBounds(range.index, range.length);
            if (bounds) {
              const containerRect = quill?.container.getBoundingClientRect();
              setSelectionRange(range);
              setFloatingMenuPos({
                top: (containerRect?.top ?? 0) + bounds.top - 40,
                left: (containerRect?.left ?? 0) + bounds.left + bounds.width / 2
              });
            }
          } else {
            setFloatingMenuPos(null);
            setSelectionRange(null);
          }
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
      quillSavedRangeRef.current = null;
      lastRangeNoteIdRef.current = null;
      contentInitializedRef.current = false;
    }
  }, [modules]); // Depende de modules para reinicializar se necessário

  // Sync content from state to editor when note is loaded or changed
  useEffect(() => {
    if (quillRef.current && selectedNote && !isLoading) {
      if (lastRangeNoteIdRef.current !== selectedNote.id) {
        lastRangeNoteIdRef.current = selectedNote.id;
        quillSavedRangeRef.current = null;
      }

      // Only update if the content is actually different to avoid cursor jumping
      if (quillRef.current.root.innerHTML !== selectedNote.content) {
        const delta = quillRef.current.clipboard.convert({ html: selectedNote.content });
        quillRef.current.setContents(delta, 'silent');
      }

      // Handle viewing mode
      if (editMode === 'viewing') {
        quillRef.current.disable();
      } else {
        quillRef.current.enable();
      }

      // Recapture selection into saved ref (setContents / enable may not emit selection-change in time for menus)
      const sel = quillRef.current.getSelection();
      if (sel) {
        quillSavedRangeRef.current = { index: sel.index, length: sel.length };
      }
    }
  }, [selectedNote?.id, isLoading, isVadeMecumMode, editMode]);

  const templates = {
    doutrina: '<h2>Referência Bibliográfica</h2><p><br></p><h2>Conceitos Principais</h2><p><br></p><h2>Citações Importantes</h2><p><br></p><h2>Crítica Pessoal</h2><p><br></p>',
    jurisprudencia: '<h2>Fatos</h2><p><br></p><h2>Fundamentos Jurídicos</h2><p><br></p><h2>Ratio Decidendi</h2><p><br></p><h2>Dispositivo</h2><p><br></p>',
    aula: '<h2>Data</h2><p><br></p><h2>Professor</h2><p><br></p><h2>Tema Central</h2><p><br></p><h2>Artigos Citados</h2><p><br></p>',
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (isTemplateMenuOpen && templateMenuRef.current && !templateMenuRef.current.contains(target)) {
        setIsTemplateMenuOpen(false);
      }

      if (isExportMenuOpen && exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setIsExportMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTemplateMenuOpen(false);
        setIsExportMenuOpen(false);
        setFloatingMenuPos(null);
      }
    };

    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isTemplateMenuOpen, isExportMenuOpen]);

  const loadData = useCallback(async () => {
    const reqId = ++loadRequestIdRef.current;
    setIsLoading(true);
    try {
      const [subjectNotes, subjectFiles] = await Promise.all([
        dataService.getNotesBySubjectId(selectedSubjectId, userId, isOnline),
        dataService.getFilesBySubjectId(selectedSubjectId, userId, isOnline)
      ]);
      if (reqId !== loadRequestIdRef.current) return;
      setNotes(subjectNotes);
      setFiles(subjectFiles);
    } catch (error) {
      if (reqId !== loadRequestIdRef.current) return;
      console.error('Error loading data:', error);
      alert('Erro ao carregar dados.');
    } finally {
      if (reqId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
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
        setHandwritingData(firstNote.handwriting_data);
        if (quillRef.current) {
          const delta = quillRef.current.clipboard.convert({ html: firstNote.content });
          quillRef.current.setContents(delta, 'silent');
        }
      }
    } else {
      setSelectedNote(null);
      setNoteContent('');
      setHandwritingData(undefined);
      if (quillRef.current) {
        quillRef.current.setContents([] as any, 'silent');
      }
    }
  }, [notes, selectedSubjectId, selectedNote]);

  const createNoteWithTitle = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error('Informe um título para o documento.');
      return;
    }

    const newNote: Note = {
      id: crypto.randomUUID(),
      subject_id: selectedSubjectId,
      user_id: userId,
      title: trimmed,
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
      setIsNewNoteTitleModalOpen(false);
      setNewNoteTitleDraft('');
      toast.success('Documento criado.');
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Erro ao criar documento.");
    }
  };

  const openNewNoteTitleModal = () => {
    setNewNoteTitleDraft('');
    setIsNewNoteTitleModalOpen(true);
  };

  const confirmNewNoteFromModal = () => {
    void createNoteWithTitle(newNoteTitleDraft);
  };

  const deleteNote = async (id: string) => {
    // Using toast for confirmation is tricky without state, but we can at least avoid window.confirm
    // For now, I'll just use a simple state-based confirmation if I can add it easily, 
    // but let's just replace the alert for now.
    if (!window.confirm("Deseja realmente excluir este documento?")) return;
    
    try {
      await dataService.deleteNote(id, userId, isOnline);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setNoteContent('');
      }
      toast.success("Documento excluído.");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Erro ao excluir documento.");
    }
  };

  const handleExportTxt = () => {
    if (!selectedNote) return;
    const text = quillRef.current?.getText() || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedNote.title || 'documento'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleStar = async () => {
    if (!selectedNote) return;
    const newStarredStatus = !selectedNote.is_starred;
    const updatedNote = { ...selectedNote, is_starred: newStarredStatus };
    setSelectedNote(updatedNote);
    setNotes(prev => prev.map(n => n.id === selectedNote.id ? updatedNote : n));
    try {
      await dataService.saveNote(updatedNote, userId, isOnline);
      toast.success(newStarredStatus ? 'Documento marcado com estrela!' : 'Estrela removida.');
    } catch (error) {
      console.error("Error toggling star:", error);
      toast.error("Erro ao atualizar estrela.");
      // Revert on error
      setSelectedNote(selectedNote);
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? selectedNote : n));
    }
  };

  const duplicateNote = async () => {
    if (!selectedNote) return;
    const newNote: Note = {
      ...selectedNote,
      id: crypto.randomUUID(),
      title: `${selectedNote.title} (Cópia)`,
      updated_at: new Date().toISOString(),
    };
    try {
      await dataService.saveNote(newNote, userId, isOnline);
      setNotes(prev => [newNote, ...prev]);
      setSelectedNote(newNote);
      toast.success("Documento duplicado!");
    } catch (error) {
      console.error("Error duplicating note:", error);
      toast.error("Erro ao duplicar documento.");
    }
  };

  const showDetails = () => {
    if (!selectedNote) return;
    toast.info(`Detalhes: ${selectedNote.title}`, {
      description: `ID: ${selectedNote.id}\nModificado em: ${new Date(selectedNote.updated_at).toLocaleString()}\nProprietário: ${userId}`
    });
  };

  const renameNote = async () => {
    if (!selectedNote || !newTitle.trim()) return;
    
    const updatedNote = { ...selectedNote, title: newTitle, updated_at: new Date().toISOString() };
    try {
      await dataService.saveNote(updatedNote, userId, isOnline);
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? updatedNote : n));
      setSelectedNote(updatedNote);
      setIsRenaming(false);
      toast.success("Documento renomeado.");
    } catch (error) {
      console.error("Error renaming note:", error);
      toast.error("Erro ao renomear documento.");
    }
  };

  // Refs to keep track of latest state for auto-save without re-triggering effects
  const noteContentRef = useRef(noteContent);
  const selectedNoteRef = useRef(selectedNote);
  const handwritingDataRef = useRef(handwritingData);

  useEffect(() => {
    noteContentRef.current = noteContent;
  }, [noteContent]);

  useEffect(() => {
    selectedNoteRef.current = selectedNote;
  }, [selectedNote]);

  useEffect(() => {
    handwritingDataRef.current = handwritingData;
  }, [handwritingData]);

  const saveNoteContent = useCallback(async (isAuto: boolean = false) => {
    const currentNote = selectedNoteRef.current;
    const currentContent = noteContentRef.current;
    const currentHandwriting = handwritingDataRef.current;

    if (!currentNote) return;
    // Don't save if content is empty and it was already empty
    if (!currentContent.trim() && !currentNote.content.trim() && !currentHandwriting) return; 

    if (isAuto) setIsAutoSaving(true);
    else setIsSaving(true);

    try {
      const extractedTags = (currentContent.match(/#(\w+)/g) || []).map(tag => tag.substring(1));

      const updatedNote: Note = {
        ...currentNote,
        content: currentContent,
        handwriting_data: currentHandwriting,
        updated_at: new Date().toISOString(),
        tags: extractedTags,
      };

      await dataService.saveNote(updatedNote, userId, isOnline);
      
      // Update local state
      setNotes(prev => prev.map(n => n.id === currentNote.id ? updatedNote : n));
      setSelectedNote(updatedNote);
      
      if (!isAuto) toast.success('Anotação salva com sucesso!');
    } catch (error) {
      console.error('Error saving note:', error);
      if (!isAuto) toast.error('Erro ao salvar anotação.');
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

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (selectedNoteRef.current && !isSaving && !isAutoSaving) {
          saveNoteContent(false);
        }
      }
    };

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [isSaving, isAutoSaving, saveNoteContent]);

  const handleExportHandwritingImage = (base64: string) => {
    const quill = quillRef.current;
    if (quill) {
      const range = quill.getSelection() || { index: quill.getLength(), length: 0 };
      quill.insertEmbed(range.index, 'image', base64);
      quill.setSelection((range.index + 1) as any);
      setIsHandwritingOpen(false);
    }
  };

  const handleSaveHandwriting = (data: string) => {
    setHandwritingData(data);
    toast.success("Traços de escrita salvos!");
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
      toast.error("O arquivo é muito grande. O limite é de 10MB.");
      return;
    }

    if (!userId || !selectedSubjectId) {
      toast.error("Erro: Usuário ou disciplina não identificados.");
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
        id: crypto.randomUUID(),
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
      toast.success("Arquivo enviado com sucesso!");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      const errorMsg = error?.message || error?.error_description || String(error);
      toast.error(`Erro ao enviar arquivo: ${errorMsg}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteFile = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este arquivo?")) return;
    try {
      await dataService.deleteFile(id, userId, isOnline);
      setFiles(prev => prev.filter(f => f.id !== id));
      if (selectedFile?.id === id) setSelectedFile(null);
      toast.success("Arquivo excluído.");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Erro ao excluir arquivo.");
    }
  };

  const handleGenerateFlashcards = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    if (plainText.trim().length < 50) {
      toast.error("Por favor, escreva um texto mais substancial antes de gerar flashcards.");
      return;
    }
    onNavigateToAnki(plainText);
  };

  const handleGenerateFlashcardsFromFile = (file: SubjectFile) => {
    if (!file.content || file.content.trim().length < 50) {
      toast.error("Este arquivo não possui texto suficiente para gerar flashcards.");
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
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
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
      toast.error("O texto é muito curto para ser resumido. Escreva mais um pouco.");
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
      toast.error("Ocorreu um erro ao tentar resumir o texto.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleTransformToFlashcard = async () => {
    if (!selectionRange || !quillRef.current) return;
    const selectedText = quillRef.current.getText(selectionRange.index, selectionRange.length);
    if (!selectedText.trim()) return;

    setIsGeneratingFlashcard(true);
    try {
      const card = await generateFlashcardFromHighlight(selectedText);
      setNewFlashcardData(card);
      setShowFlashcardModal(true);
    } catch (error) {
      console.error("Error generating flashcard from highlight:", error);
      toast.error("Erro ao gerar flashcard com IA.");
    } finally {
      setIsGeneratingFlashcard(false);
      setFloatingMenuPos(null);
    }
  };

  const handleSaveGeneratedFlashcard = async () => {
    if (!newFlashcardData) return;
    
    try {
      const flashcard = {
        id: crypto.randomUUID(),
        user_id: userId,
        subjectId: selectedSubjectId,
        front: newFlashcardData.front,
        back: newFlashcardData.back,
        status: 'new',
        nextReview: Date.now(),
        interval: 0,
        learningStep: 0,
        easeFactor: 2.5,
        tags: ['IA', 'Notas'],
        created_at: new Date().toISOString()
      };
      
      await dataService.saveFlashcard(flashcard as any, userId, isOnline);
      toast.success("Flashcard criado e salvo no Anki!");
      setShowFlashcardModal(false);
      setNewFlashcardData(null);
    } catch (error) {
      console.error("Error saving generated flashcard:", error);
      toast.error("Erro ao salvar flashcard.");
    }
  };

  // Color palette for cards
  const cardColors = [
    'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20 text-rose-600',
    'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20 text-amber-600',
    'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-600',
    'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 text-blue-600',
    'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20 text-indigo-600',
    'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20 text-purple-600',
    'bg-pink-50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/20 text-pink-600',
  ];

  const getCardColor = (id: string) => {
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return cardColors[index % cardColors.length];
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center py-16">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        <p className="ml-3 text-slate-500">Carregando anotação...</p>
      </div>
    );
  }

  const handleBack = () => {
    setIsMaximized(false);
    onBack();
  };

  return (
    <div className={`flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-500 transition-all ${isMaximized ? 'is-maximized fixed inset-0 z-[100] bg-white dark:bg-[#0d0303] h-full' : 'w-full min-h-0 h-[calc(100dvh-10rem)]'}`}>
      
      <FloatingSelectionMenu
        position={floatingMenuPos}
        isLoading={isGeneratingFlashcard}
        onTransform={handleTransformToFlashcard}
      />

      <FlashcardModal
        isOpen={showFlashcardModal}
        data={newFlashcardData}
        onChange={setNewFlashcardData}
        onClose={() => setShowFlashcardModal(false)}
        onSave={handleSaveGeneratedFlashcard}
      />

      {isNewNoteTitleModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-note-title-heading"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsNewNoteTitleModalOpen(false);
              setNewNoteTitleDraft('');
            }
          }}
        >
          <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <h3 id="new-note-title-heading" className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Novo documento
              </h3>
              <button
                type="button"
                onClick={() => { setIsNewNoteTitleModalOpen(false); setNewNoteTitleDraft(''); }}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Título</label>
              <input
                type="text"
                value={newNoteTitleDraft}
                onChange={(e) => setNewNoteTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmNewNoteFromModal();
                  }
                }}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sanfran-rubi/40"
                placeholder="Ex.: Aula 1 — Introdução"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsNewNoteTitleModalOpen(false); setNewNoteTitleDraft(''); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmNewNoteFromModal}
                  className="px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide bg-sanfran-rubi text-white hover:bg-red-700"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editorial Header */}
      <header className={`relative border-b border-slate-100 dark:border-white/5 transition-all ${isMaximized ? 'sticky top-0 z-20 py-2 px-4 mb-0 bg-slate-50/95 dark:bg-[#0d0303]/95 backdrop-blur' : 'py-4 px-6 mb-6 bg-white dark:bg-white/2'}`}>
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between ${isMaximized ? 'gap-2' : 'gap-4'}`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBack} 
                className="p-2.5 bg-white dark:bg-white/5 text-slate-500 hover:text-sanfran-rubi rounded-xl shadow-sm border border-slate-200 dark:border-white/10 transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-0.5"
              >
                <ArrowLeft size={18} />
                <span className="text-[7px] font-black uppercase tracking-tighter">Voltar</span>
              </button>
              {!isMaximized && (
                <div className="flex flex-col min-w-[120px]">
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Disciplina</span>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="bg-transparent border-none p-0 text-[11px] font-bold text-sanfran-rubi focus:ring-0 outline-none cursor-pointer hover:underline transition-all truncate max-w-[200px]"
                  >
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="relative">
              {selectedNote && !isRenaming ? (
                <div className="flex items-center gap-3 group">
                  <h1 className={`font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1] transition-all ${isMaximized ? 'text-xl' : 'text-xl md:text-2xl'}`}>
                    {selectedNote.title || 'Documento sem título'}
                  </h1>
                  <button 
                    onClick={() => { setIsRenaming(true); setNewTitle(selectedNote.title); }} 
                    className="p-2 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex flex-col items-center gap-0.5"
                  >
                    <Edit3 size={16} />
                    <span className="text-[7px] font-black uppercase">Renomear</span>
                  </button>
                  <button 
                    className={`p-2 transition-colors ${selectedNote.is_starred ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-500'}`}
                    title={selectedNote.is_starred ? "Remover estrela" : "Marcar com estrela"}
                    onClick={toggleStar}
                  >
                    <Star size={20} fill={selectedNote.is_starred ? "currentColor" : "none"} />
                  </button>
                </div>
              ) : isRenaming ? (
                <div className="flex items-center gap-4">
                  <input 
                    type="text" 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)}
                    className={`px-6 py-3 bg-white dark:bg-slate-800 border-4 border-blue-500/30 rounded-[2rem] outline-none font-black tracking-tighter w-full max-w-xl focus:border-blue-500 transition-all ${isMaximized ? 'text-lg' : 'text-4xl'}`}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && renameNote()}
                  />
                  <div className="flex gap-2">
                    <button onClick={renameNote} className="p-3 bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-105 transition-all flex flex-col items-center gap-1">
                      <CheckCircle2 size={24} />
                      <span className="text-[8px] font-black uppercase">Salvar</span>
                    </button>
                    <button onClick={() => setIsRenaming(false)} className="p-3 bg-slate-200 dark:bg-white/10 text-slate-500 rounded-2xl hover:scale-105 transition-all flex flex-col items-center gap-1">
                      <ArrowLeft size={24} />
                      <span className="text-[8px] font-black uppercase">Cancelar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <h1 className={`font-black text-slate-200 dark:text-slate-800 tracking-tighter transition-all ${isMaximized ? 'text-xl' : 'text-5xl md:text-6xl'}`}>Selecione um documento</h1>
              )}
            </div>
          </div>

          {/* Action Groups */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Group 1: AI & Smart Tools */}
            <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <button 
                onClick={handleSummarize}
                disabled={isSummarizing || !selectedNote}
                className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all disabled:opacity-30 flex flex-col items-center gap-0.5"
                title="Resumir com IA"
              >
                {isSummarizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles size={20} />}
                <span className="text-[7px] font-black uppercase">Resumir</span>
              </button>
              <button 
                onClick={handleGenerateFlashcards}
                disabled={!selectedNote}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all disabled:opacity-30 flex flex-col items-center gap-0.5"
                title="Gerar Flashcards"
              >
                <BrainCircuit size={20} />
                <span className="text-[7px] font-black uppercase">Anki</span>
              </button>
              <button
                onClick={() => setIsVadeMecumMode(!isVadeMecumMode)}
                className={`p-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${isVadeMecumMode ? 'bg-sanfran-rubi text-white shadow-lg shadow-red-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                title="Modo Vade Mecum"
              >
                <Gavel size={20} />
                <span className="text-[7px] font-black uppercase">Leitura</span>
              </button>
            </div>

            {/* Group 2: Editor Tools */}
            <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="relative" ref={templateMenuRef}>
                <button 
                  onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                  disabled={!selectedNote}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all disabled:opacity-30 flex flex-col items-center gap-0.5"
                  title="Templates"
                >
                  <FileText size={20} />
                  <span className="text-[7px] font-black uppercase">Modelos</span>
                </button>
                {isTemplateMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 z-[60] p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Modelos</div>
                    <button onClick={() => applyTemplate('doutrina')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">Fichamento de Doutrina</button>
                    <button onClick={() => applyTemplate('jurisprudencia')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">Análise de Jurisprudência</button>
                    <button onClick={() => applyTemplate('aula')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">Resumo de Aula</button>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsHandwritingOpen(true)}
                disabled={!selectedNote}
                className="p-2 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-xl transition-all disabled:opacity-30 flex flex-col items-center gap-0.5"
                title="Escrita à Mão"
              >
                <Pencil size={20} />
                <span className="text-[7px] font-black uppercase">Caneta</span>
              </button>
            </div>

            {/* Group 3: Export & View */}
            <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="relative" ref={exportMenuRef}>
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  disabled={!selectedNote}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all disabled:opacity-30 flex flex-col items-center gap-0.5"
                  title="Exportar"
                >
                  <Download size={20} />
                  <span className="text-[7px] font-black uppercase">Exportar</span>
                </button>
                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 z-[60] p-2 animate-in fade-in zoom-in-95 duration-200">
                    <button onClick={() => { handleExportPdf(); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">Exportar PDF</button>
                    <button onClick={() => { handleExportDocx(); setIsExportMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">Exportar Word</button>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  const nextSplitState = !isSplitView;
                  setIsSplitView(nextSplitState);
                  onToggleSidebar(!nextSplitState);
                }}
                className={`p-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${isSplitView ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                title="Split View"
              >
                <Split size={20} />
                <span className="text-[7px] font-black uppercase">{isSplitView ? 'Foco ON' : 'Foco OFF'}</span>
              </button>

              <button
                onClick={() => {
                  const nextMaximizedState = !isMaximized;
                  setIsMaximized(nextMaximizedState);
                  if (nextMaximizedState) {
                    setIsSplitView(true);
                    onToggleSidebar(false);
                  } else {
                    setIsSplitView(false);
                    onToggleSidebar(true);
                  }
                }}
                className={`p-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${isMaximized ? 'bg-sanfran-rubi text-white shadow-lg shadow-red-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                title={isMaximized ? "Sair da Tela Cheia" : "Tela Cheia"}
              >
                {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                <span className="text-[7px] font-black uppercase">{isMaximized ? 'Recolher' : 'Expandir'}</span>
              </button>
            </div>

            {/* Save Button - Primary Action */}
            <button 
              onClick={handleSaveNote} 
              disabled={isSaving || isAutoSaving || !selectedNote}
              className="ml-2 py-2.5 px-5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 disabled:opacity-50 active:scale-95"
            >
              {(isSaving || isAutoSaving) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />} 
              <div className="flex flex-col items-start">
                <span className="leading-none">{(isSaving || isAutoSaving) ? 'Salvando' : 'Salvar'}</span>
                <span className="text-[6px] opacity-50 mt-0.5">Ctrl + S</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      <div className="flex gap-8 flex-1 min-h-0 overflow-hidden">
        {/* Sidebar for Notes and Files */}
        {!isSplitView && (
          <NoteSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            notes={notes}
            files={files}
            selectedNote={selectedNote}
            selectedFile={selectedFile}
            isUploading={isUploading}
            isLoading={isLoading}
            onCreateNote={openNewNoteTitleModal}
            onUploadClick={() => fileInputRef.current?.click()}
            onSelectNote={(note) => {
              setSelectedNote(note);
              setSelectedFile(null);
              setNoteContent(note.content);
              setHandwritingData(note.handwriting_data);
              if (quillRef.current) {
                const delta = quillRef.current.clipboard.convert({ html: note.content });
                quillRef.current.setContents(delta, 'silent');
              }
            }}
            onSelectFile={(file) => {
              setSelectedFile(file);
              setSelectedNote(null);
            }}
            onDeleteNote={deleteNote}
            onDeleteFile={deleteFile}
            getCardColor={getCardColor}
          />
        )}

        {/* Editor Area or File Preview */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
          <div className={`flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-2xl relative transition-all duration-500 ${isMaximized ? 'rounded-none border-0' : 'rounded-3xl border'}`}>
            {activeTab === 'notes' ? (
              !selectedNote ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-8 p-12 text-center">
                  <div className="w-32 h-32 bg-slate-50 dark:bg-white/5 rounded-[3rem] flex items-center justify-center animate-float shadow-inner">
                    <FileText size={64} className="opacity-10" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Pronto para começar?</h3>
                    <p className="text-sm font-medium max-w-sm mx-auto text-slate-500 leading-relaxed">Selecione um documento na barra lateral ou crie um novo para registrar seus estudos com o poder da IA.</p>
                  </div>
                  <button 
                    onClick={openNewNoteTitleModal} 
                    className="px-10 py-5 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-2xl shadow-red-500/30 active:scale-95"
                  >
                    Criar Primeiro Documento
                  </button>
                </div>
              ) : isVadeMecumMode ? (
                <div className="p-16 max-w-5xl mx-auto w-full relative">
                  <button 
                    onClick={() => setIsVadeMecumMode(false)}
                    className="absolute top-8 right-8 px-6 py-3 bg-sanfran-rubi text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-xl"
                  >
                    Sair do Modo Leitura
                  </button>
                  <div className="prose dark:prose-invert max-w-none font-serif text-2xl leading-relaxed text-slate-800 dark:text-slate-200 mt-12">
                    <SmartText text={new DOMParser().parseFromString(noteContent, 'text/html').body.textContent || ''} />
                  </div>
                </div>
              ) : (
                <div className={`note-view-editor-root flex flex-1 min-h-0 flex-col overflow-visible transition-all duration-500 ${isMaximized ? 'p-0' : 'p-6 md:p-10'}`}>
                  <DocsToolbar 
                    quillRef={quillRef}
                    savedQuillRangeRef={quillSavedRangeRef}
                    onImageUpload={imageHandler} 
                    onExportPdf={handleExportPdf} 
                    onExportDocx={handleExportDocx} 
                    onPrint={() => window.print()} 
                    isMaximized={isMaximized} 
                    setIsMaximized={(val) => {
                      setIsMaximized(val);
                      if (val) {
                        setIsSplitView(true);
                        onToggleSidebar(false);
                      } else {
                        setIsSplitView(false);
                        onToggleSidebar(true);
                      }
                    }} 
                    title={selectedNote.title || 'Documento sem título'}
                    onRename={(newTitle) => {
                      if (!selectedNote) return;
                      const updatedNote = { ...selectedNote, title: newTitle, updated_at: new Date().toISOString() };
                      setSelectedNote(updatedNote);
                      dataService.saveNote(updatedNote, userId, isOnline);
                      setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
                    }}
                    isStarred={!!selectedNote.is_starred}
                    onToggleStar={() => {
                      const updatedNote = { ...selectedNote, is_starred: !selectedNote.is_starred, updated_at: new Date().toISOString() };
                      setSelectedNote(updatedNote);
                      dataService.saveNote(updatedNote, userId, isOnline);
                      setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
                    }}
                    onNew={openNewNoteTitleModal}
                    onOpen={() => {
                      setIsSplitView(false);
                      onToggleSidebar(true);
                    }}
                    onCopy={duplicateNote}
                    onShare={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copiado para a área de transferência.');
                    }}
                    onEmail={() => {
                      if (!selectedNote) return;
                      window.location.href = `mailto:?subject=${encodeURIComponent(selectedNote.title)}&body=${encodeURIComponent(quillRef.current?.getText() || '')}`;
                    }}
                    onExportTxt={handleExportTxt}
                    onDelete={() => selectedNote && deleteNote(selectedNote.id)}
                    onVersionHistory={() => toast.success('Histórico de versões aberto (simulação).')}
                    onOfflineToggle={() => setIsOfflineAvailable(!isOfflineAvailable)}
                    isOfflineAvailable={isOfflineAvailable}
                    onDetails={showDetails}
                    onLanguageChange={(lang) => {
                      if (quillRef.current) {
                        quillRef.current.root.setAttribute('lang', lang);
                        toast.success(`Idioma alterado para: ${lang}`);
                      }
                    }}
                    onPageSetup={() => {
                      const margins = prompt('Margens (em cm, ex: 2.5):', '2.5');
                      if (margins) {
                        toast.success(`Margens ajustadas para ${margins}cm.`);
                      }
                    }}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    showComments={showComments}
                    setShowComments={setShowComments}
                    showPrintLayout={showPrintLayout}
                    setShowPrintLayout={setShowPrintLayout}
                    showRuler={showRuler}
                    setShowRuler={setShowRuler}
                    showEquationToolbar={showEquationToolbar}
                    setShowEquationToolbar={setShowEquationToolbar}
                    showNonPrintingChars={showNonPrintingChars}
                    setShowNonPrintingChars={setShowNonPrintingChars}
                    pageOrientation={pageOrientation}
                    setPageOrientation={setPageOrientation}
                    isPageless={isPageless}
                    setIsPageless={setIsPageless}
                  />

                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <NoteEditorPane
                    showRuler={showRuler}
                    isVadeMecumMode={isVadeMecumMode}
                    showEquationToolbar={showEquationToolbar}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    showPrintLayout={showPrintLayout}
                    isPageless={isPageless}
                    showNonPrintingChars={showNonPrintingChars}
                    onEditorRef={onEditorRef}
                    pageOrientation={pageOrientation}
                    zoomScale={zoomScale}
                    showComments={showComments}
                    setShowComments={setShowComments}
                    quillRef={quillRef}
                  />
                  </div>
                </div>
              )
            ) : (
              <FilePreviewPanel
                activeTab={activeTab === 'repository' ? 'repository' : 'assignments'}
                selectedFile={selectedFile}
                onUploadClick={() => fileInputRef.current?.click()}
                onGenerateFlashcards={handleGenerateFlashcardsFromFile}
              />
            )}
          </div>
          
          {/* Tags Footer */}
          {selectedNote && !isMaximized && (
            <div className="mt-8 flex flex-wrap gap-3 px-6">
              {(noteContent.match(/#(\w+)/g) || []).map((tag, index) => (
                <span key={index} className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 shadow-sm hover:scale-105 transition-all cursor-default">
                  <Tag size={14} className="text-sanfran-rubi" /> {tag}
                </span>
              ))}
            </div>
          )}
        </main>
      </div>
      {isHandwritingOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-6xl h-[90vh]">
            <HandwritingCanvas 
              initialData={handwritingData}
              onSave={handleSaveHandwriting}
              onExportImage={handleExportHandwritingImage}
              onClose={() => setIsHandwritingOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteView;
