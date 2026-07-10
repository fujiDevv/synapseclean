/**
 * Service worker entry — lifecycle, context menu, commands, message dispatch.
 * Handlers live in src/bg-handlers.ts (SourceCloak / CxtWeave monorepo pattern).
 */
import { handleRuntimeMessage } from './src/bg-handlers';
import { installDefaultStorage } from './src/bg-services';
import { isExtensionSender } from './src/ipc';
import { extensionApi } from './src/platform';

extensionApi.runtime.onInstalled?.addListener((details) => {
  if (details.reason === 'install') {
    installDefaultStorage();
    void extensionApi.tabs.create({
      url: extensionApi.runtime.getURL('options/options.html?welcome=1'),
    });
  }

  extensionApi.contextMenus.removeAll(() => {
    extensionApi.contextMenus.create({
      id: 'synapseclean-compact',
      title: 'SynapseClean: Compact for AI',
      contexts: ['selection'],
    });
  });
});

extensionApi.contextMenus.onClicked?.addListener((info, tab) => {
  if (info.menuItemId !== 'synapseclean-compact' || !tab?.id || !info.selectionText) return;
  extensionApi.tabs
    .sendMessage(tab.id, {
      type: 'synapseclean-compact-selection',
      text: info.selectionText,
    })
    .catch(() => {});
});

extensionApi.commands.onCommand?.addListener((command) => {
  if (command !== 'compact-selection') return;
  void extensionApi.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tab = tabs[0];
    if (!tab?.id) return;
    extensionApi.tabs
      .sendMessage(tab.id, { type: 'synapseclean-compact-selection' })
      .catch(() => {});
  });
});

extensionApi.runtime.onMessage?.addListener((message, sender, sendResponse) => {
  if (!isExtensionSender(sender)) return false;
  return handleRuntimeMessage(message, sender, sendResponse);
});
