
import React, { useState, useEffect } from 'react';
import { 
  Zap, Heart, Award, RefreshCw, Briefcase, FileText, AlertTriangle, 
  Siren, Terminal, ArrowRight, Skull, Frown, PartyPopper, Scale, Trophy
} from 'lucide-react';
import { InternRPGScenario, RPGStat, RPGChoice } from '../types';

// --- DATA: SCENARIOS ---
const SCENARIOS: InternRPGScenario[] = [
  {
    id: 'start',
    title: 'Sexta-feira, 17:00h',
    text: 'Seu chefe sai da sala correndo. Antes de bater a porta, ele grita: "A apelação do caso Silva precisa ser protocolada hoje! É prazo fatal!". Você abre o PJE e... tela branca. O sistema do Tribunal caiu.',
    image: AlertTriangle,
    choices: [
      { 
        text: 'Ligar para o suporte do Tribunal', 
        nextId: 'call_support', 
        effect: { energy: -10, sanity: -5 }, 
        feedback: 'Você ouve uma música de espera infinita...'
      },
      { 
        text: 'Correr para o Plantão Judiciário físico', 
        nextId: 'run_physical', 
        effect: { energy: -30, reputation: 5 },
        feedback: 'Você pega um Uber e reza para não ter trânsito.'
      },
      { 
        text: 'Tentar recarregar a página infinitamente', 
        nextId: 'refresh_loop', 
        effect: { sanity: -15, energy: -5 },
        feedback: 'F5. F5. F5. Nada acontece feijoada.'
      }
    ]
  },
  {
    id: 'call_support',
    title: 'A Música do Inferno',
    text: 'Depois de 20 minutos ouvindo Vivaldi distorcido, um atendente diz que é "instabilidade momentânea" e desliga na sua cara. São 17:30h.',
    image: Siren,
    choices: [
      {
        text: 'Mentir para o chefe dizendo que já protocolou',
        nextId: 'lie_boss',
        effect: { reputation: -50, sanity: -20 }, // Risco alto
        feedback: 'Você envia a mensagem. Sua consciência pesa uma tonelada.'
      },
      {
        text: 'Salvar prints do erro e fazer uma certidão de indisponibilidade',
        nextId: 'make_cert',
        effect: { reputation: 10, sanity: 5 },
        feedback: 'Boa! Isso pode prorrogar o prazo legalmente.'
      }
    ]
  },
  {
    id: 'run_physical',
    title: 'O Trânsito da 23 de Maio',
    text: 'Tudo parado. O motorista do Uber começa a falar sobre a vida dele. O relógio marca 18:15h. O protocolo físico fecha às 19h.',
    image: FileText,
    choices: [
      {
        text: 'Descer e correr a pé (2km)',
        nextId: 'run_for_life',
        effect: { energy: -40, sanity: 10 },
        feedback: 'Suando frio (e quente), você dispara pelas calçadas.'
      },
      {
        text: 'Ficar no carro e chorar',
        nextId: 'game_over_time',
        effect: { sanity: -100 },
        feedback: 'As lágrimas não protocoloam petições.'
      }
    ]
  },
  {
    id: 'refresh_loop',
    title: 'A Loucura do F5',
    text: 'Você entrou num estado de transe. O navegador travou. O computador começou a fazer um barulho estranho.',
    image: Terminal,
    choices: [
      {
        text: 'Reiniciar o computador',
        nextId: 'restart_pc',
        effect: { sanity: 5 },
        feedback: 'Uma tentativa clássica de TI.'
      },
      {
        text: 'Chutar o gabinete',
        nextId: 'kick_pc',
        effect: { reputation: -20, energy: -5 },
        feedback: 'O computador desliga. O chefe entra na sala.'
      }
    ]
  },
  {
    id: 'make_cert',
    title: 'A Salvação Processual',
    text: 'Você documentou tudo. Às 18:00h, o Tribunal publica nota oficial confirmando a queda. O prazo foi prorrogado! Você salvou o escritório de uma perda de prazo.',
    image: Scale,
    choices: [
      {
        text: 'Ir para o Happy Hour',
        nextId: 'happy_hour',
        effect: { sanity: 20, energy: -10 },
        feedback: 'Você merece.'
      }
    ]
  },
  {
    id: 'run_for_life',
    title: 'Maratona Forense',
    text: 'Você chega no protocolo às 18:58h, descabelado e sem ar. O funcionário te olha com pena e carimba a petição. Protocolado!',
    image: Award,
    choices: [
      {
        text: 'Desmaiar na recepção',
        nextId: 'success_faint',
        effect: { reputation: 20, energy: -50 },
        feedback: 'Acordou com um copo de água e uma promoção.'
      }
    ]
  },
  {
    id: 'lie_boss',
    title: 'A Mentira tem Perna Curta',
    text: 'Segunda-feira. O chefe pede o recibo de protocolo. Você gagueja. Ele descobre. A quebra de confiança é fatal.',
    image: Skull,
    choices: [], // Game Over
  },
  {
    id: 'restart_pc',
    title: 'O Retorno',
    text: 'O PC liga. O sistema voltou! Mas são 23:55h. Você tem 5 minutos para converter o PDF e assinar.',
    image: Zap,
    choices: [
      {
        text: 'Esquecer de anexar a guia de custas',
        nextId: 'forgot_payment',
        effect: { reputation: -10 },
        feedback: 'Protocolado! Mas vai dar deserção...'
      },
      {
        text: 'Protocolar com calma',
        nextId: 'success_close',
        effect: { sanity: -10, reputation: 10 },
        feedback: '23:59:58. Protocolado.'
      }
    ]
  },
  {
    id: 'game_over_time',
    title: 'Prazo Perdido',
    text: 'O relógio bateu meia-noite. O direito pereceu. Seu estágio também.',
    image: Frown,
    choices: []
  },
  {
    id: 'kick_pc',
    title: 'Dano ao Patrimônio',
    text: 'Seu chefe viu você agredindo o hardware. "Isso sai do seu pagamento".',
    image: AlertTriangle,
    choices: [] // Game Over
  },
  {
    id: 'happy_hour',
    title: 'Sextou com S de Sucesso',
    text: 'Você sobreviveu a mais um dia na advocacia. Ganhou XP e uma história para contar.',
    image: PartyPopper,
    choices: [] // Win
  },
  {
    id: 'success_faint',
    title: 'Guerreiro(a)',
    text: 'Sua dedicação física foi notada. Você é o novo estagiário favorito (mas vá ao médico).',
    image: PartyPopper,
    choices: [] // Win
  },
  {
    id: 'success_close',
    title: 'Sniper Processual',
    text: 'Por pouco. Muito pouco. Mas no Direito, tempestividade é tudo.',
    image: PartyPopper,
    choices: [] // Win
  },
  {
    id: 'forgot_payment',
    title: 'Deserção',
    text: 'O recurso não foi conhecido por falta de preparo. O cliente perdeu a causa. Você foi desligado.',
    image: Skull,
    choices: [] // Game Over
  }
];

const InternRPG: React.FC = () => {
  const [currentScenarioId, setCurrentScenarioId] = useState('start');
  const [stats, setStats] = useState({ sanity: 80, reputation: 50, energy: 100 });
  const [gameStatus, setGameStatus] = useState<'playing' | 'gameover' | 'won'>('playing');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const currentScenario = SCENARIOS.find(s => s.id === currentScenarioId) || SCENARIOS[0];

  const handleChoice = (choice: RPGChoice) => {
    // 1. Show Feedback
    setFeedback(choice.feedback || null);

    // 2. Apply Effects
    if (choice.effect) {
      setStats(prev => {
        const newStats = {
          sanity: Math.min(100, Math.max(0, prev.sanity + (choice.effect?.sanity || 0))),
          reputation: Math.min(100, Math.max(0, prev.reputation + (choice.effect?.reputation || 0))),
          energy: Math.min(100, Math.max(0, prev.energy + (choice.effect?.energy || 0)))
        };
        return newStats;
      });
    }

    // 3. Log History
    setLog(prev => [...prev, `> ${choice.text}`]);

    // 4. Delay Transition
    setTimeout(() => {
      setFeedback(null);
      setCurrentScenarioId(choice.nextId);
      
      // Check End Game Conditions based on next Node ID (simpler than checking stats in effect)
      // Actually check stats here too
      const nextScenario = SCENARIOS.find(s => s.id === choice.nextId);
      if (nextScenario) {
         if (nextScenario.choices.length === 0) {
            // It's an ending node. Determine if good or bad based on title keywords or stats
            if (['Sextou', 'Guerreiro', 'Sniper'].some(k => nextScenario.title.includes(k))) {
               setGameStatus('won');
            } else {
               setGameStatus('gameover');
            }
         }
      }
    }, 2000);
  };

  // Check stats for Game Over
  useEffect(() => {
    if (gameStatus === 'playing') {
      if (stats.sanity <= 0 || stats.reputation <= 0 || stats.energy <= 0) {
        setGameStatus('gameover');
      }
    }
  }, [stats]);

  const restartGame = () => {
    setStats({ sanity: 80, reputation: 50, energy: 100 });
    setCurrentScenarioId('start');
    setGameStatus('playing');
    setLog([]);
    setFeedback(null);
  };

  const StatBar: React.FC<RPGStat> = ({ label, value, max, color }) => (
    <div className="flex flex-col w-full">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1 text-slate-400">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <div 
          className={`h-full transition-all duration-500 ${color}`} 
          style={{ width: `${(value/max)*100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto pb-20 animate-in fade-in duration-500 font-mono">
      
      {/* HEADER STATS */}
      <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border-4 border-slate-800 mb-6 shrink-0">
         <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
            <Briefcase className="text-sanfran-rubi" />
            <h2 className="text-xl font-black uppercase tracking-widest">Ficha do Estagiário</h2>
         </div>
         <div className="grid grid-cols-3 gap-6">
            <StatBar label="Sanidade" value={stats.sanity} max={100} color="bg-blue-500" />
            <StatBar label="Reputação" value={stats.reputation} max={100} color="bg-yellow-500" />
            <StatBar label="Energia" value={stats.energy} max={100} color="bg-red-500" />
         </div>
      </div>

      {/* GAME SCREEN */}
      <div className="flex-1 bg-slate-950 rounded-[2rem] border-4 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
         
         {/* CRT Overlay Effect */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>
         <div className="absolute inset-0 pointer-events-none z-10 animate-flicker opacity-5 bg-white"></div>

         {/* LOG AREA (Previous turns) */}
         <div className="p-6 text-xs text-slate-500 font-bold opacity-50 space-y-1 h-32 overflow-hidden border-b border-slate-800">
            {log.slice(-4).map((entry, i) => (
               <p key={i}>{entry}</p>
            ))}
         </div>

         {/* MAIN SCENE */}
         <div className="flex-1 p-8 flex flex-col items-center justify-center text-center relative z-30">
            {feedback ? (
               <div className="animate-in zoom-in duration-300">
                  <p className="text-2xl font-black text-yellow-400 mb-2 uppercase tracking-widest">Resultado</p>
                  <p className="text-lg text-white font-bold">{feedback}</p>
               </div>
            ) : gameStatus === 'playing' ? (
               <>
                  <div className="mb-6 p-4 bg-slate-800/50 rounded-full border border-slate-700">
                     {currentScenario.image && <currentScenario.image size={48} className="text-slate-300" />}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-4 leading-tight">
                     {currentScenario.title}
                  </h3>
                  <p className="text-base md:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl">
                     {currentScenario.text}
                  </p>
               </>
            ) : (
               <div className="animate-in zoom-in">
                  {gameStatus === 'won' ? (
                     <>
                        <Trophy size={80} className="text-yellow-500 mx-auto mb-6 animate-bounce" />
                        <h2 className="text-4xl font-black text-yellow-500 uppercase tracking-widest mb-4">Vitória!</h2>
                        <p className="text-slate-300 mb-8">Você sobreviveu ao sistema judiciário brasileiro.</p>
                     </>
                  ) : (
                     <>
                        <Skull size={80} className="text-red-600 mx-auto mb-6 animate-pulse" />
                        <h2 className="text-4xl font-black text-red-600 uppercase tracking-widest mb-4">Game Over</h2>
                        <p className="text-slate-300 mb-8">Sua carreira jurídica sofreu um revés fatal.</p>
                     </>
                  )}
                  <button 
                     onClick={restartGame}
                     className="px-8 py-4 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 flex items-center gap-2 mx-auto"
                  >
                     <RefreshCw size={16} /> Tentar Novamente
                  </button>
               </div>
            )}
         </div>

         {/* CHOICES AREA */}
         {gameStatus === 'playing' && !feedback && (
            <div className="p-6 bg-slate-900 border-t border-slate-800 z-30">
               <div className="grid grid-cols-1 gap-3">
                  {currentScenario.choices.map((choice, idx) => (
                     <button
                        key={idx}
                        onClick={() => handleChoice(choice)}
                        className="group flex items-center justify-between p-4 rounded-xl border border-slate-700 hover:border-sanfran-rubi hover:bg-slate-800 transition-all text-left"
                     >
                        <span className="text-sm font-bold text-slate-300 group-hover:text-white uppercase tracking-wide">
                           {choice.text}
                        </span>
                        <ArrowRight size={16} className="text-slate-600 group-hover:text-sanfran-rubi opacity-0 group-hover:opacity-100 transition-all" />
                     </button>
                  ))}
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default InternRPG;
