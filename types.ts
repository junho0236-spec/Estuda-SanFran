
export enum View {
  Dashboard = 'dashboard',
  Anki = 'anki',
  Timer = 'timer',
  Subjects = 'subjects',
  Tasks = 'tasks',
  Calendar = 'calendar',
  Ranking = 'ranking',
  Library = 'library',
  Largo = 'largo'
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subjectId: string;
  folderId: string | null;
  nextReview: number;
  interval: number;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export type TaskPriority = 'urgente' | 'alta' | 'normal';
export type TaskCategory = 'peticao' | 'estudo' | 'audiencia' | 'admin' | 'geral';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  subjectId?: string;
  dueDate?: string;
  completedAt?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
}

export interface StudySession {
  id: string;
  user_id: string;
  start_time: string;
  duration: number;
  subject_id: string;
  reading_id?: string;
}

export interface Reading {
  id: string;
  user_id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  subject_id?: string;
  status: 'lendo' | 'concluido' | 'pausado';
  created_at?: string;
}

export interface RankingEntry {
  user_id: string;
  name: string;
  total_seconds: number;
  rank_name: string;
}

export interface Note {
  content: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isUnlocked: boolean;
}

export interface PresenceUser {
  user_id: string;
  name: string;
  view: string;
  subject_name?: string;
  is_timer_active: boolean;
  last_seen: string;
}
