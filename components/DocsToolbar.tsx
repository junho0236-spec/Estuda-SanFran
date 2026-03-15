import React, { useState } from 'react';
import { Undo2, Redo2, Printer, SpellCheck, Paintbrush, ZoomIn, Type, Bold, Italic, Underline, Baseline, Highlighter, Link, MessageSquarePlus, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, IndentDecrease, IndentIncrease, Eraser, ChevronDown, Check, Image } from 'lucide-react';

interface DocsToolbarProps {
  quillRef: React.MutableRefObject<any>;
  onImageUpload: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onPrint: () => void;
  isMaximized: boolean;
  setIsMaximized: (val: boolean) => void;
}

const DocsToolbar: React.FC<DocsToolbarProps> = ({ quillRef, onImageUpload, onExportPdf, onExportDocx, onPrint, isMaximized, setIsMaximized }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFormat = (format: string, value: any = true) => {
    if (quillRef.current) {
      quillRef.current.format(format, value);
    }
  };

  const handleUndo = () => quillRef.current?.history.undo();
  const handleRedo = () => quillRef.current?.history.redo();

  return (
    <div className="flex flex-col border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 rounded-t-3xl overflow-hidden transition-all shadow-sm">
      {/* Menus */}
      <div className="flex items-center gap-1 px-4 py-1.5 text-sm text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-white/5">
        <div className="relative group">
          <button className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors text-xs font-medium">Arquivo</button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-white/10 rounded-xl py-2 z-50">
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm">Novo</button>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm">Abrir</button>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm">Fazer uma cópia</button>
            <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={onExportPdf}>Fazer download como PDF</button>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={onExportDocx}>Fazer download como Word</button>
            <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={onPrint}>Imprimir</button>
          </div>
        </div>
        <div className="relative group">
          <button className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors text-xs font-medium">Editar</button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-white/10 rounded-xl py-2 z-50">
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm flex justify-between" onClick={handleUndo}><span>Desfazer</span><span className="text-slate-400">Ctrl+Z</span></button>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm flex justify-between" onClick={handleRedo}><span>Refazer</span><span className="text-slate-400">Ctrl+Y</span></button>
            <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => document.execCommand('cut')}><span>Recortar</span><span className="text-slate-400">Ctrl+X</span></button>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => document.execCommand('copy')}><span>Copiar</span><span className="text-slate-400">Ctrl+C</span></button>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => document.execCommand('paste')}><span>Colar</span><span className="text-slate-400">Ctrl+V</span></button>
            <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm flex justify-between" onClick={() => quillRef.current?.setSelection(0, quillRef.current.getLength())}><span>Selecionar tudo</span><span className="text-slate-400">Ctrl+A</span></button>
          </div>
        </div>
        <div className="relative group">
          <button className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors text-xs font-medium">Ver</button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-white/10 rounded-xl py-2 z-50">
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={() => setIsMaximized(!isMaximized)}>{isMaximized ? 'Sair da tela inteira' : 'Tela inteira'}</button>
          </div>
        </div>
        <div className="relative group">
          <button className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors text-xs font-medium">Inserir</button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-white/10 rounded-xl py-2 z-50">
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={onImageUpload}>Imagem</button>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={() => {
              const url = prompt('Digite a URL do link:');
              if (url) handleFormat('link', url);
            }}>Link</button>
          </div>
        </div>
        <div className="relative group">
          <button className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors text-xs font-medium">Formatar</button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-white/10 rounded-xl py-2 z-50">
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={() => handleFormat('bold')}>Negrito</button>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={() => handleFormat('italic')}>Itálico</button>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={() => handleFormat('underline')}>Sublinhado</button>
            <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={() => {
              const range = quillRef.current?.getSelection();
              if (range) {
                quillRef.current?.removeFormat(range.index, range.length);
              }
            }}>Limpar formatação</button>
          </div>
        </div>
        <div className="relative group">
          <button className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors text-xs font-medium">Ferramentas</button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-white/10 rounded-xl py-2 z-50">
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={() => {
              const text = quillRef.current?.getText() || '';
              const words = text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
              const chars = text.length - 1; // subtract trailing newline
              alert(`Contagem de palavras:\nPalavras: ${words}\nCaracteres: ${chars}`);
            }}>Contagem de palavras</button>
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm" onClick={() => {
              const editor = quillRef.current?.root;
              if (editor) editor.setAttribute('spellcheck', editor.getAttribute('spellcheck') === 'false' ? 'true' : 'false');
              alert('Verificação ortográfica alternada.');
            }}>Ortografia e gramática</button>
          </div>
        </div>
        <div className="relative group">
          <button className="px-3 py-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors text-xs font-medium">Ajuda</button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-64 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-white/10 rounded-xl py-2 z-50">
            <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm">Atalhos do teclado</button>
          </div>
        </div>
      </div>

      {/* Custom Quill Toolbar Container */}
      <div id="docs-toolbar" className={`flex flex-wrap items-center gap-1 px-4 py-2 bg-white dark:bg-slate-900 transition-all ${isExpanded ? '' : 'h-12 overflow-hidden'}`}>
        <button className="ql-undo p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" title="Desfazer"><Undo2 size={16}/></button>
        <button className="ql-redo p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" title="Refazer"><Redo2 size={16}/></button>
        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" onClick={onPrint} title="Imprimir"><Printer size={16}/></button>
        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" onClick={() => {
          const editor = quillRef.current?.root;
          if (editor) editor.setAttribute('spellcheck', editor.getAttribute('spellcheck') === 'false' ? 'true' : 'false');
        }} title="Verificação ortográfica"><SpellCheck size={16}/></button>
        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" onClick={() => alert('Pintar formatação: Selecione um texto, copie a formatação e aplique em outro.')} title="Pintar formatação"><Paintbrush size={16}/></button>
        
        <select defaultValue="1" className="bg-transparent border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" title="Zoom" onChange={(e) => {
          const editor = quillRef.current?.root;
          if (editor) editor.style.zoom = e.target.value;
        }}>
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1">100%</option>
          <option value="1.25">125%</option>
          <option value="1.5">150%</option>
          <option value="2">200%</option>
        </select>

        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1"></div>
        
        <select defaultValue="" className="ql-size bg-transparent border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <option value="small">Pequeno</option>
          <option value="">Normal</option>
          <option value="large">Grande</option>
          <option value="huge">Enorme</option>
        </select>
        
        <select defaultValue="" className="ql-header bg-transparent border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <option value="1">Título 1</option>
          <option value="2">Título 2</option>
          <option value="3">Título 3</option>
          <option value="">Texto normal</option>
        </select>

        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1"></div>
        
        <button className="ql-bold p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" title="Negrito"><Bold size={16}/></button>
        <button className="ql-italic p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" title="Itálico"><Italic size={16}/></button>
        <button className="ql-underline p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" title="Sublinhado"><Underline size={16}/></button>
        
        <div className="flex items-center gap-0.5 border border-slate-200 dark:border-white/10 rounded px-1">
          <Baseline size={14} className="text-slate-500" />
          <select className="ql-color bg-transparent border-none text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-6" title="Cor do texto"></select>
        </div>
        
        <div className="flex items-center gap-0.5 border border-slate-200 dark:border-white/10 rounded px-1">
          <Highlighter size={14} className="text-slate-500" />
          <select className="ql-background bg-transparent border-none text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-6" title="Cor de destaque"></select>
        </div>
        
        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1"></div>
        
        <button className="ql-link p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" title="Inserir link"><Link size={16}/></button>
        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" title="Adicionar comentário"><MessageSquarePlus size={16}/></button>
        <button className="ql-image p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" title="Inserir imagem"><Image size={16}/></button>
        
        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1"></div>
        
        <select className="ql-align bg-transparent border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" title="Alinhamento"></select>
        
        <button className="ql-list p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" value="ordered" title="Lista numerada"><ListOrdered size={16}/></button>
        <button className="ql-list p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" value="bullet" title="Lista com marcadores"><List size={16}/></button>
        <button className="ql-indent p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" value="-1" title="Diminuir recuo"><IndentDecrease size={16}/></button>
        <button className="ql-indent p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" value="+1" title="Aumentar recuo"><IndentIncrease size={16}/></button>
        
        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1"></div>
        
        <button className="ql-clean p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300 transition-colors" title="Limpar formatação"><Eraser size={16}/></button>

        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-400 transition-colors"
        >
          <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default DocsToolbar;
