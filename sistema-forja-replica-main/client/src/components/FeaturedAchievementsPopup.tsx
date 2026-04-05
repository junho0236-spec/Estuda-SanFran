import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { X, Medal, Plus, ArrowLeft, Lock } from "lucide-react";

// All possible achievements with their metadata
const ALL_ACHIEVEMENTS = [
  { key: "primeiros_passos", name: "Primeiros Passos", icon: "🏃", rarity: "Comum", desc: "Complete 3 dias seguidos", color: "text-gray-400" },
  { key: "uma_semana_forte", name: "Uma Semana Forte", icon: "💪", rarity: "Comum", desc: "Complete 7 dias seguidos", color: "text-gray-400" },
  { key: "duas_semanas", name: "Duas Semanas", icon: "🔥", rarity: "Incomum", desc: "Complete 14 dias seguidos", color: "text-green-400" },
  { key: "mes_de_ferro", name: "Mês de Ferro", icon: "🏋️", rarity: "Raro", desc: "Complete 30 dias seguidos", color: "text-blue-400" },
  { key: "trimestre_de_aco", name: "Trimestre de Aço", icon: "⚔️", rarity: "Épico", desc: "Complete 90 dias seguidos", color: "text-purple-400" },
  { key: "primeiro_habito", name: "Primeiro Hábito", icon: "✅", rarity: "Comum", desc: "Crie seu primeiro hábito", color: "text-gray-400" },
  { key: "cinco_habitos", name: "Cinco Hábitos", icon: "🎯", rarity: "Incomum", desc: "Tenha 5 hábitos ativos", color: "text-green-400" },
  { key: "mestre_habitos", name: "Mestre dos Hábitos", icon: "👑", rarity: "Raro", desc: "Complete 100 hábitos", color: "text-blue-400" },
  { key: "primeira_tarefa", name: "Primeira Tarefa", icon: "📋", rarity: "Comum", desc: "Complete sua primeira tarefa", color: "text-gray-400" },
  { key: "dez_tarefas", name: "Dez Tarefas", icon: "📝", rarity: "Incomum", desc: "Complete 10 tarefas", color: "text-green-400" },
  { key: "cem_tarefas", name: "Centurião", icon: "🏆", rarity: "Raro", desc: "Complete 100 tarefas", color: "text-blue-400" },
  { key: "primeira_meta", name: "Sonhador", icon: "🌟", rarity: "Comum", desc: "Crie sua primeira meta", color: "text-gray-400" },
  { key: "meta_completa", name: "Conquistador", icon: "🎖️", rarity: "Raro", desc: "Complete uma meta", color: "text-blue-400" },
  { key: "foco_1h", name: "Focado", icon: "🧠", rarity: "Comum", desc: "Acumule 1h de foco", color: "text-gray-400" },
  { key: "foco_10h", name: "Concentrado", icon: "💡", rarity: "Incomum", desc: "Acumule 10h de foco", color: "text-green-400" },
  { key: "foco_100h", name: "Zen Master", icon: "🧘", rarity: "Épico", desc: "Acumule 100h de foco", color: "text-purple-400" },
  { key: "agua_7dias", name: "Hidratado", icon: "💧", rarity: "Comum", desc: "Beba água 7 dias seguidos", color: "text-gray-400" },
  { key: "nivel_5", name: "Aprendiz", icon: "📖", rarity: "Comum", desc: "Alcance o nível 5", color: "text-gray-400" },
  { key: "nivel_10", name: "Veterano", icon: "⚡", rarity: "Incomum", desc: "Alcance o nível 10", color: "text-green-400" },
  { key: "nivel_20", name: "Mestre", icon: "🔮", rarity: "Raro", desc: "Alcance o nível 20", color: "text-blue-400" },
  { key: "nivel_50", name: "Lendário", icon: "🌈", rarity: "Lendário", desc: "Alcance o nível 50", color: "text-yellow-400" },
];

function getRarityColor(rarity: string) {
  switch (rarity) {
    case "Comum": return "border-gray-600 bg-gray-600/10";
    case "Incomum": return "border-green-600 bg-green-600/10";
    case "Raro": return "border-blue-600 bg-blue-600/10";
    case "Épico": return "border-purple-600 bg-purple-600/10";
    case "Lendário": return "border-yellow-600 bg-yellow-600/10";
    default: return "border-gray-600 bg-gray-600/10";
  }
}

function getRarityTextColor(rarity: string) {
  switch (rarity) {
    case "Comum": return "text-gray-400";
    case "Incomum": return "text-green-400";
    case "Raro": return "text-blue-400";
    case "Épico": return "text-purple-400";
    case "Lendário": return "text-yellow-400";
    default: return "text-gray-400";
  }
}

interface FeaturedAchievementsPopupProps {
  onClose: () => void;
}

export default function FeaturedAchievementsPopup({ onClose }: FeaturedAchievementsPopupProps) {
  const achievementsQuery = trpc.achievements.list.useQuery();
  const featuredQuery = trpc.achievements.featured.list.useQuery();
  const setFeatured = trpc.achievements.featured.set.useMutation();
  const utils = trpc.useUtils();

  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  // Local state for pending selections (before saving)
  const [pendingSelections, setPendingSelections] = useState<Record<number, string | null>>({});

  const unlockedKeys = new Set((achievementsQuery.data || []).map(a => a.achievementKey));
  const featured = featuredQuery.data || [];

  const getSlotAchievement = (slot: number) => {
    // Check pending first
    if (slot in pendingSelections) {
      const key = pendingSelections[slot];
      if (!key) return null;
      return ALL_ACHIEVEMENTS.find(a => a.key === key) || null;
    }
    // Then check saved
    const f = featured.find(f => f.slot === slot);
    if (!f || !f.achievementKey) return null;
    return ALL_ACHIEVEMENTS.find(a => a.key === f.achievementKey) || null;
  };

  const handleSelectForSlot = (achievementKey: string) => {
    if (selectingSlot === null) return;
    setPendingSelections(prev => ({ ...prev, [selectingSlot]: achievementKey }));
    setSelectingSlot(null);
  };

  const handleSave = async () => {
    for (const [slot, key] of Object.entries(pendingSelections)) {
      await setFeatured.mutateAsync({ slot: Number(slot), achievementKey: key });
    }
    utils.achievements.featured.list.invalidate();
    setPendingSelections({});
    onClose();
  };

  // Selection view - shows ALL achievements (unlocked + locked)
  if (selectingSlot !== null) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={onClose}>
        <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setSelectingSlot(null)} className="p-2 hover:bg-[#2a2a2a] rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold">Selecionar Conquista</h2>
          </div>

          <div className="space-y-2">
            {ALL_ACHIEVEMENTS.map(a => {
              const isUnlocked = unlockedKeys.has(a.key);
              return (
                <button
                  key={a.key}
                  onClick={() => isUnlocked && handleSelectForSlot(a.key)}
                  disabled={!isUnlocked}
                  className={`w-full rounded-xl p-4 flex items-center gap-3 border transition ${
                    isUnlocked
                      ? `${getRarityColor(a.rarity)} hover:bg-[#2a2a2a] cursor-pointer`
                      : "border-[#2a2a2a] bg-[#111] opacity-50 cursor-not-allowed"
                  }`}
                >
                  <span className="text-2xl">{a.icon}</span>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isUnlocked ? "text-white" : "text-gray-500"}`}>{a.name}</p>
                    <p className="text-xs text-gray-500">{a.desc}</p>
                  </div>
                  {isUnlocked ? (
                    <span className={`text-xs ${getRarityTextColor(a.rarity)}`}>{a.rarity}</span>
                  ) : (
                    <Lock className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Main view with 3 slots
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <Medal className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Conquistas em Destaque</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#2a2a2a] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-6 ml-[52px]">
          Escolha até 3 conquistas para exibir no seu perfil do ranking
        </p>

        {/* 3 Slots */}
        <div className="space-y-3 mb-6">
          {[1, 2, 3].map(slot => {
            const achievement = getSlotAchievement(slot);
            return (
              <button
                key={slot}
                onClick={() => setSelectingSlot(slot)}
                className={`w-full rounded-xl p-4 flex items-center gap-4 border transition hover:bg-[#2a2a2a] ${
                  achievement ? getRarityColor(achievement.rarity) : "border-dashed border-[#333] bg-[#111]"
                }`}
              >
                {achievement ? (
                  <>
                    <span className="text-2xl">{achievement.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{achievement.name}</p>
                      <p className="text-xs text-gray-400">{achievement.desc}</p>
                    </div>
                    <span className={`text-xs ${getRarityTextColor(achievement.rarity)}`}>{achievement.rarity}</span>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-2">
                    <p className="text-gray-500 text-sm">Toque para selecionar</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition"
        >
          Salvar Destaques
        </button>
      </div>
    </div>
  );
}
