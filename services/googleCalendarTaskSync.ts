import { supabase } from './supabaseClient';
import { googleCalendarService } from './googleCalendarService';
import type { Subject, Task } from '../types';

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
