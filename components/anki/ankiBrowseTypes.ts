import type { Flashcard, Folder, Subject } from '../../types';

export type AnkiStreakStats = {
  streak: number;
  total: number;
  average: number;
  message: string;
  cardsToday: number;
  isGoalReached: boolean;
};

export type AnkiForecastDay = {
  label: string;
  count: number;
  counts: { new: number; learning: number; review: number };
  hasExam: boolean;
  exams: string[];
};

export type HeatmapHoverState = {
  date: string;
  count: number;
  x: number;
  y: number;
  isTopHalf: boolean;
} | null;

export type FolderStatsRow = {
  newCount: number;
  learningCount: number;
  reviewCount: number;
  mastery: number;
  totalCount: number;
};

export type { Flashcard, Folder, Subject };
