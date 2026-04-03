import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronUp, Eye } from 'lucide-react';

export type SearchableDropdownOption = { value: string; label: string };

function fold(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function matchesQuery(label: string, q: string) {
  if (!q.trim()) return true;
  return fold(label).includes(fold(q.trim()));
}

export type SearchableFilterDropdownProps = {
  /** Rótulo no cabeçalho azul (ex.: Disciplina) */
  label: string;
  /** Texto do trigger quando `value` está vazio */
  emptyLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableDropdownOption[];
  disabled?: boolean;
  /** Valores (iguais a `option.value`) mostrados em "Mais buscadas", nesta ordem */
  featuredValues?: readonly string[];
  className?: string;
  /** Inclui a primeira linha com value "" para limpar o filtro */
  clearable?: boolean;
  /** Rótulo da linha de limpar (ex.: "Todas as disciplinas") */
  clearLabel?: string;
  /** Evita corte dentro de modais com overflow (painel em `position: fixed` + portal) */
  useFixedPortal?: boolean;
};

export function SearchableFilterDropdown({
  label,
  emptyLabel,
  value,
  onChange,
  options,
  disabled,
  featuredValues,
  className = '',
  clearable = true,
  clearLabel,
  useFixedPortal = false,
}: SearchableFilterDropdownProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [portalBox, setPortalBox] = useState<{ top: number; left: number; width: number } | null>(null);

  const selectedLabel = useMemo(() => {
    if (!value) return emptyLabel;
    const o = options.find((x) => x.value === value);
    return o?.label ?? value;
  }, [value, options, emptyLabel]);

  const filtered = useMemo(() => options.filter((o) => matchesQuery(o.label, query)), [options, query]);

  const featuredRows = useMemo(() => {
    if (!featuredValues?.length) return [] as SearchableDropdownOption[];
    const out: SearchableDropdownOption[] = [];
    for (const fv of featuredValues) {
      const o = filtered.find((x) => x.value === fv);
      if (o) out.push(o);
    }
    return out;
  }, [filtered, featuredValues]);

  const restRows = useMemo(() => {
    if (!featuredValues?.length) {
      return [...filtered].sort((a, b) => a.label.localeCompare(b.label, 'pt'));
    }
    const fset = new Set(featuredRows.map((x) => x.value));
    return filtered
      .filter((o) => !fset.has(o.value))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt'));
  }, [filtered, featuredValues, featuredRows]);

  useLayoutEffect(() => {
    if (!open || !useFixedPortal || !triggerRef.current) {
      setPortalBox(null);
      return;
    }
    const el = triggerRef.current;
    const update = () => {
      const r = el.getBoundingClientRect();
      setPortalBox({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
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
      if (listRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const pick = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
      setQuery('');
    },
    [onChange]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const showFeatured = (featuredValues?.length ?? 0) > 0 && featuredRows.length > 0;

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        id={`${id}-trigger`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        title={value ? selectedLabel : undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex h-10 w-full min-h-10 max-h-10 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 shadow-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
      >
        <span
          className={`min-w-0 flex-1 truncate text-left ${!value ? 'text-slate-500 dark:text-slate-400' : ''}`}
        >
          {selectedLabel}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        )}
      </button>

      {open &&
        (!useFixedPortal || portalBox) &&
        (() => {
          const panel = (
            <div
              ref={listRef}
              id={`${id}-listbox`}
              role="listbox"
              style={
                useFixedPortal && portalBox
                  ? {
                      position: 'fixed',
                      top: portalBox.top,
                      left: portalBox.left,
                      width: portalBox.width,
                      zIndex: 9999,
                    }
                  : undefined
              }
              className={
                useFixedPortal && portalBox
                  ? 'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900'
                  : 'absolute left-0 right-0 z-[80] mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900'
              }
            >
              <div className="flex items-center justify-between bg-[#1e3a8a] px-3 py-2 text-white dark:bg-blue-950">
                <span className="text-sm font-bold tracking-tight">{label}</span>
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
                  aria-label={`Pesquisar em ${label}`}
                />
              </div>

              <div className="max-h-56 overflow-y-auto overscroll-contain">
                {clearable && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === ''}
                    onClick={() => pick('')}
                    className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/80"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-slate-600 ${
                        value === '' ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-600' : ''
                      }`}
                    >
                      {value === '' ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">{clearLabel ?? emptyLabel}</span>
                  </button>
                )}

                {showFeatured && (
                  <>
                    <div className="flex items-center justify-between bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#1e3a8a] dark:bg-slate-800 dark:text-blue-200">
                      <span>Mais buscadas</span>
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    {featuredRows.map((o) => (
                      <button
                        key={`f-${o.value}`}
                        type="button"
                        role="option"
                        aria-selected={value === o.value}
                        onClick={() => pick(o.value)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1e3a8a] hover:bg-blue-50 dark:text-blue-100 dark:hover:bg-slate-800/80"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-slate-600 ${
                            value === o.value ? 'border-blue-600 bg-blue-600 text-white' : ''
                          }`}
                        >
                          {value === o.value ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="truncate">{o.label}</span>
                      </button>
                    ))}
                  </>
                )}

                {restRows.length > 0 && (
                  <>
                    {showFeatured && (
                      <div className="border-t border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                        Todas
                      </div>
                    )}
                    {restRows.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        role="option"
                        aria-selected={value === o.value}
                        onClick={() => pick(o.value)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1e3a8a] hover:bg-blue-50 dark:text-blue-100 dark:hover:bg-slate-800/80"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-slate-600 ${
                            value === o.value ? 'border-blue-600 bg-blue-600 text-white' : ''
                          }`}
                        >
                          {value === o.value ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="truncate">{o.label}</span>
                      </button>
                    ))}
                  </>
                )}

                {filtered.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-slate-500">Nenhum resultado.</p>
                )}
              </div>
            </div>
          );

          if (useFixedPortal && portalBox && typeof document !== 'undefined') {
            return createPortal(panel, document.body);
          }
          return panel;
        })()}
    </div>
  );
}

export function toOptions(strings: string[]): SearchableDropdownOption[] {
  return strings.map((s) => ({ value: s, label: s }));
}
