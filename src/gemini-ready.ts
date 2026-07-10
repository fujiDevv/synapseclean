/** Gemini Prompt API can run compaction (model loaded and ready). */
export function isGeminiCompactionReady(availability: string): boolean {
  return availability === 'available';
}