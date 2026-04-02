import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Image as ImageIcon, Mic, Plus, X } from 'lucide-react';
import type { ChatMessage, ChatRoom } from '../../types';

interface MediaGalleryModalProps {
  show: boolean;
  activeRoom: ChatRoom | null;
  roomName: string;
  messages: ChatMessage[];
  onClose: () => void;
}

const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
  show,
  activeRoom,
  roomName,
  messages,
  onClose,
}) => {
  if (!activeRoom) return null;

  const mediaMessages = messages.filter((m) => m.attachment_url && !m.is_deleted);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="media-gallery-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-500">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Galeria da Conversa</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{roomName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-3 gap-4">
                {mediaMessages.map((m) => {
                  const isImage = m.attachment_type?.startsWith('image/');
                  const isAudio = m.attachment_type === 'audio';

                  return (
                    <div key={m.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                      {isImage ? (
                        <img src={m.attachment_url} alt={m.attachment_name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : isAudio ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2 text-center">
                          <Mic size={24} className="text-blue-500" />
                          <span className="text-[8px] font-black uppercase tracking-widest truncate w-full">Audio</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2 text-center">
                          <FileText size={24} className="text-slate-400" />
                          <span className="text-[8px] font-black uppercase tracking-widest truncate w-full">{m.attachment_name}</span>
                        </div>
                      )}
                      <a
                        href={m.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <div className="p-2 bg-white rounded-full text-slate-900">
                          <Plus size={16} />
                        </div>
                      </a>
                    </div>
                  );
                })}
                {mediaMessages.length === 0 && (
                  <div className="col-span-3 py-12 text-center opacity-40">
                    <ImageIcon size={48} className="mx-auto mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">Nenhuma midia encontrada</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaGalleryModal;
