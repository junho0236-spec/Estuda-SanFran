import React from 'react';
import Quill from 'quill';
import { Minimize2, Sparkles } from 'lucide-react';

interface NoteEditorPaneProps {
  showRuler: boolean;
  isVadeMecumMode: boolean;
  showEquationToolbar: boolean;
  editMode: 'editing' | 'suggesting' | 'viewing';
  setEditMode: (mode: 'editing' | 'suggesting' | 'viewing') => void;
  showPrintLayout: boolean;
  isPageless: boolean;
  showNonPrintingChars: boolean;
  onEditorRef: (node: HTMLDivElement | null) => void;
  pageOrientation: 'portrait' | 'landscape';
  zoomScale: number;
  showComments: boolean;
  setShowComments: (show: boolean) => void;
  quillRef: React.MutableRefObject<Quill | null>;
}

const EQUATION_SYMBOLS = ['∑', '∏', '∫', '√', '∞', '≠', '≈', '≤', '≥'];

const NoteEditorPane: React.FC<NoteEditorPaneProps> = ({
  showRuler,
  isVadeMecumMode,
  showEquationToolbar,
  editMode,
  setEditMode,
  showPrintLayout,
  isPageless,
  showNonPrintingChars,
  onEditorRef,
  pageOrientation,
  zoomScale,
  showComments,
  setShowComments,
  quillRef,
}) => {
  return (
    <>
      {showRuler && !isVadeMecumMode && (
        <div className="h-6 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-white/10 flex items-center px-10 relative overflow-hidden">
          <div className="absolute left-10 top-0 z-10 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-blue-600"></div>
            <div className="w-[2px] h-2 bg-blue-600"></div>
          </div>
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

      {showEquationToolbar && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-4 animate-in slide-in-from-top duration-200">
          <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 px-2">Equação</span>
          <div className="flex gap-2">
            {EQUATION_SYMBOLS.map((sym) => (
              <button
                key={sym}
                onClick={() => quillRef.current?.insertText(quillRef.current.getSelection()?.index || 0, sym)}
                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded shadow-sm hover:bg-blue-500 hover:text-white transition-all font-serif"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

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
          className={`flex-1 quill-editor-custom overflow-auto custom-scrollbar ${showPrintLayout && !isPageless ? 'paper-effect p-3 md:p-6' : 'bg-white dark:bg-[#1a1a1a]'} ${showNonPrintingChars ? 'show-non-printing' : ''} relative`}
          onClick={() => {
            quillRef.current?.focus();
          }}
        >
          <div
            ref={onEditorRef}
            className={`flex-1 ${showPrintLayout && !isPageless ? `my-3 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)] ${pageOrientation === 'portrait' ? 'max-w-[816px] min-h-[1056px]' : 'max-w-[1056px] min-h-[816px]'} mx-auto border border-slate-200 dark:border-white/10` : 'h-full w-full max-w-[1200px] mx-auto'}`}
            style={{
              transform: zoomScale === 1 ? 'none' : `scale(${zoomScale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-in-out',
            }}
          />
        </div>

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
    </>
  );
};

export default NoteEditorPane;
