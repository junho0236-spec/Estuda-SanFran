
import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  BookOpen, 
  Scale, 
  MessageSquare, 
  RotateCcw,
  User,
  Loader2,
  BrainCircuit,
  Gavel
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface StudyBuddyProps {
  userId: string;
}

const StudyBuddy: React.FC<StudyBuddyProps> = ({ userId }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: "Olá! Sou seu Amigo de Estudo com IA da SanFran. Como posso ajudar você hoje? Posso explicar conceitos jurídicos, responder dúvidas ou gerar questões de prática para você.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `Você é o "Amigo de Estudo da SanFran", um assistente de IA especializado em Direito Brasileiro e voltado para estudantes da Faculdade de Direito da USP (SanFran).
      Seu tom deve ser profissional, porém encorajador e acadêmico.
      Suas funções principais:
      1. Explicar conceitos jurídicos complexos de forma clara e didática.
      2. Responder perguntas sobre doutrina, jurisprudência e legislação brasileira.
      3. Fornecer questões de prática (estilo OAB ou concursos) quando solicitado.
      4. Sempre que possível, cite autores clássicos ou contemporâneos relevantes.
      5. Se o usuário perguntar algo fora do escopo jurídico ou acadêmico, gentilmente redirecione-o para os estudos.
      Use Markdown para formatar suas respostas, especialmente para listas, negrito e blocos de código/citações.`;

      const chat = ai.chats.create({
        model: model,
        config: {
          systemInstruction: systemInstruction,
        },
      });

      // Prepare history for context
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: model,
        contents: [
          ...history.map(h => ({ role: h.role, parts: h.parts })),
          { role: 'user', parts: [{ text: input }] }
        ],
        config: {
          systemInstruction: systemInstruction
        }
      });

      const aiResponse: Message = {
        role: 'ai',
        content: response.text || "Desculpe, tive um problema ao processar sua resposta. Pode repetir?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: "Houve um erro na conexão com o cérebro da IA. Verifique sua conexão ou tente novamente mais tarde.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: "Explique a 'Teoria do Fato Jurídico'", icon: <Scale size={14} /> },
    { label: "Gere uma questão sobre Direito Civil", icon: <BrainCircuit size={14} /> },
    { label: "Diferença entre Dolo e Culpa", icon: <Gavel size={14} /> },
    { label: "Resumo sobre Controle de Constitucionalidade", icon: <BookOpen size={14} /> }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] border border-slate-200 dark:border-sanfran-rubi/20 shadow-2xl overflow-hidden animate-in fade-in duration-700">
      
      {/* Header */}
      <header className="p-6 border-b border-slate-100 dark:border-sanfran-rubi/20 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-sanfran-rubi p-3 rounded-2xl shadow-lg shadow-red-900/20">
            <Bot className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Amigo de Estudo IA</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Especialista Jurídico SanFran</p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([{
            role: 'ai',
            content: "Olá! Sou seu Amigo de Estudo com IA da SanFran. Como posso ajudar você hoje?",
            timestamp: new Date()
          }])}
          className="p-2 text-slate-400 hover:text-sanfran-rubi transition-colors"
          title="Limpar Conversa"
        >
          <RotateCcw size={20} />
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-none">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-sanfran-rubi text-white'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-none' 
                  : 'bg-white dark:bg-white/10 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-white/5 rounded-tl-none'
              }`}>
                <div className="markdown-body prose dark:prose-invert prose-sm max-w-none">
                  <Markdown>{msg.content}</Markdown>
                </div>
                <p className={`text-[9px] mt-2 font-bold uppercase opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-sanfran-rubi text-white flex items-center justify-center shadow-md">
                <Bot size={16} />
              </div>
              <div className="bg-white dark:bg-white/10 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-white/5 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-sanfran-rubi" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Processando conhecimento...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts & Input */}
      <footer className="p-6 border-t border-slate-100 dark:border-sanfran-rubi/20 bg-slate-50/50 dark:bg-white/5 space-y-4">
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => setInput(p.label)}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-400 hover:border-sanfran-rubi hover:text-sanfran-rubi transition-all shadow-sm"
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        )}
        
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Pergunte qualquer coisa sobre Direito..."
            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 pr-16 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sanfran-rubi/50 shadow-inner resize-none min-h-[60px] max-h-[150px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-3 bottom-3 p-3 rounded-xl transition-all ${
              !input.trim() || isLoading 
                ? 'bg-slate-100 dark:bg-white/5 text-slate-300' 
                : 'bg-sanfran-rubi text-white shadow-lg shadow-red-900/20 hover:scale-105 active:scale-95'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest">
          A IA pode cometer erros. Sempre verifique as fontes doutrinárias e jurisprudenciais.
        </p>
      </footer>
    </div>
  );
};

export default StudyBuddy;
