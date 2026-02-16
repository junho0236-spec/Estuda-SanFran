
import React, { useState, useEffect } from 'react';
import { Gavel, Scale, Send, MessageSquare, AlertCircle, TrendingUp, User, Trash2, CheckCircle, XCircle, Info, Plus } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { JurisCase, JurisVote } from '../types';

interface JurisprudenceMuralProps {
  userId: string;
  userName: string;
}

interface CaseWithStats extends JurisCase {
  votes: JurisVote[];
  deferidoCount: number;
  indeferidoCount: number;
  userVote?: JurisVote;
}

const JurisprudenceMural: React.FC<JurisprudenceMuralProps> = ({ userId, userName }) => {
  const [cases, setCases] = useState<CaseWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // Form de voto/fundamento
  const [currentFoundation, setCurrentFoundation] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();

    // Subscribe to cases
    const casesChannel = supabase
      .channel('juris_cases_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'juris_cases' }, () => fetchData())
      .subscribe();

    // Subscribe to votes
    const votesChannel = supabase
      .channel('juris_votes_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'juris_votes' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(casesChannel);
      supabase.removeChannel(votesChannel);
    };
  }, [userId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: casesData, error: casesError } = await supabase
        .from('juris_cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      const { data: votesData, error: votesError } = await supabase
        .from('juris_votes')
        .select('*');

      if (votesError) throw votesError;

      const enrichedCases = (casesData || []).map(c => {
        const caseVotes = (votesData || []).filter(v => v.case_id === c.id);
        const deferido = caseVotes.filter(v => v.vote === 'deferido').length;
        const indeferido = caseVotes.filter(v => v.vote === 'indeferido').length;
        const userVote = caseVotes.find(v => v.user_id === userId);

        return {
          ...c,
          votes: caseVotes,
          deferidoCount: deferido,
          indeferidoCount: indeferido,
          userVote
        };
      });

      setCases(enrichedCases);
    } catch (err) {
      console.error("Erro ao carregar mural jurídico:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const { error } = await supabase.from('juris_cases').insert({
        user_id: userId,
        user_name: userName || 'Doutor(a)',
        title: newTitle.trim(),
        content: newContent.trim()
      });

      if (error) throw error;
      setNewTitle('');
      setNewContent('');
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert("Erro ao protocolar caso. Verifique se as tabelas foram criadas no SQL Editor.");
    }
  };

  const handleVote = async (caseId: string, voteType: 'deferido' | 'indeferido') => {
    const foundation = currentFoundation[caseId] || '';
    
    try {
      const { error } = await supabase.from('juris_votes').upsert({
        case_id: caseId,
        user_id: userId,
        user_name: userName || 'Doutor(a)',
        vote: voteType,
        foundation: foundation.trim()
      }, { onConflict: 'case_id, user_id' });

      if (error) throw error;
      
      // Limpa fundamento após votar
      setCurrentFoundation(prev => ({ ...prev, [caseId]: '' }));
      fetchData();
    } catch (err) {
      alert("Erro ao computar voto.");
    }
  };

  const deleteCase = async (caseId: string) => {
    if (!confirm("Deseja retirar este caso de pauta?")) return;
    try {
      await supabase.from('juris_cases').delete().eq('id', caseId).eq('user_id', userId);
      fetchData();
    } catch (err) {
      alert("Erro ao deletar.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/20 px-4 py-2 rounded-full border border-indigo-200 dark:border-indigo-800 mb-4">
              <Gavel className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Tribunal Coletivo</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Jurisprudência SanFran</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Debate técnico e julgamentos simulados pela comunidade.</p>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl ${showForm ? 'bg-slate-200 text-slate-600' : 'bg-sanfran-rubi text-white hover:bg-sanfran-rubiDark hover:scale-105'}`}
        >
           {showForm ? <Trash2 size={16} /> : <Plus size={16} />}
           {showForm ? 'Cancelar' : 'Propor Caso'}
        </button>
      </header>

      {showForm && (
        <div className="bg-white dark:bg-sanfran-rubiDark/30 p-8 rounded-[2.5rem] border-2 border-sanfran-rubi shadow-2xl animate-in slide-in-from-top-4">
           <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Título da Polêmica</label>
                 <input 
                   value={newTitle}
                   onChange={e => setNewTitle(e.target.value)}
                   placeholder="Ex: Penhora de Salário para Dívida Comum"
                   className="w-full p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold outline-none focus:border-sanfran-rubi"
                 />
              </div>
              <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição do Caso Hipotético</label>
                 <textarea 
                   value={newContent}
                   onChange={e => setNewContent(e.target.value)}
                   placeholder="Apresente os fatos e o dilema jurídico..."
                   className="w-full h-40 p-4 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-serif text-lg text-slate-800 dark:text-slate-200 outline-none focus:border-sanfran-rubi resize-none"
                 />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm shadow-xl flex items-center justify-center gap-3"
              >
                 <Send size={18} /> Protocolar para Julgamento
              </button>
           </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
        {isLoading ? (
           <div className="flex flex-col items-center justify-center h-64 opacity-50">
              <div className="w-12 h-12 border-4 border-sanfran-rubi border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest">Consultando Acórdãos...</p>
           </div>
        ) : cases.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 border-4 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] text-slate-400 text-center p-8">
              <Scale size={64} className="mb-4 opacity-20" />
              <p className="text-xl font-black uppercase">Pauta Limpa</p>
              <p className="text-xs font-bold uppercase tracking-widest mt-2">Nenhum caso em julgamento no momento. Seja o primeiro relator.</p>
           </div>
        ) : (
           cases.map((c) => {
              const totalVotes = c.deferidoCount + c.indeferidoCount;
              const defPerc = totalVotes > 0 ? (c.deferidoCount / totalVotes) * 100 : 50;
              const indPerc = totalVotes > 0 ? (c.indeferidoCount / totalVotes) * 100 : 50;

              return (
                <div key={c.id} className="bg-white dark:bg-sanfran-rubiDark/20 rounded-[3rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
                   <div className="grid grid-cols-1 lg:grid-cols-12">
                      
                      {/* Lado Esquerdo: O Caso */}
                      <div className="lg:col-span-8 p-8 md:p-10 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-white/5">
                         <div className="flex items-start justify-between mb-6">
                            <div>
                               <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                  <User size={10} /> Relator: {c.user_name} • {new Date(c.created_at).toLocaleDateString()}
                               </div>
                               <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{c.title}</h3>
                            </div>
                            {c.user_id === userId && (
                               <button onClick={() => deleteCase(c.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                            )}
                         </div>

                         <div className="font-serif text-lg leading-relaxed text-slate-700 dark:text-slate-300 mb-10 whitespace-pre-wrap italic">
                            "{c.content}"
                         </div>

                         {/* Barra de Votação */}
                         <div className="space-y-3">
                            <div className="flex justify-between items-end px-1">
                               <div className="text-left">
                                  <span className="block text-[10px] font-black uppercase text-emerald-500 tracking-widest">Favoráveis (Deferido)</span>
                                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{Math.round(defPerc)}%</span>
                               </div>
                               <div className="text-right">
                                  <span className="block text-[10px] font-black uppercase text-red-500 tracking-widest">Contrários (Indeferido)</span>
                                  <span className="text-2xl font-black text-red-600 dark:text-red-400">{Math.round(indPerc)}%</span>
                               </div>
                            </div>
                            <div className="h-4 w-full bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden flex p-1 border border-slate-200 dark:border-white/10">
                               <div className="h-full bg-emerald-500 rounded-l-full transition-all duration-1000" style={{ width: `${defPerc}%` }} />
                               <div className="h-full bg-red-500 rounded-r-full transition-all duration-1000" style={{ width: `${indPerc}%` }} />
                            </div>
                            <p className="text-[9px] font-bold text-center text-slate-400 uppercase tracking-widest">{totalVotes} Votos computados na sessão</p>
                         </div>
                      </div>

                      {/* Lado Direito: Votação e Comentários */}
                      <div className="lg:col-span-4 bg-slate-50 dark:bg-black/20 flex flex-col h-full">
                         {/* Área de Comentários / Fundamentos */}
                         <div className="flex-1 p-6 overflow-y-auto max-h-[300px] custom-scrollbar border-b border-slate-200 dark:border-white/5">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                               <TrendingUp size={14} /> Fundamentos do Plenário
                            </h4>
                            <div className="space-y-3">
                               {c.votes.filter(v => v.foundation).map((v) => (
                                  <div key={v.id} className={`p-3 rounded-xl border ${v.vote === 'deferido' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100/50' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100/50'}`}>
                                     <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-black uppercase text-slate-500">{v.user_name}</span>
                                        {v.vote === 'deferido' ? <CheckCircle size={10} className="text-emerald-500" /> : <XCircle size={10} className="text-red-500" />}
                                     </div>
                                     <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug">
                                        {v.foundation}
                                     </p>
                                  </div>
                               ))}
                               {c.votes.filter(v => v.foundation).length === 0 && (
                                  <p className="text-[9px] italic text-slate-400 text-center py-4">Nenhum fundamento protocolado ainda.</p>
                               )}
                            </div>
                         </div>

                         {/* Formulário de Voto */}
                         <div className="p-6 space-y-4">
                            <div className="space-y-2">
                               <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Sua Sentença (Fundamento)</label>
                               <input 
                                 value={currentFoundation[c.id] || ''}
                                 onChange={e => setCurrentFoundation(prev => ({ ...prev, [c.id]: e.target.value }))}
                                 placeholder="Fundamento jurídico curto..."
                                 className="w-full p-3 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-sanfran-rubi"
                                 maxLength={140}
                               />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                               <button 
                                 onClick={() => handleVote(c.id, 'deferido')}
                                 className={`py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${c.userVote?.vote === 'deferido' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-white dark:bg-transparent text-emerald-600 border-emerald-500 hover:bg-emerald-50'}`}
                               >
                                  <CheckCircle size={14} /> Deferido
                               </button>
                               <button 
                                 onClick={() => handleVote(c.id, 'indeferido')}
                                 className={`py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${c.userVote?.vote === 'indeferido' ? 'bg-red-500 text-white border-red-500 shadow-lg' : 'bg-white dark:bg-transparent text-red-600 border-red-500 hover:bg-red-50'}`}
                               >
                                  <XCircle size={14} /> Indeferido
                               </button>
                            </div>
                         </div>
                      </div>

                   </div>
                </div>
              );
           })
        )}
      </div>

      <footer className="text-center p-6 shrink-0 opacity-40">
         <div className="flex items-center justify-center gap-2 text-slate-400">
            <Info size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sessão Permanente • Júri Acadêmico</span>
         </div>
      </footer>
    </div>
  );
};

export default JurisprudenceMural;
