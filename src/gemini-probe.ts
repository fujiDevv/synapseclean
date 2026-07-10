import { STORAGE_KEYS } from './constants';
import { extensionApi } from './platform';
import type { GeminiAvailability } from './types';

const GEMINI_CACHE_TTL_MS = 10 * 60 * 1000;

type ProbeTab = {
  id: number;
  url?: string;
  active?: boolean;
};

export function isProbeableTabUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function orderProbeTabs(
  tabs: Array<{ id?: number; url?: string; active?: boolean }>
): ProbeTab[] {
  const probeable = tabs.filter((tab): tab is ProbeTab => !!tab.id && isProbeableTabUrl(tab.url));
  if (probeable.length === 0) return [];

  return [...probeable].sort((a, b) => Number(b.active) - Number(a.active));
}

async function readCachedAvailability(): Promise<GeminiAvailability | null> {
  const data = await extensionApi.storage.local.get<Record<string, unknown>>(STORAGE_KEYS.GEMINI_AVAILABILITY);
  const cached = data[STORAGE_KEYS.GEMINI_AVAILABILITY] as
    | { availability?: GeminiAvailability; checkedAt?: number }
    | undefined;

  if (!cached?.availability || !cached.checkedAt) return null;
  if (Date.now() - cached.checkedAt > GEMINI_CACHE_TTL_MS) return null;
  return cached.availability;
}

export async function writeCachedAvailability(availability: GeminiAvailability): Promise<void> {
  await extensionApi.storage.local.set({
    [STORAGE_KEYS.GEMINI_AVAILABILITY]: {
      availability,
      checkedAt: Date.now(),
    },
  });
}

export type GeminiProbeResult = {
  availability: GeminiAvailability;
  tabRestricted: boolean;
  tabUrl?: string;
  cached?: boolean;
};

export async function probeGeminiAvailability(): Promise<GeminiProbeResult> {
  const tabs = await extensionApi.tabs.query({});
  const orderedTabs = orderProbeTabs(tabs);

  if (orderedTabs.length === 0) {
    const cached = await readCachedAvailability();
    return {
      availability: cached ?? 'unavailable',
      tabRestricted: true,
      cached: !!cached,
    };
  }

  for (const tab of orderedTabs) {
    try {
      const res = await extensionApi.tabs.sendMessage<{ success?: boolean; availability?: GeminiAvailability }>(tab.id, {
        type: 'synapseclean-get-gemini-availability',
      });
      const availability = res?.availability ?? 'unavailable';
      await writeCachedAvailability(availability);
      return {
        availability,
        tabRestricted: false,
        tabUrl: tab.url,
      };
    } catch {
      // Content script may not be ready on this tab; try the next probeable tab.
    }
  }

  const cached = await readCachedAvailability();
  return {
    availability: cached ?? 'unavailable',
    tabRestricted: false,
    cached: !!cached,
  };
}