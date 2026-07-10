import {
  getSettings,
  getStats,
  recordCompaction,
  recordGeminiCompaction,
  saveSettings,
} from './bg-services';
import { probeGeminiAvailability } from './gemini-probe';
import {
  isContentScriptSender,
  isExtensionPageSender,
} from './ipc';
import {
  dispatchMessage,
  replyErr,
  replyOk,
  type RouteTable,
} from './message-router';
import type { SynapseSettings } from './types';

function isTrustedReader(sender: chrome.runtime.MessageSender): boolean {
  return isExtensionPageSender(sender) || isContentScriptSender(sender);
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export const messageRoutes: RouteTable = {
  'get-settings': {
    allow: isTrustedReader,
    async: true,
    handle: async (_msg, _sender, sendResponse) => {
      replyOk(sendResponse, { settings: await getSettings() });
    },
  },

  'save-settings': {
    allow: isExtensionPageSender,
    async: true,
    handle: async (message, _sender, sendResponse) => {
      await saveSettings(message.settings as SynapseSettings);
      replyOk(sendResponse);
    },
  },

  'get-stats': {
    allow: isTrustedReader,
    async: true,
    handle: async (_msg, _sender, sendResponse) => {
      replyOk(sendResponse, { stats: await getStats() });
    },
  },

  'get-gemini-availability': {
    allow: isTrustedReader,
    async: true,
    handle: async (_msg, _sender, sendResponse) => {
      try {
        const result = await probeGeminiAvailability();
        replyOk(sendResponse, { ...result });
      } catch {
        replyOk(sendResponse, { availability: 'unavailable', tabRestricted: false });
      }
    },
  },

  'record-gemini-compaction': {
    allow: isContentScriptSender,
    async: true,
    handle: async (_msg, _sender, sendResponse) => {
      const stats = await recordGeminiCompaction();
      replyOk(sendResponse, { stats });
    },
  },

  'write-clipboard': {
    allow: isContentScriptSender,
    async: true,
    handle: async (message, _sender, sendResponse) => {
      try {
        await navigator.clipboard.writeText(asString(message.text));
        replyOk(sendResponse);
      } catch (err) {
        replyErr(
          sendResponse,
          err instanceof Error ? err.message : 'clipboard write failed'
        );
      }
    },
  },

  'record-compaction': {
    allow: isContentScriptSender,
    async: true,
    handle: async (message, _sender, sendResponse) => {
      const stats = await recordCompaction(
        asNumber(message.originalLength),
        asNumber(message.compactedLength)
      );
      replyOk(sendResponse, { stats });
    },
  },
};

export function handleRuntimeMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): boolean {
  return dispatchMessage(messageRoutes, message, sender, sendResponse);
}
