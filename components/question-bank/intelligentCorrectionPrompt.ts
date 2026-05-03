import type { Question } from '../../types';
import { questionModalityLabel } from '../../types';

function joinTags(tags: string[] | undefined, label: string): string {
  if (!tags?.length) return '';
  return `${label}: ${tags.join(', ')}`;
}

/**
 * Prompt do usuário para correção IA pedagógica (mini-aula + análise de alternativas).
 */
export function buildIntelligentCorrectionUserPrompt(question: Question): string {
  const modalityLabel = questionModalityLabel(question.modality) || 'não informada';
  const legislation = joinTags(question.legislation_tags, 'Tags de legislação');
  const jurisprudence = joinTags(question.jurisprudence_tags, 'Tags de jurisprudência');
  const metaLines = [
    `Disciplina: ${question.subject}`,
    `Tópico: ${question.topic || 'não informado'}`,
    `Modalidade: ${modalityLabel}`,
    `Dificuldade: ${question.difficulty}`,
    `Banca / estilo: ${question.exam_board || 'Geral'}`,
    `Instituição: ${question.institution || 'não informada'}`,
    `Ano: ${question.year || 'não informado'}`,
    `Diploma legal (se houver): ${question.legal_diploma || 'não informado'}`,
    legislation,
    jurisprudence,
  ].filter(Boolean);

  const optionsBlock = question.options
    .map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`)
    .join('\n');

  const correctLetter = String.fromCharCode(65 + question.correct_answer);
  const letterList = question.options
    .map((_, i) => String.fromCharCode(65 + i))
    .join(', ');

  return `Você é professor de Direito. Sua prioridade é ENSINAR o conteúdo específico desta questão em português claro (evite juridiquês desnecessário; quando usar termo técnico, explique no glossário).

CONTEXTO DA QUESTÃO:
${metaLines.join('\n')}

ENUNCIADO:
${question.statement}

ALTERNATIVAS:
${optionsBlock}

GABARITO OFICIAL (letra correta): ${correctLetter}

INSTRUÇÕES DE CONTEÚDO:
1) plainLanguageSummary: reescreva os fatos relevantes, o que o comando pede e qual é o "nó" jurídico, em linguagem acessível. Use Markdown se ajudar (parágrafos curtos).
2) keyConcepts: 2 a 6 pares termo/explicação para o aluno entender o vocabulário desta questão.
3) reasoningSteps: 3 a 5 passos em Markdown numerados (ex.: fatos → problema → norma/critério → encaixe no caso → por que a letra ${correctLetter}).
4) doctrineAndContext: síntese doutrinária/jurisprudencial enxuta ligada ao tema (não repita todo o passo a passo de reasoningSteps).
5) legalBasis: artigos, lei ou princípios centrais (citados de forma objetiva).
6) alternativesAnalysis: exatamente ${question.options.length} entradas, na ordem ${letterList}. Campo "alternative" deve ser só a letra correspondente. status exatamente "Correta" ou "Incorreta". Em explanation: para INCORRETAS, primeiro por que a alternativa PARECE sedutora, depois o erro jurídico; para a CORRETA, por que resolve o nó da questão. Evite começar só com "Incorreta:" ou "Correta:".
7) boardTrap: qual distração ou confusão típica a banca explorou.
8) nuanceNote: se houver divergência doutrinária ou julgado relevante em sentido divergente, explique em 1–3 frases; caso contrário string vazia "".
9) mnemonic: uma frase ou mnemônico curto de reforço (não substitua as explicações).
10) doctrineLink e doctrineUrl: use string vazia "" para ambos se não houver obra ou URL confiáveis para indicar (não invente URLs).

Preencha todos os campos do JSON solicitado.`;

}
