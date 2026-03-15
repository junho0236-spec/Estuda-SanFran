import React, { useState } from 'react';
import { 
  FileText, Star, Folder, Cloud, MessageSquare, Lock, 
  Undo, Redo, Printer, SpellCheck, Paintbrush, ZoomIn, 
  Bold, Italic, Underline, Strikethrough, Baseline, Highlighter, 
  Link as LinkIcon, MessageSquarePlus, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, List, ListOrdered, ListTodo, 
  Outdent, Indent, Eraser, ChevronDown, Check
} from 'lucide-react';

interface DocsHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  onTitleBlur: () => void;
  quillRef: React.MutableRefObject<any>;
  onApplyTemplate?: (template: 'doutrina' | 'jurisprudencia' | 'aula') => void;
  onOpenHandwriting?: () => void;
  onExportPdf?: () => void;
  onExportDocx?: () => void;
}

const MenuButton = ({ label, items }: { label: string, items: { label?: string, onClick?: () => void, shortcut?: string, divider?: boolean, disabled?: boolean }[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative" onMouseLeave={() => setIsOpen(false)}>
      <button 
        className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
        onMouseEnter={() => setIsOpen(true)}
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-lg py-1 z-50">
          {items.map((item, index) => item.divider ? (
            <div key={index} className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
          ) : (
            <button 
              key={index}
              onClick={() => {
                if (!item.disabled && item.onClick) item.onClick();
                setIsOpen(false);
              }}
              disabled={item.disabled}
              className={`w-full text-left px-4 py-1.5 text-sm flex items-center justify-between ${item.disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <span>{item.label}</span>
              {item.shortcut && <span className="text-xs text-slate-400">{item.shortcut}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const DocsHeader: React.FC<DocsHeaderProps> = ({ 
  title, onTitleChange, onTitleBlur, quillRef, 
  onApplyTemplate, onOpenHandwriting, onExportPdf, onExportDocx
}) => {
  const handleFormat = (format: string, value: any = true) => {
    if (quillRef.current) {
      const currentFormat = quillRef.current.getFormat();
      if (currentFormat[format] === value) {
        quillRef.current.format(format, false);
      } else {
        quillRef.current.format(format, value);
      }
    }
  };

  const handleUndo = () => quillRef.current?.history?.undo();
  const handleRedo = () => quillRef.current?.history?.redo();
  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full shrink-0 overflow-hidden">
      {/* Top Row: Icon, Title, Menus */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="p-2 text-blue-500 rounded-full">
            <FileText size={28} fill="currentColor" className="text-blue-500" />
          </div>
          
          <div className="flex flex-col">
            {/* Title and Status */}
            <div className="flex items-center gap-2">
              <input 
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onBlur={onTitleBlur}
                className="text-lg font-medium text-slate-800 dark:text-slate-200 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-1.5 py-0.5 rounded transition-all w-64"
                placeholder="Documento sem título"
              />
              <button className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Marcar com estrela"><Star size={16} /></button>
              <button className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Mover"><Folder size={16} /></button>
              <button className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Ver status do documento"><Cloud size={16} /></button>
            </div>
            
            {/* Menu Bar */}
            <div className="flex items-center gap-0.5 mt-0.5 -ml-1">
              <MenuButton label="Arquivo" items={[
                { label: 'Novo', shortcut: 'Ctrl+N', disabled: true },
                { label: 'Abrir', shortcut: 'Ctrl+O', disabled: true },
                { label: 'Fazer uma cópia', disabled: true },
                { divider: true },
                { label: 'Compartilhar', disabled: true },
                { label: 'E-mail', disabled: true },
                { label: 'Baixar como PDF', onClick: onExportPdf },
                { label: 'Baixar como Word', onClick: onExportDocx },
                { divider: true },
                { label: 'Renomear', onClick: () => document.querySelector('input')?.focus() },
                { label: 'Mover para a lixeira', disabled: true },
                { divider: true },
                { label: 'Histórico de versões', disabled: true },
                { label: 'Tornar disponível off-line', disabled: true },
                { divider: true },
                { label: 'Detalhes', disabled: true },
                { label: 'Idioma', disabled: true },
                { label: 'Configuração da página', disabled: true },
                { divider: true },
                { label: 'Imprimir', shortcut: 'Ctrl+P', onClick: handlePrint }
              ]} />
              <MenuButton label="Editar" items={[
                { label: 'Desfazer', shortcut: 'Ctrl+Z', onClick: handleUndo },
                { label: 'Refazer', shortcut: 'Ctrl+Y', onClick: handleRedo },
                { divider: true },
                { label: 'Recortar', shortcut: 'Ctrl+X', disabled: true },
                { label: 'Copiar', shortcut: 'Ctrl+C', disabled: true },
                { label: 'Colar', shortcut: 'Ctrl+V', disabled: true },
                { label: 'Colar sem formatação', shortcut: 'Ctrl+Shift+V', disabled: true },
                { divider: true },
                { label: 'Selecionar tudo', shortcut: 'Ctrl+A', onClick: () => {
                  if (quillRef.current) {
                    quillRef.current.setSelection(0, quillRef.current.getLength());
                  }
                }},
                { label: 'Localizar e substituir', shortcut: 'Ctrl+H', disabled: true }
              ]} />
              <MenuButton label="Ver" items={[
                { label: 'Mostrar layout de impressão', disabled: true },
                { label: 'Exibir régua', disabled: true },
                { label: 'Mostrar caracteres não imprimíveis', disabled: true }
              ]} />
              <MenuButton label="Inserir" items={[
                { label: 'Imagem', disabled: true },
                { label: 'Tabela', disabled: true },
                { label: 'Desenho', disabled: true },
                { label: 'Gráfico', disabled: true },
                { divider: true },
                { label: 'Escrita à Mão (Caneta)', onClick: onOpenHandwriting },
                { divider: true },
                { label: 'Linha horizontal', disabled: true },
                { label: 'Símbolos', disabled: true },
                { divider: true },
                { label: 'Link', shortcut: 'Ctrl+K', disabled: true }
              ]} />
              <MenuButton label="Formatar" items={[
                { label: 'Texto', disabled: true },
                { label: 'Estilos de parágrafo', disabled: true },
                { label: 'Alinhar e recuar', disabled: true },
                { label: 'Espaçamento entre linhas', disabled: true },
                { label: 'Colunas', disabled: true },
                { label: 'Marcadores e numeração', disabled: true },
                { divider: true },
                { label: 'Limpar formatação', shortcut: 'Ctrl+\\', onClick: () => {
                  if (quillRef.current) {
                    const range = quillRef.current.getSelection();
                    if (range) quillRef.current.removeFormat(range.index, range.length);
                  }
                }}
              ]} />
              <MenuButton label="Ferramentas" items={[
                { label: 'Ortografia e gramática', disabled: true },
                { label: 'Contagem de palavras', shortcut: 'Ctrl+Shift+C', disabled: true },
                { divider: true },
                { label: 'Dicionário', shortcut: 'Ctrl+Shift+Y', disabled: true },
                { label: 'Traduzir documento', disabled: true },
                { label: 'Digitação por Voz', shortcut: 'Ctrl+Shift+S', disabled: true }
              ]} />
              <MenuButton label="Extensões" items={[
                { label: 'Modelo: Fichamento de Doutrina', onClick: () => onApplyTemplate?.('doutrina') },
                { label: 'Modelo: Análise de Jurisprudência', onClick: () => onApplyTemplate?.('jurisprudencia') },
                { label: 'Modelo: Resumo de Aula', onClick: () => onApplyTemplate?.('aula') },
                { divider: true },
                { label: 'Complementos', disabled: true },
                { label: 'Apps Script', disabled: true }
              ]} />
              <MenuButton label="Ajuda" items={[
                { label: 'Pesquisar nos menus', shortcut: 'Alt+/', disabled: true },
                { label: 'Ajuda do Docs', disabled: true },
                { label: 'Treinamento', disabled: true },
                { label: 'Atualizações', disabled: true },
                { divider: true },
                { label: 'Atalhos do teclado', shortcut: 'Ctrl+/', disabled: true }
              ]} />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Row */}
      <div id="docs-toolbar" className="flex items-center gap-1 px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button onClick={handleUndo} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Desfazer (Ctrl+Z)"><Undo size={16} /></button>
        <button onClick={handleRedo} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Refazer (Ctrl+Y)"><Redo size={16} /></button>
        <button onClick={handlePrint} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Imprimir (Ctrl+P)"><Printer size={16} /></button>
        <button className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Verificação ortográfica e gramatical"><SpellCheck size={16} /></button>
        <button className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Pintar formatação"><Paintbrush size={16} /></button>
        
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
        
        <button className="flex items-center gap-1 px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-sm font-medium">
          100% <ChevronDown size={14} />
        </button>
        
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
        
        <select className="ql-header bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 outline-none hover:bg-slate-200 dark:hover:bg-slate-700 rounded px-2 py-1 cursor-pointer">
          <option value="1">Título 1</option>
          <option value="2">Título 2</option>
          <option value="3">Título 3</option>
          <option value="false" selected>Texto normal</option>
        </select>
        
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
        
        <select className="ql-font bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 outline-none hover:bg-slate-200 dark:hover:bg-slate-700 rounded px-2 py-1 cursor-pointer w-24">
          <option selected>Arial</option>
          <option value="serif">Serif</option>
          <option value="monospace">Monospace</option>
        </select>
        
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
        
        <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded overflow-hidden">
          <button className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 text-sm">-</button>
          <input type="text" value="11" readOnly className="w-8 text-center text-sm border-x border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none" />
          <button className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 text-sm">+</button>
        </div>
        
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
        
        <button className="ql-bold p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Negrito (Ctrl+B)"><Bold size={16} /></button>
        <button className="ql-italic p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Itálico (Ctrl+I)"><Italic size={16} /></button>
        <button className="ql-underline p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Sublinhado (Ctrl+U)"><Underline size={16} /></button>
        <button className="ql-strike p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Tachado"><Strikethrough size={16} /></button>
        
        <div className="relative flex items-center">
          <button className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors flex flex-col items-center" title="Cor do texto">
            <Baseline size={16} />
            <div className="w-3 h-1 bg-black dark:bg-white mt-0.5"></div>
          </button>
          <select className="ql-color absolute inset-0 opacity-0 cursor-pointer w-full h-full"></select>
        </div>
        
        <div className="relative flex items-center">
          <button className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors flex flex-col items-center" title="Cor de destaque">
            <Highlighter size={16} />
            <div className="w-3 h-1 bg-yellow-400 mt-0.5"></div>
          </button>
          <select className="ql-background absolute inset-0 opacity-0 cursor-pointer w-full h-full"></select>
        </div>
        
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
        
        <button className="ql-link p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Inserir link (Ctrl+K)"><LinkIcon size={16} /></button>
        <button className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Adicionar comentário"><MessageSquarePlus size={16} /></button>
        
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
        
        <button className="ql-align p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" value="" title="Alinhar à esquerda"><AlignLeft size={16} /></button>
        <button className="ql-align p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" value="center" title="Alinhar ao centro"><AlignCenter size={16} /></button>
        <button className="ql-align p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" value="right" title="Alinhar à direita"><AlignRight size={16} /></button>
        <button className="ql-align p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" value="justify" title="Justificar"><AlignJustify size={16} /></button>
        
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
        
        <button className="ql-list p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" value="bullet" title="Lista com marcadores"><List size={16} /></button>
        <button className="ql-list p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" value="ordered" title="Lista numerada"><ListOrdered size={16} /></button>
        <button className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Lista de verificação"><ListTodo size={16} /></button>
        
        <button className="ql-indent p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" value="-1" title="Diminuir recuo"><Outdent size={16} /></button>
        <button className="ql-indent p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" value="+1" title="Aumentar recuo"><Indent size={16} /></button>
        
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
        
        <button className="ql-clean p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" title="Limpar formatação"><Eraser size={16} /></button>
      </div>
    </div>
  );
};
