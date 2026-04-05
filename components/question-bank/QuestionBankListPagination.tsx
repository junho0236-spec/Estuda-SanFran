import React from 'react';

type Props = {
  filteredCount: number;
  listPageSize: number;
  listPage: number;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function QuestionBankListPagination({
  filteredCount,
  listPageSize,
  listPage,
  onPrevPage,
  onNextPage,
}: Props) {
  if (filteredCount <= listPageSize) return null;

  const totalPages = Math.max(1, Math.ceil(filteredCount / listPageSize));

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-4">
      <button
        type="button"
        disabled={listPage <= 1}
        onClick={onPrevPage}
        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-sm text-slate-600 dark:text-slate-400">
        Página {listPage} de {totalPages}
      </span>
      <button
        type="button"
        disabled={listPage >= totalPages}
        onClick={onNextPage}
        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold disabled:opacity-40"
      >
        Seguinte
      </button>
    </div>
  );
}
