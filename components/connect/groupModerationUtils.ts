import type { ChatParticipant, ChatRoom } from '../../types';

export type GroupRole = 'member' | 'co_admin' | 'admin';

export interface GroupModerationSettings {
  members_can_poll: boolean;
  co_admins_can_add_member: boolean;
  co_admins_can_remove_member: boolean;
  co_admins_can_edit_info: boolean;
  co_admins_can_moderate_joins: boolean;
}

export const DEFAULT_GROUP_MODERATION_SETTINGS: GroupModerationSettings = {
  members_can_poll: true,
  co_admins_can_add_member: true,
  co_admins_can_remove_member: true,
  co_admins_can_edit_info: false,
  co_admins_can_moderate_joins: true,
};

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

export function parseModerationSettings(room: ChatRoom): GroupModerationSettings {
  const raw = room.moderation_settings;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_GROUP_MODERATION_SETTINGS };
  const o = raw as Record<string, unknown>;
  return {
    members_can_poll: asBool(o.members_can_poll, DEFAULT_GROUP_MODERATION_SETTINGS.members_can_poll),
    co_admins_can_add_member: asBool(
      o.co_admins_can_add_member,
      DEFAULT_GROUP_MODERATION_SETTINGS.co_admins_can_add_member
    ),
    co_admins_can_remove_member: asBool(
      o.co_admins_can_remove_member,
      DEFAULT_GROUP_MODERATION_SETTINGS.co_admins_can_remove_member
    ),
    co_admins_can_edit_info: asBool(
      o.co_admins_can_edit_info,
      DEFAULT_GROUP_MODERATION_SETTINGS.co_admins_can_edit_info
    ),
    co_admins_can_moderate_joins: asBool(
      o.co_admins_can_moderate_joins,
      DEFAULT_GROUP_MODERATION_SETTINGS.co_admins_can_moderate_joins
    ),
  };
}

export function getMeParticipant(
  roomId: string,
  userId: string,
  participants: Record<string, ChatParticipant[]>
): ChatParticipant | undefined {
  return participants[roomId]?.find((p) => p.user_id === userId);
}

export function getGroupRole(
  room: ChatRoom,
  userId: string,
  participants: Record<string, ChatParticipant[]>
): GroupRole {
  const p = getMeParticipant(room.id, userId, participants);
  const r = (p?.group_role as GroupRole | undefined) || 'member';
  if (r === 'admin' || r === 'co_admin' || r === 'member') return r;
  return 'member';
}

export function isGroupOwner(room: ChatRoom, userId: string, participants: Record<string, ChatParticipant[]>): boolean {
  if (!room.is_group) return false;
  if (room.created_by && room.created_by === userId) return true;
  return getGroupRole(room, userId, participants) === 'admin';
}

export function isCoAdminOrOwner(
  room: ChatRoom,
  userId: string,
  participants: Record<string, ChatParticipant[]>
): boolean {
  if (!room.is_group) return false;
  if (isGroupOwner(room, userId, participants)) return true;
  return getGroupRole(room, userId, participants) === 'co_admin';
}

export function joinStatusForUser(
  roomId: string,
  userId: string,
  participants: Record<string, ChatParticipant[]>
): 'active' | 'pending' {
  const p = getMeParticipant(roomId, userId, participants);
  const s = p?.join_status;
  if (s === 'pending') return 'pending';
  return 'active';
}

export function canEditGroupInfo(
  room: ChatRoom,
  userId: string,
  participants: Record<string, ChatParticipant[]>
): boolean {
  if (!room.is_group) return false;
  const settings = parseModerationSettings(room);
  if (isGroupOwner(room, userId, participants)) return true;
  if (getGroupRole(room, userId, participants) === 'co_admin' && settings.co_admins_can_edit_info) return true;
  return false;
}

export function canRemoveParticipant(
  room: ChatRoom,
  actorId: string,
  target: ChatParticipant,
  participants: Record<string, ChatParticipant[]>
): boolean {
  if (!room.is_group || target.user_id === actorId) return false;
  if (room.created_by && target.user_id === room.created_by) return false;
  const settings = parseModerationSettings(room);
  if (isGroupOwner(room, actorId, participants)) return true;
  const actorRole = getGroupRole(room, actorId, participants);
  const targetRole = (target.group_role as GroupRole) || 'member';
  if (
    actorRole === 'co_admin' &&
    settings.co_admins_can_remove_member &&
    targetRole === 'member'
  ) {
    return true;
  }
  return false;
}

export function canAddGroupMember(
  room: ChatRoom,
  userId: string,
  participants: Record<string, ChatParticipant[]>
): boolean {
  if (!room.is_group) return false;
  const settings = parseModerationSettings(room);
  if (joinStatusForUser(room.id, userId, participants) !== 'active') return false;
  if (isGroupOwner(room, userId, participants)) return true;
  if (getGroupRole(room, userId, participants) === 'co_admin' && settings.co_admins_can_add_member) return true;
  return false;
}

export function canCreateGroupPoll(
  room: ChatRoom,
  userId: string,
  participants: Record<string, ChatParticipant[]>
): boolean {
  if (!room.is_group) return false;
  if (joinStatusForUser(room.id, userId, participants) !== 'active') return false;
  const settings = parseModerationSettings(room);
  if (isGroupOwner(room, userId, participants)) return true;
  const role = getGroupRole(room, userId, participants);
  if (role === 'co_admin' || role === 'admin') return true;
  return settings.members_can_poll;
}

export function canDeleteGroup(
  room: ChatRoom,
  userId: string,
  participants: Record<string, ChatParticipant[]>
): boolean {
  return room.is_group && isGroupOwner(room, userId, participants);
}

export function canModerateJoinRequests(
  room: ChatRoom,
  userId: string,
  participants: Record<string, ChatParticipant[]>
): boolean {
  if (!room.is_group || !room.require_join_approval) return false;
  if (joinStatusForUser(room.id, userId, participants) !== 'active') return false;
  const settings = parseModerationSettings(room);
  if (isGroupOwner(room, userId, participants)) return true;
  if (getGroupRole(room, userId, participants) === 'co_admin' && settings.co_admins_can_moderate_joins) return true;
  return false;
}

export function canChangeGroupRoles(
  room: ChatRoom,
  userId: string,
  participants: Record<string, ChatParticipant[]>
): boolean {
  return room.is_group && isGroupOwner(room, userId, participants);
}

export function roleLabel(role: GroupRole | string | undefined): string {
  if (role === 'admin') return 'Admin';
  if (role === 'co_admin') return 'Co-admin';
  return 'Membro';
}
