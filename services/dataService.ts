import { supabase } from './supabaseClient';
import { db, addToSyncQueue } from './offlineService';
import { Flashcard, Task, StudySession, Note } from '../types';

export const dataService = {
  // TASKS
  async saveTask(task: any, userId: string, isOnline: boolean) {
    // Optimistic update in local DB
    await db.tasks.put(task);

    if (isOnline) {
      const { error } = await supabase.from('tasks').upsert({
        ...task,
        user_id: userId,
        subject_id: task.subjectId || null
      });
      if (error) {
        console.error("Error syncing task to cloud, adding to queue", error);
        await addToSyncQueue({ table: 'tasks', action: 'update', data: task });
      }
    } else {
      await addToSyncQueue({ table: 'tasks', action: 'update', data: task });
    }
  },

  async deleteTask(id: string, userId: string, isOnline: boolean) {
    await db.tasks.delete(id);

    if (isOnline) {
      const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        await addToSyncQueue({ table: 'tasks', action: 'delete', data: { id } });
      }
    } else {
      await addToSyncQueue({ table: 'tasks', action: 'delete', data: { id } });
    }
  },

  // FLASHCARDS
  async saveFlashcard(card: any, userId: string, isOnline: boolean) {
    await db.flashcards.put(card);

    if (isOnline) {
      const { error } = await supabase.from('flashcards').upsert({
        ...card,
        user_id: userId,
        subject_id: card.subjectId || null,
        folder_id: card.folderId || null,
        next_review: card.nextReview
      });
      if (error) {
        await addToSyncQueue({ table: 'flashcards', action: 'update', data: card });
      }
    } else {
      await addToSyncQueue({ table: 'flashcards', action: 'update', data: card });
    }
  },

  async deleteFlashcard(id: string, userId: string, isOnline: boolean) {
    await db.flashcards.delete(id);

    if (isOnline) {
      const { error } = await supabase.from('flashcards').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        await addToSyncQueue({ table: 'flashcards', action: 'delete', data: { id } });
      }
    } else {
      await addToSyncQueue({ table: 'flashcards', action: 'delete', data: { id } });
    }
  },

  // STUDY SESSIONS
  async saveStudySession(session: any, userId: string, isOnline: boolean) {
    await db.study_sessions.put(session);

    if (isOnline) {
      const { error } = await supabase.from('study_sessions').insert({
        ...session,
        user_id: userId
      });
      if (error) {
        await addToSyncQueue({ table: 'study_sessions', action: 'insert', data: session });
      }
    } else {
      await addToSyncQueue({ table: 'study_sessions', action: 'insert', data: session });
    }
  },

  // NOTES
  async saveNote(note: Note, userId: string, isOnline: boolean) {
    await db.notes.put(note);

    if (isOnline) {
      const { error } = await supabase.from('notes').upsert({
        ...note,
        user_id: userId,
        subject_id: note.subject_id
      });
      if (error) {
        console.error("Error syncing note to cloud, adding to queue", error);
        await addToSyncQueue({ table: 'notes', action: 'update', data: note });
      }
    } else {
      await addToSyncQueue({ table: 'notes', action: 'update', data: note });
    }
  },

  async getNotesBySubjectId(subjectId: string, userId: string, isOnline: boolean): Promise<Note[]> {
    if (isOnline) {
      const { data, error } = await supabase.from('notes').select('*').eq('subject_id', subjectId).eq('user_id', userId).order('updated_at', { ascending: false });
      if (error) {
        console.error('Error fetching notes from cloud:', error);
      }
      return (data || []) as Note[];
    } else {
      return db.notes.where({ subject_id: subjectId, user_id: userId }).toArray();
    }
  },

  async deleteNote(id: string, userId: string, isOnline: boolean) {
    await db.notes.delete(id);

    if (isOnline) {
      const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        await addToSyncQueue({ table: 'notes', action: 'delete', data: { id } });
      }
    } else {
      await addToSyncQueue({ table: 'notes', action: 'delete', data: { id } });
    }
  },

  // SYNC ALL
  async syncOfflineData(userId: string) {
    const queue = await db.syncQueue.toArray();
    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} items...`);

    for (const item of queue) {
      try {
        if (item.action === 'delete') {
          await supabase.from(item.table).delete().eq('id', item.data.id).eq('user_id', userId);
        } else {
          const payload = { ...item.data, user_id: userId };
          // Map camelCase to snake_case for Supabase if needed
          if (item.table === 'tasks') {
             payload.subject_id = payload.subjectId || null;
             delete payload.subjectId;
          }
          if (item.table === 'flashcards') {
             payload.subject_id = payload.subjectId || null;
             payload.folder_id = payload.folderId || null;
             payload.next_review = payload.nextReview;
             delete payload.subjectId;
             delete payload.folderId;
             delete payload.nextReview;
          }
          
          await supabase.from(item.table).upsert(payload);
        }
        await db.syncQueue.delete(item.id!);
      } catch (err) {
        console.error(`Failed to sync item ${item.id}`, err);
      }
    }
  }
};
