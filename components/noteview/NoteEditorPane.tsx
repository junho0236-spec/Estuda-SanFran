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
  noteContent: string;
}

const EQUATION_SYMBOLS = ['∑', '∏', '∫', '√', '∞', '≠', '≈', '≤', '≥'];

/** ~96 CSS px per inch; 8.5in printable width matches 816px page */
const PAGE_PX = 816;
const RULER_INCHES = 9;

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
  noteContent,
}) => {
  const comments = React.useMemo(() => {
    const doc = new DOMParser().parseFromString(noteContent, 'text/html');
    const commentNodes = doc.querySelectorAll('span[data-comment]');
    return Array.from(commentNodes).map((node, index) => ({
      id: index,
      text: node.getAttribute('data-comment') || '',
      context: node.textContent || ''
    }));
  }, [noteContent]);

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
      {showRuler && !isVadeMecumMode && (
        <div className="flex h-7 min-h-[28px] w-full shrink-0 justify-center border-b border-[#dadce0] bg-[#e8eaed] dark:border-white/10 dark:bg-slate-800/90">
          <div
            className="relative box-border h-full w-full max-w-[816px] min-w-0 px-0"
            style={{ maxWidth: PAGE_PX }}
            aria-hidden
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-[72px] right-[72px] flex justify-between"
              title="Régua (polegadas, alinhada à área útil da página)"
            >
              {Array.from({ length: RULER_INCHES }, (_, inch) => (
                <div key={inch} className="flex flex-col items-center">
                  <div className="flex h-3 w-px flex-col items-center justify-start bg-slate-500 dark:bg-slate-400">
                    <div className="h-2 w-px bg-slate-600 dark:bg-slate-300" />
                  </div>
                  <span className="text-[9px] font-medium tabular-nums text-slate-600 dark:text-slate-300">{inch}</span>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-[72px] right-[72px] h-px bg-slate-300/80 dark:bg-slate-500/50" />
            <div className="pointer-events-none absolute left-[72px] top-0 z-10 flex flex-col items-center">
              <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#1a73e8]" />
              <div className="h-2 w-0.5 bg-[#1a73e8]" />
            </div>
            <div className="pointer-events-none absolute right-[72px] top-0 z-10 flex flex-col items-center">
              <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#1a73e8]" />
              <div className="h-2 w-0.5 bg-[#1a73e8]" />
            </div>
          </div>
        </div>
      )}

      {showEquationToolbar && (
        <div className="shrink-0 bg-blue-50 dark:bg-blue-900/20 p-2 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-4 animate-in slide-in-from-top duration-200">
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

      <div className="relative z-0 flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`quill-editor-custom relative min-h-0 min-w-0 flex-1 overflow-auto custom-scrollbar ${showPrintLayout && !isPageless ? 'paper-effect px-3 py-4 md:px-6 md:py-6' : 'bg-white dark:bg-[#1a1a1a]'} ${showNonPrintingChars ? 'show-non-printing' : ''}`}
          onClick={() => {
            quillRef.current?.focus();
          }}
        >
          <div className="flex min-h-0 min-w-0 w-full flex-1 justify-center">
            <div
              className={`box-border w-full min-w-0 shrink-0 flex flex-col ${showPrintLayout && !isPageless ? `shadow-[0_1px_3px_rgba(0,0,0,0.12),0_4px_12px_rgba(60,64,67,0.08)] ${pageOrientation === 'portrait' ? 'min-h-[min(1056px,70dvh)]' : 'min-h-[min(816px,65dvh)]'} border border-[#dadce0] bg-white dark:border-white/10 dark:bg-[#1a1a1a]` : 'max-w-[1200px] min-h-[240px] bg-white dark:bg-[#1a1a1a]'}`}
              style={{
                maxWidth:
                  showPrintLayout && !isPageless
                    ? pageOrientation === 'portrait'
                      ? PAGE_PX
                      : 1056
                    : undefined,
                zoom: zoomScale !== 1 ? zoomScale : undefined,
              }}
            >
              <div ref={onEditorRef} className="note-quill-mount flex-1 min-h-[200px] w-full min-w-0 flex flex-col" />
            </div>
          </div>
        </div>

        {showComments && (
          <aside className="w-80 bg-slate-50 dark:bg-white/5 border-l border-slate-200 dark:border-white/10 p-6 animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comentários</h4>
              <button onClick={() => setShowComments(false)} className="text-slate-400 hover:text-slate-600"><Minimize2 size={16} /></button>
            </div>
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5">
                  <p className="text-xs text-slate-500 italic">Nenhum comentário neste documento.</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">"{comment.context}"</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{comment.text}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default NoteEditorPane;
