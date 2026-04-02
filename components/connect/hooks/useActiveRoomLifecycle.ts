import { useEffect } from 'react';

interface UseActiveRoomLifecycleParams {
  activeRoomId: string | null;
  /** Outro utilizador na DM (só para presença); estável enquanto os membros da sala não mudam. */
  activeRoomOtherUserId: string | null;
  /** Membro com join pendente: não carrega mensagens nem subscreve canais. */
  joinBlocked?: boolean;
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
  activeRoomOtherUserId,
  joinBlocked = false,
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

    if (joinBlocked) {
      return;
    }

    fetchMessages(activeRoomId);
    fetchReactions(activeRoomId);
    fetchStarredMessages();
    fetchPolls(activeRoomId);
    const unsubscribeMessages = subscribeToMessages(activeRoomId);
    const unsubscribeReactions = subscribeToReactions(activeRoomId);
    const unsubscribePolls = subscribeToPolls(activeRoomId);
    markAsRead(activeRoomId);

    if (activeRoomOtherUserId) {
      fetchOtherUserLastSeen(activeRoomOtherUserId);
    }

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeReactions) unsubscribeReactions();
      if (unsubscribePolls) unsubscribePolls();
    };
  }, [activeRoomId, activeRoomOtherUserId, joinBlocked]);
}
