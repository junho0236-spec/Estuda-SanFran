import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  Info,
  Minus,
  Moon,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import {
  QUESTION_MODALITY_LABELS,
  type Notebook,
  type QuestionModality,
} from '../../types';
import type { QuestionBankSavedFilterPreset } from './types';
import {
  SearchableFilterDropdown,
  toOptions,
  type SearchableDropdownOption,
} from './SearchableFilterDropdown';
import { DisciplineFilterDropdown } from './DisciplineFilterDropdown';

const MOD_KEYS: QuestionModality[] = ['multipla_escolha', 'certo_errado'];

const DIFFICULTY_OPTS: SearchableDropdownOption[] = [
  { value: 'muito_facil', label: 'Muito fácil' },
  { value: 'facil', label: 'Fácil' },
  { value: 'media', label: 'Média' },
  { value: 'dificil', label: 'Difícil' },
  { value: 'muito_dificil', label: 'Muito difícil' },
];

function PillRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider shrink-0 pt-2 min-w-[140px]">
        {label}
      </span>
      <div className="flex flex-wrap gap-2 flex-1">{children}</div>
    </div>
  );
}

function Pill({
  active,
  children,
  onClick,
  disabled,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

export interface ActiveFilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

export interface QuestionBankFiltersPanelProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  selectedSubject: string;
  setSelectedSubject: (v: string) => void;
  setSelectedTopic: (v: string) => void;
  filteredTopics: string[];
  selectedTopic: string;
  selectedExamBoard: string;
  setSelectedExamBoard: (v: string) => void;
  examBoards: string[];
  selectedInstitution: string;
  setSelectedInstitution: (v: string) => void;
  institutions: string[];
  selectedJobPosition: string;
  setSelectedJobPosition: (v: string) => void;
  jobPositions: string[];
  selectedYear: string;
  setSelectedYear: (v: string) => void;
  years: string[];
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  selectedCareer: string;
  setSelectedCareer: (v: string) => void;
  careers: string[];
  selectedFormationArea: string;
  setSelectedFormationArea: (v: string) => void;
  formationAreas: string[];
  selectedEducationLevel: string;
  setSelectedEducationLevel: (v: string) => void;
  educationLevels: string[];
  difficultyFilter: string;
  setDifficultyFilter: (v: string) => void;
  selectedLegislation: string;
  setSelectedLegislation: (v: string) => void;
  legislationTags: string[];
  selectedJurisprudence: string;
  setSelectedJurisprudence: (v: string) => void;
  jurisprudenceTags: string[];
  selectedExamName: string;
  setSelectedExamName: (v: string) => void;
  examNames: string[];
  selectedModality: string;
  setSelectedModality: (v: string) => void;
  selectedLegalDiploma: string;
  setSelectedLegalDiploma: (v: string) => void;
  legalDiplomas: string[];
  notebooks: Notebook[];
  selectedNotebookId: string;
  setSelectedNotebookId: (v: string) => void;
  questionStatus: 'all' | 'resolved' | 'unresolved' | 'correct' | 'wrong' | 'review_today';
  setQuestionStatus: (
    v: 'all' | 'resolved' | 'unresolved' | 'correct' | 'wrong' | 'review_today'
  ) => void;
  filteredQuestionCount: number;
  activeFilterChips: ActiveFilterChip[];
  onClearFilters: () => void;
  onApplyFilters: () => void;
  savedPresets: QuestionBankSavedFilterPreset[];
  onLoadPreset: (preset: QuestionBankSavedFilterPreset) => void;
  onSaveCurrentFilter: (name: string) => void;
  onOpenMockSetup: () => void;
  sortBy: 'newest' | 'oldest' | 'difficulty_asc' | 'difficulty_desc';
  setSortBy: (v: 'newest' | 'oldest' | 'difficulty_asc' | 'difficulty_desc') => void;
  listPageSize: number;
  setListPageSize: (v: number) => void;
  listFontScalePercent: number;
  onFontIncrease: () => void;
  onFontDecrease: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const QuestionBankFiltersPanel: React.FC<QuestionBankFiltersPanelProps> = ({
  searchTerm,
  setSearchTerm,
  selectedSubject,
  setSelectedSubject,
  setSelectedTopic,
  filteredTopics,
  selectedTopic,
  selectedExamBoard,
  setSelectedExamBoard,
  examBoards,
  selectedInstitution,
  setSelectedInstitution,
  institutions,
  selectedJobPosition,
  setSelectedJobPosition,
  jobPositions,
  selectedYear,
  setSelectedYear,
  years,
  showAdvanced,
  setShowAdvanced,
  selectedCareer,
  setSelectedCareer,
  careers,
  selectedFormationArea,
  setSelectedFormationArea,
  formationAreas,
  selectedEducationLevel,
  setSelectedEducationLevel,
  educationLevels,
  difficultyFilter,
  setDifficultyFilter,
  selectedLegislation,
  setSelectedLegislation,
  legislationTags,
  selectedJurisprudence,
  setSelectedJurisprudence,
  jurisprudenceTags,
  selectedExamName,
  setSelectedExamName,
  examNames,
  selectedModality,
  setSelectedModality,
  selectedLegalDiploma,
  setSelectedLegalDiploma,
  legalDiplomas,
  notebooks,
  selectedNotebookId,
  setSelectedNotebookId,
  questionStatus,
  setQuestionStatus,
  filteredQuestionCount,
  activeFilterChips,
  onClearFilters,
  onApplyFilters,
  savedPresets,
  onLoadPreset,
  onSaveCurrentFilter,
  onOpenMockSetup,
  sortBy,
  setSortBy,
  listPageSize,
  setListPageSize,
  listFontScalePercent,
  onFontIncrease,
  onFontDecrease,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [saveName, setSaveName] = useState('');
  const [showSavedMenu, setShowSavedMenu] = useState(false);

  const modalityOptions = useMemo(
    () => MOD_KEYS.map((key) => ({ value: key, label: QUESTION_MODALITY_LABELS[key] })),
    []
  );

  const notebookOptions = useMemo(
    () =>
      notebooks.map((n) => ({
        value: n.id,
        label: `${n.name} (${n.question_ids.length})`,
      })),
    [notebooks]
  );

  const helpText = useMemo(
    () =>
      'Os filtros aplicam-se em tempo real. Use chips para remover critérios. A disciplina é escolhida numa lista fixa (como no Gran Cursos).',
    []
  );

  return (
    <>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 shadow-sm overflow-visible">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <span
            className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-help"
            title={helpText}
          >
            <Info size={18} aria-hidden />
            <span className="sr-only">{helpText}</span>
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSavedMenu((s) => !s)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400"
            >
              <SlidersHorizontal size={14} />
              Filtros salvos
              <ChevronDown size={14} />
            </button>
            {showSavedMenu && (
              <div className="absolute right-0 mt-1 w-64 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-20 py-1">
                {savedPresets.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">Nenhum filtro guardado.</p>
                ) : (
                  savedPresets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => {
                        onLoadPreset(p);
                        setShowSavedMenu(false);
                      }}
                    >
                      {p.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="relative w-full">
              <label className="sr-only">Pesquisar</label>
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
                aria-hidden
              />
              <input
                type="search"
                placeholder="Pesquisar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <div className="min-w-0">
                <DisciplineFilterDropdown
                  emptyLabel="Disciplina"
                  clearLabel="Todas as disciplinas"
                  value={selectedSubject}
                  onChange={(v) => {
                    setSelectedSubject(v);
                    setSelectedTopic('');
                  }}
                />
              </div>
              <div className="min-w-0">
                <SearchableFilterDropdown
                  label="Assunto"
                  emptyLabel="Assunto"
                  clearLabel="Todos os assuntos"
                  value={selectedTopic}
                  onChange={setSelectedTopic}
                  options={toOptions(filteredTopics)}
                  disabled={!selectedSubject}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SearchableFilterDropdown
              label="Banca / estilo"
              emptyLabel="Banca / estilo"
              clearLabel="Todas as bancas"
              value={selectedExamBoard}
              onChange={setSelectedExamBoard}
              options={toOptions(examBoards)}
            />
            <SearchableFilterDropdown
              label="Instituição"
              emptyLabel="Instituição"
              clearLabel="Todas"
              value={selectedInstitution}
              onChange={setSelectedInstitution}
              options={toOptions(institutions)}
            />
            <SearchableFilterDropdown
              label="Cargo"
              emptyLabel="Cargo"
              clearLabel="Todos"
              value={selectedJobPosition}
              onChange={setSelectedJobPosition}
              options={toOptions(jobPositions)}
            />
            <SearchableFilterDropdown
              label="Ano"
              emptyLabel="Ano"
              clearLabel="Todos os anos"
              value={selectedYear}
              onChange={setSelectedYear}
              options={toOptions(years)}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            {showAdvanced ? (
              <>
                <Minus size={14} /> Filtro simplificado
              </>
            ) : (
              <>
                <Plus size={14} /> Filtro avançado
              </>
            )}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
              <SearchableFilterDropdown
                label="Carreira"
                emptyLabel="Carreira"
                clearLabel="Todas"
                value={selectedCareer}
                onChange={setSelectedCareer}
                options={toOptions(careers)}
              />
              <SearchableFilterDropdown
                label="Área de formação"
                emptyLabel="Área de formação"
                clearLabel="Todas"
                value={selectedFormationArea}
                onChange={setSelectedFormationArea}
                options={toOptions(formationAreas)}
              />
              <SearchableFilterDropdown
                label="Escolaridade"
                emptyLabel="Escolaridade"
                clearLabel="Todas"
                value={selectedEducationLevel}
                onChange={setSelectedEducationLevel}
                options={toOptions(educationLevels)}
              />
              <SearchableFilterDropdown
                label="Dificuldade"
                emptyLabel="Dificuldade"
                clearLabel="Qualquer dificuldade"
                value={difficultyFilter}
                onChange={setDifficultyFilter}
                options={DIFFICULTY_OPTS}
              />
              <SearchableFilterDropdown
                label="Legislação"
                emptyLabel="Legislação"
                clearLabel="Todas"
                value={selectedLegislation}
                onChange={setSelectedLegislation}
                options={toOptions(legislationTags)}
              />
              <SearchableFilterDropdown
                label="Jurisprudência"
                emptyLabel="Jurisprudência"
                clearLabel="Todas"
                value={selectedJurisprudence}
                onChange={setSelectedJurisprudence}
                options={toOptions(jurisprudenceTags)}
              />
              <SearchableFilterDropdown
                label="Prova"
                emptyLabel="Prova"
                clearLabel="Todas"
                value={selectedExamName}
                onChange={setSelectedExamName}
                options={toOptions(examNames)}
              />
              <SearchableFilterDropdown
                label="Diploma legal"
                emptyLabel="Diploma legal"
                clearLabel="Todos"
                value={selectedLegalDiploma}
                onChange={setSelectedLegalDiploma}
                options={toOptions(legalDiplomas)}
              />
              <SearchableFilterDropdown
                label="Modalidade"
                emptyLabel="Modalidade"
                clearLabel="Qualquer modalidade"
                value={selectedModality}
                onChange={setSelectedModality}
                options={modalityOptions}
              />
              {notebooks.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/30 p-0.5 dark:border-orange-900 dark:bg-orange-950/20">
                  <SearchableFilterDropdown
                    label="Meus cadernos"
                    emptyLabel="Meus cadernos"
                    clearLabel="Nenhum caderno"
                    value={selectedNotebookId}
                    onChange={setSelectedNotebookId}
                    options={notebookOptions}
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <PillRow label="Minhas questões">
              <Pill active={questionStatus === 'all'} onClick={() => setQuestionStatus('all')}>
                Todas
              </Pill>
              <Pill
                active={questionStatus === 'resolved'}
                onClick={() => setQuestionStatus('resolved')}
              >
                Resolvidas
              </Pill>
              <Pill
                active={questionStatus === 'unresolved'}
                onClick={() => setQuestionStatus('unresolved')}
              >
                Não resolvidas
              </Pill>
              <Pill
                active={questionStatus === 'correct'}
                onClick={() => setQuestionStatus('correct')}
              >
                Certas
              </Pill>
              <Pill active={questionStatus === 'wrong'} onClick={() => setQuestionStatus('wrong')}>
                Erradas
              </Pill>
              <Pill
                active={questionStatus === 'review_today'}
                onClick={() => setQuestionStatus('review_today')}
              >
                Revisar hoje
              </Pill>
            </PillRow>

            <PillRow label="Tipo">
              <Pill
                active={selectedModality === ''}
                onClick={() => setSelectedModality('')}
              >
                Qualquer
              </Pill>
              {MOD_KEYS.map((key) => (
                <Pill
                  key={key}
                  active={selectedModality === key}
                  onClick={() => setSelectedModality(key)}
                >
                  {QUESTION_MODALITY_LABELS[key]}
                </Pill>
              ))}
            </PillRow>
          </div>

          <div className="min-h-[2.5rem] flex flex-wrap items-center gap-2 px-2 py-2 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700">
            {activeFilterChips.length === 0 ? (
              <span className="text-xs text-slate-400 italic">
                Os teus filtros aparecem aqui
              </span>
            ) : (
              activeFilterChips.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 text-xs font-medium border border-blue-200 dark:border-blue-800"
                >
                  {c.label}
                  <button
                    type="button"
                    onClick={c.onRemove}
                    className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                    aria-label={`Remover ${c.label}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Nome do filtro"
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm max-w-[160px]"
              />
              <button
                type="button"
                onClick={() => {
                  const n = saveName.trim();
                  if (!n) return;
                  onSaveCurrentFilter(n);
                  setSaveName('');
                }}
                className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600"
              >
                <Save size={14} /> Salvar filtro
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClearFilters}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              >
                Limpar filtro
              </button>
              <button
                type="button"
                onClick={onApplyFilters}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm"
              >
                Filtrar questões
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-1 py-2 border-t border-slate-200 dark:border-slate-800">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          <span className="font-black text-slate-900 dark:text-white">
            {filteredQuestionCount.toLocaleString('pt-BR')}
          </span>{' '}
          questões encontradas
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <button
            type="button"
            onClick={onOpenMockSetup}
            className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            <Plus size={14} /> Gerar simulado
          </button>
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button
              type="button"
              onClick={onFontDecrease}
              className="px-2 py-1 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              title="Diminuir texto"
            >
              A−
            </button>
            <span className="text-[10px] text-slate-400 w-8 text-center">{listFontScalePercent}%</span>
            <button
              type="button"
              onClick={onFontIncrease}
              className="px-2 py-1 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              title="Aumentar texto"
            >
              A+
            </button>
          </div>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Por página
            <select
              value={listPageSize}
              onChange={(e) => setListPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs py-1 pl-2 pr-6"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'newest' | 'oldest' | 'difficulty_asc' | 'difficulty_desc')
            }
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs py-1.5 pl-2 pr-8 font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
            <option value="difficulty_asc">Dificuldade ↑</option>
            <option value="difficulty_desc">Dificuldade ↓</option>
          </select>
        </div>
      </div>
    </>
  );
};
