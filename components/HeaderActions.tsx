import React, { useState } from 'react';
import { HelpCircle, Bell, ChevronDown, User, Settings, LogOut } from 'lucide-react';

const HeaderActions: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="flex items-center gap-4 p-2 bg-white/80 dark:bg-[#0d0303]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
      {/* Help */}
      <button className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-sanfran-rubi transition-colors">
        <HelpCircle size={20} />
      </button>

      {/* Notifications */}
      <button className="relative w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-sanfran-rubi transition-colors">
        <Bell size={20} />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#0d0303]">
          3
        </span>
      </button>

      {/* Profile */}
      <div className="relative">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 pl-2 pr-4 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <img 
            src="https://picsum.photos/seed/junior/40/40" 
            alt="Júnior Souza" 
            className="w-8 h-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Júnior Souza</span>
          <ChevronDown size={16} className="text-slate-400" />
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-2 z-50">
            <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
              <User size={16} /> Minha Conta
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
              <Settings size={16} /> Configurações
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
              <HelpCircle size={16} /> Ajuda
            </button>
            <div className="border-t border-slate-100 dark:border-white/10 my-1"></div>
            <button className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
              <LogOut size={16} /> Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderActions;
