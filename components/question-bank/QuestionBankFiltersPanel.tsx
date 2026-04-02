import React from 'react';
import { Filter } from 'lucide-react';
import { QUESTION_MODALITY_LABELS, type Notebook, type QuestionModality } from '../../types';

const QUESTION_MODALITY_FILTER_KEYS: QuestionModality[] = ['multipla_escolha', 'certo_errado'];

export interface QuestionBankFiltersPanelProps {
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSubject: string;
  setSelectedSubject: (v: string) => void;
  setSelectedTopic: (v: string) => void;
  subjects: string[];
  filteredTopics: string[];
  selectedTopic: string;
  selectedExamBoard: string;
  setSelectedExamBoard: (v: string) => void;
  examBoards: string[];
  selectedLegislation: string;
  setSelectedLegislation: (v: string) => void;
  legislationTags: string[];
  selectedJurisprudence: string;
  setSelectedJurisprudence: (v: string) => void;
  jurisprudenceTags: string[];
  selectedInstitution: string;
  setSelectedInstitution: (v: string) => void;
  institutions: string[];
  selectedExamName: string;
  setSelectedExamName: (v: string) => void;
  examNames: string[];
  selectedModality: string;
  setSelectedModality: (v: string) => void;
  selectedLegalDiploma: string;
  setSelectedLegalDiploma: (v: string) => void;
  legalDiplomas: string[];
  difficultyFilter: string;
  setDifficultyFilter: (v: string) => void;
  notebooks: Notebook[];
  selectedNotebookId: string;
  setSelectedNotebookId: (v: string) => void;
  questionStatus: 'all' | 'resolved' | 'unresolved' | 'correct' | 'wrong' | 'review_today';
  setQuestionStatus: (v: 'all' | 'resolved' | 'unresolved' | 'correct' | 'wrong' | 'review_today') => void;
  hideResolved: boolean;
  setHideResolved: (v: boolean) => void;
  filteredQuestionCount: number;
  onClearFilters: () => void;
}

export const QuestionBankFiltersPanel: React.FC<QuestionBankFiltersPanelProps> = ({
  showFilters,
  setShowFilters,
  selectedSubject,
  setSelectedSubject,
  setSelectedTopic,
  subjects,
  filteredTopics,
  selectedTopic,
  selectedExamBoard,
  setSelectedExamBoard,
  examBoards,
  selectedLegislation,
  setSelectedLegislation,
  legislationTags,
  selectedJurisprudence,
  setSelectedJurisprudence,
  jurisprudenceTags,
  selectedInstitution,
  setSelectedInstitution,
  institutions,
  selectedExamName,
  setSelectedExamName,
  examNames,
  selectedModality,
  setSelectedModality,
  selectedLegalDiploma,
  setSelectedLegalDiploma,
  legalDiplomas,
  difficultyFilter,
  setDifficultyFilter,
  notebooks,
  selectedNotebookId,
  setSelectedNotebookId,
  questionStatus,
  setQuestionStatus,
  hideResolved,
  setHideResolved,
  filteredQuestionCount,
  onClearFilters,
}) => {
  return (
    <>
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <Filter size={16} /> {showFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
      </button>
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 animate-in slide-in-from-top-2 duration-300">
          <select
            value={selectedSubject}
            onChange={e => {
              setSelectedSubject(e.target.value);
              setSelectedTopic('');
            }}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
          >
            <option value="">Disciplina</option>
            {subjects.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
          >
            <option value="">Assunto</option>
            {filteredTopics.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedExamBoard}
            onChange={e => setSelectedExamBoard(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
          >
            <option value="">Estilo de Banca</option>
            {examBoards.map(b => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={selectedLegislation}
            onChange={e => setSelectedLegislation(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
          >
            <option value="">Legislação</option>
            {legislationTags.map(tag => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select
            value={selectedJurisprudence}
            onChange={e => setSelectedJurisprudence(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
          >
            <option value="">Jurisprudência</option>
            {jurisprudenceTags.map(tag => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select
            value={selectedInstitution}
            onChange={e => setSelectedInstitution(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
          >
            <option value="">Instituição</option>
            {institutions.map(inst => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>

          <select
            value={selectedExamName}
            onChange={e => setSelectedExamName(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
          >
            <option value="">Prova</option>
            {examNames.map(exam => (
              <option key={exam} value={exam}>
                {exam}
              </option>
            ))}
          </select>

          <select
            value={selectedModality}
            onChange={e => setSelectedModality(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
          >
            <option value="">Modalidade</option>
            {QUESTION_MODALITY_FILTER_KEYS.map(key => (
              <option key={key} value={key}>
                {QUESTION_MODALITY_LABELS[key]}
              </option>
            ))}
          </select>

          <select
            value={selectedLegalDiploma}
            onChange={e => setSelectedLegalDiploma(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
          >
            <option value="">Diploma Legal</option>
            {legalDiplomas.map(diploma => (
              <option key={diploma} value={diploma}>
                {diploma}
              </option>
            ))}
          </select>

          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-900"
          >
            <option value="">Dificuldade</option>
            <option value="muito_facil">Muito Fácil</option>
            <option value="facil">Fácil</option>
            <option value="media">Média</option>
            <option value="dificil">Difícil</option>
            <option value="muito_dificil">Muito Difícil</option>
          </select>
        </div>
      )}

      {notebooks.length > 0 && (
        <div className="mb-4">
          <select
            value={selectedNotebookId}
            onChange={e => setSelectedNotebookId(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-orange-200 dark:border-orange-800 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-200"
          >
            <option value="">Meus Cadernos</option>
            {notebooks.map(n => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.question_ids.length})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-12">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">Minhas questões:</span>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setQuestionStatus('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                questionStatus === 'all'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shadow-inner'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setQuestionStatus('correct')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                questionStatus === 'correct'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shadow-inner'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              Certas
            </button>
            <button
              type="button"
              onClick={() => setQuestionStatus('wrong')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                questionStatus === 'wrong'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 shadow-inner'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              Erradas
            </button>
            <button
              type="button"
              onClick={() => setQuestionStatus('review_today')}
              title="Caderno de erros + último erro em dia anterior (alinhado a revisão espaçada simples)"
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                questionStatus === 'review_today'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800 shadow-inner'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              Revisar hoje
            </button>
            <button
              type="button"
              onClick={() => setHideResolved(!hideResolved)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                hideResolved
                  ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 shadow-inner'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {hideResolved ? 'Mostrando Ocultas' : 'Ocultar Resolvidas'}
            </button>
          </div>
          {questionStatus === 'review_today' && (
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-2xl">
              Fila do dia: todas as questões no caderno de erros, mais as que você errou pela última vez em um dia
              anterior (com base na data da última tentativa guardada). Combine com matéria/tópico nos filtros ou use o
              atalho na Revisão espaçada.
            </p>
          )}
        </div>
      </div>
    </div>

    <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
      <div className="text-sm text-slate-500 font-medium">
        <span className="font-bold text-slate-900 dark:text-white">{filteredQuestionCount}</span> questões encontradas
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onClearFilters}
          className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          Limpar filtro
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          Filtrar questões
        </button>
      </div>
    </div>
    </>
  );
};
