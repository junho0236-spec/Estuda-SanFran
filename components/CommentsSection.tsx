import React, { useState, useEffect } from 'react';
import { Task, UserProfile } from '../types';
import { Send, User } from 'lucide-react';
import { dataService } from '../services/dataService';

interface CommentsSectionProps {
  task: Task;
  userId: string;
  onUpdateTask: (updates: Partial<Task>) => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ task, userId, onUpdateTask }) => {
  const [newComment, setNewComment] = useState('');
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    const fetchProfiles = async () => {
      const uniqueUserIds = Array.from(new Set((task.comments || []).map(c => c.userId)));
      const newProfiles: Record<string, UserProfile> = { ...profiles };
      
      for (const id of uniqueUserIds) {
        if (!newProfiles[id]) {
          const profile = await dataService.getUserProfile(id, true);
          if (profile) newProfiles[id] = profile;
        }
      }
      setProfiles(newProfiles);
    };

    fetchProfiles();
  }, [task.comments]);

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
      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Discussão & Feed</h4>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {(task.comments || []).length === 0 && (
          <div className="text-center py-8 text-slate-400 italic text-xs">
            Nenhuma discussão iniciada ainda.
          </div>
        )}
        {(task.comments || []).map(comment => (
          <div key={comment.id} className={`flex gap-3 ${comment.userId === userId ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200 overflow-hidden">
              {profiles[comment.userId]?.avatar_url ? (
                <img src={profiles[comment.userId].avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={14} className="text-slate-400" />
              )}
            </div>
            <div className={`flex flex-col max-w-[80%] ${comment.userId === userId ? 'items-end' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-600">
                  {profiles[comment.userId]?.full_name || 'Usuário'}
                </span>
                <span className="text-[9px] text-slate-400">
                  {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`p-3 rounded-2xl text-sm ${
                comment.userId === userId 
                  ? 'bg-[#800000] text-white rounded-tr-none' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                {comment.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-4">
        <input 
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddComment()}
          placeholder="Escreva sua mensagem..."
          className="w-full pl-4 pr-12 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#800000]/20 transition-all outline-none"
        />
        <button 
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#800000] text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
