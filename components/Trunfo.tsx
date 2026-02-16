
import React, { useState, useEffect } from 'react';
import { Sword, Trophy, Shield, Zap, Users, Play, RefreshCw, Scroll, BookOpen, Scale, Gavel } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabaseClient';

interface TrunfoCard {
  id: string;
  name: string;
  school: string;
  isSuperTrunfo: boolean;
  attributes: {
    complexity: number; // Complexidade
    influence: number;  // Influência
    volume: number;     // Obra (Volume)
    antiquity: number;  // Antiguidade/Peso Histórico
  };
}

const DOCTRINATORS: TrunfoCard[] = [
  { id: '1', name: 'Pontes de Miranda', school: 'Processualismo Científico', isSuperTrunfo: true, attributes: { complexity: 100, influence: 95, volume: 100, antiquity: 90 } },
  { id: '2', name: 'Hans Kelsen', school: 'Positivismo Jurídico', isSuperTrunfo: false, attributes: { complexity: 98, influence: 100, volume: 85, antiquity: 95 } },
  { id: '3', name: 'Miguel Reale', school: 'Culturalismo Jurídico', isSuperTrunfo: false, attributes: { complexity: 90, influence: 98, volume: 92, antiquity: 85 } },
  { id: '4', name: 'Rui Barbosa', school: 'Liberalismo Clássico', isSuperTrunfo: false, attributes: { complexity: 85, influence: 96, volume: 80, antiquity: 100 } },
  { id: '5', name: 'Maria Helena Diniz', school: 'Direito Civil Contemporâneo', isSuperTrunfo: false, attributes: { complexity: 88, influence: 92, volume: 98, antiquity: 75 } },
  { id: '6', name: 'Clóvis Beviláqua', school: 'Civilismo Clássico', isSuperTrunfo: false, attributes: { complexity: 92, influence: 88, volume: 85, antiquity: 98 } },
  { id: '7', name: 'Caio Mário da Silva Pereira', school: 'Direito Civil', isSuperTrunfo: false, attributes: { complexity: 90, influence: 89, volume: 88, antiquity: 80 } },
  { id: '8', name: 'Nelson Hungria', school: 'Direito Penal Clássico', isSuperTrunfo: false, attributes: { complexity: 85, influence: 94, volume: 82, antiquity: 88 } },
  { id: '9', name: 'Celso Antônio Bandeira de Mello', school: 'Direito Administrativo', isSuperTrunfo: false, attributes: { complexity: 93, influence: 95, volume: 86, antiquity: 78 } },
  { id: '10', name: 'José Afonso da Silva', school: 'Constitucionalismo', isSuperTrunfo: false, attributes: { complexity: 91, influence: 97, volume: 84, antiquity: 82 } },
  { id: '11', name: 'Luís Roberto Barroso', school: 'Neoconstitucionalismo', isSuperTrunfo: false, attributes: { complexity: 88, influence: 99, volume: 80, antiquity: 60 } },
  { id: '12', name: 'Gilmar Mendes', school: 'Constitucionalismo', isSuperTrunfo: false, attributes: { complexity: 89, influence: 100, volume: 82, antiquity: 65 } },
];

interface TrunfoProps {
  userId: string;
  userName: string;
}

const Trunfo: React.FC<TrunfoProps> = ({ userId, userName }) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'round_result' | 'end'>('start');
  const [playerDeck, setPlayerDeck] = useState<TrunfoCard[]>([]);
  const [cpuDeck, setCpuDeck] = useState<TrunfoCard[]>([]);
  const [playerCard, setPlayerCard] = useState<TrunfoCard | null>(null);
  const [cpuCard, setCpuCard] = useState<TrunfoCard | null>(null);
  const [selectedAttr, setSelectedAttr] = useState<keyof TrunfoCard['attributes'] | null>(null);
  const [roundWinner, setRoundWinner] = useState<'player' | 'cpu' | 'draw' | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Stats
  const [totalWins, setTotalWins] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    try {
      const { data } = await supabase.from('trunfo_scores').select('wins').eq('user_id', userId).single();
      if (data) setTotalWins(data.wins);
    } catch (e) {
      console.warn("Tabela trunfo_scores não encontrada.");
    }
  };

  const updateStats = async (isWin: boolean) => {
    try {
      if (isWin) {
        setTotalWins(prev => prev + 1);
        // Supabase Upsert
        const { data: current } = await supabase.from('trunfo_scores').select('*').eq('user_id', userId).single();
        if (current) {
           await supabase.from('trunfo_scores').update({ wins: current.wins + 1 }).eq('user_id', userId);
        } else {
           await supabase.from('trunfo_scores').insert({ user_id: userId, user_name: userName || 'Doutor(a)', wins: 1, losses: 0 });
        }
      } else {
        const { data: current } = await supabase.from('trunfo_scores').select('*').eq('user_id', userId).single();
        if (current) {
           await supabase.from('trunfo_scores').update({ losses: current.losses + 1 }).eq('user_id', userId);
        } else {
           await supabase.from('trunfo_scores').insert({ user_id: userId, user_name: userName || 'Doutor(a)', wins: 0, losses: 1 });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startGame = () => {
    const shuffled = [...DOCTRINATORS].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    const pDeck = shuffled.slice(0, mid);
    const cDeck = shuffled.slice(mid);

    setPlayerDeck(pDeck);
    setCpuDeck(cDeck);
    setPlayerCard(pDeck[0]);
    setCpuCard(cDeck[0]);
    setGameState('playing');
    setWins(0);
    setLosses(0);
    setSelectedAttr(null);
    setRoundWinner(null);
  };

  const handleAttributeSelect = (attr: keyof TrunfoCard['attributes']) => {
    if (isProcessing || !playerCard || !cpuCard) return;
    setIsProcessing(true);
    setSelectedAttr(attr);

    // Lógica Super Trunfo
    let winner: 'player' | 'cpu' | 'draw' = 'draw';

    // Regra A1 (Super Trunfo) vence tudo, exceto A-X (Não implementado cartas codificadas, usando flag isSuperTrunfo)
    // Aqui simplificaremos: Super Trunfo ganha automaticamente se jogado, a menos que o oponente tenha uma carta específica (não implementado).
    // Vamos manter a comparação numérica pura para balancear, mas dar um boost visual.
    // Ou implementar a regra clássica: Super Trunfo ganha de todas as cartas B, C, D... e perde só pra A. 
    // Como não temos letras, vamos comparar valores.

    if (playerCard.attributes[attr] > cpuCard.attributes[attr]) winner = 'player';
    else if (playerCard.attributes[attr] < cpuCard.attributes[attr]) winner = 'cpu';
    
    setRoundWinner(winner);
    setGameState('round_result');

    setTimeout(() => {
        resolveRound(winner);
    }, 2000);
  };

  const resolveRound = (winner: 'player' | 'cpu' | 'draw') => {
    if (!playerCard || !cpuCard) return;

    const newPlayerDeck = [...playerDeck];
    const newCpuDeck = [...cpuDeck];

    // Remove cards jogados do topo
    newPlayerDeck.shift();
    newCpuDeck.shift();

    // Vencedor leva as duas cartas para o final do baralho
    if (winner === 'player') {
        newPlayerDeck.push(playerCard, cpuCard);
        setWins(prev => prev + 1);
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    } else if (winner === 'cpu') {
        newCpuDeck.push(cpuCard, playerCard);
        setLosses(prev => prev + 1);
    } else {
        // Empate: Cartas voltam pro final dos respectivos donos (ou ficam no limbo - "monte", simplificando: voltam pros donos)
        newPlayerDeck.push(playerCard);
        newCpuDeck.push(cpuCard);
    }

    setPlayerDeck(newPlayerDeck);
    setCpuDeck(newCpuDeck);

    if (newPlayerDeck.length === 0 || newCpuDeck.length === 0) {
        endGame(newPlayerDeck.length > 0);
    } else {
        setPlayerCard(newPlayerDeck[0]);
        setCpuCard(newCpuDeck[0]);
        setGameState('playing');
        setSelectedAttr(null);
        setRoundWinner(null);
        setIsProcessing(false);
    }
  };

  const endGame = (playerWon: boolean) => {
    setGameState('end');
    setIsProcessing(false);
    if (playerWon) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
    updateStats(playerWon);
  };

  // Renderizador de Carta
  const renderCard = (card: TrunfoCard, hidden: boolean = false, isWinner: boolean = false) => {
    if (hidden) {
        return (
            <div className="w-64 h-96 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-700 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transform transition-all duration-500">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <Shield size={64} className="text-slate-600 opacity-50" />
                <p className="mt-4 text-slate-500 font-black uppercase tracking-[0.2em]">SanFran Trunfo</p>
            </div>
        );
    }

    return (
        <div className={`w-64 h-96 rounded-2xl bg-white dark:bg-slate-900 border-[6px] shadow-2xl flex flex-col relative overflow-hidden transition-all duration-500 ${card.isSuperTrunfo ? 'border-yellow-500' : 'border-slate-300 dark:border-slate-700'} ${isWinner ? 'scale-105 ring-4 ring-emerald-500' : ''}`}>
            {card.isSuperTrunfo && (
                <div className="absolute top-0 right-0 bg-yellow-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-bl-xl z-10 shadow-md">
                    Super Trunfo
                </div>
            )}
            
            {/* Imagem (Placeholder com Ícone) */}
            <div className={`h-40 w-full flex items-center justify-center relative ${card.isSuperTrunfo ? 'bg-gradient-to-b from-yellow-100 to-white dark:from-yellow-900/30 dark:to-slate-900' : 'bg-gradient-to-b from-slate-100 to-white dark:from-slate-800 dark:to-slate-900'}`}>
               {card.isSuperTrunfo ? <Trophy size={64} className="text-yellow-500 drop-shadow-md" /> : <Scale size={64} className="text-slate-400 dark:text-slate-600" />}
               <div className="absolute bottom-2 left-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white/80 dark:bg-black/50 px-2 py-0.5 rounded">{card.id.padStart(2, '0')}</span>
               </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 p-4 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">{card.name}</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{card.school}</p>
                </div>

                <div className="space-y-1.5 flex-1">
                    {Object.entries(card.attributes).map(([key, value]) => (
                        <button
                            key={key}
                            disabled={gameState !== 'playing' || hidden} // Só pode clicar se for a vez do player e carta visivel (tecnicamente cpu card nunca é clicavel pra escolher)
                            onClick={() => !hidden && handleAttributeSelect(key as keyof TrunfoCard['attributes'])}
                            className={`w-full flex justify-between items-center px-3 py-1.5 rounded-lg border transition-all ${
                                selectedAttr === key 
                                    ? 'bg-sanfran-rubi text-white border-sanfran-rubi scale-105 shadow-md' 
                                    : !hidden && gameState === 'playing'
                                        ? 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer'
                                        : 'bg-transparent border-transparent'
                            }`}
                        >
                            <span className="text-[9px] font-black uppercase tracking-widest">
                                {key === 'complexity' ? 'Complexidade' : key === 'influence' ? 'Influência' : key === 'volume' ? 'Obra' : 'Antiguidade'}
                            </span>
                            <span className="font-mono font-bold text-sm">{value}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/20 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-800 mb-4">
              <Sword className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Card Game Jurídico</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Super Trunfo: Doutrinadores</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Quem tem a maior doutrina? Dispute com os gigantes do Direito.</p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Vitórias Totais</p>
                <p className="text-2xl font-black text-emerald-500 tabular-nums">{totalWins}</p>
            </div>
        </div>
      </header>

      {gameState === 'start' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12">
           <div className="relative group cursor-pointer" onClick={startGame}>
              <div className="absolute -inset-4 bg-gradient-to-r from-sanfran-rubi to-purple-600 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity animate-pulse"></div>
              <div className="relative w-40 h-56 bg-slate-900 rounded-2xl border-4 border-yellow-500 flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform rotate-6">
                 <Shield size={64} className="text-yellow-500" />
                 <span className="absolute bottom-4 text-yellow-500 font-black uppercase text-xs tracking-widest">Jogar</span>
              </div>
              <div className="absolute top-0 right-0 w-40 h-56 bg-white dark:bg-slate-800 rounded-2xl border-4 border-slate-300 dark:border-slate-600 flex items-center justify-center shadow-xl transform -rotate-6 -z-10 group-hover:rotate-[-12deg] transition-transform"></div>
           </div>
           
           <div className="max-w-md space-y-2">
              <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white">Batalha de Intelectos</h3>
              <p className="text-slate-500 font-medium text-sm">Distribua as cartas e escolha o melhor atributo. Vence quem conquistar todas as cartas do oponente.</p>
           </div>

           <button 
             onClick={startGame}
             className="px-12 py-5 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
           >
              <Play size={20} fill="currentColor" /> Embaralhar e Jogar
           </button>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'round_result') && playerCard && cpuCard && (
        <div className="flex-1 flex flex-col justify-center items-center gap-8 md:gap-12 animate-in zoom-in-95 duration-500">
            
            {/* Placar */}
            <div className="flex items-center gap-8 bg-slate-100 dark:bg-white/5 px-8 py-4 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-inner">
                <div className="text-center">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Você</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{playerDeck.length}</p>
                </div>
                <div className="h-8 w-px bg-slate-300 dark:bg-white/20"></div>
                <div className="text-center">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">CPU</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{cpuDeck.length}</p>
                </div>
            </div>

            {/* Mesa */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-20 items-center justify-center w-full">
                {/* Player Card */}
                <div className="relative">
                    <p className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-slate-400">Sua Carta</p>
                    {renderCard(playerCard, false, roundWinner === 'player')}
                </div>

                {/* VS / Result */}
                <div className="flex flex-col items-center justify-center w-24">
                    {gameState === 'round_result' ? (
                        <div className={`text-4xl font-black uppercase tracking-tighter animate-bounce ${roundWinner === 'player' ? 'text-emerald-500' : roundWinner === 'cpu' ? 'text-red-500' : 'text-slate-400'}`}>
                            {roundWinner === 'player' ? 'Vitória!' : roundWinner === 'cpu' ? 'Derrota' : 'Empate'}
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-black text-slate-400 text-xl shadow-inner">VS</div>
                    )}
                </div>

                {/* CPU Card */}
                <div className="relative">
                    <p className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-slate-400">Oponente</p>
                    {renderCard(cpuCard, gameState === 'playing', roundWinner === 'cpu')}
                </div>
            </div>

            {gameState === 'playing' && (
                <p className="text-slate-500 font-bold text-sm animate-pulse">Escolha um atributo na sua carta para duelar.</p>
            )}
        </div>
      )}

      {gameState === 'end' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
           <div className="relative">
              <Trophy size={100} className={playerDeck.length > 0 ? "text-usp-gold animate-bounce" : "text-slate-300"} />
              <div className={`absolute -inset-4 ${playerDeck.length > 0 ? 'bg-usp-gold' : 'bg-slate-400'} blur-3xl opacity-20 -z-10`}></div>
           </div>
           
           <div>
              <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                  {playerDeck.length > 0 ? 'Vitória Suprema!' : 'Derrota Acadêmica'}
              </h2>
              <p className="text-slate-400 font-black uppercase tracking-widest mt-2">
                  {playerDeck.length > 0 ? 'Você dominou a doutrina.' : 'A banca foi mais forte.'}
              </p>
           </div>

           <button 
             onClick={startGame}
             className="px-12 py-5 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-3"
           >
              <RefreshCw size={18} /> Jogar Novamente
           </button>
        </div>
      )}
    </div>
  );
};

export default Trunfo;
