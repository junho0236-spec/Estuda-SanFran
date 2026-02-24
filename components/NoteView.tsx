import React, { useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Note } from '../types';
import { dataService } from '../services/dataService';

interface NoteViewProps {
  subjectId: string;
  userId: string;
  isOnline: boolean;
  onBack: () => void;
}

const NoteView: React.FC<NoteViewProps> = ({ subjectId, userId, isOnline, onBack }) => {
  const [noteContent, setNoteContent] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      const existingNote = await dataService.getNoteBySubjectId(subjectId, userId, isOnline);
      if (existingNote) {
        setNoteId(existingNote.id);
        setNoteContent(existingNote.content);
      } else {
        setNoteId(null);
        setNoteContent('');
      }
    } catch (error) {
      console.error('Error loading note:', error);
      alert('Erro ao carregar anotação.');
    } finally {
      setIsLoading(false);
    }
  }, [subjectId, userId, isOnline]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const handleSaveNote = async () => {
    setIsSaving(true);
    try {
      const newNote: Note = {
        id: noteId || Math.random().toString(36).substr(2, 9),
        subject_id: subjectId,
        user_id: userId,
        content: noteContent,
        updated_at: new Date().toISOString(),
      };

      await dataService.saveNote(newNote, userId, isOnline);
      setNoteId(newNote.id); // Ensure noteId is set if it was a new note
      alert('Anotação salva com sucesso!');
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Erro ao salvar anotação.');
    } finally {
      setIsSaving(false);
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
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
      <header className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-purple-500">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Minhas Anotações</h2>
        <button 
          onClick={handleSaveNote} 
          disabled={isSaving}
          className="py-2 px-4 bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />} Salvar
        </button>
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
    </div>
  );
};

export default NoteView;
