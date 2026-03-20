
import React from 'react';
import { 
  Users, 
  MessageSquare, 
  Briefcase, 
  Building2, 
  Megaphone, 
  ShoppingBag, 
  Scale, 
  ArrowUpRight,
  Globe,
  Radio,
  UserPlus,
  Gavel,
  ScrollText,
  Handshake,
  DollarSign,
  CalendarHeart,
  Archive,
  Car,
  Vote,
  Compass,
  Search,
  Quote,
  MapPin,
  Trophy,
  BookType,
  BrainCircuit,
  ShieldCheck
} from 'lucide-react';
import { View } from '../types';

interface SanFranCommunityProps {
  onNavigate: (view: View) => void;
}

const SanFranCommunity: React.FC<SanFranCommunityProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header com Design Editorial - Estilo Community */}
      <header className="relative py-8 md:py-12">
        <div className="absolute top-0 left-0 w-20 h-1 bg-indigo-600 rounded-full mb-6"></div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-[0.9]">
          SanFran <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Community.</span>
        </h1>
        <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          O coração pulsante das Arcadas. Conecte-se, debata e construa sua rede de contatos no Largo.
        </p>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10"></div>
      </header>

      
      {/* SEÇÃO: CONEXÃO & PRESENÇA */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Conexão & Presença</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
          {/* CARD 1: O LARGO (Hero - Wide & Tall) */}
                  <button
                    onClick={() => onNavigate(View.Largo)}
                    className="group relative col-span-1 md:col-span-2 row-span-2 bg-[#0f172a] text-white rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden shadow-2xl hover:shadow-cyan-500/20 hover:scale-[1.01] transition-all duration-500"
                  >
                    {/* Abstract Background Decoration */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-indigo-900/50 to-transparent"></div>
          
                    <div className="relative z-10 flex justify-between items-start">
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                         <Users className="w-8 h-8 md:w-10 md:h-10 text-cyan-300" />
                      </div>
                      <div className="bg-cyan-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md text-cyan-200 border border-cyan-500/30 flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> Online Agora
                      </div>
                    </div>
          
                    <div className="relative z-10 space-y-2 text-left mt-12">
                       <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">O Largo</h3>
                       <p className="text-sm md:text-base font-medium text-slate-300 max-w-sm leading-relaxed">
                         O pátio virtual. Veja quem está online, desafie colegas para duelos e sinta a presença da comunidade.
                       </p>
                    </div>
          
                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                       <div className="bg-cyan-500 text-white p-3 rounded-full shadow-lg">
                          <ArrowUpRight size={24} />
                       </div>
                    </div>
                  </button>

          {/* CARD 2: SALAS DE ESTUDO (Tall) */}
                  <button
                    onClick={() => onNavigate(View.StudyRoom)}
                    className="group relative col-span-1 md:col-span-1 row-span-2 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2.5rem] p-8 border border-indigo-100 dark:border-indigo-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-100/50 dark:to-indigo-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     
                     <div className="w-full flex justify-between items-start relative z-10">
                        <Radio size={20} className="text-indigo-400" />
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                     </div>
          
                     <div className="relative z-10 my-4">
                        <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                           <Building2 size={32} className="text-indigo-600 dark:text-indigo-300" />
                        </div>
                     </div>
                     
                     <div className="relative z-10 space-y-1">
                        <h3 className="text-xl font-black text-indigo-900 dark:text-white uppercase tracking-tight">Salas de Estudo</h3>
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-widest">Departamentos & Voz</p>
                     </div>
                     
                     <div className="w-full pt-4 border-t border-indigo-200 dark:border-indigo-800/50 mt-4 relative z-10">
                        <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-indigo-500 transition-colors">Entrar em Sessão</span>
                     </div>
                  </button>

          {/* CARD 21: MURAL (Standard) - NOVO */}
                  <button
                    onClick={() => onNavigate(View.Mural)}
                    className="group relative col-span-1 bg-slate-50 dark:bg-slate-900/20 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-indigo-500/10 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between h-full overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-3 bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm group-hover:shadow-indigo-500/20 transition-all">
                           <Megaphone size={20} />
                        </div>
                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                     </div>
                     <div className="text-left mt-4 relative z-10">
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Mural</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Avisos da Comunidade</p>
                     </div>
                  </button>

          {/* CARD 22: DEBATE (Standard) - NOVO */}
                  <button
                    onClick={() => onNavigate(View.Debate)}
                    className="group relative col-span-1 bg-slate-50 dark:bg-slate-900/20 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-cyan-500/10 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between h-full overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-3 bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 rounded-2xl shadow-sm group-hover:shadow-cyan-500/20 transition-all">
                           <MessageSquare size={20} />
                        </div>
                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-cyan-500 transition-colors" />
                     </div>
                     <div className="text-left mt-4 relative z-10">
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Debate</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Fórum de Discussão</p>
                     </div>
                  </button>
        </div>
      </div>

      {/* SEÇÃO: VIDA NO LARGO */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Vida no Largo</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
          {/* CARD 3: ACHADOS E PERDIDOS (Wide) */}
                  <button
                    onClick={() => onNavigate(View.AchadosPerdidos)}
                    className="group relative col-span-1 md:col-span-2 bg-gradient-to-br from-orange-600 to-orange-700 dark:from-orange-950/60 dark:to-orange-900/40 rounded-[2.5rem] p-8 border border-orange-500/30 shadow-xl hover:shadow-orange-500/30 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')] opacity-10"></div>
                     <div className="absolute top-0 left-0 w-64 h-64 bg-orange-400/20 rounded-full blur-3xl -ml-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-orange-100 rounded-2xl border border-white/20 shadow-lg">
                           <Search size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-orange-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Achados e Perdidos</h4>
                        <p className="text-xs font-bold text-orange-200 uppercase tracking-widest mt-2 opacity-80">Mural Digital • Recuperação de Objetos</p>
                     </div>
                  </button>

          {/* CARD 6: GUIA DE SOBREVIVÊNCIA (Wide) */}
                  <button
                    onClick={() => onNavigate(View.GuiaSobrevivencia)}
                    className="group relative col-span-1 md:col-span-2 bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-950/60 dark:to-emerald-900/40 rounded-[2.5rem] p-8 border border-emerald-500/30 shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/p5.png')] opacity-10"></div>
                     <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl -ml-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-emerald-100 rounded-2xl border border-white/20 shadow-lg">
                           <MapPin size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-emerald-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Guia de Sobrevivência</h4>
                        <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mt-2 opacity-80">Mapa Colaborativo • Café, Almoço & Xerox</p>
                     </div>
                  </button>

          {/* CARD 14: CARONAS E REPÚBLICAS (Wide) */}
                  <button
                    onClick={() => onNavigate(View.CaronasRepublicas)}
                    className="group relative col-span-1 md:col-span-2 bg-gradient-to-br from-teal-700 to-teal-800 dark:from-teal-950/60 dark:to-teal-900/40 rounded-[2.5rem] p-8 border border-teal-500/30 shadow-xl hover:shadow-teal-500/30 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-20"></div>
                     <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-teal-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-teal-100 rounded-2xl border border-white/20 shadow-lg">
                           <Car size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-teal-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">SanFran Move</h4>
                        <p className="text-xs font-bold text-teal-200 uppercase tracking-widest mt-2 opacity-80">Caronas Solidárias & Vagas em Repúblicas</p>
                     </div>
                  </button>

          {/* CARD 9: BALCÃO DE ESTÁGIOS (Wide) */}
                  <button
                    onClick={() => onNavigate(View.BalcaoEstagios)}
                    className="group relative col-span-1 md:col-span-2 bg-[#0f172a] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 dark:border-white/10 shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-emerald-300 rounded-2xl border border-white/10 shadow-lg">
                           <Briefcase size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-emerald-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Balcão de Estágios</h4>
                        <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-widest mt-2 opacity-80">Vagas • Mentorias • Carreira</p>
                     </div>
                  </button>

          {/* CARD 20: CLASSIFICADOS (Standard) */}
                  <button
                    onClick={() => onNavigate(View.ClassificadosPatio)}
                    className="group relative col-span-1 md:col-span-2 lg:col-span-4 bg-white dark:bg-slate-900/40 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-2xl hover:shadow-rose-500/10 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between h-full overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-3 bg-white dark:bg-white/10 text-rose-600 dark:text-rose-400 rounded-2xl shadow-sm group-hover:shadow-rose-500/20 transition-all">
                           <ShoppingBag size={20} />
                        </div>
                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
                     </div>
                     <div className="text-left mt-4 relative z-10">
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Classificados</h4>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Mercado do Pátio</p>
                     </div>
                  </button>
        </div>
      </div>

      {/* SEÇÃO: CONHECIMENTO COLETIVO */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Conhecimento Coletivo</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
          {/* CARD 17: THE VAULT (Banco de Provas) - (Tall) */}
                  <button
                    onClick={() => onNavigate(View.TheVault)}
                    className="group relative col-span-1 md:col-span-1 row-span-2 bg-white dark:bg-slate-900/40 rounded-[2.5rem] p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-sanfran-rubi/10 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden hover:border-sanfran-rubi"
                  >
                     <div className="absolute inset-0 bg-gradient-to-b from-sanfran-rubi/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     
                     <div className="w-full flex justify-between items-start relative z-10">
                        <Archive size={20} className="text-slate-400 group-hover:text-sanfran-rubi transition-colors" />
                        <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                     </div>
          
                     <div className="relative z-10 my-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shadow-lg transform -rotate-3 group-hover:rotate-0 transition-all duration-500 group-hover:shadow-sanfran-rubi/20">
                           <ScrollText size={32} className="text-slate-600 dark:text-slate-300 group-hover:text-sanfran-rubi transition-colors" />
                        </div>
                     </div>
                     
                     <div className="relative z-10 space-y-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">O Banco de Provas</h3>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Resumos & Testes</p>
                     </div>
                     
                     <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800/50 mt-4 relative z-10">
                        <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-sanfran-rubi transition-colors">Acessar Arquivos</span>
                     </div>
                  </button>

          {/* CARD: COMUNIDADE ANKI - NOVO */}
                  <button
                    onClick={() => onNavigate(View.Anki)}
                    className="group relative col-span-1 bg-white dark:bg-slate-900/40 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between h-full overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-3 bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm group-hover:shadow-indigo-500/20 transition-all">
                           <BrainCircuit size={20} />
                        </div>
                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                     </div>
                     <div className="text-left mt-4 relative z-10">
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Decks da Comunidade</h4>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Compartilhe & Baixe Flashcards</p>
                     </div>
                  </button>

          {/* CARD 4: BÚSSOLA DE OPTATIVAS (Wide) */}
                  <button
                    onClick={() => onNavigate(View.BussolaOptativas)}
                    className="group relative col-span-1 md:col-span-2 bg-[#0f172a] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 dark:border-white/10 shadow-xl hover:shadow-teal-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-teal-300 rounded-2xl border border-white/10 shadow-lg">
                           <Compass size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-teal-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Bússola de Optativas</h4>
                        <p className="text-xs font-bold text-teal-200/80 uppercase tracking-widest mt-2 opacity-80">Reviews de Disciplinas • Guia de Matrícula</p>
                     </div>
                  </button>

          {/* CARD 19: JURISPRUDÊNCIA (Standard) */}
                  <button
                    onClick={() => onNavigate(View.JurisprudenceMural)}
                    className="group relative col-span-1 bg-white dark:bg-slate-900/40 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-2xl hover:shadow-violet-500/10 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between h-full overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-3 bg-white dark:bg-white/10 text-violet-600 dark:text-violet-400 rounded-2xl shadow-sm group-hover:shadow-violet-500/20 transition-all">
                           <Scale size={20} />
                        </div>
                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-violet-500 transition-colors" />
                     </div>
                     <div className="text-left mt-4 relative z-10">
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Jurisprudência</h4>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Acervo Coletivo</p>
                     </div>
                  </button>

          {/* CARD 7: CLUBE DO LIVRO JURÍDICO (Wide) - NOVO */}
                  <button
                    onClick={() => onNavigate(View.ClubeLivro)}
                    className="group relative col-span-1 md:col-span-2 bg-[#1a120b] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-amber-900/30 shadow-xl hover:shadow-amber-900/30 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-700/10 rounded-full blur-2xl animate-pulse group-hover:scale-150 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-amber-300 rounded-2xl border border-white/10 shadow-lg">
                           <BookType size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-amber-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Clube do Livro</h4>
                        <p className="text-xs font-bold text-amber-200/80 uppercase tracking-widest mt-2 opacity-80">Leitura Coletiva • Clássicos</p>
                     </div>
                  </button>

          {/* CARD 16: WIKI DE PEÇAS (Wide) */}
                  <button
                    onClick={() => onNavigate(View.PetitionWiki)}
                    className="group relative col-span-1 md:col-span-2 bg-[#082f49] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-cyan-800 shadow-xl hover:shadow-cyan-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-cyan-300 rounded-2xl border border-white/10 shadow-lg">
                           <ScrollText size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-cyan-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Wiki de Peças</h4>
                        <p className="text-xs font-bold text-cyan-200/80 uppercase tracking-widest mt-2 opacity-80">Banco Colaborativo • Validação por Pares</p>
                     </div>
                  </button>

          {/* CARD 15: PACTO DE ESTUDO (Wide) */}
                  <button
                    onClick={() => onNavigate(View.StudyPact)}
                    className="group relative col-span-1 md:col-span-2 bg-[#0f172a] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 shadow-xl hover:shadow-blue-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-600/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-blue-300 rounded-2xl border border-white/10 shadow-lg">
                           <Handshake size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-blue-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Pacto de Estudo</h4>
                        <p className="text-xs font-bold text-blue-200/80 uppercase tracking-widest mt-2 opacity-80">Contrato de Foco • Responsabilidade Mútua</p>
                     </div>
                  </button>
        </div>
      </div>

      {/* SEÇÃO: ENGAJAMENTO & TRADIÇÃO */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Engajamento & Tradição</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
          {/* CARD 5: PÉROLAS DA TRIBUNA (Wide) */}
                  <button
                    onClick={() => onNavigate(View.PerolasTribuna)}
                    className="group relative col-span-1 md:col-span-2 bg-[#1a1c1e] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-yellow-900/30 shadow-xl hover:shadow-yellow-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-yellow-300 rounded-2xl border border-white/10 shadow-lg">
                           <Quote size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-yellow-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Pérolas da Tribuna</h4>
                        <p className="text-xs font-bold text-yellow-200/80 uppercase tracking-widest mt-2 opacity-80">Citações & Humor Acadêmico</p>
                     </div>
                  </button>

          {/* CARD 8: GUERRA DAS TURMAS (Wide) */}
                  <button
                    onClick={() => onNavigate(View.GuerraTurmas)}
                    className="group relative col-span-1 md:col-span-2 bg-[#2d0a0a] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-red-900/30 shadow-xl hover:shadow-red-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-white rounded-2xl border border-white/10 shadow-lg">
                           <Trophy size={24} className="text-yellow-400" fill="currentColor" />
                        </div>
                        <ArrowUpRight size={20} className="text-yellow-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Guerra das Turmas</h4>
                        <p className="text-xs font-bold text-yellow-200/80 uppercase tracking-widest mt-2 opacity-80">Competição Coletiva • Pontos por Ano</p>
                     </div>
                  </button>

          {/* CARD 10: TRIBUNAL DA OPINIÃO (Wide) */}
                  <button
                    onClick={() => onNavigate(View.TribunalOpiniao)}
                    className="group relative col-span-1 md:col-span-2 bg-[#1e1b4b] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-indigo-900/30 shadow-xl hover:shadow-indigo-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -ml-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-indigo-300 rounded-2xl border border-white/10 shadow-lg">
                           <Vote size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-indigo-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Tribunal da Opinião</h4>
                        <p className="text-xs font-bold text-indigo-200/80 uppercase tracking-widest mt-2 opacity-80">Enquetes Polêmicas • Veredito Popular</p>
                     </div>
                  </button>

          {/* CARD 11: EVENTOS E ROLEZINHOS (Wide) */}
                  <button
                    onClick={() => onNavigate(View.SocialEvents)}
                    className="group relative col-span-1 md:col-span-2 bg-[#2e1065] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-violet-900/30 shadow-xl hover:shadow-violet-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-violet-300 rounded-2xl border border-white/10 shadow-lg">
                           <CalendarHeart size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-violet-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Calendário Social</h4>
                        <p className="text-xs font-bold text-violet-200/80 uppercase tracking-widest mt-2 opacity-80">Cervejadas, Palestras & Jogos • RSVP</p>
                     </div>
                  </button>

          {/* CARD 12: MENTORSHIP (Wide) */}
                  <button
                    onClick={() => onNavigate(View.Mentorship)}
                    className="group relative col-span-1 md:col-span-2 bg-[#1c1917] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-stone-800 shadow-xl hover:shadow-amber-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-amber-400 rounded-2xl border border-white/10 shadow-lg">
                           <UserPlus size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-amber-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">O Padrinho</h4>
                        <p className="text-xs font-bold text-amber-200/80 uppercase tracking-widest mt-2 opacity-80">Networking Vertical • Calouros & Veteranos</p>
                     </div>
                  </button>

          {/* CARD 13: JÚRI SIMULADO (Wide) */}
                  <button
                    onClick={() => onNavigate(View.MockJury)}
                    className="group relative col-span-1 md:col-span-2 bg-[#1a0808] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-red-900/30 shadow-xl hover:shadow-red-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-red-600/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-red-400 rounded-2xl border border-white/10 shadow-lg">
                           <Gavel size={24} />
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black uppercase bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30">Valendo SanCoins</span>
                           <ArrowUpRight size={20} className="text-red-200 group-hover:text-white transition-colors" />
                        </div>
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">O Júri Simulado</h4>
                        <p className="text-xs font-bold text-red-200/80 uppercase tracking-widest mt-2 opacity-80">Acusação vs Defesa • Voto Popular</p>
                     </div>
                  </button>

          {/* CARD 18: LEILÃO DO LARGO (Wide) */}
                  <button
                    onClick={() => onNavigate(View.LargoAuction)}
                    className="group relative col-span-1 md:col-span-2 bg-[#1a0808] dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-yellow-900/30 shadow-xl hover:shadow-yellow-500/20 hover:scale-[1.01] transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-600/10 rounded-full blur-2xl animate-pulse group-hover:scale-150 transition-transform duration-700"></div>
          
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md text-yellow-400 rounded-2xl border border-white/10 shadow-lg">
                           <Gavel size={24} />
                        </div>
                        <ArrowUpRight size={20} className="text-yellow-200 group-hover:text-white transition-colors" />
                     </div>
                     <div className="text-left mt-8 relative z-10">
                        <h4 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">Leilão do Largo</h4>
                        <p className="text-xs font-bold text-yellow-200/80 uppercase tracking-widest mt-2 opacity-80">Pregão em Tempo Real • Use SanCoins</p>
                     </div>
                  </button>

          {/* CARD 23: SOCIETIES (Standard) - NOVO */}
                  <button
                    onClick={() => onNavigate(View.Societies)}
                    className="group relative col-span-1 md:col-span-2 lg:col-span-4 bg-white dark:bg-slate-900/40 rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-2xl hover:shadow-amber-500/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between h-full overflow-hidden"
                  >
                     <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="flex justify-between items-start relative z-10">
                        <div className="p-3 bg-white dark:bg-white/10 text-amber-600 dark:text-amber-400 rounded-2xl shadow-sm group-hover:shadow-amber-500/20 transition-all">
                           <Handshake size={20} />
                        </div>
                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                     </div>
                     <div className="text-left mt-4 relative z-10">
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Sociedades</h4>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Grêmios & Coletivos</p>
                     </div>
                  </button>
        </div>
      </div>

    </div>
  );
};

export default SanFranCommunity;
