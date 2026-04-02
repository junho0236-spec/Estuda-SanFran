import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface CreateStoryModalProps {
  show: boolean;
  content: string;
  setContent: (value: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  show,
  content,
  setContent,
  onCreate,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="create-story-modal"
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
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Novo Status</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="O que está acontecendo? (Ex: Estou na biblioteca!)"
                className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm resize-none min-h-[120px]"
              />
              <button
                onClick={onCreate}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
              >
                Publicar Status
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateStoryModal;
