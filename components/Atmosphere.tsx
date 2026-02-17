
import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, CloudRain, Coffee, Music, Library, Play, Pause, Waves, Bell, Users } from 'lucide-react';

interface SoundTrack {
  id: string;
  name: string;
  url: string;
  icon: React.ElementType;
}

// Links atualizados para uma seleção diversificada e testada do SoundHelix
const tracks: SoundTrack[] = [
  { id: 'bells', name: 'Sinos do XI', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', icon: Bell },
  { id: 'arcadas', name: 'Burburinho das Arcadas', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', icon: Users },
  { id: 'rain', name: 'Chuva no Largo', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', icon: CloudRain },
  { id: 'library', name: 'Biblioteca SanFran', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', icon: Library },
  { id: 'lofi', name: 'Lofi do Bacharel', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', icon: Music },
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
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Efeito para controlar o Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Efeito para gerenciar a troca de faixas e Play/Pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = async () => {
      if (isPlaying && currentTrackId) {
        const track = tracks.find(t => t.id === currentTrackId);
        if (track && audio.src !== track.url) {
          setIsLoading(true);
          audio.src = track.url;
          audio.load();
        }
        
        try {
          await audio.play();
          setIsLoading(false);
        } catch (error) {
          console.error("Falha na reprodução:", error);
          setIsPlaying(false);
          setIsLoading(false);
        }
      } else {
        audio.pause();
      }
    };

    handlePlay();
  }, [isPlaying, currentTrackId]);

  const toggleTrack = (trackId: string) => {
    if (currentTrackId === trackId) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrackId(trackId);
      setIsPlaying(true);
    }
  };

  return (
    <div className={`fixed z-[60] transition-all duration-700 ease-out ${isExtremeFocus ? 'bottom-8 left-1/2 -translate-x-1/2' : 'bottom-6 left-6 lg:bottom-8 lg:left-80'}`}>
      <audio 
        ref={audioRef} 
        loop 
        preload="auto" 
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />
      
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`h-14 px-6 rounded-full shadow-2xl backdrop-blur-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-4 border border-white/20 dark:border-white/10 ${isPlaying ? 'bg-sanfran-rubi/90 text-white ring-4 ring-sanfran-rubi/20' : 'bg-white/80 dark:bg-black/60 text-slate-600 dark:text-slate-300'}`}
        >
          {isPlaying ? (
            <div className="flex gap-1 items-center h-4">
               <span className="w-1 h-2 bg-white rounded-full animate-[bounce_1s_infinite]"></span>
               <span className="w-1 h-4 bg-white rounded-full animate-[bounce_1.2s_infinite]"></span>
               <span className="w-1 h-3 bg-white rounded-full animate-[bounce_0.8s_infinite]"></span>
            </div>
          ) : (
            <Waves className="w-5 h-5" />
          )}
          
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
            {isLoading ? 'Sintonizando...' : isPlaying ? 'No Ar' : 'Atmosfera'}
          </span>
        </button>

        {isOpen && (
          <div className="absolute bottom-20 left-0 w-80 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-white/10 shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300 origin-bottom-left">
            <div className="flex items-center justify-between mb-6">
               <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Waves size={12}/> Sons das Arcadas</h4>
               <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-sanfran-rubi transition-colors"><Volume2 size={16} /></button>
            </div>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {tracks.map(track => {
                const isActive = currentTrackId === track.id;
                return (
                  <button 
                    key={track.id}
                    onClick={() => toggleTrack(track.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${isActive ? 'bg-sanfran-rubi text-white border-sanfran-rubi shadow-lg shadow-red-900/20' : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <track.icon size={16} className={isActive && isPlaying && !isLoading ? 'animate-bounce' : ''} />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-left">{track.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       {isActive && isLoading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                       {isActive && isPlaying && !isLoading ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl">
               <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume</span>
                  <span className="text-[10px] font-bold tabular-nums text-slate-600 dark:text-slate-300">{Math.round(volume * 100)}%</span>
               </div>
               <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-sanfran-rubi h-1.5 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer"
               />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Atmosphere;
