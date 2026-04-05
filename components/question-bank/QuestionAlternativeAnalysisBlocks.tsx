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
      <ul className="m-0 list-none space-y-2 p-0" aria-labelledby={headingId}>
        {analysis.map((alt, idx) => (
          <li key={`${alt.alternative}-${idx}`}>
            <div
              className={`rounded-xl border p-4 ${
                alt.status === 'Correta'
                  ? 'border-green-100 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10'
                  : 'border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10'
              }`}
              role="group"
              aria-label={`Alternativa ${alt.alternative}, ${alt.status === 'Correta' ? 'correta' : 'incorreta'}. ${alt.explanation}`}
            >
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
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
      className="text-sm leading-relaxed text-slate-600 dark:text-slate-400"
      role="region"
      aria-label="Análise das alternativas"
    >
      {formatAlternativesAnalysisPlain(analysis)}
    </p>
  );
}
