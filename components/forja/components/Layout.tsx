import { FORJA_BASE_PATH } from "@forja/constants";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useNotifications } from "@forja/contexts/NotificationContext";
import { usePushNotifications } from "@forja/hooks/usePushNotifications";
import FeaturedAchievementsPopup from "./FeaturedAchievementsPopup";
import ProfileDropdown from "./ProfileDropdown";
import {
  BarChart3,
  CheckSquare,
  Calendar,
  Target,
  Wallet,
  Clock,
  Zap,
  User,
  X,
  Trophy,
  Shield,
  Medal,
  Bell,
  Trash2,
  CheckCheck,
  Lock,
  Scale,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

/* ── Notification Panel ── */
function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto border-t border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sanfran-rubi/15 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-sanfran-rubi" />
            </div>
            <h2 className="text-lg font-bold">Notificações</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={markAllAsRead} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition" title="Marcar todas como lidas">
              <CheckCheck className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={clearAll} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition" title="Limpar todas">
              <Trash2 className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhuma notificação</p>
            <p className="text-gray-500 text-sm mt-1">Suas notificações aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`w-full text-left bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border transition hover:bg-white dark:bg-slate-900 ${
                  n.read ? 'border-slate-200 dark:border-slate-700 opacity-60' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-bold text-sm ${n.color}`}>{n.title}</span>
                      {!n.read && <span className="w-2 h-2 bg-sanfran-rubi rounded-full shrink-0"></span>}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── XP Stats Popup ── */
function XPPopup({ onClose }: { onClose: () => void }) {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sanfran-rubi/15 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-sanfran-rubi" />
            </div>
            <h2 className="text-lg font-bold">Estatísticas de XP</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-400">Saldo de hoje</p>
          <p className="text-3xl font-bold text-green-400">+5</p>
          <p className="text-sm text-green-400">+5 ganho</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Semana</p>
            <p className="text-xl font-bold">5</p>
          </div>
          <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Mês</p>
            <p className="text-xl font-bold">5</p>
          </div>
          <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Nv. 2</p>
            <p className="text-xl font-bold">5</p>
          </div>
        </div>
        <h3 className="font-bold mb-3">Últimos 7 dias</h3>
        <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-end justify-between h-24 mb-2">
            {days.map((d, i) => (
              <div key={d} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-6 bg-sanfran-rubi/35 rounded-t" style={{ height: i === 6 ? '60px' : '4px' }}></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {days.map(d => <span key={d} className="text-xs text-gray-500 flex-1 text-center">{d}</span>)}
          </div>
        </div>
        <h3 className="font-bold mb-3">Resumo Semanal</h3>
        <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Total:</span>
            <span className="font-bold text-green-400">+5 XP</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Outros</span>
            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2"><div className="bg-sanfran-rubi h-full rounded-full" style={{ width: '100%' }}></div></div>
            <span className="text-sm">100% +5</span>
          </div>
        </div>
        <h3 className="font-bold mb-3">Atividades de hoje</h3>
        <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">📅</span>
              <div>
                <p className="font-medium">Bônus diário de login</p>
                <p className="text-xs text-gray-400">15:42</p>
              </div>
            </div>
            <span className="text-green-400 font-bold">+5</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Coins Popup ── */
function CoinsPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
            <h2 className="text-lg font-bold">Life Coins</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-4 mb-4 text-center">
          <p className="text-sm text-gray-400">Saldo Total</p>
          <p className="text-4xl font-bold text-yellow-400">1</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Ganho (semana)</p>
            <p className="text-lg font-bold text-green-400">+0</p>
          </div>
          <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Gasto (semana)</p>
            <p className="text-lg font-bold text-sanfran-rubi">-0</p>
          </div>
          <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Líquido</p>
            <p className="text-lg font-bold">0</p>
          </div>
        </div>
        <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-400">Você ganha 20% do XP em Life Coins para gastar na loja!</p>
        </div>
        <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-6 text-center">
          <span className="text-3xl mb-2 block">💰</span>
          <p className="text-gray-400 text-sm">Nenhuma transação ainda. Complete hábitos e tarefas para ganhar moedas!</p>
        </div>
      </div>
    </div>
  );
}

/* ── Titles Popup ── */
function TitlesPopup({ onClose }: { onClose: () => void }) {
  const blocked = [
    { name: "Aprendiz", level: 5 },
    { name: "Praticante", level: 10 },
    { name: "Veterano", level: 15 },
    { name: "Mestre", level: 20 },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Meus Títulos</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-purple-200">Título Atual</p>
          <p className="text-2xl font-bold">Iniciante</p>
        </div>
        <h3 className="font-bold mb-3 text-sm text-gray-400">Títulos Desbloqueados</h3>
        <div className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="font-medium">Iniciante</span>
          </div>
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Equipado</span>
        </div>
        <h3 className="font-bold mb-3 text-sm text-gray-400">Títulos Bloqueados</h3>
        <div className="space-y-3">
          {blocked.map(t => (
            <div key={t.name} className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-500" />
                <span className="font-medium">{t.name}</span>
              </div>
              <span className="text-xs text-gray-500">Nível {t.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Achievements Popup ── */
const ALL_ACHIEVEMENTS_LIST = [
  // Streaks (7)
  { name: "Primeiros Passos", rarity: "Comum", desc: "Complete 3 dias seguidos de um hábito", target: 3, current: 0, category: "Streaks" },
  { name: "Uma Semana Forte", rarity: "Comum", desc: "Complete 7 dias seguidos de um hábito", target: 7, current: 0, category: "Streaks" },
  { name: "Duas Semanas", rarity: "Incomum", desc: "Complete 14 dias seguidos de um hábito", target: 14, current: 0, category: "Streaks" },
  { name: "Mestre do Mês", rarity: "Raro", desc: "Complete 30 dias seguidos de um hábito", target: 30, current: 0, category: "Streaks" },
  { name: "Dois Meses Invicto", rarity: "Épico", desc: "Complete 60 dias seguidos de um hábito", target: 60, current: 0, category: "Streaks" },
  { name: "Centurião", rarity: "Lendário", desc: "Complete 100 dias seguidos de um hábito", target: 100, current: 0, category: "Streaks" },
  { name: "Um Ano Inteiro", rarity: "Mítico", desc: "Complete 365 dias seguidos de um hábito", target: 365, current: 0, category: "Streaks" },
  // Hábitos (7)
  { name: "Colecionador", rarity: "Comum", desc: "Crie 3 hábitos diferentes", target: 3, current: 0, category: "Hábitos" },
  { name: "Diversificado", rarity: "Incomum", desc: "Crie 5 hábitos diferentes", target: 5, current: 0, category: "Hábitos" },
  { name: "Multi-Talento", rarity: "Raro", desc: "Crie 10 hábitos diferentes", target: 10, current: 0, category: "Hábitos" },
  { name: "Iniciante Dedicado", rarity: "Comum", desc: "Complete 50 hábitos no total", target: 50, current: 0, category: "Hábitos" },
  { name: "Consistente", rarity: "Incomum", desc: "Complete 100 hábitos no total", target: 100, current: 0, category: "Hábitos" },
  { name: "Disciplinado", rarity: "Raro", desc: "Complete 500 hábitos no total", target: 500, current: 0, category: "Hábitos" },
  { name: "Lendário", rarity: "Épico", desc: "Complete 1000 hábitos no total", target: 1000, current: 0, category: "Hábitos" },
  // Tarefas (3)
  { name: "Produtivo", rarity: "Comum", desc: "Complete 10 tarefas", target: 10, current: 0, category: "Tarefas" },
  { name: "Eficiente", rarity: "Incomum", desc: "Complete 50 tarefas", target: 50, current: 0, category: "Tarefas" },
  { name: "Máquina de Produtividade", rarity: "Raro", desc: "Complete 100 tarefas", target: 100, current: 0, category: "Tarefas" },
  // Conclusões (4)
  { name: "Sonhador Realista", rarity: "Comum", desc: "Complete sua primeira meta", target: 1, current: 0, category: "Conclusões" },
  { name: "Conquistador", rarity: "Raro", desc: "Complete 5 metas", target: 5, current: 0, category: "Conclusões" },
  { name: "Semana Perfeita", rarity: "Épico", desc: "Complete todos os hábitos por 7 dias seguidos", target: 7, current: 0, category: "Conclusões" },
  { name: "Madrugador", rarity: "Incomum", desc: "Complete um hábito antes das 6h", target: 1, current: 0, category: "Conclusões" },
];

function getRarityBadgeColor(rarity: string) {
  switch (rarity) {
    case "Comum": return "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
    case "Incomum": return "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
    case "Raro": return "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
    case "Épico": return "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
    case "Lendário": return "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
    case "Mítico": return "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
    default: return "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
  }
}

function AchievementsPopup({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("Todas");
  const tabs = ["Todas", "Streaks", "Hábitos", "Conclusões", "Tarefas"];

  const filtered = activeTab === "Todas"
    ? ALL_ACHIEVEMENTS_LIST
    : ALL_ACHIEVEMENTS_LIST.filter(a => a.category === activeTab);

  const blockedCount = filtered.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg className="w-7 h-7 text-sanfran-rubi" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8L8 14 2 9.2h7.6z" />
            </svg>
            <h2 className="text-lg font-bold">Conquistas</h2>
            <span className="text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">0/21</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition font-medium ${
                activeTab === t ? 'bg-sanfran-rubi text-white' : 'bg-sanfran-paper dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Blocked header */}
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Bloqueadas ({blockedCount})</span>
        </div>

        {/* Achievement cards */}
        <div className="space-y-3">
          {filtered.map(a => {
            const progressPercent = a.target > 0 ? Math.min((a.current / a.target) * 100, 100) : 0;
            return (
              <div key={a.name} className="bg-sanfran-paper dark:bg-slate-800 rounded-xl p-4 flex gap-4">
                {/* Lock icon */}
                <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-gray-500" />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-white">{a.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRarityBadgeColor(a.rarity)}`}>{a.rarity}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{a.desc}</p>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Progresso</span>
                    <span className="text-xs text-sanfran-rubi font-bold">{a.current}/{a.target}</span>
                  </div>
                  <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-full h-1.5">
                    <div className="bg-sanfran-rubi h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Push Notification Banner ── */
function PushBanner() {
  const { permission, isSubscribed, isSupported, isLoading, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show banner after 2 seconds if not subscribed and not dismissed
    const wasDismissed = localStorage.getItem('push-banner-dismissed');
    if (isSupported && !isSubscribed && permission !== 'denied' && !wasDismissed) {
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, permission]);

  if (!showBanner || dismissed || isSubscribed || permission === 'denied') return null;

  return (
    <div className="bg-gradient-to-r from-sanfran-rubi to-sanfran-rubi-dark mx-4 mt-2 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top shadow-md border border-sanfran-rubi-dark/30">
      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
        <Bell className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">Ativar Notificações</p>
        <p className="text-xs text-white/90">Receba lembretes de hábitos, tarefas e água!</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={async () => {
            await requestPermission();
            setShowBanner(false);
          }}
          disabled={isLoading}
          className="bg-white text-sanfran-rubi font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-sanfran-offwhite transition disabled:opacity-50"
        >
          {isLoading ? 'Ativando...' : 'Ativar'}
        </button>
        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem('push-banner-dismissed', 'true');
          }}
          className="p-1 hover:bg-white/20 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Main Layout ── */
export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [popup, setPopup] = useState<string | null>(null);
  const { unreadCount } = useNotifications();

  const base = FORJA_BASE_PATH;
  const navItems = [
    { path: base, label: "Dashboard", icon: BarChart3 },
    { path: `${base}/habits`, label: "Hábitos", icon: CheckSquare },
    { path: `${base}/tasks`, label: "Tarefas", icon: Calendar },
    { path: `${base}/goals`, label: "Metas", icon: Target },
    { path: `${base}/finance`, label: "Finanças", icon: Wallet },
    { path: `${base}/focus`, label: "Foco", icon: Clock },
  ];

  return (
    <div className="flex flex-col h-screen bg-sanfran-offwhite text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-hidden">
      {/* Header — marca SanFran */}
      <header className="relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sanfran-rubi via-amber-700/80 to-sanfran-rubi-dark" aria-hidden />
        <div className="flex items-center gap-3 pt-0.5">
          <div className="w-9 h-9 rounded-lg bg-sanfran-rubi/10 dark:bg-sanfran-rubi/20 border border-sanfran-rubi/25 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-sanfran-rubi" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-sanfran-rubi">SanFran Academy</p>
            <h1 className="forja-forja-title text-base font-bold text-slate-900 dark:text-white leading-tight truncate">Forja</h1>
          </div>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">Produtividade</span>
      </header>

      {/* Top Bar - Status/Badges */}
      <div className="bg-sanfran-offwhite dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button onClick={() => setPopup('xp')} className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <Zap className="w-4 h-4 text-sanfran-rubi" />
          <span className="text-sm font-bold text-sanfran-rubi">+5</span>
        </button>
        <button onClick={() => setPopup('coins')} className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <span className="text-sm">💰</span>
          <span className="text-sm font-bold text-yellow-400">1</span>
        </button>
        <div className="flex items-center gap-2 ml-auto">
          {/* Notification Bell */}
          <button onClick={() => setPopup('notifications')} className="relative w-9 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-sanfran-rubi text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setPopup('titles')} className="w-9 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <Shield className="w-4 h-4 text-purple-400" />
          </button>
          <button onClick={() => setPopup('achievements')} className="w-9 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <Trophy className="w-4 h-4 text-sanfran-rubi" />
          </button>
          <button onClick={() => setPopup('featured')} className="w-9 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <Medal className="w-4 h-4 text-yellow-400" />
          </button>
          <div className="relative">
            <button onClick={() => setPopup(popup === 'profile' ? null : 'profile')} className="w-9 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
            {popup === 'profile' && <ProfileDropdown onClose={() => setPopup(null)} />}
          </div>
        </div>
      </div>

      {/* Push Notification Banner */}
      <PushBanner />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 px-2 py-2 flex justify-around items-center z-40 supports-[backdrop-filter]:bg-white/80">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isDashHome =
            pathname === base || pathname === `${base}/` || pathname === `${base}/dashboard`;
          const isActive =
            item.path === base ? isDashHome : pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition ${
                isActive ? "text-sanfran-rubi" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Popups */}
      {popup === 'xp' && <XPPopup onClose={() => setPopup(null)} />}
      {popup === 'coins' && <CoinsPopup onClose={() => setPopup(null)} />}
      {popup === 'titles' && <TitlesPopup onClose={() => setPopup(null)} />}
      {popup === 'achievements' && <AchievementsPopup onClose={() => setPopup(null)} />}
      {popup === 'featured' && <FeaturedAchievementsPopup onClose={() => setPopup(null)} />}
      {popup === 'notifications' && <NotificationPanel onClose={() => setPopup(null)} />}
    </div>
  );
}
