import React from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';

interface FloatingSelectionMenuProps {
  position: { top: number; left: number } | null;
  isLoading: boolean;
  onTransform: () => void;
}

const FloatingSelectionMenu: React.FC<FloatingSelectionMenuProps> = ({ position, isLoading, onTransform }) => {
  if (!position) return null;

  return (
    <div
      className="fixed z-[200] flex items-center gap-1 p-1 bg-slate-900 text-white rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <button
        onClick={onTransform}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
        <span className="text-[10px] font-bold whitespace-nowrap">Transformar em Flashcard</span>
      </button>
    </div>
  );
};

export default FloatingSelectionMenu;
