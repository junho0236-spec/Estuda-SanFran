import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface WallpaperModalProps {
  show: boolean;
  onClose: () => void;
  selectedColor: string | null;
  selectedWallpaper: string | null;
  setSelectedColor: (color: string | null) => void;
  setSelectedWallpaper: (url: string | null) => void;
  onRemove: () => void;
  onApply: () => void;
}

const solidColors = [
  '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1',
  '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7',
  '#d1fae5', '#ccfbf1', '#e0f2fe', '#e0e7ff',
  '#f5f3ff', '#fae8ff', '#fce7f3', '#fef2f2',
];

const wallpaperUrls = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1511497584788-876760111969?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop',
];

const WallpaperModal: React.FC<WallpaperModalProps> = ({
  show,
  onClose,
  selectedColor,
  selectedWallpaper,
  setSelectedColor,
  setSelectedWallpaper,
  onRemove,
  onApply,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Papel de Parede</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Cores Solidas</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {solidColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setSelectedColor(color);
                          setSelectedWallpaper(null);
                        }}
                        className={`w-full aspect-square rounded-xl border-2 transition-all ${selectedColor === color ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Imagens de Fundo</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {wallpaperUrls.map((url) => (
                      <button
                        key={url}
                        onClick={() => {
                          setSelectedWallpaper(url);
                          setSelectedColor(null);
                        }}
                        className={`w-full aspect-[2/3] rounded-xl overflow-hidden border-2 transition-all ${selectedWallpaper === url ? 'border-blue-500 scale-105 shadow-lg' : 'border-transparent hover:scale-105'}`}
                      >
                        <img src={url} alt="Wallpaper" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/5 flex gap-3">
              <button
                onClick={onRemove}
                className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200"
              >
                Remover
              </button>
              <button
                onClick={onApply}
                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              >
                Aplicar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WallpaperModal;
