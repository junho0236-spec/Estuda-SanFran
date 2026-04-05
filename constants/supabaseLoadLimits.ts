/**
 * Limites de linhas por pedido em App.runLoadUserDataOnce (Supabase).
 * Valores mais baixos = menos CPU/RAM no Postgres (recomendado em plano Free/Nano).
 * Se precisares de mais linhas em memória, aumenta aqui com consciência do teto do plano.
 *
 * Quando o número de linhas devolvidas == limite, o sync com Dexie não apaga linhas locais
 * em falta no lote (evita apagar histórico fora da página carregada).
 */
export const SUPABASE_ROW_LOAD_LIMITS = {
  subjects: 400,
  folders: 1200,
  /** Cartões: 20k puxava demasiadas linhas de uma vez; 6k equilibra uso e cobertura. */
  flashcards: 6000,
  tasks: 2500,
  boards: 600,
  study_sessions: 2000,
  readings: 1500,
} as const;

export function isPartialSupabasePage(rowCount: number, limit: number): boolean {
  return rowCount >= limit;
}
