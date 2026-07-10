import { compactWithGeminiNano } from './ai';
import { GEMINI_CHUNK_OVERLAP, GEMINI_CHUNK_SIZE, GEMINI_CHUNK_TOTAL_TIMEOUT_MS } from './constants';
import type { RefineMeta, SynapseSettings } from './types';

export function splitTextIntoChunks(text: string, chunkSize = GEMINI_CHUNK_SIZE, overlap = GEMINI_CHUNK_OVERLAP): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  const sectionBreaks = [...text.matchAll(/\n(?=#{1,3}\s)/g)].map((m) => m.index ?? 0);

  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const windowStart = start + Math.floor(chunkSize * 0.55);
      const sectionCut = sectionBreaks.filter((idx) => idx > windowStart && idx < end).pop();
      const paragraphCut = text.lastIndexOf('\n\n', end);
      const lineCut = text.lastIndexOf('\n', end);
      const preferred = sectionCut ?? (paragraphCut > windowStart ? paragraphCut : lineCut);
      if (preferred > windowStart) end = preferred;
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks.length ? chunks : [text];
}

function mergeChunkOutputs(chunks: string[]): string {
  const parts = chunks.map((c) => c.trim()).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];
  return parts.join('\n\n---\n\n');
}

export async function refineWithGeminiChunked(
  text: string,
  settings: SynapseSettings,
  meta: RefineMeta,
  onProgress?: (current: number, total: number) => void
): Promise<string | null> {
  const chunks = splitTextIntoChunks(text);
  const started = performance.now();
  const refinedChunks: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (performance.now() - started > GEMINI_CHUNK_TOTAL_TIMEOUT_MS) break;

    onProgress?.(i + 1, chunks.length);
    const chunkInstruction = chunks.length > 1
      ? `CHUNK ${i + 1} of ${chunks.length}: Refine this section only. Keep all substantive points from this chunk.`
      : undefined;

    const refined = await compactWithGeminiNano(chunks[i], settings, meta, { chunkInstruction });
    if (refined?.trim()) refinedChunks.push(refined.trim());
  }

  if (!refinedChunks.length) return null;

  if (refinedChunks.length === 1) return refinedChunks[0];

  const merged = mergeChunkOutputs(refinedChunks);
  if (merged.length <= GEMINI_CHUNK_SIZE) {
    const finalPass = await compactWithGeminiNano(merged, settings, meta, {
      chunkInstruction: 'Merge these refined sections into one cohesive document following the output schema. Do not drop sections.',
    });
    return finalPass?.trim() || merged;
  }

  return merged;
}