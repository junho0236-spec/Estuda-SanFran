import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Search, User, Users, X } from 'lucide-react';
import type { UserProfile } from '../../types';

interface UserDiscoveryModalProps {
  show: boolean;
  onClose: () => void;
  userSearchQuery: string;
  setUserSearchQuery: (value: string) => void;
  loadingUsers: boolean;
  availableUsers: UserProfile[];
  startDirectChat: (userId: string) => void;
}

const UserDiscoveryModal: React.FC<UserDiscoveryModalProps> = ({
  show,
  onClose,
  userSearchQuery,
  setUserSearchQuery,
  loadingUsers,
  availableUsers,
  startDirectChat,
}) => {
  return (
    <AnimatePresence>
      {show && (
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
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight">Nova Conversa</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-bold"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando contatos...</p>
                </div>
              ) : availableUsers.length > 0 ? (
                <div className="space-y-1">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => startDirectChat(user.id)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border-2 border-transparent group-hover:border-blue-500 transition-all">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm truncate">{user.full_name}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{user.bio || 'Usuario'}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                        <Plus size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <Users size={48} className="text-slate-200 dark:text-white/5 mb-4" />
                  <p className="text-sm font-bold text-slate-500">Nenhum usuario encontrado.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserDiscoveryModal;
