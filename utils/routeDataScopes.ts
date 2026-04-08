import { View } from '../types';
import type { UserDataSyncScope } from './realtimeThrottle';

/** Escopos de dados necessários por ecrã (além do `bootstrap` pós-login). */
export function getDataScopesForView(view: View): UserDataSyncScope[] {
  switch (view) {
    case View.Dashboard:
      return ['subjects', 'tasks', 'flashcards'];
    case View.Tasks:
      return ['tasks', 'boards', 'subjects'];
    case View.Anki:
      return ['flashcards', 'folders', 'subjects'];
    case View.QuestionBank:
      return ['folders', 'flashcards'];
    case View.Timer:
      return ['subjects', 'tasks', 'study_sessions'];
    case View.Calendar:
      return ['tasks', 'subjects'];
    case View.Statistics:
      return ['study_sessions', 'flashcards', 'tasks', 'subjects', 'user_progress'];
    case View.Library:
      return ['readings'];
    case View.Subjects:
    case View.NoteView:
    case View.Repository:
    case View.Assignments:
      return ['subjects', 'tasks'];
    case View.Calculator:
      return ['subjects'];
    case View.Ranking:
      return ['flashcards'];
    case View.DominioJuridico:
    case View.Specialization:
      return ['subjects'];
    case View.DigitalID:
      return ['tasks'];
    case View.Office:
    case View.ClassificadosPatio:
      return ['study_sessions'];
    case View.SpacedRepetition:
      return ['flashcards'];
    default:
      return [];
  }
}
