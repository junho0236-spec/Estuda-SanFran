import React from 'react';
import { AlertCircle, BrainCircuit, File, Folder, Sparkles } from 'lucide-react';
import { SubjectFile } from '../../types';

interface FilePreviewPanelProps {
  activeTab: 'repository' | 'assignments';
  selectedFile: SubjectFile | null;
  onUploadClick: () => void;
  onGenerateFlashcards: (file: SubjectFile) => void;
}

const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({
  activeTab,
  selectedFile,
  onUploadClick,
  onGenerateFlashcards,
}) => {
  if (!selectedFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-8 p-12 text-center">
        <div className="w-32 h-32 bg-slate-50 dark:bg-white/5 rounded-[3rem] flex items-center justify-center animate-float shadow-inner">
          <Folder size={64} className="opacity-10" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Seu Repositório</h3>
          <p className="text-sm font-medium max-w-sm mx-auto text-slate-500 leading-relaxed">Suba PDFs, doutrinas ou enunciados para ter tudo organizado em um só lugar e gerar flashcards instantâneos.</p>
        </div>
        <button
          onClick={onUploadClick}
          className={`px-10 py-5 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 ${activeTab === 'repository' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'}`}
        >
          Enviar Arquivo
        </button>
      </div>
    );
  }

  return (
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
            onClick={() => onGenerateFlashcards(selectedFile)}
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
  );
};

export default FilePreviewPanel;
