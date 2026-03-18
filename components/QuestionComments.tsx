import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { QuestionComment } from '../types';
import { Send, User, MessageSquare, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuestionCommentsProps {
  questionId: string;
  userId: string;
}

export const QuestionComments: React.FC<QuestionCommentsProps> = ({ questionId, userId }) => {
  const [comments, setComments] = useState<QuestionComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchComments();

    // Real-time subscription
    const channel = supabase
      .channel(`question_comments_${questionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'question_comments',
        filter: `question_id=eq.${questionId}`
      }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [questionId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('question_comments')
        .select(`
          *,
          user_profile:user_persona(full_name, avatar_url)
        `)
        .eq('question_id', questionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('question_comments')
        .insert({
          question_id: questionId,
          user_id: userId,
          content: newComment.trim()
        });

      if (error) throw error;
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Deseja excluir seu comentário?')) return;

    try {
      const { error } = await supabase
        .from('question_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare size={18} className="text-blue-500" />
        <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
          Discussão da Comunidade ({comments.length})
        </h3>
      </div>

      <div className="space-y-6 mb-8">
        {loading && comments.length === 0 ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm italic">
            Nenhum comentário ainda. Seja o primeiro a compartilhar um mnemônico ou dúvida!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4 group">
              <button 
                onClick={() => navigate(`/profile/${comment.user_id}`)}
                className="shrink-0 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-900 shadow-sm hover:ring-2 hover:ring-blue-500 transition-all"
              >
                {comment.user_profile?.avatar_url ? (
                  <img 
                    src={comment.user_profile.avatar_url} 
                    alt={comment.user_profile.full_name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User size={20} />
                  </div>
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate(`/profile/${comment.user_id}`)}
                      className="text-xs font-black text-slate-900 dark:text-white hover:text-blue-500 transition-colors"
                    >
                      {comment.user_profile?.full_name || 'Usuário'}
                    </button>
                    <span className="text-[10px] text-slate-400">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {comment.user_id === userId && (
                    <button 
                      onClick={() => handleDelete(comment.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl rounded-tl-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva seu comentário, mnemônico ou dúvida..."
            className="w-full p-4 pr-12 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 transition-all resize-none min-h-[100px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button 
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="absolute bottom-4 right-4 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-blue-900/20"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
