
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Paperclip, Send, MoreVertical, 
  Check, CheckCheck, User, Image as ImageIcon, 
  FileText, X, ChevronLeft, Loader2, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { ChatRoom, ChatMessage, ChatParticipant, UserProfile } from '../types';
import { toast } from 'sonner';

interface ConnectProps {
  userId: string;
  userName: string;
}

const Connect: React.FC<ConnectProps> = ({ userId, userName }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Record<string, ChatParticipant[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    fetchRooms();
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom.id);
      subscribeToMessages(activeRoom.id);
      markAsRead(activeRoom.id);
    }
  }, [activeRoom]);

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
        .select('room_id')
        .eq('user_id', userId);

      if (participantError) throw participantError;

      if (participantData && participantData.length > 0) {
        const roomIds = participantData.map(p => p.room_id);
        const { data: roomData, error: roomError } = await supabase
          .from('chat_rooms')
          .select('*')
          .in('id', roomIds)
          .order('updated_at', { ascending: false });

        if (roomError) throw roomError;
        setRooms(roomData || []);

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
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
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
        setMessages(prev => [...prev, payload.new as ChatMessage]);
        if (payload.new.sender_id !== userId) {
          markAsRead(roomId);
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRoom) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeRoom.id,
          sender_id: userId,
          sender_name: userName,
          content: messageContent,
          status: 'sent'
        })
        .select()
        .single();

      if (error) throw error;

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

      if (existingRooms && existingRooms.length > 0) {
        const room = rooms.find(r => r.id === existingRooms[0].room_id);
        if (room) {
          setActiveRoom(room);
          setShowNewChatModal(false);
          return;
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
      await supabase.from('chat_participants').insert([
        { room_id: newRoom.id, user_id: userId, user_name: userName },
        { room_id: newRoom.id, user_id: targetUser.id, user_name: targetUser.persona_data?.nome || 'Usuário' }
      ]);

      setRooms(prev => [newRoom, ...prev]);
      setActiveRoom(newRoom);
      setShowNewChatModal(false);
      fetchRooms();
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Erro ao iniciar conversa');
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

      await supabase.from('chat_messages').insert({
        room_id: activeRoom.id,
        sender_id: userId,
        sender_name: userName,
        content: `Enviou um arquivo: ${file.name}`,
        attachment_url: publicUrl,
        attachment_name: file.name,
        attachment_type: file.type,
        status: 'sent'
      });

      toast.success('Arquivo enviado!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const getChatName = (room: ChatRoom) => {
    if (room.is_group) return room.name || 'Grupo';
    const otherParticipant = participants[room.id]?.find(p => p.user_id !== userId);
    return otherParticipant?.user_name || 'Conversa';
  };

  const getChatAvatar = (room: ChatRoom) => {
    if (room.is_group) return null;
    const otherParticipant = participants[room.id]?.find(p => p.user_id !== userId);
    return otherParticipant?.user_avatar;
  };

  const filteredRooms = rooms.filter(room => 
    getChatName(room).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-[#0a0a0a] rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl">
      
      {/* SIDEBAR */}
      <div className="w-full md:w-[350px] border-r border-slate-200 dark:border-white/5 flex flex-col bg-slate-50/50 dark:bg-black/20">
        
        {/* SIDEBAR HEADER */}
        <div className="p-4 flex items-center justify-between bg-white dark:bg-[#1a1a1a] border-bottom border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
              {userProfile?.persona_data?.nome?.[0] || userName[0]}
            </div>
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Connect</h2>
          </div>
          <button 
            onClick={() => { fetchUsers(); setShowNewChatModal(true); }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-blue-600"
          >
            <Plus size={24} />
          </button>
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

              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-white dark:hover:bg-white/5 transition-all border-l-4 ${activeRoom?.id === room.id ? 'bg-white dark:bg-white/5 border-blue-500' : 'border-transparent'}`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {avatar ? (
                      <img src={avatar} alt={chatName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="text-slate-400" size={24} />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{chatName}</h4>
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
                      {unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0a]">
        {activeRoom ? (
          <>
            {/* CHAT HEADER */}
            <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveRoom(null)} className="md:hidden p-2 -ml-2">
                  <ChevronLeft />
                </button>
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                  {getChatAvatar(activeRoom) ? (
                    <img src={getChatAvatar(activeRoom)} alt={getChatName(activeRoom)} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-slate-400" size={20} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white leading-none">{getChatName(activeRoom)}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {participants[activeRoom.id]?.find(p => p.user_id !== userId && p.is_typing) ? (
                      <span className="text-blue-500 italic">digitando...</span>
                    ) : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-black/40">
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === userId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] group ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3 rounded-2xl shadow-sm relative ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white border border-slate-200 dark:border-white/5 rounded-tl-none'}`}>
                        {msg.attachment_url && (
                          <div className="mb-2">
                            {msg.attachment_type?.startsWith('image/') ? (
                              <img src={msg.attachment_url} alt="Anexo" className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity" />
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
                          <span className="text-[9px]">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <span>
                              {msg.status === 'read' ? <CheckCheck size={12} className="text-white" /> : <Check size={12} />}
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
            <div className="p-4 bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-white/5">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
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

                <button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`p-3 rounded-xl transition-all ${newMessage.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}
                >
                  <Send size={20} />
                </button>
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

    </div>
  );
};

export default Connect;
