import React, { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Search, 
  Plus, 
  CheckCircle2, 
  BadgeCheck, 
  FileSignature, 
  X, 
  Send,
  Eye,
  Filter,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { PetitionWikiPost } from '../types';
import confetti from 'canvas-confetti';

interface PetitionWikiProps {
  userId: string;
  userName: string;
}

const CATEGORIES = ['Cível', 'Penal', 'Trabalhista', 'Tributário', 'Administrativo', 'Constitucional'];

const CHECKLIST_ITEMS = [
  "Endereçamento Correto",
  "Qualificação das Partes",
  "Tempestividade (Prazo)",
  "Fatos Narrados com Clareza",
  "Fundamentação Jurídica Sólida",
  "Pedidos Específicos e Claros",
  "Valor da Causa",
  "Provas Requeridas",
  "Fechamento (Local/Data/OAB)"
];

const PetitionWiki: React.FC<PetitionWikiProps> = ({ userId, userName }) => {
  const [posts, setPosts] = useState<PetitionWikiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedPost, setSelectedPost] = useState<PetitionWikiPost | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  
  // Create Form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);

  // Validation State
  const [checks, setChecks] = useState<Set<string>>(new Set());
  const [isValidating, setIsValidating] = useState(false);
  const [hasUserValidated, setHasUserValidated] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('petition_wiki_posts')
      .select('*')
      .order('validation_count', { ascending: false }) // Mais validados primeiro
      .order('created_at', { ascending: false });
    
    if (data) setPosts(data);
    setLoading(false);
  };

  const fetchUserValidation = async (postId: string) => {
    const { data } = await supabase
      .from('petition_wiki_validations')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();
    
    setHasUserValidated(!!data);
  };

  const createPost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Preencha título e conteúdo.");
      return;
    }

    try {
      const { error } = await supabase.from('petition_wiki_posts').insert({
        title: newTitle,
        content: newContent,
        category: newCategory,
        author_id: userId,
        author_name: userName || 'Acadêmico(a)'
      });

      if (error) throw error;
      
      alert("Peça publicada para revisão comunitária!");
      setView('list');
      setNewTitle('');
      setNewContent('');
      fetchPosts();
    } catch (e) {
      alert("Erro ao publicar.");
    }
  };

  const handleValidate = async () => {
    if (!selectedPost) return;
    
    // Regra simples: Precisa marcar pelo menos 5 itens para validar
    if (checks.size < 5) {
      alert("Marque pelo menos 5 requisitos processuais para validar a peça.");
      return;
    }

    setIsValidating(true);
    try {
      // 1. Insert Validation Record
      const { error: valError } = await supabase.from('petition_wiki_validations').insert({
        post_id: selectedPost.id,
        user_id: userId,
        user_name: userName,
        checklist_data: Array.from(checks)
      });

      if (valError) {
        if (valError.code === '23505') alert("Você já validou esta peça.");
        else throw valError;
        setIsValidating(false);
        return;
      }

      // 2. Increment Counter
      const newCount = selectedPost.validation_count + 1;
      const isConsolidated = newCount >= 5; // Limite para selo

      await supabase.from('petition_wiki_posts').update({
        validation_count: newCount,
        is_consolidated: isConsolidated
      }).eq('id', selectedPost.id);

      // UI Update
      setSelectedPost({ ...selectedPost, validation_count: newCount, is_consolidated: isConsolidated });
      setHasUserValidated(true);
      
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    } catch (e) {
      console.error(e);
      alert("Erro ao processar validação.");
    } finally {
      setIsValidating(false);
    }
  };

  const openDetail = (post: PetitionWikiPost) => {
    setSelectedPost(post);
    setChecks(new Set()); // Reset checklist
    fetchUserValidation(post.id);
    setView('detail');
  };

  const toggleCheck = (item: string) => {
    if (hasUserValidated) return; // Read-only if already validated
    const newChecks = new Set(checks);
    if (newChecks.has(item)) newChecks.delete(item);
    else newChecks.add(item);
    setChecks(newChecks);
  };

  const filteredPosts = categoryFilter === 'Todos' ? posts : posts.filter(p => p.category === categoryFilter);

  // --- RENDER ---

  if (view === 'create') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between">
           <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest"><X size={16} /> Cancelar</button>
           <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-white">Nova Peça</h2>
        </div>
        
        <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Título da Peça</label>
                 <input 
                   value={newTitle}
                   onChange={e => setNewTitle(e.target.value)}
                   placeholder="Ex: Ação de Alimentos c/c Pedido Liminar"
                   className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-cyan-500"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Área</label>
                 <select 
                   value={newCategory}
                   onChange={e => setNewCategory(e.target.value)}
                   className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-cyan-500"
                 >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Conteúdo da Peça</label>
              <textarea 
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Cole aqui o texto da sua peça..."
                className="w-full h-96 p-6 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-serif text-sm leading-relaxed outline-none focus:border-cyan-500 resize-none"
              />
           </div>

           <button 
             onClick={createPost}
             className="w-full py-4 bg-cyan-600 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-lg hover:bg-cyan-700 transition-all flex items-center justify-center gap-2"
           >
              <FileSignature size={18} /> Publicar para Revisão
           </button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedPost) {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col animate-in zoom-in-95 duration-300">
         
         {/* Detail Header */}
         <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-4">
               <button onClick={() => setView('list')} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                  <X size={20} className="text-slate-600 dark:text-slate-200" />
               </button>
               <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-black uppercase tracking-widest bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded text-slate-500">{selectedPost.category}</span>
                     {selectedPost.is_consolidated && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded border border-yellow-200 flex items-center gap-1">
                           <BadgeCheck size={10} /> Consolidada
                        </span>
                     )}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{selectedPost.title}</h2>
               </div>
            </div>
            {hasUserValidated && (
               <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border border-emerald-200">
                  <CheckCircle2 size={14} /> Você validou esta peça
               </div>
            )}
         </div>

         <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            
            {/* Peça (Texto) */}
            <div className="flex-1 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col">
               <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                  <div className="max-w-3xl mx-auto font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                     {selectedPost.content}
                  </div>
               </div>
            </div>

            {/* Checklist Lateral */}
            <div className="lg:w-80 bg-slate-50 dark:bg-black/20 rounded-[2rem] border border-slate-200 dark:border-white/5 p-6 flex flex-col shrink-0">
               <h3 className="font-black uppercase text-slate-400 text-xs tracking-widest mb-4 flex items-center gap-2">
                  <BadgeCheck size={16} /> Requisitos Processuais
               </h3>
               
               <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar mb-4">
                  {CHECKLIST_ITEMS.map((item, idx) => (
                     <button
                        key={idx}
                        onClick={() => toggleCheck(item)}
                        disabled={hasUserValidated}
                        className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${checks.has(item) ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500 text-cyan-700 dark:text-cyan-300' : 'bg-white dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10 text-slate-500'}`}
                     >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checks.has(item) ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-slate-300'}`}>
                           {checks.has(item) && <CheckCircle2 size={12} />}
                        </div>
                        <span className="text-xs font-bold leading-tight">{item}</span>
                     </button>
                  ))}
               </div>

               <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-[10px] font-black uppercase text-slate-400">Progresso</span>
                     <span className="text-sm font-bold text-slate-700 dark:text-white">{checks.size}/{CHECKLIST_ITEMS.length}</span>
                  </div>
                  {!hasUserValidated ? (
                     <button 
                       onClick={handleValidate}
                       disabled={isValidating || selectedPost.author_id === userId}
                       className="w-full py-3 bg-cyan-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                     >
                        {selectedPost.author_id === userId ? 'Autor (Não pode validar)' : isValidating ? 'Processando...' : 'Validar Peça'}
                     </button>
                  ) : (
                     <div className="text-center p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase">
                        Validação Registrada
                     </div>
                  )}
               </div>
            </div>

         </div>
      </div>
    );
  }

  // --- VIEW: LIST (DEFAULT) ---
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-cyan-100 dark:bg-cyan-900/20 px-4 py-2 rounded-full border border-cyan-200 dark:border-cyan-800 mb-4">
              <ScrollText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Banco Colaborativo</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Wiki de Peças</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Modelos validados pela comunidade SanFran.</p>
        </div>
        
        <button 
          onClick={() => setView('create')}
          className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
        >
           <Plus size={16} /> Contribuir
        </button>
      </header>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
         <button onClick={() => setCategoryFilter('Todos')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoryFilter === 'Todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}>Todos</button>
         {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoryFilter === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}>{cat}</button>
         ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Carregando Acervo...</div>
         ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
               <ScrollText size={48} className="text-slate-400 mb-4" />
               <p className="text-xl font-black text-slate-500 uppercase">Nenhuma peça encontrada</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Seja o primeiro a colaborar nesta categoria.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredPosts.map(post => (
                  <button 
                    key={post.id}
                    onClick={() => openDetail(post)}
                    className={`group relative text-left p-6 rounded-[2.5rem] border-2 transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between h-[280px] overflow-hidden ${post.is_consolidated ? 'bg-[#fffbeb] dark:bg-yellow-900/10 border-yellow-400 shadow-yellow-500/10' : 'bg-white dark:bg-sanfran-rubiDark/20 border-slate-200 dark:border-white/10 hover:border-cyan-400'}`}
                  >
                     {post.is_consolidated && (
                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest shadow-sm z-10 flex items-center gap-1">
                           <BadgeCheck size={12} /> Consolidada
                        </div>
                     )}

                     {/* Background Icon */}
                     <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FileSignature size={120} />
                     </div>

                     <div>
                        <span className={`inline-block px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3 ${post.is_consolidated ? 'bg-yellow-200/50 text-yellow-800' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                           {post.category}
                        </span>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight line-clamp-3 mb-2">
                           {post.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Por: {post.author_name}</p>
                     </div>

                     <div className="relative z-10">
                        <div className="h-px w-full bg-slate-100 dark:bg-white/10 mb-4" />
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Validações</p>
                              <p className={`text-2xl font-black tabular-nums ${post.is_consolidated ? 'text-yellow-600 dark:text-yellow-500' : 'text-cyan-600 dark:text-cyan-400'}`}>
                                 {post.validation_count}
                              </p>
                           </div>
                           <div className={`p-3 rounded-full transition-colors ${post.is_consolidated ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-100 dark:bg-white/10 text-slate-400 group-hover:bg-cyan-500 group-hover:text-white'}`}>
                              <ArrowUpRight size={20} />
                           </div>
                        </div>
                     </div>
                  </button>
               ))}
            </div>
         )}
      </div>

    </div>
  );
};

export default PetitionWiki;