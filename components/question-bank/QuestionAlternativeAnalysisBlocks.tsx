import React from 'react';
import {
  formatAlternativesAnalysisPlain,
  isAlternativesAnalysisArray,
  type AiCorrectionAlternativesAnalysis,
} from '../../types';

export function QuestionAlternativeAnalysisBlocks({
  analysis,
  headingId,
}: {
  analysis: AiCorrectionAlternativesAnalysis | undefined;
  headingId: string;
}) {
  if (analysis == null || analysis === '') return null;
  if (isAlternativesAnalysisArray(analysis)) {
    return (
      <ul className="m-0 list-none p-0 flex flex-col qb-reading-alt-list" aria-labelledby={headingId}>
        {analysis.map((alt, idx) => (
          <li key={`${alt.alternative}-${idx}`}>
            <div
              className={`rounded-xl border qb-reading-surface-md ${
                alt.status === 'Correta'
                  ? 'border-green-100 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10'
                  : 'border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10'
              }`}
              role="group"
              aria-label={`Alternativa ${alt.alternative}, ${alt.status === 'Correta' ? 'correta' : 'incorreta'}. ${alt.explanation}`}
            >
              <p className="qb-reading-alt-analysis-lead text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
                <span className="font-black uppercase">
                  [{alt.alternative}] {alt.status}:
                </span>{' '}
                {alt.explanation}
              </p>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p
      className="qb-reading-alt-analysis-lead text-sm leading-relaxed text-slate-600 dark:text-slate-400"
      role="region"
      aria-label="Análise das alternativas"
    >
      {formatAlternativesAnalysisPlain(analysis)}
    </p>
  );
}
