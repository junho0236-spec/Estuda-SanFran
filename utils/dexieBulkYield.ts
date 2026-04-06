import type { Table } from 'dexie';

/** Evita bloquear o thread principal em `bulkPut` muito grandes. */
export async function bulkPutInChunks<T>(
  table: Table<T, string | number>,
  items: T[],
  chunkSize = 400
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      await table.bulkPut(chunk);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }
}

export async function bulkDeleteIdsInChunks(
  table: Table<unknown, string>,
  ids: string[],
  chunkSize = 500
): Promise<void> {
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      await table.bulkDelete(chunk);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }
}
