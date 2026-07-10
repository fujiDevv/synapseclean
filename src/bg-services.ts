import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';
import { migrateSettings } from './settings-migrate';
import { extensionApi } from './platform';
import type { CompactStats, SynapseSettings } from './types';

export function defaultStats(): CompactStats {
  return {
    totalCompactions: 0,
    totalCharsSaved: 0,
    totalOriginalChars: 0,
    geminiCompactions: 0,
  };
}

export async function getSettings(): Promise<SynapseSettings> {
  const data = await extensionApi.storage.local.get<Record<string, unknown>>(STORAGE_KEYS.SETTINGS);
  return migrateSettings(data[STORAGE_KEYS.SETTINGS] as Partial<SynapseSettings> | undefined);
}

export async function saveSettings(settings: SynapseSettings): Promise<void> {
  await extensionApi.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

export async function getStats(): Promise<CompactStats> {
  const data = await extensionApi.storage.local.get<Record<string, unknown>>(STORAGE_KEYS.STATS);
  return { ...defaultStats(), ...(data[STORAGE_KEYS.STATS] as Partial<CompactStats> | undefined) };
}

export async function saveStats(stats: CompactStats): Promise<void> {
  await extensionApi.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
}

export async function recordCompaction(
  originalLength: number,
  compactedLength: number
): Promise<CompactStats> {
  const stats = await getStats();
  const saved = Math.max(0, originalLength - compactedLength);
  const updated: CompactStats = {
    ...stats,
    totalCompactions: stats.totalCompactions + 1,
    totalCharsSaved: stats.totalCharsSaved + saved,
    totalOriginalChars: stats.totalOriginalChars + originalLength,
    lastCompactionAt: Date.now(),
  };
  await saveStats(updated);
  return updated;
}

export async function recordGeminiCompaction(): Promise<CompactStats> {
  const stats = await getStats();
  const updated: CompactStats = {
    ...stats,
    geminiCompactions: stats.geminiCompactions + 1,
    lastCompactionAt: Date.now(),
  };
  await saveStats(updated);
  return updated;
}

export function installDefaultStorage(): void {
  void extensionApi.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    [STORAGE_KEYS.STATS]: defaultStats(),
  });
}
