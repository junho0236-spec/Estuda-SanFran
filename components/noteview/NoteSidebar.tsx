import React from 'react';
import { Note, SubjectFile } from '../../types';
import { Plus, Upload, Loader2, FileText, File, Trash2, Archive } from 'lucide-react';

interface NoteSidebarProps {
  activeTab: 'notes' | 'repository' | 'assignments';
  setActiveTab: (tab: 'notes' | 'repository' | 'assignments') => void;
  notes: Note[];
  files: SubjectFile[];
  selectedNote: Note | null;
  selectedFile: SubjectFile | null;
  isUploading: boolean;
  isLoading: boolean;
  onCreateNote: () => void;
  onUploadClick: () => void;
  onSelectNote: (note: Note) => void;
  onSelectFile: (file: SubjectFile) => void;
  onDeleteNote: (id: string) => void;
  onDeleteFile: (id: string) => void;
  getCardColor: (id: string) => string;
}

const NoteSidebar: React.FC<NoteSidebarProps> = ({
  activeTab,
  setActiveTab,
  notes,
  files,
  selectedNote,
  selectedFile,
  isUploading,
  isLoading,
  onCreateNote,
  onUploadClick,
  onSelectNote,
  onSelectFile,
  onDeleteNote,
  onDeleteFile,
  getCardColor,
}) => {
  const visibleFiles = files.filter((f) => f.type === (activeTab === 'repository' ? 'repository' : 'assignment'));

  return (
    <aside className="w-80 shrink-0 min-h-0 max-h-full flex flex-col bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner animate-in slide-in-from-left-4 duration-300">
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
          <button onClick={onCreateNote} className="p-2.5 bg-white dark:bg-white/10 text-sanfran-rubi hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 transition-all hover:rotate-90 flex flex-col items-center gap-1">
            <Plus size={20} />
            <span className="text-[7px] font-black uppercase">Novo</span>
          </button>
        ) : (
          <button
            onClick={onUploadClick}
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
          notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className={`group p-5 rounded-[2rem] cursor-pointer transition-all flex items-center justify-between border-2 relative overflow-hidden ${selectedNote?.id === note.id ? 'bg-white dark:bg-slate-900 border-sanfran-rubi shadow-xl -translate-y-1' : 'bg-white/50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-white/10 hover:shadow-lg'}`}
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-full ${getCardColor(note.id)
                  .split(' ')
                  .filter((c) => c.startsWith('bg-'))
                  .join(' ')}`}
              />
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        ) : (
          visibleFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => onSelectFile(file)}
              className={`group p-5 rounded-[2rem] cursor-pointer transition-all flex items-center justify-between border-2 relative overflow-hidden ${
                selectedFile?.id === file.id
                  ? activeTab === 'repository'
                    ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-xl -translate-y-1'
                    : 'bg-white dark:bg-slate-900 border-green-500 shadow-xl -translate-y-1'
                  : 'bg-white/50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-white/10 hover:shadow-lg'
              }`}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}

        {((activeTab === 'notes' && notes.length === 0) || (activeTab !== 'notes' && visibleFiles.length === 0)) && !isLoading && (
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
  );
};

export default NoteSidebar;
