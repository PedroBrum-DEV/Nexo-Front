// Comparação linha a linha (maior subsequência comum). Textos de instruções são curtos, então é instantâneo.
export type DiffLine = { t: 'same' | 'add' | 'del'; text: string };

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n'), b = newText.split('\n');
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ t: 'same', text: a[i]! }); i++; j++; }
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) out.push({ t: 'del', text: a[i++]! });
    else out.push({ t: 'add', text: b[j++]! });
  }
  while (i < n) out.push({ t: 'del', text: a[i++]! });
  while (j < m) out.push({ t: 'add', text: b[j++]! });
  return out;
}

// Mostra só o que mudou, com uma linha de contexto; trechos iguais viram "… N linhas iguais".
export function compactDiff(lines: DiffLine[]): (DiffLine | { t: 'gap'; n: number })[] {
  const keep = lines.map(() => false);
  lines.forEach((l, i) => { if (l.t !== 'same') { keep[i] = true; if (i > 0) keep[i - 1] = true; if (i < lines.length - 1) keep[i + 1] = true; } });
  const out: (DiffLine | { t: 'gap'; n: number })[] = [];
  let gap = 0;
  lines.forEach((l, i) => { if (keep[i]) { if (gap) { out.push({ t: 'gap', n: gap }); gap = 0; } out.push(l); } else gap++; });
  if (gap) out.push({ t: 'gap', n: gap });
  return out;
}
export const diffStats = (lines: DiffLine[]) => ({ add: lines.filter((l) => l.t === 'add').length, del: lines.filter((l) => l.t === 'del').length });
