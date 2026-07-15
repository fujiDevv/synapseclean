import { REFINE_PROFILES } from './refine-profiles';

export const STORAGE_KEYS = {
  SETTINGS: 'synapseclean-settings',
  STATS: 'synapseclean-stats',
  GEMINI_AVAILABILITY: 'synapseclean-gemini-availability',
} as const;

export const DEFAULT_SETTINGS = {
  enabled: true,
  autoCompactOnCopy: true,
  minCharsToCompact: 200,
  outputFormat: 'markdown' as 'markdown' | 'outline' | 'bullets',
  showToast: true,
  useGeminiNano: true,
  refineMode: 'preset' as const,
  refinePreset: 'ai-prompt' as const,
  refineLength: 'balanced' as const,
  customSystemPrompt: REFINE_PROFILES['ai-prompt'].systemPrompt,
  customUserPromptTemplate: REFINE_PROFILES['ai-prompt'].userPromptTemplate,
  compactionMode: 'prepare' as const,
  domainProfiles: [] as import('./types').DomainProfile[],
};

/** Public product site (marketing monorepo package: synapseclean-web). */
export const SITE_URL = 'https://synapseclean.com';

export const GITHUB_REPO_URL = 'https://github.com/fujiDevv/synapseclean';

/** Ko-fi donation page (widget ID D6M821E6GR). */
export const KO_FI_URL = 'https://ko-fi.com/D6M821E6GR';

/** Ko-fi brand color from the official widget snippet. */
export const KO_FI_COLOR = '#72a4f2';

/** Max characters processed by the rule engine (larger selections are truncated). */
export const MAX_COMPACT_INPUT_CHARS = 200_000;

/** Gemini Nano input cap per request. */
export const MAX_GEMINI_INPUT_CHARS = 12_000;

/** Target chunk size for multi-pass Gemini refinement. */
export const GEMINI_CHUNK_SIZE = 10_000;

/** Overlap between Gemini chunks to preserve context. */
export const GEMINI_CHUNK_OVERLAP = 200;

/** Max total time for chunked Gemini refinement (ms). */
export const GEMINI_CHUNK_TOTAL_TIMEOUT_MS = 60_000;

/** Yield to the main thread every N lines during rule compaction. */
export const COMPACT_YIELD_LINES = 200;

export const CHROME_GEMINI_FLAG_URL = 'chrome://flags/#prompt-api-for-gemini-nano';

/** @deprecated Use refine profile system prompts instead. */
export const SYNAPSE_SYSTEM_PROMPT = REFINE_PROFILES['ai-prompt'].systemPrompt;