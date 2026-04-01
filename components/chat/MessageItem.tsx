
import React from 'react';
import { 
  Star, Smile, Reply, Forward, Edit2, Trash2, 
  Mic, FileText, BarChart2, User, Share2, 
  Ghost, Clock, Check, CheckCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, ChatRoom } from '../../types';

interface MessageItemProps {
  msg: ChatMessage;
  userId: string;
  userName: string;
  isMe: boolean;
  isDeleted: boolean;
  activeRoom: ChatRoom;
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
}

const MessageItem: React.FC<MessageItemProps> = ({
  msg, userId, userName, isMe, isDeleted, activeRoom, starredMessages,
  toggleStarMessage, showReactionPicker, setShowReactionPicker,
  addReaction, removeReaction, messageReactions, startReplying,
  setForwardingMessage, setShowForwardModal, startEditing, deleteMessage,
  openUserProfile, onNavigate, polls, votePoll, createTaskFromMessage
}) => {
  
  const isStarred = starredMessages.includes(msg.id);
  const reactions = messageReactions[msg.id] || [];

  const renderStatusIcon = () => {
    if (!isMe) return null;
    
    if (msg.id.startsWith('temp-')) {
      return <Clock size={12} className="text-blue-200 animate-pulse" />;
    }

    switch (msg.status) {
      case 'read':
        return <CheckCheck size={12} className="text-blue-400" />;
      case 'delivered':
        return <CheckCheck size={12} className="text-blue-200" />;
      case 'sent':
      default:
        return <Check size={12} className="text-blue-100" />;
    }
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative z-10`}>
      <div className={`max-w-[70%] group relative ${isMe ? 'items-end' : 'items-start'}`}>
        
        {/* MESSAGE OPTIONS (HOVER) */}
        {!isDeleted && (
          <div className={`absolute top-0 ${isMe ? '-left-28' : '-right-28'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10 p-1 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-slate-200 dark:border-white/5`}>
            <button onClick={() => toggleStarMessage(msg.id)} className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md ${isStarred ? 'text-yellow-500' : 'text-slate-500'}`} title="Favoritar">
              <Star size={16} fill={isStarred ? "currentColor" : "none"} />
            </button>
            <button onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-500" title="Reagir">
              <Smile size={14} />
            </button>
            <button onClick={() => startReplying(msg)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-500" title="Responder">
              <Reply size={14} />
            </button>
            <button onClick={() => { setForwardingMessage(msg); setShowForwardModal(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-500" title="Encaminhar">
              <Forward size={14} />
            </button>
            {isMe && (
              <>
                <button onClick={() => startEditing(msg)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-500" title="Editar">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => deleteMessage(msg.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-red-500" title="Apagar">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        )}

        <div className={`p-3 rounded-2xl shadow-sm relative ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white border border-slate-200 dark:border-white/5 rounded-tl-none'} ${isDeleted ? 'opacity-50 italic' : ''}`}>
          
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
                {['👍', '❤️', '😂', '😮', '😢', '🙏', '⚖️'].map(emoji => (
                  <button 
                    key={emoji} 
                    onClick={() => addReaction(msg.id, emoji)}
                    className="hover:scale-125 transition-transform p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* SENDER NAME (GROUP CHAT) */}
          {activeRoom.is_group && !isMe && !isDeleted && (
            <button 
              onClick={() => openUserProfile(msg.sender_id)}
              className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 hover:underline text-left block"
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

          {msg.attachment_url && !isDeleted && (
            <div className="mb-2">
              {(msg.message_type === 'gif' || msg.message_type === 'sticker') ? (
                <img src={msg.attachment_url} alt={msg.message_type === 'gif' ? "GIF" : "Figurinha"} className={`${msg.message_type === 'sticker' ? 'w-32 h-32' : 'max-w-full h-auto'} rounded-lg cursor-pointer hover:opacity-90 transition-opacity`} />
              ) : msg.attachment_type?.startsWith('image/') ? (
                <img src={msg.attachment_url} alt="Anexo" className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity" />
              ) : msg.attachment_type === 'audio' ? (
                <div className={`p-2 rounded-xl flex items-center gap-3 ${isMe ? 'bg-blue-700/50' : 'bg-slate-100 dark:bg-white/5'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMe ? 'bg-blue-500' : 'bg-blue-600'} text-white`}>
                    <Mic size={16} />
                  </div>
                  <audio controls className="h-8 max-w-[200px]">
                    <source src={msg.attachment_url} type="audio/webm" />
                  </audio>
                </div>
              ) : (
                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/10 rounded-lg text-xs hover:bg-black/20 transition-all">
                  <FileText size={16} />
                  <span className="truncate max-w-[150px]">{msg.attachment_name}</span>
                </a>
              )}
            </div>
          )}

          {/* MESSAGE CONTENT */}
          <div className="relative">
            {msg.content && (
              <div className={`text-sm leading-relaxed break-words whitespace-pre-wrap markdown-body ${isMe ? 'prose-invert' : ''}`}>
                <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
              </div>
            )}

            {/* LINK PREVIEW */}
            {msg.link_preview && (
              <div className={`mt-3 rounded-xl overflow-hidden border ${isMe ? 'bg-blue-700/30 border-blue-400/30' : 'bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5'} shadow-sm`}>
                {msg.link_preview.image && (
                  <img src={msg.link_preview.image} alt={msg.link_preview.title} className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                )}
                <div className="p-3">
                  <h4 className={`font-bold text-xs mb-1 ${isMe ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{msg.link_preview.title}</h4>
                  <p className={`text-[10px] line-clamp-2 ${isMe ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>{msg.link_preview.description}</p>
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
                        onClick={() => votePoll(polls[msg.id].id, idx)}
                        className={`w-full p-3 rounded-xl border transition-all text-left relative overflow-hidden group/poll ${hasVoted ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10' : 'border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-white/20'}`}
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
                  onClick={() => onNavigate && onNavigate('profile', { userId: msg.shared_profile_id })}
                  className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  <Share2 size={16} />
                </button>
              </div>
            )}
          </div>

          <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
            {msg.is_vanish && <Ghost size={10} className="text-blue-400 animate-pulse" />}
            {msg.is_edited && !isDeleted && <span className="text-[8px] uppercase font-bold mr-1">Editada</span>}
            <span className="text-[9px]">
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {renderStatusIcon()}
          </div>

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
                  onClick={() => {
                    const myReaction = reactions.find(r => r.user_id === userId && r.emoji === emoji);
                    if (myReaction) removeReaction(msg.id, emoji);
                    else addReaction(msg.id, emoji);
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${
                    reactions.some(r => r.user_id === userId && r.emoji === emoji)
                    ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-400'
                    : 'bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-white/10 text-slate-500'
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span>{count}</span>}
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
