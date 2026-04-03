import { OUTRAS_DISCIPLINES } from './outrasDisciplines';
import { SANFRAN_DISCIPLINES } from './sanfranDisciplines';

export { OUTRAS_DISCIPLINES, SANFRAN_DISCIPLINES };

/** Todos os valores válidos no filtro / IA (sem duplicar referência). */
export const ALL_CATALOG_DISCIPLINE_VALUES: readonly string[] = [
  ...SANFRAN_DISCIPLINES,
  ...OUTRAS_DISCIPLINES,
];

export function extractDisciplineCodes(line: string): string[] {
  const alpha = line.match(/\b[A-Z]{3}\d{4}\b/g) ?? [];
  const numeric = line.match(/\b\d{7}\b/g) ?? [];
  return Array.from(new Set([...alpha, ...numeric]));
}

function fold(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/** Nome completo + códigos (SanFran); só nome (Outras). */
export function disciplineMatchesSearch(displayLabel: string, q: string): boolean {
  const t = q.trim();
  if (!t) return true;
  const f = fold(t);
  if (fold(displayLabel).includes(f)) return true;
  for (const c of extractDisciplineCodes(displayLabel)) {
    if (fold(c).includes(f) || c.toLowerCase().includes(t.toLowerCase())) return true;
  }
  return false;
}
