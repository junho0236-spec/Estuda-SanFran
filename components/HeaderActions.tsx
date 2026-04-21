import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Bell, ChevronDown, User, Settings, LogOut, ShieldAlert, CheckCircle2, UserPlus, Moon, Sun, Zap, Coffee, Gavel } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification, UserProfile, View } from '../types';
import { dataService } from '../services/dataService';

interface HeaderActionsProps {
  notifications: Notification[];
  userId: string;
  userProfile: UserProfile | null;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onNotificationClick: (notification: Notification) => void;
  onAcceptFriendRequest: (notification: Notification) => void;
  onDeclineFriendRequest: (notification: Notification) => void;
  onMarkAllRead: () => void;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  timerIsActive?: boolean;
  timerSecondsLeft?: number;
  timerTotalInitial?: number;
  timerMode?: 'work' | 'break';
  /** Barra fixa estreita (ex.: header mobile): evita quebra de linha e reduz padding. */
  compactToolbar?: boolean;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({ 
  notifications, 
  userId, 
  userProfile,
  isDarkMode,
  onToggleDarkMode,
  onNotificationClick,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onMarkAllRead,
  onViewChange,
  onLogout,
  timerIsActive = false,
  timerSecondsLeft = 0,
  timerTotalInitial = 1,
  timerMode = 'work',
  compactToolbar = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  /** Painéis em portal (body): evitam `overflow-hidden` de ascendentes (main mobile e desktop). */
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);
  type PanelPos = { top: number; right: number; maxH: number };
  const [notifPanelPos, setNotifPanelPos] = useState<PanelPos | null>(null);
  const [profilePanelPos, setProfilePanelPos] = useState<PanelPos | null>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const userDisplayName = userProfile?.full_name || 'Doutor(a)';
  const userAvatar = userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((timerTotalInitial - timerSecondsLeft) / timerTotalInitial) * 100;

  useLayoutEffect(() => {
    if (!isNotificationsOpen) {
      setNotifPanelPos(null);
      return;
    }
    const measure = () => {
      const el = notifBtnRef.current;
      if (!el || typeof window === 'undefined') return;
      const r = el.getBoundingClientRect();
      setNotifPanelPos({
        top: r.bottom + 8,
        right: Math.max(12, window.innerWidth - r.right),
        maxH: Math.max(220, window.innerHeight - r.bottom - 20),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [isNotificationsOpen]);

  useLayoutEffect(() => {
    if (!isDropdownOpen) {
      setProfilePanelPos(null);
      return;
    }
    const measure = () => {
      const el = profileBtnRef.current;
      if (!el || typeof window === 'undefined') return;
      const r = el.getBoundingClientRect();
      setProfilePanelPos({
        top: r.bottom + 8,
        right: Math.max(12, window.innerWidth - r.right),
        maxH: Math.max(220, window.innerHeight - r.bottom - 20),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [isDropdownOpen]);

  // Close dropdowns when clicking outside (inclui painéis em portal)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      const insideProfile =
        !!dropdownRef.current?.contains(t) || !!profilePanelRef.current?.contains(t);
      if (!insideProfile) setIsDropdownOpen(false);
      const insideNotif =
        !!notifRef.current?.contains(t) || !!notifPanelRef.current?.contains(t);
      if (!insideNotif) setIsNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotifications = async () => {
    const newState = !isNotificationsOpen;
    setIsNotificationsOpen(newState);
    setIsDropdownOpen(false);

    if (newState && unreadCount > 0) {
      // Mark as read when opening
      await dataService.markAllNotificationsAsRead(userId);
      onMarkAllRead();
    }
  };

  const handleNavigate = (view: View) => {
    onViewChange(view);
    setIsDropdownOpen(false);
    setIsNotificationsOpen(false);
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'completed': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'friend_request': return <UserPlus size={16} className="text-blue-500" />;
      case 'friend_accepted': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'delegated': return <ShieldAlert size={16} className="text-amber-500" />;
      default: return <Bell size={16} className="text-slate-400" />;
    }
  };

  const rootToolbarClass = compactToolbar
    ? 'relative z-10 flex max-w-full min-w-0 flex-nowrap items-center justify-end gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white/80 p-1 shadow-[0_4px_15px_rgba(0,0,0,0.05)] backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-sanfran-rubi/30'
    : 'relative z-10 flex max-w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3 md:gap-4 rounded-2xl sm:rounded-full border border-slate-200 bg-white/80 p-2 sm:p-2.5 shadow-[0_4px_15px_rgba(0,0,0,0.05)] backdrop-blur-xl';

  return (
    <div className={rootToolbarClass}>
      {/* Mini Timer Integrado */}
      <AnimatePresence>
        {timerIsActive && (
          <motion.button
            initial={{ opacity: 0, width: 0, x: -20 }}
            animate={{ opacity: 1, width: 'auto', x: 0 }}
            exit={{ opacity: 0, width: 0, x: -20 }}
            onClick={() => handleNavigate(View.Timer)}
            className={`shrink-0 flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full border transition-all hover:shadow-md active:scale-95 overflow-hidden whitespace-nowrap ${
              timerMode === 'work' 
                ? 'bg-red-50/50 border-red-200 text-[#800000]' 
                : 'bg-blue-50/50 border-blue-200 text-blue-700'
            }`}
          >
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="opacity-10" />
                <circle 
                  cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="2.5" fill="transparent" 
                  strokeDasharray="100" strokeDashoffset={100 - progress} 
                  className="transition-all duration-1000" pathLength="100" strokeLinecap="round" 
                />
              </svg>
              {timerMode === 'work' ? <Gavel size={12} /> : <Coffee size={12} />}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-black tabular-nums leading-none">{formatTime(timerSecondsLeft)}</span>
              <span className="text-[7px] font-black uppercase tracking-widest opacity-60">
                {timerMode === 'work' ? 'Em Pauta' : 'Recesso'}
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Help */}
      <button 
        onClick={() => handleNavigate(View.FAQ)}
        className={`shrink-0 rounded-full bg-gradient-to-b from-white to-[#F8F9FA] border border-slate-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.05),inset_0_1px_0_white] flex items-center justify-center text-slate-500 hover:text-[#800000] transition-all active:scale-95 dark:border-sanfran-rubi/20 ${
          compactToolbar ? 'h-10 w-10' : 'w-11 h-11'
        }`}
      >
        <HelpCircle size={compactToolbar ? 18 : 20} />
      </button>

      {/* Notifications */}
      <div className="relative shrink-0" ref={notifRef}>
        <button
          ref={notifBtnRef}
          onClick={handleToggleNotifications}
          className={`relative rounded-full border flex items-center justify-center transition-all active:scale-95 ${
            compactToolbar ? 'h-10 w-10' : 'w-11 h-11'
          } ${
            isNotificationsOpen 
              ? 'bg-slate-100 border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-[#800000]' 
              : 'bg-gradient-to-b from-white to-[#F8F9FA] border-slate-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.05),inset_0_1px_0_white] text-slate-500 hover:text-[#800000]'
          }`}
        >
          <Bell size={compactToolbar ? 18 : 20} className={isNotificationsOpen ? 'fill-[#800000]/10' : ''} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-b from-[#A00000] to-[#600000] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notificações: sempre em portal + fixed, ancorado ao botão (main tem overflow-hidden). */}
        {isNotificationsOpen &&
          notifPanelPos &&
          createPortal(
            <div
              ref={notifPanelRef}
              style={{
                position: 'fixed',
                top: notifPanelPos.top,
                right: notifPanelPos.right,
                maxHeight: notifPanelPos.maxH,
                width: 'min(20rem, calc(100vw - 1.5rem))',
              }}
              className="z-[80] origin-top-right overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_20px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl custom-scrollbar dark:border-sanfran-rubi/30 dark:bg-[#0d0303]/95"
            >
              <div className="sticky top-0 z-[1] flex justify-between border-b border-slate-200/50 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-sanfran-rubi/20 dark:bg-[#0d0303]/95">
                <h3 className="font-serif font-bold text-slate-900 dark:text-white">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-[#800000] dark:bg-red-900/30 dark:text-red-100">
                    {unreadCount} Novas
                  </span>
                )}
              </div>
              <div className="py-2">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        onNotificationClick(notif);
                        setIsNotificationsOpen(false);
                      }}
                      className="group relative flex cursor-pointer gap-3 overflow-hidden rounded-xl px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      {!notif.is_read && (
                        <div className="absolute bottom-0 left-0 top-0 w-1 rounded-r-full bg-[#800000]" />
                      )}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${!notif.is_read ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-white/10'}`}
                      >
                        {getIcon(notif.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${!notif.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}
                        >
                          {notif.message}
                        </p>
                        {notif.type === 'friend_request' && !notif.is_read && (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAcceptFriendRequest(notif);
                              }}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-700"
                            >
                              Aceitar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeclineFriendRequest(notif);
                              }}
                              className="rounded-lg bg-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-300 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
                            >
                              Recusar
                            </button>
                          </div>
                        )}
                        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
                    Nenhuma notificação por aqui.
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
      </div>

      {/* Profile */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          ref={profileBtnRef}
          onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            setIsNotificationsOpen(false);
          }}
          className={`flex items-center rounded-full transition-all active:scale-95 ${
            compactToolbar ? 'gap-1.5 pl-1 pr-2 py-1' : 'gap-3 pl-2 pr-4 py-1.5'
          } ${
            isDropdownOpen
              ? 'bg-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] border border-slate-200'
              : 'bg-gradient-to-b from-white to-[#F8F9FA] border border-slate-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.05),inset_0_1px_0_white] hover:shadow-md'
          }`}
        >
          <div className="relative">
            <img 
              src={userAvatar} 
              alt={userDisplayName} 
              className={`rounded-full object-cover border-2 border-white shadow-sm ${compactToolbar ? 'h-8 w-8' : 'w-9 h-9'}`}
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          {!compactToolbar && (
            <span className="hidden sm:inline text-sm font-bold text-slate-800 font-serif max-w-[120px] truncate">{userDisplayName}</span>
          )}
          <ChevronDown size={compactToolbar ? 14 : 16} className={`shrink-0 text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Perfil: sempre em portal + fixed (mesmo motivo que notificações). */}
        {isDropdownOpen &&
          profilePanelPos &&
          createPortal(
            <div
              ref={profilePanelRef}
              style={{
                position: 'fixed',
                top: profilePanelPos.top,
                right: profilePanelPos.right,
                maxHeight: profilePanelPos.maxH,
                width: 'min(16rem, calc(100vw - 1.5rem))',
              }}
              className="z-[80] flex origin-top-right flex-col overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl dark:border-sanfran-rubi/30 dark:bg-[#0d0303]/95"
            >
              <div className="mb-2 border-b border-slate-200/50 px-4 py-3 dark:border-sanfran-rubi/20">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Gabinete</p>
                <p className="truncate font-serif text-sm font-bold text-slate-900 dark:text-white">{userDisplayName}</p>
              </div>
              <button
                type="button"
                onClick={() => handleNavigate(View.Profile)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <User size={16} className="text-slate-400" /> Minha Conta
              </button>
              <button
                type="button"
                onClick={() => handleNavigate(View.Settings)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <Settings size={16} className="text-slate-400" /> Configurações
              </button>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon size={16} className="text-slate-400" /> : <Sun size={16} className="text-slate-400" />}
                  <span>{isDarkMode ? 'Modo Escuro' : 'Modo Claro'}</span>
                </div>
                <div
                  className={`relative h-4 w-8 rounded-full transition-colors ${isDarkMode ? 'bg-sanfran-rubi' : 'bg-slate-200'}`}
                >
                  <div
                    className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${isDarkMode ? 'right-0.5' : 'left-0.5'}`}
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate(View.FAQ)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <HelpCircle size={16} className="text-slate-400" /> Ajuda
              </button>
              <div className="my-2 border-t border-slate-200/50 dark:border-sanfran-rubi/20" />
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-bold text-[#800000] transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <LogOut size={16} /> Encerrar Sessão
              </button>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
};

export default HeaderActions;
