import React, { useState, useRef, useEffect } from 'react';
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
  timerMode = 'work'
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const userDisplayName = userProfile?.full_name || 'Doutor(a)';
  const userAvatar = userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((timerTotalInitial - timerSecondsLeft) / timerTotalInitial) * 100;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
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

  return (
    <div className="relative z-10 flex items-center gap-4 rounded-full border border-slate-200 bg-white/80 p-2.5 shadow-[0_4px_15px_rgba(0,0,0,0.05)] backdrop-blur-xl">
      {/* Mini Timer Integrado */}
      <AnimatePresence>
        {timerIsActive && (
          <motion.button
            initial={{ opacity: 0, width: 0, x: -20 }}
            animate={{ opacity: 1, width: 'auto', x: 0 }}
            exit={{ opacity: 0, width: 0, x: -20 }}
            onClick={() => handleNavigate(View.Timer)}
            className={`flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full border transition-all hover:shadow-md active:scale-95 overflow-hidden whitespace-nowrap ${
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
        className="w-11 h-11 rounded-full bg-gradient-to-b from-white to-[#F8F9FA] border border-slate-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.05),inset_0_1px_0_white] flex items-center justify-center text-slate-500 hover:text-[#800000] transition-all active:scale-95"
      >
        <HelpCircle size={20} />
      </button>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button 
          onClick={handleToggleNotifications}
          className={`relative w-11 h-11 rounded-full border flex items-center justify-center transition-all active:scale-95 ${
            isNotificationsOpen 
              ? 'bg-slate-100 border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-[#800000]' 
              : 'bg-gradient-to-b from-white to-[#F8F9FA] border-slate-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.05),inset_0_1px_0_white] text-slate-500 hover:text-[#800000]'
          }`}
        >
          <Bell size={20} className={isNotificationsOpen ? 'fill-[#800000]/10' : ''} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-b from-[#A00000] to-[#600000] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {isNotificationsOpen && (
          <div className="absolute right-0 z-50 mt-4 w-80 origin-top-right transform rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 border-b border-slate-200/50 flex justify-between items-center">
              <h3 className="font-serif font-bold text-slate-900">Notificações</h3>
              {unreadCount > 0 && (
                <span className="text-xs font-bold text-[#800000] bg-red-50 px-2 py-1 rounded-full">{unreadCount} Novas</span>
              )}
            </div>
            <div className="py-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map(notif => (
                  <div 
                    key={notif.id}
                    onClick={() => {
                      onNotificationClick(notif);
                      setIsNotificationsOpen(false);
                    }}
                    className="px-4 py-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex gap-3 relative overflow-hidden group"
                  >
                    {!notif.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#800000] rounded-r-full"></div>}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-red-50' : 'bg-slate-100'}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                        {notif.message}
                      </p>
                      
                      {notif.type === 'friend_request' && !notif.is_read && (
                        <div className="flex gap-2 mt-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onAcceptFriendRequest(notif);
                            }}
                            className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            Aceitar
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeclineFriendRequest(notif);
                            }}
                            className="px-3 py-1 bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-300 transition-colors"
                          >
                            Recusar
                          </button>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-slate-400 text-xs font-medium">
                  Nenhuma notificação por aqui.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            setIsNotificationsOpen(false);
          }}
          className={`flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full transition-all active:scale-95 ${
            isDropdownOpen
              ? 'bg-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] border border-slate-200'
              : 'bg-gradient-to-b from-white to-[#F8F9FA] border border-slate-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.05),inset_0_1px_0_white] hover:shadow-md'
          }`}
        >
          <div className="relative">
            <img 
              src={userAvatar} 
              alt={userDisplayName} 
              className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <span className="text-sm font-bold text-slate-800 font-serif max-w-[120px] truncate">{userDisplayName}</span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Profile Dropdown */}
        {isDropdownOpen && (
          <div className="absolute right-0 z-50 mt-4 w-64 origin-top-right transform rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 border-b border-slate-200/50 mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Gabinete</p>
              <p className="text-sm font-serif font-bold text-slate-900 truncate">{userDisplayName}</p>
            </div>
            
            <button 
              onClick={() => handleNavigate(View.Profile)}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-3"
            >
              <User size={16} className="text-slate-400" /> Minha Conta
            </button>
            <button 
              onClick={() => handleNavigate(View.Settings)}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-3"
            >
              <Settings size={16} className="text-slate-400" /> Configurações
            </button>
            <button 
              onClick={onToggleDarkMode}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon size={16} className="text-slate-400" /> : <Sun size={16} className="text-slate-400" />}
                <span>{isDarkMode ? 'Modo Escuro' : 'Modo Claro'}</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-sanfran-rubi' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isDarkMode ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </button>
            <button 
              onClick={() => handleNavigate(View.FAQ)}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-3"
            >
              <HelpCircle size={16} className="text-slate-400" /> Ajuda
            </button>
            
            <div className="border-t border-slate-200/50 my-2"></div>
            
            <button 
              onClick={onLogout}
              className="w-full text-left px-4 py-2.5 text-sm font-bold text-[#800000] hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
            >
              <LogOut size={16} /> Encerrar Sessão
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderActions;
