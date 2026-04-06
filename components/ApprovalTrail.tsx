
import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  CheckCircle2, 
  Circle, 
  Lock, 
  ChevronRight, 
  BookOpen, 
  Zap, 
  Target, 
  ArrowRight,
  Star,
  ShieldCheck,
  Gavel,
  Scale,
  Search,
  ExternalLink
} from 'lucide-react';
import { View, TrailStep, UserTrail } from '../types';
import { supabase } from '../services/supabaseClient';
import { USER_TRAILS_ROW_COLUMNS } from '../utils/supabaseSelectColumns';
import { toast } from 'sonner';

interface ApprovalTrailProps {
  userId: string;
  onNavigate: (view: View) => void;
}

const CAREERS = [
  { id: 'magistratura', name: 'Magistratura', icon: Gavel, color: 'indigo' },
  { id: 'mp', name: 'Ministério Público', icon: ShieldCheck, color: 'blue' },
  { id: 'defensoria', name: 'Defensoria Pública', icon: Scale, color: 'emerald' },
  { id: 'procuradoria', name: 'Procuradoria', icon: Target, color: 'violet' },
];

const MOCK_STEPS: Record<string, TrailStep[]> = {
  'magistratura': [
    {
      id: 'step-1',
      title: 'Formação da Base Jurídica',
      description: 'Estudo aprofundado das matérias do Grupo I (Civil, Processo Civil, Constitucional e Administrativo).',
      status: 'completed',
      type: 'study',
      resources: [
        { label: 'Lei Seca: CF/88', view: View.LeiSeca },
        { label: 'Banco de Questões', view: View.QuestionBank }
      ]
    },
    {
      id: 'step-2',
      title: 'Especialização em Humanística',
      description: 'Sociologia Jurídica, Psicologia Judiciária e Ética da Magistratura.',
      status: 'in_progress',
      type: 'study',
      resources: [
        { label: 'Resumidor Inteligente', view: View.IntelligentSummarizer }
      ]
    },
    {
      id: 'step-3',
      title: 'Simulados de 1ª Fase',
      description: 'Treinamento intensivo com questões de múltipla escolha focadas em tribunais específicos.',
      status: 'pending',
      type: 'practice',
      resources: [
        { label: 'Simulados TRF3', url: 'https://www.trf3.jus.br/' }
      ]
    },
    {
      id: 'step-4',
      title: 'Sentença Cível e Criminal',
      description: 'Prática de redação de sentenças com correção por IA e modelos vencedores.',
      status: 'locked',
      type: 'practice'
    },
    {
      id: 'step-5',
      title: 'Prova Oral e Tribuna',
      description: 'Treinamento de oratória, postura e respostas rápidas para a banca examinadora.',
      status: 'locked',
      type: 'exam'
    }
  ],
  'mp': [
    {
      id: 'mp-1',
      title: 'Direitos Difusos e Coletivos',
      description: 'Foco em Meio Ambiente, Consumidor e Infância e Juventude.',
      status: 'in_progress',
      type: 'study'
    },
    {
      id: 'mp-2',
      title: 'Direito Penal e Processo Penal',
      description: 'Atuação do MP na persecução penal e tribunal do júri.',
      status: 'pending',
      type: 'study'
    }
  ]
};

const ApprovalTrail: React.FC<ApprovalTrailProps> = ({ userId, onNavigate }) => {
  const [selectedCareer, setSelectedCareer] = useState(CAREERS[0].id);
  const [userTrail, setUserTrail] = useState<UserTrail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTrail = async () => {
      try {
        const { data, error } = await supabase
          .from('user_trails')
          .select(USER_TRAILS_ROW_COLUMNS)
          .eq('user_id', userId)
          .eq('goal', selectedCareer)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        setUserTrail(data);
      } catch (err) {
        console.error('Error fetching user trail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTrail();
  }, [userId, selectedCareer]);

  const steps = MOCK_STEPS[selectedCareer] || [];
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progress = (completedCount / steps.length) * 100;

  const handleStartTrail = async () => {
    toast.success(`Trilha de ${CAREERS.find(c => c.id === selectedCareer)?.name} iniciada!`);
    // Em um cenário real, salvaríamos no Supabase aqui
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-0 max-w-7xl mx-auto">
      
      {/* Header Editorial */}
      <header className="relative py-8 md:py-12">
        <div className="absolute top-0 left-0 w-20 h-1 bg-indigo-600 rounded-full mb-6"></div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 leading-[0.9]">
              Trilha da <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">Aprovação.</span>
            </h1>
            <p className="text-lg md:text-xl font-medium text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
              Seu mapa estratégico rumo à posse. Do zero até a prova oral.
            </p>
          </div>
          
          <div className="flex gap-2 bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10">
            {CAREERS.map(career => (
              <button
                key={career.id}
                onClick={() => setSelectedCareer(career.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCareer === career.id 
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <career.icon size={14} />
                <span className="hidden sm:inline">{career.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna da Esquerda: Progresso e Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-white/5 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Seu Progresso</h3>
              <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                {Math.round(progress)}%
              </div>
            </div>
            
            <div className="relative h-4 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mb-8">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-lg">
                    <CheckCircle2 size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Concluídos</span>
                </div>
                <span className="text-lg font-black text-slate-900 dark:text-white">{completedCount}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                    <Zap size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Em Aberto</span>
                </div>
                <span className="text-lg font-black text-slate-900 dark:text-white">{steps.length - completedCount}</span>
              </div>
            </div>

            <button 
              onClick={handleStartTrail}
              className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Star size={16} />
              Personalizar Minha Trilha
            </button>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <h4 className="text-2xl font-black mb-2 relative z-10">Dica do Mentor</h4>
            <p className="text-indigo-100/80 text-sm leading-relaxed relative z-10">
              "A constância vence o talento. Foque em fechar a base do Grupo I antes de avançar para as matérias específicas."
            </p>
          </div>
        </div>

        {/* Coluna da Direita: O Roadmap */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative">
            {/* Linha Vertical do Roadmap */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-slate-200 dark:bg-white/10 rounded-full"></div>

            <div className="space-y-12 relative z-10">
              {steps.map((step, index) => (
                <div key={step.id} className="flex gap-8 group">
                  {/* Indicador de Status */}
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-4 transition-all duration-500 ${
                      step.status === 'completed' ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-900/30 text-white' :
                      step.status === 'in_progress' ? 'bg-indigo-600 border-indigo-100 dark:border-indigo-900/30 text-white animate-pulse' :
                      step.status === 'locked' ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400' :
                      'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-300'
                    }`}>
                      {step.status === 'completed' ? <CheckCircle2 size={24} /> :
                       step.status === 'locked' ? <Lock size={24} /> :
                       <Circle size={24} />}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-1 h-12 bg-slate-200 dark:bg-white/10"></div>
                    )}
                  </div>

                  {/* Conteúdo do Passo */}
                  <div className={`flex-1 bg-white dark:bg-white/5 rounded-[2rem] p-6 md:p-8 border transition-all duration-300 ${
                    step.status === 'in_progress' ? 'border-indigo-500 shadow-xl shadow-indigo-500/10' : 
                    'border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-900/50'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            step.type === 'study' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                            step.type === 'practice' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                            'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                          }`}>
                            {step.type}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fase {index + 1}</span>
                        </div>
                        <h3 className={`text-xl md:text-2xl font-black tracking-tight leading-none ${
                          step.status === 'locked' ? 'text-slate-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {step.title}
                        </h3>
                      </div>
                      
                      {step.status !== 'locked' && (
                        <button className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:translate-x-1 transition-transform">
                          Ver Detalhes <ChevronRight size={14} />
                        </button>
                      )}
                    </div>

                    <p className={`text-sm md:text-base leading-relaxed mb-6 ${
                      step.status === 'locked' ? 'text-slate-400/60' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {step.description}
                    </p>

                    {step.resources && step.resources.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                        {step.resources.map((res, i) => (
                          <button
                            key={i}
                            onClick={() => res.view ? onNavigate(res.view) : res.url && window.open(res.url, '_blank')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-slate-100 dark:border-white/5"
                          >
                            {res.view ? <Zap size={14} /> : <ExternalLink size={14} />}
                            {res.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action Final */}
          <div className="bg-white dark:bg-white/5 rounded-[3rem] p-12 border-4 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 rounded-full flex items-center justify-center mb-6">
              <Trophy size={40} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">O Topo da Montanha</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
              A aprovação é um processo. Cada passo concluído te deixa mais próximo da sua toga ou carteira funcional.
            </p>
            <button className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-sm tracking-widest hover:scale-105 transition-transform">
              Ver Quadro de Honra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalTrail;
