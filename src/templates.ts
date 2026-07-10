import type { RefineMeta } from './types';

function firstSubstantiveLine(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) return line.replace(/^#{1,6}\s+/, '').slice(0, 160);
    if (line.length >= 40) return line.slice(0, 160);
  }
  return lines[0]?.slice(0, 160) ?? 'Web content captured for AI context.';
}

export function buildBoilerplateTemplate(cleanedText: string, meta: RefineMeta = {}): string {
  const title = meta.sourceTitle?.trim() || 'Captured Web Content';
  const url = meta.sourceUrl?.trim() || 'unknown';
  const summary = firstSubstantiveLine(cleanedText);

  return `# ${title}

> Source: ${url} · Captured for AI context

## Context
${summary}

## Source Content
${cleanedText.trim()}

## Instructions for the AI
Use the source content above. Preserve facts, names, numbers, and quotes. Do not invent information.`;
}