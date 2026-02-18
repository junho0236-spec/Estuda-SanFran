
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Book, 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  Clock, 
  Vote, 
  Trophy, 
  Coffee, 
  Award,
  ChevronRight,
  BookType
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { BookCycle, BookChatMessage } from '../types';
import confetti from 'canvas-confetti';

interface ClubeLivroProps {
  userId: string;
  userName: string;
}

const DEFAULT_CANDIDATES = [
  { title: 'Crime e Castigo', author: 'Dostoiévski', cover_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300&auto=format&fit=crop' },
  { title: 'O Processo', author: 'Franz Kafka', cover_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=300&auto=format&fit=crop' },
  { title: 'O Estrangeiro', author: 'Albert Camus', cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=300&auto=format&fit=crop' }
];

const ClubeLivro: React.FC<ClubeLivroProps> = ({ userId, userName }) => {
  const [cycle, setCycle] = useState<BookCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState<number | null>(null);
  const [voteCounts, setVoteCounts] = useState<number[]>([0, 0, 0]);
  
  // Chat State
  const [messages, setMessages] = useState<BookChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check-in State
  const [checkedWeeks, setCheckedWeeks] = useState<Set<number>>(new Set());

  useEffect(() => {
    initializeClub();
  }, []);

  useEffect(() => {
    if (cycle) {
       fetchVotes(cycle.id);
       fetchCheckins(cycle.id);
       fetchChat(cycle.id);
       
       // Realtime
       const votesSub = supabase.channel(`votes:${cycle.id}`)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_book_votes', filter: `cycle_id=eq.${cycle.id}` }, () => fetchVotes(cycle.id))
         .subscribe();
         
       const chatSub = supabase.channel(`chat:${cycle.id}`)
         .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sf_book_chat', filter: `cycle_id=eq.${cycle.id}` }, (payload) => {
            setMessages(prev => [...prev, payload.new as BookChatMessage]);
            scrollToBottom();
         })
         .subscribe();
       
       return () => {
         supabase.removeChannel(votesSub);
         supabase.removeChannel(chatSub);
       };
    }
  }, [cycle?.id]);

  const initializeClub = async () => {
    setLoading(true);
    try {
      // 1. Get current month cycle
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      
      const { data: existingCycle } = await supabase
        .from('sf_book_cycles')
        .select('*')
        .eq('month_year', monthStart)
        .single();
      
      if (existingCycle) {
        setCycle(existingCycle);
      } else {
        // Create new cycle (In real app, this should be a backend trigger or admin action)
        // Logic: If day <= 5, status 'voting'. Else 'reading' (with default book for fallback)
        const isVoting = today.getDate() <= 5;
        const status = isVoting ? 'voting' : 'reading';
        
        const { data: newCycle, error } = await supabase.from('sf_book_cycles').insert({
          month_year: monthStart,
          status: status,
          candidates: DEFAULT_CANDIDATES,
          selected_book: status === 'reading' ? DEFAULT_CANDIDATES[0] : null,
          current_week: Math.ceil(today.getDate() / 7)
        }).select().single();
        
        if (newCycle) setCycle(newCycle);
      }
    } catch (e) {
      console.error("Erro ao iniciar clube:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchVotes = async (cycleId: string) => {
    const { data } = await supabase.from('sf_book_votes').select('book_index, user_id').eq('cycle_id', cycleId);
    if (data) {
      const counts = [0, 0, 0];
      data.forEach(v => counts[v.book_index]++);
      setVoteCounts(counts);
      
      const myVote = data.find(v => v.user_id === userId);
      if (myVote) setHasVoted(myVote.book_index);
    }
  };

  const fetchCheckins = async (cycleId: string) => {
    const { data } = await supabase.from('sf_book_checkins').select('week').eq('cycle_id', cycleId).eq('user_id', userId);
    if (data) setCheckedWeeks(new Set(data.map(d => d.week)));
  };

  const fetchChat = async (cycleId: string) => {
    const { data } = await supabase.from('sf_book_chat').select('*').eq('cycle_id', cycleId).order('created_at', { ascending: true });
    if (data) setMessages(data);
    scrollToBottom();
  };

  const handleVote = async (index: number) => {
    if (!cycle || hasVoted !== null) return;
    try {
      await supabase.from('sf_book_votes').insert({
        cycle_id: cycle.id,
        user_id: userId,
        book_index: index
      });
      setHasVoted(index);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (e) {
      alert("Erro ao votar.");
    }
  };

  const handleCheckin = async (week: number) => {
    if (!cycle) return;
    if (checkedWeeks.has(week)) return;

    try {
      await supabase.from('sf_book_checkins').insert({
        cycle_id: cycle.id,
        user_id: userId,
        week: week
      });
      setCheckedWeeks(prev => new Set(prev).add(week));
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (e) {
      alert("Erro no check-in.");
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !cycle) return;
    try {
      await supabase.from('sf_book_chat').insert({
        cycle_id: cycle.id,
        user_id: userId,
        user_name: userName || 'Leitor',
        message: newMessage
      });
      setNewMessage('');
    } catch (e) { console.error(e); }
  };

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#5D4037]"></div></div>;

  if (!cycle) return null;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-serif">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 font-sans">
        <div>
           <div className="inline-flex items-center gap-2 bg-[#5D4037]/10 px-4 py-2 rounded-full border border-[#5D4037]/20 mb-4">
              <BookType className="w-4 h-4 text-[#5D4037] dark:text-[#A1887F]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#5D4037] dark:text-[#A1887F]">Literatura Clássica</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Clube do Livro</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Expanda seus horizontes além do Vade Mecum.</p>
        </div>
      </header>

      {/* PHASE 1: VOTING */}
      {cycle.status === 'voting' && (
         <div className="flex-1 overflow-y-auto">
            <div className="text-center mb-10">
               <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-2">Votação do Mês</h3>
               <p className="text-slate-500 font-bold text-sm">Escolha a próxima obra a ser debatida.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {cycle.candidates?.map((book: any, idx: number) => {
                  const isSelected = hasVoted === idx;
                  return (
                     <div key={idx} className={`relative group cursor-pointer transition-all duration-300 ${isSelected ? 'scale-105' : 'hover:scale-105'}`} onClick={() => handleVote(idx)}>
                        <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl relative border-4 border-white dark:border-[#2d2d2d]">
                           <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                              <h4 className="text-white font-black text-xl leading-tight">{book.title}</h4>
                              <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">{book.author}</p>
                           </div>
                           {isSelected && (
                              <div className="absolute top-4 right-4 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                                 <CheckCircle2 size={24} />
                              </div>
                           )}
                        </div>
                        <div className="mt-4 text-center">
                           <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-2">
                              <div className="h-full bg-[#5D4037] transition-all duration-1000" style={{ width: `${(voteCounts[idx] / Math.max(1, voteCounts.reduce((a,b)=>a+b,0))) * 100}%` }}></div>
                           </div>
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{voteCounts[idx]} Votos</p>
                        </div>
                     </div>
                  )
               })}
            </div>
         </div>
      )}

      {/* PHASE 2: READING */}
      {cycle.status === 'reading' && cycle.selected_book && (
         <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
            
            {/* Left: Book Info & Progress */}
            <div className="lg:w-1/3 flex flex-col gap-6">
               <div className="bg-[#fdfbf7] dark:bg-[#1c1917] p-8 rounded-[2.5rem] border-2 border-[#e7e5e4] dark:border-[#292524] shadow-xl text-center relative overflow-hidden">
                   {/* Book Cover */}
                   <div className="w-40 mx-auto aspect-[2/3] rounded-xl shadow-2xl overflow-hidden border-4 border-white dark:border-[#2d2d2d] mb-6 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                      <img src={cycle.selected_book.cover_url} alt="Capa" className="w-full h-full object-cover" />
                   </div>
                   
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight font-serif">{cycle.selected_book.title}</h3>
                   <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2 mb-6">{cycle.selected_book.author}</p>

                   <div className="space-y-3">
                      {[1, 2, 3, 4].map(week => {
                         const isDone = checkedWeeks.has(week);
                         const isCurrent = week === cycle.current_week;
                         return (
                            <button 
                              key={week}
                              disabled={week > cycle.current_week || isDone}
                              onClick={() => handleCheckin(week)}
                              className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                                 isDone ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' :
                                 isCurrent ? 'bg-white dark:bg-white/5 border-[#5D4037] shadow-lg scale-105' :
                                 'bg-slate-50 dark:bg-black/20 border-transparent opacity-60'
                              }`}
                            >
                               <div className="text-left">
                                  <span className={`text-[10px] font-black uppercase tracking-widest block ${isDone ? 'text-emerald-600' : 'text-slate-500'}`}>Semana {week}</span>
                                  <span className="text-xs font-bold font-sans">Capítulos {((week-1)*5)+1} a {week*5}</span>
                               </div>
                               {isDone ? <CheckCircle2 className="text-emerald-500" /> : isCurrent ? <div className="h-4 w-4 rounded-full border-2 border-[#5D4037]" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                            </button>
                         )
                      })}
                   </div>
               </div>
            </div>

            {/* Right: Discussion */}
            <div className="flex-1 bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex flex-col overflow-hidden h-[600px] lg:h-auto">
               <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <MessageSquare size={18} className="text-slate-400" />
                     <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wide font-sans">Debate Literário</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase bg-white dark:bg-black/20 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10">
                     <Coffee size={12} /> Café & Livros
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar font-sans">
                  {messages.length === 0 && (
                     <div className="text-center py-20 opacity-40">
                        <BookOpen size={48} className="mx-auto mb-4 text-slate-400" />
                        <p className="text-sm font-bold uppercase text-slate-500">Inicie a discussão sobre o livro.</p>
                     </div>
                  )}
                  {messages.map((msg) => {
                     const isMe = msg.user_id === userId;
                     return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                           <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${isMe ? 'bg-[#5D4037] text-white rounded-tr-none' : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                              {!isMe && <p className="text-[9px] font-black uppercase opacity-60 mb-1 tracking-widest">{msg.user_name}</p>}
                              {msg.message}
                           </div>
                           <span className="text-[9px] font-bold text-slate-300 mt-1 px-1">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                     )
                  })}
                  <div ref={chatEndRef} />
               </div>

               <form onSubmit={sendMessage} className="p-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex gap-3">
                  <input 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Compartilhe sua impressão..."
                    className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#5D4037] font-sans"
                  />
                  <button type="submit" className="p-3 bg-[#5D4037] text-white rounded-xl shadow-lg hover:bg-[#4E342E] transition-colors">
                     <Send size={18} />
                  </button>
               </form>
            </div>

         </div>
      )}

    </div>
  );
};

export default ClubeLivro;
