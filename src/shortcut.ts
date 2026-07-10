import { extensionApi } from './platform';

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
}

/** Chrome maps manifest Alt+Shift+C to Option+Shift+C on macOS. */
export function getCompactShortcutLabel(): string {
  return isMacPlatform() ? '⌥⇧C' : 'Alt+Shift+C';
}

export function getCompactShortcutDescription(): string {
  return isMacPlatform() ? 'Option+Shift+C' : 'Alt+Shift+C';
}

export function getCopyShortcutLabel(): string {
  return isMacPlatform() ? '⌘C' : 'Ctrl+C';
}

export function getCopyShortcutDescription(): string {
  return isMacPlatform() ? 'Cmd+C' : 'Ctrl+C';
}

export const CHROME_SHORTCUTS_URL = 'chrome://extensions/shortcuts';

export function wireShortcutSettingsLinks(root: ParentNode = document): void {
  root.querySelectorAll<HTMLAnchorElement>('a[data-shortcuts-settings]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      extensionApi.tabs.create({ url: CHROME_SHORTCUTS_URL }).catch(() => {
        window.open(CHROME_SHORTCUTS_URL, '_blank');
      });
    });
  });
}

export function applyCompactShortcutLabels(): void {
  document.querySelectorAll<HTMLElement>('[data-compact-shortcut]').forEach((el) => {
    el.textContent = getCompactShortcutLabel();
    el.setAttribute('title', getCompactShortcutDescription());
    el.setAttribute('aria-label', `Compact selection (${getCompactShortcutDescription()})`);
  });

  document.querySelectorAll<HTMLElement>('[data-copy-shortcut]').forEach((el) => {
    el.textContent = getCopyShortcutLabel();
    el.setAttribute('title', getCopyShortcutDescription());
    el.setAttribute('aria-label', `Copy selection (${getCopyShortcutDescription()})`);
  });
}