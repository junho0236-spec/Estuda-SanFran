
import React, { useState, useEffect } from 'react';
import { UserPlus, Star, BookOpen, MessageSquare, Briefcase, GraduationCap, CheckCircle2, Search, ArrowRight, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { MentorProfile, MentorshipConnection } from '../types';

interface MentorshipProps {
  userId: string;
  userName: string;
}

const AREAS = [
  "Direito Civil", "Direito Penal", "Direito Trabalhista", "Direito Tributário", 
  "Direito Empresarial", "Direito Administrativo", "Direito Constitucional", "Direito Internacional"
];

const Mentorship: React.FC<MentorshipProps> = ({ userId, userName }) => {
  const [activeTab, setActiveTab] = useState<'find' | 'dashboard' | 'register'>('find');
  const [isMentor, setIsMentor] = useState(false);
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [myConnections, setMyConnections] = useState<MentorshipConnection[]>([]);
  const [loading, setLoading] = useState(true);

  // Register Form
  const [bio, setBio] = useState('');
  const [contact, setContact] = useState('');
  const [semester, setSemester] = useState(5);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  // Request Form
  const [requestGoal, setRequestGoal] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
    fetchMentors();
  }, [userId]);

  const checkStatus = async () => {
    // Check if user is a mentor
    const { data: mentorData } = await supabase.from('mentor_profiles').select('*').eq('user_id', userId).single();
    if (mentorData) setIsMentor(true);

    // Fetch My Connections (as Mentor or Mentee)
    const { data: connData } = await supabase
      .from('mentorships')
      .select('*, mentor_profiles(user_name, contact_info)')
      .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`);
    
    if (connData) setMyConnections(connData);
  };

  const fetchMentors = async () => {
    setLoading(true);
    const { data } = await supabase.from('mentor_profiles').select('*');
    if (data) setMentors(data);
    setLoading(false);
  };

  const handleRegisterMentor = async () => {
    if (!bio || !contact || selectedAreas.length === 0) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      await supabase.from('mentor_profiles').upsert({
        user_id: userId,
        user_name: userName,
        areas: selectedAreas,
        bio,
        contact_info: contact,
        semester
      });
      setIsMentor(true);
      setActiveTab('dashboard');
      alert("Perfil de Padrinho criado com sucesso!");
    } catch (e) {
      alert("Erro ao criar perfil.");
    }
  };

  const handleConnect = async () => {
    if (!selectedMentorId || !requestGoal) return;

    try {
      await supabase.from('mentorships').insert({
        mentor_id: selectedMentorId,
        mentee_id: userId,
        mentee_name: userName,
        mentee_goal: requestGoal
      });
      setSelectedMentorId(null);
      setRequestGoal('');
      checkStatus();
      setActiveTab('dashboard');
      alert("Solicitação enviada! Verifique seu painel.");
    } catch (e) {
      alert("Erro ao conectar.");
    }
  };

  const toggleArea = (area: string) => {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(prev => prev.filter(a => a !== area));
    } else {
      if (selectedAreas.length >= 3) return;
      setSelectedAreas(prev => [...prev, area]);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-6xl mx-auto h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 px-4 py-2 rounded-full border border-amber-200 dark:border-amber-800 mb-4">
              <UserPlus className="w-4 h-4 text-amber-700 dark:text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">Networking Vertical</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">O Padrinho</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Conecte-se com veteranos e acelere sua jornada acadêmica.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
           <button 
             onClick={() => setActiveTab('find')} 
             className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'find' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
           >
             Buscar Padrinho
           </button>
           <button 
             onClick={() => setActiveTab('dashboard')} 
             className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
           >
             Minhas Conexões
           </button>
           {!isMentor && (
             <button 
               onClick={() => setActiveTab('register')} 
               className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'register' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
             >
               Quero Apadrinhar
             </button>
           )}
        </div>
      </header>

      {/* VIEW: FIND MENTOR */}
      {activeTab === 'find' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mentors.map(mentor => (
                 <div key={mentor.user_id} className="bg-white dark:bg-sanfran-rubiDark/20 rounded-[2rem] p-6 border border-slate-200 dark:border-sanfran-rubi/30 shadow-lg flex flex-col justify-between hover:shadow-xl transition-all">
                    <div>
                       <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 border-2 border-amber-200 dark:border-amber-800">
                             <GraduationCap size={24} />
                          </div>
                          <div>
                             <h3 className="font-black text-slate-900 dark:text-white text-lg leading-none">{mentor.user_name}</h3>
                             <p className="text-xs font-bold text-slate-400 mt-1">{mentor.semester}º Semestre</p>
                          </div>
                       </div>
                       
                       <div className="flex flex-wrap gap-2 mb-4">
                          {mentor.areas.map(area => (
                             <span key={area} className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-md text-[9px] font-black uppercase text-slate-500 tracking-wide">
                                {area}
                             </span>
                          ))}
                       </div>
                       
                       <p className="text-sm text-slate-600 dark:text-slate-300 italic mb-6 line-clamp-3">
                          "{mentor.bio}"
                       </p>
                    </div>

                    {selectedMentorId === mentor.user_id ? (
                       <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl animate-in slide-in-from-bottom-2">
                          <input 
                            value={requestGoal}
                            onChange={e => setRequestGoal(e.target.value)}
                            placeholder="Qual seu objetivo? (Ex: Estágio, Provas)"
                            className="w-full p-2 mb-2 text-xs rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 outline-none"
                          />
                          <div className="flex gap-2">
                             <button onClick={() => setSelectedMentorId(null)} className="flex-1 py-2 text-xs font-bold text-slate-500">Cancelar</button>
                             <button onClick={handleConnect} className="flex-1 py-2 bg-amber-500 text-white rounded font-bold text-xs">Enviar</button>
                          </div>
                       </div>
                    ) : (
                       <button 
                         onClick={() => setSelectedMentorId(mentor.user_id)}
                         className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform"
                       >
                          Solicitar Apadrinhamento
                       </button>
                    )}
                 </div>
              ))}
              {mentors.length === 0 && !loading && (
                 <div className="col-span-full py-20 text-center opacity-50">
                    <User size={48} className="mx-auto mb-4 text-slate-400" />
                    <p className="font-bold text-slate-500 uppercase">Nenhum mentor disponível ainda.</p>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* VIEW: DASHBOARD */}
      {activeTab === 'dashboard' && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Meus Padrinhos / Afilhados */}
            <div className="space-y-4">
               <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4">Minhas Conexões</h3>
               {myConnections.length === 0 ? (
                  <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-center">
                     <p className="text-xs font-bold text-slate-400 uppercase">Sem conexões ativas</p>
                  </div>
               ) : (
                  myConnections.map(conn => {
                     const isMyMentor = conn.mentor_id !== userId; // Se eu não sou o mentor, então é meu mentor
                     const role = isMyMentor ? 'Padrinho' : 'Afilhado';
                     const name = isMyMentor ? conn.mentor_profiles?.user_name : conn.mentee_name;
                     const contact = isMyMentor ? conn.mentor_profiles?.contact_info : "Ver perfil para contato";

                     return (
                        <div key={conn.id} className="bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-2xl border border-slate-200 dark:border-sanfran-rubi/30 shadow-md flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${isMyMentor ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                 {name?.substring(0, 1)}
                              </div>
                              <div>
                                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{role}</p>
                                 <h4 className="font-black text-slate-900 dark:text-white text-lg">{name}</h4>
                                 <p className="text-xs text-slate-500">{isMyMentor ? contact : `Objetivo: ${conn.mentee_goal}`}</p>
                              </div>
                           </div>
                           <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                              Ativo
                           </div>
                        </div>
                     )
                  })
               )}
            </div>

            {/* Tarefas Sugeridas (Mock) */}
            <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl">
               <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <BookOpen className="text-amber-500" /> Plano de Voo
               </h3>
               <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                     <div className="w-5 h-5 rounded-full border-2 border-slate-300 mt-0.5"></div>
                     <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Ler "O Caso dos Exploradores de Cavernas"</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">Sugerido pelo Padrinho</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                     <div className="w-5 h-5 rounded-full border-2 border-slate-300 mt-0.5"></div>
                     <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Comparecer à Cervejada de Recepção</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">Integração</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* VIEW: REGISTER MENTOR */}
      {activeTab === 'register' && (
         <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 md:p-12 rounded-[2.5rem] border-2 border-amber-500/30 shadow-2xl max-w-2xl mx-auto w-full">
            <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-2">Tornar-se Padrinho</h3>
            <p className="text-slate-500 font-bold mb-8">Compartilhe sua experiência e ganhe reputação na SanFran.</p>

            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Suas Áreas de Domínio (Máx 3)</label>
                  <div className="flex flex-wrap gap-2">
                     {AREAS.map(area => (
                        <button
                           key={area}
                           onClick={() => toggleArea(area)}
                           className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-all ${selectedAreas.includes(area) ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'}`}
                        >
                           {area}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Semestre Atual</label>
                     <input 
                        type="number" 
                        value={semester} 
                        onChange={e => setSemester(Number(e.target.value))}
                        className="w-full p-4 bg-slate-50 dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-amber-500"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Contato (WhatsApp/Email)</label>
                     <input 
                        value={contact} 
                        onChange={e => setContact(e.target.value)}
                        placeholder="Como o afilhado te acha?"
                        className="w-full p-4 bg-slate-50 dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold outline-none focus:border-amber-500"
                     />
                  </div>
               </div>

               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Bio Acadêmica</label>
                  <textarea 
                     value={bio} 
                     onChange={e => setBio(e.target.value)}
                     placeholder="Conte sobre sua trajetória, estágios e grupos de estudo..."
                     className="w-full h-32 p-4 bg-slate-50 dark:bg-black/20 border-2 border-slate-200 dark:border-white/10 rounded-xl font-medium text-sm outline-none focus:border-amber-500 resize-none"
                  />
               </div>

               <button 
                  onClick={handleRegisterMentor}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-sm tracking-widest shadow-xl hover:scale-[1.02] transition-transform"
               >
                  Confirmar Cadastro
               </button>
            </div>
         </div>
      )}

    </div>
  );
};

export default Mentorship;
