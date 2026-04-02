import { useEffect } from 'react';
import type { ChatParticipant } from '../../../types';

interface UseActiveRoomLifecycleParams {
  activeRoomId: string | null;
  participants: Record<string, ChatParticipant[]>;
  userId: string;
  setInternalSearchQuery: (value: string) => void;
  setShowInternalSearch: (value: boolean) => void;
  fetchMessages: (roomId: string) => void;
  fetchReactions: (roomId: string) => void;
  fetchStarredMessages: () => void;
  fetchPolls: (roomId: string) => void;
  subscribeToMessages: (roomId: string) => (() => void) | void;
  subscribeToReactions: (roomId: string) => (() => void) | void;
  subscribeToPolls: (roomId: string) => (() => void) | void;
  markAsRead: (roomId: string) => void;
  fetchOtherUserLastSeen: (otherUserId: string) => void;
}

export function useActiveRoomLifecycle({
  activeRoomId,
  participants,
  userId,
  setInternalSearchQuery,
  setShowInternalSearch,
  fetchMessages,
  fetchReactions,
  fetchStarredMessages,
  fetchPolls,
  subscribeToMessages,
  subscribeToReactions,
  subscribeToPolls,
  markAsRead,
  fetchOtherUserLastSeen,
}: UseActiveRoomLifecycleParams) {
  useEffect(() => {
    if (!activeRoomId) return;

    setInternalSearchQuery('');
    setShowInternalSearch(false);
    fetchMessages(activeRoomId);
    fetchReactions(activeRoomId);
    fetchStarredMessages();
    fetchPolls(activeRoomId);
    const unsubscribeMessages = subscribeToMessages(activeRoomId);
    const unsubscribeReactions = subscribeToReactions(activeRoomId);
    const unsubscribePolls = subscribeToPolls(activeRoomId);
    markAsRead(activeRoomId);

    const otherId = participants[activeRoomId]?.find((p) => p.user_id !== userId)?.user_id;
    if (otherId) {
      fetchOtherUserLastSeen(otherId);
    }

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeReactions) unsubscribeReactions();
      if (unsubscribePolls) unsubscribePolls();
    };
  }, [activeRoomId, participants]);
}
