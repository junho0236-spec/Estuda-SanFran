import React, { useEffect, useState } from 'react';
import { X, CalendarClock, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ChatMessage, ChatScheduledItemKind } from '../../types';
import {
  MAX_CHAT_MESSAGE_CHARS,
  MAX_REPLY_SNIPPET_CHARS,
  clampUtf16,
  stripControlChars,
} from './chatContentLimits';

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface ScheduleChatSubmitPayload {
  kind: ChatScheduledItemKind;
  content: string;
  scheduledAtIso: string;
  replyToId: string | null;
  replyToContent: string | null;
  replyToSenderName: string | null;
  contextText: string | null;
}

interface ScheduleChatModalProps {
  show: boolean;
  onClose: () => void;
  kind: ChatScheduledItemKind;
  roomLabel?: string;
  initialMessageText: string;
  replyingTo: ChatMessage | null;
  submitting: boolean;
  onSubmit: (payload: ScheduleChatSubmitPayload) => Promise<void>;
}

const ScheduleChatModal: React.FC<ScheduleChatModalProps> = ({
  show,
  onClose,
  kind,
  roomLabel,
  initialMessageText,
  replyingTo,
  submitting,
  onSubmit,
}) => {
  const [content, setContent] = useState('');
  const [scheduledLocal, setScheduledLocal] = useState('');

  useEffect(() => {
    if (!show) return;
    const base = kind === 'scheduled_message' ? initialMessageText : '';
    setContent(clampUtf16(stripControlChars(base), MAX_CHAT_MESSAGE_CHARS));
    const d = new Date();
    d.setHours(d.getHours() + 1, Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    setScheduledLocal(toDatetimeLocalValue(d));
  }, [show, kind, initialMessageText]);

  const applyPreset = (hoursFromNow: number) => {
    const d = new Date();
    d.setTime(d.getTime() + hoursFromNow * 60 * 60 * 1000);
    setScheduledLocal(toDatetimeLocalValue(d));
  };

  const applyTomorrowNine = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    setScheduledLocal(toDatetimeLocalValue(d));
  };

  const handleSubmit = async () => {
    const trimmed = stripControlChars(content.trim());
    if (!trimmed) return;
    if (trimmed.length > MAX_CHAT_MESSAGE_CHARS) return;
    const at = new Date(scheduledLocal);
    if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) return;
    const contextText =
      kind === 'reminder' && replyingTo?.content
        ? clampUtf16(stripControlChars(replyingTo.content), MAX_REPLY_SNIPPET_CHARS)
        : null;
    await onSubmit({
      kind,
      content: trimmed,
      scheduledAtIso: at.toISOString(),
      replyToId: replyingTo?.id ?? null,
      replyToContent: replyingTo?.content ?? null,
      replyToSenderName: replyingTo?.sender_name ?? null,
      contextText,
    });
  };

  const title =
    kind === 'reminder' ? 'Lembrete na conversa' : 'Agendar mensagem';
  const Icon = kind === 'reminder' ? Bell : CalendarClock;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <Icon size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white truncate">
                    {title}
                  </h3>
                  {roomLabel && (
                    <p className="text-[10px] text-slate-500 truncate">{roomLabel}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {replyingTo && (
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Respondendo a uma mensagem — será mantido no envio agendado.
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  {kind === 'reminder' ? 'Do que lembrar?' : 'Mensagem'}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={kind === 'reminder' ? 3 : 4}
                  maxLength={MAX_CHAT_MESSAGE_CHARS}
                  placeholder={
                    kind === 'reminder'
                      ? 'Ex.: revisar o PDF que mandaram…'
                      : 'Texto que será enviado…'
                  }
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Quando
                </label>
                <input
                  type="datetime-local"
                  value={scheduledLocal}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-blue-500"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => applyPreset(1)}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
                  >
                    Em 1 h
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(24)}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
                  >
                    Em 24 h
                  </button>
                  <button
                    type="button"
                    onClick={applyTomorrowNine}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
                  >
                    Amanhã 9h
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                É necessário agendar o job no Supabase (pg_cron) para a fila rodar — veja{' '}
                <span className="font-mono text-[9px]">scripts/supabase-chat-scheduled.sql</span>.
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={
                    submitting ||
                    !content.trim() ||
                    !scheduledLocal ||
                    new Date(scheduledLocal).getTime() <= Date.now()
                  }
                  onClick={handleSubmit}
                  className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {submitting ? 'Salvando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScheduleChatModal;
