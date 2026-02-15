
import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, CloudRain, Coffee, Music, Library, Play, Pause, Waves, Bell, Users } from 'lucide-react';

interface SoundTrack {
  id: string;
  name: string;
  url: string;
  icon: React.ElementType;
}

// URLs estáveis da Wikimedia Commons e SoundHelix para garantir funcionamento e imersão
const tracks: SoundTrack[] = [
  { id: 'bells', name: 'Sinos do XI', url: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Church_Bells_in_the_Distance.mp3', icon: Bell },
  { id: 'arcadas', name: 'Burburinho das Arcadas', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Crowd_at_an_airport.mp3', icon: Users },
  { id: 'rain', name: 'Chuva no Largo', url: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Rain_On_The_Roof.mp3', icon: CloudRain },
  { id: 'library', name: 'Biblioteca SanFran', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Writing_with_pencil.mp3', icon: Library },
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

  // Controle de Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Gerenciamento de Play/Pause e troca de faixa
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
          console.error("Erro na reprodução de áudio:", error);
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
    <div className={`fixed z-[60] transition-all duration-700 ${isExtremeFocus ? 'bottom-8 left-8' : 'bottom-6 left-6 lg:bottom-10 lg:left-72'}`}>
      <audio 
        ref={audioRef} 
        loop 
        preload="auto" 
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />
      
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-4 rounded-[1.5rem] border-2 shadow-2xl backdrop-blur-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 ${isPlaying ? 'bg-sanfran-rubi text-white border-sanfran-rubi' : 'bg-white dark:bg-sanfran-rubiDark/40 text-slate-400 border-slate-200 dark:border-sanfran-rubi/30'}`}
        >
          {isPlaying ? (
            <Waves className={`w-5 h-5 ${isLoading ? 'animate-spin opacity-50' : 'animate-pulse'}`} />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
          {!isExtremeFocus && (
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isLoading ? 'Conectando...' : isPlaying ? 'Atmosfera Ativa' : 'Atmosfera'}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute bottom-20 left-0 w-72 bg-white dark:bg-[#0d0303] rounded-[2.5rem] border-2 border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6">
               <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sons das Arcadas</h4>
               <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-sanfran-rubi transition-colors"><Volume2 size={16} /></button>
            </div>

            <div className="space-y-3 mb-6">
              {tracks.map(track => {
                const isActive = currentTrackId === track.id;
                return (
                  <button 
                    key={track.id}
                    onClick={() => toggleTrack(track.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border-2 ${isActive ? 'bg-sanfran-rubi/10 border-sanfran-rubi text-sanfran-rubi shadow-inner' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-3">
                      <track.icon size={16} className={isActive && isPlaying && !isLoading ? 'animate-bounce text-sanfran-rubi' : ''} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">{track.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       {isActive && isLoading && <div className="w-3 h-3 border-2 border-sanfran-rubi border-t-transparent rounded-full animate-spin" />}
                       {isActive && isPlaying && !isLoading ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
               <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume Imersivo</span>
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
