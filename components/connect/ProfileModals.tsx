import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, MessageSquare, Phone, Shield, User, X } from 'lucide-react';

interface ProfileModalsProps {
  showProfileSettings: boolean;
  setShowProfileSettings: (show: boolean) => void;
  userProfile: any;
  userName: string;
  updateProfile: (bio: string) => void;
  showUserProfileModal: any;
  setShowUserProfileModal: (profile: any) => void;
  onStartAudioCall: () => void;
}

const ProfileModals: React.FC<ProfileModalsProps> = ({
  showProfileSettings,
  setShowProfileSettings,
  userProfile,
  userName,
  updateProfile,
  showUserProfileModal,
  setShowUserProfileModal,
  onStartAudioCall,
}) => {
  return (
    <>
      <AnimatePresence>
        {showProfileSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-tight">Meu Perfil</h3>
                <button onClick={() => setShowProfileSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-2xl text-3xl mb-4 overflow-hidden">
                  {userProfile?.persona_data?.avatar_url ? (
                    <img src={userProfile.persona_data.avatar_url} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    userProfile?.persona_data?.nome?.[0] || userName[0]
                  )}
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1">{userProfile?.persona_data?.nome || userName}</h4>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">{userProfile?.persona_data?.email || 'Usuario Connect'}</p>

                <div className="w-full space-y-6">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Recado / Bio</label>
                    <textarea
                      defaultValue={userProfile?.bio || ''}
                      onBlur={(e) => updateProfile(e.target.value)}
                      placeholder="Escreva algo sobre voce..."
                      className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-sm resize-none h-32"
                    />
                    <p className="text-[10px] text-slate-400 mt-2 italic">O recado sera salvo automaticamente ao sair do campo.</p>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                          <Shield size={18} />
                        </div>
                        <span className="text-xs font-bold">Privacidade</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUserProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-tight">Perfil</h3>
                <button onClick={() => setShowUserProfileModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-400 font-bold shadow-2xl text-3xl mb-4 overflow-hidden">
                  {showUserProfileModal.avatar_url ? (
                    <img src={showUserProfileModal.avatar_url} alt={showUserProfileModal.nome} className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} />
                  )}
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1">{showUserProfileModal.nome || 'Usuario'}</h4>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">{showUserProfileModal.email || 'Connect User'}</p>

                <div className="w-full space-y-6">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Recado / Bio</label>
                    <div className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm min-h-[80px]">
                      {showUserProfileModal.bio || 'Sem recado disponivel.'}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex gap-3">
                    <button
                      onClick={() => setShowUserProfileModal(null)}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={14} />
                      Mensagem
                    </button>
                    <button
                      onClick={() => {
                        setShowUserProfileModal(null);
                        onStartAudioCall();
                      }}
                      className="p-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      <Phone size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProfileModals;
