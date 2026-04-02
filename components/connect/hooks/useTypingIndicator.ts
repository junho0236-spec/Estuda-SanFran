import { useRef } from 'react';
import { supabase } from '../../../services/supabaseClient';

export function useTypingIndicator(activeRoomId: string | null, userId: string) {
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = () => {
    if (!activeRoomId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      supabase
        .from('chat_participants')
        .update({ is_typing: true })
        .eq('room_id', activeRoomId)
        .eq('user_id', userId);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      supabase
        .from('chat_participants')
        .update({ is_typing: false })
        .eq('room_id', activeRoomId)
        .eq('user_id', userId);
    }, 3000);
  };

  return { handleTyping };
}
