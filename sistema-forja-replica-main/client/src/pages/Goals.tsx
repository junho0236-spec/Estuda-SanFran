import Layout from "@/components/Layout";
import { useNotifications } from "@/contexts/NotificationContext";
import { trpc } from "@/lib/trpc";
import { Plus, Target, X, ChevronRight, Trash2, Trophy, Pause } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const categories = [
  { name: "Saúde", icon: "❤️", color: "bg-red-500/20 border-red-500/30" },
  { name: "Carreira", icon: "💼", color: "bg-blue-500/20 border-blue-500/30" },
  { name: "Finanças", icon: "💰", color: "bg-yellow-500/20 border-yellow-500/30" },
  { name: "Educação", icon: "📚", color: "bg-purple-500/20 border-purple-500/30" },
  { name: "Pessoal", icon: "🌟", color: "bg-green-500/20 border-green-500/30" },
  { name: "Fitness", icon: "🏋️", color: "bg-orange-500/20 border-orange-500/30" },
];

export default function Goals() {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState("ativas");
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Saúde");
  const [newDeadline, setNewDeadline] = useState("30");

  // Backend queries
  const goalsQuery = trpc.goals.list.useQuery({});

  // Mutations
  const createGoalMut = trpc.goals.create.useMutation({
    onSuccess: () => {
      goalsQuery.refetch();
      toast.success(`Meta "${newTitle}" criada com sucesso!`);
      addNotification({ type: 'goal', title: 'Nova Meta Criada!', message: `"${newTitle}" foi adicionada às suas metas. Prazo: ${newDeadline} dias.`, icon: '🎯', color: 'text-purple-400' });
      setShowModal(false);
    },
  });

  const updateGoalMut = trpc.goals.update.useMutation({
    onSuccess: () => {
      goalsQuery.refetch();
    },
  });

  const deleteGoalMut = trpc.goals.delete.useMutation({
    onSuccess: () => {
      goalsQuery.refetch();
      toast.info("Meta removida");
    },
  });

  const goals = goalsQuery.data ?? [];

  const openModal = () => {
    setShowModal(true);
    setStep(1);
    setNewTitle("");
    setNewDesc("");
    setNewCategory("Saúde");
    setNewDeadline("30");
  };

  const nextStep = () => {
    if (step === 1 && !newTitle.trim()) { toast.error("Digite o título da meta"); return; }
    if (step < 4) setStep(step + 1);
    else createGoal();
  };

  const createGoal = () => {
    const cat = categories.find(c => c.name === newCategory);
    createGoalMut.mutate({
      title: newTitle,
      description: newDesc || undefined,
      category: newCategory,
      icon: cat?.icon || "🎯",
      deadline: newDeadline,
    });
  };

  const updateProgress = (goalId: number, delta: number, goal: any) => {
    const newProgress = Math.min(100, Math.max(0, (goal.progress || 0) + delta));
    if (newProgress >= 100 && (goal.progress || 0) < 100) {
      toast.success(`Meta "${goal.title}" concluída! +100 XP 🎉`);
      addNotification({ type: 'goal', title: 'Meta Concluída!', message: `Parabéns! "${goal.title}" foi concluída! +100 XP e +20 Coins ganhos!`, icon: '🏆', color: 'text-yellow-400' });
      updateGoalMut.mutate({ id: goalId, progress: 100, status: "completed" });
    } else {
      updateGoalMut.mutate({ id: goalId, progress: newProgress });
    }
  };

  const togglePause = (goalId: number, currentStatus: string) => {
    const newStatus = currentStatus === "paused" ? "active" as const : "paused" as const;
    toast.info(newStatus === "paused" ? "Meta pausada" : "Meta reativada");
    updateGoalMut.mutate({ id: goalId, status: newStatus });
  };

  const filtered = goals.filter((g: any) => {
    if (activeTab === "ativas") return g.status === "active";
    if (activeTab === "concluidas") return g.status === "completed";
    return g.status === "paused";
  });

  const activeCount = goals.filter((g: any) => g.status === "active").length;
  const completedCount = goals.filter((g: any) => g.status === "completed").length;

  return (
    <Layout>
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Metas</h1>
              <p className="text-sm text-gray-400">{activeCount} ativas · {completedCount} concluídas</p>
            </div>
          </div>
          <button onClick={openModal} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition text-sm">
            <Plus className="w-4 h-4" />
            Nova Meta
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab("ativas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'ativas' ? 'bg-red-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400'}`}>
            <Target className="w-4 h-4" /> Ativas
          </button>
          <button onClick={() => setActiveTab("concluidas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'concluidas' ? 'bg-red-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400'}`}>
            <Trophy className="w-4 h-4" /> Concluídas
          </button>
          <button onClick={() => setActiveTab("pausadas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'pausadas' ? 'bg-red-500 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400'}`}>
            <Pause className="w-4 h-4" /> Pausadas
          </button>
        </div>

        {/* Goals List */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((goal: any) => {
              const cat = categories.find(c => c.name === goal.category) || categories[0];
              return (
                <div key={goal.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${cat.color} rounded-xl flex items-center justify-center border`}>
                        <span className="text-lg">{cat.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-bold">{goal.title}</h3>
                        <p className="text-xs text-gray-400">{goal.category} · {goal.deadline || '—'} dias</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {goal.status !== "completed" && (
                        <button onClick={() => togglePause(goal.id, goal.status)} className="p-1.5 hover:bg-[#2a2a2a] rounded-lg transition text-xs text-gray-400">
                          {goal.status === "paused" ? "▶" : "⏸"}
                        </button>
                      )}
                      <button onClick={() => deleteGoalMut.mutate({ id: goal.id })} className="p-1.5 hover:bg-[#2a2a2a] rounded-lg transition">
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  {goal.description && <p className="text-sm text-gray-400 mb-3">{goal.description}</p>}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 bg-[#2a2a2a] rounded-full h-2.5">
                      <div className={`h-full rounded-full transition-all duration-300 ${(goal.progress || 0) >= 100 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${goal.progress || 0}%` }}></div>
                    </div>
                    <span className="text-sm font-bold">{goal.progress || 0}%</span>
                  </div>
                  {goal.status === "active" && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => updateProgress(goal.id, 10, goal)} className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 py-2 rounded-xl text-sm font-medium hover:bg-red-500/20 transition">+10%</button>
                      <button onClick={() => updateProgress(goal.id, 25, goal)} className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 py-2 rounded-xl text-sm font-medium hover:bg-red-500/20 transition">+25%</button>
                      <button onClick={() => updateProgress(goal.id, -10, goal)} className="flex-1 bg-[#2a2a2a] border border-[#333] text-gray-400 py-2 rounded-xl text-sm font-medium hover:bg-[#333] transition">-10%</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-[#2a2a2a] rounded-2xl flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-4">
              {activeTab === "ativas" && "Nenhuma meta ativa"}
              {activeTab === "concluidas" && "Nenhuma meta concluída"}
              {activeTab === "pausadas" && "Nenhuma meta pausada"}
            </p>
            {activeTab === "ativas" && (
              <button onClick={openModal} className="bg-[#2a2a2a] border border-[#333] text-white py-2.5 px-5 rounded-xl flex items-center gap-2 hover:bg-[#333] transition">
                <Plus className="w-4 h-4" /> Criar meta
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Nova Meta - Wizard */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Nova Meta</h2>
                  <p className="text-sm text-gray-400">Etapa {step} de 4 — {step === 1 ? 'Objetivo' : step === 2 ? 'Categoria' : step === 3 ? 'Prazo' : 'Revisão'}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#2a2a2a] rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`flex-1 h-1 rounded-full transition ${s <= step ? 'bg-red-500' : 'bg-[#2a2a2a]'}`}></div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Qual é a sua meta? *</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Ler 12 livros este ano"
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Descrição (opcional)</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descreva sua meta..."
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition h-20 resize-none" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <label className="text-sm text-gray-400 mb-2 block">Categoria</label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(cat => (
                    <button key={cat.name} onClick={() => setNewCategory(cat.name)}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition ${newCategory === cat.name ? 'bg-red-500/10 border-red-500/50 text-white' : 'bg-[#2a2a2a] border-[#333] text-gray-400 hover:bg-[#333]'}`}>
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <label className="text-sm text-gray-400 mb-2 block">Prazo (em dias)</label>
                <div className="grid grid-cols-3 gap-3">
                  {["7", "14", "30", "60", "90", "180"].map(d => (
                    <button key={d} onClick={() => setNewDeadline(d)}
                      className={`py-3 rounded-xl text-sm font-medium transition ${newDeadline === d ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}>
                      {d} dias
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Ou digite um valor personalizado</label>
                  <input type="number" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} min="1"
                    className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-red-500 focus:outline-none transition" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Revisão</h3>
                <div className="bg-[#2a2a2a] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between"><span className="text-gray-400">Meta:</span><span className="font-bold">{newTitle}</span></div>
                  {newDesc && <div className="flex justify-between"><span className="text-gray-400">Descrição:</span><span className="text-sm">{newDesc}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-400">Categoria:</span><span>{newCategory}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Prazo:</span><span>{newDeadline} dias</span></div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium hover:bg-[#333] transition">Voltar</button>
              )}
              <button onClick={nextStep} disabled={createGoalMut.isPending}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50">
                {step < 4 ? (<>Próximo <ChevronRight className="w-4 h-4" /></>) : (createGoalMut.isPending ? 'Criando...' : 'Criar Meta')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
