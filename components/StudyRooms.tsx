import React, { useState, useEffect, useRef } from 'react';
import { Building2, User, Clock, ArrowLeft, Play, Pause, LogOut, BookOpen, Shield, Gavel, Scale, Globe, BrainCircuit, HeartPulse, Briefcase, Landmark, Mic, MicOff, Headphones, HeadphoneOff, Radio, Volume2, VolumeX, Signal, Music, Link as LinkIcon, Share2, Info, Youtube, Wifi, WifiOff } from 'lucide-react';
import { PresenceUser } from '../types';
import { supabase } from '../services/supabaseClient';

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
  { id: 'DEF', code: 'DEF', name: 'Direito Econômico', icon: HeartPulse, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  { id: 'DIN', code: 'DIN', name: 'Direito Internacional', icon: Globe, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  { id: 'DFD', code: 'DFD', name: 'Filosofia do Direito', icon: BrainCircuit, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
];

type MediaType = 'youtube';

interface MediaPreset {
  name: string;
  url: string;
  type: MediaType;
}

const presets: MediaPreset[] = [
  { name: 'Lofi Girl', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', type: 'youtube' },
  { name: 'Jazz Relax', url: 'https://www.youtube.com/watch?v=Dx5qFachd3A', type: 'youtube' },
  { name: 'Piano Focus', url: 'https://www.youtube.com/watch?v=WJ3-F02-F_Y', type: 'youtube' },
  { name: 'Clássica (24h)', url: 'https://www.youtube.com/watch?v=M0ZdXkw_ysI', type: 'youtube' },
  { name: 'Bossa Nova', url: 'https://www.youtube.com/watch?v=g6bn6XrhYdc', type: 'youtube' },
  { name: 'Synthwave', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY', type: 'youtube' },
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
  
  // Voice Chat State
  const [isMicOn, setIsMicOn] = useState(false);
  const [mutePeers, setMutePeers] = useState(false);
  
  // Refs para WebRTC
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const channelRef = useRef<any>(null);
  
  // State para UI
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  // --- MEDIA STATE ---
  const DEFAULT_EMBED = "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=0&controls=1&origin=https://estuda-san-fran.vercel.app&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1";
  
  const [mediaUrl, setMediaUrl] = useState(DEFAULT_EMBED);
  const [mediaType, setMediaType] = useState<MediaType>('youtube');
  const [customLinkInput, setCustomLinkInput] = useState('');
  const [isSynced, setIsSynced] = useState(true); // "Sincronizado com a Sala"
  const [showMediaControls, setShowMediaControls] = useState(false);
  const [lastDJName, setLastDJName] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // --- HELPERS DE URL (YOUTUBE ONLY) ---
  
  const parseMediaUrl = (input: string): { url: string, type: MediaType } | null => {
    // YouTube
    if (input.match(/(youtube\.com|youtu\.be)/)) {
      let videoId = '';
      const vParam = input.match(/[?&]v=([^&]+)/);
      const embedMatch = input.match(/embed\/([^?&]+)/);
      const shortMatch = input.match(/youtu\.be\/([^?&]+)/);

      if (vParam) videoId = vParam[1];
      else if (embedMatch) videoId = embedMatch[1];
      else if (shortMatch) videoId = shortMatch[1];
      
      if (videoId) {
        return {
          type: 'youtube',
          url: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&origin=${window.location.origin}&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1`
        };
      }
    }

    return null;
  };

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

  // --- WEBRTC SIGNALING & MEDIA SYNC ---
  const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  useEffect(() => {
    if (!currentRoomId) return;

    setConnectionStatus('connecting');
    const channel = supabase.channel(`room_voice_${currentRoomId}`, {
        config: { broadcast: { self: false } }
    });
    channelRef.current = channel;

    channel
      // WebRTC Events
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.target === currentUserId) await handleReceiveOffer(payload.offer, payload.caller);
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.target === currentUserId) await handleReceiveAnswer(payload.answer, payload.caller);
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.target === currentUserId) await handleReceiveIce(payload.candidate, payload.caller);
      })
      // Presence / Join Events
      .on('broadcast', { event: 'join-voice' }, async ({ payload }) => {
        if (payload.userId !== currentUserId) {
          await initiateCall(payload.userId);
          
          // Se eu estou sincronizado, envio o estado atual para quem entrou
          if (isSynced) {
             channel.send({
                type: 'broadcast',
                event: 'media-sync',
                payload: { url: mediaUrl, type: mediaType, senderName: lastDJName }
             });
          }
        }
      })
      // Media Global Events
      .on('broadcast', { event: 'media-update' }, ({ payload }) => {
         // Recebi uma troca de música
         if (isSynced) {
            setMediaUrl(payload.url);
            setMediaType('youtube'); // Força youtube
            setLastDJName(payload.senderName || 'DJ da Sala');
         }
      })
      .on('broadcast', { event: 'media-sync' }, ({ payload }) => {
         // Sincronização inicial ao entrar
         if (isSynced) {
            setMediaUrl(payload.url);
            setMediaType('youtube'); // Força youtube
            if (payload.senderName) setLastDJName(payload.senderName);
         }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          channel.send({
            type: 'broadcast',
            event: 'join-voice',
            payload: { userId: currentUserId }
          });
        } else {
          setConnectionStatus('error');
        }
      });

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      Object.values(peersRef.current).forEach((p) => (p as RTCPeerConnection).close());
      peersRef.current = {};
      setRemoteStreams({});
      setIsMicOn(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentRoomId, currentUserId]); 

  // --- WEBRTC HANDLERS (Standard) ---
  const createPeerConnection = (targetUserId: string) => {
    const pc = new RTCPeerConnection(rtcConfig);
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { target: targetUserId, caller: currentUserId, candidate: event.candidate }
        });
      }
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStreams(prev => ({ ...prev, [targetUserId]: stream }));
      setupAudioAnalysis(stream, targetUserId);
    };
    peersRef.current[targetUserId] = pc;
    return pc;
  };

  const initiateCall = async (targetUserId: string) => {
    if (peersRef.current[targetUserId]) peersRef.current[targetUserId].close();
    const pc = createPeerConnection(targetUserId);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'offer',
      payload: { target: targetUserId, caller: currentUserId, offer }
    });
  };

  const handleReceiveOffer = async (offer: RTCSessionDescriptionInit, callerId: string) => {
    let pc = peersRef.current[callerId];
    if (!pc || pc.signalingState === 'closed') pc = createPeerConnection(callerId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    if (localStreamRef.current) {
       const senders = pc.getSenders();
       localStreamRef.current.getTracks().forEach(track => {
           if (!senders.find(s => s.track?.id === track.id)) pc.addTrack(track, localStreamRef.current!);
       });
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'answer',
      payload: { target: callerId, caller: currentUserId, answer }
    });
  };

  const handleReceiveAnswer = async (answer: RTCSessionDescriptionInit, callerId: string) => {
    const pc = peersRef.current[callerId];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleReceiveIce = async (candidate: RTCIceCandidateInit, callerId: string) => {
    const pc = peersRef.current[callerId];
    if (pc) { try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error(e); } }
  };

  const toggleMic = async () => {
    if (isMicOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      setIsMicOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsMicOn(true);
        setupAudioAnalysis(stream, currentUserId);
        const peers = peersRef.current;
        const promises = Object.entries(peers).map(async ([targetId, pc]) => {
             const peerConnection = pc as RTCPeerConnection;
             stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
             const offer = await peerConnection.createOffer();
             await peerConnection.setLocalDescription(offer);
             channelRef.current?.send({
                 type: 'broadcast',
                 event: 'offer',
                 payload: { target: targetId, caller: currentUserId, offer }
             });
        });
        if (Object.keys(peers).length === 0) {
            channelRef.current?.send({ type: 'broadcast', event: 'join-voice', payload: { userId: currentUserId } });
        }
        await Promise.all(promises);
      } catch (err) {
        console.error("Error accessing mic:", err);
        alert("Permissão de microfone negada.");
      }
    }
  };

  const setupAudioAnalysis = (stream: MediaStream, userId: string) => {
    try {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudio = () => {
          if (!stream.active) { audioContext.close(); return; }
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / dataArray.length;
          if (avg > 15) setSpeakingUsers(prev => new Set(prev).add(userId));
          else setSpeakingUsers(prev => { const next = new Set(prev); next.delete(userId); return next; });
          requestAnimationFrame(checkAudio);
        };
        checkAudio();
    } catch (e) { console.error(e); }
  };

  // --- MEDIA ACTIONS ---
  
  const updateMedia = (newUrl: string, type: MediaType) => {
    setMediaUrl(newUrl);
    setMediaType(type);
    setLastDJName('Você');

    if (isSynced && channelRef.current) {
        const myName = presenceUsers.find(u => u.user_id === currentUserId)?.name || 'Alguém';
        channelRef.current.send({
            type: 'broadcast',
            event: 'media-update',
            payload: { url: newUrl, type: type, senderName: myName }
        });
    }
  };

  const handleCustomLink = () => {
    if (!customLinkInput) return;
    const parsed = parseMediaUrl(customLinkInput);
    if (parsed) {
        updateMedia(parsed.url, parsed.type);
        setCustomLinkInput('');
    } else {
        alert("Link não suportado. Use apenas links do YouTube.");
    }
  };

  const handlePreset = (preset: MediaPreset) => {
     if (preset.type === 'youtube') {
         const parsed = parseMediaUrl(preset.url);
         if (parsed) updateMedia(parsed.url, 'youtube');
     }
  };

  const toggleSync = () => {
    setIsSynced(prev => !prev);
  };

  // --- NAVIGATION ---
  const joinRoom = (roomId: string) => setCurrentRoomId(roomId);
  const leaveRoom = () => {
    if (confirm("Deseja sair da sala de estudos?")) {
      setIsActive(false);
      setCurrentRoomId(null);
      setRoomStartTime(null);
      setSecondsElapsed(0);
      setIsMicOn(false);
      setMediaUrl(DEFAULT_EMBED);
      setMediaType('youtube');
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  // --- LOBBY VIEW (Unchanged) ---
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
      
      {/* Invisible Audio Elements for Voice */}
      {Object.entries(remoteStreams).map(([userId, stream]) => (
         <audio 
            key={userId} 
            ref={ref => { 
                if (ref && ref.srcObject !== stream) {
                    ref.srcObject = stream;
                    ref.play().catch(e => console.log("Autoplay prevented", e));
                } 
            }} 
            autoPlay 
            muted={mutePeers}
         />
      ))}
      
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0 mb-24 lg:mb-0">
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

         {/* Users List & Player */}
         <div className="bg-slate-900 dark:bg-black/40 rounded-[3rem] p-0 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-8 pb-4 border-b border-white/10 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-xl">
                     <User className="text-white w-5 h-5" />
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-white uppercase tracking-tight">Mesa Redonda</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{usersInRoom.length} Estudando</p>
                  </div>
               </div>
               <button onClick={() => setShowMediaControls(!showMediaControls)} className={`p-2 rounded-xl transition-colors ${showMediaControls ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                  <Music size={18} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
               {usersInRoom.map((user) => {
                  const isMe = user.user_id === currentUserId;
                  const isSpeaking = speakingUsers.has(user.user_id);
                  return (
                     <div key={user.user_id} className={`flex items-center justify-between p-3 rounded-2xl transition-all ${isMe ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                        <div className="flex items-center gap-4">
                           <div className="relative">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs transition-all duration-300 ${isSpeaking ? 'ring-2 ring-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : ''} ${isMe ? 'bg-sanfran-rubi' : 'bg-slate-700'}`}>
                                 <User size={16} />
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                           </div>
                           <div className="min-w-0">
                              <p className={`font-black text-sm uppercase tracking-tight truncate ${isMe ? 'text-white' : 'text-slate-300'}`}>
                                 {user.name} 
                              </p>
                              <div className="flex items-center gap-1">
                                {isSpeaking && <Signal size={10} className="text-emerald-500 animate-pulse" />}
                                {user.subject_name && <p className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[100px]">{user.subject_name}</p>}
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-emerald-400 tabular-nums">
                              <UserTimerDisplay startTime={user.study_start_time} />
                           </p>
                        </div>
                     </div>
                  );
               })}
            </div>

            {/* Spotify / YouTube / Control Section */}
            <div className="bg-[#1e1e24] border-t border-black/20">
               {/* Embed Player */}
               <div className="p-4 pb-0 relative">
                 <div className="rounded-xl overflow-hidden bg-black aspect-[16/5] relative group">
                    <iframe 
                        className="w-full h-full"
                        src={mediaUrl} 
                        frameBorder="0" 
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                        allowFullScreen
                        loading="lazy" 
                    />
                    {/* Overlay para YouTube para bloquear cliques indesejados mas permitir controles se necessário */}
                    {mediaType === 'youtube' && <div className="absolute inset-x-0 top-0 h-4 bg-transparent" />} 
                 </div>

                 {/* Status Badges */}
                 <div className="absolute top-6 right-6 flex flex-col gap-1 items-end z-10">
                    <div className={`px-3 py-1 rounded-full text-[9px] font-bold border flex items-center gap-1 backdrop-blur-md ${connectionStatus === 'connected' ? 'bg-emerald-900/50 border-emerald-500/20 text-emerald-400' : 'bg-red-900/50 border-red-500/20 text-red-400'}`}>
                       {connectionStatus === 'connected' ? <Wifi size={10} /> : <WifiOff size={10} />}
                       {connectionStatus === 'connected' ? 'Online' : 'Desconectado'}
                    </div>
                    {lastDJName && isSynced && (
                        <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold text-usp-blue border border-usp-blue/20 flex items-center gap-1">
                           <Signal size={8} className="animate-pulse" /> DJ: {lastDJName}
                        </div>
                    )}
                 </div>
               </div>
               
               {/* Info sobre Play Manual */}
               <div className="px-5 pt-2 flex items-center gap-2 text-slate-500 justify-between">
                  <div className="flex items-center gap-2">
                    <Info size={10} />
                    <p className="text-[9px] font-bold uppercase tracking-wide">
                        YouTube: Áudio completo disponível.
                    </p>
                  </div>
               </div>

               {/* Advanced Controls (Dropdowns, Links) */}
               {showMediaControls && (
                 <div className="px-4 py-3 bg-black/20 animate-in slide-in-from-bottom-2 border-b border-white/5">
                    <div className="space-y-3">
                       <div className="flex gap-2">
                          <input 
                            value={customLinkInput}
                            onChange={(e) => setCustomLinkInput(e.target.value)}
                            placeholder="Cole link do YouTube..." 
                            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white placeholder:text-slate-500 outline-none focus:border-sanfran-rubi"
                          />
                          <button onClick={handleCustomLink} className="p-2 bg-sanfran-rubi text-white rounded-xl">
                            <LinkIcon size={14} />
                          </button>
                       </div>
                       
                       <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                          {presets.map(preset => (
                             <button 
                               key={preset.name} 
                               onClick={() => handlePreset(preset)}
                               className={`whitespace-nowrap px-3 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-wide transition-colors flex items-center gap-1 ${preset.type === 'youtube' ? 'bg-red-600/10 border-red-600/30 text-red-400 hover:bg-red-600/20' : 'bg-green-600/10 border-green-600/30 text-green-400 hover:bg-green-600/20'}`}
                             >
                               {preset.type === 'youtube' ? <Youtube size={10} /> : <Music size={10} />}
                               {preset.name}
                             </button>
                          ))}
                       </div>

                       <div className="flex items-center justify-between bg-emerald-900/20 p-2 rounded-xl border border-emerald-500/20">
                          <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest ml-1">
                             {isSynced ? "Sincronizado com a Sala (Todos Ouvem)" : "Modo Pessoal (Só Você Ouve)"}
                          </span>
                          <button 
                             onClick={toggleSync}
                             className={`w-8 h-4 rounded-full transition-colors relative ${isSynced ? 'bg-emerald-500' : 'bg-slate-600'}`}
                             title={isSynced ? "Desligar Sincronização" : "Ligar Sincronização (Ouvir a Sala)"}
                          >
                             <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isSynced ? 'left-4.5' : 'left-0.5'}`} style={{ left: isSynced ? '18px' : '2px' }} />
                          </button>
                       </div>
                    </div>
                 </div>
               )}

               {/* Voice Controls */}
               <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                     <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-sanfran-rubi flex items-center justify-center text-white font-black text-xs">
                           <User size={16} />
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#1e1e24] rounded-full ${isMicOn ? 'bg-emerald-500' : 'bg-red-500'}`} />
                     </div>
                     <div className="min-w-0">
                        <p className="text-xs font-black text-white uppercase tracking-tight truncate">Você</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{isMicOn ? 'Voz Conectada' : 'Microfone Mudo'}</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-2">
                     <button 
                        onClick={toggleMic}
                        className={`p-3 rounded-xl transition-all ${isMicOn ? 'bg-white text-black' : 'bg-black/40 text-red-500 hover:bg-black/60'}`}
                        title={isMicOn ? "Mutar Microfone" : "Desmutar Microfone"}
                     >
                        {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                     </button>
                     
                     <button 
                        onClick={() => setMutePeers(!mutePeers)}
                        className={`p-3 rounded-xl transition-all ${!mutePeers ? 'bg-black/20 text-slate-300 hover:bg-black/40' : 'bg-red-500/20 text-red-500'}`}
                        title={mutePeers ? "Ativar Áudio da Sala" : "Mutar Áudio da Sala"}
                     >
                        {mutePeers ? <HeadphoneOff size={18} /> : <Headphones size={18} />}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default StudyRooms;