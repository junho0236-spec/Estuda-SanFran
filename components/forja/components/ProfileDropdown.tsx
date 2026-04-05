import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FORJA_BASE_PATH } from "@forja/constants";
import { trpc } from "@forja/lib/trpc";
import { useAuth } from "@forja/_core/hooks/useAuth";
import { User, Settings, LogOut, ChevronRight } from "lucide-react";

interface ProfileDropdownProps {
  onClose: () => void;
}

export default function ProfileDropdown({ onClose }: ProfileDropdownProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const profileQuery = trpc.profile.get.useQuery();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const displayName = profileQuery.data?.displayName || user?.name || "Usuário";
  const email = user?.email || "";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* User Info Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sanfran-rubi to-sanfran-rubi-dark flex items-center justify-center text-sm font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        <button
          onClick={() => {
            onClose();
            navigate(`${FORJA_BASE_PATH}/profile`);
          }}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
        >
          <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm flex-1">Perfil</span>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </button>

        <button
          onClick={() => {
            onClose();
            navigate(`${FORJA_BASE_PATH}/profile`);
          }}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
        >
          <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span className="text-sm flex-1">Configurações</span>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </button>

        <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>

        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 transition text-left"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">Sair</span>
        </button>
      </div>
    </div>
  );
}
