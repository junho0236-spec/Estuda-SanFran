import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODEL } from '../../services/geminiService';
import {
  QB_STATEMENT_MIX,
  splitMixedStatementCounts,
  type QuestionBankStatementTypeChoice,
} from './mixedStatementBatches';

/** Máximo de âncoras por questão — evita enunciados sobrecarregados. */
export const MAX_ANCHORS_PER_QUESTION = 2;

/** Teto do gerador (alinha ao modal de quantidade). */
export const MATERIAL_COVERAGE_AUTO_COUNT_MAX = 20;

export type MaterialCoverageAnchor = {
  id: string;
  label: string;
};

export type MaterialCoveragePerQuestion = {
  slot: number;
  anchor_ids: string[];
};

export type MaterialCoveragePlan = {
  anchors: MaterialCoverageAnchor[];
  per_question: MaterialCoveragePerQuestion[];
};

const coveragePlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    anchors: {
      type: Type.ARRAY,
      description:
        'Pontos substantivos do material; ids estáveis (ex. a1, a2). Fundir ideias se houver demasiados pontos para N×2 âncoras.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Identificador curto e único neste plano' },
          label: { type: Type.STRING, description: 'Resumo claro do ponto (1 linha)' },
        },
        required: ['id', 'label'],
      },
    },
    per_question: {
      type: Type.ARRAY,
      description:
        'Exatamente uma entrada por questão; slot 1..N na ordem final do array agregado (ver instruções de ordem).',
      items: {
        type: Type.OBJECT,
        properties: {
          slot: { type: Type.INTEGER, description: 'Posição 1-based no resultado final' },
          anchor_ids: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: `Entre 1 e ${MAX_ANCHORS_PER_QUESTION} ids do array anchors`,
          },
        },
        required: ['slot', 'anchor_ids'],
      },
    },
  },
  required: ['anchors', 'per_question'],
};

const recommendedQuestionCountSchema = {
  type: Type.OBJECT,
  properties: {
    question_count: {
      type: Type.INTEGER,
      description:
        'Número mínimo de questões necessário para cobrir o material (1..max permitido no pedido)',
    },
    brief_rationale: {
      type: Type.STRING,
      description: 'Uma frase curta em português sobre a escolha ou limitações',
    },
  },
  required: ['question_count', 'brief_rationale'],
};

export type RecommendedQuestionCountResult = {
  question_count: number;
  brief_rationale: string;
};

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export async function fetchRecommendedQuestionCount(
  ai: GoogleGenAI,
  params: {
    materialFlashcardsBlock: string;
    materialTextBlock: string;
    maxQuestions: number;
    statementType: QuestionBankStatementTypeChoice;
    subjectLine: string;
  }
): Promise<RecommendedQuestionCountResult> {
  const {
    materialFlashcardsBlock,
    materialTextBlock,
    maxQuestions,
    statementType,
    subjectLine,
  } = params;

  const cap = clampInt(maxQuestions, 1, MATERIAL_COVERAGE_AUTO_COUNT_MAX);

  const materialParts: string[] = [];
  if (materialFlashcardsBlock.trim()) materialParts.push(materialFlashcardsBlock.trim());
  if (materialTextBlock.trim()) materialParts.push(materialTextBlock.trim());
  const materialJoined = materialParts.join('\n\n---\n\n');
  if (!materialJoined) {
    throw new Error('Material vazio para estimar a quantidade.');
  }

  const mixNote =
    statementType === QB_STATEMENT_MIX
      ? 'Nota: o utilizador pode pedir mistura direto/caso; não precisas de detalhar isso — só o número total de questões.'
      : '';

  const prompt = `És um professor de Direito. Analisa APENAS o material abaixo e estima quantas questões de exame são necessárias para cobrir todos os pontos substantivos, sem deixar lacunas.

${subjectLine}

Objetivo: usa o **menor número possível** de questões, agrupando conceitos relacionados na mesma questão quando isso for pedagógico (cada questão pode cobrir até ${MAX_ANCHORS_PER_QUESTION} ideias distintas sem sobrecarregar o enunciado).
Se o material for denso e mesmo assim precisar de mais do que ${cap} questões para cobrir tudo com qualidade, devolve question_count=${cap} e explica brevemente na rationale que o teto foi atingido (sugere segunda leva).

Restrições:
- question_count deve ser um inteiro entre 1 e ${cap} (inclusive).
- Preferência absoluta pelo mínimo viável; só aumenta quando agrupar mais conceitos na mesma questão tornaria o item confuso ou superficial.

${mixNote}

MATERIAL:
${materialJoined}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: recommendedQuestionCountSchema,
    },
  });

  const text = response.text;
  if (!text?.trim()) {
    throw new Error('Resposta vazia ao estimar quantidade.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON inválido na estimativa de quantidade.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Estimativa de quantidade inválida.');
  }
  const o = parsed as Record<string, unknown>;
  const rawCount = o.question_count;
  const rationale =
    typeof o.brief_rationale === 'string' ? o.brief_rationale.trim() : '';

  const parsedN = Number(rawCount);
  const question_count = Number.isFinite(parsedN)
    ? clampInt(parsedN, 1, cap)
    : clampInt(1, 1, cap);

  return {
    question_count,
    brief_rationale: rationale || `Definido ${question_count} questão(ões) (até ${cap}).`,
  };
}

export function describeGenerationSlotOrder(
  totalQuestions: number,
  statementType: QuestionBankStatementTypeChoice
): string {
  if (totalQuestions <= 0) {
    return 'Sem questões.';
  }
  if (statementType !== QB_STATEMENT_MIX) {
    return `Ordem final das questões (slots 1 a ${totalQuestions}): slot i = i-ésima questão no array JSON agregado, na ordem de geração dos lotes.`;
  }
  const { direto, casoPratico } = splitMixedStatementCounts(totalQuestions);
  return [
    `Ordem final no array agregado (mistura enunciado direto + caso):`,
    `- Slots 1 a ${direto}: enunciado DIRETO (${direto} questão(ões)).`,
    `- Slots ${direto + 1} a ${totalQuestions}: CASO PRÁTICO (${casoPratico} questão(ões)).`,
    `O plano de cobertura deve alinhar âncoras a estes blocos (teoria/definição nos slots diretos; aplicação factual nos de caso, quando fizer sentido).`,
  ].join('\n');
}

function validateCoveragePlan(plan: unknown, totalQuestions: number): MaterialCoveragePlan {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Plano de cobertura inválido.');
  }
  const p = plan as Record<string, unknown>;
  const anchors = p.anchors;
  const perQuestion = p.per_question;
  if (!Array.isArray(anchors) || !Array.isArray(perQuestion)) {
    throw new Error('Plano de cobertura: estrutura incorreta.');
  }
  if (perQuestion.length !== totalQuestions) {
    throw new Error(
      `Plano de cobertura: esperado per_question com ${totalQuestions} entradas, veio ${perQuestion.length}.`
    );
  }

  const anchorIds = new Set<string>();
  for (const a of anchors) {
    if (!a || typeof a !== 'object') {
      throw new Error('Plano de cobertura: entrada em anchors inválida.');
    }
    const o = a as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    if (!id) {
      throw new Error('Plano de cobertura: âncora sem id.');
    }
    if (anchorIds.has(id)) {
      throw new Error(`Plano de cobertura: id de âncora duplicado: ${id}`);
    }
    anchorIds.add(id);
  }

  if (anchorIds.size === 0) {
    throw new Error('Plano de cobertura: lista anchors vazia.');
  }

  const slots = new Set<number>();
  const usedAnchors = new Set<string>();

  for (const row of perQuestion) {
    if (!row || typeof row !== 'object') {
      throw new Error('Plano de cobertura: entrada per_question inválida.');
    }
    const r = row as Record<string, unknown>;
    const slot = typeof r.slot === 'number' && Number.isInteger(r.slot) ? r.slot : NaN;
    if (slot < 1 || slot > totalQuestions) {
      throw new Error(`Plano de cobertura: slot ${String(r.slot)} fora do intervalo 1..${totalQuestions}.`);
    }
    if (slots.has(slot)) {
      throw new Error(`Plano de cobertura: slot ${slot} duplicado.`);
    }
    slots.add(slot);

    const ids = r.anchor_ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error(`Plano de cobertura: slot ${slot} sem anchor_ids.`);
    }
    if (ids.length > MAX_ANCHORS_PER_QUESTION) {
      throw new Error(
        `Plano de cobertura: slot ${slot} com mais de ${MAX_ANCHORS_PER_QUESTION} âncoras.`
      );
    }
    for (const raw of ids) {
      const id = typeof raw === 'string' ? raw.trim() : '';
      if (!id || !anchorIds.has(id)) {
        throw new Error(`Plano de cobertura: id de âncora desconhecido no slot ${slot}: ${String(raw)}`);
      }
      usedAnchors.add(id);
    }
  }

  for (let s = 1; s <= totalQuestions; s++) {
    if (!slots.has(s)) {
      throw new Error(`Plano de cobertura: falta o slot ${s}.`);
    }
  }

  for (const id of anchorIds) {
    if (!usedAnchors.has(id)) {
      throw new Error(`Plano de cobertura: âncora "${id}" não foi atribuída a nenhuma questão.`);
    }
  }

  return {
    anchors: anchors as MaterialCoverageAnchor[],
    per_question: perQuestion as MaterialCoveragePerQuestion[],
  };
}

export function buildCoveragePromptBlock(
  plan: MaterialCoveragePlan,
  slotsInThisBatch: number[]
): string {
  if (slotsInThisBatch.length === 0) return '';

  const bySlot = new Map<number, MaterialCoveragePerQuestion>();
  for (const row of plan.per_question) {
    bySlot.set(row.slot, row);
  }

  const lines: string[] = [
    'MODO COBERTURA DO MATERIAL (obrigatório para ESTE lote):',
    'Cada questão deste lote deve focar-se principalmente nas âncoras do slot correspondente. As alternativas incorretas podem explorar confusões próximas ao material; não altere as regras de tópico amplo (campo topic) por causa deste bloco.',
    '',
    'Âncoras de referência (id → descrição):',
  ];

  for (const a of plan.anchors) {
    lines.push(`- [${a.id}] ${a.label}`);
  }

  lines.push('');
  lines.push(
    'Atribuição para as questões deste lote (a 1.ª questão do JSON desta resposta = menor slot listado; seguir a ordem dos slots):'
  );

  const sortedSlots = [...slotsInThisBatch].sort((a, b) => a - b);
  for (const slot of sortedSlots) {
    const row = bySlot.get(slot);
    if (!row) {
      lines.push(`- Slot ${slot}: (ausente no plano — use o material base com coerência).`);
      continue;
    }
    const labels = row.anchor_ids
      .map((id) => {
        const a = plan.anchors.find((x) => x.id === id);
        return a ? `${id} (${a.label})` : id;
      })
      .join('; ');
    lines.push(`- Slot ${slot}: âncoras ${labels}.`);
  }

  return lines.join('\n');
}

export type FetchMaterialCoveragePlanParams = {
  materialFlashcardsBlock: string;
  materialTextBlock: string;
  totalQuestions: number;
  statementType: QuestionBankStatementTypeChoice;
  subjectLine: string;
};

export async function fetchMaterialCoveragePlan(
  ai: GoogleGenAI,
  params: FetchMaterialCoveragePlanParams
): Promise<MaterialCoveragePlan> {
  const {
    materialFlashcardsBlock,
    materialTextBlock,
    totalQuestions,
    statementType,
    subjectLine,
  } = params;

  const materialParts: string[] = [];
  if (materialFlashcardsBlock.trim()) {
    materialParts.push(materialFlashcardsBlock.trim());
  }
  if (materialTextBlock.trim()) {
    materialParts.push(materialTextBlock.trim());
  }
  const materialJoined = materialParts.join('\n\n---\n\n');
  if (!materialJoined) {
    throw new Error('Material vazio para o plano de cobertura.');
  }

  const orderBlock = describeGenerationSlotOrder(totalQuestions, statementType);

  const prompt = `És um professor de Direito a planear avaliação. Com base APENAS no material abaixo, define um plano de cobertura para ${totalQuestions} questões de exame.

${subjectLine}

${orderBlock}

REGRAS:
1. Extrai uma lista de âncoras (pontos substantivos). Cada âncora tem id curto único e label de uma linha.
2. Se o material tiver mais pontos do que cabe em ${totalQuestions} questões com no máximo ${MAX_ANCHORS_PER_QUESTION} âncoras cada, FUNDE ideias relacionadas em âncoras mais amplas (sem micro-parágrafos).
3. O array per_question deve ter EXATAMENTE ${totalQuestions} objetos, com slot de 1 a ${totalQuestions}, cada slot uma vez.
4. Cada entrada em per_question.anchor_ids tem entre 1 e ${MAX_ANCHORS_PER_QUESTION} ids existentes em anchors.
5. Cada id em anchors deve aparecer em pelo menos um per_question.anchor_ids (cobertura completa das âncoras escolhidas).
6. Prioriza profundidade e clareza; não forces demasiado texto numa única questão.

MATERIAL:
${materialJoined}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: coveragePlanResponseSchema,
    },
  });

  const text = response.text;
  if (!text?.trim()) {
    throw new Error('Resposta vazia ao planear cobertura.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON inválido no plano de cobertura.');
  }

  return validateCoveragePlan(parsed, totalQuestions);
}
