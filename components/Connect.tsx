
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Search, Plus, Paperclip, Send, MoreVertical, 
  Check, CheckCheck, User, Image as ImageIcon, 
  FileText, X, ChevronLeft, Loader2, MessageSquare,
  Edit2, Trash2, Reply, CornerUpLeft, Mic, Pin, PinOff,
  Link, File, Play, Pause, Trash, Bell, BellOff,
  Smile, Forward, Star, BarChart2, VolumeX, Volume2,
  Clock, Folder, History, UserPlus, Phone, Video, PhoneOff, VideoOff, Ghost, Eye, EyeOff, MicOff, Palette, Users,
  Settings, LogOut, Shield, ChevronRight, LayoutGrid, Archive, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { createTrailingDebounce } from '../utils/realtimeThrottle';
import { devPerfCount, devPerfEnd, devPerfStart } from '../utils/devPerfLog';
import ChatSidebar from './chat/ChatSidebar';
import MessageList from './chat/MessageList';
import MessageItem from './chat/MessageItem';
import ChatInput from './chat/ChatInput';
import MediaGallery from './chat/MediaGallery';
import GroupInfoModal from './connect/GroupInfoModal';
import CallOverlay from './connect/CallOverlay';
import GlobalSearchModal from './connect/GlobalSearchModal';
import ProfileModals from './connect/ProfileModals';
import UserDiscoveryModal from './connect/UserDiscoveryModal';
import { getChatAvatarForRoom, getChatNameForRoom, getTypingUsersForRoom } from './connect/chatUtils';
import { loadComposerDrafts, persistComposerDrafts } from './connect/composerDraftStorage';
import {
  escapeIlikePattern,
  filterMessagesByConversationCriteria,
  hasActiveConversationSearchCriteria,
  localDateYmdToUtcIsoEnd,
  localDateYmdToUtcIsoStart,
  messageMatchesConversationCriteria,
  type ChatConversationSearchCriteria,
} from './connect/chatSearchUtils';
import {
  joinStatusForUser,
  canCreateGroupPoll,
  type GroupModerationSettings,
} from './connect/groupModerationUtils';
import { withChatSendRetries } from './connect/messageSendRetry';
import { vanishExpiresAtIso, type VanishDurationId } from './connect/vanishModeUtils';
import { FOCUS_RING_ROUND, FOCUS_RING } from './connect/a11yClasses';
import {
  MESSAGES_PER_PAGE,
  latestRealMessageIso,
  type RoomMessageCacheMeta,
} from './connect/messageRoomCache';
import WallpaperModal from './connect/WallpaperModal';
import MediaGalleryModal from './connect/MediaGalleryModal';
import ForwardModal from './connect/ForwardModal';
import PollModal from './connect/PollModal';
import CreateStoryModal from './connect/CreateStoryModal';
import ViewStoryModal from './connect/ViewStoryModal';
import ShareProfileModal from './connect/ShareProfileModal';
import ScheduleChatModal, { type ScheduleChatSubmitPayload } from './connect/ScheduleChatModal';
import ChatThreadPanel from './connect/ChatThreadPanel';
import {
  MAX_ATTACHMENT_BYTES,
  MAX_CHAT_MESSAGE_CHARS,
  MAX_REPLY_SNIPPET_CHARS,
  applyYoutubePreviewImage,
  attachmentTooLarge,
  clampUtf16,
  formatMaxMegabytes,
  normalizeLinkPreviewForStorage,
  sanitizeAttachmentDisplayName,
  sanitizeChatHttpUrl,
  sanitizeLinkPreviewForRpc,
  stripControlChars,
} from './connect/chatContentLimits';
import { logConnectError } from './connect/chatFeatureLog';
import {
  CONNECT_CHAT_CALLS_FULL_COLUMNS,
  CONNECT_CHAT_CALLS_LIST_COLUMNS,
  CONNECT_CHAT_MESSAGES_COLUMNS,
  CONNECT_CHAT_PARTICIPANTS_COLUMNS,
  CONNECT_CHAT_POLLS_WITH_VOTES,
  CONNECT_CHAT_REACTIONS_COLUMNS,
  CONNECT_CHAT_ROOM_SETTINGS_COLUMNS,
  CONNECT_CHAT_ROOMS_COLUMNS,
  CONNECT_CHAT_SCHEDULED_ITEMS_COLUMNS,
  CONNECT_CHAT_STORIES_COLUMNS,
  CONNECT_FRIENDSHIPS_COLUMNS,
  CONNECT_USER_PERSONA_CALL_ENRICH_COLUMNS,
  CONNECT_USER_PERSONA_DISCOVERY_COLUMNS,
  CONNECT_USER_PERSONA_LAST_SEEN,
  CONNECT_USER_PERSONA_PEER_COLUMNS,
  CONNECT_USER_PERSONA_SELF_COLUMNS,
  CONNECT_USER_PERSONA_SHARE_COLUMNS,
} from './connect/connectSupabaseColumns';
import { useGlobalChatPresence } from './connect/hooks/useGlobalChatPresence';
import { useConnectInit } from './connect/hooks/useConnectInit';
import { useActiveRoomLifecycle } from './connect/hooks/useActiveRoomLifecycle';
import { useChatStore } from '../src/store/useChatStore';
import {
  ChatRoom,
  ChatMessage,
  ChatParticipant,
  UserProfile,
  ChatStory,
  ChatScheduledItem,
  ChatScheduledItemKind,
  type ChatMessagePendingSendText,
} from '../types';
import { dataService } from '../services/dataService';
import { toast } from 'sonner';
import { GoogleGenAI, Type } from "@google/genai";

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
    patchMessage,
    removeMessage,
    participants,
    setParticipants,
    userPresence,
    updateUserPresence,
    typingStatus,
    setTypingStatusFromPresence,
    pinnedRooms,
    setPinnedRooms,
    archivedRooms,
    setArchivedRooms,
  } = useChatStore();

  const activeRoom = rooms.find(r => r.id === activeRoomId) || null;
  const messages = activeRoomId ? (storeMessages[activeRoomId] || []) : [];

  const groupJoinBlocked = useMemo(() => {
    if (!activeRoom?.is_group || !userId || !activeRoomId) return false;
    return joinStatusForUser(activeRoomId, userId, participants) === 'pending';
  }, [activeRoom?.is_group, activeRoomId, userId, participants]);

  const activeRoomParticipantIdsKey =
    activeRoomId != null
      ? (participants[activeRoomId]?.map((p) => p.user_id).sort().join('|') ?? '')
      : '';

  const activeRoomOtherUserId = useMemo(() => {
    if (!activeRoomId || groupJoinBlocked || activeRoom?.is_group) return null;
    const ids = activeRoomParticipantIdsKey.split('|').filter(Boolean);
    if (ids.length !== 2) return null;
    return ids.find((id) => id !== userId) ?? null;
  }, [activeRoomId, userId, groupJoinBlocked, activeRoomParticipantIdsKey, activeRoom?.is_group]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [messageDraftsByRoom, setMessageDraftsByRoom] = useState<Record<string, string>>(() =>
    loadComposerDrafts(userId)
  );
  const [loading, setLoading] = useState(true);
  const roomsFetchInFlightRef = useRef<Promise<void> | null>(null);
  const roomsLastRealtimeFetchAtRef = useRef(0);

  useEffect(() => {
    setMessageDraftsByRoom(loadComposerDrafts(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const t = window.setTimeout(() => persistComposerDrafts(userId, messageDraftsByRoom), 350);
    return () => clearTimeout(t);
  }, [messageDraftsByRoom, userId]);

  const newMessage = activeRoomId ? (messageDraftsByRoom[activeRoomId] ?? '') : '';

  const setNewMessage = useCallback(
    (value: React.SetStateAction<string>) => {
      if (!activeRoomId) return;
      setMessageDraftsByRoom((prev) => {
        const current = prev[activeRoomId] ?? '';
        const next = typeof value === 'function' ? (value as (c: string) => string)(current) : value;
        if (next === current) return prev;
        const copy = { ...prev };
        if (next === '') delete copy[activeRoomId];
        else copy[activeRoomId] = next;
        return copy;
      });
    },
    [activeRoomId]
  );
  const getTypingUsers = (roomId: string) => getTypingUsersForRoom(typingStatus, roomId);

  const { handleTyping } = useGlobalChatPresence({
    userId,
    userName,
    activeRoomId: activeRoom?.id || null,
    updateUserPresence,
    setTypingStatusFromPresence,
  });

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

  const fetchPendingScheduled = useCallback(async () => {
    if (!activeRoomId || !userId) {
      setPendingScheduled([]);
      return;
    }
    const { data, error } = await supabase
      .from('chat_scheduled_items')
      .select(CONNECT_CHAT_SCHEDULED_ITEMS_COLUMNS)
      .eq('room_id', activeRoomId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true });
    if (error) {
      console.warn('chat_scheduled_items:', error.message);
      return;
    }
    setPendingScheduled((data as ChatScheduledItem[]) || []);
  }, [activeRoomId, userId]);

  useEffect(() => {
    void fetchPendingScheduled();
  }, [fetchPendingScheduled]);

  useEffect(() => {
    if (!activeRoomId || !userId) return;
    const ch = supabase
      .channel(`sched:${activeRoomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_scheduled_items',
          filter: `room_id=eq.${activeRoomId}`,
        },
        () => {
          void fetchPendingScheduled();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [activeRoomId, userId, fetchPendingScheduled]);

  const cancelScheduledItem = async (id: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('chat_scheduled_items')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'pending');
    if (error) {
      toast.error('Não foi possível cancelar');
      return;
    }
    toast.success('Agendamento cancelado');
    void fetchPendingScheduled();
  };

  const handleScheduleSubmit = async (payload: ScheduleChatSubmitPayload) => {
    if (!activeRoom) return;
    const schedBody = stripControlChars(payload.content.trim());
    if (schedBody.length > MAX_CHAT_MESSAGE_CHARS) {
      toast.error(`Texto demasiado longo (máx. ${MAX_CHAT_MESSAGE_CHARS} caracteres).`);
      return;
    }
    setScheduleSubmitting(true);
    try {
      const { error } = await supabase.from('chat_scheduled_items').insert({
        room_id: activeRoom.id,
        user_id: userId,
        user_name: userName,
        kind: payload.kind,
        content: schedBody,
        scheduled_at: payload.scheduledAtIso,
        reply_to_id: payload.replyToId,
        reply_to_content: payload.replyToContent,
        reply_to_sender_name: payload.replyToSenderName,
        context_text: payload.contextText,
        status: 'pending',
      });
      if (error) throw error;
      if (
        payload.kind === 'reminder' &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'default'
      ) {
        void Notification.requestPermission();
      }
      toast.success(payload.kind === 'reminder' ? 'Lembrete agendado!' : 'Mensagem agendada!');
      setShowScheduleModal(false);
      if (payload.kind === 'scheduled_message') {
        setNewMessage('');
        setReplyingTo(null);
      }
      void fetchPendingScheduled();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar. Execute scripts/supabase-chat-scheduled.sql no Supabase.');
    } finally {
      setScheduleSubmitting(false);
    }
  };

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
            p.user_id === userId
              ? { ...p, unread_count: 0, last_read_at: new Date().toISOString() }
              : p
          )
        };
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const rpcChatMessageRow = (data: unknown): ChatMessage | null => {
    if (data == null) return null;
    if (Array.isArray(data)) return (data[0] as ChatMessage) ?? null;
    return data as ChatMessage;
  };

  const postChatMessageDb = async (params: {
    roomId: string;
    content?: string | null;
    messageType?: string;
    status?: string;
    replyToId?: string | null;
    replyToContent?: string | null;
    replyToSenderName?: string | null;
    linkPreview?: ChatMessage['link_preview'] | null;
    isVanish?: boolean;
    expiresAt?: string | null;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentType?: string | null;
    sharedProfileId?: string | null;
    isForwarded?: boolean;
    forwardedFromName?: string | null;
    threadRootId?: string | null;
  }): Promise<ChatMessage | null> => {
    const safeContent = clampUtf16(stripControlChars(params.content ?? ''), MAX_CHAT_MESSAGE_CHARS);
    const safeReplyContent =
      params.replyToContent != null && params.replyToContent !== ''
        ? clampUtf16(stripControlChars(params.replyToContent), MAX_REPLY_SNIPPET_CHARS)
        : null;
    const safeLinkPreview = params.linkPreview
      ? sanitizeLinkPreviewForRpc(params.linkPreview)
      : null;
    const safeAttachmentUrl = params.attachmentUrl
      ? sanitizeChatHttpUrl(params.attachmentUrl)
      : null;
    const safeAttachmentName = params.attachmentName
      ? sanitizeAttachmentDisplayName(params.attachmentName)
      : null;
    const { data, error } = await supabase.rpc('post_chat_message', {
      p_room_id: params.roomId,
      p_sender_id: userId,
      p_sender_name: userName,
      p_content: safeContent,
      p_message_type: params.messageType ?? 'text',
      p_status: params.status ?? 'sent',
      p_reply_to_id: params.replyToId ?? null,
      p_reply_to_content: safeReplyContent,
      p_reply_to_sender_name: params.replyToSenderName ?? null,
      p_link_preview: safeLinkPreview,
      p_is_vanish: params.isVanish ?? false,
      p_expires_at: params.expiresAt ?? null,
      p_attachment_url: safeAttachmentUrl,
      p_attachment_name: safeAttachmentName,
      p_attachment_type: params.attachmentType ?? null,
      p_shared_profile_id: params.sharedProfileId ?? null,
      p_is_forwarded: params.isForwarded ?? false,
      p_forwarded_from_name: params.forwardedFromName ?? null,
      p_thread_root_id: params.threadRootId ?? null,
    });
    if (error) throw error;
    return rpcChatMessageRow(data);
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
  const [chatHeaderMobileMenuOpen, setChatHeaderMobileMenuOpen] = useState(false);
  const [internalSearchSenderId, setInternalSearchSenderId] = useState('');
  const [internalSearchDateFrom, setInternalSearchDateFrom] = useState('');
  const [internalSearchDateTo, setInternalSearchDateTo] = useState('');
  const [internalSearchOnlyAttachment, setInternalSearchOnlyAttachment] = useState(false);
  const [internalSearchWordMatchMode, setInternalSearchWordMatchMode] = useState<'all' | 'any'>('all');
  const [internalSearchShowAdvanced, setInternalSearchShowAdvanced] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [messageReactions, setMessageReactions] = useState<Record<string, any[]>>({});
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [pendingScheduled, setPendingScheduled] = useState<ChatScheduledItem[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalKind, setScheduleModalKind] = useState<ChatScheduledItemKind>('scheduled_message');
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [activeThreadRoot, setActiveThreadRoot] = useState<ChatMessage | null>(null);
  const [threadComposerDraft, setThreadComposerDraft] = useState('');
  const [threadReplyingTo, setThreadReplyingTo] = useState<ChatMessage | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [viewMode, setViewMode] = useState<'chats' | 'calls' | 'stories'>('chats');
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState<any>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const [globalSearchSenderName, setGlobalSearchSenderName] = useState('');
  const [globalSearchDateFrom, setGlobalSearchDateFrom] = useState('');
  const [globalSearchDateTo, setGlobalSearchDateTo] = useState('');
  const [globalSearchOnlyAttachment, setGlobalSearchOnlyAttachment] = useState(false);
  const globalSearchQueryRef = useRef(globalSearchQuery);
  globalSearchQueryRef.current = globalSearchQuery;
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [starredMessages, setStarredMessages] = useState<string[]>([]);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
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
  const [vanishDurationId, setVanishDurationId] = useState<VanishDurationId>('m1');
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');

  const conversationSearchCriteria = useMemo((): ChatConversationSearchCriteria => {
    return {
      textQuery: internalSearchQuery,
      senderId: internalSearchSenderId || null,
      dateFrom: internalSearchDateFrom || null,
      dateTo: internalSearchDateTo || null,
      onlyWithAttachment: internalSearchOnlyAttachment,
      wordMatchMode: internalSearchWordMatchMode,
    };
  }, [
    internalSearchQuery,
    internalSearchSenderId,
    internalSearchDateFrom,
    internalSearchDateTo,
    internalSearchOnlyAttachment,
    internalSearchWordMatchMode,
  ]);

  const mainTimelineForSearch = useMemo(
    () => messages.filter((m) => !m.thread_root_id),
    [messages]
  );

  const internalSearchResultCount = useMemo(() => {
    if (!hasActiveConversationSearchCriteria(conversationSearchCriteria)) return 0;
    return filterMessagesByConversationCriteria(mainTimelineForSearch, conversationSearchCriteria).length;
  }, [mainTimelineForSearch, conversationSearchCriteria]);

  const threadReplyMessages = useMemo(() => {
    if (!activeThreadRoot?.id) return [];
    return messages
      .filter((m) => m.thread_root_id === activeThreadRoot.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, activeThreadRoot]);

  useEffect(() => {
    setActiveThreadRoot(null);
    setThreadComposerDraft('');
    setThreadReplyingTo(null);
  }, [activeRoomId]);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      const inField =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        if (inField) return;
        e.preventDefault();
        if (activeRoomId) {
          setShowInternalSearch(true);
        } else {
          setShowGlobalSearch(true);
        }
        return;
      }

      if (e.key !== 'Escape') return;

      if (scheduleSubmitting) return;

      if (showScheduleModal) {
        e.preventDefault();
        setShowScheduleModal(false);
        return;
      }
      if (showForwardModal) {
        e.preventDefault();
        setShowForwardModal(false);
        setForwardingMessage(null);
        return;
      }
      if (showPollModal) {
        e.preventDefault();
        setShowPollModal(false);
        return;
      }
      if (showWallpaperModal) {
        e.preventDefault();
        setShowWallpaperModal(false);
        return;
      }
      if (showMediaGallery) {
        e.preventDefault();
        setShowMediaGallery(false);
        return;
      }
      if (showGlobalSearch) {
        e.preventDefault();
        setShowGlobalSearch(false);
        return;
      }
      if (showGroupInfoModal) {
        e.preventDefault();
        setShowGroupInfoModal(false);
        return;
      }
      if (showCreateStoryModal) {
        e.preventDefault();
        setShowCreateStoryModal(false);
        return;
      }
      if (showStoryModal) {
        e.preventDefault();
        setShowStoryModal(false);
        setActiveStory(null);
        return;
      }
      if (showShareProfileModal) {
        e.preventDefault();
        setShowShareProfileModal(false);
        return;
      }
      if (showNewChatModal) {
        e.preventDefault();
        setShowNewChatModal(false);
        return;
      }
      if (showProfileSettings) {
        e.preventDefault();
        setShowProfileSettings(false);
        return;
      }
      if (showUserProfileModal) {
        e.preventDefault();
        setShowUserProfileModal(null);
        return;
      }
      if (showCallModal) {
        e.preventDefault();
        setShowCallModal(false);
        return;
      }
      if (activeThreadRoot) {
        e.preventDefault();
        setActiveThreadRoot(null);
        return;
      }
      if (showInternalSearch) {
        e.preventDefault();
        setShowInternalSearch(false);
        setInternalSearchQuery('');
        setInternalSearchSenderId('');
        setInternalSearchDateFrom('');
        setInternalSearchDateTo('');
        setInternalSearchOnlyAttachment(false);
        setInternalSearchWordMatchMode('all');
        setInternalSearchShowAdvanced(false);
        return;
      }
      if (internalSearchShowAdvanced) {
        e.preventDefault();
        setInternalSearchShowAdvanced(false);
        return;
      }
      if (showReactionPicker) {
        e.preventDefault();
        setShowReactionPicker(null);
        return;
      }
      if (showGifPicker) {
        e.preventDefault();
        setShowGifPicker(false);
        return;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    scheduleSubmitting,
    showScheduleModal,
    showForwardModal,
    showPollModal,
    showWallpaperModal,
    showMediaGallery,
    showGlobalSearch,
    showGroupInfoModal,
    showCreateStoryModal,
    showStoryModal,
    showShareProfileModal,
    showNewChatModal,
    showProfileSettings,
    showUserProfileModal,
    showCallModal,
    activeThreadRoot,
    showInternalSearch,
    internalSearchShowAdvanced,
    showReactionPicker,
    showGifPicker,
    activeRoomId,
  ]);

  useEffect(() => {
    setChatHeaderMobileMenuOpen(false);
  }, [activeRoomId]);

  const pendingFileByClientIdRef = useRef<Map<string, File>>(new Map());
  const messageIncrementalInFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  const messageIncrementalLastFetchAtRef = useRef<Map<string, number>>(new Map());
  const pollsInFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  const pollsLastFetchAtRef = useRef<Map<string, number>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRoomMetaRef = useRef<Record<string, RoomMessageCacheMeta>>({});
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
  useConnectInit({
    userId,
    setNotificationPermission,
    fetchRooms: () => fetchRooms({ showLoading: true }),
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
        .select(CONNECT_CHAT_CALLS_LIST_COLUMNS)
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enrich with participant names
      const enrichedCalls = await Promise.all((data || []).map(async (call) => {
        const otherId = call.caller_id === userId ? call.receiver_id : call.caller_id;
        const { data: userData } = await supabase
          .from('user_persona')
          .select(CONNECT_USER_PERSONA_CALL_ENRICH_COLUMNS)
          .eq('id', otherId)
          .single();
        
        return {
          ...call,
          other_name: userData?.full_name || 'Colega',
          other_avatar: userData?.avatar_url
        };
      }));

      setCallHistory(enrichedCalls);
    } catch (error) {
      console.error('Error fetching call history:', error);
    }
  };

  const subscribeToCalls = () => {
    const debouncedHistory = createTrailingDebounce(() => {
      devPerfCount('Connect:realtime_calls_history_debounced_fetch');
      void fetchCallHistory();
    }, 600);

    const channel = supabase
      .channel(`chat_calls_history:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_calls',
          filter: `caller_id=eq.${userId}`,
        },
        () => {
          devPerfCount('Connect:realtime_chat_calls_caller');
          debouncedHistory.schedule();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_calls',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          devPerfCount('Connect:realtime_chat_calls_receiver');
          debouncedHistory.schedule();
        }
      )
      .subscribe();
    
    return () => {
      debouncedHistory.cancel();
      supabase.removeChannel(channel);
    };
  };

  const fetchRoomSettings = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_room_settings')
        .select(CONNECT_CHAT_ROOM_SETTINGS_COLUMNS)
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
      await postChatMessageDb({
        roomId: activeRoom.id,
        content: '',
        messageType: type,
        attachmentUrl: gifUrl,
      });
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
    const debouncedRooms = createTrailingDebounce(() => {
      devPerfCount('Connect:realtime_rooms_debounced_fetch');
      void fetchRooms({ source: 'realtime' });
    }, 550);

    const channel = supabase
      .channel('global-chat-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_rooms' 
      }, () => {
        devPerfCount('Connect:realtime_chat_rooms');
        debouncedRooms.schedule();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_participants',
        filter: `user_id=eq.${userId}`
      }, () => {
        devPerfCount('Connect:realtime_chat_participants_user');
        debouncedRooms.schedule();
      })
      .subscribe();
    
    return () => {
      debouncedRooms.cancel();
      supabase.removeChannel(channel);
    };
  };

  useActiveRoomLifecycle({
    activeRoomId: activeRoom?.id || null,
    activeRoomOtherUserId,
    joinBlocked: groupJoinBlocked,
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
      .select(CONNECT_USER_PERSONA_LAST_SEEN)
      .eq('id', otherId)
      .single();

    if (!error && data?.last_seen) {
      setOtherUserLastSeen(data.last_seen);
    }
  };

  const lastMessageId = useRef<string | null>(null);

  useEffect(() => {
    isInitialLoadMessages.current = true;
    lastMessageId.current = null;
    if (activeRoomId) {
      const m = messageRoomMetaRef.current[activeRoomId];
      setHasMoreMessages(m?.hasMore ?? true);
    } else {
      setHasMoreMessages(true);
    }
  }, [activeRoomId]);

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
      .select(CONNECT_USER_PERSONA_SELF_COLUMNS)
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
        .select(CONNECT_USER_PERSONA_PEER_COLUMNS)
        .eq('id', targetUserId)
        .single();
      
      if (error) throw error;
      const pd = (data as { persona_data?: { nome?: string; email?: string; avatar_url?: string } })
        .persona_data;
      setShowUserProfileModal({
        ...data,
        nome: pd?.nome ?? data.full_name,
        email: pd?.email ?? '',
        avatar_url: data.avatar_url ?? pd?.avatar_url,
      });
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

  const searchGlobalMessages = useCallback(
    async (queryText?: string) => {
      const q = (queryText ?? globalSearchQueryRef.current).trim();
      const hasFilters = Boolean(
        globalSearchSenderName.trim() ||
          globalSearchDateFrom ||
          globalSearchDateTo ||
          globalSearchOnlyAttachment
      );
      if (!userId || (!q && !hasFilters)) {
        setGlobalSearchResults([]);
        return;
      }

      setSearchingGlobal(true);
      try {
        const myRoomIds = rooms.map((r) => r.id);
        if (myRoomIds.length === 0) {
          setGlobalSearchResults([]);
          return;
        }

        let request = supabase
          .from('chat_messages')
          .select(CONNECT_CHAT_MESSAGES_COLUMNS)
          .in('room_id', myRoomIds)
          .order('created_at', { ascending: false })
          .limit(q ? 280 : 420);

        if (q) {
          const esc = escapeIlikePattern(q);
          const p = `%${esc}%`;
          request = request.or(`content.ilike.${p},attachment_name.ilike.${p}`);
        }

        if (globalSearchSenderName.trim()) {
          const esc = escapeIlikePattern(globalSearchSenderName.trim());
          request = request.ilike('sender_name', `%${esc}%`);
        }

        if (globalSearchDateFrom) {
          const iso = localDateYmdToUtcIsoStart(globalSearchDateFrom);
          if (iso) request = request.gte('created_at', iso);
        }
        if (globalSearchDateTo) {
          const iso = localDateYmdToUtcIsoEnd(globalSearchDateTo);
          if (iso) request = request.lte('created_at', iso);
        }

        if (globalSearchOnlyAttachment) {
          request = request.not('attachment_url', 'is', null);
        }

        const { data, error } = await request;
        if (error) throw error;
        let rows = (data || []) as ChatMessage[];

        if (q) {
          const crit: ChatConversationSearchCriteria = {
            textQuery: q,
            senderId: null,
            dateFrom: globalSearchDateFrom || null,
            dateTo: globalSearchDateTo || null,
            onlyWithAttachment: globalSearchOnlyAttachment,
            wordMatchMode: 'all',
          };
          rows = rows.filter((m) => messageMatchesConversationCriteria(m, crit));
        }

        setGlobalSearchResults(rows.slice(0, 80));
      } catch (error) {
        console.error('Error searching global messages:', error);
        setGlobalSearchResults([]);
      } finally {
        setSearchingGlobal(false);
      }
    },
    [
      userId,
      rooms,
      globalSearchSenderName,
      globalSearchDateFrom,
      globalSearchDateTo,
      globalSearchOnlyAttachment,
    ]
  );

  useEffect(() => {
    if (!showGlobalSearch) return;
    void searchGlobalMessages(undefined);
  }, [
    showGlobalSearch,
    globalSearchSenderName,
    globalSearchDateFrom,
    globalSearchDateTo,
    globalSearchOnlyAttachment,
    searchGlobalMessages,
  ]);

  const fetchRooms = async (options?: { showLoading?: boolean; source?: 'manual' | 'realtime' }) => {
    const showLoading = options?.showLoading ?? false;
    const source = options?.source ?? 'manual';
    const now = Date.now();
    const realtimeCooldownMs = 1000;
    if (source === 'realtime' && now - roomsLastRealtimeFetchAtRef.current < realtimeCooldownMs) {
      devPerfCount('Connect:fetchRooms_skipped_realtime_cooldown');
      return;
    }

    const inFlight = roomsFetchInFlightRef.current;
    if (inFlight) {
      devPerfCount('Connect:fetchRooms_skipped_inflight');
      await inFlight;
      return;
    }

    const perfStart = devPerfStart('Connect:fetchRooms');
    devPerfCount('Connect:fetchRooms_calls', { source });

    const run = (async () => {
      if (showLoading) setLoading(true);
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
            .select(CONNECT_CHAT_ROOMS_COLUMNS)
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
            .select(CONNECT_CHAT_PARTICIPANTS_COLUMNS)
            .in('room_id', roomIds);

          if (!pError && allParticipants) {
            const grouped = allParticipants.reduce((acc: any, p) => {
              if (!acc[p.room_id]) acc[p.room_id] = [];
              acc[p.room_id].push(p);
              return acc;
            }, {});
            setParticipants(grouped);
          }
        } else {
          setRooms([]);
          setPinnedRooms([]);
          setParticipants({});
        }
      } catch (error: any) {
        console.error('Error fetching rooms:', error);
        toast.error(`Erro ao carregar conversas: ${error.message || 'Verifique o console'}`);
      } finally {
        devPerfEnd('Connect:fetchRooms', perfStart, { source });
        if (showLoading) setLoading(false);
      }
    })();

    roomsFetchInFlightRef.current = run;
    try {
      await run;
      if (source === 'realtime') {
        roomsLastRealtimeFetchAtRef.current = Date.now();
      }
    } finally {
      if (roomsFetchInFlightRef.current === run) {
        roomsFetchInFlightRef.current = null;
      }
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

  const fetchAvailableUsers = async () => {
    if (!userId) return;
    setLoadingUsers(true);
    try {
      let query = supabase
        .from('user_persona')
        .select(CONNECT_USER_PERSONA_DISCOVERY_COLUMNS)
        .neq('id', userId);
      
      if (userSearchQuery) {
        query = query.ilike('full_name', `%${userSearchQuery}%`);
      } else {
        query = query.order('full_name');
      }

      const { data, error } = await query;
      if (error) throw error;
      setAvailableUsers((data || []) as UserProfile[]);
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
        .select(CONNECT_CHAT_ROOMS_COLUMNS)
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

  const fetchMessages = useCallback(
    async (roomId: string, loadMore = false) => {
      const perfStart = devPerfStart('Connect:fetchMessages');
      devPerfCount('Connect:fetchMessages_calls', { loadMore });
      if (loadMore) setIsLoadingMore(true);

      const cached = useChatStore.getState().messages[roomId] || [];
      const lastIso = latestRealMessageIso(cached);

      if (!loadMore && cached.length > 0 && !lastIso) {
        const m = messageRoomMetaRef.current[roomId];
        if (roomId === activeRoomId) {
          setHasMoreMessages(m?.hasMore ?? true);
        }
        setIsLoadingMore(false);
        devPerfEnd('Connect:fetchMessages', perfStart, { roomId, loadMore, mode: 'cached' });
        return;
      }

      if (!loadMore && cached.length > 0 && lastIso) {
        const incrementalCooldownMs = 700;
        const now = Date.now();
        const lastIncrementalAt = messageIncrementalLastFetchAtRef.current.get(roomId) || 0;
        if (now - lastIncrementalAt < incrementalCooldownMs) {
          devPerfCount('Connect:fetchMessages_incremental_skipped_cooldown');
          const meta = messageRoomMetaRef.current[roomId];
          if (roomId === activeRoomId) {
            setHasMoreMessages(meta?.hasMore ?? true);
          }
          setIsLoadingMore(false);
          devPerfEnd('Connect:fetchMessages', perfStart, {
            roomId,
            loadMore,
            mode: 'incremental_skipped_cooldown',
          });
          return;
        }

        const incrementalInFlight = messageIncrementalInFlightRef.current.get(roomId);
        if (incrementalInFlight) {
          devPerfCount('Connect:fetchMessages_incremental_skipped_inflight');
          await incrementalInFlight;
          const meta = messageRoomMetaRef.current[roomId];
          if (roomId === activeRoomId) {
            setHasMoreMessages(meta?.hasMore ?? true);
          }
          setIsLoadingMore(false);
          devPerfEnd('Connect:fetchMessages', perfStart, {
            roomId,
            loadMore,
            mode: 'incremental_skipped_inflight',
          });
          return;
        }

        const syncPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('chat_messages')
            .select(CONNECT_CHAT_MESSAGES_COLUMNS)
            .eq('room_id', roomId)
            .gt('created_at', lastIso)
            .order('created_at', { ascending: true });
          if (error) throw error;
          for (const row of data || []) {
            addMessage(roomId, row as ChatMessage);
          }
        } catch (e) {
          logConnectError('messages', 'sync_new_failed', e, { roomId });
        }
        })();
        messageIncrementalInFlightRef.current.set(roomId, syncPromise);
        try {
          await syncPromise;
          messageIncrementalLastFetchAtRef.current.set(roomId, Date.now());
        } finally {
          if (messageIncrementalInFlightRef.current.get(roomId) === syncPromise) {
            messageIncrementalInFlightRef.current.delete(roomId);
          }
        }
        const meta = messageRoomMetaRef.current[roomId];
        if (roomId === activeRoomId) {
          setHasMoreMessages(meta?.hasMore ?? true);
        }
        setIsLoadingMore(false);
        devPerfEnd('Connect:fetchMessages', perfStart, { roomId, loadMore, mode: 'incremental' });
        return;
      }

      const prevMeta = messageRoomMetaRef.current[roomId];
      const pageIndex = loadMore ? (prevMeta?.nextPageIndex ?? 1) : 0;
      const start = pageIndex * MESSAGES_PER_PAGE;
      const end = start + MESSAGES_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('chat_messages')
        .select(CONNECT_CHAT_MESSAGES_COLUMNS)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        logConnectError('messages', 'fetch_page_failed', error, { roomId, loadMore });
        setIsLoadingMore(false);
        devPerfEnd('Connect:fetchMessages', perfStart, { roomId, loadMore, mode: 'error' });
        return;
      }

      const rows = data || [];
      const fetchedMessages = [...rows].reverse();
      const hasMore = rows.length === MESSAGES_PER_PAGE;

      if (loadMore) {
        setStoreMessages(roomId, (prev) => [...fetchedMessages, ...(prev || [])]);
        messageRoomMetaRef.current[roomId] = {
          nextPageIndex: pageIndex + 1,
          hasMore,
        };
      } else {
        setStoreMessages(roomId, fetchedMessages);
        messageRoomMetaRef.current[roomId] = {
          nextPageIndex: 1,
          hasMore,
        };
      }

      if (roomId === activeRoomId) {
        setHasMoreMessages(hasMore);
      }
      setIsLoadingMore(false);
      devPerfEnd('Connect:fetchMessages', perfStart, {
        roomId,
        loadMore,
        mode: 'page',
        fetchedCount: rows.length,
      });
    },
    [activeRoomId, addMessage, setStoreMessages]
  );

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
    const perfStart = devPerfStart('Connect:fetchPolls');
    devPerfCount('Connect:fetchPolls_calls');
    const now = Date.now();
    const pollsCooldownMs = 900;
    const lastPollsAt = pollsLastFetchAtRef.current.get(roomId) || 0;
    if (now - lastPollsAt < pollsCooldownMs) {
      devPerfCount('Connect:fetchPolls_skipped_cooldown');
      devPerfEnd('Connect:fetchPolls', perfStart, { roomId, mode: 'skipped_cooldown' });
      return;
    }

    const inFlight = pollsInFlightRef.current.get(roomId);
    if (inFlight) {
      devPerfCount('Connect:fetchPolls_skipped_inflight');
      await inFlight;
      devPerfEnd('Connect:fetchPolls', perfStart, { roomId, mode: 'skipped_inflight' });
      return;
    }

    const run = (async () => {
    try {
      const { data, error } = await supabase
        .from('chat_polls')
        .select(CONNECT_CHAT_POLLS_WITH_VOTES)
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
    })();
    pollsInFlightRef.current.set(roomId, run);
    try {
      await run;
      pollsLastFetchAtRef.current.set(roomId, Date.now());
    } finally {
      if (pollsInFlightRef.current.get(roomId) === run) {
        pollsInFlightRef.current.delete(roomId);
      }
      devPerfEnd('Connect:fetchPolls', perfStart, { roomId });
    }
  };

  const subscribeToPolls = (roomId: string) => {
    const debouncedPolls = createTrailingDebounce(() => {
      void fetchPolls(roomId);
    }, 900);

    const channel = supabase
      .channel(`polls:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_poll_votes' }, () => debouncedPolls.schedule())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_polls' }, () => debouncedPolls.schedule())
      .subscribe();
    return () => {
      debouncedPolls.cancel();
      supabase.removeChannel(channel);
    };
  };

  const fetchStories = async () => {
    const perfStart = devPerfStart('Connect:fetchStories');
    devPerfCount('Connect:fetchStories_calls');
    try {
      const { data, error } = await supabase
        .from('chat_stories')
        .select(CONNECT_CHAT_STORIES_COLUMNS)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar stories:', error);
    } finally {
      devPerfEnd('Connect:fetchStories', perfStart);
    }
  };

  const subscribeToStories = () => {
    const debouncedStories = createTrailingDebounce(() => {
      void fetchStories();
    }, 1200);

    const channel = supabase
      .channel('chat_stories_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_stories' }, () => debouncedStories.schedule())
      .subscribe();
    return () => {
      debouncedStories.cancel();
      supabase.removeChannel(channel);
    };
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
        .select(CONNECT_USER_PERSONA_SHARE_COLUMNS)
        .eq('id', targetUserId)
        .single();

      if (profileError) throw profileError;

      await postChatMessageDb({
        roomId: activeRoom.id,
        content: `Compartilhou o contato de ${targetProfile.full_name || 'Colega'}`,
        sharedProfileId: targetUserId,
      });
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
    if (activeRoom.is_group && !canCreateGroupPoll(activeRoom, userId, participants)) {
      toast.error('Não tem permissão para criar enquetes neste grupo');
      return;
    }

    try {
      const { error: pollRpcError } = await supabase.rpc('create_chat_poll_message', {
        p_room_id: activeRoom.id,
        p_sender_id: userId,
        p_sender_name: userName,
        p_question: pollQuestion,
        p_options: pollOptions.filter((o) => o.trim()),
      });
      if (pollRpcError) throw pollRpcError;

      toast.success('Enquete criada!');
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
    } catch (error: any) {
      logConnectError('poll', 'create_poll_failed', error, { roomId: activeRoom.id });
      toast.error(
        String(error?.message || '').includes('not allowed to create poll')
          ? 'Sem permissão para criar enquete'
          : 'Erro ao criar enquete'
      );
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
      logConnectError('poll', 'vote_failed', error, { pollId });
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
        .select(CONNECT_CHAT_REACTIONS_COLUMNS)
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
      await postChatMessageDb({
        roomId: targetRoomId,
        content: clampUtf16(stripControlChars(forwardingMessage.content ?? ''), MAX_CHAT_MESSAGE_CHARS),
        attachmentUrl: forwardingMessage.attachment_url ?? null,
        attachmentName: forwardingMessage.attachment_name ?? null,
        attachmentType: forwardingMessage.attachment_type ?? null,
        isForwarded: true,
        forwardedFromName: forwardingMessage.sender_name,
      });
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
        devPerfCount('Connect:realtime_room_chat_messages_insert');
        const newMsg = payload.new as ChatMessage;
        addMessage(roomId, newMsg);

        if (
          newMsg.sender_id === userId &&
          typeof newMsg.content === 'string' &&
          newMsg.content.startsWith('🔔 Lembrete')
        ) {
          try {
            if (
              typeof Notification !== 'undefined' &&
              Notification.permission === 'granted' &&
              document.visibilityState === 'hidden'
            ) {
              new Notification('Lembrete', {
                body: newMsg.content.slice(0, 200),
                tag: newMsg.id,
              });
            }
          } catch {
            /* ignore */
          }
        }

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
        devPerfCount('Connect:realtime_room_chat_messages_update');
        updateMessage(roomId, payload.new as ChatMessage);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_participants',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        devPerfCount('Connect:realtime_room_chat_participants_update');
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
      logConnectError('upload', 'recording_start_failed', error, {});
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
      if (audioBlob.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`Áudio demasiado grande. Tamanho máximo: ${formatMaxMegabytes()} MB.`);
        return;
      }
      const fileName = `audio_${Date.now()}.webm`;
      const filePath = `${userId}/${activeRoom.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(filePath);

      await postChatMessageDb({
        roomId: activeRoom.id,
        content: 'Mensagem de voz',
        messageType: 'audio',
        attachmentUrl: publicUrl,
        attachmentName: 'audio_message.webm',
        attachmentType: 'audio',
        isVanish: isVanishMode,
        expiresAt: isVanishMode ? vanishExpiresAtIso(vanishDurationId) : null,
      });

      setAudioUrl(null);
      audioChunksRef.current = [];
    } catch (error: any) {
      logConnectError('upload', 'audio_send_failed', error, { roomId: activeRoom.id });
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

  const generateLinkPreview = async (url: string): Promise<ChatMessage['link_preview'] | null> => {
    const canonical = sanitizeChatHttpUrl(url);
    if (!canonical) return null;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Extraia metadados para este link: ${canonical}. Retorne um JSON com title, description e image (URL https da imagem, ou vazio). Se for um site jurídico brasileiro (STF, Jusbrasil, etc), forneça uma descrição técnica e formal.`,
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

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(response.text || '{}') as Record<string, unknown>;
      } catch {
        return null;
      }

      let preview = normalizeLinkPreviewForStorage(parsed, canonical);
      preview = applyYoutubePreviewImage(preview, canonical);
      return preview;
    } catch (error) {
      console.error('Erro ao gerar preview do link:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!activeRoom) return;

    const inThread = Boolean(activeThreadRoot);
    const messageContent = stripControlChars((inThread ? threadComposerDraft : newMessage).trim());
    if (!messageContent) return;
    if (messageContent.length > MAX_CHAT_MESSAGE_CHARS) {
      toast.error(`Mensagem demasiado longa (máx. ${MAX_CHAT_MESSAGE_CHARS} caracteres).`);
      return;
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = messageContent.match(urlRegex);
    let linkPreview: ChatMessage['link_preview'] | null = null;
    if (urls?.length) {
      const safeFirst = sanitizeChatHttpUrl(urls[0]);
      if (safeFirst) {
        linkPreview = await generateLinkPreview(safeFirst);
      }
    }

    if (editingMessage) {
      try {
        const safePreviewUpdate = linkPreview ? sanitizeLinkPreviewForRpc(linkPreview) : null;
        const { error } = await supabase
          .from('chat_messages')
          .update({ 
            content: clampUtf16(messageContent, MAX_CHAT_MESSAGE_CHARS),
            link_preview: safePreviewUpdate
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
    const currentReply = inThread ? threadReplyingTo : replyingTo;

    const optimisticMsg: ChatMessage = {
      id: tempId,
      room_id: activeRoom.id,
      sender_id: userId,
      sender_name: userName,
      content: messageContent,
      message_type: 'text',
      status: 'sending',
      created_at: new Date().toISOString(),
      reply_to_id: currentReply?.id || null,
      reply_to_content: currentReply?.content || null,
      reply_to_sender_name: currentReply?.sender_name || null,
      link_preview: linkPreview,
      is_vanish: isVanishMode,
      expires_at: isVanishMode ? vanishExpiresAtIso(vanishDurationId) : null,
      thread_root_id: inThread ? activeThreadRoot!.id : null,
    };

    addMessage(activeRoom.id, optimisticMsg);
    if (inThread) {
      setThreadComposerDraft('');
      setThreadReplyingTo(null);
    } else {
      setNewMessage('');
      setReplyingTo(null);
    }

    const pendingText: ChatMessagePendingSendText = {
      kind: 'text',
      content: messageContent,
      replyToId: currentReply?.id || null,
      replyToContent: currentReply?.content || null,
      replyToSenderName: currentReply?.sender_name || null,
      linkPreview: linkPreview ?? null,
      isVanish: isVanishMode,
      expiresAt: isVanishMode ? vanishExpiresAtIso(vanishDurationId) : null,
      threadRootId: inThread ? activeThreadRoot!.id : null,
    };

    try {
      const insertedMsg = await withChatSendRetries(() =>
        postChatMessageDb({
          roomId: activeRoom.id,
          content: messageContent,
          messageType: 'text',
          replyToId: currentReply?.id || null,
          replyToContent: currentReply?.content || null,
          replyToSenderName: currentReply?.sender_name || null,
          linkPreview: linkPreview ?? null,
          isVanish: isVanishMode,
          expiresAt: isVanishMode ? vanishExpiresAtIso(vanishDurationId) : null,
          threadRootId: inThread ? activeThreadRoot!.id : null,
        })
      );

      removeMessage(activeRoom.id, tempId);
      if (insertedMsg) {
        addMessage(activeRoom.id, insertedMsg);
      }
    } catch (error: any) {
      logConnectError('messages', 'send_text_failed', error, { roomId: activeRoom.id });
      patchMessage(activeRoom.id, tempId, {
        status: 'failed',
        send_error: error?.message || 'Erro ao enviar',
        pending_send: pendingText,
      });
      toast.error('Não foi possível enviar após várias tentativas. Pode reenviar.');
    }
  };

  const resendChatMessage = async (msg: ChatMessage) => {
    if (!activeRoomId || msg.sender_id !== userId) return;
    if (msg.room_id !== activeRoomId) return;
    if (msg.status !== 'failed' || !msg.pending_send) return;
    const roomId = activeRoomId;

    if (msg.pending_send.kind === 'text') {
      const p = msg.pending_send;
      patchMessage(roomId, msg.id, { status: 'sending', send_error: undefined });
      try {
        const insertedMsg = await withChatSendRetries(() =>
          postChatMessageDb({
            roomId,
            content: p.content,
            messageType: 'text',
            replyToId: p.replyToId,
            replyToContent: p.replyToContent,
            replyToSenderName: p.replyToSenderName,
            linkPreview: p.linkPreview ?? null,
            isVanish: p.isVanish,
            expiresAt: p.expiresAt,
            threadRootId: p.threadRootId,
          })
        );
        removeMessage(roomId, msg.id);
        if (insertedMsg) addMessage(roomId, insertedMsg);
        toast.success('Mensagem enviada');
      } catch (error: any) {
        logConnectError('messages', 'resend_text_failed', error, { roomId });
        patchMessage(roomId, msg.id, {
          status: 'failed',
          send_error: error?.message || 'Falha ao reenviar',
        });
        toast.error('Não foi possível reenviar');
      }
      return;
    }

    const file = pendingFileByClientIdRef.current.get(msg.id);
    if (!file) {
      toast.error('Não é possível reenviar: o ficheiro já não está em memória. Envie outra vez pelo clipe.');
      return;
    }

    if (attachmentTooLarge(file)) {
      toast.error(`Ficheiro demasiado grande. Tamanho máximo: ${formatMaxMegabytes()} MB.`);
      return;
    }
    const resendDisplayName = sanitizeAttachmentDisplayName(file.name);

    patchMessage(roomId, msg.id, {
      status: 'sending',
      send_error: undefined,
      content: `Enviando arquivo: ${resendDisplayName}`,
    });
    setUploading(true);
    try {
      const insertedMsg = await withChatSendRetries(async () => {
        const fileExt = file.name.split('.').pop();
        const storageName = `${Math.random()}.${fileExt}`;
        const filePath = `chat/${roomId}/${storageName}`;
        const { error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const {
          data: { publicUrl },
        } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);
        const ins = await postChatMessageDb({
          roomId,
          content: `Enviou um arquivo: ${resendDisplayName}`,
          attachmentUrl: publicUrl,
          attachmentName: resendDisplayName,
          attachmentType: file.type,
        });
        if (!ins) throw new Error('Resposta vazia');
        return ins;
      });
      pendingFileByClientIdRef.current.delete(msg.id);
      removeMessage(roomId, msg.id);
      addMessage(roomId, insertedMsg);
      toast.success('Arquivo enviado!');
    } catch (error: any) {
      logConnectError('upload', 'resend_file_failed', error, { roomId, fileName: resendDisplayName });
      pendingFileByClientIdRef.current.set(msg.id, file);
      patchMessage(roomId, msg.id, {
        status: 'failed',
        send_error: error?.message || 'Falha',
        content: `Falha ao enviar: ${resendDisplayName}`,
        pending_send: { kind: 'file', fileName: resendDisplayName, fileType: file.type },
      });
      toast.error('Erro ao reenviar arquivo');
    } finally {
      setUploading(false);
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
        .select(CONNECT_CHAT_CALLS_FULL_COLUMNS)
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
      logConnectError('call', 'start_call_failed', error, {
        roomId: activeRoom.id,
        receiverId,
        type,
      });
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
      logConnectError('call', 'accept_call_failed', error, {
        callId: incomingCall.id,
        type: incomingCall.type,
      });
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

  // Listen for calls (filtered — avoid receiving every row in chat_calls)
  useEffect(() => {
    if (!userId) return;

    const onCallRow = async (payload: {
      eventType: string;
      new: Record<string, unknown>;
    }) => {
      const call = payload.new as any;

      if (payload.eventType === 'INSERT' && call.receiver_id === userId && call.status === 'ringing') {
        const { data: callerProfile } = await supabase
          .from('user_persona')
          .select('nome, avatar_url')
          .eq('id', call.caller_id)
          .single();

        setIncomingCall({
          ...call,
          caller_name: callerProfile?.nome || 'Colega',
          caller_avatar: callerProfile?.avatar_url,
        });
      }

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
    };

    const channel = supabase
      .channel('chat_calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_calls',
          filter: `caller_id=eq.${userId}`,
        },
        (payload) => {
          devPerfCount('Connect:realtime_call_overlay_caller');
          void onCallRow(payload as { eventType: string; new: Record<string, unknown> });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_calls',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          devPerfCount('Connect:realtime_call_overlay_receiver');
          void onCallRow(payload as { eventType: string; new: Record<string, unknown> });
        }
      )
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
    if (msgId.startsWith('temp-')) {
      if (activeRoomId) {
        pendingFileByClientIdRef.current.delete(msgId);
        removeMessage(activeRoomId, msgId);
      }
      return;
    }
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
        .select(CONNECT_FRIENDSHIPS_COLUMNS)
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
            .select(CONNECT_CHAT_ROOMS_COLUMNS)
            .eq('id', roomId)
            .single();
          
          if (!fetchError && fetchedRoom) {
            setRooms(prev => [fetchedRoom, ...prev]);
            setActiveRoom(fetchedRoom);
            setShowNewChatModal(false);
            // Fetch participants for this room specifically
            const { data: pData } = await supabase
              .from('chat_participants')
              .select(CONNECT_CHAT_PARTICIPANTS_COLUMNS)
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
        .select(CONNECT_CHAT_ROOMS_COLUMNS)
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
    e.target.value = '';

    if (attachmentTooLarge(file)) {
      toast.error(`Ficheiro demasiado grande. Tamanho máximo: ${formatMaxMegabytes()} MB.`);
      return;
    }

    const displayName = sanitizeAttachmentDisplayName(file.name);

    const tempId = `temp-${Date.now()}`;
    pendingFileByClientIdRef.current.set(tempId, file);

    const optimisticMsg: ChatMessage = {
      id: tempId,
      room_id: activeRoom.id,
      sender_id: userId,
      sender_name: userName,
      content: `Enviando arquivo: ${displayName}`,
      attachment_name: displayName,
      attachment_type: file.type,
      message_type: 'file',
      status: 'sending',
      created_at: new Date().toISOString(),
    };

    addMessage(activeRoom.id, optimisticMsg);
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 8));
    }, 200);

    try {
      const insertedMsg = await withChatSendRetries(async () => {
        const fileExt = file.name.split('.').pop();
        const storageName = `${Math.random()}.${fileExt}`;
        const filePath = `chat/${activeRoom.id}/${storageName}`;
        const { error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const {
          data: { publicUrl },
        } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);
        const ins = await postChatMessageDb({
          roomId: activeRoom.id,
          content: `Enviou um arquivo: ${displayName}`,
          attachmentUrl: publicUrl,
          attachmentName: displayName,
          attachmentType: file.type,
        });
        if (!ins) throw new Error('Resposta vazia');
        return ins;
      });

      removeMessage(activeRoom.id, tempId);
      pendingFileByClientIdRef.current.delete(tempId);
      addMessage(activeRoom.id, insertedMsg);
      setUploadProgress(100);
      toast.success('Arquivo enviado!');
    } catch (error: any) {
      logConnectError('upload', 'file_upload_failed', error, {
        roomId: activeRoom.id,
        fileName: file.name,
      });
      patchMessage(activeRoom.id, tempId, {
        status: 'failed',
        send_error: error?.message || 'Erro',
        pending_send: { kind: 'file', fileName: displayName, fileType: file.type },
        content: `Falha ao enviar: ${displayName}`,
      });
      toast.error('Não foi possível enviar o arquivo após várias tentativas. Pode reenviar.');
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setUploadProgress(0);
    }
  };


  const updateGroupInfo = async () => {
    if (!activeRoom || !activeRoom.is_group) return;
    try {
      const { error } = await supabase.rpc('group_update_room_info', {
        p_room_id: activeRoom.id,
        p_name: editingGroupName,
        p_avatar_url: editingGroupAvatar,
      });
      if (error) throw error;
      toast.success('Grupo atualizado!');
      fetchRooms();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message?.includes('not allowed') ? 'Sem permissão para editar o grupo' : 'Erro ao atualizar grupo');
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
    if (!activeRoom || !activeRoom.is_group) return;

    if (!confirm('Tem certeza que deseja excluir este grupo permanentemente?')) return;

    try {
      const { error } = await supabase.rpc('group_delete_room', { p_room_id: activeRoom.id });
      if (error) throw error;

      toast.success('Grupo excluído com sucesso');
      setActiveRoom(null);
      setShowGroupInfoModal(false);
      fetchRooms();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast.error(
        error?.message?.includes('only owner') ? 'Apenas o dono pode excluir o grupo' : 'Erro ao excluir grupo'
      );
    }
  };

  const removeParticipant = async (pUserId: string) => {
    if (!activeRoom?.is_group) return;
    try {
      const { error } = await supabase.rpc('group_remove_member', {
        p_room_id: activeRoom.id,
        p_target_user_id: pUserId,
      });
      if (error) throw error;
      toast.success('Participante removido');
      setParticipants((prev) => ({
        ...prev,
        [activeRoom.id]: (prev[activeRoom.id] || []).filter((p) => p.user_id !== pUserId),
      }));
      fetchRooms();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.message?.includes('not allowed') ? 'Sem permissão para remover este membro' : 'Erro ao remover participante'
      );
    }
  };

  const addParticipant = async (targetUser: any) => {
    if (!activeRoom?.is_group) return;
    try {
      const { error } = await supabase.rpc('group_add_member', {
        p_room_id: activeRoom.id,
        p_target_user_id: targetUser.id,
        p_target_user_name: targetUser.persona_data?.nome || 'Usuário',
      });
      if (error) throw error;
      toast.success(
        activeRoom.require_join_approval ? 'Pedido de entrada enviado ao grupo' : 'Participante adicionado'
      );
      fetchRooms();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.message?.includes('not allowed')
          ? 'Sem permissão para adicionar membros'
          : 'Erro ao adicionar participante'
      );
    }
  };

  const approveGroupJoin = async (targetUserId: string) => {
    if (!activeRoom?.is_group) return;
    try {
      const { error } = await supabase.rpc('group_approve_join', {
        p_room_id: activeRoom.id,
        p_target_user_id: targetUserId,
      });
      if (error) throw error;
      toast.success('Entrada aprovada');
      fetchRooms();
    } catch (error: any) {
      console.error(error);
      toast.error('Não foi possível aprovar');
    }
  };

  const rejectGroupJoin = async (targetUserId: string) => {
    if (!activeRoom?.is_group) return;
    try {
      const { error } = await supabase.rpc('group_reject_join', {
        p_room_id: activeRoom.id,
        p_target_user_id: targetUserId,
      });
      if (error) throw error;
      toast.success('Pedido rejeitado');
      fetchRooms();
    } catch (error: any) {
      console.error(error);
      toast.error('Não foi possível rejeitar');
    }
  };

  const setParticipantGroupRole = async (targetUserId: string, role: 'member' | 'co_admin') => {
    if (!activeRoom?.is_group) return;
    try {
      const { error } = await supabase.rpc('group_set_participant_role', {
        p_room_id: activeRoom.id,
        p_target_user_id: targetUserId,
        p_role: role,
      });
      if (error) throw error;
      toast.success(role === 'co_admin' ? 'Co-admin promovido' : 'Membro rebaixado');
      fetchRooms();
    } catch (error: any) {
      console.error(error);
      toast.error('Não foi possível alterar o papel');
    }
  };

  const patchGroupModeration = async (patch: Partial<GroupModerationSettings>) => {
    if (!activeRoom?.is_group) return;
    try {
      const { error } = await supabase.rpc('group_update_moderation_settings', {
        p_room_id: activeRoom.id,
        p_patch: patch as Record<string, unknown>,
      });
      if (error) throw error;
      fetchRooms();
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao guardar permissões');
    }
  };

  const setGroupRequireJoinApproval = async (value: boolean) => {
    if (!activeRoom?.is_group) return;
    try {
      const { error } = await supabase.rpc('group_set_require_join_approval', {
        p_room_id: activeRoom.id,
        p_require: value,
      });
      if (error) throw error;
      fetchRooms();
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao atualizar política de entrada');
    }
  };


  return (
    <div className="flex min-h-0 w-full max-w-[100%] bg-white dark:bg-[#0a0a0a] md:rounded-[2rem] border-0 md:border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl relative h-[calc(100dvh-6rem)] max-md:h-[calc(100dvh-4.5rem)]">
      
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
        typingStatus={typingStatus}
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
      <div className={`flex-1 flex flex-col bg-white dark:bg-[#0a0a0a] relative min-h-0 ${activeRoom ? 'flex' : 'hidden md:flex'}`}>
        {activeRoom ? (
          <>
            {/* CHAT HEADER */}
            <div className="p-3 md:p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#1a1a1a]">
              <div className="flex items-center gap-2 md:gap-3 overflow-hidden min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setActiveRoom(null)}
                  className={`md:hidden p-2 -ml-2 text-slate-500 ${FOCUS_RING_ROUND}`}
                  aria-label="Voltar à lista de conversas"
                >
                  <ChevronLeft size={24} aria-hidden />
                </button>
                <button
                  type="button"
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
                  className={`flex items-center gap-2 md:gap-3 min-w-0 overflow-hidden rounded-xl p-0.5 -m-0.5 text-left ${FOCUS_RING}`}
                  aria-label={
                    activeRoom.is_group
                      ? `Abrir informações do grupo ${getChatName(activeRoom)}`
                      : `Ver perfil de ${getChatName(activeRoom)}`
                  }
                >
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border-2 border-transparent hover:border-blue-500 transition-all pointer-events-none">
                    {getChatAvatar(activeRoom) ? (
                      <img src={getChatAvatar(activeRoom)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="text-slate-400" size={20} aria-hidden />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 pointer-events-none">
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
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                {!activeRoom.is_group && (
                  <>
                    <button
                      type="button"
                      onClick={() => startCall('audio')}
                      className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-blue-500 dark:hover:bg-white/5 ${FOCUS_RING_ROUND}`}
                      title="Chamada de áudio"
                      aria-label="Iniciar chamada de áudio"
                    >
                      <Phone size={20} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => startCall('video')}
                      className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-blue-500 dark:hover:bg-white/5 ${FOCUS_RING_ROUND}`}
                      title="Chamada de vídeo"
                      aria-label="Iniciar chamada de vídeo"
                    >
                      <Video size={20} aria-hidden />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowInternalSearch(!showInternalSearch)}
                  className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-colors touch-manipulation ${FOCUS_RING_ROUND} ${showInternalSearch ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  title="Buscar na conversa (Ctrl+K ou Cmd+K)"
                  aria-label="Buscar na conversa. Atalho: Control K ou Command K"
                >
                  <Search size={20} aria-hidden />
                </button>

                <div className="hidden items-center gap-1 md:flex">
                  <button
                    type="button"
                    onClick={() => setShowStarredOnly(!showStarredOnly)}
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors ${FOCUS_RING_ROUND} ${showStarredOnly ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'text-slate-400'}`}
                    title="Só mensagens favoritas"
                    aria-label={showStarredOnly ? 'Mostrar todas as mensagens' : 'Mostrar só mensagens favoritas'}
                  >
                    <Star size={20} fill={showStarredOnly ? 'currentColor' : 'none'} aria-hidden />
                  </button>

                  {activeRoom.is_group && canCreateGroupPoll(activeRoom, userId, participants) && (
                    <button
                      type="button"
                      onClick={() => setShowPollModal(true)}
                      className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 ${FOCUS_RING_ROUND}`}
                      title="Criar enquete"
                      aria-label="Criar enquete"
                    >
                      <BarChart2 size={20} aria-hidden />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowMediaGallery(true)}
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 ${FOCUS_RING_ROUND}`}
                    title="Galeria de mídia"
                    aria-label="Abrir galeria de mídia"
                  >
                    <LayoutGrid size={20} aria-hidden />
                  </button>

                  <div className="relative group/mute">
                    <button
                      type="button"
                      className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors ${FOCUS_RING_ROUND} ${participants[activeRoom.id]?.find(p => p.user_id === userId)?.muted_until ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-slate-400'}`}
                      title="Silenciar notificações"
                      aria-label={
                        participants[activeRoom.id]?.find(p => p.user_id === userId)?.muted_until
                          ? 'Conversa silenciada. Abrir opções de duração do silêncio'
                          : 'Silenciar notificações desta conversa'
                      }
                      aria-haspopup="menu"
                    >
                      {participants[activeRoom.id]?.find(p => p.user_id === userId)?.muted_until ? (
                        <VolumeX size={20} aria-hidden />
                      ) : (
                        <Volume2 size={20} aria-hidden />
                      )}
                    </button>
                    <div
                      role="menu"
                      aria-label="Duração do silêncio"
                      className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 rounded-2xl shadow-2xl opacity-0 invisible pointer-events-none group-hover/mute:opacity-100 group-hover/mute:visible group-hover/mute:pointer-events-auto group-focus-within/mute:opacity-100 group-focus-within/mute:visible group-focus-within/mute:pointer-events-auto transition-all z-50 overflow-hidden"
                    >
                      <div className="p-2">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest p-2">Silenciar por...</p>
                        {[
                          { label: '8 Horas', value: '8h' },
                          { label: '1 Semana', value: '1w' },
                          { label: 'Sempre', value: 'forever' },
                          { label: 'Desativar', value: null },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            role="menuitem"
                            onClick={() => muteChat(activeRoom.id, opt.value as any)}
                            className={`w-full text-left p-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors ${FOCUS_RING}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMediaGallery(true)}
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 ${FOCUS_RING_ROUND}`}
                    title="Fotos e imagens"
                    aria-label="Abrir fotos e imagens da conversa"
                  >
                    <ImageIcon size={20} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWallpaperModal(true)}
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 ${FOCUS_RING_ROUND}`}
                    title="Papel de parede"
                    aria-label="Alterar papel de parede do chat"
                  >
                    <Palette size={20} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeRoom.is_group) {
                        setEditingGroupName(activeRoom.name || '');
                        setEditingGroupAvatar(activeRoom.avatar_url || '');
                        setShowGroupInfoModal(true);
                      }
                    }}
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 ${FOCUS_RING_ROUND}`}
                    title="Mais opções"
                    aria-label={activeRoom.is_group ? 'Mais opções do grupo' : 'Mais opções'}
                  >
                    <MoreVertical size={20} aria-hidden />
                  </button>
                </div>

                <div className="relative md:hidden">
                  <button
                    type="button"
                    onClick={() => setChatHeaderMobileMenuOpen((o) => !o)}
                    className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-colors touch-manipulation ${FOCUS_RING_ROUND} ${chatHeaderMobileMenuOpen ? 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                    aria-expanded={chatHeaderMobileMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Mais ações da conversa"
                  >
                    <MoreVertical size={22} aria-hidden />
                  </button>
                  {chatHeaderMobileMenuOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-40 cursor-default bg-transparent"
                        aria-label="Fechar menu"
                        onClick={() => setChatHeaderMobileMenuOpen(false)}
                      />
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-50 mt-1 max-h-[min(70vh,22rem)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/5"
                          onClick={() => {
                            setShowStarredOnly(!showStarredOnly);
                            setChatHeaderMobileMenuOpen(false);
                          }}
                        >
                          <Star size={18} className={showStarredOnly ? 'text-yellow-500' : 'text-slate-400'} fill={showStarredOnly ? 'currentColor' : 'none'} aria-hidden />
                          {showStarredOnly ? 'Mostrar todas as mensagens' : 'Só favoritas'}
                        </button>
                        {activeRoom.is_group && canCreateGroupPoll(activeRoom, userId, participants) && (
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/5"
                            onClick={() => {
                              setShowPollModal(true);
                              setChatHeaderMobileMenuOpen(false);
                            }}
                          >
                            <BarChart2 size={18} className="text-slate-400" aria-hidden />
                            Criar enquete
                          </button>
                        )}
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/5"
                          onClick={() => {
                            setShowMediaGallery(true);
                            setChatHeaderMobileMenuOpen(false);
                          }}
                        >
                          <LayoutGrid size={18} className="text-slate-400" aria-hidden />
                          Galeria de mídia
                        </button>
                        <div className="border-t border-slate-100 px-2 py-2 dark:border-white/10">
                          <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Silenciar</p>
                          {[
                            { label: '8 horas', value: '8h' as const },
                            { label: '1 semana', value: '1w' as const },
                            { label: 'Sempre', value: 'forever' as const },
                            { label: 'Desativar', value: null },
                          ].map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              role="menuitem"
                              className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                              onClick={() => {
                                muteChat(activeRoom.id, opt.value as any);
                                setChatHeaderMobileMenuOpen(false);
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/5"
                          onClick={() => {
                            setShowWallpaperModal(true);
                            setChatHeaderMobileMenuOpen(false);
                          }}
                        >
                          <Palette size={18} className="text-slate-400" aria-hidden />
                          Papel de parede
                        </button>
                        {activeRoom.is_group && (
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/5"
                            onClick={() => {
                              setEditingGroupName(activeRoom.name || '');
                              setEditingGroupAvatar(activeRoom.avatar_url || '');
                              setShowGroupInfoModal(true);
                              setChatHeaderMobileMenuOpen(false);
                            }}
                          >
                            <MoreVertical size={18} className="text-slate-400" aria-hidden />
                            Informações do grupo
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-h-0 relative">
              <div
                className={`relative flex flex-col flex-1 min-h-0 overflow-hidden ${
                  activeThreadRoot ? 'opacity-50 pointer-events-none select-none' : ''
                }`}
              >
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
                  className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5"
                >
                  <div className="px-4 py-2 flex items-center gap-2">
                    <Search size={16} className="text-slate-400 shrink-0" />
                    <input 
                      type="text"
                      placeholder="Texto (conteúdo, anexo, preview de link, nome do autor)…"
                      value={internalSearchQuery}
                      onChange={(e) => setInternalSearchQuery(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200"
                      autoFocus
                    />
                    {hasActiveConversationSearchCriteria(conversationSearchCriteria) && (
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap shrink-0">
                        {internalSearchResultCount} resultado(s)
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setInternalSearchShowAdvanced((v) => !v)}
                      className={`p-1.5 rounded-lg shrink-0 ${FOCUS_RING} ${internalSearchShowAdvanced ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600' : 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500'}`}
                      title="Filtros avançados"
                      aria-expanded={internalSearchShowAdvanced}
                      aria-label="Filtros avançados da busca na conversa"
                    >
                      <Filter size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInternalSearch(false);
                        setInternalSearchQuery('');
                        setInternalSearchSenderId('');
                        setInternalSearchDateFrom('');
                        setInternalSearchDateTo('');
                        setInternalSearchOnlyAttachment(false);
                        setInternalSearchWordMatchMode('all');
                        setInternalSearchShowAdvanced(false);
                      }}
                      className={`p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full shrink-0 ${FOCUS_RING_ROUND}`}
                      aria-label="Fechar busca na conversa"
                    >
                      <X size={16} className="text-slate-500" aria-hidden />
                    </button>
                  </div>
                  <AnimatePresence>
                    {internalSearchShowAdvanced && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-3 pt-0 space-y-2 border-t border-slate-200/80 dark:border-white/5"
                      >
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <label className="text-[9px] font-black uppercase text-slate-500 shrink-0">Autor</label>
                          <select
                            value={internalSearchSenderId}
                            onChange={(e) => setInternalSearchSenderId(e.target.value)}
                            className="flex-1 min-w-[140px] text-xs py-1.5 px-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500"
                          >
                            <option value="">Qualquer pessoa</option>
                            {(participants[activeRoom.id] || []).map((p) => (
                              <option key={p.user_id} value={p.user_id}>
                                {p.user_name || p.user_id}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-[9px] font-black uppercase text-slate-500 w-full sm:w-auto">Período</label>
                          <input
                            type="date"
                            value={internalSearchDateFrom}
                            onChange={(e) => setInternalSearchDateFrom(e.target.value)}
                            className="text-xs py-1.5 px-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10"
                          />
                          <span className="text-[10px] text-slate-400">até</span>
                          <input
                            type="date"
                            value={internalSearchDateTo}
                            onChange={(e) => setInternalSearchDateTo(e.target.value)}
                            className="text-xs py-1.5 px-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={internalSearchOnlyAttachment}
                              onChange={(e) => setInternalSearchOnlyAttachment(e.target.checked)}
                              className="rounded border-slate-300"
                            />
                            Só mensagens com anexo / mídia
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-black uppercase text-slate-500">Palavras no texto</span>
                          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase">
                            <button
                              type="button"
                              onClick={() => setInternalSearchWordMatchMode('all')}
                              className={`px-3 py-1.5 ${internalSearchWordMatchMode === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-black/40 text-slate-600'}`}
                            >
                              Todas
                            </button>
                            <button
                              type="button"
                              onClick={() => setInternalSearchWordMatchMode('any')}
                              className={`px-3 py-1.5 ${internalSearchWordMatchMode === 'any' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-black/40 text-slate-600'}`}
                            >
                              Qualquer
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <MessageList
              messages={messages}
              userId={userId}
              userName={userName}
              activeRoom={activeRoom}
              roomParticipants={participants[activeRoom.id] || []}
              roomSettings={roomSettings}
              hasMoreMessages={hasMoreMessages}
              isLoadingMore={isLoadingMore}
              fetchMessages={fetchMessages}
              conversationSearchCriteria={conversationSearchCriteria}
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
              onOpenThread={setActiveThreadRoot}
              resendMessage={resendChatMessage}
            />

            {groupJoinBlocked && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-white/92 dark:bg-[#0a0a0a]/92 backdrop-blur-sm px-8 text-center">
                <Clock className="w-11 h-11 text-amber-500 shrink-0" strokeWidth={1.5} />
                <p className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Aguardando aprovação
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
                  Um administrador precisa aprovar sua entrada para você ver e enviar mensagens neste grupo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingGroupName(activeRoom.name || '');
                    setEditingGroupAvatar(activeRoom.avatar_url || '');
                    setShowGroupInfoModal(true);
                  }}
                  className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Abrir info do grupo
                </button>
              </div>
            )}

            {pendingScheduled.length > 0 && !groupJoinBlocked && (
              <div className="shrink-0 px-3 py-2 border-t border-amber-200/60 dark:border-amber-500/20 bg-amber-50/90 dark:bg-amber-500/10 max-h-28 overflow-y-auto custom-scrollbar">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-200 mb-1.5">
                  Agendamentos nesta conversa
                </p>
                <ul className="space-y-1.5">
                  {pendingScheduled.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-start justify-between gap-2 text-[10px] text-slate-700 dark:text-slate-200"
                    >
                      <span className="min-w-0 leading-snug">
                        <span className="mr-1">{s.kind === 'reminder' ? '🔔' : '⏰'}</span>
                        {new Date(s.scheduled_at).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                        {' — '}
                        <span className="opacity-90">{s.content.slice(0, 80)}{s.content.length > 80 ? '…' : ''}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void cancelScheduledItem(s.id)}
                        className="shrink-0 font-bold text-red-600 dark:text-red-400 hover:underline"
                      >
                        Cancelar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* INPUT AREA */}
            {!activeThreadRoot && !groupJoinBlocked && (
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
              vanishDurationId={vanishDurationId}
              setVanishDurationId={setVanishDurationId}
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
              onOpenScheduleMessage={() => {
                setScheduleModalKind('scheduled_message');
                setShowScheduleModal(true);
              }}
              onOpenReminder={() => {
                setScheduleModalKind('reminder');
                setShowScheduleModal(true);
              }}
            />
            )}
              </div>

              {activeThreadRoot && (
                <ChatThreadPanel
                  root={activeThreadRoot}
                  rootAuthorLabel={
                    activeThreadRoot.sender_id === userId ? 'Você' : activeThreadRoot.sender_name
                  }
                  onClose={() => {
                    setActiveThreadRoot(null);
                    setThreadComposerDraft('');
                    setThreadReplyingTo(null);
                  }}
                  replyMessages={threadReplyMessages}
                  renderReply={(msg) => (
                    <MessageItem
                      msg={msg}
                      userId={userId}
                      userName={userName}
                      isMe={msg.sender_id === userId}
                      isDeleted={!!msg.is_deleted}
                      activeRoom={activeRoom}
                      roomParticipants={participants[activeRoom.id] || []}
                      starredMessages={starredMessages}
                      toggleStarMessage={toggleStarMessage}
                      showReactionPicker={showReactionPicker}
                      setShowReactionPicker={setShowReactionPicker}
                      addReaction={addReaction}
                      removeReaction={removeReaction}
                      messageReactions={messageReactions}
                      startReplying={(m) => setThreadReplyingTo(m)}
                      setForwardingMessage={setForwardingMessage}
                      setShowForwardModal={setShowForwardModal}
                      startEditing={startEditing}
                      deleteMessage={deleteMessage}
                      openUserProfile={openUserProfile}
                      onNavigate={onNavigate}
                      polls={polls}
                      votePoll={votePoll}
                      createTaskFromMessage={handleCreateTaskFromMessage}
                      threadUiMode="thread"
                      resendMessage={resendChatMessage}
                    />
                  )}
                  threadDraft={threadComposerDraft}
                  setThreadDraft={setThreadComposerDraft}
                  threadReplyingTo={threadReplyingTo}
                  setThreadReplyingTo={setThreadReplyingTo}
                  sendThreadMessage={() => void sendMessage()}
                  handleTyping={handleTyping}
                  isVanishMode={isVanishMode}
                  setIsVanishMode={setIsVanishMode}
                  vanishDurationId={vanishDurationId}
                  setVanishDurationId={setVanishDurationId}
                  userName={userName}
                />
              )}
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
        onApproveJoin={approveGroupJoin}
        onRejectJoin={rejectGroupJoin}
        onSetParticipantRole={setParticipantGroupRole}
        onPatchModeration={patchGroupModeration}
        onSetRequireJoinApproval={setGroupRequireJoinApproval}
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

      <ScheduleChatModal
        show={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        kind={scheduleModalKind}
        roomLabel={activeRoom ? getChatName(activeRoom) : undefined}
        initialMessageText={newMessage}
        replyingTo={replyingTo}
        submitting={scheduleSubmitting}
        onSubmit={handleScheduleSubmit}
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
          onSearch={(q) => void searchGlobalMessages(q)}
          onClose={() => {
            setShowGlobalSearch(false);
            setGlobalSearchQuery('');
            setGlobalSearchResults([]);
            setGlobalSearchSenderName('');
            setGlobalSearchDateFrom('');
            setGlobalSearchDateTo('');
            setGlobalSearchOnlyAttachment(false);
          }}
          onSelectRoom={setActiveRoom}
          getChatName={getChatName}
          senderNameFilter={globalSearchSenderName}
          setSenderNameFilter={setGlobalSearchSenderName}
          dateFrom={globalSearchDateFrom}
          setDateFrom={setGlobalSearchDateFrom}
          dateTo={globalSearchDateTo}
          setDateTo={setGlobalSearchDateTo}
          onlyAttachment={globalSearchOnlyAttachment}
          setOnlyAttachment={setGlobalSearchOnlyAttachment}
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
