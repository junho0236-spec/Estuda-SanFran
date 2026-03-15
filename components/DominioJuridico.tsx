import React, { useMemo, useState, useEffect } from 'react';
import { Landmark, Scale, Gavel, Briefcase, Star, CheckCircle2, BookOpen, AlertCircle, Trophy, Target, Zap, Shield, Award, Map as MapIcon, Compass, Loader2, Plus, X, Edit2, Trash2, Check, ChevronRight, Search, Heart, Globe, Hammer, PenTool, Microscope, Music, Camera, Coffee, Car, Plane, Home, Sparkles, CheckSquare } from 'lucide-react';
import { Subject, StudySession, LegalFrontier } from '../types';
import { 
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../services/offlineService';
import { toast } from 'sonner';
import { GoogleGenAI, Type } from "@google/genai";

interface DominioJuridicoProps {
  subjects: Subject[];
  studySessions: StudySession[];
  userId: string;
}

const DEFAULT_FRONTIERS = [
  { id: 'civil', name: 'Direito Civil & Processual', icon: 'Scale', keywords: ['civil', 'cpc', 'processo civil', 'família', 'sucessões', 'consumidor', 'contratos'], color: '#005594', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800', accent: 'text-cyan-600' },
  { id: 'penal', name: 'Ciências Penais', icon: 'Gavel', keywords: ['penal', 'cpp', 'processo penal', 'criminal', 'inquérito'], color: '#8B0000', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', accent: 'text-red-600' },
  { id: 'publico', name: 'Direito Público', icon: 'Landmark', keywords: ['const', 'adm', 'tribut', 'public', 'estado', 'eleitoral'], color: '#D4AF37', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', accent: 'text-yellow-600' },
  { id: 'corporativo', name: 'Direito Corporativo', icon: 'Briefcase', keywords: ['emp', 'trab', 'econ', 'comercial', 'societário', 'clt'], color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', accent: 'text-emerald-600' },
];

const ICON_MAP: Record<string, any> = {
  Landmark, Scale, Gavel, Briefcase, Shield, Award, Compass, Zap, Target, Trophy, BookOpen, Star,
  Heart, Globe, Hammer, PenTool, Microscope, Music, Camera, Coffee, Car, Plane, Home
};

const TIERS = {
  dominated: { label: 'Dominado', hours: 25, icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  settled: { label: 'Colonizado', hours: 10, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  explored: { label: 'Explorado', hours: 1, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  locked: { label: 'Não Iniciado', hours: 0, icon: null, color: 'text-slate-400', bg: 'bg-slate-100' },
};

const MASTERY_LEVELS = [
  { label: 'Iniciante', min: 0, color: 'text-slate-400' },
  { label: 'Explorador', min: 5, color: 'text-blue-500' },
  { label: 'Colonizador', min: 15, color: 'text-emerald-500' },
  { label: 'Mestre', min: 30, color: 'text-amber-500' },
  { label: 'Lenda', min: 50, color: 'text-sanfran-rubi' },
];

const ARCHETYPES = [
  { name: 'O Civilista', description: 'Mestre das relações privadas e do patrimônio.', icon: Shield, color: 'from-blue-600 to-cyan-500', keywords: ['civil', 'processo civil'] },
  { name: 'O Criminalista', description: 'Defensor ferrenho das garantias fundamentais.', icon: Gavel, color: 'from-red-700 to-orange-600', keywords: ['penal', 'processo penal'] },
  { name: 'O Publicista', description: 'Guardião da Constituição e do interesse público.', icon: Landmark, color: 'from-yellow-600 to-amber-500', keywords: ['público', 'administrativo', 'constitucional'] },
  { name: 'O Corporativista', description: 'Estrategista do mercado e das relações de trabalho.', icon: Briefcase, color: 'from-emerald-600 to-teal-500', keywords: ['corporativo', 'empresarial', 'trabalho'] },
  { name: 'O Humanista', description: 'Focado nos direitos humanos e justiça social.', icon: Heart, color: 'from-pink-600 to-rose-500', keywords: ['humanos', 'social'] },
  { name: 'O Internacionalista', description: 'Navegador das ordens jurídicas globais.', icon: Globe, color: 'from-indigo-600 to-blue-500', keywords: ['internacional'] },
  { name: 'O Jurista Polímata', description: 'Equilíbrio perfeito entre todas as artes jurídicas.', icon: Scale, color: 'from-slate-800 to-slate-600', keywords: [] },
];

const DominioJuridico: React.FC<DominioJuridicoProps> = ({ subjects, studySessions, userId }) => {
  const [customFrontiers, setCustomFrontiers] = useState<LegalFrontier[]>([]);
  const [isFrontierModalOpen, setIsFrontierModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingFrontier, setEditingFrontier] = useState<Partial<LegalFrontier> | null>(null);
  const [selectedFrontierForSubjects, setSelectedFrontierForSubjects] = useState<string | null>(null);
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [selectedSubjectForTopics, setSelectedSubjectForTopics] = useState<Subject | null>(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);

  useEffect(() => {
    const loadFrontiers = async () => {
      const saved = await db.legal_frontiers.where('user_id').equals(userId).toArray();
      if (saved.length === 0) {
        // Initialize with defaults if empty
        const initial = DEFAULT_FRONTIERS.map(f => ({
          id: f.id,
          user_id: userId,
          name: f.name,
          icon: f.icon,
          color: f.color,
          bg: f.bg,
          border: f.border,
          accent: f.accent,
          subject_ids: []
        }));
        await db.legal_frontiers.bulkAdd(initial);
        setCustomFrontiers(initial);
      } else {
        setCustomFrontiers(saved);
      }
    };
    if (userId) loadFrontiers();
  }, [userId]);

  const processedData = useMemo(() => {
    const hoursBySubject: Record<string, number> = {};
    subjects.forEach(s => hoursBySubject[s.id] = 0);
    studySessions.forEach(session => {
      if (session.subject_id && hoursBySubject[session.subject_id] !== undefined) {
        hoursBySubject[session.subject_id] += (Number(session.duration) || 0) / 3600;
      }
    });

    const getStatus = (hours: number): keyof typeof TIERS => {
      if (hours >= TIERS.dominated.hours) return 'dominated';
      if (hours >= TIERS.settled.hours) return 'settled';
      if (hours > 0) return 'explored';
      return 'locked';
    };

    let totalTerritories = subjects.length;
    let conqueredTerritories = 0;
    const areaHours: Record<string, number> = {};
    
    // Initialize area hours for all frontiers
    customFrontiers.forEach(f => areaHours[f.id] = 0);

    const groupedData = customFrontiers.map(frontier => {
      // Find subjects manually assigned or matching keywords (if default)
      const defaultInfo = DEFAULT_FRONTIERS.find(d => d.id === frontier.id);
      const keywords = defaultInfo?.keywords || [];

      const areaSubjects = subjects
        .filter(sub => {
          // Priority 1: Manual assignment
          if (frontier.subject_ids.includes(sub.id)) return true;
          
          // Priority 2: Keyword match (only for default frontiers and if not assigned elsewhere)
          if (keywords.length > 0) {
            const matchesKeyword = keywords.some(k => sub.name.toLowerCase().includes(k));
            if (matchesKeyword) {
              // Check if this subject is manually assigned to ANOTHER frontier
              const isAssignedElsewhere = customFrontiers.some(f => f.id !== frontier.id && f.subject_ids.includes(sub.id));
              return !isAssignedElsewhere;
            }
          }
          return false;
        })
        .map(sub => {
          const hours = hoursBySubject[sub.id] || 0;
          const status = getStatus(hours);
          if (status !== 'locked') conqueredTerritories++;
          areaHours[frontier.id] += hours;
          
          const completedTopics = sub.topics?.filter(t => t.completed).length || 0;
          const totalTopics = sub.topics?.length || 0;
          const topicProgress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

          return {
            ...sub,
            hours: hours,
            status,
            topicProgress
          };
        })
        .sort((a, b) => b.hours - a.hours);

      return {
        ...frontier,
        subjects: areaSubjects,
        totalHours: areaHours[frontier.id],
        Icon: ICON_MAP[frontier.icon] || Scale
      };
    });
    
    const overallProgress = totalTerritories > 0 ? (conqueredTerritories / totalTerritories) * 100 : 0;
    const totalHoursAll = Object.values(areaHours).reduce((a, b) => a + b, 0);
    
    const areaPercentages = totalHoursAll > 0 
      ? Object.fromEntries(Object.entries(areaHours).map(([k, v]) => [k, (v / totalHoursAll) * 100]))
      : {};

    // Identify unassigned subjects
    const assignedSubjectIds = new Set<string>();
    customFrontiers.forEach(f => f.subject_ids.forEach(id => assignedSubjectIds.add(id)));
    
    // Also consider default keyword matches as "assigned" for the purpose of this list
    const unassignedSubjects = subjects.filter(sub => {
      if (assignedSubjectIds.has(sub.id)) return false;
      
      // Check if it matches any default frontier keywords
      const matchesAnyDefault = DEFAULT_FRONTIERS.some(df => 
        df.keywords.some(k => sub.name.toLowerCase().includes(k))
      );
      
      return !matchesAnyDefault;
    }).map(sub => ({
      ...sub,
      hours: hoursBySubject[sub.id] || 0,
      status: getStatus(hoursBySubject[sub.id] || 0)
    }));

    // Find top frontier by hours
    const topFrontierId = Object.entries(areaHours).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topFrontier = customFrontiers.find(f => f.id === topFrontierId);

    const archetype = ARCHETYPES.find(a => {
      if (!topFrontier || totalHoursAll === 0) return false;
      
      // If top frontier is a default one, match by keywords
      const defaultInfo = DEFAULT_FRONTIERS.find(d => d.id === topFrontier.id);
      if (defaultInfo) {
        const areaId = a.name.toLowerCase().includes('civil') ? 'civil' : 
                       a.name.toLowerCase().includes('criminal') ? 'penal' :
                       a.name.toLowerCase().includes('public') ? 'publico' :
                       a.name.toLowerCase().includes('corporat') ? 'corporativo' : null;
        return areaId === topFrontier.id && areaPercentages[areaId] > 40;
      }

      // For custom frontiers, try to match by name keywords
      return a.keywords.some(k => topFrontier.name.toLowerCase().includes(k)) && areaPercentages[topFrontier.id] > 40;
    }) || ARCHETYPES[ARCHETYPES.length - 1];

    const radarData = groupedData.slice(0, 6).map(area => ({
      subject: area.name.length > 15 ? area.name.substring(0, 12) + '...' : area.name,
      fullMark: 100,
      A: Math.min(100, (areaHours[area.id] / 20) * 100),
    }));

    return { groupedData, overallProgress, archetype, radarData, totalHoursAll, conqueredTerritories, totalTerritories, unassignedSubjects };
  }, [subjects, studySessions, customFrontiers]);

  const handleSaveFrontier = async () => {
    if (!editingFrontier?.name) return;
    
    const newFrontier: LegalFrontier = {
      id: editingFrontier.id || Math.random().toString(36).substr(2, 9),
      user_id: userId,
      name: editingFrontier.name,
      icon: editingFrontier.icon || 'Scale',
      color: editingFrontier.color || '#6366f1',
      bg: editingFrontier.bg || 'bg-indigo-50 dark:bg-indigo-900/20',
      border: editingFrontier.border || 'border-indigo-200 dark:border-indigo-800',
      accent: editingFrontier.accent || 'text-indigo-600',
      subject_ids: editingFrontier.subject_ids || []
    };

    if (editingFrontier.id) {
      await db.legal_frontiers.put(newFrontier);
      setCustomFrontiers(prev => prev.map(f => f.id === newFrontier.id ? newFrontier : f));
    } else {
      await db.legal_frontiers.add(newFrontier);
      setCustomFrontiers(prev => [...prev, newFrontier]);
    }

    setIsFrontierModalOpen(false);
    setEditingFrontier(null);
    toast.success('Fronteira salva com sucesso!');
  };

  const handleDeleteFrontier = async (id: string) => {
    if (DEFAULT_FRONTIERS.some(d => d.id === id)) {
      toast.error('Fronteiras padrão não podem ser excluídas.');
      return;
    }
    if (!confirm('Deseja realmente excluir esta fronteira?')) return;
    
    await db.legal_frontiers.delete(id);
    setCustomFrontiers(prev => prev.filter(f => f.id !== id));
    toast.success('Fronteira removida.');
  };

  const toggleSubjectInFrontier = async (subjectId: string, frontierId: string) => {
    const frontier = customFrontiers.find(f => f.id === frontierId);
    if (!frontier) return;

    let newSubjectIds = [...frontier.subject_ids];
    if (newSubjectIds.includes(subjectId)) {
      newSubjectIds = newSubjectIds.filter(id => id !== subjectId);
    } else {
      // Remove from other frontiers first to ensure unique assignment
      const updatedFrontiers = await Promise.all(customFrontiers.map(async f => {
        if (f.id !== frontierId && f.subject_ids.includes(subjectId)) {
          const filtered = f.subject_ids.filter(id => id !== subjectId);
          await db.legal_frontiers.update(f.id, { subject_ids: filtered } as any);
          return { ...f, subject_ids: filtered };
        }
        return f;
      }));
      setCustomFrontiers(updatedFrontiers);
      newSubjectIds.push(subjectId);
    }

    await db.legal_frontiers.update(frontierId, { subject_ids: newSubjectIds } as any);
    setCustomFrontiers(prev => prev.map(f => f.id === frontierId ? { ...f, subject_ids: newSubjectIds } : f));
  };

  const generateTopicsWithAI = async (subject: Subject) => {
    if (!subject.name) return;
    setIsGeneratingTopics(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Gere uma lista de 10 a 15 tópicos principais de estudo para a disciplina de Direito: "${subject.name}". Retorne apenas um array JSON de strings com os títulos dos tópicos.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const topicTitles = JSON.parse(response.text);
      const newTopics = topicTitles.map((title: string) => ({
        id: crypto.randomUUID(),
        title,
        completed: false
      }));

      await db.subjects.update(subject.id, { topics: newTopics });
      setSelectedSubjectForTopics(prev => prev ? { ...prev, topics: newTopics } : null);
      toast.success(`Ementa gerada para ${subject.name}!`);
    } catch (error) {
      console.error("Erro ao gerar tópicos:", error);
      toast.error("Falha ao gerar ementa com IA.");
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  const toggleTopicCompletion = async (subjectId: string, topicId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject || !subject.topics) return;

    const newTopics = subject.topics.map(t => 
      t.id === topicId ? { ...t, completed: !t.completed } : t
    );

    await db.subjects.update(subjectId, { topics: newTopics });
    setSelectedSubjectForTopics(prev => prev ? { ...prev, topics: newTopics } : null);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 px-2 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 px-4 py-2 rounded-full border border-amber-200 dark:border-amber-800"
           >
              <Compass className="w-4 h-4 text-amber-700 dark:text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">Cartografia Jurídica Avançada</span>
           </motion.div>
           <h2 className="text-4xl md:text-6xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Domínio Jurídico</h2>
           <p className="text-slate-500 font-bold italic text-xl max-w-2xl">Sua jornada intelectual mapeada em tempo real. Cada hora de estudo expande suas fronteiras.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => {
              setEditingFrontier({ name: '', icon: 'Scale', color: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', accent: 'text-indigo-600', subject_ids: [] });
              setIsFrontierModalOpen(true);
            }}
            className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-sanfran-rubi hover:text-sanfran-rubi transition-all flex items-center gap-3 group"
          >
            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-2xl group-hover:bg-sanfran-rubi/10 transition-colors">
              <Plus size={24} />
            </div>
            <span className="text-sm font-black uppercase tracking-tight">Nova Fronteira</span>
          </button>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={`p-6 rounded-[2.5rem] bg-gradient-to-br ${processedData.archetype.color} text-white shadow-2xl shadow-slate-500/20 flex items-center gap-4 border border-white/20`}
          >
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <processedData.archetype.icon size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Arquétipo Atual</p>
              <h3 className="text-xl font-black tracking-tight">{processedData.archetype.name}</h3>
            </div>
          </motion.div>
        </div>
      </header>
      
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Radar Chart Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 p-8 rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-8">
          <div className="w-full h-[300px] md:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={processedData.radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                <Radar
                  name="Domínio"
                  dataKey="A"
                  stroke="#8B0000"
                  fill="#8B0000"
                  fillOpacity={0.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Equilíbrio de Poder</h3>
              <p className="text-sm text-slate-500 font-medium">O gráfico de radar mostra sua versatilidade. Um jurista completo busca preencher todos os quadrantes.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Total de Horas</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{Math.round(processedData.totalHoursAll)}h</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Territórios</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{processedData.conqueredTerritories}/{processedData.totalTerritories}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Card */}
        <div className="bg-slate-900 text-white p-8 rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-sanfran-rubi/20 rounded-full blur-3xl group-hover:bg-sanfran-rubi/40 transition-all duration-700" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div className="p-4 bg-white/10 rounded-2xl">
                <Target size={32} className="text-sanfran-rubi" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progresso Geral</p>
                <p className="text-5xl font-black text-white tracking-tighter">{Math.round(processedData.overallProgress)}%</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${processedData.overallProgress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-sanfran-rubi to-red-400 rounded-full" 
                />
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Você já explorou {processedData.conqueredTerritories} das {processedData.totalTerritories} áreas fundamentais do seu currículo acadêmico.</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center">
                  <Award size={14} className="text-usp-gold" />
                </div>
              ))}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-500">3 Conquistas Pendentes</p>
          </div>
        </div>
      </div>

      {subjects.length === 0 && (
          <div className="py-24 text-center border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[4rem] flex flex-col items-center gap-8 bg-slate-50/50 dark:bg-white/2">
             <div className="p-8 bg-white dark:bg-white/5 rounded-[2.5rem] shadow-xl">
                <MapIcon className="w-20 h-20 text-slate-200 dark:text-white/10" />
             </div>
             <div className="space-y-3">
               <h3 className="text-3xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter">Terra Incognita</h3>
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest max-w-md mx-auto">Seu mapa está em branco. Adicione disciplinas para começar a colonizar o conhecimento jurídico.</p>
             </div>
          </div>
      )}

      {/* Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {processedData.groupedData.map(area => (
           <motion.div 
             key={area.id} 
             layout
             whileHover={{ y: -5 }}
             className={`p-10 rounded-[3.5rem] border-2 shadow-2xl transition-all duration-500 ${area.bg} ${area.border} relative overflow-hidden group`}
           >
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 dark:bg-black/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              
              <div className="flex items-center justify-between mb-10 relative z-10">
                <div className="flex items-center gap-6">
                   <div className={`p-5 rounded-3xl bg-white dark:bg-black/20 shadow-xl ${area.accent}`}>
                      <area.Icon size={32} />
                   </div>
                   <div>
                      <h3 className={`text-3xl font-black uppercase tracking-tighter ${area.accent}`}>{area.name}</h3>
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{Math.round(area.totalHours)} horas totais</p>
                        <span className="w-1 h-1 bg-current opacity-20 rounded-full" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{area.subjects.length} disciplinas</p>
                        <span className="w-1 h-1 bg-current opacity-20 rounded-full" />
                        <p className={`text-[10px] font-black uppercase tracking-widest ${MASTERY_LEVELS.slice().reverse().find(m => area.totalHours >= m.min)?.color || 'text-slate-400'}`}>
                          Nível: {MASTERY_LEVELS.slice().reverse().find(m => area.totalHours >= m.min)?.label}
                        </p>
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setSelectedFrontierForSubjects(area.id);
                      setIsSubjectModalOpen(true);
                    }}
                    className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl border border-white/50 dark:border-white/5 hover:bg-white transition-colors"
                  >
                    <Plus size={20} className={area.accent} />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingFrontier(area);
                      setIsFrontierModalOpen(true);
                    }}
                    className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl border border-white/50 dark:border-white/5 hover:bg-white transition-colors"
                  >
                    <Edit2 size={20} className={area.accent} />
                  </button>
                  {!DEFAULT_FRONTIERS.some(d => d.id === area.id) && (
                    <button 
                      onClick={() => handleDeleteFrontier(area.id)}
                      className="p-3 bg-white/50 dark:bg-black/20 rounded-2xl border border-white/50 dark:border-white/5 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                 {area.subjects.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400/50 gap-4">
                      <div className="w-12 h-12 border-2 border-dashed border-current rounded-full" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Fronteira não explorada</p>
                    </div>
                 )}
                 {area.subjects.map(sub => {
                    const statusInfo = TIERS[sub.status];
                    const isLocked = sub.status === 'locked';
                    const opacity = isLocked ? 'opacity-40 grayscale' : 'opacity-100';
                    const borderColor = sub.status === 'dominated' ? 'border-yellow-400 shadow-yellow-500/10' : 'border-slate-200/50 dark:border-white/5';
                    const bgClass = isLocked ? 'bg-slate-50/50 dark:bg-black/10' : 'bg-white dark:bg-white/5';

                    return (
                       <motion.div 
                         key={sub.id} 
                         layout
                         whileHover={{ scale: 1.02 }}
                         onClick={() => {
                           setSelectedSubjectForTopics(sub);
                           setIsTopicModalOpen(true);
                         }}
                         className={`group relative ${bgClass} p-5 rounded-3xl border-2 ${borderColor} shadow-lg transition-all ${opacity} cursor-pointer`}
                       >
                          <div className="flex justify-between items-start mb-4">
                             <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: sub.color }} />
                             {statusInfo.icon && (
                               <div className={`p-1.5 rounded-lg ${statusInfo.bg}`}>
                                 <statusInfo.icon size={14} className={statusInfo.color} />
                               </div>
                             )}
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-sm font-black uppercase text-slate-900 dark:text-white leading-tight truncate">{sub.name}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: statusInfo.color }}>
                                {statusInfo.label}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400">
                                  {Number(sub.hours).toFixed(1)}h
                                </span>
                                {sub.topics && sub.topics.length > 0 && (
                                  <span className="text-[9px] font-bold text-sanfran-rubi">
                                    {Math.round(sub.topicProgress)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Progress Bars */}
                          {!isLocked && (
                            <div className="mt-3 space-y-2">
                              {/* Effort Progress (Hours) */}
                              <div className="h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-slate-400/30 rounded-full" 
                                  style={{ width: `${Math.min(100, (sub.hours / TIERS.dominated.hours) * 100)}%`, backgroundColor: sub.color }} 
                                />
                              </div>
                              {/* Content Coverage Progress (Topics) */}
                              {sub.topics && sub.topics.length > 0 && (
                                <div className="h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-sanfran-rubi rounded-full" 
                                    style={{ width: `${sub.topicProgress}%` }} 
                                  />
                                </div>
                              )}
                              {(!sub.topics || sub.topics.length === 0) && (
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Ementa não definida</p>
                              )}
                            </div>
                          )}
                       </motion.div>
                    );
                 })}
              </div>
           </motion.div>
         ))}
      </div>

      {/* Unassigned Subjects Section */}
      {processedData.unassignedSubjects.length > 0 && (
        <div className="mt-20 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl">
              <Compass className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Terra Incognita</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Disciplinas aguardando colonização em uma fronteira</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {processedData.unassignedSubjects.map(sub => (
              <div 
                key={sub.id}
                className="p-4 bg-white dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl flex items-center justify-between group hover:border-slate-400 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                  <p className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{sub.name}</p>
                </div>
                <button 
                  onClick={() => {
                    // Open modal for first frontier if none selected
                    setSelectedFrontierForSubjects(customFrontiers[0]?.id || null);
                    setIsSubjectModalOpen(true);
                  }}
                  className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-sanfran-rubi hover:text-white"
                >
                  <Plus size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: FRONTIER EDITOR */}
      <AnimatePresence>
        {isFrontierModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFrontierModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Configurar Fronteira</h3>
                <button onClick={() => setIsFrontierModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome da Fronteira</label>
                    <input 
                      type="text" 
                      value={editingFrontier?.name || ''}
                      onChange={(e) => setEditingFrontier(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Direito Digital"
                      className="w-full bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 font-bold text-slate-900 dark:text-white focus:border-sanfran-rubi outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ícone Representativo</label>
                    <div className="grid grid-cols-5 gap-3">
                      {Object.keys(ICON_MAP).map(iconName => {
                        const Icon = ICON_MAP[iconName];
                        return (
                          <button
                            key={iconName}
                            onClick={() => setEditingFrontier(prev => ({ ...prev, icon: iconName }))}
                            className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center ${editingFrontier?.icon === iconName ? 'border-sanfran-rubi bg-sanfran-rubi/10 text-sanfran-rubi shadow-lg shadow-sanfran-rubi/10' : 'border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-white/2'}`}
                          >
                            <Icon size={24} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cor de Destaque</label>
                    <div className="grid grid-cols-6 gap-3">
                      {['#005594', '#8B0000', '#D4AF37', '#059669', '#6366f1', '#ec4899', '#f97316', '#14b8a6', '#8b5cf6', '#f43f5e', '#10b981', '#71717a'].map(color => (
                        <button
                          key={color}
                          onClick={() => setEditingFrontier(prev => ({ ...prev, color }))}
                          className={`w-full aspect-square rounded-xl border-4 transition-all ${editingFrontier?.color === color ? 'border-white dark:border-slate-800 ring-2 ring-sanfran-rubi scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
                <button 
                  onClick={handleSaveFrontier}
                  disabled={!editingFrontier?.name}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <Check size={20} />
                  Salvar Fronteira
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SUBJECT ASSIGNMENT */}
      <AnimatePresence>
        {isSubjectModalOpen && selectedFrontierForSubjects && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubjectModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Colonizar Disciplinas</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selecione as matérias desta fronteira</p>
                  </div>
                  <button onClick={() => setIsSubjectModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar disciplina..."
                    value={subjectSearchTerm}
                    onChange={(e) => setSubjectSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-2xl pl-12 pr-6 py-4 font-bold text-slate-900 dark:text-white outline-none focus:border-sanfran-rubi transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-3">
                {subjects
                  .filter(s => s.name.toLowerCase().includes(subjectSearchTerm.toLowerCase()))
                  .map(sub => {
                  const currentFrontier = customFrontiers.find(f => f.id === selectedFrontierForSubjects);
                  const isSelected = currentFrontier?.subject_ids.includes(sub.id);
                  const assignedTo = customFrontiers.find(f => f.id !== selectedFrontierForSubjects && f.subject_ids.includes(sub.id));

                  return (
                    <button
                      key={sub.id}
                      onClick={() => toggleSubjectInFrontier(sub.id, selectedFrontierForSubjects)}
                      className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${isSelected ? 'border-sanfran-rubi bg-sanfran-rubi/5' : 'border-slate-100 dark:border-white/5 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sub.color }} />
                        <div className="text-left">
                          <p className="font-black text-slate-900 dark:text-white uppercase text-sm">{sub.name}</p>
                          {assignedTo && (
                            <p className="text-[9px] font-bold text-amber-600 uppercase">Atribuída a: {assignedTo.name}</p>
                          )}
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-sanfran-rubi text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-300'}`}>
                        {isSelected ? <Check size={16} /> : <Plus size={16} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                <button 
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                >
                  Concluir Atribuição
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: TOPIC MANAGEMENT */}
      <AnimatePresence>
        {isTopicModalOpen && selectedSubjectForTopics && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTopicModalOpen(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedSubjectForTopics.color }} />
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{selectedSubjectForTopics.name}</h3>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ementa e Cobertura de Conteúdo</p>
                </div>
                <button onClick={() => setIsTopicModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {(!selectedSubjectForTopics.topics || selectedSubjectForTopics.topics.length === 0) ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-full">
                      <Sparkles className="w-12 h-12 text-sanfran-rubi animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-black uppercase text-slate-900 dark:text-white">Ementa não definida</h4>
                      <p className="text-sm text-slate-500 max-w-xs">Você ainda não definiu os tópicos desta matéria. Use nossa IA para gerar uma ementa padrão baseada no currículo jurídico.</p>
                    </div>
                    <button 
                      onClick={() => generateTopicsWithAI(selectedSubjectForTopics)}
                      disabled={isGeneratingTopics}
                      className="flex items-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {isGeneratingTopics ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      Gerar Ementa com IA
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="text-sanfran-rubi" size={20} />
                        <span className="text-sm font-black uppercase text-slate-900 dark:text-white">Progresso de Conteúdo</span>
                      </div>
                      <span className="text-lg font-black text-sanfran-rubi">
                        {Math.round((selectedSubjectForTopics.topics.filter(t => t.completed).length / selectedSubjectForTopics.topics.length) * 100)}%
                      </span>
                    </div>

                    <div className="grid gap-3">
                      {selectedSubjectForTopics.topics.map(topic => (
                        <button
                          key={topic.id}
                          onClick={() => toggleTopicCompletion(selectedSubjectForTopics.id, topic.id)}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${topic.completed ? 'border-sanfran-rubi bg-sanfran-rubi/5' : 'border-slate-100 dark:border-white/5 hover:border-slate-200'}`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${topic.completed ? 'bg-sanfran-rubi text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-300'}`}>
                            {topic.completed && <Check size={14} />}
                          </div>
                          <span className={`text-sm font-bold uppercase ${topic.completed ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                            {topic.title}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => generateTopicsWithAI(selectedSubjectForTopics)}
                      disabled={isGeneratingTopics}
                      className="w-full mt-8 flex items-center justify-center gap-3 py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:border-sanfran-rubi hover:text-sanfran-rubi transition-all font-bold uppercase text-xs"
                    >
                      {isGeneratingTopics ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      Regerar Ementa com IA
                    </button>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                <button 
                  onClick={() => setIsTopicModalOpen(false)}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                >
                  Fechar Ementa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DominioJuridico;
