import React, { useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import { ArrowLeft, Save, Loader2, FileText, BrainCircuit, Sparkles } from 'lucide-react';
import { Note } from '../types';
import { dataService } from '../services/dataService';
import { summarizeText } from '../services/geminiService';

import { ArrowLeft, Save, Loader2, FileText, BrainCircuit, Sparkles, Tag, Split, Download } from 'lucide-react';
import { Note, Subject } from '../types';
import { dataService } from '../services/dataService';
import { summarizeText } from '../services/geminiService';
import html2pdf from 'html2pdf.js';
import { Document, Packer, Paragraph, TextRun } from 'docx';

interface NoteViewProps {
  subjectId: string; // Initial subject ID, can be changed
  userId: string;
  isOnline: boolean;
  onBack: () => void;
  onNavigateToAnki: (text: string) => void; // For generating flashcards
  subjects: Subject[]; // List of all subjects
  onToggleSidebar: (isOpen: boolean) => void; // Function to toggle sidebar visibility
}

const NoteView: React.FC<NoteViewProps> = ({ subjectId: initialSubjectId, userId, isOnline, onBack, onNavigateToAnki, subjects, onToggleSidebar }) => {
  const [noteContent, setNoteContent] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId);

  const modules = {
    toolbar: [
      [{ 'header': '1' }, { 'header': '2' }, { 'font': [] }],
      [{ size: [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
      ['link', 'image', 'video'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['code-block']
    ],
  };

  const templates = {
    doutrina: '<h2>Referência Bibliográfica</h2><p><br></p><h2>Conceitos Principais</h2><p><br></p><h2>Citações Importantes</h2><p><br></p><h2>Crítica Pessoal</h2><p><br></p>',
    jurisprudencia: '<h2>Fatos</h2><p><br></p><h2>Fundamentos Jurídicos</h2><p><br></p><h2>Ratio Decidendi</h2><p><br></p><h2>Dispositivo</h2><p><br></p>',
    aula: '<h2>Data</h2><p><br></p><h2>Professor</h2><p><br></p><h2>Tema Central</h2><p><br></p><h2>Artigos Citados</h2><p><br></p>',
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background',
    'align',
    'code-block'
  ];

  const loadNote = useCallback(async () => {
    setIsLoading(true);
    try {
      const existingNote = await dataService.getNoteBySubjectId(initialSubjectId, userId, isOnline);
      if (existingNote) {
        setNoteId(existingNote.id);
        setNoteContent(existingNote.content);
        setSelectedSubjectId(existingNote.subject_id); // Set selected subject from loaded note
      } else {
        setNoteId(null);
        setNoteContent('');
        setSelectedSubjectId(initialSubjectId); // Use initialSubjectId if no note found
      }
    } catch (error) {
      console.error('Error loading note:', error);
      alert('Erro ao carregar anotação.');
    } finally {
      setIsLoading(false);
    }
  }, [initialSubjectId, userId, isOnline]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  // Auto-save effect
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      saveNoteContent(true); // Call with isAuto = true
    }, 30000); // Every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [saveNoteContent]);

  const saveNoteContent = useCallback(async (isAuto: boolean = false) => {
    if (!noteContent.trim()) return; // Don't save empty notes

    if (isAuto) setIsAutoSaving(true);
    else setIsSaving(true);

    try {
      const extractedTags = (noteContent.match(/#(\w+)/g) || []).map(tag => tag.substring(1));

      const newNote: Note = {
        id: noteId || Math.random().toString(36).substr(2, 9),
        subject_id: selectedSubjectId, // Use selectedSubjectId
        user_id: userId,
        content: noteContent,
        updated_at: new Date().toISOString(),
        tags: extractedTags,
      };

      await dataService.saveNote(newNote, userId, isOnline);
      setNoteId(newNote.id); // Ensure noteId is set if it was a new note
      if (!isAuto) alert('Anotação salva com sucesso!');
    } catch (error) {
      console.error('Error saving note:', error);
      if (!isAuto) alert('Erro ao salvar anotação.');
    } finally {
      if (isAuto) setIsAutoSaving(false);
      else setIsSaving(false);
    }
  }, [noteContent, noteId, selectedSubjectId, userId, isOnline]);

  const handleSaveNote = () => {
    saveNoteContent(false);
  };

  const applyTemplate = (template: keyof typeof templates) => {
    setNoteContent(noteContent + templates[template]);
    setIsTemplateMenuOpen(false);
  };

  const handleGenerateFlashcards = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    if (plainText.trim().length < 50) {
      alert("Por favor, escreva um texto mais substancial antes de gerar flashcards.");
      return;
    }
    onNavigateToAnki(plainText);
  };

  const handleExportPdf = () => {
    setIsExportMenuOpen(false);
    const element = document.createElement('div');
    element.innerHTML = noteContent;
    html2pdf().from(element).save('anotacao.pdf');
  };

  const handleExportDocx = async () => {
    setIsExportMenuOpen(false);
    const plainText = new DOMParser().parseFromString(noteContent, 'text/html').body.textContent || '';
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
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
    link.download = 'anotacao.docx';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleSummarize = async () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";

    if (plainText.trim().length < 200) {
      alert("O texto é muito curto para ser resumido. Escreva mais um pouco.");
      return;
    }
    setIsSummarizing(true);
    try {
      const summary = await summarizeText(plainText);
      setNoteContent(summary?.replace(/\n/g, '<br/>') || '');
    } catch (error) {
      console.error("Error summarizing text:", error);
      alert("Ocorreu um erro ao tentar resumir o texto.");
    } finally {
      setIsSummarizing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        <p className="ml-3 text-slate-500">Carregando anotação...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full animate-in slide-in-from-right-4 duration-300 ${isSplitView ? 'lg:w-full' : 'lg:w-auto'}`}>
      <header className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-purple-500">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-start">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="mb-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Minhas Anotações</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Split View Button */}
          <button
            onClick={() => {
              setIsSplitView(prev => !prev);
              onToggleSidebar(isSplitView); // Toggle sidebar based on new split view state
            }}
            className="py-2 px-4 bg-slate-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-600 transition-colors"
          >
            <Split size={18} /> {isSplitView ? 'Sair do Split' : 'Split View'}
          </button>
          {/* AI Summarize Button */}
          <button 
            onClick={handleSummarize}
            disabled={isSummarizing}
            className="py-2 px-4 bg-yellow-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={18} />} Resumir
          </button>

          {/* Generate Flashcards Button */}
          <button 
            onClick={handleGenerateFlashcards}
            className="py-2 px-4 bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors"
          >
            <BrainCircuit size={18} /> Gerar Flashcards
          </button>

          {/* Template Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
              className="py-2 px-4 bg-slate-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors"
            >
              <FileText size={18} /> Usar Template
            </button>
            {isTemplateMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                <a onClick={() => applyTemplate('doutrina')} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Fichamento de Doutrina</a>
                <a onClick={() => applyTemplate('jurisprudencia')} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Análise de Jurisprudência</a>
                <a onClick={() => applyTemplate('aula')} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Resumo de Aula</a>
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="py-2 px-4 bg-green-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-colors"
            >
              <Download size={18} /> Exportar
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                <a onClick={handleExportPdf} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Exportar para PDF</a>
                <a onClick={handleExportDocx} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">Exportar para DOCX</a>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSaveNote} 
            disabled={isSaving || isAutoSaving}
            className="py-2 px-4 bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {(isSaving || isAutoSaving) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />} 
            {(isSaving || isAutoSaving) ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#181818] rounded-2xl shadow-xl">
        <ReactQuill 
          theme="snow" 
          value={noteContent} 
          onChange={setNoteContent}
          modules={modules}
          formats={formats}
          className="h-full min-h-[400px] quill-editor-custom" // Custom class for height
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(noteContent.match(/#(\w+)/g) || []).map((tag, index) => (
          <span key={index} className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
            <Tag size={12} /> {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default NoteView;
