import { supabase } from './supabaseClient';
import { googleCalendarService } from './googleCalendarService';
import type { Subject, Task } from '../types';
import {
  TASK_CLOUD_COLUMNS,
  SUBJECT_CLOUD_COLUMNS,
  formatCloudTaskRow,
} from '../utils/supabaseCloudRowFormatters';

function mapCloudSubjectRow(s: Record<string, unknown>): Subject {
  const colorRaw = s.color;
  const color =
    typeof colorRaw === 'string' && colorRaw.trim() !== ''
      ? colorRaw.trim()
      : '#94a3b8';
  return {
    id: String(s.id),
    name: String(s.name ?? ''),
    color,
    semester_start_date: (s.semester_start_date as string) ?? undefined,
    semester_end_date: (s.semester_end_date as string) ?? undefined,
    absences: typeof s.absences === 'number' ? s.absences : undefined,
    max_absences: typeof s.max_absences === 'number' ? s.max_absences : undefined,
    semester_year: (s.semester_year as string) ?? undefined,
    workload: typeof s.workload === 'number' ? s.workload : undefined,
    p1_date: (s.p1_date as string) ?? undefined,
    p2_date: (s.p2_date as string) ?? undefined,
    content: (s.content as string) ?? undefined,
    topics: Array.isArray(s.topics) ? (s.topics as Subject['topics']) : undefined,
  };
}

/** Envia/atualiza no Google Agenda todas as tarefas com prazo e persiste `google_event_id` no Supabase. */
export async function syncDueTasksToGoogleAndSupabase(
  tasks: Task[],
  subjects: Subject[]
): Promise<{ successCount: number; withDueCount: number }> {
  const tasksWithDue = tasks.filter((t) => t.dueDate);
  let successCount = 0;
  for (const task of tasksWithDue) {
    try {
      const subject = subjects.find((s) => s.id === task.subjectId);
      const googleEvent = await googleCalendarService.syncTaskToGoogle(task, subject?.name);
      if (googleEvent?.id) {
        const { error } = await supabase
          .from('tasks')
          .update({ google_event_id: googleEvent.id })
          .eq('id', task.id);
        if (!error) successCount++;
      }
    } catch {
      /* tenta as demais */
    }
  }
  return { successCount, withDueCount: tasksWithDue.length };
}

/** Busca tarefas/disciplinas na nuvem e sincroniza — evita depender do estado React ainda vazio após login. */
export async function syncDueTasksToGoogleAndSupabaseFromCloud(
  userId: string
): Promise<{ successCount: number; withDueCount: number }> {
  const [{ data: taskRows }, { data: subRows }] = await Promise.all([
    supabase
      .from('tasks')
      .select(TASK_CLOUD_COLUMNS)
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('subjects').select(SUBJECT_CLOUD_COLUMNS).eq('user_id', userId),
  ]);
  const tasks = (taskRows ?? []).map((t) => formatCloudTaskRow(t as Record<string, unknown>));
  const subjects = (subRows ?? []).map((s) => mapCloudSubjectRow(s as Record<string, unknown>));
  return syncDueTasksToGoogleAndSupabase(tasks, subjects);
}
