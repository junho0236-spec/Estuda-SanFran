import React from 'react';
import type { Question } from '../../types';
import { QuestionBankListView } from './QuestionBankListView';
import type { QuestionBankListViewProps } from './QuestionBankListView';
import { QuestionBankSingleQuestionView } from './QuestionBankSingleQuestionView';
import type { QuestionBankSingleQuestionViewProps } from './QuestionBankSingleQuestionView';
import { QuestionBankEmptyQuestions } from './QuestionBankEmptyQuestions';
import { QuestionBankReadingScaleProvider } from './QuestionBankReadingScaleContext';

export type QuestionBankQuestionAreaProps = {
  resultsSectionRef: React.RefObject<HTMLDivElement | null>;
  listFontScalePercent: number;
  /** 0–100: semi-transparent dark overlay on the reading/results zone only. */
  readingDimPct: number;
  /** 0–100: warm tint overlay on the same zone. */
  readingWarmPct: number;
  /** OS reduced-motion preference and/or “Menos animações” in the toolbar. */
  readingReduceHeavyMotion: boolean;
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
  readingDimPct,
  readingWarmPct,
  readingReduceHeavyMotion,
  showQuestionChrome,
  viewMode,
  listViewProps,
  singleViewProps,
  singleCurrentQuestion,
  emptyTotalQuestionsInDb,
  onOpenAiGenerator,
}: QuestionBankQuestionAreaProps) {
  const dim = Math.min(100, Math.max(0, readingDimPct)) / 100;
  const warm = Math.min(100, Math.max(0, readingWarmPct)) / 100;

  return (
    <div key="question-area-container" className="w-full min-w-0" ref={resultsSectionRef}>
      <QuestionBankReadingScaleProvider
        percent={listFontScalePercent}
        reduceHeavyMotion={readingReduceHeavyMotion}
      >
        <div
          className={`qb-reading-zone qb-visual-comfort flex-1 min-w-0 relative ${
            readingReduceHeavyMotion ? 'qb-reading-zone--reduce-motion' : ''
          }`}
          style={
            {
              ['--qb-dim' as string]: String(dim),
              ['--qb-warm' as string]: String(warm),
            } as React.CSSProperties
          }
        >
          <div className="relative z-0 min-w-0">
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
          <div
            className="qb-comfort-overlay qb-comfort-overlay--warm pointer-events-none"
            aria-hidden
          />
          <div
            className="qb-comfort-overlay qb-comfort-overlay--dim pointer-events-none"
            aria-hidden
          />
        </div>
      </QuestionBankReadingScaleProvider>
    </div>
  );
}
