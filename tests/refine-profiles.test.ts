import { describe, expect, it } from 'vitest';
import { buildRefinePrompts, validateUserPromptTemplate } from '../src/refine-profiles';
import { DEFAULT_SETTINGS } from '../src/constants';

describe('refine profiles', () => {
  it('builds prompts with required placeholders resolved', () => {
    const { systemPrompt, userPrompt } = buildRefinePrompts(
      DEFAULT_SETTINGS,
      'Sample body text',
      { sourceTitle: 'Example', sourceUrl: 'https://example.com' }
    );

    expect(systemPrompt).toContain('SynapseClean');
    expect(userPrompt).toContain('Sample body text');
    expect(userPrompt).toContain('Example');
    expect(userPrompt).toContain('https://example.com');
    expect(userPrompt).not.toContain('{{text}}');
  });

  it('uses custom prompts in custom mode', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      refineMode: 'custom' as const,
      customSystemPrompt: 'CUSTOM SYSTEM',
      customUserPromptTemplate: 'CUSTOM USER {{text}}',
    };

    const { systemPrompt, userPrompt } = buildRefinePrompts(settings, 'payload', {});
    expect(systemPrompt).toBe('CUSTOM SYSTEM');
    expect(userPrompt).toBe('CUSTOM USER payload');
  });

  it('validates user prompt template', () => {
    expect(validateUserPromptTemplate('')).toMatch(/empty/i);
    expect(validateUserPromptTemplate('no placeholder')).toMatch(/{{text}}/i);
    expect(validateUserPromptTemplate('ok {{text}}')).toBeNull();
  });
});