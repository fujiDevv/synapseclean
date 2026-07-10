import { describe, expect, it } from 'vitest';
import { isGeminiCompactionReady } from '../src/gemini-ready';

describe('isGeminiCompactionReady', () => {
  it('only allows available state', () => {
    expect(isGeminiCompactionReady('available')).toBe(true);
    expect(isGeminiCompactionReady('downloadable')).toBe(false);
    expect(isGeminiCompactionReady('downloading')).toBe(false);
    expect(isGeminiCompactionReady('unavailable')).toBe(false);
    expect(isGeminiCompactionReady('unknown')).toBe(false);
  });
});