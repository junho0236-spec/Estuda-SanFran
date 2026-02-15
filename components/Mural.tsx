
import React, { useState, useEffect, useRef } from 'react';
import { Send, Pin, Trash2, MessageSquare, Quote, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { MuralMessage } from '../types';

interface MuralProps {
  userId: string;
  userName: string;
}

const Mural: React.FC<MuralProps> = ({ userId, userName }) => {
  const [messages, setMessages] = useState<MuralMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState<'yellow' | 'blue' | 'red' | 'green'>('yellow');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('public:mural_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mural_messages' }, (payload) => {
        const newMsg = payload.new as MuralMessage;
        setMessages((prev) => [newMsg, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mural_messages' }, (payload) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    setIsLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from('mural_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao buscar mural:', error);
      setFetchError(error.message);
    } else {
      setMessages(data || []);
    }
    setIsLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgPayload = {
      user_id: userId,
      user_name: userName || 'Anônimo',
      content: newMessage.trim(),
      color: selectedColor,
    };

    try {
      const { error } = await supabase.from('mural_messages').insert(msgPayload);
      if (error) throw error;
      setNewMessage('');
    } catch (err: any) {
      console.error(err);
      
      // Tratamento específico para erro de coluna faltando
      if (err.message && (err.message.includes("Could not find the 'color' column") || err.message.includes("column \"color\" of relation \"mural_messages\" does not exist"))) {
        alert("⚠️ Erro de Banco de Dados: A tabela existe mas está desatualizada. Execute o SQL de migração no Supabase para adicionar a coluna 'color'.");
      } else {
        alert(`Erro ao fixar recado: ${err.message || 'Verifique sua conexão ou permissões.'}`);
      }
    }
  };

  const deleteMessage = async (id: string) => {
    if(!confirm("Deseja rasgar este recado do mural?")) return;
    try {
      const { error } = await supabase.from('mural_messages').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert(`Erro ao deletar: ${err.message}`);
    }
  };

  const getColorStyles = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-100 rotate-1';
      case 'red': return 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100 -rotate-1';
      case 'green': return 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 rotate-2';
      default: return 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100 -rotate-2';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-2 md:px-0 h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 flex-shrink-0">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/20 mb-4">
             <Pin className="w-4 h-4 text-sanfran-rubi" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Quadro de Avisos</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Mural das Arcadas</h2>
          <p className="text-slate-500 font-bold italic text-lg mt-2">Deixe seu recado para a posteridade (ou até a próxima aula).</p>
        </div>
        <button 
          onClick={fetchMessages}
          className="p-3 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-sanfran-rubi transition-colors"
          title="Atualizar Mural"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Área de Input */}
      <div className="bg-white dark:bg-sanfran-rubiDark/30 p-6 rounded-[2rem] border border-slate-200 dark:border-sanfran-rubi/30 shadow-xl flex-shrink-0 relative z-20">
        <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
          <div className="flex gap-2 mb-2">
            {(['yellow', 'blue', 'green', 'red'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${selectedColor === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-300 dark:ring-slate-600' : 'hover:scale-110'}`}
                style={{ backgroundColor: c === 'yellow' ? '#fef08a' : c === 'blue' ? '#cffafe' : c === 'green' ? '#d1fae5' : '#fee2e2' }}
              />
            ))}
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escreva seu recado aqui..."
              className="flex-1 bg-slate-50 dark:bg-black/40 border-2 border-slate-100 dark:border-white/10 rounded-2xl p-4 outline-none focus:border-sanfran-rubi font-bold text-slate-800 dark:text-slate-200"
              maxLength={280}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-sanfran-rubi text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sanfran-rubiDark transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Fixar
            </button>
          </div>
        </form>
      </div>

      {/* Grid de Mensagens */}
      <div className="flex-1 overflow-y-auto pr-2 pb-20 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
             <div className="w-12 h-12 border-4 border-sanfran-rubi border-t-transparent rounded-full animate-spin"></div>
             <p className="mt-4 text-[10px] font-black uppercase tracking-widest">Carregando recados...</p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center h-64 border-4 border-dashed border-red-200 dark:border-red-900/20 rounded-[3rem] text-red-400 bg-red-50 dark:bg-red-900/10 p-6 text-center">
            <AlertCircle size={48} className="mb-4 text-red-500" />
            <p className="text-xl font-black uppercase">Erro de Conexão</p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-2">{fetchError}</p>
            <p className="text-[10px] mt-4 max-w-xs opacity-75">Verifique se as tabelas e políticas de segurança (RLS) foram criadas corretamente no Supabase.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-4 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] text-slate-400">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="text-xl font-black uppercase text-slate-300 dark:text-slate-600">Mural Vazio</p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Seja o primeiro a fixar um aviso.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-min">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-6 rounded-2xl shadow-lg border-2 relative group transition-all hover:scale-[1.02] hover:z-10 flex flex-col justify-between min-h-[180px] ${getColorStyles(msg.color)}`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-400 shadow-sm border border-slate-500 z-20"></div>

                <div className="mb-4">
                  <Quote size={16} className="mb-2 opacity-20" fill="currentColor" />
                  <p className="font-serif text-lg leading-snug break-words whitespace-pre-wrap">{msg.content}</p>
                </div>

                <div className="flex items-end justify-between mt-auto pt-4 border-t border-black/5 dark:border-white/10">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 truncate max-w-[120px]">
                      {msg.user_name}
                    </p>
                    <p className="text-[8px] font-bold opacity-50">
                      {new Date(msg.created_at).toLocaleDateString()} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                  {msg.user_id === userId && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="p-2 bg-white/50 rounded-full hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default Mural;
