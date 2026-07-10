import { getRefineProfile } from './refine-profiles';
import type { RefinePreset } from './types';

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return 0;

  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  const distance = dp[m][n];
  return 1 - distance / Math.max(m, n);
}

function containsSchemaHeadings(output: string, preset: RefinePreset): boolean {
  const schema = getRefineProfile(preset).schemaPreview.toLowerCase();
  const headings = schema
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .filter(Boolean);
  const lower = output.toLowerCase();
  return headings.some((heading) => lower.includes(heading.toLowerCase()));
}

export function shouldAcceptGeminiUpgrade(
  prepared: string,
  refined: string,
  preset: RefinePreset
): boolean {
  if (!refined || refined.trim().length < 50) return false;
  if (refined.trim() === prepared.trim()) return false;

  if (refined.length >= prepared.length * 0.5) return true;
  if (containsSchemaHeadings(refined, preset)) return true;
  if (levenshteinRatio(prepared.slice(0, 2000), refined.slice(0, 2000)) < 0.92) return true;

  return refined.length >= 200;
}