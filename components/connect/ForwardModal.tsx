import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Forward, Send, User, X } from 'lucide-react';
import type { ChatMessage, ChatRoom } from '../../types';

interface ForwardModalProps {
  show: boolean;
  forwardingMessage: ChatMessage | null;
  rooms: ChatRoom[];
  getChatName: (room: ChatRoom) => string;
  getChatAvatar: (room: ChatRoom) => string | undefined;
  forwardMessage: (targetRoomId: string) => void;
  onClose: () => void;
}

const ForwardModal: React.FC<ForwardModalProps> = ({
  show,
  forwardingMessage,
  rooms,
  getChatName,
  getChatAvatar,
  forwardMessage,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {show && forwardingMessage && (
        <motion.div
          key="forward-modal"
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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-500">
                  <Forward size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Encaminhar Mensagem</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-white/5 mx-6 mt-6 rounded-2xl border border-slate-200 dark:border-white/5">
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Mensagem selecionada</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 truncate italic">"{forwardingMessage.content}"</p>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">Selecione uma conversa</p>
              <div className="space-y-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => forwardMessage(room.id)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-blue-500/30 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                      {getChatAvatar(room) ? (
                        <img src={getChatAvatar(room)} alt={getChatName(room)} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-slate-400" size={20} />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{getChatName(room)}</p>
                    </div>
                    <div className="p-2 bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Send size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ForwardModal;
