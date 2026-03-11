import React, { useState, useEffect, useRef } from 'react';
import { Task, Subject, Board, BoardColumn, SubTask, StudySession, UserProfile, TaskPriority, TaskCategory, Notification, Friendship } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  Send, Loader2, Sparkles, User as UserIcon, Bot, CheckCircle2, 
  Plus, Layout, List, MoreVertical, Trash2, CheckSquare, 
  Clock, Paperclip, ChevronRight, X, Calendar, AlertCircle,
  Play, Pause, RotateCcw, Save, Quote, ThumbsUp, ExternalLink, Link as LinkIcon, Globe, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { dataService } from '../services/dataService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  options?: string[];
}

interface TaskMasterDetailProps {
  tasks: Task[];
  subjects: Subject[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  boards: Board[];
  setBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  studySessions: StudySession[];
  setStudySessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  userId: string;
  isOnline: boolean;
}

const TaskMasterDetail: React.FC<TaskMasterDetailProps> = ({ 
  tasks, subjects, setTasks, boards, setBoards, 
  studySessions, setStudySessions, userId, isOnline 
}) => {
  // --- View State ---
  const [activeTab, setActiveTab] = useState<string>('Geral');
  const [filter, setFilter] = useState<'all' | 'today' | 'tomorrow' | 'overdue' | 'high'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [splitScreenUrl, setSplitScreenUrl] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [quickEntryInput, setQuickEntryInput] = useState('');
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<Friendship[]>([]);

  // Mark all as read when closing notifications
  useEffect(() => {
    if (!showNotifications && notifications.some(n => !n.is_read)) {
      dataService.markAllNotificationsAsRead(userId).then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      });
    }
  }, [showNotifications, userId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    // Handle Tab Switch (Dropping on a tab)
    if (TABS.includes(over.id as string)) {
      const taskId = active.id as string;
      const newCategory = over.id as string;
      
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const updatedTask = { ...task, category: newCategory as any };
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        await dataService.saveTask(updatedTask, userId, isOnline);
      }
      return;
    }

    // Handle Reordering
    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newTasks = arrayMove(tasks, oldIndex, newIndex);
        setTasks(newTasks);
        // In a real app, we'd save the new order to the DB
      }
    }
  };

  const TABS = ['Geral', 'Leituras', 'Gestão/Entidades', ...boards.map(b => b.name)];

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  // --- Onboarding State ---
  const [showOnboarding, setShowOnboarding] = useState(boards.length === 0);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Fala, sanfrancano(a)! Bem-vindo(a) à sua nova área de tarefas. Para eu não te dar uma lista chata e genérica, vamos a um rápido diagnóstico das Arcadas.",
      options: ["Calouro tentando entender tudo", "Intermediário afogado em textos", "Veterano na luta com Estágio/TCC/OAB"]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleNLPAddTask = async (text: string) => {
    if (!text.trim()) return;

    let title = text;
    let priority: TaskPriority = 'normal';
    let category: TaskCategory = 'geral';
    let dueDate = '';
    let delegatedTo = '';
    let delegatedToName = '';

    // Parse Priority (!)
    const priorityMatch = title.match(/!(\w+)/);
    if (priorityMatch) {
      const p = priorityMatch[1].toLowerCase();
      if (['baixa', 'media', 'alta', 'urgente'].includes(p)) {
        priority = p as TaskPriority;
        title = title.replace(priorityMatch[0], '');
      }
    }

    // Parse Category (#)
    const categoryMatch = title.match(/#(\w+)/);
    if (categoryMatch) {
      const c = categoryMatch[1].toLowerCase();
      if (c.includes('leitura')) category = 'estudo';
      else if (c.includes('gest') || c.includes('entidade')) category = 'admin';
      else category = 'geral';
      title = title.replace(categoryMatch[0], '');
    }

    // Parse Delegation (@)
    const mentionMatch = title.match(/@(\w+)/);
    if (mentionMatch) {
      const friendName = mentionMatch[1].toLowerCase();
      const friend = friends.find(f => f.friend_name?.toLowerCase().includes(friendName));
      if (friend) {
        delegatedTo = friend.friend_id;
        delegatedToName = friend.friend_name;
        title = title.replace(mentionMatch[0], '');
      }
    }

    // Parse Date (simple)
    if (title.toLowerCase().includes('amanhã')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0];
      title = title.replace(/amanhã/gi, '');
    } else if (title.toLowerCase().includes('hoje')) {
      dueDate = new Date().toISOString().split('T')[0];
      title = title.replace(/hoje/gi, '');
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      category,
      priority,
      completed: false,
      subtasks: [],
      notes: '',
      links: [],
      dueDate,
      delegatedTo,
      delegatedToName,
      delegatedBy: userId,
      delegatedByName: userProfile.answers?.['nome'] || 'Você',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;

    setTasks(prev => [newTask, ...prev]);
    setQuickEntryInput('');
    await dataService.saveTask(newTask, userId, isOnline);

    if (delegatedTo) {
      // Create notification for friend
      await dataService.createNotification(
        delegatedTo,
        `${userProfile.answers?.['nome'] || 'Você'} te atribuiu a tarefa: '${newTask.title}'`,
        newTask.id,
        'delegated'
      );
    }
  };

  const handleArchiveCompleted = async () => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return;

    try {
      await dataService.archiveTasks(userId, isOnline);
      setTasks(prev => prev.filter(t => !t.completed));
      setSelectedTaskId(null);
    } catch (error) {
      console.error("Failed to archive tasks:", error);
    }
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '',
    archetype: 'Calouro',
    answers: {},
    answeredQuestionIds: [],
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
    arcadia_score: 0,
    lastInteractionDate: '',
    productivityStats: {
      completedToday: 0,
      completedYesterday: 0,
      streak: 0
    }
  });
  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);
  const [showReward, setShowReward] = useState<string | null>(null);
  const [aiTone, setAiTone] = useState<{ name: string; prefix: string; style: string }>({
    name: "Equilibrado",
    prefix: "Júnior, papo rápido:",
    style: "font-sans"
  });

  useEffect(() => {
    const { social, corporativo } = userProfile.scores;
    const { extensaoVsCarreira, socialVsReservado } = userProfile.matrix;

    if (corporativo > 5 || extensaoVsCarreira > 2) {
      setAiTone({
        name: "Executivo",
        prefix: "Júnior, direto ao ponto:",
        style: "font-sans font-bold uppercase tracking-tighter"
      });
    } else if (social > 5 || socialVsReservado < -2) {
      setAiTone({
        name: "Descontraído",
        prefix: "E aí, Júnior! Papo rápido:",
        style: "font-sans italic"
      });
    } else {
      setAiTone({
        name: "Equilibrado",
        prefix: "Júnior, papo rápido:",
        style: "font-sans"
      });
    }
  }, [userProfile]);

  useEffect(() => {
    const fetchColabData = async () => {
      const [friendsData, notificationsData] = await Promise.all([
        dataService.getFriends(userId),
        dataService.getNotifications(userId)
      ]);
      setFriends(friendsData);
      setNotifications(notificationsData);
    };
    if (userId) fetchColabData();
  }, [userId]);

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await dataService.getUserProfile(userId, isOnline);
      if (profile) {
        // Ensure scores exist for legacy profiles
        const scores = profile.scores || {
          social: 0,
          corporativo: 0,
          academico: 0,
          politico: 0,
          resiliencia: 0,
          tecnologico: 0
        };
        const matrix = profile.matrix || {
          academicoVsPratico: 0,
          extensaoVsCarreira: 0,
          socialVsReservado: 0,
          urgenciaVsPlanejamento: 0
        };
        const tags = profile.tags || [];
        const arcadia_score = profile.arcadia_score || 0;
        const lastInteractionDate = profile.lastInteractionDate || '';
        const productivityStats = profile.productivityStats || { completedToday: 0, completedYesterday: 0, streak: 0 };
        setUserProfile({ ...profile, scores, matrix, tags, arcadia_score, lastInteractionDate, productivityStats });
      }
    };
    loadProfile();
  }, [userId, isOnline]);

  const PROFILING_QUESTIONS = [
    // BLOCO A: ESTILO DE ESTUDO (ACADÊMICO)
    {
      id: 'study_style_music',
      block: 'A',
      trigger: (task: Task) => task.category === 'estudo' || task.title.toLowerCase().includes('leitura'),
      question: "Você prefere estudar ouvindo música/lo-fi ou silêncio absoluto?",
      options: [
        { label: "Música/Lo-fi", impact: { academico: 1, tecnologico: 1 } },
        { label: "Silêncio Absoluto", impact: { academico: 2 } }
      ],
      reward: (choice: string) => choice === "Música/Lo-fi" ? "Boa! Adicionei um link de uma playlist de foco da SanFran Academy nas suas notas." : "Entendido! Silêncio é fundamental para concentração profunda."
    },
    {
      id: 'study_style_visual',
      block: 'A',
      trigger: (task: Task) => task.category === 'estudo' || task.title.toLowerCase().includes('fichamento'),
      question: "Seus fichamentos são mais visuais (mapas mentais) ou textuais (tópicos)?",
      options: [
        { label: "Visuais", impact: { academico: 1, tecnologico: 1 } },
        { label: "Textuais", impact: { academico: 2 } }
      ],
      reward: (choice: string) => choice === "Visuais" ? "Entendido. Vou priorizar modelos de tarefas com checklists visuais para você." : "Perfeito. Tópicos ajudam muito na estruturação lógica do Direito."
    },
    {
      id: 'study_review_habit',
      block: 'A',
      trigger: (task: Task) => task.category === 'estudo',
      question: "Você costuma revisar a matéria logo após a aula ou deixa para o final de semana?",
      options: [
        { label: "Logo após", impact: { academico: 2, resiliencia: 1 } },
        { label: "Final de semana", impact: { academico: 1 } }
      ],
      reward: (choice: string) => choice === "Logo após" ? "Excelente hábito! A curva de esquecimento agradece." : "Entendido. Vou te ajudar a organizar maratonas de revisão no sábado!"
    },
    {
      id: 'study_format',
      block: 'A',
      trigger: (task: Task) => task.category === 'estudo' || task.title.toLowerCase().includes('leitura'),
      question: "Você prefere ler no tablet/computador ou imprimir o material?",
      options: [
        { label: "Digital", impact: { tecnologico: 2, academico: 1 } },
        { label: "Impresso", impact: { academico: 2 } }
      ],
      reward: (choice: string) => choice === "Digital" ? "Sustentável e prático! Posso te sugerir ferramentas de anotação PDF." : "Nada substitui o papel! Lembre-se de usar cores para destacar teses."
    },

    // BLOCO B: CARREIRA E POLÍTICA (CORPORATIVO / POLÍTICO)
    {
      id: 'career_path',
      block: 'B',
      trigger: (task: Task) => task.category === 'admin' || task.title.toLowerCase().includes('estágio') || task.title.toLowerCase().includes('entidade'),
      question: "Você pretende seguir carreira pública (concursos) ou advocacia privada?",
      options: [
        { label: "Pública", impact: { academico: 2, resiliencia: 1 } },
        { label: "Privada", impact: { corporativo: 2, social: 1 } }
      ],
      reward: (choice: string) => choice === "Pública" ? "Foco total! Vou destacar editais e simulados de concursos para você." : "Excelente! Vou focar em modelos de petições e gestão de escritório."
    },
    {
      id: 'xi_agosto_relation',
      block: 'B',
      trigger: (task: Task) => task.category === 'admin' || task.title.toLowerCase().includes('entidade'),
      question: "Qual sua relação com o CA XI de Agosto: participa ativamente, acompanha de longe ou ignora?",
      options: [
        { label: "Ativamente", impact: { politico: 2, social: 1 } },
        { label: "De longe", impact: { politico: 1 } },
        { label: "Ignoro", impact: { academico: 1 } }
      ],
      reward: (choice: string) => choice === "Ativamente" ? "O XI é a alma da SanFran! Sucesso na militância." : "Entendido. Focar no curso também é uma forma de honrar as Arcadas."
    },
    {
      id: 'career_type',
      block: 'B',
      trigger: (task: Task) => task.title.toLowerCase().includes('estágio') || task.category === 'admin',
      question: "Você já está estagiando? Se sim, em qual setor?",
      options: [
        { label: "Big Law", impact: { corporativo: 2, resiliencia: 1 } },
        { label: "Setor Público", impact: { politico: 1, academico: 1 } },
        { label: "Boutique", impact: { corporativo: 1, academico: 1 } },
        { label: "Não estagio", impact: { academico: 2 } }
      ],
      reward: (choice: string) => choice === "Não estagio" ? "Aproveite para focar na base acadêmica, ela é o seu diferencial." : `Interessante! O setor de ${choice} exige muito foco.`
    },

    // BLOCO C: VIVÊNCIA E SOBREVIVÊNCIA (SOCIAL / RESILIÊNCIA)
    {
      id: 'sanfran_social',
      block: 'C',
      trigger: (task: Task) => task.completed === true,
      question: "Você costuma frequentar as festas da SanFran ou prefere programas tranquilos fora do centro?",
      options: [
        { label: "Festas/Eventos", impact: { social: 2, politico: 1 } },
        { label: "Tranquilos", impact: { academico: 1, resiliencia: 1 } }
      ],
      reward: (choice: string) => choice === "Festas/Eventos" ? "A integração faz parte da formação! Aproveite o Pátio." : "Equilíbrio é tudo. O descanso fora do caos é vital."
    },
    {
      id: 'center_survival',
      block: 'C',
      trigger: (task: Task) => task.title.toLowerCase().includes('casa') || task.title.toLowerCase().includes('república') || task.completed === true,
      question: "Como você lida com a barulheira e o caos do Centro de SP para estudar?",
      options: [
        { label: "Fone Noise Cancelling", impact: { tecnologico: 2, resiliencia: 1 } },
        { label: "Já me acostumei", impact: { resiliencia: 2 } },
        { label: "Vou para a biblioteca", impact: { academico: 2 } }
      ],
      reward: (choice: string) => "Resiliência urbana é uma perícia necessária para quem vive no Largo!"
    },
    {
      id: 'routine_energy',
      block: 'C',
      trigger: (task: Task) => task.completed === true,
      question: "Geralmente, qual o horário que você sente que sua bateria social e mental acaba?",
      options: [
        { label: "Tarde", impact: { resiliencia: 1 } },
        { label: "Noite", impact: { resiliencia: 1 } },
        { label: "Madrugada", impact: { resiliencia: 2 } }
      ],
      reward: (choice: string) => `Entendido. Vou ajustar as sugestões de tarefas pesadas para antes das ${choice === 'Tarde' ? '14h' : choice === 'Noite' ? '18h' : '22h'}.`
    },

    // BLOCO D: TECNOLOGIA E FOCO (TECNOLÓGICO)
    {
      id: 'tech_distraction',
      block: 'D',
      trigger: (task: Task) => task.category === 'estudo' || task.completed === true,
      question: "Qual o app que mais rouba seu tempo quando você deveria estar lendo doutrina?",
      options: [
        { label: "Instagram/TikTok", impact: { social: 1 } },
        { label: "WhatsApp", impact: { social: 2 } },
        { label: "YouTube", impact: { tecnologico: 1 } },
        { label: "Nenhum/Foco Total", impact: { resiliencia: 2, academico: 1 } }
      ],
      reward: (choice: string) => choice === "Nenhum/Foco Total" ? "Impressionante! Você tem uma disciplina de ferro." : "O primeiro passo é identificar o ladrão de tempo. Vou te ajudar com o Pomodoro!"
    },
    {
      id: 'ai_usage',
      block: 'D',
      trigger: (task: Task) => task.category === 'peticao' || task.category === 'estudo',
      question: "Você gosta de usar IA para resumir textos ou prefere ter o controle total da leitura?",
      options: [
        { label: "Uso IA (Híbrido)", impact: { tecnologico: 2, corporativo: 1 } },
        { label: "Controle Total (Manual)", impact: { academico: 2, resiliencia: 1 } }
      ],
      reward: (choice: string) => choice === "Uso IA (Híbrido)" ? "Eficiência é a chave do Direito moderno!" : "A profundidade da leitura manual é insubstituível."
    },
    {
      id: 'arcadas_time',
      block: 'C',
      trigger: (task: Task) => true,
      question: "Você costuma usar o tempo livre nas Arcadas para networking no Pátio ou para focar na biblioteca?",
      options: [
        { label: "Pátio (Networking)", impact: { social: 2, politico: 1 } },
        { label: "Biblioteca (Foco)", impact: { academico: 2 } }
      ],
      reward: (choice: string) => choice === "Pátio (Networking)" ? "O Pátio é onde o Direito acontece na prática!" : "A biblioteca da SanFran é um templo do saber. Ótima escolha."
    },
    {
      id: 'housing_meals',
      block: 'C',
      trigger: (task: Task) => task.title.toLowerCase().includes('casa') || task.title.toLowerCase().includes('república'),
      question: "Você prefere cozinhar suas próprias refeições na Casa/República ou depende do Bandejão/Restaurantes?",
      options: [
        { label: "Cozinho", impact: { resiliencia: 2 } },
        { label: "Bandejão/Restaurante", impact: { social: 1 } }
      ],
      reward: (choice: string) => choice === "Cozinho" ? "Autonomia total! Cozinhar é uma ótima forma de descompressão." : "O Bandejão é o coração da convivência universitária."
    },
    {
      id: 'housing_mgmt',
      block: 'C',
      trigger: (task: Task) => task.title.toLowerCase().includes('casa') || task.title.toLowerCase().includes('república'),
      question: "Qual seu nível de envolvimento com a gestão da moradia: quer ajudar a organizar ou só quer paz para estudar?",
      options: [
        { label: "Ajudar/Organizar", impact: { politico: 2, social: 1 } },
        { label: "Paz para estudar", impact: { academico: 2, resiliencia: 1 } }
      ],
      reward: (choice: string) => choice === "Ajudar/Organizar" ? "Liderança nata! A comunidade agradece seu esforço." : "Foco é tudo. Respeitar seu espaço de estudo é prioridade."
    },
    {
      id: 'career_priority',
      block: 'B',
      trigger: (task: Task) => task.title.toLowerCase().includes('estágio') || task.category === 'admin',
      question: "Seu foco hoje é acumular currículo (experiência) ou você precisa priorizar o retorno financeiro (bolsas/auxílios)?",
      options: [
        { label: "Currículo/Exp", impact: { corporativo: 2, academico: 1 } },
        { label: "Financeiro/Bolsas", impact: { resiliencia: 2, politico: 1 } }
      ],
      reward: (choice: string) => "Entendido. Vou ajustar as recomendações de oportunidades para o seu perfil."
    },
    {
      id: 'entity_vs_class',
      block: 'B',
      trigger: (task: Task) => task.category === 'admin' || task.title.toLowerCase().includes('entidade'),
      question: "Quanto tempo do seu dia você dedica à sua Entidade (SanFran Jr., etc.) versus tempo de aula?",
      options: [
        { label: "Mais Entidade", impact: { corporativo: 2, social: 1 } },
        { label: "Equilibrado", impact: { resiliencia: 1, academico: 1 } },
        { label: "Mais Aula", impact: { academico: 2 } }
      ],
      reward: (choice: string) => choice === "Mais Entidade" ? "A prática na SanFran Jr. ensina o que os livros não dizem." : "Equilíbrio é a chave para uma formação sólida."
    },
    {
      id: 'browser_habits',
      block: 'D',
      trigger: (task: Task) => true,
      question: "Você é do tipo que acumula abas abertas no navegador ou é organizado com arquivos?",
      options: [
        { label: "Caos de Abas", impact: { tecnologico: 1, social: 1, urgenciaVsPlanejamento: -1 } },
        { label: "Organizado", impact: { tecnologico: 2, academico: 1, urgenciaVsPlanejamento: 1 } }
      ],
      reward: (choice: string) => choice === "Caos de Abas" ? "Cuidado com a sobrecarga cognitiva! Tente o OneTab." : "Organização digital é meio caminho andado para o sucesso."
    },
    // BLOCO E: MINDSET JURÍDICO (ACADÊMICO VS PRÁTICO)
    {
      id: 'legal_mindset_propedeutica',
      block: 'E',
      trigger: (task: Task) => task.category === 'estudo',
      question: "Você prefere as matérias de propedêutica (Filosofia, Sociologia, História) ou o 'Direito Civil na veia'?",
      options: [
        { label: "Propedêutica", impact: { academico: 2, academicoVsPratico: -2 } },
        { label: "Direito Civil", impact: { corporativo: 1, academicoVsPratico: 2 } }
      ],
      reward: (choice: string) => choice === "Propedêutica" ? "A base humanista é o que diferencia um jurista de um técnico." : "O Direito Civil é a espinha dorsal da advocacia privada!"
    },
    {
      id: 'legal_mindset_focus',
      block: 'E',
      trigger: (task: Task) => task.category === 'peticao' || task.category === 'estudo',
      question: "Quando estuda um caso, você foca mais na letra fria da lei ou na justiça social da decisão?",
      options: [
        { label: "Letra da Lei", impact: { academico: 1, academicoVsPratico: 1 } },
        { label: "Justiça Social", impact: { politico: 1, academicoVsPratico: -1 } }
      ],
      reward: (choice: string) => "Interessante. Essa visão molda seu estilo de argumentação jurídica."
    },
    {
      id: 'legal_mindset_skill',
      block: 'E',
      trigger: (task: Task) => task.category === 'audiencia' || task.category === 'peticao',
      question: "Você tem facilidade com a escrita jurídica ou prefere a sustentação oral e o debate?",
      options: [
        { label: "Escrita", impact: { academico: 1, academicoVsPratico: -1 } },
        { label: "Oral/Debate", impact: { social: 1, academicoVsPratico: 1 } }
      ],
      reward: (choice: string) => choice === "Escrita" ? "A escrita é a arma silenciosa do advogado." : "A oratória é um dom valioso nas Arcadas!"
    },
    {
      id: 'legal_mindset_exchange',
      block: 'E',
      trigger: (task: Task) => true,
      question: "Já pensou em fazer intercâmbio ou dupla titulação pela USP?",
      options: [
        { label: "Sim, pretendo", impact: { academico: 1, tecnologico: 1, extensaoVsCarreira: -1 } },
        { label: "Não/Foco aqui", impact: { corporativo: 1, extensaoVsCarreira: 1 } }
      ],
      reward: (choice: string) => choice === "Sim, pretendo" ? "A USP tem convênios incríveis! Comece a olhar os editais da CRInt." : "Focar no mercado nacional também é uma estratégia sólida."
    },
    // BLOCO F: GESTÃO DE CRISES E PERMANÊNCIA (RESILIÊNCIA)
    {
      id: 'crisis_mgmt_income',
      block: 'F',
      trigger: (task: Task) => task.category === 'admin' || task.title.toLowerCase().includes('casa'),
      question: "Você depende exclusivamente de bolsas (PAPFE, Adote) ou tem outra fonte de renda/apoio familiar?",
      options: [
        { label: "Bolsas/Auxílios", impact: { resiliencia: 2, politico: 1 } },
        { label: "Outros/Apoio", impact: { social: 1 } }
      ],
      reward: (choice: string) => "Entendido. A permanência estudantil é uma luta constante e vital."
    },
    {
      id: 'crisis_mgmt_anxiety',
      block: 'F',
      trigger: (task: Task) => task.priority === 'urgente' || task.completed === true,
      question: "Como está o seu nível de ansiedade com o semestre agora: Sob controle, Alerta ou 'Socorro'?",
      options: [
        { label: "Sob controle", impact: { resiliencia: 1, urgenciaVsPlanejamento: 1 } },
        { label: "Alerta", impact: { urgenciaVsPlanejamento: -1 } },
        { label: "Socorro", impact: { resiliencia: -1, urgenciaVsPlanejamento: -2 } }
      ],
      reward: (choice: string) => choice === "Socorro" ? "Calma! Vamos quebrar essas tarefas em passos minúsculos hoje." : "Mantenha o ritmo, você está indo bem."
    },
    {
      id: 'crisis_mgmt_space',
      block: 'F',
      trigger: (task: Task) => task.title.toLowerCase().includes('casa') || task.title.toLowerCase().includes('quarto'),
      question: "Você consegue separar bem o ambiente de descanso (quarto) do ambiente de estudo?",
      options: [
        { label: "Sim, separo", impact: { resiliencia: 1, urgenciaVsPlanejamento: 1 } },
        { label: "Não, é misturado", impact: { resiliencia: -1, urgenciaVsPlanejamento: -1 } }
      ],
      reward: (choice: string) => choice === "Sim, separo" ? "Isso ajuda muito na higiene mental!" : "Tente criar um 'ritual' para sinalizar ao cérebro quando o estudo começa."
    },
    // BLOCO G: NETWORKING E PODER (SOCIAL / POLÍTICO)
    {
      id: 'networking_meetings',
      block: 'G',
      trigger: (task: Task) => task.category === 'admin' || task.title.toLowerCase().includes('reunião'),
      question: "Você costuma frequentar as reuniões de departamento e conselhos da faculdade?",
      options: [
        { label: "Sim, participo", impact: { politico: 2, social: 1, extensaoVsCarreira: -1 } },
        { label: "Não/Raramente", impact: { academico: 1, extensaoVsCarreira: 1 } }
      ],
      reward: (choice: string) => "A política universitária é o primeiro passo para grandes lideranças."
    },
    {
      id: 'networking_asset',
      block: 'G',
      trigger: (task: Task) => task.title.toLowerCase().includes('entidade') || task.title.toLowerCase().includes('xi'),
      question: "Sente que sua rede de contatos na SanFran Jr. ou no XI é seu maior ativo hoje?",
      options: [
        { label: "Sim, com certeza", impact: { social: 2, corporativo: 1, extensaoVsCarreira: -1 } },
        { label: "Mais ou menos", impact: { social: 1 } },
        { label: "Não/Foco técnico", impact: { academico: 2, extensaoVsCarreira: 1 } }
      ],
      reward: (choice: string) => "O capital social nas Arcadas é algo que você leva para a vida toda."
    },
    {
      id: 'networking_mentorship',
      block: 'G',
      trigger: (task: Task) => task.title.toLowerCase().includes('mentor') || task.title.toLowerCase().includes('calouro'),
      question: "Você prefere mentorar os calouros ou prefere buscar mentoria com os veteranos e antigos alunos (Alumni)?",
      options: [
        { label: "Mentorar Calouros", impact: { social: 2, politico: 1 } },
        { label: "Buscar Mentoria", impact: { corporativo: 2, social: 1 } }
      ],
      reward: (choice: string) => choice === "Mentorar Calouros" ? "Ensinar é a melhor forma de aprender!" : "Aprender com quem já trilhou o caminho é um atalho valioso."
    },
    // BLOCO H: HÁBITOS NOTURNOS VS DIURNOS (RESILIÊNCIA / TECNOLÓGICO)
    {
      id: 'habits_peak_time',
      block: 'H',
      trigger: (task: Task) => true,
      question: "Sua mente funciona melhor após o sol se pôr ou você é o primeiro a chegar nas Arcadas?",
      options: [
        { label: "Noturno", impact: { resiliencia: 1, socialVsReservado: 1 } },
        { label: "Diurno", impact: { resiliencia: 1, socialVsReservado: -1 } }
      ],
      reward: (choice: string) => choice === "Noturno" ? "As madrugadas no Centro têm um silêncio produtivo único." : "O sol das 8h no Pátio dá uma energia renovadora!"
    },
    {
      id: 'habits_caffeine',
      block: 'H',
      trigger: (task: Task) => true,
      question: "Quantas xícaras de café (ou energéticos) são necessárias para o seu dia começar de verdade?",
      options: [
        { label: "0-1 (Natural)", impact: { resiliencia: 2 } },
        { label: "2-4 (Moderado)", impact: { resiliencia: 1 } },
        { label: "5+ (Viciado)", impact: { resiliencia: -1 } }
      ],
      reward: (choice: string) => "Cuidado com o estômago! Mas entendemos, a rotina é pesada."
    },
    {
      id: 'habits_morning_ritual',
      block: 'H',
      trigger: (task: Task) => true,
      question: "O que você faz nos primeiros 15 minutos depois que acorda?",
      options: [
        { label: "Celular/Notícias", impact: { tecnologico: 1, urgenciaVsPlanejamento: -1 } },
        { label: "Café/Meditação", impact: { resiliencia: 2, urgenciaVsPlanejamento: 1 } },
        { label: "Banho/Correria", impact: { resiliencia: 1, urgenciaVsPlanejamento: -1 } }
      ],
      reward: (choice: string) => "Como você começa o dia dita o ritmo de tudo o que vem depois."
    },
    // BLOCO I: CAMINHO DAS PEDRAS (OAB E CARREIRA PÚBLICA)
    {
      id: 'career_path_goal',
      block: 'I',
      trigger: (task: Task) => task.title.toLowerCase().includes('veterano') || task.title.toLowerCase().includes('oab') || task.title.toLowerCase().includes('tcc'),
      question: "Seu foco para o pós-SanFran é a advocacia privada ou o 'sonho' da magistratura/ministério público?",
      options: [
        { label: "Advocacia Privada", tag: "Foco: Privado", impact: { corporativo: 2, extensaoVsCarreira: 2 } },
        { label: "Magistratura/MP", tag: "Foco: Público", impact: { academico: 2, extensaoVsCarreira: -2 } }
      ],
      reward: (choice: string) => choice === "Advocacia Privada" ? "O mercado de SP é vibrante. Vamos focar em networking!" : "Carreira de Estado exige fôlego e muita Lei Seca."
    },
    {
      id: 'oab_timing',
      block: 'I',
      trigger: (task: Task) => task.title.toLowerCase().includes('oab') || task.title.toLowerCase().includes('tcc'),
      question: "Você pretende fazer a prova da OAB já no 9º semestre ou vai focar primeiro em terminar o TCC?",
      options: [
        { label: "OAB no 9º", tag: "OAB Antecipada", impact: { resiliencia: 2, urgenciaVsPlanejamento: -1 } },
        { label: "Focar no TCC", tag: "Foco TCC", impact: { academico: 2, urgenciaVsPlanejamento: 1 } }
      ],
      reward: (choice: string) => choice === "OAB no 9º" ? "Corajoso! Vamos organizar um cronograma intenso." : "Sábia decisão. Um TCC bem feito abre portas acadêmicas."
    },
    {
      id: 'exam_prep_style',
      block: 'I',
      trigger: (task: Task) => task.title.toLowerCase().includes('oab') || task.category === 'estudo',
      question: "Como você prefere se preparar para exames: cursinhos tradicionais, resolvendo questões ou lei seca?",
      options: [
        { label: "Cursinhos", tag: "Estilo: Cursinho", impact: { social: 1, academicoVsPratico: 1 } },
        { label: "Questões", tag: "Estilo: Prático", impact: { tecnologico: 2, academicoVsPratico: 2 } },
        { label: "Lei Seca", tag: "Estilo: Teórico", impact: { academico: 2, academicoVsPratico: -2 } }
      ],
      reward: (choice: string) => "Entendido. Vou priorizar materiais que combinem com seu método."
    },
    {
      id: 'academic_future',
      block: 'I',
      trigger: (task: Task) => task.title.toLowerCase().includes('tcc') || task.category === 'estudo',
      question: "Você tem interesse em seguir na vida acadêmica (Mestrado/Doutorado) logo após a graduação?",
      options: [
        { label: "Sim, pretendo", tag: "Perfil Acadêmico", impact: { academico: 2, extensaoVsCarreira: -2 } },
        { label: "Não/Mercado", tag: "Perfil Corporativo", impact: { corporativo: 2, extensaoVsCarreira: 2 } }
      ],
      reward: (choice: string) => choice === "Sim, pretendo" ? "As Arcadas são o berço da doutrina nacional. Excelente!" : "O mercado jurídico de SP valoriza muito a experiência prática."
    },
    // BLOCO J: GESTÃO DE TEMPO E ENERGIA
    {
      id: 'time_mgmt_window',
      block: 'J',
      trigger: (task: Task) => true,
      question: "Quando você tem uma janela livre entre aulas, você prefere 'matar' tarefas rápidas ou descansar no Pátio?",
      options: [
        { label: "Matar Tarefas", tag: "Produtividade Ativa", impact: { resiliencia: 1, urgenciaVsPlanejamento: 2 } },
        { label: "Descansar/Pátio", tag: "Networking/Descanso", impact: { social: 2, urgenciaVsPlanejamento: -1 } }
      ],
      reward: (choice: string) => choice === "Matar Tarefas" ? "Foco total! Isso libera suas noites." : "O descanso também é produtivo. O Pátio é essencial."
    },
    {
      id: 'exam_week_strategy',
      block: 'J',
      trigger: (task: Task) => task.priority === 'urgente' || task.category === 'estudo',
      question: "Qual sua estratégia para semanas de prova: vira noites estudando ou tenta manter a rotina regular?",
      options: [
        { label: "Vira Noites", tag: "Estilo: Sprint", impact: { resiliencia: 2, urgenciaVsPlanejamento: -2 } },
        { label: "Rotina Regular", tag: "Estilo: Consistente", impact: { resiliencia: 1, urgenciaVsPlanejamento: 2 } }
      ],
      reward: (choice: string) => choice === "Vira Noites" ? "Haja café! Mas cuidado com o burnout." : "Consistência é o segredo dos grandes doutrinadores."
    },
    {
      id: 'weather_impact',
      block: 'J',
      trigger: (task: Task) => true,
      question: "Você sente que sua produtividade cai muito em dias chuvosos/frios em São Paulo?",
      options: [
        { label: "Sim, cai muito", tag: "Sensível ao Clima", impact: { resiliencia: -1 } },
        { label: "Não me afeta", tag: "Resiliente ao Clima", impact: { resiliencia: 2 } }
      ],
      reward: (choice: string) => choice === "Sim, cai muito" ? "O Centro cinza pode ser duro. Tente uma luz quente no estudo." : "Resiliência paulistana! Nada te para."
    },
    {
      id: 'burnout_limit',
      block: 'J',
      trigger: (task: Task) => true,
      question: "Quantos projetos você consegue tocar ao mesmo tempo antes de sentir o 'burnout' chegando?",
      options: [
        { label: "1-2 (Foco Único)", tag: "Foco Profundo", impact: { academico: 1 } },
        { label: "3-5 (Multitask)", tag: "Multitarefa", impact: { social: 1, corporativo: 1 } },
        { label: "6+ (Caos)", tag: "High Energy", impact: { resiliencia: 2, politico: 1 } }
      ],
      reward: (choice: string) => "Conhecer seu limite é a maior soft skill que existe."
    },
    // BLOCO K: SOFT SKILLS & ORATÓRIA
    {
      id: 'soft_skills_oratory',
      block: 'K',
      trigger: (task: Task) => task.title.toLowerCase().includes('seminário') || task.title.toLowerCase().includes('extensão') || task.category === 'audiencia',
      question: "Como você avalia sua oratória hoje: fala com naturalidade ou o coração dispara no seminário?",
      options: [
        { label: "Naturalidade", tag: "Oratória: Natural", impact: { social: 2, socialVsReservado: -2 } },
        { label: "Coração Dispara", tag: "Oratória: Em Treino", impact: { resiliencia: 1, socialVsReservado: 2 } }
      ],
      reward: (choice: string) => choice === "Naturalidade" ? "Você tem o dom da tribuna!" : "Normal! Até os grandes juristas começaram assim."
    },
    {
      id: 'soft_skills_leadership',
      block: 'K',
      trigger: (task: Task) => task.title.toLowerCase().includes('trabalho') || task.title.toLowerCase().includes('entidade'),
      question: "Você gosta de liderar equipes ou prefere ser o 'executor de elite' que entrega tudo pronto?",
      options: [
        { label: "Liderar", tag: "Perfil: Líder", impact: { politico: 2, social: 1 } },
        { label: "Executor", tag: "Perfil: Executor", impact: { academico: 2, resiliencia: 1 } }
      ],
      reward: (choice: string) => choice === "Liderar" ? "Liderança nas Arcadas é escola de vida." : "Executores de elite são a base de qualquer grande escritório."
    },
    {
      id: 'soft_skills_conflict',
      block: 'K',
      trigger: (task: Task) => task.title.toLowerCase().includes('casa') || task.title.toLowerCase().includes('república') || task.title.toLowerCase().includes('grupo'),
      question: "Qual sua facilidade em lidar com conflitos internos em grupos ou na gestão da moradia?",
      options: [
        { label: "Mediador", tag: "Habilidade: Mediação", impact: { social: 2, politico: 1 } },
        { label: "Evito Conflitos", tag: "Habilidade: Foco", impact: { resiliencia: 1 } },
        { label: "Direto/Incisivo", tag: "Habilidade: Assertivo", impact: { corporativo: 1, politico: 1 } }
      ],
      reward: (choice: string) => "Mediação é o futuro da resolução de conflitos no Direito."
    },
    {
      id: 'soft_skills_tips',
      block: 'K',
      trigger: (task: Task) => true,
      question: "Você gostaria de receber dicas de oratória e postura profissional integradas às suas tarefas?",
      options: [
        { label: "Sim, por favor", tag: "Interesse: Soft Skills", impact: { tecnologico: 1 } },
        { label: "Não, foco técnico", tag: "Interesse: Hard Skills", impact: { academico: 1 } }
      ],
      reward: (choice: string) => "Anotado. Vou injetar insights de postura nas suas tarefas de audiência."
    },
    // BLOCO L: TRADIÇÃO E PATRIMÔNIO
    {
      id: 'tradition_pride',
      block: 'L',
      trigger: (task: Task) => true,
      question: "Você sente orgulho em participar das tradições (Peruada, lendas) ou foca no lado técnico?",
      options: [
        { label: "Orgulho/Tradição", tag: "Espírito Sanfrancano", impact: { social: 2, politico: 1 } },
        { label: "Foco Técnico", tag: "Perfil Técnico", impact: { academico: 2, corporativo: 1 } }
      ],
      reward: (choice: string) => choice === "Orgulho/Tradição" ? "As Arcadas são feitas de história. Você faz parte dela." : "O rigor técnico é o que mantém o prestígio da nossa casa."
    },
    {
      id: 'tradition_spot',
      block: 'L',
      trigger: (task: Task) => task.category === 'estudo' || task.title.toLowerCase().includes('leitura'),
      question: "Qual seu lugar favorito para produzir: Biblioteca da Faculdade, SanFran Jr., Casa ou Café?",
      options: [
        { label: "Biblioteca Fac.", tag: "Local: Biblioteca", impact: { academico: 2, socialVsReservado: 2 } },
        { label: "SanFran Jr.", tag: "Local: Entidade", impact: { corporativo: 2, socialVsReservado: -1 } },
        { label: "Casa/Moradia", tag: "Local: Casa", impact: { resiliencia: 2, socialVsReservado: 2 } },
        { label: "Café do Centro", tag: "Local: Urbano", impact: { social: 1, tecnologico: 1, socialVsReservado: -2 } }
      ],
      reward: (choice: string) => "Cada canto do Largo tem uma energia diferente para o estudo."
    },
    {
      id: 'tradition_title',
      block: 'L',
      trigger: (task: Task) => true,
      question: "O que o título de 'Antigo Aluno das Arcadas' significa para o seu futuro?",
      options: [
        { label: "Poder/Networking", tag: "Visão: Capital Social", impact: { social: 2, corporativo: 2 } },
        { label: "Responsabilidade", tag: "Visão: Ética/Dever", impact: { academico: 1, politico: 2 } },
        { label: "Apenas um Título", tag: "Visão: Pragmática", impact: { resiliencia: 1, corporativo: 1 } }
      ],
      reward: (choice: string) => "Ser Sanfrancano é um compromisso que dura a vida inteira."
    }
  ];

  useEffect(() => {
    if (selectedTask && !activeQuestion) {
      const today = new Date().toISOString().split('T')[0];
      if (userProfile.lastQuestionDate === today) return;

      const question = PROFILING_QUESTIONS.find(q => 
        !userProfile.answeredQuestionIds.includes(q.id) && q.trigger(selectedTask)
      );

      if (question) {
        setActiveQuestion(question);
      }
    }
  }, [selectedTaskId, userProfile, tasks]);

  const handleAnswerQuestion = async (questionId: string, answerLabel: string) => {
    const question = PROFILING_QUESTIONS.find(q => q.id === questionId);
    if (!question) return;

    const option = question.options.find((opt: any) => opt.label === answerLabel);
    if (!option) return;

    const newAnswers = { ...userProfile.answers, [questionId]: answerLabel };
    const newAnsweredIds = [...userProfile.answeredQuestionIds, questionId];
    const newTags = [...(userProfile.tags || [])];
    if ((option as any).tag && !newTags.includes((option as any).tag)) {
      newTags.push((option as any).tag);
    }
    
    // Update Scores
    const newScores = { ...userProfile.scores };
    const newMatrix = { ...userProfile.matrix };

    if (option.impact) {
      Object.entries(option.impact).forEach(([key, value]) => {
        if (key in newScores) {
          (newScores as any)[key] += value;
        }
        if (key in newMatrix) {
          (newMatrix as any)[key] += value;
        }
      });
    }

    let newArchetype = userProfile.archetype;
    if (newAnsweredIds.length >= 3) {
      const { academico, corporativo, social, politico, resiliencia, tecnologico } = newScores;
      
      if (tecnologico > 5 && academico > 3) newArchetype = 'Jurista Tech';
      else if (politico > 5 && social > 3) newArchetype = 'Liderança das Arcadas';
      else if (corporativo > 5 && resiliencia > 3) newArchetype = 'Tubarão da Faria Lima';
      else if (academico > 5 && resiliencia > 3) newArchetype = 'Doutrinador Resiliente';
      else if (social > 5 && politico > 3) newArchetype = 'Agitador do Pátio';
      else if (resiliencia > 5 && academico > 3) newArchetype = 'Sobrevivente do Centro';
      else if (tecnologico > 4 && corporativo > 4) newArchetype = 'Inovador Corporativo';
      else if (newAnswers['career_path'] === 'Pública') newArchetype = 'Concurseiro Focado';
    }

    const newArcadiaScore = Math.min(100, Math.round((newAnsweredIds.length / PROFILING_QUESTIONS.length) * 100));

    const updatedProfile: UserProfile = {
      ...userProfile,
      answers: newAnswers,
      answeredQuestionIds: newAnsweredIds,
      lastQuestionDate: new Date().toISOString().split('T')[0],
      archetype: newArchetype,
      scores: newScores,
      matrix: newMatrix,
      tags: newTags,
      arcadia_score: newArcadiaScore
    };

    setUserProfile(updatedProfile);
    setActiveQuestion(null);
    setShowReward(question.reward(answerLabel));
    
    // Auto-apply reward logic
    if (questionId === 'study_style_music' && answerLabel === 'Música/Lo-fi' && selectedTask) {
      const updatedNotes = (selectedTask.notes || '') + "\n\n🎵 Playlist de Foco: https://open.spotify.com/playlist/37i9dQZF1DWZqdYmS90mSg";
      handleUpdateTask({ notes: updatedNotes });
    }

    await dataService.saveUserProfile(updatedProfile, userId, isOnline);
    
    // Hide reward after 5 seconds
    setTimeout(() => setShowReward(null), 5000);
  };

  // Continuous Interaction Logic: Daily Check-in
  useEffect(() => {
    if (userProfile.id && !showOnboarding) {
      const today = new Date().toISOString().split('T')[0];
      if (userProfile.lastInteractionDate !== today) {
        // Trigger Daily Check-in
        const checkInMessage = userProfile.arcadia_score > 80 
          ? "Bom dia! Vamos planejar as Arcadas hoje? Vi seu progresso recente..."
          : "Bom dia! Que tal continuarmos seu perfilamento para eu te ajudar melhor hoje?";
        
        handleAssistantSend(checkInMessage);
        
        // Update last interaction date and productivity stats
        const newStats = {
          completedYesterday: userProfile.productivityStats?.completedToday || 0,
          completedToday: 0,
          streak: (userProfile.productivityStats?.completedToday || 0) > 0 
            ? (userProfile.productivityStats?.streak || 0) + 1 
            : 0
        };
        
        const updatedProfile = { 
          ...userProfile, 
          lastInteractionDate: today,
          productivityStats: newStats
        };
        setUserProfile(updatedProfile);
        dataService.saveUserProfile(updatedProfile, userId, isOnline);
      }
    }
  }, [userProfile.id, showOnboarding]);

  // --- Detail Panel State ---
  
  // Helper to check if a task should be visible in the main UI
  const isTaskVisible = (task: Task) => {
    // First check completion visibility (only show today's completed tasks)
    if (task.completed && task.completedAt) {
      const completedDate = new Date(task.completedAt).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const todayDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      if (completedDate !== todayDate) return false;
    }

    // Then check tab visibility
    if (activeTab === 'Geral') return true;
    if (activeTab === 'Leituras') return task.category === 'estudo';
    if (activeTab === 'Gestão/Entidades') return task.category === 'admin';
    
    const board = boards.find(b => b.name === activeTab);
    if (board) return task.boardId === board.id;
    
    return true;
  };

  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [syllabusLink, setSyllabusLink] = useState('');
  const [importantCitations, setImportantCitations] = useState('');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const [revisionStatus, setRevisionStatus] = useState({
    firstReading: false,
    summary: false,
    preExamReview: false
  });
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedTask) {
      setNotes(selectedTask.notes || '');
      setSubtasks(selectedTask.subtasks || []);
      setSyllabusLink(selectedTask.syllabusLink || '');
      setImportantCitations(selectedTask.importantCitations || '');
      setRevisionStatus(selectedTask.revisionStatus || {
        firstReading: false,
        summary: false,
        preExamReview: false
      });
    }
  }, [selectedTaskId]);

  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, timerSeconds]);

  // --- Onboarding Logic ---
  const handleResetTimer = async () => {
    if (timerSeconds < 25 * 60) { // If some time was spent
      const durationMinutes = Math.floor((25 * 60 - timerSeconds) / 60);
      if (durationMinutes > 0) {
        // Save session to feed the Ranking
        const session: StudySession = {
          id: Math.random().toString(36).substr(2, 9),
          user_id: userId,
          subject_id: selectedTask?.subjectId || 'geral',
          duration: durationMinutes,
          start_time: new Date().toISOString(),
        };
        
        const newSessions = [session, ...studySessions];
        setStudySessions(newSessions);
        await dataService.saveStudySession(session, userId, isOnline);
      }
    }
    setTimerSeconds(25 * 60);
    setTimerActive(false);
  };

  const handleAssistantSend = async (textOverride?: string) => {
    const userMessage = (textOverride || input).trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const systemInstruction = `
        Você é o "SanFran Assistant", a IA de integração de tarefas da plataforma SanFran Academy.
        Seu objetivo é auxiliar o aluno em sua jornada nas Arcadas de forma CONTÍNUA e PERSONALIZADA.

        ESTADO ATUAL DO ALUNO:
        - Arquétipo: ${userProfile.archetype}
        - Arcádia Score (Completude): ${userProfile.arcadia_score}%
        - Tags: ${userProfile.tags.join(', ')}
        - Produtividade: Streak de ${userProfile.productivityStats?.streak} dias. Concluídas ontem: ${userProfile.productivityStats?.completedYesterday}.
        - Data: ${new Date().toLocaleDateString('pt-BR')} (Considere feriados e época de provas da SanFran).

        MODOS DE OPERAÇÃO:
        1. MODO PERFILAMENTO (Score < 80%):
           - Priorize completar os blocos de perguntas estratégicas.
           - Uma pergunta por vez, focando em entender a persona.
        
        2. MODO ASSISTENTE DE PERFORMANCE (Score >= 80%):
           - Pare de perguntar "quem é você" e foque em "como você está hoje".
           - Faça check-ins matinais sugerindo prioridades baseadas no perfil.
           - Faça check-outs noturnos celebrando conquistas ou analisando gargalos.
           - Use perguntas sazonais (ex: "Como está o café para a semana de provas?").

        DIRETRIZES DE PERSONALIZAÇÃO:
        - Se "Carreira Pública", foque em Lei Seca.
        - Se "Social", mencione a Peruada ou o Pátio.
        - Se "Urgência Alta", seja direto e use checklists.

        REGRAS RÍGIDAS:
        1. Uma pergunta por vez.
        2. Opções em JSON para botões.
        3. Use "db_update" para atualizar tags ou scores na nuvem.
        4. No onboarding inicial (5 primeiras), gere o BOARD_CONFIG final.

        FORMATO DE SAÍDA:
        {
          "mensagem_ia": "...",
          "opcoes_botoes": ["...", "..."],
          "db_update": { "tag_nova": "valor", "score_bonus": 5 } // Opcional
        }

        FORMATO DE SAÍDA FINAL (Onboarding - Após 5ª resposta):
        Texto do diagnóstico...
        ---BOARD_CONFIG---
        {
          "board_name": "Nome Sugerido",
          "columns": ["Coluna 1", "Coluna 2", "Coluna 3"],
          "initial_tasks": [
            {"title": "Tarefa 1", "column": "Coluna 1", "notes": "..."},
            {"title": "Tarefa 2", "column": "Coluna 2", "notes": "..."}
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, { role: 'user', parts: [{ text: userMessage }] }],
        config: { systemInstruction, temperature: 0.7 },
      });

      const responseText = response.text || "";
      
      if (questionCount < 5 || showOnboarding) {
        try {
          const json = JSON.parse(responseText.replace(/```json\n?|\n?```/g, '').trim());
          setMessages(prev => [...prev, { role: 'assistant', content: json.mensagem_ia, options: json.opcoes_botoes }]);
          
          // Handle db_update from AI
          if (json.db_update) {
            const updatedTags = [...userProfile.tags];
            Object.entries(json.db_update).forEach(([key, value]) => {
              const tag = `${key}:${value}`;
              if (!updatedTags.includes(tag)) updatedTags.push(tag);
            });
            
            const updatedProfile = { 
              ...userProfile, 
              tags: updatedTags,
              arcadia_score: Math.min(100, userProfile.arcadia_score + (json.db_update.score_bonus || 2))
            };
            setUserProfile(updatedProfile);
            dataService.saveUserProfile(updatedProfile, userId, isOnline);
          }
        } catch (e) {
          setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
        }
      } else {
        // Final Diagnosis
        const parts = responseText.split('---BOARD_CONFIG---');
        const diagnosis = parts[0];
        setMessages(prev => [...prev, { role: 'assistant', content: diagnosis }]);
        
        if (parts[1]) {
          try {
            const boardConfig = JSON.parse(parts[1].trim());
            await createInitialBoard(boardConfig);
          } catch (e) {
            console.error("Erro ao criar quadro inicial:", e);
          }
        }
        setShowOnboarding(false);
      }
      
      setQuestionCount(prev => prev + 1);
    } catch (error) {
      console.error("Erro no onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createInitialBoard = async (config: any) => {
    const boardId = Math.random().toString(36).substr(2, 9);
    const newBoard: Board = {
      id: boardId,
      name: config.board_name,
      columns: config.columns.map((name: string, i: number) => ({ id: `col-${i}`, name, order: i })),
      userId,
      createdAt: new Date().toISOString()
    };

    await dataService.saveBoard(newBoard, userId, isOnline);
    setBoards(prev => [...prev, newBoard]);

    if (config.initial_tasks) {
      const newTasks: Task[] = config.initial_tasks.map((t: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: t.title,
        completed: false,
        boardId,
        columnId: newBoard.columns.find(c => c.name === t.column)?.id || newBoard.columns[0].id,
        notes: t.notes,
        userId
      }));

      for (const task of newTasks) {
        await dataService.saveTask(task, userId, isOnline);
      }
      setTasks(prev => [...prev, ...newTasks]);
    }
    setActiveTab(boardId);
  };

  // --- Task Management Logic ---
  const debouncedSave = (field: string, value: any) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    const timeout = setTimeout(() => {
      handleUpdateTask({ [field]: value });
    }, 1000);
    setSaveTimeout(timeout);
  };

  const handleAddTask = async (boardId?: string, columnId?: string, template?: 'fichamento' | 'gestao') => {
    let title = '';
    let subtasks: SubTask[] = [];

    if (template === 'fichamento') {
      title = 'Fichamento: [Nome do Texto]';
      subtasks = [
        { id: 'st-1', title: 'Ler texto', completed: false },
        { id: 'st-2', title: 'Destacar passagens', completed: false },
        { id: 'st-3', title: 'Escrever resumo', completed: false },
        { id: 'st-4', title: 'Revisar ABNT', completed: false }
      ];
    } else if (template === 'gestao') {
      title = 'Reunião de Gestão: [Pauta]';
      subtasks = [
        { id: 'st-1', title: 'Definir pauta', completed: false },
        { id: 'st-2', title: 'Enviar convite', completed: false },
        { id: 'st-3', title: 'Redigir ata', completed: false }
      ];
    } else {
      const promptTitle = prompt("Título da tarefa:");
      if (!promptTitle) return;
      title = promptTitle;
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      completed: false,
      boardId: boardId || (activeTab === 'inbox' ? undefined : activeTab),
      columnId: columnId || (activeTab !== 'inbox' ? boards.find(b => b.id === activeTab)?.columns[0].id : undefined),
      subtasks,
      createdAt: new Date().toISOString()
    } as any;

    await dataService.saveTask(newTask, userId, isOnline);
    setTasks(prev => [newTask, ...prev]);
    setSelectedTaskId(newTask.id);
    setShowTemplatesMenu(false);
  };

  const handleUpdateTask = async (updates: Partial<Task>, taskIdOverride?: string) => {
    const taskId = taskIdOverride || selectedTaskId;
    if (!taskId) return;
    
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    // If marking as completed, set the timestamp
    if (updates.completed === true && !taskToUpdate.completedAt) {
      updates.completedAt = new Date().toISOString();
      
      // Notify delegator if this was a delegated task
      if (taskToUpdate.delegatedBy && taskToUpdate.delegatedBy !== userId) {
        await dataService.createNotification(
          taskToUpdate.delegatedBy,
          `${userProfile.answers?.['nome'] || 'Alguém'} concluiu a tarefa: '${taskToUpdate.title}'`,
          taskToUpdate.id,
          'completed'
        );
      }
      // Track productivity
      const newStats = {
        ...userProfile.productivityStats!,
        completedToday: (userProfile.productivityStats?.completedToday || 0) + 1
      };
      const updatedProfile = { ...userProfile, productivityStats: newStats };
      setUserProfile(updatedProfile);
      dataService.saveUserProfile(updatedProfile, userId, isOnline);
    } else if (updates.completed === false) {
      updates.completedAt = undefined;
    }

    const updatedTask = { ...taskToUpdate, ...updates };
    await dataService.saveTask(updatedTask, userId, isOnline);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Excluir esta tarefa?")) return;
    await dataService.deleteTask(id, userId, isOnline);
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  };

  const handleAddBoard = async () => {
    if (!newBoardName.trim()) return;
    const newBoard: Board = {
      id: Math.random().toString(36).substr(2, 9),
      name: newBoardName,
      columns: [
        { id: 'col-1', name: 'A fazer', order: 0 },
        { id: 'col-2', name: 'Em andamento', order: 1 },
        { id: 'col-3', name: 'Concluído', order: 2 }
      ],
      userId,
      createdAt: new Date().toISOString()
    };
    await dataService.saveBoard(newBoard, userId, isOnline);
    setBoards(prev => [...prev, newBoard]);
    setNewBoardName('');
    setIsAddingBoard(false);
    setActiveTab(newBoard.id);
  };

  const handleAddColumn = async () => {
    if (activeTab === 'inbox') return;
    const name = prompt("Nome da nova coluna:");
    if (!name) return;

    const board = boards.find(b => b.id === activeTab);
    if (!board) return;

    const newColumn: BoardColumn = {
      id: `col-${Math.random().toString(36).substr(2, 5)}`,
      name,
      order: board.columns.length
    };

    const updatedBoard = {
      ...board,
      columns: [...board.columns, newColumn]
    };

    await dataService.saveBoard(updatedBoard, userId, isOnline);
    setBoards(prev => prev.map(b => b.id === activeTab ? updatedBoard : b));
  };

  const hasUrgentTasks = (boardId: string | 'inbox') => {
    const today = new Date().toISOString().split('T')[0];
    const boardTasks = boardId === 'inbox' 
      ? tasks.filter(t => !t.boardId)
      : tasks.filter(t => t.boardId === boardId);
    return boardTasks.some(t => t.dueDate && t.dueDate.startsWith(today) && !t.completed);
  };

  const handleRescheduleOverdue = async () => {
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed);
    
    if (overdueTasks.length === 0) return;

    const updatedTasks = [...tasks];
    for (const task of overdueTasks) {
      const updated = { ...task, dueDate: today };
      await dataService.saveTask(updated, userId, isOnline);
      const index = updatedTasks.findIndex(t => t.id === task.id);
      if (index !== -1) updatedTasks[index] = updated;
    }
    setTasks(updatedTasks);
  };

  const handleAddLink = (url: string) => {
    if (!selectedTask || !url.trim()) return;
    try {
      new URL(url);
    } catch (e) {
      return;
    }
    const newLink = { url, title: url.split('//')[1]?.split('/')[0] || url };
    const updatedLinks = [...(selectedTask.links || []), newLink];
    handleUpdateTask({ links: updatedLinks });
  };

  const DroppableTab = ({ tab, activeTab, onClick }: { tab: string, activeTab: string, onClick: () => void }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: tab,
    });

    return (
      <button
        ref={setNodeRef}
        onClick={onClick}
        className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2 ${
          activeTab === tab 
            ? 'bg-[#800000] text-white border-[#800000] shadow-md' 
            : isOver 
              ? 'bg-[#800000]/10 text-[#800000] border-[#800000] border-dashed scale-110'
              : 'text-slate-500 border-transparent hover:text-[#800000] hover:bg-slate-50'
        }`}
      >
        {tab}
      </button>
    );
  };

  const Heatmap = ({ tasks }: { tasks: Task[] }) => {
    const [view, setView] = useState<'me' | 'team'>('me');
    const today = new Date();
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - 7 + i);
      return d.toISOString().split('T')[0];
    });

    const filteredTasks = view === 'me' 
      ? tasks.filter(t => !t.delegatedTo || t.delegatedTo === userId)
      : tasks;

    const getDensity = (date: string) => {
      const count = filteredTasks.filter(t => t.dueDate === date && !t.completed).length;
      if (count === 0) return 'bg-slate-100';
      if (count < 2) return 'bg-[#800000]/20';
      if (count < 4) return 'bg-[#800000]/40';
      if (count < 6) return 'bg-[#800000]/70';
      return 'bg-[#800000]';
    };

    return (
      <div className="flex flex-col gap-2 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Carga de Trabalho</div>
          <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-100">
            <button 
              onClick={() => setView('me')}
              className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md transition-all ${view === 'me' ? 'bg-white text-[#800000] shadow-sm' : 'text-slate-400'}`}
            >
              Eu
            </button>
            <button 
              onClick={() => setView('team')}
              className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md transition-all ${view === 'team' ? 'bg-white text-[#800000] shadow-sm' : 'text-slate-400'}`}
            >
              Equipe
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          {days.map(date => (
            <div 
              key={date}
              title={`${date}: ${filteredTasks.filter(t => t.dueDate === date && !t.completed).length} tarefas`}
              className={`w-3 h-3 rounded-sm transition-all hover:scale-125 cursor-help ${getDensity(date)} ${date === today.toISOString().split('T')[0] ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const SortableTaskItem = ({ task, selectedTaskId, setSelectedTaskId, handleUpdateTask, getTaskWeight, boards }: any) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: task.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
      zIndex: isDragging ? 50 : 1,
    };

    const subtaskProgress = task.subtasks && task.subtasks.length > 0
      ? (task.subtasks.filter((s: any) => s.completed).length / task.subtasks.length) * 100
      : 0;

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => setSelectedTaskId(task.id)}
        className={`p-4 rounded-2xl cursor-pointer transition-all border relative overflow-hidden group ${selectedTaskId === task.id ? 'bg-[#800000] text-white border-transparent shadow-lg scale-[1.02]' : 'bg-white text-slate-700 border-slate-100 hover:border-[#800000]/30 hover:shadow-sm'} ${task.completed ? 'opacity-50' : 'opacity-100'} ${task.priority === 'urgente' ? 'border-l-4 border-l-red-500' : task.priority === 'alta' ? 'border-l-4 border-l-amber-500' : ''}`}
      >
        {(task.priority === 'urgente' || task.priority === 'alta') && !task.completed && (
          <div className={`absolute inset-0 pointer-events-none animate-pulse ${task.priority === 'urgente' ? 'bg-red-500/5' : 'bg-amber-500/5'}`} />
        )}
        
        <div className="flex items-center gap-3 relative z-10">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              handleUpdateTask({ completed: !task.completed }, task.id);
            }}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white scale-110 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'border-slate-300 hover:border-[#800000]'}`}
          >
            {task.completed && <CheckCircle2 size={12} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className={`font-medium text-sm truncate transition-all ${task.completed ? 'line-through' : ''}`}>{task.title}</div>
              {task.priority === 'urgente' && <AlertCircle size={12} className="text-red-500 shrink-0" />}
              {task.waitingOn && <Clock size={12} className="text-amber-500 shrink-0 animate-pulse" />}
              {getTaskWeight(task) > 0 && !task.completed && (
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-tighter ${selectedTaskId === task.id ? 'bg-white/20 text-white border-white/30' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'}`}>
                  <Sparkles size={8} /> Prioridade IA
                </div>
              )}
            </div>

            {/* Smart Progress Bar */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${subtaskProgress}%` }}
                  className={`h-full transition-all duration-500 ${subtaskProgress === 100 ? 'bg-emerald-500' : selectedTaskId === task.id ? 'bg-white/40' : 'bg-[#800000]'}`}
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-col gap-1">
                {task.boardId && (
                  <div className={`text-[9px] font-bold uppercase tracking-tighter ${selectedTaskId === task.id ? 'text-white/60' : 'text-[#800000]/60'}`}>
                    {boards.find((b: any) => b.id === task.boardId)?.name}
                  </div>
                )}
                {task.delegatedBy && task.delegatedBy !== userId && (
                  <div className={`text-[9px] font-bold italic ${selectedTaskId === task.id ? 'text-white/70' : 'text-blue-600'}`}>
                    De: {task.delegatedByName || 'Amigo'}
                  </div>
                )}
                {task.delegatedTo && task.delegatedTo !== userId && (
                  <div className={`text-[9px] font-bold italic ${selectedTaskId === task.id ? 'text-white/70' : 'text-amber-600'}`}>
                    Para: {task.delegatedToName || 'Amigo'}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {task.waitingOn && (
                  <span className={`text-[9px] font-bold italic ${selectedTaskId === task.id ? 'text-white/60' : 'text-amber-600'}`}>
                    Aguardando: {task.waitingOn}
                  </span>
                )}
                {task.subtasks && task.subtasks.length > 0 && (
                  <span className={`text-[9px] font-bold ${selectedTaskId === task.id ? 'text-white/60' : 'text-slate-400'}`}>
                    {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Smart Progress Bar */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${subtaskProgress}%` }}
              className={`h-full transition-all duration-500 ${
                subtaskProgress === 100 
                  ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' 
                  : subtaskProgress > 30 
                    ? 'bg-[#800000]' 
                    : 'bg-slate-300'
              }`}
            />
            {subtaskProgress === 100 && (
              <div className="absolute right-1 bottom-1 text-emerald-500 animate-bounce">
                <CheckCircle2 size={10} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- Render Helpers ---
  const filteredTasks = tasks.filter(isTaskVisible).filter(task => {
    // Context filter
    const today = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    if (filter === 'today') return task.dueDate === today;
    if (filter === 'tomorrow') return task.dueDate === tomorrow;
    if (filter === 'overdue') return task.dueDate && task.dueDate < today && !task.completed;
    if (filter === 'high') return task.priority === 'urgente' || task.priority === 'alta';
    
    return true;
  });

  if (showOnboarding) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col bg-[#FFFFF0] rounded-[32px] overflow-hidden border border-slate-200 shadow-xl relative">
        <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#800000] flex items-center justify-center text-white shadow-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-serif font-bold text-slate-900">SanFran Assistant</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Configurando seu Workspace</p>
            </div>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-[#800000] text-white'}`}>
                  {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-4 rounded-[20px] shadow-sm text-sm leading-relaxed ${msg.role === 'user' ? 'bg-white text-slate-800 border border-slate-100' : 'bg-[#800000] text-white'}`}>
                  {msg.content}
                </div>
              </div>
              {msg.role === 'assistant' && msg.options && idx === messages.length - 1 && !isLoading && (
                <div className="ml-11 mt-4 flex flex-wrap gap-2">
                  {msg.options.map((opt, i) => (
                    <button key={i} onClick={() => handleAssistantSend(opt)} className="px-4 py-2 bg-white border border-[#800000]/20 text-[#800000] rounded-full text-xs font-bold hover:bg-[#800000] hover:text-white transition-all">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && <Loader2 className="animate-spin text-[#800000] mx-auto" />}
        </div>
        <div className="p-6 bg-white border-t border-slate-100 flex gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAssistantSend()} placeholder="Responda aqui..." className="flex-1 px-6 py-3 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20" />
          <button onClick={() => handleAssistantSend()} className="w-12 h-12 rounded-full bg-[#800000] text-white flex items-center justify-center shadow-lg"><Send size={18} /></button>
        </div>
      </div>
    );
  }

  const getTaskWeight = (task: Task) => {
    let weight = 0;
    const title = task.title.toLowerCase();
    const tags = userProfile.tags || [];

    if (tags.includes("Foco: Público")) {
      if (title.includes("constitucional") || title.includes("administrativo") || title.includes("penal") || title.includes("magistratura") || title.includes("ministério público")) {
        weight += 2;
      }
    }
    if (tags.includes("Foco: Privado")) {
      if (title.includes("civil") || title.includes("empresarial") || title.includes("trabalho") || title.includes("advocacia")) {
        weight += 2;
      }
    }
    if (tags.includes("Perfil Acadêmico")) {
      if (title.includes("filosofia") || title.includes("sociologia") || title.includes("história") || title.includes("teoria") || title.includes("doutrina")) {
        weight += 2;
      }
    }
    
    return weight;
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-[calc(100vh-120px)] flex flex-col bg-slate-50 rounded-[32px] overflow-hidden border border-slate-200 shadow-2xl">
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {TABS.map(tab => (
              <DroppableTab 
                key={tab} 
                tab={tab} 
                activeTab={activeTab} 
                onClick={() => setActiveTab(tab)} 
              />
            ))}
            <button 
              onClick={() => setIsAddingBoard(true)}
              className="p-2 rounded-full text-slate-400 hover:text-[#800000] hover:bg-slate-50 transition-all"
            >
              <Plus size={18} />
            </button>
          </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full text-slate-400 hover:text-[#800000] hover:bg-slate-50 transition-all relative"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-black">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Notificações</h4>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-300 hover:text-slate-500"><X size={14} /></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs italic">Nenhuma notificação por enquanto.</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={async () => {
                            await dataService.markNotificationAsRead(n.id);
                            setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif));
                            if (n.link_task) setSelectedTaskId(n.link_task);
                            setShowNotifications(false);
                          }}
                          className={`p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50 flex gap-3 ${!n.is_read ? 'bg-slate-50/50' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            n.type === 'delegated' ? 'bg-red-50 text-red-600' : 
                            n.type === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {n.type === 'delegated' ? <Bot size={14} /> : n.type === 'completed' ? <CheckCircle2 size={14} /> : <UserIcon size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-relaxed ${!n.is_read ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          {!n.is_read && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={handleArchiveCompleted}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-black transition-all"
          >
            <RotateCcw size={12} />
            <span>Ritual 23:59</span>
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Live Sync</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {(!boards.find(b => b.name === activeTab)) ? (
          // --- MASTER-DETAIL VIEW (30/70) ---
          <div className="flex-1 flex overflow-hidden">
            {/* Master: List (30%) */}
            <div className={`transition-all duration-500 border-r border-slate-100 bg-white flex flex-col ${selectedTaskId ? 'w-[30%]' : 'w-full'}`}>
              <div className="p-4 border-b border-slate-50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-slate-900">{activeTab}</h3>
                  <div className="flex items-center gap-2 relative">
                    <button 
                      onClick={() => setShowTemplatesMenu(!showTemplatesMenu)} 
                      className="p-2 bg-[#800000] text-white rounded-lg shadow-md hover:bg-red-900 transition-all"
                    >
                      <Plus size={16} />
                    </button>
                    
                    <AnimatePresence>
                      {showTemplatesMenu && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50"
                        >
                          <button onClick={() => handleAddTask()} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                            <CheckSquare size={14} /> Tarefa Simples
                          </button>
                          <button onClick={() => handleAddTask(undefined, undefined, 'fichamento')} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                            <Quote size={14} /> Fichamento (Template)
                          </button>
                          <button onClick={() => handleAddTask(undefined, undefined, 'gestao')} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                            <Layout size={14} /> Reunião Gestão (Template)
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* NLP Quick Entry */}
                <div className="relative">
                  <input 
                    type="text" 
                    value={quickEntryInput}
                    onChange={e => {
                      setQuickEntryInput(e.target.value);
                      if (e.target.value.includes('@')) {
                        const parts = e.target.value.split('@');
                        const lastPart = parts[parts.length - 1].toLowerCase();
                        setMentionSuggestions(friends.filter(f => f.friend_name.toLowerCase().includes(lastPart)));
                      } else {
                        setMentionSuggestions([]);
                      }
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleNLPAddTask(quickEntryInput)}
                    placeholder="Ler Civil amanhã @Mateus #Estudo !Alta"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#800000]/20 font-medium"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-tighter">Quick Entry</div>
                  
                  <AnimatePresence>
                    {mentionSuggestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 bottom-full mb-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50"
                      >
                        {mentionSuggestions.map(f => (
                          <button 
                            key={f.id}
                            onClick={() => {
                              const parts = quickEntryInput.split('@');
                              parts[parts.length - 1] = f.friend_name + ' ';
                              setQuickEntryInput(parts.join('@'));
                              setMentionSuggestions([]);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                          >
                            <UserIcon size={14} /> {f.friend_name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Heatmap */}
                <Heatmap tasks={tasks} />
              </div>
              
              {/* Context Filters */}
              <div className="p-2 border-b border-slate-50 flex items-center gap-1 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Tudo', icon: List },
                  { id: 'today', label: 'Hoje', icon: Calendar },
                  { id: 'overdue', label: 'Atraso', icon: AlertCircle },
                  { id: 'high', label: 'Alta', icon: Sparkles },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${filter === f.id ? 'bg-[#800000] text-white border-transparent shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-[#800000]/30'}`}
                  >
                    <f.icon size={10} />
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                <SortableContext 
                  items={filteredTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredTasks.map(task => (
                    <SortableTaskItem 
                      key={task.id}
                      task={task}
                      selectedTaskId={selectedTaskId}
                      setSelectedTaskId={setSelectedTaskId}
                      handleUpdateTask={handleUpdateTask}
                      getTaskWeight={getTaskWeight}
                      boards={boards}
                    />
                  ))}
                </SortableContext>
              </div>
            </div>

            {/* Detail: Panel (70%) */}
            <AnimatePresence>
              {selectedTaskId && (
                <motion.div 
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 100, opacity: 0 }}
                  className="w-[70%] bg-white flex flex-col shadow-2xl z-10"
                >
                  {selectedTask ? (
                    <>
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                          <button onClick={() => setSelectedTaskId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="text-xl font-serif font-bold text-slate-900">{selectedTask.title}</h2>
                              {selectedTask.priority === 'urgente' && (
                                <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                                  Urgente
                                </span>
                              )}
                              {selectedTask.priority === 'alta' && (
                                <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                  Alta
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{userProfile.archetype}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nuvem de Persona: {userProfile.arcadia_score}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleUpdateTask({ completed: !selectedTask.completed })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedTask.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'}`}
                          >
                            <CheckCircle2 size={16} />
                            {selectedTask.completed ? 'Concluída' : 'Marcar Concluída'}
                          </button>
                          <button onClick={() => handleDeleteTask(selectedTask.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        <AnimatePresence>
                          {activeQuestion && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mb-8 rounded-[20px] overflow-hidden border border-slate-100 shadow-sm"
                            >
                              <div className="bg-gradient-to-r from-[#800000] to-white p-4 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                                    <Sparkles size={16} />
                                  </div>
                                  <p className={`text-white text-xs font-medium ${aiTone.style}`}>
                                    {aiTone.prefix} <span className="opacity-90 font-normal">{activeQuestion.question}</span>
                                  </p>
                                </div>
                                <button 
                                  onClick={() => setActiveQuestion(null)}
                                  className="text-white/60 hover:text-white transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="bg-white p-4 flex flex-wrap gap-2">
                                {activeQuestion.options.map((opt: any) => (
                                  <button
                                    key={opt.label}
                                    onClick={() => handleAnswerQuestion(activeQuestion.id, opt.label)}
                                    className="px-4 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-full hover:bg-[#800000] hover:text-white hover:border-transparent transition-all active:scale-95"
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setActiveQuestion(null)}
                                  className="px-4 py-1.5 text-slate-400 text-[11px] font-bold hover:text-slate-600 transition-all"
                                >
                                  Agora não
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {showReward && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="mb-6 py-2 px-4 bg-slate-50 border-l-4 border-[#800000] rounded-r-xl"
                            >
                              <p className="text-[#800000] text-[11px] font-medium">
                                <Sparkles size={12} className="inline mr-2" />
                                {showReward}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Board & Category & Priority Selection */}
                        <section className="grid grid-cols-3 gap-6">
                          <div>
                            <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <Layout size={14} /> Esteira (Kanban)
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button 
                                onClick={() => handleUpdateTask({ boardId: undefined, columnId: undefined })}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${!selectedTask.boardId ? 'bg-[#800000] text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-[#800000]/30'}`}
                              >
                                Inbox
                              </button>
                              {boards.map(board => (
                                <button 
                                  key={board.id}
                                  onClick={() => handleUpdateTask({ boardId: board.id, columnId: board.columns[0].id })}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${selectedTask.boardId === board.id ? 'bg-[#800000] text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-[#800000]/30'}`}
                                >
                                  {board.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <Sparkles size={14} /> Categoria
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(['estudo', 'peticao', 'audiencia', 'admin', 'geral'] as const).map(cat => (
                                <button 
                                  key={cat}
                                  onClick={() => handleUpdateTask({ category: cat })}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border capitalize ${selectedTask.category === cat ? 'bg-amber-500 text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-500/30'}`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <AlertCircle size={14} /> Prioridade
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(['normal', 'alta', 'urgente'] as const).map(prio => (
                                <button 
                                  key={prio}
                                  onClick={() => handleUpdateTask({ priority: prio })}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border capitalize ${selectedTask.priority === prio ? (prio === 'urgente' ? 'bg-red-600 text-white' : prio === 'alta' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-white') : 'bg-white border-slate-200 text-slate-400'}`}
                                >
                                  {prio}
                                </button>
                              ))}
                            </div>
                          </div>
                        </section>

                        {/* Notes Section */}
                        <section>
                          <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <List size={14} /> Anotações Jurídicas
                          </div>
                          <textarea 
                            value={notes}
                            onChange={e => {
                              setNotes(e.target.value);
                              debouncedSave('notes', e.target.value);
                            }}
                            placeholder="Cole aqui resumos, teses ou notas importantes..."
                            className="w-full h-40 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/10 resize-none font-serif leading-relaxed"
                          />
                        </section>

                        {/* Legal Specific Modules */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <section>
                            <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <Paperclip size={14} /> Link da Ementa / Texto
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={syllabusLink}
                                onChange={e => setSyllabusLink(e.target.value)}
                                onBlur={() => handleUpdateTask({ syllabusLink })}
                                placeholder="Link do Drive, Moodle ou PDF..."
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#800000]/10"
                              />
                              {syllabusLink && (
                                <a href={syllabusLink} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-100 text-[#800000] rounded-xl hover:bg-[#800000] hover:text-white transition-all">
                                  <ChevronRight size={18} />
                                </a>
                              )}
                            </div>
                          </section>

                          <section>
                            <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <Calendar size={14} /> Prazo de Entrega
                            </div>
                            <input 
                              type="date"
                              value={selectedTask.dueDate ? selectedTask.dueDate.split('T')[0] : ''}
                              onChange={e => handleUpdateTask({ dueDate: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#800000]/10"
                            />
                          </section>

                          <section>
                            <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <Clock size={14} /> Aguardando Terceiros (Delegado)
                            </div>
                            <input 
                              type="text"
                              value={selectedTask.waitingOn || ''}
                              onChange={e => handleUpdateTask({ waitingOn: e.target.value })}
                              placeholder="Nome do responsável (ex: SanFran Jr, Moradia...)"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#800000]/10"
                            />
                          </section>

                          <section>
                            <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <RotateCcw size={14} /> Status da Revisão
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { key: 'firstReading', label: '1ª Leitura' },
                                { key: 'summary', label: 'Fichamento' },
                                { key: 'preExamReview', label: 'Revisão Pré-Prova' }
                              ].map((status) => (
                                <button
                                  key={status.key}
                                  onClick={() => {
                                    const newStatus = { ...revisionStatus, [status.key]: !revisionStatus[status.key as keyof typeof revisionStatus] };
                                    setRevisionStatus(newStatus);
                                    handleUpdateTask({ revisionStatus: newStatus });
                                  }}
                                  className={`px-3 py-2 rounded-full text-[10px] font-bold transition-all border ${revisionStatus[status.key as keyof typeof revisionStatus] ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-[#800000]/30'}`}
                                >
                                  {status.label}
                                </button>
                              ))}
                            </div>
                          </section>
                        </div>

                        <section>
                          <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <Quote size={14} /> Citações Importantes
                          </div>
                          <textarea 
                            value={importantCitations}
                            onChange={e => {
                              setImportantCitations(e.target.value);
                              debouncedSave('importantCitations', e.target.value);
                            }}
                            placeholder="Separe aqui as frases que vai usar no fichamento enquanto lê..."
                            className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#800000]/10 resize-none font-serif italic leading-relaxed"
                          />
                        </section>

                        {/* Subtasks Section */}
                        <section>
                          <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <CheckSquare size={14} /> Checklists / Etapas
                          </div>
                          <div className="space-y-2">
                            {subtasks.map((st, i) => (
                              <div key={st.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group">
                                <input 
                                  type="checkbox" 
                                  checked={st.completed}
                                  onChange={() => {
                                    const newSubtasks = [...subtasks];
                                    newSubtasks[i].completed = !newSubtasks[i].completed;
                                    setSubtasks(newSubtasks);
                                    handleUpdateTask({ subtasks: newSubtasks });
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-[#800000] focus:ring-[#800000]"
                                />
                                <input 
                                  type="text"
                                  value={st.title}
                                  onChange={(e) => {
                                    const newSubtasks = [...subtasks];
                                    newSubtasks[i].title = e.target.value;
                                    setSubtasks(newSubtasks);
                                    debouncedSave('subtasks', newSubtasks);
                                  }}
                                  className={`flex-1 bg-transparent text-sm focus:outline-none ${st.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}
                                />
                                <button 
                                  onClick={() => {
                                    const newSubtasks = subtasks.filter((_, idx) => idx !== i);
                                    setSubtasks(newSubtasks);
                                    handleUpdateTask({ subtasks: newSubtasks });
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => {
                                const newSubtask: SubTask = { id: Math.random().toString(36).substr(2, 9), title: '', completed: false };
                                const newSubtasks = [...subtasks, newSubtask];
                                setSubtasks(newSubtasks);
                                handleUpdateTask({ subtasks: newSubtasks });
                              }}
                              className="w-full py-3 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs font-bold hover:border-[#800000]/20 hover:text-[#800000] transition-all flex items-center justify-center gap-2"
                            >
                              <Plus size={14} /> Adicionar Etapa
                            </button>
                          </div>
                        </section>

                        {/* Referências Section */}
                        <section className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <Paperclip size={14} /> Centro de Referências
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                placeholder="Cole um link (Drive, PDF, Site)..."
                                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] focus:outline-none focus:ring-2 focus:ring-[#800000]/10 w-48"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddLink((e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedTask.links?.map((link, idx) => (
                              <div key={idx} className="group flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 hover:border-[#800000]/30 hover:shadow-md transition-all">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#800000] group-hover:bg-[#800000] group-hover:text-white transition-all">
                                  <ExternalLink size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-bold text-slate-800 truncate">{link.title}</div>
                                  <div className="text-[8px] text-slate-400 truncate">{link.url}</div>
                                </div>
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => setSplitScreenUrl(link.url)}
                                    className="p-1.5 bg-slate-50 text-slate-400 hover:text-[#800000] rounded-lg"
                                    title="Abrir em Split Screen"
                                  >
                                    <Layout size={12} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const updatedLinks = selectedTask.links?.filter((_, i) => i !== idx);
                                      handleUpdateTask({ links: updatedLinks });
                                    }}
                                    className="p-1.5 bg-slate-50 text-slate-400 hover:text-red-500 rounded-lg"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {(!selectedTask.links || selectedTask.links.length === 0) && (
                              <div className="col-span-2 py-8 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
                                <Paperclip size={24} className="mb-2 opacity-20" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Nenhuma referência anexada</span>
                              </div>
                            )}
                          </div>
                        </section>

                        {/* Pomodoro Timer Section */}
                        <section className="p-6 bg-[#800000]/5 rounded-3xl border border-[#800000]/10">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-[#800000] font-bold text-[10px] uppercase tracking-widest">
                              <Clock size={14} /> Foco na Atividade
                            </div>
                            <div className="text-2xl font-mono font-bold text-[#800000]">
                              {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setTimerActive(!timerActive)}
                              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${timerActive ? 'bg-amber-500 text-white' : 'bg-[#800000] text-white'}`}
                            >
                              {timerActive ? <Pause size={18} /> : <Play size={18} />}
                              {timerActive ? 'Pausar' : 'Iniciar Foco'}
                            </button>
                            <button 
                              onClick={handleResetTimer}
                              className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-[#800000]"
                            >
                              <RotateCcw size={18} />
                            </button>
                          </div>
                        </section>

                        {/* Attachments Section */}
                        <section>
                          <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <Paperclip size={14} /> Anexos / PDFs
                          </div>
                          <div className="flex gap-2">
                            <button className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-[#800000] hover:text-[#800000] transition-all">
                              <Plus size={20} />
                              <span className="text-sm font-medium">Anexar Documento</span>
                            </button>
                          </div>
                        </section>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center">
                      <AlertCircle size={48} className="mb-4 opacity-20" />
                      <p className="font-serif italic">Selecione uma tarefa para ver os detalhes e iniciar o foco.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          // --- KANBAN VIEW ---
          <div className="flex-1 overflow-x-auto p-6 bg-slate-50 flex gap-6">
            {boards.find(b => b.id === activeTab)?.columns.map(column => (
              <div key={column.id} className="w-80 shrink-0 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#800000]" />
                    {column.name}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      {tasks.filter(t => t.boardId === activeTab && t.columnId === column.id).length}
                    </span>
                  </h4>
                  <button onClick={() => handleAddTask(activeTab, column.id)} className="p-1 text-slate-400 hover:text-[#800000] transition-colors"><Plus size={18} /></button>
                </div>
                <div className="flex-1 space-y-3">
                  {filteredTasks.filter(t => t.boardId === activeTab && t.columnId === column.id).map(task => {
                    const subtaskProgress = task.subtasks && task.subtasks.length > 0
                      ? (task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100
                      : 0;

                    return (
                      <motion.div 
                        key={task.id}
                        layoutId={task.id}
                        initial={false}
                        animate={{ 
                          opacity: task.completed ? 0.5 : 1,
                          scale: 1
                        }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setActiveTab('inbox'); // Switch to Master-Detail to show details
                        }}
                        className={`p-4 bg-white rounded-2xl shadow-sm border cursor-pointer hover:shadow-md hover:border-[#800000]/20 transition-all group relative overflow-hidden ${task.priority === 'urgente' ? 'border-l-4 border-l-red-500' : task.priority === 'alta' ? 'border-l-4 border-l-amber-500' : 'border-slate-100'}`}
                      >
                        {(task.priority === 'urgente' || task.priority === 'alta') && !task.completed && (
                          <div className={`absolute inset-0 pointer-events-none animate-pulse ${task.priority === 'urgente' ? 'bg-red-500/5' : 'bg-amber-500/5'}`} />
                        )}
                        {task.completed && (
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            className="absolute top-0 left-0 h-1 bg-emerald-500/30"
                          />
                        )}
                        <div className="flex items-start justify-between mb-2 relative z-10">
                          <div className="flex flex-col gap-1">
                            {getTaskWeight(task) > 0 && !task.completed && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 text-[8px] font-black uppercase tracking-tighter rounded-full border border-indigo-500/20 w-fit">
                                <Sparkles size={8} /> Prioridade IA
                              </div>
                            )}
                            <h5 className={`text-sm font-bold text-slate-800 leading-tight transition-all ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.title}</h5>
                            {task.priority === 'urgente' && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Urgente</span>}
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-[#800000] transition-colors" />
                        </div>
                        {task.notes && <p className="text-[10px] text-slate-400 line-clamp-2 mb-3 relative z-10">{task.notes}</p>}
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-2">
                            {task.subtasks && task.subtasks.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${subtaskProgress}%` }} />
                                </div>
                                <span className="text-[9px] font-bold text-slate-400">{Math.round(subtaskProgress)}%</span>
                              </div>
                            )}
                          </div>
                          {task.dueDate && (
                            <div className={`flex items-center gap-1 text-[10px] font-bold ${task.completed ? 'text-slate-300' : 'text-amber-600'}`}>
                              <Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button 
              onClick={handleAddColumn}
              className="w-80 shrink-0 h-20 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 hover:border-[#800000] hover:text-[#800000] transition-all group"
            >
              <Plus size={24} className="group-hover:scale-110 transition-transform" />
              <span className="ml-2 font-bold text-sm">Nova Coluna</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Board Modal */}
      <AnimatePresence>
        {isAddingBoard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-100"
            >
              <h3 className="text-xl font-serif font-bold text-slate-900 mb-6">Criar Novo Quadro Kanban</h3>
              <input 
                autoFocus
                type="text" 
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                placeholder="Ex: Leituras da Semana, Estágio..."
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl mb-6 focus:outline-none focus:ring-2 focus:ring-[#800000]/20"
              />
              <div className="flex gap-3">
                <button onClick={() => setIsAddingBoard(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                <button onClick={handleAddBoard} className="flex-1 py-4 bg-[#800000] text-white font-bold rounded-2xl shadow-lg hover:bg-red-900 transition-all">Criar Quadro</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal Adicionar Quadro */}
      <AnimatePresence>
        {isAddingBoard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-serif font-bold text-slate-900">Novo Quadro</h3>
                <button onClick={() => setIsAddingBoard(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nome do Quadro</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBoard()}
                    placeholder="Ex: TCC, OAB, Estágio..."
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 transition-all font-medium"
                  />
                </div>
                <button 
                  onClick={handleAddBoard}
                  disabled={!newBoardName.trim()}
                  className="w-full py-4 bg-[#800000] text-white rounded-2xl font-bold shadow-lg hover:bg-red-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Criar Quadro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

      <DragOverlay>
        {activeDragId ? (
          <div className="p-4 rounded-2xl bg-[#800000] text-white shadow-2xl opacity-80 rotate-3 scale-105 border-2 border-white/20">
            <div className="font-medium text-sm truncate">{tasks.find(t => t.id === activeDragId)?.title}</div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Split Screen Overlay */}
      <AnimatePresence>
        {splitScreenUrl && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-1/2 bg-white shadow-2xl z-50 border-l border-slate-200 flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#800000] flex items-center justify-center text-white">
                  <Layout size={16} />
                </div>
                <div className="text-xs font-bold text-slate-800 truncate max-w-xs">
                  {splitScreenUrl}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.open(splitScreenUrl, '_blank')}
                  className="p-2 text-slate-400 hover:text-[#800000] hover:bg-white rounded-lg transition-all"
                  title="Abrir em nova aba"
                >
                  <ExternalLink size={18} />
                </button>
                <button 
                  onClick={() => setSplitScreenUrl(null)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 relative">
              <iframe 
                src={splitScreenUrl} 
                className="w-full h-full border-none"
                title="Split Screen View"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DndContext>
  );
};

export default TaskMasterDetail;
