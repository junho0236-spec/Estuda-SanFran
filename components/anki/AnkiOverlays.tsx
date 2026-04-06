import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { GlossaryPopover } from '../GlossaryPopover.tsx';
import type { GlossaryTerm } from '../../types';

export interface AnkiConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export interface AnkiOverlaysProps {
  activeGlossaryTerm: string | null;
  glossaryData: GlossaryTerm | null;
  glossaryPosition: { x: number; y: number };
  userId: string;
  isOnline: boolean;
  onCloseGlossary: () => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  confirmModal: AnkiConfirmModalState;
  onCloseConfirm: () => void;
  onConfirmModalAction: () => void;
  isLoadingGlossary: boolean;
}

export const AnkiOverlays: React.FC<AnkiOverlaysProps> = ({
  activeGlossaryTerm,
  glossaryData,
  glossaryPosition,
  userId,
  isOnline,
  onCloseGlossary,
  toast,
  confirmModal,
  onCloseConfirm,
  onConfirmModalAction,
  isLoadingGlossary,
}) => (
  <>
    <AnimatePresence>
      {activeGlossaryTerm && glossaryData && (
        <GlossaryPopover
          data={glossaryData}
          onClose={onCloseGlossary}
          userId={userId}
          isOnline={isOnline}
          position={glossaryPosition}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 ${
            toast.type === 'success'
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : toast.type === 'error'
                ? 'bg-red-600 border-red-500 text-white'
                : 'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
          {toast.type === 'error' && <AlertCircle className="w-6 h-6" />}
          {toast.type === 'info' && <Info className="w-6 h-6" />}
          <span className="font-black uppercase text-xs tracking-widest">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseConfirm}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden"
          >
            <div className="p-10">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-4">
                {confirmModal.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="p-8 bg-slate-50 dark:bg-white/5 flex gap-4">
              <button
                type="button"
                onClick={onCloseConfirm}
                className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest border-2 border-slate-200 dark:border-white/10"
              >
                {confirmModal.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={onConfirmModalAction}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20"
              >
                {confirmModal.confirmText || 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {isLoadingGlossary && !glossaryData && (
      <div
        className="fixed z-[100] p-4 bg-white rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-3 animate-in fade-in duration-200"
        style={{ left: glossaryPosition.x, top: glossaryPosition.y + 20 }}
      >
        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
        <span className="text-sm font-bold text-slate-600">Buscando definição...</span>
      </div>
    )}
  </>
);
