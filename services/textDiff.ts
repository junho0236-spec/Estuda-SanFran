export type DiffLine = { type: 'same' | 'add' | 'remove'; text: string };

/** Diff simples por linhas (adequado para comparar texto extraído de documentos). */
export function diffLines(a: string, b: string): DiffLine[] {
  const A = a.replace(/\r\n/g, '\n').split('\n');
  const B = b.replace(/\r\n/g, '\n').split('\n');
  const m = A.length;
  const n = B.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] =
        A[i] === B[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && A[i] === B[j]) {
      out.push({ type: 'same', text: A[i] });
      i++;
      j++;
    } else if (j < n && (i === m || dp[i][j + 1] >= dp[i + 1][j])) {
      out.push({ type: 'add', text: B[j] });
      j++;
    } else if (i < m) {
      out.push({ type: 'remove', text: A[i] });
      i++;
    } else {
      break;
    }
  }
  return out;
}
