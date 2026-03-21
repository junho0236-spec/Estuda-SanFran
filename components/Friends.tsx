
import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, UserCheck, UserX, Search, 
  MessageSquare, Loader2, User, Globe, Heart,
  Check, X, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { Friendship, UserProfile, View } from '../types';
import { toast } from 'sonner';

interface FriendsProps {
  userId: string;
  userName: string;
  onNavigate: (view: View) => void;
}

const Friends: React.FC<FriendsProps> = ({ userId, userName, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'community'>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [communityUsers, setCommunityUsers] = useState<any[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('user_persona')
        .select('*');
      
      if (usersError) throw usersError;

      // Fetch friendships
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (friendshipsError) throw friendshipsError;

      setFriendships(friendshipsData || []);
      
      const otherUsers = (usersData || []).filter(u => u.id !== userId);
      setCommunityUsers(otherUsers);

      // Filter friends
      const acceptedFriendIds = (friendshipsData || [])
        .filter(f => f.status === 'accepted')
        .map(f => f.user_id === userId ? f.friend_id : f.user_id);
      
      const friendsList = otherUsers.filter(u => acceptedFriendIds.includes(u.id));
      setFriends(friendsList);

    } catch (error) {
      console.error('Error fetching friends data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetUserId: string, targetUserName: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: userId,
          friend_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;

      // Create notification for the target user
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        message: `${userName} enviou uma solicitação de amizade.`,
        type: 'friend_request'
      });

      toast.success('Solicitação enviada!');
      fetchData();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Erro ao enviar solicitação');
    }
  };

  const handleFriendRequest = async (friendshipId: string, status: 'accepted' | 'declined', requesterId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;

      if (status === 'accepted') {
        // Notify the requester
        await supabase.from('notifications').insert({
          user_id: requesterId,
          message: `${userName} aceitou sua solicitação de amizade!`,
          type: 'friend_accepted'
        });
        toast.success('Amizade aceita!');
      } else {
        toast.info('Solicitação recusada');
      }

      fetchData();
    } catch (error) {
      console.error('Error handling friend request:', error);
      toast.error('Erro ao processar solicitação');
    }
  };

  const getFriendshipStatus = (targetUserId: string) => {
    const f = friendships.find(f => 
      (f.user_id === userId && f.friend_id === targetUserId) || 
      (f.user_id === targetUserId && f.friend_id === userId)
    );
    return f ? f.status : null;
  };

  const isRequester = (targetUserId: string) => {
    const f = friendships.find(f => f.user_id === userId && f.friend_id === targetUserId);
    return !!f;
  };

  const getFriendshipId = (targetUserId: string) => {
    const f = friendships.find(f => 
      (f.user_id === userId && f.friend_id === targetUserId) || 
      (f.user_id === targetUserId && f.friend_id === userId)
    );
    return f?.id;
  };

  const filteredUsers = (activeTab === 'friends' ? friends : communityUsers).filter(u => 
    (u.persona_data?.nome || 'Usuário').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl">
      
      {/* HEADER */}
      <div className="p-8 bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
              <Users className="text-blue-600" size={32} />
              Friends
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">
              Conecte-se com a comunidade SanFran
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-black/40 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
            <button 
              onClick={() => setActiveTab('friends')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-white dark:bg-white/10 text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Meus Amigos
            </button>
            <button 
              onClick={() => setActiveTab('community')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'community' ? 'bg-white dark:bg-white/10 text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Comunidade
            </button>
          </div>
        </div>

        <div className="mt-8 relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder={activeTab === 'friends' ? "Pesquisar amigos..." : "Pesquisar na comunidade..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-medium"
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <Loader2 className="animate-spin mb-4 text-blue-600" size={48} />
            <p className="text-sm font-black uppercase tracking-widest">Sincronizando rede...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
            <Globe size={64} className="mb-6 text-slate-300" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Ninguém por aqui ainda</h3>
            <p className="text-sm mt-2 max-w-xs">Explore a comunidade para encontrar seus colegas e expandir sua rede.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map(user => {
              const status = getFriendshipStatus(user.id);
              const isMeRequester = isRequester(user.id);
              const friendshipId = getFriendshipId(user.id);

              return (
                <motion.div
                  layout
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                    {status === 'accepted' && <UserCheck className="text-emerald-500" size={20} />}
                    {status === 'pending' && <Bell className="text-amber-500 animate-pulse" size={20} />}
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-black/40 p-1 mb-4 border-2 border-transparent group-hover:border-blue-500 transition-all duration-500">
                      <div className="w-full h-full rounded-full overflow-hidden bg-slate-200 dark:bg-white/5 flex items-center justify-center">
                        {user.persona_data?.avatar_url ? (
                          <img src={user.persona_data.avatar_url} alt={user.persona_data.nome} className="w-full h-full object-cover" />
                        ) : (
                          <User className="text-slate-400" size={40} />
                        )}
                      </div>
                    </div>

                    <h4 className="font-black text-slate-900 dark:text-white text-lg truncate w-full px-2">
                      {user.persona_data?.nome || 'Usuário'}
                    </h4>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
                      {user.persona_data?.curso || 'Direito'}
                    </p>
                    
                    <div className="mt-6 flex flex-col gap-2 w-full">
                      {status === 'accepted' ? (
                        <button 
                          onClick={() => onNavigate(View.Connect)}
                          className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <MessageSquare size={14} />
                          Conversar
                        </button>
                      ) : status === 'pending' ? (
                        isMeRequester ? (
                          <button disabled className="w-full py-3 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">
                            Pendente
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => friendshipId && handleFriendRequest(friendshipId, 'accepted', user.id)}
                              className="py-3 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all"
                            >
                              Aceitar
                            </button>
                            <button 
                              onClick={() => friendshipId && handleFriendRequest(friendshipId, 'declined', user.id)}
                              className="py-3 bg-red-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 transition-all"
                            >
                              Recusar
                            </button>
                          </div>
                        )
                      ) : (
                        <button 
                          onClick={() => sendFriendRequest(user.id, user.persona_data?.nome || 'Usuário')}
                          className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <UserPlus size={14} />
                          Adicionar
                        </button>
                      )}
                      
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="w-full py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                      >
                        Ver Perfil
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROFILE MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
            >
              <div className="relative h-40 bg-gradient-to-r from-blue-600 to-indigo-700">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="px-10 pb-10 -mt-16 relative">
                <div className="w-32 h-32 rounded-[2.5rem] bg-white dark:bg-[#1a1a1a] p-1.5 shadow-xl mb-6">
                  <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-slate-200 dark:bg-white/5 flex items-center justify-center">
                    {selectedUser.persona_data?.avatar_url ? (
                      <img src={selectedUser.persona_data.avatar_url} alt={selectedUser.persona_data.nome} className="w-full h-full object-cover" />
                    ) : (
                      <User className="text-slate-400" size={48} />
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                      {selectedUser.persona_data?.nome || 'Usuário'}
                    </h3>
                    <p className="text-blue-600 font-black uppercase tracking-widest text-xs mt-1">
                      {selectedUser.persona_data?.curso || 'Direito'} • Turma {selectedUser.persona_data?.turma || '2024'}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    {getFriendshipStatus(selectedUser.id) === 'accepted' ? (
                      <button 
                        onClick={() => { setSelectedUser(null); onNavigate(View.Connect); }}
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <MessageSquare size={16} />
                        Enviar Mensagem
                      </button>
                    ) : getFriendshipStatus(selectedUser.id) === 'pending' ? (
                      <button disabled className="px-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed">
                        Solicitação Pendente
                      </button>
                    ) : (
                      <button 
                        onClick={() => sendFriendRequest(selectedUser.id, selectedUser.persona_data?.nome || 'Usuário')}
                        className="px-8 py-4 bg-slate-900 dark:text-black dark:bg-white text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <UserPlus size={16} />
                        Adicionar Amigo
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sobre</h5>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {selectedUser.persona_data?.bio || 'Nenhuma biografia disponível.'}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Interesses</h5>
                      <div className="flex flex-wrap gap-2">
                        {(selectedUser.persona_data?.interesses || ['Direito Civil', 'Processo Penal', 'Filosofia']).map((tag: string) => (
                          <span key={tag} className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-black/20 rounded-3xl p-6 border border-slate-100 dark:border-white/5">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Estatísticas Acadêmicas</h5>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Flashcards Estudados</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">1.240</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Horas de Foco</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">342h</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Duelos Ganhos</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">15</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Friends;
