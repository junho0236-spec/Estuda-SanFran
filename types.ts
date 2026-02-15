
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

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  subjectId?: string;
  dueDate?: string;
  completedAt?: string;
}

export interface StudySession {
  id: string;
  // Adicionando user_id para compatibilidade com o retorno do Supabase e criação de objetos locais
  user_id: string;
  start_time: string;
  duration: number;
  subject_id: string;
}
