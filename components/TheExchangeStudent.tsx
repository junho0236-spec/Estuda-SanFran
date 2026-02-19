
import React, { useState, useEffect } from 'react';
import { 
  Plane, Map, Star, Coins, Zap, MessageSquare, ArrowRight, CheckCircle2, 
  AlertCircle, RefreshCw, Trophy, Globe, User, Briefcase, Coffee, Hotel
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ExchangeCity, ExchangeRPGScenario, RPGScenarioOption } from '../types';
import confetti from 'canvas-confetti';

interface TheExchangeStudentProps {
  userId: string;
}

const CITIES: Record<ExchangeCity, { name: string, flag: string, color: string, currency: string, lang: string }> = {
  London: { name: 'Londres', flag: '🇬🇧', color: 'bg-blue-600', currency: '£', lang: 'Inglês' },
  Paris: { name: 'Paris', flag: '🇫🇷', color: 'bg-indigo-600', currency: '€', lang: 'Francês' },
  Berlin: { name: 'Berlim', flag: '🇩🇪', color: 'bg-yellow-600', currency: '€', lang: 'Alemão' },
  Rome: { name: 'Roma', flag: '🇮🇹', color: 'bg-emerald-600', currency: '€', lang: 'Italiano' }
};

// --- DATA: SCENARIOS (Simplified for MVP - London only fully implemented, others as templates) ---
const SCENARIOS_DB: Record<ExchangeCity, ExchangeRPGScenario[]> = {
  London: [
    {
      id: 'arrival',
      text: "Você acabou de pousar em Heathrow. A chuva fina de Londres te recebe. O oficial da imigração te olha com cara de poucos amigos.",
      speaker: "Immigration Officer",
      options: [
        { 
          text: "Sorrir e apontar para o passaporte (Beginner)", 
          nextId: 'transport', 
          requiredLevel: 0,
          costEnergy: 10,
          rewardConfidence: 5,
          translation: "Smile and point to passport"
        },
        { 
          text: "'I am here to study law.' (Intermediate)", 
          nextId: 'transport', 
          requiredLevel: 1,
          rewardConfidence: 15,
          rewardEnergy: 5,
          translation: "Estou aqui para estudar direito."
        }
      ]
    },
    {
      id: 'transport',
      text: "Passou pela imigração! Agora você precisa chegar ao centro. O guichê do metrô (Tube) está à frente.",
      speaker: "Ticket Seller",
      options: [
        { 
          text: "Mostrar o endereço no celular (Beginner)", 
          nextId: 'hotel', 
          requiredLevel: 0,
          costMoney: 20, // Taxi/Expensive ticket due to confusion
          rewardConfidence: 5
        },
        { 
          text: "'One ticket to Piccadilly Circus, please.' (Intermediate)", 
          nextId: 'hotel', 
          requiredLevel: 1,
          costMoney: 10,
          rewardConfidence: 15,
          translation: "Um bilhete para Piccadilly Circus, por favor."
        }
      ]
    },
    {
      id: 'hotel',
      text: "Você chega ao hostel. Está cansado e com fome. A recepcionista pergunta se você tem reserva.",
      speaker: "Receptionist",
      options: [
        { 
          text: "Mostrar email de confirmação (Beginner)", 
          nextId: 'cafe', 
          requiredLevel: 0,
          rewardConfidence: 5
        },
        { 
          text: "'Yes, under the name Silva.' (Intermediate)", 
          nextId: 'cafe', 
          requiredLevel: 1,
          rewardConfidence: 15,
          rewardEnergy: 10, // Feel welcomed
          translation: "Sim, no nome Silva."
        }
      ]
    },
    {
      id: 'cafe',
      text: "Tudo certo no quarto. Agora, comida. Você entra em um pub. O barman pergunta o que você quer.",
      speaker: "Barman",
      options: [
        { 
          text: "Apontar para o prato do vizinho (Beginner)", 
          nextId: 'end_day', 
          requiredLevel: 0,
          costEnergy: 5, // Embarrassing
          rewardConfidence: 5
        },
        { 
          text: "'Fish and chips and a pint, please.' (Advanced)", 
          nextId: 'end_day', 
          requiredLevel: 2,
          costMoney: 15,
          rewardConfidence: 25,
          rewardEnergy: 20,
          translation: "Peixe com batatas e uma cerveja, por favor."
        }
      ]
    },
    {
      id: 'end_day',
      text: "Dia concluído! Você sobreviveu ao primeiro dia em Londres.",
      options: [] // End of loop
    }
  ],
  Paris: [
    { id: 'arrival', text: "Bienvenue à Paris! O oficial pergunta: 'Motif du voyage?'", options: [{ text: "Tourisme (Tourist)", nextId: 'end_day', requiredLevel: 0 }] }],
  Berlin: [
    { id: 'arrival', text: "Willkommen in Berlin. 'Reisepass, bitte?'", options: [{ text: "Hier (Here)", nextId: 'end_day', requiredLevel: 0 }] }],
  Rome: [
    { id: 'arrival', text: "Benvenuti a Roma. 'Passaporto?'", options: [{ text: "Eccolo (Here)", nextId: 'end_day', requiredLevel: 0 }] }]
};

const TheExchangeStudent: React.FC<TheExchangeStudentProps> = ({ userId }) => {
  const [city, setCity] = useState<ExchangeCity | null>(null);
  const [currentScenarioId, setCurrentScenarioId] = useState('arrival');
  const [stats, setStats] = useState({ energy: 100, money: 500, confidence: 0 }); // Confidence acts as XP
  const [level, setLevel] = useState(0); // 0=Beg, 1=Int, 2=Adv
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ message: string, translation?: string } | null>(null);

  // Load Progress
  useEffect(() => {
    loadGame();
  }, [userId]);

  const loadGame = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('exchange_rpg_saves')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        setCity(data.city as ExchangeCity);
        setCurrentScenarioId(data.current_scenario_id);
        setStats(data.stats);
        // Calculate level based on confidence/XP
        const lvl = Math.floor(data.stats.confidence / 50); // Simple leveling: 50 conf = lvl 1
        setLevel(lvl > 2 ? 2 : lvl);
      }
    } catch (e) {
      // No save, start fresh
    } finally {
      setLoading(false);
    }
  };

  const saveGame = async (newStats: any, scenarioId: string) => {
    if (!city) return;
    try {
      await supabase.from('exchange_rpg_saves').upsert({
        user_id: userId,
        city: city,
        current_scenario_id: scenarioId,
        stats: newStats
      });
    } catch (e) {
      console.error(e);
    }
  };

  const startGame = (selectedCity: ExchangeCity) => {
    setCity(selectedCity);
    setCurrentScenarioId('arrival');
    setStats({ energy: 100, money: 500, confidence: 0 });
    setLevel(0);
    saveGame({ energy: 100, money: 500, confidence: 0 }, 'arrival');
  };

  const handleChoice = (option: RPGScenarioOption) => {
    // 1. Apply costs
    const newStats = {
      energy: stats.energy - (option.costEnergy || 0) + (option.rewardEnergy || 0),
      money: stats.money - (option.costMoney || 0) + (option.rewardMoney || 0),
      confidence: stats.confidence + (option.rewardConfidence || 0)
    };

    // 2. Check Game Over
    if (newStats.energy <= 0) {
      alert("Você desmaiou de cansaço. Jogo encerrado.");
      setCity(null); // Reset
      return;
    }
    if (newStats.money < 0) {
      alert("Sem dinheiro! Você teve que ligar para casa pedindo resgate.");
      setCity(null);
      return;
    }

    // 3. Update Level
    const newLevel = Math.floor(newStats.confidence / 50);
    if (newLevel > level) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setLevel(newLevel > 2 ? 2 : newLevel);
    }

    setStats(newStats);

    // 4. Feedback & Transition
    if (option.translation) {
      setFeedback({ message: "Vocabulário Aprendido!", translation: option.translation });
      setTimeout(() => {
        setFeedback(null);
        setCurrentScenarioId(option.nextId);
        saveGame(newStats, option.nextId);
      }, 2500);
    } else {
      setCurrentScenarioId(option.nextId);
      saveGame(newStats, option.nextId);
    }
  };

  const resetGame = () => {
    if(confirm("Reiniciar a viagem? Todo o progresso será perdido.")) {
       setCity(null);
       // Clear save in DB optional
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>;

  // --- CITY SELECTION (LOBBY) ---
  if (!city) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
         <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/20 px-6 py-2 rounded-full border border-indigo-200 dark:border-indigo-800 mb-6">
               <Plane className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
               <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Embarque Imediato</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">O Intercambista</h2>
            <p className="text-slate-500 font-bold max-w-md mx-auto">Escolha seu destino. Sobreviva aos desafios linguísticos do dia a dia.</p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
            {Object.entries(CITIES).map(([key, data]) => (
               <button
                 key={key}
                 onClick={() => startGame(key as ExchangeCity)}
                 className={`group relative overflow-hidden rounded-[2.5rem] p-8 border-4 border-transparent hover:border-white/20 transition-all hover:scale-[1.02] shadow-2xl ${data.color}`}
               >
                  <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 transition-opacity transform group-hover:rotate-12">
                     <Globe size={100} className="text-white" />
                  </div>
                  <div className="relative z-10 text-left text-white">
                     <span className="text-4xl mb-2 block">{data.flag}</span>
                     <h3 className="text-3xl font-black uppercase tracking-tight">{data.name}</h3>
                     <p className="text-xs font-bold uppercase tracking-widest opacity-80 mt-1">{data.lang}</p>
                  </div>
               </button>
            ))}
         </div>
      </div>
    );
  }

  // --- GAMEPLAY ---
  
  // Safe check if city data exists (e.g. if extended later)
  const scenarios = SCENARIOS_DB[city] || SCENARIOS_DB['London'];
  const currentScenario = scenarios.find(s => s.id === currentScenarioId) || scenarios[0];
  const isEnd = currentScenario.options.length === 0;

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto pb-10 px-4 md:px-0 animate-in zoom-in-95 duration-500 font-sans">
       
       {/* HUD */}
       <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-6 rounded-[2rem] shadow-xl flex flex-wrap items-center justify-between gap-4 mb-8 shrink-0 relative overflow-hidden">
          {/* Progress Bar Background */}
          <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent w-full opacity-50"></div>

          <div className="flex items-center gap-4">
             <button onClick={resetGame} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><RefreshCw size={16} /></button>
             <div>
                <h3 className="font-black uppercase tracking-tight text-lg">{CITIES[city].name}</h3>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Dia 1</p>
             </div>
          </div>

          <div className="flex gap-6">
             <div className="flex items-center gap-2">
                <Zap className="text-yellow-400" size={18} fill="currentColor" />
                <div>
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Energia</p>
                   <p className="font-black text-lg leading-none">{stats.energy}%</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <Coins className="text-emerald-400" size={18} fill="currentColor" />
                <div>
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Carteira</p>
                   <p className="font-black text-lg leading-none">{CITIES[city].currency}{stats.money}</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <Star className="text-indigo-400" size={18} fill="currentColor" />
                <div>
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Nível</p>
                   <p className="font-black text-lg leading-none">{level === 0 ? 'Novato' : level === 1 ? 'Intermed.' : 'Fluente'}</p>
                </div>
             </div>
          </div>
       </div>

       {/* MAIN STAGE */}
       <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
          
          {/* VISUAL & NARRATIVE */}
          <div className="lg:col-span-7 flex flex-col gap-6">
             <div className={`flex-1 bg-white dark:bg-sanfran-rubiDark/20 rounded-[3rem] border-4 border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden p-8 md:p-12 flex flex-col justify-center items-center text-center ${feedback ? 'blur-sm scale-95 transition-all' : 'transition-all'}`}>
                
                {/* Background City Theme Hint */}
                <div className={`absolute inset-0 opacity-5 pointer-events-none ${CITIES[city].color}`}></div>
                
                <div className="w-24 h-24 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-8 shadow-inner border-2 border-slate-200 dark:border-white/5">
                   {currentScenarioId === 'arrival' ? <Plane size={40} className="text-slate-400" /> : 
                    currentScenarioId === 'transport' ? <Map size={40} className="text-slate-400" /> :
                    currentScenarioId === 'hotel' ? <Hotel size={40} className="text-slate-400" /> :
                    currentScenarioId === 'cafe' ? <Coffee size={40} className="text-slate-400" /> :
                    <Trophy size={40} className="text-yellow-500" />
                   }
                </div>

                <div className="space-y-4 max-w-lg">
                   {currentScenario.speaker && (
                      <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2">
                         {currentScenario.speaker} diz:
                      </span>
                   )}
                   <h3 className="text-2xl md:text-3xl font-serif font-medium text-slate-900 dark:text-white leading-relaxed">
                      "{currentScenario.text}"
                   </h3>
                </div>

                {isEnd && (
                   <div className="mt-8 animate-bounce">
                      <p className="text-emerald-500 font-black uppercase tracking-widest text-sm">Missão Cumprida!</p>
                      <button onClick={() => setCity(null)} className="mt-4 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors">Voltar ao Menu</button>
                   </div>
                )}
             </div>
          </div>

          {/* CHOICES */}
          <div className="lg:col-span-5 flex flex-col justify-center gap-4">
             {currentScenario.options.map((opt, idx) => {
                const isLocked = level < (opt.requiredLevel || 0);
                const isTooExpensive = (opt.costMoney || 0) > stats.money;
                const isDisabled = isLocked || isTooExpensive;

                return (
                   <button 
                     key={idx}
                     disabled={isDisabled}
                     onClick={() => handleChoice(opt)}
                     className={`group relative p-6 rounded-[2rem] border-2 text-left transition-all ${isDisabled ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 opacity-60 grayscale cursor-not-allowed' : 'bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 hover:border-indigo-500 hover:shadow-xl hover:scale-[1.02]'}`}
                   >
                      <div className="flex justify-between items-start mb-2">
                         <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isLocked ? 'bg-red-100 text-red-600' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                            {isLocked ? `Nível ${opt.requiredLevel} Req.` : opt.requiredLevel === 0 ? 'Básico' : opt.requiredLevel === 1 ? 'Intermediário' : 'Avançado'}
                         </span>
                         {(opt.costMoney || 0) > 0 && (
                            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                               -{opt.costMoney}{CITIES[city].currency}
                            </span>
                         )}
                      </div>
                      
                      <p className="font-bold text-slate-800 dark:text-white text-sm md:text-base pr-8">{opt.text}</p>
                      
                      {!isDisabled && <ArrowRight className="absolute bottom-6 right-6 text-slate-300 group-hover:text-indigo-500 transition-colors" size={20} />}
                   </button>
                )
             })}
          </div>

       </div>

       {/* FEEDBACK OVERLAY */}
       {feedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
             <div className="bg-emerald-500 text-white p-8 rounded-[3rem] shadow-2xl border-4 border-emerald-400 animate-in zoom-in duration-300 text-center max-w-sm mx-4">
                <CheckCircle2 size={48} className="mx-auto mb-4" />
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{feedback.message}</h3>
                <p className="text-emerald-100 font-serif italic text-lg">"{feedback.translation}"</p>
             </div>
          </div>
       )}

    </div>
  );
};

export default TheExchangeStudent;
