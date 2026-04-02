import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Plus, Trash2, User, X, Shield, UserMinus, Check, Ban } from 'lucide-react';
import { ChatRoom, ChatParticipant } from '../../types';
import {
  parseModerationSettings,
  canEditGroupInfo,
  canRemoveParticipant,
  canAddGroupMember,
  canDeleteGroup,
  canModerateJoinRequests,
  canChangeGroupRoles,
  roleLabel,
  type GroupModerationSettings,
  isGroupOwner,
} from './groupModerationUtils';

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
  onApproveJoin: (targetUserId: string) => void;
  onRejectJoin: (targetUserId: string) => void;
  onSetParticipantRole: (targetUserId: string, role: 'member' | 'co_admin') => void;
  onPatchModeration: (patch: Partial<GroupModerationSettings>) => void;
  onSetRequireJoinApproval: (value: boolean) => void;
}

const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  show,
  onClose,
  activeRoom,
  userId,
  participants,
  editingGroupName,
  setEditingGroupName,
  editingGroupAvatar,
  setEditingGroupAvatar,
  updateGroupInfo,
  removeParticipant,
  allUsers,
  addParticipant,
  leaveGroup,
  deleteGroup,
  onNavigate,
  onApproveJoin,
  onRejectJoin,
  onSetParticipantRole,
  onPatchModeration,
  onSetRequireJoinApproval,
}) => {
  const list = activeRoom ? participants[activeRoom.id] || [] : [];
  const settings = activeRoom ? parseModerationSettings(activeRoom) : null;
  const pendingMembers = useMemo(() => list.filter((p) => p.join_status === 'pending'), [list]);
  const activeMembers = useMemo(() => list.filter((p) => p.join_status !== 'pending'), [list]);

  const canEdit = activeRoom ? canEditGroupInfo(activeRoom, userId, participants) : false;
  const canAdd = activeRoom ? canAddGroupMember(activeRoom, userId, participants) : false;
  const canDel = activeRoom ? canDeleteGroup(activeRoom, userId, participants) : false;
  const canModJoin = activeRoom ? canModerateJoinRequests(activeRoom, userId, participants) : false;
  const canRoles = activeRoom ? canChangeGroupRoles(activeRoom, userId, participants) : false;
  const ownerId = activeRoom?.created_by || null;

  return (
    <AnimatePresence>
      {show && activeRoom && settings && (
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
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Info do Grupo
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {canEdit ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">
                      Nome do Grupo
                    </label>
                    <input
                      type="text"
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">
                      URL do Avatar
                    </label>
                    <input
                      type="text"
                      value={editingGroupAvatar}
                      onChange={(e) => setEditingGroupAvatar(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button
                    type="button"
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

              {isGroupOwner(activeRoom, userId, participants) && (
                <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/80 dark:bg-black/20">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <Shield size={14} />
                    Moderação
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(activeRoom.require_join_approval)}
                      onChange={(e) => onSetRequireJoinApproval(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Aprovar novos membros antes de entrarem no chat
                  </label>
                  <div className="grid gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.members_can_poll}
                        onChange={(e) => onPatchModeration({ members_can_poll: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      Membros podem criar enquetes
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.co_admins_can_add_member}
                        onChange={(e) => onPatchModeration({ co_admins_can_add_member: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      Co-admins podem adicionar membros
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.co_admins_can_remove_member}
                        onChange={(e) => onPatchModeration({ co_admins_can_remove_member: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      Co-admins podem remover membros
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.co_admins_can_edit_info}
                        onChange={(e) => onPatchModeration({ co_admins_can_edit_info: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      Co-admins podem editar nome/avatar do grupo
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.co_admins_can_moderate_joins}
                        onChange={(e) => onPatchModeration({ co_admins_can_moderate_joins: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      Co-admins podem aprovar/rejeitar entradas
                    </label>
                  </div>
                </div>
              )}

              {canModJoin && pendingMembers.length > 0 && (
                <div>
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
                    Pedidos pendentes ({pendingMembers.length})
                  </h5>
                  <div className="space-y-2">
                    {pendingMembers.map((p) => (
                      <div
                        key={p.user_id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20"
                      >
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{p.user_name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onApproveJoin(p.user_id)}
                            className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
                            title="Aprovar"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectJoin(p.user_id)}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-red-100 dark:hover:bg-red-500/20"
                            title="Rejeitar"
                          >
                            <Ban size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                  Participantes ({activeMembers.length})
                </h5>
                <div className="space-y-3">
                  {activeMembers.map((p) => {
                    const gRole = (p.group_role as string) || 'member';
                    const isTargetOwner = ownerId ? p.user_id === ownerId : gRole === 'admin';
                    return (
                      <div key={p.user_id} className="flex items-center justify-between group gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
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
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                              {p.user_name} {p.user_id === userId && '(Você)'}
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              {isTargetOwner ? 'Dono' : roleLabel(gRole)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {canRoles && !isTargetOwner && p.user_id !== userId && (
                            <>
                              {gRole === 'member' && (
                                <button
                                  type="button"
                                  onClick={() => onSetParticipantRole(p.user_id, 'co_admin')}
                                  className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                                >
                                  Co-admin
                                </button>
                              )}
                              {gRole === 'co_admin' && (
                                <button
                                  type="button"
                                  onClick={() => onSetParticipantRole(p.user_id, 'member')}
                                  className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                                >
                                  Membro
                                </button>
                              )}
                            </>
                          )}
                          {canRemoveParticipant(activeRoom, userId, p, participants) && (
                            <button
                              type="button"
                              onClick={() => removeParticipant(p.user_id)}
                              className="p-1.5 text-red-500 opacity-80 hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                              title="Remover"
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {canAdd && (
                <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Adicionar pessoa</h5>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {allUsers
                      .filter((u) => !list.some((p) => p.user_id === u.id))
                      .map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => addParticipant(user)}
                          className="w-full p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                              {user.persona_data?.avatar_url ? (
                                <img
                                  src={user.persona_data.avatar_url}
                                  alt={user.persona_data.nome}
                                  className="w-full h-full object-cover"
                                />
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

              <div className="pt-6 border-t border-slate-200 dark:border-white/5 space-y-3">
                <button
                  type="button"
                  onClick={leaveGroup}
                  className="w-full py-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={14} />
                  Sair do Grupo
                </button>
                {canDel && (
                  <button
                    type="button"
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
