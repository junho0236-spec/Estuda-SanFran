
import { create } from 'zustand';
import { ChatRoom, ChatMessage, ChatParticipant } from '../../types';

interface ChatState {
  activeRoomId: string | null;
  rooms: ChatRoom[];
  messages: Record<string, ChatMessage[]>;
  participants: Record<string, ChatParticipant[]>;
  userPresence: Record<string, { is_online: boolean; last_seen: string }>;
  pinnedRooms: string[];
  archivedRooms: string[];
  typingStatus: Record<string, string[]>; // roomId -> array of user names typing
  
  setActiveRoomId: (id: string | null) => void;
  setRooms: (rooms: ChatRoom[] | ((prev: ChatRoom[]) => ChatRoom[])) => void;
  updateRoom: (room: ChatRoom) => void;
  setPinnedRooms: (ids: string[]) => void;
  setArchivedRooms: (ids: string[]) => void;
  setMessages: (roomId: string, messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  addMessage: (roomId: string, message: ChatMessage) => void;
  updateMessage: (roomId: string, message: ChatMessage) => void;
  patchMessage: (roomId: string, messageId: string, patch: Partial<ChatMessage>) => void;
  removeMessage: (roomId: string, messageId: string) => void;
  setParticipants: (participants: Record<string, ChatParticipant[]> | ((prev: Record<string, ChatParticipant[]>) => Record<string, ChatParticipant[]>)) => void;
  setRoomParticipants: (roomId: string, participants: ChatParticipant[]) => void;
  setUserPresence: (presence: Record<string, { is_online: boolean; last_seen: string }>) => void;
  updateUserPresence: (userId: string, status: { is_online: boolean; last_seen: string }) => void;
  /** Substitui o mapa de “a digitar” vindo só do Presence (fonte única). */
  setTypingStatusFromPresence: (map: Record<string, string[]>) => void;
  setTypingStatus: (roomId: string, userNames: string[]) => void;
  addTypingUser: (roomId: string, userName: string) => void;
  removeTypingUser: (roomId: string, userName: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeRoomId: null,
  rooms: [],
  messages: {},
  participants: {},
  userPresence: {},
  pinnedRooms: [],
  archivedRooms: [],
  typingStatus: {},

  setActiveRoomId: (id) => set({ activeRoomId: id }),
  setRooms: (rooms) => set((state) => ({ 
    rooms: typeof rooms === 'function' ? rooms(state.rooms) : rooms 
  })),
  updateRoom: (updatedRoom) => set((state) => ({
    rooms: state.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
  })),
  setPinnedRooms: (ids) => set({ pinnedRooms: ids }),
  setArchivedRooms: (ids) => set({ archivedRooms: ids }),
  setMessages: (roomId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [roomId]: typeof messages === 'function' ? messages(state.messages[roomId] || []) : messages
    }
  })),
  addMessage: (roomId, message) => set((state) => {
    const roomMessages = state.messages[roomId] || [];
    if (roomMessages.some(m => m.id === message.id)) return state;
    return {
      messages: { ...state.messages, [roomId]: [...roomMessages, message] },
    };
  }),
  updateMessage: (roomId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [roomId]: (state.messages[roomId] || []).map((m) => (m.id === message.id ? message : m)),
    },
  })),
  patchMessage: (roomId, messageId, patch) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: (state.messages[roomId] || []).map((m) =>
          m.id === messageId ? { ...m, ...patch } : m
        ),
      },
    })),
  removeMessage: (roomId, messageId) => set((state) => ({
    messages: {
      ...state.messages,
      [roomId]: (state.messages[roomId] || []).filter((m) => m.id !== messageId),
    },
  })),
  setParticipants: (participants) => set((state) => ({ 
    participants: typeof participants === 'function' ? participants(state.participants) : participants 
  })),
  setRoomParticipants: (roomId, participants) => set((state) => ({
    participants: { ...state.participants, [roomId]: participants },
  })),
  setUserPresence: (presence) => set({ userPresence: presence }),
  updateUserPresence: (userId, status) => set((state) => ({
    userPresence: { ...state.userPresence, [userId]: status },
  })),
  setTypingStatusFromPresence: (map) => set({ typingStatus: map }),
  setTypingStatus: (roomId, userNames) => set((state) => ({
    typingStatus: { ...state.typingStatus, [roomId]: userNames },
  })),
  addTypingUser: (roomId, userName) => set((state) => {
    const current = state.typingStatus[roomId] || [];
    if (current.includes(userName)) return state;
    return {
      typingStatus: { ...state.typingStatus, [roomId]: [...current, userName] },
    };
  }),
  removeTypingUser: (roomId, userName) => set((state) => ({
    typingStatus: {
      ...state.typingStatus,
      [roomId]: (state.typingStatus[roomId] || []).filter((u) => u !== userName),
    },
  })),
}));
