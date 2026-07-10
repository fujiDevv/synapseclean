import { describe, expect, it } from 'vitest';
import { buildBoilerplateTemplate } from '../src/templates';

describe('buildBoilerplateTemplate', () => {
  it('wraps cleaned text in an AI-ready scaffold', () => {
    const output = buildBoilerplateTemplate('# Title\n\nBody paragraph with enough length to qualify.', {
      sourceTitle: 'Landing Page',
      sourceUrl: 'https://example.com/page',
    });

    expect(output).toContain('# Landing Page');
    expect(output).toContain('https://example.com/page');
    expect(output).toContain('## Source Content');
    expect(output).toContain('Body paragraph');
    expect(output).toContain('## Instructions for the AI');
  });
});