import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Task, Subject, Board, BoardColumn, SubTask, StudySession, UserProfile, TaskPriority, TaskCategory, Notification, Friendship, SubjectFile } from '../types';
import { 
  Plus, Layout, List, MoreVertical, Trash2, CheckSquare, 
  Clock, Paperclip, ChevronRight, X, Calendar, AlertCircle,
  Play, Pause, RotateCcw, Save, Quote, ThumbsUp, ExternalLink, Link as LinkIcon, Globe, Bell,
  CheckCircle2, User, Zap, Trello, BookOpen, Download, Sparkles, Loader2
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
  useDraggable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { GoogleGenAI } from '@google/genai';
import { CommentsSection } from './CommentsSection';
import ical from 'ical-generator';
import { saveAs } from 'file-saver';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { SUBJECT_FILES_LIST_COLUMNS } from '../utils/supabaseSelectColumns';
import { suggestSubtasks } from '../services/geminiService';

const STORY_POINTS = [1, 2, 3, 5, 8];
const DEFAULT_TASK_CATEGORIES: TaskCategory[] = ['estudo', 'peticao', 'audiencia', 'admin', 'geral'];

const TASK_TEMPLATES = [
  {
    id: 'fichamento',
    name: 'Fichamento de Acórdão',
    subtasks: [
      'Ler o acórdão na íntegra',
      'Identificar o relatório e o voto condutor',
      'Extrair a fundamentação jurídica (Ratio Decidendi)',
      'Anotar a decisão final (Dispositivo)',
      'Redigir o resumo crítico'
    ]
  },
  {
    id: 'peticao',
    name: 'Petição Inicial',
    subtasks: [
      'Analisar documentos do cliente',
      'Pesquisar jurisprudência atualizada',
      'Redigir os fatos',
      'Fundamentar o direito',
      'Elaborar os pedidos e valor da causa'
    ]
  },
  {
    id: 'recurso',
    name: 'Recurso de Apelação',
    subtasks: [
      'Identificar pontos de reforma na sentença',
      'Preparar as razões recursais',
      'Verificar o preparo (custas)',
      'Protocolar no sistema do tribunal'
    ]
  }
];

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
  userProfile: UserProfile | null;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const TaskMasterDetail: React.FC<TaskMasterDetailProps> = ({ 
  tasks, subjects, setTasks, boards, setBoards, 
  studySessions, setStudySessions, userId, isOnline,
  userProfile, setUserProfile
}) => {
  // --- View State ---
  const [activeTab, setActiveTab] = useState<string>('Geral');
  const [filter, setFilter] = useState<'all' | 'today' | 'tomorrow' | 'overdue' | 'high'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [isSuggestingSubtasks, setIsSuggestingSubtasks] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [promptModal, setPromptModal] = useState<{ isOpen: boolean; title: string; defaultValue: string; onConfirm: (value: string) => void } | null>(null);
  const [splitScreenUrl, setSplitScreenUrl] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [quickEntryInput, setQuickEntryInput] = useState('');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<Friendship[]>([]);
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [hiddenTaskTabs, setHiddenTaskTabs] = useState<string[]>(userProfile?.hiddenTaskTabs || []);
  const [searchParams, setSearchParams] = useSearchParams();
  /** Prazo vindo da Agenda (`/tasks?due=YYYY-MM-DD`) para o próximo Quick Entry. Deep link: `task` ou `taskId` com UUID. */
  const [pendingCalendarDue, setPendingCalendarDue] = useState<string | null>(null);
  const quickEntryInputRef = useRef<HTMLInputElement>(null);

  const currentViewMode: 'list' | 'kanban' = userProfile?.viewPreferences?.[activeTab] || (boards.find(b => b.id === activeTab) ? 'kanban' : 'list');

  const handleToggleViewMode = (mode: 'list' | 'kanban') => {
    if (!userProfile) return;
    const newPreferences = {
      ...(userProfile.viewPreferences || {}),
      [activeTab]: mode
    };
    const updatedProfile = { ...userProfile, viewPreferences: newPreferences };
    setUserProfile(updatedProfile);
    dataService.saveUserProfile(updatedProfile, userId, isOnline);
  };

  const DEFAULT_KANBAN_COLUMNS = [
    { id: 'Pendente', name: 'Pendente', order: 0 },
    { id: 'Fazendo', name: 'Fazendo', order: 1 },
    { id: 'Concluido', name: 'Concluído', order: 2 }
  ];

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
    if (TABS.some(tab => tab.id === over.id)) {
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

    // Handle Kanban Column Drop
    const taskId = active.id as string;
    const overId = over.id as string;
    const task = tasks.find(t => t.id === taskId);

    if (task) {
      // Check if dropping on a default status column
      if (['Pendente', 'Fazendo', 'Concluido'].includes(overId)) {
        const updatedTask = { 
          ...task, 
          status: overId as any,
          completed: overId === 'Concluido'
        };
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        await dataService.saveTask(updatedTask, userId, isOnline);
        return;
      }

      // Check if dropping on a board column
      for (const board of boards) {
        const column = board.columns.find(c => c.id === overId);
        if (column) {
          const isDone = column.name.toLowerCase().includes('concluído') || column.name.toLowerCase().includes('concluido') || column.name.toLowerCase().includes('done');
          const updatedTask = { 
            ...task, 
            boardId: board.id, 
            columnId: column.id,
            status: undefined, // Clear general status if moved to a board
            completed: isDone,
            completedAt: isDone ? (task.completedAt || new Date().toISOString()) : undefined
          };
          setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
          await dataService.saveTask(updatedTask, userId, isOnline);
          return;
        }
      }
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

  useEffect(() => {
    const due = searchParams.get('due');
    if (!due || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return;
    setPendingCalendarDue(due);
    const [yy, mm, dd] = due.split('-');
    toast.info(`Prazo sugerido: ${dd}/${mm}/${yy}. Digite o título no campo rápido e pressione Enter.`);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('due');
        return p;
      },
      { replace: true }
    );
    requestAnimationFrame(() => {
      quickEntryInputRef.current?.focus();
    });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const taskParam = searchParams.get('task') ?? searchParams.get('taskId');
    if (!taskParam || tasks.length === 0) return;
    const found = tasks.some((t) => t.id === taskParam);
    if (!found) return;
    setSelectedTaskId(taskParam);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('task');
        p.delete('taskId');
        return p;
      },
      { replace: true }
    );
  }, [searchParams, tasks, setSearchParams]);

  useEffect(() => {
    setHiddenTaskTabs(userProfile?.hiddenTaskTabs || []);
  }, [userProfile?.hiddenTaskTabs]);

  const persistHiddenTaskTabs = (nextHiddenTabs: string[]) => {
    setHiddenTaskTabs(nextHiddenTabs);
    if (!userProfile) return;
    const updatedProfile = { ...userProfile, hiddenTaskTabs: nextHiddenTabs };
    setUserProfile(updatedProfile);
    dataService.saveUserProfile(updatedProfile, userId, isOnline);
  };

  const TABS = [
    { id: 'Geral', name: 'Geral', deletable: false },
    ...boards.map(b => ({ id: b.id, name: b.name, deletable: true }))
  ].filter(tab => !hiddenTaskTabs.includes(tab.id));

  const handleDeleteTab = (tabId: string) => {
    if (tabId === 'Geral') return;
    const board = boards.find((b) => b.id === tabId);
    if (board) {
      void handleDeleteBoard(tabId);
    }
  };

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
      if (['baixa', 'low'].includes(p)) priority = 'baixa';
      else if (['media', 'medium', 'média'].includes(p)) priority = 'media';
      else if (['alta', 'high'].includes(p)) priority = 'alta';
      else if (['urgente', 'urgent'].includes(p)) priority = 'urgente';
      else priority = 'normal';
      title = title.replace(priorityMatch[0], '');
    }

    // Parse Category (#)
    const categoryMatch = title.match(/#(\w+)/);
    if (categoryMatch) {
      const c = categoryMatch[1].toLowerCase();
      if (c.includes('leitura') || c.includes('estudo')) category = 'estudo';
      else if (c.includes('gest') || c.includes('entidade') || c.includes('admin')) category = 'admin';
      else if (c.includes('peti') || c.includes('jurid')) category = 'peticao';
      else if (c.includes('audio') || c.includes('tribunal')) category = 'audiencia';
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

    // Parse Date (improved)
    const now = new Date();
    const daysOfWeek = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    
    if (title.toLowerCase().includes('amanhã')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0];
      title = title.replace(/amanhã/gi, '');
    } else if (title.toLowerCase().includes('hoje')) {
      dueDate = now.toISOString().split('T')[0];
      title = title.replace(/hoje/gi, '');
    } else {
      // Check for days of the week
      for (let i = 0; i < daysOfWeek.length; i++) {
        const day = daysOfWeek[i];
        if (title.toLowerCase().includes(day)) {
          const targetDay = i;
          const currentDay = now.getDay();
          let daysUntil = targetDay - currentDay;
          if (daysUntil <= 0) daysUntil += 7;
          
          const futureDate = new Date();
          futureDate.setDate(now.getDate() + daysUntil);
          dueDate = futureDate.toISOString().split('T')[0];
          title = title.replace(new RegExp(day, 'gi'), '');
          break;
        }
      }
    }

    // Parse Date formats like DD/MM
    const dateMatch = title.match(/(\d{1,2})\/(\d{1,2})/);
    if (dateMatch && !dueDate) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = now.getFullYear();
      const d = new Date(year, month, day);
      if (d < now) d.setFullYear(year + 1); // Assume next year if date passed
      dueDate = d.toISOString().split('T')[0];
      title = title.replace(dateMatch[0], '');
    }

    const calendarDueFallback = pendingCalendarDue;
    if (!dueDate && calendarDueFallback) {
      dueDate = calendarDueFallback;
    }

    const board = boards.find(b => b.id === activeTab);
    const boardId = board ? board.id : undefined;
    const columnId = board ? board.columns[0]?.id : undefined;

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
      delegatedByName: userProfile?.full_name || 'Você',
      boardId,
      columnId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;

    setTasks(prev => [newTask, ...prev]);
    setQuickEntryInput('');
    if (calendarDueFallback && dueDate === calendarDueFallback) {
      setPendingCalendarDue(null);
    }
    await dataService.saveTask(newTask, userId, isOnline);

    if (delegatedTo) {
      // Create notification for friend
      await dataService.createNotification(
        delegatedTo,
        `${userProfile?.full_name || 'Você'} te atribuiu a tarefa: '${newTask.title}'`,
        newTask.id,
        'delegated'
      );
    }
  };

  const handleSuggestSubtasks = async () => {
    if (!selectedTask) return;
    setIsSuggestingSubtasks(true);
    try {
      const { subtasks: suggested } = await suggestSubtasks(selectedTask.title, selectedTask.category);
      const newSubtasks: SubTask[] = suggested.map(title => ({
        id: crypto.randomUUID(),
        title,
        completed: false
      }));
      const updatedSubtasks = [...subtasks, ...newSubtasks];
      setSubtasks(updatedSubtasks);
      handleUpdateTask({ subtasks: updatedSubtasks });
      toast.success("Subtarefas sugeridas com sucesso!");
    } catch (error) {
      console.error("Error suggesting subtasks:", error);
      toast.error("Erro ao sugerir subtarefas.");
    } finally {
      setIsSuggestingSubtasks(false);
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

  useEffect(() => {
    const fetchColabData = async () => {
      const [friendsData, notificationsData] = await Promise.all([
        dataService.getFriendships(userId),
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
        setUserProfile(profile);
      }
    };
    loadProfile();
  }, [userId, isOnline, setUserProfile]);

  // --- Detail Panel State ---
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [syllabusLink, setSyllabusLink] = useState('');
  const [importantCitations, setImportantCitations] = useState('');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<SubjectFile[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

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
  }, [selectedTaskId, selectedTask]);

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

    const board = boards.find(b => b.id === activeTab);
    if (board) return task.boardId === board.id;
    
    return true;
  };

  const handleResetTimer = async () => {
    if (timerSeconds < 25 * 60) { // If some time was spent
      const durationMinutes = Math.floor((25 * 60 - timerSeconds) / 60);
      if (durationMinutes > 0) {
        // Save session to feed the Ranking
        const session: StudySession = {
          id: crypto.randomUUID(),
          user_id: userId,
          subject_id: selectedTask?.subjectId || 'geral',
          duration: durationMinutes,
          start_time: new Date().toISOString(),
        };
        
        const newSessions = [session, ...studySessions];
        setStudySessions(newSessions);
        await dataService.saveStudySession(session, userId, isOnline);

        // Update task focus time
        if (selectedTask) {
          const focusTimeInSeconds = (25 * 60 - timerSeconds);
          const currentFocusTime = selectedTask.total_focus_time || 0;
          handleUpdateTask({ total_focus_time: currentFocusTime + focusTimeInSeconds });
        }
      }
    }
    setTimerSeconds(25 * 60);
    setTimerActive(false);
  };

  const handleStartDeepWork = () => {
    if (!selectedTask) return;
    setTimerActive(true);
    toast.info(`Modo Deep Work: Focando em "${selectedTask.title}"`);
  };

  const fetchLibraryFiles = async () => {
    if (!selectedTask?.subjectId) {
      // Fetch all files if no subject
      const { data } = await supabase
        .from('subject_files')
        .select(SUBJECT_FILES_LIST_COLUMNS)
        .eq('user_id', userId);
      setAvailableFiles(data || []);
    } else {
      const files = await dataService.getFilesBySubjectId(selectedTask.subjectId, userId, isOnline);
      setAvailableFiles(files);
    }
    setShowLibraryModal(true);
  };

  const handleAttachFile = async (file: SubjectFile) => {
    if (!selectedTask) return;
    const currentAttachments = selectedTask.library_attachments || [];
    if (currentAttachments.includes(file.id)) {
      toast.error("Arquivo já anexado");
      return;
    }
    const updated = [...currentAttachments, file.id];
    handleUpdateTask({ library_attachments: updated });
    setShowLibraryModal(false);
    toast.success("Arquivo vinculado à tarefa");
  };

  const applyTemplate = (templateId: string) => {
    const template = TASK_TEMPLATES.find(t => t.id === templateId);
    if (!template || !selectedTask) return;

    const newSubtasks: SubTask[] = template.subtasks.map(title => ({
      id: crypto.randomUUID(),
      title,
      completed: false
    }));

    handleUpdateTask({ 
      subtasks: [...(selectedTask.subtasks || []), ...newSubtasks],
      title: selectedTask.title === 'Nova Tarefa' ? template.name : selectedTask.title
    });
    setShowTemplatesMenu(false);
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const handleBreakDownTask = async () => {
    if (!selectedTask) return;
    setIsBreakingDown(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: `Você é um assistente de produtividade. Quebre a tarefa "${selectedTask.title}" em exatamente 5 subtarefas lógicas e acionáveis. 
        Retorne apenas os títulos das subtarefas, um por linha, sem números ou marcadores.`
      });
      
      const subtasksTitles = response.text?.split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .slice(0, 5) || [];

      const newSubtasks: SubTask[] = subtasksTitles.map(title => ({
        id: crypto.randomUUID(),
        title: title.replace(/^\d+[\.\s-]*|[*•-]\s*/, ''),
        completed: false
      }));

      handleUpdateTask({ subtasks: [...(selectedTask.subtasks || []), ...newSubtasks] });
      toast.success("IA quebrou a tarefa em 5 passos lógicos!");
    } catch (error) {
      console.error("AI Breakdown error:", error);
      toast.error("Erro ao processar com IA");
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleExportToICal = (task?: Task) => {
    const taskToExport = task || selectedTask;
    if (!taskToExport || !taskToExport.dueDate) {
      toast.error("Tarefa sem data de entrega");
      return;
    }
    
    const cal = ical({ name: 'SanFran Tasks' });
    cal.createEvent({
      start: new Date(taskToExport.dueDate),
      end: new Date(taskToExport.dueDate),
      summary: `[SanFran] ${taskToExport.title}`,
      description: taskToExport.notes || 'Sem notas adicionais.',
      location: 'SanFran App'
    });
    
    const blob = new Blob([cal.toString()], { type: 'text/calendar;charset=utf-8' });
    saveAs(blob, `task_${taskToExport.id.slice(0, 8)}.ics`);
    toast.success("Arquivo iCal gerado!");
  };

  const handleExportAllDeadlines = () => {
    const tasksWithDates = tasks.filter(t => t.dueDate && !t.completed);
    if (tasksWithDates.length === 0) {
      toast.info("Nenhuma tarefa pendente com data encontrada.");
      return;
    }

    const cal = ical({ name: 'SanFran Deadlines' });
    tasksWithDates.forEach(t => {
      cal.createEvent({
        start: new Date(t.dueDate!),
        end: new Date(t.dueDate!),
        summary: `[SanFran] ${t.title}`,
        description: t.notes || '',
      });
    });

    const blob = new Blob([cal.toString()], { type: 'text/calendar;charset=utf-8' });
    saveAs(blob, `sanfran_deadlines_${new Date().toISOString().split('T')[0]}.ics`);
    toast.success(`${tasksWithDates.length} prazos exportados!`);
  };

  const awardPrestigePoints = async (task: Task) => {
    if (!task.completed || !task.dueDate || !userProfile) return;
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    
    // Award points for completing before deadline
    if (now < dueDate) {
      let pointsToAdd = 0;
      let badgeEarned = '';

      if (task.priority === 'urgente') {
        pointsToAdd = 20;
        badgeEarned = 'Relâmpago Rubi';
      } else if (task.priority === 'alta') {
        pointsToAdd = 10;
        badgeEarned = 'Eficiência de Ouro';
      } else {
        pointsToAdd = 5;
      }

      const currentBadges = userProfile.badges || [];
      const updatedBadges = badgeEarned && !currentBadges.includes(badgeEarned) 
        ? [...currentBadges, badgeEarned] 
        : currentBadges;

      const newPoints = (userProfile.prestigePoints || 0) + pointsToAdd;
      const updatedProfile = { 
        ...userProfile, 
        prestigePoints: newPoints,
        badges: updatedBadges
      };

      setUserProfile(updatedProfile);
      await dataService.saveUserProfile(updatedProfile, userId, isOnline);
      
      if (badgeEarned && !currentBadges.includes(badgeEarned)) {
        toast.success(`Incrível! Você conquistou o Badge: ${badgeEarned}`);
      }
      toast.success(`+${pointsToAdd} Pontos de Prestígio conquistados!`);
    }
  };

  const isTaskBlocked = (task: Task) => {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some(depId => {
      const depTask = tasks.find(t => t.id === depId);
      return depTask && !depTask.completed;
    });
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
      setPromptModal({
        isOpen: true,
        title: "Nova Tarefa",
        defaultValue: "",
        onConfirm: async (title) => {
          if (!title.trim()) {
            setPromptModal(null);
            return;
          }
          
          const category: TaskCategory = 'geral';

          const board = boards.find(b => b.id === activeTab);
          const boardIdToSet = board ? board.id : undefined;
          const columnIdToSet = columnId || (board?.columns[0].id);

          const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            completed: false,
            category,
            status: (columnIdToSet && ['Pendente', 'Fazendo', 'Concluido'].includes(columnIdToSet)) ? columnIdToSet as any : 'Pendente',
            boardId: boardId || boardIdToSet,
            columnId: columnIdToSet,
            subtasks: [],
            created_at: new Date().toISOString()
          } as any;

          await dataService.saveTask(newTask, userId, isOnline);
          setTasks(prev => [newTask, ...prev]);
          setSelectedTaskId(newTask.id);
          setShowTemplatesMenu(false);
          setPromptModal(null);
        }
      });
      return;
    }

    let category: TaskCategory = 'geral';
    if (template === 'fichamento') category = 'estudo';
    else if (template === 'gestao') category = 'admin';

    const board = boards.find(b => b.id === activeTab);
    const boardIdToSet = board ? board.id : undefined;
    const columnIdToSet = columnId || (board?.columns[0].id);

    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      category,
      status: (columnIdToSet && ['Pendente', 'Fazendo', 'Concluido'].includes(columnIdToSet)) ? columnIdToSet as any : 'Pendente',
      boardId: boardId || boardIdToSet,
      columnId: columnIdToSet,
      subtasks,
      created_at: new Date().toISOString()
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
      
      // Recurrence Logic
      if (taskToUpdate.recurrence) {
        const { frequency, interval = 1, businessDaysOnly } = taskToUpdate.recurrence;
        let baseDate = new Date(taskToUpdate.dueDate || new Date());
        
        const getNextOccurrence = (date: Date) => {
          let next = new Date(date);
          if (frequency === 'daily') {
            next.setDate(next.getDate() + interval);
          } else if (frequency === 'weekly') {
            next.setDate(next.getDate() + (7 * interval));
          } else if (frequency === 'monthly') {
            next.setMonth(next.getMonth() + interval);
          }
          
          if (businessDaysOnly) {
            // Skip weekends (0 = Sunday, 6 = Saturday)
            while (next.getDay() === 0 || next.getDay() === 6) {
              next.setDate(next.getDate() + 1);
            }
          }
          return next;
        };

        const nextOccurrenceDate = getNextOccurrence(baseDate);
        
        const nextTask: Task = {
          ...taskToUpdate,
          id: crypto.randomUUID(),
          completed: false,
          completedAt: undefined,
          dueDate: nextOccurrenceDate.toISOString(),
          recurrence: {
            ...taskToUpdate.recurrence,
            nextOccurrence: nextOccurrenceDate.toISOString()
          },
          parentTaskId: taskToUpdate.parentTaskId || taskToUpdate.id,
          created_at: new Date().toISOString()
        } as any;
        
        await dataService.saveTask(nextTask, userId, isOnline);
        setTasks(prev => [nextTask, ...prev]);
        toast.success(`Tarefa recorrente criada para ${nextOccurrenceDate.toLocaleDateString()}`);
      }

      // Notify delegator if this was a delegated task
      if (taskToUpdate.delegatedBy && taskToUpdate.delegatedBy !== userId) {
        await dataService.createNotification(
          taskToUpdate.delegatedBy,
          `${userProfile?.full_name || 'Alguém'} concluiu a tarefa: '${taskToUpdate.title}'`,
          taskToUpdate.id,
          'completed'
        );
      }
      // Track productivity
      if (userProfile) {
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
        const lastInteraction = userProfile.lastInteractionDate;
        
        let newStreak = userProfile.productivityStats?.streak || 0;
        if (lastInteraction !== today) {
          if (!lastInteraction) {
            newStreak = 1;
          } else {
            const lastDate = new Date(lastInteraction);
            const todayDate = new Date(today);
            const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              newStreak += 1;
            } else {
              newStreak = 1;
            }
          }
        }

        const updatedProfile: UserProfile = {
          ...userProfile,
          arcadia_score: (userProfile.arcadia_score || 0) + 25, // 25 XP per task
          lastInteractionDate: today,
          productivityStats: {
            ...userProfile.productivityStats,
            completedToday: (userProfile.productivityStats?.completedToday || 0) + 1,
            streak: newStreak
          }
        } as UserProfile;

        setUserProfile(updatedProfile);
        dataService.saveUserProfile(updatedProfile, userId, isOnline);
        toast.success("+25 XP: Tarefa Concluída!");
      }
    } else if (updates.completed === false) {
      updates.completedAt = undefined;
    }

    const updatedTask = { ...taskToUpdate, ...updates };
    await dataService.saveTask(updatedTask, userId, isOnline);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
  };

  const handleDeleteTask = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Tarefa",
      message: "Tem certeza que deseja excluir esta tarefa permanentemente?",
      onConfirm: async () => {
        try {
          await dataService.deleteTask(id, userId, isOnline);
          setTasks(prev => prev.filter(t => t.id !== id));
          setSelectedTaskIds(prev => prev.filter(taskId => taskId !== id));
          if (selectedTaskId === id) setSelectedTaskId(null);
          toast.success("Tarefa excluída");
        } catch (error) {
          console.error("Failed to delete task:", error);
          toast.error("Erro ao excluir tarefa");
        }
        setConfirmModal(null);
      }
    });
  };

  const handleBulkDeleteTasks = async () => {
    if (selectedTaskIds.length === 0) return;

    const idsToDelete = [...selectedTaskIds];
    setConfirmModal({
      isOpen: true,
      title: "Excluir tarefas selecionadas",
      message: `Tem certeza que deseja excluir ${idsToDelete.length} tarefa(s) permanentemente?`,
      onConfirm: async () => {
        try {
          await Promise.all(idsToDelete.map(id => dataService.deleteTask(id, userId, isOnline)));
          setTasks(prev => prev.filter(task => !idsToDelete.includes(task.id)));
          if (selectedTaskId && idsToDelete.includes(selectedTaskId)) {
            setSelectedTaskId(null);
          }
          setSelectedTaskIds([]);
          setIsBulkSelectMode(false);
          toast.success(`${idsToDelete.length} tarefa(s) excluída(s)`);
        } catch (error) {
          console.error("Failed to bulk delete tasks:", error);
          toast.error("Erro ao excluir tarefas selecionadas");
        }
        setConfirmModal(null);
      }
    });
  };

  const handleAddBoard = async () => {
    if (!newBoardName.trim()) return;
    const newBoard: Board = {
      id: crypto.randomUUID(),
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
    const board = boards.find(b => b.id === activeTab);
    if (!board) return;

    setPromptModal({
      isOpen: true,
      title: "Nova Coluna",
      defaultValue: "",
      onConfirm: async (name) => {
        if (!name.trim()) {
          setPromptModal(null);
          return;
        }

        const newColumn: BoardColumn = {
          id: crypto.randomUUID(),
          name,
          order: board.columns.length
        };

        const updatedBoard = {
          ...board,
          columns: [...board.columns, newColumn]
        };

        await dataService.saveBoard(updatedBoard, userId, isOnline);
        setBoards(prev => prev.map(b => b.id === activeTab ? updatedBoard : b));
        setPromptModal(null);
        toast.success("Coluna adicionada");
      }
    });
  };

  const handleDeleteBoard = async (boardId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Quadro",
      message: "Tem certeza que deseja excluir este quadro? Todas as tarefas associadas ficarão sem quadro.",
      onConfirm: async () => {
        await dataService.deleteBoard(boardId, userId, isOnline);
        setBoards(prev => prev.filter(b => b.id !== boardId));
        
        // Unassign tasks from this board
        const updatedTasks = tasks.map(t => t.boardId === boardId ? { ...t, boardId: undefined, columnId: undefined } : t);
        setTasks(updatedTasks);
        
        if (activeTab === boardId) {
          setActiveTab('Geral');
        }
        setConfirmModal(null);
        toast.success("Quadro excluído com sucesso");
      }
    });
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (activeTab === 'inbox') return;
    const board = boards.find(b => b.id === activeTab);
    if (!board) return;
    
    if (board.columns.length <= 1) {
      toast.error("Um quadro deve ter pelo menos uma coluna.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Excluir Coluna",
      message: "Tem certeza que deseja excluir esta coluna? As tarefas serão movidas para a primeira coluna.",
      onConfirm: async () => {
        const updatedColumns = board.columns.filter(c => c.id !== columnId);
        const updatedBoard = { ...board, columns: updatedColumns };
        
        await dataService.saveBoard(updatedBoard, userId, isOnline);
        setBoards(prev => prev.map(b => b.id === activeTab ? updatedBoard : b));
        
        // Move tasks to the first column
        const firstColumnId = updatedColumns[0].id;
        const updatedTasks = tasks.map(t => (t.boardId === activeTab && t.columnId === columnId) ? { ...t, columnId: firstColumnId } : t);
        setTasks(updatedTasks);
        setConfirmModal(null);
        toast.success("Coluna excluída com sucesso");
      }
    });
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

  const DroppableColumn = ({ column, children }: { column: any, children: React.ReactNode }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: column.id,
    });

    return (
      <div 
        ref={setNodeRef}
        className={`flex w-[min(20rem,calc(100vw-2rem))] shrink-0 flex-col gap-4 rounded-3xl transition-colors sm:w-80 ${isOver ? 'bg-[#800000]/5 ring-2 ring-[#800000]/20 ring-inset' : ''}`}
      >
        {children}
      </div>
    );
  };

  const DraggableKanbanCard = ({ task, children }: { task: Task, children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: task.id,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={isDragging ? 'opacity-0' : ''}
      >
        {children}
      </div>
    );
  };

  const DroppableTab = ({ tab, activeTab, onClick, onDelete }: { tab: { id: string, name: string, deletable?: boolean }, activeTab: string, onClick: () => void, onDelete?: (id: string) => void }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: tab.id,
    });

    return (
      <div className="relative group">
        <button
          ref={setNodeRef}
          onClick={onClick}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2 flex items-center gap-2 ${
            activeTab === tab.id 
              ? 'bg-[#800000] text-white border-[#800000] shadow-md' 
              : isOver 
                ? 'bg-[#800000]/10 text-[#800000] border-[#800000] border-dashed scale-110'
                : 'text-slate-500 border-transparent hover:text-[#800000] hover:bg-slate-50'
          }`}
        >
          {tab.name}
          {onDelete && tab.deletable && activeTab === tab.id && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(tab.id);
              }}
              className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={12} />
            </span>
          )}
        </button>
      </div>
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
      const count = filteredTasks.filter(t => t.completedAt?.startsWith(date)).length;
      if (count === 0) return 'bg-slate-100';
      if (count < 2) return 'bg-emerald-500/20';
      if (count < 4) return 'bg-emerald-500/40';
      if (count < 6) return 'bg-emerald-500/70';
      return 'bg-emerald-500';
    };

    return (
      <div className="flex flex-col gap-2 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Atividade Recente</div>
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
              title={`${date}: ${filteredTasks.filter(t => t.completedAt?.startsWith(date)).length} tarefas concluídas`}
              className={`w-3 h-3 rounded-sm transition-all hover:scale-125 cursor-help ${getDensity(date)} ${date === today.toISOString().split('T')[0] ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const SortableTaskItem = ({ task, selectedTaskId, setSelectedTaskId, handleUpdateTask, boards, isBulkSelectMode, selectedTaskIds, setSelectedTaskIds }: any) => {
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
    const isSelectedForBulkAction = selectedTaskIds.includes(task.id);

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => {
          if (isBulkSelectMode) {
            setSelectedTaskIds((prev: string[]) =>
              prev.includes(task.id)
                ? prev.filter((id: string) => id !== task.id)
                : [...prev, task.id]
            );
            return;
          }
          setSelectedTaskId(task.id);
        }}
        className={`p-4 md:p-5 rounded-2xl cursor-pointer transition-all border relative overflow-hidden group ${selectedTaskId === task.id ? 'bg-[#800000] text-white border-transparent shadow-lg scale-[1.02]' : 'bg-white text-slate-700 border-slate-100 hover:border-[#800000]/30 hover:shadow-sm'} ${task.completed ? 'opacity-50' : 'opacity-100'} ${task.priority === 'urgente' ? 'border-l-4 border-l-red-500' : task.priority === 'alta' ? 'border-l-4 border-l-amber-500' : ''}`}
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
              <div className={`font-medium text-base truncate transition-all ${task.completed ? 'line-through' : ''}`}>{task.title}</div>
              {task.priority === 'urgente' && <AlertCircle size={12} className="text-red-500 shrink-0" />}
              {task.waitingOn && <Clock size={12} className="text-amber-500 shrink-0 animate-pulse" />}
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
                  <div className={`text-[11px] font-bold uppercase tracking-tight ${selectedTaskId === task.id ? 'text-white/60' : 'text-[#800000]/60'}`}>
                    {boards.find((b: any) => b.id === task.boardId)?.name}
                  </div>
                )}
                {task.delegatedBy && task.delegatedBy !== userId && (
                  <div className={`text-[11px] font-bold italic ${selectedTaskId === task.id ? 'text-white/70' : 'text-blue-600'}`}>
                    De: {task.delegatedByName || 'Amigo'}
                  </div>
                )}
                {task.delegatedTo && task.delegatedTo !== userId && (
                  <div className={`text-[11px] font-bold italic ${selectedTaskId === task.id ? 'text-white/70' : 'text-amber-600'}`}>
                    Para: {task.delegatedToName || 'Amigo'}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {task.waitingOn && (
                  <span className={`text-[11px] font-bold italic ${selectedTaskId === task.id ? 'text-white/60' : 'text-amber-600'}`}>
                    Aguardando: {task.waitingOn}
                  </span>
                )}
                {task.subtasks && task.subtasks.length > 0 && (
                  <span className={`text-[11px] font-bold ${selectedTaskId === task.id ? 'text-white/60' : 'text-slate-400'}`}>
                    {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}
                  </span>
                )}
              </div>
            </div>
          </div>
          {isBulkSelectMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTaskIds((prev: string[]) =>
                  prev.includes(task.id)
                    ? prev.filter((id: string) => id !== task.id)
                    : [...prev, task.id]
                );
              }}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelectedForBulkAction ? 'bg-[#800000] border-[#800000] text-white' : 'border-slate-300 bg-white'}`}
              title={isSelectedForBulkAction ? "Desmarcar" : "Selecionar"}
            >
              {isSelectedForBulkAction && <CheckCircle2 size={12} />}
            </button>
          )}
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

  const availableTaskCategories = useMemo(() => {
    const fromTasks = tasks
      .map((task) => task.category)
      .filter((category): category is string => typeof category === 'string' && category.trim().length > 0);
    const unique = Array.from(new Set([...DEFAULT_TASK_CATEGORIES, ...fromTasks]));
    return unique;
  }, [tasks]);

  const formatCategoryLabel = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-[13px] shadow-2xl sm:rounded-[28px] md:rounded-[32px]">
        {/* Header Tabs */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3 md:px-6 md:py-4 sticky top-0 z-20 min-w-0">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar max-w-full md:max-w-[calc(100%-350px)]">
            {TABS.map(tab => (
              <DroppableTab 
                key={tab.id} 
                tab={tab} 
                activeTab={activeTab} 
                onClick={() => setActiveTab(tab.id)} 
                onDelete={handleDeleteTab}
              />
            ))}
            {hiddenTaskTabs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  persistHiddenTaskTabs([]);
                  toast.success("Abas ocultas restauradas");
                }}
                className="px-3 py-2 rounded-full text-xs font-bold text-slate-500 hover:text-[#800000] hover:bg-slate-50 border border-slate-100 whitespace-nowrap"
                title="Restaurar abas ocultas"
              >
                Restaurar abas
              </button>
            )}
            <button 
              onClick={() => setIsAddingBoard(true)}
              className="p-2 rounded-full text-slate-400 hover:text-[#800000] hover:bg-slate-50 transition-all shrink-0"
            >
              <Plus size={18} />
            </button>
          </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
          <div className="relative shrink-0">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 rounded-full text-slate-400 hover:text-[#800000] hover:bg-slate-50 transition-all"
              title="Sincronização Externa"
            >
              <Calendar size={20} />
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50"
                >
                  <button 
                    onClick={() => { handleExportAllDeadlines(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl flex items-center gap-3"
                  >
                    <Download size={14} className="text-[#800000]" />
                    Exportar Todos os Prazos
                  </button>
                  <div className="h-px bg-slate-50 my-1" />
                  <p className="px-4 py-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest">Dica</p>
                  <p className="px-4 pb-2 text-[10px] text-slate-500 leading-relaxed">
                    Importe o arquivo .ics no Google Calendar ou Apple Calendar.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => handleToggleViewMode('list')}
              className={`p-1 rounded-md transition-all ${currentViewMode === 'list' ? 'bg-white text-[#800000] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Modo Lista"
            >
              <List size={14} />
            </button>
            <button 
              onClick={() => handleToggleViewMode('kanban')}
              className={`p-1 rounded-md transition-all ${currentViewMode === 'kanban' ? 'bg-white text-[#800000] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Modo Kanban"
            >
              <Trello size={14} />
            </button>
          </div>
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
                  className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
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
                            {n.type === 'delegated' ? <User size={14} /> : n.type === 'completed' ? <CheckCircle2 size={14} /> : <User size={14} />}
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
            className="flex shrink-0 items-center gap-2 px-3 py-1.5 sm:px-4 bg-slate-800 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-black transition-all"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Ritual 23:59</span>
          </button>
          <div className="hidden h-4 w-px bg-slate-200 sm:block" />
          <div className="hidden items-center gap-2 md:flex">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Live Sync</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {(currentViewMode === 'list') ? (
          // --- MASTER-DETAIL VIEW (30/70) ---
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {/* Master: List (30%) */}
            <div
              className={`flex min-h-0 flex-col overflow-hidden bg-white transition-all duration-500 ${
                selectedTaskId
                  ? 'hidden w-full border-slate-100 lg:flex lg:w-[30%] lg:max-w-[30%] lg:shrink-0 lg:border-r'
                  : 'w-full min-w-0 flex-1 border-slate-100'
              }`}
            >
              <div className="p-4 border-b border-slate-50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif font-bold text-slate-900">
                      {boards.find(b => b.id === activeTab)?.name || activeTab}
                    </h3>
                  </div>
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
                    ref={quickEntryInputRef}
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
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      void handleNLPAddTask(quickEntryInput);
                    }}
                    placeholder={
                      pendingCalendarDue
                        ? `Título da tarefa (prazo ${pendingCalendarDue.slice(8, 10)}/${pendingCalendarDue.slice(5, 7)})…`
                        : 'Adicionar nova tarefa…'
                    }
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#800000]/20 font-medium"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {pendingCalendarDue && (
                      <button
                        type="button"
                        onClick={() => setPendingCalendarDue(null)}
                        className="text-[9px] font-black uppercase text-[#800000] hover:underline"
                        title="Remover prazo sugerido pelo calendário"
                      >
                        Prazo {pendingCalendarDue.slice(8, 10)}/{pendingCalendarDue.slice(5, 7)} ✕
                      </button>
                    )}
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Quick</span>
                  </div>
                  
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
                            <User size={14} /> {f.friend_name}
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
                  { id: 'high', label: 'Alta', icon: Zap },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filter === f.id ? 'bg-[#800000] text-white border-transparent shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-[#800000]/30'}`}
                  >
                    <f.icon size={10} />
                    {f.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (isBulkSelectMode) {
                      setIsBulkSelectMode(false);
                      setSelectedTaskIds([]);
                      return;
                    }
                    setIsBulkSelectMode(true);
                  }}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${isBulkSelectMode ? 'bg-slate-900 text-white border-transparent shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-[#800000]/30'}`}
                >
                  <CheckSquare size={10} />
                  {isBulkSelectMode ? 'Cancelar seleção' : 'Selecionar'}
                </button>
              </div>

              {isBulkSelectMode && (
                <div className="px-2 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {selectedTaskIds.length} selecionada(s)
                  </span>
                  <button
                    type="button"
                    onClick={handleBulkDeleteTasks}
                    disabled={selectedTaskIds.length === 0}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${selectedTaskIds.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}
                    title="Excluir selecionadas"
                  >
                    <Trash2 size={12} />
                    Excluir
                  </button>
                </div>
              )}

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
                      boards={boards}
                      isBulkSelectMode={isBulkSelectMode}
                      selectedTaskIds={selectedTaskIds}
                      setSelectedTaskIds={setSelectedTaskIds}
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
                  className="absolute inset-0 z-30 flex min-h-0 w-full flex-col bg-white shadow-2xl lg:relative lg:inset-auto lg:z-10 lg:min-w-0 lg:w-[70%]"
                >
                  {selectedTask ? (
                    <>
                      <div className="flex flex-col gap-3 border-b border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 sticky top-0 z-20 min-w-0">
                        <div className="flex min-w-0 items-start gap-2 sm:gap-4">
                          <button type="button" onClick={() => setSelectedTaskId(null)} className="shrink-0 p-2 text-slate-400 hover:bg-slate-100 rounded-full" aria-label="Fechar tarefa"><X size={20} /></button>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <h2 className="break-words text-lg font-serif font-bold text-slate-900 sm:text-xl">{selectedTask.title}</h2>
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
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gerenciador Manual</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                          <button 
                            onClick={handleBreakDownTask} 
                            disabled={isBreakingDown}
                            className={`shrink-0 p-2 transition-all ${isBreakingDown ? 'animate-pulse text-[#800000]' : 'text-slate-400 hover:text-[#800000]'}`}
                            title="Quebrar em Subtarefas (IA)"
                          >
                            <Zap size={20} />
                          </button>
                          <button onClick={() => handleExportToICal()} className="shrink-0 p-2 text-slate-400 hover:text-[#800000]" title="Exportar iCal"><Calendar size={20} /></button>
                          {isTaskBlocked(selectedTask) && (
                            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-600 sm:px-3">
                              <AlertCircle size={12} className="shrink-0" />
                              <span className="leading-tight">Bloqueada por dependências</span>
                            </div>
                          )}
                          <button 
                            onClick={async () => {
                              if (isTaskBlocked(selectedTask)) {
                                toast.error("Esta tarefa está bloqueada por dependências não concluídas.");
                                return;
                              }
                              const updatedTask = { ...selectedTask, completed: !selectedTask.completed };
                              handleUpdateTask({ completed: updatedTask.completed });
                              if (updatedTask.completed) await awardPrestigePoints(updatedTask);
                            }}
                            disabled={isTaskBlocked(selectedTask)}
                            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all sm:px-4 ${selectedTask.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'} ${isTaskBlocked(selectedTask) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <CheckCircle2 size={16} />
                            <span className="hidden sm:inline">{selectedTask.completed ? 'Concluída' : 'Marcar Concluída'}</span>
                            <span className="sm:hidden">{selectedTask.completed ? 'OK' : 'Feito'}</span>
                          </button>
                          <button type="button" onClick={() => handleDeleteTask(selectedTask.id)} className="shrink-0 p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 custom-scrollbar sm:p-6 md:space-y-8 md:p-8">
                        {/* Board & Category & Priority Selection */}
                        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
                              <Layout size={14} /> Categoria
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {availableTaskCategories.map(cat => (
                                <button 
                                  key={cat}
                                  onClick={() => handleUpdateTask({ category: cat as TaskCategory })}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border capitalize ${selectedTask.category === cat ? 'bg-amber-500 text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-500/30'}`}
                                >
                                  {formatCategoryLabel(cat)}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <input
                                type="text"
                                value={newCategoryInput}
                                onChange={(e) => setNewCategoryInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter') return;
                                  const normalized = newCategoryInput.trim().toLowerCase();
                                  if (!normalized) return;
                                  handleUpdateTask({ category: normalized as TaskCategory });
                                  setNewCategoryInput('');
                                }}
                                placeholder="Nova categoria..."
                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const normalized = newCategoryInput.trim().toLowerCase();
                                  if (!normalized) return;
                                  handleUpdateTask({ category: normalized as TaskCategory });
                                  setNewCategoryInput('');
                                }}
                                className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                              >
                                Criar
                              </button>
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

                        {/* Comments Section */}
                        <section>
                          <CommentsSection task={selectedTask} userId={userId} onUpdateTask={handleUpdateTask} />
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

                          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div>
                              <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                <Zap size={14} /> Story Points (Esforço)
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {STORY_POINTS.map(points => (
                                  <button 
                                    key={points}
                                    onClick={() => handleUpdateTask({ storyPoints: points })}
                                    className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center ${selectedTask.storyPoints === points ? 'bg-[#800000] text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-[#800000]/30'}`}
                                  >
                                    {points}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                <LinkIcon size={14} /> Dependências (Bloqueia esta tarefa)
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {tasks.filter(t => t.id !== selectedTask.id && !t.completed).slice(0, 5).map(t => {
                                  const isDep = selectedTask.dependencies?.includes(t.id);
                                  return (
                                    <button 
                                      key={t.id}
                                      onClick={() => {
                                        const current = selectedTask.dependencies || [];
                                        const updated = isDep ? current.filter(id => id !== t.id) : [...current, t.id];
                                        handleUpdateTask({ dependencies: updated });
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border max-w-[150px] truncate ${isDep ? 'bg-amber-500 text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-500/30'}`}
                                    >
                                      {t.title}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </section>

                          <section>
                            <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <RotateCcw size={14} /> Recorrência Inteligente
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(['none', 'daily', 'weekly', 'monthly', 'business'] as const).map(freq => (
                                <button 
                                  key={freq}
                                  onClick={() => {
                                    if (freq === 'none') handleUpdateTask({ recurrence: undefined });
                                    else handleUpdateTask({ 
                                      recurrence: { 
                                        frequency: freq === 'business' ? 'daily' : freq as any, 
                                        interval: 1,
                                        businessDaysOnly: freq === 'business'
                                      } 
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border capitalize ${
                                    (!selectedTask.recurrence && freq === 'none') || 
                                    (selectedTask.recurrence?.frequency === freq && !selectedTask.recurrence?.businessDaysOnly) ||
                                    (freq === 'business' && selectedTask.recurrence?.businessDaysOnly)
                                      ? 'bg-[#800000] text-white border-transparent shadow-md' 
                                      : 'bg-white border-slate-200 text-slate-400 hover:border-[#800000]/30'
                                  }`}
                                >
                                  {freq === 'none' ? 'Nenhuma' : freq === 'business' ? 'Dias Úteis' : freq}
                                </button>
                              ))}
                            </div>
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
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <CheckSquare size={14} /> Checklists / Etapas
                            </div>
                            <button
                              onClick={handleSuggestSubtasks}
                              disabled={isSuggestingSubtasks}
                              className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all disabled:opacity-50"
                            >
                              {isSuggestingSubtasks ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles size={12} />}
                              Sugerir com IA
                            </button>
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
                                const newSubtask: SubTask = { id: crypto.randomUUID(), title: '', completed: false };
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
                        <section className="rounded-3xl border border-slate-100 bg-slate-50/50 p-4 sm:p-6">
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                              <Paperclip size={14} /> Centro de Referências
                            </div>
                            <div className="flex min-w-0 w-full items-center gap-2 sm:w-auto sm:max-w-md">
                              <input 
                                type="text"
                                placeholder="Cole um link (Drive, PDF, Site)..."
                                className="min-w-0 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] focus:outline-none focus:ring-2 focus:ring-[#800000]/10"
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
                              <Zap size={14} className="animate-pulse" /> Modo Deep Work
                            </div>
                            <div className="text-2xl font-mono font-bold text-[#800000]">
                              {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => timerActive ? setTimerActive(false) : handleStartDeepWork()}
                              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${timerActive ? 'bg-amber-500 text-white shadow-lg' : 'bg-[#800000] text-white hover:shadow-lg hover:scale-[1.02]'}`}
                            >
                              {timerActive ? <Pause size={18} /> : <Play size={18} />}
                              {timerActive ? 'Pausar Foco' : 'Iniciar Deep Work'}
                            </button>
                            <button 
                              onClick={handleResetTimer}
                              className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-[#800000] transition-all"
                            >
                              <RotateCcw size={18} />
                            </button>
                          </div>
                          {timerActive && (
                            <div className="mt-4 text-[10px] text-[#800000]/60 font-medium text-center italic">
                              Interface focada em: {selectedTask.title}
                            </div>
                          )}
                        </section>

                        {/* Attachments Section */}
                        <section>
                          <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <List size={14} /> Templates de Procedimento
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {TASK_TEMPLATES.map(template => (
                              <button 
                                key={template.id}
                                onClick={() => applyTemplate(template.id)}
                                className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-[#800000] hover:text-[#800000] transition-all flex flex-col items-center gap-2 text-center"
                              >
                                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-[#800000]/10">
                                  <CheckSquare size={16} />
                                </div>
                                {template.name}
                              </button>
                            ))}
                          </div>
                        </section>

                        {/* Attachments Section */}
                        <section>
                          <div className="flex items-center gap-2 mb-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <Paperclip size={14} /> Biblioteca & Anexos
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            <button 
                              onClick={fetchLibraryFiles}
                              className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-[#800000] hover:text-[#800000] transition-all"
                            >
                              <BookOpen size={20} />
                              <span className="text-sm font-medium">Vincular da Biblioteca (PDF/Juris)</span>
                            </button>

                            {selectedTask.library_attachments?.map(fileId => {
                              const file = availableFiles.find(f => f.id === fileId);
                              return (
                                <div key={fileId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-white rounded-lg text-[#800000]">
                                      <Paperclip size={14} />
                                    </div>
                                    <div className="truncate">
                                      <div className="text-xs font-bold text-slate-700 truncate">{file?.name || 'Arquivo vinculado'}</div>
                                      <div className="text-[10px] text-slate-400">PDF da Biblioteca</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {file?.file_url && (
                                      <a 
                                        href={file.file_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-slate-400 hover:text-[#800000] transition-colors"
                                      >
                                        <ExternalLink size={14} />
                                      </a>
                                    )}
                                    <button 
                                      onClick={() => {
                                        const updated = selectedTask.library_attachments?.filter(id => id !== fileId);
                                        handleUpdateTask({ library_attachments: updated });
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
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
          <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto bg-slate-50 p-3 sm:gap-6 sm:p-6">
            {(boards.find(b => b.id === activeTab)?.columns || DEFAULT_KANBAN_COLUMNS).map(column => (
              <DroppableColumn key={column.id} column={column}>
                <div className="flex items-center justify-between px-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#800000]" />
                    {column.name}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      {tasks.filter(t => {
                        const matchesTab = isTaskVisible(t);
                        const matchesColumn = boards.find(b => b.id === activeTab) 
                          ? t.columnId === column.id 
                          : (t.status || (t.completed ? 'Concluido' : 'Pendente')) === column.id;
                        return matchesTab && matchesColumn;
                      }).length}
                    </span>
                  </h4>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleAddTask(activeTab, column.id)} className="p-1 text-slate-400 hover:text-[#800000] transition-colors"><Plus size={18} /></button>
                    {boards.find(b => b.id === activeTab) && (
                      <button 
                        onClick={() => handleDeleteColumn(column.id)} 
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                        title="Excluir Coluna"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  {tasks
                    .filter(t => {
                      const matchesTab = isTaskVisible(t);
                      const matchesColumn = boards.find(b => b.id === activeTab) 
                        ? t.columnId === column.id 
                        : (t.status || (t.completed ? 'Concluido' : 'Pendente')) === column.id;
                      return matchesTab && matchesColumn;
                    })
                    .map(task => {
                    const subtaskProgress = task.subtasks && task.subtasks.length > 0
                      ? (task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100
                      : 0;

                    return (
                      <DraggableKanbanCard key={task.id} task={task}>
                        <motion.div 
                          layoutId={task.id}
                          initial={false}
                          animate={{ 
                            opacity: task.completed ? 0.5 : 1,
                            scale: 1
                          }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            // O painel completo de edição existe no layout de lista.
                            // Ao clicar no card no Kanban, abrimos esse layout automaticamente.
                            handleToggleViewMode('list');
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
                              <h5 className={`text-sm font-bold text-slate-800 leading-tight transition-all ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.title}</h5>
                              {task.priority === 'urgente' && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Urgente</span>}
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTask({ completed: !task.completed, status: !task.completed ? 'Concluido' : 'Pendente' }, task.id);
                              }}
                              className={`shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 hover:border-[#800000]'}`}
                            >
                              {task.completed && <CheckCircle2 size={12} />}
                            </button>
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
                      </DraggableKanbanCard>
                    );
                  })}
                </div>
              </DroppableColumn>
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

      {/* Library Selection Modal */}
      <AnimatePresence>
        {showLibraryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen size={20} className="text-[#800000]" />
                  Vincular da Biblioteca
                </h3>
                <button onClick={() => setShowLibraryModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {availableFiles.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic text-sm">
                    Nenhum arquivo encontrado para esta matéria.
                  </div>
                ) : (
                  availableFiles.map(file => (
                    <button 
                      key={file.id}
                      onClick={() => handleAttachFile(file)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 text-left group"
                    >
                      <div className="p-3 bg-slate-100 rounded-xl text-slate-400 group-hover:bg-[#800000] group-hover:text-white transition-all">
                        <Paperclip size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-700 truncate">{file.name}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-widest font-black">{file.type}</div>
                      </div>
                      <Plus size={20} className="text-slate-300 group-hover:text-[#800000]" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Split Screen Overlay */}
      <AnimatePresence>
        {splitScreenUrl && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-full sm:w-1/2 bg-white shadow-2xl z-50 border-l border-slate-200 flex flex-col"
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
      {/* Custom Modals */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/10"
            >
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{confirmModal.title}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {promptModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/10"
            >
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">{promptModal.title}</h3>
              <input 
                autoFocus
                type="text"
                defaultValue={promptModal.defaultValue}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') promptModal.onConfirm(e.currentTarget.value);
                  if (e.key === 'Escape') setPromptModal(null);
                }}
                className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl mb-8 focus:ring-2 focus:ring-[#800000] outline-none font-bold"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setPromptModal(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                    promptModal.onConfirm(input?.value || '');
                  }}
                  className="flex-1 py-3 px-4 bg-[#800000] text-white rounded-xl font-bold hover:bg-[#600000] transition-all shadow-lg shadow-[#800000]/20"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DndContext>
    </div>
  );
};

export default TaskMasterDetail;
