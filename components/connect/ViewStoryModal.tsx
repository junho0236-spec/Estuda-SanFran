import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X } from 'lucide-react';
import type { ChatStory } from '../../types';

interface ViewStoryModalProps {
  show: boolean;
  story: ChatStory | null;
  onClose: () => void;
}

const ViewStoryModal: React.FC<ViewStoryModalProps> = ({ show, story, onClose }) => {
  return (
    <AnimatePresence>
      {show && story && (
        <motion.div
          key="view-story-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md aspect-[9/16] bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col items-center justify-center p-8 text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
            >
              <X size={24} />
            </button>

            <div className="absolute top-6 left-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30">
                {story.user_avatar ? (
                  <img src={story.user_avatar} alt={story.user_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="text-white" size={20} />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-white uppercase tracking-tight">{story.user_name}</p>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">
                  {new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <p className="text-2xl md:text-3xl font-black text-white leading-tight px-4">
                "{story.content}"
              </p>
            </div>

            <div className="absolute bottom-10 w-full px-8">
              <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  onAnimationComplete={onClose}
                  className="h-full bg-white"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ViewStoryModal;
