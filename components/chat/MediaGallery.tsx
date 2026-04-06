
import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, File, Video, Download, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { CONNECT_CHAT_MESSAGES_COLUMNS } from '../../utils/supabaseSelectColumns';
import { ChatMessage, ChatRoom } from '../../types';

interface MediaGalleryProps {
  room: ChatRoom;
  onClose: () => void;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ room, onClose }) => {
  const [media, setMedia] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'media' | 'files'>('media');

  useEffect(() => {
    fetchMedia();
  }, [room.id]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(CONNECT_CHAT_MESSAGES_COLUMNS)
        .eq('room_id', room.id)
        .not('attachment_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedia(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedia = media.filter(m => {
    const isImageOrVideo = m.attachment_type?.startsWith('image/') || m.attachment_type?.startsWith('video/');
    return activeTab === 'media' ? isImageOrVideo : !isImageOrVideo;
  });

  return (
    <div className="absolute inset-0 z-50 bg-white dark:bg-[#1a1a1a] flex flex-col animate-in slide-in-from-right duration-300">
      {/* HEADER */}
      <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Galeria de Mídia</h3>
        </div>
      </div>

      {/* TABS */}
      <div className="flex p-2 bg-slate-50 dark:bg-black/20">
        <button 
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'media' ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm' : 'text-slate-500'}`}
        >
          Mídia
        </button>
        <button 
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'files' ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm' : 'text-slate-500'}`}
        >
          Arquivos
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <Loader2 className="animate-spin mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">Carregando...</p>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
            {activeTab === 'media' ? <ImageIcon size={48} className="mb-4" /> : <File size={48} className="mb-4" />}
            <p className="text-sm font-bold uppercase tracking-widest">Nenhum item encontrado</p>
          </div>
        ) : activeTab === 'media' ? (
          <div className="grid grid-cols-3 gap-2">
            {filteredMedia.map(item => (
              <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 relative group">
                {item.attachment_type?.startsWith('video/') ? (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <Video size={24} className="text-white opacity-50" />
                  </div>
                ) : (
                  <img 
                    src={item.attachment_url!} 
                    alt={item.attachment_name!} 
                    className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => window.open(item.attachment_url!, '_blank')}
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a href={item.attachment_url!} download={item.attachment_name!} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm">
                    <Download size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMedia.map(item => (
              <div key={item.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                    <File size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.attachment_name}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={item.attachment_url!} download={item.attachment_name!} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-500">
                    <Download size={16} />
                  </a>
                  <a href={item.attachment_url!} target="_blank" rel="noreferrer" className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-500">
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaGallery;
