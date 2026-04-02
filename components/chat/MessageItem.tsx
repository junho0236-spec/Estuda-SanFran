
import React from 'react';
import { 
  Star, Smile, Reply, Forward, Edit2, Trash2, 
  Mic, FileText, BarChart2, User, Share2, 
  Ghost, Clock, Check, CheckCheck, MessagesSquare,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, ChatParticipant, ChatRoom } from '../../types';
import SafeChatMarkdown from '../connect/SafeChatMarkdown';
import {
  sanitizeAttachmentDisplayName,
  sanitizeStoredLinkPreview,
  safeAttachmentUrlForMedia,
} from '../connect/chatContentLimits';
import { formatGroupReadReceiptLabel, getGroupMessageReaders } from '../connect/chatUtils';
import { FOCUS_RING } from '../connect/a11yClasses';

const REACTION_EMOJI_LABELS: Record<string, string> = {
  '👍': 'Polegar para cima',
  '❤️': 'Coração',
  '😂': 'Riso',
  '😮': 'Surpresa',
  '😢': 'Tristeza',
  '🙏': 'Obrigado',
  '⚖️': 'Justiça',
};

interface MessageItemProps {
  msg: ChatMessage;
  userId: string;
  userName: string;
  isMe: boolean;
  isDeleted: boolean;
  activeRoom: ChatRoom;
  roomParticipants: ChatParticipant[];
  starredMessages: string[];
  toggleStarMessage: (msgId: string) => void;
  showReactionPicker: string | null;
  setShowReactionPicker: (msgId: string | null) => void;
  addReaction: (msgId: string, emoji: string) => void;
  removeReaction: (msgId: string, emoji: string) => void;
  messageReactions: Record<string, any[]>;
  startReplying: (msg: ChatMessage) => void;
  setForwardingMessage: (msg: ChatMessage) => void;
  setShowForwardModal: (show: boolean) => void;
  startEditing: (msg: ChatMessage) => void;
  deleteMessage: (msgId: string) => void;
  openUserProfile: (userId: string) => void;
  onNavigate?: (view: any, params?: any) => void;
  polls: Record<string, any>;
  votePoll: (pollId: string, optionIdx: number) => void;
  createTaskFromMessage?: (msg: ChatMessage) => void;
  /** Linha do tempo principal: mostra tópico / contagem; em "thread" esconde. */
  threadUiMode?: 'main' | 'thread';
  threadReplyCount?: number;
  onOpenThread?: (msg: ChatMessage) => void;
  resendMessage?: (msg: ChatMessage) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  msg, userId, userName, isMe, isDeleted, activeRoom, roomParticipants, starredMessages,
  toggleStarMessage, showReactionPicker, setShowReactionPicker,
  addReaction, removeReaction, messageReactions, startReplying,
  setForwardingMessage, setShowForwardModal, startEditing, deleteMessage,
  openUserProfile, onNavigate, polls, votePoll, createTaskFromMessage,
  threadUiMode = 'main',
  threadReplyCount = 0,
  onOpenThread,
  resendMessage,
}) => {
  
  const isStarred = starredMessages.includes(msg.id);
  const reactions = messageReactions[msg.id] || [];
  const isInFlight = msg.status === 'sending';
  const isFailed = msg.status === 'failed';
  const skipDeliveryUi = msg.id.startsWith('temp-') || isInFlight || isFailed;

  const groupReaders =
    activeRoom.is_group && isMe && !skipDeliveryUi
      ? getGroupMessageReaders(msg, roomParticipants)
      : [];
  const groupReadLabel =
    activeRoom.is_group && isMe && !skipDeliveryUi
      ? formatGroupReadReceiptLabel(groupReaders)
      : null;

  const safeLinkPreview = sanitizeStoredLinkPreview(msg.link_preview);
  const safeAttachUrl = safeAttachmentUrlForMedia(msg.attachment_url);

  const renderStatusIcon = () => {
    if (!isMe) return null;

    if (isFailed) {
      return (
        <span
          className="inline-flex"
          title={msg.send_error || 'Falha ao enviar'}
          role="img"
          aria-label={msg.send_error || 'Falha ao enviar'}
        >
          <AlertCircle size={12} className="text-red-200" aria-hidden />
        </span>
      );
    }

    if (msg.id.startsWith('temp-') || isInFlight) {
      return (
        <span className="inline-flex" aria-hidden title="A enviar">
          <Clock size={12} className="text-blue-200 animate-pulse" />
        </span>
      );
    }

    if (activeRoom.is_group) {
      if (groupReaders.length > 0) {
        return (
          <span className="inline-flex" title={groupReadLabel || undefined} aria-hidden>
            <CheckCheck size={12} className="text-blue-400" />
          </span>
        );
      }
      if (msg.status === 'delivered' || msg.status === 'read') {
        return (
          <span className="inline-flex" title="Entregue" aria-hidden>
            <CheckCheck size={12} className="text-blue-200" />
          </span>
        );
      }
      return (
        <span className="inline-flex" title="Enviada" aria-hidden>
          <Check size={12} className="text-blue-100" />
        </span>
      );
    }

    switch (msg.status) {
      case 'read':
        return (
          <span className="inline-flex" aria-hidden title="Lida">
            <CheckCheck size={12} className="text-blue-400" />
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex" aria-hidden title="Entregue">
            <CheckCheck size={12} className="text-blue-200" />
          </span>
        );
      case 'sent':
      default:
        return (
          <span className="inline-flex" aria-hidden title="Enviada">
            <Check size={12} className="text-blue-100" />
          </span>
        );
    }
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative z-10`}>
      <div className={`max-w-[70%] group relative ${isMe ? 'items-end' : 'items-start'}`}>
        
        {/* MESSAGE OPTIONS (HOVER) */}
        {!isDeleted && (
          <div
            className={`absolute top-0 ${isMe ? '-left-28' : '-right-28'} opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity flex gap-1 z-10 p-1 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-slate-200 dark:border-white/5`}
            role="toolbar"
            aria-label="Ações da mensagem"
          >
            {isMe && (isInFlight || isFailed) ? (
              <>
                {isFailed && resendMessage && (
                  <button
                    type="button"
                    onClick={() => void resendMessage(msg)}
                    className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-blue-500 ${FOCUS_RING}`}
                    title="Reenviar"
                    aria-label="Reenviar mensagem"
                  >
                    <RefreshCw size={14} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void deleteMessage(msg.id)}
                  className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-red-500 ${FOCUS_RING}`}
                  title={isInFlight ? 'Cancelar envio' : 'Remover'}
                  aria-label={isInFlight ? 'Cancelar envio' : 'Remover mensagem'}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => toggleStarMessage(msg.id)}
                  className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md ${isStarred ? 'text-yellow-500' : 'text-slate-500'} ${FOCUS_RING}`}
                  title="Favoritar"
                  aria-label={isStarred ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <Star size={16} fill={isStarred ? 'currentColor' : 'none'} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                  className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-500 ${FOCUS_RING}`}
                  title="Reagir"
                  aria-label="Abrir reações"
                  aria-expanded={showReactionPicker === msg.id}
                >
                  <Smile size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => startReplying(msg)}
                  className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-500 ${FOCUS_RING}`}
                  title="Responder"
                  aria-label="Responder a esta mensagem"
                >
                  <Reply size={14} aria-hidden />
                </button>
                {threadUiMode === 'main' && !msg.thread_root_id && onOpenThread && (
                  <button
                    type="button"
                    onClick={() => onOpenThread(msg)}
                    className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-500 ${FOCUS_RING}`}
                    title="Responder no tópico"
                    aria-label="Responder no tópico"
                  >
                    <MessagesSquare size={14} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setForwardingMessage(msg);
                    setShowForwardModal(true);
                  }}
                  className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-500 ${FOCUS_RING}`}
                  title="Encaminhar"
                  aria-label="Encaminhar mensagem"
                >
                  <Forward size={14} aria-hidden />
                </button>
                {isMe && (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditing(msg)}
                      className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-500 ${FOCUS_RING}`}
                      title="Editar"
                      aria-label="Editar mensagem"
                    >
                      <Edit2 size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteMessage(msg.id)}
                      className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-red-500 ${FOCUS_RING}`}
                      title="Apagar"
                      aria-label="Apagar mensagem"
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div className={`p-3 rounded-2xl shadow-sm relative ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white border border-slate-200 dark:border-white/5 rounded-tl-none'} ${isDeleted ? 'opacity-50 italic' : ''} ${isMe && isFailed ? 'ring-2 ring-red-400/60' : ''}`}>
          
          {/* REACTION PICKER POPOVER */}
          <AnimatePresence>
            {showReactionPicker === msg.id && (
              <motion.div 
                key="reaction-picker"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className={`absolute -top-12 ${isMe ? 'right-0' : 'left-0'} flex gap-1 p-1.5 bg-white dark:bg-[#1a1a1a] rounded-full shadow-xl border border-slate-200 dark:border-white/10 z-20`}
              >
                {['👍', '❤️', '😂', '😮', '😢', '🙏', '⚖️'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => addReaction(msg.id, emoji)}
                    className={`hover:scale-125 transition-transform p-1 rounded-full ${FOCUS_RING}`}
                    aria-label={`Reagir com ${REACTION_EMOJI_LABELS[emoji] ?? emoji}`}
                  >
                    <span aria-hidden>{emoji}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* SENDER NAME (GROUP CHAT) */}
          {activeRoom.is_group && !isMe && !isDeleted && (
            <button
              type="button"
              onClick={() => openUserProfile(msg.sender_id)}
              className={`text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 hover:underline text-left block rounded ${FOCUS_RING}`}
              aria-label={`Ver perfil de ${msg.sender_name}`}
            >
              {msg.sender_name}
            </button>
          )}

          {/* FORWARDED INDICATOR */}
          {msg.is_forwarded && !isDeleted && (
            <div className={`flex items-center gap-1 mb-1 text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'} italic`}>
              <Forward size={10} />
              <span>Encaminhada de {msg.forwarded_from_name}</span>
            </div>
          )}

          {/* REPLY PREVIEW */}
          {msg.reply_to_id && !isDeleted && (
            <div className={`mb-2 p-2 rounded-lg border-l-4 text-xs ${isMe ? 'bg-blue-700/50 border-blue-300 text-blue-100' : 'bg-slate-100 dark:bg-white/5 border-blue-500 text-slate-500 dark:text-slate-400'}`}>
              <p className="font-bold mb-1">{msg.reply_to_sender_name === userName ? 'Você' : msg.reply_to_sender_name}</p>
              <p className="truncate">{msg.reply_to_content}</p>
            </div>
          )}

          {safeAttachUrl && !isDeleted && (
            <div className="mb-2">
              {(msg.message_type === 'gif' || msg.message_type === 'sticker') ? (
                <img src={safeAttachUrl} alt={msg.message_type === 'gif' ? "GIF" : "Figurinha"} className={`${msg.message_type === 'sticker' ? 'w-32 h-32' : 'max-w-full h-auto'} rounded-lg cursor-pointer hover:opacity-90 transition-opacity`} />
              ) : msg.attachment_type?.startsWith('image/') ? (
                <img src={safeAttachUrl} alt="Anexo" className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity" />
              ) : msg.attachment_type === 'audio' ? (
                <div className={`p-2 rounded-xl flex items-center gap-3 ${isMe ? 'bg-blue-700/50' : 'bg-slate-100 dark:bg-white/5'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMe ? 'bg-blue-500' : 'bg-blue-600'} text-white`}>
                    <Mic size={16} />
                  </div>
                  <audio controls className="h-8 max-w-[200px]">
                    <source src={safeAttachUrl} type="audio/webm" />
                  </audio>
                </div>
              ) : (
                <a href={safeAttachUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/10 rounded-lg text-xs hover:bg-black/20 transition-all">
                  <FileText size={16} />
                  <span className="truncate max-w-[150px]">
                    {sanitizeAttachmentDisplayName(msg.attachment_name || 'ficheiro')}
                  </span>
                </a>
              )}
            </div>
          )}

          {/* MESSAGE CONTENT */}
          <div className="relative">
            {msg.content && (
              <div className={`text-sm leading-relaxed break-words whitespace-pre-wrap markdown-body ${isMe ? 'prose-invert' : ''}`}>
                <SafeChatMarkdown content={msg.content} />
              </div>
            )}

            {/* LINK PREVIEW */}
            {safeLinkPreview && (
              <div className={`mt-3 rounded-xl overflow-hidden border ${isMe ? 'bg-blue-700/30 border-blue-400/30' : 'bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5'} shadow-sm`}>
                {safeLinkPreview.image && (
                  <img src={safeLinkPreview.image} alt={safeLinkPreview.title} className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                )}
                <div className="p-3">
                  <h4 className={`font-bold text-xs mb-1 ${isMe ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{safeLinkPreview.title}</h4>
                  <p className={`text-[10px] line-clamp-2 ${isMe ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>{safeLinkPreview.description}</p>
                </div>
              </div>
            )}

            {/* POLL RENDERING */}
            {polls[msg.id] && (
              <div className="mt-3 p-4 bg-white dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 size={16} className="text-blue-500" />
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{polls[msg.id].question}</p>
                </div>
                <div className="space-y-2">
                  {polls[msg.id].options.map((opt: string, idx: number) => {
                    const optionVotes = (polls[msg.id].votes[idx] as any[]) || [];
                    const totalVotes = Object.values(polls[msg.id].votes).reduce((acc: number, v: any) => acc + (v as any[]).length, 0);
                    const percentage = (totalVotes as number) > 0 ? Math.round(((optionVotes as any[]).length / (totalVotes as number)) * 100) : 0;
                    const hasVoted = optionVotes.includes(userId);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => votePoll(polls[msg.id].id, idx)}
                        className={`w-full p-3 rounded-xl border transition-all text-left relative overflow-hidden group/poll ${FOCUS_RING} ${hasVoted ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10' : 'border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-white/20'}`}
                        aria-label={`Votar em ${opt}${hasVoted ? ' (o seu voto)' : ''}`}
                      >
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-blue-500/10 transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="relative flex justify-between items-center text-xs">
                          <span className={`font-medium ${hasVoted ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                          <span className="text-[10px] font-bold text-slate-400">{percentage}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">
                  {(Object.values(polls[msg.id].votes) as any[]).reduce((acc: number, v: any) => acc + (v as any[]).length, 0)} votos
                </p>
              </div>
            )}

            {threadUiMode === 'main' && !msg.thread_root_id && onOpenThread && threadReplyCount > 0 && (
              <button
                type="button"
                onClick={() => onOpenThread(msg)}
                className={`mt-2 w-full text-left text-[10px] font-bold uppercase tracking-wider py-2 px-2 rounded-xl border transition-colors ${
                  isMe
                    ? 'border-blue-400/40 bg-blue-700/30 text-blue-100 hover:bg-blue-700/50'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                {threadReplyCount} resposta{threadReplyCount !== 1 ? 's' : ''} no tópico — abrir
              </button>
            )}

            {/* SHARED PROFILE RENDERING */}
            {msg.shared_profile_id && (
              <div className="mt-3 p-4 bg-white dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-4 group/profile">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow-lg shrink-0">
                  <User size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">Perfil Compartilhado</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black mt-1">Clique para visualizar</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('profile', { userId: msg.shared_profile_id })}
                  className={`p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 ${FOCUS_RING}`}
                  aria-label="Abrir perfil partilhado"
                >
                  <Share2 size={16} aria-hidden />
                </button>
              </div>
            )}
          </div>

          <div className={`flex flex-col items-end gap-1 mt-1 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
            {isMe && isFailed && msg.send_error && (
              <span className="text-[9px] text-red-100/90 text-right max-w-[200px] leading-tight line-clamp-2" title={msg.send_error}>
                {msg.send_error}
              </span>
            )}
            <div className="flex items-center gap-1 justify-end w-full">
              {msg.is_vanish && <Ghost size={10} className="text-blue-400 animate-pulse" aria-hidden />}
              {msg.is_edited && !isDeleted && <span className="text-[8px] uppercase font-bold mr-1">Editada</span>}
              <span className="text-[9px]">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {renderStatusIcon()}
            </div>
            {isMe && isFailed && resendMessage && (
              <button
                type="button"
                onClick={() => void resendMessage(msg)}
                className="mt-0.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-white/95 bg-red-500/35 hover:bg-red-500/50 px-2 py-1 rounded-lg border border-red-300/30"
              >
                <RefreshCw size={12} />
                Reenviar
              </button>
            )}
          </div>

          {activeRoom.is_group && isMe && !isDeleted && groupReaders.length > 0 && groupReadLabel && (
            <div
              className="mt-0.5 text-[8px] text-blue-100/90 text-right leading-tight max-w-[220px] ml-auto opacity-90"
              title={groupReadLabel}
            >
              {groupReadLabel}
            </div>
          )}

          {/* REACTION DISPLAY */}
          {reactions.length > 0 && !isDeleted && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(
                reactions.reduce((acc: any, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]: [string, any]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    const myReaction = reactions.find((r) => r.user_id === userId && r.emoji === emoji);
                    if (myReaction) removeReaction(msg.id, emoji);
                    else addReaction(msg.id, emoji);
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${FOCUS_RING} ${
                    reactions.some((r) => r.user_id === userId && r.emoji === emoji)
                      ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-white/10 text-slate-500'
                  }`}
                  aria-label={
                    reactions.some((r) => r.user_id === userId && r.emoji === emoji)
                      ? `Remover reação ${REACTION_EMOJI_LABELS[emoji] ?? emoji}`
                      : `Adicionar reação ${REACTION_EMOJI_LABELS[emoji] ?? emoji}`
                  }
                >
                  <span aria-hidden>{emoji}</span>
                  {count > 1 && <span aria-hidden>{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
