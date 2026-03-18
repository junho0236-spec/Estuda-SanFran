import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { QuestionComment } from '../types';
import { Send, User, MessageSquare, Loader2, Trash2, Reply, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';

interface QuestionCommentsProps {
  questionId: string;
  userId: string;
  isAnswered: boolean;
  questionTitle?: string;
  showNotification?: (message: string, type: 'success' | 'error') => void;
}

export const QuestionComments: React.FC<QuestionCommentsProps> = ({ 
  questionId, 
  userId, 
  isAnswered,
  questionTitle = "uma questão",
  showNotification
}) => {
  const [comments, setComments] = useState<QuestionComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<QuestionComment | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAnswered) {
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
    }
  }, [questionId, isAnswered]);

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
      // Fallback fetch without join if join fails
      try {
        const { data, error: fallbackError } = await supabase
          .from('question_comments')
          .select('*')
          .eq('question_id', questionId)
          .order('created_at', { ascending: true });
        if (!fallbackError) setComments(data || []);
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      const commentData: any = {
        question_id: questionId,
        user_id: userId,
        content: newComment.trim()
      };

      if (replyingTo) {
        commentData.parent_id = replyingTo.id;
        commentData.reply_to_user_id = replyingTo.user_id;
      }

      const { error } = await supabase
        .from('question_comments')
        .insert(commentData);

      if (error) throw error;

      // Create notification if it's a reply
      if (replyingTo && replyingTo.user_id !== userId) {
        await dataService.createNotification(
          replyingTo.user_id,
          `Alguém respondeu seu comentário na questão: "${questionTitle.substring(0, 30)}..."`,
          undefined,
          'reply'
        );
      }

      setNewComment('');
      setReplyingTo(null);
      if (showNotification) showNotification('Comentário enviado com sucesso!', 'success');
      
      // Manual refresh in case realtime is slow
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      if (showNotification) showNotification('Erro ao enviar comentário. Verifique se as tabelas foram criadas no Supabase.', 'error');
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
      if (showNotification) showNotification('Comentário excluído.', 'success');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      if (showNotification) showNotification('Erro ao excluir comentário.', 'error');
    }
  };

  if (!isAnswered) {
    return (
      <div className="mt-8 p-8 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 text-center">
        <MessageSquare size={32} className="mx-auto mb-4 text-slate-300" />
        <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">
          Área de Discussão Bloqueada
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Responda a questão pela primeira vez para liberar os comentários da comunidade e compartilhar mnemônicos!
        </p>
      </div>
    );
  }

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
          comments.map((comment) => {
            const isReply = !!comment.parent_id;
            const parentComment = isReply ? comments.find(c => c.id === comment.parent_id) : null;

            return (
              <div key={comment.id} className={`flex gap-4 group ${isReply ? 'ml-12' : ''}`}>
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
                      {isReply && parentComment && (
                        <span className="text-[10px] text-blue-500 font-bold">
                          em resposta a {parentComment.user_profile?.full_name || 'Usuário'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setReplyingTo(comment)}
                        className="text-slate-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Responder"
                      >
                        <Reply size={14} />
                      </button>
                      {comment.user_id === userId && (
                        <button 
                          onClick={() => handleDelete(comment.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl rounded-tl-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {comment.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {replyingTo && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              Respondendo a {replyingTo.user_profile?.full_name || 'Usuário'}
            </span>
            <button 
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-blue-400 hover:text-blue-600"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Escreva sua resposta..." : "Escreva seu comentário, mnemônico ou dúvida..."}
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
        </div>
      </form>
    </div>
  );
};
