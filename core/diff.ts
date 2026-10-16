import { normalizeAnswer } from './game';

export interface DiffChar {
  char: string;
  match: boolean;
  missing?: boolean;
  extra?: boolean;
}

export function alignAttempt(attempt: string, target: string): DiffChar[] {
  const a = Array.from(normalizeAnswer(attempt)).slice(0, 200);
  const b = Array.from(normalizeAnswer(target)).slice(0, 200);
  const d = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1])
      );
    }
  }

  const result: DiffChar[] = [];
  let i = a.length;
  let j = b.length;

  while (i || j) {
    if (i && j && d[i][j] === d[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1])) {
      result.push({ char: a[i - 1], match: a[i - 1] === b[j - 1] });
      i--;
      j--;
    } else if (j && d[i][j] === d[i][j - 1] + 1) {
      result.push({ char: '\uFF3F', match: false, missing: true });
      j--;
    } else {
      result.push({ char: a[i - 1], match: false, extra: true });
      i--;
    }
  }

  return result.reverse();
}