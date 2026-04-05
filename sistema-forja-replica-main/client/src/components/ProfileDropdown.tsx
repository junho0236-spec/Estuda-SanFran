import { useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { User, Settings, LogOut, ChevronRight } from "lucide-react";

interface ProfileDropdownProps {
  onClose: () => void;
}

export default function ProfileDropdown({ onClose }: ProfileDropdownProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const profileQuery = trpc.profile.get.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();
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

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* User Info Header */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-sm font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        <button
          onClick={() => {
            onClose();
            navigate("/profile");
          }}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#2a2a2a] transition text-left"
        >
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm flex-1">Perfil</span>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        <button
          onClick={() => {
            onClose();
            navigate("/profile");
          }}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#2a2a2a] transition text-left"
        >
          <Settings className="w-4 h-4 text-gray-400" />
          <span className="text-sm flex-1">Configurações</span>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        <div className="border-t border-[#2a2a2a] my-1"></div>

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
