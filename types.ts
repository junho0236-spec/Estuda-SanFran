
export enum View {
  Dashboard = 'dashboard',
  Anki = 'anki',
  Timer = 'timer',
  Subjects = 'subjects',
  Tasks = 'tasks',
  Calendar = 'calendar'
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
}
