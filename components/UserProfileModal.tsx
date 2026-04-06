
import React, { useState, useEffect } from 'react';
import { 
  User, Award, BookOpen, X, Linkedin, Instagram, ExternalLink, 
  Zap, MessageSquare, UserPlus, Loader2, ImageIcon, MapPin, 
  Calendar, Languages, Plane, Trophy, Star, ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { DISCIPLINAS_LIST_COLUMNS } from '../utils/supabaseSelectColumns';
import { UserProfile } from '../types';
import { toast } from 'sonner';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  friendshipStatus?: 'pending' | 'accepted' | 'declined' | 'none';
  onSendFriendRequest: (targetUserId: string, targetUserName: string) => void;
  onNavigateToChat: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  userId, 
  onClose, 
  friendshipStatus = 'none',
  onSendFriendRequest,
  onNavigateToChat
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'perfil' | 'academico' | 'mural'>('perfil');
  const [disciplinas, setDisciplinas] = useState<any[]>([]);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const userProfile = await dataService.getUserProfile(userId, navigator.onLine);
      setProfile(userProfile);
      
      // Fetch disciplines
      const { data: discData } = await supabase
        .from('disciplinas')
        .select(DISCIPLINAS_LIST_COLUMNS)
        .eq('user_id', userId);
      if (discData) setDisciplinas(discData);
    } catch (err) {
      console.error("[UserProfileModal] Error fetching profile:", err);
      toast.error("Erro ao carregar perfil do usuário.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-sanfran-rubiBlack w-full max-w-4xl h-[80vh] rounded-[3rem] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-sanfran-rubi animate-spin" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-sanfran-rubiBlack w-full max-w-4xl h-[80vh] rounded-[3rem] flex flex-col items-center justify-center gap-4">
          <p className="text-slate-500">Perfil não encontrado.</p>
          <button onClick={onClose} className="px-6 py-2 bg-sanfran-rubi text-white rounded-full">Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-slate-50 dark:bg-sanfran-rubiBlack w-full max-w-4xl h-[90vh] rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header Section */}
        <div className="relative h-48 bg-sanfran-rubi/5 dark:bg-sanfran-rubi/10 overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#8B1A1A 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all z-20"
          >
            <X size={20} />
          </button>
        </div>

        {/* Identity Section */}
        <div className="px-10 pb-6 -mt-16 flex flex-col md:flex-row items-center md:items-end gap-8 relative z-10 shrink-0">
          <div className="w-40 h-40 rounded-full border-8 border-white dark:border-sanfran-rubiBlack bg-sanfran-offwhite dark:bg-white/5 overflow-hidden shadow-2xl relative">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sanfran-rubi/20">
                <User size={64} />
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="space-y-1">
              <h1 className="text-3xl font-serif font-bold text-sanfran-rubi dark:text-white tracking-tight">
                {profile.full_name || 'Estudante SanFran'}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="px-4 py-1.5 bg-sanfran-rubi text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-900/20">
                  Turma {profile.turma || profile.turma_ano || '---'}
                </span>
                {profile.sala && (
                  <span className="px-4 py-1.5 bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 shadow-sm">
                    Sala {profile.sala}
                  </span>
                )}
                <span className="px-4 py-1.5 bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 shadow-sm">
                  {profile.archetype || 'Novato'}
                </span>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic max-w-2xl">
              "{profile.bio || 'Nenhuma biografia definida.'}"
            </p>
          </div>

          <div className="flex gap-3 pb-2">
            {friendshipStatus === 'accepted' ? (
              <button 
                onClick={onNavigateToChat}
                className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <MessageSquare size={16} />
                Mensagem
              </button>
            ) : friendshipStatus === 'pending' ? (
              <button disabled className="px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">
                Pendente
              </button>
            ) : (
              <button 
                onClick={() => onSendFriendRequest(userId, profile.full_name || 'Usuário')}
                className="px-6 py-3 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <UserPlus size={16} />
                Conectar
              </button>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="px-10 py-4 flex gap-4 border-b border-slate-200 dark:border-white/5 shrink-0">
          {[
            { id: 'perfil', label: 'Perfil', icon: <User size={16} /> },
            { id: 'academico', label: 'Acadêmico', icon: <BookOpen size={16} /> },
            { id: 'mural', label: 'Mural', icon: <ImageIcon size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-sanfran-rubi text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10">
          <AnimatePresence mode="wait">
            {activeTab === 'perfil' && (
              <motion.div
                key="perfil"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
              >
                <div className="md:col-span-2 space-y-8">
                  <div className="bg-white dark:bg-white/5 p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm">
                    <h2 className="text-xl font-serif font-bold text-sanfran-rubi dark:text-white mb-6">Sobre</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {profile.bio || 'Nenhuma biografia definida.'}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-white/5 p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm">
                    <h2 className="text-xl font-serif font-bold text-sanfran-rubi dark:text-white mb-6">Habilidades</h2>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills?.length ? profile.skills.map(skill => (
                        <span key={skill} className="px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                          {skill}
                        </span>
                      )) : (
                        <p className="text-[10px] font-bold text-slate-400 italic">Nenhuma habilidade listada.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-white dark:bg-white/5 p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white mb-6">Idiomas</h3>
                    <div className="space-y-4">
                      {profile.idiomas?.length ? profile.idiomas.map(lang => (
                        <div key={lang} className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{lang}</span>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-sanfran-rubi"></div>
                            <div className="w-2 h-2 rounded-full bg-sanfran-rubi"></div>
                            <div className="w-2 h-2 rounded-full bg-sanfran-rubi/30"></div>
                          </div>
                        </div>
                      )) : (
                        <p className="text-[10px] font-bold text-slate-400 italic">Nenhum idioma listado.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-white/5 p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white mb-6">Interesses</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests?.length ? profile.interests.map(interest => (
                        <span key={interest} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          {interest}
                        </span>
                      )) : (
                        <p className="text-[10px] font-bold text-slate-400 italic">Nenhum interesse listado.</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'academico' && (
              <motion.div
                key="academico"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
                        <Award size={18} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Arcadia Score</h3>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-serif font-bold text-indigo-600 dark:text-indigo-400">{profile.arcadia_score || 0}</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-teal-100 dark:bg-teal-900/20 text-teal-600 rounded-xl">
                        <BookOpen size={18} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progresso</h3>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-serif font-bold text-teal-600 dark:text-teal-400">{profile.progresso_total || 0}%</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-rose-100 dark:bg-rose-900/20 text-rose-600 rounded-xl">
                        <Trophy size={18} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Média</h3>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-serif font-bold text-rose-600 dark:text-rose-400">{profile.media || '---'}</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/20 text-orange-600 rounded-xl">
                        <Zap size={18} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Extensão</h3>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-serif font-bold text-orange-600 dark:text-orange-400">{profile.horas_extensao || 0}h</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-white/5 p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm">
                  <h2 className="text-xl font-serif font-bold text-sanfran-rubi dark:text-white mb-6">Disciplinas</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {disciplinas.length ? disciplinas.map(disc => (
                      <div key={disc.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">{disc.nome}</h4>
                          <span className="px-2 py-1 bg-sanfran-rubi/10 text-sanfran-rubi rounded text-[8px] font-bold">{disc.nota || '---'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-[8px] text-slate-400 uppercase font-bold">{disc.codigo}</span>
                          <span className="text-[8px] text-slate-400 uppercase font-bold">•</span>
                          <span className="text-[8px] text-slate-400 uppercase font-bold">{disc.semestre}º Semestre</span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-[10px] font-bold text-slate-400 italic">Nenhuma disciplina registrada.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'mural' && (
              <motion.div
                key="mural"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-4"
              >
                {profile.mural_fotos?.length ? profile.mural_fotos.map((foto, idx) => (
                  <div key={idx} className="aspect-square rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm group relative">
                    <img src={foto.url} alt={foto.caption || 'Foto do mural'} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                    {foto.caption && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <p className="text-white text-[10px] font-bold uppercase tracking-wider">{foto.caption}</p>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                    <ImageIcon size={48} className="mb-4 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Mural vazio</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default UserProfileModal;
