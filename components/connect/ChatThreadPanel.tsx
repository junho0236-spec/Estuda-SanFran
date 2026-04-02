import React, { useEffect, useRef } from 'react';
import { CornerUpLeft, Ghost, Send, X } from 'lucide-react';
import type { ChatMessage } from '../../types';
import {
  type VanishDurationId,
  VANISH_DURATION_LABEL,
  VANISH_DURATION_ORDER,
} from './vanishModeUtils';
import { FOCUS_RING, FOCUS_RING_ROUND } from './a11yClasses';
import SafeChatMarkdown from './SafeChatMarkdown';
import { MAX_CHAT_MESSAGE_CHARS } from './chatContentLimits';

interface ChatThreadPanelProps {
  root: ChatMessage;
  rootAuthorLabel: string;
  onClose: () => void;
  replyMessages: ChatMessage[];
  renderReply: (msg: ChatMessage) => React.ReactNode;
  threadDraft: string;
  setThreadDraft: (v: string) => void;
  threadReplyingTo: ChatMessage | null;
  setThreadReplyingTo: (v: ChatMessage | null) => void;
  sendThreadMessage: () => void;
  handleTyping: () => void;
  isVanishMode: boolean;
  setIsVanishMode: (v: boolean) => void;
  vanishDurationId: VanishDurationId;
  setVanishDurationId: (id: VanishDurationId) => void;
  userName: string;
}

const ChatThreadPanel: React.FC<ChatThreadPanelProps> = ({
  root,
  rootAuthorLabel,
  onClose,
  replyMessages,
  renderReply,
  threadDraft,
  setThreadDraft,
  threadReplyingTo,
  setThreadReplyingTo,
  sendThreadMessage,
  handleTyping,
  isVanishMode,
  setIsVanishMode,
  vanishDurationId,
  setVanishDurationId,
  userName,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replyMessages.length, root.id]);

  return (
    <div className="absolute inset-0 z-[85] flex flex-col bg-white dark:bg-[#141414] border-l border-slate-200 dark:border-white/10 shadow-[-8px_0_32px_rgba(0,0,0,0.12)] max-w-full md:max-w-md ml-auto">
      <header className="shrink-0 p-4 border-b border-slate-200 dark:border-white/10 flex items-start justify-between gap-3 bg-slate-50/90 dark:bg-black/30">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1">Tópico</p>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{rootAuthorLabel}</p>
          <div className="text-sm mt-2 max-h-28 overflow-y-auto custom-scrollbar text-slate-800 dark:text-slate-100 markdown-body">
            {root.content?.trim() ? (
              <SafeChatMarkdown content={root.content} />
            ) : (
              <span className="text-slate-400 italic text-xs">Mídia ou anexo na conversa principal</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 shrink-0 ${FOCUS_RING_ROUND}`}
          title="Fechar tópico"
          aria-label="Fechar tópico"
        >
          <X size={20} aria-hidden />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar min-h-0">
        {replyMessages.length === 0 && (
          <p className="text-center text-[10px] text-slate-400 py-8 font-bold uppercase tracking-widest">
            Nenhuma resposta ainda — seja o primeiro
          </p>
        )}
        {replyMessages.map((msg) => (
          <div key={msg.id} className="py-1">
            {renderReply(msg)}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-slate-200 dark:border-white/10 p-3 bg-white dark:bg-[#1a1a1a]">
        {threadReplyingTo && (
          <div className="mb-2 p-2 rounded-xl border-l-4 border-blue-500 bg-slate-50 dark:bg-white/5 flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-start gap-2">
              <CornerUpLeft size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase text-blue-500">
                  Respondendo a{' '}
                  {threadReplyingTo.sender_name === userName ? 'você' : threadReplyingTo.sender_name}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{threadReplyingTo.content}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setThreadReplyingTo(null)}
              className={`p-1 text-slate-400 hover:text-slate-600 shrink-0 rounded-full ${FOCUS_RING_ROUND}`}
              aria-label="Cancelar resposta no tópico"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsVanishMode(!isVanishMode)}
              className={`p-2.5 rounded-xl ${FOCUS_RING} ${isVanishMode ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
              title="Modo vanish — escolha o tempo abaixo"
              aria-label={isVanishMode ? 'Desativar modo mensagem temporária' : 'Ativar modo mensagem temporária'}
              aria-pressed={isVanishMode}
            >
              <Ghost size={18} aria-hidden />
            </button>
            {isVanishMode && (
              <div className="flex rounded-md overflow-hidden border border-indigo-400/50 bg-indigo-600/25 dark:bg-indigo-500/20">
                {VANISH_DURATION_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVanishDurationId(id)}
                    className={`px-1 py-0.5 text-[8px] font-black uppercase min-w-[1.5rem] ${FOCUS_RING} ${
                      vanishDurationId === id
                        ? 'bg-white text-indigo-600 dark:bg-white dark:text-indigo-700'
                        : 'text-indigo-100 hover:bg-white/10'
                    }`}
                    title={VANISH_DURATION_LABEL[id]}
                    aria-label={`Tempo até expirar: ${VANISH_DURATION_LABEL[id]}`}
                  >
                    {VANISH_DURATION_LABEL[id]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            value={threadDraft}
            onChange={(e) => {
              setThreadDraft(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendThreadMessage();
              }
            }}
            placeholder="Responder no tópico…"
            rows={2}
            maxLength={MAX_CHAT_MESSAGE_CHARS}
            className={`flex-1 min-w-0 p-3 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-blue-500 resize-none max-h-28 ${FOCUS_RING}`}
            aria-label="Mensagem no tópico"
          />
          <button
            type="button"
            onClick={sendThreadMessage}
            disabled={!threadDraft.trim()}
            className={`p-3 bg-blue-600 text-white rounded-xl disabled:opacity-40 shrink-0 ${FOCUS_RING}`}
            aria-label="Enviar resposta no tópico"
          >
            <Send size={20} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatThreadPanel;
