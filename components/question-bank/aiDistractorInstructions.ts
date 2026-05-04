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
- ANTI-CARICATURA (anti-manequim): PROIBIDO distratores elimináveis por absurdo factual ou invenção de regra (ex.: normas técnicas como critério de mérito pelo número de páginas; tipos de trabalho ou métodos exclusivos de um nível de curso quando não é assim no sistema brasileiro típico; composição de banca factualmente impossível ou regra inventada sobre externos; volume físico do manuscrito como definidor epistemológico; créditos ou carga horária como diferencial epistemológico da tese frente ao mestrado) salvo se o enunciado exigir explicitamente esse dado.
- Cada incorreta deve ser defensível numa defesa oral breve até ser refutada pelo critério fino do enunciado; o erro deve ser de recorte, prioridade normativa ou escopo — não “mentira grosseira” nem estereótipo de prova que um monitor descartaria logo.
- ANTI-ELIMINAÇÃO (sempre): proiba o padrão em que só UMA alternativa soa “certeira” ou só UMA soa “errada pelo tom”. É PROIBIDO quatro elogios ao cenário do enunciado e uma crítica metodológica (ou quatro críticas furadas e uma única técnica). Várias alternativas devem poder parecer defensáveis até confrontadas com o critério canónico preciso; incorretas devem errar por NUANCE (critério adjacente, escopo errado, autoridade inadequada), não por ausência de rigor aparente.
- Distribua vocabulário técnico da disciplina entre TODAS as opções — não concentre na correta os únicos termos decisivos (ex.: “problema de pesquisa”, “originalidade”, “nexo”): incorretas devem também soar acadêmicas e bem fundamentadas, mas aplicadas ao recorte errado ou ao juízo incorreto.
- ANTI-“ÚNICA VOZ DO RIGOR”: é PROIBIDO que só a alternativa correta cite exigências cardeais do meio académico (ex.: replicabilidade, transparência metodológica, descrição explícita de procedimentos, conformidade com normas do periódico/ABNT, peer review, objetividade da estrutura do artigo) enquanto as incorretas só “elogiam” o autor ou minimizam deveres formais. Pelo menos DUAS incorretas devem também invocar rigor, normas, ciência ou deveres editoriais — mas sustentar um juízo SUBSTANTIVAMENTE errado (prioridade invertida, norma errada ao contexto, escopo de exigência inadequado, confundir marco teórico com método, etc.).
- ANTI-“FOTOCOPIA DO DISPOSITIVO” (lei seca / aplicação normativa): PROIBIDO que só a correta seja a paráfrase óbvia do núcleo do artigo aplicável enquanto as incorretas são extremos jurídicos fáceis de cortar (resolução automática e única, conversão obrigatória de obrigação, pré-requisitos processuais inventados, “vedação absoluta” ao recebimento da coisa, mora como pressuposto quando o regime não exige, etc.). Pelo menos DUAS incorretas devem usar o mesmo léxico técnico da área (faculdade do credor, perdas e danos, resolução, abatimento, restituição, mora, culpa do devedor, etc.) e soar aplicáveis ao caso até confrontadas com o **regime jurídico exato** da hipótese ou com o **efeito** previsto no dispositivo citado — errando por instituto vizinho, pressuposto inadequado, ou consequência própria de outra hipótese do mesmo capítulo.
- Igualar cadência: número de períodos/cláusulas e nível de abstração semelhantes nas cinco linhas; evite que uma alternativa seja a única negativa, a única genérica ou a única com modalização forte (“carece”, “falha”), salvo se todas negociarem matizes equivalentes.
- ANTI-EXTREMISMO LÉXICO (palavras-veneno): em alternativas INCORRETAS, é PROIBIDO o uso concentrado de termos absolutistas que denunciam o gabarito por estilo — “exclusivamente”, “puramente”, “estritamente”, “absoluta(o)”, “sempre”, “nunca”, “em qualquer hipótese”, “desprezo total”, “imutabilidade”, “único requisito”, “ignora qualquer”, “rejeita qualquer”, “prescinde de toda”, “vedação absoluta”, “irrestrito”, “estrita observância”. O candidato treinado descarta opções com esse léxico sem ler o conteúdo técnico. Use formulações matizadas (“tende a”, “privilegia”, “em regra”, “salvo exceções”, “preponderantemente”, “como diretriz central”); nenhuma palavra-veneno pode aparecer mais de uma vez por alternativa, e o conjunto das quatro incorretas não pode concentrá-las só num polo. Permitido apenas se o conteúdo técnico realmente exigir absolutismo (raríssimo — ex.: norma cogente expressa).
- TESE NUCLEAR ÚNICA: cada incorreta erra em UM ponto técnico identificável (instituto vizinho, pressuposto inadequado, fonte normativa trocada, escopo errado, consequência jurídica de outra hipótese, linha jurisprudencial superada). PROIBIDO empilhar dois ou mais absurdos independentes na mesma alternativa (ex.: anacronismo histórico + negação grosseira + extremismo léxico, ou troca de instituto + invenção de regra + absolutismo). Quando o erro é único, o aluno com lacuna pontual hesita; quando são dois ou três erros simultâneos, a alternativa se autodenuncia.
- DISTRIBUIÇÃO DO LÉXICO DECISIVO: os termos técnicos que decidem o gabarito (ex.: “interpretação teleológica”, “análise sistemática”, “análise econômica do Direito”, “garantia real”, “função social do contrato”, “boa-fé objetiva”, “álea”, “preservação da empresa”, “custos de transação”) devem aparecer em PELO MENOS DUAS incorretas além da correta — aplicados a recorte/escopo errado, instituto vizinho ou consequência inadequada. PROIBIDO concentrar o vocabulário decisivo só na correta enquanto as incorretas usam linguagem genérica ou apelam a conceitos de outro ramo (ex.: “justiça social”, “equidade distributiva” em relação puramente empresarial paritária).
- PARIDADE DE COMPRIMENTO: contagem de palavras das cinco opções dentro de faixa estreita — diferença máxima de ~25% entre a mais curta e a mais longa. A correta NÃO pode ser sistematicamente a mais longa, a mais detalhada nem a única que “fecha” todos os elementos do enunciado. Se a correta exigir mais palavras para precisão técnica, distribua peso argumentativo equivalente nas incorretas (subordinadas, qualificadores, fundamentos invocados) — sem inventar conteúdo, mas igualando cadência.`;

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
- Anti-eliminação: se o enunciado descrever um trabalho/caso, não faça quatro alternativas que “aprovam” a conduta e uma única que “reprova” metodicamente — rebalanceie para várias críticas plausíveis ou várias leituras sedutoras mas imprecisas.
- Anti-caricatura: não use incorretas “boneco” que um examinador eliminaria por absurdo; todas devem parecer teses que alguém poderia sustentar por um momento no debate acadêmico.
- TESTE DAS PALAVRAS-VENENO (obrigatório antes de devolver): releia cada incorreta e, se aparecer qualquer palavra-veneno listada na regra geral (“exclusivamente”, “puramente”, “absoluta(o)”, “sempre”, “nunca”, “único requisito”, “desprezo total”, “estrita observância”, “imutabilidade”, “ignora qualquer”, “rejeita qualquer”, “prescinde de toda”, “vedação absoluta”, “irrestrito”), reescreva-a em forma matizada preservando o erro técnico — o sinal léxico que denuncia o gabarito deve desaparecer, não o erro.
- DISTRIBUIÇÃO OBRIGATÓRIA DO LÉXICO DECISIVO: identifique os 2–3 termos técnicos que decidem o gabarito da correta (ex.: “interpretação teleológica e sistemática”, “análise econômica”, “garantia real + álea”, “função social + boa-fé objetiva”) e injete pelo menos UM desses termos em DUAS das quatro incorretas — aplicado a recorte/escopo errado, a instituto vizinho ou a consequência inadequada. Proibido que a correta seja a única que invoca o aparato técnico-doutrinário relevante.`;
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
- PROIBIDO o padrão “quatro manequins caricaturais + uma única frase de manual (CAPES/LDB/regimento)”: as cinco alternativas devem soar como posições que um orientador ou examinador poderia defender temporariamente em mesa; incorretas erram por nuance normativa ou escopo, não por lendas urbanas acadêmicas.
- Todas as incorretas devem ser distratores sofisticados: vacilar entre pelo menos TRÊS opções deve ser comum; incorretas atrativas — teses parcialmente válidas, recomendações de boas práticas aplicadas no âmbito errado, ou juízo técnico sedutor mas equivocado.
- Não use incorretas que apenas neguem grosseiramente o enunciado; use confusões reais de concursos (norma vizinha, súmula ou informativo inadequado, regime jurídico equiparável mas inaplicável, linha jurisprudencial superada vs atual).
- Direito das obrigações/contratos: favoreça confundir hipóteses do mesmo universo normativo (ex.: deterioração da coisa certa antes da entrega vs mora absoluta vs resolução por inadimplemento; faculdades do art. 239 vs outros regimes de incumprimento) — não um único artigo “limpo” contra quatro frases disparatadas.
- Mantenha paralelismo gramatical e de densidade informacional entre todas as cinco opções — comprimento não substitui dificuldade; evite “enchimento” que mascara gabarito óbvio.
- TESTE DAS PALAVRAS-VENENO (rigoroso, obrigatório): nenhuma incorreta deste lote pode conter mais de UMA palavra-veneno (ver lista da regra geral); e o conjunto das quatro incorretas não pode concentrar absolutismo só num polo (ex.: três opções com “exclusivamente/absoluta/desprezo total” e a correta toda matizada). Se detectar, reescreva todas as cinco até a correta também ter cadência matizada e as incorretas dissolverem o sinal léxico — o erro técnico permanece, a denúncia estilística sai.
- DISTRIBUIÇÃO MÁXIMA DO LÉXICO DECISIVO: liste mentalmente os 2–3 termos doutrinário-técnicos que decidem o gabarito (ex.: “teoria da empresa + atividade profissional”, “análise econômica + custos de transação”, “garantia real + álea + seguro”, “teleológica + sistemática + função social”). PELO MENOS DUAS incorretas devem invocar UM ou mais desses termos, aplicando-os ao recorte errado (instituto vizinho, pressuposto inadequado, consequência de outro regime, hierarquia normativa trocada). PROIBIDO que a correta seja a única tecnicamente vestida; as incorretas não podem fugir para campo semântico de outro ramo (justiça social genérica, equidade distributiva, antropologia jurídica) salvo se o enunciado abrir essa porta.
- TESTE DA TESE NUCLEAR ÚNICA: para cada incorreta, identifique UM erro técnico nuclear. Se uma incorreta empilhar dois ou mais erros independentes (ex.: anacronismo histórico “corporação medieval” + absolutismo léxico “único requisito” + negação grosseira do enunciado), reescreva mantendo apenas o erro tecnicamente mais fino e plausível. A questão fica mais difícil quando cada incorreta tem um único ponto fraco identificável, não quatro.
- TESTE DE PARIDADE DE COMPRIMENTO (obrigatório): conte mentalmente palavras das cinco opções; a diferença entre a mais curta e a mais longa não pode passar de ~25%. Se a correta sair como a única exaustiva ou a única curta, redistribua peso argumentativo (subordinadas, qualificadores, fundamentos) entre as incorretas — sem inventar conteúdo, igualando densidade.`;
    }

    default:
      return baseHomogeneity;
  }
}

/** Enunciados de “segunda ordem” para discriminar entre teses todas plausíveis (só MC + difícil/muito difícil). */
export function buildAiHighDifficultyStemBlock(
  difficulty: QuestionBankAiConfig['difficulty'],
  modality: QuestionModality
): string {
  if (modality !== 'multipla_escolha') return '';
  if (difficulty !== 'dificil' && difficulty !== 'muito_dificil') return '';
  return `
COMANDO DO ENUNCIADO (alta dificuldade — cumpra em pelo menos METADE das questões DESTE lote):
- Prefira formulações de segunda ordem que obriguem a discriminar entre teses todas plausíveis (ex.: "Qual crítica seria menos adequada...", "Qual distinção é mais pertinente face ao cenário...", "Qual argumento não sustenta...", "Assinale a leitura que melhor reconcilia X com Y"), em vez de apenas "Qual característica diferencia..." ou "Assinale a alternativa correta sobre..." como modelo único de comando.
- Em direito material (obrigações, contratos, responsabilidade): quando possível, evite só "Assinale a alternativa que melhor descreve as faculdades..." com cinco respostas onde quatro são disparates; prefira também formulações do tipo "Qual consequência seria **incabível**...", "Qual requisito **não** se exige nesta hipótese...", "Qual leitura **não** se sustenta no regime legal aplicável...", mantendo as cinco alternativas em registo técnico semelhante.
- Nas restantes questões do lote pode usar comando clássico, desde que as incorretas não sejam caricaturais (vide ANTI-CARICATURA e ANTI-FOTOCOPIA DO DISPOSITIVO nas alternativas).`;
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
 * Refino em cadeia das alternativas (só múltipla escolha; dificil = 1 passo; muito_dificil = 3 passos).
 * muito_dificil: 3 chamadas ao modelo por chunk (lotes de 5), o que aumenta latência e custo.
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
      ? ([1, 2, 3] as const)
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
          passNum === 3
            ? buildMcRefineAntiCaricaturePrompt(payload)
            : passNum === 2
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
9. ANTI-FOTOCOPIA LEGISLATIVA: se a correta for a única paráfrase limpa de um artigo e as incorretas forem extremos jurídicos óbvios, reescreva AS CINCO: incorretas devem parecer aplicações plausíveis mas equivocadas de institutos ou arts. vizinhos (mesmo léxico: resolução, abatimento, mora, culpa, faculdade do credor). Mantenha a substantividade da correta.
10. ANTI-EXTREMISMO LÉXICO (palavras-veneno): em alternativas INCORRETAS, é PROIBIDO o uso concentrado de termos absolutistas que denunciam o gabarito por estilo — “exclusivamente”, “puramente”, “estritamente”, “absoluta(o)”, “sempre”, “nunca”, “em qualquer hipótese”, “desprezo total”, “imutabilidade”, “único requisito”, “ignora qualquer”, “rejeita qualquer”, “prescinde de toda”, “vedação absoluta”, “irrestrito”, “estrita observância”. Se detectar qualquer um, reescreva a alternativa em forma matizada (“tende a”, “privilegia”, “em regra”, “salvo exceções”, “preponderantemente”) preservando o erro técnico — o sinal léxico que denuncia o gabarito deve sair, o erro substantivo permanece.
11. PARIDADE DE COMPRIMENTO: as cinco opções devem ficar dentro de uma faixa estreita — diferença máxima de ~25% em palavras entre a mais curta e a mais longa. A correta NÃO pode ser sistematicamente a mais longa, mais detalhada nem a única que “fecha” todos os elementos do enunciado. Se houver desbalanço, redistribua peso argumentativo entre as cinco — sem inventar conteúdo, igualando densidade.
12. UMA TESE NUCLEAR POR INCORRETA: cada incorreta erra em UM ponto técnico identificável (instituto vizinho, pressuposto inadequado, fonte normativa trocada, escopo errado, consequência de outro regime). Se uma incorreta empilhar dois ou mais erros independentes (ex.: anacronismo + negação grosseira + absolutismo), reescreva mantendo apenas o erro tecnicamente mais fino e plausível; o objetivo é tornar o erro defensável até ser refutado pelo critério canônico, não somar absurdos.
13. DISTRIBUIÇÃO DO LÉXICO DECISIVO: identifique os 2–3 termos doutrinário-técnicos que decidem o gabarito da correta e injete pelo menos UM deles em DUAS das quatro incorretas — aplicado a recorte/escopo errado, instituto vizinho ou consequência inadequada. Proibido que a correta seja a única vestida com o aparato técnico relevante.

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
2. Todas as cinco linhas: tom acadêmico paralelo, extensão semelhante (faixa de ~25% em palavras entre a mais curta e a mais longa).
3. Não deixe quatro opções “adoçando” o comportamento do personagem do enunciado e uma única “severa” — redistribua severidade e louvor com nuance.
4. PALAVRAS-VENENO: reescreva qualquer incorreta que contenha “exclusivamente”, “puramente”, “absoluta(o)”, “sempre”, “nunca”, “único requisito”, “desprezo total”, “estrita observância”, “imutabilidade”, “ignora qualquer”, “rejeita qualquer”, “prescinde de toda”, “vedação absoluta”, “irrestrito”. Substitua por modalizações suaves (“tende a”, “privilegia”, “em regra”, “salvo exceções”, “preponderantemente”) preservando o erro técnico. Idealmente, se necessário absolutismo léxico, distribua-o também na correta para neutralizar o sinal estilístico.
5. UMA TESE NUCLEAR POR INCORRETA: cada incorreta deve errar em UM ponto técnico identificável (instituto vizinho, pressuposto inadequado, fonte normativa trocada, escopo errado). Se houver dois absurdos empilhados na mesma alternativa, mantenha apenas o erro tecnicamente mais fino e plausível.
6. LÉXICO DECISIVO DISTRIBUÍDO: pelo menos DUAS das quatro incorretas devem invocar os termos técnicos que decidem o gabarito da correta (aplicados ao recorte errado), nunca permitir que a correta seja a única vestida com o aparato doutrinário relevante.

Entrada (JSON):
${JSON.stringify(payload)}

Saída: array JSON com objetos { "id", "options", "correct_answer" } apenas.`;
}

/** Terceira passagem só muito_dificil: reduz alternativas ainda elimináveis por absurdo. */
function buildMcRefineAntiCaricaturePrompt(payload: RefineItem[]): string {
  return `Terceira passagem (anti-caricatura — muito difícil): releia o "statement" e as cinco "options" de cada item.

Objetivo: se alguma alternativa INCORRETA ainda soa estraníssima, lendária ou factualmente insustentável no contexto acadêmico-jurídico brasileiro (fábulas sobre ABNT, regras de banca inexistentes, exclusões impossíveis de métodos por nível de curso, OU extremos grosseiros em lei civil quando o enunciado pede regime de obrigações/contratos), SUBSTITUA essa(s) incorreta(s) por distratores cíveis que erram por NUANCE (recorte, prioridade normativa, escopo, confusão entre arts. ou institutos vizinhos) — defendíveis brevemente até serem refutadas pelo critério fino do enunciado.
Adicional: se a correta for nitidamente a única paráfrase do dispositivo aplicável e as incorretas forem disparates, substitua incorretas por teses que cite o mesmo vocabulário jurídico mas apliquem regime ou pressuposto inadequado.

A alternativa na posição "correct_answer" mantém a MESMA tese substantiva (só ajuste de redação se necessário para paralelismo com as outras). Mantenha "correct_answer" e "id" inalterados.

Regras:
1. Devolva EXACTAMENTE uma entrada por item, com o mesmo "id" e o mesmo "correct_answer".
2. As cinco "options" completas; não prefixe com A) B)…
3. Não transforme incorretas em absurdo cômico; o alvo é plausibilidade mínima de banca.
4. PALAVRAS-VENENO RESIDUAIS: faça uma última varredura por “exclusivamente”, “puramente”, “absoluta(o)”, “sempre”, “nunca”, “único requisito”, “desprezo total”, “estrita observância”, “imutabilidade”, “ignora qualquer”, “rejeita qualquer”, “prescinde de toda”, “vedação absoluta”, “irrestrito” — qualquer ocorrência em incorreta que sobrou das passagens anteriores deve ser dissolvida em modalização suave; o erro técnico permanece, o sinal léxico sai.
5. PARIDADE DE COMPRIMENTO FINAL: garanta faixa máxima de ~25% em palavras entre a mais curta e a mais longa das cinco opções. Se a correta sair como a única exaustiva, redistribua peso argumentativo (subordinadas, qualificadores, fundamentos invocados) entre as incorretas — sem inventar conteúdo, igualando densidade.
6. TESE NUCLEAR ÚNICA (consolidação): se alguma incorreta ainda apresentar dois ou mais erros independentes, simplifique para um único erro tecnicamente fino e plausível (preferência por confusão entre institutos vizinhos do mesmo capítulo legislativo, súmula superada vs. atual, ou consequência típica de outra hipótese do mesmo regime).

Entrada (JSON):
${JSON.stringify(payload)}

Saída: array JSON com objetos { "id", "options", "correct_answer" } apenas.`;
}
