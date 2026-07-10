import { describe, expect, it } from 'vitest';
import { splitTextIntoChunks } from '../src/gemini-chunking';

describe('splitTextIntoChunks', () => {
  it('returns a single chunk for short text', () => {
    expect(splitTextIntoChunks('short text')).toEqual(['short text']);
  });

  it('splits long text into multiple chunks', () => {
    const long = `${'# Section\n\n'.repeat(20)}${'paragraph '.repeat(3000)}`;
    const chunks = splitTextIntoChunks(long, 1000, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('').length).toBeGreaterThan(1000);
  });
});