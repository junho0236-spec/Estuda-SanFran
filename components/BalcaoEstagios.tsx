
import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Search, 
  Filter, 
  X, 
  Plus,
  MessageSquare,
  AlertCircle,
  Building,
  GraduationCap
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { InternshipPost } from '../types';

interface BalcaoEstagiosProps {
  userId: string;
  userName: string;
}

const BalcaoEstagios: React.FC<BalcaoEstagiosProps> = ({ userId, userName }) => {
  const [posts, setPosts] = useState<InternshipPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterArea, setFilterArea] = useState<string>('Todas');
  
  // Form State
  const [roleTitle, setRoleTitle] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [area, setArea] = useState('');
  const [stipend, setStipend] = useState('');
  const [requirements, setRequirements] = useState('');
  const [insiderTip, setInsiderTip] = useState('');
  const [contactInfo, setContactInfo] = useState('');

  const AREAS = ['Todas', 'Cível', 'Penal', 'Trabalhista', 'Tributário', 'Empresarial', 'Público', 'Outros'];

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('internships_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_internships' }, () => fetchPosts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sf_internships')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setPosts(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!roleTitle || !area || !contactInfo) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    try {
      const { error } = await supabase.from('sf_internships').insert({
        role_title: roleTitle,
        office_name: officeName,
        area: area,
        stipend: stipend,
        requirements: requirements,
        insider_tip: insiderTip,
        contact_info: contactInfo,
        user_id: userId,
        user_name: userName || 'Aluno SanFran'
      });

      if (error) throw error;
      
      setShowCreateModal(false);
      setRoleTitle(''); setOfficeName(''); setArea(''); setStipend(''); setRequirements(''); setInsiderTip(''); setContactInfo('');
      alert("Vaga divulgada com sucesso!");
    } catch (e) {
      alert("Erro ao publicar vaga.");
    }
  };

  const openContact = (contact: string) => {
    const isEmail = contact.includes('@');
    if (isEmail) {
       window.location.href = `mailto:${contact}`;
    } else {
       const phone = contact.replace(/\D/g, '');
       window.open(`https://wa.me/${phone}?text=Olá! Vi a vaga de estágio no SanFran App.`, '_blank');
    }
  };

  const filteredPosts = filterArea === 'Todas' ? posts : posts.filter(p => p.area === filterArea);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-[#0f172a] text-white px-4 py-2 rounded-full border border-slate-800 mb-4">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">SanFran Careers</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Balcão de Estágios</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Vagas indicadas por alunos para alunos. Sem intermediários.</p>
        </div>
        
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all hover:bg-emerald-700"
        >
           <Plus size={16} /> Divulgar Vaga
        </button>
      </header>

      {/* FILTROS */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
         {AREAS.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterArea(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterArea === cat ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200'}`}
            >
               {cat}
            </button>
         ))}
      </div>

      {/* GRID DE VAGAS */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Buscando oportunidades...</div>
         ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
               <Briefcase size={48} className="mb-4 text-slate-400" />
               <p className="text-xl font-black text-slate-500 uppercase">Nenhuma Vaga</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Seja o primeiro a indicar seu escritório.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredPosts.map(post => (
                  <div key={post.id} className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group hover:border-emerald-500/50">
                     
                     {/* Header Card */}
                     <div>
                        <div className="flex justify-between items-start mb-4">
                           <span className="bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                              {post.area}
                           </span>
                           <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800">
                              <DollarSign size={10} /> {post.stipend || 'A Combinar'}
                           </span>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-1">{post.role_title}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-1">
                           <Building size={12} /> {post.office_name || 'Escritório Confidencial'}
                        </p>

                        {/* Insider Tip Box - O Diferencial */}
                        {post.insider_tip && (
                           <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800/30 mb-4 relative overflow-hidden">
                              <div className="absolute -right-2 -top-2 text-yellow-500/20 transform rotate-12">
                                 <AlertCircle size={40} />
                              </div>
                              <p className="text-[9px] font-black uppercase text-yellow-600 dark:text-yellow-500 tracking-widest mb-1 flex items-center gap-1">
                                 <AlertCircle size={10} /> Dica Interna
                              </p>
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed">
                                 "{post.insider_tip}"
                              </p>
                           </div>
                        )}

                        <div className="space-y-2 mb-6">
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Requisitos</p>
                           <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">{post.requirements || 'Não especificado.'}</p>
                        </div>
                     </div>

                     {/* Footer Actions */}
                     <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 bg-slate-200 dark:bg-white/10 rounded-full flex items-center justify-center text-[9px] font-black text-slate-500">
                              {post.user_name.charAt(0)}
                           </div>
                           <span className="text-[9px] font-bold text-slate-400">Indicado por {post.user_name.split(' ')[0]}</span>
                        </div>
                        <button 
                          onClick={() => openContact(post.contact_info)}
                          className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                        >
                           Tenho Interesse <MessageSquare size={12} />
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-lg rounded-[2.5rem] p-8 border-4 border-emerald-600 shadow-2xl relative">
               <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                  <Briefcase size={24} className="text-emerald-500" /> Indicar Vaga
               </h3>

               <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cargo / Título</label>
                     <input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="Ex: Estagiário de Contencioso Cível" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Área</label>
                        <select value={area} onChange={e => setArea(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-emerald-500">
                           <option value="">Selecione...</option>
                           {AREAS.filter(a => a !== 'Todas').map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Bolsa (Aprox.)</label>
                        <input value={stipend} onChange={e => setStipend(e.target.value)} placeholder="R$ 2.500" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" />
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Escritório (Opcional)</label>
                     <input value={officeName} onChange={e => setOfficeName(e.target.value)} placeholder="Nome do escritório ou 'Confidencial'" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" />
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Requisitos Principais</label>
                     <textarea value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="Inglês avançado, estar no 3º ano..." className="w-full h-20 p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-medium text-sm outline-none focus:border-emerald-500 resize-none" />
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
                     <label className="text-[10px] font-black uppercase text-yellow-600 dark:text-yellow-500 tracking-widest ml-1 flex items-center gap-1"><AlertCircle size={10} /> Dica de Ouro (Interna)</label>
                     <input value={insiderTip} onChange={e => setInsiderTip(e.target.value)} placeholder="Ex: O sócio adora quem lê jornal impresso..." className="w-full p-3 mt-2 bg-white dark:bg-black/40 border border-yellow-300 dark:border-yellow-700/50 rounded-xl font-bold text-sm outline-none focus:border-yellow-500" />
                     <p className="text-[9px] text-slate-400 mt-1">Essa dica é o diferencial da nossa comunidade.</p>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contato para envio (Email/Zap)</label>
                     <input value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="rh@escritorio.com.br" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" />
                  </div>
               </div>

               <button 
                  onClick={handleCreate}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-sm shadow-xl mt-6 hover:bg-emerald-700 transition-colors"
               >
                  Publicar Vaga
               </button>
            </div>
         </div>
      )}

    </div>
  );
};

export default BalcaoEstagios;
