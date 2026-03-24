
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Paperclip, Send, MoreVertical, 
  Check, CheckCheck, User, Image as ImageIcon, 
  FileText, X, ChevronLeft, Loader2, MessageSquare,
  Edit2, Trash2, Reply, CornerUpLeft, Mic, Pin, PinOff,
  Link, File, Play, Pause, Trash, Bell, BellOff,
  Smile, Forward, Star, BarChart2, VolumeX, Volume2,
  Clock, Share2, Folder, History, UserPlus, Phone, Video, PhoneOff, VideoOff, Ghost, Eye, EyeOff, MicOff, Palette, Users,
  Settings, LogOut, Shield, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import ChatSidebar from './chat/ChatSidebar';
import MessageList from './chat/MessageList';
import ChatInput from './chat/ChatInput';
import NewChatModal from './connect/NewChatModal';
import GroupInfoModal from './connect/GroupInfoModal';
import { ChatRoom, ChatMessage, ChatParticipant, UserProfile, PresenceUser, ChatStory } from '../types';
import { toast } from 'sonner';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';

interface ConnectProps {
  userId: string;
  userName: string;
  onNavigate?: (view: any, params?: any) => void;
}

const Connect: React.FC<ConnectProps> = ({ userId, userName, onNavigate }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Record<string, ChatParticipant[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userPresence, setUserPresence] = useState<Record<string, { online: boolean, last_seen: string }>>({});

  // Presence System
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presence: Record<string, { online: boolean, last_seen: string }> = {};
        
        Object.keys(state).forEach((key) => {
          presence[key] = {
            online: true,
            last_seen: new Date().toISOString()
          };
        });
        
        setUserPresence(prev => ({ ...prev, ...presence }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setUserPresence(prev => ({
          ...prev,
          [key]: { online: true, last_seen: new Date().toISOString() }
        }));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setUserPresence(prev => ({
          ...prev,
          [key]: { online: false, last_seen: new Date().toISOString() }
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: userId
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const markAsRead = async (roomId: string) => {
    if (!userId) return;
    try {
      await supabase.rpc('mark_messages_as_read', {
        p_room_id: roomId,
        p_user_id: userId
      });
      
      // Update local state
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

  useEffect(() => {
    if (activeRoom) {
      markAsRead(activeRoom.id);
    }
  }, [activeRoom]);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<Record<string, PresenceUser>>({});
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
  const [pinnedRooms, setPinnedRooms] = useState<string[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [messageReactions, setMessageReactions] = useState<Record<string, any[]>>({});
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isInitialLoad = useRef(true);
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
  const [viewMode, setViewMode] = useState<'chats' | 'calls'>('chats');
  const [callHistory, setCallHistory] = useState<any[]>([]);
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
  const typingTimeoutRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    
    // Register Service Worker for Push Notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('Service Worker registrado com sucesso:', reg);
      }).catch(err => {
        console.error('Erro ao registrar Service Worker:', err);
      });
    }

    fetchRooms();
    fetchUserProfile();
    fetchStarredMessages();
    fetchStories();
    fetchCallHistory();
    const unsubscribeRooms = subscribeToAllRooms();
    const unsubscribePresence = subscribeToPresence();
    const unsubscribeStories = subscribeToStories();
    const unsubscribeCalls = subscribeToCalls();
    return () => {
      if (unsubscribeRooms) unsubscribeRooms();
      if (unsubscribePresence) unsubscribePresence();
      if (unsubscribeStories) unsubscribeStories();
      if (unsubscribeCalls) unsubscribeCalls();
    };
  }, [userId]);

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

  const showLocalNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted' && document.hidden) {
      new Notification(title, {
        body,
        icon: 'https://ais-dev-p2c7bucgrxblynilly5nor-126434917976.us-east1.run.app/icon.png'
      });
    }
  };

  const subscribeToPresence = () => {
    const channel = supabase.channel('global_presence');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: Record<string, PresenceUser> = {};
        Object.keys(state).forEach((key) => {
          const userState = state[key][0] as any;
          if (userState.user_id) {
            users[userState.user_id] = userState;
          }
        });
        setPresenceUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // Handle join if needed
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Handle leave if needed
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  useEffect(() => {
    if (activeRoom) {
      setInternalSearchQuery('');
      setShowInternalSearch(false);
      fetchMessages(activeRoom.id);
      fetchReactions(activeRoom.id);
      fetchStarredMessages();
      fetchPolls(activeRoom.id);
      const unsubscribe = subscribeToMessages(activeRoom.id);
      const unsubscribeReactions = subscribeToReactions(activeRoom.id);
      const unsubscribePolls = subscribeToPolls(activeRoom.id);
      markAsRead(activeRoom.id);
      
      const otherId = participants[activeRoom.id]?.find(p => p.user_id !== userId)?.user_id;
      if (otherId) {
        fetchOtherUserLastSeen(otherId);
      }
      
      return () => {
        if (unsubscribe) unsubscribe();
        if (unsubscribeReactions) unsubscribeReactions();
        if (unsubscribePolls) unsubscribePolls();
      };
    }
  }, [activeRoom, participants]);

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
      
      if (isInitialLoad.current || (isNewMessage && lastMsg.sender_id === userId)) {
        scrollToBottom();
        isInitialLoad.current = false;
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
      
      setPinnedRooms(prev => 
        isPinned ? prev.filter(id => id !== roomId) : [...prev, roomId]
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
      isInitialLoad.current = true;
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
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_id !== userId) {
          markAsRead(roomId);
          showLocalNotification(newMsg.sender_name, newMsg.content);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as ChatMessage : m));
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
        .from('chat-attachments')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
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
        model: "gemini-3-flash-preview",
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

    setMessages(prev => [...prev, optimisticMsg]);
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
      if (insertedMsg) {
        setMessages(prev => prev.map(m => m.id === tempId ? insertedMsg : m));
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

  const handleTyping = () => {
    if (!activeRoom) return;
    
    if (!isTyping) {
      setIsTyping(true);
      supabase
        .from('chat_participants')
        .update({ is_typing: true })
        .eq('room_id', activeRoom.id)
        .eq('user_id', userId);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      supabase
        .from('chat_participants')
        .update({ is_typing: false })
        .eq('room_id', activeRoom.id)
        .eq('user_id', userId);
    }, 3000);
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
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat/${activeRoom.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, file);

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

      // Update local state immediately
      if (insertedMsg) {
        setMessages(prev => {
          if (prev.some(m => m.id === insertedMsg.id)) return prev;
          return [...prev, insertedMsg];
        });
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
      toast.error(`Erro ao enviar arquivo: ${error.message || 'Verifique as permissões de Storage'}`);
    } finally {
      setUploading(false);
    }
  };

  const getChatName = (room: ChatRoom) => {
    if (room.is_group) return room.name || 'Grupo';
    const otherParticipant = participants[room.id]?.find(p => p.user_id !== userId);
    return otherParticipant?.user_name || 'Conversa';
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

  const getChatAvatar = (room: ChatRoom) => {
    if (room.is_group) return room.avatar_url;
    const otherParticipant = participants[room.id]?.find(p => p.user_id !== userId);
    return otherParticipant?.user_avatar;
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = getChatName(room).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStarred = !showStarredOnly || starredRoomIds.has(room.id);
    const participant = participants[room.id]?.find(p => p.user_id === userId);
    const matchesCategory = activeCategory === 'Tudo' || participant?.category === activeCategory;
    return matchesSearch && matchesStarred && matchesCategory;
  });

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
                    {participants[activeRoom.id]?.find(p => p.user_id !== userId && p.is_typing) ? (
                      <span className="text-blue-500 italic">digitando...</span>
                    ) : (
                      (() => {
                        const otherId = participants[activeRoom.id]?.find(p => p.user_id !== userId)?.user_id;
                        if (!otherId) return 'Offline';
                        const presence = presenceUsers[otherId];
                        if (presence) return 'Online';
                        if (otherUserLastSeen) {
                          const date = new Date(otherUserLastSeen);
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

            {/* MESSAGES AREA */}
            <div 
              className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative"
              style={{
                backgroundColor: roomSettings[activeRoom.id]?.background_color || undefined,
                backgroundImage: roomSettings[activeRoom.id]?.wallpaper_url ? `url(${roomSettings[activeRoom.id].wallpaper_url})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundBlendMode: 'overlay'
              }}
            >
              {/* Overlay for better readability if wallpaper is set */}
              {roomSettings[activeRoom.id]?.wallpaper_url && (
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
                {messages
                  .filter(msg => {
                  const matchesSearch = !internalSearchQuery || msg.content.toLowerCase().includes(internalSearchQuery.toLowerCase());
                  const matchesStarred = showStarredOnly ? starredMessages.includes(msg.id) : true;
                  const isExpired = msg.is_vanish && msg.expires_at && new Date(msg.expires_at) < new Date();
                  return matchesSearch && matchesStarred && !isExpired;
                })
                .map((msg, idx) => {
                const isMe = msg.sender_id === userId;
                const isDeleted = msg.is_deleted;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative z-10`}>
                    <div className={`max-w-[70%] group relative ${isMe ? 'items-end' : 'items-start'}`}>
                      
                      {/* MESSAGE OPTIONS (HOVER) */}
                      {!isDeleted && (
                        <div className={`absolute top-0 ${isMe ? '-left-28' : '-right-28'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10 p-1 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-slate-200 dark:border-white/5`}>
                          <button onClick={() => toggleStarMessage(msg.id)} className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md ${starredMessages.includes(msg.id) ? 'text-yellow-500' : 'text-slate-500'}`} title="Favoritar">
                            <Star size={16} fill={starredMessages.includes(msg.id) ? "currentColor" : "none"} />
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
                              <Markdown>{msg.content}</Markdown>
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

                          {/* LINK PREVIEW RENDERING */}
                          {msg.content && msg.content.match(/https?:\/\/[^\s]+/) && (
                            (() => {
                              const url = msg.content.match(/https?:\/\/[^\s]+/)?.[0];
                              if (!url) return null;
                              
                              // Mock metadata for common legal sites
                              let title = "Visualizar Link";
                              let desc = url;
                              let domain = "Link Externo";
                              try { domain = new URL(url).hostname; } catch(e) {}

                              if (url.includes('stf.jus.br')) title = "STF - Supremo Tribunal Federal";
                              if (url.includes('jusbrasil.com.br')) title = "Jusbrasil - Consulta Processual";
                              if (url.includes('youtube.com') || url.includes('youtu.be')) title = "YouTube - Vídeo Jurídico";

                              return (
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`mt-3 block rounded-2xl border overflow-hidden transition-all group/link ${isMe ? 'bg-blue-700/50 border-blue-400' : 'bg-white dark:bg-black/20 border-slate-100 dark:border-white/5 hover:border-blue-300 dark:hover:border-white/20'}`}
                                >
                                  <div className="p-3">
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isMe ? 'text-blue-200' : 'text-blue-500'}`}>{domain}</p>
                                    <p className={`text-sm font-bold group-hover/link:text-blue-500 transition-colors line-clamp-1 ${isMe ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{title}</p>
                                    <p className={`text-xs line-clamp-2 mt-1 ${isMe ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>{desc}</p>
                                  </div>
                                </a>
                              );
                            })()
                          )}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                          {msg.is_vanish && <Ghost size={10} className="text-blue-400 animate-pulse" />}
                          {msg.is_edited && !isDeleted && <span className="text-[8px] uppercase font-bold mr-1">Editada</span>}
                          <span className="text-[9px]">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <span>
                              {msg.id.startsWith('temp-') ? (
                                <Clock size={12} className="text-blue-200 animate-pulse" />
                              ) : msg.status === 'read' ? (
                                <CheckCheck size={12} className="text-blue-400" />
                              ) : (
                                <Check size={12} className="text-blue-100" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* REACTION DISPLAY */}
                        {messageReactions[msg.id] && messageReactions[msg.id].length > 0 && !isDeleted && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(
                              messageReactions[msg.id].reduce((acc: any, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([emoji, count]: [string, any]) => (
                              <button 
                                key={emoji}
                                onClick={() => {
                                  const myReaction = messageReactions[msg.id].find(r => r.user_id === userId && r.emoji === emoji);
                                  if (myReaction) removeReaction(msg.id, emoji);
                                  else addReaction(msg.id, emoji);
                                }}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${
                                  messageReactions[msg.id].some(r => r.user_id === userId && r.emoji === emoji)
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
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

            {/* INPUT AREA */}
            <div className="p-3 md:p-4 bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-white/5">
              
              {/* REPLY/EDIT INDICATOR */}
              <AnimatePresence>
                {(replyingTo || editingMessage) && (
                  <motion.div 
                    key="reply-edit-indicator"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border-l-4 border-blue-500 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="text-blue-500">
                        {replyingTo ? <CornerUpLeft size={18} /> : <Edit2 size={18} />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                          {replyingTo ? `Respondendo a ${replyingTo.sender_name === userName ? 'você' : replyingTo.sender_name}` : 'Editando mensagem'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {replyingTo ? replyingTo.content : editingMessage?.content}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setReplyingTo(null); setEditingMessage(null); if(editingMessage) setNewMessage(''); }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                {isRecording ? (
                  <div className="flex-1 flex items-center gap-4 bg-red-50 dark:bg-red-500/10 p-3 rounded-2xl border border-red-200 dark:border-red-500/20">
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-500 font-black text-[10px] uppercase tracking-widest tabular-nums">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="flex-1 h-8 bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden">
                      <canvas ref={canvasRef} width={300} height={32} className="w-full h-full" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={cancelRecording} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all">
                        <Trash size={18} />
                      </button>
                      <button onClick={stopRecording} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-full transition-all">
                        <Pause size={18} />
                      </button>
                    </div>
                  </div>
                ) : audioUrl ? (
                  <div className="flex-1 flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 p-3 rounded-2xl border border-blue-200 dark:border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <Mic size={18} className="text-blue-500" />
                      <span className="text-blue-500 font-black text-xs uppercase tracking-widest">Áudio Gravado</span>
                      <audio src={audioUrl} controls className="h-8 max-w-[150px]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAudioUrl(null)} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all">
                        <X size={18} />
                      </button>
                      <button onClick={sendAudioMessage} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsVanishMode(!isVanishMode)}
                        className={`p-3 rounded-xl transition-all ${isVanishMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-indigo-500'}`}
                        title="Modo Vanish"
                      >
                        <Ghost size={20} />
                      </button>
                      <button 
                        onClick={() => {
                          setShowGifPicker(!showGifPicker);
                          if (!showGifPicker && gifs.length === 0) searchGifs('');
                        }}
                        className={`p-3 rounded-xl transition-all ${showGifPicker ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-600'}`}
                        title="GIFs"
                      >
                        <ImageIcon size={20} />
                      </button>
                      <div className="relative">
                        <input 
                          type="file" 
                          id="file-upload" 
                          className="hidden" 
                          onChange={handleFileUpload}
                        />
                        <label 
                          htmlFor="file-upload"
                          className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-600 rounded-xl cursor-pointer transition-all block"
                        >
                          {uploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
                        </label>
                      </div>
                      
                      <button 
                        onClick={() => { fetchUsers(); setShowShareProfileModal(true); }}
                        className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                        title="Compartilhar Perfil"
                      >
                        <UserPlus size={20} />
                      </button>
                    </div>
                    
                    <div className="flex-1 relative">
                      {/* GIF PICKER POPOVER */}
                      <AnimatePresence>
                        {showGifPicker && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-4 w-80 h-96 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl z-50 flex flex-col overflow-hidden"
                          >
                            <div className="p-4 border-b border-slate-100 dark:border-white/5">
                              <div className="flex gap-2 mb-3">
                                <button 
                                  onClick={() => setGifType('gifs')}
                                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${gifType === 'gifs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                >
                                  GIFs
                                </button>
                                <button 
                                  onClick={() => setGifType('stickers')}
                                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${gifType === 'stickers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                >
                                  Stickers
                                </button>
                              </div>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                  type="text"
                                  placeholder={`Buscar ${gifType === 'gifs' ? 'GIFs' : 'Stickers'}...`}
                                  value={gifSearch}
                                  onChange={(e) => {
                                    setGifSearch(e.target.value);
                                    searchGifs(e.target.value);
                                  }}
                                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl outline-none focus:border-blue-500 transition-all text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 custom-scrollbar">
                              {gifs.map(gif => (
                                <button 
                                  key={gif.id}
                                  onClick={() => sendGif(gif.images.fixed_height.url, gifType === 'gifs' ? 'gif' : 'sticker')}
                                  className="rounded-lg overflow-hidden hover:scale-105 transition-transform"
                                >
                                  <img src={gif.images.fixed_height.url} alt="Media" className="w-full h-24 object-cover" />
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <textarea 
                        value={newMessage}
                        onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Digite uma mensagem..."
                        className="w-full p-3 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm resize-none max-h-32 min-h-[48px]"
                        rows={1}
                      />
                    </div>

                    {newMessage.trim() ? (
                      <button 
                        onClick={sendMessage}
                        className="p-3 bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95"
                      >
                        <Send size={20} />
                      </button>
                    ) : (
                      <button 
                        onClick={startRecording}
                        className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                      >
                        <Mic size={20} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
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

      {/* WALLPAPER MODAL */}
      <AnimatePresence>
        {showWallpaperModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Papel de Parede</h3>
                <button onClick={() => setShowWallpaperModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* COLORS */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Cores Sólidas</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1',
                        '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7',
                        '#d1fae5', '#ccfbf1', '#e0f2fe', '#e0e7ff',
                        '#f5f3ff', '#fae8ff', '#fce7f3', '#fef2f2'
                      ].map(color => (
                        <button
                          key={color}
                          onClick={() => {
                            setSelectedColor(color);
                            setSelectedWallpaper(null);
                          }}
                          className={`w-full aspect-square rounded-xl border-2 transition-all ${selectedColor === color ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* IMAGES */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Imagens de Fundo</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=600&fit=crop',
                        'https://images.unsplash.com/photo-1511497584788-876760111969?w=400&h=600&fit=crop',
                        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=600&fit=crop',
                        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=600&fit=crop',
                        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=600&fit=crop',
                        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop'
                      ].map(url => (
                        <button
                          key={url}
                          onClick={() => {
                            setSelectedWallpaper(url);
                            setSelectedColor(null);
                          }}
                          className={`w-full aspect-[2/3] rounded-xl overflow-hidden border-2 transition-all ${selectedWallpaper === url ? 'border-blue-500 scale-105 shadow-lg' : 'border-transparent hover:scale-105'}`}
                        >
                          <img src={url} alt="Wallpaper" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-white/5 flex gap-3">
                <button 
                  onClick={() => {
                    setSelectedColor(null);
                    setSelectedWallpaper(null);
                    if (activeRoom) updateWallpaper(activeRoom.id, null, null);
                    setShowWallpaperModal(false);
                  }}
                  className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200"
                >
                  Remover
                </button>
                <button 
                  onClick={() => {
                    if (activeRoom) updateWallpaper(activeRoom.id, selectedWallpaper, selectedColor);
                    setShowWallpaperModal(false);
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                >
                  Aplicar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NewChatModal 
        show={showNewChatModal} 
        onClose={() => setShowNewChatModal(false)} 
        users={allUsers} 
        onStartChat={startNewChat} 
      />

        {/* MEDIA GALLERY MODAL */}
        <AnimatePresence>
          {showMediaGallery && activeRoom && (
            <motion.div 
              key="media-gallery-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-500">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Galeria da Conversa</h3>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{getChatName(activeRoom)}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowMediaGallery(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-3 gap-4">
                    {messages
                      .filter(m => m.attachment_url && !m.is_deleted)
                      .map(m => {
                        const isImage = m.attachment_type?.startsWith('image/');
                        const isAudio = m.attachment_type === 'audio';
                        
                        return (
                          <div key={m.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            {isImage ? (
                              <img src={m.attachment_url} alt={m.attachment_name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            ) : isAudio ? (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2 text-center">
                                <Mic size={24} className="text-blue-500" />
                                <span className="text-[8px] font-black uppercase tracking-widest truncate w-full">Áudio</span>
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2 text-center">
                                <FileText size={24} className="text-slate-400" />
                                <span className="text-[8px] font-black uppercase tracking-widest truncate w-full">{m.attachment_name}</span>
                              </div>
                            )}
                            <a 
                              href={m.attachment_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <div className="p-2 bg-white rounded-full text-slate-900">
                                <Plus size={16} />
                              </div>
                            </a>
                          </div>
                        );
                      })}
                    {messages.filter(m => m.attachment_url && !m.is_deleted).length === 0 && (
                      <div className="col-span-3 py-12 text-center opacity-40">
                        <ImageIcon size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">Nenhuma mídia encontrada</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GROUP INFO MODAL */}
      <AnimatePresence>
        {showGroupInfoModal && activeRoom && (
          <motion.div 
            key="group-info-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Info do Grupo</h3>
                <button onClick={() => setShowGroupInfoModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* EDIT GROUP INFO (IF CREATOR) */}
                {activeRoom.created_by === userId ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Nome do Grupo</label>
                      <input 
                        type="text"
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">URL do Avatar</label>
                      <input 
                        type="text"
                        value={editingGroupAvatar}
                        onChange={(e) => setEditingGroupAvatar(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button 
                      onClick={updateGroupInfo}
                      className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shadow-xl">
                      {activeRoom.avatar_url ? (
                        <img src={activeRoom.avatar_url} alt={activeRoom.name || ''} className="w-full h-full object-cover" />
                      ) : (
                        <User size={48} className="text-slate-400" />
                      )}
                    </div>
                    <h4 className="font-black text-xl uppercase tracking-tight">{activeRoom.name || 'Grupo'}</h4>
                  </div>
                )}

                {/* PARTICIPANTS LIST */}
                <div>
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Participantes ({participants[activeRoom.id]?.length || 0})</h5>
                  <div className="space-y-3">
                    {participants[activeRoom.id]?.map(p => (
                      <div key={p.user_id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden cursor-pointer"
                            onClick={() => {
                              if (onNavigate && p.user_id !== userId) {
                                setShowGroupInfoModal(false);
                                onNavigate('profile', { userId: p.user_id });
                              }
                            }}
                          >
                            {p.user_avatar ? (
                              <img src={p.user_avatar} alt={p.user_name} className="w-full h-full object-cover" />
                            ) : (
                              <User size={16} className="text-slate-400" />
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.user_name} {p.user_id === userId && '(Você)'}</span>
                        </div>
                        {activeRoom.created_by === userId && p.user_id !== userId && (
                          <button 
                            onClick={() => removeParticipant(p.user_id)}
                            className="p-1.5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ADD PARTICIPANT (IF CREATOR) */}
                {activeRoom.created_by === userId && (
                  <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Adicionar Amigo</h5>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                      {allUsers
                        .filter(u => !participants[activeRoom.id]?.some(p => p.user_id === u.id))
                        .map(user => (
                          <button
                            key={user.id}
                            onClick={() => addParticipant(user)}
                            className="w-full p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                                {user.persona_data?.avatar_url ? (
                                  <img src={user.persona_data.avatar_url} alt={user.persona_data.nome} className="w-full h-full object-cover" />
                                ) : (
                                  <User size={12} className="text-slate-400" />
                                )}
                              </div>
                              <span className="text-xs font-bold">{user.persona_data?.nome || 'Usuário'}</span>
                            </div>
                            <Plus size={14} className="text-blue-500" />
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="pt-6 border-t border-slate-200 dark:border-white/5 space-y-3">
                  <button 
                    onClick={leaveGroup}
                    className="w-full py-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut size={14} />
                    Sair do Grupo
                  </button>
                  {activeRoom.created_by === userId && (
                    <button 
                      onClick={deleteGroup}
                      className="w-full py-3 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} />
                      Excluir Grupo
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FORWARD MODAL */}
      <AnimatePresence>
        {showForwardModal && forwardingMessage && (
          <motion.div 
            key="forward-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-500">
                    <Forward size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Encaminhar Mensagem</h3>
                </div>
                <button onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-white/5 mx-6 mt-6 rounded-2xl border border-slate-200 dark:border-white/5">
                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Mensagem selecionada</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 truncate italic">"{forwardingMessage.content}"</p>
              </div>

              <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">Selecione uma conversa</p>
                <div className="space-y-2">
                  {rooms.map(room => (
                    <button
                      key={room.id}
                      onClick={() => forwardMessage(room.id)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-blue-500/30 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                        {getChatAvatar(room) ? (
                          <img src={getChatAvatar(room)} alt={getChatName(room)} className="w-full h-full object-cover" />
                        ) : (
                          <User className="text-slate-400" size={20} />
                        )}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{getChatName(room)}</p>
                      </div>
                      <div className="p-2 bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Send size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* POLL MODAL */}
      <AnimatePresence>
        {showPollModal && (
          <motion.div 
            key="poll-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/5"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <BarChart2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Criar Enquete</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Votação em grupo</p>
                  </div>
                </div>
                <button onClick={() => setShowPollModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Pergunta</label>
                  <input 
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="O que você quer perguntar?"
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Opções</label>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...pollOptions];
                          newOpts[idx] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                        placeholder={`Opção ${idx + 1}`}
                        className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      />
                      {pollOptions.length > 2 && (
                        <button 
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                          className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <button 
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all text-xs font-bold uppercase tracking-widest"
                    >
                      + Adicionar Opção
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                <button 
                  onClick={createPoll}
                  disabled={!pollQuestion || pollOptions.some(o => !o)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 transition-all active:scale-95"
                >
                  Criar Enquete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        {/* CREATE STORY MODAL */}
        <AnimatePresence>
          {showCreateStoryModal && (
            <motion.div 
              key="create-story-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Novo Status</h3>
                  <button onClick={() => setShowCreateStoryModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <textarea 
                    value={newStoryContent}
                    onChange={(e) => setNewStoryContent(e.target.value)}
                    placeholder="O que está acontecendo? (Ex: Estou na biblioteca!)"
                    className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm resize-none min-h-[120px]"
                  />
                  <button 
                    onClick={createStory}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    Publicar Status
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIEW STORY MODAL */}
        <AnimatePresence>
          {showStoryModal && activeStory && (
            <motion.div 
              key="view-story-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md aspect-[9/16] bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col items-center justify-center p-8 text-center"
              >
                <button 
                  onClick={() => setShowStoryModal(false)}
                  className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                >
                  <X size={24} />
                </button>
                
                <div className="absolute top-6 left-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30">
                    {activeStory.user_avatar ? (
                      <img src={activeStory.user_avatar} alt={activeStory.user_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="text-white" size={20} />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-white uppercase tracking-tight">{activeStory.user_name}</p>
                    <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">
                      {new Date(activeStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <p className="text-2xl md:text-3xl font-black text-white leading-tight px-4">
                    "{activeStory.content}"
                  </p>
                </div>

                <div className="absolute bottom-10 w-full px-8">
                  <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                      onAnimationComplete={() => setShowStoryModal(false)}
                      className="h-full bg-white"
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SHARE PROFILE MODAL */}
        <AnimatePresence>
          {showShareProfileModal && (
            <motion.div 
              key="share-profile-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Compartilhar Contato</h3>
                  <button onClick={() => setShowShareProfileModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Selecione um colega para compartilhar</p>
                  {allUsers.length === 0 ? (
                    <p className="text-center py-8 text-sm text-slate-400">Nenhum colega encontrado</p>
                  ) : (
                    allUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => shareProfile(user.id)}
                        className="w-full p-4 flex items-center gap-4 bg-slate-50 dark:bg-black/20 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-2xl border border-slate-200 dark:border-white/5 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {user.persona_data?.avatar_url ? (
                            <img src={user.persona_data.avatar_url} alt={user.persona_data.nome} className="w-full h-full object-cover" />
                          ) : (
                            <User className="text-slate-400" size={24} />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white truncate">{user.persona_data?.nome || 'Colega'}</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black mt-1">
                            {user.persona_data?.especialidade || 'Estudante'}
                          </p>
                        </div>
                        <Share2 size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* INCOMING CALL NOTIFICATION */}
        <AnimatePresence>
          {incomingCall && !showCallModal && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 20, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
            >
              <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center overflow-hidden shrink-0 animate-pulse border-2 border-blue-500/30">
                  {incomingCall.caller_avatar ? (
                    <img src={incomingCall.caller_avatar} alt={incomingCall.caller_name} className="w-full h-full object-cover" />
                  ) : (
                    incomingCall.type === 'video' ? <Video className="text-blue-600" /> : <Phone className="text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chamada de {incomingCall.type === 'video' ? 'Vídeo' : 'Áudio'}</p>
                  <p className="font-bold text-slate-900 dark:text-white truncate">{incomingCall.caller_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={rejectCall}
                    className="p-3 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                  >
                    <PhoneOff size={20} />
                  </button>
                  <button 
                    onClick={acceptCall}
                    className="p-3 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                  >
                    <Phone size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CALL MODAL */}
        <AnimatePresence>
          {showCallModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 md:p-8"
            >
              <div className="relative w-full max-w-4xl aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
                {/* REMOTE VIDEO */}
                {remoteStream ? (
                  <video 
                    ref={remoteVideoRef}
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
                    <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
                      <User size={48} className="text-white/40" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest text-white/60">
                      {callStatus === 'calling' ? 'Chamando...' : 'Conectando...'}
                    </p>
                  </div>
                )}

                {/* LOCAL VIDEO (PIP) */}
                <div className="absolute bottom-6 right-6 w-32 md:w-48 aspect-video bg-black rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl z-10">
                  {isVideoOff ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <VideoOff size={24} className="text-white/40" />
                    </div>
                  ) : (
                    <video 
                      ref={localVideoRef}
                      autoPlay 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* CALL CONTROLS */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-6 z-20">
                  <button 
                    onClick={toggleMute}
                    className={`p-4 md:p-5 rounded-full transition-all ${isMuted ? 'bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  
                  <button 
                    onClick={endCall}
                    className="p-5 md:p-6 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xl shadow-red-600/40 transition-all active:scale-90"
                  >
                    <PhoneOff size={32} />
                  </button>

                  <button 
                    onClick={toggleVideo}
                    className={`p-4 md:p-5 rounded-full transition-all ${isVideoOff ? 'bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  >
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                  </button>
                </div>

                {/* CALL INFO */}
                <div className="absolute top-10 left-10 text-white z-20">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Chamada em tempo real</p>
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    {activeRoom?.name || 'Conversa'}
                  </h3>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GLOBAL SEARCH MODAL */}
        <AnimatePresence>
          {showGlobalSearch && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text"
                      placeholder="Pesquisar em todas as mensagens..."
                      value={globalSearchQuery}
                      onChange={(e) => {
                        setGlobalSearchQuery(e.target.value);
                        searchGlobalMessages(e.target.value);
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold"
                      autoFocus
                    />
                  </div>
                  <button 
                    onClick={() => { setShowGlobalSearch(false); setGlobalSearchQuery(''); setGlobalSearchResults([]); }}
                    className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  {searchingGlobal ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-40">
                      <Loader2 className="animate-spin mb-2" />
                      <p className="text-xs font-black uppercase tracking-widest">Pesquisando...</p>
                    </div>
                  ) : globalSearchResults.length > 0 ? (
                    <div className="space-y-4">
                      {globalSearchResults.map(msg => {
                        const room = rooms.find(r => r.id === msg.room_id);
                        return (
                          <button 
                            key={msg.id}
                            onClick={() => {
                              if (room) {
                                setActiveRoom(room);
                                setShowGlobalSearch(false);
                                setGlobalSearchQuery('');
                                setGlobalSearchResults([]);
                              }
                            }}
                            className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl hover:border-blue-500 transition-all text-left group"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                {room ? getChatName(room) : 'Conversa desconhecida'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{msg.sender_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{msg.content}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : globalSearchQuery ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-40 text-center">
                      <Search size={48} className="mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest">Nenhum resultado encontrado</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 opacity-40 text-center">
                      <MessageSquare size={48} className="mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest">Digite algo para pesquisar</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROFILE SETTINGS MODAL */}
        <AnimatePresence>
          {showProfileSettings && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-tight">Meu Perfil</h3>
                  <button 
                    onClick={() => setShowProfileSettings(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-2xl text-3xl mb-4 overflow-hidden">
                    {userProfile?.persona_data?.avatar_url ? (
                      <img src={userProfile.persona_data.avatar_url} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                      userProfile?.persona_data?.nome?.[0] || userName[0]
                    )}
                  </div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1">{userProfile?.persona_data?.nome || userName}</h4>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">{userProfile?.persona_data?.email || 'Usuário Connect'}</p>

                  <div className="w-full space-y-6">
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Recado / Bio</label>
                      <textarea 
                        defaultValue={userProfile?.bio || ''}
                        onBlur={(e) => updateProfile(e.target.value)}
                        placeholder="Escreva algo sobre você..."
                        className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-sm resize-none h-32"
                      />
                      <p className="text-[10px] text-slate-400 mt-2 italic">O recado será salvo automaticamente ao sair do campo.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <Shield size={18} />
                          </div>
                          <span className="text-xs font-bold">Privacidade</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* USER PROFILE MODAL (FOR OTHERS) */}
        <AnimatePresence>
          {showUserProfileModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-tight">Perfil</h3>
                  <button 
                    onClick={() => setShowUserProfileModal(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-400 font-bold shadow-2xl text-3xl mb-4 overflow-hidden">
                    {showUserProfileModal.avatar_url ? (
                      <img src={showUserProfileModal.avatar_url} alt={showUserProfileModal.nome} className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} />
                    )}
                  </div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1">{showUserProfileModal.nome || 'Usuário'}</h4>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">{showUserProfileModal.email || 'Connect User'}</p>

                  <div className="w-full space-y-6">
                    <div className="text-left">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Recado / Bio</label>
                      <div className="w-full p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-sm min-h-[80px]">
                        {showUserProfileModal.bio || 'Sem recado disponível.'}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex gap-3">
                      <button 
                        onClick={() => {
                          // Logic to start a direct chat if not already in one
                          // For now, just close modal
                          setShowUserProfileModal(null);
                        }}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={14} />
                        Mensagem
                      </button>
                      <button 
                        onClick={() => {
                          setShowUserProfileModal(null);
                          startCall('audio');
                        }}
                        className="p-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-all"
                      >
                        <Phone size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NEW CHAT MODAL (USER DISCOVERY) */}
        <AnimatePresence>
          {showNewChatModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-tight">Nova Conversa</h3>
                  <button 
                    onClick={() => setShowNewChatModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-4 border-b border-slate-200 dark:border-white/5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Buscar por nome ou email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                  {loadingUsers ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 className="animate-spin text-blue-500" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando contatos...</p>
                    </div>
                  ) : availableUsers.length > 0 ? (
                    <div className="space-y-1">
                      {availableUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => startDirectChat(user.id)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all group"
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border-2 border-transparent group-hover:border-blue-500 transition-all">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <User size={24} className="text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm truncate">{user.full_name}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{user.bio || 'Usuário'}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                            <Plus size={16} />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                      <Users size={48} className="text-slate-200 dark:text-white/5 mb-4" />
                      <p className="text-sm font-bold text-slate-500">Nenhum usuário encontrado.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

export default Connect;
