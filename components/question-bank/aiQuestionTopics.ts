import type { Question } from '../../types';

export const TOPIC_REUSE_PROMPT_MAX_LABELS = 80;

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
    promptBlock = `TÓPICOS: Ainda não há tópicos salvos no seu acervo${scope}. Use no máximo 2 ou 3 rótulos de tópico DISTINTOS para TODO este lote, com nomes curtos e estáveis (ex.: "Contratos", "Obrigações"), e reutilize exatamente o mesmo texto em várias questões quando o conteúdo for do mesmo tema. Evite variações cosméticas do mesmo conceito.`;
  } else {
    const scopeLabel = filterKey
      ? ` para a matéria alinhada a "${String(subjectFilter).trim()}"`
      : ' (todas as matérias do seu acervo; por questão, escolha o rótulo que melhor encaixa)';
    const truncatedNote =
      truncated.length < scored.length
        ? '\n(A lista pode estar truncada por tamanho — priorize reutilizar os rótulos que aparecem acima.)'
        : '';
    const bulletList = topicLabelsInPrompt.map((t) => `- ${t}`).join('\n');
    promptBlock = `TÓPICOS JÁ USADOS NO SEU ACERVO${scopeLabel}. O campo "topic" de CADA questão deve ser EXATAMENTE IGUAL (copiar caractere a caractere) a UM dos rótulos abaixo quando o conteúdo da questão se encaixar nele. Não invente sinónimos nem variações só de capitalização para o mesmo tema.\n\n${bulletList}\n\nSe e somente se nenhum rótulo acima servir para uma questão, use UM nome novo curto (máximo 6 palavras). Evite criar vários rótulos novos diferentes para o mesmo tema neste lote.${truncatedNote}`;
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
