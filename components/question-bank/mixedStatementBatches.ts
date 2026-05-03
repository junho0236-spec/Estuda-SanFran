/** Alinhado ao copy do modal de IA e ao prompt em QuestionBank.tsx */
export const QB_STATEMENT_CASO = 'Caso Prático (Situação Hipotética)' as const;
export const QB_STATEMENT_DIRETO = 'Enunciado Direto' as const;
/** Mistura: total par → metade direto + metade caso; total ímpar → o +1 é enunciado direto */
export const QB_STATEMENT_MIX = 'Mistura (enunciado direto + caso prático)' as const;

export type QuestionBankStatementTypeChoice =
  | typeof QB_STATEMENT_CASO
  | typeof QB_STATEMENT_DIRETO
  | typeof QB_STATEMENT_MIX;

/**
 * Para totais ímpares, o “+1” fica em enunciado direto (ex.: 5 → 3 direto + 2 caso).
 */
export function splitMixedStatementCounts(total: number): { direto: number; casoPratico: number } {
  const n = Math.max(0, Math.floor(total));
  if (n === 0) return { direto: 0, casoPratico: 0 };
  if (n % 2 === 0) {
    const half = n / 2;
    return { direto: half, casoPratico: half };
  }
  return { direto: (n + 1) / 2, casoPratico: (n - 1) / 2 };
}

export type AiGenBatch = {
  size: number;
  /** Valor literal enviado ao prompt em «Tipo de Enunciado» */
  statementType: typeof QB_STATEMENT_CASO | typeof QB_STATEMENT_DIRETO;
};

/**
 * Divide a geração em lotes de até `chunkSize`, respeitando um único tipo de enunciado por pedido à IA.
 * Na mistura, gera-se primeiro todos os lotes de enunciado direto, depois os de caso prático.
 */
export function buildAiStatementBatches(
  totalQuestions: number,
  chunkSize: number,
  mode: QuestionBankStatementTypeChoice
): AiGenBatch[] {
  const chunk = Math.max(1, chunkSize);
  const total = Math.max(0, Math.floor(totalQuestions));

  if (mode !== QB_STATEMENT_MIX) {
    const batches: AiGenBatch[] = [];
    let remaining = total;
    while (remaining > 0) {
      const size = Math.min(chunk, remaining);
      batches.push({
        size,
        statementType: mode === QB_STATEMENT_CASO ? QB_STATEMENT_CASO : QB_STATEMENT_DIRETO,
      });
      remaining -= size;
    }
    return batches;
  }

  const { direto, casoPratico } = splitMixedStatementCounts(total);
  const batches: AiGenBatch[] = [];

  const pushChunks = (n: number, statementType: typeof QB_STATEMENT_CASO | typeof QB_STATEMENT_DIRETO) => {
    let rem = n;
    while (rem > 0) {
      const size = Math.min(chunk, rem);
      batches.push({ size, statementType });
      rem -= size;
    }
  };

  pushChunks(direto, QB_STATEMENT_DIRETO);
  pushChunks(casoPratico, QB_STATEMENT_CASO);

  return batches;
}

/**
 * Regras imperativas para o modelo não misturar “caso prático” com “enunciado direto”.
 * Usar no prompt da geração por lote (`statementForThisBatch` é sempre CASO ou DIRETO).
 */
export function buildAiStatementEnforcementBlock(
  statementType: typeof QB_STATEMENT_CASO | typeof QB_STATEMENT_DIRETO
): string {
  if (statementType === QB_STATEMENT_CASO) {
    return `
REGRAS OBRIGATÓRIAS DO ENUNCIADO (Caso Prático — TODAS as questões deste lote, sem exceção):
- Cada campo "statement" DEVE ser uma situação hipotética com narrativa: identificar partes (nomes fictícios ou papéis jurídicos), expor fatos concretos relevantes (contratos, prazos, atos, danos, pedidos, etc.) e só depois formular a pergunta jurídica a partir desses fatos.
- PROIBIDO: enunciados que apenas definam institutos, perguntem "Assinale a alternativa correta sobre X" sem cenário, ou limitem-se a transcrever/elucidar um artigo isolado sem fato nem personagens.
- PROIBIDO: formato de "prova de lei seca" sem mini-história; o candidato deve resolver a partir do caso narrado.
- Se alguma questão violar isto, substitua-a por um novo caso hipotético antes de devolver o JSON.`;
  }

  return `
REGRAS OBRIGATÓRIAS DO ENUNCIADO (Enunciado Direto — TODAS as questões deste lote):
- Cada campo "statement" DEVE ser objetivo: comando breve, proposição normativa ou questão conceitual, sem narrativa de caso.
- PROIBIDO: histórias com personagens nomeados, sequências fáticas longas, ou cenários do tipo "A contratou B e depois…".
- Máximo ~3–4 frases por enunciado; foco na distinção jurídica pedida.
- Se alguma questão violar isto, reescreva-a em formato direto antes de devolver o JSON.`;
}
