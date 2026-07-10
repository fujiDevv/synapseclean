import { checkGeminiNanoAvailability, setMainWorldPort } from './src/ai';
import { writeClipboard } from './src/clipboard';
import { isGeminiCompactionReady } from './src/gemini-ready';
import { refineWithGeminiChunked } from './src/gemini-chunking';
import { writeCachedAvailability } from './src/gemini-probe';
import { computeReduction, ruleBasedCompact, ruleBasedCompactAsync } from './src/compactor';
import { DEFAULT_SETTINGS } from './src/constants';
import { getSelectionAsMarkdown } from './src/html-to-markdown';
import {
  removeToast,
  showCompactionToast,
  showErrorToast,
  showPendingToast,
} from './src/overlay';
import { isExtensionSender } from './src/ipc';
import { extensionApi, getRuntimeUrl } from './src/platform';
import { migrateSettings } from './src/settings-migrate';
import { buildBoilerplateTemplate } from './src/templates';
import { shouldAcceptGeminiUpgrade } from './src/upgrade-quality';
import type { CompactResult, GeminiAvailability, RefineMeta, SynapseSettings } from './src/types';

let settings: SynapseSettings = { ...DEFAULT_SETTINGS };
let bridgeReady = false;
let bridgeInitPromise: Promise<boolean> | null = null;
let compacting = false;
let geminiUpgradeInFlight = false;
let lastCompactedOriginal = '';

function checkContext(): boolean {
  try {
    return !!extensionApi.runtime.id;
  } catch {
    return false;
  }
}

function getRefineMeta(): RefineMeta {
  return {
    sourceTitle: document.title,
    sourceUrl: window.location.href,
  };
}

/** Inject main_world.js first, then hand off the MessagePort (must run after script loads). */
function ensureMainWorldBridge(): Promise<boolean> {
  if (bridgeReady) return Promise.resolve(true);
  if (bridgeInitPromise) return bridgeInitPromise;

  bridgeInitPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const scriptUrl = getRuntimeUrl('main_world.js');
    if (!scriptUrl) {
      bridgeInitPromise = null;
      resolve(false);
      return;
    }

    const channel = new MessageChannel();
    setMainWorldPort(channel.port1);

    const token = crypto.randomUUID();
    const injector = document.createElement('script');
    injector.src = scriptUrl;
    injector.dataset.synapseToken = token;
    injector.onload = () => {
      injector.remove();
      window.postMessage({ type: 'SYNAPSECLEAN_AI_INIT_PORT', token }, '*', [channel.port2]);
      bridgeReady = true;
      resolve(true);
    };
    injector.onerror = () => {
      bridgeInitPromise = null;
      console.warn('[SynapseClean] Main world bridge failed to load');
      resolve(false);
    };
    (document.head || document.documentElement).appendChild(injector);
  });

  return bridgeInitPromise;
}

async function loadSettings(): Promise<void> {
  if (!checkContext()) return;
  try {
    const res = await extensionApi.runtime.sendMessage<{ success: boolean; settings?: SynapseSettings }>({ type: 'get-settings' });
    if (res?.settings) settings = migrateSettings(res.settings);
  } catch {
    // ignore
  }
}

function getSelectionText(fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  const sel = window.getSelection();
  const rawText = sel?.toString() ?? '';
  if (rawText.length > 100000) return rawText.trim();
  const md = getSelectionAsMarkdown();
  if (md.trim().length > 0) return md.trim();
  return rawText.trim();
}

async function recordCompaction(result: CompactResult): Promise<void> {
  await extensionApi.runtime.sendMessage({
    type: 'record-compaction',
    originalLength: result.originalLength,
    compactedLength: result.compactedLength,
    engine: result.engine,
  });
}

function buildResult(
  original: string,
  compacted: string,
  engine: CompactResult['engine'],
  start: number,
  options: { upgraded?: boolean; usedTemplate?: boolean } = {}
): CompactResult {
  const metrics = computeReduction(original, compacted);
  return {
    original,
    compacted,
    ...metrics,
    engine,
    durationMs: Math.round(performance.now() - start),
    upgraded: options.upgraded,
    usedTemplate: options.usedTemplate,
  };
}

function prepareSelection(original: string): string {
  return ruleBasedCompact(original, settings.outputFormat, settings.compactionMode);
}

async function prepareSelectionAsync(original: string): Promise<string> {
  return ruleBasedCompactAsync(original, settings.outputFormat, settings.compactionMode);
}

function buildTemplateOutput(prepared: string): string {
  return buildBoilerplateTemplate(prepared, getRefineMeta());
}

async function tryGeminiUpgrade(
  original: string,
  prepared: string,
  start: number
): Promise<CompactResult | null> {
  if (!settings.useGeminiNano) return null;

  const bridgeOk = await ensureMainWorldBridge();
  if (!bridgeOk) return null;

  const availability = await checkGeminiNanoAvailability();
  if (!isGeminiCompactionReady(availability)) {
    return null;
  }

  const meta = getRefineMeta();
  const refined = await refineWithGeminiChunked(prepared, settings, meta, (current, total) => {
    if (settings.showToast && total > 1) {
      showPendingToast(`Refining section ${current}/${total} with Gemini Nano…`);
    }
  });

  if (!refined || !shouldAcceptGeminiUpgrade(prepared, refined, settings.refinePreset)) {
    return null;
  }

  return buildResult(original, refined, 'gemini-nano', start, { upgraded: true });
}

function runGeminiUpgradeInBackground(
  original: string,
  prepared: string,
  fastResult: CompactResult,
  start: number
): void {
  if (settings.showToast) showPendingToast('Refining with Gemini Nano…');

  geminiUpgradeInFlight = true;
  tryGeminiUpgrade(original, prepared, start)
    .then(async (upgraded) => {
      if (!upgraded) {
        removeToast();
        if (settings.showToast) showCompactionToast(fastResult);
        return;
      }
      if (lastCompactedOriginal !== original) {
        removeToast();
        return;
      }

      const copied = await writeClipboard(upgraded.compacted);
      await extensionApi.runtime.sendMessage({ type: 'record-gemini-compaction' });
      removeToast();
      if (settings.showToast) {
        showCompactionToast(upgraded, { clipboardCopied: copied, structuredWithGemini: true });
      }
    })
    .catch(() => {
      removeToast();
    })
    .finally(() => {
      geminiUpgradeInFlight = false;
    });
}

async function handleCompactRequest(text?: string): Promise<void> {
  if (!settings.enabled || compacting || geminiUpgradeInFlight) return;
  compacting = true;

  try {
    const selection = getSelectionText(text);
    if (selection.length < settings.minCharsToCompact) {
      showErrorToast(`Select at least ${settings.minCharsToCompact} characters to compact.`);
      return;
    }

    lastCompactedOriginal = selection;

    if (settings.showToast) showPendingToast();

    const start = performance.now();
    const original = selection;
    const prepared = await prepareSelectionAsync(original);
    const output = buildTemplateOutput(prepared);
    const willUpgrade = settings.useGeminiNano;
    const fastResult = buildResult(original, output, willUpgrade ? 'rules' : 'template', start, {
      usedTemplate: true,
    });

    const copied = await writeClipboard(output);
    removeToast();
    if (settings.showToast) {
      showCompactionToast(fastResult, {
        clipboardCopied: copied,
        structuredWithGemini: false,
        usedTemplate: true,
      });
    }
    await recordCompaction(fastResult);

    if (willUpgrade) {
      runGeminiUpgradeInBackground(original, prepared, fastResult, start);
    }
  } catch (err) {
    removeToast();
    showErrorToast(err instanceof Error ? err.message : 'Compaction failed.');
  } finally {
    compacting = false;
  }
}

document.addEventListener('copy', (event) => {
  if (!settings.enabled || !settings.autoCompactOnCopy || compacting || geminiUpgradeInFlight) return;

  const selection = getSelectionText();
  if (selection.length < settings.minCharsToCompact) return;
  if (!event.clipboardData) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  compacting = true;
  lastCompactedOriginal = selection;

  try {
    const start = performance.now();
    const original = selection;
    const prepared = prepareSelection(original);
    const output = buildTemplateOutput(prepared);
    const willUpgrade = settings.useGeminiNano;
    const fastResult = buildResult(original, output, willUpgrade ? 'rules' : 'template', start, {
      usedTemplate: true,
    });

    event.clipboardData.setData('text/plain', output);

    removeToast();
    if (settings.showToast) {
      showCompactionToast(fastResult, { usedTemplate: true });
    }
    recordCompaction(fastResult).catch(() => {});

    if (willUpgrade) {
      runGeminiUpgradeInBackground(original, prepared, fastResult, start);
    }
  } catch (err) {
    removeToast();
    showErrorToast(err instanceof Error ? err.message : 'Compaction failed.');
  } finally {
    compacting = false;
  }
}, true);

extensionApi.runtime.onMessage?.addListener((message, sender, sendResponse) => {
  if (!isExtensionSender(sender)) return false;

  if (message.type === 'synapseclean-compact-selection') {
    handleCompactRequest(message.text).then(() => sendResponse({ success: true })).catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'synapseclean-get-gemini-availability') {
    ensureMainWorldBridge()
      .then(() => checkGeminiNanoAvailability())
      .then(async (availability) => {
        await writeCachedAvailability(availability as GeminiAvailability);
        sendResponse({ success: true, availability: availability as GeminiAvailability });
      })
      .catch(() => sendResponse({ success: true, availability: 'unavailable' as GeminiAvailability }));
    return true;
  }

  if (message.type === 'settings-updated') {
    loadSettings();
    sendResponse({ success: true });
    return false;
  }

  return false;
});

extensionApi.storage.onChanged?.addListener((changes: Record<string, chrome.storage.StorageChange>) => {
  if (changes['synapseclean-settings']) {
    settings = migrateSettings(changes['synapseclean-settings'].newValue as SynapseSettings);
  }
});

loadSettings().then(() => {
  if (settings.useGeminiNano) ensureMainWorldBridge().catch(() => {});
});