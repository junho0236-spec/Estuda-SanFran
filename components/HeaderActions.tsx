import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Bell, ChevronDown, User, Settings, LogOut, ShieldAlert, CheckCircle2, UserPlus } from 'lucide-react';
import { Notification } from '../types';
import { dataService } from '../services/dataService';

interface HeaderActionsProps {
  notifications: Notification[];
  userId: string;
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead: () => void;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({ 
  notifications, 
  userId, 
  onNotificationClick,
  onMarkAllRead
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

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

  const getIcon = (type?: string) => {
    switch (type) {
      case 'completed': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'friend_request': return <UserPlus size={16} className="text-blue-500" />;
      case 'delegated': return <ShieldAlert size={16} className="text-amber-500" />;
      default: return <Bell size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="flex items-center gap-4 p-2.5 bg-[#FFFFF0]/80 backdrop-blur-xl rounded-full border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_15px_rgba(0,0,0,0.05)] relative z-50">
      {/* Help */}
      <button className="w-11 h-11 rounded-full bg-gradient-to-b from-white to-[#F8F9FA] border border-slate-200/60 shadow-[0_2px_5px_rgba(0,0,0,0.05),inset_0_1px_0_white] flex items-center justify-center text-slate-500 hover:text-[#800000] transition-all active:scale-95">
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
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-b from-[#A00000] to-[#600000] text-[#FFFFF0] text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#FFFFF0] shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {isNotificationsOpen && (
          <div className="absolute right-0 mt-4 w-80 bg-[#FFFFF0]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] p-2 z-50 transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
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
                    className="px-4 py-3 hover:bg-white rounded-xl cursor-pointer transition-colors flex gap-3 relative overflow-hidden group"
                  >
                    {!notif.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#800000] rounded-r-full"></div>}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-red-50' : 'bg-slate-100'}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div>
                      <p className={`text-sm ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                        {notif.message}
                      </p>
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
              src="https://picsum.photos/seed/junior/40/40" 
              alt="Júnior Souza" 
              className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <span className="text-sm font-bold text-slate-800 font-serif">Júnior Souza</span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Profile Dropdown */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-4 w-64 bg-[#FFFFF0]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] p-2 z-50 transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 border-b border-slate-200/50 mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Gabinete</p>
              <p className="text-sm font-serif font-bold text-slate-900">Dr. Júnior Souza</p>
            </div>
            
            <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white rounded-xl transition-colors flex items-center gap-3">
              <User size={16} className="text-slate-400" /> Minha Conta
            </button>
            <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white rounded-xl transition-colors flex items-center gap-3">
              <Settings size={16} className="text-slate-400" /> Configurações
            </button>
            <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white rounded-xl transition-colors flex items-center gap-3">
              <HelpCircle size={16} className="text-slate-400" /> Ajuda
            </button>
            
            <div className="border-t border-slate-200/50 my-2"></div>
            
            <button className="w-full text-left px-4 py-2.5 text-sm font-bold text-[#800000] hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3">
              <LogOut size={16} /> Encerrar Sessão
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderActions;
