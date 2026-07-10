import { DEFAULT_SETTINGS } from './constants';
import { presetFromOutputFormat } from './refine-profiles';
import type { SynapseSettings } from './types';

/** Merge stored settings with defaults and migrate legacy fields. */
export function migrateSettings(raw: Partial<SynapseSettings> | undefined): SynapseSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };

  if (!raw?.refinePreset) {
    merged.refinePreset = presetFromOutputFormat(merged.outputFormat);
  }

  if (!raw?.refineMode) merged.refineMode = 'preset';
  if (!raw?.refineLength) merged.refineLength = 'balanced';
  if (!raw?.compactionMode) merged.compactionMode = 'prepare';

  if (!raw?.customSystemPrompt?.trim()) {
    merged.customSystemPrompt = DEFAULT_SETTINGS.customSystemPrompt;
  }
  if (!raw?.customUserPromptTemplate?.trim()) {
    merged.customUserPromptTemplate = DEFAULT_SETTINGS.customUserPromptTemplate;
  }

  return merged;
}