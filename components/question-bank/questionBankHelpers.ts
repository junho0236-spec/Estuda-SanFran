import type { Flashcard, Question } from '../../types';
import { normalizeQuestionModality } from '../../types';
import type { QuestionBankSavedFilterPreset } from './types';

/**
 * Colunas para listagem/filtros no Banco de Questões — evita `select('*')` e JSON pesado
 * (`ai_correction`, `texto_gabarito_ia`, `explicacao_doutrinaria`). Correções IA carregam sob demanda.
 */
export const QUESTION_BANK_LIST_COLUMNS =
  'id, user_id, subject, topic, statement, options, correct_answer, explanation, difficulty, exam_board, institution, exam_name, modality, legal_diploma, year, created_at, audio_hint, listen_count, status, is_reinforcement, legislation_tags, jurisprudence_tags, ai_summary, career, formation_area, education_level, job_position, is_annulled, is_outdated, video_url';

export function normalizeQuestionFromApi(q: Question): Question {
  const m = normalizeQuestionModality((q as { modality?: string | null }).modality);
  return { ...q, modality: m };
}

/** Classe Tailwind reutilizada nos botões de alternativa (foco visível). */
export const QB_OPTION_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

/** Limita tokens/latência ao gerar questões a partir de uma pasta grande de flashcards. */
export const AI_FLASHCARD_CONTEXT_MAX_CARDS = 80;
export const AI_FLASHCARD_CONTEXT_MAX_CHARS = 48_000;

export function buildCappedFlashcardContextForAi(folderCards: Flashcard[]): string {
  if (folderCards.length === 0) return '';
  const capCards = folderCards.slice(0, AI_FLASHCARD_CONTEXT_MAX_CARDS);
  const lines: string[] = [];
  let used = 0;
  for (const c of capCards) {
    const line = `- ${c.front}: ${c.back}`;
    const next = used + (lines.length > 0 ? 1 : 0) + line.length;
    if (next > AI_FLASHCARD_CONTEXT_MAX_CHARS) break;
    lines.push(line);
    used = next;
  }
  const included = lines.length;
  const base = `Baseie as questões no seguinte conteúdo jurídico (flashcards):\n${lines.join('\n')}`;
  const omitted = folderCards.length - included;
  if (omitted > 0) {
    return `${base}\n(Nota: ${omitted} flashcard(s) omitidos por limite de tamanho do contexto; use o material acima como base principal.)`;
  }
  return base;
}

export function migrateSavedFilterPresetRow(row: unknown): QuestionBankSavedFilterPreset | null {
  if (!row || typeof row !== 'object') return null;
  const x = row as Partial<QuestionBankSavedFilterPreset> & { selectedSubject?: string };
  if (typeof x.id !== 'string' || typeof x.name !== 'string') return null;
  const subs =
    Array.isArray(x.selectedSubjects) &&
    x.selectedSubjects.length > 0 &&
    x.selectedSubjects.every((s) => typeof s === 'string')
      ? x.selectedSubjects
      : typeof x.selectedSubject === 'string' &&
          x.selectedSubject !== '' &&
          x.selectedSubject !== 'Todos'
        ? [x.selectedSubject]
        : [];
  return {
    ...(x as QuestionBankSavedFilterPreset),
    selectedSubjects: subs,
    selectedSubject: subs[0] ?? '',
  };
}
