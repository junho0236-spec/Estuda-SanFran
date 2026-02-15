
import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, CloudRain, Coffee, Music, Library, Play, Pause, Waves, Bell, Users } from 'lucide-react';

interface SoundTrack {
  id: string;
  name: string;
  url: string;
  icon: React.ElementType;
}

const tracks: SoundTrack[] = [
  { id: 'bells', name: 'Sinos do XI', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_73147f7d9a.mp3', icon: Bell },
  { id: 'arcadas', name: 'Burburinho das Arcadas', url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_8230983a65.mp3', icon: Users },
  { id: 'rain', name: 'Chuva no Largo', url: 'https://cdn.pixabay.com/audio/2022/07/04/audio_3d1f062d05.mp3', icon: CloudRain },
  { id: 'library', name: 'Biblioteca SanFran', url: 'https://cdn.pixabay.com/audio/2021/11/25/audio_1e370e5b1f.mp3', icon: Library },
  { id: 'lofi', name: 'Lofi do Bacharel', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808737487.mp3', icon: Music },
  { id: 'cafe', name: 'Café da Faculdade', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', icon: Coffee },
];

interface AtmosphereProps {
  isExtremeFocus: boolean;
}

const Atmosphere: React.FC<AtmosphereProps> = ({ isExtremeFocus }) => {
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const toggleTrack = (trackId: string) => {
    if (currentTrackId === trackId) {
      if (isPlaying) {
        setIsPlaying(false);
        audioRef.current?.pause();
      } else {
        setIsPlaying(true);
        audioRef.current?.play();
      }
    } else {
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        setCurrentTrackId(trackId);
        setIsPlaying(true);
        if (audioRef.current) {
          audioRef.current.src = track.url;
          audioRef.current.play();
        }
      }
    }
  };

  return (
    <div className={`fixed z-[60] transition-all duration-700 ${isExtremeFocus ? 'bottom-8 left-8' : 'bottom-6 left-6 lg:bottom-10 lg:left-72'}`}>
      <audio ref={audioRef} loop />
      
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-4 rounded-[1.5rem] border-2 shadow-2xl backdrop-blur-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 ${isPlaying ? 'bg-sanfran-rubi text-white border-sanfran-rubi' : 'bg-white dark:bg-sanfran-rubiDark/40 text-slate-400 border-slate-200 dark:border-sanfran-rubi/30'}`}
        >
          {isPlaying ? <Waves className="w-5 h-5 animate-pulse" /> : <VolumeX className="w-5 h-5" />}
          {!isExtremeFocus && <span className="text-[10px] font-black uppercase tracking-widest">{isPlaying ? 'Atmosfera Ativa' : 'Atmosfera'}</span>}
        </button>

        {isOpen && (
          <div className="absolute bottom-20 left-0 w-72 bg-white dark:bg-[#0d0303] rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6">
               <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sons das Arcadas</h4>
               <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-sanfran-rubi"><Volume2 size={16} /></button>
            </div>

            <div className="space-y-3 mb-6">
              {tracks.map(track => {
                const isActive = currentTrackId === track.id;
                return (
                  <button 
                    key={track.id}
                    onClick={() => toggleTrack(track.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border-2 ${isActive ? 'bg-sanfran-rubi/10 border-sanfran-rubi text-sanfran-rubi' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-3">
                      <track.icon size={16} className={isActive ? 'animate-bounce' : ''} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">{track.name}</span>
                    </div>
                    {isActive && isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
               <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume</span>
                  <span className="text-[10px] font-bold tabular-nums text-slate-600">{Math.round(volume * 100)}%</span>
               </div>
               <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-sanfran-rubi h-1.5 bg-slate-100 dark:bg-white/10 rounded-full appearance-none cursor-pointer"
               />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Atmosphere;
