
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, History, Trophy, Gavel, Scale, CheckCircle2 } from 'lucide-react';
import { Subject, StudySession, Task } from '../types';

interface CalendarViewProps {
  subjects: Subject[];
  tasks: Task[];
  userId: string;
  studySessions: StudySession[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ subjects, tasks, userId, studySessions }) => {
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
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    setSelectedDay(1);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    setSelectedDay(1);
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
  const dailyTasks = tasks.filter(t => t.completed && t.completedAt?.startsWith(selectedFullDate));

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight leading-none">Labuta</h2>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-base md:text-lg mt-1">Sua história acadêmica.</p>
        </div>
        
        <div className="bg-white dark:bg-sanfran-rubiDark/40 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex items-center justify-center gap-4 self-center md:self-auto">
          <div className="p-2 md:p-3 bg-usp-gold text-white rounded-xl md:rounded-2xl shadow-lg"><Trophy className="w-5 h-5 md:w-6 md:h-6" /></div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Geral</p>
            <p className="text-xl md:text-2xl font-black text-slate-950 dark:text-white">{displayTotal.value} <span className="text-xs font-normal">{displayTotal.unit}</span></p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-10 items-start">
        <div className="lg:col-span-3 bg-white dark:bg-sanfran-rubiDark/30 rounded-[2rem] md:rounded-[3rem] p-4 md:p-8 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
          <div className="flex items-center justify-between mb-6 md:mb-10">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 md:p-3 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-sanfran-rubi hover:text-white transition-all"><ChevronLeft className="w-5 h-5 md:w-6 md:h-6" /></button>
              <button onClick={nextMonth} className="p-2 md:p-3 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-sanfran-rubi hover:text-white transition-all"><ChevronRight className="w-5 h-5 md:w-6 md:h-6" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
              <div key={d} className="text-center text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest md:tracking-[0.2em]">{d}</div>
            ))}
            {blanks.map(b => <div key={`b-${b}`} />)}
            {days.map(day => {
              const y = currentDate.getFullYear();
              const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
              const d = day.toString().padStart(2, '0');
              const dateStr = `${y}-${m}-${d}`;
              const hasActivity = studySessions.some(s => s.start_time.startsWith(dateStr)) || tasks.some(t => t.completedAt?.startsWith(dateStr));
              const isSelected = selectedDay === day;
              const isToday = day === brNow.getDate() && currentDate.getMonth() === brNow.getMonth() && currentDate.getFullYear() === brNow.getFullYear();

              return (
                <button 
                  key={day} 
                  onClick={() => setSelectedDay(day)}
                  className={`aspect-square rounded-xl md:rounded-2xl border flex flex-col items-center justify-center relative transition-all group ${isSelected ? 'bg-sanfran-rubi border-sanfran-rubi text-white shadow-xl scale-105 z-10' : hasActivity ? 'bg-sanfran-rubi/5 border-sanfran-rubi/30 text-sanfran-rubi hover:bg-sanfran-rubi/10' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-slate-300'} ${isToday && !isSelected ? 'ring-2 ring-usp-gold ring-offset-2 dark:ring-offset-sanfran-rubiBlack' : ''}`}
                >
                  <span className="font-black text-sm md:text-lg">{day}</span>
                  {hasActivity && !isSelected && <div className="absolute top-1 md:top-2 right-1 md:right-2 w-1.5 h-1.5 md:w-2 md:h-2 bg-sanfran-rubi rounded-full shadow-sm"></div>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6 animate-in slide-in-from-right-6 duration-500" key={selectedDay}>
          <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border-t-[10px] md:border-t-[12px] border-t-sanfran-rubi border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden">
            <h3 className="text-lg md:text-xl font-black mb-1 text-slate-900 dark:text-white uppercase flex items-center gap-2"><History className="text-sanfran-rubi w-5 h-5" /> Protocolo</h3>
            <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 border-b border-slate-100 dark:border-white/10 pb-4">{selectedDay} de {monthNames[currentDate.getMonth()]}</p>
            <div className="space-y-6 relative z-10">
              <div>
                <h4 className="text-[9px] md:text-[11px] font-black uppercase text-slate-500 tracking-tighter mb-3 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Sessões</h4>
                <div className="space-y-2">
                  {dailySessions.map(s => {
                    const subject = subjects.find(sub => sub.id === s.subject_id);
                    const durationMins = Math.max(1, Math.round(Number(s.duration) / 60));
                    return (
                      <div key={s.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subject?.color || '#9B111E' }}></div>
                          <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[120px]">{subject?.name || 'Geral'}</span>
                        </div>
                        <span className="text-[10px] font-black text-sanfran-rubi">{durationMins} min</span>
                      </div>
                    );
                  })}
                  {dailySessions.length === 0 && <p className="text-[9px] italic text-slate-400 font-bold uppercase tracking-widest text-center py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-xl">Vazio</p>}
                </div>
              </div>
              <div>
                <h4 className="text-[9px] md:text-[11px] font-black uppercase text-slate-500 tracking-tighter mb-3 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-usp-blue" /> Julgados</h4>
                <div className="space-y-2">
                  {dailyTasks.map(t => (
                    <div key={t.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 flex items-center gap-2">
                      <Gavel className="w-3.5 h-3.5 text-usp-blue" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{t.title}</span>
                    </div>
                  ))}
                  {dailyTasks.length === 0 && <p className="text-[9px] italic text-slate-400 font-bold uppercase tracking-widest text-center py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-xl">Vazio</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
