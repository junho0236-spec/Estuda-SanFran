import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Plus, Trash2, User, X } from 'lucide-react';
import { ChatRoom, ChatParticipant } from '../../types';

interface GroupInfoModalProps {
  show: boolean;
  onClose: () => void;
  activeRoom: ChatRoom | null;
  userId: string;
  participants: Record<string, ChatParticipant[]>;
  editingGroupName: string;
  setEditingGroupName: (name: string) => void;
  editingGroupAvatar: string;
  setEditingGroupAvatar: (avatar: string) => void;
  updateGroupInfo: () => void;
  removeParticipant: (participantId: string) => void;
  allUsers: any[];
  addParticipant: (user: any) => void;
  leaveGroup: () => void;
  deleteGroup: () => void;
  onNavigate?: (view: any, params?: any) => void;
}

const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  show, onClose, activeRoom, userId, participants, editingGroupName,
  setEditingGroupName, editingGroupAvatar, setEditingGroupAvatar,
  updateGroupInfo, removeParticipant, allUsers, addParticipant, leaveGroup, deleteGroup, onNavigate
}) => {
  return (
    <AnimatePresence>
      {show && activeRoom && (
        <motion.div 
          key="group-info-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Info do Grupo</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* EDIT GROUP INFO (IF CREATOR) */}
              {activeRoom.created_by === userId ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Nome do Grupo</label>
                    <input 
                      type="text"
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">URL do Avatar</label>
                    <input 
                      type="text"
                      value={editingGroupAvatar}
                      onChange={(e) => setEditingGroupAvatar(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button 
                    onClick={updateGroupInfo}
                    className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    Salvar Alterações
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shadow-xl">
                    {activeRoom.avatar_url ? (
                      <img src={activeRoom.avatar_url} alt={activeRoom.name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="text-slate-400" />
                    )}
                  </div>
                  <h4 className="font-black text-xl uppercase tracking-tight">{activeRoom.name || 'Grupo'}</h4>
                </div>
              )}

              {/* PARTICIPANTS LIST */}
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Participantes ({participants[activeRoom.id]?.length || 0})</h5>
                <div className="space-y-3">
                  {participants[activeRoom.id]?.map(p => (
                    <div key={p.user_id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden cursor-pointer"
                          onClick={() => {
                            if (onNavigate && p.user_id !== userId) {
                              onClose();
                              onNavigate('profile', { userId: p.user_id });
                            }
                          }}
                        >
                          {p.user_avatar ? (
                            <img src={p.user_avatar} alt={p.user_name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} className="text-slate-400" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.user_name} {p.user_id === userId && '(Você)'}</span>
                      </div>
                      {activeRoom.created_by === userId && p.user_id !== userId && (
                        <button 
                          onClick={() => removeParticipant(p.user_id)}
                          className="p-1.5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ADD PARTICIPANT (IF CREATOR) */}
              {activeRoom.created_by === userId && (
                <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Adicionar Amigo</h5>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {allUsers
                      .filter((u) => !participants[activeRoom.id]?.some((p) => p.user_id === u.id))
                      .map((user) => (
                        <button
                          key={user.id}
                          onClick={() => addParticipant(user)}
                          className="w-full p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                              {user.persona_data?.avatar_url ? (
                                <img src={user.persona_data.avatar_url} alt={user.persona_data.nome} className="w-full h-full object-cover" />
                              ) : (
                                <User size={12} className="text-slate-400" />
                              )}
                            </div>
                            <span className="text-xs font-bold">{user.persona_data?.nome || 'Usuário'}</span>
                          </div>
                          <Plus size={14} className="text-blue-500" />
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              <div className="pt-6 border-t border-slate-200 dark:border-white/5 space-y-3">
                <button
                  onClick={leaveGroup}
                  className="w-full py-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={14} />
                  Sair do Grupo
                </button>
                {activeRoom.created_by === userId && (
                  <button
                    onClick={deleteGroup}
                    className="w-full py-3 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                    Excluir Grupo
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GroupInfoModal;
