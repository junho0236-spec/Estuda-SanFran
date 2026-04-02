
import React from 'react';
import { 
  CornerUpLeft, Edit2, X, Trash, Pause, Send, 
  Mic, Ghost, ImageIcon, Loader2, Paperclip, 
  UserPlus, Search 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage } from '../../types';

interface ChatInputProps {
  newMessage: string;
  setNewMessage: (msg: string) => void;
  handleTyping: () => void;
  sendMessage: () => void;
  replyingTo: ChatMessage | null;
  setReplyingTo: (msg: ChatMessage | null) => void;
  editingMessage: ChatMessage | null;
  setEditingMessage: (msg: ChatMessage | null) => void;
  userName: string;
  isRecording: boolean;
  recordingTime: number;
  formatTime: (time: number) => string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cancelRecording: () => void;
  stopRecording: () => void;
  audioUrl: string | null;
  setAudioUrl: (url: string | null) => void;
  sendAudioMessage: () => void;
  isVanishMode: boolean;
  setIsVanishMode: (mode: boolean) => void;
  showGifPicker: boolean;
  setShowGifPicker: (show: boolean) => void;
  gifType: 'gifs' | 'stickers';
  setGifType: (type: 'gifs' | 'stickers') => void;
  gifSearch: string;
  setGifSearch: (search: string) => void;
  searchGifs: (query: string) => void;
  gifs: any[];
  sendGif: (url: string, type: 'gif' | 'sticker') => void;
  uploading: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fetchUsers: () => void;
  setShowShareProfileModal: (show: boolean) => void;
  startRecording: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  newMessage, setNewMessage, handleTyping, sendMessage, replyingTo,
  setReplyingTo, editingMessage, setEditingMessage, userName,
  isRecording, recordingTime, formatTime, canvasRef, cancelRecording,
  stopRecording, audioUrl, setAudioUrl, sendAudioMessage, isVanishMode,
  setIsVanishMode, showGifPicker, setShowGifPicker, gifType, setGifType,
  gifSearch, setGifSearch, searchGifs, gifs, sendGif, uploading,
  handleFileUpload, fetchUsers, setShowShareProfileModal, startRecording
}) => {
  
  return (
    <div className="p-3 md:p-4 bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-white/5">
      
      {/* REPLY/EDIT INDICATOR */}
      <AnimatePresence>
        {(replyingTo || editingMessage) && (
          <motion.div 
            key="reply-edit-indicator"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border-l-4 border-blue-500 flex items-center justify-between"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="text-blue-500">
                {replyingTo ? <CornerUpLeft size={18} /> : <Edit2 size={18} />}
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                  {replyingTo ? `Respondendo a ${replyingTo.sender_name === userName ? 'você' : replyingTo.sender_name}` : 'Editando mensagem'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {replyingTo ? replyingTo.content : editingMessage?.content}
                </p>
              </div>
            </div>
            <button 
              onClick={() => { setReplyingTo(null); setEditingMessage(null); if(editingMessage) setNewMessage(''); }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        {isRecording ? (
          <div className="flex-1 flex items-center gap-4 bg-red-50 dark:bg-red-500/10 p-3 rounded-2xl border border-red-200 dark:border-red-500/20">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-black text-[10px] uppercase tracking-widest tabular-nums">{formatTime(recordingTime)}</span>
            </div>
            <div className="flex-1 h-8 bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden">
              <canvas ref={canvasRef} width={300} height={32} className="w-full h-full" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={cancelRecording} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all">
                <Trash size={18} />
              </button>
              <button onClick={stopRecording} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-full transition-all">
                <Pause size={18} />
              </button>
            </div>
          </div>
        ) : audioUrl ? (
          <div className="flex-1 flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 p-3 rounded-2xl border border-blue-200 dark:border-blue-500/20">
            <div className="flex items-center gap-3">
              <Mic size={18} className="text-blue-500" />
              <span className="text-blue-500 font-black text-xs uppercase tracking-widest">Áudio Gravado</span>
              <audio src={audioUrl} controls className="h-8 max-w-[150px]" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAudioUrl(null)} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all">
                <X size={18} />
              </button>
              <button onClick={sendAudioMessage} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                <Send size={18} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsVanishMode(!isVanishMode)}
                className={`p-3 rounded-xl transition-all ${isVanishMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-indigo-500'}`}
                title="Modo Vanish"
              >
                <Ghost size={20} />
              </button>
              <button 
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  if (!showGifPicker && gifs.length === 0) searchGifs('');
                }}
                className={`p-3 rounded-xl transition-all ${showGifPicker ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-600'}`}
                title="GIFs"
              >
                <ImageIcon size={20} />
              </button>
              <div className="relative">
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
                <label 
                  htmlFor="file-upload"
                  className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-600 rounded-xl cursor-pointer transition-all block"
                >
                  {uploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
                </label>
              </div>
              
              <button 
                onClick={() => { fetchUsers(); setShowShareProfileModal(true); }}
                className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                title="Compartilhar Perfil"
              >
                <UserPlus size={20} />
              </button>
            </div>
            
            <div className="flex-1 relative">
              {/* GIF PICKER POPOVER */}
              <AnimatePresence>
                {showGifPicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-4 w-80 h-96 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl z-50 flex flex-col overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-white/5">
                      <div className="flex gap-2 mb-3">
                        <button 
                          onClick={() => setGifType('gifs')}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${gifType === 'gifs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                        >
                          GIFs
                        </button>
                        <button 
                          onClick={() => setGifType('stickers')}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${gifType === 'stickers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                        >
                          Stickers
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                          type="text"
                          placeholder={`Buscar ${gifType === 'gifs' ? 'GIFs' : 'Stickers'}...`}
                          value={gifSearch}
                          onChange={(e) => {
                            setGifSearch(e.target.value);
                            searchGifs(e.target.value);
                          }}
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl outline-none focus:border-blue-500 transition-all text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 custom-scrollbar">
                      {gifs.map(gif => (
                        <button 
                          key={gif.id}
                          onClick={() => sendGif(gif.images.fixed_height.url, gifType === 'gifs' ? 'gif' : 'sticker')}
                          className="rounded-lg overflow-hidden hover:scale-105 transition-transform"
                        >
                          <img src={gif.images.fixed_height.url} alt="Media" className="w-full h-24 object-cover" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea 
                value={newMessage}
                onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Digite uma mensagem..."
                className="w-full p-3 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm resize-none max-h-32 min-h-[48px]"
                rows={1}
              />
            </div>
            
            {newMessage.trim() ? (
              <button 
                onClick={sendMessage}
                className="p-3 bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95"
              >
                <Send size={20} />
              </button>
            ) : (
              <button 
                onClick={startRecording}
                className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
              >
                <Mic size={20} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
