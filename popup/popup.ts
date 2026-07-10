import { DEFAULT_SETTINGS, KO_FI_URL, STORAGE_KEYS } from '../src/constants';
import { getRefineProfileLabel } from '../src/refine-profiles';
import { migrateSettings } from '../src/settings-migrate';
import { formatGeminiStatus, geminiFlagUrl, wireFlagLinks } from '../src/gemini-status';
import { applyCompactShortcutLabels } from '../src/shortcut';
import { extensionApi } from '../src/platform';
import type { CompactStats, GeminiAvailability, SynapseSettings } from '../src/types';

const enabledToggle = document.getElementById('toggle-enabled') as HTMLInputElement;
const autoCopyToggle = document.getElementById('toggle-auto-copy') as HTMLInputElement;
const statusPill = document.getElementById('status-pill') as HTMLSpanElement;
const engineStatus = document.getElementById('engine-status') as HTMLSpanElement;
const metricCompactions = document.getElementById('metric-compactions') as HTMLElement;
const metricSaved = document.getElementById('metric-saved') as HTMLElement;
const recentList = document.getElementById('recent-list') as HTMLUListElement;
const openOptionsBtn = document.getElementById('open-options') as HTMLButtonElement;
const kofiLink = document.getElementById('kofi-link') as HTMLAnchorElement;
const geminiStatusBlock = document.getElementById('gemini-status-block') as HTMLElement;
const geminiStatus = document.getElementById('gemini-status') as HTMLElement;
const geminiHint = document.getElementById('gemini-hint') as HTMLParagraphElement;

function setGeminiStatusVisible(visible: boolean): void {
  geminiStatusBlock.classList.toggle('hidden', !visible);
  if (!visible) {
    geminiHint.classList.add('hidden');
    geminiHint.textContent = '';
  }
}

function applyGeminiUi(availability: GeminiAvailability): void {
  const info = formatGeminiStatus(availability);
  geminiStatus.textContent = info.label;
  geminiStatus.className = `badge gemini-${info.availability}`;

  if (info.showFlagLink) {
    geminiHint.classList.remove('hidden');
    geminiHint.innerHTML = `${info.description} Enable <a href="${geminiFlagUrl()}" class="flag-link">Prompt API for Gemini Nano</a> in <code>chrome://flags</code>.`;
    wireFlagLinks();
  } else if (!info.ready && availability === 'downloading') {
    geminiHint.classList.remove('hidden');
    geminiHint.textContent = info.description;
  } else {
    geminiHint.classList.add('hidden');
    geminiHint.textContent = '';
  }
}

async function loadGeminiStatus(): Promise<void> {
  if (geminiStatusBlock.classList.contains('hidden')) return;

  applyGeminiUi('unknown');
  const res = await extensionApi.runtime.sendMessage<{
    success?: boolean;
    availability?: GeminiAvailability;
    tabRestricted?: boolean;
    cached?: boolean;
  }>({ type: 'get-gemini-availability' });

  if (res?.tabRestricted && !res?.cached) {
    applyGeminiUi('unavailable');
    geminiHint.classList.remove('hidden');
    geminiHint.innerHTML = `Open a regular webpage tab to detect Gemini Nano. Then enable <a href="${geminiFlagUrl()}" class="flag-link">Prompt API for Gemini Nano</a> in <code>chrome://flags</code> if needed.`;
    wireFlagLinks();
    return;
  }

  applyGeminiUi(res?.availability ?? 'unavailable');
  if (res?.cached) {
    geminiHint.classList.remove('hidden');
    geminiHint.textContent = 'Showing the last detected status from an open browser tab.';
  }
}

function applyEngineUi(settings: SynapseSettings): void {
  const preset = getRefineProfileLabel(settings.refinePreset);
  engineStatus.textContent = settings.useGeminiNano ? `${preset} + Gemini` : `${preset} template`;
  engineStatus.className = 'badge ready';
  setGeminiStatusVisible(settings.useGeminiNano);
  if (settings.useGeminiNano) loadGeminiStatus().catch(console.error);
}

function renderRecent(stats: CompactStats): void {
  if (!stats.lastCompactionAt) {
    recentList.innerHTML = '<li class="empty">No compactions recorded yet.</li>';
    return;
  }

  const time = new Date(stats.lastCompactionAt).toLocaleTimeString();
  const saved = stats.totalCharsSaved.toLocaleString();
  recentList.innerHTML = `<li class="recent"><strong>Last compaction</strong> · ${saved} chars saved <span>${time}</span></li>`;
}

async function loadDashboard(): Promise<void> {
  const [settingsRes, statsRes] = await Promise.all([
    extensionApi.runtime.sendMessage<{ success?: boolean; settings: SynapseSettings }>({ type: 'get-settings' }),
    extensionApi.runtime.sendMessage<{ success?: boolean; stats: CompactStats }>({ type: 'get-stats' }),
  ]);

  const settings = migrateSettings(settingsRes?.settings);
  const stats = statsRes?.stats ?? {
    totalCompactions: 0,
    totalCharsSaved: 0,
    totalOriginalChars: 0,
    geminiCompactions: 0,
  };

  applyEngineUi(settings);

  enabledToggle.checked = settings.enabled;
  autoCopyToggle.checked = settings.autoCompactOnCopy;
  statusPill.textContent = settings.enabled ? 'Active' : 'Paused';
  statusPill.classList.toggle('active', settings.enabled);
  metricCompactions.textContent = String(stats.totalCompactions);
  metricSaved.textContent = stats.totalCharsSaved.toLocaleString();
  renderRecent(stats);
}

async function saveSettings(patch: Partial<SynapseSettings>): Promise<void> {
  const current = await extensionApi.storage.local.get<Record<string, unknown>>(STORAGE_KEYS.SETTINGS);
  const settings = migrateSettings({
    ...(current[STORAGE_KEYS.SETTINGS] as Partial<SynapseSettings> | undefined),
    ...patch,
  });
  await extensionApi.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  await loadDashboard();
}

enabledToggle.addEventListener('change', () => {
  saveSettings({ enabled: enabledToggle.checked }).catch(console.error);
});

autoCopyToggle.addEventListener('change', () => {
  saveSettings({ autoCompactOnCopy: autoCopyToggle.checked }).catch(console.error);
});

openOptionsBtn.addEventListener('click', () => {
  extensionApi.runtime.openOptionsPage();
});

extensionApi.storage.onChanged?.addListener((changes: Record<string, chrome.storage.StorageChange>) => {
  if (changes[STORAGE_KEYS.STATS] || changes[STORAGE_KEYS.SETTINGS]) {
    loadDashboard().catch(console.error);
  }
});

kofiLink.href = KO_FI_URL;

applyCompactShortcutLabels();
loadDashboard().catch(console.error);