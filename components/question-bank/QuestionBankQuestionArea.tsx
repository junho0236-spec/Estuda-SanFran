import React from 'react';
import type { Question } from '../../types';
import { QuestionBankListView } from './QuestionBankListView';
import type { QuestionBankListViewProps } from './QuestionBankListView';
import { QuestionBankSingleQuestionView } from './QuestionBankSingleQuestionView';
import type { QuestionBankSingleQuestionViewProps } from './QuestionBankSingleQuestionView';
import { QuestionBankEmptyQuestions } from './QuestionBankEmptyQuestions';

export type QuestionBankQuestionAreaProps = {
  resultsSectionRef: React.RefObject<HTMLDivElement | null>;
  listFontScalePercent: number;
  showQuestionChrome: boolean;
  viewMode: 'list' | 'single';
  listViewProps: QuestionBankListViewProps;
  singleViewProps: Omit<QuestionBankSingleQuestionViewProps, 'currentQuestion'>;
  singleCurrentQuestion: Question | undefined;
  emptyTotalQuestionsInDb: number;
  onOpenAiGenerator: () => void;
};

export function QuestionBankQuestionArea({
  resultsSectionRef,
  listFontScalePercent,
  showQuestionChrome,
  viewMode,
  listViewProps,
  singleViewProps,
  singleCurrentQuestion,
  emptyTotalQuestionsInDb,
  onOpenAiGenerator,
}: QuestionBankQuestionAreaProps) {
  return (
    <div key="question-area-container" className="w-full" ref={resultsSectionRef}>
      <div className="flex-1" style={{ fontSize: `${listFontScalePercent}%` }}>
        {showQuestionChrome ? (
          viewMode === 'list' ? (
            <QuestionBankListView {...listViewProps} />
          ) : singleCurrentQuestion ? (
            <QuestionBankSingleQuestionView
              {...singleViewProps}
              currentQuestion={singleCurrentQuestion}
            />
          ) : null
        ) : (
          <QuestionBankEmptyQuestions
            totalQuestionsInDb={emptyTotalQuestionsInDb}
            onOpenAiGenerator={onOpenAiGenerator}
          />
        )}
      </div>
    </div>
  );
}
