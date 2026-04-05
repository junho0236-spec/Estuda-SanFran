import Layout from "@/components/Layout";
import { useNotifications } from "@/contexts/NotificationContext";
import { trpc } from "@/lib/trpc";
import { Plus, Clock, Play, Pause, RotateCcw, Maximize, Minus, ChevronDown, ChevronUp, Settings, FolderOpen, X, Trash2 } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";

const projectColors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

export default function Focus() {
  const { addNotification } = useNotifications();
  const [focusTime, setFocusTime] = useState(25);
  const [breakTime, setBreakTime] = useState(5);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFocus, setIsFocus] = useState(true);
  const [metaHours] = useState(40);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#EF4444");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Backend queries
  const projectsQuery = trpc.focus.projects.list.useQuery();
  const sessionsQuery = trpc.focus.sessions.list.useQuery({});

  // Mutations
  const createProjectMut = trpc.focus.projects.create.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
      toast.success(`Projeto "${newProjectName}" criado!`);
      setShowProjectModal(false);
      setNewProjectName("");
      setNewProjectColor("#EF4444");
    },
  });

  const deleteProjectMut = trpc.focus.projects.delete.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
      toast.success("Projeto removido!");
    },
  });

  const createSessionMut = trpc.focus.sessions.create.useMutation({
    onSuccess: () => {
      sessionsQuery.refetch();
    },
  });

  const projects = projectsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            if (isFocus) {
              const projName = selectedProject?.name || "Sem projeto";
              const now = new Date();
              createSessionMut.mutate({
                projectId: selectedProjectId || undefined,
                projectName: projName,
                duration: focusTime,
                type: "focus",
                date: now.toISOString().split('T')[0],
                time: now.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
              });
              toast.success(`Sessão de foco concluída! ${focusTime}min +${focusTime} XP 🎉`);
              addNotification({ type: 'focus', title: 'Foco Concluído!', message: `${focusTime}min de foco em "${projName}". +${focusTime} XP!`, icon: '🎯', color: 'text-cyan-400' });
              setIsFocus(false);
              return breakTime * 60;
            } else {
              toast.info("Pausa concluída! Hora de focar novamente.");
              setIsFocus(true);
              return focusTime * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, isFocus, focusTime, breakTime, selectedProjectId]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => { setIsRunning(false); setTimeLeft(isFocus ? focusTime * 60 : breakTime * 60); };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = isFocus ? focusTime * 60 : breakTime * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  const todayMinutes = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return sessions.filter((s: any) => s.type === "focus" && s.date === todayStr).reduce((acc: number, s: any) => acc + s.duration, 0);
  }, [sessions]);

  const weekMinutes = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - dayOfWeek);
    const sundayStr = sunday.toISOString().split('T')[0];
    return sessions.filter((s: any) => s.type === "focus" && s.date >= sundayStr).reduce((acc: number, s: any) => acc + s.duration, 0);
  }, [sessions]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
        <button onClick={toggleFullscreen} className="absolute top-6 right-6 p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition">
          <Minus className="w-5 h-5" />
        </button>
        <p className="text-sm text-gray-400 mb-4">{isFocus ? 'FOCO' : 'PAUSA'}</p>
        <div className="relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#2a2a2a" strokeWidth="3" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={isFocus ? "#EF4444" : "#10B981"} strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-bold font-mono">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button onClick={resetTimer} className="w-14 h-14 bg-[#2a2a2a] rounded-full flex items-center justify-center hover:bg-[#333] transition">
            <RotateCcw className="w-6 h-6" />
          </button>
          <button onClick={toggleTimer} className={`w-16 h-16 rounded-full flex items-center justify-center transition ${isFocus ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
            {isRunning ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white ml-1" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Foco</h1>
              <p className="text-sm text-gray-400">Timer Pomodoro</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleFullscreen} className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl hover:bg-[#2a2a2a] transition">
              <Maximize className="w-5 h-5" />
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl hover:bg-[#2a2a2a] transition">
              {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex justify-center gap-3 mb-6">
            <button onClick={() => { setIsFocus(true); if (!isRunning) setTimeLeft(focusTime * 60); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isFocus ? 'bg-red-500 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>
              Foco
            </button>
            <button onClick={() => { setIsFocus(false); if (!isRunning) setTimeLeft(breakTime * 60); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${!isFocus ? 'bg-green-500 text-white' : 'bg-[#2a2a2a] text-gray-400'}`}>
              Pausa
            </button>
          </div>

          <div className="flex justify-center mb-6">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#2a2a2a" strokeWidth="4" />
                <circle cx="50" cy="50" r="45" fill="none" stroke={isFocus ? "#EF4444" : "#10B981"} strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold font-mono">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
                <span className="text-xs text-gray-400 mt-1">{isFocus ? 'Foco' : 'Pausa'}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 mb-4">
            <button onClick={resetTimer} className="w-12 h-12 bg-[#2a2a2a] rounded-full flex items-center justify-center hover:bg-[#333] transition">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={toggleTimer} className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${isFocus ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-green-500 hover:bg-green-600 shadow-green-500/30'}`}>
              {isRunning ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
            </button>
          </div>

          {/* Time settings */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Foco:</span>
              <button onClick={() => { setFocusTime(Math.max(5, focusTime - 5)); if (isFocus && !isRunning) setTimeLeft(Math.max(5, focusTime - 5) * 60); }} className="w-7 h-7 bg-[#2a2a2a] rounded flex items-center justify-center hover:bg-[#333]">-</button>
              <span className="font-bold w-8 text-center">{focusTime}</span>
              <button onClick={() => { setFocusTime(focusTime + 5); if (isFocus && !isRunning) setTimeLeft((focusTime + 5) * 60); }} className="w-7 h-7 bg-[#2a2a2a] rounded flex items-center justify-center hover:bg-[#333]">+</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Pausa:</span>
              <button onClick={() => { setBreakTime(Math.max(1, breakTime - 1)); if (!isFocus && !isRunning) setTimeLeft(Math.max(1, breakTime - 1) * 60); }} className="w-7 h-7 bg-[#2a2a2a] rounded flex items-center justify-center hover:bg-[#333]">-</button>
              <span className="font-bold w-8 text-center">{breakTime}</span>
              <button onClick={() => { setBreakTime(breakTime + 1); if (!isFocus && !isRunning) setTimeLeft((breakTime + 1) * 60); }} className="w-7 h-7 bg-[#2a2a2a] rounded flex items-center justify-center hover:bg-[#333]">+</button>
            </div>
          </div>
        </div>

        {/* Project selector */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowProjectSelector(!showProjectSelector)} className="flex items-center gap-2 flex-1">
              <FolderOpen className="w-5 h-5 text-gray-400" />
              <span className="text-sm">{selectedProject ? selectedProject.name : 'Selecionar projeto'}</span>
              {selectedProject && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedProject.color }}></span>}
            </button>
            <button onClick={() => setShowProjectModal(true)} className="p-2 bg-[#2a2a2a] rounded-lg hover:bg-[#333] transition">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {showProjectSelector && (
            <div className="mt-3 space-y-2">
              <button onClick={() => { setSelectedProjectId(null); setShowProjectSelector(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${!selectedProjectId ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}>
                Sem projeto
              </button>
              {projects.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between">
                  <button onClick={() => { setSelectedProjectId(p.id); setShowProjectSelector(false); }}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${selectedProjectId === p.id ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></span>
                    {p.name}
                    <span className="text-xs text-gray-500 ml-auto">{p.totalMinutes || 0}min</span>
                  </button>
                  <button onClick={() => deleteProjectMut.mutate({ id: p.id })} className="p-1 hover:bg-red-500/20 rounded-lg ml-1">
                    <Trash2 className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Hoje</p>
            <p className="text-lg font-bold text-red-500">{todayMinutes}min</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Semana</p>
            <p className="text-lg font-bold text-cyan-400">{weekMinutes}min</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Meta</p>
            <p className="text-lg font-bold text-yellow-400">{metaHours}h</p>
          </div>
        </div>

        {/* History */}
        {showHistory && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <h3 className="font-bold mb-3">Histórico de Sessões</h3>
            {sessions.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sessions.slice(0, 20).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between bg-[#2a2a2a] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.type === 'focus' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                      <span className="text-sm">{s.projectName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{s.time}</span>
                      <span className="text-sm font-bold">{s.duration}min</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">Nenhuma sessão registrada</p>
            )}
          </div>
        )}
      </div>

      {/* Modal Novo Projeto */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => setShowProjectModal(false)}>
          <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Novo Projeto</h2>
              <button onClick={() => setShowProjectModal(false)} className="p-2 hover:bg-[#2a2a2a] rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Nome do projeto *</label>
                <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Ex: Trabalho, Estudo..."
                  className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Cor</label>
                <div className="flex gap-2">
                  {projectColors.map(c => (
                    <button key={c} onClick={() => setNewProjectColor(c)}
                      className={`w-10 h-10 rounded-lg transition ${newProjectColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''}`}
                      style={{ backgroundColor: c }}></button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowProjectModal(false)} className="flex-1 bg-[#2a2a2a] text-gray-300 py-3 rounded-xl font-medium hover:bg-[#333] transition">Cancelar</button>
                <button onClick={() => {
                  if (!newProjectName.trim()) { toast.error("Digite o nome do projeto"); return; }
                  createProjectMut.mutate({ name: newProjectName, color: newProjectColor });
                }} disabled={createProjectMut.isPending} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50">
                  {createProjectMut.isPending ? 'Criando...' : 'Criar Projeto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
