
import React, { useState, useEffect } from 'react';
import { Building2, User, Clock, ArrowLeft, Play, Pause, LogOut, BookOpen, Shield, Gavel, Scale, Globe, BrainCircuit, HeartPulse, Briefcase, Landmark } from 'lucide-react';
import { PresenceUser } from '../types';

interface StudyRoomsProps {
  presenceUsers: PresenceUser[];
  currentUserId: string;
  currentRoomId: string | null;
  setCurrentRoomId: (id: string | null) => void;
  setRoomStartTime: (timestamp: number | null) => void;
}

interface Department {
  id: string;
  code: string;
  name: string;
  icon: React.ElementType;
  color: string;
}

const departments: Department[] = [
  { id: 'DCV', code: 'DCV', name: 'Direito Civil', icon: Scale, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { id: 'DCO', code: 'DCO', name: 'Direito Comercial', icon: Briefcase, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { id: 'DTB', code: 'DTB', name: 'Direito do Trabalho', icon: Gavel, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { id: 'DES', code: 'DES', name: 'Direito do Estado', icon: Landmark, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'DPM', code: 'DPM', name: 'Direito Penal', icon: Shield, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { id: 'DPC', code: 'DPC', name: 'Direito Processual', icon: BookOpen, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { id: 'DEF', code: 'DEF', name: 'Direito Econômico', icon: HeartPulse, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' }, // Using HeartPulse as placeholder for economic vitality or just distinct icon
  { id: 'DIN', code: 'DIN', name: 'Direito Internacional', icon: Globe, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  { id: 'DFD', code: 'DFD', name: 'Filosofia do Direito', icon: BrainCircuit, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
];

const StudyRooms: React.FC<StudyRoomsProps> = ({ 
  presenceUsers, 
  currentUserId, 
  currentRoomId, 
  setCurrentRoomId,
  setRoomStartTime
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Initial setup for room
  useEffect(() => {
    if (currentRoomId && !isActive) {
      setIsActive(true);
      const now = Date.now();
      setRoomStartTime(now);
      setSecondsElapsed(0);
    }
  }, [currentRoomId]);

  // Stopwatch Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive) {
      interval = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const joinRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
  };

  const leaveRoom = () => {
    if (confirm("Deseja sair da sala de estudos? O contador será zerado.")) {
      setIsActive(false);
      setCurrentRoomId(null);
      setRoomStartTime(null);
      setSecondsElapsed(0);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper component for user time in list
  const UserTimerDisplay = ({ startTime }: { startTime?: number }) => {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
      if (!startTime) return;
      
      const update = () => {
        const now = Date.now();
        const diff = Math.floor((now - startTime) / 1000);
        setDuration(diff > 0 ? diff : 0);
      };

      update();
      const timer = setInterval(update, 1000);
      return () => clearInterval(timer);
    }, [startTime]);

    const h = Math.floor(duration / 3600);
    const m = Math.floor((duration % 3600) / 60);

    if (h > 0) return <span>{h}h {m}m</span>;
    return <span>{m} min</span>;
  };

  const currentRoom = departments.find(d => d.id === currentRoomId);
  const usersInRoom = presenceUsers.filter(u => u.study_room_id === currentRoomId);

  // --- LOBBY VIEW ---
  if (!currentRoomId) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-20">
        <header>
          <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-full border border-indigo-100 dark:border-indigo-800 mb-4">
             <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
             <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Departamentos SanFran</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Salas de Estudo</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-lg mt-2">Escolha seu departamento e estude em conjunto.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const usersCount = presenceUsers.filter(u => u.study_room_id === dept.id).length;
            
            return (
              <button 
                key={dept.id} 
                onClick={() => joinRoom(dept.id)}
                className="group relative bg-white dark:bg-sanfran-rubiDark/30 p-6 rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all text-left overflow-hidden"
              >
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                   <dept.icon size={100} />
                </div>
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${dept.color} shadow-inner`}>
                   <dept.icon size={28} />
                </div>
                
                <div className="relative z-10">
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{dept.code}</h3>
                   <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">{dept.name}</p>
                </div>

                <div className="mt-6 flex items-center gap-2">
                   <div className="flex -space-x-2">
                      {usersCount > 0 ? (
                        Array.from({ length: Math.min(3, usersCount) }).map((_, i) => (
                           <div key={i} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 border-2 border-white dark:border-sanfran-rubiBlack" />
                        ))
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/5 border-2 border-white dark:border-sanfran-rubiBlack flex items-center justify-center">
                           <User size={10} className="text-slate-300" />
                        </div>
                      )}
                   </div>
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                     {usersCount} {usersCount === 1 ? 'Estudando' : 'Estudando'}
                   </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- ROOM VIEW ---
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col animate-in zoom-in-95 duration-500">
      {/* Header Sala */}
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
            <button onClick={leaveRoom} className="p-3 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors">
               <ArrowLeft size={20} />
            </button>
            <div>
               <div className="flex items-center gap-2">
                 <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{currentRoom?.name}</h2>
                 <span className={`px-2 py-0.5 rounded text-[10px] font-black ${currentRoom?.color}`}>{currentRoom?.code}</span>
               </div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/> Em Tempo Real
               </p>
            </div>
         </div>
         <button onClick={leaveRoom} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">
            <LogOut size={14} /> Sair
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
         {/* Timer Card */}
         <div className="bg-white dark:bg-sanfran-rubiDark/30 rounded-[3rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl p-10 flex flex-col items-center justify-center relative overflow-hidden">
            <div className={`absolute inset-0 opacity-5 pointer-events-none ${currentRoom?.color.split(' ')[0]} mix-blend-multiply dark:mix-blend-overlay`} />
            
            <div className="relative z-10 text-center">
               <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Clock className="w-10 h-10 text-slate-400" />
               </div>
               <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Tempo de Foco</p>
               <div className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter mb-8">
                  {formatTime(secondsElapsed)}
               </div>
               
               <div className="flex gap-4 justify-center">
                  <button 
                     onClick={() => setIsActive(!isActive)}
                     className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 ${isActive ? 'bg-slate-100 dark:bg-white/10 text-slate-500' : 'bg-sanfran-rubi text-white'}`}
                  >
                     {isActive ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Retomar</>}
                  </button>
               </div>
            </div>
         </div>

         {/* Users List (Discord Style) */}
         <div className="bg-slate-900 dark:bg-black/40 rounded-[3rem] p-8 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
               <div className="bg-white/10 p-2 rounded-xl">
                  <User className="text-white w-5 h-5" />
               </div>
               <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Mesa Redonda</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{usersInRoom.length} Estudando</p>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
               {usersInRoom.map((user) => {
                  const isMe = user.user_id === currentUserId;
                  return (
                     <div key={user.user_id} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isMe ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5 border border-transparent'}`}>
                        <div className="flex items-center gap-4">
                           <div className="relative">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm ${isMe ? 'bg-sanfran-rubi' : 'bg-slate-700'}`}>
                                 <User size={18} />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                           </div>
                           <div>
                              <p className={`font-black text-sm uppercase tracking-tight ${isMe ? 'text-white' : 'text-slate-300'}`}>
                                 {user.name} {isMe && <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded ml-2">VOCÊ</span>}
                              </p>
                              {user.subject_name && (
                                 <p className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[150px]">
                                    {user.subject_name}
                                 </p>
                              )}
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-emerald-400 tabular-nums">
                              <UserTimerDisplay startTime={user.study_start_time} />
                           </p>
                           <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Tempo</p>
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

export default StudyRooms;
