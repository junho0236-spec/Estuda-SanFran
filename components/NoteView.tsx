import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; // Import Quill styles
import { ArrowLeft, Save, Loader2, FileText, BrainCircuit, Sparkles, Tag, Split, Download, Gavel, Plus, Trash2, Edit3, Pencil, Archive, Maximize2, Minimize2, Star } from 'lucide-react';
import { Note, Subject, SubjectFile } from '../types';
import { dataService } from '../services/dataService';
import { summarizeText, generateFlashcardFromHighlight } from '../services/geminiService';
import html2pdf from 'html2pdf.js';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { SmartText } from './SmartVadeMecum';
import * as pdfjsLib from 'pdfjs-dist';
import { Folder, Upload, File, CheckCircle2, AlertCircle, X } from 'lucide-react';
import HandwritingCanvas from './HandwritingCanvas';
import DocsToolbar from './DocsToolbar';
import { toast } from 'sonner';

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
const SizeStyle = new Parchment.StyleAttributor('size', 'font-size', {
  scope: Parchment.Scope.INLINE
});
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
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [promptModal, setPromptModal] = useState<{ isOpen: boolean; title: string; defaultValue: string; onConfirm: (value: string) => void } | null>(null);
  
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
          toast.error("Erro ao carregar imagem.");
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
      const url = `https://www.google.com/search?q=site:planalto.gov.br+${encodeURIComponent(text)}`;
      quill.formatText(range.index, range.length, 'link', url);
    } else {
      setPromptModal({
        isOpen: true,
        title: 'Citação Legal',
        defaultValue: '',
        onConfirm: (val) => {
          if (val) {
            const url = `https://www.google.com/search?q=site:planalto.gov.br+${encodeURIComponent(val)}`;
            const index = range ? range.index : quill.getLength();
            quill.insertText(index, val, 'link', url);
          }
          setPromptModal(null);
        }
      });
    }
  }, []);

  const modules = useMemo(() => ({
    history: { delay: 1000, maxStack: 500 },
    table: true,
    toolbar: false,
  }), []);

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
          formats: formats,
        });

        quillRef.current.on('text-change', () => {
          const html = node.querySelector('.ql-editor')?.innerHTML || '';
          setNoteContent(html);
        });

        quillRef.current.on('selection-change', (range: any) => {
          if (range && range.length > 0) {
            const bounds = quillRef.current?.getBounds(range.index, range.length);
            if (bounds) {
              setSelectionRange(range);
              setFloatingMenuPos({
                top: bounds.top - 40,
                left: bounds.left + bounds.width / 2
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
      contentInitializedRef.current = false;
    }
  }, [modules]); // Depende de modules para reinicializar se necessário

  // Sync content from state to editor when note is loaded or changed
  useEffect(() => {
    if (quillRef.current && !isLoading) {
      if (selectedNote) {
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
      } else {
        // Clear editor if no note is selected
        quillRef.current.setContents([]);
        setNoteContent('');
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
      toast.error('Erro ao carregar dados.');
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

  const createNewNote = async () => {
    setPromptModal({
      isOpen: true,
      title: 'Título do novo documento',
      defaultValue: '',
      onConfirm: async (title) => {
        if (!title) {
          setPromptModal(null);
          return;
        }

        const newNote: Note = {
          id: crypto.randomUUID(),
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
          toast.error("Erro ao criar documento.");
        }
        setPromptModal(null);
      }
    });
  };

  const deleteNote = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Documento',
      message: 'Deseja realmente excluir este documento? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
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
        setConfirmModal(null);
      }
    });
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
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Arquivo',
      message: 'Deseja realmente excluir este arquivo? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await dataService.deleteFile(id, userId, isOnline);
          setFiles(prev => prev.filter(f => f.id !== id));
          if (selectedFile?.id === id) setSelectedFile(null);
          toast.success("Arquivo excluído.");
        } catch (error) {
          console.error("Error deleting file:", error);
          toast.error("Erro ao excluir arquivo.");
        }
        setConfirmModal(null);
      }
    });
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
    if (!selectedNote) return;
    setIsExportMenuOpen(false);
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif;">
        <h1 style="color: #1e293b; margin-bottom: 20px;">${selectedNote.title || 'Sem título'}</h1>
        <div style="color: #334155; line-height: 1.6;">${noteContent}</div>
      </div>
    `;
    const opt = {
      margin: 1,
      filename: `${selectedNote.title || 'anotacao'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(element).save();
    toast.success('PDF gerado com sucesso!');
  };

  const handleExportDocx = async () => {
    if (!selectedNote) return;
    setIsExportMenuOpen(false);
    toast.info('Gerando documento Word...');
    
    try {
      const plainText = new DOMParser().parseFromString(noteContent, 'text/html').body.textContent || '';
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: selectedNote.title || 'Sem título',
              heading: 'Heading1',
            }),
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
      link.download = `${selectedNote.title || 'anotacao'}.docx`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Documento Word gerado!');
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      toast.error('Erro ao exportar para Word.');
    }
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
      <div className="flex items-center justify-center h-full">
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
    <div className={`flex flex-col animate-in slide-in-from-right-4 duration-500 transition-all duration-500 ${isMaximized ? 'is-maximized fixed inset-0 z-[100] bg-white dark:bg-[#0d0303] h-full' : 'w-full min-h-[calc(100vh-10rem)]'}`}>
      
      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{confirmModal.title}</h3>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500">{confirmModal.message}</p>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Confirmar
                </button>
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="px-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 space-y-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{promptModal.title}</h3>
              <input 
                type="text" 
                autoFocus
                defaultValue={promptModal.defaultValue}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    promptModal.onConfirm(e.currentTarget.value);
                  }
                }}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
              />
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    const input = document.querySelector('.fixed.inset-0.z-\\[400\\] input') as HTMLInputElement;
                    promptModal.onConfirm(input?.value || '');
                  }}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Confirmar
                </button>
                <button 
                  onClick={() => setPromptModal(null)}
                  className="px-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Selection Menu */}
      {floatingMenuPos && (
        <div 
          className="fixed z-[200] flex items-center gap-1 p-1 bg-slate-900 text-white rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
          style={{ 
            top: `${floatingMenuPos.top}px`, 
            left: `${floatingMenuPos.left}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <button 
            onClick={handleTransformToFlashcard}
            disabled={isGeneratingFlashcard}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {isGeneratingFlashcard ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
            <span className="text-[10px] font-bold whitespace-nowrap">Transformar em Flashcard</span>
          </button>
        </div>
      )}

      {/* Flashcard Confirmation Modal */}
      {showFlashcardModal && newFlashcardData && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                    <Sparkles className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Flashcard Gerado</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confira e salve no seu Anki</p>
                  </div>
                </div>
                <button onClick={() => setShowFlashcardModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Frente (Pergunta)</label>
                  <textarea 
                    value={newFlashcardData.front}
                    onChange={(e) => setNewFlashcardData({...newFlashcardData, front: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 transition-all min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Verso (Resposta)</label>
                  <textarea 
                    value={newFlashcardData.back}
                    onChange={(e) => setNewFlashcardData({...newFlashcardData, back: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 transition-all min-h-[120px]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleSaveGeneratedFlashcard}
                  className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Salvar no Anki
                </button>
                <button 
                  onClick={() => setShowFlashcardModal(false)}
                  className="px-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-slate-200"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editorial Header */}
      <header className={`relative border-b border-slate-100 dark:border-white/5 transition-all ${isMaximized ? 'py-2 px-4 mb-0 bg-slate-50 dark:bg-white/5' : 'py-4 px-6 mb-6 bg-white dark:bg-white/2'}`}>
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between ${isMaximized ? 'gap-2' : 'gap-4'}`}>
          <div className={`flex items-center gap-4 ${isMaximized ? 'scale-75 origin-left' : ''}`}>
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
          <div className={`flex flex-wrap items-center gap-2 ${isMaximized ? 'scale-75 origin-right' : ''}`}>
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
              <div className="relative">
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
              <div className="relative">
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

      <div className={`flex gap-8 ${isMaximized ? 'flex-1 overflow-hidden' : 'flex-1 min-h-[700px]'}`}>
        {/* Sidebar for Notes and Files */}
        {!isSplitView && (
          <aside className="w-80 flex flex-col bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner animate-in slide-in-from-left-4 duration-300">
            {/* Tabs */}
            <div className="flex p-3 bg-white dark:bg-black/20 border-b border-slate-100 dark:border-white/5">
              <button 
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'notes' ? 'bg-sanfran-rubi text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Notas
              </button>
              <button 
                onClick={() => setActiveTab('repository')}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'repository' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Repositório
              </button>
              <button 
                onClick={() => setActiveTab('assignments')}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'assignments' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Entregas
              </button>
            </div>

            <div className="px-8 py-6 flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                {activeTab === 'notes' ? 'Documentos' : activeTab === 'repository' ? 'PDFs / Textos' : 'Trabalhos'}
              </h3>
              {activeTab === 'notes' ? (
                <button onClick={createNewNote} className="p-2.5 bg-white dark:bg-white/10 text-sanfran-rubi hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 transition-all hover:rotate-90 flex flex-col items-center gap-1">
                  <Plus size={20} />
                  <span className="text-[7px] font-black uppercase">Novo</span>
                </button>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploading}
                  className={`p-2.5 bg-white dark:bg-white/10 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 transition-all flex flex-col items-center gap-1 ${activeTab === 'repository' ? 'text-blue-500 hover:bg-blue-50' : 'text-green-500 hover:bg-green-50'}`}
                >
                  {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                  <span className="text-[7px] font-black uppercase">Subir</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4 custom-scrollbar">
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
                    className={`group p-5 rounded-[2rem] cursor-pointer transition-all flex items-center justify-between border-2 relative overflow-hidden ${selectedNote?.id === note.id ? 'bg-white dark:bg-slate-900 border-sanfran-rubi shadow-xl -translate-y-1' : 'bg-white/50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-white/10 hover:shadow-lg'}`}
                  >
                    {/* Color accent bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getCardColor(note.id).split(' ')[2]}`}></div>
                    
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`p-3 rounded-2xl ${getCardColor(note.id)}`}>
                        <FileText size={20} />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className={`text-sm font-black truncate ${selectedNote?.id === note.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                          {note.title || 'Documento sem título'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
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
                    className={`group p-5 rounded-[2rem] cursor-pointer transition-all flex items-center justify-between border-2 relative overflow-hidden ${selectedFile?.id === file.id ? 'bg-white dark:bg-slate-900 border-' + (activeTab === 'repository' ? 'blue-500' : 'green-500') + ' shadow-xl -translate-y-1' : 'bg-white/50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-white/10 hover:shadow-lg'}`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${activeTab === 'repository' ? 'bg-blue-500' : 'bg-green-500'}`}></div>

                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`p-3 rounded-2xl ${selectedFile?.id === file.id ? (activeTab === 'repository' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white') : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                        <File size={20} />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className={`text-sm font-black truncate ${selectedFile?.id === file.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                          {file.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
              
              {((activeTab === 'notes' && notes.length === 0) || (activeTab !== 'notes' && files.filter(f => f.type === (activeTab === 'repository' ? 'repository' : 'assignment')).length === 0)) && !isLoading && (
                <div className="text-center py-20 px-8">
                  <div className="w-20 h-20 bg-white dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 dark:border-white/5">
                    <Archive size={32} className="text-slate-200" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Vazio</p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">Nenhum item encontrado nesta categoria.</p>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Editor Area or File Preview */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className={`flex-1 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-2xl relative flex flex-col transition-all duration-500 ${isMaximized ? 'rounded-none border-0' : 'rounded-3xl border'}`}>
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
                    onClick={createNewNote} 
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
                <div className={`flex-1 flex flex-col transition-all duration-500 ${isMaximized ? 'p-0' : 'p-6 md:p-10 min-h-[600px]'}`}>
                  <DocsToolbar 
                    quillRef={quillRef} 
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
                    onNew={createNewNote}
                    onOpen={() => onToggleSidebar(true)}
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
                      setPromptModal({
                        isOpen: true,
                        title: 'Margens (em cm)',
                        defaultValue: '2.5',
                        onConfirm: (margins) => {
                          if (margins && quillRef.current) {
                            quillRef.current.root.style.padding = `${parseFloat(margins) * 37.8}px`;
                            toast.success(`Margens ajustadas para ${margins}cm.`);
                          }
                          setPromptModal(null);
                        }
                      });
                    }}
                    onLegalCitation={legalCitationHandler}
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
                  
                  {/* Ruler */}
                  {showRuler && !isVadeMecumMode && (
                    <div className="h-6 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-white/10 flex items-center px-10 relative overflow-hidden">
                      {/* Left Margin Marker */}
                      <div className="absolute left-10 top-0 z-10 flex flex-col items-center">
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-blue-600"></div>
                        <div className="w-[2px] h-2 bg-blue-600"></div>
                      </div>
                      
                      {/* Right Margin Marker */}
                      <div className="absolute right-10 top-0 z-10 flex flex-col items-center">
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-blue-600"></div>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-between px-10 opacity-30 pointer-events-none">
                        {[...Array(20)].map((_, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <div className="h-2 w-px bg-slate-400"></div>
                            <span className="text-[8px] mt-0.5">{i}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equation Toolbar */}
                  {showEquationToolbar && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-4 animate-in slide-in-from-top duration-200">
                      <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 px-2">Equação</span>
                      <div className="flex gap-2">
                        {['∑', '∏', '∫', '√', '∞', '≠', '≈', '≤', '≥'].map(sym => (
                          <button key={sym} onClick={() => quillRef.current?.insertText(quillRef.current.getSelection()?.index || 0, sym)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-blue-500 hover:text-white transition-all font-serif">
                            {sym}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions Mode Banner */}
                  {editMode === 'suggesting' && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between px-4 animate-in slide-in-from-top duration-200">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                        <Sparkles size={16} />
                        <span>Você está no modo de <strong>Sugestão</strong>. Suas edições serão marcadas para revisão.</span>
                      </div>
                      <button onClick={() => setEditMode('editing')} className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline">Voltar para Edição</button>
                    </div>
                  )}

                  <div className="flex-1 flex overflow-hidden relative z-0">
                    <div 
                      className={`flex-1 quill-editor-custom overflow-y-auto ${showPrintLayout && !isPageless ? 'paper-effect p-4 md:p-8' : 'bg-white dark:bg-[#1a1a1a]'} ${showNonPrintingChars ? 'show-non-printing' : ''} relative`}
                      onClick={() => {
                        const editor = document.querySelector('.ql-editor') as HTMLElement;
                        if (editor) {
                          editor.focus();
                        } else {
                          const mainEditor = document.querySelector('[contenteditable="true"]') as HTMLElement;
                          if (mainEditor) mainEditor.focus();
                        }
                      }}
                    >
                      <div 
                        ref={onEditorRef} 
                        className={`flex-1 ${showPrintLayout && !isPageless ? `shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)] ${pageOrientation === 'portrait' ? 'max-w-[816px] min-h-[1056px]' : 'max-w-[1056px] min-h-[816px]'} mx-auto border border-slate-200 dark:border-white/10` : 'h-full w-full max-w-[1200px] mx-auto'}`} 
                        style={{
                          transform: zoom !== '100%' ? `scale(${parseInt(zoom) / 100})` : 'none',
                          transformOrigin: 'top center',
                          transition: 'transform 0.2s ease-in-out'
                        }}
                      />
                    </div>

                    {/* Comments Sidebar */}
                    {showComments && (
                      <aside className="w-80 bg-slate-50 dark:bg-white/5 border-l border-slate-200 dark:border-white/10 p-6 animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comentários</h4>
                          <button onClick={() => setShowComments(false)} className="text-slate-400 hover:text-slate-600"><Minimize2 size={16} /></button>
                        </div>
                        <div className="space-y-4">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5">
                            <p className="text-xs text-slate-500 italic">Nenhum comentário neste documento.</p>
                          </div>
                        </div>
                      </aside>
                    )}
                  </div>
                </div>
              )
            ) : (
              !selectedFile ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-8 p-12 text-center">
                  <div className="w-32 h-32 bg-slate-50 dark:bg-white/5 rounded-[3rem] flex items-center justify-center animate-float shadow-inner">
                    <Folder size={64} className="opacity-10" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Seu Repositório</h3>
                    <p className="text-sm font-medium max-w-sm mx-auto text-slate-500 leading-relaxed">Suba PDFs, doutrinas ou enunciados para ter tudo organizado em um só lugar e gerar flashcards instantâneos.</p>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className={`px-10 py-5 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 ${activeTab === 'repository' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'}`}
                  >
                    Enviar Arquivo
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-12 md:p-16 overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-16 p-10 bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-slate-100 dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-8">
                      <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl ${activeTab === 'repository' ? 'bg-blue-500 text-white shadow-blue-500/30' : 'bg-green-500 text-white shadow-green-500/30'}`}>
                        <File size={40} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3">{selectedFile.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Enviado em {new Date(selectedFile.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <a 
                        href={selectedFile.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="py-4 px-8 bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all border border-slate-200 dark:border-white/10 shadow-sm"
                      >
                        Abrir Arquivo
                      </a>
                      <button 
                        onClick={() => handleGenerateFlashcardsFromFile(selectedFile)}
                        className="py-4 px-8 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-4 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/30"
                      >
                        <BrainCircuit size={20} /> Gerar Flashcards
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-slate-50 dark:bg-black/20 rounded-[3rem] p-10 overflow-y-auto border border-slate-100 dark:border-white/5 shadow-inner">
                    <div className="flex items-center gap-4 mb-8">
                      <Sparkles size={20} className="text-amber-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Conteúdo Extraído por IA</h4>
                    </div>
                    {selectedFile.content ? (
                      <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-loose text-lg font-medium">
                        {selectedFile.content}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-32 text-slate-400 italic">
                        <AlertCircle size={64} className="mb-6 opacity-5" />
                        <p className="text-lg font-bold tracking-tight">Nenhum texto extraído deste arquivo.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
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
