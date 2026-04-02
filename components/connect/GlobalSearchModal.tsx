import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MessageSquare, Search, X } from 'lucide-react';
import type { ChatRoom } from '../../types';

interface GlobalSearchMessage {
  id: string;
  room_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface GlobalSearchModalProps {
  show: boolean;
  query: string;
  setQuery: (q: string) => void;
  results: GlobalSearchMessage[];
  searching: boolean;
  rooms: ChatRoom[];
  onSearch: (q: string) => void;
  onClose: () => void;
  onSelectRoom: (room: ChatRoom) => void;
  getChatName: (room: ChatRoom) => string;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  show,
  query,
  setQuery,
  results,
  searching,
  rooms,
  onSearch,
  onClose,
  onSelectRoom,
  getChatName,
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
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar em todas as mensagens..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    onSearch(e.target.value);
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold"
                  autoFocus
                />
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {searching ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-40">
                  <Loader2 className="animate-spin mb-2" />
                  <p className="text-xs font-black uppercase tracking-widest">Pesquisando...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((msg) => {
                    const room = rooms.find((r) => r.id === msg.room_id);
                    return (
                      <button
                        key={msg.id}
                        onClick={() => {
                          if (room) {
                            onSelectRoom(room);
                            onClose();
                          }
                        }}
                        className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl hover:border-blue-500 transition-all text-left group"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                            {room ? getChatName(room) : 'Conversa desconhecida'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{msg.sender_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{msg.content}</p>
                      </button>
                    );
                  })}
                </div>
              ) : query ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-40 text-center">
                  <Search size={48} className="mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">Nenhum resultado encontrado</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 opacity-40 text-center">
                  <MessageSquare size={48} className="mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">Digite algo para pesquisar</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalSearchModal;
