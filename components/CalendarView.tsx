
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, History, Trophy, Gavel, Scale, CheckCircle2 } from 'lucide-react';
import { Subject, StudySession, Task } from '../types';

interface CalendarViewProps {
  subjects: Subject[];
  tasks: Task[];
  userId: string;
  studySessions: StudySession[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ subjects, tasks, userId, studySessions }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const totalDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const totalSeconds = studySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Filtros para o dia selecionado
  const selectedFullDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).toISOString().split('T')[0];
  
  const dailySessions = studySessions.filter(s => s.start_time.startsWith(selectedFullDate));
  const dailyTasks = tasks.filter(t => t.completed && t.completedAt?.startsWith(selectedFullDate));

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Registro de Labuta</h2>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-lg">Seu histórico de dedicação acadêmica.</p>
        </div>
        
        <div className="bg-white dark:bg-sanfran-rubiDark/40 p-5 rounded-3xl border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-usp-gold text-white rounded-2xl shadow-lg"><Trophy className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Acumulado</p>
            <p className="text-2xl font-black text-slate-950 dark:text-white">{totalHours} <span className="text-sm font-normal">Horas</span></p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
        <div className="lg:col-span-3 bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] p-8 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
            <div className="flex gap-3">
              <button onClick={prevMonth} className="p-3 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-sanfran-rubi hover:text-white transition-all"><ChevronLeft /></button>
              <button onClick={nextMonth} className="p-3 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-sanfran-rubi hover:text-white transition-all"><ChevronRight /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{d}</div>
            ))}
            {blanks.map(b => <div key={`b-${b}`} />)}
            {days.map(day => {
              const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
              const sessionsOnDay = studySessions.filter(s => s.start_time.startsWith(dateStr));
              const hasActivity = sessionsOnDay.length > 0;
              const isSelected = selectedDay === day;

              return (
                <button 
                  key={day} 
                  onClick={() => setSelectedDay(day)}
                  className={`
                    aspect-square rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all group
                    ${isSelected ? 'bg-sanfran-rubi border-sanfran-rubi text-white shadow-xl scale-105 z-10' : 
                      hasActivity ? 'bg-sanfran-rubi/5 border-sanfran-rubi/30 text-sanfran-rubi hover:bg-sanfran-rubi/10' : 
                      'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-slate-300'}
                  `}
                >
                  <span className="font-black text-lg">{day}</span>
                  {hasActivity && !isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-sanfran-rubi rounded-full shadow-md"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6 animate-in slide-in-from-right-6 duration-500" key={selectedDay}>
          <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-8 border-t-[12px] border-t-sanfran-rubi border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl relative overflow-hidden">
            <Scale className="absolute -bottom-4 -right-4 w-32 h-32 text-slate-100 dark:text-white/5 pointer-events-none" />
            
            <h3 className="text-xl font-black mb-1 text-slate-900 dark:text-white uppercase flex items-center gap-2">
              <History className="text-sanfran-rubi w-5 h-5" /> 
              Resumo do Dia
            </h3>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 border-b border-slate-100 dark:border-white/10 pb-4">
              Protocolo de {selectedDay} de {monthNames[currentDate.getMonth()]}
            </p>

            <div className="space-y-8 relative z-10">
              {/* Seção de Estudos */}
              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-tighter mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Sessões de Estudo
                </h4>
                <div className="space-y-3">
                  {dailySessions.map(s => {
                    const subject = subjects.find(sub => sub.id === s.subject_id);
                    return (
                      <div key={s.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center justify-between group hover:bg-white dark:hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: subject?.color || '#9B111E' }}></div>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{subject?.name || 'Geral'}</span>
                        </div>
                        <span className="text-xs font-black text-sanfran-rubi">{(s.duration / 60).toFixed(0)} min</span>
                      </div>
                    );
                  })}
                  {dailySessions.length === 0 && <p className="text-[10px] italic text-slate-400 font-bold uppercase tracking-widest text-center py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl">Sem atividades registradas</p>}
                </div>
              </div>

              {/* Seção de Tarefas */}
              <div>
                <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-tighter mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-usp-blue" /> Tarefas Concluídas
                </h4>
                <div className="space-y-3">
                  {dailyTasks.map(t => (
                    <div key={t.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center gap-3">
                      <div className="p-1.5 bg-usp-blue/10 text-usp-blue rounded-lg"><Gavel className="w-4 h-4" /></div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.title}</span>
                    </div>
                  ))}
                  {dailyTasks.length === 0 && <p className="text-[10px] italic text-slate-400 font-bold uppercase tracking-widest text-center py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl">Nenhuma tarefa finalizada</p>}
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
