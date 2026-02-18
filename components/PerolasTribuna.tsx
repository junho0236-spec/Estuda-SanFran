
import React, { useState, useEffect, useMemo } from 'react';
import { Quote, Send, Plus, Laugh, AlertTriangle, Crown, X, MessageCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface PerolasTribunaProps {
  userId: string;
  userName: string;
}

interface QuoteItem {
  id: string;
  professor: string;
  subject: string;
  quote: string;
  likes_funny: number;
  likes_shock: number;
  user_name: string;
  created_at: string;
}

const PerolasTribuna: React.FC<PerolasTribunaProps> = ({ userId, userName }) => {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [newProfessor, setNewProfessor] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newQuote, setNewQuote] = useState('');

  // Local Vote State to prevent spam in same session (basic)
  const [votedQuotes, setVotedQuotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQuotes();

    const channel = supabase
      .channel('quotes_update')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_quotes' }, () => fetchQuotes())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    // Fetch last 30 days to keep ranking relevant
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await supabase
      .from('sf_quotes')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    
    if (data) setQuotes(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newProfessor.trim() || !newQuote.trim()) {
      alert("Preencha o professor e a frase.");
      return;
    }

    try {
      const { error } = await supabase.from('sf_quotes').insert({
        user_id: userId,
        user_name: userName || 'Anônimo',
        professor: newProfessor,
        subject: newSubject,
        quote: newQuote
      });

      if (error) throw error;
      
      setShowModal(false);
      setNewProfessor(''); setNewSubject(''); setNewQuote('');
      alert("Pérola registrada nos anais!");
    } catch (e) {
      alert("Erro ao publicar.");
    }
  };

  const handleVote = async (quote: QuoteItem, type: 'funny' | 'shock') => {
    const voteKey = `${quote.id}-${type}`;
    if (votedQuotes.has(voteKey)) return;

    // Optimistic Update
    setQuotes(prev => prev.map(q => {
        if (q.id === quote.id) {
            return {
                ...q,
                likes_funny: type === 'funny' ? q.likes_funny + 1 : q.likes_funny,
                likes_shock: type === 'shock' ? q.likes_shock + 1 : q.likes_shock
            };
        }
        return q;
    }));

    setVotedQuotes(prev => new Set(prev).add(voteKey));

    try {
      const updateData = type === 'funny' 
        ? { likes_funny: quote.likes_funny + 1 }
        : { likes_shock: quote.likes_shock + 1 };
      
      await supabase.from('sf_quotes').update(updateData).eq('id', quote.id);
    } catch (e) {
      console.error(e);
    }
  };

  const ranking = useMemo(() => {
    const profStats: Record<string, number> = {};
    quotes.forEach(q => {
        const total = q.likes_funny + q.likes_shock;
        profStats[q.professor] = (profStats[q.professor] || 0) + total;
    });

    return Object.entries(profStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // Top 3
      .map(([name, score]) => ({ name, score }));
  }, [quotes]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/20 px-4 py-2 rounded-full border border-yellow-200 dark:border-yellow-800 mb-4">
              <Quote className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">Sabedoria (In)formal</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Pérolas da Tribuna</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">O arquivo histórico das melhores frases de aula.</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-8 py-4 bg-yellow-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all hover:bg-yellow-700"
        >
           <Plus size={16} /> Nova Pérola
        </button>
      </header>

      {/* RANKING */}
      {ranking.length > 0 && (
         <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 p-6 rounded-[2.5rem] border border-yellow-200 dark:border-yellow-800/30 shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="text-center md:text-left">
                  <h3 className="text-xl font-black text-yellow-800 dark:text-yellow-500 uppercase tracking-tight flex items-center gap-2 justify-center md:justify-start">
                     <Crown size={24} /> O Filósofo da Semana
                  </h3>
                  <p className="text-xs font-bold text-yellow-700/70 dark:text-yellow-500/70">Quem mais causou impacto nas Arcadas</p>
               </div>
               <div className="flex gap-4">
                  {ranking.map((prof, idx) => (
                     <div key={idx} className="flex flex-col items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg border-2 shadow-sm ${idx === 0 ? 'bg-yellow-400 text-white border-yellow-500 scale-110' : 'bg-white dark:bg-white/10 text-slate-500 border-slate-200 dark:border-white/10'}`}>
                           {idx + 1}º
                        </div>
                        <p className="text-[10px] font-black uppercase mt-2 text-slate-600 dark:text-slate-300 max-w-[80px] truncate">{prof.name}</p>
                        <span className="text-[9px] font-bold text-slate-400">{prof.score} pts</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}

      {/* FEED */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Carregando Citações...</div>
         ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
               <MessageCircle size={48} className="mb-4 text-slate-400" />
               <p className="text-xl font-black text-slate-500 uppercase">Silêncio na Sala</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Nenhuma frase registrada recentemente.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {quotes.map(item => (
                  <div key={item.id} className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all flex flex-col relative group">
                     
                     <div className="absolute -top-3 left-8 text-4xl text-slate-200 dark:text-slate-700 font-serif leading-none">“</div>
                     
                     <div className="flex-1 mb-6">
                        <p className="font-serif text-lg md:text-xl italic text-slate-800 dark:text-slate-200 leading-relaxed text-center px-2">
                           {item.quote}
                        </p>
                     </div>

                     <div className="border-t border-slate-100 dark:border-white/5 pt-4">
                        <div className="text-center mb-4">
                           <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.professor}</p>
                           {item.subject && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.subject}</p>}
                        </div>

                        <div className="flex justify-center gap-4">
                           <button 
                             onClick={() => handleVote(item, 'funny')}
                             className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 text-slate-500 hover:text-yellow-600 transition-all border border-transparent hover:border-yellow-200"
                           >
                              <Laugh size={18} />
                              <span className="font-black text-xs">{item.likes_funny}</span>
                           </button>
                           <button 
                             onClick={() => handleVote(item, 'shock')}
                             className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 transition-all border border-transparent hover:border-red-200"
                           >
                              <AlertTriangle size={18} />
                              <span className="font-black text-xs">{item.likes_shock}</span>
                           </button>
                        </div>
                     </div>
                     
                     <p className="text-[8px] font-bold text-slate-300 text-center mt-3 uppercase tracking-wider">
                        Enviado por {item.user_name.split(' ')[0]} • {new Date(item.created_at).toLocaleDateString()}
                     </p>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* MODAL */}
      {showModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-lg rounded-[2.5rem] p-8 border-4 border-yellow-500 shadow-2xl relative">
               <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                  <Quote size={24} className="text-yellow-500" /> Registrar Pérola
               </h3>

               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Professor(a)</label>
                     <input value={newProfessor} onChange={e => setNewProfessor(e.target.value)} placeholder="Ex: Fulano de Tal" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-yellow-500" />
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Matéria (Opcional)</label>
                     <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Ex: Civil I" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-yellow-500" />
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">A Frase</label>
                     <textarea value={newQuote} onChange={e => setNewQuote(e.target.value)} placeholder="O que foi dito..." className="w-full h-32 p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-serif text-lg italic outline-none focus:border-yellow-500 resize-none" />
                  </div>

                  <button 
                     onClick={handleCreate}
                     className="w-full py-4 bg-yellow-600 text-white rounded-xl font-black uppercase text-sm shadow-xl hover:bg-yellow-700 transition-colors"
                  >
                     Publicar Citação
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default PerolasTribuna;
