/**
 * Detector simples de enunciados parecidos (questões geradas por IA).
 * Combina coeficiente de Dice em bigramas de caracteres e Jaccard em palavras (≥3 letras).
 * Não usa Supabase nem embeddings — só texto normalizado.
 */

/** Acima disto, consideramos enunciado “muito parecido” (0–1). */
export const AI_STATEMENT_SIMILARITY_THRESHOLD = 0.87;

const MIN_CHARS_FOR_FUZZY = 32;

export function normalizeComparableStatement(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function diceBigramCoefficient(a: string, b: string): number {
  const normA = normalizeComparableStatement(a);
  const normB = normalizeComparableStatement(b);
  if (normA.length < 2 || normB.length < 2) {
    return normA === normB ? 1 : 0;
  }
  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };
  const A = bigrams(normA);
  const B = bigrams(normB);
  let inter = 0;
  for (const [g, c] of A) {
    if (B.has(g)) inter += Math.min(c, B.get(g)!);
  }
  const na = [...A.values()].reduce((s, c) => s + c, 0);
  const nb = [...B.values()].reduce((s, c) => s + c, 0);
  if (na + nb === 0) return 0;
  return (2 * inter) / (na + nb);
}

function wordJaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string): Set<string> => {
    const norm = normalizeComparableStatement(s);
    const parts = norm.split(/\s+/).filter((w) => w.length >= 3);
    return new Set(parts);
  };
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 && B.size === 0) return normalizeComparableStatement(a) === normalizeComparableStatement(b) ? 1 : 0;
  let inter = 0;
  for (const w of A) {
    if (B.has(w)) inter++;
  }
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Pontuação 0–1; quanto maior, mais parecidos os enunciados. */
export function statementSimilarity(statementA: string, statementB: string): number {
  const nA = normalizeComparableStatement(statementA);
  const nB = normalizeComparableStatement(statementB);
  if (nA.length === 0 || nB.length === 0) return 0;
  if (nA === nB) return 1;

  if (nA.length < MIN_CHARS_FOR_FUZZY || nB.length < MIN_CHARS_FOR_FUZZY) {
    const shorter = nA.length <= nB.length ? nA : nB;
    const longer = nA.length <= nB.length ? nB : nA;
    if (longer.includes(shorter) && shorter.length >= 12) return 0.95;
    return 0;
  }

  return Math.max(diceBigramCoefficient(statementA, statementB), wordJaccardSimilarity(statementA, statementB));
}

export type SimilarDropReason = 'batch_duplicate' | 'existing_bank';

export type DroppedSimilarRow<T> = {
  row: T;
  reason: SimilarDropReason;
  /** Índice 1-based no lote gerado (antes do filtro), para mensagens */
  batchIndexOneBased: number;
};

/**
 * Mantém a ordem do lote: primeira ocorrência fica; as seguintes muito parecidas com a mesma ou com o acervo são removidas.
 */
export function dedupeSimilarAiStatements<T extends { statement: string }>(
  rows: T[],
  existingQuestions: { statement: string }[],
  threshold: number = AI_STATEMENT_SIMILARITY_THRESHOLD
): { kept: T[]; dropped: DroppedSimilarRow<T>[] } {
  const kept: T[] = [];
  const dropped: DroppedSimilarRow<T>[] = [];

  const isSimilarToAny = (statement: string, candidates: { statement: string }[]): boolean => {
    for (const c of candidates) {
      if (statementSimilarity(statement, c.statement) >= threshold) return true;
    }
    return false;
  };

  let batchIndex = 0;
  for (const row of rows) {
    batchIndex++;
    if (isSimilarToAny(row.statement, kept)) {
      dropped.push({ row, reason: 'batch_duplicate', batchIndexOneBased: batchIndex });
      continue;
    }
    if (isSimilarToAny(row.statement, existingQuestions)) {
      dropped.push({ row, reason: 'existing_bank', batchIndexOneBased: batchIndex });
      continue;
    }
    kept.push(row);
  }

  return { kept, dropped };
}
