
import React, { useState } from 'react';
import { User, Trash2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '../services/offlineService';

const Profile: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      // 1. Limpar Dexie (Banco Local)
      await db.delete();
      // Reabrir o banco para que o app continue funcionando
      await db.open();
      
      // 2. Limpar LocalStorage (Configurações)
      localStorage.clear();
      
      setIsSuccess(true);
      setTimeout(() => {
        window.location.reload(); // Recarregar para resetar o estado do React
      }, 2000);
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      alert("Houve um erro ao tentar limpar seus dados locais.");
    } finally {
      setIsClearing(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-start p-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="bg-slate-100 dark:bg-white/10 p-8 rounded-full mb-6 relative">
        <User className="w-16 h-16 text-slate-400" />
        <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white dark:border-sanfran-rubiBlack"></div>
      </div>
      
      <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
        Perfil do Estudante
      </h2>
      <p className="text-slate-500 font-bold mt-2 text-center">
        Gerencie sua conta e histórico acadêmico na SanFran Academy.
      </p>

      <div className="w-full mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card de Informações (Placeholder) */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Status da Conta</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500">Nível</span>
              <span className="text-xs font-black text-sanfran-rubi">Acadêmico XI de Agosto</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500">Sincronização</span>
              <span className="text-xs font-black text-emerald-500">Ativa</span>
            </div>
          </div>
        </div>

        {/* Card de Gerenciamento de Dados */}
        <div className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Privacidade e Dados</h3>
          
          {!showConfirm && !isSuccess ? (
            <button 
              onClick={() => setShowConfirm(true)}
              className="w-full flex items-center justify-center gap-3 py-4 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-100 dark:hover:bg-red-900/20 transition-all border border-red-100 dark:border-red-900/30"
            >
              <Trash2 size={16} />
              Limpar Todo o Histórico Local
            </button>
          ) : isSuccess ? (
            <div className="flex flex-col items-center justify-center py-4 text-emerald-500 animate-in zoom-in duration-300">
              <CheckCircle2 size={32} className="mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">Dados Limpos! Reiniciando...</span>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl">
                <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 leading-tight">
                  ATENÇÃO: Isso apagará permanentemente seu histórico de estudos, flashcards e tarefas salvos localmente neste dispositivo.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowConfirm(false)}
                  disabled={isClearing}
                  className="py-3 bg-slate-100 dark:bg-white/10 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleClearAllData}
                  disabled={isClearing}
                  className="py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                >
                  {isClearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/10 w-full">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
          Versão 1.0.0 - SanFran Academy Hub
        </p>
      </div>
    </div>
  );
};

export default Profile;
