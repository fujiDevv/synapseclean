import { COMPACT_YIELD_LINES, MAX_COMPACT_INPUT_CHARS } from './constants';
import type { CompactionMode, SynapseSettings } from './types';

const BOILERPLATE_PATTERNS = [
  /accept (all )?cookies?/gi,
  /subscribe to our newsletter/gi,
  /sign up for free/gi,
  /terms of (service|use)/gi,
  /all rights reserved/gi,
  /skip to (main )?content/gi,
  /share on (twitter|facebook|linkedin)/gi,
  /advertisement/gi,
  /sponsored/gi,
  /^top comments?\b/i,
  /^add to the discussion$/i,
  /^pic$/i,
  /^\d+\s+likes?$/i,
  /^like$/i,
  /^reply$/i,
  /^report$/i,
  /^share$/i,
  /^subscribe$/i,
  /profile image$/i,
  /^read more$/i,
  /^show more$/i,
  /^show less$/i,
];

const COMMENT_SECTION_MARKERS = [
  /^top comments?\b/i,
  /^#\s*discussion\b/i,
  /^comments?\s*\(\d+\)/i,
  /^add to the discussion$/i,
];

const NAV_LINE = /^(home|privacy|faq|support|donate|docs|contents|menu|search|login|sign in|sign up|pricing|blog|about|contact)$/i;
const MARKDOWN_HEADER = /^#{1,6}\s+\S/;
const MARKDOWN_LIST = /^(\s*[-*+]|\s*\d+\.)\s+\S/;
const CODE_FENCE = /^```/;
const NAV_MD_LINK = /^\[[^\]]{1,28}\]\(\/[^)]{0,48}\)$/i;
const SHORT_MD_LINK = /^\[[^\]]{1,20}\]\([^)]{0,60}\)$/;

function isStructuralLine(line: string): boolean {
  return MARKDOWN_HEADER.test(line) || CODE_FENCE.test(line);
}

function isSubstantiveListItem(line: string): boolean {
  if (!MARKDOWN_LIST.test(line)) return false;
  const text = line.replace(/^(\s*[-*+]|\s*\d+\.)\s+/, '');
  return text.length >= 48 || /\*\*|```|`/.test(text);
}

/** Drop comment threads and discussion UI that often follow articles on Dev.to, Medium, etc. */
function stripCommentsSection(text: string): string {
  const lines = text.split('\n');
  const cutIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return COMMENT_SECTION_MARKERS.some((pattern) => pattern.test(trimmed));
  });
  if (cutIndex === -1) return text;
  return lines.slice(0, cutIndex).join('\n').trim();
}

function normalizeInput(text: string): string {
  let cleaned = stripCommentsSection(text)
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u200b\u200c\u200d\ufeff]+/g, ' ')
    .trim();

  if (cleaned.length > MAX_COMPACT_INPUT_CHARS) {
    cleaned = `${cleaned.slice(0, MAX_COMPACT_INPUT_CHARS)}\n\n[truncated — selection exceeded ${MAX_COMPACT_INPUT_CHARS.toLocaleString()} chars]`;
  }
  return cleaned;
}

function shouldKeepLine(line: string): boolean {
  if (line.length < 3) return false;
  if (MARKDOWN_HEADER.test(line)) return true;
  if (CODE_FENCE.test(line)) return true;
  if (NAV_LINE.test(line.replace(/[#*`[\]()]/g, '').trim())) return false;
  if (NAV_MD_LINK.test(line)) return false;
  if (SHORT_MD_LINK.test(line) && line.length < 45) return false;
  if (MARKDOWN_LIST.test(line)) return isSubstantiveListItem(line);
  if (BOILERPLATE_PATTERNS.some((p) => p.test(line))) return false;
  if (/^https?:\/\//i.test(line) && line.length < 80) return false;
  return true;
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (MARKDOWN_HEADER.test(line) || CODE_FENCE.test(line)) {
      out.push(line);
      continue;
    }
    const key = line.toLowerCase().replace(/\s+/g, ' ').slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

type Section = { heading: string | null; lines: string[] };

function parseSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, lines: [] };

  for (const line of lines) {
    if (MARKDOWN_HEADER.test(line)) {
      if (current.heading || current.lines.length) sections.push(current);
      current = { heading: line, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.heading || current.lines.length) sections.push(current);
  return sections;
}

function isTocSection(section: Section): boolean {
  const lines = section.lines;
  if (lines.length < 4) return false;
  const shortBullets = lines.filter((l) => MARKDOWN_LIST.test(l) && l.length < 72).length;
  const heading = section.heading?.toLowerCase() ?? '';
  if (heading.includes('contents') || heading.includes('table of contents')) return true;
  return shortBullets / lines.length > 0.7;
}

function isNavSection(section: Section): boolean {
  const joined = [section.heading, ...section.lines].filter(Boolean).join('\n');
  const navLinks = (joined.match(/\[[^\]]+\]\(\/[^)]*\)/g) ?? []).length;
  return navLinks >= 3;
}

function trimToBudget(text: string, budget: number): string {
  if (text.length <= budget) return text;
  const slice = text.slice(0, budget);
  const breakAt = Math.max(
    slice.lastIndexOf('\n\n'),
    slice.lastIndexOf('\n'),
    slice.lastIndexOf('. ')
  );
  if (breakAt > budget * 0.55) return `${slice.slice(0, breakAt).trim()}\n\n[…]`;
  return `${slice.trim()}…`;
}

function outputCharBudget(inputLength: number): number {
  return Math.min(6_000, Math.max(900, Math.floor(inputLength * 0.12)));
}

function formatMarkdownOutput(lines: string[], inputLength: number, mode: CompactionMode): string {
  const sections = parseSections(lines).filter((s) => !isTocSection(s) && !isNavSection(s));

  if (mode === 'prepare') {
    if (!sections.length) return lines.join('\n').trim();

    return sections
      .map((section) => {
        const parts: string[] = [];
        if (section.heading) parts.push(section.heading);
        const body = section.lines.filter((l) => shouldKeepLine(l) || CODE_FENCE.test(l));
        if (body.length) parts.push(body.join('\n'));
        return parts.join('\n\n').trim();
      })
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }

  const budget = outputCharBudget(inputLength);
  if (!sections.length) {
    return trimToBudget(lines.join('\n'), budget);
  }

  const out: string[] = [];
  let used = 0;

  for (const section of sections) {
    if (used >= budget) break;

    const parts: string[] = [];
    if (section.heading) parts.push(section.heading);

    const body = section.lines.filter((l) => shouldKeepLine(l) || CODE_FENCE.test(l));
    if (body.length) parts.push(body.join('\n'));

    let chunk = parts.join('\n\n').trim();
    if (!chunk) continue;

    const remaining = budget - used;
    if (chunk.length > remaining) chunk = trimToBudget(chunk, remaining);
    if (!chunk) break;

    out.push(chunk);
    used += chunk.length + 2;
  }

  return out.join('\n\n').trim() || trimToBudget(lines.join('\n'), budget);
}

function applyOutputFormat(
  lines: string[],
  format: SynapseSettings['outputFormat'],
  inputLength: number,
  mode: CompactionMode
): string {
  const bulletLimit = mode === 'prepare' ? 500 : 80;
  const outlineLimit = mode === 'prepare' ? 300 : 48;
  const outlineLineCap = mode === 'prepare' ? 500 : 140;

  if (format === 'bullets') {
    return lines
      .filter((l) => shouldKeepLine(l) || MARKDOWN_HEADER.test(l))
      .map((l) => {
        if (MARKDOWN_LIST.test(l) || l.startsWith('- ')) return l;
        if (MARKDOWN_HEADER.test(l)) return l;
        return `- ${l.replace(/^[-*]\s*/, '')}`;
      })
      .slice(0, bulletLimit)
      .join('\n');
  }

  if (format === 'outline') {
    return lines
      .filter((l) => shouldKeepLine(l) || MARKDOWN_HEADER.test(l))
      .slice(0, outlineLimit)
      .map((l, i) => {
        if (MARKDOWN_HEADER.test(l)) return l;
        const prefix = i < 4 ? '#' : '##';
        return `${prefix} ${l.replace(/^[-*#.\d\s]+/, '').slice(0, outlineLineCap)}`;
      })
      .join('\n');
  }

  return formatMarkdownOutput(lines, inputLength, mode);
}

export function ruleBasedCompact(
  text: string,
  format: SynapseSettings['outputFormat'] = 'markdown',
  mode: CompactionMode = 'prepare'
): string {
  const cleaned = normalizeInput(text);
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
  const filtered = lines.filter(shouldKeepLine);
  const deduped = dedupeLines(filtered);
  return applyOutputFormat(deduped, format, cleaned.length, mode);
}

const yieldToMain = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

/** Non-blocking rule compaction — yields every N lines so large selections stay smooth. */
export async function ruleBasedCompactAsync(
  text: string,
  format: SynapseSettings['outputFormat'] = 'markdown',
  mode: CompactionMode = 'prepare'
): Promise<string> {
  const cleaned = normalizeInput(text);
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
  const filtered: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (shouldKeepLine(line)) filtered.push(line);
    if (i > 0 && i % COMPACT_YIELD_LINES === 0) await yieldToMain();
  }

  const deduped = dedupeLines(filtered);
  return applyOutputFormat(deduped, format, cleaned.length, mode);
}

export function computeReduction(original: string, compacted: string) {
  const originalLength = original.length;
  const compactedLength = compacted.length;
  const reductionPercent = originalLength > 0
    ? Math.max(0, Math.round((1 - compactedLength / originalLength) * 100))
    : 0;
  return { originalLength, compactedLength, reductionPercent };
}