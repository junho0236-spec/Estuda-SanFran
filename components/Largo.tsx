
import React from 'react';
import { Users, User, Zap, BookOpen, BrainCircuit, Coffee, Clock, ShieldCheck, Map as MapIcon, Sparkles, Sword } from 'lucide-react';
import { PresenceUser, View, DuelQuestion } from '../types';
import { supabase } from '../services/supabaseClient';

interface LargoProps {
  presenceUsers: PresenceUser[];
  currentUserId: string;
}

const QUESTIONS_POOL: DuelQuestion[] = [
  { id: '1', question: 'Qual o rito processual para crimes com pena máxima igual ou superior a 4 anos?', options: ['Ordinário', 'Sumário', 'Sumaríssimo', 'Especial'], answer: 0, category: 'Direito Processual Penal' },
  { id: '2', question: 'A "Pacta Sunt Servanda" refere-se a:', options: ['Livre arbítrio', 'Obrigatoriedade dos contratos', 'Responsabilidade civil', 'Direito de família'], answer: 1, category: 'Direito Civil' },
  { id: '3', question: 'O Habeas Corpus é um remédio constitucional que protege:', options: ['Propriedade', 'Informação', 'Liberdade de locomoção', 'Direitos políticos'], answer: 2, category: 'Direito Constitucional' },
  { id: '4', question: 'Quem é o atual Presidente do STF (2024)?', options: ['Gilmar Mendes', 'Luís Roberto Barroso', 'Alexandre de Moraes', 'Cármen Lúcia'], answer: 1, category: 'Atualidades Jurídicas' },
  { id: '5', question: 'Qual o prazo regimental para sustentação oral nos Tribunais superiores?', options: ['5 minutos', '10 minutos', '15 minutos', '20 minutos'], answer: 2, category: 'Prática Jurídica' },
  { id: '6', question: 'O princípio da insignificância afasta a:', options: ['Tipicidade formal', 'Tipicidade material', 'Ilicitude', 'Culpabilidade'], answer: 1, category: 'Direito Penal' },
  { id: '7', question: 'A responsabilidade civil do Estado no Brasil é, via de regra:', options: ['Subjetiva', 'Objetiva', 'Inexistente', 'Solidária apenas'], answer: 1, category: 'Direito Administrativo' }
];

const Largo: React.FC<LargoProps> = ({ presenceUsers, currentUserId }) => {
  const onlineCount = presenceUsers.length;

  const getViewLabel = (view: string) => {
    switch (view) {
      case View.Dashboard: return 'Analisando o Painel';
      case View.Anki: return 'Revisando Flashcards';
      case View.Timer: return 'Em Sessão de Foco';
      case View.Subjects: return 'Organizando Cadeiras';
      case View.Tasks: return 'Consultando a Pauta';
      case View.Calendar: return 'Revisando a Agenda';
      case View.Ranking: return 'No Hall da Fama';
      case View.Library: return 'Consultando a Doutrina';
      case View.Largo: return 'No Largo São Francisco';
      case View.Duel: return 'Em Combate Intelectual';
      default: return 'Caminhando pelas Arcadas';
    }
  };

  const getStatusIcon = (user: PresenceUser) => {
    if (user.is_timer_active) return <Zap className="w-4 h-4 text-sanfran-rubi animate-pulse" />;
    switch (user.view) {
      case View.Anki: return <BrainCircuit className="w-4 h-4 text-usp-blue" />;
      case View.Library: return <BookOpen className="w-4 h-4 text-emerald-500" />;
      case View.Ranking: return <Sparkles className="w-4 h-4 text-usp-gold" />;
      case View.Duel: return <Sword className="w-4 h-4 text-red-500 animate-bounce" />;
      default: return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  const challengeUser = async (opponent: PresenceUser) => {
    const challenger = presenceUsers.find(u => u.user_id === currentUserId);
    if (!challenger) return;

    // Sorteia 5 questões
    const shuffled = [...QUESTIONS_POOL].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 5);

    try {
      const { error } = await supabase.from('duels').insert({
        challenger_id: currentUserId,
        challenger_name: challenger.name,
        opponent_id: opponent.user_id,
        opponent_name: opponent.name,
        status: 'pending',
        questions: selectedQuestions
      });

      if (error) throw error;
      alert(`Desafio enviado para ${opponent.name}! Aguardando aceite...`);
    } catch (e) {
      alert("Falha ao protocolar desafio.");
    }
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-sanfran-rubi/10 px-4 py-2 rounded-full border border-sanfran-rubi/20 mb-4">
            <Users className="w-4 h-4 text-sanfran-rubi" />
            <span className="text-[10px] font-black uppercase tracking-widest text-sanfran-rubi">Comunidade SanFran</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">O Largo</h2>
          <p className="text-slate-500 font-bold italic text-lg mt-2">"Nas Arcadas do Largo São Francisco, nunca se estuda sozinho."</p>
        </div>
        
        <div className="bg-white dark:bg-sanfran-rubiDark/40 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-sanfran-rubi/30 shadow-2xl flex items-center justify-center gap-6 self-center md:self-auto">
          <div className="flex -space-x-3">
             {presenceUsers.slice(0, 5).map((u) => (
               <div key={u.user_id} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 dark:bg-white/5 border-4 border-white dark:border-sanfran-rubiBlack flex items-center justify-center text-slate-400 font-black shadow-lg">
                  <User size={18} />
               </div>
             ))}
             {onlineCount > 5 && (
               <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-sanfran-rubi border-4 border-white dark:border-sanfran-rubiBlack flex items-center justify-center text-white text-[10px] font-black shadow-lg">
                  +{onlineCount - 5}
               </div>
             )}
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest">Atualmente Online</p>
            <p className="text-xl md:text-2xl font-black text-slate-950 dark:text-white">{onlineCount} <span className="text-xs font-normal text-slate-400">Colegas</span></p>
          </div>
        </div>
      </header>

      {/* Grid de Presença */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {presenceUsers.map((user) => (
          <div 
            key={user.user_id} 
            className={`group p-6 md:p-8 rounded-[2.5rem] border-2 transition-all relative overflow-hidden flex flex-col justify-between ${user.user_id === currentUserId ? 'bg-sanfran-rubi/5 border-sanfran-rubi shadow-xl' : 'bg-white dark:bg-sanfran-rubiDark/30 border-slate-200 dark:border-sanfran-rubi/30 hover:border-usp-blue shadow-lg'}`}
          >
            {user.user_id === currentUserId && (
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-sanfran-rubi text-white text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-lg">Você</span>
              </div>
            )}
            
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-3xl flex items-center justify-center shadow-inner ${user.is_timer_active ? 'bg-sanfran-rubi/10 border-2 border-sanfran-rubi shadow-red-900/10' : 'bg-slate-50 dark:bg-white/5'}`}>
                {getStatusIcon(user)}
              </div>
              <div className="min-w-0">
                <h4 className="text-base md:text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight truncate pr-4">
                  {user.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                   <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${user.is_timer_active ? 'bg-sanfran-rubi' : 'bg-emerald-500'}`} />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     {user.is_timer_active ? 'Foco Extremo' : 'Online'}
                   </span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3 mb-1">
                   <MapIcon className="w-3.5 h-3.5 text-slate-400" />
                   <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Localização Atual</span>
                </div>
                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">
                  {getViewLabel(user.view)}
                </p>
              </div>

              {user.is_timer_active && user.subject_name && (
                <div className="flex items-center gap-3 px-1 animate-in fade-in duration-500">
                  <Clock className="w-4 h-4 text-sanfran-rubi" />
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Estudando Agora</span>
                    <span className="text-[10px] font-black text-sanfran-rubi uppercase tracking-tight truncate max-w-[150px]">{user.subject_name}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
               {user.user_id !== currentUserId ? (
                 <button 
                  onClick={() => challengeUser(user)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-transform"
                 >
                   <Sword size={14} /> Desafiar
                 </button>
               ) : (
                 <span className="text-[8px] font-bold text-slate-300 uppercase">SanFran Connect</span>
               )}
               <div className="flex gap-1">
                  <ShieldCheck className="w-3 h-3 text-slate-200" />
                  <Coffee className="w-3 h-3 text-slate-200" />
               </div>
            </div>
          </div>
        ))}

        {onlineCount === 0 && (
          <div className="col-span-full py-32 text-center bg-white dark:bg-sanfran-rubiDark/20 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-sanfran-rubi/10 flex flex-col items-center gap-6">
             <div className="bg-slate-50 dark:bg-sanfran-rubiDark p-8 rounded-full">
               <Users className="w-16 h-16 text-slate-200 dark:text-sanfran-rubi/10" />
             </div>
             <div>
               <p className="text-xl font-black text-slate-300 dark:text-slate-700 uppercase">Silêncio no Largo</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 px-8 leading-relaxed">Ninguém online no momento. Seja o pioneiro acadêmico de hoje.</p>
             </div>
          </div>
        )}
      </div>

      {/* Mural de Inspiração do Largo */}
      <div className="bg-usp-blue dark:bg-usp-blue/20 p-8 md:p-12 rounded-[3rem] border-b-[12px] border-b-[#0b6a7a] text-white relative overflow-hidden shadow-2xl">
         <Sparkles className="absolute top-10 right-10 w-24 h-24 opacity-10" />
         <div className="max-w-2xl relative z-10">
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-4">O Espírito das Arcadas</h3>
            <p className="text-lg font-serif italic opacity-90 leading-relaxed">
              "Aqui, os livros não são apenas papel, são diálogos silenciosos entre gerações de bacharéis. Cada minuto estudado no Largo ecoa na história do Direito brasileiro."
            </p>
            <div className="mt-8 flex items-center gap-4">
               <div className="w-12 h-0.5 bg-usp-gold" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-usp-gold">Academia XI de Agosto</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Largo;
