import { useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../../services/supabaseClient';
import { logConnectError } from '../chatFeatureLog';

type PresenceMeta = {
  user_id?: string;
  name?: string;
  last_seen?: string;
  typing_room_id?: string | null;
};

function typingMapFromPresenceState(
  state: Record<string, PresenceMeta[]>,
  selfUserId: string
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const key of Object.keys(state)) {
    const meta = state[key]?.[0];
    if (!meta?.user_id || meta.user_id === selfUserId) continue;
    if (!meta.typing_room_id) continue;
    const label = (meta.name || '').trim() || 'Alguém';
    const rid = meta.typing_room_id;
    if (!map[rid]) map[rid] = [];
    map[rid].push(label);
  }
  return map;
}

interface UseGlobalChatPresenceParams {
  userId: string;
  userName: string;
  activeRoomId: string | null;
  updateUserPresence: (userId: string, status: { is_online: boolean; last_seen: string }) => void;
  setTypingStatusFromPresence: (map: Record<string, string[]>) => void;
}

/**
 * Fonte única para online + “a digitar”: Supabase Realtime Presence (canal `global_presence`).
 * Não grava `chat_participants.is_typing` nem usa a tabela `user_presence` para a UI.
 */
export function useGlobalChatPresence({
  userId,
  userName,
  activeRoomId,
  updateUserPresence,
  setTypingStatusFromPresence,
}: UseGlobalChatPresenceParams) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingRoomIdRef = useRef<string | null>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribedRef = useRef(false);

  const updatePresenceRef = useRef(updateUserPresence);
  const setTypingFromPresenceRef = useRef(setTypingStatusFromPresence);
  updatePresenceRef.current = updateUserPresence;
  setTypingFromPresenceRef.current = setTypingStatusFromPresence;

  const trackPayload = useCallback(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const ch = channelRef.current;
    if (!ch || !subscribedRef.current || !userId) return;
    void ch
      .track({
        user_id: userId,
        name: userName,
        last_seen: new Date().toISOString(),
        typing_room_id: typingRoomIdRef.current,
      })
      .catch((e) => {
        logConnectError('presence', 'track_failed', e, { userId });
      });
  }, [userId, userName]);

  useEffect(() => {
    if (!userId) return;

    const applyPresenceState = () => {
      const ch = channelRef.current;
      if (!ch) return;
      const state = ch.presenceState() as Record<string, PresenceMeta[]>;
      setTypingFromPresenceRef.current(typingMapFromPresenceState(state, userId));
      Object.keys(state).forEach((key) => {
        const meta = state[key]?.[0];
        if (meta?.user_id) {
          updatePresenceRef.current(meta.user_id, {
            is_online: true,
            last_seen: meta.last_seen || new Date().toISOString(),
          });
        }
      });
    };

    const channel = supabase.channel('global_presence', {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, applyPresenceState)
      .on('presence', { event: 'join' }, applyPresenceState)
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const left = leftPresences[0] as PresenceMeta | undefined;
        if (left?.user_id) {
          updatePresenceRef.current(left.user_id, {
            is_online: false,
            last_seen: new Date().toISOString(),
          });
        }
        applyPresenceState();
      })
      .subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          subscribedRef.current = true;
          typingRoomIdRef.current = null;
          try {
            await channel.track({
              user_id: userId,
              name: userName,
              last_seen: new Date().toISOString(),
              typing_room_id: null,
            });
          } catch (e) {
            logConnectError('presence', 'initial_track_failed', e, { userId });
          }
          applyPresenceState();
        } else {
          subscribedRef.current = false;
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            logConnectError('presence', `subscribe_${status}`, err ?? status, { userId });
          }
        }
      });

    /** ~2.4× fewer presence round-trips than 25s; pauses while tab is hidden (saves Realtime messages). */
    const HEARTBEAT_MS = 60_000;
    let heartbeatId: ReturnType<typeof setInterval> | null = null;

    const clearHeartbeat = () => {
      if (heartbeatId !== null) {
        window.clearInterval(heartbeatId);
        heartbeatId = null;
      }
    };

    const startHeartbeat = () => {
      clearHeartbeat();
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      heartbeatId = window.setInterval(() => trackPayload(), HEARTBEAT_MS);
    };

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        clearHeartbeat();
        return;
      }
      trackPayload();
      startHeartbeat();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    startHeartbeat();

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      clearHeartbeat();
      subscribedRef.current = false;
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [userId, userName, trackPayload]);

  useEffect(() => {
    typingRoomIdRef.current = null;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    isTypingRef.current = false;
    trackPayload();
  }, [activeRoomId, trackPayload]);

  const handleTyping = useCallback(() => {
    if (!activeRoomId || !userId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      typingRoomIdRef.current = activeRoomId;
      trackPayload();
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      typingRoomIdRef.current = null;
      trackPayload();
    }, 3000);
  }, [activeRoomId, userId, trackPayload]);

  return { handleTyping };
}
