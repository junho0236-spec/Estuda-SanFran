import { supabase } from './supabaseClient';
import { db, addToSyncQueue } from './offlineService';
import { Flashcard, Task, StudySession, Note, SubjectFile, Folder } from '../types';

export const dataService = {
  // FOLDERS
  async saveFolder(folder: Folder, userId: string, isOnline: boolean) {
    await db.folders.put(folder);
    if (isOnline) {
      const { error } = await supabase.from('folders').upsert({
        id: folder.id,
        user_id: userId,
        name: folder.name,
        parent_id: folder.parentId,
        color: folder.color,
        icon: folder.icon || null,
        target_date: folder.targetDate || null,
        shared: folder.shared || false,
        original_deck_id: folder.original_deck_id || null,
        version: folder.version || 1
      });
      if (error) {
        await addToSyncQueue({ table: 'folders', action: 'update', data: folder });
      }
    } else {
      await addToSyncQueue({ table: 'folders', action: 'update', data: folder });
    }
  },

  async deleteFolder(id: string, userId: string, isOnline: boolean) {
    // This is the recursive logic moved to service
    const allFolders = await db.folders.toArray();
    const getDescendantIds = (folderId: string): string[] => {
      let ids: string[] = [];
      const children = allFolders.filter(f => f.parentId === folderId);
      for (const child of children) {
        ids.push(child.id);
        ids.push(...getDescendantIds(child.id));
      }
      return ids;
    };

    const allFolderIdsToDelete = [id, ...getDescendantIds(id)];

    // Delete locally
    await db.folders.bulkDelete(allFolderIdsToDelete);
    await db.flashcards.where('folderId').anyOf(allFolderIdsToDelete).delete();

    if (isOnline) {
      // Delete in Supabase
      const { error: cardsError } = await supabase
        .from('flashcards')
        .delete()
        .in('folder_id', allFolderIdsToDelete)
        .eq('user_id', userId);
        
      const { error: folderError } = await supabase
        .from('folders')
        .delete()
        .in('id', allFolderIdsToDelete)
        .eq('user_id', userId);

      if (cardsError || folderError) {
        // If one fails, we add to queue (simplified: we just queue the top-level delete)
        await addToSyncQueue({ table: 'folders', action: 'delete', data: { id, recursive: true } });
      }
    } else {
      await addToSyncQueue({ table: 'folders', action: 'delete', data: { id, recursive: true } });
    }
  },
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
    // 1. Salva localmente primeiro (IndexedDB)
    await db.flashcards.put(card);

      if (isOnline) {
        // 2. Prepara o payload EXATO que o banco espera (snake_case)
        const payload = {
          id: card.id,
          user_id: userId,
          subject_id: card.subjectId || null,
          folder_id: card.folderId || null,
          front: card.front,
          back: card.back,
          notes: card.notes || null,
          next_review: card.nextReview ? Math.floor(card.nextReview) : Date.now(),
          interval: card.interval || 0,
          status: card.status || 'new',
          learning_step: card.learningStep || 0,
          ease_factor: card.easeFactor || 2.5,
          archived_at: card.archived_at || null,
          tags: card.tags || [],
          source: card.source || null,
          is_suspended: card.is_suspended || false
        };

        console.log(`[dataService] Salvando card ${card.id} no Supabase. Status: ${payload.status}`);
        
        const { data, error } = await supabase
          .from('flashcards')
          .upsert(payload, { onConflict: 'id' })
          .select();

        if (error) {
          console.error("[dataService] Erro ao salvar no Supabase:", error);
          await addToSyncQueue({ table: 'flashcards', action: 'update', data: card });
          throw new Error(`Erro ao salvar no nuvem: ${error.message}`);
        } else {
          console.log("[dataService] Card salvo com sucesso no Supabase:", data?.[0]?.id);
        }
      } else {
      console.log("Modo Offline: Card agendado para sincronização.");
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
          if (item.table === 'folders' && item.data.recursive) {
             // Handle recursive folder deletion during sync
             // Fetch all folders to find descendants in JS
             const { data: allFolders } = await supabase.from('folders').select('id, parent_id').eq('user_id', userId);
             
             const getDescendantIds = (folderId: string, folders: any[]): string[] => {
               let ids: string[] = [];
               const children = folders.filter(f => f.parent_id === folderId);
               for (const child of children) {
                 ids.push(child.id);
                 ids.push(...getDescendantIds(child.id, folders));
               }
               return ids;
             };
             
             const ids = [item.data.id, ...getDescendantIds(item.data.id, allFolders || [])];
             
             await supabase.from('flashcards').delete().in('folder_id', ids).eq('user_id', userId);
             await supabase.from('folders').delete().in('id', ids).eq('user_id', userId);
          } else {
            await supabase.from(item.table).delete().eq('id', item.data.id).eq('user_id', userId);
          }
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
             payload.status = payload.status || 'new';
             delete payload.subjectId;
             delete payload.folderId;
             delete payload.nextReview;
          }
          
          if (item.table === 'folders') {
             payload.parent_id = payload.parentId || null;
             payload.target_date = payload.targetDate || null;
             payload.icon = payload.icon || null;
             delete payload.parentId;
             delete payload.targetDate;
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
