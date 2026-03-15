import React, { useState, useEffect } from 'react';
import { 
  Undo2, Redo2, Printer, SpellCheck, Paintbrush, Type, Bold, Italic, 
  Underline, Baseline, Highlighter, Link, MessageSquarePlus, AlignLeft, 
  AlignCenter, AlignRight, AlignJustify, List, ListOrdered, IndentDecrease, 
  IndentIncrease, Eraser, ChevronDown, Check, Image, Star, FileText, 
  Share2, Clock, ListTodo, LineChart, Plus, Folder, Download, Edit3, Trash2, AlertCircle,
  MessageSquare, Link as LinkIcon
} from 'lucide-react';

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
}

const DocsToolbar: React.FC<DocsToolbarProps> = ({ 
  quillRef, onImageUpload, onExportPdf, onExportDocx, onExportTxt, onPrint, 
  isMaximized, setIsMaximized, title, onRename, isStarred, onToggleStar,
  onNew, onOpen, onCopy, onShare, onEmail, onDelete, onVersionHistory,
  onOfflineToggle, isOfflineAvailable, onDetails, onLanguageChange, onPageSetup
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [zoom, setZoom] = useState('100%');
  const [formatPainter, setFormatPainter] = useState<any>(null);

  const handleFormat = (format: string, value: any = true) => {
    if (quillRef.current) {
      quillRef.current.format(format, value);
    }
  };

  const handleUndo = () => quillRef.current?.history.undo();
  const handleRedo = () => quillRef.current?.history.redo();

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

  return (
    <div className="flex flex-col border-b border-slate-200 dark:border-white/10 bg-[#f9fbfd] dark:bg-slate-900 rounded-t-xl overflow-hidden transition-all shadow-sm select-none">
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
            </div>
            {/* Menus Row */}
            <div className="flex items-center gap-0.5 text-[13px] text-slate-600 dark:text-slate-400">
              <div className="relative group">
                <button className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">Arquivo</button>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-72 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[100]">
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center gap-3" onClick={onNew}>
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
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between">
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
                    <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex items-center justify-between">
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
              <div className="relative group">
                <button className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">Editar</button>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[100]">
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between" onClick={handleUndo}><span>Desfazer</span><span className="text-slate-400">Ctrl+Z</span></button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between" onClick={handleRedo}><span>Refazer</span><span className="text-slate-400">Ctrl+Y</span></button>
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between"><span>Recortar</span><span className="text-slate-400">Ctrl+X</span></button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between"><span>Copiar</span><span className="text-slate-400">Ctrl+C</span></button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm flex justify-between"><span>Colar</span><span className="text-slate-400">Ctrl+V</span></button>
                </div>
              </div>
              <div className="relative group">
                <button className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">Ver</button>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[100]">
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => setIsMaximized(!isMaximized)}>{isMaximized ? 'Sair da tela inteira' : 'Tela inteira'}</button>
                </div>
              </div>
              <div className="relative group">
                <button className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">Inserir</button>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[100]">
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={onImageUpload}>Imagem</button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => {
                    const url = prompt('Digite a URL do link:');
                    if (url) handleFormat('link', url);
                  }}>Link</button>
                </div>
              </div>
              <div className="relative group">
                <button className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">Formatar</button>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-white/10 rounded-lg py-2 z-[100]">
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => handleFormat('bold')}>Negrito</button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => handleFormat('italic')}>Itálico</button>
                  <button className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-sm" onClick={() => handleFormat('underline')}>Sublinhado</button>
                </div>
              </div>
              <button className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">Ferramentas</button>
              <button className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">Extensões</button>
              <button className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-colors">Ajuda</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <Clock size={20} />
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <MessageSquarePlus size={20} />
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-[#c2e7ff] hover:bg-[#b3d9f2] text-[#001d35] rounded-full font-medium text-sm transition-colors">
            <Share2 size={18} />
            Compartilhar
          </button>
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            J
          </div>
        </div>
      </div>

      {/* Toolbar Row */}
      <div id="docs-toolbar" className={`flex flex-wrap items-center gap-0.5 px-3 py-1 bg-[#edf2fa] dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/10 transition-all ${isExpanded ? '' : 'h-0 overflow-hidden py-0 border-t-0'}`}>
        <button className="ql-undo p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Desfazer"><Undo2 size={18}/></button>
        <button className="ql-redo p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Refazer"><Redo2 size={18}/></button>
        <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" onClick={onPrint} title="Imprimir"><Printer size={18}/></button>
        <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Verificação ortográfica" onClick={() => alert('Verificação ortográfica concluída.')}><SpellCheck size={18}/></button>
        <button 
          className={`p-1.5 rounded transition-colors ${formatPainter ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`} 
          title="Pintar formatação" 
          onClick={handlePaintbrushClick}
        >
          <Paintbrush size={18}/>
        </button>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <select 
          className="bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 text-sm font-medium outline-none cursor-pointer transition-colors" 
          title="Zoom" 
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

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <select className="ql-header bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 text-sm font-medium outline-none cursor-pointer transition-colors" title="Estilos de texto">
          <option value="1">Título 1</option>
          <option value="2">Título 2</option>
          <option value="3">Título 3</option>
          <option value="">Texto normal</option>
        </select>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <select className="ql-font bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 text-sm font-medium outline-none cursor-pointer transition-colors" title="Fonte">
          <option value="sans-serif">Arial</option>
          <option value="serif">Times New Roman</option>
          <option value="monospace">Courier New</option>
          <option value="georgia">Georgia</option>
          <option value="trebuchet">Trebuchet MS</option>
          <option value="verdana">Verdana</option>
        </select>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <select className="ql-size bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 text-sm font-medium outline-none cursor-pointer transition-colors" title="Tamanho da fonte">
          <option value="small">8</option>
          <option value="">11</option>
          <option value="large">18</option>
          <option value="huge">32</option>
        </select>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <button className="ql-bold p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Negrito"><Bold size={18}/></button>
        <button className="ql-italic p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Itálico"><Italic size={18}/></button>
        <button className="ql-underline p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Sublinhado"><Underline size={18}/></button>
        
        <div className="flex items-center gap-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded px-1 transition-colors">
          <Baseline size={16} className="text-slate-600 dark:text-slate-300" />
          <select className="ql-color bg-transparent border-none w-6 h-6 p-0 outline-none cursor-pointer" title="Cor do texto"></select>
        </div>
        
        <div className="flex items-center gap-0.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded px-1 transition-colors">
          <Highlighter size={16} className="text-slate-600 dark:text-slate-300" />
          <select className="ql-background bg-transparent border-none w-6 h-6 p-0 outline-none cursor-pointer" title="Cor de destaque"></select>
        </div>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <button className="ql-link p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Inserir link"><Link size={18}/></button>
        <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Adicionar comentário" onClick={() => alert('Comentário adicionado.')}><MessageSquarePlus size={18}/></button>
        <button className="ql-image p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Inserir imagem"><Image size={18}/></button>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <select className="ql-align bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-1 py-1 outline-none cursor-pointer transition-colors" title="Alinhamento">
          <option value=""></option>
          <option value="center"></option>
          <option value="right"></option>
          <option value="justify"></option>
        </select>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <select 
          className="bg-transparent hover:bg-slate-200 dark:hover:bg-white/10 rounded px-2 py-1 text-sm font-medium outline-none cursor-pointer transition-colors" 
          title="Espaçamento entre linhas"
          onChange={(e) => handleFormat('lineheight', e.target.value)}
        >
          <option value="1">1.0</option>
          <option value="1.15">1.15</option>
          <option value="1.5">1.5</option>
          <option value="2">2.0</option>
        </select>

        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>

        <button className="ql-list p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" value="check" title="Checklist"><ListTodo size={18}/></button>
        <button className="ql-list p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" value="bullet" title="Lista com marcadores"><List size={18}/></button>
        <button className="ql-list p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" value="ordered" title="Lista numerada"><ListOrdered size={18}/></button>
        
        <button className="ql-indent p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" value="-1" title="Diminuir recuo"><IndentDecrease size={18}/></button>
        <button className="ql-indent p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" value="+1" title="Aumentar recuo"><IndentIncrease size={18}/></button>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-white/20 mx-1"></div>
        
        <button className="ql-clean p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors" title="Limpar formatação"><Eraser size={18}/></button>

        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-500 transition-colors"
        >
          <ChevronDown size={18} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default DocsToolbar;
