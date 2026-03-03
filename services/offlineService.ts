import Dexie, { Table } from 'dexie';
import { Flashcard, Task, StudySession, Note, SubjectFile } from '../types';

export interface OfflineSyncQueue {
  id?: number;
  table: 'flashcards' | 'tasks' | 'study_sessions' | 'notes' | 'subject_files';
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export class SanFranOfflineDB extends Dexie {
  flashcards!: Table<Flashcard>;
  tasks!: Table<Task>;
  study_sessions!: Table<StudySession>;
  notes!: Table<Note>;
  subject_files!: Table<SubjectFile>;
  syncQueue!: Table<OfflineSyncQueue>;

  constructor() {
    super('SanFranOfflineDB');
    this.version(1).stores({
      flashcards: 'id, subjectId, folderId',
      tasks: 'id, subjectId, dueDate',
      study_sessions: 'id, subject_id, start_time',
      notes: 'id, subject_id, user_id',
      subject_files: 'id, subject_id, user_id, type',
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
