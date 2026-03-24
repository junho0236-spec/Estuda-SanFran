import React, { useState } from 'react';
import { Task } from '../types';
import { Send } from 'lucide-react';
import { dataService } from '../services/dataService';

interface CommentsSectionProps {
  task: Task;
  userId: string;
  onUpdateTask: (updates: Partial<Task>) => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ task, userId, onUpdateTask }) => {
  const [newComment, setNewComment] = useState('');

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const comment = {
      id: crypto.randomUUID(),
      userId,
      text: newComment,
      createdAt: new Date().toISOString()
    };
    const updatedComments = [...(task.comments || []), comment];
    onUpdateTask({ comments: updatedComments });
    setNewComment('');
  };

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Discussão</h4>
      <div className="space-y-2">
        {(task.comments || []).map(comment => (
          <div key={comment.id} className="p-3 bg-slate-50 rounded-lg text-sm">
            <p className="text-slate-800">{comment.text}</p>
            <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input 
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Adicionar comentário..."
          className="flex-1 p-2 border border-slate-200 rounded-lg text-sm"
        />
        <button onClick={handleAddComment} className="p-2 bg-[#800000] text-white rounded-lg"><Send size={16} /></button>
      </div>
    </div>
  );
};
