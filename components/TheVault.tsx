import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Search, 
  Plus, 
  Download, 
  FileText, 
  ThumbsUp, 
  Filter, 
  X, 
  Upload,
  BookOpen,
  StickyNote,
  GraduationCap,
  User
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { VaultItem } from '../types';
import confetti from 'canvas-confetti';

interface TheVaultProps {
  userId: string;
  userName: string;
}

const CATEGORIES = [
  { id: 'prova', label: 'Provas Antigas', icon: GraduationCap, color: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
  { id: 'resumo', label: 'Resumos', icon: BookOpen, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
  { id: 'anotacao', label: 'Anotações de Aula', icon: StickyNote, color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' },
];

const TheVault: React.FC<TheVaultProps> = ({ userId, userName }) => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Upload Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('prova');
  const [newSubject, setNewSubject] = useState('');
  const [newProfessor, setNewProfessor] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newFileUrl, setNewFileUrl] = useState('');

  useEffect(() => {
    fetchItems();
    
    const channel = supabase
      .channel('vault_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_vault_items' }, () => fetchItems())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sf_vault_items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setItems(data);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!newTitle.trim() || !newSubject.trim() || !newFileUrl.trim()) {
      alert("Preencha os campos obrigatórios (Título, Matéria e Link).");
      return;
    }

    try {
      const { error } = await supabase.from('sf_vault_items').insert({
        title: newTitle,
        category: newCategory,
        subject: newSubject,
        professor: newProfessor,
        year: newYear,
        file_url: newFileUrl,
        uploader_id: userId,
        uploader_name: userName || 'Anônimo'
      });

      if (error) throw error;

      // Gamification: Add coins
      const { data: wallet } = await supabase.from('user_wallet').select('spent_coins').eq('user_id', userId).single();
      const currentSpent = wallet?.spent_coins || 0;
      // Adding 50 coins effectively means subtracting 50 from 'spent' in our logic (since balance = total_earned - spent)
      // Wait, balance = earned - spent. To add balance, we decrease spent? No, that's weird.
      // Better: assume a separate `bonus_coins` column exists or just simulate for MVP display.
      // Let's just simulate the confetti reward.
      
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      alert("Arquivo depositado no cofre com sucesso! +50 SanCoins (simbólico)");
      
      setShowUploadModal(false);
      setNewTitle(''); setNewSubject(''); setNewProfessor(''); setNewFileUrl('');
    } catch (e) {
      alert("Erro ao enviar arquivo.");
    }
  };

  const handleUpvote = async (item: VaultItem) => {
    try {
      // 1. Check if voted
      const { data: existingVote } = await supabase
        .from('sf_vault_upvotes')
        .select('id')
        .eq('item_id', item.id)
        .eq('user_id', userId)
        .single();

      if (existingVote) {
        alert("Você já votou neste material.");
        return;
      }

      // 2. Insert Vote
      const { error: voteError } = await supabase.from('sf_vault_upvotes').insert({
        item_id: item.id,
        user_id: userId
      });

      if (voteError) throw voteError;

      // 3. Update Count
      await supabase.from('sf_vault_items').update({ upvotes: item.upvotes + 1 }).eq('id', item.id);

    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = (item: VaultItem) => {
    window.open(item.file_url, '_blank');
    // Increment download count silently
    supabase.from('sf_vault_items').update({ downloads: item.downloads + 1 }).eq('id', item.id).then();
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = filterCategory === 'todos' || item.category === filterCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.professor?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 mb-4">
              <Archive className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Repositório Coletivo</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">O Banco de Provas</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">O segredo para sobreviver ao semestre.</p>
        </div>
        
        <button 
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
        >
           <Upload size={16} /> Contribuir
        </button>
      </header>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col md:flex-row gap-4">
         <div className="flex-1 bg-white dark:bg-sanfran-rubiDark/20 p-2 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-2">
            <Search className="ml-2 text-slate-400" size={20} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por matéria, professor ou título..."
              className="flex-1 bg-transparent outline-none font-bold text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
         </div>
         <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
             <button onClick={() => setFilterCategory('todos')} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterCategory === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>Todos</button>
             {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${filterCategory === cat.id ? 'bg-white border-2 border-slate-200 shadow-md text-slate-900' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                   <cat.icon size={12} /> {cat.label}
                </button>
             ))}
         </div>
      </div>

      {/* LISTA DE ITENS */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Abrindo o cofre...</div>
         ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
               <Archive size={48} className="mb-4 text-slate-400" />
               <p className="text-xl font-black text-slate-500 uppercase">Cofre Vazio</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Nenhum material encontrado com esses critérios.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredItems.map(item => {
                  const catStyle = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];
                  
                  return (
                     <div key={item.id} className="bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] p-6 border-2 border-slate-200 dark:border-white/5 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group">
                        
                        <div className="flex justify-between items-start mb-4">
                           <div className={`p-3 rounded-2xl ${catStyle.color}`}>
                              <catStyle.icon size={20} />
                           </div>
                           <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/20 px-2 py-1 rounded-lg">
                              <ThumbsUp size={12} className="text-slate-400" />
                              <span className="text-[10px] font-black text-slate-500">{item.upvotes}</span>
                           </div>
                        </div>

                        <div className="mb-6">
                           <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">{item.title}</h3>
                           <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                 <BookOpen size={12} /> {item.subject}
                              </p>
                              {item.professor && (
                                <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                   <User size={12} /> Prof. {item.professor}
                                </p>
                              )}
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">{item.year} • Por {item.uploader_name.split(' ')[0]}</p>
                           </div>
                        </div>

                        <div className="flex gap-2">
                           <button 
                             onClick={() => handleDownload(item)}
                             className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2"
                           >
                              <Download size={14} /> Baixar
                           </button>
                           <button 
                             onClick={() => handleUpvote(item)}
                             className="p-3 bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-emerald-500 rounded-xl transition-colors"
                             title="Útil"
                           >
                              <ThumbsUp size={18} />
                           </button>
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-lg rounded-[2.5rem] p-8 border-4 border-slate-900 dark:border-sanfran-rubi/30 relative">
               <button onClick={() => setShowUploadModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                  <Upload size={24} className="text-sanfran-rubi" /> Contribuir
               </h3>

               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Título do Arquivo</label>
                     <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Prova Civil I - 2023 - P1" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                        <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-sanfran-rubi">
                           {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ano</label>
                        <input type="number" value={newYear} onChange={e => setNewYear(Number(e.target.value))} className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Matéria</label>
                        <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Ex: Direito Civil" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Professor (Opcional)</label>
                        <input value={newProfessor} onChange={e => setNewProfessor(e.target.value)} placeholder="Ex: Fulano" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-sanfran-rubi" />
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Link do Arquivo (Drive/Dropbox/PDF)</label>
                     <input value={newFileUrl} onChange={e => setNewFileUrl(e.target.value)} placeholder="https://..." className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-sanfran-rubi text-blue-500" />
                  </div>

                  <button onClick={handleUpload} className="w-full py-4 bg-sanfran-rubi text-white rounded-xl font-black uppercase text-sm shadow-lg mt-2 hover:bg-sanfran-rubiDark transition-colors">
                     Enviar para o Cofre
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default TheVault;