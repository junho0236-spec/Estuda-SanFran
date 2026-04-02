import { useEffect } from 'react';

interface UseConnectInitParams {
  userId: string;
  setNotificationPermission: (value: NotificationPermission) => void;
  fetchRooms: () => void;
  fetchUserProfile: () => void;
  fetchStarredMessages: () => void;
  fetchStories: () => void;
  fetchCallHistory: () => void;
  subscribeToAllRooms: () => (() => void) | void;
  subscribeToStories: () => (() => void) | void;
  subscribeToCalls: () => (() => void) | void;
}

export function useConnectInit({
  userId,
  setNotificationPermission,
  fetchRooms,
  fetchUserProfile,
  fetchStarredMessages,
  fetchStories,
  fetchCallHistory,
  subscribeToAllRooms,
  subscribeToStories,
  subscribeToCalls,
}: UseConnectInitParams) {
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrado com sucesso:', reg);
        })
        .catch((err) => {
          console.error('Erro ao registrar Service Worker:', err);
        });
    }

    fetchRooms();
    fetchUserProfile();
    fetchStarredMessages();
    fetchStories();
    fetchCallHistory();

    const unsubscribeRooms = subscribeToAllRooms();
    const unsubscribeStories = subscribeToStories();
    const unsubscribeCalls = subscribeToCalls();

    return () => {
      if (unsubscribeRooms) unsubscribeRooms();
      if (unsubscribeStories) unsubscribeStories();
      if (unsubscribeCalls) unsubscribeCalls();
    };
  }, [userId]);
}
