
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Paperclip, Send, MoreVertical, 
  Check, CheckCheck, User, Image as ImageIcon, 
  FileText, X, ChevronLeft, Loader2, MessageSquare,
  Edit2, Trash2, Reply, CornerUpLeft, Mic, Pin, PinOff,
  Link, File, Play, Pause, Trash, Bell, BellOff,
  Smile, Forward, Star, BarChart2, VolumeX, Volume2,
  Clock, Folder, History, UserPlus, Phone, Video, PhoneOff, VideoOff, Ghost, Eye, EyeOff, MicOff, Palette, Users,
  Settings, LogOut, Shield, ChevronRight, LayoutGrid, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import ChatSidebar from './chat/ChatSidebar';
import MessageList from './chat/MessageList';
import ChatInput from './chat/ChatInput';
import MediaGallery from './chat/MediaGallery';
import GroupInfoModal from './connect/GroupInfoModal';
import CallOverlay from './connect/CallOverlay';
import GlobalSearchModal from './connect/GlobalSearchModal';
import ProfileModals from './connect/ProfileModals';
import UserDiscoveryModal from './connect/UserDiscoveryModal';
import { getChatAvatarForRoom, getChatNameForRoom, getTypingUsersForRoom } from './connect/chatUtils';
import WallpaperModal from './connect/WallpaperModal';
import MediaGalleryModal from './connect/MediaGalleryModal';
import ForwardModal from './connect/ForwardModal';
import PollModal from './connect/PollModal';
import CreateStoryModal from './connect/CreateStoryModal';
import ViewStoryModal from './connect/ViewStoryModal';
import ShareProfileModal from './connect/ShareProfileModal';
import { useOnlineUsersPresence } from './connect/hooks/useOnlineUsersPresence';
import { useConnectInit } from './connect/hooks/useConnectInit';
import { usePresenceHeartbeat } from './connect/hooks/usePresenceHeartbeat';
import { useActiveRoomLifecycle } from './connect/hooks/useActiveRoomLifecycle';
import { useTypingIndicator } from './connect/hooks/useTypingIndicator';
import { useChatStore } from '../src/store/useChatStore';
import { ChatRoom, ChatMessage, ChatParticipant, UserProfile, ChatStory } from '../types';
import { dataService } from '../services/dataService';
import { toast } from 'sonner';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';

interface ConnectProps {
  userId: string;
  userName: string;
  onNavigate?: (view: any, params?: any) => void;
  setTasks?: React.Dispatch<React.SetStateAction<any[]>>;
}

const Connect: React.FC<ConnectProps> = ({ userId, userName, onNavigate, setTasks }) => {
  const {
    activeRoomId,
    setActiveRoomId,
    rooms,
    setRooms,
    messages: storeMessages,
    setMessages: setStoreMessages,
    addMessage,
    updateMessage,
    removeMessage,
    participants,
    setParticipants,
    userPresence,
    updateUserPresence,
    pinnedRooms,
    setPinnedRooms,
    archivedRooms,
    setArchivedRooms,
  } = useChatStore();

  const activeRoom = rooms.find(r => r.id === activeRoomId) || null;
  const messages = activeRoomId ? (storeMessages[activeRoomId] || []) : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const getTypingUsers = (roomId: string) => getTypingUsersForRoom(participants, roomId, userId);
  const getChatName = (room: ChatRoom) => getChatNameForRoom(room, participants, userId);
  const getChatAvatar = (room: ChatRoom) => getChatAvatarForRoom(room, participants, userId);
  const setMessages = (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    if (!activeRoomId) return;
    if (typeof msgs === 'function') {
      const currentMessages = storeMessages[activeRoomId] || [];
      setStoreMessages(activeRoomId, msgs(currentMessages));
    } else {
      setStoreMessages(activeRoomId, msgs);
    }
  };

  useOnlineUsersPresence(userId, userName, updateUserPresence);

  const markAsRead = async (roomId: string) => {
    if (!userId) return;
    try {
      await supabase.rpc('mark_messages_as_read', {
        p_room_id: roomId,
        p_user_id: userId
      });
      
      // Update local state via store
      setParticipants(prev => {
        const roomParticipants = prev[roomId] || [];
        return {
          ...prev,
          [roomId]: roomParticipants.map(p => 
            p.user_id === userId ? { ...p, unread_count: 0 } : p
          )
        };
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showMsgOptions, setShowMsgOptions] = useState<string | null>(null);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingGroupAvatar, setEditingGroupAvatar] = useState('');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [showInternalSearch, setShowInternalSearch] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [messageReactions, setMessageReactions] = useState<Record<string, any[]>>({});
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'chats' | 'calls' | 'stories'>('chats');
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const MESSAGES_PER_PAGE = 30;

  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState<any>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [starredMessages, setStarredMessages] = useState<string[]>([]);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [polls, setPolls] = useState<Record<string, any>>({});
  const [stories, setStories] = useState<ChatStory[]>([]);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [activeStory, setActiveStory] = useState<ChatStory | null>(null);
  const [newStoryContent, setNewStoryContent] = useState('');
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'Estudos' | 'Estágio' | 'Social' | 'Privadas' | 'Tudo'>('Tudo');
  const [showShareProfileModal, setShowShareProfileModal] = useState(false);
  const [sharingToRoomId, setSharingToRoomId] = useState<string | null>(null);
  const [isVanishMode, setIsVanishMode] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const handleCreateTaskFromMessage = async (msg: ChatMessage) => {
    if (!setTasks) return;
    
    try {
      const newTask = {
        id: crypto.randomUUID(),
        title: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : ''),
        description: `Capturado do chat (${msg.sender_name}):\n\n${msg.content}`,
        completed: false,
        priority: 'pendente' as const,
        category: 'geral' as const,
        createdAt: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        userId: userId,
        subtasks: [],
        comments: []
      };

      await dataService.saveTask(newTask as any, userId, true);
      setTasks(prev => [newTask as any, ...prev]);
      toast.success('Mensagem autuada como tarefa!');
    } catch (error) {
      console.error('Error creating task from message:', error);
      toast.error('Erro ao criar tarefa');
    }
  };

  const setActiveRoom = (room: ChatRoom | null) => {
    setActiveRoomId(room?.id || null);
  };
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifType, setGifType] = useState<'gifs' | 'stickers'>('gifs');
  const [gifs, setGifs] = useState<any[]>([]);
  const [roomSettings, setRoomSettings] = useState<Record<string, any>>({});
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [giphyApiKey] = useState('dc6zaTOxFJmzC'); // Public beta key for demo, should be replaced with real key

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadMessages = useRef(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { handleTyping } = useTypingIndicator(activeRoom?.id || null, userId);

  useConnectInit({
    userId,
    setNotificationPermission,
    fetchRooms: () => fetchRooms(),
    fetchUserProfile: () => fetchUserProfile(),
    fetchStarredMessages: () => fetchStarredMessages(),
    fetchStories: () => fetchStories(),
    fetchCallHistory: () => fetchCallHistory(),
    subscribeToAllRooms: () => subscribeToAllRooms(),
    subscribeToStories: () => subscribeToStories(),
    subscribeToCalls: () => subscribeToCalls(),
  });

  const fetchCallHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_calls')
        .select('*')
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enrich with participant names
      const enrichedCalls = await Promise.all((data || []).map(async (call) => {
        const otherId = call.caller_id === userId ? call.receiver_id : call.caller_id;
        const { data: userData } = await supabase
          .from('user_persona')
          .select('nome, avatar_url')
          .eq('id', otherId)
          .single();
        
        return {
          ...call,
          other_name: userData?.nome || 'Colega',
          other_avatar: userData?.avatar_url
        };
      }));

      setCallHistory(enrichedCalls);
    } catch (error) {
      console.error('Error fetching call history:', error);
    }
  };

  const subscribeToCalls = () => {
    const channel = supabase
      .channel('chat_calls_history')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_calls' 
      }, () => {
        fetchCallHistory();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchRoomSettings = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_room_settings')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setRoomSettings(prev => ({ ...prev, [roomId]: data }));
      }
    } catch (error) {
      console.error('Error fetching room settings:', error);
    }
  };

  const updateWallpaper = async (roomId: string, url: string | null, color: string | null) => {
    try {
      const { error } = await supabase
        .from('chat_room_settings')
        .upsert({
          user_id: userId,
          room_id: roomId,
          wallpaper_url: url,
          wallpaper_color: color,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,room_id' });

      if (error) throw error;
      
      setRoomSettings(prev => ({
        ...prev,
        [roomId]: { ...prev[roomId], wallpaper_url: url, wallpaper_color: color }
      }));
      setShowWallpaperModal(false);
      toast.success('Papel de parede atualizado!');
    } catch (error) {
      console.error('Error updating wallpaper:', error);
      toast.error('Erro ao atualizar papel de parede');
    }
  };

  const searchGifs = async (query: string) => {
    const endpoint = gifType === 'gifs' ? 'gifs' : 'stickers';
    if (!query.trim()) {
      // Fetch trending
      try {
        const resp = await fetch(`https://api.giphy.com/v1/${endpoint}/trending?api_key=${giphyApiKey}&limit=20`);
        const data = await resp.json();
        setGifs(data.data || []);
      } catch (e) {
        console.error(`Error fetching trending ${gifType}:`, e);
      }
      return;
    }

    try {
      const resp = await fetch(`https://api.giphy.com/v1/${endpoint}/search?api_key=${giphyApiKey}&q=${encodeURIComponent(query)}&limit=20`);
      const data = await resp.json();
      setGifs(data.data || []);
    } catch (e) {
      console.error(`Error searching ${gifType}:`, e);
    }
  };

  const sendGif = async (gifUrl: string, type: 'gif' | 'sticker' = 'gif') => {
    if (!activeRoom) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeRoom.id,
          sender_id: userId,
          sender_name: userName,
          attachment_url: gifUrl,
          message_type: type,
          status: 'sent'
        });

      if (error) throw error;
      setShowGifPicker(false);
    } catch (error) {
      console.error(`Error sending ${type}:`, error);
      toast.error(`Erro ao enviar ${type === 'gif' ? 'GIF' : 'Figurinha'}`);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      toast.success('Notificações ativadas!');
    }
  };

  const showLocalNotification = (title: string, body: string, roomId?: string) => {
    // Only show if tab is not visible or user is in a different room
    const isDifferentRoom = roomId && activeRoom?.id !== roomId;
    
    if (Notification.permission === 'granted' && (document.hidden || isDifferentRoom)) {
      const notification = new Notification(title, {
        body,
        icon: 'https://ais-dev-p2c7bucgrxblynilly5nor-126434917976.us-east1.run.app/icon.png',
        tag: roomId // Group notifications by room
      });

      notification.onclick = () => {
        window.focus();
        if (roomId) {
          const room = rooms.find(r => r.id === roomId);
          if (room) setActiveRoom(room);
        }
        notification.close();
      };
    }

    // Also show a toast if the tab is visible but user is in a different room
    if (!document.hidden && isDifferentRoom) {
      toast(title, {
        description: body,
        action: {
          label: 'Ver',
          onClick: () => {
            const room = rooms.find(r => r.id === roomId);
            if (room) setActiveRoom(room);
          }
        }
      });
    }
  };

  const subscribeToAllRooms = () => {
    const channel = supabase
      .channel('global-chat-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_rooms' 
      }, () => {
        fetchRooms();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_participants',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchRooms();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  };

  useActiveRoomLifecycle({
    activeRoomId: activeRoom?.id || null,
    participants,
    userId,
    setInternalSearchQuery,
    setShowInternalSearch,
    fetchMessages: (roomId) => fetchMessages(roomId),
    fetchReactions: (roomId) => fetchReactions(roomId),
    fetchStarredMessages: () => fetchStarredMessages(),
    fetchPolls: (roomId) => fetchPolls(roomId),
    subscribeToMessages: (roomId) => subscribeToMessages(roomId),
    subscribeToReactions: (roomId) => subscribeToReactions(roomId),
    subscribeToPolls: (roomId) => subscribeToPolls(roomId),
    markAsRead: (roomId) => markAsRead(roomId),
    fetchOtherUserLastSeen: (otherId) => fetchOtherUserLastSeen(otherId),
  });

  const fetchOtherUserLastSeen = async (otherId: string) => {
    const { data, error } = await supabase
      .from('user_persona')
      .select('persona_data')
      .eq('id', otherId)
      .single();
    
    // Check if last_seen is inside persona_data or a separate column
    // For now we'll check if it's in the DB directly if we add the column
    const { data: rawData } = await supabase
      .from('user_persona')
      .select('*')
      .eq('id', otherId)
      .single();
    
    if (rawData && rawData.last_seen) {
      setOtherUserLastSeen(rawData.last_seen);
    }
  };

  const lastMessageId = useRef<string | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const isNewMessage = lastMsg.id !== lastMessageId.current;
      
      if (isInitialLoadMessages.current || (isNewMessage && lastMsg.sender_id === userId)) {
        scrollToBottom();
        isInitialLoadMessages.current = false;
      }
      
      lastMessageId.current = lastMsg.id;
    }
  }, [messages]);

  const fetchUserProfile = async () => {
    const { data, error } = await supabase
      .from('user_persona')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setUserProfile(data);
    }
  };

  const openUserProfile = async (targetUserId: string) => {
    if (!targetUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_persona')
        .select('*')
        .eq('id', targetUserId)
        .single();
      
      if (error) throw error;
      setShowUserProfileModal(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Erro ao carregar perfil');
    }
  };

  const updateProfile = async (newBio: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_persona')
        .update({ bio: newBio })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Perfil atualizado!');
      fetchUserProfile();
      setShowProfileSettings(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    }
  };

  const searchGlobalMessages = async (query: string) => {
    if (!query.trim() || !userId) {
      setGlobalSearchResults([]);
      return;
    }

    setSearchingGlobal(true);
    try {
      // Get all rooms where user is a participant
      const myRoomIds = rooms.map(r => r.id);

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .in('room_id', myRoomIds)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setGlobalSearchResults(data || []);
    } catch (error) {
      console.error('Error searching global messages:', error);
    } finally {
      setSearchingGlobal(false);
    }
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      // Get rooms where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('chat_participants')
        .select('room_id, is_pinned')
        .eq('user_id', userId);

      if (participantError) throw participantError;

      if (participantData && participantData.length > 0) {
        const roomIds = participantData.map(p => p.room_id);
        const pinnedIds = participantData.filter(p => p.is_pinned).map(p => p.room_id);
        setPinnedRooms(pinnedIds);

        const { data: roomData, error: roomError } = await supabase
          .from('chat_rooms')
          .select('*')
          .in('id', roomIds);

        if (roomError) throw roomError;

        // Sort rooms: pinned first, then by updated_at
        const sortedRooms = (roomData || []).sort((a, b) => {
          const aPinned = pinnedIds.includes(a.id);
          const bPinned = pinnedIds.includes(b.id);
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        setRooms(sortedRooms);

        // Fetch participants for these rooms
        const { data: allParticipants, error: pError } = await supabase
          .from('chat_participants')
          .select('*')
          .in('room_id', roomIds);

        if (!pError && allParticipants) {
          const grouped = allParticipants.reduce((acc: any, p) => {
            if (!acc[p.room_id]) acc[p.room_id] = [];
            acc[p.room_id].push(p);
            return acc;
          }, {});
          setParticipants(grouped);
        }
      }
    } catch (error: any) {
      console.error('Error fetching rooms:', error);
      toast.error(`Erro ao carregar conversas: ${error.message || 'Verifique o console'}`);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isPinned = pinnedRooms.includes(roomId);
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ is_pinned: !isPinned })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
      
      setPinnedRooms(
        isPinned ? pinnedRooms.filter(id => id !== roomId) : [...pinnedRooms, roomId]
      );
      
      // Re-sort rooms
      setRooms(prev => {
        const updatedPinned = isPinned ? pinnedRooms.filter(id => id !== roomId) : [...pinnedRooms, roomId];
        return [...prev].sort((a, b) => {
          const aPinned = updatedPinned.includes(a.id);
          const bPinned = updatedPinned.includes(b.id);
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      });

      toast.success(isPinned ? 'Conversa desfixada' : 'Conversa fixada');
    } catch (error: any) {
      toast.error('Erro ao fixar conversa');
    }
  };

  const toggleArchive = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isArchived = archivedRooms.includes(roomId);
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ is_archived: !isArchived })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
      
      setArchivedRooms(
        isArchived ? archivedRooms.filter(id => id !== roomId) : [...archivedRooms, roomId]
      );
      
      if (!isArchived && activeRoomId === roomId) {
        setActiveRoomId(null);
      }

      toast.success(isArchived ? 'Conversa desarquivada' : 'Conversa arquivada');
    } catch (error: any) {
      toast.error('Erro ao arquivar conversa');
    }
  };

  usePresenceHeartbeat(userId, userName);

  const fetchAvailableUsers = async () => {
    if (!userId) return;
    setLoadingUsers(true);
    try {
      let query = supabase
        .from('user_persona')
        .select('*')
        .neq('id', userId);
      
      if (userSearchQuery) {
        query = query.ilike('full_name', `%${userSearchQuery}%`);
      } else {
        query = query.order('full_name');
      }

      const { data, error } = await query;
      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar lista de contatos');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showNewChatModal) {
      fetchAvailableUsers();
    }
  }, [userSearchQuery, showNewChatModal]);

  const startDirectChat = async (targetUserId: string) => {
    if (!userId) return;
    
    try {
      // 1. Check if a direct chat already exists
      const { data: existingRooms, error: findError } = await supabase
        .rpc('find_direct_chat', { user1: userId, user2: targetUserId });

      if (findError) throw findError;

      if (existingRooms && existingRooms.length > 0) {
        const room = existingRooms[0];
        setActiveRoom(room);
        setShowNewChatModal(false);
        return;
      }

      // 2. Create new room if not exists
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({ is_group: false })
        .select()
        .single();

      if (roomError) throw roomError;

      // 3. Add participants
      const { error: partError } = await supabase
        .from('chat_participants')
        .insert([
          { room_id: newRoom.id, user_id: userId },
          { room_id: newRoom.id, user_id: targetUserId }
        ]);

      if (partError) throw partError;

      setActiveRoom(newRoom);
      setShowNewChatModal(false);
      fetchRooms(); // Refresh sidebar
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Erro ao iniciar conversa');
    }
  };

  const fetchMessages = async (roomId: string, loadMore = false) => {
    if (loadMore) setIsLoadingMore(true);
    const currentPage = loadMore ? page : 0;
    const start = currentPage * MESSAGES_PER_PAGE;
    const end = start + MESSAGES_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .range(start, end);
    
    if (error) {
      console.error('Error fetching messages:', error);
      setIsLoadingMore(false);
      return;
    }

    const fetchedMessages = [...data].reverse();
    
    if (loadMore) {
      setMessages(prev => [...fetchedMessages, ...prev]);
      setPage(prev => prev + 1);
    } else {
      setMessages(fetchedMessages);
      setPage(1);
      isInitialLoadMessages.current = true;
    }

    setHasMoreMessages(data.length === MESSAGES_PER_PAGE);
    setIsLoadingMore(false);
  };

  const [starredRoomIds, setStarredRoomIds] = useState<Set<string>>(new Set());

  const fetchStarredMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_favorites')
        .select('message_id, chat_messages(room_id)')
        .eq('user_id', userId);
      if (error) throw error;
      
      const msgIds = data.map(f => f.message_id);
      const roomIds = new Set(data.map(f => (f.chat_messages as any)?.room_id).filter(Boolean) as string[]);
      
      setStarredMessages(msgIds);
      setStarredRoomIds(roomIds);
    } catch (error: any) {
      console.error('Erro ao buscar favoritos:', error);
    }
  };

  const toggleStarMessage = async (messageId: string) => {
    const isStarred = starredMessages.includes(messageId);
    try {
      if (isStarred) {
        await supabase
          .from('chat_favorites')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId);
        setStarredMessages(prev => prev.filter(id => id !== messageId));
        toast.success('Removido dos favoritos');
      } else {
        await supabase
          .from('chat_favorites')
          .insert({ message_id: messageId, user_id: userId });
        setStarredMessages(prev => [...prev, messageId]);
        toast.success('Adicionado aos favoritos');
      }
      fetchStarredMessages();
    } catch (error: any) {
      toast.error('Erro ao favoritar mensagem');
    }
  };

  const muteChat = async (roomId: string, duration: '8h' | '1w' | 'forever' | null) => {
    let mutedUntil: string | null = null;
    if (duration === '8h') {
      mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    } else if (duration === '1w') {
      mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (duration === 'forever') {
      mutedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ muted_until: mutedUntil })
        .eq('room_id', roomId)
        .eq('user_id', userId);
      if (error) throw error;
      toast.success(duration ? `Silenciado por ${duration}` : 'Notificações ativadas');
      fetchRooms();
    } catch (error: any) {
      toast.error('Erro ao silenciar conversa');
    }
  };

  const fetchPolls = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_polls')
        .select('*, chat_messages!inner(room_id), chat_poll_votes(*)')
        .eq('chat_messages.room_id', roomId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      const pollMap: Record<string, any> = {};
      data.forEach(poll => {
        const votes: Record<number, string[]> = {};
        poll.options.forEach((_: any, idx: number) => {
          votes[idx] = poll.chat_poll_votes
            .filter((v: any) => v.option_index === idx)
            .map((v: any) => v.user_id);
        });
        pollMap[poll.message_id] = { ...poll, votes };
      });
      setPolls(pollMap);
    } catch (error: any) {
      console.error('Erro ao buscar enquetes:', error);
    }
  };

  const subscribeToPolls = (roomId: string) => {
    const channel = supabase
      .channel(`polls:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_poll_votes' }, () => {
        fetchPolls(roomId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_polls' }, () => {
        fetchPolls(roomId);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar stories:', error);
    }
  };

  const subscribeToStories = () => {
    const channel = supabase
      .channel('chat_stories_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_stories' }, () => {
        fetchStories();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  const createStory = async () => {
    if (!newStoryContent.trim()) return;
    try {
      const { error } = await supabase
        .from('chat_stories')
        .insert({
          user_id: userId,
          user_name: userName,
          user_avatar: userProfile?.avatar_url || null,
          content: newStoryContent.trim(),
          type: 'text'
        });

      if (error) throw error;
      setNewStoryContent('');
      setShowCreateStoryModal(false);
      toast.success('Status publicado!');
      fetchStories();
    } catch (error: any) {
      toast.error('Erro ao publicar status');
    }
  };

  const updateChatCategory = async (roomId: string, category: 'Estudos' | 'Estágio' | 'Social' | 'Privadas') => {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ category })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(`Conversa movida para ${category}`);
      fetchRooms();
    } catch (error: any) {
      toast.error('Erro ao categorizar conversa');
    }
  };

  const shareProfile = async (targetUserId: string) => {
    if (!activeRoom) return;
    try {
      const { data: targetProfile, error: profileError } = await supabase
        .from('user_persona')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profileError) throw profileError;

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeRoom.id,
          sender_id: userId,
          sender_name: userName,
          content: `Compartilhou o contato de ${targetProfile.full_name || 'Colega'}`,
          shared_profile_id: targetUserId,
          status: 'sent'
        });

      if (error) throw error;
      setShowShareProfileModal(false);
      toast.success('Contato compartilhado!');
    } catch (error: any) {
      toast.error('Erro ao compartilhar contato');
    }
  };

  const createPoll = async () => {
    if (!activeRoom || !pollQuestion || pollOptions.filter(o => o.trim()).length < 2) {
      toast.error('Preencha a pergunta e pelo menos 2 opções');
      return;
    }

    try {
      // 1. Create message
      const { data: msgData, error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeRoom.id,
          sender_id: userId,
          sender_name: userName,
          content: `📊 ENQUETE: ${pollQuestion}`,
          status: 'sent'
        })
        .select()
        .single();
      
      if (msgError) throw msgError;

      // 2. Create poll
      const { error: pollError } = await supabase
        .from('chat_polls')
        .insert({
          message_id: msgData.id,
          question: pollQuestion,
          options: pollOptions.filter(o => o.trim())
        });
      
      if (pollError) throw pollError;

      toast.success('Enquete criada!');
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
    } catch (error: any) {
      toast.error('Erro ao criar enquete');
    }
  };

  const votePoll = async (pollId: string, optionIndex: number) => {
    try {
      const { error } = await supabase
        .from('chat_poll_votes')
        .upsert({
          poll_id: pollId,
          user_id: userId,
          option_index: optionIndex
        }, { onConflict: 'poll_id,user_id' });
      
      if (error) throw error;
    } catch (error: any) {
      toast.error('Erro ao votar');
    }
  };
  const fetchReactions = async (roomId: string) => {
    const { data: messageIds } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('room_id', roomId);
    
    if (messageIds && messageIds.length > 0) {
      const ids = messageIds.map(m => m.id);
      const { data, error } = await supabase
        .from('chat_reactions')
        .select('*')
        .in('message_id', ids);
      
      if (!error && data) {
        const grouped = data.reduce((acc: any, r) => {
          if (!acc[r.message_id]) acc[r.message_id] = [];
          acc[r.message_id].push(r);
          return acc;
        }, {});
        setMessageReactions(grouped);
      }
    }
  };

  const subscribeToReactions = (roomId: string) => {
    const channel = supabase
      .channel(`reactions:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_reactions'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newReaction = payload.new;
          setMessageReactions(prev => {
            const current = prev[newReaction.message_id] || [];
            if (current.some(r => r.id === newReaction.id)) return prev;
            return { ...prev, [newReaction.message_id]: [...current, newReaction] };
          });
        } else if (payload.eventType === 'DELETE') {
          const oldReaction = payload.old;
          setMessageReactions(prev => {
            const newMessageReactions = { ...prev };
            for (const msgId in newMessageReactions) {
              newMessageReactions[msgId] = newMessageReactions[msgId].filter(r => r.id !== oldReaction.id);
            }
            return newMessageReactions;
          });
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addReaction = async (messageId: string, emoji: string) => {
    const { error } = await supabase
      .from('chat_reactions')
      .insert([{ message_id: messageId, user_id: userId, emoji }]);
    
    if (error) {
      if (error.code === '23505') {
        removeReaction(messageId, emoji);
      } else {
        toast.error('Erro ao adicionar reação');
      }
    }
    setShowReactionPicker(null);
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    const { error } = await supabase
      .from('chat_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    
    if (error) toast.error('Erro ao remover reação');
  };

  const forwardMessage = async (targetRoomId: string) => {
    if (!forwardingMessage) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          room_id: targetRoomId,
          sender_id: userId,
          sender_name: userName,
          content: forwardingMessage.content,
          attachment_url: forwardingMessage.attachment_url,
          attachment_name: forwardingMessage.attachment_name,
          attachment_type: forwardingMessage.attachment_type,
          is_forwarded: true,
          forwarded_from_name: forwardingMessage.sender_name
        }]);

      if (error) throw error;
      toast.success('Mensagem encaminhada');
      setShowForwardModal(false);
      setForwardingMessage(null);
    } catch (error) {
      toast.error('Erro ao encaminhar mensagem');
    }
  };

  const subscribeToMessages = (roomId: string) => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, async (payload) => {
        const newMsg = payload.new as ChatMessage;
        addMessage(roomId, newMsg);
        
        if (newMsg.sender_id !== userId) {
          // Mark as delivered if we received it
          if (newMsg.status === 'sent') {
            await supabase
              .from('chat_messages')
              .update({ status: 'delivered' })
              .eq('id', newMsg.id);
          }
          
          markAsRead(roomId);
          showLocalNotification(newMsg.sender_name || 'Nova mensagem', newMsg.content, roomId);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        updateMessage(roomId, payload.new as ChatMessage);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_participants',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setParticipants(prev => {
          const roomParticipants = prev[roomId] || [];
          const updated = roomParticipants.map(p => p.user_id === payload.new.user_id ? payload.new as ChatParticipant : p);
          return { ...prev, [roomId]: updated };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Visualizer setup
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          const y = (canvas.height / 2) - (barHeight / 2);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          
          x += barWidth + 1;
        }
        
        ctx.strokeStyle = `rgb(59, 130, 246)`; // blue-500
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Mirror the wave
        x = 0;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          const y = (canvas.height / 2) + (barHeight / 2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += barWidth + 1;
        }
        ctx.stroke();
      };
      draw();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Erro ao acessar microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      setAudioUrl(null);
      audioChunksRef.current = [];
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const sendAudioMessage = async () => {
    if (!audioUrl || !activeRoom) return;

    setUploading(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const fileName = `audio_${Date.now()}.webm`;
      const filePath = `${userId}/${activeRoom.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(filePath);

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert([{
          room_id: activeRoom.id,
          sender_id: userId,
          sender_name: userName,
          content: 'Mensagem de voz',
          attachment_url: publicUrl,
          attachment_name: 'audio_message.webm',
          attachment_type: 'audio',
          status: 'sent',
          is_vanish: isVanishMode,
          expires_at: isVanishMode ? new Date(Date.now() + 60000).toISOString() : null
        }]);

      if (msgError) throw msgError;

      setAudioUrl(null);
      audioChunksRef.current = [];
    } catch (error: any) {
      console.error('Error sending audio:', error);
      toast.error('Erro ao enviar áudio');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateLinkPreview = async (url: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Extraia metadados para este link: ${url}. Retorne um JSON com title, description e image (URL da imagem). Se for um site jurídico brasileiro (STF, Jusbrasil, etc), forneça uma descrição técnica e formal.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              image: { type: Type.STRING }
            },
            required: ["title", "description"]
          }
        }
      });
      
      const metadata = JSON.parse(response.text || '{}');
      metadata.url = url;
      
      // Special handling for YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
        if (videoId) {
          metadata.image = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      }
      
      return metadata;
    } catch (error) {
      console.error('Erro ao gerar preview do link:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRoom) return;

    const messageContent = newMessage.trim();
    
    // Detect URL for preview
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = messageContent.match(urlRegex);
    let linkPreview = null;
    if (urls && urls.length > 0) {
      linkPreview = await generateLinkPreview(urls[0]);
    }
    
    if (editingMessage) {
      try {
        const { error } = await supabase
          .from('chat_messages')
          .update({ 
            content: messageContent,
            link_preview: linkPreview
          })
          .eq('id', editingMessage.id);
        
        if (error) throw error;
        setEditingMessage(null);
        setNewMessage('');
        return;
      } catch (error) {
        console.error('Error editing message:', error);
        toast.error('Erro ao editar mensagem');
        return;
      }
    }

    // OPTIMISTIC UPDATE
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      room_id: activeRoom.id,
      sender_id: userId,
      sender_name: userName,
      content: messageContent,
      message_type: 'text',
      status: 'sending' as any,
      created_at: new Date().toISOString(),
      reply_to_id: replyingTo?.id || null,
      reply_to_content: replyingTo?.content || null,
      reply_to_sender_name: replyingTo?.sender_name || null,
      link_preview: linkPreview,
      is_vanish: isVanishMode,
      expires_at: isVanishMode ? new Date(Date.now() + 60000).toISOString() : null
    } as any;

    addMessage(activeRoom.id, optimisticMsg);
    setNewMessage('');
    const currentReply = replyingTo;
    setReplyingTo(null);

    try {
      const { data: insertedMsg, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeRoom.id,
          sender_id: userId,
          sender_name: userName,
          content: messageContent,
          message_type: 'text',
          status: 'sent',
          reply_to_id: currentReply?.id || null,
          reply_to_content: currentReply?.content || null,
          reply_to_sender_name: currentReply?.sender_name || null,
          link_preview: linkPreview,
          is_vanish: isVanishMode,
          expires_at: isVanishMode ? new Date(Date.now() + 60000).toISOString() : null
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      removeMessage(activeRoom.id, tempId);
      if (insertedMsg) {
        addMessage(activeRoom.id, insertedMsg as ChatMessage);
      }

      // Update room last message
      await supabase
        .from('chat_rooms')
        .update({ 
          last_message: messageContent, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', activeRoom.id);

      // Increment unread count for other participants
      const otherParticipants = participants[activeRoom.id]?.filter(p => p.user_id !== userId) || [];
      for (const p of otherParticipants) {
        await supabase.rpc('increment_unread_count', { 
          p_room_id: activeRoom.id, 
          p_user_id: p.user_id 
        });
      }

    } catch (error) {
      // Rollback optimistic update
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const setupPeerConnection = async (stream: MediaStream, callId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        supabase
          .from('chat_calls')
          .update({
            signaling_data: {
              type: 'candidate',
              candidate: event.candidate,
              from: userId
            }
          })
          .eq('id', callId)
          .then();
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    peerConnectionRef.current = pc;

    return pc;
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!activeRoom || !userId) return;

    const receiverId = participants[activeRoom.id]?.find(p => p.user_id !== userId)?.user_id;
    if (!receiverId) {
      toast.error('Nenhum participante encontrado para a chamada');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const { data: call, error } = await supabase
        .from('chat_calls')
        .insert([{
          room_id: activeRoom.id,
          caller_id: userId,
          receiver_id: receiverId,
          type,
          status: 'ringing'
        }])
        .select()
        .single();

      if (error) throw error;
      setActiveCall(call);
      setShowCallModal(true);
      setCallStatus('calling');

      const pc = await setupPeerConnection(stream, call.id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase
        .from('chat_calls')
        .update({
          signaling_data: { type: 'offer', sdp: offer, from: userId }
        })
        .eq('id', call.id);

    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Erro ao iniciar chamada');
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !userId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.type === 'video'
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      await supabase
        .from('chat_calls')
        .update({ status: 'ongoing' })
        .eq('id', incomingCall.id);

      const pc = await setupPeerConnection(stream, incomingCall.id);
      
      if (incomingCall.signaling_data?.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signaling_data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await supabase
          .from('chat_calls')
          .update({
            signaling_data: { type: 'answer', sdp: answer, from: userId }
          })
          .eq('id', incomingCall.id);
      }

      setActiveCall(incomingCall);
      setIncomingCall(null);
      setShowCallModal(true);
      setCallStatus('connected');
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Erro ao aceitar chamada');
    }
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    await supabase
      .from('chat_calls')
      .update({ status: 'ended' })
      .eq('id', incomingCall.id);
    setIncomingCall(null);
  };

  const endCall = async () => {
    const callId = activeCall?.id || incomingCall?.id;
    if (callId) {
      await supabase
        .from('chat_calls')
        .update({ status: 'ended' })
        .eq('id', callId);
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setActiveCall(null);
    setIncomingCall(null);
    setShowCallModal(false);
    setCallStatus('idle');
    setRemoteStream(null);
  };

  // Listen for calls
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('chat_calls')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_calls'
      }, async (payload) => {
        const call = payload.new as any;
        
        // Handle incoming call for me
        if (payload.eventType === 'INSERT' && call.receiver_id === userId && call.status === 'ringing') {
          // Fetch caller profile
          const { data: callerProfile } = await supabase
            .from('user_persona')
            .select('nome, avatar_url')
            .eq('id', call.caller_id)
            .single();
          
          setIncomingCall({ ...call, caller_name: callerProfile?.nome || 'Colega', caller_avatar: callerProfile?.avatar_url });
        } 
        
        // Handle updates for calls I'm part of
        if (payload.eventType === 'UPDATE' && (call.caller_id === userId || call.receiver_id === userId)) {
          if (call.status === 'ended') {
            endCall();
          } else if (call.status === 'ongoing' && call.caller_id === userId) {
            setCallStatus('connected');
          }
          
          if (call.signaling_data && call.signaling_data.from !== userId) {
            const pc = peerConnectionRef.current;
            if (pc) {
              if (call.signaling_data.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(call.signaling_data.sdp));
              } else if (call.signaling_data.type === 'candidate') {
                await pc.addIceCandidate(new RTCIceCandidate(call.signaling_data.candidate));
              }
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          is_deleted: true,
          content: 'Mensagem apagada'
        })
        .eq('id', msgId)
        .eq('sender_id', userId);
      
      if (error) throw error;
      toast.success('Mensagem apagada');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erro ao apagar mensagem');
    }
  };

  const startEditing = (msg: ChatMessage) => {
    setEditingMessage(msg);
    setNewMessage(msg.content);
    setReplyingTo(null);
    setShowMsgOptions(null);
  };

  const startReplying = (msg: ChatMessage) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    setShowMsgOptions(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUsers = async () => {
    try {
      // Get accepted friendships
      const { data: friendships, error: fError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');
      
      if (fError) throw fError;

      const friendIds = friendships.map(f => f.user_id === userId ? f.friend_id : f.user_id);
      
      if (friendIds.length === 0) {
        setAllUsers([]);
        return;
      }

      // Get profiles for these friends
      const { data, error } = await supabase
        .from('user_persona')
        .select('id, persona_data')
        .in('id', friendIds);
      
      if (!error) {
        setAllUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching friends for chat:', error);
      toast.error('Erro ao carregar lista de amigos');
    }
  };

  const startNewChat = async (targetUser: any) => {
    try {
      // Check if room already exists
      const { data: existingRooms, error: checkError } = await supabase.rpc('find_common_room', {
        user1: userId,
        user2: targetUser.id
      });

      if (checkError) {
        console.warn('RPC find_common_room failed, proceeding to check rooms manually or create new one', checkError);
      }

      if (existingRooms && existingRooms.length > 0) {
        const roomId = existingRooms[0].room_id;
        const existingRoom = rooms.find(r => r.id === roomId);
        
        if (existingRoom) {
          setActiveRoom(existingRoom);
          setShowNewChatModal(false);
          return;
        } else {
          // Room exists in DB but not in local state, fetch it
          const { data: fetchedRoom, error: fetchError } = await supabase
            .from('chat_rooms')
            .select('*')
            .eq('id', roomId)
            .single();
          
          if (!fetchError && fetchedRoom) {
            setRooms(prev => [fetchedRoom, ...prev]);
            setActiveRoom(fetchedRoom);
            setShowNewChatModal(false);
            // Fetch participants for this room specifically
            const { data: pData } = await supabase
              .from('chat_participants')
              .select('*')
              .eq('room_id', roomId);
            
            if (pData) {
              setParticipants(prev => ({ ...prev, [roomId]: pData }));
            }
            return;
          }
        }
      }

      // Create new room
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({ is_group: false })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add participants
      const { error: pError } = await supabase.from('chat_participants').insert([
        { room_id: newRoom.id, user_id: userId, user_name: userName },
        { room_id: newRoom.id, user_id: targetUser.id, user_name: targetUser.persona_data?.nome || 'Usuário' }
      ]);

      if (pError) throw pError;

      setRooms(prev => [newRoom, ...prev]);
      setActiveRoom(newRoom);
      setShowNewChatModal(false);
      fetchRooms();
    } catch (error: any) {
      console.error('Error starting chat:', error);
      toast.error(`Erro ao iniciar conversa: ${error.message || 'Verifique as tabelas do Supabase'}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;

    setUploading(true);
    setUploadProgress(0);

    // Optimistic message for file
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      room_id: activeRoom.id,
      sender_id: userId,
      sender_name: userName,
      content: `Enviando arquivo: ${file.name}`,
      attachment_name: file.name,
      attachment_type: file.type,
      message_type: 'file',
      status: 'sending' as any,
      created_at: new Date().toISOString(),
    } as any;

    addMessage(activeRoom.id, optimisticMsg);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat/${activeRoom.id}/${fileName}`;

      // Simulate progress since Supabase standard upload doesn't provide it easily
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(filePath);

      const { data: insertedMsg, error: insertError } = await supabase.from('chat_messages').insert({
        room_id: activeRoom.id,
        sender_id: userId,
        sender_name: userName,
        content: `Enviou um arquivo: ${file.name}`,
        attachment_url: publicUrl,
        attachment_name: file.name,
        attachment_type: file.type,
        status: 'sent'
      }).select().single();

      if (insertError) throw insertError;

      // Replace optimistic message
      removeMessage(activeRoom.id, tempId);
      if (insertedMsg) {
        addMessage(activeRoom.id, insertedMsg as ChatMessage);
      }

      // Update room last message
      await supabase
        .from('chat_rooms')
        .update({ 
          last_message: `Arquivo: ${file.name}`, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', activeRoom.id);

      toast.success('Arquivo enviado!');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      removeMessage(activeRoom.id, tempId);
      toast.error(`Erro ao enviar arquivo: ${error.message || 'Verifique as permissões de Storage'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };


  const updateGroupInfo = async () => {
    if (!activeRoom || !activeRoom.is_group) return;
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ 
          name: editingGroupName, 
          avatar_url: editingGroupAvatar,
          updated_at: new Date().toISOString() 
        })
        .eq('id', activeRoom.id);
      
      if (error) throw error;
      toast.success('Grupo atualizado!');
      setActiveRoom({ ...activeRoom, name: editingGroupName, avatar_url: editingGroupAvatar });
      fetchRooms();
    } catch (error: any) {
      toast.error('Erro ao atualizar grupo');
    }
  };

  const leaveGroup = async () => {
    if (!activeRoom || !userId) return;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('room_id', activeRoom.id)
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('Você saiu do grupo');
      setActiveRoom(null);
      setShowGroupInfoModal(false);
      fetchRooms();
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Erro ao sair do grupo');
    }
  };

  const deleteGroup = async () => {
    if (!activeRoom || activeRoom.created_by !== userId) return;

    if (!confirm('Tem certeza que deseja excluir este grupo permanentemente?')) return;

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', activeRoom.id);

      if (error) throw error;

      toast.success('Grupo excluído com sucesso');
      setActiveRoom(null);
      setShowGroupInfoModal(false);
      fetchRooms();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Erro ao excluir grupo');
    }
  };

  const removeParticipant = async (pUserId: string) => {
    if (!activeRoom) return;
    try {
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('room_id', activeRoom.id)
        .eq('user_id', pUserId);
      
      if (error) throw error;
      toast.success('Participante removido');
      setParticipants(prev => ({
        ...prev,
        [activeRoom.id]: prev[activeRoom.id].filter(p => p.user_id !== pUserId)
      }));
    } catch (error: any) {
      toast.error('Erro ao remover participante');
    }
  };

  const addParticipant = async (targetUser: any) => {
    if (!activeRoom) return;
    try {
      const { error } = await supabase
        .from('chat_participants')
        .insert({
          room_id: activeRoom.id,
          user_id: targetUser.id,
          user_name: targetUser.persona_data?.nome || 'Usuário'
        });
      
      if (error) throw error;
      toast.success('Participante adicionado');
      fetchRooms(); // To refresh participant list
    } catch (error: any) {
      toast.error('Erro ao adicionar participante');
    }
  };


  return (
    <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-[#0a0a0a] md:rounded-[2rem] border-0 md:border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl relative">
      
      {/* SIDEBAR */}
      <ChatSidebar
        rooms={rooms}
        activeRoom={activeRoom}
        setActiveRoom={setActiveRoom}
        participants={participants}
        userId={userId}
        userName={userName}
        userPresence={userPresence}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        stories={stories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        showStarredOnly={showStarredOnly}
        setShowStarredOnly={setShowStarredOnly}
        notificationPermission={notificationPermission}
        requestNotificationPermission={requestNotificationPermission}
        fetchAvailableUsers={fetchAvailableUsers}
        setShowNewChatModal={setShowNewChatModal}
        setShowProfileSettings={setShowProfileSettings}
        setShowGlobalSearch={setShowGlobalSearch}
        togglePin={togglePin}
        pinnedRooms={pinnedRooms}
        archivedRooms={archivedRooms}
        toggleArchive={toggleArchive}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        starredRoomIds={starredRoomIds}
        callHistory={callHistory}
        startCall={startCall}
        onNavigate={onNavigate}
        loading={loading}
        userProfile={userProfile}
        setActiveStory={setActiveStory}
        setShowStoryModal={setShowStoryModal}
        setShowCreateStoryModal={setShowCreateStoryModal}
        getChatName={getChatName}
        getChatAvatar={getChatAvatar}
      />

      {/* MEDIA GALLERY OVERLAY */}
      {showMediaGallery && activeRoom && (
        <MediaGallery 
          room={activeRoom} 
          onClose={() => setShowMediaGallery(false)} 
        />
      )}

      {/* CHAT AREA */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] ${activeRoom ? 'flex' : 'hidden md:flex'}`}>
        {activeRoom ? (
          <>
            {/* CHAT HEADER */}
            <div className="p-3 md:p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#1a1a1a]">
              <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                <button onClick={() => setActiveRoom(null)} className="md:hidden p-2 -ml-2 text-slate-500">
                  <ChevronLeft size={24} />
                </button>
                <div 
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden cursor-pointer shrink-0 border-2 border-transparent hover:border-blue-500 transition-all"
                  onClick={() => {
                    if (activeRoom.is_group) {
                      setEditingGroupName(activeRoom.name || '');
                      setEditingGroupAvatar(activeRoom.avatar_url || '');
                      setShowGroupInfoModal(true);
                    } else {
                      const otherId = participants[activeRoom.id]?.find(p => p.user_id !== userId)?.user_id;
                      if (otherId) openUserProfile(otherId);
                    }
                  }}
                >
                  {getChatAvatar(activeRoom) ? (
                    <img src={getChatAvatar(activeRoom)} alt={getChatName(activeRoom)} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-slate-400" size={20} />
                  )}
                </div>
                <div 
                  className="flex flex-col min-w-0 cursor-pointer"
                  onClick={() => {
                    if (activeRoom.is_group) {
                      setEditingGroupName(activeRoom.name || '');
                      setEditingGroupAvatar(activeRoom.avatar_url || '');
                      setShowGroupInfoModal(true);
                    } else {
                      const otherId = participants[activeRoom.id]?.find(p => p.user_id !== userId)?.user_id;
                      if (otherId) openUserProfile(otherId);
                    }
                  }}
                >
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xs md:text-sm truncate">
                    {getChatName(activeRoom)}
                  </h3>
                  <p className="text-[9px] md:text-[10px] text-blue-500 font-black uppercase tracking-widest truncate">
                    {getTypingUsers(activeRoom.id).length > 0 ? (
                      <span className="text-blue-500 italic">
                        {getTypingUsers(activeRoom.id).join(', ')} {getTypingUsers(activeRoom.id).length > 1 ? 'estão digitando...' : 'está digitando...'}
                      </span>
                    ) : (
                      (() => {
                        const otherId = participants[activeRoom.id]?.find(p => p.user_id !== userId)?.user_id;
                        if (!otherId) return 'Offline';
                        const presence = userPresence[otherId];
                        if (presence?.is_online) return 'Online';
                        if (presence?.last_seen) {
                          const date = new Date(presence.last_seen);
                          const now = new Date();
                          const isToday = date.toDateString() === now.toDateString();
                          return `Visto ${isToday ? '' : 'em ' + date.toLocaleDateString()} às ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                        }
                        return 'Offline';
                      })()
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!activeRoom.is_group && (
                  <>
                    <button 
                      onClick={() => startCall('audio')}
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all"
                      title="Chamada de Áudio"
                    >
                      <Phone size={20} />
                    </button>
                    <button 
                      onClick={() => startCall('video')}
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all"
                      title="Chamada de Vídeo"
                    >
                      <Video size={20} />
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setShowInternalSearch(!showInternalSearch)}
                  className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors ${showInternalSearch ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-400'}`}
                  title="Buscar na conversa"
                >
                  <Search size={20} />
                </button>

                <button 
                  onClick={() => setShowStarredOnly(!showStarredOnly)}
                  className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors ${showStarredOnly ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'text-slate-400'}`}
                  title="Mensagens Favoritas"
                >
                  <Star size={20} fill={showStarredOnly ? "currentColor" : "none"} />
                </button>

                {/* POLL BUTTON */}
                {activeRoom.is_group && (
                  <button 
                    onClick={() => setShowPollModal(true)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
                    title="Criar Enquete"
                  >
                    <BarChart2 size={20} />
                  </button>
                )}

                {/* MEDIA GALLERY BUTTON */}
                <button 
                  onClick={() => setShowMediaGallery(true)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
                  title="Galeria de Mídia"
                >
                  <LayoutGrid size={20} />
                </button>

                {/* MUTE BUTTON */}
                <div className="relative group/mute">
                  <button 
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors ${participants[activeRoom.id]?.find(p => p.user_id === userId)?.muted_until ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-slate-400'}`}
                    title="Silenciar Notificações"
                  >
                    {participants[activeRoom.id]?.find(p => p.user_id === userId)?.muted_until ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 rounded-2xl shadow-2xl opacity-0 invisible group-hover/mute:opacity-100 group-hover/mute:visible transition-all z-50 overflow-hidden">
                    <div className="p-2">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest p-2">Silenciar por...</p>
                      {[
                        { label: '8 Horas', value: '8h' },
                        { label: '1 Semana', value: '1w' },
                        { label: 'Sempre', value: 'forever' },
                        { label: 'Desativar', value: null }
                      ].map(opt => (
                        <button
                          key={opt.label}
                          onClick={() => muteChat(activeRoom.id, opt.value as any)}
                          className="w-full text-left p-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowMediaGallery(true)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
                  title="Galeria de mídia"
                >
                  <ImageIcon size={20} />
                </button>
                <button 
                  onClick={() => setShowWallpaperModal(true)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
                  title="Papel de Parede"
                >
                  <Palette size={20} />
                </button>
                <button 
                  onClick={() => {
                    if (activeRoom.is_group) {
                      setEditingGroupName(activeRoom.name || '');
                      setEditingGroupAvatar(activeRoom.avatar_url || '');
                      setShowGroupInfoModal(true);
                    }
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* UPLOAD PROGRESS BAR */}
            {uploading && (
              <div className="h-1 bg-slate-100 dark:bg-white/5 z-50">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {/* INTERNAL SEARCH BAR */}
            <AnimatePresence>
              {showInternalSearch && (
                <motion.div 
                  key="internal-search"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-2 bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 flex items-center gap-2"
                >
                  <Search size={16} className="text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Buscar na conversa..."
                    value={internalSearchQuery}
                    onChange={(e) => setInternalSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200"
                    autoFocus
                  />
                  {internalSearchQuery && (
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                      {messages.filter(msg => msg.content.toLowerCase().includes(internalSearchQuery.toLowerCase())).length} resultados
                    </span>
                  )}
                  <button onClick={() => { setShowInternalSearch(false); setInternalSearchQuery(''); }} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full">
                    <X size={16} className="text-slate-500" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <MessageList
              messages={messages}
              userId={userId}
              userName={userName}
              activeRoom={activeRoom}
              roomSettings={roomSettings}
              hasMoreMessages={hasMoreMessages}
              isLoadingMore={isLoadingMore}
              fetchMessages={fetchMessages}
              internalSearchQuery={internalSearchQuery}
              showStarredOnly={showStarredOnly}
              starredMessages={starredMessages}
              messagesEndRef={messagesEndRef}
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
              typingUsers={getTypingUsers(activeRoom.id)}
              createTaskFromMessage={handleCreateTaskFromMessage}
            />

            {/* INPUT AREA */}
            <ChatInput
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleTyping={handleTyping}
              sendMessage={sendMessage}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              editingMessage={editingMessage}
              setEditingMessage={setEditingMessage}
              userName={userName}
              isRecording={isRecording}
              recordingTime={recordingTime}
              formatTime={formatTime}
              canvasRef={canvasRef}
              cancelRecording={cancelRecording}
              stopRecording={stopRecording}
              audioUrl={audioUrl}
              setAudioUrl={setAudioUrl}
              sendAudioMessage={sendAudioMessage}
              isVanishMode={isVanishMode}
              setIsVanishMode={setIsVanishMode}
              showGifPicker={showGifPicker}
              setShowGifPicker={setShowGifPicker}
              gifType={gifType}
              setGifType={setGifType}
              gifSearch={gifSearch}
              setGifSearch={setGifSearch}
              searchGifs={searchGifs}
              gifs={gifs}
              sendGif={sendGif}
              uploading={uploading}
              handleFileUpload={handleFileUpload}
              fetchUsers={fetchUsers}
              setShowShareProfileModal={setShowShareProfileModal}
              startRecording={startRecording}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6">
              <MessageSquare size={48} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Selecione uma conversa</h3>
            <p className="text-sm mt-2 max-w-xs">Escolha um contato na lista ao lado para começar a conversar ou inicie uma nova conversa.</p>
          </div>
        )}
      </div>

      <WallpaperModal
        show={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
        selectedColor={selectedColor}
        selectedWallpaper={selectedWallpaper}
        setSelectedColor={setSelectedColor}
        setSelectedWallpaper={setSelectedWallpaper}
        onRemove={() => {
          setSelectedColor(null);
          setSelectedWallpaper(null);
          if (activeRoom) updateWallpaper(activeRoom.id, null, null);
          setShowWallpaperModal(false);
        }}
        onApply={() => {
          if (activeRoom) updateWallpaper(activeRoom.id, selectedWallpaper, selectedColor);
          setShowWallpaperModal(false);
        }}
      />

        <MediaGalleryModal
          show={showMediaGallery}
          activeRoom={activeRoom}
          roomName={activeRoom ? getChatName(activeRoom) : ''}
          messages={messages}
          onClose={() => setShowMediaGallery(false)}
        />

      <GroupInfoModal
        show={showGroupInfoModal}
        onClose={() => setShowGroupInfoModal(false)}
        activeRoom={activeRoom}
        userId={userId}
        participants={participants}
        editingGroupName={editingGroupName}
        setEditingGroupName={setEditingGroupName}
        editingGroupAvatar={editingGroupAvatar}
        setEditingGroupAvatar={setEditingGroupAvatar}
        updateGroupInfo={updateGroupInfo}
        removeParticipant={removeParticipant}
        allUsers={allUsers}
        addParticipant={addParticipant}
        leaveGroup={leaveGroup}
        deleteGroup={deleteGroup}
        onNavigate={onNavigate}
      />

      <ForwardModal
        show={showForwardModal}
        forwardingMessage={forwardingMessage}
        rooms={rooms}
        getChatName={getChatName}
        getChatAvatar={getChatAvatar}
        forwardMessage={forwardMessage}
        onClose={() => {
          setShowForwardModal(false);
          setForwardingMessage(null);
        }}
      />
      <PollModal
        show={showPollModal}
        pollQuestion={pollQuestion}
        setPollQuestion={setPollQuestion}
        pollOptions={pollOptions}
        setPollOptions={setPollOptions}
        createPoll={createPoll}
        onClose={() => setShowPollModal(false)}
      />
      <CreateStoryModal
        show={showCreateStoryModal}
        content={newStoryContent}
        setContent={setNewStoryContent}
        onCreate={createStory}
        onClose={() => setShowCreateStoryModal(false)}
      />

      <ViewStoryModal
        show={showStoryModal}
        story={activeStory}
        onClose={() => setShowStoryModal(false)}
      />

      <ShareProfileModal
        show={showShareProfileModal}
        allUsers={allUsers}
        onClose={() => setShowShareProfileModal(false)}
        onShare={shareProfile}
      />
        <CallOverlay
          incomingCall={incomingCall}
          showCallModal={showCallModal}
          acceptCall={acceptCall}
          rejectCall={rejectCall}
          remoteStream={remoteStream}
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
          callStatus={callStatus}
          isVideoOff={isVideoOff}
          isMuted={isMuted}
          toggleMute={toggleMute}
          toggleVideo={toggleVideo}
          endCall={endCall}
          activeRoom={activeRoom}
        />

        <GlobalSearchModal
          show={showGlobalSearch}
          query={globalSearchQuery}
          setQuery={setGlobalSearchQuery}
          results={globalSearchResults}
          searching={searchingGlobal}
          rooms={rooms}
          onSearch={searchGlobalMessages}
          onClose={() => {
            setShowGlobalSearch(false);
            setGlobalSearchQuery('');
            setGlobalSearchResults([]);
          }}
          onSelectRoom={setActiveRoom}
          getChatName={getChatName}
        />

        <ProfileModals
          showProfileSettings={showProfileSettings}
          setShowProfileSettings={setShowProfileSettings}
          userProfile={userProfile}
          userName={userName}
          updateProfile={updateProfile}
          showUserProfileModal={showUserProfileModal}
          setShowUserProfileModal={setShowUserProfileModal}
          onStartAudioCall={() => startCall('audio')}
        />

        <UserDiscoveryModal
          show={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
          userSearchQuery={userSearchQuery}
          setUserSearchQuery={setUserSearchQuery}
          loadingUsers={loadingUsers}
          availableUsers={availableUsers}
          startDirectChat={startDirectChat}
        />
      </div>
    );
  };

export default Connect;
