
import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  BrainCircuit, 
  CheckCircle2, 
  Target, 
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Filter,
  Calendar as CalendarIconLucide,
  ChevronDown,
  Sparkles,
  AlertCircle,
  Loader2,
  Quote
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
  LabelList
} from 'recharts';
import { StudySession, Flashcard, Task, Subject } from '../types';
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface StatisticsProps {
  studySessions: StudySession[];
  flashcards: Flashcard[];
  tasks: Task[];
  subjects: Subject[];
  correctQuestionsCount?: number;
  confidenceLevels?: Record<string, 'certeza' | 'duvida' | 'chute'>;
}

const Statistics: React.FC<StatisticsProps> = ({ 
  studySessions, 
  flashcards, 
  tasks, 
  subjects,
  correctQuestionsCount = 0,
  confidenceLevels = {}
}) => {
  const [dateFilter, setDateFilter] = React.useState<'7days' | '30days' | 'all' | 'custom'>('all');
  const [customRange, setCustomRange] = React.useState<{ start: string, end: string }>({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const getFilteredData = () => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date = new Date();

    if (dateFilter === '7days') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
    } else if (dateFilter === '30days') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
    } else if (dateFilter === 'custom') {
      startDate = new Date(customRange.start);
      endDate = new Date(customRange.end);
      endDate.setHours(23, 59, 59, 999);
    }

    const filteredSessions = studySessions.filter(s => {
      const sDate = new Date(s.start_time);
      if (startDate && sDate < startDate) return false;
      if (sDate > endDate) return false;
      return true;
    });

    const filteredTasks = tasks.filter(t => {
      if (!t.completedAt) return false; 
      const tDate = new Date(t.completedAt);
      if (startDate && tDate < startDate) return false;
      if (tDate > endDate) return false;
      return true;
    });

    const totalTasksInPeriod = tasks.filter(t => {
      // If it was completed in the period, or if it's due in the period and not completed yet
      const tDate = t.completedAt ? new Date(t.completedAt) : (t.dueDate ? new Date(t.dueDate) : null);
      if (!tDate) return false;
      if (startDate && tDate < startDate) return false;
      if (tDate > endDate) return false;
      return true;
    }).length;
    
    return { filteredSessions, filteredTasks, totalTasksInPeriod };
  };

  const { filteredSessions, filteredTasks, totalTasksInPeriod } = getFilteredData();

  // Calculations using filtered data
  const totalStudySeconds = filteredSessions.reduce((acc, s) => acc + s.duration, 0);
  const totalStudyHours = (totalStudySeconds / 3600).toFixed(1);
  
  const completedTasks = filteredTasks.length;
  const taskCompletionRate = totalTasksInPeriod > 0 ? Math.round((completedTasks / totalTasksInPeriod) * 100) : 0;

  const reviewedCards = flashcards.filter(f => f.interval > 0).length;
  const totalCards = flashcards.length;
  const cardMasteryRate = totalCards > 0 ? Math.round((reviewedCards / totalCards) * 100) : 0;

  const [distributionType, setDistributionType] = React.useState<'time' | 'tasks'>('time');

  // Data for Charts
  const sessionsBySubject = subjects.map(subject => {
    const duration = filteredSessions
      .filter(s => s.subject_id === subject.id)
      .reduce((acc, s) => acc + s.duration, 0);
    
    const taskCount = filteredTasks
      .filter(t => t.subjectId === subject.id)
      .length;

    return {
      name: subject.name,
      value: distributionType === 'time' ? Math.round(duration / 60) : taskCount,
      color: subject.color,
      duration: Math.round(duration / 60),
      tasks: taskCount
    };
  }).filter(s => s.value > 0);

  // Last 7 days study time
  const chartDays = dateFilter === '30days' ? 30 : 7;
  const trendData = [...Array(chartDays)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    
    const dayDuration = studySessions
      .filter(s => s.start_time.startsWith(dateStr))
      .reduce((acc, s) => acc + s.duration, 0);
      
    const dayTasks = tasks
      .filter(t => t.completedAt && t.completedAt.startsWith(dateStr))
      .length;

    return {
      date: dateStr,
      day: dayName,
      minutes: Math.round(dayDuration / 60),
      tasks: dayTasks
    };
  }).reverse();

  // Last 4 weeks study time (Monthly Trend)
  const last4Weeks = [...Array(4)].map((_, i) => {
    const start = new Date();
    start.setDate(start.getDate() - (i * 7 + 6));
    const end = new Date();
    end.setDate(end.getDate() - (i * 7));
    
    const weekLabel = `Semana ${4 - i}`;
    
    const weekDuration = studySessions.filter(s => {
      const sDate = new Date(s.start_time);
      return sDate >= start && sDate <= end;
    }).reduce((acc, s) => acc + s.duration, 0);

    return {
      name: weekLabel,
      hours: parseFloat((weekDuration / 3600).toFixed(1))
    };
  }).reverse();

  const [chartView, setChartView] = React.useState<'weekly' | 'monthly'>('weekly');
  const [simplifyingId, setSimplifyingId] = React.useState<string | null>(null);
  const [simplifiedCards, setSimplifiedCards] = React.useState<Record<string, string>>({});

  const handleSimplify = async (card: Flashcard) => {
    setSimplifyingId(card.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Reescreva esta explicação jurídica de forma mais simples e didática, mantendo o rigor técnico, mas facilitando a memorização:\n\nPergunta: ${card.front}\nResposta Atual: ${card.back}`,
      });
      setSimplifiedCards(prev => ({ ...prev, [card.id]: result.text }));
    } catch (err) {
      console.error("Erro ao simplificar card:", err);
      alert("Erro ao simplificar com IA. Tente novamente.");
    } finally {
      setSimplifyingId(null);
    }
  };

  const leeches = flashcards.filter(f => (f.total_errors || 0) >= 5);

  const confidenceStats = React.useMemo(() => {
    const stats = { certeza: 0, duvida: 0, chute: 0 };
    Object.values(confidenceLevels).forEach(level => {
      if (stats[level] !== undefined) stats[level]++;
    });
    return stats;
  }, [confidenceLevels]);

  const confidenceData = [
    { name: 'Certeza', value: confidenceStats.certeza, color: '#10b981' },
    { name: 'Dúvida', value: confidenceStats.duvida, color: '#f59e0b' },
    { name: 'Chute', value: confidenceStats.chute, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-4 border-double border-slate-200 dark:border-sanfran-rubi/20">
        <div className="flex items-center gap-6">
           <div className="bg-slate-900 dark:bg-white p-4 rounded-lg shadow-2xl">
              <TrendingUp className="w-8 h-8 text-white dark:text-sanfran-rubiBlack" />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Métricas de Desempenho</p>
              <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter font-serif leading-none">
                Estatísticas Acadêmicas
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1 font-serif italic">
                Análise quantitativa da sua evolução no Largo de São Francisco
              </p>
           </div>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
            {(['7days', '30days', 'all', 'custom'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  dateFilter === filter 
                    ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                {filter === '7days' ? '7 Dias' : filter === '30days' ? '30 Dias' : filter === 'all' ? 'Tudo' : 'Personalizado'}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
              <input 
                type="date" 
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sanfran-rubi/50"
              />
              <span className="text-slate-400 font-black text-[10px]">ATÉ</span>
              <input 
                type="date" 
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sanfran-rubi/50"
              />
            </div>
          )}
        </div>
      </header>

      {/* Effort vs Delivery Explanation */}
      <div className="p-6 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sanfran-rubi/10 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:bg-sanfran-rubi/20 transition-all duration-700"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 bg-sanfran-rubi/20 rounded-2xl flex items-center justify-center shrink-0 border border-sanfran-rubi/30">
            <Sparkles className="text-sanfran-rubi w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">Esforço vs. Entrega</h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
              O <span className="text-white font-bold">Ranking</span> mede seu <span className="text-sanfran-rubi font-bold italic">Esforço (Tempo)</span>. 
              As <span className="text-white font-bold">Estatísticas</span> medem sua <span className="text-emerald-400 font-bold italic">Entrega (Tarefas)</span>. 
              Use as categorias nas tarefas para conectar os dois: o cronômetro alimenta o Ranking, enquanto o check alimenta sua eficiência.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-white">{totalStudyHours}h</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Esforço</div>
            </div>
            <div className="w-px h-10 bg-slate-800"></div>
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-400">{completedTasks}</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entrega</div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          icon={<Clock className="text-blue-500" />} 
          label="Tempo Total" 
          value={`${totalStudyHours}h`} 
          subValue="Horas de Foco"
          color="border-blue-500"
        />
        <MetricCard 
          icon={<BrainCircuit className="text-purple-500" />} 
          label="Flashcards" 
          value={reviewedCards} 
          subValue={`de ${totalCards} revisados`}
          color="border-purple-500"
        />
        <MetricCard 
          icon={<CheckCircle2 className="text-emerald-500" />} 
          label="Tarefas" 
          value={completedTasks} 
          subValue={`${taskCompletionRate}% concluídas`}
          color="border-emerald-500"
        />
        <MetricCard 
          icon={<Target className="text-sanfran-rubi" />} 
          label="Questões" 
          value={correctQuestionsCount} 
          subValue="Acertos Totais"
          color="border-sanfran-rubi"
        />
      </div>

      {/* Confidence Analysis Section */}
      {confidenceData.length > 0 && (
        <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/20 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <BrainCircuit className="text-sanfran-rubi w-5 h-5" />
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Análise Metacognitiva (Confiança)</h3>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Verdadeiro Domínio</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={confidenceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {confidenceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {confidenceData.map((stat, i) => (
                <div key={i} className="p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }}></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.name}</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</div>
                  <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase">Questões</p>
                </div>
              ))}
              
              <div className="sm:col-span-3 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                  <strong>Dica:</strong> Foque nas questões marcadas com <span className="text-amber-600 dark:text-amber-400 font-black">Dúvida</span> e <span className="text-red-500 font-black">Chute</span>. Elas representam seu maior potencial de crescimento imediato ao transformar incerteza em conhecimento sólido.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Study Time Trend Chart */}
        <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/20 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Activity className="text-sanfran-rubi w-5 h-5" />
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Tendência de Estudo</h3>
            </div>
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              <button 
                onClick={() => setChartView('weekly')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${chartView === 'weekly' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
              >
                7 Dias
              </button>
              <button 
                onClick={() => setChartView('monthly')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${chartView === 'monthly' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
              >
                Mensal
              </button>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'weekly' ? (
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}}
                    dy={10}
                    xAxisId={0}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}}
                    yAxisId={0}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(155, 17, 30, 0.05)'}}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Bar dataKey="minutes" fill="#9B111E" radius={[8, 8, 0, 0]} barSize={chartDays === 30 ? 15 : 40}>
                    {trendData.map((entry, index) => (
                      entry.tasks > 0 && (
                        <LabelList 
                          key={`label-${index}`}
                          dataKey="tasks" 
                          position="top" 
                          content={({ x, y, value }) => (
                            <g transform={`translate(${Number(x) + (chartDays === 30 ? 7 : 20)},${Number(y) - 15})`}>
                              <circle r="8" fill="#10b981" />
                              <text x="0" y="3" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">
                                {value}
                              </text>
                            </g>
                          )}
                        />
                      )
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={last4Weeks}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}}
                    dy={10}
                    xAxisId={0}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}}
                    yAxisId={0}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(155, 17, 30, 0.05)'}}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Bar dataKey="hours" fill="#9B111E" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/20 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <PieChartIcon className="text-usp-gold w-5 h-5" />
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Distribuição por Matéria</h3>
            </div>
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              <button 
                onClick={() => setDistributionType('time')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${distributionType === 'time' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
              >
                Tempo
              </button>
              <button 
                onClick={() => setDistributionType('tasks')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${distributionType === 'tasks' ? 'bg-white dark:bg-sanfran-rubi text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
              >
                Tarefas
              </button>
            </div>
          </div>

          <div className="h-[300px] w-full flex flex-col md:flex-row items-center">
            <div className="flex-1 h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sessionsBySubject}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sessionsBySubject.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 mt-4 md:mt-0 md:pl-8">
              {sessionsBySubject.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                    <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{s.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-900 dark:text-white">
                    {distributionType === 'time' ? `${s.duration} min` : `${s.tasks} tarefas`}
                  </span>
                </div>
              ))}
              {sessionsBySubject.length > 5 && (
                <p className="text-[9px] font-bold text-slate-400 italic text-center mt-2">... e mais {sessionsBySubject.length - 5} matérias</p>
              )}
            </div>
          </div>
        </div>

        {/* NEW: Weekly Study Time Bar Chart */}
        <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/20 shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-blue-500 w-5 h-5" />
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Tempo de Estudo Diário (Minutos)</h3>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detalhamento Semanal</span>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}}
                  dy={10}
                  xAxisId={0}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}}
                  yAxisId={0}
                />
                <Tooltip 
                  cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30}>
                  {trendData.slice(-7).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.minutes > 60 ? '#3b82f6' : '#94a3b8'} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Detailed Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ProgressCard 
          title="Domínio de Flashcards" 
          percentage={cardMasteryRate} 
          color="bg-purple-500" 
          description="Percentual de cards que já saíram da fase inicial de aprendizado."
        />
        <ProgressCard 
          title="Eficiência em Tarefas" 
          percentage={taskCompletionRate} 
          color="bg-emerald-500" 
          description="Taxa de conclusão de processos e petições na sua pauta."
        />
        <ProgressCard 
          title="Consistência Semanal" 
          percentage={Math.min(100, Math.round((trendData.filter(d => d.minutes > 0).length / trendData.length) * 100))} 
          color="bg-sanfran-rubi" 
          description="Frequência de dias estudados no período selecionado."
        />
      </div>

      {/* Gargalos de Aprendizado (Leeches) */}
      {leeches.length > 0 && (
        <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2rem] border border-sanfran-rubi/30 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-sanfran-rubi/10 rounded-2xl">
              <AlertCircle className="text-sanfran-rubi w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Gargalos de Aprendizado</h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cards com 5 ou mais erros consecutivos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {leeches.map(card => (
              <div key={card.id} className="group bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/10 hover:border-sanfran-rubi/50 transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-sanfran-rubi/10 text-sanfran-rubi text-[10px] font-black uppercase rounded-full">
                        {card.total_errors} Erros Consecutivos
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">ID: {card.id.slice(0, 8)}</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">{card.front}</h4>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 italic">
                      {card.back}
                    </div>
                    
                    {simplifiedCards[card.id] && (
                      <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Explicação Simplificada</span>
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{simplifiedCards[card.id]}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleSimplify(card)}
                    disabled={simplifyingId === card.id}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-sanfran-rubi text-sanfran-rubi dark:text-white border-2 border-sanfran-rubi rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sanfran-rubi hover:text-white transition-all shadow-lg disabled:opacity-50"
                  >
                    {simplifyingId === card.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Simplificando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Simplificar com IA
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log de Tarefas Concluídas */}
      <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/20 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500 w-5 h-5" />
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Log de Conclusão (Tarefas Mortas)</h3>
          </div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Histórico Recente</span>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-serif italic">
              Nenhuma tarefa concluída no período selecionado.
            </div>
          ) : (
            filteredTasks.sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()).map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {task.subjectId ? subjects.find(s => s.id === task.subjectId)?.name : 'Geral'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Concluída em {new Date(task.completedAt!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">+10 XP</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, subValue: string, color: string }> = ({ icon, label, value, subValue, color }) => (
  <div className={`bg-white dark:bg-sanfran-rubiDark/20 p-6 rounded-[2rem] border-l-8 ${color} shadow-lg hover:scale-105 transition-transform duration-300`}>
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>
    <div className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter leading-none mb-1">{value}</div>
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{subValue}</div>
  </div>
);

const ProgressCard: React.FC<{ title: string, percentage: number, color: string, description: string }> = ({ title, percentage, color, description }) => (
  <div className="bg-white dark:bg-sanfran-rubiDark/20 p-8 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/20 shadow-xl">
    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{title}</h4>
    <div className="flex items-end gap-4 mb-4">
      <div className="text-5xl font-black text-slate-950 dark:text-white tracking-tighter leading-none">{percentage}%</div>
      <div className="flex-1 h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-1">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
    <p className="text-[10px] font-medium text-slate-500 leading-relaxed">{description}</p>
  </div>
);

export default Statistics;
