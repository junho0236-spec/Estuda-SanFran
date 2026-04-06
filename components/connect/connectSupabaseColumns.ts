/**
 * Column lists for Supabase `.select()` in Connect — avoids `select('*')` payload bloat.
 * Use single string literals (not `.join()`) so `@supabase/supabase-js` infers row types.
 */

export const CONNECT_CHAT_SCHEDULED_ITEMS_COLUMNS =
  'id, room_id, user_id, user_name, kind, content, scheduled_at, status, reply_to_id, reply_to_content, reply_to_sender_name, context_text, created_at, error_text';

export const CONNECT_CHAT_ROOMS_COLUMNS =
  'id, name, is_group, last_message, last_message_at, created_at, updated_at, created_by, avatar_url, category, require_join_approval, moderation_settings';

export const CONNECT_CHAT_PARTICIPANTS_COLUMNS =
  'id, room_id, user_id, user_name, user_avatar, unread_count, is_typing, is_pinned, is_archived, muted_until, category, last_read_at, created_at, group_role, join_status';

/** Rows loaded into the message store and global search (see `post_chat_message` SQL). */
export const CONNECT_CHAT_MESSAGES_COLUMNS =
  'id, room_id, sender_id, sender_name, content, attachment_url, attachment_name, attachment_type, status, created_at, is_edited, is_deleted, reply_to_id, reply_to_content, reply_to_sender_name, thread_root_id, is_forwarded, forwarded_from_name, message_type, shared_profile_id, link_preview, updated_at, is_vanish, expires_at';

export const CONNECT_CHAT_ROOM_SETTINGS_COLUMNS =
  'user_id, room_id, wallpaper_url, wallpaper_color, background_color, updated_at';

export const CONNECT_CHAT_CALLS_LIST_COLUMNS =
  'id, room_id, caller_id, receiver_id, type, status, created_at';

/** Returned row when starting or accepting a call (needs `signaling_data`). */
export const CONNECT_CHAT_CALLS_FULL_COLUMNS =
  'id, room_id, caller_id, receiver_id, type, status, created_at, signaling_data, updated_at';

export const CONNECT_CHAT_STORIES_COLUMNS =
  'id, user_id, user_name, user_avatar, content, type, media_url, created_at, expires_at';

export const CONNECT_CHAT_REACTIONS_COLUMNS = 'id, message_id, user_id, emoji';

export const CONNECT_FRIENDSHIPS_COLUMNS = 'id, user_id, friend_id, status, created_at';

export const CONNECT_USER_PERSONA_SELF_COLUMNS = 'id, bio, avatar_url, full_name, persona_data';

export const CONNECT_USER_PERSONA_DISCOVERY_COLUMNS = 'id, full_name, bio, avatar_url';

export const CONNECT_USER_PERSONA_PEER_COLUMNS = CONNECT_USER_PERSONA_SELF_COLUMNS;

export const CONNECT_USER_PERSONA_SHARE_COLUMNS = 'id, full_name';

export const CONNECT_USER_PERSONA_LAST_SEEN = 'last_seen';

export const CONNECT_USER_PERSONA_CALL_ENRICH_COLUMNS = 'full_name, avatar_url';

/** Polls with room filter and nested votes (keys used in `fetchPolls`). */
export const CONNECT_CHAT_POLLS_WITH_VOTES =
  'id, message_id, question, options, is_closed, created_at, chat_messages!inner(room_id), chat_poll_votes(id,user_id,option_index)';
