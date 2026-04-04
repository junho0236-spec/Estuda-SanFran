import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import {
  ALL_CATALOG_DISCIPLINE_VALUES,
  disciplineMatchesSearch,
  OUTRAS_DISCIPLINES,
  SANFRAN_DISCIPLINES,
} from './catalog/questionBankDisciplineCatalog';
import { getTopDisciplinesByLocalStats, recordDisciplineCatalogPick } from './disciplineSearchStats';

const CATALOG_SET = new Set(ALL_CATALOG_DISCIPLINE_VALUES);
const PAGE_STEP = 55;

type DisciplineFilterDropdownBase = {
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
  clearLabel?: string;
  useFixedPortal?: boolean;
};

export type DisciplineFilterDropdownProps =
  | (DisciplineFilterDropdownBase & {
      multiple?: false;
      value: string;
      onChange: (v: string) => void;
    })
  | (DisciplineFilterDropdownBase & {
      multiple: true;
      values: string[];
      onChange: (v: string[]) => void;
    });

function toggleDisciplineInList(current: string[], label: string): string[] {
  const i = current.indexOf(label);
  if (i >= 0) return current.filter((_, j) => j !== i);
  return [...current, label];
}

export function DisciplineFilterDropdown(props: DisciplineFilterDropdownProps) {
  const {
    disabled,
    className = '',
    emptyLabel = 'Disciplina',
    clearLabel = 'Todas as disciplinas',
    useFixedPortal = false,
  } = props;
  const multiple = props.multiple === true;
  const value = multiple ? '' : props.value;
  const values = multiple ? props.values : [];
  const onChangeSingle = multiple ? () => {} : props.onChange;
  const onChangeMulti = multiple ? props.onChange : (_: string[]) => {};
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelShellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [portalBox, setPortalBox] = useState<{ top: number; left: number; width: number } | null>(null);

  const [showMost, setShowMost] = useState(true);
  const [showSanfran, setShowSanfran] = useState(true);
  const [showOutras, setShowOutras] = useState(true);

  const [sanfranLimit, setSanfranLimit] = useState(PAGE_STEP);
  const [outrasLimit, setOutrasLimit] = useState(PAGE_STEP);

  const selectedLabel = multiple
    ? values.length === 0
      ? emptyLabel
      : values.length === 1
        ? values[0]
        : `${values.length} disciplinas selecionadas`
    : value || emptyLabel;

  const filteredSanfran = useMemo(() => {
    const f = SANFRAN_DISCIPLINES.filter((d) => disciplineMatchesSearch(d, query));
    return [...f].sort((a, b) => a.localeCompare(b, 'pt'));
  }, [query]);

  const filteredOutras = useMemo(() => {
    const f = OUTRAS_DISCIPLINES.filter((d) => disciplineMatchesSearch(d, query));
    return [...f].sort((a, b) => a.localeCompare(b, 'pt'));
  }, [query]);

  const mostList = useMemo(
    () => getTopDisciplinesByLocalStats(20, CATALOG_SET, query),
    [query]
  );

  useLayoutEffect(() => {
    if (!open || !useFixedPortal || !triggerRef.current) {
      setPortalBox(null);
      return;
    }
    const el = triggerRef.current;
    const update = () => {
      const r = el.getBoundingClientRect();
      setPortalBox({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 400),
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, useFixedPortal]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelShellRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSanfranLimit(PAGE_STEP);
      setOutrasLimit(PAGE_STEP);
    }
  }, [open]);

  const pick = useCallback(
    (v: string) => {
      if (multiple) return;
      if (v) recordDisciplineCatalogPick(v);
      onChangeSingle(v);
      setOpen(false);
      setQuery('');
    },
    [multiple, onChangeSingle]
  );

  const togglePick = useCallback(
    (label: string) => {
      if (!multiple) return;
      if (label && !values.includes(label)) recordDisciplineCatalogPick(label);
      onChangeMulti(toggleDisciplineInList(values, label));
    },
    [multiple, onChangeMulti, values]
  );

  const clearMulti = useCallback(() => {
    if (!multiple) return;
    onChangeMulti([]);
  }, [multiple, onChangeMulti]);

  const onListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setSanfranLimit((n) => Math.min(n + PAGE_STEP, filteredSanfran.length));
      setOutrasLimit((n) => Math.min(n + PAGE_STEP, filteredOutras.length));
    }
  }, [filteredSanfran.length, filteredOutras.length]);

  useEffect(() => {
    setSanfranLimit(PAGE_STEP);
    setOutrasLimit(PAGE_STEP);
  }, [query]);

  const sanfranSlice = filteredSanfran.slice(0, sanfranLimit);
  const outrasSlice = filteredOutras.slice(0, outrasLimit);

  const isRowSelected = (label: string) =>
    multiple ? values.includes(label) : value === label;

  const renderRow = (label: string, i: number) => (
    <button
      key={label}
      type="button"
      role="option"
      aria-selected={isRowSelected(label)}
      onClick={() => (multiple ? togglePick(label) : pick(label))}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1e3a8a] hover:bg-blue-50 dark:text-blue-100 dark:hover:bg-slate-800/80 ${
        i % 2 === 1 ? 'bg-slate-50/80 dark:bg-slate-800/40' : ''
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-slate-600 ${
          isRowSelected(label) ? 'border-blue-600 bg-blue-600 text-white' : ''
        }`}
      >
        {isRowSelected(label) ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1 break-words">{label}</span>
    </button>
  );

  const sectionHeader = (
    title: string,
    visible: boolean,
    setVis: (v: boolean) => void
  ) => (
    <div className="flex items-center justify-between border-y border-slate-200 bg-slate-100 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800/90">
      <span className="text-xs font-bold uppercase tracking-wide text-[#1e3a8a] dark:text-blue-200">{title}</span>
      <button
        type="button"
        className="rounded p-1 text-[#1e3a8a] hover:bg-white/60 dark:text-blue-200 dark:hover:bg-slate-700"
        aria-expanded={visible}
        aria-label={visible ? `Ocultar ${title}` : `Mostrar ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          setVis(!visible);
        }}
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 opacity-60" />}
      </button>
    </div>
  );

  const panelBody = (
    <>
      <div className="flex items-center justify-between bg-[#1e3a8a] px-3 py-2 text-white dark:bg-blue-950">
        <span className="text-sm font-bold tracking-tight">
          {multiple ? 'Disciplinas (várias)' : 'Disciplina'}
        </span>
        <ChevronUp className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      </div>

      <div className="border-b border-blue-200 bg-white p-2 dark:border-blue-900 dark:bg-slate-900">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar"
          className="w-full rounded-md border-2 border-blue-600 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-500 dark:bg-slate-950 dark:text-slate-100"
          autoFocus
          aria-label="Pesquisar disciplina ou código"
        />
      </div>

      <div
        ref={scrollRef}
        className="max-h-[min(70vh,420px)] overflow-y-auto overscroll-contain"
        onScroll={onListScroll}
      >
        <button
          type="button"
          role="option"
          aria-selected={multiple ? values.length === 0 : value === ''}
          onClick={() => (multiple ? clearMulti() : pick(''))}
          className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/80"
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-slate-600 ${
              multiple ? (values.length === 0 ? 'border-blue-600 bg-blue-600 text-white' : '') : value === '' ? 'border-blue-600 bg-blue-600 text-white' : ''
            }`}
          >
            {multiple ? (
              values.length === 0 ? <Check className="h-3 w-3" strokeWidth={3} /> : null
            ) : value === '' ? (
              <Check className="h-3 w-3" strokeWidth={3} />
            ) : null}
          </span>
          <span className="text-slate-600 dark:text-slate-300">{clearLabel}</span>
        </button>
        {multiple && values.length > 0 && (
          <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Clica nas disciplinas para marcar ou desmarcar. Fecha o painel ao clicar fora.
          </p>
        )}

        {sectionHeader('Mais buscadas', showMost, setShowMost)}
        {showMost && (
          <div className="border-b border-slate-200 dark:border-slate-800">
            {mostList.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                {query.trim()
                  ? 'Nenhuma disciplina frequente corresponde à pesquisa.'
                  : 'As 20 disciplinas que escolheres mais vezes aparecem aqui.'}
              </p>
            ) : (
              mostList.map((d, i) => renderRow(d, i))
            )}
          </div>
        )}

        {sectionHeader('Disciplinas da SanFran', showSanfran, setShowSanfran)}
        {showSanfran && (
          <div className="border-b border-slate-200 dark:border-slate-800">
            {filteredSanfran.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-slate-500">Nenhum resultado.</p>
            ) : (
              sanfranSlice.map((d, i) => renderRow(d, i))
            )}
            {sanfranSlice.length < filteredSanfran.length && (
              <p className="px-3 py-2 text-center text-[10px] text-slate-400">Desliza para carregar mais…</p>
            )}
          </div>
        )}

        {sectionHeader('Outras disciplinas', showOutras, setShowOutras)}
        {showOutras && (
          <div>
            {filteredOutras.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-slate-500">Nenhum resultado.</p>
            ) : (
              outrasSlice.map((d, i) => renderRow(d, i))
            )}
            {outrasSlice.length < filteredOutras.length && (
              <p className="px-3 py-2 text-center text-[10px] text-slate-400">Desliza para carregar mais…</p>
            )}
          </div>
        )}
      </div>
    </>
  );

  const panelClass =
    useFixedPortal && portalBox
      ? 'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900'
      : 'absolute left-0 right-0 z-[80] mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900';

  const panelStyle =
    useFixedPortal && portalBox
      ? {
          position: 'fixed' as const,
          top: portalBox.top,
          left: portalBox.left,
          width: portalBox.width,
          zIndex: 9999,
        }
      : undefined;

  const panel = (
    <div
      ref={panelShellRef}
      id={`${id}-panel`}
      role="listbox"
      aria-multiselectable={multiple ? true : undefined}
      className={panelClass}
      style={panelStyle}
    >
      {panelBody}
    </div>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={
          multiple
            ? values.length > 0
              ? values.join(' · ')
              : undefined
            : value
              ? selectedLabel
              : undefined
        }
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex h-10 w-full min-h-10 max-h-10 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 shadow-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <span
          className={`min-w-0 flex-1 truncate text-left ${
            multiple ? (values.length === 0 ? 'text-slate-500 dark:text-slate-400' : '') : !value ? 'text-slate-500 dark:text-slate-400' : ''
          }`}
        >
          {selectedLabel}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        )}
      </button>

      {open && (!useFixedPortal || portalBox) &&
        (useFixedPortal && portalBox && typeof document !== 'undefined'
          ? createPortal(panel, document.body)
          : panel)}
    </div>
  );
}
