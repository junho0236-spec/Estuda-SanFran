
import React, { useState, useEffect, useRef } from 'react';
import { Gavel, Clock, Coins, Plus, AlertCircle, TrendingUp, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Auction } from '../types';
import confetti from 'canvas-confetti';

interface LargoAuctionProps {
  userId: string;
  userName: string;
}

const LargoAuction: React.FC<LargoAuctionProps> = ({ userId, userName }) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'my_auctions' | 'history'>('live');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [startPrice, setStartPrice] = useState(100);
  const [duration, setDuration] = useState(60); // minutes

  // Timer Ref for local countdown update
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchData();
    fetchBalance();

    const channel = supabase
      .channel('auction_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, (payload) => {
          handleRealtimeUpdate(payload);
      })
      .subscribe();

    // Local countdown interval
    timerRef.current = setInterval(() => {
        setAuctions(prev => [...prev]); // Force re-render for timers
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('auctions')
      .select('*')
      .order('ends_at', { ascending: true }); // Ending soonest first
    if (data) setAuctions(data);
    setLoading(false);
  };

  const fetchBalance = async () => {
     try {
        // Mock calculation based on study sessions if wallet table not fully implemented in previous steps
        // Ideally fetch from 'user_wallet'. Here we fetch and calculate available.
        // Assuming wallet logic from ClassificadosPatio:
        const { data: wallet } = await supabase.from('user_wallet').select('spent_coins').eq('user_id', userId).single();
        const { data: sessions } = await supabase.from('study_sessions').select('duration').eq('user_id', userId);
        
        const totalSeconds = sessions?.reduce((acc, s) => acc + (Number(s.duration) || 0), 0) || 0;
        const earned = Math.floor((totalSeconds / 3600) * 10);
        const spent = wallet?.spent_coins || 0;
        setUserBalance(Math.max(0, earned - spent));
     } catch (e) {
        setUserBalance(0);
     }
  };

  const handleRealtimeUpdate = (payload: any) => {
      if (payload.eventType === 'INSERT') {
          setAuctions(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
          setAuctions(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
          // If I won (status changed to ended and I'm highest bidder), celebrate
          if (payload.new.status === 'ended' && payload.new.highest_bidder_id === userId && payload.old.status === 'active') {
              confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          }
      }
  };

  const createAuction = async () => {
    if (!newItemTitle.trim()) return;

    const endDate = new Date();
    endDate.setMinutes(endDate.getMinutes() + duration);

    try {
        const { error } = await supabase.from('auctions').insert({
            creator_id: userId,
            creator_name: userName,
            item_title: newItemTitle,
            item_description: newItemDesc,
            start_price: startPrice,
            current_price: startPrice,
            ends_at: endDate.toISOString(),
            status: 'active'
        });

        if (error) throw error;
        setShowCreateModal(false);
        setNewItemTitle('');
        setNewItemDesc('');
        alert("Leilão iniciado!");
    } catch (e) {
        alert("Erro ao criar leilão.");
    }
  };

  const placeBid = async (auction: Auction, amount: number) => {
      if (userBalance < amount) {
          alert("Saldo insuficiente.");
          return;
      }
      
      if (new Date(auction.ends_at) < new Date()) {
          alert("Leilão encerrado.");
          return;
      }

      // Optimistic update prevention
      if (amount <= auction.current_price) {
          alert("O lance deve ser maior que o preço atual.");
          return;
      }

      try {
          // 1. Update Wallet (Hold funds or just check? For simplicity, we just check here, but robust system would hold)
          // We will deduct only on win in a real system, but to prevent spam, let's assume we deduct and refund if outbid.
          // For this MVP, we just check balance and update auction.
          
          // 2. Insert Bid
          await supabase.from('auction_bids').insert({
              auction_id: auction.id,
              bidder_id: userId,
              bidder_name: userName,
              amount: amount
          });

          // 3. Update Auction
          // Anti-sniper: If < 30s left, add 30s
          const now = new Date();
          const endsAt = new Date(auction.ends_at);
          let newEndsAt = auction.ends_at;
          
          if ((endsAt.getTime() - now.getTime()) < 30000) {
              endsAt.setSeconds(endsAt.getSeconds() + 30);
              newEndsAt = endsAt.toISOString();
          }

          const { error } = await supabase.from('auctions').update({
              current_price: amount,
              highest_bidder_id: userId,
              highest_bidder_name: userName,
              ends_at: newEndsAt
          }).eq('id', auction.id);

          if (error) throw error;

      } catch (e) {
          console.error(e);
          alert("Falha ao dar lance. Tente novamente.");
      }
  };

  const getTimeLeft = (endsAt: string) => {
      const total = Date.parse(endsAt) - Date.now();
      if (total <= 0) return { total, str: "Encerrado", urgent: false };
      const seconds = Math.floor((total / 1000) % 60);
      const minutes = Math.floor((total / 1000 / 60) % 60);
      const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
      
      const str = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
      return { total, str, urgent: total < 60000 }; // Urgent if < 1 min
  };

  // Filter Logic
  const activeAuctions = auctions.filter(a => {
      const tl = getTimeLeft(a.ends_at);
      return tl.total > 0 && a.status === 'active';
  });
  
  const myAuctions = auctions.filter(a => a.creator_id === userId);
  const historyAuctions = auctions.filter(a => getTimeLeft(a.ends_at).total <= 0 || a.status === 'ended');

  const displayList = activeTab === 'live' ? activeAuctions : activeTab === 'my_auctions' ? myAuctions : historyAuctions;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 px-2 md:px-0 h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
           <div className="inline-flex items-center gap-2 bg-yellow-900/20 px-4 py-2 rounded-full border border-yellow-800 mb-4">
              <Gavel className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">Casa de Leilões</span>
           </div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">O Leilão do Largo</h2>
           <p className="text-slate-500 font-bold italic text-lg mt-2">Quem dá mais? Itens exclusivos por SanCoins.</p>
        </div>
        
        <div className="flex gap-4 items-center">
            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg border-2 border-yellow-500">
              <Coins className="w-5 h-5 text-yellow-400" fill="currentColor" />
              <div>
                 <p className="text-[8px] font-black uppercase tracking-widest opacity-80">Saldo Disponível</p>
                 <p className="text-xl font-black tabular-nums leading-none">{userBalance}</p>
              </div>
           </div>
           <button 
             onClick={() => setShowCreateModal(true)}
             className="h-full px-6 py-3 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2 hover:bg-red-700"
           >
              <Plus size={18} /> Criar Lote
           </button>
        </div>
      </header>

      {/* TABS */}
      <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
         <button onClick={() => setActiveTab('live')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-white dark:bg-red-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Pregão Ao Vivo</button>
         <button onClick={() => setActiveTab('my_auctions')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'my_auctions' ? 'bg-white dark:bg-red-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Meus Lotes</button>
         <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-red-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Histórico</button>
      </div>

      {/* AUCTION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
         {displayList.length === 0 && (
            <div className="col-span-full py-32 text-center border-4 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem] opacity-50">
               <Gavel size={64} className="mx-auto mb-4 text-slate-400" />
               <p className="text-xl font-black text-slate-500 uppercase">Sem leilões ativos</p>
               <p className="text-xs font-bold text-slate-400 mt-2">O martelo está em repouso.</p>
            </div>
         )}
         
         {displayList.map(auction => {
             const { str: timeStr, urgent, total: timeLeftMs } = getTimeLeft(auction.ends_at);
             const isWinning = auction.highest_bidder_id === userId;
             const isOwner = auction.creator_id === userId;
             const isEnded = timeLeftMs <= 0;

             return (
                <div key={auction.id} className={`relative bg-white dark:bg-sanfran-rubiDark/20 rounded-[2.5rem] p-6 border-2 flex flex-col justify-between transition-all hover:scale-[1.02] shadow-xl ${isWinning && !isEnded ? 'border-emerald-500 ring-2 ring-emerald-500/20' : urgent && !isEnded ? 'border-red-500 animate-pulse' : 'border-slate-200 dark:border-white/10'}`}>
                   
                   {/* Header Status */}
                   <div className="flex justify-between items-start mb-4">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${isEnded ? 'bg-slate-200 text-slate-500' : urgent ? 'bg-red-100 text-red-600 animate-bounce' : 'bg-emerald-100 text-emerald-600'}`}>
                         <Clock size={10} /> {timeStr}
                      </div>
                      {isWinning && !isEnded && (
                          <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">
                             Ganhando
                          </div>
                      )}
                      {!isWinning && auction.highest_bidder_id && !isEnded && !isOwner && (
                          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">
                             Superado
                          </div>
                      )}
                   </div>

                   {/* Item Details */}
                   <div className="mb-6">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight mb-2">{auction.item_title}</h3>
                      <p className="text-xs font-medium text-slate-500 line-clamp-2">{auction.item_description}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Lote de: {auction.creator_name}</p>
                   </div>

                   {/* Price Area */}
                   <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5 mb-4 text-center">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Lance Atual</p>
                      <div className="flex items-center justify-center gap-2 text-2xl font-black text-slate-900 dark:text-white">
                         <Coins size={20} className="text-yellow-500" fill="currentColor" /> {auction.current_price}
                      </div>
                      <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Líder: {auction.highest_bidder_name || 'Ninguém'}</p>
                   </div>

                   {/* Actions */}
                   {!isEnded && !isOwner ? (
                       <div className="grid grid-cols-3 gap-2">
                           {[10, 50, 100].map(inc => (
                               <button 
                                 key={inc}
                                 onClick={() => placeBid(auction, auction.current_price + inc)}
                                 className="py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs hover:scale-105 transition-transform"
                               >
                                  +{inc}
                               </button>
                           ))}
                       </div>
                   ) : isEnded ? (
                       <div className="w-full py-3 bg-slate-200 dark:bg-white/5 text-slate-500 rounded-xl font-black text-xs text-center uppercase tracking-widest">
                           {auction.highest_bidder_id ? `Vendido para ${auction.highest_bidder_name}` : 'Não vendido'}
                       </div>
                   ) : (
                       <div className="w-full py-3 bg-slate-100 dark:bg-white/10 text-slate-400 rounded-xl font-black text-xs text-center uppercase tracking-widest">
                           Seu Lote
                       </div>
                   )}
                </div>
             );
         })}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a0505] w-full max-w-md rounded-[2.5rem] p-8 border-4 border-slate-900 dark:border-sanfran-rubi/30 relative">
               <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500"><X size={24} /></button>
               
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                  <Gavel size={24} className="text-yellow-600" /> Criar Lote
               </h3>

               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Item</label>
                     <input value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="Ex: Vade Mecum 2023" className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-red-500" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição</label>
                     <input value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} placeholder="Estado de conservação, detalhes..." className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-red-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Lance Inicial</label>
                         <input type="number" value={startPrice} onChange={e => setStartPrice(Number(e.target.value))} className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-black text-center outline-none focus:border-red-500" />
                      </div>
                      <div>
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Duração</label>
                         <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full p-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-red-500">
                             <option value={15}>15 Minutos</option>
                             <option value={60}>1 Hora</option>
                             <option value={1440}>24 Horas</option>
                         </select>
                      </div>
                  </div>
                  <button onClick={createAuction} className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase text-sm shadow-lg mt-2 hover:bg-red-700 transition-colors">
                     Iniciar Pregão
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default LargoAuction;
