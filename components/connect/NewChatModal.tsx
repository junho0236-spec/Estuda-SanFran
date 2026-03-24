import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface NewChatModalProps {
  show: boolean;
  onClose: () => void;
  users: any[];
  onStartChat: (user: any) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ show, onClose, users, onStartChat }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          key="new-chat-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Nova Conversa</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {users.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">Nenhum usuário encontrado</p>
              ) : (
                users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => onStartChat(user)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                      {user.persona_data?.avatar_url ? (
                        <img src={user.persona_data.avatar_url} alt={user.persona_data.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-500 font-bold">{user.persona_data?.nome?.[0] || '?'}</span>
                      )}
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">{user.persona_data?.nome || 'Usuário'}</span>
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

export default NewChatModal;
