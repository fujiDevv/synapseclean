import { formatGeminiStatus, geminiFlagUrl, wireFlagLinks } from '../src/gemini-status';
import { applyCompactShortcutLabels, wireShortcutSettingsLinks } from '../src/shortcut';
import { DEFAULT_SETTINGS, GITHUB_REPO_URL, KO_FI_URL, STORAGE_KEYS } from '../src/constants';
import { extensionApi } from '../src/platform';
import { getRefineProfile, validateUserPromptTemplate } from '../src/refine-profiles';
import { migrateSettings } from '../src/settings-migrate';
import type { CompactStats, DomainProfile, GeminiAvailability, RefinePreset, SynapseSettings } from '../src/types';

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

const profilesList = document.getElementById('profiles-list') as HTMLDivElement;
const addProfileBtn = document.getElementById('add-profile-btn') as HTMLButtonElement;
let domainProfiles: DomainProfile[] = [];

function renderProfiles() {
  profilesList.innerHTML = '';
  if (domainProfiles.length === 0) {
    profilesList.innerHTML = '<p class="hint">No domain profiles created.</p>';
    return;
  }
  domainProfiles.forEach((p, index) => {
    const el = document.createElement('div');
    el.className = 'profile-card';
    el.style.border = '1px solid var(--color-line)';
    el.style.padding = '1rem';
    el.style.borderRadius = '8px';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.gap = '0.75rem';
    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <input type="text" class="profile-url" value="${p.urlPattern}" placeholder="*://*.example.com/*" style="width: 60%; padding: 0.4rem; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 4px; color: var(--color-ink);">
        <button type="button" class="btn-secondary remove-profile-btn" data-index="${index}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">Remove</button>
      </div>
      <div>
        <label class="field" style="margin-top: 0;">
          <span style="font-size: 0.8rem; margin-bottom: 0.25rem;">Exclude CSS Selectors (comma separated)</span>
          <input type="text" class="profile-exclude" value="${p.excludeSelectors.join(', ')}" placeholder=".sidebar, .footer, #ads">
        </label>
      </div>
      <div>
        <label class="field" style="margin-top: 0;">
          <span style="font-size: 0.8rem; margin-bottom: 0.25rem;">Prompt Template (use {{content}})</span>
          <textarea class="profile-prompt" rows="3" placeholder="Summarize: \n\n{{content}}" style="padding: 0.5rem; border-radius: 4px; border: 1px solid var(--color-line); background: var(--color-surface); color: var(--color-ink);">${p.promptTemplate}</textarea>
        </label>
      </div>
    `;
    profilesList.appendChild(el);
  });

  document.querySelectorAll('.remove-profile-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number((e.target as HTMLButtonElement).dataset.index);
      domainProfiles.splice(idx, 1);
      renderProfiles();
    });
  });
  
  document.querySelectorAll('.profile-card').forEach((card, index) => {
    const urlInput = card.querySelector('.profile-url') as HTMLInputElement;
    const excludeInput = card.querySelector('.profile-exclude') as HTMLInputElement;
    const promptInput = card.querySelector('.profile-prompt') as HTMLTextAreaElement;
    
    const updateState = () => {
      domainProfiles[index].urlPattern = urlInput.value;
      domainProfiles[index].excludeSelectors = excludeInput.value.split(',').map(s => s.trim()).filter(Boolean);
      domainProfiles[index].promptTemplate = promptInput.value;
    };
    
    urlInput.addEventListener('input', updateState);
    excludeInput.addEventListener('input', updateState);
    promptInput.addEventListener('input', updateState);
  });
}

addProfileBtn.addEventListener('click', () => {
  domainProfiles.push({
    id: crypto.randomUUID(),
    urlPattern: '*github.com*',
    excludeSelectors: ['.file-navigation', '.Layout-sidebar'],
    promptTemplate: 'Analyze this code:\\n\\n{{content}}',
    enabled: true
  });
  renderProfiles();
});

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
    domainProfiles: domainProfiles,
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
  domainProfiles = settings.domainProfiles || [];
  renderProfiles();
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

