import React from 'react';
import { useQuestionBankReadingScalePercent } from './QuestionBankReadingScaleContext';

type QuestionBankReadingShellProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Zona de leitura ampliada: aplica font-size % e --qb-scale só ao miolo (enunciado, alternativas, gabarito).
 */
export function QuestionBankReadingShell({ children, className = '' }: QuestionBankReadingShellProps) {
  const percent = useQuestionBankReadingScalePercent();
  const scale = percent / 100;
  return (
    <div
      className={`qb-reading min-w-0 w-full max-w-[min(100%,70ch)] mx-auto ${className}`.trim()}
      style={{
        fontSize: `${percent}%`,
        ['--qb-scale' as string]: String(scale),
      }}
    >
      {children}
    </div>
  );
}
