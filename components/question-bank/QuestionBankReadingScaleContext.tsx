import React, { createContext, useContext, useMemo } from 'react';

export type QuestionBankReadingUiContextValue = {
  percent: number;
  reduceHeavyMotion: boolean;
};

const defaultReadingUi: QuestionBankReadingUiContextValue = {
  percent: 100,
  reduceHeavyMotion: false,
};

const QuestionBankReadingScaleContext = createContext<QuestionBankReadingUiContextValue>(defaultReadingUi);

export function QuestionBankReadingScaleProvider({
  percent,
  reduceHeavyMotion = false,
  children,
}: {
  percent: number;
  reduceHeavyMotion?: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ percent, reduceHeavyMotion }),
    [percent, reduceHeavyMotion]
  );
  return (
    <QuestionBankReadingScaleContext.Provider value={value}>
      {children}
    </QuestionBankReadingScaleContext.Provider>
  );
}

/** Percent (85–250) chosen in the question bank toolbar; 100 when outside the provider. */
export function useQuestionBankReadingScalePercent(): number {
  return useContext(QuestionBankReadingScaleContext).percent;
}

/** True when OS prefers reduced motion and/or the user enabled “Menos animações”. */
export function useQuestionBankReadingReduceHeavyMotion(): boolean {
  return useContext(QuestionBankReadingScaleContext).reduceHeavyMotion;
}
