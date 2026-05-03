import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Gavel,
  GraduationCap,
  Lightbulb,
  ListOrdered,
  RefreshCw,
  Scale,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import type { Question, QuestionAiCorrection } from '../../types';
import { QuestionAlternativeAnalysisBlocks } from './QuestionAlternativeAnalysisBlocks';

function isLikelyHttpUrl(s: string): boolean {
  const t = s.trim();
  return /^https?:\/\//i.test(t);
}

export type QuestionAiCorrectionPanelProps = {
  question: Question;
  correction: QuestionAiCorrection;
  loading?: boolean;
  onRegenerate?: (question: Question) => void;
  /** 'single' = paddings maiores (modo foco); 'list' = cartão compacto */
  density?: 'single' | 'list';
  alternativesHeadingId: string;
};

function mdBlock(
  content: string | undefined,
  className: string,
  proseClass: string
): React.ReactNode {
  const t = content?.trim();
  if (!t) return null;
  return (
    <div className={className}>
      <div className={`prose prose-sm dark:prose-invert max-w-none ${proseClass}`}>
        <Markdown remarkPlugins={[remarkGfm]}>{t}</Markdown>
      </div>
    </div>
  );
}

export function QuestionAiCorrectionPanel({
  question,
  correction: ac,
  loading = false,
  onRegenerate,
  density = 'list',
  alternativesHeadingId,
}: QuestionAiCorrectionPanelProps) {
  const isSingle = density === 'single';
  const pad = isSingle ? 'p-6 rounded-[2rem]' : 'p-4 rounded-xl';
  const padWide = isSingle ? 'p-6 rounded-[2rem]' : 'p-5 rounded-2xl';
  const titleClass = isSingle
    ? 'text-[11px] uppercase tracking-widest mb-3'
    : 'text-[10px] uppercase tracking-widest mb-2';
  const concepts = ac.keyConcepts?.filter((k) => k.term?.trim() && k.explanation?.trim());
  const doctrineUrl = ac.doctrineUrl?.trim();
  const doctrineLink = ac.doctrineLink?.trim();
  const showDoctrineLink = doctrineLink && doctrineUrl && isLikelyHttpUrl(doctrineUrl);

  return (
    <div
      className={isSingle ? 'space-y-6' : 'space-y-4'}
      role="region"
      aria-label="Correção comentada pela inteligência artificial"
    >
      <div className={`flex items-center gap-3 ${isSingle ? 'mb-2' : ''}`}>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          Correção Comentada IA
        </span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      {onRegenerate ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onRegenerate(question)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden />
            Regenerar explicação
          </button>
        </div>
      ) : null}

      {ac.plainLanguageSummary?.trim() ? (
        <div>
          <h4
            className={`font-black text-slate-700 dark:text-slate-300 ${titleClass} flex items-center gap-2`}
          >
            <GraduationCap size={isSingle ? 16 : 14} aria-hidden /> O que a questão está pedindo
          </h4>
          {mdBlock(
            ac.plainLanguageSummary,
            `${pad} bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700`,
            'text-slate-800 dark:text-slate-200'
          )}
        </div>
      ) : null}

      {concepts?.length ? (
        <div className={`${pad} bg-violet-50 dark:bg-violet-900/10 border-2 border-violet-100 dark:border-violet-900/30`}>
          <h4
            className={`font-black text-violet-800 dark:text-violet-400 ${titleClass} flex items-center gap-2`}
          >
            <BookOpen size={isSingle ? 16 : 14} aria-hidden /> Conceitos-chave
          </h4>
          <dl className="m-0 space-y-3">
            {concepts.map((k) => (
              <div key={k.term}>
                <dt className="text-sm font-black text-violet-900 dark:text-violet-200">{k.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-violet-900/85 dark:text-violet-200/85 m-0 pl-0">
                  {k.explanation}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {ac.reasoningSteps?.trim() ? (
        <div>
          <h4
            className={`font-black text-sky-800 dark:text-sky-400 ${titleClass} flex items-center gap-2`}
          >
            <ListOrdered size={isSingle ? 16 : 14} aria-hidden /> Passo a passo do raciocínio
          </h4>
          {mdBlock(
            ac.reasoningSteps,
            `${pad} bg-sky-50 dark:bg-sky-900/10 border-2 border-sky-100 dark:border-sky-900/30`,
            'text-sky-900 dark:text-sky-100'
          )}
        </div>
      ) : null}

      <div
        className={
          isSingle
            ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
            : 'grid grid-cols-1 gap-3'
        }
      >
        <div
          className={`${pad} bg-indigo-50 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-900/30`}
        >
          <h4
            className={`font-black text-indigo-800 dark:text-indigo-400 ${titleClass} flex items-center gap-2`}
          >
            <BookOpen size={isSingle ? 16 : 14} aria-hidden /> Doutrina e Contexto
          </h4>
          <p
            className={`text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed ${
              isSingle ? 'text-sm' : 'text-sm'
            }`}
          >
            {ac.doctrineAndContext}
          </p>
        </div>

        <div
          className={`${padWide} bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-900/30`}
        >
          <h4
            className={`font-black text-emerald-800 dark:text-emerald-400 ${titleClass} flex items-center gap-2`}
          >
            <Scale size={isSingle ? 16 : 14} aria-hidden /> Fundamentação Legal
          </h4>
          <p
            className={`text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed ${
              isSingle ? 'text-sm font-bold' : 'text-sm font-medium'
            }`}
          >
            {ac.legalBasis}
          </p>
        </div>
      </div>

      {ac.boardTrap?.trim() ? (
        <div
          className={`${pad} bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-100 dark:border-orange-900/30 relative overflow-hidden`}
        >
          <div className="absolute -top-2 -right-2 opacity-10 rotate-12" aria-hidden>
            <ShieldAlert size={isSingle ? 72 : 48} className="text-orange-500" />
          </div>
          <h4
            className={`font-black text-orange-800 dark:text-orange-400 ${titleClass} flex items-center gap-2`}
          >
            <ShieldAlert size={isSingle ? 16 : 14} aria-hidden /> Pegadinha / foco da banca
          </h4>
          <p className="text-sm leading-relaxed text-orange-900/85 dark:text-orange-200/85 relative z-[1]">
            {ac.boardTrap.trim()}
          </p>
        </div>
      ) : null}

      {ac.nuanceNote?.trim() ? (
        <div
          className={`${pad} bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600`}
        >
          <h4
            className={`font-black text-slate-600 dark:text-slate-400 ${titleClass}`}
          >
            Ressalva / controvérsia
          </h4>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{ac.nuanceNote.trim()}</p>
        </div>
      ) : null}

      <div
        className={`${padWide} bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-900/30 relative overflow-hidden`}
      >
        <div className={`absolute ${isSingle ? '-top-2 -right-2' : 'top-0 right-0 p-2'} opacity-10`} aria-hidden>
          <Zap size={isSingle ? 80 : 40} className="rotate-12 text-amber-500" />
        </div>
        <h4
          className={`font-black text-amber-800 dark:text-amber-400 ${titleClass} flex items-center gap-2`}
        >
          <Lightbulb size={isSingle ? 16 : 14} aria-hidden /> Pulo do Gato
        </h4>
        <p
          className={`text-amber-900/80 dark:text-amber-200/80 leading-relaxed relative z-[1] ${
            isSingle ? 'text-sm font-black italic' : 'text-sm font-bold italic'
          }`}
        >
          &quot;{ac.mnemonic}&quot;
        </p>
      </div>

      {showDoctrineLink ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <a
            href={doctrineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 underline hover:text-indigo-800 dark:text-indigo-400"
          >
            {doctrineLink}
          </a>
        </p>
      ) : null}

      <div
        className={`${padWide} bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 space-y-3`}
      >
        <h4
          id={alternativesHeadingId}
          className={`font-black text-slate-700 dark:text-slate-300 ${titleClass} flex items-center gap-2`}
        >
          <Gavel size={isSingle ? 16 : 14} aria-hidden />{' '}
          {isSingle ? 'Análise Técnica das Alternativas' : 'Análise das Alternativas'}
        </h4>
        <QuestionAlternativeAnalysisBlocks
          analysis={ac.alternativesAnalysis}
          headingId={alternativesHeadingId}
        />
      </div>
    </div>
  );
}
