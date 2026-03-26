
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, History, Trophy, Gavel, Scale, CheckCircle2, Calendar as CalendarIcon, List, LayoutGrid, Plus, ExternalLink, RefreshCw, MoreHorizontal, Info } from 'lucide-react';
import { Subject, StudySession, Task } from '../types';
import { supabase } from '../services/supabaseClient';
import { googleCalendarService } from '../services/googleCalendarService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarViewProps {
  subjects: Subject[];
  tasks: Task[];
  userId: string;
  studySessions: StudySession[];
}

type CalendarMode = 'month' | 'week' | 'agenda';

const CalendarView: React.FC<CalendarViewProps> = ({ subjects, tasks, userId, studySessions }) => {
  const [mode, setMode] = useState<CalendarMode>('month');
  const getBrasiliaNow = () => {
    const formatter = new Intl.DateTimeFormat('sv-SE', { 
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const parts = formatter.format(new Date()).split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  const brNow = useMemo(() => getBrasiliaNow(), []);
  const [currentDate, setCurrentDate] = useState(brNow);
  const [selectedDay, setSelectedDay] = useState<number>(brNow.getDate());
  const [isSyncing, setIsSyncing] = useState(false);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const totalDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const totalSeconds = studySessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  
  const displayTotal = useMemo(() => {
    if (totalSeconds < 3600) {
      return { value: Math.floor(totalSeconds / 60), unit: 'Minutos' };
    }
    return { value: (totalSeconds / 3600).toFixed(1), unit: 'Horas' };
  }, [totalSeconds]);

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => {
    if (mode === 'month') {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setCurrentDate(newDate);
      setSelectedDay(1);
    } else if (mode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const nextMonth = () => {
    if (mode === 'month') {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(newDate);
      setSelectedDay(1);
    } else if (mode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const getSelectedDateStr = () => {
    const y = currentDate.getFullYear();
    const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const d = selectedDay.toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const selectedFullDate = getSelectedDateStr();
  const dailySessions = studySessions.filter(s => s.start_time.startsWith(selectedFullDate));
  const dailyTasks = tasks.filter(t => (t.completed && t.completedAt?.startsWith(selectedFullDate)) || (t.dueDate?.startsWith(selectedFullDate)));

  const handleGoogleSync = async () => {
    setIsSyncing(true);
    try {
      const { auth, googleProvider, signInWithPopup } = await import('../firebase');
      const result = await signInWithPopup(auth, googleProvider);
      
      // Get the credential to access the Google token
      const credential = (await import('firebase/auth')).GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        googleCalendarService.setFirebaseToken(token);
        toast.success('Conectado ao Google Agenda com sucesso!');
        
        // Trigger a sync of all pending tasks
        const pendingTasks = tasks.filter(t => t.dueDate && !t.google_event_id);
        if (pendingTasks.length > 0) {
          toast.info(`Sincronizando ${pendingTasks.length} tarefas...`);
          let successCount = 0;
          
          for (const task of pendingTasks) {
            try {
              const subject = subjects.find(s => s.id === task.subjectId);
              const googleEvent = await googleCalendarService.syncTaskToGoogle(task, subject?.name);
              
              // If sync was successful, update the task in Supabase with the Google Event ID
              if (googleEvent && googleEvent.id) {
                const { error: supabaseError } = await supabase
                  .from('tasks')
                  .update({ google_event_id: googleEvent.id })
                  .eq('id', task.id);
                
                if (!supabaseError) {
                  successCount++;
                } else {
                  console.error('Error updating task in Supabase:', supabaseError);
                }
              }
            } catch (taskErr) {
              console.error(`Failed to sync task ${task.id}:`, taskErr);
            }
          }
          
          if (successCount > 0) {
            toast.success(`${successCount} tarefas sincronizadas com sucesso!`);
          } else if (pendingTasks.length > 0) {
            toast.error('Não foi possível sincronizar as tarefas com o Google Agenda.');
          }
        }
      } else {
        throw new Error('Não foi possível obter o token do Google');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        toast.info('Conexão cancelada: o pop-up foi fechado.');
      } else if (err.code === 'auth/popup-blocked') {
        toast.error('O pop-up foi bloqueado pelo navegador. Por favor, permita pop-ups para este site.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        toast.info('Uma solicitação de pop-up já está em andamento.');
      } else if (err.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado no Firebase. Verifique as instruções no chat.');
        console.error('Domínio atual:', window.location.hostname);
      } else if (err.code === 'auth/internal-error') {
        toast.error('Erro interno do Firebase. Tente novamente mais tarde.');
      } else {
        console.error('Error syncing with Google:', err);
        toast.error(`Erro ao conectar com o Google Agenda: ${err.message || 'Erro desconhecido'}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const renderMonthView = () => (
    <div className="bg-white dark:bg-[#191919] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <div className="flex bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg">
            <button onClick={() => setMode('month')} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${mode === 'month' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Mês</button>
            <button onClick={() => setMode('week')} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${mode === 'week' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Semana</button>
            <button onClick={() => setMode('agenda')} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${mode === 'agenda' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Agenda</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(brNow)} className="px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all border border-[#e9e9e7] dark:border-[#2f2f2f]">Hoje</button>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all"><ChevronLeft size={16} /></button>
            <button onClick={nextMonth} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-medium text-slate-500 uppercase tracking-tight border-b border-[#e9e9e7] dark:border-[#2f2f2f]">{d}</div>
        ))}
        {blanks.map(b => (
          <div key={`b-${b}`} className="min-h-[120px] border-r border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-slate-50/30 dark:bg-white/[0.02]" />
        ))}
        {days.map(day => {
          const y = currentDate.getFullYear();
          const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
          const d = day.toString().padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          const dayTasks = tasks.filter(t => t.dueDate?.startsWith(dateStr));
          const isSelected = selectedDay === day;
          const isToday = day === brNow.getDate() && currentDate.getMonth() === brNow.getMonth() && currentDate.getFullYear() === brNow.getFullYear();

          return (
            <div 
              key={day} 
              onClick={() => setSelectedDay(day)}
              className={`min-h-[120px] p-1 border-r border-b border-[#e9e9e7] dark:border-[#2f2f2f] relative transition-all cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-white/[0.03] ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
            >
              <div className="flex justify-start mb-1 px-1">
                <span className={`text-[11px] font-medium w-6 h-6 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-sanfran-rubi text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {day}
                </span>
              </div>
              
              <div className="space-y-0.5 overflow-hidden">
                {dayTasks.slice(0, 4).map(task => {
                  const subject = subjects.find(s => s.id === task.subjectId);
                  return (
                    <div key={task.id} className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium truncate bg-white dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-sm hover:border-sanfran-rubi/30 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: subject?.color || '#9B111E' }} />
                      <span className="truncate text-slate-700 dark:text-slate-200">{task.title}</span>
                    </div>
                  );
                })}
                {dayTasks.length > 4 && (
                  <div className="text-[8px] font-medium text-slate-500 pl-2">
                    + {dayTasks.length - 4} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    const endOfWeek = new Date(weekDays[6]);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white dark:bg-[#191919] rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-sm overflow-hidden flex flex-col h-[700px] animate-in fade-in duration-500">
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#e9e9e7] dark:border-[#2f2f2f] shrink-0 bg-[#fbfbfa] dark:bg-[#1f1f1f]">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-serif">
              {weekDays[0].getDate()} {monthNames[weekDays[0].getMonth()].substring(0, 3)} - {endOfWeek.getDate()} {monthNames[endOfWeek.getMonth()].substring(0, 3)}
            </h3>
            <div className="flex bg-slate-200/50 dark:bg-white/5 p-0.5 rounded-md">
              <button onClick={() => setMode('month')} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${mode === 'month' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Mês</button>
              <button onClick={() => setMode('week')} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${mode === 'week' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Semana</button>
              <button onClick={() => setMode('agenda')} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${mode === 'agenda' ? 'bg-white dark:bg-[#2f2f2f] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Agenda</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(brNow)} className="px-3 py-1 text-[10px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all border border-[#e9e9e7] dark:border-[#2f2f2f]">Hoje</button>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all"><ChevronLeft size={14} /></button>
              <button onClick={nextMonth} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="flex min-w-[800px]">
            {/* Time Column */}
            <div className="w-16 border-r border-[#e9e9e7] dark:border-[#2f2f2f] shrink-0 bg-[#fbfbfa] dark:bg-[#1f1f1f]">
              <div className="h-12 border-b border-[#e9e9e7] dark:border-[#2f2f2f]" /> {/* Header spacer */}
              {hours.map(hour => (
                <div key={hour} className="h-16 border-b border-[#e9e9e7] dark:border-[#2f2f2f] relative">
                  <span className="absolute -top-2 left-2 text-[9px] font-medium text-slate-400">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            <div className="flex-1 grid grid-cols-7 relative">
              {weekDays.map((date, dayIdx) => {
                const dateStr = date.toISOString().split('T')[0];
                const dayTasks = tasks.filter(t => t.dueDate?.startsWith(dateStr));
                const isToday = date.toDateString() === brNow.toDateString();

                return (
                  <div key={dateStr} className="flex flex-col border-r border-[#e9e9e7] dark:border-[#2f2f2f] last:border-r-0 relative group">
                    {/* Day Header */}
                    <div className="h-12 flex flex-col items-center justify-center border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#fbfbfa] dark:bg-[#1f1f1f] sticky top-0 z-10">
                      <p className={`text-[9px] font-bold uppercase tracking-tight mb-0.5 ${isToday ? 'text-sanfran-rubi' : 'text-slate-500'}`}>
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][date.getDay()]}
                      </p>
                      <div className={`text-xs font-bold ${isToday ? 'text-sanfran-rubi' : 'text-slate-900 dark:text-white'}`}>
                        {date.getDate()}
                      </div>
                    </div>

                    {/* Hour Slots */}
                    <div className="relative">
                      {hours.map(hour => (
                        <div key={hour} className="h-16 border-b border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors" />
                      ))}

                      {/* Tasks in Grid */}
                      {dayTasks.map(task => {
                        const subject = subjects.find(s => s.id === task.subjectId);
                        const taskDate = new Date(task.dueDate!);
                        const hour = taskDate.getHours();
                        const minutes = taskDate.getMinutes();
                        const topOffset = (hour * 64) + (minutes / 60 * 64);

                        return (
                          <div 
                            key={task.id} 
                            style={{ top: `${topOffset}px` }}
                            className="absolute left-1 right-1 p-1.5 bg-white dark:bg-[#2f2f2f] rounded-md border border-[#e9e9e7] dark:border-[#3f3f3f] shadow-sm z-20 hover:border-sanfran-rubi/50 transition-all min-h-[32px] overflow-hidden group/task"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subject?.color || '#9B111E' }} />
                              <span className="text-slate-500 text-[7px] font-bold uppercase truncate">{subject?.name || 'Geral'}</span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 text-[9px] font-bold leading-tight line-clamp-2">{task.title}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const upcomingTasks = tasks
      .filter(t => !t.completed && t.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    return (
      <div className="bg-white dark:bg-[#0d0303] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-sanfran-rubi/20 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Agenda de Prazos</h3>
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            <button onClick={() => setMode('month')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'month' ? 'bg-white dark:bg-sanfran-rubi text-sanfran-rubi dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Mês</button>
            <button onClick={() => setMode('week')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'week' ? 'bg-white dark:bg-sanfran-rubi text-sanfran-rubi dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Semana</button>
            <button onClick={() => setMode('agenda')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'agenda' ? 'bg-white dark:bg-sanfran-rubi text-sanfran-rubi dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Agenda</button>
          </div>
        </div>
        <div className="space-y-3">
          {upcomingTasks.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <CalendarIcon className="w-12 h-12 text-slate-100 dark:text-white/5 mx-auto" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum prazo futuro protocolado.</p>
            </div>
          ) : (
            upcomingTasks.map(task => {
              const date = new Date(task.dueDate!);
              const subject = subjects.find(s => s.id === task.subjectId);
              return (
                <div key={task.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center justify-between group hover:bg-white dark:hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-white dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                      <span className="text-[8px] font-black uppercase text-slate-400">{monthNames[date.getMonth()].substring(0, 3)}</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{date.getDate()}</span>
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">{task.title}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subject?.color || '#9B111E' }} />
                        {subject?.name || 'Geral'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${task.priority === 'urgente' ? 'bg-red-100 text-red-600' : task.priority === 'alta' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                      {task.priority || 'normal'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight leading-none">Agenda</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1 uppercase tracking-widest">Cronograma de pautas e prazos</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleGoogleSync}
            disabled={isSyncing}
            className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-white/5 text-slate-700 dark:text-white rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="p-1.5 bg-usp-blue text-white rounded-lg shadow-sm group-hover:rotate-12 transition-transform">
              {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CalendarIcon className="w-3.5 h-3.5" />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Google Sync</span>
          </button>

          <div className="bg-white dark:bg-white/5 px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-usp-gold text-white rounded-lg shadow-sm"><Trophy className="w-3.5 h-3.5" /></div>
            <div>
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total</p>
              <p className="text-xs font-black text-slate-950 dark:text-white leading-none">{displayTotal.value} {displayTotal.unit}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-3">
          {mode === 'month' ? renderMonthView() : mode === 'week' ? renderWeekView() : renderAgendaView()}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#0d0303] rounded-3xl p-6 border border-slate-200 dark:border-sanfran-rubi/20 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <History size={14} className="text-sanfran-rubi" /> Detalhes
              </h3>
              <span className="text-[9px] font-black text-slate-400 uppercase">{selectedDay} {monthNames[currentDate.getMonth()].substring(0, 3)}</span>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">Sessões</h4>
                <div className="space-y-2">
                  {dailySessions.map(s => {
                    const subject = subjects.find(sub => sub.id === s.subject_id);
                    const durationMins = Math.max(1, Math.round(Number(s.duration) / 60));
                    return (
                      <div key={s.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject?.color || '#9B111E' }}></div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px] truncate">{subject?.name || 'Geral'}</span>
                        </div>
                        <span className="text-[9px] font-black text-sanfran-rubi">{durationMins}m</span>
                      </div>
                    );
                  })}
                  {dailySessions.length === 0 && <p className="text-[9px] italic text-slate-300 font-bold uppercase text-center py-4">Nenhuma sessão</p>}
                </div>
              </div>

              <div>
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">Prazos</h4>
                <div className="space-y-2">
                  {dailyTasks.map(t => (
                    <div key={t.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gavel className={`w-3 h-3 ${t.completed ? 'text-emerald-500' : 'text-usp-blue'}`} />
                        <span className={`text-[10px] font-bold ${t.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'} truncate`}>{t.title}</span>
                      </div>
                    </div>
                  ))}
                  {dailyTasks.length === 0 && <p className="text-[9px] italic text-slate-300 font-bold uppercase text-center py-4">Nenhum prazo</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-sanfran-rubi rounded-3xl p-6 text-white shadow-lg shadow-red-900/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl"><Info size={16} /></div>
              <p className="text-[10px] font-black uppercase tracking-widest">Dica de Gestão</p>
            </div>
            <p className="text-xs font-medium leading-relaxed opacity-90">
              Sincronize seu Google Agenda para receber notificações de prazos diretamente no seu celular.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
