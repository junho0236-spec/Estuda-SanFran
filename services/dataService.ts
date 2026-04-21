import { supabase } from './supabaseClient';
import { db, addToSyncQueue, type OfflineSyncQueue } from './offlineService';
import { Flashcard, Task, StudySession, Note, SubjectFile, Folder, Board, UserProgress, Friendship, Notification, PersonalChecklist } from '../types';
import { TASK_CLOUD_COLUMNS, formatCloudTaskRow } from '../utils/supabaseCloudRowFormatters';
import {
  FRIENDSHIPS_LIST_COLUMNS,
  NOTES_LIST_COLUMNS,
  NOTIFICATIONS_LIST_COLUMNS,
  STUDY_SESSIONS_LIST_COLUMNS,
  SUBJECT_FILES_LIST_COLUMNS,
  USER_PERSONA_FOR_APP_PROFILE,
} from '../utils/supabaseSelectColumns';

/** Tamanho máximo de linhas por pedido upsert/delete em lote (menos pressão no PostgREST / nano). */
const SYNC_UPSERT_CHUNK = 120;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Postgres `study_sessions.id` é UUID; IDs curtos (ex. do Pomodoro) quebram o upsert em lote. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return typeof id === 'string' && UUID_RE.test(id.trim());
}

/**
 * Coluna `tasks.status` no Supabase. Ao ler, `completed` na app vem de `status === 'Concluido'`.
 * Nunca usar `task.status || …`: com `status: 'Pendente'` (truthy) ignorava-se `completed: true` e o upsert gravava sempre pendente.
 */
function taskStatusForSupabase(task: Task): string {
  if (task.completed) return 'Concluido';
  const s = task.status;
  if (s && s !== 'Concluido') return s;
  return 'Pendente';
}

function normalizePersonalChecklist(row: Record<string, unknown>, userId: string): PersonalChecklist {
  const rawItems = Array.isArray(row.items) ? row.items : [];
  const items = rawItems
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const current = item as Record<string, unknown>;
      const text = typeof current.text === 'string' ? current.text : '';
      if (!text.trim()) return null;
      return {
        id:
          typeof current.id === 'string' && current.id.trim()
            ? current.id
            : crypto.randomUUID(),
        text: text.trim(),
        checked: !!current.checked,
        order: typeof current.order === 'number' ? current.order : index,
        checked_at:
          typeof current.checked_at === 'string'
            ? current.checked_at
            : current.checked_at === null
              ? null
              : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));

  const createdAt =
    typeof row.created_at === 'string' && row.created_at
      ? row.created_at
      : new Date().toISOString();
  const updatedAt =
    typeof row.updated_at === 'string' && row.updated_at
      ? row.updated_at
      : createdAt;

  return {
    id: String(row.id ?? crypto.randomUUID()),
    user_id: typeof row.user_id === 'string' && row.user_id ? row.user_id : userId,
    title: String(row.title ?? 'Minha Lista'),
    description: typeof row.description === 'string' ? row.description : null,
    items,
    is_pinned: !!row.is_pinned,
    archived_at: typeof row.archived_at === 'string' ? row.archived_at : null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

/**
 * Chave estável para “último evento na fila ganha” (evita upsert+delete contraditórios duplicados).
 */
function getSyncResolutionKey(item: OfflineSyncQueue, userId: string): string {
  if (item.table === 'user_profile') {
    return `user_profile::${userId}`;
  }
  if (item.action === 'delete') {
    if (item.table === 'folders' && item.data?.recursive) {
      return `folders_recursive::${item.data.id}`;
    }
    return `delete::${item.table}::${item.data.id}`;
  }
  const rawId = item.data?.id;
  const eid = rawId != null && rawId !== '' ? String(rawId) : `noid_${item.timestamp}`;
  return `upsert::${item.table}::${eid}`;
}

function mapSyncQueueItemToRow(item: OfflineSyncQueue, userId: string): Record<string, unknown> | null {
  if (item.table === 'user_profile') return null;

  if (item.table === 'flashcards') {
    const card = item.data as Flashcard & Record<string, unknown>;
    return {
      id: card.id,
      user_id: userId,
      subject_id: card.subjectId || null,
      folder_id: card.folderId || null,
      front: card.front,
      back: card.back,
      notes: card.notes || null,
      next_review: card.nextReview != null ? Math.floor(Number(card.nextReview)) : Date.now(),
      interval: card.interval ?? 0,
      status: card.status || 'new',
      learning_step: card.learningStep ?? 0,
      ease_factor: card.easeFactor ?? 2.5,
      archived_at: card.archived_at || null,
      tags: card.tags || [],
      source: card.source || null,
      is_suspended: card.is_suspended || false,
      total_errors: card.total_errors ?? 0,
    };
  }

  const payload: Record<string, unknown> = { ...item.data, user_id: userId };

  if (item.table === 'tasks') {
    const task = item.data as Task;
    payload.user_id = task.taskOwnerId ?? userId;
    payload.title = task.title;
    payload.notes = task.notes || null;
    payload.due_date = task.dueDate || null;
    payload.completed_at = task.completedAt || null;
    payload.category = task.category || 'Geral';
    payload.priority = task.priority === 'urgente' || task.priority === 'alta' ? 'Alta' : 'Média';
    payload.status = taskStatusForSupabase(task);
    payload.subtasks = task.subtasks || [];
    payload.delegated_to = task.delegatedTo || null;
    payload.delegated_by = task.delegatedBy || null;
    payload.subject_id = task.subjectId || null;
    payload.created_at =
      (task as { created_at?: string }).created_at ||
      (task as { createdAt?: string }).createdAt ||
      new Date().toISOString();
    payload.description = JSON.stringify({
      syllabusLink: task.syllabusLink,
      importantCitations: task.importantCitations,
      revisionStatus: task.revisionStatus,
      boardId: task.boardId,
      columnId: task.columnId,
      subjectId: task.subjectId,
      delegatedByName: task.delegatedByName,
      delegatedToName: task.delegatedToName,
      originalPriority: task.priority,
      recurrence: task.recurrence,
      library_attachments: task.library_attachments,
      total_focus_time: task.total_focus_time,
      parentTaskId: task.parentTaskId,
      dependencies: task.dependencies,
      storyPoints: task.storyPoints,
      comments: task.comments,
      google_event_id: task.google_event_id,
    });
    delete payload.subjectId;
    delete payload.dueDate;
    delete payload.completedAt;
    delete payload.boardId;
    delete payload.columnId;
    delete payload.syllabusLink;
    delete payload.importantCitations;
    delete payload.revisionStatus;
    delete payload.completed;
    delete payload.delegatedTo;
    delete payload.delegatedBy;
    delete payload.taskOwnerId;
  }

  if (item.table === 'boards') {
    payload.user_id = userId;
    payload.created_at = payload.createdAt;
    delete payload.createdAt;
    delete payload.userId;
  }

  if (item.table === 'folders') {
    payload.parent_id = payload.parentId || null;
    payload.target_date = payload.targetDate || null;
    payload.icon = payload.icon || null;
    delete payload.parentId;
    delete payload.targetDate;
  }

  if (item.table === 'notes') {
    payload.user_id = userId;
    payload.subject_id = (item.data as Note).subject_id || payload.subjectId;
    payload.handwriting_data = (item.data as Note).handwriting_data ?? null;
    payload.is_starred = (item.data as Note).is_starred || false;
    delete payload.subjectId;
  }

  if (item.table === 'personal_checklists') {
    payload.user_id = payload.user_id || userId;
    payload.items = Array.isArray(payload.items) ? payload.items : [];
    payload.updated_at =
      typeof payload.updated_at === 'string' ? payload.updated_at : new Date().toISOString();
    payload.created_at =
      typeof payload.created_at === 'string' ? payload.created_at : payload.updated_at;
  }

  if (item.table === 'subject_files') {
    payload.subject_id = payload.subject_id || payload.subjectId;
    delete payload.subjectId;
  }

  return payload;
}

/** Colunas aceites pelo PostgREST após o primeiro upsert bem-sucedido (evita N× strips na fila). */
let notesRemoteColumnKeys: Set<string> | null = null;

function projectNotePayloadToKnownColumns(payload: Record<string, unknown>): Record<string, unknown> {
  if (!notesRemoteColumnKeys || notesRemoteColumnKeys.size === 0) return { ...payload };
  const out: Record<string, unknown> = {};
  for (const k of notesRemoteColumnKeys) {
    if (Object.prototype.hasOwnProperty.call(payload, k)) out[k] = payload[k];
  }
  return out;
}

/**
 * Upsert a note row; strip columns missing from the remote schema (PostgREST PGRST204)
 * until the payload matches, so sync/backfill still works across Supabase projects.
 */
async function upsertNoteToSupabase(payload: Record<string, unknown>) {
  let current: Record<string, unknown> = notesRemoteColumnKeys
    ? projectNotePayloadToKnownColumns(payload)
    : { ...payload };
  const maxStrips = 12;
  let triedBareMinimum = false;

  for (let i = 0; i < maxStrips; i++) {
    const { error } = await supabase
      .from('notes')
      .upsert(current, { onConflict: 'user_id' });
    if (!error) {
      notesRemoteColumnKeys = new Set(Object.keys(current));
      return { error: null };
    }

    const code = (error as { code?: string }).code;
    const msg = String((error as { message?: string }).message ?? '');

    if (code === 'PGRST204') {
      const m =
        msg.match(/find the '([^']+)' column/i) ||
        msg.match(/find the "([^"]+)" column/i);
      if (m) {
        const col = m[1];
        const next = { ...current };
        delete next[col];
        current = next;
        continue;
      }
      if (!triedBareMinimum) {
        triedBareMinimum = true;
        current = {
          id: payload.id,
          user_id: payload.user_id,
          subject_id: payload.subject_id,
          title: (payload.title as string) ?? null,
          content: (payload.content as string) ?? '',
          updated_at: payload.updated_at
        };
        continue;
      }
    }

    return { error };
  }

  const { error: lastErr } = await supabase
    .from('notes')
    .upsert(current, { onConflict: 'user_id' });
  if (!lastErr) {
    notesRemoteColumnKeys = new Set(Object.keys(current));
  }
  return { error: lastErr };
}

async function batchUpsertNotes(rows: Record<string, unknown>[]): Promise<{ error: { message?: string } | null }> {
  if (rows.length === 0) return { error: null };
  const prepared = notesRemoteColumnKeys ? rows.map((r) => projectNotePayloadToKnownColumns(r)) : rows;
  const { error } = await supabase.from('notes').upsert(prepared, { onConflict: 'id' });
  if (!error) return { error: null };

  for (const row of rows) {
    const { error: oneErr } = await upsertNoteToSupabase(row);
    if (oneErr) return { error: oneErr };
  }
  return { error: null };
}

const SYNC_UPSERT_TABLE_ORDER = [
  'subjects',
  'folders',
  'boards',
  'tasks',
  'personal_checklists',
  'flashcards',
  'notes',
  'study_sessions',
  'subject_files',
  'legal_frontiers',
] as const;

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
        taskBoardTabOrder: Array.isArray(sanitized.taskBoardTabOrder) ? sanitized.taskBoardTabOrder : [],
        hiddenTaskTabs: Array.isArray(sanitized.hiddenTaskTabs) ? sanitized.hiddenTaskTabs : [],
        skills: sanitized.skills || [],
        interests: sanitized.interests || [],
        academic_background: sanitized.academic_background || [],
        visible_modules: sanitized.visible_modules || ['jornada', 'grade', 'evolucao', 'mural', 'lideranca', 'conexoes'],
        prestigePoints: sanitized.prestigePoints || 0,
        productivityStats: sanitized.productivityStats || { completedToday: 0, completedYesterday: 0, streak: 0 },
        lastInteractionDate: sanitized.lastInteractionDate || null,
        tasksEscalatePriorityWhenOverdue: !!sanitized.tasksEscalatePriorityWhenOverdue,
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
      const { data, error } = await supabase
        .from('user_persona')
        .select(USER_PERSONA_FOR_APP_PROFILE)
        .eq('id', userId)
        .single();
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
          taskBoardTabOrder: data.persona_data?.taskBoardTabOrder || [],
          hiddenTaskTabs: data.persona_data?.hiddenTaskTabs || [],
          archetype: data.persona_data?.archetype || null,
          skills: data.persona_data?.skills || [],
          interests: data.persona_data?.interests || [],
          academic_background: data.persona_data?.academic_background || [],
          visible_modules: data.persona_data?.visible_modules || ['jornada', 'grade', 'evolucao', 'mural', 'lideranca', 'conexoes'],
          prestigePoints: data.persona_data?.prestigePoints || 0,
          productivityStats: data.persona_data?.productivityStats || { completedToday: 0, completedYesterday: 0, streak: 0 },
          lastInteractionDate: data.persona_data?.lastInteractionDate || null,
          tasksEscalatePriorityWhenOverdue: !!data.persona_data?.tasksEscalatePriorityWhenOverdue,
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
        const { data, error } = await supabase
          .from('subject_files')
          .select(SUBJECT_FILES_LIST_COLUMNS)
          .eq('subject_id', subjectId)
          .eq('user_id', userId);
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
    const previous = await db.tasks.get(task.id);
    // Optimistic update in local DB
    await db.tasks.put(task);

    if (isOnline) {
      const payload: any = {
        id: task.id,
        user_id: task.taskOwnerId ?? userId,
        title: task.title,
        notes: task.notes || null,
        due_date: task.dueDate || null,
        completed_at: task.completedAt || null,
        category: task.category || 'Geral',
        priority: task.priority === 'urgente' || task.priority === 'alta' ? 'Alta' : 'Média',
        status: taskStatusForSupabase(task),
        subtasks: task.subtasks || [],
        delegated_to: task.delegatedTo || null,
        delegated_by: task.delegatedBy || null,
        subject_id: task.subjectId || null,
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
          originalPriority: task.priority,
          recurrence: task.recurrence,
          library_attachments: task.library_attachments,
          total_focus_time: task.total_focus_time,
          parentTaskId: task.parentTaskId,
          dependencies: task.dependencies,
          storyPoints: task.storyPoints,
          comments: task.comments
        })
      };

      const { error } = await supabase.from('tasks').upsert(payload);
      if (error) {
        console.error("Error syncing task to cloud, adding to queue", error);
        await addToSyncQueue({ table: 'tasks', action: 'update', data: task });
      }

      // Google Agenda: atualizar/criar com prazo; remover evento se o prazo foi limpo
      if (!error) {
        (async () => {
          try {
            const { googleCalendarService } = await import('./googleCalendarService');
            const staleEventId = !task.dueDate
              ? previous?.google_event_id || task.google_event_id
              : null;

            if (staleEventId) {
              await googleCalendarService.deleteEvent(staleEventId);
              const cleared = { ...task, google_event_id: undefined };
              await db.tasks.put(cleared);
              const desc = JSON.parse(payload.description);
              delete desc.google_event_id;
              await supabase
                .from('tasks')
                .update({
                  description: JSON.stringify(desc),
                  google_event_id: null,
                })
                .eq('id', task.id);
              return;
            }

            if (task.dueDate) {
              const result = await googleCalendarService.syncTaskToGoogle(task);
              if (result?.id && result.id !== task.google_event_id) {
                const updatedTask = { ...task, google_event_id: result.id };
                await db.tasks.put(updatedTask);
                const desc = JSON.parse(payload.description);
                desc.google_event_id = result.id;
                await supabase
                  .from('tasks')
                  .update({
                    description: JSON.stringify(desc),
                    google_event_id: result.id,
                  })
                  .eq('id', task.id);
              }
            }
          } catch (e) {
            console.warn('[dataService] Google Calendar sync failed:', e);
          }
        })();
      }
    } else {
      await addToSyncQueue({ table: 'tasks', action: 'update', data: task });
    }
  },

  async getTasks(userId: string, isOnline: boolean): Promise<Task[]> {
    if (isOnline) {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_CLOUD_COLUMNS)
        .or(`user_id.eq.${userId},delegated_to.eq.${userId}`);
      
      if (!error && data) {
        const mappedTasks: Task[] = data.map((t) =>
          formatCloudTaskRow(t as unknown as Record<string, unknown>)
        );
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
      .select(FRIENDSHIPS_LIST_COLUMNS)
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
      .select(FRIENDSHIPS_LIST_COLUMNS)
      .single();

    if (error) throw error;
    return data as Friendship;
  },

  async handleFriendRequest(friendshipId: string, status: 'accepted' | 'declined') {
    const { data, error } = await supabase
      .from('friendships')
      .update({ 
        status
      })
      .eq('id', friendshipId)
      .select(FRIENDSHIPS_LIST_COLUMNS)
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
      .select(NOTIFICATIONS_LIST_COLUMNS)
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
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .neq('type', 'friend_request');
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

  /** Arquiva concluídas na nuvem (RPC). Offline: não altera dados; retorna `false`. */
  async archiveTasks(userId: string, isOnline: boolean): Promise<boolean> {
    if (!isOnline) {
      console.warn('[dataService] archiveTasks: requer nuvem; não alterar Dexie offline (evita sumir tarefas delegadas).');
      return false;
    }
    const { error } = await supabase.rpc('archive_completed_tasks');
    if (error) {
      console.error("Error calling archive_completed_tasks RPC:", error);
      throw error;
    }
    await dataService.getTasks(userId, true);
    return true;
  },

  async deleteTask(id: string, userId: string, isOnline: boolean) {
    const existing = await db.tasks.get(id);
    await db.tasks.delete(id);

    if (existing?.google_event_id && isOnline) {
      (async () => {
        try {
          const { googleCalendarService } = await import('./googleCalendarService');
          await googleCalendarService.deleteEvent(existing.google_event_id!);
        } catch (e) {
          console.warn('[dataService] Google Calendar delete failed:', e);
        }
      })();
    }

    if (isOnline) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .or(`user_id.eq.${userId},delegated_to.eq.${userId}`);
      if (error) {
        const code = String((error as { code?: string }).code || '');
        const msg = String((error as { message?: string }).message || '').toLowerCase();
        const isLikelyNetworkIssue =
          code === '' ||
          msg.includes('failed to fetch') ||
          msg.includes('network') ||
          msg.includes('timeout') ||
          msg.includes('temporar');

        if (isLikelyNetworkIssue) {
          await addToSyncQueue({ table: 'tasks', action: 'delete', data: { id } });
        } else {
          // Reverte localmente quando o erro é estrutural/permissão (ex.: RLS),
          // para evitar "sumir e voltar" após recarregar.
          if (existing) await db.tasks.put(existing);
          throw error;
        }
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
    const sid = String(session?.id ?? '');
    const normalized = isValidUuid(sid) ? session : { ...session, id: crypto.randomUUID() };
    await db.study_sessions.put(normalized);

    if (isOnline) {
      const { error } = await supabase.from('study_sessions').insert({
        ...normalized,
        user_id: userId
      });
      if (error) {
        await addToSyncQueue({ table: 'study_sessions', action: 'insert', data: normalized });
      }
    } else {
      await addToSyncQueue({ table: 'study_sessions', action: 'insert', data: normalized });
    }
  },

  async getStudySessionsByDate(userId: string, dateStr: string, isOnline: boolean) {
    if (isOnline) {
      const { data, error } = await supabase
        .from('study_sessions')
        .select(STUDY_SESSIONS_LIST_COLUMNS)
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
        const { error } = await upsertNoteToSupabase({
          ...note,
          user_id: userId,
          subject_id: note.subject_id,
          handwriting_data: note.handwriting_data ?? null,
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
          .select(NOTES_LIST_COLUMNS)
          .eq('subject_id', subjectId)
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const remoteNotes = data as Note[];
          
          if (remoteNotes.length > 0) {
            const remoteById = new Map(remoteNotes.map((n) => [n.id, n]));
            const merged: Note[] = [];

            for (const r of remoteNotes) {
              const loc = localNotes.find((l) => l.id === r.id);
              if (!loc) {
                merged.push(r);
                continue;
              }
              const tr = new Date(r.updated_at).getTime();
              const tl = new Date(loc.updated_at).getTime();
              merged.push(tl >= tr ? loc : r);
            }

            for (const loc of localNotes) {
              if (!remoteById.has(loc.id)) merged.push(loc);
            }

            merged.sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );

            await db.notes.bulkPut(merged);

            if (isOnline) {
              const newerLocals = localNotes.filter((loc) => {
                const r = remoteById.get(loc.id);
                return !r || new Date(loc.updated_at).getTime() > new Date(r.updated_at).getTime();
              });
              if (newerLocals.length > 0) {
                const rows = newerLocals.map((loc) => ({
                  ...loc,
                  user_id: userId,
                  subject_id: loc.subject_id,
                  handwriting_data: loc.handwriting_data ?? null,
                  is_starred: loc.is_starred || false,
                })) as Record<string, unknown>[];
                for (const chunk of chunkArray(rows, SYNC_UPSERT_CHUNK)) {
                  const { error: batchErr } = await batchUpsertNotes(chunk);
                  if (batchErr) console.warn('[notes] lote após merge falhou', batchErr);
                }
              }
            }

            return merged;
          }

          // Cloud empty but this device has notes (e.g. upsert failed earlier, or only IndexedDB was used).
          // Push locals so other browsers / Simple Browser see the same list after refetch.
          if (localNotes.length > 0) {
            const rows = localNotes.map(
              (n) =>
                ({
                  ...n,
                  user_id: userId,
                  subject_id: n.subject_id,
                  handwriting_data: n.handwriting_data ?? null,
                  is_starred: n.is_starred || false,
                }) as Record<string, unknown>
            );
            let anySynced = false;
            for (const chunk of chunkArray(rows, SYNC_UPSERT_CHUNK)) {
              const { error: upErr } = await batchUpsertNotes(chunk);
              if (!upErr) anySynced = true;
            }
            if (anySynced) {
              const { data: data2, error: err2 } = await supabase
                .from('notes')
                .select(NOTES_LIST_COLUMNS)
                .eq('subject_id', subjectId)
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });
              if (!err2 && data2 && (data2 as Note[]).length > 0) {
                const merged = data2 as Note[];
                await db.notes.bulkPut(merged);
                return merged;
              }
            }
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

  // MINHAS LISTAS
  async savePersonalChecklist(list: PersonalChecklist, userId: string, isOnline: boolean) {
    const now = new Date().toISOString();
    const normalized = normalizePersonalChecklist(
      {
        ...list,
        user_id: list.user_id || userId,
        updated_at: list.updated_at || now,
        created_at: list.created_at || now,
      } as Record<string, unknown>,
      userId
    );
    await db.personal_checklists.put(normalized);

    const payload = {
      id: normalized.id,
      user_id: normalized.user_id,
      title: normalized.title,
      description: normalized.description || null,
      items: normalized.items,
      is_pinned: !!normalized.is_pinned,
      archived_at: normalized.archived_at || null,
      created_at: normalized.created_at,
      updated_at: normalized.updated_at,
    };

    if (isOnline) {
      const { error } = await supabase.from('personal_checklists').upsert(payload, { onConflict: 'id' });
      if (error) {
        await addToSyncQueue({ table: 'personal_checklists', action: 'update', data: payload });
      }
    } else {
      await addToSyncQueue({ table: 'personal_checklists', action: 'update', data: payload });
    }
  },

  async getPersonalChecklists(userId: string, isOnline: boolean): Promise<PersonalChecklist[]> {
    const localRows = await db.personal_checklists.where('user_id').equals(userId).toArray();

    if (isOnline) {
      const { data, error } = await supabase
        .from('personal_checklists')
        .select('id, user_id, title, description, items, is_pinned, archived_at, created_at, updated_at')
        .eq('user_id', userId)
        .is('archived_at', null)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (!error && data) {
        const mapped = (data as Record<string, unknown>[]).map((row) =>
          normalizePersonalChecklist(row, userId)
        );
        await db.personal_checklists.bulkPut(mapped);
        return mapped;
      }
    }

    return localRows
      .filter((row) => !row.archived_at)
      .sort((a, b) => {
        const pinDiff = Number(!!b.is_pinned) - Number(!!a.is_pinned);
        if (pinDiff !== 0) return pinDiff;
        return String(b.updated_at).localeCompare(String(a.updated_at));
      });
  },

  async deletePersonalChecklist(id: string, userId: string, isOnline: boolean) {
    await db.personal_checklists.delete(id);

    if (isOnline) {
      const { error } = await supabase
        .from('personal_checklists')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) {
        await addToSyncQueue({ table: 'personal_checklists', action: 'delete', data: { id } });
      }
    } else {
      await addToSyncQueue({ table: 'personal_checklists', action: 'delete', data: { id } });
    }
  },

  // SYNC ALL — lote (batch) para não disparar centenas de pedidos HTTP ao PostgREST de uma vez.
  async syncOfflineData(userId: string) {
    const queue = await db.syncQueue.orderBy('id').toArray();
    if (queue.length === 0) return;

    const n = queue.length;
    const lastWinIndex = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const key = getSyncResolutionKey(queue[i], userId);
      lastWinIndex.set(key, i);
    }

    const supersededIds = queue
      .map((item, i) =>
        item.id != null && lastWinIndex.get(getSyncResolutionKey(item, userId)) !== i ? item.id : null
      )
      .filter((x): x is number => x != null);

    if (supersededIds.length > 0) {
      await db.syncQueue.bulkDelete(supersededIds);
    }

    const winners = queue.filter(
      (item, i) => lastWinIndex.get(getSyncResolutionKey(item, userId)) === i
    );
    if (winners.length === 0) return;

    console.log(
      `[sync] ${n} entradas na fila → ${winners.length} operações efetivas após dedupe (lotes de ${SYNC_UPSERT_CHUNK})`
    );

    const winnerIdsSucceeded: number[] = [];

    const collectProfile = winners.filter((w) => w.table === 'user_profile');
    const collectRecursive = winners.filter(
      (w) => w.action === 'delete' && w.table === 'folders' && w.data?.recursive
    );
    const collectSimpleDeletes = winners.filter(
      (w) => w.action === 'delete' && !(w.table === 'folders' && w.data?.recursive)
    );
    const collectUpserts = winners.filter((w) => w.action !== 'delete' && w.table !== 'user_profile');

    const byUpsertTable = new Map<string, OfflineSyncQueue[]>();
    for (const w of collectUpserts) {
      if (!byUpsertTable.has(w.table)) byUpsertTable.set(w.table, []);
      byUpsertTable.get(w.table)!.push(w);
    }

    const runUpsertTable = async (table: string) => {
      const group = byUpsertTable.get(table);
      if (!group?.length) return;

      const rowMap = new Map<string, Record<string, unknown>>();
      const qids: number[] = [];

      for (const item of group) {
        const row = mapSyncQueueItemToRow(item, userId);
        if (!row) continue;
        const rid = row.id;
        if (rid == null || rid === '') {
          console.warn('[sync] upsert sem id, ignorando', table, item.id);
          continue;
        }
        rowMap.set(String(rid), row);
        if (item.id != null) qids.push(item.id);
      }

      const rows = [...rowMap.values()];
      if (rows.length === 0) return;

      const studySessionIdRewrites = new Map<string, string>();
      if (table === 'study_sessions') {
        for (const row of rows) {
          const sid = String(row.id ?? '');
          if (!isValidUuid(sid)) {
            const nid = crypto.randomUUID();
            studySessionIdRewrites.set(sid, nid);
            row.id = nid;
          }
        }
      }

      for (const chunk of chunkArray(rows, SYNC_UPSERT_CHUNK)) {
        let error: { message?: string } | null = null;
        if (table === 'notes') {
          const r = await batchUpsertNotes(chunk);
          error = r.error;
        } else {
          const res = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
          error = res.error;
        }
        if (error) {
          console.error(`[sync] upsert em lote falhou (tabela=${table})`, error);
          throw error;
        }
      }

      if (table === 'study_sessions' && studySessionIdRewrites.size > 0) {
        for (const [oldId, newId] of studySessionIdRewrites) {
          try {
            const rec = await db.study_sessions.get(oldId);
            if (rec) {
              await db.study_sessions.delete(oldId);
              await db.study_sessions.put({ ...rec, id: newId });
            }
          } catch (e) {
            console.warn('[sync] não foi possível reescrever id local de study_session', oldId, e);
          }
        }
      }

      winnerIdsSucceeded.push(...qids);
    };

    try {
      const handledTables = new Set<string>();
      for (const table of SYNC_UPSERT_TABLE_ORDER) {
        handledTables.add(table);
        await runUpsertTable(table);
      }
      for (const table of byUpsertTable.keys()) {
        if (handledTables.has(table)) continue;
        await runUpsertTable(table);
      }

      const delByTable = new Map<string, OfflineSyncQueue[]>();
      for (const w of collectSimpleDeletes) {
        if (!delByTable.has(w.table)) delByTable.set(w.table, []);
        delByTable.get(w.table)!.push(w);
      }

      for (const [table, group] of delByTable) {
        const ids = [...new Set(group.map((g) => String(g.data.id)))];
        const qids = group.map((g) => g.id!).filter((id): id is number => id != null);
        for (const chunk of chunkArray(ids, SYNC_UPSERT_CHUNK)) {
          const { error } = await supabase.from(table).delete().in('id', chunk).eq('user_id', userId);
          if (error) {
            console.error(`[sync] delete em lote falhou (tabela=${table})`, error);
            throw error;
          }
        }
        winnerIdsSucceeded.push(...qids);
      }

      if (collectRecursive.length > 0) {
        const { data: allFolders } = await supabase
          .from('folders')
          .select('id, parent_id')
          .eq('user_id', userId);
        const tree = allFolders || [];

        const getDescendantIds = (folderId: string, folders: { id: string; parent_id: string | null }[]): string[] => {
          const ids: string[] = [];
          const children = folders.filter((f) => f.parent_id === folderId);
          for (const child of children) {
            ids.push(child.id);
            ids.push(...getDescendantIds(child.id, folders));
          }
          return ids;
        };

        for (const item of collectRecursive) {
          const ids = [item.data.id as string, ...getDescendantIds(item.data.id, tree)];
          const { error: cardsErr } = await supabase
            .from('flashcards')
            .delete()
            .in('folder_id', ids)
            .eq('user_id', userId);
          if (cardsErr) throw cardsErr;
          const { error: foldErr } = await supabase
            .from('folders')
            .delete()
            .in('id', ids)
            .eq('user_id', userId);
          if (foldErr) throw foldErr;
          if (item.id != null) winnerIdsSucceeded.push(item.id);
        }
      }

      if (collectProfile.length > 0) {
        const last = collectProfile.reduce((a, b) =>
          (a.timestamp || '') >= (b.timestamp || '') ? a : b
        );
        await this.saveUserProfile(last.data, userId, true);
        for (const p of collectProfile) {
          if (p.id != null) winnerIdsSucceeded.push(p.id);
        }
      }
    } catch (e) {
      console.error('[sync] sincronização em lote abortada; itens falhados permanecem na fila', e);
      return;
    }

    const uniq = [...new Set(winnerIdsSucceeded)];
    if (uniq.length > 0) {
      await db.syncQueue.bulkDelete(uniq);
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
