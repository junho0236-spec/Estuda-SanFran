import { GoogleGenAI, Type } from '@google/genai';
import type { QuestionModality } from '../../types';
import type { QuestionBankAiConfig } from './types';
import { GEMINI_MODEL } from '../../services/geminiService';

const REFINE_CHUNK_SIZE = 5;

/** Instruções por nível — modalidade múltipla escolha beneficia mais; certo/errado recebe nota curta. */
export function buildAiDistractorQualityBlock(
  difficulty: QuestionBankAiConfig['difficulty'],
  modality: QuestionModality
): string {
  if (modality === 'certo_errado') {
    return `
DISCRIMINAÇÃO (Certo/Errado): Evite afirmações cuja falsidade seja óbvia pelo vocabulário. Prefira proposições em que o erro seja sutil (hipótese legal vizinha, exceção confundida com regra, efeito ou competência trocados).`;
  }

  const baseHomogeneity = `
ALTERNATIVAS (múltipla escolha) — regras gerais:
- As cinco alternativas devem parecer respostas “de prova”: mesmo registro formal, extensão parecida (nenhuma bem mais curta ou genérica que as outras).
- As incorretas não podem ser absurdas, irrelevantes ou contraditórias ao enunciado de forma grosseira.
- Evite “palpite fácil”: não faça a correta única alternativa longa ou detalhada demais.
- Cada incorreta deve representar um erro que um candidato descuidado cometeria (confundir instituto, artigo, efeito, prazo, competência, exceção, súmula ou entendimento).`;

  switch (difficulty) {
    case 'muito_facil':
    case 'facil':
      return `${baseHomogeneity}
Nível pedido (${difficulty}): distratores podem ser mais claros, mas mantenha as cinco opções coerentes e plausíveis.`;

    case 'media':
      return `${baseHomogeneity}
Nível médio: pelo menos duas incorretas devem ser “armadilhas plausíveis” (teses parcialmente corretas ou norma errada para o caso).`;

    case 'dificil':
      return `${baseHomogeneity}
Nível difícil (estilo banca):
- Priorize enunciados que exijam aplicação da norma a fatos ou distinção entre hipóteses parecidas.
- As quatro incorretas devem competir com a correta: todas defendíveis à primeira vista por quem tem lacuna pontual.
- Varie o tipo de distratores (ex.: confundir regra com exceção; instituto de diploma diferente mas tema afim; consequência jurídica errada; julgado ou súmula inadequada ao caso).
- Proiba alternativas que “soem” erradas pelo tom (ex.: extremos ridículos, negações vazias).`;

    case 'muito_dificil':
      return `${baseHomogeneity}
Nível muito difícil (máxima exigência):
- Enunciados casuísticos ou de escolha entre teses finas; a decisão entre alternativas corretas deve depender de um ponto doutrinário, sistemático ou jurisprudencial específico.
- Todas as incorretas devem ser distratores sofisticados: quem estuda de forma superficial deve vacilar entre pelo menos três opções.
- Não use incorretas que apenas neguem grosseiramente o enunciado; use confusões reais de concursos (norma vizinha, súmula ou informativo inadequado, regime jurídico equiparável mas inaplicável, linha jurisprudencial superada vs atual).
- Mantenha paralelismo gramatical e de densidade informacional entre todas as cinco opções.`;

    default:
      return baseHomogeneity;
  }
}

export function shouldRefineMcDistractors(
  modality: QuestionModality,
  difficulty: QuestionBankAiConfig['difficulty']
): boolean {
  return modality === 'multipla_escolha' && (difficulty === 'dificil' || difficulty === 'muito_dificil');
}

type RefineItem = {
  id: number;
  statement: string;
  options: string[];
  correct_answer: number;
};

/**
 * Segunda passagem: reescreve apenas os textos das alternativas para aumentar plausibilidade dos distratores.
 * Preserva o índice do gabarito; em falha da API devolve o array original.
 */
export async function refineMultipleChoiceDistractors(
  ai: GoogleGenAI,
  rawQuestions: unknown[],
  difficulty: QuestionBankAiConfig['difficulty']
): Promise<unknown[]> {
  const out = rawQuestions.map((q) =>
    q && typeof q === 'object' && !Array.isArray(q) ? { ...(q as Record<string, unknown>) } : q
  );

  const payloadIndices: number[] = [];
  for (let i = 0; i < out.length; i++) {
    const q = out[i];
    if (!q || typeof q !== 'object' || Array.isArray(q)) continue;
    const o = q as Record<string, unknown>;
    const opts = o.options;
    if (!Array.isArray(opts) || opts.length !== 5) continue;
    const ca = o.correct_answer;
    if (typeof ca !== 'number' || !Number.isInteger(ca) || ca < 0 || ca > 4) continue;
    payloadIndices.push(i);
  }

  const difficultyLabel =
    difficulty === 'muito_dificil'
      ? 'muito difícil (distratores finos, concursos de alto nível)'
      : 'difícil (banca exigente)';

  for (let start = 0; start < payloadIndices.length; start += REFINE_CHUNK_SIZE) {
    const chunkIdx = payloadIndices.slice(start, start + REFINE_CHUNK_SIZE);
    const payload: RefineItem[] = chunkIdx.map((idx) => {
      const o = out[idx] as Record<string, unknown>;
      const opts = (o.options as unknown[]).map((x) => String(x ?? '').trim());
      return {
        id: idx,
        statement: String(o.statement ?? ''),
        options: opts.length === 5 ? opts : ['', '', '', '', ''],
        correct_answer: o.correct_answer as number,
      };
    });

    try {
      const prompt = `Tarefa: melhorar APENAS os textos das alternativas de questões de múltipla escolha jurídicas (Brasil), nível ${difficultyLabel}.

Regras obrigatórias:
1. Devolva EXACTAMENTE uma entrada por item de entrada, com o mesmo "id" numérico.
2. O campo "correct_answer" (0 a 4) INDICA qual alternativa é a ÚNICA correta. Mantenha esse índice. O texto na posição correct_answer deve continuar a expressar essa resposta correta (pode refinar redação para ficar paralela às outras).
3. Reescreva as quatro incorretas para serem distratores plausíveis e homogêneos: mesmo tom, extensão semelhante, sem respostas absurdas ou vagas.
4. Não altere o enunciado (statement); use-o só como contexto.
5. As cinco strings em "options" devem ser alternativas completas (não prefixe com "A)", "B)" etc.).

Entrada (JSON):
${JSON.stringify(payload)}

Saída: array JSON com objetos { "id", "options", "correct_answer" } apenas.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correct_answer: { type: Type.INTEGER },
              },
              required: ['id', 'options', 'correct_answer'],
            },
          },
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(text) as unknown;
      if (!Array.isArray(parsed)) continue;

      for (const row of parsed) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        const r = row as Record<string, unknown>;
        const id = r.id;
        const options = r.options;
        const ca = r.correct_answer;
        if (typeof id !== 'number' || !Number.isInteger(id) || id < 0 || id >= out.length) continue;
        if (!Array.isArray(options) || options.length !== 5) continue;
        if (typeof ca !== 'number' || ca < 0 || ca > 4 || !Number.isInteger(ca)) continue;

        const target = out[id] as Record<string, unknown>;
        target.options = options.map((x) => String(x ?? '').trim());
        target.correct_answer = ca;
      }
    } catch (e) {
      console.warn('[aiDistractorInstructions] refineMultipleChoiceDistractors chunk failed', e);
    }
  }

  return out;
}
