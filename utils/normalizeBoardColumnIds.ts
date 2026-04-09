import type { Board, Task } from '../types';
import { dataService } from '../services/dataService';
import { db } from '../services/offlineService';
import { bulkPutInChunks } from './dexieBulkYield';

/**
 * Garante que cada `column.id` seja único globalmente entre quadros.
 * Colunas duplicadas (ex.: vários quadros com "Pendente") recebem novo UUID
 * e tarefas com `boardId` + `columnId` afetados são atualizadas.
 */
export function normalizeBoardColumnIds(boards: Board[], tasks: Task[]): {
  boards: Board[];
  tasks: Task[];
  changed: boolean;
} {
  const used = new Set<string>();
  const replacements: { boardId: string; from: string; to: string }[] = [];

  const newBoards = boards.map((board) => {
    const newColumns = board.columns.map((col) => {
      let id = col.id;
      if (used.has(id)) {
        id = crypto.randomUUID();
        replacements.push({ boardId: board.id, from: col.id, to: id });
      }
      used.add(id);
      return { ...col, id };
    });
    const boardChanged = newColumns.some((c, i) => c.id !== board.columns[i].id);
    return boardChanged ? { ...board, columns: newColumns } : board;
  });

  if (replacements.length === 0) {
    return { boards: newBoards, tasks, changed: false };
  }

  const newTasks = tasks.map((t) => {
    if (!t.boardId || !t.columnId) return t;
    const rep = replacements.find((r) => r.boardId === t.boardId && r.from === t.columnId);
    return rep ? { ...t, columnId: rep.to } : t;
  });

  return { boards: newBoards, tasks: newTasks, changed: true };
}

export async function persistBoardColumnNormalization(
  beforeBoards: Board[],
  afterBoards: Board[],
  beforeTasks: Task[],
  afterTasks: Task[],
  userId: string,
  isOnline: boolean
): Promise<void> {
  for (const b of afterBoards) {
    const prev = beforeBoards.find((x) => x.id === b.id);
    if (!prev || JSON.stringify(prev.columns) !== JSON.stringify(b.columns)) {
      await dataService.saveBoard(b, userId, isOnline);
    }
  }
  const beforeById = new Map(beforeTasks.map((t) => [t.id, t]));
  for (const t of afterTasks) {
    const old = beforeById.get(t.id);
    if (old && old.columnId !== t.columnId) {
      await dataService.saveTask(t, userId, isOnline);
    }
  }
  await bulkPutInChunks(db.boards, afterBoards);
  await bulkPutInChunks(db.tasks, afterTasks);
}
