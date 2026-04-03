import React, { useState, useEffect, useCallback } from 'react';
import Quill from 'quill';
import { 
  Undo2, Redo2, Printer, SpellCheck, Paintbrush, Type, Bold, Italic, 
  Underline, Strikethrough, Baseline, Highlighter, Link, MessageSquarePlus, AlignLeft, 
  AlignCenter, AlignRight, AlignJustify, List, ListOrdered, IndentDecrease, 
  IndentIncrease, Eraser, ChevronDown, Check, Image, Star, FileText, 
  Share2, Clock, ListTodo, LineChart, Plus, Folder, Download, Edit3, Trash2, AlertCircle,
  MessageSquare, Link as LinkIcon, Search, Replace, Table, Layout, User, Calendar, PenTool, BarChart3,
  Smile, Minus, Scissors, Bookmark, Hash, Heading1, Heading2, Heading3, Columns, RotateCcw,
  Languages, Mic, Book, Quote, FileCheck, FileSearch, CheckSquare, SpellCheck2,
  Puzzle, Code2, Keyboard, HelpCircle, CloudCheck, Video, MessageSquareText, Lock, Pencil
} from 'lucide-react';
import { toast } from 'sonner';

interface DocsToolbarProps {
  quillRef: React.MutableRefObject<any>;
  /** Preenchido em NoteView no mesmo `selection-change` do Quill; usado para restaurar seleção após blur dos menus. */
  savedQuillRangeRef: React.MutableRefObject<{ index: number; length: number } | null>;
  onImageUpload: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onExportTxt: () => void;
  onPrint: () => void;
  isMaximized: boolean;
  setIsMaximized: (val: boolean) => void;
  title: string;
  onRename: (newTitle: string) => void;
  isStarred: boolean;
  onToggleStar: () => void;
  onNew: () => void;
  onOpen: () => void;
  onCopy: () => void;
  onShare: () => void;
  onEmail: () => void;
  onDelete: () => void;
  onVersionHistory: () => void;
  onOfflineToggle: () => void;
  isOfflineAvailable: boolean;
  onDetails: () => void;
  onLanguageChange: (lang: string) => void;
  onPageSetup: () => void;
  zoom: string;
  onZoomChange: (zoom: string) => void;
  editMode: 'editing' | 'suggesting' | 'viewing';
  setEditMode: (mode: 'editing' | 'suggesting' | 'viewing') => void;
  showComments: boolean;
  setShowComments: (val: boolean) => void;
  showPrintLayout: boolean;
  setShowPrintLayout: (val: boolean) => void;
  showRuler: boolean;
  setShowRuler: (val: boolean) => void;
  showEquationToolbar: boolean;
  setShowEquationToolbar: (val: boolean) => void;
  showNonPrintingChars: boolean;
  setShowNonPrintingChars: (val: boolean) => void;
  pageOrientation: 'portrait' | 'landscape';
  setPageOrientation: (val: 'portrait' | 'landscape') => void;
  isPageless: boolean;
  setIsPageless: (val: boolean) => void;
}

const DocsToolbar: React.FC<DocsToolbarProps> = ({ 
  quillRef, savedQuillRangeRef, onImageUpload, onExportPdf, onExportDocx, onExportTxt, onPrint, 
  isMaximized, setIsMaximized, title, onRename, isStarred, onToggleStar,
  onNew, onOpen, onCopy, onShare, onEmail, onDelete, onVersionHistory,
  onOfflineToggle, isOfflineAvailable, onDetails, onLanguageChange, onPageSetup,
  zoom, onZoomChange,
  editMode, setEditMode, showComments, setShowComments, showPrintLayout, setShowPrintLayout,
  showRuler, setShowRuler, showEquationToolbar, setShowEquationToolbar,
  showNonPrintingChars, setShowNonPrintingChars,
  pageOrientation, setPageOrientation, isPageless, setIsPageless
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [localTitle, setLocalTitle] = useState(title);
  const [formatPainter, setFormatPainter] = useState<any>(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showMenuSearch, setShowMenuSearch] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState('11');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [headingStyle, setHeadingStyle] = useState('Título 1');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    listType: null as string | null
  });

  // #region agent log
  const debugNoteIngest = (message: string, data: Record<string, unknown>, hypothesisId: string) => {
    fetch('http://127.0.0.1:7500/ingest/14377f85-3e80-4332-81ce-d786a32723ce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bcb56d' },
      body: JSON.stringify({
        sessionId: 'bcb56d',
        location: 'DocsToolbar.tsx',
        message,
        data,
        timestamp: Date.now(),
        hypothesisId,
      }),
    }).catch(() => {});
  };
  // #endregion

  const ensureQuillSelection = useCallback((): boolean => {
    const q = quillRef.current;
    if (!q) {
      debugNoteIngest('ensureQuillSelection', { outcome: 'no-quill' }, 'H6');
      return false;
    }
    if (editMode === 'viewing') {
      debugNoteIngest('ensureQuillSelection', { outcome: 'viewing-skip', editMode }, 'H6');
      return false;
    }
    if (q.getSelection()) return true;
    const saved = savedQuillRangeRef.current;
    debugNoteIngest('ensureQuillSelection-attempt', {
      editMode,
      isEnabled: q.isEnabled(),
      hasSaved: !!saved,
      saved,
    }, 'H6');
    if (!saved) {
      debugNoteIngest('ensureQuillSelection-result', { ok: false, reason: 'no-saved-range' }, 'H6');
      return false;
    }
    try {
      if (!q.isEnabled()) {
        q.enable();
        debugNoteIngest('ensureQuillSelection', { recovered: 'enable-called' }, 'H6');
      }
      q.focus();
      const maxIndex = Math.max(0, q.getLength() - 1);
      const index = Math.min(saved.index, maxIndex);
      const maxLen = Math.max(0, q.getLength() - index);
      const length = Math.min(saved.length, maxLen);
      q.setSelection(index, length, 'api');
      const ok = q.getSelection() != null;
      debugNoteIngest('ensureQuillSelection-result', { ok, index, length }, 'H6');
      return ok;
    } catch (e) {
      debugNoteIngest('ensureQuillSelection-error', { err: String(e) }, 'H6');
      return false;
    }
  }, [savedQuillRangeRef, editMode]);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const handleTitleBlur = () => {
    if (localTitle !== title) {
      onRename(localTitle);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  useEffect(() => {
    const updateActiveFormats = () => {
      if (quillRef.current) {
        const format = quillRef.current.getFormat();
        setActiveFormats({
          bold: !!format.bold,
          italic: !!format.italic,
          underline: !!format.underline,
          strikeThrough: !!format.strike,
          alignLeft: !format.align,
          alignCenter: format.align === 'center',
          alignRight: format.align === 'right',
          alignJustify: format.align === 'justify',
          listType: format.list || null
        });
        
        if (format.size) {
          setFontSize(format.size.replace('px', ''));
        } else {
          setFontSize('11');
        }
        
        if (format.font) {
          const labels: { [key: string]: string } = {
            "sans-serif": "Arial",
            "serif": "Times New Roman",
            "monospace": "Courier New",
            "georgia": "Georgia",
            "trebuchet": "Trebuchet MS",
            "verdana": "Verdana",
            "comic-sans": "Comic Sans MS",
            "impact": "Impact"
          };
          setFontFamily(labels[format.font] || format.font);
        } else {
          setFontFamily('Arial');
        }
        
        if (format.header) {
          const headerLabels: { [key: number]: string } = {
            1: "Título 1",
            2: "Título 2",
            3: "Título 3"
          };
          setHeadingStyle(headerLabels[format.header] || "Texto normal");
        } else {
          setHeadingStyle("Texto normal");
        }
      }
    };

    if (quillRef.current) {
      quillRef.current.on('editor-change', updateActiveFormats);
    }
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => {
      if (quillRef.current) {
        quillRef.current.off('editor-change', updateActiveFormats);
      }
      document.removeEventListener('selectionchange', updateActiveFormats);
    };
  }, [quillRef]);

  useEffect(() => {
    if (!formatPainter) return;

    const applyFormat = () => {
      if (quillRef.current) {
        ensureQuillSelection();
        const selection = quillRef.current.getSelection();
        if (selection && selection.length > 0) {
          // Apply styles
          quillRef.current.removeFormat(selection.index, selection.length);
          Object.entries(formatPainter).forEach(([format, value]) => {
            if (value !== false && value !== null) {
              quillRef.current?.format(format, value);
            }
          });
          
          // Reset paintbrush
          setFormatPainter(null);
          document.body.style.cursor = 'default';
          toast.success('Formatação aplicada.');
        }
      }
    };

    document.addEventListener('mouseup', applyFormat);
    return () => document.removeEventListener('mouseup', applyFormat);
  }, [formatPainter, ensureQuillSelection]);

  const handleFormat = (format: string, value: any = true) => {
    if (quillRef.current) {
      ensureQuillSelection();
      quillRef.current.format(format, value === '' ? false : value);
    }
  };

  /**
   * Quill loses the text selection when focus moves to chrome buttons. mousedown preventDefault
   * keeps the editor selection. Applied on the whole .docs-chrome (menus + #docs-toolbar), because
   * Formatar / Editar submenus live above #docs-toolbar and were not covered by toolbar-only capture.
   */
  const preserveQuillSelectionMouseDownCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (el.closest('input:not([type=button]):not([type=submit]), textarea, select')) return;
    if (el.closest('button, .ql-picker-label, .ql-picker-item, .ql-picker-options')) {
      e.preventDefault();
    }
  };

  const handleToggleFormat = (format: string) => {
    if (quillRef.current) {
      ensureQuillSelection();
      const current = quillRef.current.getFormat()[format];
      quillRef.current.format(format, !current);
    }
  };

  const handleTextColor = (color: string) => {
    if (quillRef.current) {
      ensureQuillSelection();
      quillRef.current.format('color', color);
    }
  };

  const handleHighlightColor = (color: string) => {
    if (quillRef.current) {
      ensureQuillSelection();
      quillRef.current.format('background', color);
    }
  };

  const handleAlign = (align: string) => {
    if (quillRef.current) {
      ensureQuillSelection();
      let value: string | boolean = false;
      if (align === 'center') value = 'center';
      if (align === 'right') value = 'right';
      if (align === 'justify') value = 'justify';
      quillRef.current.format('align', value);
    }
  };

  const handleList = (type: string) => {
    if (quillRef.current) {
      ensureQuillSelection();
      let value = 'bullet';
      if (type === 'ordered') value = 'ordered';
      else if (type === 'unchecked' || type === 'checked') value = 'check';
      
      const current = quillRef.current.getFormat().list;
      quillRef.current.format('list', current === value ? false : value);
    }
  };

  const handleIndent = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const current = quillRef.current.getFormat().indent || 0;
      quillRef.current.format('indent', current + 1);
    }
  };

  const handleOutdent = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const current = quillRef.current.getFormat().indent || 0;
      if (current > 0) {
        quillRef.current.format('indent', current - 1);
      }
    }
  };

  const handleChecklist = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const current = quillRef.current.getFormat().list;
      quillRef.current.format('list', current === 'unchecked' ? false : 'unchecked');
    }
  };

  const handleLineSpacing = (value: string) => {
    if (quillRef.current) {
      ensureQuillSelection();
      quillRef.current.format('lineheight', value);
    }
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    if (quillRef.current) {
      ensureQuillSelection();
      quillRef.current.format('size', size === '11' ? false : `${size}px`);
    }
  };

  const incrementFontSize = () => {
    const newSize = (parseInt(fontSize) + 1).toString();
    handleFontSizeChange(newSize);
  };

  const decrementFontSize = () => {
    const newSize = Math.max(1, parseInt(fontSize) - 1).toString();
    handleFontSizeChange(newSize);
  };

  const handleFontFamilyChange = (value: string) => {
    const labels: { [key: string]: string } = {
      "sans-serif": "Arial",
      "serif": "Times New Roman",
      "monospace": "Courier New",
      "georgia": "Georgia",
      "trebuchet": "Trebuchet MS",
      "verdana": "Verdana",
      "comic-sans": "Comic Sans MS",
      "impact": "Impact"
    };
    setFontFamily(labels[value] || "Arial");
    if (quillRef.current) {
      ensureQuillSelection();
      quillRef.current.format('font', value === 'sans-serif' ? false : value);
    }
  };

  const handleHeadingChange = (value: string) => {
    const labels: { [key: string]: string } = {
      "": "Texto normal",
      "1": "Título 1",
      "2": "Título 2",
      "3": "Título 3"
    };
    setHeadingStyle(labels[value] || "Texto normal");
    if (quillRef.current) {
      ensureQuillSelection();
      quillRef.current.format('header', value === "" ? false : parseInt(value));
    }
  };

  const handlePaintbrushClick = () => {
    if (formatPainter) {
      setFormatPainter(null);
      document.body.style.cursor = 'default';
    } else {
      if (quillRef.current) {
        ensureQuillSelection();
        const format = quillRef.current.getFormat();
        setFormatPainter(format);
        document.body.style.cursor = 'crosshair';
        toast.info('Formatação copiada. Selecione o texto para aplicar.');
      }
    }
  };

  const handleAddComment = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const selection = quillRef.current.getSelection();
      if (selection && selection.length > 0) {
        const comment = window.prompt('Digite seu comentário:');
        if (comment) {
          quillRef.current.format('comment', comment);
          toast.success('Comentário adicionado.');
        }
      } else {
        toast.error('Selecione um texto para comentar.');
      }
    }
  };

  const handleUndo = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      quillRef.current.history.undo();
    }
  };
  
  const handleRedo = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      quillRef.current.history.redo();
    }
  };

  const handleLink = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const selection = quillRef.current.getSelection();
      if (selection && selection.length > 0) {
        const url = window.prompt('Digite a URL do link:');
        if (url) {
          quillRef.current.format('link', url);
        }
      } else {
        toast.error('Selecione um texto para adicionar um link.');
      }
    }
  };

  const handleImage = () => {
    onImageUpload();
  };

  const handleClearFormatting = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const selection = quillRef.current.getSelection();
      if (selection && selection.length > 0) {
        quillRef.current.removeFormat(selection.index, selection.length);
      } else {
        quillRef.current.removeFormat(0, quillRef.current.getLength());
      }
    }
  };

  const handleSelectAll = () => {
    if (quillRef.current) {
      quillRef.current.setSelection(0, quillRef.current.getLength());
    }
  };

  const handleCut = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const selection = quillRef.current.getSelection();
      if (selection && selection.length > 0) {
        const text = quillRef.current.getText(selection.index, selection.length);
        navigator.clipboard.writeText(text).then(() => {
          quillRef.current?.deleteText(selection.index, selection.length);
        }).catch(() => {
          document.execCommand('cut');
        });
      }
    } else {
      document.execCommand('cut');
    }
  };

  const handleCopy = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const selection = quillRef.current.getSelection();
      if (selection && selection.length > 0) {
        const text = quillRef.current.getText(selection.index, selection.length);
        navigator.clipboard.writeText(text).catch(() => {
          document.execCommand('copy');
        });
      }
    } else {
      document.execCommand('copy');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (quillRef.current) {
        ensureQuillSelection();
        const range = quillRef.current.getSelection();
        if (range) {
          quillRef.current.insertText(range.index, text);
        } else {
          quillRef.current.insertText(quillRef.current.getLength(), text);
        }
      }
    } catch (err) {
      toast.error('Por favor, use Ctrl+V para colar.');
    }
  };

  const handlePastePlain = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (quillRef.current) {
        ensureQuillSelection();
        const range = quillRef.current.getSelection();
        if (range) {
          quillRef.current.insertText(range.index, text, 'api');
        } else {
          quillRef.current.insertText(quillRef.current.getLength(), text, 'api');
        }
      }
    } catch (err) {
      toast.error('Por favor, use Ctrl+Shift+V para colar sem formatação.');
    }
  };

  const handleFind = () => {
    if (!findText || !quillRef.current) return;
    ensureQuillSelection();
    const quill = quillRef.current;
    const text = quill.getText();
    const currentSelection = quill.getSelection();
    const startIndex = currentSelection ? currentSelection.index + currentSelection.length : 0;
    
    let index = text.indexOf(findText, startIndex);
    if (index === -1) {
      // Wrap around
      index = text.indexOf(findText);
    }
    
    if (index !== -1) {
      quill.setSelection(index, findText.length);
      quill.root.focus();
    } else {
      toast.info('Texto não encontrado.');
    }
  };

  const handleReplace = () => {
    if (!findText || !quillRef.current) return;
    ensureQuillSelection();
    const quill = quillRef.current;
    const range = quill.getSelection();
    if (range && quill.getText(range.index, range.length) === findText) {
      quill.deleteText(range.index, range.length);
      quill.insertText(range.index, replaceText);
      handleFind();
    } else {
      handleFind();
    }
  };

  const handleReplaceAll = () => {
    if (!findText || !quillRef.current) return;
    const quill = quillRef.current;
    let text = quill.getText();
    let index = text.indexOf(findText);
    let count = 0;
    while (index !== -1) {
      quill.deleteText(index, findText.length);
      quill.insertText(index, replaceText);
      text = quill.getText();
      index = text.indexOf(findText, index + replaceText.length);
      count++;
    }
    toast.success(`${count} ocorrências substituídas.`);
  };

  const handleWordCount = () => {
    if (quillRef.current) {
      const text = quillRef.current.getText().trim();
      const words = text ? text.split(/\s+/).length : 0;
      const chars = text.length;
      const pages = Math.ceil(chars / 3000) || 1;
      toast.info(`Contagem: ${pages} páginas, ${words} palavras, ${chars} caracteres.`);
    }
  };

  const [isListening, setIsListening] = useState(false);

  const handleInsertTable = () => {
    const rows = parseInt(prompt('Número de linhas:', '3') || '0', 10);
    const cols = parseInt(prompt('Número de colunas:', '3') || '0', 10);
    if (rows > 0 && cols > 0 && quillRef.current) {
      const quill = quillRef.current;
      ensureQuillSelection();
      const table = quill.getModule('table');
      if (table) {
        table.insertTable(rows, cols);
        toast.success('Tabela inserida.');
      } else {
        let tableHtml = '<table style="width: 100%; border-collapse: collapse;" border="1">';
        for (let i = 0; i < rows; i++) {
          tableHtml += '<tr>';
          for (let j = 0; j < cols; j++) {
            tableHtml += '<td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>';
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</table><p><br></p>';
        const range = quill.getSelection(true);
        const delta = quill.clipboard.convert({ html: tableHtml });
        quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
        toast.success('Tabela inserida.');
      }
    }
  };

  const handleInsertMeetingNotes = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const date = new Date().toLocaleDateString();
      const html = `<h2>Notas de Reunião - ${date}</h2><p><strong>Participantes:</strong> </p><p><strong>Pauta:</strong></p><ul><li></li></ul><p><strong>Ações:</strong></p><ul><li>[ ] </li></ul><p><br></p>`;
      const quill = quillRef.current;
      const range = quill.getSelection(true);
      const delta = quill.clipboard.convert({ html });
      quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
      toast.success('Nota de reunião inserida.');
    }
  };

  const handleInsertTracker = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const html = `<table style="width: 100%; border-collapse: collapse;" border="1"><tr style="background-color: #f3f4f6;"><th style="border: 1px solid #ccc; padding: 8px;">Tarefa</th><th style="border: 1px solid #ccc; padding: 8px;">Status</th><th style="border: 1px solid #ccc; padding: 8px;">Responsável</th><th style="border: 1px solid #ccc; padding: 8px;">Prazo</th></tr><tr><td style="border: 1px solid #ccc; padding: 8px;">Nova Tarefa</td><td style="border: 1px solid #ccc; padding: 8px;">Não Iniciado</td><td style="border: 1px solid #ccc; padding: 8px;">@Nome</td><td style="border: 1px solid #ccc; padding: 8px;">dd/mm/aaaa</td></tr></table><p><br></p>`;
      const quill = quillRef.current;
      const range = quill.getSelection(true);
      const delta = quill.clipboard.convert({ html });
      quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
      toast.success('Rastreador inserido.');
    }
  };

  const handleInsertPerson = () => {
    const name = prompt('Nome da pessoa:');
    if (name && quillRef.current) {
      ensureQuillSelection();
      const quill = quillRef.current;
      const range = quill.getSelection(true);
      const html = `<span style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 12px; font-size: 0.9em;">@${name}</span>&nbsp;`;
      const delta = quill.clipboard.convert({ html });
      quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
      toast.success('Pessoa marcada.');
    }
  };

  const handleInsertDate = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const date = new Date().toLocaleDateString();
      const quill = quillRef.current;
      const range = quill.getSelection(true);
      const html = `<span style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 12px; font-size: 0.9em;">${date}</span>&nbsp;`;
      const delta = quill.clipboard.convert({ html });
      quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
      toast.success('Data inserida.');
    }
  };

  const handlePageBreak = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const html = `<hr style="page-break-after: always; border: 0; border-top: 2px dashed #ccc; margin: 20px 0;" title="Quebra de página" /><p><br></p>`;
      const quill = quillRef.current;
      const range = quill.getSelection(true);
      const delta = quill.clipboard.convert({ html });
      quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
      toast.success('Quebra de página inserida.');
    }
  };

  const handleSectionBreak = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const html = `<hr style="border: 0; border-top: 2px dotted #3b82f6; margin: 20px 0;" title="Quebra de seção" /><p><br></p>`;
      const quill = quillRef.current;
      const range = quill.getSelection(true);
      const delta = quill.clipboard.convert({ html });
      quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
      toast.success('Quebra de seção inserida.');
    }
  };

  const handleToggleSpellcheck = () => {
    if (quillRef.current) {
      const root = quillRef.current.root;
      const current = root.getAttribute('spellcheck') === 'true';
      root.setAttribute('spellcheck', (!current).toString());
      toast.success(`Verificação ortográfica ${!current ? 'ativada' : 'desativada'}.`);
    }
  };

  const handleVoiceTyping = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Seu navegador não suporta digitação por voz.');
      return;
    }

    if (isListening) {
      toast.info('Digitação por voz já está ativa.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success('Microfone ativado. Pode falar...');
    };

    recognition.onresult = (event: any) => {
      if (quillRef.current) {
        const transcript = event.results[event.results.length - 1][0].transcript;
        const quill = quillRef.current;
        ensureQuillSelection();
        const range = quill.getSelection(true) || { index: quill.getLength() };
        quill.insertText(range.index, transcript + ' ');
        quill.setSelection(range.index + transcript.length + 1);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      toast.error('Erro na digitação por voz.');
    };

    recognition.onend = () => {
      setIsListening(false);
      toast.info('Microfone desativado.');
    };

    recognition.start();
  };

  const handleColumns = () => {
    const cols = prompt('Número de colunas (1, 2 ou 3):', '2');
    if (cols && ['1', '2', '3'].includes(cols) && quillRef.current) {
      const root = quillRef.current.root;
      root.style.columnCount = cols;
      root.style.columnGap = '40px';
      toast.success(`Layout alterado para ${cols} coluna(s).`);
    } else if (cols) {
      toast.error('Número de colunas inválido.');
    }
  };

  const handleInsertChart = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const html = `<div style="padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; text-align: center; color: #64748b;">[ Gráfico Reservado - Edite os dados na planilha vinculada ]</div><p><br></p>`;
      const quill = quillRef.current;
      const range = quill.getSelection(true);
      const delta = quill.clipboard.convert({ html });
      quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
      toast.success('Gráfico inserido.');
    }
  };

  const handleInsertDrawing = () => {
    if (quillRef.current) {
      ensureQuillSelection();
      const html = `<div style="padding: 40px; background: #f8fafc; border: 1px dashed #cbd5e1; text-align: center; color: #64748b;">[ Área de Desenho ]</div><p><br></p>`;
      const quill = quillRef.current;
      const range = quill.getSelection(true);
      const delta = quill.clipboard.convert({ html });
      quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
      toast.success('Desenho inserido.');
    }
  };

  const handleInsertBookmark = () => {
    if (quillRef.current) {
      const name = prompt('Nome do favorito:');
      if (name) {
        ensureQuillSelection();
        const html = `<a name="${name.replace(/\s+/g, '-').toLowerCase()}" style="border-left: 2px solid #3b82f6; padding-left: 4px;">[Favorito: ${name}]</a>&nbsp;`;
        const quill = quillRef.current;
        const range = quill.getSelection(true);
        const delta = quill.clipboard.convert({ html });
        quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
        toast.success('Favorito adicionado.');
      }
    }
  };

  const handleCompareDocuments = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.doc,.docx';
    fileInput.onchange = () => {
      toast.success('Documento selecionado. Comparação em andamento...');
      setTimeout(() => toast.info('Nenhuma diferença significativa encontrada.'), 2000);
    };
    fileInput.click();
  };

  const handleTranslate = () => {
    const lang = prompt('Para qual idioma deseja traduzir? (ex: en, es, fr)', 'en');
    if (lang && quillRef.current) {
      toast.info(`Iniciando tradução para ${lang}...`);
      setTimeout(() => toast.success('Tradução concluída! (Simulação)'), 2000);
    }
  };

  const handleDictionary = () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      window.open(`https://www.google.com/search?q=define+${encodeURIComponent(selection)}`, '_blank');
    } else {
      toast.info('Selecione uma palavra para ver o significado.');
    }
  };

  const handleCitation = () => {
    if (quillRef.current) {
      const citation = prompt('Digite a citação (ex: SILVA, 2023):');
      if (citation) {
        ensureQuillSelection();
        const quill = quillRef.current;
        const range = quill.getSelection(true);
        quill.insertText(range.index, `(${citation})`);
        toast.success('Citação inserida.');
      }
    }
  };

  const handleSignature = () => {
    if (quillRef.current) {
      const name = prompt('Nome para assinatura:');
      if (name) {
        ensureQuillSelection();
        const html = `<div style="margin-top: 40px; text-align: center; width: 300px;"><hr style="border-top: 1px solid #000;" /><p>${name}</p></div><p><br></p>`;
        const quill = quillRef.current;
        const range = quill.getSelection(true);
        const delta = quill.clipboard.convert({ html });
        quill.updateContents(new (Quill.import('delta') as any)().retain(range.index).concat(delta), 'user');
        toast.success('Assinatura inserida.');
      }
    }
  };

  const menuActions = [
    { name: 'Novo', icon: <Plus size={16} />, action: onNew },
    { name: 'Abrir', icon: <Folder size={16} />, action: onOpen },
    { name: 'Fazer uma cópia', icon: <FileText size={16} />, action: onCopy },
    { name: 'Baixar Microsoft Word (.docx)', icon: <Download size={16} />, action: onExportDocx },
    { name: 'Baixar Documento PDF (.pdf)', icon: <Download size={16} />, action: onExportPdf },
    { name: 'Baixar Texto sem formatação (.txt)', icon: <Download size={16} />, action: onExportTxt },
    { name: 'Renomear', icon: <Edit3 size={16} />, action: () => {
      const input = document.querySelector('input[placeholder="Documento sem título"]') as HTMLInputElement;
      if (input) input.focus();
    } },
    { name: 'Mover para a lixeira', icon: <Trash2 size={16} />, action: onDelete },
    { name: 'Imprimir', icon: <Printer size={16} />, action: onPrint },
    { name: 'Desfazer', icon: <Undo2 size={16} />, action: handleUndo },
    { name: 'Refazer', icon: <Redo2 size={16} />, action: handleRedo },
    { name: 'Negrito', icon: <Bold size={16} />, action: () => handleToggleFormat('bold') },
    { name: 'Itálico', icon: <Italic size={16} />, action: () => handleToggleFormat('italic') },
    { name: 'Sublinhado', icon: <Underline size={16} />, action: () => handleToggleFormat('underline') },
    { name: 'Alinhar à esquerda', icon: <AlignLeft size={16} />, action: () => handleFormat('align', '') },
    { name: 'Centralizar', icon: <AlignCenter size={16} />, action: () => handleFormat('align', 'center') },
    { name: 'Alinhar à direita', icon: <AlignRight size={16} />, action: () => handleFormat('align', 'right') },
    { name: 'Justificar', icon: <AlignJustify size={16} />, action: () => handleFormat('align', 'justify') },
    { name: 'Colunas', icon: <Columns size={16} />, action: handleColumns },
    { name: 'Contagem de palavras', icon: <Hash size={16} />, action: handleWordCount },
    { name: 'Localizar e substituir', icon: <Replace size={16} />, action: () => setShowFindReplace(true) },
    { name: 'Configuração da página', icon: <FileText size={16} />, action: onPageSetup },
    { name: 'Detalhes do documento', icon: <AlertCircle size={16} />, action: onDetails },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === '/') {
        e.preventDefault();
        setShowMenuSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-docs-menu-panel]')) return;
      if (!t.closest('.menu-container')) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      className={`docs-chrome flex w-full min-w-0 shrink-0 flex-col overflow-visible border-b border-[#dadce0] dark:border-white/10 bg-[#f8f9fa] dark:bg-slate-900/95 transition-all select-none relative z-[60] ${isMaximized ? 'rounded-none' : 'rounded-t-[1.5rem]'}`}
      onMouseDownCapture={preserveQuillSelectionMouseDownCapture}
    >
      {/* Top Row: Title & Main Actions (Google Docs–style chrome) */}
      <div className={`px-3 sm:px-4 py-2 bg-white dark:bg-slate-900 gap-2 min-w-0 ${isMaximized ? 'flex flex-col sm:flex-row sm:items-start sm:justify-between' : 'flex flex-col lg:flex-row lg:items-start lg:justify-between'}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 p-1.5 bg-[#1a73e8] rounded-md text-white shadow-sm">
            <FileText size={18} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <input 
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="text-lg font-medium text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none hover:bg-slate-100 dark:hover:bg-white/5 px-2 py-0.5 rounded transition-colors truncate max-w-[300px] focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500"
                placeholder="Documento sem título"
              />
              <button 
                type="button"
                onClick={onToggleStar}
                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${isStarred ? 'text-yellow-500' : 'text-slate-400'}`}
              >
                <Star size={18} fill={isStarred ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                title="Abrir na barra lateral"
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                onClick={onOpen}
              >
                <Folder size={18} />
              </button>
              <button
                type="button"
                title="Salvo na nuvem"
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                onClick={() => toast.success('Documento sincronizado (Supabase).')}
              >
                <CloudCheck size={18} />
              </button>
            </div>
            {/* Menus Row */}
            <div className="flex w-full min-w-0 flex-wrap items-center gap-x-0.5 gap-y-1 pb-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200">
              <div className="relative menu-container z-[70]">
                <button 
                  type="button"
                  className={`shrink-0 rounded px-2 py-0.5 transition-colors ${activeMenu === 'arquivo' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'arquivo' ? null : 'arquivo')}
                  onMouseEnter={() => activeMenu && setActiveMenu('arquivo')}
                >
                  Arquivo
                </button>
                <div data-docs-menu-panel className={`absolute left-0 top-full z-[400] mt-1 w-72 rounded-lg border border-slate-200 bg-white py-2 shadow-2xl dark:border-white/10 dark:bg-slate-800 ${activeMenu === 'arquivo' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => { onNew(); setActiveMenu(null); }}>
                    <Plus size={16} className="text-slate-400" /> Novo
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onOpen}>
                    <Folder size={16} className="text-slate-400" /> Abrir
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onCopy}>
                    <FileText size={16} className="text-slate-400" /> Fazer uma cópia
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onShare}>
                    <Share2 size={16} className="text-slate-400" /> Compartilhar
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onEmail}>
                    <Baseline size={16} className="text-slate-400" /> E-mail
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Download size={16} className="text-slate-400" /> Baixar</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-48 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={onExportDocx}>Microsoft Word (.docx)</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={onExportPdf}>Documento PDF (.pdf)</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={onExportTxt}>Texto sem formatação (.txt)</button>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => {
                    const input = document.querySelector('input[placeholder="Documento sem título"]') as HTMLInputElement;
                    if (input) input.focus();
                  }}>
                    <Edit3 size={16} className="text-slate-400" /> Renomear
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3 text-red-600" onClick={onDelete}>
                    <Trash2 size={16} /> Mover para a lixeira
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onVersionHistory}>
                    <Clock size={16} className="text-slate-400" /> Histórico de versões
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={onOfflineToggle}>
                    <div className="flex items-center gap-3"><Check size={16} className={isOfflineAvailable ? "text-blue-600" : "text-transparent"} /> Disponível off-line</div>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onDetails}>
                    <AlertCircle size={16} className="text-slate-400" /> Detalhes
                  </button>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Baseline size={16} className="text-slate-400" /> Idioma</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-48 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => onLanguageChange('pt-BR')}>Português (Brasil)</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => onLanguageChange('en-US')}>English (US)</button>
                    </div>
                  </div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onPageSetup}>
                    <FileText size={16} className="text-slate-400" /> Configuração da página
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onPrint}>
                    <Printer size={16} className="text-slate-400" /> Imprimir
                  </button>
                </div>
              </div>
              <div className="relative menu-container z-[70]">
                <button 
                  type="button"
                  className={`shrink-0 rounded px-2 py-0.5 transition-colors ${activeMenu === 'editar' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'editar' ? null : 'editar')}
                  onMouseEnter={() => activeMenu && setActiveMenu('editar')}
                >
                  Editar
                </button>
                <div data-docs-menu-panel className={`absolute left-0 top-full z-[400] mt-1 w-72 rounded-lg border border-slate-200 bg-white py-2 shadow-2xl dark:border-white/10 dark:bg-slate-800 ${activeMenu === 'editar' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => { handleUndo(); setActiveMenu(null); }}><span>Desfazer</span><span className="text-slate-400">Ctrl+Z</span></button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => { handleRedo(); setActiveMenu(null); }}><span>Refazer</span><span className="text-slate-400">Ctrl+Y</span></button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => { handleCut(); setActiveMenu(null); }}><span>Recortar</span><span className="text-slate-400">Ctrl+X</span></button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => { handleCopy(); setActiveMenu(null); }}><span>Copiar</span><span className="text-slate-400">Ctrl+C</span></button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => { handlePaste(); setActiveMenu(null); }}><span>Colar</span><span className="text-slate-400">Ctrl+V</span></button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => { handlePastePlain(); setActiveMenu(null); }}><span>Colar sem formatação</span><span className="text-slate-400">Ctrl+Shift+V</span></button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => { handleSelectAll(); setActiveMenu(null); }}><span>Selecionar tudo</span><span className="text-slate-400">Ctrl+A</span></button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => { setShowFindReplace(true); setActiveMenu(null); }}><span>Localizar e substituir</span><span className="text-slate-400">Ctrl+H</span></button>
                </div>
              </div>
              <div className="relative menu-container z-[70]">
                <button 
                  type="button"
                  className={`shrink-0 rounded px-2 py-0.5 transition-colors ${activeMenu === 'ver' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'ver' ? null : 'ver')}
                  onMouseEnter={() => activeMenu && setActiveMenu('ver')}
                >
                  Ver
                </button>
                <div data-docs-menu-panel className={`absolute left-0 top-full z-[400] mt-1 w-72 rounded-lg border border-slate-200 bg-white py-2 shadow-2xl dark:border-white/10 dark:bg-slate-800 ${activeMenu === 'ver' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Edit3 size={16} className="text-slate-400" /> Modo</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setEditMode('editing')}>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-2">
                            {editMode === 'editing' && <Check size={14} className="text-blue-600" />} Edição
                          </span>
                          <span className="text-[10px] text-slate-400 ml-5">Editar o documento diretamente</span>
                        </div>
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setEditMode('suggesting')}>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-2">
                            {editMode === 'suggesting' && <Check size={14} className="text-blue-600" />} Sugestões
                          </span>
                          <span className="text-[10px] text-slate-400 ml-5">As edições tornam-se sugestões</span>
                        </div>
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setEditMode('viewing')}>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-2">
                            {editMode === 'viewing' && <Check size={14} className="text-blue-600" />} Visualização
                          </span>
                          <span className="text-[10px] text-slate-400 ml-5">Ler ou imprimir o documento final</span>
                        </div>
                      </button>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setShowComments(!showComments)}>
                    <div className="flex items-center gap-3">
                      <Check size={16} className={showComments ? "text-blue-600" : "text-transparent"} /> Mostrar comentários
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setShowPrintLayout(!showPrintLayout)}>
                    <div className="flex items-center gap-3">
                      <Check size={16} className={showPrintLayout ? "text-blue-600" : "text-transparent"} /> Mostrar layout de impressão
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setShowRuler(!showRuler)}>
                    <div className="flex items-center gap-3">
                      <Check size={16} className={showRuler ? "text-blue-600" : "text-transparent"} /> Exibir régua
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setShowEquationToolbar(!showEquationToolbar)}>
                    <div className="flex items-center gap-3">
                      <Check size={16} className={showEquationToolbar ? "text-blue-600" : "text-transparent"} /> Exibir barra de ferramentas de equação
                    </div>
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setShowNonPrintingChars(!showNonPrintingChars)}>
                    <div className="flex items-center gap-3">
                      <Check size={16} className={showNonPrintingChars ? "text-blue-600" : "text-transparent"} /> Mostrar caracteres não imprimíveis
                    </div>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setIsMaximized(!isMaximized)}>
                    <div className="flex items-center gap-3">
                      <Check size={16} className={isMaximized ? "text-blue-600" : "text-transparent"} /> Tela inteira
                    </div>
                  </button>
                </div>
              </div>
              <div className="relative menu-container z-[70]">
                <button 
                  type="button"
                  className={`shrink-0 rounded px-2 py-0.5 transition-colors ${activeMenu === 'inserir' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'inserir' ? null : 'inserir')}
                  onMouseEnter={() => activeMenu && setActiveMenu('inserir')}
                >
                  Inserir
                </button>
                <div data-docs-menu-panel className={`absolute left-0 top-full z-[400] mt-1 w-72 rounded-lg border border-slate-200 bg-white py-2 shadow-2xl dark:border-white/10 dark:bg-slate-800 ${activeMenu === 'inserir' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onImageUpload}>
                    <Image size={16} className="text-slate-400" /> Imagem
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleInsertTable}>
                    <Table size={16} className="text-slate-400" /> Tabela
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Layout size={16} className="text-slate-400" /> Elementos básicos</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleInsertMeetingNotes}>
                        <FileText size={16} className="text-slate-400" /> Notas de reunião
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleInsertTracker}>
                        <ListTodo size={16} className="text-slate-400" /> Rastreadores
                      </button>
                      <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleInsertPerson}>
                        <User size={16} className="text-slate-400" /> Pessoa
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleInsertDate}>
                        <Calendar size={16} className="text-slate-400" /> Data
                      </button>
                    </div>
                  </div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => {
                    const url = window.prompt('Digite a URL do link:');
                    if (url) handleFormat('link', url);
                  }}>
                    <LinkIcon size={16} className="text-slate-400" /> Link
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleInsertDrawing}>
                    <PenTool size={16} className="text-slate-400" /> Desenho
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleInsertChart}>
                    <BarChart3 size={16} className="text-slate-400" /> Gráfico
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => { setShowEquationToolbar(true); toast.success('Menu de símbolos aberto.'); }}>
                    <Smile size={16} className="text-slate-400" /> Símbolos e Emojis
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => {
                    if (quillRef.current) {
                      ensureQuillSelection();
                      const range = quillRef.current.getSelection() || { index: quillRef.current.getLength() };
                      quillRef.current.insertEmbed(range.index, 'hr', true);
                      quillRef.current.setSelection(range.index + 1);
                    }
                  }}>
                    <Minus size={16} className="text-slate-400" /> Linha horizontal
                  </button>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Scissors size={16} className="text-slate-400" /> Quebra</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-48 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={handlePageBreak}>Quebra de página</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={handleSectionBreak}>Quebra de seção</button>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleInsertBookmark}>
                    <Bookmark size={16} className="text-slate-400" /> Favorito
                  </button>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Hash size={16} className="text-slate-400" /> Elementos de página</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-48 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => toast.success('Números de página inseridos no rodapé.')}>Números de página</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => toast.success('Cabeçalho ativado.')}>Cabeçalho</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => toast.success('Rodapé ativado.')}>Rodapé</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative menu-container z-[70]">
                <button 
                  type="button"
                  className={`shrink-0 rounded px-2 py-0.5 transition-colors ${activeMenu === 'formatar' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'formatar' ? null : 'formatar')}
                  onMouseEnter={() => activeMenu && setActiveMenu('formatar')}
                >
                  Formatar
                </button>
                <div data-docs-menu-panel className={`absolute left-0 top-full z-[400] mt-1 w-72 rounded-lg border border-slate-200 bg-white py-2 shadow-2xl dark:border-white/10 dark:bg-slate-800 ${activeMenu === 'formatar' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Type size={16} className="text-slate-400" /> Texto</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleToggleFormat('bold')}>
                        <Bold size={16} className="text-slate-400" /> Negrito <span className="ml-auto text-[10px] text-slate-400">Ctrl+B</span>
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleToggleFormat('italic')}>
                        <Italic size={16} className="text-slate-400" /> Itálico <span className="ml-auto text-[10px] text-slate-400">Ctrl+I</span>
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleToggleFormat('underline')}>
                        <Underline size={16} className="text-slate-400" /> Sublinhado <span className="ml-auto text-[10px] text-slate-400">Ctrl+U</span>
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleToggleFormat('strike')}>
                        <Strikethrough size={16} className="text-slate-400" /> Tachado <span className="ml-auto text-[10px] text-slate-400">Alt+Shift+5</span>
                      </button>
                      <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleFormat('script', 'super')}>
                        <span className="w-4 text-center font-bold text-xs">x²</span> Sobrescrito <span className="ml-auto text-[10px] text-slate-400">Ctrl+.</span>
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleFormat('script', 'sub')}>
                        <span className="w-4 text-center font-bold text-xs">x₂</span> Subscrito <span className="ml-auto text-[10px] text-slate-400">Ctrl+,</span>
                      </button>
                    </div>
                  </div>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><AlignCenter size={16} className="text-slate-400" /> Alinhar e recuar</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleFormat('align', '')}>
                        <AlignLeft size={16} className="text-slate-400" /> Esquerda
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleFormat('align', 'center')}>
                        <AlignCenter size={16} className="text-slate-400" /> Centralizar
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleFormat('align', 'right')}>
                        <AlignRight size={16} className="text-slate-400" /> Direita
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleFormat('align', 'justify')}>
                        <AlignJustify size={16} className="text-slate-400" /> Justificado
                      </button>
                    </div>
                  </div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleColumns}>
                    <Columns size={16} className="text-slate-400" /> Colunas
                  </button>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><List size={16} className="text-slate-400" /> Marcadores e numeração</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleFormat('list', 'bullet')}>
                        <List size={16} className="text-slate-400" /> Lista com marcadores
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => handleFormat('list', 'ordered')}>
                        <ListOrdered size={16} className="text-slate-400" /> Lista numerada
                      </button>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><RotateCcw size={16} className="text-slate-400" /> Orientação da página</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setPageOrientation('portrait')}>
                        Retrato {pageOrientation === 'portrait' && <Check size={14} className="text-blue-600" />}
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setPageOrientation('landscape')}>
                        Paisagem {pageOrientation === 'landscape' && <Check size={14} className="text-blue-600" />}
                      </button>
                    </div>
                  </div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => setIsPageless(!isPageless)}>
                    <Layout size={16} className="text-slate-400" /> {isPageless ? 'Mudar para formato com páginas' : 'Mudar para formato sem páginas'}
                  </button>
                </div>
              </div>
              <div className="relative menu-container z-[70]">
                <button 
                  type="button"
                  className={`shrink-0 rounded px-2 py-0.5 transition-colors ${activeMenu === 'ferramentas' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'ferramentas' ? null : 'ferramentas')}
                  onMouseEnter={() => activeMenu && setActiveMenu('ferramentas')}
                >
                  Ferramentas
                </button>
                <div data-docs-menu-panel className={`absolute left-0 top-full z-[400] mt-1 w-72 rounded-lg border border-slate-200 bg-white py-2 shadow-2xl dark:border-white/10 dark:bg-slate-800 ${activeMenu === 'ferramentas' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleToggleSpellcheck}>
                    <SpellCheck2 size={16} className="text-slate-400" /> Ortografia e gramática
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleWordCount}>
                    <Hash size={16} className="text-slate-400" /> Contagem de palavras <span className="ml-auto text-[10px] text-slate-400">Ctrl+Shift+C</span>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Nenhuma sugestão pendente.')}>
                    <CheckSquare size={16} className="text-slate-400" /> Revisar edições sugeridas
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleCompareDocuments}>
                    <FileSearch size={16} className="text-slate-400" /> Comparar documentos
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleCitation}>
                    <Quote size={16} className="text-slate-400" /> Citações
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3 group/premium" onClick={handleSignature}>
                    <FileCheck size={16} className="text-slate-400" /> Assinatura eletrônica <span className="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded uppercase">Premium</span>
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleDictionary}>
                    <Book size={16} className="text-slate-400" /> Dicionário <span className="ml-auto text-[10px] text-slate-400">Ctrl+Shift+Y</span>
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleTranslate}>
                    <Languages size={16} className="text-slate-400" /> Traduzir documento
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleVoiceTyping}>
                    <Mic size={16} className={isListening ? "text-red-500" : "text-slate-400"} /> Digitação por voz <span className="ml-auto text-[10px] text-slate-400">Ctrl+Shift+S</span>
                  </button>
                </div>
              </div>
              <div className="relative menu-container z-[70]">
                <button 
                  type="button"
                  className={`shrink-0 rounded px-2 py-0.5 transition-colors ${activeMenu === 'extensoes' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'extensoes' ? null : 'extensoes')}
                  onMouseEnter={() => activeMenu && setActiveMenu('extensoes')}
                >
                  Extensões
                </button>
                <div data-docs-menu-panel className={`absolute left-0 top-full z-[400] mt-1 w-72 rounded-lg border border-slate-200 bg-white py-2 shadow-2xl dark:border-white/10 dark:bg-slate-800 ${activeMenu === 'extensoes' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Puzzle size={16} className="text-slate-400" /> Complementos</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 z-[450] hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => window.open('https://workspace.google.com/marketplace', '_blank')}>Instalar complementos</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => window.open('https://workspace.google.com/marketplace', '_blank')}>Gerenciar complementos</button>
                    </div>
                  </div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => window.open('https://script.google.com/', '_blank')}>
                    <Code2 size={16} className="text-slate-400" /> Apps Script
                  </button>
                </div>
              </div>
              <div className="relative menu-container z-[70]">
                <button 
                  type="button"
                  className={`shrink-0 rounded px-2 py-0.5 transition-colors ${activeMenu === 'ajuda' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'ajuda' ? null : 'ajuda')}
                  onMouseEnter={() => activeMenu && setActiveMenu('ajuda')}
                >
                  Ajuda
                </button>
                <div data-docs-menu-panel className={`absolute left-0 top-full z-[400] mt-1 w-72 rounded-lg border border-slate-200 bg-white py-2 shadow-2xl dark:border-white/10 dark:bg-slate-800 ${activeMenu === 'ajuda' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => { setShowMenuSearch(true); setActiveMenu(null); }}>
                    <div className="flex items-center gap-3"><Search size={16} className="text-slate-400" /> Pesquisar nos menus</div>
                    <span className="text-slate-400">Alt+/</span>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setShowShortcuts(true)}>
                    <div className="flex items-center gap-3"><Keyboard size={16} className="text-slate-400" /> Atalhos do teclado</div>
                    <span className="text-slate-400">Ctrl+/</span>
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => window.open('https://support.google.com/docs', '_blank')}>
                    <HelpCircle size={16} className="text-slate-400" /> Central de ajuda
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 justify-start lg:justify-end pt-0.5 lg:pt-0">
          <div className={`items-center gap-3 ${isMaximized ? 'flex' : 'hidden md:flex'}`}>
            <button
              type="button"
              title="Comentários"
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
              onClick={() => {
                setShowComments(true);
                toast.info('Painel de comentários à direita.');
              }}
            >
              <MessageSquareText size={20} />
            </button>
            <button
              type="button"
              title="Chamada de vídeo"
              className="flex items-center gap-1 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
              onClick={() => toast.info('Chamadas de vídeo: use Compartilhar para enviar o link.')}
            >
              <Video size={20} />
              <ChevronDown size={12} />
            </button>
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#c2e7ff] px-4 py-1.5 text-sm font-medium text-[#001d35] transition-colors hover:bg-[#b3d9f2]"
            onClick={onShare}
          >
            <Lock size={16} />
            Compartilhar
          </button>
          <div className={`w-8 h-8 shrink-0 bg-purple-600 rounded-full items-center justify-center text-white text-xs font-bold ${isMaximized ? 'flex' : 'hidden md:flex'}`}>
            J
          </div>
        </div>
      </div>

      {/* Formatting row — #docs-toolbar gets ql-toolbar from Quill; flex + float overrides in index.css */}
      <div
        id="docs-toolbar"
        className={`ql-toolbar ql-snow transition-[min-height,opacity,padding] duration-200 ${isExpanded ? '' : 'docs-toolbar-collapsed !min-h-0 h-0 max-h-0 overflow-hidden !p-0 !border-t-0 pointer-events-none opacity-0'}`}
      >
        <div className="flex shrink-0 items-center bg-white dark:bg-slate-900 rounded-full px-3 py-1.5 mr-2 shadow-sm border border-slate-200 dark:border-white/10 w-48">
          <Search size={16} strokeWidth={2.5} className="text-slate-700 dark:text-slate-300 mr-2" />
          <input 
            type="text" 
            placeholder="Menus" 
            className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-500"
            onClick={() => setShowMenuSearch(true)}
            readOnly
          />
        </div>
        <button 
          type="button"
          className="rounded p-1.5 transition-colors has-tooltip hover:bg-slate-200 dark:hover:bg-white/10" 
          data-tooltip="Desfazer (Ctrl+Z)"
          onClick={handleUndo}
        >
          <Undo2 size={18}/>
        </button>
        <button 
          type="button"
          className="rounded p-1.5 transition-colors has-tooltip hover:bg-slate-200 dark:hover:bg-white/10" 
          data-tooltip="Refazer (Ctrl+Y)"
          onClick={handleRedo}
        >
          <Redo2 size={18}/>
        </button>
        <button type="button" className="rounded p-1.5 transition-colors has-tooltip hover:bg-slate-200 dark:hover:bg-white/10" onClick={(e) => { e.preventDefault(); onPrint(); }} data-tooltip="Imprimir (Ctrl+P)"><Printer size={18}/></button>
        <button type="button" className="rounded p-1.5 transition-colors has-tooltip hover:bg-slate-200 dark:hover:bg-white/10" data-tooltip="Verificação ortográfica" onClick={(e) => { e.preventDefault(); handleToggleSpellcheck(); }}><SpellCheck size={18}/></button>
        <button 
          type="button"
          className={`rounded p-1.5 transition-colors has-tooltip ${formatPainter ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          data-tooltip="Pintar formatação" 
          onClick={(e) => { e.preventDefault(); handlePaintbrushClick(); }}
        >
          <Paintbrush size={18}/>
        </button>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <div className="relative flex items-center has-tooltip hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 cursor-pointer transition-colors" data-tooltip="Zoom" onClick={() => setShowZoomDropdown(!showZoomDropdown)}>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 mr-1">{zoom}</span>
          <ChevronDown size={14} className="text-slate-600 dark:text-slate-400" />
          
          {showZoomDropdown && (
            <div className="absolute top-full left-0 mt-1 w-24 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-1 z-[210]">
              {['50%', '75%', '100%', '125%', '150%', '200%'].map((level) => (
                <button
                  type="button"
                  key={level}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center justify-between"
                  onClick={(e) => {
                    e.stopPropagation();
                    onZoomChange(level);
                    setShowZoomDropdown(false);
                  }}
                >
                  {level}
                  {zoom === level && <Check size={14} className="text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <div className="relative flex items-center has-tooltip bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 cursor-pointer transition-colors [&_.ql-picker]:!hidden" data-tooltip="Estilos de texto">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{headingStyle}</span>
          <ChevronDown size={14} className="ml-3 text-slate-500" />
          <select 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => handleHeadingChange(e.target.value)}
            value={Object.keys({"": "Texto normal", "1": "Título 1", "2": "Título 2", "3": "Título 3"}).find(key => ({"": "Texto normal", "1": "Título 1", "2": "Título 2", "3": "Título 3"} as any)[key] === headingStyle) || ""}
          >
            <option value="">Texto normal</option>
            <option value="1">Título 1</option>
            <option value="2">Título 2</option>
            <option value="3">Título 3</option>
          </select>
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <div className="relative flex items-center has-tooltip bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 cursor-pointer transition-colors [&_.ql-picker]:!hidden" data-tooltip="Fonte">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{fontFamily}</span>
          <ChevronDown size={14} className="ml-3 text-slate-500" />
          <select 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            value={Object.keys({"sans-serif": "Arial", "serif": "Times New Roman", "monospace": "Courier New", "georgia": "Georgia", "trebuchet": "Trebuchet MS", "verdana": "Verdana", "comic-sans": "Comic Sans MS", "impact": "Impact"}).find(key => ({"sans-serif": "Arial", "serif": "Times New Roman", "monospace": "Courier New", "georgia": "Georgia", "trebuchet": "Trebuchet MS", "verdana": "Verdana", "comic-sans": "Comic Sans MS", "impact": "Impact"} as any)[key] === fontFamily) || "sans-serif"}
          >
            <option value="sans-serif">Arial</option>
            <option value="serif">Times New Roman</option>
            <option value="monospace">Courier New</option>
            <option value="georgia">Georgia</option>
            <option value="trebuchet">Trebuchet MS</option>
            <option value="verdana">Verdana</option>
            <option value="comic-sans">Comic Sans MS</option>
            <option value="impact">Impact</option>
          </select>
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <div className="flex items-center bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors h-7 has-tooltip" data-tooltip="Tamanho da fonte">
          <button 
            className="px-1.5 h-full text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center font-medium"
            onClick={decrementFontSize}
          >
            <Minus size={14} />
          </button>
          <div className="w-8 h-full flex items-center justify-center border-x border-slate-300 dark:border-white/20">
            <input 
              type="text" 
              value={fontSize} 
              className="w-full bg-transparent text-center text-sm font-medium outline-none text-slate-700 dark:text-slate-200" 
              onChange={(e) => setFontSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFontSizeChange(fontSize);
                }
              }}
            />
          </div>
          <button 
            className="px-1.5 h-full text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center font-medium"
            onClick={incrementFontSize}
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <button 
          type="button"
          className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.bold ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          data-tooltip="Negrito (Ctrl+B)"
          onClick={() => handleToggleFormat('bold')}
        >
          <Bold size={18}/>
        </button>
        <button 
          type="button"
          className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.italic ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          data-tooltip="Itálico (Ctrl+I)"
          onClick={() => handleToggleFormat('italic')}
        >
          <Italic size={18}/>
        </button>
        <button 
          type="button"
          className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.underline ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          data-tooltip="Sublinhado (Ctrl+U)"
          onClick={() => handleToggleFormat('underline')}
        >
          <Underline size={18}/>
        </button>
        <button 
          type="button"
          className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.strikeThrough ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          data-tooltip="Tachado"
          onClick={() => handleToggleFormat('strike')}
        >
          <Strikethrough size={18}/>
        </button>
        
        <div className="flex items-center gap-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded px-1 transition-colors has-tooltip relative" data-tooltip="Cor do texto">
          <label className="flex flex-col items-center cursor-pointer">
            <Baseline size={16} className="text-slate-600 dark:text-slate-300" />
            <div className="w-4 h-[3px] bg-black dark:bg-white -mt-0.5"></div>
            <input 
              type="color" 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
              onChange={(e) => handleTextColor(e.target.value)}
            />
          </label>
        </div>
        
        <div className="flex items-center gap-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded px-1 transition-colors has-tooltip relative" data-tooltip="Cor de destaque">
          <label className="cursor-pointer">
            <Highlighter size={16} className="text-slate-600 dark:text-slate-300" />
            <input 
              type="color" 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
              onChange={(e) => handleHighlightColor(e.target.value)}
            />
          </label>
        </div>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <button type="button" className="rounded p-1.5 transition-colors has-tooltip hover:bg-slate-200 dark:hover:bg-white/10" data-tooltip="Inserir link (Ctrl+K)" onClick={handleLink}><Link size={18}/></button>
        <button type="button" className="rounded p-1.5 transition-colors has-tooltip hover:bg-slate-200 dark:hover:bg-white/10" data-tooltip="Adicionar comentário" onClick={(e) => { e.preventDefault(); handleAddComment(); }}><MessageSquarePlus size={18}/></button>
        <button type="button" className="rounded p-1.5 transition-colors has-tooltip hover:bg-slate-200 dark:hover:bg-white/10" data-tooltip="Inserir imagem" onClick={handleImage}><Image size={18}/></button>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <button 
          type="button"
          className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.alignLeft ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          data-tooltip="Alinhar à esquerda (Ctrl+Shift+L)"
          onClick={() => handleAlign('')}
        >
          <AlignLeft size={18}/>
        </button>
        <button 
          type="button"
          className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.alignCenter ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          data-tooltip="Centralizar (Ctrl+Shift+E)"
          onClick={() => handleAlign('center')}
        >
          <AlignCenter size={18}/>
        </button>
        <button 
          type="button"
          className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.alignRight ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          data-tooltip="Alinhar à direita (Ctrl+Shift+R)"
          onClick={() => handleAlign('right')}
        >
          <AlignRight size={18}/>
        </button>
        <button 
          type="button"
          className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.alignJustify ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          data-tooltip="Justificar (Ctrl+Shift+J)"
          onClick={() => handleAlign('justify')}
        >
          <AlignJustify size={18}/>
        </button>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <div className="relative flex items-center has-tooltip hover:bg-slate-200 dark:hover:bg-white/10 rounded px-1 py-1 cursor-pointer transition-colors" data-tooltip="Espaçamento entre linhas">
          <div className="flex items-center gap-0.5">
            <AlignJustify size={18} className="text-slate-600 dark:text-slate-300" />
            <ChevronDown size={14} className="text-slate-500" />
          </div>
          <select 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            onChange={(e) => handleLineSpacing(e.target.value)}
          >
            <option value="1">Simples</option>
            <option value="1.15">1.15</option>
            <option value="1.5">1.5</option>
            <option value="2">Duplo</option>
          </select>
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <div className="flex items-center gap-0.5">
          <button 
            type="button"
            className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.listType === 'unchecked' || activeFormats.listType === 'checked' ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
            data-tooltip="Checklist"
            onClick={() => handleList('unchecked')}
          >
            <ListTodo size={18}/>
          </button>
          <ChevronDown size={12} className="text-slate-500 -ml-1" />
        </div>
        <div className="flex items-center gap-0.5">
          <button 
            type="button"
            className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.listType === 'bullet' ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
            data-tooltip="Lista com marcadores (Ctrl+Shift+8)"
            onClick={() => handleList('bullet')}
          >
            <List size={18}/>
          </button>
          <ChevronDown size={12} className="text-slate-500 -ml-1" />
        </div>
        <div className="flex items-center gap-0.5">
          <button 
            type="button"
            className={`rounded p-1.5 transition-colors has-tooltip ${activeFormats.listType === 'ordered' ? 'bg-[#d3e3fd] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-100' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
            data-tooltip="Lista numerada (Ctrl+Shift+7)"
            onClick={() => handleList('ordered')}
          >
            <ListOrdered size={18}/>
          </button>
          <ChevronDown size={12} className="text-slate-500 -ml-1" />
        </div>
        
        <button 
          type="button"
          className="rounded p-1.5 transition-colors has-tooltip hover:bg-slate-200 dark:hover:bg-white/10" 
          data-tooltip="Diminuir recuo (Ctrl+[)"
          onClick={handleOutdent}
        >
          <IndentDecrease size={18}/>
        </button>
        <button 
          type="button"
          className="rounded p-1.5 transition-colors has-tooltip hover:bg-slate-200 dark:hover:bg-white/10" 
          data-tooltip="Aumentar recuo (Ctrl+])"
          onClick={handleIndent}
        >
          <IndentIncrease size={18}/>
        </button>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <button 
          type="button"
          className="rounded p-1.5 transition-colors has-tooltip hover:bg-slate-200 dark:hover:bg-white/10" 
          data-tooltip="Limpar formatação (Ctrl+\)"
          onClick={handleClearFormatting}
        >
          <Eraser size={18}/>
        </button>

        <div className={`flex items-center gap-1 shrink-0 ${isMaximized ? 'ml-auto' : ''}`}>
          <button type="button" className="flex items-center px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap flex-shrink-0">
            <div className="flex flex-row items-center gap-1 whitespace-nowrap">
              <Pencil size={16} className="text-blue-600" />
              <span>Edição</span>
              <ChevronDown size={11} className="text-slate-500" />
            </div>
          </button>
          
          <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-500 transition-colors has-tooltip"
            data-tooltip={isExpanded ? "Ocultar os menus" : "Mostrar os menus"}
          >
            <ChevronDown size={18} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Find and Replace Modal */}
      {showFindReplace && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[200] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 w-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Localizar e substituir</h3>
              <button onClick={() => setShowFindReplace(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">
                <Plus size={20} className="rotate-45 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Localizar</label>
                <input 
                  type="text" 
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Procurar por..."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Substituir por</label>
                <input 
                  type="text" 
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Novo texto..."
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button 
                  onClick={handleFind}
                  className="flex-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Search size={16} /> Localizar
                </button>
                <button 
                  onClick={handleReplace}
                  className="flex-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Replace size={16} /> Substituir
                </button>
                <button 
                  onClick={handleReplaceAll}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Substituir tudo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Search Modal */}
      {showMenuSearch && (
        <div className="fixed inset-0 bg-black/20 flex items-start justify-center pt-24 z-[200] animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 w-[500px] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/10">
              <Search size={20} className="text-slate-400" />
              <input 
                type="text" 
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                placeholder="Pesquisar nos menus (Alt+/)"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowMenuSearch(false);
                }}
              />
              <button onClick={() => setShowMenuSearch(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">
                <Plus size={20} className="rotate-45 text-slate-500" />
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto py-2">
              {menuActions
                .filter(action => action.name.toLowerCase().includes(menuSearchQuery.toLowerCase()))
                .map((action, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      action.action();
                      setShowMenuSearch(false);
                      setMenuSearchQuery('');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span className="text-slate-400">{action.icon}</span>
                    {action.name}
                  </button>
                ))}
              {menuActions.filter(action => action.name.toLowerCase().includes(menuSearchQuery.toLowerCase())).length === 0 && (
                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                  Nenhum resultado encontrado para "{menuSearchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[200] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Keyboard size={24} className="text-blue-600" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Atalhos do teclado</h3>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">
                <Plus size={24} className="rotate-45 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Formatação de texto</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Negrito</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold">Ctrl + B</kbd></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Itálico</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold">Ctrl + I</kbd></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Sublinhado</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold">Ctrl + U</kbd></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Tachado</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold">Alt + Shift + 5</kbd></div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Edição</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Desfazer</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold">Ctrl + Z</kbd></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Refazer</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold">Ctrl + Y</kbd></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Localizar e substituir</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold">Ctrl + H</kbd></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Pesquisar nos menus</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold">Alt + /</kbd></div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Outros</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Imprimir</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold">Ctrl + P</kbd></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Contagem de palavras</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold">Ctrl + Shift + C</kbd></div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 text-center">
              <button onClick={() => setShowShortcuts(false)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocsToolbar;
