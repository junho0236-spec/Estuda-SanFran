import type { Task } from '../types';
import { dateAtNoonForYmd, dueDateToYmd } from '../utils';

/** Prazo civil (AAAA-MM-DD) em Brasília já passou e a tarefa não está concluída. */
export function taskIsOverdueBr(task: Task, todayYmd: string): boolean {
  if (task.completed || !task.dueDate?.trim()) return false;
  const dueYmd = dueDateToYmd(task.dueDate);
  return dueYmd < todayYmd;
}

/** Dias de atraso (>=1) ou 0 se não estiver atrasada. */
export function taskOverdueDaysBr(task: Task, todayYmd: string): number {
  if (!taskIsOverdueBr(task, todayYmd)) return 0;
  const dueYmd = dueDateToYmd(task.dueDate!);
  const d0 = dateAtNoonForYmd(dueYmd).getTime();
  const d1 = dateAtNoonForYmd(todayYmd).getTime();
  if (!Number.isFinite(d0) || !Number.isFinite(d1)) return 0;
  const diff = Math.round((d1 - d0) / 86400000);
  return Math.max(0, diff);
}
