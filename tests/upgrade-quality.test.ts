import { describe, expect, it } from 'vitest';
import { shouldAcceptGeminiUpgrade } from '../src/upgrade-quality';

describe('shouldAcceptGeminiUpgrade', () => {
  it('rejects very short or identical output', () => {
    expect(shouldAcceptGeminiUpgrade('prepared text', 'short', 'ai-prompt')).toBe(false);
    expect(shouldAcceptGeminiUpgrade('same', 'same', 'ai-prompt')).toBe(false);
  });

  it('accepts structured output with schema headings', () => {
    const prepared = 'noisy landing page copy';
    const refined = `# Task\n## Context\n## Source material\n${'detail '.repeat(40)}`;
    expect(shouldAcceptGeminiUpgrade(prepared, refined, 'ai-prompt')).toBe(true);
  });
});