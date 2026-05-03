import { GoogleGenAI, Type } from '@google/genai';
import type { QuestionModality } from '../../types';
import type { QuestionBankAiConfig } from './types';
import { GEMINI_MODEL } from '../../services/geminiService';
import {
  QB_STATEMENT_CASO,
  QB_STATEMENT_DIRETO,
} from './mixedStatementBatches';

const REFINE_CHUNK_SIZE = 5;

type StatementBatchKind = typeof QB_STATEMENT_CASO | typeof QB_STATEMENT_DIRETO;

/** Instruções por nível — modalidade múltipla escolha beneficia mais; certo/errado recebe nota curta.
 * `statementStyle` alinha o texto ao tipo de enunciado do lote (evita pedir “casuística” quando o pedido é direto, e vice-versa). */
export function buildAiDistractorQualityBlock(
  difficulty: QuestionBankAiConfig['difficulty'],
  modality: QuestionModality,
  statementStyle?: StatementBatchKind
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
- Cada incorreta deve representar um erro que um candidato descuidado cometeria (confundir instituto, artigo, efeito, prazo, competência, exceção, súmula ou entendimento).
- ANTI-ELIMINAÇÃO (sempre): proiba o padrão em que só UMA alternativa soa “certeira” ou só UMA soa “errada pelo tom”. É PROIBIDO quatro elogios ao cenário do enunciado e uma crítica metodológica (ou quatro críticas furadas e uma única técnica). Várias alternativas devem poder parecer defensáveis até confrontadas com o critério canónico preciso; incorretas devem errar por NUANCE (critério adjacente, escopo errado, autoridade inadequada), não por ausência de rigor aparente.
- Distribua vocabulário técnico da disciplina entre TODAS as opções — não concentre na correta os únicos termos decisivos (ex.: “problema de pesquisa”, “originalidade”, “nexo”): incorretas devem também soar acadêmicas e bem fundamentadas, mas aplicadas ao recorte errado ou ao juízo incorreto.
- ANTI-“ÚNICA VOZ DO RIGOR”: é PROIBIDO que só a alternativa correta cite exigências cardeais do meio académico (ex.: replicabilidade, transparência metodológica, descrição explícita de procedimentos, conformidade com normas do periódico/ABNT, peer review, objetividade da estrutura do artigo) enquanto as incorretas só “elogiam” o autor ou minimizam deveres formais. Pelo menos DUAS incorretas devem também invocar rigor, normas, ciência ou deveres editoriais — mas sustentar um juízo SUBSTANTIVAMENTE errado (prioridade invertida, norma errada ao contexto, escopo de exigência inadequado, confundir marco teórico com método, etc.).
- Igualar cadência: número de períodos/cláusulas e nível de abstração semelhantes nas cinco linhas; evite que uma alternativa seja a única negativa, a única genérica ou a única com modalização forte (“carece”, “falha”), salvo se todas negociarem matizes equivalentes.`;

  switch (difficulty) {
    case 'muito_facil':
    case 'facil':
      return `${baseHomogeneity}
Nível pedido (${difficulty}): distratores podem ser mais claros, mas mantenha as cinco opções coerentes e plausíveis.`;

    case 'media':
      return `${baseHomogeneity}
Nível médio: pelo menos duas incorretas devem ser “armadilhas plausíveis” (teses parcialmente corretas ou norma errada para o caso).`;

    case 'dificil': {
      const enunciadoLine =
        statementStyle === QB_STATEMENT_DIRETO
          ? `- Enunciados diretos: priorize teses subtis, distinções doutrinárias ou interpretações normativas exigentes, sem narrativa de caso.`
          : statementStyle === QB_STATEMENT_CASO
            ? `- Casos práticos: o enunciado deve narrar fatos e exigir aplicação da norma ou distinção entre hipóteses parecidas ao cenário.`
            : `- Priorize enunciados que exijam aplicação da norma a fatos ou distinção entre hipóteses parecidas.`;
      return `${baseHomogeneity}
Nível difícil (estilo banca):
${enunciadoLine}
- As quatro incorretas devem competir com a correta: todas defendíveis à primeira vista por quem tem lacuna pontual.
- Varie o tipo de distratores (ex.: confundir regra com exceção; instituto de diploma diferente mas tema afim; consequência jurídica errada; julgado ou súmula inadequada ao caso).
- Proiba alternativas que “soem” erradas pelo tom (ex.: extremos ridículos, negações vazias).
- Anti-eliminação: se o enunciado descrever um trabalho/caso, não faça quatro alternativas que “aprovam” a conduta e uma única que “reprova” metodicamente — rebalanceie para várias críticas plausíveis ou várias leituras sedutoras mas imprecisas.`;
    }

    case 'muito_dificil': {
      const enunciadoLine =
        statementStyle === QB_STATEMENT_DIRETO
          ? `- Enunciados diretos: escolha entre teses finas, interpretações sistemáticas ou pontos jurisprudenciais específicos, em formato compacto (sem caso narrado).`
          : statementStyle === QB_STATEMENT_CASO
            ? `- Casos práticos: narrativa + decisão entre teses finas; o gabarito deve depender de um ponto doutrinário, sistemático ou jurisprudencial aplicável aos fatos.`
            : `- Enunciados casuísticos ou de escolha entre teses finas; a decisão entre alternativas corretas deve depender de um ponto doutrinário, sistemático ou jurisprudencial específico.`;
      return `${baseHomogeneity}
Nível muito difícil (máxima exigência):
${enunciadoLine}
- TESTE DE ELIMINAÇÃO: imagine um candidato eliminando uma por vez só pelo estilo. Se após duas eliminações só restar uma por contraste de tom (ex.: só uma opção “critica” e as outras “aprovam” o trabalho do enunciado), reescreva TODAS até pelo menos três alternativas continuarem plausíveis para um orientador exigente.
- TESTE DO “GABARITO ORTODOXO”: se só uma alternativa soar como defesa inequívoca do método científico / normas da revista / replicabilidade e as outras soar como defesa do pesquisador contra essas exigências, o lote está INVÁLIDO — rebalanceie até várias opções citarem deveres formais e rigor; o que separa a correta deve ser o SUBSTANTIVO (qual dever prevalece neste facto), não o facto de citar rigor.
- Todas as incorretas devem ser distratores sofisticados: vacilar entre pelo menos TRÊS opções deve ser comum; incorretas atrativas — teses parcialmente válidas, recomendações de boas práticas aplicadas no âmbito errado, ou juízo técnico sedutor mas equivocado.
- Não use incorretas que apenas neguem grosseiramente o enunciado; use confusões reais de concursos (norma vizinha, súmula ou informativo inadequado, regime jurídico equiparável mas inaplicável, linha jurisprudencial superada vs atual).
- Mantenha paralelismo gramatical e de densidade informacional entre todas as cinco opções — comprimento não substitui dificuldade; evite “enchimento” que mascara gabarito óbvio.`;
    }

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

  const refinePasses =
    difficulty === 'muito_dificil'
      ? ([1, 2] as const)
      : ([1] as const);

  for (const passNum of refinePasses) {
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
        const prompt =
          passNum === 2
            ? buildMcRefineCamouflagePrompt(payload)
            : buildMcRefineStandardPrompt(difficultyLabel, payload);

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
        console.warn(
          `[aiDistractorInstructions] refineMultipleChoiceDistractors pass ${passNum} chunk failed`,
          e
        );
      }
    }
  }

  return out;
}

function buildMcRefineStandardPrompt(difficultyLabel: string, payload: RefineItem[]): string {
  return `Tarefa: melhorar APENAS os textos das alternativas de questões de múltipla escolha (academia jurídica / concursos, Brasil), nível ${difficultyLabel}.

Objetivo principal: impedir que o candidato ache o gabarito por ELIMINAÇÃO superficial (tom, polaridade ou “única opção técnica”).

Regras obrigatórias:
1. Devolva EXACTAMENTE uma entrada por item de entrada, com o mesmo "id" numérico.
2. O campo "correct_answer" (0 a 4) INDICA qual alternativa é a ÚNICA correta. Mantenha esse índice. O texto na posição correct_answer deve continuar a expressar essa resposta correta (pode refinar redação para ficar paralela às outras).
3. Reescreva as QUATRO incorretas para que NÃO sejam descartáveis por contraste de tom com a correta: é PROIBIDO o esquema “quatro elogiam o cenário / uma critica” ou “quatro genéricas / uma precisa”. Pelo menos três alternativas incorretas devem soar como juízos acadêmicos ou técnicos sérios que um examinador poderia defender até certo ponto.
4. ANTI-“ÚNICA VOZ DO RIGOR”: é PROIBIDO que só a alternativa correta mencione deveres centrais da prática científica (replicabilidade, transparência metodológica, descrição de procedimentos de coleta/análise, conformidade com normas do periódico ou ABNT, objetividade na estrutura do artigo) enquanto as incorretas só defendem o autor ou minimizam formalidades. Pelo menos DUAS incorretas devem também citar rigor, normas ou ciência — mas com conclusão substantivamente ERRADA para o caso (prioridade normativa errada, norma inadequada ao contexto, confundir marco teórico com método, etc.).
5. Distribua vocabulário específico da disciplina por todas as opções; as incorretas devem errar por RECORTE, ESCOPO ou CRITÉRIO adjacentemente equivocado — não por falta de linguagem técnica.
6. Harmonize extensão e estrutura (frases, vírgulas, peso argumentativo) entre as cinco linhas; não deixe uma alternativa como única negativa forte (“carece”, “falha”) se as outras forem só louváveis — rebalanceie para várias matizes críticas ou várias aparentemente positivas mas imprecisas.
7. Não altere o enunciado (statement); use-o só como contexto.
8. As cinco strings em "options" devem ser alternativas completas (não prefixe com "A)", "B)" etc.).

Entrada (JSON):
${JSON.stringify(payload)}

Saída: array JSON com objetos { "id", "options", "correct_answer" } apenas.`;
}

/** Segunda passagem só para muito_dificil: quebra o padrão “só o gabarito fala como manual de método”. */
function buildMcRefineCamouflagePrompt(payload: RefineItem[]): string {
  return `Segunda passagem (camuflagem de gabarito — muito difícil): releia cada questão. Se a alternativa na posição "correct_answer" for a ÚNICA que invoca frontalmente replicabilidade, transparência metodológica, normas do periódico/ABNT, peer review ou objetividade estrutural — enquanto outras parecem defender o pesquisador contra esses deveres — reescreva AS CINCO alternativas.

Exigência: pelo menos duas alternativas INCORRETAS devem também soar como defesa do rigor científico / normas editoriais / método explícito, mas aplicadas de modo enviesado (tese sedutora porém errada para o enunciado). A correta permanece a única substantivamente certa; mantenha "correct_answer".

Regras:
1. Mesmo "id", mesmo "correct_answer" (índice); só altere textos em "options".
2. Todas as cinco linhas: tom acadêmico paralelo, extensão semelhante.
3. Não deixe quatro opções “adoçando” o comportamento do personagem do enunciado e uma única “severa” — redistribua severidade e louvor com nuance.

Entrada (JSON):
${JSON.stringify(payload)}

Saída: array JSON com objetos { "id", "options", "correct_answer" } apenas.`;
}
