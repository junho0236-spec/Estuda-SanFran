import type { ChatParticipant, ChatRoom } from '../../types';

export function getTypingUsersForRoom(
  participants: Record<string, ChatParticipant[]>,
  roomId: string,
  userId: string
): string[] {
  const roomParticipants = participants[roomId] || [];
  return roomParticipants
    .filter((p) => p.user_id !== userId && p.is_typing)
    .map((p) => p.user_name)
    .filter(Boolean);
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
