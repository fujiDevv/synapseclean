/**
 * Typed chrome.runtime message router (same pattern as SourceCloak / CxtWeave).
 */

export type SenderGuard = (sender: chrome.runtime.MessageSender) => boolean;

export type MessageHandler = (
  message: Record<string, unknown>,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean | void | Promise<void>;

export interface RouteDefinition {
  allow: SenderGuard;
  /** true → keep message channel open for async sendResponse */
  async: boolean;
  handle: MessageHandler;
}

export type RouteTable = Record<string, RouteDefinition>;

export function dispatchMessage(
  routes: RouteTable,
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): boolean {
  if (!message || typeof message !== 'object') return false;
  const type = (message as { type?: unknown }).type;
  if (typeof type !== 'string') return false;

  const route = routes[type];
  if (!route) return false;
  if (!route.allow(sender)) return false;

  const payload = message as Record<string, unknown>;

  if (route.async) {
    try {
      const result = route.handle(payload, sender, sendResponse);
      if (result instanceof Promise) {
        result.catch((err: unknown) => {
          const error = err instanceof Error ? err.message : String(err);
          try {
            sendResponse({ success: false, error });
          } catch {
            /* channel closed */
          }
        });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      sendResponse({ success: false, error });
    }
    return true;
  }

  try {
    route.handle(payload, sender, sendResponse);
  } catch {
    /* fire-and-forget */
  }
  return false;
}

export function replyOk(sendResponse: (r?: unknown) => void, body: Record<string, unknown> = {}): void {
  sendResponse({ success: true, ...body });
}

export function replyErr(sendResponse: (r?: unknown) => void, error: string): void {
  sendResponse({ success: false, error });
}
