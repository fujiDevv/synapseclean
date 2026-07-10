import { describe, expect, it } from 'vitest';
import { isProbeableTabUrl, orderProbeTabs } from '../src/gemini-probe';

describe('gemini-probe', () => {
  it('accepts only http and https tabs', () => {
    expect(isProbeableTabUrl('https://example.com/article')).toBe(true);
    expect(isProbeableTabUrl('http://localhost:5173/')).toBe(true);
    expect(isProbeableTabUrl('chrome-extension://abc/options/options.html')).toBe(false);
    expect(isProbeableTabUrl('chrome://flags/#prompt-api-for-gemini-nano')).toBe(false);
    expect(isProbeableTabUrl(undefined)).toBe(false);
  });

  it('prefers active probeable tabs over background tabs', () => {
    const ordered = orderProbeTabs(
      [
        { id: 1, url: 'https://docs.example.com', active: false },
        { id: 2, url: 'chrome-extension://abc/options/options.html', active: true },
        { id: 3, url: 'https://news.example.com', active: true },
        { id: 4, url: 'https://blog.example.com', active: false },
      ]
    );

    expect(ordered.map((tab) => tab.id)).toEqual([3, 1, 4]);
  });
});