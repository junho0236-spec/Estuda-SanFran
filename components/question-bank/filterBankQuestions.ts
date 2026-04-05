import type { Notebook, Question } from '../../types';
import {
  isQuestionDueForReviewToday,
  type QuestionStatForReview,
} from './questionReviewQueue';

export type BankQuestionSort = 'newest' | 'oldest' | 'difficulty_asc' | 'difficulty_desc';

export type QuestionStatusFilter =
  | 'all'
  | 'resolved'
  | 'unresolved'
  | 'correct'
  | 'wrong'
  | 'review_today';

export type FilterBankQuestionsParams = {
  questions: Question[];
  searchTerm: string;
  selectedSubjects: string[];
  selectedTopic: string;
  difficultyFilter: string;
  selectedExamBoard: string;
  selectedYear: string;
  selectedLegislation: string;
  selectedJurisprudence: string;
  selectedInstitution: string;
  selectedExamName: string;
  selectedModality: string;
  selectedLegalDiploma: string;
  selectedCareer: string;
  selectedFormationArea: string;
  selectedEducationLevel: string;
  selectedJobPosition: string;
  wrongQuestions: string[];
  correctQuestions: string[];
  selectedNotebookId: string;
  notebooks: Notebook[];
  isErrorNotebookMode: boolean;
  questionStatus: QuestionStatusFilter;
  questionStats: Record<string, QuestionStatForReview>;
  sortBy: BankQuestionSort;
};

function createdMs(q: Question): number | null {
  if (!q.created_at) return null;
  const t = Date.parse(q.created_at);
  return Number.isNaN(t) ? null : t;
}

const difficultyOrder: Record<string, number> = {
  muito_facil: 1,
  facil: 2,
  media: 3,
  dificil: 4,
  muito_dificil: 5,
};

export function filterAndSortBankQuestions(p: FilterBankQuestionsParams): Question[] {
  const filtered = p.questions.filter((q) => {
    const matchSearch =
      p.searchTerm === '' ||
      q.statement.toLowerCase().includes(p.searchTerm.toLowerCase()) ||
      (q.explanation && q.explanation.toLowerCase().includes(p.searchTerm.toLowerCase()));
    const matchSubject =
      p.selectedSubjects.length === 0 || p.selectedSubjects.includes(q.subject);
    const matchTopic =
      p.selectedTopic === '' || p.selectedTopic === 'Todos' || q.topic === p.selectedTopic;
    const matchDifficulty =
      p.difficultyFilter === '' ||
      p.difficultyFilter === 'Todos' ||
      q.difficulty === p.difficultyFilter;
    const matchExamBoard =
      p.selectedExamBoard === '' ||
      p.selectedExamBoard === 'Todos' ||
      q.exam_board === p.selectedExamBoard;
    const matchYear =
      p.selectedYear === '' || p.selectedYear === 'Todos' || q.year?.toString() === p.selectedYear;
    const matchLegislation =
      p.selectedLegislation === '' ||
      p.selectedLegislation === 'Todos' ||
      (q.legislation_tags && q.legislation_tags.includes(p.selectedLegislation));
    const matchJurisprudence =
      p.selectedJurisprudence === '' ||
      p.selectedJurisprudence === 'Todos' ||
      (q.jurisprudence_tags && q.jurisprudence_tags.includes(p.selectedJurisprudence));
    const matchInstitution =
      p.selectedInstitution === '' ||
      p.selectedInstitution === 'Todos' ||
      q.institution === p.selectedInstitution;
    const matchExamName =
      p.selectedExamName === '' || p.selectedExamName === 'Todos' || q.exam_name === p.selectedExamName;
    const matchModality =
      p.selectedModality === '' || p.selectedModality === 'Todos' || q.modality === p.selectedModality;
    const matchLegalDiploma =
      p.selectedLegalDiploma === '' ||
      p.selectedLegalDiploma === 'Todos' ||
      q.legal_diploma === p.selectedLegalDiploma;
    const matchCareer =
      p.selectedCareer === '' || p.selectedCareer === 'Todos' || q.career === p.selectedCareer;
    const matchFormation =
      p.selectedFormationArea === '' ||
      p.selectedFormationArea === 'Todos' ||
      q.formation_area === p.selectedFormationArea;
    const matchEdu =
      p.selectedEducationLevel === '' ||
      p.selectedEducationLevel === 'Todos' ||
      q.education_level === p.selectedEducationLevel;
    const matchJob =
      p.selectedJobPosition === '' ||
      p.selectedJobPosition === 'Todos' ||
      q.job_position === p.selectedJobPosition;

    const ann = !!q.is_annulled;
    const out = !!q.is_outdated;
    const matchAnnulled = !ann;
    const matchOutdated = !out;

    const isWrong = p.wrongQuestions.includes(q.id);
    const isCorrect = p.correctQuestions.includes(q.id);

    let matchNotebook = true;
    if (p.selectedNotebookId) {
      const notebook = p.notebooks.find((n) => n.id === p.selectedNotebookId);
      matchNotebook = notebook ? notebook.question_ids.includes(q.id) : true;
    }

    let matchStatus = true;
    if (p.isErrorNotebookMode) {
      matchStatus = isWrong;
    } else if (p.questionStatus === 'wrong') {
      matchStatus = isWrong;
    } else if (p.questionStatus === 'correct') {
      matchStatus = isCorrect;
    } else if (p.questionStatus === 'resolved') {
      matchStatus = isWrong || isCorrect;
    } else if (p.questionStatus === 'unresolved') {
      matchStatus = !isWrong && !isCorrect;
    } else if (p.questionStatus === 'review_today') {
      matchStatus = isQuestionDueForReviewToday(q.id, p.wrongQuestions, p.questionStats);
    }

    return (
      matchSearch &&
      matchSubject &&
      matchTopic &&
      matchDifficulty &&
      matchExamBoard &&
      matchYear &&
      matchLegislation &&
      matchJurisprudence &&
      matchNotebook &&
      matchStatus &&
      matchInstitution &&
      matchExamName &&
      matchModality &&
      matchLegalDiploma &&
      matchCareer &&
      matchFormation &&
      matchEdu &&
      matchJob &&
      matchAnnulled &&
      matchOutdated
    );
  });

  return filtered.sort((a, b) => {
    if (p.sortBy === 'newest') {
      const na = createdMs(a) ?? 0;
      const nb = createdMs(b) ?? 0;
      return nb - na;
    }
    if (p.sortBy === 'oldest') {
      const na = createdMs(a) ?? Number.POSITIVE_INFINITY;
      const nb = createdMs(b) ?? Number.POSITIVE_INFINITY;
      return na - nb;
    }

    const diffA = difficultyOrder[String(a.difficulty)] || 0;
    const diffB = difficultyOrder[String(b.difficulty)] || 0;

    if (p.sortBy === 'difficulty_asc') return diffA - diffB;
    if (p.sortBy === 'difficulty_desc') return diffB - diffA;

    return 0;
  });
}
