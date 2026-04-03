import type { Question } from '../../types';

export const TOPIC_REUSE_PROMPT_MAX_LABELS = 80;

/** Teto de valores distintos de `topic` num único array JSON devolvido pela IA. */
export const MAX_DISTINCT_TOPICS_PER_AI_BATCH = 3;

/**
 * Instruções gerais para poucos tópicos amplos por lote.
 * Deve aparecer no prompt **depois** do material de base (texto/flashcards).
 */
export function buildTopicMinimalityInstructions(): string {
  return `ESTRATÉGIA DE TÓPICOS (campo "topic" em cada objeto do JSON desta resposta):
- Regra por defeito: use EXATAMENTE 1 (um) único texto de "topic" para TODAS as questões deste array quando o conteúdo for um bloco tematicamente coerente (mesma aula, mesmo texto, mesmo foco).
- Só aumente o número de rótulos distintos se o material tiver eixos temáticos CLARAMENTE independentes (pilares que não se reduzem a um só capítulo). Nunca mais de ${MAX_DISTINCT_TOPICS_PER_AI_BATCH} valores distintos de "topic" neste array.
- Cada "topic" deve ser amplo (estilo capítulo ou disciplina), poucas palavras. PROIBIDO criar um micro-tópico diferente por questão só para variar redação ou para espelhar cada parágrafo.
- Se seguirem instruções "TÓPICOS JÁ USADOS NO SEU ACERVO" abaixo, minimize os rótulos distintos: quando todo o lote couber num único rótulo da lista, use apenas esse rótulo (copiado caractere a caractere) em todas as questões.`;
}

type PerKeyAgg = {
  labelCounts: Map<string, number>;
};

function pickCanonicalLabel(agg: PerKeyAgg): string {
  let bestLabel = '';
  let bestCount = -1;
  for (const [label, c] of agg.labelCounts) {
    if (c > bestCount || (c === bestCount && label.length < bestLabel.length)) {
      bestCount = c;
      bestLabel = label;
    }
  }
  return bestLabel;
}

export function normalizeSubjectKey(s: string | null | undefined): string {
  if (s == null || s === '') return '';
  return String(s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTopicKey(s: string | null | undefined): string {
  if (s == null || s === '') return '';
  return String(s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lista de tópicos do acervo, texto para o prompt e mapa chave normalizada → forma canónica (todo o acervo filtrado, não só o truncado do prompt).
 */
export function buildTopicReuseCatalog(
  questions: Question[],
  subjectFilter: string | null | undefined,
  maxTopics: number = TOPIC_REUSE_PROMPT_MAX_LABELS
): {
  promptBlock: string;
  canonicalByTopicKey: Map<string, string>;
  topicLabelsInPrompt: string[];
} {
  const filterKey = normalizeSubjectKey(subjectFilter ?? '');
  const byNormKey = new Map<string, PerKeyAgg>();

  for (const q of questions) {
    if (!q.topic?.trim()) continue;
    if (filterKey && normalizeSubjectKey(q.subject) !== filterKey) continue;

    const normKey = normalizeTopicKey(q.topic);
    if (!normKey) continue;

    const label = q.topic.trim();
    let agg = byNormKey.get(normKey);
    if (!agg) {
      agg = { labelCounts: new Map<string, number>() };
      byNormKey.set(normKey, agg);
    }
    agg.labelCounts.set(label, (agg.labelCounts.get(label) ?? 0) + 1);
  }

  const canonicalByTopicKey = new Map<string, string>();
  const scored: { normKey: string; canonical: string; totalCount: number }[] = [];

  for (const [normKey, agg] of byNormKey) {
    const canonical = pickCanonicalLabel(agg);
    let totalCount = 0;
    for (const c of agg.labelCounts.values()) totalCount += c;
    canonicalByTopicKey.set(normKey, canonical);
    scored.push({ normKey, canonical, totalCount });
  }

  scored.sort(
    (a, b) =>
      b.totalCount - a.totalCount || a.canonical.localeCompare(b.canonical, 'pt-BR')
  );

  const truncated = scored.slice(0, Math.max(0, maxTopics));
  const topicLabelsInPrompt = truncated.map((e) => e.canonical);

  let promptBlock: string;
  if (topicLabelsInPrompt.length === 0) {
    const scope = filterKey ? ' para esta matéria' : '';
    promptBlock = `TÓPICOS NO ACERVO: Ainda não há tópicos salvos${scope}. Crie o MENOR número possível de rótulos novos (o ideal é 1 só), amplos e estáveis; reutilize o mesmo texto em todas as questões do lote quando o tema for o mesmo. Só crie um segundo ou terceiro rótulo se o material tiver pilares claramente separados (máximo ${MAX_DISTINCT_TOPICS_PER_AI_BATCH} distintos).`;
  } else {
    const scopeLabel = filterKey
      ? ` para a matéria alinhada a "${String(subjectFilter).trim()}"`
      : ' (todas as matérias do seu acervo; por questão, escolha o rótulo que melhor encaixa)';
    const truncatedNote =
      truncated.length < scored.length
        ? '\n(A lista pode estar truncada por tamanho — priorize reutilizar os rótulos que aparecem acima.)'
        : '';
    const bulletList = topicLabelsInPrompt.map((t) => `- ${t}`).join('\n');
    promptBlock = `TÓPICOS JÁ USADOS NO SEU ACERVO${scopeLabel}. MINIMIZE a quantidade de valores distintos de "topic" neste array: se um único rótulo da lista abaixo cobrir todo o lote, use só esse em todas as questões (copiado caractere a caractere). Quando várias questões partilharem o mesmo tema, reutilize o MESMO texto de "topic".

O campo "topic" de cada questão deve ser EXATAMENTE IGUAL a UM dos rótulos abaixo quando encaixar. Não invente sinónimos nem variações só de capitalização para o mesmo tema.

${bulletList}

Se e somente se nenhum rótulo acima servir para uma questão, use UM nome novo curto (máximo 6 palavras). No máximo ${MAX_DISTINCT_TOPICS_PER_AI_BATCH} valores distintos de "topic" no lote inteiro, incluindo novos.${truncatedNote}`;
  }

  return { promptBlock, canonicalByTopicKey, topicLabelsInPrompt };
}

/** Substitui topic pela forma canónica do acervo quando a chave normalizada coincide. */
export function applyCanonicalTopicsToRows<T extends { topic: string }>(
  rows: T[],
  canonicalByTopicKey: Map<string, string>
): T[] {
  return rows.map((row) => {
    const k = normalizeTopicKey(row.topic);
    const canon = k ? canonicalByTopicKey.get(k) : undefined;
    if (canon) return { ...row, topic: canon };
    return row;
  });
}
