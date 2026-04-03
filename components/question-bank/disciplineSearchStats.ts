import { disciplineMatchesSearch } from './catalog/questionBankDisciplineCatalog';

const STORAGE_KEY = 'qb_discipline_pick_counts_v1';

type CountMap = Record<string, number>;

function readMap(): CountMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    if (p && typeof p === 'object' && !Array.isArray(p)) return p as CountMap;
  } catch {
    /* ignore */
  }
  return {};
}

function writeMap(m: CountMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

/** Incrementa quando o utilizador escolhe uma disciplina no catálogo. */
export function recordDisciplineCatalogPick(displayValue: string) {
  const v = displayValue.trim();
  if (!v) return;
  const m = readMap();
  m[v] = (m[v] ?? 0) + 1;
  writeMap(m);
}

/**
 * Top N disciplinas por contagem local, opcionalmente filtradas pela pesquisa.
 * Ordem: maior contagem primeiro; empate por locale.
 */
export function getTopDisciplinesByLocalStats(
  limit: number,
  catalogValues: Set<string>,
  query: string
): string[] {
  const m = readMap();
  const entries = Object.entries(m).filter(([k]) => catalogValues.has(k));
  const filtered = query.trim()
    ? entries.filter(([k]) => disciplineMatchesSearch(k, query))
    : entries;
  filtered.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0], 'pt');
  });
  return filtered.slice(0, limit).map(([k]) => k);
}
