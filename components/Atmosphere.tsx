
import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, CloudRain, Coffee, Music, Library, Play, Pause, Waves, Bell, Users } from 'lucide-react';

interface SoundTrack {
  id: string;
  name: string;
  url: string;
  icon: React.ElementType;
}

/**
 * Links selecionados por estabilidade comprovada:
 * - SoundHelix (já funcionando para o usuário)
 * - GitHub Raw (estável para áudios ambientais)
 */
const tracks: SoundTrack[] = [
  { id: 'bells', name: 'Sinos do XI', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', icon: Bell },
  { id: 'arcadas', name: 'Burburinho das Arcadas', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', icon: Users },
  { id: 'rain', name: 'Chuva no Largo', url: 'https://github.com/Anand-Ganesh/Pomodoro-Timer/raw/master/assets/audio/rain.mp3', icon: CloudRain },
  { id: 'library', name: 'Biblioteca SanFran', url: 'https://github.com/Anand-Ganesh/Pomodoro-Timer/raw/master/assets/audio/ambient.mp3', icon: Library },
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

  // Sincroniza o volume do elemento de áudio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Gerencia a troca de fontes e reprodução
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = async () => {
      if (isPlaying && currentTrackId) {
        const track = tracks.find(t => t.id === currentTrackId);
        if (track) {
          // Se a URL mudou, precisamos recarregar o elemento
          if (audio.src !== track.url) {
            setIsLoading(true);
            audio.pause();
            audio.src = track.url;
            audio.load();
          }
          
          try {
            await audio.play();
            setIsLoading(false);
          } catch (error) {
            console.error("Erro ao reproduzir áudio:", error);
            setIsLoading(false);
            // Autoplay pode ser bloqueado se não houver interação prévia
          }
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
        crossOrigin="anonymous"
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
              {isLoading ? 'Carregando...' : isPlaying ? 'Atmosfera Ativa' : 'Atmosfera'}
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
