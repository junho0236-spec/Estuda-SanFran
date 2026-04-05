import Layout from "@/components/Layout";
import { useNotifications } from "@/contexts/NotificationContext";
import { trpc } from "@/lib/trpc";
import { Plus, ChevronLeft, ChevronRight, Calendar, X, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const priorityColors: Record<string, { bg: string; text: string; dot: string }> = {
  "high": { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", dot: "bg-red-500" },
  "medium": { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400", dot: "bg-yellow-500" },
  "low": { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", dot: "bg-green-500" },
  "urgent": { bg: "bg-purple-500/10 border-purple-500/30", text: "text-purple-400", dot: "bg-purple-500" },
};

const priorityLabels: Record<string, string> = {
  "high": "Alta",
  "medium": "Média",
  "low": "Baixa",
  "urgent": "Urgente",
};

function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dayOfWeek);
  const dates: { date: number; day: string; month: string; dateStr: string; dayOfWeek: number }[] = [];
  const dayNames = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    dates.push({
      date: d.getDate(),
      day: dayNames[i],
      month: d.toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase()),
      dateStr: d.toISOString().split('T')[0],
      dayOfWeek: i,
    });
  }
  return dates;
}

export default function Tasks() {
  const { addNotification } = useNotifications();
  const [showModal, setShowModal] = useState(false);
  const [targetDay, setTargetDay] = useState(0);
  const [recurrent, setRecurrent] = useState(false);
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newTime, setNewTime] = useState("");
  const [activeTab, setActiveTab] = useState("hoje");

  const days = useMemo(() => getWeekDates(), []);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const weekDayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

  // Backend queries
  const tasksQuery = trpc.tasks.list.useQuery({
    startDate: days[0].dateStr,
    endDate: days[6].dateStr,
  });

  // Mutations
  const createTaskMut = trpc.tasks.create.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
      toast.success(`Tarefa "${newTitle}" criada!`);
      addNotification({ type: 'task', title: 'Nova Tarefa!', message: `A tarefa "${newTitle}" foi criada.`, icon: '📋', color: 'text-cyan-400' });
      setShowModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewPriority("medium");
      setNewTime("");
      setRecurrent(false);
    },
  });

  const updateTaskMut = trpc.tasks.update.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
    },
  });

  const deleteTaskMut = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      tasksQuery.refetch();
      toast.success("Tarefa removida!");
    },
  });

  const tasks = tasksQuery.data ?? [];

  const toggleDay = (i: number) => {
    setSelectedDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);
  };

  const createTask = () => {
    if (!newTitle.trim()) { toast.error("Digite o título da tarefa"); return; }
    if (recurrent) {
      selectedDays.forEach(dayIdx => {
        createTaskMut.mutate({
          title: newTitle,
          description: newDesc || undefined,
          date: days[dayIdx].dateStr,
          time: newTime || undefined,
          priority: newPriority,
          isRecurring: true,
          recurringDays: selectedDays,
          xpReward: 10,
        });
      });
    } else {
      createTaskMut.mutate({
        title: newTitle,
        description: newDesc || undefined,
        date: days[targetDay].dateStr,
        time: newTime || undefined,
        priority: newPriority,
        isRecurring: false,
        xpReward: 10,
      });
    }
  };

  const toggleComplete = (taskId: number, currentState: boolean) => {
    updateTaskMut.mutate({ id: taskId, isCompleted: !currentState });
    if (!currentState) {
      toast.success("Tarefa concluída! +10 XP 🎉");
      addNotification({ type: 'task', title: 'Tarefa Concluída!', message: 'Você completou uma tarefa. +10 XP ganhos!', icon: '✅', color: 'text-green-400' });
    }
  };

  const todayDayIndex = new Date().getDay();

  return (
    <Layout>
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tarefas</h1>
              <p className="text-sm text-gray-400">{tasks.filter((t: any) => t.isCompleted).length}/{tasks.length} concluídas</p>
            </div>
          </div>
          <button onClick={() => { setTargetDay(todayDayIndex); setShowModal(true); }} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition text-sm">
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>

        {/* Week Header */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <button className="p-1 hover:bg-[#2a2a2a] rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-bold">{days[0].month} {new Date().getFullYear()}</span>
            <button className="p-1 hover:bg-[#2a2a2a] rounded-lg"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex justify-between">
            {days.map((d, i) => {
              const dayTasks = tasks.filter((t: any) => t.date === d.dateStr);
              const isToday = d.dateStr === todayStr;
              return (
                <button key={i} onClick={() => setTargetDay(i)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition ${
                    isToday ? 'bg-cyan-500/20 border border-cyan-500/30' : targetDay === i ? 'bg-[#2a2a2a]' : 'hover:bg-[#2a2a2a]'
                  }`}>
                  <span className={`text-[10px] ${isToday ? 'text-cyan-400 font-bold' : 'text-gray-500'}`}>{weekDayLabels[i]}</span>
                  <span className={`text-sm font-bold ${isToday ? 'text-cyan-400' : 'text-white'}`}>{d.date}</span>
                  {dayTasks.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Tasks */}
        <div>
          <h2 className="text-lg font-bold mb-3">{days[targetDay].day} - {days[targetDay].date} de {days[targetDay].month}</h2>
          {tasks.filter((t: any) => t.date === days[targetDay].dateStr).length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 text-center">
              <p className="text-gray-400 mb-3">Nenhuma tarefa para este dia</p>
              <button onClick={() => setShowModal(true)} className="bg-cyan-500 hover:bg-cyan-600 text-white py-2 px-4 rounded-xl text-sm transition">
                Adicionar tarefa
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.filter((t: any) => t.date === days[targetDay].dateStr).map((task: any) => {
                const colors = priorityColors[task.priority] || priorityColors.medium;
                return (
                  <div key={task.id} className={`bg-[#1a1a1a] border ${task.isCompleted ? 'border-green-500/30 opacity-70' : 'border-[#2a2a2a]'} rounded-2xl p-4`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleComplete(task.id, task.isCompleted)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                          task.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-cyan-400'
                        }`}>
                        {task.isCompleted && <span className="text-white text-xs">✓</span>}
                      </button>
                      <div className="flex-1">
                        <h3 className={`font-bold ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>{task.title}</h3>
                        {task.description && <p className="text-sm text-gray-400 mt-1">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text}`}>
                            {priorityLabels[task.priority] || task.priority}
                          </span>
                          {task.time && <span className="text-xs text-gray-500">{task.time}</span>}
                          {task.isRecurring && <span className="text-xs text-blue-400">🔄 Recorrente</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteTaskMut.mutate({ id: task.id })} className="p-1 hover:bg-red-500/20 rounded-lg transition">
                        <X className="w-4 h-4 text-gray-500 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Tarefa */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Nova Tarefa</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#2a2a2a] rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Título *</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Reunião, Estudar, Compras..."
                  className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition" />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Descrição</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Detalhes da tarefa..."
                  className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition h-20 resize-none" />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Horário (opcional)</label>
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition" />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Prioridade</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high", "urgent"] as const).map(p => (
                    <button key={p} onClick={() => setNewPriority(p)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${newPriority === p ? 'bg-cyan-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}>
                      {priorityLabels[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${recurrent ? 'bg-cyan-500 border-cyan-500' : 'border-gray-500'}`}>
                    {recurrent && <span className="text-white text-xs">✓</span>}
                  </div>
                  <input type="checkbox" checked={recurrent} onChange={e => setRecurrent(e.target.checked)} className="hidden" />
                  <span className="text-sm">Tarefa recorrente</span>
                </label>
              </div>

              {recurrent && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Dias da semana</label>
                  <div className="flex gap-2">
                    {weekDayLabels.map((d, i) => (
                      <button key={i} onClick={() => toggleDay(i)}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition ${selectedDays.includes(i) ? 'bg-cyan-500 text-white' : 'bg-[#2a2a2a] text-gray-500 hover:bg-[#333]'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!recurrent && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Dia</label>
                  <div className="flex gap-2 overflow-x-auto">
                    {days.map((d, i) => (
                      <button key={i} onClick={() => setTargetDay(i)}
                        className={`px-3 py-2 rounded-xl text-sm shrink-0 transition ${targetDay === i ? 'bg-cyan-500 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}>
                        {d.day.split('-')[0]} {d.date}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium hover:bg-[#333] transition">Cancelar</button>
                <button onClick={createTask} disabled={createTaskMut.isPending} className="flex-1 bg-cyan-500 text-white py-3 rounded-xl font-medium hover:bg-cyan-600 transition disabled:opacity-50">
                  {createTaskMut.isPending ? 'Criando...' : 'Criar Tarefa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
