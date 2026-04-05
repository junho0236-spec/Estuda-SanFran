import Layout from "@/components/Layout";
import { useNotifications } from "@/contexts/NotificationContext";
import { trpc } from "@/lib/trpc";
import { Plus, ChevronLeft, ChevronRight, Calendar, LayoutGrid, TrendingUp, X } from "lucide-react";
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function Habits() {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState("hoje");
  const [showModal, setShowModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("💪");
  const [newHabitTarget, setNewHabitTarget] = useState(1);
  const [newHabitFrequency, setNewHabitFrequency] = useState("Diário");
  const [productivity, setProductivity] = useState<number | null>(null);
  const [humor, setHumor] = useState<number | null>(null);

  const todayStr = useMemo(() => getTodayStr(), []);

  // Backend queries
  const habitsQuery = trpc.habits.list.useQuery();
  const completionsQuery = trpc.habits.completions.useQuery({
    startDate: todayStr,
    endDate: todayStr,
  });

  // Mutations
  const createHabitMut = trpc.habits.create.useMutation({
    onSuccess: () => {
      habitsQuery.refetch();
      toast.success(`Hábito "${newHabitName}" criado com sucesso!`);
      addNotification({ type: 'habit', title: 'Novo Hábito Criado!', message: `O hábito "${newHabitName}" foi adicionado à sua rotina.`, icon: newHabitIcon, color: 'text-orange-400' });
      setShowModal(false);
      setNewHabitName("");
      setNewHabitIcon("💪");
      setNewHabitTarget(1);
    },
  });

  const toggleHabitMut = trpc.habits.toggle.useMutation({
    onSuccess: (result) => {
      completionsQuery.refetch();
      if (result && 'completed' in result && result.completed) {
        toast.success(`Hábito concluído! +10 XP 🎉`);
      }
    },
  });

  const deleteHabitMut = trpc.habits.delete.useMutation({
    onSuccess: () => {
      habitsQuery.refetch();
      completionsQuery.refetch();
      toast.success("Hábito removido!");
    },
  });

  const habits = habitsQuery.data ?? [];

  // Calculate today's completions per habit
  const todayCompletions = useMemo(() => {
    const map: Record<number, number> = {};
    if (completionsQuery.data) {
      for (const c of completionsQuery.data) {
        map[c.habitId] = (map[c.habitId] || 0) + 1;
      }
    }
    return map;
  }, [completionsQuery.data]);

  const totalDone = habits.reduce((acc, h: any) => acc + ((todayCompletions[h.id] || 0) >= (h.dailyGoal || 1) ? 1 : 0), 0);

  const toggleHabitProgress = (habitId: number) => {
    toggleHabitMut.mutate({ habitId, date: todayStr });
  };

  const createHabit = () => {
    if (!newHabitName.trim()) {
      toast.error("Digite o nome do hábito");
      return;
    }
    const freqMap: Record<string, "daily" | "weekly" | "custom"> = {
      "Diário": "daily",
      "Semanal": "weekly",
      "Personalizado": "custom",
    };
    createHabitMut.mutate({
      name: newHabitName,
      icon: newHabitIcon,
      frequency: freqMap[newHabitFrequency] || "daily",
      dailyGoal: newHabitTarget,
    });
  };

  const icons = ["💪", "📚", "🏃", "💧", "🧘", "🎯", "✍️", "🍎", "😴", "🎵", "💊", "🧹"];

  const monthData = Array.from({ length: 31 }, (_, i) => ({ day: i + 1, value: 0 }));

  return (
    <Layout>
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Hábitos</h1>
              <p className="text-sm text-gray-400">{totalDone}/{habits.length} hoje</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition text-sm">
            <Plus className="w-4 h-4" />
            Novo Hábito
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-1.5 rounded-xl flex gap-1">
          <button onClick={() => setActiveTab("hoje")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'hoje' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-gray-300'}`}>
            <Calendar className="w-4 h-4" />
            Hoje
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{habits.length}</span>
          </button>
          <button onClick={() => setActiveTab("mes")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'mes' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-gray-300'}`}>
            <Calendar className="w-4 h-4" />
            Mês
          </button>
          <button onClick={() => setActiveTab("dashboards")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'dashboards' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-gray-300'}`}>
            <LayoutGrid className="w-4 h-4" />
            Dashboards
          </button>
        </div>

        {/* Tab Hoje */}
        {activeTab === "hoje" && (
          <div className="space-y-4">
            <p className="text-center text-gray-400">{new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</p>
            {habits.map((habit: any) => {
              const progress = todayCompletions[habit.id] || 0;
              const target = habit.dailyGoal || 1;
              return (
                <div key={habit.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-lg">{habit.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{habit.name}</h3>
                      <p className="text-xs text-gray-400">{habit.frequency === 'daily' ? 'Diário' : habit.frequency === 'weekly' ? 'Semanal' : 'Personalizado'} · {progress}/{target} {target > 1 ? 'vezes' : 'vez'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {progress >= target && (
                        <span className="text-green-400 text-sm font-bold">✓ Feito</span>
                      )}
                      <button onClick={() => deleteHabitMut.mutate({ id: habit.id })} className="p-1 hover:bg-red-500/20 rounded-lg transition">
                        <X className="w-4 h-4 text-gray-500 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: target }).map((_, i) => (
                      <button key={i} onClick={() => toggleHabitProgress(habit.id)}
                        disabled={toggleHabitMut.isPending}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                          i < progress
                            ? 'bg-green-500 text-white border border-green-400'
                            : 'bg-[#2a2a2a] border border-[#333] text-gray-500 hover:bg-[#333]'
                        }`}>
                        {i < progress ? '✓' : i + 1}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <div className="bg-[#2a2a2a] rounded-full h-1.5">
                      <div className="bg-green-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (progress / target) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {habits.length === 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 text-center">
                <p className="text-gray-400 mb-3">Nenhum hábito criado</p>
                <button onClick={() => setShowModal(true)} className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-xl text-sm transition">
                  Criar primeiro hábito
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Mês */}
        {activeTab === "mes" && (
          <div className="space-y-4">
            <p className="text-center text-gray-400">{new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</p>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">Evolução Mensal de hábitos</h3>
                    <p className="text-sm text-red-500">{new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-[#2a2a2a] rounded-lg transition"><ChevronLeft className="w-4 h-4" /></button>
                  <button className="p-1.5 hover:bg-[#2a2a2a] rounded-lg transition"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="day" stroke="#555" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#555" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-500">0%</p>
                  <p className="text-xs text-gray-400">Taxa média</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-400">0</p>
                  <p className="text-xs text-gray-400">Concluídos</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-400">0%</p>
                  <p className="text-xs text-gray-400">Melhor dia</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-[#1a1a1a] border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2"><div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center"><span className="text-sm">🎯</span></div><div><p className="text-sm font-bold">Esta Semana</p><p className="text-xs text-gray-400">1 dias</p></div></div>
              </div>
              <div className="flex-1 bg-[#1a1a1a] border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2"><div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"><span className="text-sm">✅</span></div><div><p className="text-sm font-bold">{new Date().toLocaleString('pt-BR', { month: 'long' })}</p><p className="text-xs text-gray-400">{new Date().getDate()} dias</p></div></div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Dashboards */}
        {activeTab === "dashboards" && (
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
              <div className="flex gap-2 overflow-x-auto">
                {Array.from({ length: 9 }, (_, i) => i + 4).map(d => (
                  <button key={d} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 transition ${d === new Date().getDate() ? 'border-2 border-green-500 text-green-400' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Produtividade */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center"><span>⚡</span></div>
                <div>
                  <h3 className="font-bold">Produtividade</h3>
                  <p className="text-xs text-gray-400">Média: {productivity !== null ? productivity : '-'}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 11 }).map((_, i) => (
                  <button key={i} onClick={() => { setProductivity(i); toast.success(`Produtividade: ${i}/10`); }}
                    className={`flex-1 h-9 rounded text-xs font-bold transition ${
                      productivity !== null && i <= productivity ? 'bg-yellow-500 text-black' : 'bg-[#2a2a2a] text-gray-500 hover:bg-[#333]'
                    }`}>{i}</button>
                ))}
              </div>
            </div>

            {/* Humor */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"><span>😊</span></div>
                <div>
                  <h3 className="font-bold">Humor</h3>
                  <p className="text-xs text-gray-400">Média: {humor !== null ? humor : '-'}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 11 }).map((_, i) => (
                  <button key={i} onClick={() => { setHumor(i); toast.success(`Humor: ${i}/10`); }}
                    className={`flex-1 h-9 rounded text-xs font-bold transition ${
                      humor !== null && i <= humor ? 'bg-green-500 text-black' : 'bg-[#2a2a2a] text-gray-500 hover:bg-[#333]'
                    }`}>{i}</button>
                ))}
              </div>
            </div>

            {/* Tendências */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5 text-red-500" /></div>
                  <div><h3 className="font-bold">Tendências de Bem-estar</h3><p className="text-sm text-gray-400">{new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</p></div>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-[#2a2a2a] rounded-lg transition"><ChevronLeft className="w-4 h-4" /></button>
                  <button className="p-1.5 hover:bg-[#2a2a2a] rounded-lg transition"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-400">✏️ Clique em um ponto do gráfico para editar dias anteriores</p>
              </div>
              <p className="text-center text-gray-500 py-8">Sem dados de bem-estar para este mês</p>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400"></span><span className="text-xs text-gray-400">🌙 Sono</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span><span className="text-xs text-gray-400">⚡ Produtividade</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400"></span><span className="text-xs text-gray-400">😊 Humor</span></div>
              </div>
            </div>

            {/* Histórico */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><span className="text-gray-400">📊</span><h3 className="font-bold">Histórico de Hábitos</h3></div>
                <div className="flex gap-1 bg-[#2a2a2a] rounded-lg p-1">
                  <button className="px-3 py-1 rounded text-xs bg-[#333] text-white">Mensal</button>
                  <button className="px-3 py-1 rounded text-xs text-gray-400">Anual</button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <button className="p-1"><ChevronLeft className="w-4 h-4 text-gray-400" /></button>
                <span className="font-bold">{new Date().getFullYear()}</span>
                <button className="p-1"><ChevronRight className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["Jan", "Fev", "Mar"].map(m => (
                  <div key={m} className="bg-[#2a2a2a] rounded-xl p-3 text-center"><p className="text-xs text-gray-400">{m}</p><p className="text-lg font-bold text-red-500">0%</p></div>
                ))}
              </div>
            </div>

            {/* Comparativo */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-gray-400" /><h3 className="font-bold">Comparativo Anual</h3></div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{new Date().getFullYear() - 1} <span className="font-bold">0%</span></span>
                <span className="text-gray-500">—</span>
                <span className="text-sm">{new Date().getFullYear()} <span className="font-bold">0%</span></span>
              </div>
              <p className="text-center text-gray-500 text-sm">0%</p>
            </div>

            {/* Melhor Mês / Menor Taxa */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><span className="text-sm">🏆</span><span className="text-xs text-red-400">Melhor Mês</span></div>
                <p className="font-bold">Janeiro</p><p className="text-red-500 text-sm">0%</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><span className="text-sm">🎯</span><span className="text-xs text-green-400">Menor Taxa</span></div>
                <p className="font-bold">{new Date().toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}</p><p className="text-green-500 text-sm">0%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo Hábito */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Novo Hábito</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#2a2a2a] rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Ícone</label>
                <div className="flex gap-2 flex-wrap">
                  {icons.map(ic => (
                    <button key={ic} onClick={() => setNewHabitIcon(ic)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition ${newHabitIcon === ic ? 'bg-red-500 ring-2 ring-red-400' : 'bg-[#2a2a2a] hover:bg-[#333]'}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Nome do hábito *</label>
                <input type="text" value={newHabitName} onChange={e => setNewHabitName(e.target.value)} placeholder="Ex: Meditar, Ler, Exercício..."
                  className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Frequência</label>
                <div className="flex gap-2">
                  {["Diário", "Semanal", "Personalizado"].map(f => (
                    <button key={f} onClick={() => setNewHabitFrequency(f)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${newHabitFrequency === f ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Meta diária (vezes)</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setNewHabitTarget(Math.max(1, newHabitTarget - 1))} className="w-10 h-10 bg-[#2a2a2a] rounded-xl flex items-center justify-center hover:bg-[#333] transition">-</button>
                  <span className="text-2xl font-bold w-8 text-center">{newHabitTarget}</span>
                  <button onClick={() => setNewHabitTarget(newHabitTarget + 1)} className="w-10 h-10 bg-[#2a2a2a] rounded-xl flex items-center justify-center hover:bg-[#333] transition">+</button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium hover:bg-[#333] transition">Cancelar</button>
                <button onClick={createHabit} disabled={createHabitMut.isPending} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50">
                  {createHabitMut.isPending ? 'Criando...' : 'Criar Hábito'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
