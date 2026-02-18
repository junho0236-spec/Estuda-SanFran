
import React, { useState, useEffect } from 'react';
import { 
  Vote, 
  MessageSquare, 
  TrendingUp, 
  Gavel, 
  Scale, 
  Clock, 
  CheckCircle2,
  Share2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Poll, PollComment } from '../types';

interface TribunalOpiniaoProps {
  userId: string;
  userName: string;
}

const TribunalOpiniao: React.FC<TribunalOpiniaoProps> = ({ userId, userName }) => {
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState<string | null>(null);
  const [comments, setComments] = useState<PollComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPoll();

    const channel = supabase
      .channel('poll_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_polls' }, () => fetchPoll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_poll_comments' }, () => fetchComments(currentPoll?.id))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPoll = async () => {
    setLoading(true);
    // Fetch latest poll for today
    const { data } = await supabase
      .from('sf_polls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      setCurrentPoll(data);
      checkUserVote(data.id);
      fetchComments(data.id);
    }
    setLoading(false);
  };

  const checkUserVote = async (pollId: string) => {
    const { data } = await supabase
      .from('sf_poll_votes')
      .select('vote')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .single();
    
    if (data) setHasVoted(data.vote);
  };

  const fetchComments = async (pollId?: string) => {
    if (!pollId) return;
    const { data } = await supabase
      .from('sf_poll_comments')
      .select('*')
      .eq('poll_id', pollId)
      .order('created_at', { ascending: false });
    
    if (data) setComments(data);
  };

  const handleVote = async (option: 'A' | 'B') => {
    if (!currentPoll || hasVoted) return;

    try {
      // 1. Register Vote
      const { error } = await supabase.from('sf_poll_votes').insert({
        poll_id: currentPoll.id,
        user_id: userId,
        vote: option
      });

      if (error) {
         if (error.code === '23505') alert("Voto já computado.");
         else throw error;
         return;
      }

      // 2. Increment Counter
      const updateData = option === 'A' 
        ? { votes_a: currentPoll.votes_a + 1 }
        : { votes_b: currentPoll.votes_b + 1 };

      await supabase.from('sf_polls').update(updateData).eq('id', currentPoll.id);
      setHasVoted(option);

    } catch (e) {
      console.error(e);
      alert("Erro ao votar.");
    }
  };

  const postComment = async () => {
    if (!currentPoll || !newComment.trim()) return;

    try {
      await supabase.from('sf_poll_comments').insert({
        poll_id: currentPoll.id,
        user_id: userId,
        user_name: userName || 'Anônimo',
        content: newComment,
        vote_choice: hasVoted
      });
      setNewComment('');
    } catch (e) {
      alert("Erro ao comentar.");
    }
  };

  if (loading) {
     return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div></div>;
  }

  if (!currentPoll) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
           <Gavel size={64} className="mb-4 text-slate-400" />
           <h3 className="text-2xl font-black uppercase text-slate-500">Tribunal em Recesso</h3>
           <p className="text-sm font-bold text-slate-400">Nenhuma enquete ativa hoje.</p>
        </div>
     );
  }

  const totalVotes = currentPoll.votes_a + currentPoll.votes_b;
  const percentA = totalVotes > 0 ? Math.round((currentPoll.votes_a / totalVotes) * 100) : 0;
  const percentB = totalVotes > 0 ? Math.round((currentPoll.votes_b / totalVotes) * 100) : 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-[#4338ca] text-white px-4 py-2 rounded-full border border-indigo-500 mb-4">
              <Scale className="w-4 h-4 text-indigo-200" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Veredito Popular</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Tribunal da Opinião</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">A voz das Arcadas sobre os temas do momento.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0">
         
         {/* POLL CARD */}
         <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 md:p-10 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden">
               {/* Background Glow */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

               <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">
                  {currentPoll.category || 'Polêmica do Dia'}
               </span>

               <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight mb-8">
                  "{currentPoll.question}"
               </h3>

               {/* Voting Area */}
               <div className="space-y-4">
                  
                  {/* OPTION A */}
                  <button 
                    onClick={() => handleVote('A')}
                    disabled={!!hasVoted}
                    className={`relative w-full p-6 rounded-2xl border-4 text-left transition-all overflow-hidden group ${hasVoted === 'A' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-white/10 hover:border-indigo-400'}`}
                  >
                     <div className="flex justify-between items-center relative z-10">
                        <span className="text-lg font-black uppercase text-slate-800 dark:text-white">{currentPoll.option_a}</span>
                        {hasVoted && <span className="text-2xl font-black text-slate-900 dark:text-white">{percentA}%</span>}
                     </div>
                     {hasVoted && (
                        <div className="absolute inset-0 bg-indigo-500/10 transition-all duration-1000" style={{ width: `${percentA}%` }}></div>
                     )}
                     {hasVoted === 'A' && <CheckCircle2 className="absolute top-1/2 right-4 -translate-y-1/2 text-emerald-500 opacity-20 w-12 h-12" />}
                  </button>

                  {/* OPTION B */}
                  <button 
                    onClick={() => handleVote('B')}
                    disabled={!!hasVoted}
                    className={`relative w-full p-6 rounded-2xl border-4 text-left transition-all overflow-hidden group ${hasVoted === 'B' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-white/10 hover:border-orange-400'}`}
                  >
                     <div className="flex justify-between items-center relative z-10">
                        <span className="text-lg font-black uppercase text-slate-800 dark:text-white">{currentPoll.option_b}</span>
                        {hasVoted && <span className="text-2xl font-black text-slate-900 dark:text-white">{percentB}%</span>}
                     </div>
                     {hasVoted && (
                        <div className="absolute inset-0 bg-orange-500/10 transition-all duration-1000" style={{ width: `${percentB}%` }}></div>
                     )}
                     {hasVoted === 'B' && <CheckCircle2 className="absolute top-1/2 right-4 -translate-y-1/2 text-emerald-500 opacity-20 w-12 h-12" />}
                  </button>

               </div>

               <div className="mt-8 flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <span>{totalVotes} Votos Computados</span>
                  <div className="flex items-center gap-2">
                     <Clock size={14} /> Encera em 24h
                  </div>
               </div>
            </div>
         </div>

         {/* COMMENTS SECTION */}
         <div className="lg:col-span-5 flex flex-col h-full min-h-[400px]">
            <div className="bg-slate-50 dark:bg-[#1a1a1a] rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/10 flex flex-col h-full overflow-hidden shadow-xl">
               <div className="p-6 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-white/5">
                  <h4 className="text-sm font-black uppercase text-slate-500 dark:text-slate-300 flex items-center gap-2">
                     <MessageSquare size={16} /> Sustentação Oral (Comentários)
                  </h4>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {comments.length === 0 && (
                     <div className="text-center py-10 opacity-40">
                        <p className="text-xs font-bold uppercase">Seja o primeiro a sustentar seu voto.</p>
                     </div>
                  )}
                  {comments.map(comment => (
                     <div key={comment.id} className="bg-white dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-black uppercase text-slate-400">{comment.user_name}</span>
                           {comment.vote_choice && (
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase ${comment.vote_choice === 'A' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                                 Votou em {comment.vote_choice}
                              </span>
                           )}
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                           {comment.content}
                        </p>
                     </div>
                  ))}
               </div>

               <div className="p-4 bg-white dark:bg-black/20 border-t border-slate-200 dark:border-white/5">
                  <div className="flex gap-2">
                     <input 
                       value={newComment}
                       onChange={e => setNewComment(e.target.value)}
                       placeholder={hasVoted ? "Justifique seu voto..." : "Vote para comentar"}
                       disabled={!hasVoted}
                       className="flex-1 bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                     />
                     <button 
                       onClick={postComment}
                       disabled={!hasVoted || !newComment.trim()}
                       className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                     >
                        <Share2 size={16} />
                     </button>
                  </div>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default TribunalOpiniao;
