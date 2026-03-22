import { supabase } from './supabaseClient';
import { db, addToSyncQueue } from './offlineService';
import { Flashcard, Task, StudySession, Note, SubjectFile, Folder, Board, UserProgress, Friendship, Notification } from '../types';

export const dataService = {
  // BOARDS
  async saveBoard(board: Board, userId: string, isOnline: boolean) {
    await db.boards.put(board);
    if (isOnline) {
      const { error } = await supabase.from('boards').upsert({
        id: board.id,
        user_id: userId,
        name: board.name,
        columns: board.columns,
        created_at: board.createdAt
      });
      if (error) {
        await addToSyncQueue({ table: 'boards', action: 'update', data: board });
      }
    } else {
      await addToSyncQueue({ table: 'boards', action: 'update', data: board });
    }
  },

  async deleteBoard(id: string, userId: string, isOnline: boolean) {
    await db.boards.delete(id);
    // Also delete tasks associated with this board? 
    // Usually better to just unassign them or delete them.
    // For now, let's just delete the board.
    if (isOnline) {
      const { error } = await supabase.from('boards').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        await addToSyncQueue({ table: 'boards', action: 'delete', data: { id } });
      }
    } else {
      await addToSyncQueue({ table: 'boards', action: 'delete', data: { id } });
    }
  },

  async addMuralFoto(userId: string, newFoto: any) {
    // 1. Get current mural_fotos
    const { data, error } = await supabase.from('user_persona').select('mural_fotos').eq('id', userId).single();
    if (error) {
      console.error("[dataService] Error fetching current mural_fotos:", error);
      throw error;
    }
    
    const currentFotos = data?.mural_fotos || [];
    const updatedFotos = [...currentFotos, newFoto];
    
    // 2. Update
    const { error: updateError } = await supabase
      .from('user_persona')
      .update({ mural_fotos: updatedFotos })
      .eq('id', userId);
      
    if (updateError) {
      console.error("[dataService] Error updating mural_fotos:", updateError);
      throw updateError;
    }
    
    // 3. Update local DB
    const localProfile = await db.user_profile.get(userId);
    if (localProfile) {
      await db.user_profile.put({ ...localProfile, mural_fotos: updatedFotos });
    }
    
    return updatedFotos;
  },

  // USER PROFILE
  async saveUserProfile(profile: any, userId: string, isOnline: boolean) {
    const sanitizeProfile = (p: any) => {
      if (!p) return null;
      return {
        ...p,
        idiomas: Array.isArray(p.idiomas) ? p.idiomas : (p.idiomas ? [p.idiomas] : []),
        mural_fotos: Array.isArray(p.mural_fotos) ? p.mural_fotos : [],
        experiencias_lideranca: Array.isArray(p.experiencias_lideranca) ? p.experiencias_lideranca : [],
        badges: Array.isArray(p.badges) ? p.badges : [],
        social_links: p.social_links || {},
        entidades: Array.isArray(p.entidades) ? p.entidades : (p.entidades ? [p.entidades] : []),
        cargos_academicos: {
          monitoria: Array.isArray(p.cargos_academicos?.monitoria) ? p.cargos_academicos.monitoria : [],
          pesquisa: Array.isArray(p.cargos_academicos?.pesquisa) ? p.cargos_academicos.pesquisa : [],
          pites: Array.isArray(p.cargos_academicos?.pites) ? p.cargos_academicos.pites : [],
          diretoria: Array.isArray(p.cargos_academicos?.diretoria) ? p.cargos_academicos.diretoria : [],
          coordenacao: Array.isArray(p.cargos_academicos?.coordenacao) ? p.cargos_academicos.coordenacao : []
        }
      };
    };

    const sanitized = sanitizeProfile(profile);
    const cloudPayload = {
      id: userId,
      persona_data: {
        archetype: sanitized.archetype,
        answers: sanitized.answers,
        scores: sanitized.scores,
        matrix: sanitized.matrix,
        tags: sanitized.tags,
        answeredQuestionIds: sanitized.answeredQuestionIds,
        persona_mode: sanitized.persona_mode,
        onboarding_completed: sanitized.onboarding_completed,
        visibility: sanitized.visibility,
        viewPreferences: sanitized.viewPreferences || {},
        skills: sanitized.skills || [],
        interests: sanitized.interests || [],
        academic_background: sanitized.academic_background || [],
        visible_modules: sanitized.visible_modules || ['jornada', 'grade', 'evolucao', 'mural', 'lideranca', 'conexoes']
      },
      profile_completion: sanitized.arcadia_score || 0,
      full_name: sanitized.full_name || null,
      bio: sanitized.bio || null,
      avatar_url: sanitized.avatar_url || null,
      turma_ano: sanitized.turma_ano || null,
      turma: Number(sanitized.turma) || null,
      sala: sanitized.sala || null,
      aniversario: sanitized.aniversario || null,
      idiomas: sanitized.idiomas,
      intercambio: sanitized.intercambio || null,
      progresso_total: Number(sanitized.progresso_total) || 0,
      progresso_obrigatorias: Number(sanitized.progresso_obrigatorias) || 0,
      progresso_optativas: Number(sanitized.progresso_optativas) || 0,
      mural_fotos: sanitized.mural_fotos,
      experiencias_lideranca: sanitized.experiencias_lideranca,
      status_geral_integralizacao: Number(sanitized.status_geral_integralizacao) || 0,
      cargos_academicos: sanitized.cargos_academicos,
      integralizacao_curriculo: sanitized.integralizacao_curriculo || {},
      curriculo_url: sanitized.curriculo_url || null,
      badges: sanitized.badges,
      social_links: sanitized.social_links,
      creditos_aula: Number(sanitized.creditos_aula) || null,
      creditos_trabalho: Number(sanitized.creditos_trabalho) || null,
      media: Number(sanitized.media) || null,
      horas_extensao: Number(sanitized.horas_extensao) || null,
      entidades: sanitized.entidades
    };

    console.log("[dataService] Saving user profile to local DB and cloud:", userId);

    await db.user_profile.put({ ...sanitized, id: userId });
    
    if (isOnline) {
      try {
        const { error } = await supabase.from('user_persona').upsert(cloudPayload);
        if (error) {
          console.warn("[dataService] Full upsert failed, falling back to field-by-field update:", error.message);
          
          // Fallback: try to update field by field to ignore problematic columns
          await supabase.from('user_persona').upsert({ id: userId });
          
          for (const [key, value] of Object.entries(cloudPayload)) {
            if (key === 'id') continue;
            try {
              const { error: fieldError } = await supabase.from('user_persona').update({ [key]: value }).eq('id', userId);
              if (fieldError) {
                console.warn(`[dataService] Field update failed for ${key}:`, fieldError.message);
              }
            } catch (e) {
              console.error(`[dataService] Error updating field ${key}:`, e);
            }
          }
        }
      } catch (e) {
        console.error("[dataService] Error saving user profile:", e);
      }
    } else {
      await addToSyncQueue({ table: 'user_profile' as any, action: 'update', data: sanitized });
    }
  },

  async getUserProfile(userId: string, isOnline: boolean) {
    const local = await db.user_profile.get(userId);
    const sanitizeProfile = (p: any) => {
      if (!p) return null;
      return {
        ...p,
        idiomas: Array.isArray(p.idiomas) ? p.idiomas : (p.idiomas ? [p.idiomas] : []),
        mural_fotos: Array.isArray(p.mural_fotos) ? p.mural_fotos : [],
        experiencias_lideranca: Array.isArray(p.experiencias_lideranca) ? p.experiencias_lideranca : [],
        badges: Array.isArray(p.badges) ? p.badges : [],
        social_links: p.social_links || {},
        entidades: Array.isArray(p.entidades) ? p.entidades : (p.entidades ? [p.entidades] : []),
        cargos_academicos: {
          monitoria: Array.isArray(p.cargos_academicos?.monitoria) ? p.cargos_academicos.monitoria : [],
          pesquisa: Array.isArray(p.cargos_academicos?.pesquisa) ? p.cargos_academicos.pesquisa : [],
          pites: Array.isArray(p.cargos_academicos?.pites) ? p.cargos_academicos.pites : [],
          diretoria: Array.isArray(p.cargos_academicos?.diretoria) ? p.cargos_academicos.diretoria : [],
          coordenacao: Array.isArray(p.cargos_academicos?.coordenacao) ? p.cargos_academicos.coordenacao : []
        }
      };
    };

    if (isOnline) {
      const { data, error } = await supabase.from('user_persona').select('*').eq('id', userId).single();
      if (!error && data) {
        const profile = sanitizeProfile({
          ...data.persona_data,
          id: data.id,
          arcadia_score: data.profile_completion,
          full_name: data.full_name,
          bio: data.bio,
          avatar_url: data.avatar_url,
          turma_ano: data.turma_ano,
          turma: data.turma,
          sala: data.sala,
          aniversario: data.aniversario,
          idiomas: data.idiomas,
          intercambio: data.intercambio,
          progresso_total: data.progresso_total,
          progresso_obrigatorias: data.progresso_obrigatorias,
          progresso_optativas: data.progresso_optativas,
          status_geral_integralizacao: data.status_geral_integralizacao,
          mural_fotos: data.mural_fotos,
          experiencias_lideranca: data.experiencias_lideranca,
          integralizacao_curriculo: data.integralizacao_curriculo,
          curriculo_url: data.curriculo_url,
          badges: data.badges,
          social_links: data.social_links,
          viewPreferences: data.persona_data?.viewPreferences || {},
          archetype: data.persona_data?.archetype || null,
          skills: data.persona_data?.skills || [],
          interests: data.persona_data?.interests || [],
          academic_background: data.persona_data?.academic_background || [],
          visible_modules: data.persona_data?.visible_modules || ['jornada', 'grade', 'evolucao', 'mural', 'lideranca', 'conexoes'],
          creditos_aula: data.creditos_aula,
          creditos_trabalho: data.creditos_trabalho,
          media: data.media,
          horas_extensao: data.horas_extensao,
          entidades: data.entidades,
          cargos_academicos: data.cargos_academicos,
          last_updated: data.updated_at
        });
        await db.user_profile.put(profile);
        return profile;
      }
    }
    return sanitizeProfile(local);
  },

  async saveDisciplinas(disciplinas: any[], userId: string) {
    try {
      if (!Array.isArray(disciplinas)) {
        console.warn("[dataService] disciplinas is not an array:", disciplinas);
        return;
      }
      // First, delete existing disciplines for this user to avoid duplicates
      await supabase.from('disciplinas').delete().eq('user_id', userId);
      
      // Then insert new ones
      if (disciplinas.length > 0) {
        const payload = disciplinas.map(d => ({
          user_id: userId,
          codigo: d.codigo,
          nome: d.nome,
          turma_sala: d.turma_sala,
          horarios: d.horarios
        }));

        const { error } = await supabase.from('disciplinas').insert(payload);
        if (error) {
          console.warn("[dataService] Error inserting disciplinas:", error);
        }
      }
    } catch (err) {
      console.warn("[dataService] Exception in saveDisciplinas:", err);
    }
  },

  async clearCloudHistory(userId: string) {
    // Delete tasks and tasks_history from Supabase
    const { error: tasksError } = await supabase.from('tasks').delete().eq('user_id', userId);
    const { error: historyError } = await supabase.from('tasks_history').delete().eq('user_id', userId);
    
    if (tasksError || historyError) {
      throw new Error("Erro ao limpar histórico na nuvem");
    }
  },
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

  async uploadFile(file: File, path: string, bucket: string = 'subject-files', contentType?: string): Promise<string> {
    const options = contentType ? { contentType } : {};
    
    // Ensure the path is unique by prepending Date.now() if not already handled
    const uniquePath = path.includes(Date.now().toString()) ? path : `${Date.now()}-${path}`;
    
    const { data, error } = await supabase.storage.from(bucket).upload(uniquePath, file, options);
    
    if (error) {
      console.error("[dataService] Upload error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        bucket,
        path: uniquePath
      });
      throw error;
    }
    
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
  },
  // TASKS
  async saveTask(task: Task, userId: string, isOnline: boolean) {
    // Optimistic update in local DB
    await db.tasks.put(task);

    if (isOnline) {
      const payload: any = {
        id: task.id,
        user_id: userId,
        title: task.title,
        notes: task.notes || null,
        due_date: task.dueDate || null,
        completed_at: task.completedAt || null,
        category: task.category || 'Geral',
        priority: task.priority === 'urgente' || task.priority === 'alta' ? 'Alta' : 'Média',
        status: task.status || (task.completed ? 'Concluido' : 'Pendente'),
        subtasks: task.subtasks || [],
        delegated_to: task.delegatedTo || null,
        delegated_by: task.delegatedBy || null,
        created_at: (task as any).created_at || (task as any).createdAt || new Date().toISOString(),
        description: JSON.stringify({
          syllabusLink: task.syllabusLink,
          importantCitations: task.importantCitations,
          revisionStatus: task.revisionStatus,
          boardId: task.boardId,
          columnId: task.columnId,
          subjectId: task.subjectId,
          delegatedByName: task.delegatedByName,
          delegatedToName: task.delegatedToName,
          originalPriority: task.priority
        })
      };

      const { error } = await supabase.from('tasks').upsert(payload);
      if (error) {
        console.error("Error syncing task to cloud, adding to queue", error);
        await addToSyncQueue({ table: 'tasks', action: 'update', data: task });
      }
    } else {
      await addToSyncQueue({ table: 'tasks', action: 'update', data: task });
    }
  },

  async getTasks(userId: string, isOnline: boolean): Promise<Task[]> {
    if (isOnline) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`user_id.eq.${userId},delegated_to.eq.${userId}`);
      
      if (!error && data) {
        const mappedTasks: Task[] = data.map(t => {
          const desc = t.description ? JSON.parse(t.description) : {};
          return {
            id: t.id,
            title: t.title,
            completed: t.status === 'Concluido',
            status: t.status,
            notes: t.notes,
            dueDate: t.due_date,
            completedAt: t.completed_at,
            category: t.category,
            priority: desc.originalPriority || (t.priority === 'Alta' ? 'alta' : 'normal'),
            subtasks: t.subtasks,
            delegatedTo: t.delegated_to,
            delegatedBy: t.delegated_by,
            delegatedByName: desc.delegatedByName,
            delegatedToName: desc.delegatedToName,
            syllabusLink: desc.syllabusLink,
            importantCitations: desc.importantCitations,
            revisionStatus: desc.revisionStatus,
            boardId: desc.boardId,
            columnId: desc.columnId,
            subjectId: desc.subjectId
          };
        });
        await db.tasks.bulkPut(mappedTasks);
        return mappedTasks;
      }
    }
    return await db.tasks.toArray();
  },

  // COLLABORATION
  async getFriendships(userId: string) {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
    
    if (error || !data) return [];

    const friendIds = data.map(f => f.user_id === userId ? f.friend_id : f.user_id);
    const { data: profiles } = await supabase
      .from('user_persona')
      .select('id, persona_data')
      .in('id', friendIds);

    return data.map(f => {
      const friendId = f.user_id === userId ? f.friend_id : f.user_id;
      const profile = profiles?.find(p => p.id === friendId);
      return {
        ...f,
        friend_name: profile?.persona_data?.nome || profile?.persona_data?.name || 'Amigo',
        friend_avatar: profile?.persona_data?.avatar_url
      };
    }) as Friendship[];
  },

  async sendFriendRequest(userId: string, friendId: string) {
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data as Friendship;
  },

  async handleFriendRequest(friendshipId: string, status: 'accepted' | 'declined') {
    const { data, error } = await supabase
      .from('friendships')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', friendshipId)
      .select()
      .single();

    if (error) {
      console.error("[dataService] Error updating friendship:", error);
      throw error;
    }
    return data as Friendship;
  },

  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error("[dataService] Error fetching notifications:", error);
      return [];
    }
    return data || [];
  },

  async markNotificationAsRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) {
      console.error("[dataService] Error marking notification as read:", error);
    }
  },

  async markAllNotificationsAsRead(userId: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    if (error) {
      console.error("[dataService] Error marking all notifications as read:", error);
    }
  },

  async createNotification(userId: string, message: string, linkTask?: string, type?: string) {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      message,
      link_task: linkTask,
      type
    });
    if (error) {
      console.error("[dataService] Error creating notification:", error);
      throw error;
    }
  },

  async archiveTasks(userId: string, isOnline: boolean) {
    if (isOnline) {
      const { error } = await supabase.rpc('archive_completed_tasks');
      if (error) {
        console.error("Error calling archive_completed_tasks RPC:", error);
        throw error;
      }
    }
    // Locally, we filter them out in the component or delete them if we want to match the RPC behavior
    const completedTasks = await db.tasks.where('completed').equals(true as any).toArray();
    for (const task of completedTasks) {
      await db.tasks.delete(task.id);
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
    if (isOnline) {
      // Prepara o payload EXATO que o banco espera (snake_case)
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
        is_suspended: card.is_suspended || false,
        total_errors: card.total_errors || 0
      };

      console.log(`[dataService] Salvando card ${card.id} no Supabase. Status: ${payload.status}`);
      
      const { data, error } = await supabase
        .from('flashcards')
        .upsert(payload, { onConflict: 'id' })
        .select();

      if (error) {
        console.error("[dataService] Erro ao salvar no Supabase:", error);
        throw new Error(`Erro ao salvar no nuvem: ${error.message}`);
      } else {
        console.log("[dataService] Card salvo com sucesso no Supabase:", data?.[0]?.id);
      }
    } else {
      throw new Error("Você precisa estar online para salvar flashcards.");
    }
  },

  async deleteFlashcard(id: string, userId: string, isOnline: boolean) {
    if (isOnline) {
      const { error } = await supabase.from('flashcards').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        throw new Error(`Erro ao deletar na nuvem: ${error.message}`);
      }
    } else {
      throw new Error("Você precisa estar online para deletar flashcards.");
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

  async getStudySessionsByDate(userId: string, dateStr: string, isOnline: boolean) {
    if (isOnline) {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', `${dateStr}T00:00:00.000Z`)
        .lte('start_time', `${dateStr}T23:59:59.999Z`);
      if (error) {
        console.error("Error fetching study sessions:", error);
        return [];
      }
      return data || [];
    } else {
      const allSessions = await db.study_sessions.where('user_id').equals(userId).toArray();
      return allSessions.filter(s => s.start_time.startsWith(dateStr));
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
          subject_id: note.subject_id,
          handwriting_data: note.handwriting_data || null,
          is_starred: note.is_starred || false
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
             const task = item.data as Task;
             payload.user_id = userId;
             payload.title = task.title;
             payload.notes = task.notes || null;
             payload.due_date = task.dueDate || null;
             payload.completed_at = task.completedAt || null;
             payload.category = task.category || 'Geral';
             payload.priority = task.priority === 'urgente' || task.priority === 'alta' ? 'Alta' : 'Média';
             payload.status = task.completed ? 'Concluido' : 'Pendente';
             payload.subtasks = task.subtasks || [];
             payload.description = JSON.stringify({
               syllabusLink: task.syllabusLink,
               importantCitations: task.importantCitations,
               revisionStatus: task.revisionStatus,
               boardId: task.boardId,
               columnId: task.columnId,
               subjectId: task.subjectId
             });
             // Remove camelCase fields
             delete payload.subjectId;
             delete payload.dueDate;
             delete payload.completedAt;
             delete payload.boardId;
             delete payload.columnId;
             delete payload.syllabusLink;
             delete payload.importantCitations;
             delete payload.revisionStatus;
             delete payload.completed;
          }
          if (item.table === 'boards') {
             payload.user_id = userId;
             payload.created_at = payload.createdAt;
             delete payload.createdAt;
             delete payload.userId;
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

          const tableName = item.table as string;
          if (tableName === 'user_profile') {
            // Use the same logic as saveUserProfile
            await this.saveUserProfile(item.data, userId, true);
            await db.syncQueue.delete(item.id!);
            continue;
          }
          
          const { error } = await supabase.from(item.table as any).upsert(payload);
          if (error) throw error;
        }
        await db.syncQueue.delete(item.id!);
      } catch (err) {
        console.error(`Failed to sync item ${item.id}`, err);
      }
    }
  },

  async updateQuestionProgress(userId: string, progress: UserProgress) {
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        favorites: progress.favorites,
        wrong_questions: progress.wrong_questions,
        correct_questions: progress.correct_questions,
        notes: progress.notes,
        correct_count: progress.correct_count,
        wrong_count: progress.wrong_count,
        error_mastery: progress.error_mastery,
        confidence_levels: progress.confidence_levels,
        question_stats: progress.question_stats,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("[dataService] Error updating user progress:", error);
      throw error;
    }
  }
};
