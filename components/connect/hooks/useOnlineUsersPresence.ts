import { useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

interface PresencePayload {
  is_online: boolean;
  last_seen: string;
}

type UpdateUserPresence = (userId: string, payload: PresencePayload) => void;

export function useOnlineUsersPresence(
  userId: string,
  userName: string,
  updateUserPresence: UpdateUserPresence
) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('global_presence', {
      config: {
        presence: { key: userId },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        Object.keys(state).forEach((key) => {
          const userState = state[key][0] as any;
          if (userState.user_id) {
            updateUserPresence(userState.user_id, {
              is_online: true,
              last_seen: userState.last_seen || new Date().toISOString(),
            });
          }
        });
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const userState = newPresences[0] as any;
        if (userState.user_id) {
          updateUserPresence(userState.user_id, {
            is_online: true,
            last_seen: userState.last_seen || new Date().toISOString(),
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const userState = leftPresences[0] as any;
        if (userState.user_id) {
          updateUserPresence(userState.user_id, {
            is_online: false,
            last_seen: new Date().toISOString(),
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            name: userName,
            last_seen: new Date().toISOString(),
            is_online: true,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userName, updateUserPresence]);
}
