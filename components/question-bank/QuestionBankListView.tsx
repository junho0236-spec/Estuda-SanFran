import React from 'react';
import type { Question } from '../../types';
import {
  QuestionBankListQuestionCard,
  type QuestionBankListQuestionCardProps,
} from './QuestionBankListQuestionCard';
import { QuestionBankListPagination } from './QuestionBankListPagination';

export type QuestionBankListViewProps = Omit<
  QuestionBankListQuestionCardProps,
  'question' | 'globalIndex'
> & {
  pagedQuestions: Question[];
  listPage: number;
  listPageSize: number;
  filteredQuestionCount: number;
  onPrevListPage: () => void;
  onNextListPage: () => void;
};

export function QuestionBankListView({
  pagedQuestions,
  listPage,
  listPageSize,
  filteredQuestionCount,
  onPrevListPage,
  onNextListPage,
  ...cardProps
}: QuestionBankListViewProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-8">
        {pagedQuestions.map((q, idx) => (
          <QuestionBankListQuestionCard
            key={q.id}
            question={q}
            globalIndex={(listPage - 1) * listPageSize + idx}
            {...cardProps}
          />
        ))}
      </div>
      <QuestionBankListPagination
        filteredCount={filteredQuestionCount}
        listPageSize={listPageSize}
        listPage={listPage}
        onPrevPage={onPrevListPage}
        onNextPage={onNextListPage}
      />
    </>
  );
}
