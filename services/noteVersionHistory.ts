const MAX_VERSIONS = 12;

export type NoteVersionEntry = {
  savedAt: string;
  title: string;
  html: string;
};

function key(userId: string, noteId: string) {
  return `sanfran-note-versions:${userId}:${noteId}`;
}

export function getNoteVersions(userId: string, noteId: string): NoteVersionEntry[] {
  if (!userId || !noteId) return [];
  try {
    const raw = localStorage.getItem(key(userId, noteId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NoteVersionEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushNoteVersion(
  userId: string,
  noteId: string,
  html: string,
  title: string
): void {
  if (!userId || !noteId) return;
  try {
    const prev = getNoteVersions(userId, noteId);
    if (prev[0]?.html === html) return;
    const next: NoteVersionEntry[] = [
      { savedAt: new Date().toISOString(), title: title || 'Sem título', html },
      ...prev,
    ].slice(0, MAX_VERSIONS);
    localStorage.setItem(key(userId, noteId), JSON.stringify(next));
  } catch (e) {
    console.warn('noteVersionHistory: falha ao gravar', e);
  }
}
