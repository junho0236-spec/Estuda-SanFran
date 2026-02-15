
import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Clock, User, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Message {
  id: string;
  user_name: string;
  content: string;
  created_at: string;
}

const Mural: React.FC<{ userId: string, userName: string }> = ({ userId, userName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('mural_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mural_messages' }, (payload) => {
        setMessages(prev => [payload.new as Message, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('mural_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setMessages(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const { error } = await supabase.from('mural_messages').insert({
      user_id: userId,
      user_name: userName,
      content: newMessage.trim()
    });

    if (!error) setNewMessage('');
    setIsSending(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="text-center space-y-4">
        <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Mural XI</h2>
        <p className="text-slate-500 font-bold italic">O pátio das Arcadas, digitalmente.</p>
      </header>

      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 md:p-8 rounded-[3rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl">
        <form onSubmit={sendMessage} className="flex gap-4 mb-10">
          <input 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Deixe um recado para a faculdade..." 
            className="flex-1 p-5 bg-slate-50 dark:bg-black/50 border-2 border-slate-100 dark:border-white/5 rounded-2xl font-bold outline-none focus:border-sanfran-rubi"
          />
          <button disabled={isSending} className="px-8 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-sanfran-rubiDark active:scale-95 transition-all">
            <Send size={20} />
          </button>
        </form>

        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Sparkles size={40} /></div>
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-8 h-8 bg-sanfran-rubi text-white rounded-full flex items-center justify-center text-[10px] font-black">{msg.user_name.charAt(0)}</div>
                 <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">{msg.user_name}</span>
                 <span className="text-[8px] font-bold text-slate-400 uppercase ml-auto">{new Date(msg.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-serif text-lg leading-relaxed">{msg.content}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="py-20 text-center text-slate-300 font-black uppercase text-xs">O silêncio das Arcadas... Seja o primeiro.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Mural;
