
import React, { useState, useEffect } from 'react';
import { 
  User, Award, Shield, Settings, Trash2, Camera, Edit3, 
  ExternalLink, Eye, EyeOff, Zap, CheckCircle2, Loader2, 
  AlertTriangle, Github, Linkedin, Twitter, Globe, Save,
  GraduationCap, BookOpen, Trophy, Star, ShieldCheck,
  History, UserCheck, ToggleLeft, ToggleRight, Share2, X, Users,
  MapPin, Calendar, Languages, Plane, FileText, Image as ImageIcon, Heart, Briefcase, GraduationCap as GradIcon, Search, RefreshCw, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import * as pdfjsLib from 'pdfjs-dist';
import { dataService } from '../services/dataService';
import { geminiService } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import Markdown from 'react-markdown';
import { db } from '../services/offlineService';
import { UserProfile } from '../types';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedFoto, setSelectedFoto] = useState<{ url: string; caption?: string; date?: string } | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [editForm, setEditForm] = useState({
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
    progresso_curso: 0,
    curriculo_url: '',
    mural_fotos: [] as { url: string; caption?: string; date?: string }[],
    cargos_academicos: {
      monitoria: [] as string[],
      pesquisa: [] as string[],
      pites: [] as string[],
      diretoria: [] as string[],
      coordenacao: [] as string[]
    }
  });

  const [session, setSession] = useState<any>(null);
  const [disciplinas, setDisciplinas] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const userProfile = await dataService.getUserProfile(session.user.id, navigator.onLine);
        setProfile(userProfile);
        
        // Fetch disciplines
        const { data: discData } = await supabase.from('disciplinas').select('*').eq('user_id', session.user.id);
        if (discData) setDisciplinas(discData);

        setEditForm({
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
          progresso_curso: userProfile?.progresso_curso || 0,
          curriculo_url: userProfile?.curriculo_url || '',
          mural_fotos: userProfile?.mural_fotos || [],
          cargos_academicos: userProfile?.cargos_academicos || {
            monitoria: [],
            pesquisa: [],
            pites: [],
            diretoria: [],
            coordenacao: []
          }
        });
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleSaveProfile = async () => {
    if (!session?.user || !profile) return;
    setLoading(true);
    const updatedProfile = {
      ...profile,
      full_name: editForm.full_name,
      bio: editForm.bio,
      turma_ano: editForm.turma_ano,
      turma: editForm.turma,
      sala: editForm.sala,
      aniversario: editForm.aniversario,
      avatar_url: editForm.avatar_url,
      social_links: editForm.social_links,
      idiomas: editForm.idiomas,
      intercambio: editForm.intercambio,
      memorias: editForm.memorias,
      progresso_curso: editForm.progresso_curso,
      curriculo_url: editForm.curriculo_url,
      mural_fotos: editForm.mural_fotos,
      cargos_academicos: editForm.cargos_academicos
    };
    await dataService.saveUserProfile(updatedProfile, session.user.id, navigator.onLine);
    setProfile(updatedProfile);
    setIsEditing(false);
    setLoading(false);
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
    setSyncStatus('Analisando histórico...');
    try {
      console.log("Testing handleJupiterSync");
      const arrayBuffer = await file.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ');
      }

      setSyncStatus('Mapeando matérias das Arcadas...');
      const data = await geminiService.analyzeJupiterText(fullText);
        
        if (data) {
          setSyncStatus('Perfil atualizado!');
          const updatedProfile = {
            ...profile,
            full_name: data.full_name || profile.full_name,
            turma: data.turma || profile.turma,
            progresso_obrigatorias: data.progresso_obrigatorias || profile.progresso_obrigatorias,
            progresso_optativas: data.progresso_optativas || profile.progresso_optativas,
            progresso_total: data.progresso_total || profile.progresso_total,
            status_geral_integralizacao: data.status_geral_integralizacao || profile.status_geral_integralizacao,
            aniversario: data.aniversario || profile.aniversario,
          };
          
          await dataService.saveUserProfile(updatedProfile, session.user.id, navigator.onLine);
          
          if (data.disciplinas && data.disciplinas.length > 0) {
            await dataService.saveDisciplinas(data.disciplinas, session.user.id);
            // Update local state
            const { data: discData } = await supabase.from('disciplinas').select('*').eq('user_id', session.user.id);
            if (discData) setDisciplinas(discData);
          }
          
          setProfile(updatedProfile);
          setTimeout(() => {
            setSyncStatus('');
            setIsSyncing(false);
            alert("Perfil sincronizado com sucesso via Júpiter!");
          }, 1500);
        }
    } catch (error) {
      console.error("Erro na sincronização Júpiter:", error);
      alert("Erro ao analisar PDF do Júpiter.");
      setIsSyncing(false);
      setSyncStatus('');
    }
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
                  {profile?.full_name || session?.user?.user_metadata?.full_name || 'Estudante SanFran'}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <span className="px-4 py-1.5 bg-sanfran-rubi text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-900/20">
                    Turma {profile?.turma || profile?.turma_ano || '---'}
                  </span>
                  {profile?.sala && (
                    <span className="px-4 py-1.5 bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 shadow-sm">
                      Sala {profile.sala}
                    </span>
                  )}
                  <span className="px-4 py-1.5 bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 shadow-sm">
                    {profile?.archetype || 'Novato'}
                  </span>
                  {profile?.cargos_academicos?.diretoria?.[0] && (
                    <span className="px-4 py-1.5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-900/20">
                      {profile.cargos_academicos.diretoria[0]}
                    </span>
                  )}
                </div>
              </div>
              <div className="relative group max-w-2xl">
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic">
                  "{profile?.bio || 'Nenhuma biografia definida. Clique em editar para adicionar.'}"
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
                    <span className="text-[8px] text-white/70 font-bold uppercase tracking-tighter">{isSyncing ? syncStatus : 'Via JúpiterWeb'}</span>
                  </div>
                </label>
              </div>

              <button 
                onClick={async () => {
                  if (!profile) return;
                  setIsAnalyzing(true);
                  try {
                    const analysis = await geminiService.analyzeProfile(profile);
                    setAiAnalysis(analysis || "Não foi possível gerar a análise.");
                    setShowAiModal(true);
                  } catch (error) {
                    console.error("Erro na análise IA:", error);
                    alert("Erro ao gerar análise do perfil.");
                  } finally {
                    setIsAnalyzing(false);
                  }
                }}
                disabled={isAnalyzing}
                className={`p-4 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-900/20 hover:scale-[1.05] transition-all flex items-center gap-3 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
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

        {/* 📚 JORNADA ACADÊMICA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                <GradIcon size={18} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progresso Total</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>Integralização</span>
                <span>{profile?.progresso_total || 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${profile?.progresso_total || 0}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                <CheckCircle2 size={18} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Obrigatórias</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>Concluído</span>
                <span>{profile?.progresso_obrigatorias || 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${profile?.progresso_obrigatorias || 0}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-xl">
                <BookOpen size={18} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Optativas</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>Concluído</span>
                <span>{profile?.progresso_optativas || 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${profile?.progresso_optativas || 0}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-sanfran-rubi/10 text-sanfran-rubi rounded-xl">
                <ShieldCheck size={18} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Integralização</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-serif font-bold text-sanfran-rubi">{profile?.status_geral_integralizacao || 0}%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Concluído</span>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                <Languages size={18} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Idiomas</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile?.idiomas?.length ? profile.idiomas.map(lang => (
                <span key={lang} className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/20">
                  {lang}
                </span>
              )) : <span className="text-[9px] text-slate-400 uppercase font-black">Nenhum</span>}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                <Plane size={18} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Intercâmbio</h3>
            </div>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase leading-tight">
              {profile?.intercambio || 'Não realizado'}
            </p>
          </div>

          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-xl">
                <Calendar size={18} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aniversário</h3>
            </div>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase leading-tight">
              {profile?.aniversario ? new Date(profile.aniversario).toLocaleDateString('pt-BR') : 'Não informado'}
            </p>
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
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{disc.codigo}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{disc.turma_sala}</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight mb-3 group-hover:text-emerald-600 transition-colors">{disc.nome}</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(disc.horarios || {}).map(([dia, hora]) => (
                      <div key={dia} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-white/10 rounded-lg border border-slate-200 dark:border-white/10">
                        <span className="text-[8px] font-black text-slate-400 uppercase">{dia.substring(0, 3)}</span>
                        <span className="text-[8px] font-bold text-slate-600 dark:text-slate-300">{hora as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
                { label: 'Atividades Complementares', progress: 90, color: 'bg-emerald-500' },
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

        {/* 🖼️ MURAL DE MEMÓRIAS E LIDERANÇA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Polaroid Photo Grid */}
          <div className="lg:col-span-2 bg-white dark:bg-white/5 p-10 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div className="space-y-1">
                <h2 className="text-2xl font-serif font-bold text-sanfran-rubi dark:text-white">Mural de Memórias</h2>
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
                          const updatedProfile = {
                            ...profile,
                            mural_fotos: [...(profile?.mural_fotos || []), newFoto]
                          };
                          await dataService.saveUserProfile(updatedProfile, session.user.id, navigator.onLine);
                          setProfile(updatedProfile);
                        } catch (err) {
                          console.error("[Profile] Mural photo upload error:", err);
                          alert("Erro ao enviar foto. Verifique as permissões ou tente novamente.");
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              {profile?.mural_fotos?.length ? profile.mural_fotos.map((foto, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={{ scale: 1.05, zIndex: 10, rotate: 0 }}
                  initial={{ rotate: (idx % 2 === 0 ? -3 : 3) }}
                  onClick={() => setSelectedFoto(foto)}
                  className="bg-white p-3 pb-8 shadow-xl border border-slate-100 transform transition-all cursor-pointer rounded-sm"
                >
                  <div className="aspect-square overflow-hidden mb-3">
                    <img src={foto.url} alt={foto.caption} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[10px] font-serif italic text-slate-500 text-center truncate px-2">{foto.caption || 'Sem legenda'}</p>
                </motion.div>
              )) : (
                <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                  <ImageIcon size={48} className="text-slate-200 dark:text-white/10 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhuma polaroide no mural</p>
                </div>
              )}
            </div>
          </div>

          {/* Leadership & Badges */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-white/5 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Trophy size={20} />
                </div>
                <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">Lideranças</h2>
              </div>

              <div className="space-y-4">
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
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isEarned ? 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-sm' : 'opacity-30 grayscale'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${badge.bg} ${badge.color}`}>
                          {badge.icon}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{badge.name}</span>
                      </div>
                      {isEarned && <CheckCircle2 size={14} className="text-emerald-500" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-sanfran-rubi p-8 rounded-[3rem] shadow-xl shadow-red-900/20 text-white">
              <h3 className="text-lg font-serif font-bold mb-4">Conexões SanFran</h3>
              <p className="text-[10px] font-medium opacity-80 mb-6 leading-relaxed">Permita que a IA conheça sua trajetória corporativa e técnica para gerar insights personalizados.</p>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <Linkedin size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">LinkedIn</span>
                  </div>
                  <ExternalLink size={14} className="opacity-50" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <Github size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">GitHub</span>
                  </div>
                  <ExternalLink size={14} className="opacity-50" />
                </button>
              </div>
            </div>
          </div>
        </div>

            {/* ⚙️ 3. CENTRAL DE DADOS E PREFERÊNCIAS */}
            <div className="space-y-8">
              <div className="bg-white dark:bg-white/5 p-10 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-3 mb-10">
                  <div className="p-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded-xl">
                    <Settings size={20} />
                  </div>
                  <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">Privacidade</h2>
                </div>

                <div className="space-y-8">
                  {/* AI Persona Toggle */}
                  <div className="flex items-center justify-between p-5 bg-sanfran-offwhite dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${profile?.persona_mode ? 'bg-sanfran-rubi text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <Zap size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Modo Persona</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">IA Inteligente Ativa</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleTogglePersona}
                      className="transition-transform active:scale-95"
                    >
                      {profile?.persona_mode ? <ToggleRight size={40} className="text-sanfran-rubi" /> : <ToggleLeft size={40} className="text-slate-300" />}
                    </button>
                  </div>

                  {/* Visibility Settings */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Visibilidade</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'public', label: 'Largo', icon: <Globe size={14} /> },
                        { id: 'friends', label: 'Amigos', icon: <Users size={14} /> },
                        { id: 'private', label: 'Privado', icon: <EyeOff size={14} /> },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleVisibilityChange(opt.id as any)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${profile?.visibility === opt.id ? 'bg-sanfran-rubi text-white border-sanfran-rubi shadow-lg shadow-red-900/20' : 'bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/5 hover:bg-slate-50'}`}
                        >
                          {opt.icon}
                          <span className="text-[9px] font-black uppercase tracking-widest">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear History */}
                  <div className="pt-8 border-t border-slate-100 dark:border-white/5">
                    {!showConfirmClear ? (
                      <button 
                        onClick={() => setShowConfirmClear(true)}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-amber-50 text-amber-700 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-100 transition-all border border-amber-100"
                      >
                        <History size={16} />
                        Limpar Histórico e Nuvem
                      </button>
                    ) : (
                      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
                          <AlertTriangle className="text-red-500 shrink-0" size={18} />
                          <p className="text-[9px] font-bold text-red-700 leading-tight">
                            Atenção: Esta ação é irreversível e apagará todos os seus dados da SanFran Academy.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setShowConfirmClear(false)}
                            className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[9px] tracking-widest"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={handleClearAllData}
                            disabled={isClearing}
                            className="py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                          >
                            {isClearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Confirmar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Turma (Ano)</label>
                      <input 
                        type="number" 
                        value={editForm.turma}
                        onChange={(e) => setEditForm({...editForm, turma: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sala</label>
                      <input 
                        type="text" 
                        value={editForm.sala}
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
                        value={editForm.aniversario}
                        onChange={(e) => setEditForm({...editForm, aniversario: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Progresso (%)</label>
                      <input 
                        type="number" 
                        value={editForm.progresso_curso}
                        onChange={(e) => setEditForm({...editForm, progresso_curso: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Avatar URL</label>
                    <input 
                      type="text" 
                      value={editForm.avatar_url}
                      onChange={(e) => setEditForm({...editForm, avatar_url: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bio Curta</label>
                    <textarea 
                      value={editForm.bio}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Idiomas (separados por vírgula)</label>
                    <input 
                      type="text" 
                      value={editForm.idiomas.join(', ')}
                      onChange={(e) => setEditForm({...editForm, idiomas: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Intercâmbio</label>
                    <input 
                      type="text" 
                      value={editForm.intercambio}
                      onChange={(e) => setEditForm({...editForm, intercambio: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Memórias</label>
                    <textarea 
                      value={editForm.memorias}
                      onChange={(e) => setEditForm({...editForm, memorias: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-sanfran-rubi outline-none transition-all text-sm font-bold resize-none"
                    />
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
                    <Markdown>{aiAnalysis}</Markdown>
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
  );
};

export default Profile;
