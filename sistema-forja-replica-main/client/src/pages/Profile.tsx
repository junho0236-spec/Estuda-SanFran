import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  Camera,
  Save,
  Lock,
  Bell,
  Info,
  LogOut,
  Eye,
  EyeOff,
  ChevronRight,
  User,
  Mail,
  Shield,
} from "lucide-react";

export default function Profile() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const profileQuery = trpc.profile.get.useQuery();
  const updateProfile = trpc.profile.update.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const utils = trpc.useUtils();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Security fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Notification toggles
  const [notifyHabits, setNotifyHabits] = useState(true);
  const [notifyMetas, setNotifyMetas] = useState(true);
  const [notifyCommunity, setNotifyCommunity] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (profileQuery.data) {
      setDisplayName(profileQuery.data.displayName || user?.name || "");
      setAvatarUrl(profileQuery.data.avatarUrl || "");
      setNotifyHabits(profileQuery.data.notifyHabits ?? true);
      setNotifyMetas(profileQuery.data.notifyMetas ?? true);
      setNotifyCommunity(profileQuery.data.notifyCommunity ?? true);
    }
    if (user) {
      setEmail(user.email || "");
      if (!displayName && user.name) {
        setDisplayName(user.name);
      }
    }
  }, [profileQuery.data, user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      await updateProfile.mutateAsync({
        displayName: displayName || undefined,
        avatarUrl: avatarUrl || undefined,
        notifyHabits,
        notifyMetas,
        notifyCommunity,
      });
      utils.profile.get.invalidate();
      setSaveMessage("Perfil salvo com sucesso!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  const initials = (displayName || user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 bg-[#2a2a2a] rounded-lg flex items-center justify-center hover:bg-[#333] transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Perfil</h1>
      </div>

      <div className="p-4 pb-32 space-y-6 max-w-lg mx-auto">
        {/* Avatar & Name Section */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#333]"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-2xl font-bold border-2 border-[#333]">
                  {initials}
                </div>
              )}
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#1a1a1a] hover:bg-red-600 transition">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-xl font-bold">{displayName || user?.name || "Usuário"}</h2>
            <p className="text-sm text-gray-400">{email || "email@exemplo.com"}</p>
          </div>

          {/* Personal Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 flex items-center gap-2">
                <User className="w-4 h-4" />
                Nome de Exibição
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                placeholder="email@exemplo.com"
              />
              <p className="text-xs text-gray-600 mt-1">O email é gerenciado pela conta de login</p>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full mt-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          {saveMessage && (
            <p className={`text-center text-sm mt-2 ${saveMessage.includes("sucesso") ? "text-green-400" : "text-red-400"}`}>
              {saveMessage}
            </p>
          )}
        </div>

        {/* Security Section */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold">Segurança</h3>
              <p className="text-xs text-gray-400">Alterar senha</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition pr-12"
                placeholder="Senha atual"
              />
              <button
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showCurrentPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition pr-12"
                placeholder="Nova senha"
              />
              <button
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition pr-12"
                placeholder="Confirmar nova senha"
              />
              <button
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showConfirmPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button className="w-full bg-blue-500/20 text-blue-400 font-bold py-3 rounded-xl hover:bg-blue-500/30 transition flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              Alterar Senha
            </button>
            <p className="text-xs text-gray-600 text-center">A senha é gerenciada pelo provedor de autenticação</p>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-bold">Notificações</h3>
              <p className="text-xs text-gray-400">Gerencie suas notificações</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Hábitos</p>
                <p className="text-xs text-gray-500">Lembretes de hábitos diários</p>
              </div>
              <button
                onClick={() => {
                  setNotifyHabits(!notifyHabits);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  notifyHabits ? "bg-red-500" : "bg-[#333]"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${
                    notifyHabits ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Metas</p>
                <p className="text-xs text-gray-500">Atualizações sobre suas metas</p>
              </div>
              <button
                onClick={() => {
                  setNotifyMetas(!notifyMetas);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  notifyMetas ? "bg-red-500" : "bg-[#333]"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${
                    notifyMetas ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Comunidade</p>
                <p className="text-xs text-gray-500">Notificações da comunidade</p>
              </div>
              <button
                onClick={() => {
                  setNotifyCommunity(!notifyCommunity);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  notifyCommunity ? "bg-red-500" : "bg-[#333]"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${
                    notifyCommunity ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Info className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-bold">Sobre</h3>
              <p className="text-xs text-gray-400">Informações do aplicativo</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-400">Versão</span>
              <span className="text-sm font-medium">v2.1.6</span>
            </div>
            <div className="border-t border-[#2a2a2a]"></div>
            <button className="w-full flex items-center justify-between py-2 hover:bg-[#2a2a2a] rounded-lg px-2 -mx-2 transition">
              <span className="text-sm text-gray-400">Últimas Atualizações</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <div className="border-t border-[#2a2a2a]"></div>
            <button className="w-full flex items-center justify-between py-2 hover:bg-[#2a2a2a] rounded-lg px-2 -mx-2 transition">
              <span className="text-sm text-gray-400">Termos de Uso</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <div className="border-t border-[#2a2a2a]"></div>
            <button className="w-full flex items-center justify-between py-2 hover:bg-[#2a2a2a] rounded-lg px-2 -mx-2 transition">
              <span className="text-sm text-gray-400">Política de Privacidade</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Logout Section */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full p-4 flex items-center justify-center gap-3 text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold">Sair da Conta</span>
          </button>
        </div>

        {/* App Info */}
        <div className="text-center pb-4">
          <p className="text-xs text-gray-600">Sistema Life v2.1.6</p>
          <p className="text-xs text-gray-700 mt-1">Organize sua vida, conquiste seus objetivos</p>
        </div>
      </div>
    </div>
  );
}
