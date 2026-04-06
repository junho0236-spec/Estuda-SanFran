import type { Dispatch, SetStateAction } from 'react';
import type { Flashcard, Subject, Folder } from '../../types';

export interface SessionStats {
  isActive: boolean;
  isFinished: boolean;
  new: { total: number; correct: number; totalTimeMs: number };
  learning: { total: number; correct: number; totalTimeMs: number };
  review: { total: number; correct: number; totalTimeMs: number };
  errors: Flashcard[];
  cardTimes: { card: Flashcard; timeMs: number }[];
}

export interface AnkiProps {
  subjects: Subject[];
  flashcards: Flashcard[];
  setFlashcards: Dispatch<SetStateAction<Flashcard[]>>;
  folders: Folder[];
  setFolders: Dispatch<SetStateAction<Folder[]>>;
  userId: string;
  isOnline: boolean;
  initialText: string | null;
  setInitialText: Dispatch<SetStateAction<string | null>>;
  setStudySessions?: Dispatch<SetStateAction<unknown[]>>;
  isLoadingFlashcards?: boolean;
}
