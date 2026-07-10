import { formatGeminiStatus, geminiFlagUrl, wireFlagLinks } from '../src/gemini-status';
import { applyCompactShortcutLabels, wireShortcutSettingsLinks } from '../src/shortcut';
import { DEFAULT_SETTINGS, GITHUB_REPO_URL, KO_FI_URL, STORAGE_KEYS } from '../src/constants';
import { extensionApi } from '../src/platform';
import { getRefineProfile, validateUserPromptTemplate } from '../src/refine-profiles';
import { migrateSettings } from '../src/settings-migrate';
import type { CompactStats, GeminiAvailability, RefinePreset, SynapseSettings } from '../src/types';

const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.nav-btn[data-tab]'));
const tabSections = Array.from(document.querySelectorAll<HTMLElement>('.tab'));
const saveBtn = document.getElementById('save-settings') as HTMLButtonElement;
const saveStatus = document.getElementById('save-status') as HTMLSpanElement;
const auditBody = document.getElementById('audit-body') as HTMLTableSectionElement;
const versionTag = document.getElementById('version-tag') as HTMLSpanElement;
const githubLink = document.getElementById('github-link') as HTMLAnchorElement;
const kofiLink = document.getElementById('kofi-link') as HTMLAnchorElement;

const geminiAvailability = document.getElementById('gemini-availability') as HTMLSpanElement;
const geminiAvailabilityDesc = document.getElementById('gemini-availability-desc') as HTMLParagraphElement;
const geminiFlagHint = document.getElementById('gemini-flag-hint') as HTMLParagraphElement;
const geminiFlagLink = document.getElementById('gemini-flag-link') as HTMLAnchorElement;

const refinePreset = document.getElementById('refine-preset') as HTMLSelectElement;
const refinePresetDesc = document.getElementById('refine-preset-desc') as HTMLParagraphElement;
const refineSchemaPreview = document.getElementById('refine-schema-preview') as HTMLPreElement;
const refineLength = document.getElementById('refine-length') as HTMLSelectElement;
const refineMode = document.getElementById('refine-mode') as HTMLSelectElement;
const customSystemPrompt = document.getElementById('custom-system-prompt') as HTMLTextAreaElement;
const customUserPrompt = document.getElementById('custom-user-prompt') as HTMLTextAreaElement;
const restorePresetPrompts = document.getElementById('restore-preset-prompts') as HTMLButtonElement;
const promptValidation = document.getElementById('prompt-validation') as HTMLSpanElement;

function applyGeminiAvailabilityUi(
  availability: GeminiAvailability,
  tabRestricted = false,
  cached = false
): void {
  const info = formatGeminiStatus(availability);
  geminiAvailability.textContent = info.label;
  geminiAvailability.className = `status-pill gemini-${info.availability}`;

  if (tabRestricted) {
    geminiAvailabilityDesc.textContent = cached
      ? `${info.description} Showing the last detected status — open a regular webpage tab and refresh to re-check.`
      : 'Open a regular webpage tab, then refresh this page to detect Gemini Nano.';
    geminiFlagHint.classList.remove('hidden');
    return;
  }

  geminiAvailabilityDesc.textContent = cached
    ? `${info.description} Showing the last detected status from an open browser tab.`
    : info.description;
  geminiFlagHint.classList.toggle('hidden', !info.showFlagLink);
}

async function loadGeminiAvailability(): Promise<void> {
  applyGeminiAvailabilityUi('unknown');
  const res = await extensionApi.runtime.sendMessage<{
    success?: boolean;
    availability?: GeminiAvailability;
    tabRestricted?: boolean;
    cached?: boolean;
  }>({ type: 'get-gemini-availability' });

  applyGeminiAvailabilityUi(
    res?.availability ?? 'unavailable',
    !!res?.tabRestricted,
    !!res?.cached
  );
  wireFlagLinks();
}

function updatePresetPreview(presetId: RefinePreset): void {
  const profile = getRefineProfile(presetId);
  refinePresetDesc.textContent = profile.description;
  refineSchemaPreview.textContent = profile.schemaPreview;
}

function applyPresetPromptsToEditor(presetId: RefinePreset): void {
  const profile = getRefineProfile(presetId);
  customSystemPrompt.value = profile.systemPrompt;
  customUserPrompt.value = profile.userPromptTemplate;
}

function readForm(): SynapseSettings {
  return {
    enabled: (document.getElementById('enabled') as HTMLInputElement).checked,
    autoCompactOnCopy: (document.getElementById('auto-compact') as HTMLInputElement).checked,
    minCharsToCompact: Number((document.getElementById('min-chars') as HTMLInputElement).value) || DEFAULT_SETTINGS.minCharsToCompact,
    outputFormat: (document.getElementById('output-format') as HTMLSelectElement).value as SynapseSettings['outputFormat'],
    showToast: (document.getElementById('show-toast') as HTMLInputElement).checked,
    useGeminiNano: (document.getElementById('use-gemini') as HTMLInputElement).checked,
    refineMode: refineMode.value as SynapseSettings['refineMode'],
    refinePreset: refinePreset.value as SynapseSettings['refinePreset'],
    refineLength: refineLength.value as SynapseSettings['refineLength'],
    customSystemPrompt: customSystemPrompt.value,
    customUserPromptTemplate: customUserPrompt.value,
    compactionMode: DEFAULT_SETTINGS.compactionMode,
  };
}

function applyForm(settings: SynapseSettings): void {
  (document.getElementById('enabled') as HTMLInputElement).checked = settings.enabled;
  (document.getElementById('auto-compact') as HTMLInputElement).checked = settings.autoCompactOnCopy;
  (document.getElementById('min-chars') as HTMLInputElement).value = String(settings.minCharsToCompact);
  (document.getElementById('output-format') as HTMLSelectElement).value = settings.outputFormat;
  (document.getElementById('show-toast') as HTMLInputElement).checked = settings.showToast;
  (document.getElementById('use-gemini') as HTMLInputElement).checked = settings.useGeminiNano;
  refineMode.value = settings.refineMode;
  refinePreset.value = settings.refinePreset;
  refineLength.value = settings.refineLength;
  customSystemPrompt.value = settings.customSystemPrompt;
  customUserPrompt.value = settings.customUserPromptTemplate;
  updatePresetPreview(settings.refinePreset);
}

function switchToTab(tabName: string): void {
  tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabName));
  tabSections.forEach((section) => {
    section.classList.toggle('active', section.id === `tab-${tabName}`);
  });
  if (tabName === 'audit') loadAudit();
}

async function loadSettings(): Promise<void> {
  const settingsRes = await extensionApi.runtime.sendMessage<{ success: boolean; settings?: SynapseSettings }>({ type: 'get-settings' });
  const settings = migrateSettings(settingsRes?.settings);
  applyForm(settings);
  loadGeminiAvailability().catch(console.error);
}

async function loadAudit(): Promise<void> {
  const statsRes = await extensionApi.runtime.sendMessage<{ success: boolean; stats?: CompactStats }>({ type: 'get-stats' });
  const stats = statsRes?.stats;

  if (!stats) {
    auditBody.innerHTML = '<tr><td colspan="2" class="empty">No usage data yet.</td></tr>';
    return;
  }

  const rows = [
    ['Total compactions', String(stats.totalCompactions)],
    ['Characters saved', stats.totalCharsSaved.toLocaleString()],
    ['Gemini compactions', String(stats.geminiCompactions)],
    ['Last compaction', stats.lastCompactionAt ? new Date(stats.lastCompactionAt).toLocaleString() : '—'],
  ];

  auditBody.innerHTML = rows.map(([metric, value]) => `<tr><td>${metric}</td><td>${value}</td></tr>`).join('');
}

tabs.forEach((button) => {
  button.addEventListener('click', () => switchToTab(button.dataset.tab ?? 'policy'));
});

refinePreset.addEventListener('change', () => {
  const presetId = refinePreset.value as RefinePreset;
  updatePresetPreview(presetId);
  if (refineMode.value === 'preset') {
    applyPresetPromptsToEditor(presetId);
  }
});

refineMode.addEventListener('change', () => {
  if (refineMode.value === 'preset') {
    applyPresetPromptsToEditor(refinePreset.value as RefinePreset);
  }
});

restorePresetPrompts.addEventListener('click', () => {
  applyPresetPromptsToEditor(refinePreset.value as RefinePreset);
  refineMode.value = 'preset';
  promptValidation.textContent = 'Preset prompts restored.';
  setTimeout(() => { promptValidation.textContent = ''; }, 2000);
});

saveBtn.addEventListener('click', async () => {
  const settings = readForm();
  const validationError = validateUserPromptTemplate(settings.customUserPromptTemplate);
  if (validationError) {
    saveStatus.textContent = validationError;
    saveStatus.classList.add('error');
    switchToTab('refinement');
    return;
  }

  await extensionApi.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  applyForm(settings);
  saveStatus.textContent = 'Policy saved locally.';
  saveStatus.classList.remove('error');
  setTimeout(() => { saveStatus.textContent = ''; }, 2500);
});

versionTag.textContent = `v${extensionApi.runtime.getManifest()?.version ?? '1.0.0'}`;
githubLink.href = GITHUB_REPO_URL;
kofiLink.href = KO_FI_URL;
geminiFlagLink.href = geminiFlagUrl();

const welcomeTab = new URLSearchParams(window.location.search).get('welcome');
if (welcomeTab === '1') {
  switchToTab('guide');
}

applyCompactShortcutLabels();
wireFlagLinks();
wireShortcutSettingsLinks();
loadSettings();
loadAudit();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    loadSettings();
    loadAudit();
  }
});

extensionApi.storage.onChanged?.addListener((changes: Record<string, chrome.storage.StorageChange>) => {
  if (changes[STORAGE_KEYS.STATS]) {
    loadAudit();
  }
});

