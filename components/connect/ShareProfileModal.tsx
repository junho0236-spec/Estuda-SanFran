import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, User, X } from 'lucide-react';

interface ShareProfileModalProps {
  show: boolean;
  allUsers: any[];
  onClose: () => void;
  onShare: (userId: string) => void;
}

const ShareProfileModal: React.FC<ShareProfileModalProps> = ({
  show,
  allUsers,
  onClose,
  onShare,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="share-profile-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Compartilhar Contato</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Selecione um colega para compartilhar</p>
              {allUsers.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">Nenhum colega encontrado</p>
              ) : (
                allUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => onShare(user.id)}
                    className="w-full p-4 flex items-center gap-4 bg-slate-50 dark:bg-black/20 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-2xl border border-slate-200 dark:border-white/5 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {user.persona_data?.avatar_url ? (
                        <img src={user.persona_data.avatar_url} alt={user.persona_data.nome} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-slate-400" size={24} />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{user.persona_data?.nome || 'Colega'}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black mt-1">
                        {user.persona_data?.especialidade || 'Estudante'}
                      </p>
                    </div>
                    <Share2 size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareProfileModal;
