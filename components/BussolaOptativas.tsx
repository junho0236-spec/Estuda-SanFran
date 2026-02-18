import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, 
  Search, 
  Plus, 
  Star, 
  GraduationCap, 
  BookOpen, 
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  X,
  Filter,
  Check
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface BussolaOptativasProps {
  userId: string;
  userName: string;
}

interface Review {
  id: string;
  subject_name: string;
  professor_name: string;
  rating_didactics: number;
  rating_attendance: number;
  rating_difficulty: number;
  rating_relevance: number;
  comment: string;
  is_anonymous: boolean;
  user_name?: string;
  created_at: string;
}

interface AggregatedSubject {
  subject_name: string;
  professor_name: string; // Simplificação: assume par único por enquanto ou agrupa
  avg_score: number;
  count: number;
  tags: string[];
  reviews: Review[];
}

const BussolaOptativas: React.FC<BussolaOptativasProps> = ({ userId, userName }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<AggregatedSubject | null>(null);

  // Form State
  const [newSubject, setNewSubject] = useState('');
  const [newProfessor, setNewProfessor] = useState('');
  const [ratingDidactics, setRatingDidactics] = useState(3);
  const [ratingAttendance, setRatingAttendance] = useState(3); // 1 = Baixa cobrança, 5 = Alta
  const [ratingDifficulty, setRatingDifficulty] = useState(3);
  const [ratingRelevance, setRatingRelevance] = useState(3);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    fetchReviews();
    
    const channel = supabase
      .channel('reviews_update')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sf_reviews' }, () => fetchReviews())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase.from('sf_reviews').select('*').order('created_at', { ascending: false });
    if (data) setReviews(data);
    setLoading(false);
  };

  // Client-side Aggregation
  const aggregatedSubjects = useMemo(() => {
    const map: Record<string, AggregatedSubject> = {};

    reviews.forEach(r => {
      const key = `${r.subject_name.trim().toLowerCase()}-${r.professor_name.trim().toLowerCase()}`;
      
      if (!map[key]) {
        map[key] = {
          subject_name: r.subject_name,
          professor_name: r.professor_name,
          avg_score: 0,
          count: 0,
          tags: [],
          reviews: []
        };
      }
      
      map[key].reviews.push(r);
    });

    return Object.values(map).map(item => {
      const totalReviews = item.reviews.length;
      const sumDidactics = item.reviews.reduce((a, b) => a + b.rating_didactics, 0);
      const sumRelevance = item.reviews.reduce((a, b) => a + b.rating_relevance, 0);
      
      // Média Geral baseada em Didática e Relevância (principais fatores de qualidade)
      const avg = (sumDidactics + sumRelevance) / (totalReviews * 2);
      
      // Tags dinâmicas
      const avgAttend = item.reviews.reduce((a, b) => a + b.rating_attendance, 0) / totalReviews;
      const avgDiff = item.reviews.reduce((a, b) => a + b.rating_difficulty, 0) / totalReviews;
      
      const tags = [];
      if (avgAttend > 3.5) tags.push('Chamada Rigorosa');
      else if (avgAttend < 2) tags.push('Presença Livre');
      
      if (avgDiff > 4) tags.push('Prova Difícil');
      else if (avgDiff < 2) tags.push('Coxa / Fácil');
      
      if (avg > 4.5) tags.push('Imperdível');

      return {
        ...item,
        avg_score: avg,
        count: totalReviews,
        tags
      };
    }).sort((a, b) => b.avg_score - a.avg_score);
  }, [reviews]);

  const filteredSubjects = aggregatedSubjects.filter(s => 
    s.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.professor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!newSubject.trim() || !newProfessor.trim()) {
      alert("Informe a matéria e o professor.");
      return;
    }

    try {
      await supabase.from('sf_reviews').insert({
        user_id: userId,
        user_name: isAnonymous ? null : (userName || 'Aluno'),
        subject_name: newSubject,
        professor_name: newProfessor,
        rating_didactics: ratingDidactics,
        rating_attendance: ratingAttendance,
        rating_difficulty: ratingDifficulty,
        rating_relevance: ratingRelevance,
        comment: newComment,
        is_anonymous: isAnonymous
      });

      setShowModal(false);
      setNewSubject(''); setNewProfessor(''); setNewComment('');
      setRatingDidactics(3); setRatingAttendance(3); setRatingDifficulty(3); setRatingRelevance(3);
      alert("Avaliação enviada!");
    } catch (e) {
      alert("Erro ao enviar avaliação.");
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button 
            key={star} 
            onClick={() => onChange(star)}
            className={`p-1 transition-transform hover:scale-110 ${star <= value ? 'text-teal-500' : 'text-slate-200 dark:text-slate-700'}`}
          >
            <Star size={20} fill={star <= value ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    </div>
  );

  if (selectedSubject) {
    return (
      <div className="h-full flex flex-col animate-in zoom-in-95 duration-300 pb-20 md:pb-0 px-2 md:px-0 max-w-4xl mx-auto">
         <div className="flex items-center justify-between mb-6 shrink-0">
            <button onClick={() => setSelectedSubject(null)} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 transition-colors">
               <X size={20} className="text-slate-600 dark:text-slate-200" />
            </button>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Detalhes da Cadeira</h2>
         </div>

         <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-xl mb-8">
            <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight mb-2">{selectedSubject.subject_name}</h3>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                     <GraduationCap size={16} /> Prof. {selectedSubject.professor_name}
                  </p>
               </div>
               <div className="text-center bg-teal-50 dark:bg-teal-900/20 p-4 rounded-2xl border border-teal-200 dark:border-teal-800">
                  <span className="block text-4xl font-black text-teal-600 dark:text-teal-400">{selectedSubject.avg_score.toFixed(1)}</span>
                  <div className="flex justify-center mt-1">
                     {[1,2,3,4,5].map(i => (
                        <Star key={i} size={10} className={i <= Math.round(selectedSubject.avg_score) ? "text-teal-500 fill-current" : "text-slate-300 dark:text-slate-600"} />
                     ))}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-2 block">{selectedSubject.count} Reviews</span>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
               {selectedSubject.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                     {tag}
                  </span>
               ))}
            </div>
         </div>

         <h4 className="text-sm font-black uppercase text-slate-400 mb-4 flex items-center gap-2 px-2">
            <MessageSquare size={16} /> Opinião da Comunidade
         </h4>

         <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
            {selectedSubject.reviews.map(review => (
               <div key={review.id} className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {review.is_anonymous ? 'Aluno Anônimo' : review.user_name}
                     </span>
                     <div className="flex items-center gap-1 text-teal-500">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-black">{((review.rating_didactics + review.rating_relevance)/2).toFixed(1)}</span>
                     </div>
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                     "{review.comment}"
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 grid grid-cols-4 gap-2 text-center">
                     <div>
                        <p className="text-[8px] uppercase text-slate-400">Didática</p>
                        <p className="text-xs font-black">{review.rating_didactics}</p>
                     </div>
                     <div>
                        <p className="text-[8px] uppercase text-slate-400">Presença</p>
                        <p className="text-xs font-black">{review.rating_attendance}</p>
                     </div>
                     <div>
                        <p className="text-[8px] uppercase text-slate-400">Dificuldade</p>
                        <p className="text-xs font-black">{review.rating_difficulty}</p>
                     </div>
                     <div>
                        <p className="text-[8px] uppercase text-slate-400">Relevância</p>
                        <p className="text-xs font-black">{review.rating_relevance}</p>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/20 px-4 py-2 rounded-full border border-teal-200 dark:border-teal-800 mb-4">
              <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Guia de Matrícula</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Bússola de Optativas</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Descubra as melhores matérias e evite ciladas.</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
        >
           <Plus size={16} /> Avaliar Cadeira
        </button>
      </header>

      {/* SEARCH */}
      <div className="bg-white dark:bg-sanfran-rubiDark/20 p-2 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-2 shadow-sm shrink-0">
         <Search className="ml-3 text-slate-400" size={20} />
         <input 
           value={searchTerm}
           onChange={e => setSearchTerm(e.target.value)}
           placeholder="Buscar matéria ou professor..."
           className="flex-1 bg-transparent outline-none font-bold text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 py-2"
         />
      </div>

      {/* GRID */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {loading ? (
            <div className="text-center py-20 opacity-50 font-bold uppercase">Carregando Bússola...</div>
         ) : filteredSubjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
               <Compass size={48} className="mb-4 text-slate-400" />
               <p className="text-xl font-black text-slate-500 uppercase">Nenhuma Avaliação</p>
               <p className="text-xs font-bold text-slate-400 mt-2">Seja o primeiro a avaliar uma disciplina.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredSubjects.map((sub, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedSubject(sub)}
                    className="group bg-white dark:bg-sanfran-rubiDark/30 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-lg hover:shadow-teal-500/20 hover:border-teal-500/50 transition-all text-left relative overflow-hidden"
                  >
                     <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-2xl">
                           <BookOpen size={20} />
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/20 px-2 py-1 rounded-lg">
                           <Star size={12} className="text-teal-500 fill-current" />
                           <span className="text-xs font-black text-slate-700 dark:text-white">{sub.avg_score.toFixed(1)}</span>
                        </div>
                     </div>

                     <div className="mb-4 relative z-10">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2">{sub.subject_name}</h3>
                        <p className="text-xs font-medium text-slate-500 line-clamp-1">{sub.professor_name}</p>
                     </div>

                     <div className="flex flex-wrap gap-1.5 relative z-10">
                        {sub.tags.slice(0, 3).map(tag => (
                           <span key={tag} className="px-2 py-0.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded text-[8px] font-bold uppercase text-slate-500">
                              {tag}
                           </span>
                        ))}
                     </div>
                     
                     <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <GraduationCap size={100} />
                     </div>
                  </button>
               ))}
            </div>
         )}
      </div>

      {/* CREATE MODAL */}
      {showModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-lg rounded-[2.5rem] p-8 border-4 border-teal-600 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
               <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                  <Star size={24} className="text-teal-500" /> Avaliar Disciplina
               </h3>

               <div className="space-y-6">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Matéria</label>
                     <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Ex: Criminologia Crítica" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-teal-500" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Professor(a)</label>
                     <input value={newProfessor} onChange={e => setNewProfessor(e.target.value)} placeholder="Ex: Alvino" className="w-full p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-teal-500" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                     <StarRating value={ratingDidactics} onChange={setRatingDidactics} label="Didática" />
                     <StarRating value={ratingRelevance} onChange={setRatingRelevance} label="Relevância" />
                     <StarRating value={ratingAttendance} onChange={setRatingAttendance} label="Cobrança Presença" />
                     <StarRating value={ratingDifficulty} onChange={setRatingDifficulty} label="Dificuldade Prova" />
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Comentário (Dicas, Avisos)</label>
                     <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Como foi cursar? Vale a pena?" className="w-full h-24 p-3 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-medium text-sm outline-none focus:border-teal-500 resize-none" />
                  </div>

                  <div className="flex items-center gap-2" onClick={() => setIsAnonymous(!isAnonymous)}>
                     <div className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center ${isAnonymous ? 'bg-teal-500 border-teal-600' : 'border-slate-300'}`}>
                        {isAnonymous && <Check size={14} className="text-white" />}
                     </div>
                     <span className="text-xs font-bold text-slate-500">Publicar como Anônimo</span>
                  </div>

                  <button 
                     onClick={handleSubmit}
                     className="w-full py-4 bg-teal-600 text-white rounded-xl font-black uppercase text-sm shadow-xl hover:bg-teal-700 transition-colors"
                  >
                     Enviar Review
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default BussolaOptativas;
