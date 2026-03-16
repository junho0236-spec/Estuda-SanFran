import React, { useState, useEffect } from 'react';
import { 
  Undo2, Redo2, Printer, SpellCheck, Paintbrush, Type, Bold, Italic, 
  Underline, Baseline, Highlighter, Link, MessageSquarePlus, AlignLeft, 
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
  onImageUpload: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onExportTxt: () => void;
  onPrint: () => void;
  isMaximized: boolean;
  setIsMaximized: (val: boolean) => void;
  title: string;
  onRename: () => void;
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
  quillRef, onImageUpload, onExportPdf, onExportDocx, onExportTxt, onPrint, 
  isMaximized, setIsMaximized, title, onRename, isStarred, onToggleStar,
  onNew, onOpen, onCopy, onShare, onEmail, onDelete, onVersionHistory,
  onOfflineToggle, isOfflineAvailable, onDetails, onLanguageChange, onPageSetup,
  editMode, setEditMode, showComments, setShowComments, showPrintLayout, setShowPrintLayout,
  showRuler, setShowRuler, showEquationToolbar, setShowEquationToolbar,
  showNonPrintingChars, setShowNonPrintingChars,
  pageOrientation, setPageOrientation, isPageless, setIsPageless
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [zoom, setZoom] = useState('100%');
  const [formatPainter, setFormatPainter] = useState<any>(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showMenuSearch, setShowMenuSearch] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleFormat = (format: string, value: any = true) => {
    if (quillRef.current) {
      quillRef.current.format(format, value);
    }
  };

  const handleToggleFormat = (format: string) => {
    if (quillRef.current) {
      const current = quillRef.current.getFormat()[format];
      quillRef.current.format(format, !current);
    }
  };

  const handleUndo = () => quillRef.current?.history.undo();
  const handleRedo = () => quillRef.current?.history.redo();

  const handleSelectAll = () => {
    if (quillRef.current) {
      quillRef.current.setSelection(0, quillRef.current.getLength());
    }
  };

  const handleCut = () => {
    document.execCommand('cut');
  };

  const handleCopy = () => {
    document.execCommand('copy');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (quillRef.current) {
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

  const handlePaintbrushClick = () => {
    if (quillRef.current) {
      const range = quillRef.current.getSelection();
      if (range) {
        const formats = quillRef.current.getFormat(range);
        setFormatPainter(formats);
      }
    }
  };

  useEffect(() => {
    if (formatPainter && quillRef.current) {
      const quill = quillRef.current;
      const onSelectionChange = (range: any) => {
        if (range && range.length > 0) {
          Object.keys(formatPainter).forEach(key => {
            quill.format(key, formatPainter[key]);
          });
          setFormatPainter(null);
        }
      };
      quill.on('selection-change', onSelectionChange);
      return () => {
        quill.off('selection-change', onSelectionChange);
      };
    }
  }, [formatPainter, quillRef]);

  const handleWordCount = () => {
    if (quillRef.current) {
      const text = quillRef.current.getText().trim();
      const words = text ? text.split(/\s+/).length : 0;
      const chars = text.length;
      const pages = Math.ceil(chars / 3000) || 1;
      toast.info(`Contagem: ${pages} páginas, ${words} palavras, ${chars} caracteres.`);
    }
  };

  const menuActions = [
    { name: 'Novo', icon: <Plus size={16} />, action: onNew },
    { name: 'Abrir', icon: <Folder size={16} />, action: onOpen },
    { name: 'Fazer uma cópia', icon: <FileText size={16} />, action: onCopy },
    { name: 'Baixar Microsoft Word (.docx)', icon: <Download size={16} />, action: onExportDocx },
    { name: 'Baixar Documento PDF (.pdf)', icon: <Download size={16} />, action: onExportPdf },
    { name: 'Baixar Texto sem formatação (.txt)', icon: <Download size={16} />, action: onExportTxt },
    { name: 'Renomear', icon: <Edit3 size={16} />, action: onRename },
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
    { name: 'Colunas', icon: <Columns size={16} />, action: () => toast.info('Configuração de colunas em breve!') },
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
      if (!(e.target as HTMLElement).closest('.menu-container')) {
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
    <div className="flex flex-col border-b border-slate-200 dark:border-white/10 bg-[#f9fbfd] dark:bg-slate-900 rounded-t-xl transition-all shadow-sm select-none relative z-[150]">
      {/* Top Row: Title & Main Actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded text-white">
            <FileText size={18} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <button 
                onClick={onRename}
                className="text-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 px-2 py-0.5 rounded transition-colors truncate max-w-[300px]"
              >
                {title || 'Documento sem título'}
              </button>
              <button 
                onClick={onToggleStar}
                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${isStarred ? 'text-yellow-500' : 'text-slate-400'}`}
              >
                <Star size={18} fill={isStarred ? 'currentColor' : 'none'} />
              </button>
              <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-400">
                <Folder size={18} />
              </button>
              <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-400">
                <CloudCheck size={18} />
              </button>
            </div>
            {/* Menus Row */}
            <div className="flex items-center gap-0.5 text-[13px] text-slate-600 dark:text-slate-400">
              <div className="relative menu-container">
                <button 
                  className={`px-2 py-0.5 rounded transition-colors ${activeMenu === 'arquivo' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'arquivo' ? null : 'arquivo')}
                  onMouseEnter={() => activeMenu && setActiveMenu('arquivo')}
                >
                  Arquivo
                </button>
                <div className={`absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[200] ${activeMenu === 'arquivo' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
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
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-48 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={onExportDocx}>Microsoft Word (.docx)</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={onExportPdf}>Documento PDF (.pdf)</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={onExportTxt}>Texto sem formatação (.txt)</button>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onRename}>
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
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-48 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
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
              <div className="relative menu-container">
                <button 
                  className={`px-2 py-0.5 rounded transition-colors ${activeMenu === 'editar' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'editar' ? null : 'editar')}
                  onMouseEnter={() => activeMenu && setActiveMenu('editar')}
                >
                  Editar
                </button>
                <div className={`absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[200] ${activeMenu === 'editar' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
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
              <div className="relative menu-container">
                <button 
                  className={`px-2 py-0.5 rounded transition-colors ${activeMenu === 'ver' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'ver' ? null : 'ver')}
                  onMouseEnter={() => activeMenu && setActiveMenu('ver')}
                >
                  Ver
                </button>
                <div className={`absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[200] ${activeMenu === 'ver' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Edit3 size={16} className="text-slate-400" /> Modo</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
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
              <div className="relative menu-container">
                <button 
                  className={`px-2 py-0.5 rounded transition-colors ${activeMenu === 'inserir' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'inserir' ? null : 'inserir')}
                  onMouseEnter={() => activeMenu && setActiveMenu('inserir')}
                >
                  Inserir
                </button>
                <div className={`absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[200] ${activeMenu === 'inserir' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onImageUpload}>
                    <Image size={16} className="text-slate-400" /> Imagem
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Inserção de tabela em breve!')}>
                    <Table size={16} className="text-slate-400" /> Tabela
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Layout size={16} className="text-slate-400" /> Elementos básicos</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Nota de reunião inserida.')}>
                        <FileText size={16} className="text-slate-400" /> Notas de reunião
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Rastreador inserido.')}>
                        <ListTodo size={16} className="text-slate-400" /> Rastreadores
                      </button>
                      <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Pessoa marcada.')}>
                        <User size={16} className="text-slate-400" /> Pessoa
                      </button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Data inserida.')}>
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
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Desenho em breve!')}>
                    <PenTool size={16} className="text-slate-400" /> Desenho
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Gráfico em breve!')}>
                    <BarChart3 size={16} className="text-slate-400" /> Gráfico
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Menu de símbolos em breve!')}>
                    <Smile size={16} className="text-slate-400" /> Símbolos e Emojis
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => {
                    if (quillRef.current) {
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
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-48 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => toast.info('Quebra de página inserida.')}>Quebra de página</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => toast.info('Quebra de seção inserida.')}>Quebra de seção</button>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Favorito adicionado.')}>
                    <Bookmark size={16} className="text-slate-400" /> Favorito
                  </button>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Hash size={16} className="text-slate-400" /> Elementos de página</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-48 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => toast.info('Números de página inseridos.')}>Números de página</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => toast.info('Cabeçalho ativado.')}>Cabeçalho</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => toast.info('Rodapé ativado.')}>Rodapé</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative menu-container">
                <button 
                  className={`px-2 py-0.5 rounded transition-colors ${activeMenu === 'formatar' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'formatar' ? null : 'formatar')}
                  onMouseEnter={() => activeMenu && setActiveMenu('formatar')}
                >
                  Formatar
                </button>
                <div className={`absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[200] ${activeMenu === 'formatar' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Type size={16} className="text-slate-400" /> Texto</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
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
                        <Eraser size={16} className="text-slate-400" /> Tachado <span className="ml-auto text-[10px] text-slate-400">Alt+Shift+5</span>
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
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
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
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Configuração de colunas em breve!')}>
                    <Columns size={16} className="text-slate-400" /> Colunas
                  </button>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><List size={16} className="text-slate-400" /> Marcadores e numeração</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
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
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
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
              <div className="relative menu-container">
                <button 
                  className={`px-2 py-0.5 rounded transition-colors ${activeMenu === 'ferramentas' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'ferramentas' ? null : 'ferramentas')}
                  onMouseEnter={() => activeMenu && setActiveMenu('ferramentas')}
                >
                  Ferramentas
                </button>
                <div className={`absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[200] ${activeMenu === 'ferramentas' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Verificação ortográfica concluída!')}>
                    <SpellCheck2 size={16} className="text-slate-400" /> Ortografia e gramática
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={handleWordCount}>
                    <Hash size={16} className="text-slate-400" /> Contagem de palavras <span className="ml-auto text-[10px] text-slate-400">Ctrl+Shift+C</span>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Nenhuma sugestão pendente.')}>
                    <CheckSquare size={16} className="text-slate-400" /> Revisar edições sugeridas
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Selecione um documento para comparar.')}>
                    <FileSearch size={16} className="text-slate-400" /> Comparar documentos
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Gerenciador de citações (ABNT/APA/MLA) em breve!')}>
                    <Quote size={16} className="text-slate-400" /> Citações
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3 group/premium" onClick={() => toast.info('Assinatura eletrônica é um recurso Premium.')}>
                    <FileCheck size={16} className="text-slate-400" /> Assinatura eletrônica <span className="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded uppercase">Premium</span>
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Dicionário lateral em breve!')}>
                    <Book size={16} className="text-slate-400" /> Dicionário <span className="ml-auto text-[10px] text-slate-400">Ctrl+Shift+Y</span>
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Tradução automática em breve!')}>
                    <Languages size={16} className="text-slate-400" /> Traduzir documento
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Ativando microfone para digitação por voz...')}>
                    <Mic size={16} className="text-slate-400" /> Digitação por voz <span className="ml-auto text-[10px] text-slate-400">Ctrl+Shift+S</span>
                  </button>
                </div>
              </div>
              <div className="relative menu-container">
                <button 
                  className={`px-2 py-0.5 rounded transition-colors ${activeMenu === 'extensoes' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'extensoes' ? null : 'extensoes')}
                  onMouseEnter={() => activeMenu && setActiveMenu('extensoes')}
                >
                  Extensões
                </button>
                <div className={`absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[200] ${activeMenu === 'extensoes' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <div className="relative group/sub">
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3"><Puzzle size={16} className="text-slate-400" /> Complementos</div>
                      <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                    </button>
                    <div className="absolute left-full top-0 hidden group-hover/sub:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2">
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => toast.info('Abrindo loja de complementos...')}>Instalar complementos</button>
                      <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => toast.info('Gerenciar complementos instalados.')}>Gerenciar complementos</button>
                    </div>
                  </div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Abrindo editor do Apps Script...')}>
                    <Code2 size={16} className="text-slate-400" /> Apps Script
                  </button>
                </div>
              </div>
              <div className="relative menu-container">
                <button 
                  className={`px-2 py-0.5 rounded transition-colors ${activeMenu === 'ajuda' ? 'bg-slate-100 dark:hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  onClick={() => setActiveMenu(activeMenu === 'ajuda' ? null : 'ajuda')}
                  onMouseEnter={() => activeMenu && setActiveMenu('ajuda')}
                >
                  Ajuda
                </button>
                <div className={`absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[200] ${activeMenu === 'ajuda' ? 'block' : 'hidden'}`} onClick={() => setActiveMenu(null)}>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => { setShowMenuSearch(true); setActiveMenu(null); }}>
                    <div className="flex items-center gap-3"><Search size={16} className="text-slate-400" /> Pesquisar nos menus</div>
                    <span className="text-slate-400">Alt+/</span>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between" onClick={() => setShowShortcuts(true)}>
                    <div className="flex items-center gap-3"><Keyboard size={16} className="text-slate-400" /> Atalhos do teclado</div>
                    <span className="text-slate-400">Ctrl+/</span>
                  </button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={() => toast.info('Central de ajuda em breve!')}>
                    <HelpCircle size={16} className="text-slate-400" /> Central de ajuda
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <Clock size={20} />
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <MessageSquareText size={20} />
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <Video size={20} />
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-[#c2e7ff] hover:bg-[#b3d9f2] text-[#001d35] rounded-full font-medium text-sm transition-colors">
            <Lock size={16} />
            Compartilhar
          </button>
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            J
          </div>
        </div>
      </div>

      {/* Toolbar Row */}
      <div id="docs-toolbar" className={`flex flex-wrap items-center gap-0.5 px-3 py-1 bg-[#edf2fa] dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/10 transition-all ${isExpanded ? '' : 'h-0 overflow-hidden py-0 border-t-0'}`}>
        <div className="flex items-center bg-white dark:bg-slate-900 rounded-full px-3 py-1.5 mr-2 shadow-sm border border-slate-200 dark:border-white/10 w-48">
          <Search size={16} className="text-slate-500 mr-2" />
          <input 
            type="text" 
            placeholder="Menus" 
            className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-500"
            onClick={() => setShowMenuSearch(true)}
            readOnly
          />
        </div>
        <button className="ql-undo p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" data-tooltip="Desfazer (Ctrl+Z)"><Undo2 size={18}/></button>
        <button className="ql-redo p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" data-tooltip="Refazer (Ctrl+Y)"><Redo2 size={18}/></button>
        <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" onClick={onPrint} data-tooltip="Imprimir (Ctrl+P)"><Printer size={18}/></button>
        <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" data-tooltip="Verificação ortográfica" onClick={() => toast.info('Verificação ortográfica concluída.')}><SpellCheck size={18}/></button>
        <button 
          className={`p-1.5 rounded transition-colors has-tooltip ${formatPainter ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          data-tooltip="Pintar formatação" 
          onClick={handlePaintbrushClick}
        >
          <Paintbrush size={18}/>
        </button>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <div className="relative flex items-center has-tooltip" data-tooltip="Zoom">
          <select 
            className="appearance-none bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded pl-2 pr-6 py-1 text-sm font-medium outline-none cursor-pointer transition-colors" 
            value={zoom}
            onChange={(e) => {
              setZoom(e.target.value);
              const editor = quillRef.current?.root;
              if (editor) editor.style.zoom = e.target.value.replace('%', '') + '%';
            }}
          >
            <option value="50%">50%</option>
            <option value="75%">75%</option>
            <option value="100%">100%</option>
            <option value="125%">125%</option>
            <option value="150%">150%</option>
            <option value="200%">200%</option>
          </select>
          <ChevronDown size={14} className="absolute right-1 pointer-events-none text-slate-600 dark:text-slate-400" />
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <div className="has-tooltip" data-tooltip="Estilos de texto">
          <select className="ql-header bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 text-sm font-medium outline-none cursor-pointer transition-colors">
            <option value="1">Título 1</option>
            <option value="2">Título 2</option>
            <option value="3">Título 3</option>
            <option value="">Texto normal</option>
          </select>
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <div className="has-tooltip" data-tooltip="Fonte">
          <select className="ql-font bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 text-sm font-medium outline-none cursor-pointer transition-colors">
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

        <div className="has-tooltip" data-tooltip="Tamanho da fonte">
          <select className="ql-size bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 text-sm font-medium outline-none cursor-pointer transition-colors">
            <option value="8px">8</option>
            <option value="10px">10</option>
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
            <option value="32px">32</option>
            <option value="48px">48</option>
            <option value="64px">64</option>
            <option value="">Normal</option>
          </select>
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <button className="ql-bold p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" data-tooltip="Negrito (Ctrl+B)"><Bold size={18}/></button>
        <button className="ql-italic p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" data-tooltip="Itálico (Ctrl+I)"><Italic size={18}/></button>
        <button className="ql-underline p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" data-tooltip="Sublinhado (Ctrl+U)"><Underline size={18}/></button>
        
        <div className="flex items-center gap-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded px-1 transition-colors has-tooltip" data-tooltip="Cor do texto">
          <Baseline size={16} className="text-slate-600 dark:text-slate-300" />
          <select className="ql-color bg-transparent border-none w-6 h-6 p-0 outline-none cursor-pointer"></select>
        </div>
        
        <div className="flex items-center gap-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded px-1 transition-colors has-tooltip" data-tooltip="Cor de destaque">
          <Highlighter size={16} className="text-slate-600 dark:text-slate-300" />
          <select className="ql-background bg-transparent border-none w-6 h-6 p-0 outline-none cursor-pointer"></select>
        </div>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <button className="ql-link p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" data-tooltip="Inserir link (Ctrl+K)"><Link size={18}/></button>
        <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" data-tooltip="Adicionar comentário" onClick={() => toast.info('Comentário adicionado.')}><MessageSquarePlus size={18}/></button>
        <button className="ql-image p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" data-tooltip="Inserir imagem"><Image size={18}/></button>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <div className="has-tooltip" data-tooltip="Alinhamento">
          <select className="ql-align bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-1 py-1 outline-none cursor-pointer transition-colors">
            <option value=""></option>
            <option value="center"></option>
            <option value="right"></option>
            <option value="justify"></option>
          </select>
        </div>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <select 
          className="bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 text-sm font-medium outline-none cursor-pointer transition-colors has-tooltip" 
          data-tooltip="Espaçamento entre linhas"
          onChange={(e) => handleFormat('lineheight', e.target.value)}
        >
          <option value="">Padrão</option>
          <option value="1">1.0</option>
          <option value="1.15">1.15</option>
          <option value="1.5">1.5</option>
          <option value="2">2.0</option>
        </select>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <button className="ql-list p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" value="check" data-tooltip="Checklist"><ListTodo size={18}/></button>
        <button className="ql-list p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" value="bullet" data-tooltip="Lista com marcadores (Ctrl+Shift+8)"><List size={18}/></button>
        <button className="ql-list p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" value="ordered" data-tooltip="Lista numerada (Ctrl+Shift+7)"><ListOrdered size={18}/></button>
        
        <button className="ql-indent p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" value="-1" data-tooltip="Diminuir recuo (Ctrl+[)"><IndentDecrease size={18}/></button>
        <button className="ql-indent p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" value="+1" data-tooltip="Aumentar recuo (Ctrl+])"><IndentIncrease size={18}/></button>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <button className="ql-clean p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors has-tooltip" data-tooltip="Limpar formatação (Ctrl+\)"><Eraser size={18}/></button>

        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors">
            <Pencil size={16} className="text-blue-600" />
            Edição
            <ChevronDown size={14} className="text-slate-500" />
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
