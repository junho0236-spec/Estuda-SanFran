import type { Dispatch, SetStateAction } from 'react';
import type { Question, QuestionModality } from '../../types';
import type { QuestionAnswerGoalsPersisted } from './answerGoals';

/** Campos omitidos usam o estado React atual (não o banco). Use arrays/objetos vazios para limpar. */
export type SyncUserProgressUpdates = {
  favorites?: string[];
  wrongQuestions?: string[];
  correctQuestions?: string[];
  notes?: Record<string, string>;
  correctCount?: number;
  wrongCount?: number;
  errorMastery?: Record<string, number>;
  confidence_levels?: Record<string, 'certeza' | 'duvida' | 'chute'>;
  question_answer_goals?: QuestionAnswerGoalsPersisted;
};

export type QuestionBankMockResults = {
  score: number;
  total: number;
  timeSpent: number;
  /** ISO quando o simulado começou (para o relatório exportável). */
  startedAtIso?: string;
  subjectStats: {
    subject: string;
    correct: number;
    total: number;
    confidence: Record<string, number>;
    correctConfidence: Record<string, number>;
  }[];
  avgTimePerQuestion: number;
  confidenceStats: { certeza: number; duvida: number; chute: number };
  luckyGuesses: string[];
  doubtGuesses: string[];
  /** IDs marcados pelo aluno como “revisar depois” durante o simulado. */
  reviewLaterIds: string[];
  /** IDs sem resposta ao finalizar. */
  unansweredIds: string[];
};

export type QuestionBankAiConfig = {
  subject: string;
  topic: string;
  context: string;
  count: number;
  difficulty: 'muito_facil' | 'facil' | 'media' | 'dificil' | 'muito_dificil';
  examStyle: string;
  legalFocus: string[];
  statementType: 'Caso Prático (Situação Hipotética)' | 'Enunciado Direto';
  baseOnFlashcards: boolean;
  selectedFolderId: string;
  tribunal: 'Jurisprudência STF' | 'Jurisprudência STJ' | 'Ambos';
  yearFilter: '2025-2026' | 'Últimos 2 anos';
  institution: string;
  examName: string;
  modality: QuestionModality;
  legalDiploma: string;
};

export type QuestionBankAiConfigSetter = Dispatch<SetStateAction<QuestionBankAiConfig>>;
