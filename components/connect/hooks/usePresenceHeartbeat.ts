import { useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

export function usePresenceHeartbeat(userId: string, userName: string) {
  useEffect(() => {
    if (!userId) return;

    const updateLastSeen = async () => {
      await supabase.from('user_presence').upsert({
        user_id: userId,
        last_seen: new Date().toISOString(),
        name: userName,
      });
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 30000);

    return () => clearInterval(interval);
  }, [userId, userName]);
}
