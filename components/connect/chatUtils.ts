import type { ChatMessage, ChatParticipant, ChatRoom } from '../../types';

/** Indicador de digitação vem só do Realtime Presence (`typingStatus` na store). */
export function getTypingUsersForRoom(
  typingStatus: Record<string, string[]>,
  roomId: string
): string[] {
  return typingStatus[roomId] || [];
}

export function getChatNameForRoom(
  room: ChatRoom,
  participants: Record<string, ChatParticipant[]>,
  userId: string
): string {
  if (room.is_group) return room.name || 'Grupo';
  const otherParticipant = participants[room.id]?.find((p) => p.user_id !== userId);
  return otherParticipant?.user_name || 'Conversa';
}

export function getChatAvatarForRoom(
  room: ChatRoom,
  participants: Record<string, ChatParticipant[]>,
  userId: string
): string | undefined {
  if (room.is_group) return room.avatar_url;
  const otherParticipant = participants[room.id]?.find((p) => p.user_id !== userId);
  return otherParticipant?.user_avatar;
}

/** Quem já abriu a conversa depois desta mensagem (usa chat_participants.last_read_at). */
export function getGroupMessageReaders(
  msg: ChatMessage,
  roomParticipants: ChatParticipant[]
): { userId: string; name: string }[] {
  if (!msg?.created_at || !roomParticipants?.length) return [];
  const msgTime = new Date(msg.created_at).getTime();
  return roomParticipants
    .filter((p) => {
      if (p.user_id === msg.sender_id) return false;
      if (!p.last_read_at) return false;
      return new Date(p.last_read_at).getTime() >= msgTime;
    })
    .map((p) => ({ userId: p.user_id, name: (p.user_name || '').trim() || 'Colega' }));
}

export function formatGroupReadReceiptLabel(
  readers: { name: string }[],
  maxNames = 3
): string {
  if (readers.length === 0) return 'Aguardando leitura';
  const names = readers.map((r) => r.name);
  if (names.length <= maxNames) return `Lido por: ${names.join(', ')}`;
  return `Lido por: ${names.slice(0, maxNames).join(', ')} e mais ${names.length - maxNames}`;
}
