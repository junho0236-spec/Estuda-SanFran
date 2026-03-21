import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  MessageSquare, 
  ArrowLeft,
  Search,
  ExternalLink
} from 'lucide-react';
import { View } from '../types';

interface FAQProps {
  onNavigate: (view: View) => void;
}

const faqs = [
  {
    question: "Como funciona o Gerador de Questões com IA?",
    answer: "O nosso gerador utiliza modelos avançados de Inteligência Artificial para criar questões personalizadas com base nos filtros que você escolher, como estilo de prova, instituição, cargo e dificuldade. Cada questão acompanha uma explicação detalhada para auxiliar nos seus estudos."
  },
  {
    question: "Posso salvar minhas questões favoritas?",
    answer: "Sim! Ao visualizar uma questão, você pode clicar no ícone de estrela ou 'favoritar' para salvá-la no seu Banco de Questões pessoal. Você pode acessá-las a qualquer momento filtrando por 'Favoritas'."
  },
  {
    question: "Como funcionam os Flashcards?",
    answer: "Os flashcards utilizam o sistema de repetição espaçada. Você cria um card com uma pergunta na frente e a resposta no verso. Ao estudar, você avalia seu nível de conhecimento (Fácil, Médio, Difícil) e o sistema agenda a próxima revisão automaticamente."
  },
  {
    question: "O que é o Modo Foco Extremo?",
    answer: "É uma funcionalidade projetada para eliminar distrações. Ao ativar, a interface é simplificada, ocultando menus e notificações, permitindo que você se concentre totalmente na resolução de questões ou no estudo de flashcards."
  },
  {
    question: "Como posso acompanhar meu desempenho?",
    answer: "No seu Dashboard, você encontrará estatísticas detalhadas sobre o seu progresso, incluindo taxa de acerto por matéria, tempo médio de estudo e evolução ao longo das semanas."
  }
];

const FAQ: React.FC<FAQProps> = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:suporte@sanfranacademy.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => onNavigate(View.Dashboard)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 font-serif tracking-tight">Dúvidas Frequentes</h1>
          <p className="text-slate-500 font-medium">Como podemos ajudar você hoje?</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Pesquisar por uma dúvida..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-all font-medium"
        />
      </div>

      {/* FAQ List */}
      <div className="space-y-4 mb-16">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
              >
                <span className="font-bold text-slate-800 pr-4">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp size={20} className="text-[#800000] shrink-0" />
                ) : (
                  <ChevronDown size={20} className="text-slate-400 shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="h-px bg-slate-100 mb-4"></div>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
            <HelpCircle size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">Nenhuma dúvida encontrada para sua pesquisa.</p>
          </div>
        )}
      </div>

      {/* Contact Section */}
      <div className="bg-gradient-to-br from-[#800000] to-[#500000] rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 rounded-full blur-2xl -ml-10 -mb-10"></div>

        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <Mail className="text-white" size={24} />
            </div>
            <h2 className="text-3xl font-black font-serif mb-4 leading-tight">Ainda tem dúvidas?</h2>
            <p className="text-red-100 font-medium mb-8 leading-relaxed">
              Se você não encontrou o que procurava, envie-nos uma mensagem diretamente. Nossa equipe de suporte responderá o mais breve possível.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3].map(i => (
                  <img 
                    key={i}
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=support${i}`} 
                    className="w-10 h-10 rounded-full border-2 border-[#800000] bg-white"
                    alt="Support Team"
                  />
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-red-200">Equipe de Suporte Ativa</p>
            </div>
          </div>

          <form onSubmit={handleSendEmail} className="bg-white rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Assunto</label>
              <input 
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Ex: Problema com Flashcards"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sua Mensagem</label>
              <textarea 
                required
                rows={4}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Descreva sua dúvida detalhadamente..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-all font-medium resize-none"
              ></textarea>
            </div>
            <button 
              type="submit"
              className="w-full bg-[#800000] hover:bg-[#600000] text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <MessageSquare size={18} />
              Enviar Mensagem
            </button>
          </form>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center">
        <p className="text-slate-400 text-sm font-medium">
          SanFran Academy &copy; 2026. Todos os direitos reservados.
        </p>
        <div className="flex justify-center gap-6 mt-4">
          <a href="#" className="text-xs font-bold text-slate-400 hover:text-[#800000] transition-colors uppercase tracking-widest">Termos de Uso</a>
          <a href="#" className="text-xs font-bold text-slate-400 hover:text-[#800000] transition-colors uppercase tracking-widest">Privacidade</a>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
