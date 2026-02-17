
import React, { useState } from 'react';
import { BookOpen, ShieldCheck, ArrowRight, Mail, Lock, Gavel, User, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AuthProps {
  onLogin: () => void;
}

const Login: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (error) throw error;
        alert("Matrícula realizada! Verifique seu e-mail para confirmação.");
        setIsLoginMode(true);
      }
    } catch (err: any) {
      setError(err.message || "Erro no protocolo de acesso.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#fcfcfc] dark:bg-sanfran-rubiBlack transition-colors duration-500 overflow-hidden relative">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-sanfran-rubi opacity-[0.03] rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-usp-blue opacity-[0.03] rounded-full blur-3xl animate-pulse delay-700"></div>
      
      <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="bg-white dark:bg-sanfran-rubiDark/20 backdrop-blur-sm border-[6px] border-slate-200 dark:border-sanfran-rubi/30 p-10 md:p-14 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
          
          <button 
            onClick={() => { setIsLoginMode(!isLoginMode); setError(null); }}
            className="absolute top-8 right-8 text-[10px] font-black uppercase tracking-widest text-sanfran-rubi hover:underline flex items-center gap-1 transition-all"
          >
            {isLoginMode ? 'Matricular-se' : 'Fazer Login'}
          </button>

          <div className="flex flex-col items-center mb-10">
            <div className="bg-sanfran-rubi p-4 rounded-3xl shadow-2xl shadow-red-900/30 mb-6 scale-110">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-950 dark:text-white mb-2">SanFran Academy</h1>
            <div className="flex items-center gap-3">
              <span className="h-[1px] w-8 bg-sanfran-rubi"></span>
              <span className="text-xs font-black text-sanfran-rubi uppercase tracking-[0.3em]">
                {isLoginMode ? 'Acesso SanFran' : 'Matrícula SanFran'}
              </span>
              <span className="h-[1px] w-8 bg-sanfran-rubi"></span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 rounded-r-xl flex items-center gap-3 animate-in shake duration-300">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLoginMode && (
              <div className="space-y-2 animate-in slide-in-from-left-4 duration-300">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2">Nome Completo</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600 group-focus-within:text-sanfran-rubi transition-colors" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome acadêmico" 
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-sanfran-rubi/20 rounded-2xl outline-none focus:border-sanfran-rubi focus:ring-4 focus:ring-sanfran-rubi/10 transition-all font-bold text-slate-950 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2">Correio Eletrônico</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600 group-focus-within:text-sanfran-rubi transition-colors" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doutor@sanfran.usp.br" 
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-sanfran-rubi/20 rounded-2xl outline-none focus:border-sanfran-rubi focus:ring-4 focus:ring-sanfran-rubi/10 transition-all font-bold text-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2">Senha de Acesso</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600 group-focus-within:text-sanfran-rubi transition-colors" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-sanfran-rubi/20 rounded-2xl outline-none focus:border-sanfran-rubi focus:ring-4 focus:ring-sanfran-rubi/10 transition-all font-bold text-slate-950 dark:text-white"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-sanfran-rubi text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-sanfran-rubiDark hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-8"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLoginMode ? 'Protocolar Ingresso' : 'Finalizar Matrícula'} 
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 flex flex-col items-center gap-4">
            <button 
              onClick={() => { setIsLoginMode(!isLoginMode); setError(null); }}
              className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-sanfran-rubi transition-colors"
            >
              {isLoginMode ? 'Ainda não tem conta? Clique aqui' : 'Já possui matrícula? Voltar ao login'}
            </button>
            <p className="text-slate-500 dark:text-slate-600 font-bold italic text-sm">"Scientia Vinces"</p>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
           <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
             <Gavel className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Justiça</span>
           </div>
           <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
             <ShieldCheck className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Direito</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
