import React, { useEffect, useMemo, useRef } from 'react';
import { ChatMessage, ChatParticipant, ChatRoom } from '../../types';
import MessageItem from './MessageItem';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import type { ChatConversationSearchCriteria } from '../connect/chatSearchUtils';
import {
  hasActiveConversationSearchCriteria,
  messageMatchesConversationCriteria,
} from '../connect/chatSearchUtils';

interface MessageListProps {
  messages: ChatMessage[];
  userId: string;
  userName: string;
  activeRoom: ChatRoom;
  roomParticipants: ChatParticipant[];
  roomSettings: Record<string, any>;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  fetchMessages: (roomId: string, loadMore?: boolean) => void;
  conversationSearchCriteria: ChatConversationSearchCriteria;
  showStarredOnly: boolean;
  starredMessages: string[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
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
  typingUsers: string[];
  createTaskFromMessage?: (msg: ChatMessage) => void;
  onOpenThread?: (msg: ChatMessage) => void;
  resendMessage?: (msg: ChatMessage) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages, userId, userName, activeRoom, roomParticipants, roomSettings, hasMoreMessages,
  isLoadingMore, fetchMessages, conversationSearchCriteria, showStarredOnly,
  starredMessages, messagesEndRef, toggleStarMessage, showReactionPicker,
  setShowReactionPicker, addReaction, removeReaction, messageReactions,
  startReplying, setForwardingMessage, setShowForwardModal, startEditing,
  deleteMessage, openUserProfile, onNavigate, polls, votePoll, typingUsers,
  createTaskFromMessage, onOpenThread, resendMessage
}) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const mainTimelineMessages = useMemo(
    () => messages.filter((m) => !m.thread_root_id),
    [messages]
  );

  const threadReplyCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const msg of messages) {
      if (msg.thread_root_id) {
        m.set(msg.thread_root_id, (m.get(msg.thread_root_id) || 0) + 1);
      }
    }
    return m;
  }, [messages]);
  
  const filteredMessages = useMemo(() => {
    const searchActive = hasActiveConversationSearchCriteria(conversationSearchCriteria);
    return mainTimelineMessages.filter((msg) => {
      const matchesSearch =
        !searchActive || messageMatchesConversationCriteria(msg, conversationSearchCriteria);
      const matchesStarred = showStarredOnly ? starredMessages.includes(msg.id) : true;
      const isExpired = msg.is_vanish && msg.expires_at && new Date(msg.expires_at) < new Date();
      return matchesSearch && matchesStarred && !isExpired;
    });
  }, [mainTimelineMessages, conversationSearchCriteria, showStarredOnly, starredMessages]);

  const settings = roomSettings[activeRoom.id] || {};

  useEffect(() => {
    if (virtuosoRef.current && filteredMessages.length > 0) {
      virtuosoRef.current.scrollToIndex({
        index: filteredMessages.length - 1,
        behavior: 'auto'
      });
    }
  }, [activeRoom.id, filteredMessages.length]);

  return (
    <div 
      className="flex-1 relative"
      style={{
        backgroundColor: settings.background_color || undefined,
        backgroundImage: settings.wallpaper_url ? `url(${settings.wallpaper_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay'
      }}
    >
      {/* Overlay for better readability if wallpaper is set */}
      {settings.wallpaper_url && (
        <div className="absolute inset-0 bg-white/30 dark:bg-black/40 pointer-events-none" />
      )}
      
      <Virtuoso
        ref={virtuosoRef}
        data={filteredMessages}
        className="custom-scrollbar"
        style={{ height: '100%' }}
        initialTopMostItemIndex={filteredMessages.length - 1}
        followOutput="smooth"
        components={{
          Header: () => (
            <div className="p-6 pb-0">
              {hasMoreMessages && (
                <div className="flex justify-center py-2">
                  <button 
                    onClick={() => fetchMessages(activeRoom.id, true)}
                    disabled={isLoadingMore}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-4 py-2 rounded-full transition-all disabled:opacity-50"
                  >
                    {isLoadingMore ? 'Carregando...' : 'Ver mensagens anteriores'}
                  </button>
                </div>
              )}
            </div>
          ),
          Footer: () => (
            <div className="p-6 pt-0">
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 italic font-bold uppercase tracking-widest px-2 pb-2 mb-4">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  {typingUsers.join(', ')} {typingUsers.length > 1 ? 'estão digitando...' : 'está digitando...'}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )
        }}
        itemContent={(index, msg) => (
          <div className="px-6 py-2">
            <MessageItem
              key={msg.id}
              msg={msg}
              userId={userId}
              userName={userName}
              isMe={msg.sender_id === userId}
              isDeleted={msg.is_deleted}
              activeRoom={activeRoom}
              roomParticipants={roomParticipants}
              starredMessages={starredMessages}
              toggleStarMessage={toggleStarMessage}
              showReactionPicker={showReactionPicker}
              setShowReactionPicker={setShowReactionPicker}
              addReaction={addReaction}
              removeReaction={removeReaction}
              messageReactions={messageReactions}
              startReplying={startReplying}
              setForwardingMessage={setForwardingMessage}
              setShowForwardModal={setShowForwardModal}
              startEditing={startEditing}
              deleteMessage={deleteMessage}
              openUserProfile={openUserProfile}
              onNavigate={onNavigate}
              polls={polls}
              votePoll={votePoll}
              createTaskFromMessage={createTaskFromMessage}
              threadUiMode="main"
              threadReplyCount={threadReplyCounts.get(msg.id) ?? 0}
              onOpenThread={onOpenThread}
              resendMessage={resendMessage}
            />
          </div>
        )}
      />
    </div>
  );
};

export default MessageList;
