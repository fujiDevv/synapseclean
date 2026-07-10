export type RefinePreset =
  | 'ai-prompt'
  | 'research-brief'
  | 'product-spec'
  | 'meeting-notes'
  | 'outline-only'
  | 'bullets-only';

export type RefineLength = 'concise' | 'balanced' | 'comprehensive';
export type RefineMode = 'preset' | 'custom';
export type CompactionMode = 'prepare' | 'legacy';

export interface SynapseSettings {
  enabled: boolean;
  autoCompactOnCopy: boolean;
  minCharsToCompact: number;
  outputFormat: 'markdown' | 'outline' | 'bullets';
  showToast: boolean;
  useGeminiNano: boolean;
  refineMode: RefineMode;
  refinePreset: RefinePreset;
  refineLength: RefineLength;
  customSystemPrompt: string;
  customUserPromptTemplate: string;
  compactionMode: CompactionMode;
}

export interface RefineMeta {
  sourceTitle?: string;
  sourceUrl?: string;
}

export interface CompactStats {
  totalCompactions: number;
  totalCharsSaved: number;
  totalOriginalChars: number;
  geminiCompactions: number;
  lastCompactionAt?: number;
}

export type GeminiAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown';

export interface CompactResult {
  original: string;
  compacted: string;
  originalLength: number;
  compactedLength: number;
  reductionPercent: number;
  engine: 'gemini-nano' | 'rules' | 'template';
  durationMs: number;
  upgraded?: boolean;
  usedTemplate?: boolean;
}

export interface CompactRequest {
  text: string;
  sourceUrl?: string;
  sourceTitle?: string;
  format?: SynapseSettings['outputFormat'];
}

export interface PetMessage {
  type: string;
  [key: string]: unknown;
}