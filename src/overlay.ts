import { THEME } from './theme';
import type { CompactResult } from './types';

const HOST_ID = 'synapseclean-toast-host';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let shadowHost: HTMLDivElement | null = null;

const TOAST_CSS = `
:host {
  all: initial;
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483646;
  font-family: "Outfit", system-ui, -apple-system, sans-serif;
  pointer-events: auto;
}
* { box-sizing: border-box; }
.toast-panel {
  min-width: 280px;
  max-width: 360px;
  border-radius: 16px;
  border: 1px solid ${THEME.border};
  background: ${THEME.panel};
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  color: ${THEME.text};
  padding: 16px;
}
.toast-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.toast-title {
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.text};
  margin: 0;
}
.toast-engine {
  font-size: 10px;
  color: ${THEME.muted};
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.toast-body {
  font-size: 12px;
  color: ${THEME.muted};
  line-height: 1.45;
  margin: 0;
}
.toast-body strong {
  color: ${THEME.text};
}
.toast-pending {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${THEME.cobalt};
  animation: synapseclean-pulse 1s ease infinite;
}
.toast-error {
  border-color: rgba(252, 165, 165, 0.35);
  color: #fca5a5;
  font-size: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${THEME.panel};
  max-width: 320px;
}
@keyframes synapseclean-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
`;

function clearToastTimer(): void {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}

function createHost(): HTMLDivElement {
  removeToast();
  shadowHost = document.createElement('div');
  shadowHost.id = HOST_ID;
  const shadow = shadowHost.attachShadow({ mode: 'open' });
  
  const style = document.createElement('style');
  style.textContent = TOAST_CSS;
  shadow.appendChild(style);
  
  const container = document.createElement('div');
  shadow.appendChild(container);
  
  document.documentElement.appendChild(shadowHost);
  return container;
}

export function showPendingToast(message = 'Compacting selection…'): void {
  const container = createHost();
  container.innerHTML = `
    <div class="toast-panel">
      <div class="toast-pending">
        <span class="toast-dot"></span>
        <strong class="toast-title">synapseclean</strong>
      </div>
      <p class="toast-body">${escapeHtml(message)}</p>
    </div>
  `;
}

export function showCompactionToast(
  result: CompactResult,
  options: {
    clipboardCopied?: boolean;
    structuredWithGemini?: boolean;
    usedTemplate?: boolean;
  } = {}
): void {
  clearToastTimer();
  const container = createHost();

  const engineLabel = result.engine === 'gemini-nano'
    ? 'Gemini Nano'
    : result.engine === 'template'
      ? 'Template'
      : 'Rules';
  const upgradeHtml = result.upgraded || options.structuredWithGemini
    ? '<p class="toast-body" style="margin-top:6px;">Structured with Gemini Nano.</p>'
    : options.usedTemplate || result.usedTemplate
      ? '<p class="toast-body" style="margin-top:6px;">Applied AI-ready template.</p>'
      : '';
  const clipboardCopied = options.clipboardCopied ?? true;
  const clipboardHtml = clipboardCopied
    ? '<p class="toast-body">Copied cleaned prompt to clipboard.</p>'
    : '<p class="toast-body">Compaction complete — copy selection again to refresh clipboard.</p>';

  container.innerHTML = `
    <div class="toast-panel">
      <div class="toast-header">
        <p class="toast-title">synapseclean</p>
        <span class="toast-engine">${engineLabel}</span>
      </div>
      <p class="toast-body">
        ${result.originalLength.toLocaleString()} → <strong>${result.compactedLength.toLocaleString()}</strong> chars
        <strong> (−${result.reductionPercent}%)</strong>
      </p>
      ${clipboardHtml}
      ${upgradeHtml}
    </div>
  `;

  toastTimer = setTimeout(() => {
    removeToast();
    toastTimer = null;
  }, 6000);
}

export function removeToast(): void {
  clearToastTimer();
  if (shadowHost) {
    shadowHost.remove();
    shadowHost = null;
  } else {
    document.getElementById(HOST_ID)?.remove();
  }
}

export function showErrorToast(message: string): void {
  const container = createHost();
  container.innerHTML = `<div class="toast-error">${escapeHtml(message)}</div>`;
  toastTimer = setTimeout(() => {
    removeToast();
    toastTimer = null;
  }, 5000);
}