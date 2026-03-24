
import React from 'react';
import { 
  Search, Plus, User, Star, Bell, BellOff, 
  MessageSquare, History, Loader2, Pin, PinOff, 
  VolumeX, Phone, Video, Settings
} from 'lucide-react';
import { ChatRoom, ChatParticipant, ChatStory } from '../../types';

interface ChatSidebarProps {
  userId: string;
  userName: string;
  userProfile: any;
  userPresence: Record<string, { online: boolean, last_seen: string }>;
  rooms: ChatRoom[];
  activeRoom: ChatRoom | null;
  setActiveRoom: (room: ChatRoom | null) => void;
  participants: Record<string, ChatParticipant[]>;
  pinnedRooms: string[];
  togglePin: (roomId: string, e: React.MouseEvent) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: 'chats' | 'calls';
  setViewMode: (mode: 'chats' | 'calls') => void;
  callHistory: any[];
  stories: ChatStory[];
  setActiveStory: (story: ChatStory | null) => void;
  setShowStoryModal: (show: boolean) => void;
  setShowCreateStoryModal: (show: boolean) => void;
  activeCategory: string;
  setActiveCategory: (cat: any) => void;
  loading: boolean;
  showStarredOnly: boolean;
  setShowStarredOnly: (show: boolean) => void;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => void;
  setShowGlobalSearch: (show: boolean) => void;
  setShowProfileSettings: (show: boolean) => void;
  fetchAvailableUsers: () => void;
  setShowNewChatModal: (show: boolean) => void;
  onNavigate?: (view: any, params?: any) => void;
  getChatName: (room: ChatRoom) => string;
  getChatAvatar: (room: ChatRoom) => string | null;
  startCall: (type: 'audio' | 'video') => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  userId, userName, userProfile, userPresence, rooms, activeRoom, setActiveRoom,
  participants, pinnedRooms, togglePin, searchQuery, setSearchQuery,
  viewMode, setViewMode, callHistory, stories, setActiveStory,
  setShowStoryModal, setShowCreateStoryModal, activeCategory, setActiveCategory,
  loading, showStarredOnly, setShowStarredOnly, notificationPermission,
  requestNotificationPermission, setShowGlobalSearch, setShowProfileSettings,
  fetchAvailableUsers, setShowNewChatModal, onNavigate, getChatName, getChatAvatar,
  startCall
}) => {
  
  const filteredRooms = rooms.filter(room => {
    const name = getChatName(room).toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Tudo' || room.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`w-full md:w-[350px] border-r border-slate-200 dark:border-white/5 flex flex-col bg-slate-50/50 dark:bg-black/20 ${activeRoom ? 'hidden md:flex' : 'flex'}`}>
      
      {/* SIDEBAR HEADER */}
      <div className="p-3 md:p-4 flex flex-col gap-4 bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowProfileSettings(true)}
              className="relative group"
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg text-sm md:text-base overflow-hidden group-hover:scale-105 transition-all">
                {userProfile?.persona_data?.avatar_url ? (
                  <img src={userProfile.persona_data.avatar_url} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userProfile?.persona_data?.nome?.[0] || userName[0]
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-white/5">
                <Settings size={10} className="text-slate-400" />
              </div>
            </button>
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm md:text-base">Connect</h2>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowGlobalSearch(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
              title="Pesquisa Global"
            >
              <Search size={18} />
            </button>
            <button 
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors ${showStarredOnly ? 'text-yellow-500' : 'text-slate-400'}`}
              title="Mensagens Favoritas"
            >
              <Star size={18} fill={showStarredOnly ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={requestNotificationPermission}
              className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors ${notificationPermission === 'granted' ? 'text-green-500' : 'text-slate-400'}`}
              title={notificationPermission === 'granted' ? 'Notificações Ativas' : 'Ativar Notificações'}
            >
              {notificationPermission === 'granted' ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
            <button 
              onClick={() => { fetchAvailableUsers(); setShowNewChatModal(true); }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-blue-600"
            >
              <Plus size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
          <button 
            onClick={() => setViewMode('chats')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${viewMode === 'chats' ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <MessageSquare size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Conversas</span>
          </button>
          <button 
            onClick={() => setViewMode('calls')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${viewMode === 'calls' ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <History size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Chamadas</span>
          </button>
        </div>
      </div>

      {/* SIDEBAR CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {viewMode === 'chats' ? (
          <>
            {/* SEARCH BAR */}
            <div className="px-4 pt-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Pesquisar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl outline-none focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* STORIES BAR */}
            <div className="px-4 py-2 overflow-x-auto flex gap-3 no-scrollbar border-b border-slate-200 dark:border-white/5">
              <button 
                onClick={() => setShowCreateStoryModal(true)}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all">
                  <Plus size={20} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Status</span>
              </button>
              {stories.map(story => (
                <button 
                  key={story.id} 
                  onClick={() => { setActiveStory(story); setShowStoryModal(true); }}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-blue-500 p-0.5 shadow-sm">
                    <div className="w-full h-full rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                      {story.user_avatar ? (
                        <img src={story.user_avatar} alt={story.user_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-slate-400" size={20} />
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate w-12 text-center">{story.user_name.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* CATEGORY TABS */}
            <div className="px-4 py-2 flex gap-1 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/10">
              {['Tudo', 'Estudos', 'Estágio', 'Social', 'Privadas'].map((cat: any) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* CHAT LIST */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full opacity-40">
                  <Loader2 className="animate-spin mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Carregando...</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-40 p-8 text-center">
                  <MessageSquare size={48} className="mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Nenhuma conversa encontrada</p>
                  <p className="text-xs mt-2">Inicie uma nova conversa clicando no botão +</p>
                </div>
              ) : (
                filteredRooms.map(room => {
                  const chatName = getChatName(room);
                  const avatar = getChatAvatar(room);
                  const unreadCount = participants[room.id]?.find(p => p.user_id === userId)?.unread_count || 0;
                  const typingUser = participants[room.id]?.find(p => p.user_id !== userId && p.is_typing);
                  const isPinned = pinnedRooms.includes(room.id);

                  return (
                    <div
                      key={room.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveRoom(room)}
                      onKeyDown={(e) => e.key === 'Enter' && setActiveRoom(room)}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-white dark:hover:bg-white/5 transition-all border-l-4 group relative cursor-pointer ${activeRoom?.id === room.id ? 'bg-white dark:bg-white/5 border-blue-500' : 'border-transparent'}`}
                    >
                      <div 
                        className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                        onClick={(e) => {
                          if (!room.is_group && onNavigate) {
                            e.stopPropagation();
                            const otherId = participants[room.id]?.find(p => p.user_id !== userId)?.user_id;
                            if (otherId) onNavigate('profile', { userId: otherId });
                          }
                        }}
                      >
                        {avatar ? (
                          <img src={avatar} alt={chatName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="text-slate-400" size={24} />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2 truncate">
                            <h4 className="font-bold text-slate-900 dark:text-white truncate">{chatName}</h4>
                            {isPinned && <Pin size={12} className="text-blue-500 shrink-0" />}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {room.last_message_at ? new Date(room.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {typingUser ? (
                              <span className="text-blue-500 italic">digitando...</span>
                            ) : (
                              room.last_message || 'Inicie uma conversa'
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            {participants[room.id]?.find(p => p.user_id === userId)?.muted_until && (
                              <VolumeX size={12} className="text-slate-400" />
                            )}
                            {unreadCount > 0 && (
                              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {unreadCount}
                              </span>
                            )}
                            <button 
                              onClick={(e) => togglePin(room.id, e)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"
                            >
                              {isPinned ? <PinOff size={14} className="text-slate-400" /> : <Pin size={14} className="text-slate-400" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="p-4 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Chamadas Recentes</h3>
            {callHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-40 text-center">
                <History size={48} className="mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Nenhuma chamada</p>
              </div>
            ) : (
              callHistory.map(call => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-blue-200 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {call.other_avatar ? (
                        <img src={call.other_avatar} alt={call.other_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-slate-400" size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{call.other_name}</h4>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        {call.caller_id === userId ? (
                          <Phone size={10} className="text-blue-500" />
                        ) : (
                          <Phone size={10} className={call.status === 'ended' ? 'text-green-500' : 'text-red-500'} />
                        )}
                        <span>{call.type === 'video' ? 'Vídeo' : 'Áudio'}</span>
                        <span>•</span>
                        <span>{new Date(call.created_at).toLocaleDateString()} {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const room = rooms.find(r => r.id === call.room_id);
                      if (room) {
                        setActiveRoom(room);
                        startCall(call.type as 'audio' | 'video');
                      }
                    }}
                    className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-100"
                  >
                    {call.type === 'video' ? <Video size={16} /> : <Phone size={16} />}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
