import Dexie, { Table } from 'dexie';
import { Flashcard, Task, StudySession, Note, SubjectFile, Folder, Subject, Board, UserProfile, LegalFrontier, PersonalChecklist } from '../types';

export interface OfflineSyncQueue {
  id?: number;
  table:
    | 'flashcards'
    | 'tasks'
    | 'study_sessions'
    | 'notes'
    | 'subject_files'
    | 'folders'
    | 'subjects'
    | 'boards'
    | 'user_profile'
    | 'legal_frontiers'
    | 'personal_checklists';
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export class SanFranOfflineDB extends Dexie {
  flashcards!: Table<Flashcard>;
  folders!: Table<Folder>;
  subjects!: Table<Subject>;
  tasks!: Table<Task>;
  study_sessions!: Table<StudySession>;
  notes!: Table<Note>;
  subject_files!: Table<SubjectFile>;
  boards!: Table<Board>;
  user_profile!: Table<UserProfile & { id: string }>;
  legal_frontiers!: Table<LegalFrontier>;
  personal_checklists!: Table<PersonalChecklist>;
  syncQueue!: Table<OfflineSyncQueue>;

  constructor() {
    super('SanFranOfflineDB');
    this.version(8).stores({
      flashcards: 'id, subjectId, folderId',
      folders: 'id, parentId',
      subjects: 'id',
      tasks: 'id, subjectId, dueDate, boardId, completed',
      study_sessions: 'id, subject_id, start_time',
      notes: 'id, subject_id, user_id',
      subject_files: 'id, subject_id, user_id, type',
      boards: 'id, userId',
      user_profile: 'id',
      legal_frontiers: 'id, user_id',
      personal_checklists: 'id, user_id, updated_at, is_pinned, archived_at',
      syncQueue: '++id, table, action, timestamp'
    });
  }
}

export const db = new SanFranOfflineDB();

export const addToSyncQueue = async (item: Omit<OfflineSyncQueue, 'id' | 'timestamp'>) => {
  await db.syncQueue.add({
    ...item,
    timestamp: new Date().toISOString()
  });
};

export const clearSyncQueue = async () => {
  await db.syncQueue.clear();
};
