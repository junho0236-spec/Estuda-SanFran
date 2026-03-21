import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Lock, 
  Eye, 
  Smartphone, 
  Globe, 
  Shield, 
  User,
  ChevronRight,
  Save,
  Moon,
  Sun,
  Palette,
  Volume2,
  Database,
  Cloud
} from 'lucide-react';
import { motion } from 'motion/react';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('geral');

  const tabs = [
    { id: 'geral', label: 'Geral', icon: SettingsIcon },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'privacidade', label: 'Privacidade', icon: Shield },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'dispositivos', label: 'Dispositivos', icon: Smartphone },
  ];

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-sanfran-rubi/10 rounded-2xl text-sanfran-rubi">
            <SettingsIcon size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white font-serif tracking-tight">Configurações</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Gerencie suas preferências e conta.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Tabs */}
        <aside className="lg:col-span-3 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-sanfran-rubi text-white shadow-lg shadow-red-900/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {activeTab === tab.id && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-9">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm"
          >
            {activeTab === 'geral' && (
              <div className="space-y-8">
                <section>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Globe size={20} className="text-sanfran-rubi" /> Preferências de Idioma
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Idioma da Interface</label>
                      <select className="w-full bg-transparent font-bold text-slate-900 dark:text-white outline-none">
                        <option value="pt">Português (Brasil)</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                      </select>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Fuso Horário</label>
                      <select className="w-full bg-transparent font-bold text-slate-900 dark:text-white outline-none">
                        <option value="brt">Brasília (GMT-3)</option>
                        <option value="est">Eastern Time (GMT-5)</option>
                        <option value="utc">UTC</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Database size={20} className="text-sanfran-rubi" /> Armazenamento e Dados
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Sincronização em Nuvem</p>
                        <p className="text-xs text-slate-500">Mantenha seus dados salvos automaticamente.</p>
                      </div>
                      <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Limpar Cache Local</p>
                        <p className="text-xs text-slate-500">Libere espaço removendo arquivos temporários.</p>
                      </div>
                      <button className="px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-300 transition-colors">Limpar</button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'notificacoes' && (
              <div className="space-y-8">
                <section>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Bell size={20} className="text-sanfran-rubi" /> Alertas do Sistema
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Prazos Processuais', desc: 'Lembretes de prazos e audiências.' },
                      { label: 'Novas Mensagens', desc: 'Notificações de chats e fóruns.' },
                      { label: 'Atualizações de IA', desc: 'Quando seus resumos estiverem prontos.' },
                      { label: 'Conquistas', desc: 'Alertas de novos badges e níveis.' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                        <div className={`w-12 h-6 ${idx % 2 === 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/10'} rounded-full relative cursor-pointer transition-colors`}>
                          <div className={`absolute ${idx % 2 === 0 ? 'right-1' : 'left-1'} top-1 w-4 h-4 bg-white rounded-full`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'privacidade' && (
              <div className="space-y-8">
                <section>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Lock size={20} className="text-sanfran-rubi" /> Segurança da Conta
                  </h3>
                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <Lock size={18} className="text-slate-400" />
                        <span className="font-bold text-slate-900 dark:text-white">Alterar Senha</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <Shield size={18} className="text-slate-400" />
                        <span className="font-bold text-slate-900 dark:text-white">Autenticação em Duas Etapas</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Ativado</span>
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Eye size={20} className="text-sanfran-rubi" /> Visibilidade do Perfil
                  </h3>
                  <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                    <select className="w-full bg-transparent font-bold text-slate-900 dark:text-white outline-none">
                      <option value="public">Público (Todos podem ver)</option>
                      <option value="friends">Apenas Amigos</option>
                      <option value="private">Privado (Apenas eu)</option>
                    </select>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'aparencia' && (
              <div className="space-y-8">
                <section>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Palette size={20} className="text-sanfran-rubi" /> Personalização Visual
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {['Rubi', 'Safira', 'Esmeralda'].map((color, idx) => (
                      <button key={idx} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-sanfran-rubi transition-all">
                        <div className={`w-10 h-10 rounded-full ${idx === 0 ? 'bg-sanfran-rubi' : idx === 1 ? 'bg-blue-600' : 'bg-emerald-600 shadow-xl ring-2 ring-emerald-500/20'}`}></div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{color}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Volume2 size={20} className="text-sanfran-rubi" /> Efeitos Sonoros
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5">
                    <p className="font-bold text-slate-900 dark:text-white">Sons de Interface</p>
                    <div className="w-12 h-6 bg-slate-300 dark:bg-white/10 rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            <div className="mt-10 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
              <button className="flex items-center gap-2 bg-sanfran-rubi hover:bg-red-700 text-white font-black uppercase tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-red-900/20 transition-all active:scale-95">
                <Save size={18} /> Salvar Alterações
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
