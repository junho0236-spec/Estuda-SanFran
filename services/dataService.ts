import { supabase } from './supabaseClient';
import { db, addToSyncQueue } from './offlineService';
import { Flashcard, Task, StudySession, Note, SubjectFile } from '../types';

export const dataService = {
  // FILES
  async saveFile(file: SubjectFile, userId: string, isOnline: boolean) {
    await db.subject_files.put(file);
    if (isOnline) {
      const { error } = await supabase.from('subject_files').upsert({
        ...file,
        user_id: userId
      });
      if (error) {
        await addToSyncQueue({ table: 'subject_files', action: 'update', data: file });
      }
    } else {
      await addToSyncQueue({ table: 'subject_files', action: 'update', data: file });
    }
  },

  async getFilesBySubjectId(subjectId: string, userId: string, isOnline: boolean): Promise<SubjectFile[]> {
    const localFiles = await db.subject_files.where('subject_id').equals(subjectId).filter(f => f.user_id === userId).toArray();
    if (isOnline) {
      try {
        const { data, error } = await supabase.from('subject_files').select('*').eq('subject_id', subjectId).eq('user_id', userId);
        if (error) throw error;
        if (data) {
          await db.subject_files.bulkPut(data as SubjectFile[]);
          return data as SubjectFile[];
        }
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    }
    return localFiles;
  },

  async deleteFile(id: string, userId: string, isOnline: boolean) {
    await db.subject_files.delete(id);
    if (isOnline) {
      const { error } = await supabase.from('subject_files').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        await addToSyncQueue({ table: 'subject_files', action: 'delete', data: { id } });
      }
    } else {
      await addToSyncQueue({ table: 'subject_files', action: 'delete', data: { id } });
    }
  },

  async uploadFile(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage.from('subject-files').upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      throw error;
    }
    const { data: { publicUrl } } = supabase.storage.from('subject-files').getPublicUrl(data.path);
    return publicUrl;
  },
  // TASKS
  async saveTask(task: any, userId: string, isOnline: boolean) {
    // Optimistic update in local DB
    await db.tasks.put(task);

    if (isOnline) {
      const payload = {
        ...task,
        user_id: userId,
        subject_id: task.subjectId || null,
        due_date: task.dueDate || null,
        completed_at: task.completedAt || null
      };
      delete payload.subjectId;
      delete payload.dueDate;
      delete payload.completedAt;

      const { error } = await supabase.from('tasks').upsert(payload);
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
      const payload = {
        ...card,
        user_id: userId,
        subject_id: card.subjectId || null,
        folder_id: card.folderId || null,
        next_review: card.nextReview
      };
      delete payload.subjectId;
      delete payload.folderId;
      delete payload.nextReview;

      console.log("Saving flashcard to Supabase:", payload);
      const { error } = await supabase.from('flashcards').upsert(payload);
      if (error) {
        console.error("Error saving flashcard to Supabase:", error);
        await addToSyncQueue({ table: 'flashcards', action: 'update', data: card });
      } else {
        console.log("Flashcard saved to Supabase successfully");
      }
    } else {
      console.log("Offline: Flashcard added to sync queue");
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
    // Optimistic update in local DB
    await db.notes.put(note);
    console.log("Note saved locally:", note.id);

    if (isOnline) {
      try {
        const { error } = await supabase.from('notes').upsert({
          ...note,
          user_id: userId,
          subject_id: note.subject_id
        });
        
        if (error) {
          console.error("Error syncing note to cloud, adding to queue", error);
          await addToSyncQueue({ table: 'notes', action: 'update', data: note });
        } else {
          console.log("Note synced to cloud successfully");
        }
      } catch (err) {
        console.error("Supabase upsert failed:", err);
        await addToSyncQueue({ table: 'notes', action: 'update', data: note });
      }
    } else {
      await addToSyncQueue({ table: 'notes', action: 'update', data: note });
    }
  },

  async getNotesBySubjectId(subjectId: string, userId: string, isOnline: boolean): Promise<Note[]> {
    // Always start with local data
    const localNotes = await db.notes
      .where('subject_id').equals(subjectId)
      .filter(n => n.user_id === userId)
      .toArray();

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('subject_id', subjectId)
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const remoteNotes = data as Note[];
          
          // Simple merge: remote wins but we update local
          if (remoteNotes.length > 0) {
            await db.notes.bulkPut(remoteNotes);
            return remoteNotes;
          }
        }
      } catch (error) {
        console.error('Error fetching notes from cloud, falling back to local:', error);
      }
    }
    
    return localNotes;
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
             payload.due_date = payload.dueDate || null;
             payload.completed_at = payload.completedAt || null;
             delete payload.subjectId;
             delete payload.dueDate;
             delete payload.completedAt;
          }
          if (item.table === 'flashcards') {
             payload.subject_id = payload.subjectId || null;
             payload.folder_id = payload.folderId || null;
             payload.next_review = payload.nextReview;
             delete payload.subjectId;
             delete payload.folderId;
             delete payload.nextReview;
          }
          
          if (item.table === 'notes') {
            // Ensure correct mapping if needed, though Note is already snake_case
            payload.subject_id = payload.subject_id || payload.subjectId;
            delete payload.subjectId;
          }

          if (item.table === 'subject_files') {
            payload.subject_id = payload.subject_id || payload.subjectId;
            delete payload.subjectId;
          }
          
          const { error } = await supabase.from(item.table).upsert(payload);
          if (error) throw error;
        }
        await db.syncQueue.delete(item.id!);
      } catch (err) {
        console.error(`Failed to sync item ${item.id}`, err);
      }
    }
  }
};
