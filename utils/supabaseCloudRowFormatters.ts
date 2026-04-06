import type { Flashcard, Folder, Task } from '../types';

/** Colunas mínimas para sync/listagens — alinhar com `App.tsx` / PostgREST. */
export const FLASHCARD_CLOUD_COLUMNS =
  'id, front, back, notes, tags, source, subject_id, folder_id, next_review, interval, status, learning_step, ease_factor, total_errors, archived_at, is_suspended';

export const TASK_CLOUD_COLUMNS =
  'id, title, status, subject_id, due_date, completed_at, category, priority, notes, subtasks, description, archived_at, delegated_to, delegated_by, created_at, google_event_id';

/** Metadados de disciplina usados no Dashboard / Anki. */
export const SUBJECT_CLOUD_COLUMNS =
  'id, user_id, name, color, semester_start_date, semester_end_date, absences, max_absences, semester_year, workload, p1_date, p2_date, content, topics';

export function formatCloudFlashcardRow(c: Record<string, unknown>): Flashcard {
  const id = String(c.id ?? '');
  const front =
    (typeof c.front === 'string' ? c.front : undefined) ??
    (typeof c.question === 'string' ? c.question : undefined) ??
    '';
  const back =
    (typeof c.back === 'string' ? c.back : undefined) ??
    (typeof c.answer === 'string' ? c.answer : undefined) ??
    '';
  const nextRaw = c.next_review;
  const nextReview =
    nextRaw != null && nextRaw !== '' ? Number(nextRaw) : Date.now();
  return {
    id,
    front,
    back: back ?? '',
    notes: typeof c.notes === 'string' ? c.notes : '',
    tags: Array.isArray(c.tags) ? (c.tags as string[]) : [],
    source: typeof c.source === 'string' ? c.source : '',
    subjectId: typeof c.subject_id === 'string' ? c.subject_id : '',
    folderId: (c.folder_id as string | null) ?? null,
    nextReview: Number.isFinite(nextReview) ? nextReview : Date.now(),
    interval: c.interval != null ? Number(c.interval) : 0,
    status: (c.status as Flashcard['status']) || 'new',
    learningStep: c.learning_step != null ? Number(c.learning_step) : 0,
    easeFactor: c.ease_factor != null ? Number(c.ease_factor) : 2.5,
    total_errors: c.total_errors != null ? Number(c.total_errors) : 0,
    archived_at: (c.archived_at as string | null) ?? null,
    is_suspended: typeof c.is_suspended === 'boolean' ? c.is_suspended : undefined,
  };
}

export function formatCloudTaskRow(t: Record<string, unknown>): Task {
  const descRaw = t.description;
  const desc =
    typeof descRaw === 'string' && descRaw
      ? (() => {
          try {
            return JSON.parse(descRaw) as Record<string, unknown>;
          } catch {
            return {};
          }
        })()
      : {};
  return {
    id: String(t.id ?? ''),
    title: String(t.title ?? ''),
    completed: t.status === 'Concluido',
    status: (t.status as Task['status']) ?? undefined,
    subjectId: (desc.subjectId as string) || (t.subject_id as string) || '',
    dueDate: t.due_date as string | undefined,
    completedAt: t.completed_at as string | undefined,
    priority: (desc.originalPriority as Task['priority']) ||
      (t.priority === 'Alta' ? 'alta' : 'normal'),
    category: (t.category as Task['category']) || 'geral',
    archived_at: t.archived_at as string | undefined,
    boardId: desc.boardId as string | undefined,
    columnId: desc.columnId as string | undefined,
    notes: t.notes as string | undefined,
    subtasks: (t.subtasks as Task['subtasks']) || [],
    delegatedTo: t.delegated_to as string | undefined,
    delegatedBy: t.delegated_by as string | undefined,
    delegatedByName: desc.delegatedByName as string | undefined,
    delegatedToName: desc.delegatedToName as string | undefined,
    syllabusLink: desc.syllabusLink as string | undefined,
    importantCitations:
      typeof desc.importantCitations === 'string'
        ? desc.importantCitations
        : undefined,
    revisionStatus: desc.revisionStatus as Task['revisionStatus'],
    created_at: t.created_at as string | undefined,
    google_event_id:
      (t.google_event_id as string | undefined) ??
      (desc.google_event_id as string | undefined),
  } as Task;
}

export function formatCloudFolderRow(f: Record<string, unknown>): Folder {
  const pid = f.parent_id;
  return {
    id: String(f.id ?? ''),
    name: String(f.name ?? ''),
    parentId: pid == null ? null : String(pid),
    color: String(f.color ?? ''),
    icon: typeof f.icon === 'string' ? f.icon : undefined,
    targetDate: (f.target_date as Folder['targetDate']) ?? undefined,
    shared: Boolean(f.shared),
    original_deck_id: (f.original_deck_id as string | undefined) ?? undefined,
    version: f.version != null ? Number(f.version) : 1,
  };
}
