import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();
  const testMutation = trpc.push.test.useMutation();

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      // Check if already subscribed
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // Subscribe to push
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const json = subscription.toJSON();
        if (json.endpoint && json.keys) {
          await subscribeMutation.mutateAsync({
            endpoint: json.endpoint,
            keys: {
              p256dh: json.keys.p256dh!,
              auth: json.keys.auth!,
            },
          });
          setIsSubscribed(true);

          // Send test notification
          await testMutation.mutateAsync();
        }
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("Error requesting push permission:", error);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, subscribeMutation, testMutation]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await unsubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
    }

    setIsLoading(false);
  }, [isSupported, unsubscribeMutation]);

  return {
    permission,
    isSubscribed,
    isSupported,
    isLoading,
    requestPermission,
    unsubscribe,
  };
}
