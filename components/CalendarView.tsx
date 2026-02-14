
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, History, Trophy } from 'lucide-react';
import { Subject, StudySession } from '../types';
import { supabase } from '../services/supabaseClient';

interface CalendarViewProps {
  subjects: Subject[];
  userId: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ subjects, userId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [currentDate, userId]);

  const fetchSessions = async () => {
    setLoading(true);
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId);

    if (data) setSessions(data);
    setLoading(false);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const totalDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const totalSeconds = sessions.reduce((acc, s) => acc + s.duration, 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Registro de Labuta</h2>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-lg">Seu histórico de dedicação acadêmica.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white dark:bg-sanfran-rubiDark/40 p-5 rounded-3xl border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex items-center gap-4">
            <div className="p-3 bg-usp-gold text-white rounded-2xl shadow-lg"><Trophy className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Acumulado</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white">{totalHours} <span className="text-sm font-normal">Horas</span></p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] p-8 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
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
              const sessionsOnDay = sessions.filter(s => s.start_time.startsWith(dateStr));
              const hasActivity = sessionsOnDay.length > 0;
              const daySeconds = sessionsOnDay.reduce((acc, s) => acc + s.duration, 0);

              return (
                <div key={day} className={`
                  aspect-square rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all group cursor-pointer
                  ${hasActivity ? 'bg-sanfran-rubi/5 border-sanfran-rubi/30 text-sanfran-rubi' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400'}
                  hover:scale-105 hover:border-sanfran-rubi
                `}>
                  <span className="font-black text-lg">{day}</span>
                  {hasActivity && (
                    <span className="text-[8px] font-black uppercase mt-1">{(daySeconds / 60).toFixed(0)}m</span>
                  )}
                  {hasActivity && <div className="absolute top-2 right-2 w-2 h-2 bg-sanfran-rubi rounded-full shadow-md animate-pulse"></div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[2.5rem] p-8 border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-900 dark:text-white uppercase"><History className="text-sanfran-rubi" /> Últimas Labutas</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {sessions.slice().reverse().map(s => {
                const subject = subjects.find(sub => sub.id === s.subject_id);
                return (
                  <div key={s.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{new Date(s.start_time).toLocaleDateString()}</p>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{subject?.name || 'Geral'}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sanfran-rubi font-black">
                      <Clock className="w-4 h-4" />
                      <span>{(s.duration / 60).toFixed(0)}m</span>
                    </div>
                  </div>
                );
              })}
              {sessions.length === 0 && <p className="text-center text-slate-400 py-10 font-bold">Nenhum registro protocolado.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
