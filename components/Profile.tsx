
import React, { useState, useEffect } from 'react';
import { 
  User, Award, Shield, Settings, Trash2, Camera, Edit3, 
  ExternalLink, Eye, EyeOff, Zap, CheckCircle2, Loader2, 
  AlertTriangle, Github, Linkedin, Twitter, Globe, Save,
  GraduationCap, BookOpen, Trophy, Star, ShieldCheck,
  History, UserCheck, ToggleLeft, ToggleRight, Share2, X, Users,
  MapPin, Calendar, Languages, Plane, FileText, Image as ImageIcon, Heart, Briefcase, GraduationCap as GradIcon, Search, RefreshCw, Plus, Clock, Instagram
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { dataService } from '../services/dataService';
import { geminiService } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { DISCIPLINAS_LIST_COLUMNS } from '../utils/supabaseSelectColumns';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db } from '../services/offlineService';
import { UserProfile } from '../types';

import { toast } from 'sonner';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedFoto, setSelectedFoto] = useState<{ url: string; caption?: string; date?: string } | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [editForm, setEditForm] = useState<UserProfile>({
    id: '',
    full_name: '',
    bio: '',
    turma_ano: 0,
    turma: 0,
    sala: '',
    aniversario: '',
    avatar_url: '',
    social_links: {} as Record<string, string>,
    idiomas: [] as string[],
    intercambio: '',
    memorias: '',
    progresso_total: 0,
    curriculo_url: '',
    mural_fotos: [] as { url: string; caption?: string; date?: string }[],
    cargos_academicos: {
      monitoria: [] as string[],
      pesquisa: [] as string[],
      pites: [] as string[],
      diretoria: [] as string[],
      coordenacao: [] as string[]
    },
    creditos_aula: 0,
    creditos_trabalho: 0,
    media: 0,
    horas_extensao: 0,
    progresso_obrigatorias: 0,
    progresso_optativas: 0,
    entidades: [] as string[],
    archetype: '',
    answers: {},
    scores: {
      social: 0,
      corporativo: 0,
      academico: 0,
      politico: 0,
      resiliencia: 0,
      tecnologico: 0
    },
    matrix: {
      academicoVsPratico: 0,
      extensaoVsCarreira: 0,
      socialVsReservado: 0,
      urgenciaVsPlanejamento: 0
    },
    tags: [],
    answeredQuestionIds: [],
    persona_mode: false,
    onboarding_completed: false,
    visibility: 'public',
    viewPreferences: {},
    arcadia_score: 0,
    status_geral_integralizacao: 0,
    experiencias_lideranca: [],
    integralizacao_curriculo: {},
    badges: [],
    skills: [],
    interests: [],
    academic_background: [],
    visible_modules: ['jornada', 'grade', 'evolucao', 'mural', 'lideranca', 'conexoes']
  });

  const [activeTab, setActiveTab] = useState<'perfil' | 'academico' | 'mural' | 'config'>('perfil');

  const [session, setSession] = useState<any>(null);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const userProfile = await dataService.getUserProfile(session.user.id, navigator.onLine);
        setProfile(userProfile);
        
        // Fetch disciplines
        const { data: discData } = await supabase
          .from('disciplinas')
          .select(DISCIPLINAS_LIST_COLUMNS)
          .eq('user_id', session.user.id);
        if (discData) setDisciplinas(discData);

        setEditForm({
          ...userProfile,
          full_name: userProfile?.full_name || session.user.user_metadata?.full_name || '',
          bio: userProfile?.bio || '',
          turma_ano: userProfile?.turma_ano || 0,
          turma: userProfile?.turma || 0,
          sala: userProfile?.sala || '',
          aniversario: userProfile?.aniversario || '',
          avatar_url: userProfile?.avatar_url || '',
          social_links: userProfile?.social_links || {},
          idiomas: userProfile?.idiomas || [],
          intercambio: userProfile?.intercambio || '',
          memorias: userProfile?.memorias || '',
          progresso_total: userProfile?.progresso_total || 0,
          progresso_obrigatorias: userProfile?.progresso_obrigatorias || 0,
          progresso_optativas: userProfile?.progresso_optativas || 0,
          status_geral_integralizacao: userProfile?.status_geral_integralizacao || 0,
          creditos_aula: userProfile?.creditos_aula || 0,
          creditos_trabalho: userProfile?.creditos_trabalho || 0,
          media: userProfile?.media || 0,
          horas_extensao: userProfile?.horas_extensao || 0,
          entidades: userProfile?.entidades || [],
          curriculo_url: userProfile?.curriculo_url || '',
          mural_fotos: userProfile?.mural_fotos || [],
          cargos_academicos: userProfile?.cargos_academicos || {
            monitoria: [],
            pesquisa: [],
            pites: [],
            diretoria: [],
            coordenacao: []
          },
          skills: userProfile?.skills || [],
          interests: userProfile?.interests || [],
          archetype: userProfile?.archetype || 'Novato',
          academic_background: userProfile?.academic_background || [],
          visible_modules: userProfile?.visible_modules || ['jornada', 'grade', 'evolucao', 'mural', 'lideranca', 'conexoes']
        });
    }
    setLoading(false);
  } catch (err) {
    console.warn("Failed to fetch profile/session:", err);
    setLoading(false);
  }
};

  const handleSaveProfile = async () => {
    if (!session?.user || !profile || !editForm) return;
    setLoading(true);
    try {
      await dataService.saveUserProfile(editForm, session.user.id, navigator.onLine);
      setProfile(editForm);
      setIsEditing(false);
      toast.success("Perfil atualizado com sucesso!");
    } catch (err) {
      console.error("[Profile] Error saving profile:", err);
      toast.error("Erro ao salvar alterações.");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePersona = async () => {
    if (!session?.user || !profile) return;
    const updatedProfile = {
      ...profile,
      persona_mode: !profile.persona_mode
    };
    await dataService.saveUserProfile(updatedProfile, session.user.id, navigator.onLine);
    setProfile(updatedProfile);
  };

  const handleResetProfile = async () => {
    if (!session?.user || !profile) return;
    if (!confirm("Tem certeza que deseja resetar seu perfil? Isso apagará suas informações de persona e progresso acadêmico.")) return;
    
    setLoading(true);
    try {
      const defaultProfile: UserProfile = {
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || '',
        bio: '',
        turma_ano: 0,
        turma: 0,
        sala: '',
        aniversario: '',
        avatar_url: '',
        social_links: {},
        idiomas: [],
        intercambio: '',
        memorias: '',
        progresso_total: 0,
        progresso_obrigatorias: 0,
        progresso_optativas: 0,
        status_geral_integralizacao: 0,
        creditos_aula: 0,
        creditos_trabalho: 0,
        media: 0,
        horas_extensao: 0,
        entidades: [],
        curriculo_url: '',
        mural_fotos: [],
        cargos_academicos: {
          monitoria: [],
          pesquisa: [],
          pites: [],
          diretoria: [],
          coordenacao: []
        },
        persona_mode: true,
        onboarding_completed: false,
        visibility: 'private',
        archetype: '',
        answers: {},
        scores: {
          social: 0,
          corporativo: 0,
          academico: 0,
          politico: 0,
          resiliencia: 0,
          tecnologico: 0
        },
        matrix: {
          academicoVsPratico: 0,
          extensaoVsCarreira: 0,
          socialVsReservado: 0,
          urgenciaVsPlanejamento: 0
        },
        tags: [],
        answeredQuestionIds: [],
        viewPreferences: {},
        arcadia_score: 0,
        experiencias_lideranca: [],
        integralizacao_curriculo: {},
        badges: [],
        skills: [],
        interests: [],
        academic_background: [],
        visible_modules: ['jornada', 'grade', 'evolucao', 'mural', 'lideranca', 'conexoes']
      };
      
      await dataService.saveUserProfile(defaultProfile, session.user.id, navigator.onLine);
      setProfile(defaultProfile);
      setEditForm(defaultProfile);
      toast.success("Perfil resetado com sucesso!");
    } catch (err) {
      console.error("[Profile] Error resetting profile:", err);
      toast.error("Erro ao resetar perfil.");
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (moduleId: string) => {
    if (!profile || !session?.user) return;
    const currentModules = profile.visible_modules || [];
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter(m => m !== moduleId)
      : [...currentModules, moduleId];
    
    const updatedProfile = { ...profile, visible_modules: newModules };
    setProfile(updatedProfile);
    setEditForm(updatedProfile);
    await dataService.saveUserProfile(updatedProfile, session.user.id, navigator.onLine);
  };

  const handleVisibilityChange = async (visibility: 'public' | 'friends' | 'private') => {
    if (!session?.user || !profile) return;
    const updatedProfile = {
      ...profile,
      visibility
    };
    await dataService.saveUserProfile(updatedProfile, session.user.id, navigator.onLine);
    setProfile(updatedProfile);
  };

  const handleClearAllData = async () => {
    if (!session?.user) return;
    setIsClearing(true);
    try {
      // 1. Limpar Dexie (Banco Local)
      await db.delete();
      await db.open();
      
      // 2. Limpar Nuvem (Supabase)
      await dataService.clearCloudHistory(session.user.id);
      
      // 3. Limpar LocalStorage
      localStorage.clear();
      
      setIsSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      alert("Houve um erro ao tentar limpar seus dados.");
    } finally {
      setIsClearing(false);
      setShowConfirmClear(false);
    }
  };

  const handleJupiterSync = async (file: File) => {
    if (!session?.user || !profile) return;
    setIsSyncing(true);
    setShowManualInput(false);
    setSyncStatus('Enviando para análise...');
    try {
      // 1. Upload to Supabase Storage
      const path = `${session.user.id}/jupiter_${Date.now()}_${file.name}`;
      await dataService.uploadFile(file, path, 'curriculos', file.type);

      // 2. Convert to base64 for Gemini
      const reader = new FileReader();
      const base64PDF = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setSyncStatus('Mapeando matérias das Arcadas...');
      const data = await geminiService.analyzeJupiterPDF(base64PDF);
      
      if (data) {
        await updateProfileWithJupiterData(data);
      }
    } catch (error) {
      console.error("Erro na sincronização Júpiter:", error);
      alert(`Erro ao analisar PDF do Júpiter: ${error instanceof Error ? error.message : String(error)}`);
      setIsSyncing(false);
      setSyncStatus('');
      setShowManualInput(true);
    }
  };

  const handleManualJupiterSync = async (text: string) => {
    if (!session?.user || !profile) return;
    setIsSyncing(true);
    setShowManualInput(false);
    setSyncStatus('Analisando texto...');
    try {
      const data = await geminiService.analyzeJupiterText(text);
      if (data) {
        await updateProfileWithJupiterData(data);
      }
    } catch (error) {
      console.error("Erro na sincronização manual Júpiter:", error);
      alert(`Erro ao analisar texto do Júpiter: ${error instanceof Error ? error.message : String(error)}`);
      setIsSyncing(false);
      setSyncStatus('');
    }
  };

  const updateProfileWithJupiterData = async (data: any) => {
    setSyncStatus('Salvando dados...');
    const updatedProfile = {
      ...profile,
      full_name: data.full_name || profile?.full_name || "Edvando Santos Alves Junior",
      turma: data.turma || profile?.turma || 2025,
      progresso_obrigatorias: data.progresso_obrigatorias || profile?.progresso_obrigatorias,
      progresso_optativas: data.progresso_optativas || profile?.progresso_optativas,
      progresso_total: data.progresso_total || profile?.progresso_total,
      status_geral_integralizacao: data.status_geral_integralizacao || profile?.status_geral_integralizacao,
      aniversario: data.aniversario || profile?.aniversario,
      creditos_aula: data.creditos_aula || profile?.creditos_aula || 52,
      creditos_trabalho: data.creditos_trabalho || profile?.creditos_trabalho || 2,
      media: data.media || profile?.media || 8.7,
      horas_extensao: data.horas_extensao || profile?.horas_extensao || 390,
      entidades: data.entidades || profile?.entidades || ["Departamento Jurídico XI de Agosto", "SanFran Jr."],
      idiomas: data.idiomas || profile?.idiomas || [],
    };
    
    await dataService.saveUserProfile(updatedProfile, session.user.id, navigator.onLine);
    
    if (Array.isArray(data.disciplinas) && data.disciplinas.length > 0) {
      try {
        await dataService.saveDisciplinas(data.disciplinas, session.user.id);
      } catch (err) {
        console.warn("Erro ao salvar disciplinas (tabela pode não existir):", err);
      }
    }
    
    await fetchProfile();
    
    setSyncStatus('Perfil Sincronizado!');
    setIsSyncing(false);
  };

  if (loading && !profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sanfran-rubi animate-spin" />
      </div>
    );
  }

  const experience = profile?.productivityStats?.completedToday || 0;
  const level = Math.floor(experience / 10) + 1;
  const progress = (experience % 10) * 10;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-sanfran-rubiBlack/20">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* 👤 1. HEADER DE IDENTIDADE (A "CARTEIRINHA") */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white dark:bg-white/5 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden"
        >
          {/* Cover/Background Pattern */}
          <div className="h-40 bg-sanfran-rubi/5 dark:bg-sanfran-rubi/10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#8B1A1A 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          </div>
          
          <div className="px-10 pb-10 -mt-16 flex flex-col md:flex-row items-center md:items-end gap-8 relative z-10">
            {/* Avatar with Status */}
            <div className="relative group">
              <div className="w-40 h-40 rounded-full border-8 border-white dark:border-sanfran-rubiBlack bg-sanfran-offwhite dark:bg-white/5 overflow-hidden shadow-2xl relative">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sanfran-rubi/20">
                    <User size={64} />
                  </div>
                )}
                {/* Status Ring */}
                <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full"></div>
              </div>
              <div className={`absolute bottom-4 right-4 w-6 h-6 rounded-full border-4 border-white dark:border-sanfran-rubiBlack ${navigator.onLine ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
              >
                <Camera size={24} />
              </button>
            </div>

            {/* Identity Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="space-y-1">
                <h1 className="text-4xl font-serif font-bold text-sanfran-rubi dark:text-white tracking-tight">
                  {typeof profile?.full_name === 'string' ? profile.full_name : (profile?.full_name ? JSON.stringify(profile.full_name) : (session?.user?.user_metadata?.full_name || 'Estudante SanFran'))}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <span className="px-4 py-1.5 bg-sanfran-rubi text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-900/20">
                    Turma {typeof profile?.turma === 'number' || typeof profile?.turma === 'string' ? profile.turma : (typeof profile?.turma_ano === 'number' || typeof profile?.turma_ano === 'string' ? profile.turma_ano : '---')}
                  </span>
                  {profile?.sala && (
                    <span className="px-4 py-1.5 bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 shadow-sm">
                      Sala {typeof profile.sala === 'string' ? profile.sala : JSON.stringify(profile.sala)}
                    </span>
                  )}
                  <span className="px-4 py-1.5 bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 shadow-sm">
                    {typeof profile?.archetype === 'string' ? profile.archetype : (profile?.archetype ? JSON.stringify(profile.archetype) : 'Novato')}
                  </span>
                  {profile?.cargos_academicos?.diretoria?.[0] && (
                    <span className="px-4 py-1.5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-900/20">
                      {typeof profile.cargos_academicos.diretoria[0] === 'string' ? profile.cargos_academicos.diretoria[0] : JSON.stringify(profile.cargos_academicos.diretoria[0])}
                    </span>
                  )}
                </div>
              </div>
              <div className="relative group max-w-2xl">
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic">
                  "{typeof profile?.bio === 'string' ? profile.bio : (profile?.bio ? JSON.stringify(profile.bio) : 'Nenhuma biografia definida. Clique em editar para adicionar.')}"
                </p>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="absolute -right-8 top-0 p-1 text-slate-300 hover:text-sanfran-rubi transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button 
                onClick={() => setIsEditing(true)}
                className="p-4 bg-white dark:bg-white/10 text-slate-600 dark:text-white rounded-3xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/20 transition-all shadow-sm"
              >
                <Edit3 size={20} />
              </button>
              
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".pdf"
                  className="hidden"
                  id="jupiter-sync-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleJupiterSync(file);
                  }}
                />
                <label 
                  htmlFor="jupiter-sync-upload"
                  className={`p-4 bg-sanfran-rubi text-white rounded-[2rem] shadow-xl shadow-red-900/20 hover:scale-[1.02] transition-all flex items-center gap-3 cursor-pointer border border-white/10 ${isSyncing ? 'opacity-80 pointer-events-none' : ''}`}
                >
                  <div className="p-2 bg-white/20 rounded-xl">
                    {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest">Sincronização</span>
                    <span className="text-[8px] text-white/70 font-bold uppercase tracking-tighter">
                      {syncStatus === 'Perfil Sincronizado!' ? 'Perfil Sincronizado!' : (isSyncing ? syncStatus : 'Via JúpiterWeb')}
                    </span>
                  </div>
                </label>
                {showManualInput && (
                  <div className="mt-4 p-4 bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm animate-in slide-in-from-top-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-3">Ou cole o texto manualmente:</p>
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      className="w-full p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300 mb-3"
                      rows={5}
                      placeholder="Cole aqui o texto copiado do Júpiter..."
                    />
                    <button
                      onClick={() => handleManualJupiterSync(manualText)}
                      className="w-full py-3 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all"
                    >
                      Analisar Texto
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={async () => {
                  if (!profile || !profile.turma || !profile.progresso_total) {
                    toast.info('Aguarde um instante enquanto processamos sua trajetória...');
                    return;
                  }
                  setIsAnalyzing(true);
                  try {
                    const analysis = await geminiService.analyzeProfile(profile);
                    setAiAnalysis(analysis || "Não foi possível gerar a análise.");
                    setShowAiModal(true);
                  } catch (error) {
                    console.error("Erro na análise IA:", error);
                    toast.error("Erro ao gerar análise do perfil.");
                  } finally {
                    setIsAnalyzing(false);
                  }
                }}
                disabled={isAnalyzing || isSyncing}
                className={`p-4 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-900/20 hover:scale-[1.05] transition-all flex items-center gap-3 ${(isAnalyzing || isSyncing) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="p-2 bg-white/20 rounded-xl">
                  {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest">Análise IA</span>
                  <span className="text-[8px] text-white/70 font-bold uppercase tracking-tighter">Insights Gemini</span>
                </div>
              </button>
            </div>
          </div>
        </motion.div>

        {/* 📑 TABS NAVIGATION */}
        <div className="flex items-center justify-center gap-2 p-1.5 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm sticky top-4 z-50 backdrop-blur-md">
          {[
            { id: 'perfil', label: 'Perfil', icon: <User size={16} />, alwaysVisible: true },
            { id: 'academico', label: 'Acadêmico', icon: <BookOpen size={16} /> },
            { id: 'mural', label: 'Mural', icon: <ImageIcon size={16} /> },
            { id: 'config', label: 'Ajustes', icon: <Settings size={16} />, alwaysVisible: true },
          ].filter(tab => tab.alwaysVisible || profile?.visible_modules?.includes(tab.id)).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-sanfran-rubi text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'perfil' && (
            <motion.div
              key="perfil"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white dark:bg-white/5 p-10 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
                    <h2 className="text-xl font-serif font-bold text-sanfran-rubi dark:text-white mb-6">Sobre Mim</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {profile?.bio || 'Nenhuma biografia definida.'}
                    </p>
                    
                    {profile?.visible_modules?.includes('skills') && (
                      <div className="mt-10 pt-10 border-t border-slate-100 dark:border-white/10">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Habilidades & Competências</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile?.skills?.length ? profile.skills.map(skill => (
                            <span key={skill} className="px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                              {skill}
                            </span>
                          )) : (
                            <p className="text-[10px] font-bold text-slate-400 italic">Nenhuma habilidade listada.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {profile?.visible_modules?.includes('interests') && (
                    <div className="bg-white dark:bg-white/5 p-10 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
                      <h2 className="text-xl font-serif font-bold text-sanfran-rubi dark:text-white mb-6">Interesses</h2>
                      <div className="flex flex-wrap gap-2">
                        {profile?.interests?.length ? profile.interests.map(interest => (
                          <span key={interest} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                            {interest}
                          </span>
                        )) : (
                          <p className="text-[10px] font-bold text-slate-400 italic">Nenhum interesse listado.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  {profile?.visible_modules?.includes('social') && (
                    <div className="bg-sanfran-rubi p-8 rounded-[3rem] shadow-xl shadow-red-900/20 text-white">
                      <h3 className="text-lg font-serif font-bold mb-6 text-center">Conexões</h3>
                      <div className="space-y-4">
                        {profile?.social_links?.linkedin && (
                          <a href={profile.social_links.linkedin} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all">
                            <div className="flex items-center gap-3">
                              <Linkedin size={18} />
                              <span className="text-[10px] font-black uppercase tracking-widest">LinkedIn</span>
                            </div>
                            <ExternalLink size={14} className="opacity-50" />
                          </a>
                        )}
                        {profile?.social_links?.instagram && (
                          <a href={profile.social_links.instagram} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all">
                            <div className="flex items-center gap-3">
                              <Instagram size={18} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Instagram</span>
                            </div>
                            <ExternalLink size={14} className="opacity-50" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {profile?.visible_modules?.includes('idiomas') && (
                    <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
                      <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white mb-6">Idiomas</h3>
                      <div className="space-y-4">
                        {profile?.idiomas?.length ? profile.idiomas.map(lang => (
                          <div key={lang} className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{lang}</span>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full bg-sanfran-rubi"></div>
                              <div className="w-2 h-2 rounded-full bg-sanfran-rubi"></div>
                              <div className="w-2 h-2 rounded-full bg-sanfran-rubi/30"></div>
                            </div>
                          </div>
                        )) : (
                          <p className="text-[10px] font-bold text-slate-400 italic">Nenhum idioma listado.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'academico' && (
            <motion.div
              key="academico"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* 📊 BENTO GRID DE MÉTRICAS ACADÊMICAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                      <Award size={18} />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Arcadia Score</h3>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-serif font-bold text-indigo-600 dark:text-indigo-400">{profile?.arcadia_score || 0}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pontos</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/20 text-teal-600 rounded-xl group-hover:scale-110 transition-transform">
                      <Users size={18} />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entidades</h3>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-serif font-bold text-teal-600 dark:text-teal-400">{profile?.entidades?.length || 0}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ativas</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/20 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
                      <Plane size={18} />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Intercâmbio</h3>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">
                      {profile?.intercambio && profile.intercambio !== 'Não realizado' ? 'Realizado' : 'Não Realizado'}
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl transition-all group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                      <GraduationCap size={18} />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jornada Acadêmica</h3>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-serif font-bold text-orange-600 dark:text-orange-400">{profile?.turma || '---'}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Turma</span>
                  </div>
                </div>
              </div>

              {/* 📊 EVOLUÇÃO NAS ARCADAS */}
              <div className="bg-white dark:bg-white/5 p-10 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-serif font-bold text-sanfran-rubi dark:text-white">Evolução nas Arcadas</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Integralização do Currículo • Graduação em Direito</p>
                  </div>
                  <div className="p-3 bg-sanfran-rubi/5 text-sanfran-rubi rounded-2xl">
                    <BookOpen size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                  {/* Circular Progress */}
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="transparent"
                          className="text-slate-100 dark:text-white/5"
                        />
                        <motion.circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={552.92}
                          initial={{ strokeDashoffset: 552.92 }}
                          animate={{ strokeDashoffset: 552.92 - (552.92 * (profile?.status_geral_integralizacao || 0)) / 100 }}
                          className="text-sanfran-rubi"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-serif font-bold text-sanfran-rubi">{profile?.status_geral_integralizacao || 0}%</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Concluído</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase text-center max-w-[150px]">Status Geral de Integralização</p>
                  </div>

                  {/* Linear Progress Bars */}
                  <div className="lg:col-span-2 space-y-8">
                    {[
                      { label: 'Disciplinas Obrigatórias', progress: profile?.progresso_obrigatorias || 0, color: 'bg-sanfran-rubi' },
                      { label: 'Disciplinas Optativas', progress: profile?.progresso_optativas || 0, color: 'bg-sanfran-rubi/60' },
                      { label: 'Atividades Complementares', progress: profile?.horas_extensao ? Math.min(100, (profile.horas_extensao / 200) * 100) : 0, color: 'bg-emerald-500' },
                    ].map((item) => (
                      <div key={item.label} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                          <span className="text-[10px] font-black text-sanfran-rubi">{item.progress}%</span>
                        </div>
                        <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-1 border border-slate-200 dark:border-white/10">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress}%` }}
                            className={`h-full ${item.color} rounded-full relative ${item.progress === 100 ? 'shadow-[0_0_15px_rgba(139,26,26,0.5)]' : ''}`}
                          >
                            {item.progress === 100 && (
                              <motion.div 
                                animate={{ opacity: [0.4, 0.8, 0.4] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-0 bg-white/20"
                              />
                            )}
                          </motion.div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 📅 GRADE HORÁRIA (Sincronizada Júpiter) */}
              {disciplinas.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-white/5 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                        <Calendar size={20} />
                      </div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Grade Horária Atual</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/20">
                        {disciplinas.length} Matérias Sincronizadas
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {disciplinas.map((disc, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{typeof disc.codigo === 'string' ? disc.codigo : JSON.stringify(disc.codigo)}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{typeof disc.turma_sala === 'string' ? disc.turma_sala : JSON.stringify(disc.turma_sala)}</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight mb-3 group-hover:text-emerald-600 transition-colors">{typeof disc.nome === 'string' ? disc.nome : JSON.stringify(disc.nome)}</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(disc.horarios || {}).map(([dia, hora]) => (
                            <div key={dia} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-white/10 rounded-lg border border-slate-200 dark:border-white/10">
                              <span className="text-[8px] font-black text-slate-400 uppercase">{dia.substring(0, 3)}</span>
                              <span className="text-[8px] font-bold text-slate-600 dark:text-slate-300">{typeof hora === 'string' ? hora : JSON.stringify(hora)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'mural' && (
            <motion.div
              key="mural"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* 🖼️ MURAL DE MEMÓRIAS */}
              <div className="bg-white dark:bg-white/5 p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-sanfran-rubi dark:text-white">Mural de Memórias</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Momentos Vividos no Largo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="p-3 bg-sanfran-rubi text-white rounded-2xl cursor-pointer hover:bg-sanfran-rubi/90 transition-all shadow-lg shadow-red-900/20">
                      <Plus size={24} />
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file && session?.user) {
                            try {
                              setLoading(true);
                              setSyncStatus('Otimizando foto...');
                              
                              const options = {
                                maxSizeMB: 0.8,
                                maxWidthOrHeight: 1200,
                                useWebWorker: true,
                                initialQuality: 0.8
                              };
                              const compressedFile = await imageCompression(file, options);
                              
                              setSyncStatus('Enviando...');
                              const path = `${session.user.id}/mural_${Date.now()}_${compressedFile.name}`;
                              const url = await dataService.uploadFile(compressedFile, path, 'mural_fotos', compressedFile.type);
                              const newFoto = { url, caption: '', date: new Date().toISOString() };
                              
                              const updatedFotos = await dataService.addMuralFoto(session.user.id, newFoto);
                              
                              const updatedProfile = {
                                ...profile,
                                mural_fotos: updatedFotos
                              };
                              setProfile(updatedProfile as UserProfile);
                            } catch (err) {
                              console.error("[Profile] Mural photo upload error:", err);
                              toast.error("Erro ao enviar foto. Verifique as permissões ou tente novamente.");
                            } finally {
                              setLoading(false);
                              setSyncStatus('');
                            }
                          }
                        }}
                      />
                    </label>
                    <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl">
                      <Heart size={24} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
                  {profile?.mural_fotos?.length ? profile.mural_fotos.map((foto, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.05, zIndex: 10, rotate: 0 }}
                      initial={{ rotate: (idx % 2 === 0 ? -3 : 3) }}
                      onClick={() => setSelectedFoto(foto)}
                      className="bg-white p-3 pb-8 shadow-xl border border-slate-100 transform transition-all cursor-pointer rounded-sm group relative"
                    >
                      <div className="aspect-square overflow-hidden mb-3">
                        <img src={foto.url} alt={foto.caption} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] font-serif italic text-slate-500 text-center truncate px-2">{foto.caption || 'Sem legenda'}</p>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newFotos = profile.mural_fotos?.filter((_, i) => i !== idx);
                          const updatedProfile = { ...profile, mural_fotos: newFotos };
                          dataService.saveUserProfile(updatedProfile, session?.user?.id || '', navigator.onLine);
                          setProfile(updatedProfile as UserProfile);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  )) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                      <ImageIcon size={48} className="text-slate-200 dark:text-white/10 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhuma polaroide no mural</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 🏆 LIDERANÇAS & CARGOS */}
              {profile?.visible_modules?.includes('liderancas') && (
                <div className="bg-white dark:bg-white/5 p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Trophy size={20} />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Lideranças & Cargos</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { id: 'xi', name: 'XI de Agosto', icon: <Star size={14} />, color: 'text-amber-600', bg: 'bg-amber-50' },
                      { id: 'sfjr', name: 'SanFran Jr.', icon: <Briefcase size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { id: 'casa', name: 'Casa do Estudante', icon: <ShieldCheck size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { id: 'monitoria', name: 'Monitoria', icon: <BookOpen size={14} />, color: 'text-purple-600', bg: 'bg-purple-50' },
                      { id: 'pesquisa', name: 'Pesquisa Acadêmica', icon: <Search size={14} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    ].map((badge) => {
                      const isEarned = profile?.badges?.includes(badge.id) || 
                                      profile?.cargos_academicos?.[badge.id as keyof typeof profile.cargos_academicos]?.length;
                      return (
                        <div 
                          key={badge.id}
                          className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isEarned ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-sm' : 'opacity-30 grayscale'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${badge.bg} ${badge.color}`}>
                              {badge.icon}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{badge.name}</span>
                              {isEarned && <span className="text-[8px] font-bold text-emerald-600 uppercase">Membro Ativo</span>}
                            </div>
                          </div>
                          {isEarned && <CheckCircle2 size={16} className="text-emerald-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="bg-white dark:bg-white/5 p-10 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-3 mb-10">
                  <div className="p-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded-xl">
                    <Settings size={20} />
                  </div>
                  <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">Privacidade & Personalização</h2>
                </div>

                <div className="space-y-10">
                  {/* Modo Persona */}
                  <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${profile?.persona_mode ? 'bg-sanfran-rubi text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <Zap size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Modo Persona</p>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">Permite que a IA analise seu perfil para insights</p>
                      </div>
                    </div>
                    <button onClick={handleTogglePersona} className="transition-transform active:scale-95">
                      {profile?.persona_mode ? <ToggleRight size={44} className="text-sanfran-rubi" /> : <ToggleLeft size={44} className="text-slate-300" />}
                    </button>
                  </div>

                  {/* Visibilidade do Perfil */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Visibilidade do Perfil</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'public', label: 'Largo', icon: <Globe size={14} />, desc: 'Todos podem ver' },
                        { id: 'friends', label: 'Amigos', icon: <Users size={14} />, desc: 'Apenas conexões' },
                        { id: 'private', label: 'Privado', icon: <EyeOff size={14} />, desc: 'Apenas você' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleVisibilityChange(opt.id as any)}
                          className={`flex flex-col items-center gap-2 p-5 rounded-3xl border transition-all ${profile?.visibility === opt.id ? 'bg-sanfran-rubi text-white border-sanfran-rubi shadow-xl shadow-red-900/20' : 'bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/5 hover:bg-slate-50'}`}
                        >
                          {opt.icon}
                          <span className="text-[9px] font-black uppercase tracking-widest">{opt.label}</span>
                          <span className="text-[7px] font-bold opacity-60 uppercase tracking-tighter">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Módulos Visíveis */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Módulos Visíveis</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'academico', label: 'Acadêmico', icon: <BookOpen size={14} /> },
                        { id: 'mural', label: 'Mural', icon: <ImageIcon size={14} /> },
                        { id: 'liderancas', label: 'Lideranças', icon: <Trophy size={14} /> },
                        { id: 'skills', label: 'Habilidades', icon: <Award size={14} /> },
                        { id: 'idiomas', label: 'Idiomas', icon: <Languages size={14} /> },
                        { id: 'social', label: 'Conexões', icon: <Share2 size={14} /> },
                        { id: 'interests', label: 'Interesses', icon: <Heart size={14} /> },
                      ].map((mod) => {
                        const isVisible = profile?.visible_modules?.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            onClick={() => toggleModule(mod.id)}
                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isVisible ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 border-indigo-100 dark:border-indigo-900/20' : 'bg-white dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/5'}`}
                          >
                            {mod.icon}
                            <span className="text-[9px] font-black uppercase tracking-widest">{mod.label}</span>
                            <div className="ml-auto">
                              {isVisible ? <CheckCircle2 size={12} /> : <X size={12} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ações de Conta */}
                  <div className="pt-10 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={handleResetProfile}
                      className="flex items-center justify-center gap-3 py-5 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all border border-slate-200 dark:border-white/10"
                    >
                      <RefreshCw size={16} />
                      Resetar Perfil
                    </button>

                    {!showConfirmClear ? (
                      <button 
                        onClick={() => setShowConfirmClear(true)}
                        className="flex items-center justify-center gap-3 py-5 bg-red-50 text-red-600 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-red-100 transition-all border border-red-100"
                      >
                        <Trash2 size={16} />
                        Apagar Tudo
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-4">
                        <button 
                          onClick={() => setShowConfirmClear(false)}
                          className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-[10px] tracking-widest"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleClearAllData}
                          disabled={isClearing}
                          className="flex-[2] py-5 bg-red-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                        >
                          {isClearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          Confirmar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 📝 MODAL DE FOTO */}
        <AnimatePresence>
          {selectedFoto && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedFoto(null)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white dark:bg-sanfran-rubiBlack rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Memória</h2>
                    <button onClick={() => setSelectedFoto(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>
                  <img src={selectedFoto.url} className="w-full h-64 object-cover rounded-2xl" />
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Legenda</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={selectedFoto.caption || ''}
                        onChange={(e) => setSelectedFoto({...selectedFoto, caption: e.target.value})}
                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                      <button 
                        onClick={async () => {
                          const caption = await geminiService.suggestPhotoCaption(selectedFoto.url);
                          setSelectedFoto({...selectedFoto, caption: caption || ''});
                        }}
                        className="p-3 bg-sanfran-rubi/10 text-sanfran-rubi rounded-2xl hover:bg-sanfran-rubi/20"
                      >
                        <Zap size={20} />
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const newFotos = profile?.mural_fotos?.map(f => f.url === selectedFoto.url ? selectedFoto : f);
                      const updatedProfile = { ...profile, mural_fotos: newFotos };
                      await dataService.saveUserProfile(updatedProfile, session?.user?.id || '', navigator.onLine);
                      setProfile(updatedProfile);
                      setSelectedFoto(null);
                    }}
                    className="w-full py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-900/20"
                  >
                    Salvar Legenda
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 📝 MODAL DE EDIÇÃO */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-sanfran-rubiBlack rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Editar Perfil</h2>
                  <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      value={editForm.full_name || ''}
                      onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Turma (Ano)</label>
                      <input 
                        type="number" 
                        value={editForm.turma ?? 0}
                        onChange={(e) => setEditForm({...editForm, turma: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sala</label>
                      <input 
                        type="text" 
                        value={editForm.sala || ''}
                        onChange={(e) => setEditForm({...editForm, sala: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Aniversário</label>
                      <input 
                        type="date" 
                        value={editForm.aniversario || ''}
                        onChange={(e) => setEditForm({...editForm, aniversario: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Progresso (%)</label>
                      <input 
                        type="number" 
                        value={editForm.progresso_total ?? 0}
                        onChange={(e) => setEditForm({...editForm, progresso_total: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Avatar URL</label>
                    <input 
                      type="text" 
                      value={editForm.avatar_url || ''}
                      onChange={(e) => setEditForm({...editForm, avatar_url: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bio Curta</label>
                    <textarea 
                      value={editForm.bio || ''}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Arquétipo</label>
                    <input 
                      type="text" 
                      value={editForm.archetype || ''}
                      onChange={(e) => setEditForm({...editForm, archetype: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Habilidades (separadas por vírgula)</label>
                    <input 
                      type="text" 
                      value={editForm.skills?.join(', ') || ''}
                      onChange={(e) => setEditForm({...editForm, skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Interesses (separados por vírgula)</label>
                    <input 
                      type="text" 
                      value={editForm.interests?.join(', ') || ''}
                      onChange={(e) => setEditForm({...editForm, interests: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Idiomas (separados por vírgula)</label>
                    <input 
                      type="text" 
                      value={editForm.idiomas?.join(', ') || ''}
                      onChange={(e) => setEditForm({...editForm, idiomas: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Intercâmbio</label>
                    <input 
                      type="text" 
                      value={editForm.intercambio || ''}
                      onChange={(e) => setEditForm({...editForm, intercambio: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Memórias</label>
                    <textarea 
                      value={editForm.memorias || ''}
                      onChange={(e) => setEditForm({...editForm, memorias: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold resize-none"
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Métricas Acadêmicas</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Créditos Aula</label>
                        <input 
                          type="number" 
                          value={editForm.creditos_aula ?? 0}
                          onChange={(e) => setEditForm({...editForm, creditos_aula: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Créditos Trabalho</label>
                        <input 
                          type="number" 
                          value={editForm.creditos_trabalho ?? 0}
                          onChange={(e) => setEditForm({...editForm, creditos_trabalho: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Média Ponderada</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={editForm.media ?? 0}
                          onChange={(e) => setEditForm({...editForm, media: parseFloat(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Horas Extensão</label>
                        <input 
                          type="number" 
                          value={editForm.horas_extensao ?? 0}
                          onChange={(e) => setEditForm({...editForm, horas_extensao: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Progresso Obrigatórias (%)</label>
                        <input 
                          type="number" 
                          value={editForm.progresso_obrigatorias ?? 0}
                          onChange={(e) => setEditForm({...editForm, progresso_obrigatorias: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Progresso Optativas (%)</label>
                        <input 
                          type="number" 
                          value={editForm.progresso_optativas ?? 0}
                          onChange={(e) => setEditForm({...editForm, progresso_optativas: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Entidades (separadas por vírgula)</label>
                      <input 
                        type="text" 
                        value={editForm.entidades?.join(', ') || ''}
                        onChange={(e) => setEditForm({...editForm, entidades: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargos Acadêmicos</h3>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Monitoria</label>
                      <input 
                        type="text" 
                        value={editForm.cargos_academicos.monitoria?.join(', ') || ''}
                        onChange={(e) => setEditForm({...editForm, cargos_academicos: {...editForm.cargos_academicos, monitoria: e.target.value.split(',').map(s => s.trim()).filter(s => s)}})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pesquisa</label>
                      <input 
                        type="text" 
                        value={editForm.cargos_academicos.pesquisa?.join(', ') || ''}
                        onChange={(e) => setEditForm({...editForm, cargos_academicos: {...editForm.cargos_academicos, pesquisa: e.target.value.split(',').map(s => s.trim()).filter(s => s)}})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">LinkedIn URL</label>
                    <input 
                      type="text" 
                      value={editForm.social_links.linkedin || ''}
                      onChange={(e) => setEditForm({...editForm, social_links: {...editForm.social_links, linkedin: e.target.value}})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Instagram URL</label>
                    <input 
                      type="text" 
                      value={editForm.social_links.instagram || ''}
                      onChange={(e) => setEditForm({...editForm, social_links: {...editForm.social_links, instagram: e.target.value}})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mural de Fotos</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {editForm.mural_fotos?.map((foto, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                          <img src={foto.url} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => {
                              const newFotos = [...editForm.mural_fotos];
                              newFotos.splice(idx, 1);
                              setEditForm({...editForm, mural_fotos: newFotos});
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
                        <Camera size={20} className="text-slate-400" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Add Foto</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file && session?.user) {
                              try {
                                setLoading(true);
                                const path = `${session.user.id}/mural_${Date.now()}_${file.name}`;
                                const url = await dataService.uploadFile(file, path, 'mural_fotos', file.type);
                                setEditForm({
                                  ...editForm, 
                                  mural_fotos: [...(editForm.mural_fotos || []), { url, date: new Date().toISOString() }]
                                });
                              } catch (err) {
                                console.error("[Profile] Mural photo upload error:", err);
                                alert("Erro ao enviar foto. Verifique as permissões ou tente novamente.");
                              } finally {
                                setLoading(false);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Currículo (PDF)</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="file" 
                        accept=".pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file && session?.user) {
                            try {
                              setLoading(true);
                              const path = `${session.user.id}/cv_${Date.now()}.pdf`;
                              const url = await dataService.uploadFile(file, path, 'curriculos', 'application/pdf');
                              setEditForm({...editForm, curriculo_url: url});
                              alert("Currículo enviado com sucesso!");
                            } catch (err) {
                              console.error("[Profile] Curriculum upload error:", err);
                              alert("Erro ao enviar currículo. Verifique se o arquivo é um PDF válido e tente novamente.");
                            } finally {
                              setLoading(false);
                            }
                          }
                        }}
                        className="hidden"
                        id="cv-upload"
                      />
                      <label 
                        htmlFor="cv-upload"
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-slate-200 dark:hover:bg-white/20 transition-all border border-dashed border-slate-300 dark:border-white/20"
                      >
                        <FileText size={16} />
                        {editForm.curriculo_url ? 'Alterar Currículo' : 'Subir Currículo (PDF)'}
                      </label>
                      {editForm.curriculo_url && (
                        <a href={editForm.curriculo_url} target="_blank" rel="noreferrer" className="p-3 bg-sanfran-rubi/10 text-sanfran-rubi rounded-2xl">
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex-1 py-4 bg-sanfran-rubi text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🤖 MODAL DE ANÁLISE IA */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter">Insights do Gemini</h2>
                    <p className="text-xs text-indigo-100 font-medium uppercase tracking-widest">Personalizado para sua jornada na SanFran</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <div className="markdown-body">
                    <Markdown remarkPlugins={[remarkGfm]}>{aiAnalysis}</Markdown>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex justify-end">
                <button 
                  onClick={() => setShowAiModal(false)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default Profile;
