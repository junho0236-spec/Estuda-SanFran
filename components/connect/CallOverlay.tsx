import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Phone, PhoneOff, User, Video, VideoOff } from 'lucide-react';
import type { ChatRoom } from '../../types';

interface IncomingCall {
  caller_avatar?: string;
  caller_name?: string;
  type: 'audio' | 'video';
}

interface CallOverlayProps {
  incomingCall: IncomingCall | null;
  showCallModal: boolean;
  acceptCall: () => void;
  rejectCall: () => void;
  remoteStream: MediaStream | null;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  callStatus: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
  isVideoOff: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  toggleVideo: () => void;
  endCall: () => void;
  activeRoom: ChatRoom | null;
}

const CallOverlay: React.FC<CallOverlayProps> = ({
  incomingCall,
  showCallModal,
  acceptCall,
  rejectCall,
  remoteStream,
  remoteVideoRef,
  localVideoRef,
  callStatus,
  isVideoOff,
  isMuted,
  toggleMute,
  toggleVideo,
  endCall,
  activeRoom,
}) => {
  return (
    <>
      <AnimatePresence>
        {incomingCall && !showCallModal && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center overflow-hidden shrink-0 animate-pulse border-2 border-blue-500/30">
                {incomingCall.caller_avatar ? (
                  <img src={incomingCall.caller_avatar} alt={incomingCall.caller_name} className="w-full h-full object-cover" />
                ) : incomingCall.type === 'video' ? (
                  <Video className="text-blue-600" />
                ) : (
                  <Phone className="text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chamada de {incomingCall.type === 'video' ? 'Video' : 'Audio'}</p>
                <p className="font-bold text-slate-900 dark:text-white truncate">{incomingCall.caller_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={rejectCall}
                  className="p-3 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                >
                  <PhoneOff size={20} />
                </button>
                <button
                  onClick={acceptCall}
                  className="p-3 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                >
                  <Phone size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCallModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 md:p-8"
          >
            <div className="relative w-full max-w-4xl aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
              {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
                  <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
                    <User size={48} className="text-white/40" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-white/60">
                    {callStatus === 'calling' ? 'Chamando...' : 'Conectando...'}
                  </p>
                </div>
              )}

              <div className="absolute bottom-6 right-6 w-32 md:w-48 aspect-video bg-black rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl z-10">
                {isVideoOff ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <VideoOff size={24} className="text-white/40" />
                  </div>
                ) : (
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                )}
              </div>

              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-6 z-20">
                <button
                  onClick={toggleMute}
                  className={`p-4 md:p-5 rounded-full transition-all ${isMuted ? 'bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                <button
                  onClick={endCall}
                  className="p-5 md:p-6 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xl shadow-red-600/40 transition-all active:scale-90"
                >
                  <PhoneOff size={32} />
                </button>

                <button
                  onClick={toggleVideo}
                  className={`p-4 md:p-5 rounded-full transition-all ${isVideoOff ? 'bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                >
                  {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
              </div>

              <div className="absolute top-10 left-10 text-white z-20">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Chamada em tempo real</p>
                <h3 className="text-xl font-black uppercase tracking-tight">{activeRoom?.name || 'Conversa'}</h3>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CallOverlay;
