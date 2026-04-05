import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface Notification {
  id: string;
  type: "habit" | "task" | "goal" | "water" | "focus" | "xp" | "coin" | "system" | "streak" | "finance";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon: string;
  color: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem("sistema-life-notifications");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem("sistema-life-notifications", JSON.stringify(notifications.slice(0, 100)));
  } catch { /* ignore */ }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotif: Notification = {
      ...n,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 100));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Notificações automáticas do sistema - apenas uma vez por sessão
  useEffect(() => {
    const sessionKey = "sistema-life-session-" + new Date().toDateString();
    if (localStorage.getItem(sessionKey)) return;
    localStorage.setItem(sessionKey, "true");

    const timers = [
      setTimeout(() => {
        addNotification({
          type: "xp",
          title: "Bônus de Login Diário!",
          message: "Você ganhou +5 XP por fazer login hoje. Continue voltando diariamente!",
          icon: "⚡",
          color: "text-red-400",
        });
      }, 1500),
      setTimeout(() => {
        addNotification({
          type: "system",
          title: "Bem-vindo ao Sistema Life!",
          message: "Gerencie seus hábitos, tarefas, metas e finanças. Ganhe XP e suba de nível!",
          icon: "🎮",
          color: "text-purple-400",
        });
      }, 2500),
      setTimeout(() => {
        addNotification({
          type: "habit",
          title: "Hábitos Pendentes",
          message: "Você tem hábitos para completar hoje. Não perca seu streak!",
          icon: "🔥",
          color: "text-orange-400",
        });
      }, 5000),
      setTimeout(() => {
        addNotification({
          type: "water",
          title: "Hora de beber água!",
          message: "Mantenha-se hidratado. Registre sua água no Dashboard.",
          icon: "💧",
          color: "text-cyan-400",
        });
      }, 8000),
      setTimeout(() => {
        addNotification({
          type: "focus",
          title: "Dica: Sessão de Foco",
          message: "Use o timer Pomodoro para manter a concentração. 25min de foco + 5min de pausa.",
          icon: "🎯",
          color: "text-blue-400",
        });
      }, 12000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [addNotification]);

  // Lembrete periódico de água a cada 30 min
  useEffect(() => {
    const interval = setInterval(() => {
      addNotification({
        type: "water",
        title: "Lembrete de Água",
        message: "Já bebeu água? Mantenha-se hidratado!",
        icon: "💧",
        color: "text-cyan-400",
      });
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}
