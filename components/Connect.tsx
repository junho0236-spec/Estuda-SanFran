
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Paperclip, Send, MoreVertical, 
  Check, CheckCheck, User, Image as ImageIcon, 
  FileText, X, ChevronLeft, Loader2, MessageSquare,
  Edit2, Trash2, Reply, CornerUpLeft, Mic, Pin, PinOff,
  Link, File, Play, Pause, Trash, Bell, BellOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { ChatRoom, ChatMessage, ChatParticipant, UserProfile, PresenceUser } from '../types';
import { toast } from 'sonner';

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
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

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
    const unsubscribeRooms = subscribeToAllRooms();
    const unsubscribePresence = subscribeToPresence();
    return () => {
      if (unsubscribeRooms) unsubscribeRooms();
      if (unsubscribePresence) unsubscribePresence();
    };
  }, [userId]);

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
      fetchMessages(activeRoom.id);
      const unsubscribe = subscribeToMessages(activeRoom.id);
      markAsRead(activeRoom.id);
      
      const otherId = participants[activeRoom.id]?.find(p => p.user_id !== userId)?.user_id;
      if (otherId) {
        fetchOtherUserLastSeen(otherId);
      }
      
      return () => {
        if (unsubscribe) unsubscribe();
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

  useEffect(() => {
    scrollToBottom();
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

  const fetchMessages = async (roomId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data || []);
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

  const markAsRead = async (roomId: string) => {
    await supabase
      .from('chat_participants')
      .update({ unread_count: 0, last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', userId);
    
    // Also update message status for others
    await supabase
      .from('chat_messages')
      .update({ status: 'read' })
      .eq('room_id', roomId)
      .neq('sender_id', userId)
      .eq('status', 'delivered');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
          status: 'sent'
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRoom) return;

    const messageContent = newMessage.trim();
    
    if (editingMessage) {
      try {
        const { error } = await supabase
          .from('chat_messages')
          .update({ content: messageContent })
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
          status: 'sent',
          reply_to_id: currentReply?.id || null,
          reply_to_content: currentReply?.content || null,
          reply_to_sender_name: currentReply?.sender_name || null
        })
        .select()
        .single();

      if (error) throw error;

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
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
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

  const filteredRooms = rooms.filter(room => 
    getChatName(room).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-[#0a0a0a] md:rounded-[2rem] border-0 md:border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl relative">
      
      {/* SIDEBAR */}
      <div className={`w-full md:w-[350px] border-r border-slate-200 dark:border-white/5 flex flex-col bg-slate-50/50 dark:bg-black/20 ${activeRoom ? 'hidden md:flex' : 'flex'}`}>
        
        {/* SIDEBAR HEADER */}
        <div className="p-3 md:p-4 flex items-center justify-between bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg text-sm md:text-base">
              {userProfile?.persona_data?.nome?.[0] || userName[0]}
            </div>
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm md:text-base">Connect</h2>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={requestNotificationPermission}
              className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors ${notificationPermission === 'granted' ? 'text-green-500' : 'text-slate-400'}`}
              title={notificationPermission === 'granted' ? 'Notificações Ativas' : 'Ativar Notificações'}
            >
              {notificationPermission === 'granted' ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
            <button 
              onClick={() => { fetchUsers(); setShowNewChatModal(true); }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-blue-600"
            >
              <Plus size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="p-4">
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
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-white dark:hover:bg-white/5 transition-all border-l-4 group relative ${activeRoom?.id === room.id ? 'bg-white dark:bg-white/5 border-blue-500' : 'border-transparent'}`}
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
                </button>
              );
            })
          )}
        </div>
      </div>

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
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
                  onClick={() => {
                    if (activeRoom.is_group) {
                      setEditingGroupName(activeRoom.name || '');
                      setEditingGroupAvatar(activeRoom.avatar_url || '');
                      setShowGroupInfoModal(true);
                    } else if (onNavigate) {
                      const otherId = participants[activeRoom.id]?.find(p => p.user_id !== userId)?.user_id;
                      if (otherId) onNavigate('profile', { userId: otherId });
                    }
                  }}
                >
                  {getChatAvatar(activeRoom) ? (
                    <img src={getChatAvatar(activeRoom)} alt={getChatName(activeRoom)} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-slate-400" size={20} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
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
                <button 
                  onClick={() => setShowInternalSearch(!showInternalSearch)}
                  className={`p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors ${showInternalSearch ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-400'}`}
                  title="Buscar na conversa"
                >
                  <Search size={20} />
                </button>
                <button 
                  onClick={() => setShowMediaGallery(true)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400"
                  title="Galeria de mídia"
                >
                  <ImageIcon size={20} />
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
                  <button onClick={() => { setShowInternalSearch(false); setInternalSearchQuery(''); }} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full">
                    <X size={16} className="text-slate-500" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-black/40">
              {messages
                .filter(msg => !internalSearchQuery || msg.content.toLowerCase().includes(internalSearchQuery.toLowerCase()))
                .map((msg, idx) => {
                const isMe = msg.sender_id === userId;
                const isDeleted = msg.is_deleted;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] group relative ${isMe ? 'items-end' : 'items-start'}`}>
                      
                      {/* MESSAGE OPTIONS (HOVER) */}
                      {!isDeleted && (
                        <div className={`absolute top-0 ${isMe ? '-left-20' : '-right-20'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10 p-1 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-slate-200 dark:border-white/5`}>
                          <button onClick={() => startReplying(msg)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-500" title="Responder">
                            <Reply size={14} />
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
                        
                        {/* REPLY PREVIEW */}
                        {msg.reply_to_id && !isDeleted && (
                          <div className={`mb-2 p-2 rounded-lg border-l-4 text-xs ${isMe ? 'bg-blue-700/50 border-blue-300 text-blue-100' : 'bg-slate-100 dark:bg-white/5 border-blue-500 text-slate-500 dark:text-slate-400'}`}>
                            <p className="font-bold mb-1">{msg.reply_to_sender_name === userName ? 'Você' : msg.reply_to_sender_name}</p>
                            <p className="truncate">{msg.reply_to_content}</p>
                          </div>
                        )}

                        {msg.attachment_url && !isDeleted && (
                          <div className="mb-2">
                            {msg.attachment_type?.startsWith('image/') ? (
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
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                          {msg.is_edited && !isDeleted && <span className="text-[8px] uppercase font-bold mr-1">Editada</span>}
                          <span className="text-[9px]">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <span>
                              {msg.status === 'read' ? (
                                <CheckCheck size={12} className="text-blue-400" />
                              ) : (
                                <Check size={12} className="text-blue-100" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="p-3 md:p-4 bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-white/5">
              
              {/* REPLY/EDIT INDICATOR */}
              <AnimatePresence>
                {(replyingTo || editingMessage) && (
                  <motion.div 
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
                  <div className="flex-1 flex items-center justify-between bg-red-50 dark:bg-red-500/10 p-3 rounded-2xl border border-red-200 dark:border-red-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-500 font-black text-xs uppercase tracking-widest tabular-nums">Gravando: {formatTime(recordingTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                    
                    <div className="flex-1 relative">
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

      {/* NEW CHAT MODAL */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div 
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
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Nova Conversa</h3>
                <button onClick={() => setShowNewChatModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {allUsers.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm">Nenhum usuário encontrado</p>
                ) : (
                  allUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => startNewChat(user)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                        {user.persona_data?.avatar_url ? (
                          <img src={user.persona_data.avatar_url} alt={user.persona_data.nome} className="w-full h-full object-cover" />
                        ) : (
                          <User className="text-slate-400" size={20} />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 dark:text-white">{user.persona_data?.nome || 'Usuário'}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{user.persona_data?.curso || 'Direito'}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* MEDIA GALLERY MODAL */}
        <AnimatePresence>
          {showMediaGallery && activeRoom && (
            <motion.div 
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Connect;
