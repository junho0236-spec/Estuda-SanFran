import Dexie, { Table } from 'dexie';
import { Flashcard, Task, StudySession } from '../types';

export interface OfflineSyncQueue {
  id?: number;
  table: 'flashcards' | 'tasks' | 'study_sessions';
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export class SanFranOfflineDB extends Dexie {
  flashcards!: Table<Flashcard>;
  tasks!: Table<Task>;
  study_sessions!: Table<StudySession>;
  syncQueue!: Table<OfflineSyncQueue>;

  constructor() {
    super('SanFranOfflineDB');
    this.version(1).stores({
      flashcards: 'id, subjectId, folderId',
      tasks: 'id, subjectId, dueDate',
      study_sessions: 'id, subject_id, start_time',
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
