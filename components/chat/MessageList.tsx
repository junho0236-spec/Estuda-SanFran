
import React from 'react';
import { ChatMessage, ChatRoom } from '../../types';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  userId: string;
  userName: string;
  activeRoom: ChatRoom;
  roomSettings: Record<string, any>;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  fetchMessages: (roomId: string, loadMore?: boolean) => void;
  internalSearchQuery: string;
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
}

const MessageList: React.FC<MessageListProps> = ({
  messages, userId, userName, activeRoom, roomSettings, hasMoreMessages,
  isLoadingMore, fetchMessages, internalSearchQuery, showStarredOnly,
  starredMessages, messagesEndRef, toggleStarMessage, showReactionPicker,
  setShowReactionPicker, addReaction, removeReaction, messageReactions,
  startReplying, setForwardingMessage, setShowForwardModal, startEditing,
  deleteMessage, openUserProfile, onNavigate, polls, votePoll
}) => {
  
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = !internalSearchQuery || msg.content.toLowerCase().includes(internalSearchQuery.toLowerCase());
    const matchesStarred = showStarredOnly ? starredMessages.includes(msg.id) : true;
    const isExpired = msg.is_vanish && msg.expires_at && new Date(msg.expires_at) < new Date();
    return matchesSearch && matchesStarred && !isExpired;
  });

  const settings = roomSettings[activeRoom.id] || {};

  return (
    <div 
      className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative"
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
      
      <div className="relative z-10 space-y-4">
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
        
        {filteredMessages.map((msg) => (
          <MessageItem
            key={msg.id}
            msg={msg}
            userId={userId}
            userName={userName}
            isMe={msg.sender_id === userId}
            isDeleted={msg.is_deleted}
            activeRoom={activeRoom}
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
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
