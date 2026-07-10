import { describe, expect, it } from 'vitest';
import { computeReduction, ruleBasedCompact } from '../src/compactor';

const SUBSTANTIVE =
  'Distributed systems rely on consensus protocols, replication, and fault tolerance to stay available when nodes fail or networks partition unexpectedly.';

const MESSY_ARTICLE = `
Home
Privacy
FAQ
Accept all cookies

# Architecture Overview

${SUBSTANTIVE}

Subscribe to our newsletter

${SUBSTANTIVE}

Share on Twitter
All rights reserved
`.trim();

const DEVTO_WITH_COMMENTS = `
# LuciferCore: The Redemption Arc

${SUBSTANTIVE}

## Cold, Hard Data: The Benchmarks

Static Files: ~160,000 req/s.

Top comments (10)

Subscribe
Add to the discussion

thuangf45 profile image
Thuangf45
• Jul 3

Solid numbers. Gen2: 0 across a 60s run.

5 likes
Like
Reply
`.trim();

describe('ruleBasedCompact core', () => {
  it('strips navigation and boilerplate lines', () => {
    const compacted = ruleBasedCompact(MESSY_ARTICLE);
    expect(compacted).toContain('Architecture Overview');
    expect(compacted).toContain('consensus protocols');
    expect(compacted.toLowerCase()).not.toContain('accept all cookies');
    expect(compacted.toLowerCase()).not.toContain('subscribe to our newsletter');
    expect(compacted.toLowerCase()).not.toContain('share on twitter');
  });

  it('deduplicates repeated paragraphs', () => {
    const compacted = ruleBasedCompact(MESSY_ARTICLE);
    const matches = compacted.match(/consensus protocols/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('returns shorter output than the source', () => {
    const compacted = ruleBasedCompact(MESSY_ARTICLE);
    expect(compacted.length).toBeLessThan(MESSY_ARTICLE.length);
  });

  it('supports bullets output format', () => {
    const compacted = ruleBasedCompact(MESSY_ARTICLE, 'bullets');
    expect(compacted.split('\n').some((line) => line.startsWith('- '))).toBe(true);
  });

  it('supports outline output format', () => {
    const compacted = ruleBasedCompact(MESSY_ARTICLE, 'outline');
    expect(compacted.split('\n').some((line) => /^#{1,2}\s/.test(line))).toBe(true);
  });

  it('strips Dev.to comment sections', () => {
    const compacted = ruleBasedCompact(DEVTO_WITH_COMMENTS);
    expect(compacted).toContain('LuciferCore');
    expect(compacted).toContain('160,000');
    expect(compacted).not.toMatch(/top comments/i);
    expect(compacted).not.toMatch(/add to the discussion/i);
    expect(compacted).not.toMatch(/thuangf45/i);
  });

  it('preserves more content in prepare mode than legacy', () => {
    const sections = Array.from(
      { length: 8 },
      (_, i) => `## Section ${i}\n\nUnique insight ${i}: ${SUBSTANTIVE}`
    );
    const longArticle = `# Long Article\n\n${SUBSTANTIVE}\n\n${sections.join('\n\n')}`;
    const prepared = ruleBasedCompact(longArticle, 'markdown', 'prepare');
    const legacy = ruleBasedCompact(longArticle, 'markdown', 'legacy');
    expect(prepared).toContain('Unique insight 7');
    expect((prepared.match(/## Section/g) ?? []).length).toBe(8);
    expect(prepared.length).toBeGreaterThan(legacy.length);
  });

  it('aggressively shrinks long articles in legacy mode', () => {
    const longArticle = DEVTO_WITH_COMMENTS + '\n\n' + SUBSTANTIVE.repeat(40);
    const compacted = ruleBasedCompact(longArticle, 'markdown', 'legacy');
    expect(compacted.length).toBeLessThan(longArticle.length * 0.5);
  });
});

describe('computeReduction', () => {
  it('calculates reduction metrics', () => {
    const metrics = computeReduction('1000', '400');
    expect(metrics).toEqual({
      originalLength: 4,
      compactedLength: 3,
      reductionPercent: 25,
    });
  });

  it('never returns negative reduction', () => {
    const metrics = computeReduction('short', 'much longer expanded text');
    expect(metrics.reductionPercent).toBe(0);
  });
});