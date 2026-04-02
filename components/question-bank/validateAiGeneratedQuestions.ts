import type { Question, QuestionModality } from '../../types';
import { normalizeQuestionModality } from '../../types';

/** Número exato de alternativas por modalidade (alinha com o prompt da IA). */
export const AI_QUESTION_OPTIONS_COUNT: Record<QuestionModality, number> = {
  multipla_escolha: 5,
  certo_errado: 2,
};

export type ValidatedAiQuestionInsert = {
  user_id: string;
  subject: string;
  topic: string;
  statement: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
  exam_board: string;
  institution: string;
  exam_name: string;
  modality: QuestionModality;
  legal_diploma: string;
  year: string;
  legislation_tags: string[];
  jurisprudence_tags: string[];
  is_reinforcement?: boolean;
};

function trimStr(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function normalizeDifficulty(raw: unknown): string {
  const s = trimStr(raw).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const compact = s.replace(/\s+/g, '_');
  const allowed: Question['difficulty'][] = [
    'muito_facil',
    'facil',
    'media',
    'dificil',
    'muito_dificil',
  ];
  if ((allowed as string[]).includes(compact)) return compact;
  const map: Record<string, string> = {
    muito_facil: 'muito_facil',
    muito_simples: 'muito_facil',
    facil: 'facil',
    medio: 'media',
    media: 'media',
    mediana: 'media',
    dificil: 'dificil',
    muito_dificil: 'muito_dificil',
    muito_dificl: 'muito_dificil',
  };
  return map[compact] || 'media';
}

/**
 * Valida um item bruto retornado pela IA antes do insert no Supabase.
 * @param indexOneBased 1-based para mensagens ao utilizador
 */
export function validateOneAiGeneratedQuestion(
  raw: unknown,
  modality: QuestionModality,
  indexOneBased: number,
  defaults: {
    exam_board: string;
    institution: string;
    exam_name: string;
    legal_diploma: string;
    year: string;
  }
): { ok: true; row: Omit<ValidatedAiQuestionInsert, 'user_id'> } | { ok: false; message: string } {
  const label = `Questão ${indexOneBased}`;
  const expectedOpts = AI_QUESTION_OPTIONS_COUNT[modality];

  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: `${label}: formato inválido (esperado um objeto por questão).` };
  }

  const q = raw as Record<string, unknown>;

  const subject = trimStr(q.subject);
  if (!subject) {
    return { ok: false, message: `${label}: campo obrigatório em falta ou vazio: matéria (subject).` };
  }

  const topic = trimStr(q.topic);
  if (!topic) {
    return { ok: false, message: `${label}: campo obrigatório em falta ou vazio: tópico (topic).` };
  }

  const statement = trimStr(q.statement);
  if (!statement) {
    return { ok: false, message: `${label}: campo obrigatório em falta ou vazio: enunciado (statement).` };
  }

  const explanation = trimStr(q.explanation);
  if (!explanation) {
    return { ok: false, message: `${label}: campo obrigatório em falta ou vazio: explicação (explanation).` };
  }

  if (!Array.isArray(q.options)) {
    return { ok: false, message: `${label}: "options" tem de ser uma lista (array) de textos.` };
  }

  const options = (q.options as unknown[]).map((o) => trimStr(o));
  if (options.length !== expectedOpts) {
    return {
      ok: false,
      message: `${label}: a modalidade exige ${expectedOpts} alternativas (${modality === 'multipla_escolha' ? 'A–E' : 'Certo e Errado'}); a IA devolveu ${options.length}.`,
    };
  }

  const emptyIdx = options.findIndex((t) => !t);
  if (emptyIdx !== -1) {
    return {
      ok: false,
      message: `${label}: a alternativa ${String.fromCharCode(65 + emptyIdx)} está vazia; todas devem ter texto.`,
    };
  }

  const caRaw = q.correct_answer;
  let correctAnswer: number;
  if (typeof caRaw === 'number' && Number.isInteger(caRaw)) {
    correctAnswer = caRaw;
  } else if (typeof caRaw === 'string' && caRaw.trim() !== '') {
    const n = Number.parseInt(caRaw.trim(), 10);
    if (!Number.isInteger(n)) {
      return {
        ok: false,
        message: `${label}: "correct_answer" tem de ser um número inteiro (índice da correta: 0 a ${expectedOpts - 1}); recebido: "${caRaw}".`,
      };
    }
    correctAnswer = n;
  } else {
    return {
      ok: false,
      message: `${label}: "correct_answer" em falta ou inválido; tem de ser inteiro entre 0 e ${expectedOpts - 1}.`,
    };
  }

  if (correctAnswer < 0 || correctAnswer >= options.length) {
    return {
      ok: false,
      message: `${label}: "correct_answer"=${correctAnswer} está fora do intervalo válido (0 a ${options.length - 1}) para ${options.length} alternativas.`,
    };
  }

  const resolvedModality = normalizeQuestionModality(trimStr(q.modality)) ?? modality;

  const exam_board = trimStr(q.exam_board) || defaults.exam_board;
  if (!exam_board) {
    return { ok: false, message: `${label}: "exam_board" (banca/estilo) é obrigatório ou defina-o na configuração do gerador.` };
  }

  const year = trimStr(q.year) || defaults.year;
  if (!year) {
    return { ok: false, message: `${label}: "year" (ano) é obrigatório.` };
  }

  const legislation_tags = Array.isArray(q.legislation_tags)
    ? (q.legislation_tags as unknown[]).map((t) => trimStr(t)).filter(Boolean)
    : [];
  const jurisprudence_tags = Array.isArray(q.jurisprudence_tags)
    ? (q.jurisprudence_tags as unknown[]).map((t) => trimStr(t)).filter(Boolean)
    : [];

  return {
    ok: true,
    row: {
      subject,
      topic,
      statement,
      options,
      correct_answer: correctAnswer,
      explanation,
      difficulty: normalizeDifficulty(q.difficulty),
      exam_board,
      institution: trimStr(q.institution) || defaults.institution,
      exam_name: trimStr(q.exam_name) || defaults.exam_name,
      modality: resolvedModality,
      legal_diploma: trimStr(q.legal_diploma) || defaults.legal_diploma,
      year,
      legislation_tags,
      jurisprudence_tags,
    },
  };
}

/**
 * Valida todas as questões; falha o lote inteiro se alguma for inválida (evita dados inconsistentes).
 */
export function validateAiQuestionsBatch(
  items: unknown[],
  modality: QuestionModality,
  defaults: {
    exam_board: string;
    institution: string;
    exam_name: string;
    legal_diploma: string;
    year: string;
  }
): { ok: true; rows: Omit<ValidatedAiQuestionInsert, 'user_id'>[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, errors: ['A IA não devolveu nenhuma questão em formato de lista. Tente novamente com menos questões por vez.'] };
  }

  const rows: Omit<ValidatedAiQuestionInsert, 'user_id'>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const r = validateOneAiGeneratedQuestion(items[i], modality, i + 1, defaults);
    if (r.ok === false) {
      errors.push(r.message);
    } else {
      rows.push(r.row);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, rows };
}
